#!/bin/bash
# Startup script for Shop Manager
# Ensures proper directory structure and starts the application

# Create necessary directories
mkdir -p logs
mkdir -p static/icons

# Set default environment if not specified
export FLASK_ENV=${FLASK_ENV:-production}

# If no LOG_FILE is set and we're in production, use console logging
if [ "$FLASK_ENV" = "production" ] && [ -z "$LOG_FILE" ]; then
    echo "Using console logging for production environment"
fi

# Start the application
echo "Starting Shop Manager..."
exec gunicorn --bind 0.0.0.0:${PORT:-5000} --workers ${WORKERS:-4} --timeout 120 shop:app
