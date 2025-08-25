/**
 * Google Apps Script for Combined Orders (Fabric + Tailoring) with Backup
 * FIXED VERSION - Handles both JSON and form-encoded data
 * Main Sheet ID: 199mFt3yz1cZQUGcF84pZgNQoxCpOS2gHxFGDD71CZVg
 * Backup Sheet ID: 1_ZNBXBVQJi-oht1XLK9Klu0qd5qSo5HMshjg4gUCxg8
 * Sheet Name: Combine Orders
 * Backup Sheet Name: Backup-Combine
 */

// ===== CONFIGURATION =====
const SHEET_ID = '199mFt3yz1cZQUGcF84pZgNQoxCpOS2gHxFGDD71CZVg';
const SHEET_NAME = 'Combine Orders';

// ===== BACKUP CONFIG =====
const BACKUP_SPREADSHEET_ID = '1_ZNBXBVQJi-oht1XLK9Klu0qd5qSo5HMshjg4gUCxg8';
const BACKUP_SHEET_NAME = 'Backup-Combine';
const COPY_HEADER_FROM_SOURCE = true;
const SOURCE_HEADER_ROW_INDEX = 1;

// Headers for the sheet (address added after Contact)
const HEADERS = [
  'Timestamp',
  'Combined Order ID',
  'Master Order ID',
  'Customer Name',
  'Contact',
  'Address',
  'Customer Type',
  'Order Date',
  'Session',
  'Notes',
  'Fabric Order ID',
  'Fabric Price',
  'Tailoring Order ID', 
  'Tailoring Price',
  'Total Amount',
  'Payment Status'
];

/**
 * Main function to handle POST requests from the web application
 * FIXED: Now handles both JSON and form-encoded data
 */
function doPost(e) {
  try {
    // === ROBUST INPUT HANDLING - FIXED VERSION ===
    let data = {};
    let rawContents = '';

    // Get raw contents safely
    if (e && e.postData && e.postData.contents) {
      rawContents = e.postData.contents;
    } else if (e && e.postData && e.postData.getDataAsString) {
      rawContents = e.postData.getDataAsString();
    } else {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: 'No POST data provided.',
          message: 'Please send data in JSON or form-encoded format'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Try parsing as JSON first
    try {
      data = JSON.parse(rawContents);
      console.log('Successfully parsed as JSON');
    } catch (jsonError) {
      console.log('JSON parse failed, trying form-encoded format');
      
      // Fallback: parse as form-encoded data (customer_name=John&contact=123...)
      try {
        if (rawContents && typeof rawContents === 'string') {
          rawContents.split('&').forEach(function(pair) {
            if (!pair) return;
            const parts = pair.split('=');
            if (parts.length >= 2) {
              const key = decodeURIComponent(parts[0].replace(/\+/g, ' '));
              const value = decodeURIComponent(parts.slice(1).join('=').replace(/\+/g, ' '));
              data[key] = value;
            }
          });
          console.log('Successfully parsed as form-encoded data');
        }
      } catch (formError) {
        return ContentService
          .createTextOutput(JSON.stringify({
            success: false,
            error: 'Unable to parse request data. Expected JSON or form-encoded format.',
            message: 'Data parsing failed: ' + formError.toString()
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // Validate required fields
    if (!data.customer_name) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: 'Customer name is required',
          message: 'Please provide customer_name in the request'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Get the spreadsheet
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);

    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
      headerRange.setBackground('#4CAF50');
      headerRange.setFontColor('#FFFFFF');
      headerRange.setFontWeight('bold');
      headerRange.setHorizontalAlignment('center');
    }

    // Prepare row data
    const timestamp = new Date();
    const combinedOrderId = data.combined_order_id || generateOrderId('CMB');
    const masterOrderId = data.master_order_id || data.combined_order_id || combinedOrderId;

    // Extract address with fallback options
    const address = data.address || data.customer_address || '';

    const fabricPrice = parseFloat(data.fabric_price) || 0;
    const tailoringPrice = parseFloat(data.tailoring_price) || 0;
    const totalAmount = parseFloat(data.total_amount) || (fabricPrice + tailoringPrice);

    const rowData = [
      timestamp,                      // Timestamp
      combinedOrderId,               // Combined Order ID
      masterOrderId,                 // Master Order ID
      data.customer_name || '',      // Customer Name
      data.contact || '',            // Contact
      address,                       // Address
      data.customer_type || 'New',   // Customer Type
      data.order_date || '',         // Order Date
      data.sessions || '',           // Session
      data.notes || '',              // Notes
      data.fabric_order_id || '',    // Fabric Order ID
      fabricPrice,                   // Fabric Price
      data.tailoring_order_id || '', // Tailoring Order ID
      tailoringPrice,                // Tailoring Price
      totalAmount,                   // Total Amount
      data.paid_status || 'Unpaid'   // Payment Status
    ];

    // Add the row to the main sheet
    sheet.appendRow(rowData);

    // Backup the row immediately (non-blocking)
    try {
      backupAppendRow(rowData);
    } catch (backupError) {
      console.error('Backup error: ' + backupError);
    }

    // Format the newly added row
    const lastRow = sheet.getLastRow();
    formatNewRow(sheet, lastRow);

    // Auto-resize columns
    sheet.autoResizeColumns(1, HEADERS.length);

    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        combinedId: combinedOrderId,
        masterOrderId: masterOrderId,
        row: lastRow,
        timestamp: timestamp.toISOString(),
        message: 'Combined order saved successfully'
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('Error saving combined order:', error);

    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString(),
        message: 'Failed to save combined order'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle GET requests (for testing)
 */
function doGet(e) {
  return ContentService
    .createTextOutput('Combined Orders API is running! Both JSON and form-encoded data supported.')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Generate unique order ID with prefix
 */
function generateOrderId(prefix = 'CMB') {
  const timestamp = new Date().getTime().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return prefix + timestamp + random;
}

/**
 * Format newly added row - SIMPLIFIED to avoid typed column errors
 */
function formatNewRow(sheet, rowNumber) {
  try {
    // Only apply row background color - skip number formatting entirely
    const range = sheet.getRange(rowNumber, 1, 1, HEADERS.length);
    
    // Alternate row colors
    if (rowNumber % 2 === 0) {
      range.setBackground('#F8F9FA');
    }
    
    console.log(`Row ${rowNumber} formatted successfully (background only)`);
    
  } catch (error) {
    console.log('Error formatting row:', error);
  }
}

/**
 * Test function to add sample data - UPDATED
 */
function testAddSampleData() {
  const sampleData = {
    customer_name: 'Test Customer Fixed',
    contact: '9876543210',
    address: '123 Test Street, Test City, Test State - 123456',
    customer_type: 'Regular',
    order_date: '2024-01-15',
    sessions: 'Wedding',
    notes: 'Test combined order with FIXED parsing',
    fabric_order_id: 'F-FIXED123456789',
    fabric_price: 2500.00,
    tailoring_order_id: 'T-FIXED123456789',
    tailoring_price: 1500.00,
    total_amount: 4000.00,
    paid_status: 'Partial'
  };

  const mockEvent = {
    postData: {
      contents: JSON.stringify(sampleData)
    }
  };

  const result = doPost(mockEvent);
  if (result && typeof result.getContent === 'function') {
    console.log('Test result:', result.getContent());
  } else {
    console.log('Test result (raw):', result);
  }
}

/**
 * Test function with form-encoded data - NEW
 */
function testAddSampleDataFormEncoded() {
  const formData = 'customer_name=Test+Form+Customer&contact=9876543210&address=123+Form+Street&customer_type=Regular&fabric_price=1500&tailoring_price=1000&total_amount=2500&paid_status=Paid&notes=Test+form+encoded+data';

  const mockEvent = {
    postData: {
      contents: formData
    }
  };

  const result = doPost(mockEvent);
  if (result && typeof result.getContent === 'function') {
    console.log('Form test result:', result.getContent());
  } else {
    console.log('Form test result (raw):', result);
  }
}

/**
 * Function to get combined orders data (for future use)
 */
function getCombinedOrdersData(limit = 100) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error(`Sheet "${SHEET_NAME}" not found.`);
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return { success: true, data: [], message: 'No combined orders found.' };
    }
    
    // Get data (excluding header row)
    const startRow = 2;
    const numRows = Math.min(limit, lastRow - 1);
    const range = sheet.getRange(startRow, 1, numRows, sheet.getLastColumn());
    const values = range.getValues();
    
    // Convert to objects
    const orders = values.map(row => {
      const order = {};
      HEADERS.forEach((header, index) => {
        order[header] = row[index];
      });
      return order;
    });
    
    return {
      success: true,
      data: orders,
      message: `Retrieved ${orders.length} combined orders.`
    };
    
  } catch (error) {
    console.error('Error in getCombinedOrdersData:', error);
    return {
      success: false,
      data: [],
      message: 'Error retrieving combined orders: ' + error.toString()
    };
  }
}

/**
 * Setup function to initialize the sheet with proper formatting
 */
function setupSheet() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
    }
    
    // Clear existing content and set headers
    sheet.clear();
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    
    // Format header row
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setBackground('#4CAF50');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    
    // Auto-resize columns
    sheet.autoResizeColumns(1, HEADERS.length);
    
    console.log('Combined Orders sheet setup completed successfully!');
    return 'Combined Orders sheet setup completed successfully!';
    
  } catch (error) {
    console.error('Error in setupSheet:', error);
    return 'Error: ' + error.toString();
  }
}

// ===== BACKUP FUNCTIONS =====

/**
 * Append a single row to the backup spreadsheet
 * Non-throwing: logs errors and returns so it won't disrupt main flow
 */
function backupAppendRow(rowValues) {
  if (!rowValues || !Array.isArray(rowValues) || rowValues.length === 0) return;
  
  try {
    const backupSS = SpreadsheetApp.openById(BACKUP_SPREADSHEET_ID);
    let backupSheet = backupSS.getSheetByName(BACKUP_SHEET_NAME);
    const numCols = rowValues.length;

    // Create backup sheet if it doesn't exist
    if (!backupSheet) {
      backupSheet = backupSS.insertSheet(BACKUP_SHEET_NAME);
      
      if (COPY_HEADER_FROM_SOURCE) {
        try {
          const sourceSS = SpreadsheetApp.openById(SHEET_ID);
          const sourceSheet = sourceSS.getSheetByName(SHEET_NAME);
          
          if (sourceSheet && sourceSheet.getLastRow() >= SOURCE_HEADER_ROW_INDEX) {
            const headerCols = Math.max(numCols, sourceSheet.getLastColumn());
            const headerRange = sourceSheet.getRange(SOURCE_HEADER_ROW_INDEX, 1, 1, headerCols);
            const header = headerRange.getValues();
            
            if (header && header[0] && header[0].length > 0) {
              backupSheet.getRange(1, 1, header.length, header[0].length).setValues(header);
              
              // Format header in backup sheet
              const headerBackupRange = backupSheet.getRange(1, 1, 1, header[0].length);
              headerBackupRange.setBackground('#4CAF50');
              headerBackupRange.setFontColor('#FFFFFF');
              headerBackupRange.setFontWeight('bold');
              headerBackupRange.setHorizontalAlignment('center');
            }
          }
        } catch (hErr) {
          console.log('Header copy skipped: ' + hErr);
        }
      }
    }

    const destRow = backupSheet.getLastRow() + 1;
    backupSheet.getRange(destRow, 1, 1, numCols).setValues([rowValues]);
    
    // Format the backed up row
    formatBackupRow(backupSheet, destRow);
    
    console.log(`Backup: appended Combined Orders data to ${BACKUP_SHEET_NAME} at row ${destRow}`);
    
  } catch (err) {
    console.error('backupAppendRow error: ' + err);
  }
}

/**
 * Append multiple rows to the backup spreadsheet
 * Non-throwing: logs errors and returns
 */
function backupAppendRows(rowsArray) {
  if (!rowsArray || !Array.isArray(rowsArray) || rowsArray.length === 0) return;
  
  try {
    const backupSS = SpreadsheetApp.openById(BACKUP_SPREADSHEET_ID);
    let backupSheet = backupSS.getSheetByName(BACKUP_SHEET_NAME);
    const numCols = rowsArray[0].length;

    // Create backup sheet if it doesn't exist
    if (!backupSheet) {
      backupSheet = backupSS.insertSheet(BACKUP_SHEET_NAME);
      
      if (COPY_HEADER_FROM_SOURCE) {
        try {
          const sourceSS = SpreadsheetApp.openById(SHEET_ID);
          const sourceSheet = sourceSS.getSheetByName(SHEET_NAME);
          
          if (sourceSheet && sourceSheet.getLastRow() >= SOURCE_HEADER_ROW_INDEX) {
            const headerCols = Math.max(numCols, sourceSheet.getLastColumn());
            const headerRange = sourceSheet.getRange(SOURCE_HEADER_ROW_INDEX, 1, 1, headerCols);
            const header = headerRange.getValues();
            
            if (header && header[0] && header[0].length > 0) {
              backupSheet.getRange(1, 1, header.length, header[0].length).setValues(header);
              
              // Format header in backup sheet
              const headerBackupRange = backupSheet.getRange(1, 1, 1, header[0].length);
              headerBackupRange.setBackground('#4CAF50');
              headerBackupRange.setFontColor('#FFFFFF');
              headerBackupRange.setFontWeight('bold');
              headerBackupRange.setHorizontalAlignment('center');
            }
          }
        } catch (hErr) {
          console.log('Header copy skipped: ' + hErr);
        }
      }
    }

    const destRow = backupSheet.getLastRow() + 1;
    backupSheet.getRange(destRow, 1, rowsArray.length, numCols).setValues(rowsArray);
    
    // Format the backed up rows
    for (let i = 0; i < rowsArray.length; i++) {
      formatBackupRow(backupSheet, destRow + i);
    }
    
    console.log(`Backup: appended ${rowsArray.length} Combined Orders rows to ${BACKUP_SHEET_NAME}`);
    
  } catch (err) {
    console.error('backupAppendRows error: ' + err);
  }
}

/**
 * Append newly added backup row - SIMPLIFIED to avoid typed column errors
 */
function formatBackupRow(backupSheet, rowNumber) {
  try {
    // Only apply row background color - skip number formatting entirely
    const range = backupSheet.getRange(rowNumber, 1, 1, HEADERS.length);
    
    // Alternate row colors
    if (rowNumber % 2 === 0) {
      range.setBackground('#F8F9FA');
    }
    
    console.log(`Backup row ${rowNumber} formatted successfully (background only)`);
    
  } catch (error) {
    console.log('Error formatting backup row:', error);
  }
}

/**
 * Setup function to initialize both main and backup sheets
 */
function setupBothSheets() {
  try {
    let results = [];
    
    // Setup main sheet
    results.push(setupSheet());
    
    // Setup backup sheet
    const backupSS = SpreadsheetApp.openById(BACKUP_SPREADSHEET_ID);
    let backupSheet = backupSS.getSheetByName(BACKUP_SHEET_NAME);
    
    if (!backupSheet) {
      backupSheet = backupSS.insertSheet(BACKUP_SHEET_NAME);
      
      // Set headers
      backupSheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      
      // Format header row
      const headerRange = backupSheet.getRange(1, 1, 1, HEADERS.length);
      headerRange.setBackground('#4CAF50');
      headerRange.setFontColor('#FFFFFF');
      headerRange.setFontWeight('bold');
      headerRange.setHorizontalAlignment('center');
      
      // Auto-resize columns
      backupSheet.autoResizeColumns(1, HEADERS.length);
      
      results.push('Backup sheet created and formatted successfully!');
    } else {
      results.push('Backup sheet already exists.');
    }
    
    return results.join(' ');
    
  } catch (error) {
    console.error('Error in setupBothSheets:', error);
    return 'Error: ' + error.toString();
  }
}

/**
 * Test function to validate connections to both spreadsheets
 */
function testConnections() {
  try {
    // Test main spreadsheet
    const mainSS = SpreadsheetApp.openById(SHEET_ID);
    const mainSheet = mainSS.getSheetByName(SHEET_NAME);
    
    // Test backup spreadsheet  
    const backupSS = SpreadsheetApp.openById(BACKUP_SPREADSHEET_ID);
    const backupSheet = backupSS.getSheetByName(BACKUP_SHEET_NAME);
    
    return {
      success: true,
      message: 'Connection test successful!',
      mainSheet: {
        name: mainSS.getName(),
        sheetExists: !!mainSheet,
        rows: mainSheet ? mainSheet.getLastRow() : 0
      },
      backupSheet: {
        name: backupSS.getName(),
        sheetExists: !!backupSheet,
        rows: backupSheet ? backupSheet.getLastRow() : 0
      }
    };
    
  } catch (error) {
    return {
      success: false,
      message: 'Connection test failed: ' + error.toString()
    };
  }
}

// ===== DEPLOYMENT INSTRUCTIONS =====
/*
SETUP STEPS FOR FIXED VERSION:
1. Copy this ENTIRE fixed code to your Google Apps Script editor
2. Save the script (Ctrl+S)
3. Deploy as web app:
   - Click Deploy → New deployment
   - Choose "Web app" as type
   - Execute as: Me
   - Who has access: Anyone (or Anyone with Google account)
   - Click Deploy
4. Copy the new web app URL
5. Test with both testAddSampleData() and testAddSampleDataFormEncoded() functions

WHAT'S FIXED:
✅ Handles both JSON and form-encoded data automatically
✅ No more "Unexpected token 'c'" SyntaxError
✅ Better error messages for debugging
✅ Fallback parsing for different data formats
✅ Added form-encoded test function

FEATURES:
- Automatic backup of all combined orders
- Robust input handling (JSON + form-encoded)
- Consistent formatting between main and backup sheets
- Non-blocking backup operations
- Comprehensive error handling
- Multiple test functions for validation
*/
