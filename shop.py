import os
import logging
from datetime import datetime
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

# Load environment variables
env = os.getenv('FLASK_ENV', 'development')
if env == 'development':
    load_dotenv('.env.development')
else:
    load_dotenv('.env.example')  # Rename to .env in production

app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['DEBUG'] = os.getenv('DEBUG', 'False').lower() == 'true'
app.config['WTF_CSRF_ENABLED'] = os.getenv('WTF_CSRF_ENABLED', 'True').lower() == 'true'

# Security settings for production
if not app.config['DEBUG']:
    app.config['SESSION_COOKIE_SECURE'] = os.getenv('SESSION_COOKIE_SECURE', 'True').lower() == 'true'
    app.config['SESSION_COOKIE_HTTPONLY'] = os.getenv('SESSION_COOKIE_HTTPONLY', 'True').lower() == 'true'
    app.config['SESSION_COOKIE_SAMESITE'] = os.getenv('SESSION_COOKIE_SAMESITE', 'Lax')

# Logging configuration
log_level = getattr(logging, os.getenv('LOG_LEVEL', 'INFO').upper())
logging.basicConfig(
    level=log_level,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.getenv('LOG_FILE', 'app.log'))
    ]
)

logger = logging.getLogger(__name__)


# ----- Home -----
@app.route("/")
def dashboard():
    return render_template("dashboard.html")




# ----- Orders -----
@app.route("/orders")
def orders():
    return render_template("orders/orders.html")

@app.route("/orders/fabric")
def fabric_orders():
    return render_template("orders/fabric.html")

@app.route("/orders/tailor")
def tailor_orders():
    return render_template("orders/tailor.html")

@app.route("/orders/fabric-tailor", methods=['GET', 'POST'])
def fabric_tailor_orders():
    if request.method == 'POST':
        # Handle form submission here
        # You can process the combined order data
        # For now, we'll just return a success response
        return jsonify({"success": True, "combinedId": "CT001"})
    return render_template("orders/fabric_tailor.html")



# ----- Workers -----
@app.route("/workers")
def workers():
    return render_template("workers/workers.html")

@app.route("/workers/add")
def add_worker():
    return render_template("workers/add_worker.html")

@app.route("/workers/list")
def worker_list():
    return render_template("workers/worker_list.html")

@app.route("/workers/payment/add")
def add_payment():
    return render_template("workers/add_payment.html")

@app.route("/workers/payment/history")
def payment_history():
    return render_template("workers/payment_history.html")



# ----- Expenses -----
@app.route("/expenses")
def expenses():
    return render_template("expenses/expenses.html")

@app.route("/expenses/fabric")
def fabric_purchase():
    return render_template("expenses/fabric_expenses.html")

@app.route("/expenses/other")
def other_expenses():
    return render_template("expenses/other_expenses.html")

# Error handlers for production
@app.errorhandler(404)
def not_found(error):
    logger.warning(f"404 error: {request.url}")
    return render_template('errors/404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"500 error: {error}")
    return render_template('errors/500.html'), 500

@app.errorhandler(403)
def forbidden(error):
    logger.warning(f"403 error: {request.url}")
    return render_template('errors/403.html'), 403

# Health check endpoint for deployment monitoring
@app.route("/health")
def health_check():
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    })

if __name__ == "__main__":
    host = os.getenv('HOST', '127.0.0.1')
    port = int(os.getenv('PORT', 3000))
    debug = app.config['DEBUG']
    
    logger.info(f"Starting Shop Manager on {host}:{port} (debug={debug})")
    app.run(host=host, port=port, debug=debug)
