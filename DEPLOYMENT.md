# Shop Manager Deployment Scripts

## Production Deployment

### 1. Docker Deployment

#### Prerequisites
- Docker and Docker Compose installed
- SSL certificates (for HTTPS)
- Environment variables configured

#### Quick Start
```bash
# Clone the repository
git clone <your-repo-url>
cd shop-manager

# Copy environment template
cp .env.example .env

# Edit .env with your production values
nano .env

# Build and start the application
docker-compose up -d

# Check logs
docker-compose logs -f shop-manager
```

#### SSL Setup
```bash
# Create SSL directory
mkdir ssl

# Add your SSL certificates
# ssl/cert.pem - SSL certificate
# ssl/key.pem - Private key

# For self-signed certificates (development only)
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes
```

### 2. Direct Deployment (Linux/Ubuntu)

#### Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.11
sudo apt install python3.11 python3.11-venv python3-pip -y

# Install Nginx
sudo apt install nginx -y

# Install certbot for Let's Encrypt SSL
sudo apt install certbot python3-certbot-nginx -y
```

#### Application Setup
```bash
# Create application user
sudo useradd -m -s /bin/bash shopmanager

# Switch to app directory
sudo mkdir -p /opt/shop-manager
sudo chown shopmanager:shopmanager /opt/shop-manager
sudo -u shopmanager -i

# Clone and setup application
cd /opt/shop-manager
git clone <your-repo-url> .
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env with production values
```

#### Systemd Service
```bash
# Create systemd service file
sudo tee /etc/systemd/system/shop-manager.service > /dev/null <<EOF
[Unit]
Description=Shop Manager Flask App
After=network.target

[Service]
Type=notify
User=shopmanager
Group=shopmanager
WorkingDirectory=/opt/shop-manager
Environment=PATH=/opt/shop-manager/venv/bin
ExecStart=/opt/shop-manager/venv/bin/gunicorn --bind 127.0.0.1:5000 --workers 4 --timeout 120 shop:app
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable shop-manager
sudo systemctl start shop-manager
sudo systemctl status shop-manager
```

#### Nginx Configuration
```bash
# Create Nginx site configuration
sudo tee /etc/nginx/sites-available/shop-manager > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /static/ {
        alias /opt/shop-manager/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/shop-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL with Let's Encrypt
sudo certbot --nginx -d your-domain.com
```

### 3. Windows Deployment

#### Using IIS (Internet Information Services)
```powershell
# Install Python 3.11
# Download from python.org

# Install IIS and CGI
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole, IIS-WebServer, IIS-CommonHttpFeatures, IIS-HttpErrors, IIS-HttpStaticContent, IIS-HttpLogging, IIS-RequestFiltering, IIS-ASPNET45, IIS-CGI

# Create application directory
mkdir C:\inetpub\wwwroot\shop-manager
cd C:\inetpub\wwwroot\shop-manager

# Clone repository and setup
git clone <your-repo-url> .
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Copy environment
copy .env.example .env
# Edit .env with Windows paths and production values
```

### 4. Cloud Deployment

#### Heroku
```bash
# Install Heroku CLI
# Create Procfile
echo "web: gunicorn shop:app" > Procfile

# Deploy
heroku create your-app-name
heroku config:set FLASK_ENV=production
heroku config:set SECRET_KEY=your-secret-key
git push heroku main
```

#### DigitalOcean App Platform
```yaml
# Create .do/app.yaml
name: shop-manager
services:
- name: web
  source_dir: /
  github:
    repo: your-username/shop-manager
    branch: main
  run_command: gunicorn --bind 0.0.0.0:8080 --workers 4 shop:app
  environment_slug: python
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: FLASK_ENV
    value: "production"
  - key: SECRET_KEY
    value: "your-secret-key"
    type: SECRET
```

## Environment Variables

### Required Variables
- `FLASK_ENV`: Set to 'production'
- `SECRET_KEY`: Strong random string for session security
- `HOST`: Server host (0.0.0.0 for Docker, 127.0.0.1 for local)
- `PORT`: Server port (default: 5000)

### Optional Variables
- `DEBUG`: Set to 'False' in production
- `SESSION_COOKIE_SECURE`: Set to 'True' for HTTPS
- `SESSION_COOKIE_HTTPONLY`: Set to 'True' for security
- `LOG_LEVEL`: Logging level (INFO, WARNING, ERROR)

## Monitoring and Maintenance

### Health Checks
- Endpoint: `/health`
- Returns: JSON with status and timestamp
- Use for load balancer health checks

### Logs
- Application logs: `/app/logs/` (Docker) or `/opt/shop-manager/logs/` (direct)
- Nginx logs: `/var/log/nginx/`
- Check logs: `docker-compose logs -f` or `sudo journalctl -u shop-manager -f`

### Updates
```bash
# Docker deployment
docker-compose down
git pull
docker-compose build
docker-compose up -d

# Direct deployment
sudo systemctl stop shop-manager
sudo -u shopmanager -i
cd /opt/shop-manager
git pull
source venv/bin/activate
pip install -r requirements.txt
exit
sudo systemctl start shop-manager
```

## Security Checklist

- [ ] Strong SECRET_KEY generated
- [ ] SSL certificates installed and valid
- [ ] Environment variables secured
- [ ] Non-root user for application
- [ ] Firewall configured (only 80, 443 open)
- [ ] Regular security updates scheduled
- [ ] Backup strategy implemented
- [ ] Log rotation configured
