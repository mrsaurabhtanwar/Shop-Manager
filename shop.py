import os
import logging
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory
from dotenv import load_dotenv
from pydantic import BaseSettings, Field


class AppSettings(BaseSettings):
    FLASK_APP: str = Field('shop.py', env='FLASK_APP')
    FLASK_ENV: str = Field('development', env='FLASK_ENV')
    DEBUG: bool = Field(False, env='DEBUG')
    HOST: str = Field('127.0.0.1', env='HOST')
    PORT: int = Field(3000, env='PORT')
    SECRET_KEY: str = Field('dev-secret-key-change-in-production', env='SECRET_KEY')
    LOG_LEVEL: str = Field('INFO', env='LOG_LEVEL')
    LOG_FILE: str = Field('logs/app.log', env='LOG_FILE')


app_settings = AppSettings()

# Load environment variables
env = app_settings.FLASK_ENV
if env == 'development':
    load_dotenv('.env.development')
else:
    load_dotenv('.env.example')  # Rename to .env in production

# Import sheets_service after environment is loaded so it picks up GOOGLE_SERVICE_ACCOUNT_FILE / MOCK_SHEETS
from google_sheets_service import sheets_service

app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = app_settings.SECRET_KEY
app.config['DEBUG'] = bool(app_settings.DEBUG)
app.config['WTF_CSRF_ENABLED'] = os.getenv('WTF_CSRF_ENABLED', 'True').lower() == 'true'

# Security settings for production
if not app.config['DEBUG']:
    app.config['SESSION_COOKIE_SECURE'] = os.getenv('SESSION_COOKIE_SECURE', 'True').lower() == 'true'
    app.config['SESSION_COOKIE_HTTPONLY'] = os.getenv('SESSION_COOKIE_HTTPONLY', 'True').lower() == 'true'
    app.config['SESSION_COOKIE_SAMESITE'] = os.getenv('SESSION_COOKIE_SAMESITE', 'Lax')

# Logging configuration
log_level = getattr(logging, app_settings.LOG_LEVEL.upper())

# Production-safe logging - prefer console logging for cloud deployments
if app_settings.FLASK_ENV == 'production' and not app_settings.LOG_FILE:
    # Console-only logging for production cloud environments
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[logging.StreamHandler()]
    )
else:
    # File + console logging for development or when explicitly configured
    handlers = [logging.StreamHandler()]
    
    log_file = app_settings.LOG_FILE
    try:
        # Create logs directory if it doesn't exist
        log_dir = os.path.dirname(log_file)
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir, exist_ok=True)
        
        # Add file handler
        handlers.append(logging.FileHandler(log_file))
    except (OSError, PermissionError) as e:
        # Fall back to console logging only
        print(f"Warning: Could not create log file {log_file}: {e}")

    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=handlers
    )

logger = logging.getLogger(__name__)


# ----- Home -----
@app.route("/")
def dashboard():
    return render_template("dashboard.html")

@app.route('/favicon.ico')
def favicon():
    return send_from_directory('static/images', 'icon-192.png', mimetype='image/png')




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
    # Don't log favicon.ico 404s as warnings since browsers always request them
    if not request.url.endswith('/favicon.ico'):
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
    
    
# ----- mesurments Interface -----
@app.route("/mesurments-interface")
def mesurments_interface():
    """Main interface for tailors to view and manage orders"""
    logger.info("Rendering mesurments interface")
    return render_template("mesurments/mesurments.html")

@app.route("/api/orders")
def api_get_orders():
    """API endpoint to get all orders with optional filtering.
    
    Query Parameters:
        status (str): Filter by order status ('all', 'pending', 'in process', etc.)
        garment_type (str): Filter by garment type ('all', 'shirt', 'pants', etc.)
        search (str): Search term for customer name, address, or order ID
        
    Returns:
        JSON with orders data or error message
    """
    request_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
    logger.info(f"=== Starting /api/orders request {request_id} ===")
    start_time = datetime.now()
    
    try:
        # Check sheets service initialization
        if not sheets_service.is_initialized():
            error_msg = "Google Sheets service is not initialized"
            logger.error(f"{error_msg}. Request {request_id}")
            return jsonify({
                'success': False,
                'message': f'{error_msg}. Please try again in a few moments or contact support if the issue persists.',
                'request_id': request_id
            }), 503

        # Get and validate filter parameters
        status_filter = request.args.get('status', 'all')
        garment_filter = request.args.get('garment_type', 'all')
        search_query = request.args.get('search', '')
        
        logger.info(f"Request {request_id} - Processing filters: status={status_filter}, garment={garment_filter}, search='{search_query}'")
        
        # Fetch all orders from Google Sheets with timeout handling
        try:
            orders = sheets_service.get_all_orders()
            if not orders and isinstance(orders, list):
                logger.warning(f"Request {request_id} - No orders returned from Google Sheets")
                return jsonify({
                    'success': True,
                    'orders': [],
                    'total': 0,
                    'message': 'No orders found',
                    'request_id': request_id
                })
            
            logger.info(f"Request {request_id} - Retrieved {len(orders)} orders from Google Sheets")
            
            # Apply filters
            filters = {
                'status': status_filter,
                'garment_type': garment_filter,
                'search': search_query
            }
            
            filtered_orders = sheets_service.apply_order_filters(orders, filters)
            logger.info(f"Request {request_id} - Filtered to {len(filtered_orders)} orders")
            
            # Calculate response time
            response_time = (datetime.now() - start_time).total_seconds()
            logger.info(f"Request {request_id} - Completed successfully in {response_time:.2f} seconds")
            
            return jsonify({
                'success': True,
                'orders': filtered_orders,
                'total': len(filtered_orders),
                'request_id': request_id,
                'response_time': response_time
            })
            
        except Exception as sheet_error:
            error_msg = f"Error retrieving orders from Google Sheets: {str(sheet_error)}"
            logger.error(f"Request {request_id} - {error_msg}", exc_info=True)
            return jsonify({
                'success': False,
                'message': 'Unable to retrieve orders at this time. Please try again in a few moments.',
                'request_id': request_id,
                'error': error_msg
            }), 500
            
    except Exception as e:
        error_msg = f"Unexpected error processing request: {str(e)}"
        logger.error(f"Request {request_id} - {error_msg}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'An unexpected error occurred. Please try again.',
            'request_id': request_id,
            'error': error_msg
        }), 500
    finally:
        logger.info(f"=== Completed /api/orders request {request_id} ===")

@app.route("/api/orders/<order_id>/measurements")
def api_get_order_measurements(order_id: str):
    """API endpoint to get detailed measurements for a specific order.
    
    Args:
        order_id (str): The ID of the order to get measurements for
        
    Returns:
        JSON with measurements data or error message
    """
    request_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
    logger.info(f"=== Starting measurements request {request_id} for order {order_id} ===")
    start_time = datetime.now()
    
    try:
        # Check sheets service initialization
        if not sheets_service.is_initialized():
            error_msg = "Google Sheets service is not initialized"
            logger.error(f"{error_msg}. Request {request_id}")
            return jsonify({
                'success': False,
                'message': f'{error_msg}. Please try again in a few moments.',
                'request_id': request_id
            }), 503
        
        # Fetch measurements
        try:
            logger.info(f"Request {request_id} - Fetching measurements for order {order_id}")
            measurements = sheets_service.get_order_measurements(order_id)
            
            if not any(measurements.values()):
                logger.warning(f"Request {request_id} - No measurements found for order {order_id}")
                return jsonify({
                    'success': True,
                    'measurements': measurements,
                    'message': 'No measurements found for this order',
                    'request_id': request_id
                })
            
            # Calculate response time
            response_time = (datetime.now() - start_time).total_seconds()
            logger.info(f"Request {request_id} - Completed successfully in {response_time:.2f} seconds")
            
            return jsonify({
                'success': True,
                'measurements': measurements,
                'request_id': request_id,
                'response_time': response_time
            })
            
        except Exception as sheet_error:
            error_msg = f"Error retrieving measurements: {str(sheet_error)}"
            logger.error(f"Request {request_id} - {error_msg}", exc_info=True)
            return jsonify({
                'success': False,
                'message': 'Unable to retrieve measurements at this time. Please try again in a few moments.',
                'request_id': request_id,
                'error': error_msg
            }), 500
            
    except Exception as e:
        error_msg = f"Unexpected error processing request: {str(e)}"
        logger.error(f"Request {request_id} - {error_msg}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'An unexpected error occurred. Please try again.',
            'request_id': request_id,
            'error': error_msg
        }), 500
    finally:
        logger.info(f"=== Completed measurements request {request_id} ===")

@app.route("/api/orders/<order_id>/status", methods=['PUT'])
def api_update_order_status(order_id: str):
    """API endpoint to update order status.
    
    Args:
        order_id (str): The ID of the order to update
        
    Request Body:
        status (str): The new status value
        
    Returns:
        JSON with success/failure message
    """
    request_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
    logger.info(f"=== Starting status update request {request_id} for order {order_id} ===")
    start_time = datetime.now()
    
    try:
        # Check sheets service initialization
        if not sheets_service.is_initialized():
            error_msg = "Google Sheets service is not initialized"
            logger.error(f"{error_msg}. Request {request_id}")
            return jsonify({
                'success': False,
                'message': f'{error_msg}. Please try again in a few moments.',
                'request_id': request_id
            }), 503
        
        # Validate request data
        try:
            data = request.get_json()
            if not data:
                error_msg = "No JSON data received"
                logger.error(f"Request {request_id} - {error_msg}")
                return jsonify({
                    'success': False,
                    'message': error_msg,
                    'request_id': request_id
                }), 400
            
            new_status = data.get('status')
            if not new_status:
                error_msg = "Status is required"
                logger.error(f"Request {request_id} - {error_msg}")
                return jsonify({
                    'success': False,
                    'message': error_msg,
                    'request_id': request_id
                }), 400
            
            # Validate status value
            valid_statuses = ['Pending', 'In Process', 'Ready', 'Delivered']
            if new_status not in valid_statuses:
                error_msg = f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
                logger.error(f"Request {request_id} - {error_msg}")
                return jsonify({
                    'success': False,
                    'message': error_msg,
                    'request_id': request_id
                }), 400
            
            # Update status in Google Sheets
            logger.info(f"Request {request_id} - Updating status of order {order_id} to '{new_status}'")
            success = sheets_service.update_order_status(order_id, new_status)
            
            if success:
                response_time = (datetime.now() - start_time).total_seconds()
                logger.info(f"Request {request_id} - Status updated successfully in {response_time:.2f} seconds")
                return jsonify({
                    'success': True,
                    'message': f'Status updated to {new_status} successfully',
                    'request_id': request_id,
                    'response_time': response_time
                })
            else:
                error_msg = "Failed to update status in one or more sheets"
                logger.error(f"Request {request_id} - {error_msg}")
                return jsonify({
                    'success': False,
                    'message': error_msg,
                    'request_id': request_id
                }), 500
                
        except Exception as update_error:
            error_msg = f"Error updating status: {str(update_error)}"
            logger.error(f"Request {request_id} - {error_msg}", exc_info=True)
            return jsonify({
                'success': False,
                'message': 'Unable to update status at this time. Please try again in a few moments.',
                'request_id': request_id,
                'error': error_msg
            }), 500
            
    except Exception as e:
        error_msg = f"Unexpected error processing request: {str(e)}"
        logger.error(f"Request {request_id} - {error_msg}", exc_info=True)
        return jsonify({
            'success': False,
            'message': 'An unexpected error occurred. Please try again.',
            'request_id': request_id,
            'error': error_msg
        }), 500
    finally:
        logger.info(f"=== Completed status update request {request_id} ===")

@app.route("/tailor-interface/<order_id>")
def tailor_order_details(order_id: str):
    """Detailed view for a specific order.
    
    Args:
        order_id (str): The ID of the order to display
        
    Returns:
        Rendered HTML template for the order details page
    """
    logger.info(f"Accessing tailor interface for order {order_id}")
    return render_template("mesurments/orders_details.html", order_id=order_id)



if __name__ == "__main__":
    host = app_settings.HOST
    port = int(app_settings.PORT)
    debug: bool = bool(app.config.get('DEBUG'))
    
    logger.info(f"=== Starting Shop Manager ===")
    logger.info(f"Host: {host}")
    logger.info(f"Port: {port}")
    logger.info(f"Debug mode: {debug}")
    logger.info(f"Environment: {os.getenv('FLASK_ENV', 'development')}")
    
    try:
        # Verify sheets service initialization
        if not sheets_service.is_initialized():
            logger.warning("Google Sheets service failed to initialize. Some features may be unavailable.")
            logger.info("Check GOOGLE_SERVICE_ACCOUNT_FILE environment variable or set MOCK_SHEETS=1 for development")
    except Exception as e:
        logger.error(f"Error checking sheets service: {e}", exc_info=True)
    
    app.run(host=host, port=port, debug=debug)
