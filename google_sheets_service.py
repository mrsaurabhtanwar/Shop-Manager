import os
import logging
import json
from typing import List, Dict, Optional, TypedDict

from pydantic import BaseSettings, Field

class Order(TypedDict):
    order_id: str
    customer_name: str
    contact_info: str
    address: str
    customer_type: str
    garment_types: str
    order_date: str
    delivery_date: str
    delivery_status: str
    price: float
    payment_status: str
    season: str
    festival: str
    notes: str
    created_at: str

class Measurement(TypedDict):
    order_id: str
    customer_name: str
    address: str
    order_date: str
    delivery_date: str
    quantity: int
    fabric_meters: float
    price: float
    status: str
    notes: str
    created_at: str

class ShirtMeasurement(Measurement):
    chest: float
    shoulder: float
    sleeve_length: float
    shirt_length: float
    neck: float
    bicep: float
    bajoo: float

class PantMeasurement(Measurement):
    waist: float
    hip: float
    inseam: float
    outseam: float
    thigh: float
    knee: float
    bottom: float

class OtherMeasurement(Measurement):
    pass

class OrderMeasurements(TypedDict):
    shirt: Optional[ShirtMeasurement]
    pants: Optional[PantMeasurement]
    others: Optional[OtherMeasurement]
import gspread
from google.oauth2.service_account import Credentials
from datetime import datetime

logger = logging.getLogger(__name__)


class GSheetsSettings(BaseSettings):
    GOOGLE_SHEETS_ID: Optional[str] = Field(None, env='GOOGLE_SHEETS_ID')
    GOOGLE_SERVICE_ACCOUNT_FILE: str = Field('service-account.json', env='GOOGLE_SERVICE_ACCOUNT_FILE')
    MOCK_SHEETS: bool = Field(False, env='MOCK_SHEETS')


settings = GSheetsSettings()

class GoogleSheetsService:
    def __init__(self):
        # Use validated settings
        self.spreadsheet_id: str = settings.GOOGLE_SHEETS_ID or ''
        self.client: Optional[gspread.Client] = None
        self.spreadsheet: Optional[gspread.Spreadsheet] = None
        self.mock: bool = False
        self._initialized: bool = False

        # Minimal in-memory mock data used when MOCK_SHEETS env var is true
        mock_order: Order = {
            'order_id': 'MOCK001',
            'customer_name': 'Test Customer',
            'contact_info': '0000000000',
            'address': '123 Demo St',
            'customer_type': 'regular',
            'garment_types': 'Shirt, Pants',
            'order_date': '',
            'delivery_date': '',
            'delivery_status': 'Pending',
            'price': 0.0,
            'payment_status': 'Unpaid',
            'season': '',
            'festival': '',
            'notes': '',
            'created_at': ''
        }
        self._mock_orders: List[Order] = [mock_order]

        mock_measurements: OrderMeasurements = {
            'shirt': None,
            'pants': None,
            'others': None
        }
        self._mock_measurements: Dict[str, OrderMeasurements] = {
            'MOCK001': mock_measurements
        }

        # Initialize client only if a spreadsheet id is provided or MOCK_SHEETS is enabled
        if settings.MOCK_SHEETS:
            # initialize_client will detect MOCK_SHEETS and set mock mode
            self.initialize_client()
        elif self.spreadsheet_id:
            self.initialize_client()
        else:
            logger.warning('GOOGLE_SHEETS_ID is not set; Google Sheets access disabled. Set GOOGLE_SHEETS_ID and GOOGLE_SERVICE_ACCOUNT_FILE or enable MOCK_SHEETS=1 for development.')
    
    def initialize_client(self):
        """Initialize Google Sheets client with service account credentials"""
        try:
            # Define the scope
            scope = [
                'https://spreadsheets.google.com/feeds',
                'https://www.googleapis.com/auth/drive'
            ]
            
            # Allow a mock mode for local development when real credentials are not available
            mock_env = os.getenv('MOCK_SHEETS', '').lower()
            if mock_env in ('1', 'true', 'yes'):
                self.mock = True
                logger.info('MOCK_SHEETS enabled: using in-memory mock data for Google Sheets')
                return True

            # Get credentials file path from environment
            creds_file = os.getenv('GOOGLE_SERVICE_ACCOUNT_FILE', 'service-account.json')

            if not os.path.exists(creds_file):
                logger.warning(f"Service account file not found: {creds_file}. Set MOCK_SHEETS=1 to run without Google Sheets.")
                return False

            # Validate JSON looks like a service account file before trying to load
            try:
                with open(creds_file, 'r', encoding='utf-8') as f:
                    creds_json = json.load(f)
            except Exception as e:
                logger.error(f"Failed to read credentials file {creds_file}: {e}")
                return False

            # Basic validation of expected fields in a service account key
            if not creds_json.get('client_email') or not creds_json.get('private_key'):
                logger.error(f"Credentials file {creds_file} does not appear to be a service account key. Set GOOGLE_SERVICE_ACCOUNT_FILE to a valid service account JSON or enable MOCK_SHEETS=1.")
                return False

            # Load credentials
            creds = Credentials.from_service_account_file(creds_file, scopes=scope)
            self.client = gspread.authorize(creds)

            # Open the spreadsheet
            self.spreadsheet = self.client.open_by_key(self.spreadsheet_id)
            logger.info("Google Sheets client initialized successfully")
            self._initialized = True
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize Google Sheets client: {e}")
            return False
    
    def is_initialized(self) -> bool:
        """Check if the service is initialized and ready to use"""
        return self._initialized

    def get_all_orders(self) -> List[Order]:
        """Get all orders from the Orders sheet.
        
        Returns:
            List[Order]: A list of Order objects containing order details.
            Returns an empty list if there are errors.
        """
        try:
            logger.info("=== Starting get_all_orders ===")
            
            if self.mock:
                logger.info("Using mock data")
                return self._mock_orders

            if not self.spreadsheet:
                logger.error("No active spreadsheet connection")
                return []
            
            try:
                logger.info("Accessing Orders worksheet")
                orders_sheet = self.spreadsheet.worksheet('Orders')
                
                logger.info("Fetching all records")
                records = orders_sheet.get_all_records()
                logger.info(f"Retrieved {len(records)} records from sheet")
                
                # Convert to list of dictionaries with standardized keys
                orders: List[Order] = []
                records_count = len(records)
                logger.info(f"Processing {records_count} records")
                
                for i, record in enumerate(records, 1):
                    try:
                        order: Order = {
                            'order_id': str(record.get('Order ID', '')),
                            'customer_name': str(record.get('Customer Name', '')),
                            'contact_info': str(record.get('Contact Info', '')),
                            'address': str(record.get('Address', '')),
                            'customer_type': str(record.get('Customer Type', '')),
                            'garment_types': str(record.get('Garment Types', '')),
                            'order_date': str(record.get('Order Date', '')),
                            'delivery_date': str(record.get('Delivery Date', '')),
                            'delivery_status': str(record.get('Delivery Status', '')),
                            'price': float(record.get('Price', 0)),
                            'payment_status': str(record.get('Payment Status', '')),
                            'season': str(record.get('Season', '')),
                            'festival': str(record.get('Festival', '')),
                            'notes': str(record.get('Notes', '')),
                            'created_at': str(record.get('Created At', ''))
                        }
                        orders.append(order)
                        if i % 10 == 0:  # Log progress every 10 records
                            logger.info(f"Processed {i}/{records_count} records")
                    except Exception as record_error:
                        logger.error(f"Error processing record {i}: {record_error}")
                        continue
                
                logger.info(f"Successfully processed {len(orders)} orders")
                return orders
                
            except Exception as sheet_error:
                logger.error(f"Error accessing Orders sheet: {sheet_error}", exc_info=True)
                if not self.initialize_client():
                    logger.error("Failed to reinitialize client")
                raise
            
        except Exception as e:
            logger.error(f"Error in get_all_orders: {e}", exc_info=True)
            return []
        finally:
            logger.info("=== Completed get_all_orders ===")
    
    def get_order_measurements(self, order_id: str) -> OrderMeasurements:
        """Get measurements for a specific order from all measurement sheets.
        
        Args:
            order_id (str): The ID of the order to get measurements for.
        
        Returns:
            OrderMeasurements: A dictionary containing all measurements for the order.
            Returns empty measurements if there are errors.
        """
        try:
            logger.info(f"=== Getting measurements for order {order_id} ===")
            
            if self.mock:
                logger.info("Using mock data")
                return self._mock_measurements.get(order_id, {'shirt': None, 'pants': None, 'others': None})

            if not self.spreadsheet:
                logger.error("No active spreadsheet connection")
                return {'shirt': None, 'pants': None, 'others': None}
            
            measurements: OrderMeasurements = {
                'shirt': None,
                'pants': None,
                'others': None
            }
            
            # Get shirt measurements
            try:
                logger.info(f"Fetching shirt measurements for order {order_id}")
                shirt_sheet = self.spreadsheet.worksheet('Shirts')
                shirt_records = shirt_sheet.get_all_records()
                
                for record in shirt_records:
                    if record.get('Order ID') == order_id:
                        logger.info(f"Found shirt measurements for order {order_id}")
                        shirt_data: ShirtMeasurement = {
                            'order_id': str(record.get('Order ID', '')),
                            'customer_name': str(record.get('Customer Name', '')),
                            'address': str(record.get('Address', '')),
                            'order_date': str(record.get('Order Date', '')),
                            'delivery_date': str(record.get('Delivery Date', '')),
                            'quantity': int(record.get('Quantity', 1)),
                            'fabric_meters': float(record.get('Fabric Meters', 0)),
                            'chest': float(record.get('Chest', 0)),
                            'shoulder': float(record.get('Shoulder', 0)),
                            'sleeve_length': float(record.get('Sleeve Length', 0)),
                            'shirt_length': float(record.get('Shirt Length', 0)),
                            'neck': float(record.get('Neck', 0)),
                            'bicep': float(record.get('Bicep', 0)),
                            'bajoo': float(record.get('Bajoo', 0)),
                            'price': float(record.get('Price', 0)),
                            'status': str(record.get('Status', '')),
                            'notes': str(record.get('Notes', '')),
                            'created_at': str(record.get('Created At', ''))
                        }
                        measurements['shirt'] = shirt_data
                        break
                else:
                    logger.info(f"No shirt measurements found for order {order_id}")
                        
            except Exception as e:
                logger.error(f"Error fetching shirt measurements for {order_id}: {e}", exc_info=True)
            
            # Get pants measurements
            try:
                logger.info(f"Fetching pants measurements for order {order_id}")
                pants_sheet = self.spreadsheet.worksheet('Pants')
                pants_records = pants_sheet.get_all_records()
                
                for record in pants_records:
                    if record.get('Order ID') == order_id:
                        logger.info(f"Found pants measurements for order {order_id}")
                        pants_data: PantMeasurement = {
                            'order_id': str(record.get('Order ID', '')),
                            'customer_name': str(record.get('Customer Name', '')),
                            'address': str(record.get('Address', '')),
                            'order_date': str(record.get('Order Date', '')),
                            'delivery_date': str(record.get('Delivery Date', '')),
                            'quantity': int(record.get('Quantity', 1)),
                            'fabric_meters': float(record.get('Fabric Meters', 0)),
                            'waist': float(record.get('Waist', 0)),
                            'hip': float(record.get('Hip', 0)),
                            'inseam': float(record.get('Inseam', 0)),
                            'outseam': float(record.get('Outseam', 0)),
                            'thigh': float(record.get('Thigh', 0)),
                            'knee': float(record.get('Knee', 0)),
                            'bottom': float(record.get('Bottom', 0)),
                            'price': float(record.get('Price', 0)),
                            'status': str(record.get('Status', '')),
                            'notes': str(record.get('Notes', '')),
                            'created_at': str(record.get('Created At', ''))
                        }
                        measurements['pants'] = pants_data
                        break
                else:
                    logger.info(f"No pants measurements found for order {order_id}")
                        
            except Exception as e:
                logger.error(f"Error fetching pants measurements for {order_id}: {e}", exc_info=True)
            
            # Get other measurements
            try:
                logger.info(f"Fetching other measurements for order {order_id}")
                others_sheet = self.spreadsheet.worksheet('Others')
                others_records = others_sheet.get_all_records()
                
                for record in others_records:
                    if record.get('Order ID') == order_id:
                        logger.info(f"Found other measurements for order {order_id}")
                        others_data: OtherMeasurement = {
                            'order_id': str(record.get('Order ID', '')),
                            'customer_name': str(record.get('Customer Name', '')),
                            'address': str(record.get('Address', '')),
                            'order_date': str(record.get('Order Date', '')),
                            'delivery_date': str(record.get('Delivery Date', '')),
                            'quantity': int(record.get('Quantity', 1)),
                            'fabric_meters': float(record.get('Fabric Meters', 0)),
                            'price': float(record.get('Price', 0)),
                            'status': str(record.get('Status', '')),
                            'notes': str(record.get('Notes', '')),
                            'created_at': str(record.get('Created At', ''))
                        }
                        measurements['others'] = others_data
                        break
                else:
                    logger.info(f"No other measurements found for order {order_id}")
                        
            except Exception as e:
                logger.error(f"Error fetching other measurements for {order_id}: {e}", exc_info=True)
            
            logger.info(f"=== Completed getting measurements for order {order_id} ===")
            return measurements
            
        except Exception as e:
            logger.error(f"Error fetching measurements for order {order_id}: {e}", exc_info=True)
            return {'shirt': None, 'pants': None, 'others': None}
    
    def update_order_status(self, order_id: str, new_status: str) -> bool:
        """Update status for an order in all relevant sheets.
        
        Args:
            order_id (str): The ID of the order to update.
            new_status (str): The new status value to set.
        
        Returns:
            bool: True if any sheet was updated successfully, False otherwise.
        """
        try:
            logger.info(f"=== Updating status for order {order_id} to '{new_status}' ===")
            
            if self.mock:
                logger.info("Using mock data")
                updated = False
                for order in self._mock_orders:
                    if order['order_id'] == order_id:
                        logger.info(f"Found matching mock order {order_id}")
                        order['delivery_status'] = new_status
                        updated = True
                return updated

            if not self.spreadsheet:
                logger.error("No active spreadsheet connection")
                return False
            
            sheets_to_update = [
                ('Orders', 9),  # Column I (Delivery Status)
                ('Shirts', 16),  # Column P (Status)
                ('Pants', 16),  # Column P (Status)
                ('Others', 10)  # Column J (Status)
            ]
            
            any_updated = False
            
            for sheet_name, status_column in sheets_to_update:
                try:
                    logger.info(f"Updating {sheet_name} sheet for order {order_id}")
                    worksheet = self.spreadsheet.worksheet(sheet_name)
                    records = worksheet.get_all_records()
                    
                    found = False
                    for i, record in enumerate(records, start=2):  # Start from row 2 (skip header)
                        if record.get('Order ID') == order_id:
                            logger.info(f"Found matching record in {sheet_name} sheet")
                            worksheet.update_cell(i, status_column, new_status)
                            logger.info(f"Updated {sheet_name} sheet status to '{new_status}'")
                            any_updated = True
                            found = True
                            break
                    
                    if not found:
                        logger.info(f"No matching record found in {sheet_name} sheet")
                        
                except Exception as sheet_error:
                    logger.error(f"Error updating {sheet_name} sheet for order {order_id}: {sheet_error}", exc_info=True)
                    if 'Invalid credentials' in str(sheet_error):
                        logger.info("Attempting to reinitialize client due to credential error")
                        if not self.initialize_client():
                            logger.error("Failed to reinitialize client")
                            return False
                        try:
                            # Retry once after reinitialization
                            logger.info(f"Retrying update of {sheet_name} sheet after client reinitialization")
                            worksheet = self.spreadsheet.worksheet(sheet_name)
                            records = worksheet.get_all_records()
                            for i, record in enumerate(records, start=2):
                                if record.get('Order ID') == order_id:
                                    worksheet.update_cell(i, status_column, new_status)
                                    logger.info(f"Successfully updated {sheet_name} sheet on retry")
                                    any_updated = True
                                    break
                        except Exception as retry_error:
                            logger.error(f"Retry failed for {sheet_name} sheet: {retry_error}", exc_info=True)
            
            if any_updated:
                logger.info(f"Successfully updated one or more sheets for order {order_id}")
            else:
                logger.warning(f"No sheets were updated for order {order_id}")
                
            return any_updated
            
        except Exception as e:
            logger.error(f"Error updating status for order {order_id}: {e}", exc_info=True)
            return False
        finally:
            logger.info("=== Completed status update ===")
            
    def filter_orders(self, orders: List[Order], filters: Dict[str, str]) -> List[Order]:
        """Filter orders based on provided criteria.
        
        Args:
            orders (List[Order]): The list of orders to filter.
            filters (Dict[str, str]): Filter criteria including:
                - status: Filter by delivery status (e.g., 'pending', 'delivered')
                - garment_type: Filter by garment type (e.g., 'shirt', 'pants')
                - search: Search term for customer name, address, or order ID
        
        Returns:
            List[Order]: The filtered list of orders.
        """
        try:
            logger.info("=== Starting order filtering ===")
            logger.info(f"Initial orders count: {len(orders)}")
            logger.info(f"Applied filters: {filters}")
            
            filtered_orders = orders
            
            # Filter by status
            if filters.get('status') and filters['status'] != 'all':
                logger.info(f"Filtering by status: {filters['status']}")
                filtered_orders = [order for order in filtered_orders 
                                if order['delivery_status'].lower() == filters['status'].lower()]
                logger.info(f"After status filter: {len(filtered_orders)} orders")
            
            # Filter by garment type
            if filters.get('garment_type') and filters['garment_type'] != 'all':
                logger.info(f"Filtering by garment type: {filters['garment_type']}")
                garment_filter = filters['garment_type'].lower()
                filtered_orders = [order for order in filtered_orders 
                                if garment_filter in order['garment_types'].lower()]
                logger.info(f"After garment type filter: {len(filtered_orders)} orders")
            
            # Search by customer name
            if filters.get('search'):
                logger.info(f"Searching for: {filters['search']}")
                search_term = filters['search'].lower()
                filtered_orders = [order for order in filtered_orders 
                                if search_term in order['customer_name'].lower() or 
                                   search_term in order['address'].lower() or
                                   search_term in order['order_id'].lower()]
                logger.info(f"After search filter: {len(filtered_orders)} orders")
            
            logger.info(f"Final filtered orders count: {len(filtered_orders)}")
            return filtered_orders
            
        except Exception as e:
            logger.error(f"Error filtering orders: {e}", exc_info=True)
            return []
        finally:
            logger.info("=== Completed order filtering ===")
    
    def apply_order_filters(self, orders: List[Order], filters: Dict[str, str]) -> List[Order]:
        """Filter orders based on provided criteria.
        
        Args:
            orders (List[Order]): The list of orders to filter.
            filters (Dict[str, str]): Filter criteria including:
                - status: Filter by delivery status (e.g., 'pending', 'delivered')
                - garment_type: Filter by garment type (e.g., 'shirt', 'pants')
                - search: Search term for customer name, address, or order ID
        
        Returns:
            List[Order]: The filtered list of orders.
        """
        try:
            logger.info("=== Starting order filtering ===")
            logger.info(f"Initial orders count: {len(orders)}")
            logger.info(f"Applied filters: {filters}")
            
            filtered_orders = orders
            
            # Filter by status
            if filters.get('status') and filters['status'] != 'all':
                logger.info(f"Filtering by status: {filters['status']}")
                filtered_orders = [order for order in filtered_orders 
                                if order['delivery_status'].lower() == filters['status'].lower()]
                logger.info(f"After status filter: {len(filtered_orders)} orders")
            
            # Filter by garment type
            if filters.get('garment_type') and filters['garment_type'] != 'all':
                logger.info(f"Filtering by garment type: {filters['garment_type']}")
                garment_filter = filters['garment_type'].lower()
                filtered_orders = [order for order in filtered_orders 
                                if garment_filter in order['garment_types'].lower()]
                logger.info(f"After garment type filter: {len(filtered_orders)} orders")
            
            # Search by customer name
            if filters.get('search'):
                logger.info(f"Searching for: {filters['search']}")
                search_term = filters['search'].lower()
                filtered_orders = [order for order in filtered_orders 
                                if search_term in order['customer_name'].lower() or 
                                   search_term in order['address'].lower() or
                                   search_term in order['order_id'].lower()]
                logger.info(f"After search filter: {len(filtered_orders)} orders")
            
            logger.info(f"Final filtered orders count: {len(filtered_orders)}")
            return filtered_orders
            
        except Exception as e:
            logger.error(f"Error filtering orders: {e}", exc_info=True)
            return []
        finally:
            logger.info("=== Completed order filtering ===")

# Create global instance
sheets_service = GoogleSheetsService()