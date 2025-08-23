# Use Python 3.11 slim image for smaller size
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FLASK_ENV=production

# Install system dependencies (minimal) and curl for HEALTHCHECK
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Make startup script executable
RUN chmod +x start.sh

# Metadata
LABEL org.opencontainers.image.title="Shop Manager"
LABEL org.opencontainers.image.description="A small Flask-based shop manager webapp"
LABEL org.opencontainers.image.licenses="MIT"

# Create non-root user for security (tolerate if already exists)
RUN adduser --disabled-password --gecos '' appuser || true

# Create logs directory and ensure proper permissions (best-effort)
RUN mkdir -p logs static/icons && \
    chown -R appuser:appuser /app || true

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Command to run the application
CMD ["./start.sh"]
