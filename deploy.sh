#!/bin/bash

# Shop Manager Deployment Script
# Usage: ./deploy.sh [development|production]

set -e

ENVIRONMENT=${1:-production}
APP_NAME="shop-manager"
APP_DIR="/opt/$APP_NAME"
SERVICE_NAME="$APP_NAME"

echo "🚀 Starting Shop Manager deployment in $ENVIRONMENT mode..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Install system dependencies
install_dependencies() {
    print_status "Installing system dependencies..."
    
    # Update system
    sudo apt update && sudo apt upgrade -y
    
    # Install Python 3.11 and required packages
    sudo apt install -y \
        python3.11 \
        python3.11-venv \
        python3-pip \
        nginx \
        git \
        curl \
        certbot \
        python3-certbot-nginx \
        supervisor
    
    print_status "System dependencies installed successfully"
}

# Setup application
setup_application() {
    print_status "Setting up application..."
    
    # Create app user if doesn't exist
    if ! id "shopmanager" &>/dev/null; then
        sudo useradd -m -s /bin/bash shopmanager
        print_status "Created shopmanager user"
    fi
    
    # Create application directory
    sudo mkdir -p $APP_DIR
    sudo chown shopmanager:shopmanager $APP_DIR
    
    # Copy application files
    if [ -d "$APP_DIR/.git" ]; then
        print_status "Updating existing application..."
        sudo -u shopmanager git -C $APP_DIR pull
    else
        print_status "Installing new application..."
        sudo -u shopmanager cp -r . $APP_DIR/
        sudo -u shopmanager chown -R shopmanager:shopmanager $APP_DIR
    fi
    
    # Setup Python virtual environment
    sudo -u shopmanager python3.11 -m venv $APP_DIR/venv
    sudo -u shopmanager $APP_DIR/venv/bin/pip install --upgrade pip
    sudo -u shopmanager $APP_DIR/venv/bin/pip install -r $APP_DIR/requirements.txt
    
    print_status "Application setup completed"
}

# Configure environment
configure_environment() {
    print_status "Configuring environment..."
    
    if [ ! -f "$APP_DIR/.env" ]; then
        sudo -u shopmanager cp $APP_DIR/.env.example $APP_DIR/.env
        print_warning "Created .env file from template. Please edit $APP_DIR/.env with your production values"
        
        # Generate SECRET_KEY
        SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
        sudo -u shopmanager sed -i "s/your-secret-key-here/$SECRET_KEY/" $APP_DIR/.env
        
        if [ "$ENVIRONMENT" = "production" ]; then
            sudo -u shopmanager sed -i "s/FLASK_ENV=development/FLASK_ENV=production/" $APP_DIR/.env
            sudo -u shopmanager sed -i "s/DEBUG=True/DEBUG=False/" $APP_DIR/.env
            sudo -u shopmanager sed -i "s/HOST=127.0.0.1/HOST=127.0.0.1/" $APP_DIR/.env
        fi
        
        print_status "Environment configured for $ENVIRONMENT"
    else
        print_status "Using existing .env file"
    fi
}

# Setup systemd service
setup_service() {
    print_status "Setting up systemd service..."
    
    sudo tee /etc/systemd/system/$SERVICE_NAME.service > /dev/null <<EOF
[Unit]
Description=Shop Manager Flask App
After=network.target

[Service]
Type=simple
User=shopmanager
Group=shopmanager
WorkingDirectory=$APP_DIR
Environment=PATH=$APP_DIR/venv/bin
ExecStart=$APP_DIR/venv/bin/gunicorn --bind 127.0.0.1:5000 --workers 4 --timeout 120 --access-logfile $APP_DIR/logs/access.log --error-logfile $APP_DIR/logs/error.log shop:app
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # Create logs directory
    sudo -u shopmanager mkdir -p $APP_DIR/logs
    
    # Enable and start service
    sudo systemctl daemon-reload
    sudo systemctl enable $SERVICE_NAME
    sudo systemctl restart $SERVICE_NAME
    
    print_status "Systemd service configured and started"
}

# Setup Nginx
setup_nginx() {
    print_status "Setting up Nginx..."
    
    # Backup default site
    if [ -f "/etc/nginx/sites-enabled/default" ]; then
        sudo mv /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/default.backup
    fi
    
    # Create Nginx site configuration
    sudo tee /etc/nginx/sites-available/$APP_NAME > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    
    client_max_body_size 50M;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    location /static/ {
        alias $APP_DIR/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /health {
        proxy_pass http://127.0.0.1:5000;
        access_log off;
    }
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

    # Enable site
    sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    
    # Test and restart Nginx
    sudo nginx -t
    sudo systemctl restart nginx
    
    print_status "Nginx configured successfully"
}

# Setup SSL (optional)
setup_ssl() {
    read -p "Do you want to setup SSL with Let's Encrypt? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter your domain name: " DOMAIN
        if [ ! -z "$DOMAIN" ]; then
            sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email
            print_status "SSL certificate installed for $DOMAIN"
        else
            print_warning "Domain name not provided, skipping SSL setup"
        fi
    fi
}

# Check service status
check_status() {
    print_status "Checking service status..."
    
    # Check systemd service
    if sudo systemctl is-active --quiet $SERVICE_NAME; then
        print_status "✓ Shop Manager service is running"
    else
        print_error "✗ Shop Manager service is not running"
        sudo systemctl status $SERVICE_NAME --no-pager
    fi
    
    # Check Nginx
    if sudo systemctl is-active --quiet nginx; then
        print_status "✓ Nginx is running"
    else
        print_error "✗ Nginx is not running"
        sudo systemctl status nginx --no-pager
    fi
    
    # Check health endpoint
    if curl -f http://localhost/health > /dev/null 2>&1; then
        print_status "✓ Application health check passed"
    else
        print_warning "✗ Application health check failed"
    fi
    
    print_status "Deployment completed!"
    print_status "Application should be available at: http://$(curl -s ifconfig.me || echo 'your-server-ip')"
}

# Main deployment flow
main() {
    case $ENVIRONMENT in
        "development"|"dev")
            ENVIRONMENT="development"
            print_status "Deploying in development mode"
            ;;
        "production"|"prod")
            ENVIRONMENT="production"
            print_status "Deploying in production mode"
            ;;
        *)
            print_error "Invalid environment. Use 'development' or 'production'"
            exit 1
            ;;
    esac
    
    install_dependencies
    setup_application
    configure_environment
    setup_service
    setup_nginx
    
    if [ "$ENVIRONMENT" = "production" ]; then
        setup_ssl
    fi
    
    check_status
}

# Run main function
main

print_status "🎉 Deployment script completed!"
print_warning "Don't forget to:"
print_warning "1. Edit $APP_DIR/.env with your specific configuration"
print_warning "2. Configure your firewall to allow HTTP/HTTPS traffic"
print_warning "3. Set up regular backups"
print_warning "4. Monitor the application logs: sudo journalctl -u $SERVICE_NAME -f"
