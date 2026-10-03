/**
 * PDH CAMPUS ORDER SYSTEM
 * Database File: Database.gs
 * 
 * Central Google Sheets database manager.
 * Implements batch read/write, schema creation, data manipulation, and audit logging.
 */

// Schema Definitions for all tables
var SCHEMAS = {
  // 1. USERS Table (Phase 1)
  USERS: [
    'user_id',       // Unique User ID (USR-XXXX)
    'username',      // Login username (e.g., admin, mhs)
    'password_hash', // In development: test hash or password; expandable to SHA-256
    'name',          // Full display name
    'email',         // Email address
    'role',          // Role: PANITIA | MAHASISWA
    'status',        // ACTIVE | INACTIVE | SUSPENDED
    'created_at',    // ISO Timestamp
    'updated_at'     // ISO Timestamp
  ],

  // 2. SETTINGS Table (Phase 1)
  SETTINGS: [
    'setting_key',   // Key name
    'setting_value', // Value (string/JSON)
    'description',   // Human description
    'updated_at'     // ISO Timestamp
  ],

  // 3. AUDIT_LOG Table (Phase 1)
  AUDIT_LOG: [
    'log_id',        // LOG-XXXX
    'timestamp',     // ISO Timestamp
    'user_id',       // User who performed the action
    'action',        // E.g., LOGIN, LOGOUT, UPDATE_SETTING, ORDER_CREATE
    'entity',        // E.g., AUTH, ORDER, USER, SYSTEM
    'details',       // JSON string of change details or description
    'ip_address'     // Client or runner info
  ],

  // 4. PRODUCTS (Prepared for next phases)
  PRODUCTS: [
    'product_id', 'code', 'name', 'description', 'base_price', 'category', 'status', 'created_at'
  ],

  // 5. PRODUCT_SIZES
  PRODUCT_SIZES: [
    'size_id', 'product_id', 'size_code', 'extra_fee', 'chest_width', 'body_length', 'sleeve_length'
  ],

  // 6. PRODUCT_IMAGES
  PRODUCT_IMAGES: [
    'image_id', 'product_id', 'drive_file_id', 'file_url', 'is_primary', 'sort_order'
  ],

  // 7. PO_PERIODS
  PO_PERIODS: [
    'period_id', 'name', 'start_date', 'end_date', 'target_quota', 'status', 'notes'
  ],

  // 8. STUDENTS
  STUDENTS: [
    'student_id', 'user_id', 'nim', 'full_name', 'class_name', 'phone', 'whatsapp'
  ],

  // 9. CLASSES
  CLASSES: [
    'class_id', 'class_name', 'department', 'batch_year'
  ],

  // 10. ORDERS
  ORDERS: [
    'order_id', 'order_number', 'user_id', 'order_type', 'status', 'total_amount', 'shipping_type', 'created_at'
  ],

  // 11. ORDER_ITEMS
  ORDER_ITEMS: [
    'item_id', 'order_id', 'product_id', 'size_code', 'custom_name', 'quantity', 'unit_price', 'subtotal'
  ],

  // 12. PAYMENTS
  PAYMENTS: [
    'payment_id', 'order_id', 'payment_method', 'amount', 'status', 'verification_status', 'created_at'
  ],

  // 13. PAYMENT_PROOFS
  PAYMENT_PROOFS: [
    'proof_id', 'payment_id', 'drive_file_id', 'file_name', 'mime_type', 'uploaded_at'
  ],

  // 14. PRODUCTION_PROGRESS
  PRODUCTION_PROGRESS: [
    'progress_id', 'period_id', 'stage_name', 'percentage', 'notes', 'drive_photo_id', 'updated_at'
  ],

  // 15. PICKUP_INFORMATION
  PICKUP_INFORMATION: [
    'pickup_id', 'order_id', 'status', 'location', 'pickup_date', 'picked_up_by', 'receipt_signature'
  ],

  // 16. NOTIFICATIONS
  NOTIFICATIONS: [
    'notification_id', 'user_id', 'title', 'message', 'type', 'is_read', 'created_at'
  ]
};

/**
 * Get active Spreadsheet instance
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getSpreadsheet() {
  var id = CONFIG.SPREADSHEET_ID;
  if (id) {
    try {
      return SpreadsheetApp.openById(id);
    } catch(e) {
      Logger.log('Could not open spreadsheet by ID: ' + id + '. ' + e.message);
    }
  }
  // Fallback to active spreadsheet if script is bound to a sheet
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch(e) {}

  throw new Error('Spreadsheet ID belum dikonfigurasi. Jalankan initDatabase() atau set SPREADSHEET_ID.');
}

/**
 * Get sheet by name, creating it if it doesn't exist
 * @param {string} sheetName 
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getSheet(sheetName) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // Initialize header row if schema exists
    if (SCHEMAS[sheetName]) {
      sheet.appendRow(SCHEMAS[sheetName]);
      sheet.getRange(1, 1, 1, SCHEMAS[sheetName].length)
           .setFontWeight('bold')
           .setBackground('#F3F4F6');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/**
 * Batch read all rows from a sheet with headers mapped to object keys
 * Efficient: Only 1 API call to get all values
 * @param {string} sheetName 
 * @returns {Array<Object>}
 */
function batchRead(sheetName) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // Empty or only header

  var headers = data[0];
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var rowObj = {};
    for (var j = 0; j < headers.length; j++) {
      rowObj[headers[j]] = data[i][j];
    }
    rowObj.__rowIndex = i + 1; // 1-indexed sheet row
    rows.push(rowObj);
  }
  return rows;
}

/**
 * Append a single row of data to sheet
 * @param {string} sheetName 
 * @param {Object} rowData 
 * @returns {boolean}
 */
function appendData(sheetName, rowData) {
  var sheet = getSheet(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn() || SCHEMAS[sheetName].length).getValues()[0];
  
  var newRow = headers.map(function(header) {
    return rowData[header] !== undefined ? rowData[header] : '';
  });

  sheet.appendRow(newRow);
  return true;
}

/**
 * Update a row matching keyColumn = keyValue
 * @param {string} sheetName 
 * @param {string} keyColumn 
 * @param {string|number} keyValue 
 * @param {Object} updatedData 
 * @returns {boolean}
 */
function updateData(sheetName, keyColumn, keyValue, updatedData) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return false;

  var headers = data[0];
  var keyColIndex = headers.indexOf(keyColumn);
  if (keyColIndex === -1) throw new Error('Column ' + keyColumn + ' not found in ' + sheetName);

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][keyColIndex]) === String(keyValue)) {
      var rowNumber = i + 1;
      for (var j = 0; j < headers.length; j++) {
        var header = headers[j];
        if (updatedData[header] !== undefined) {
          sheet.getRange(rowNumber, j + 1).setValue(updatedData[header]);
        }
      }
      return true;
    }
  }
  return false;
}

/**
 * Generate a unique ID with prefix and timestamp
 * @param {string} prefix 
 * @returns {string} e.g., USR-20261002-8X3A
 */
function generateUniqueId(prefix) {
  var pre = prefix || 'ID';
  var dateStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd');
  var randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return pre + '-' + dateStr + '-' + randomStr;
}

/**
 * Log audit trail entry
 * @param {string} userId 
 * @param {string} action 
 * @param {string} entity 
 * @param {string|Object} details 
 */
function logAudit(userId, action, entity, details) {
  try {
    var detailsStr = typeof details === 'object' ? JSON.stringify(details) : String(details || '');
    var logEntry = {
      log_id: generateUniqueId('LOG'),
      timestamp: new Date().toISOString(),
      user_id: userId || 'SYSTEM',
      action: action || 'INFO',
      entity: entity || 'GENERAL',
      details: detailsStr,
      ip_address: 'GAS_CLIENT'
    };
    appendData(CONFIG.SHEETS.AUDIT_LOG, logEntry);
  } catch(e) {
    Logger.log('Audit log error: ' + e.message);
  }
}

/**
 * Initial database bootstrap
 * Creates spreadsheet if not provided, sets up USERS, SETTINGS, AUDIT_LOG with seed data
 * @param {string} [optionalSpreadsheetId]
 */
function initDatabase(optionalSpreadsheetId) {
  var ss;
  if (optionalSpreadsheetId) {
    ss = SpreadsheetApp.openById(optionalSpreadsheetId);
    setSpreadsheetId(optionalSpreadsheetId);
  } else if (CONFIG.SPREADSHEET_ID) {
    ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  } else {
    // Create new spreadsheet in Drive
    ss = SpreadsheetApp.create('PDH Campus Order Database');
    setSpreadsheetId(ss.getId());
  }

  // 1. Initialize USERS sheet
  var userSheet = getSheet(CONFIG.SHEETS.USERS);
  var existingUsers = batchRead(CONFIG.SHEETS.USERS);
  if (existingUsers.length === 0) {
    // Seed testing accounts: admin / 123 & mhs / 123
    var now = new Date().toISOString();
    appendData(CONFIG.SHEETS.USERS, {
      user_id: 'USR-ADMIN-01',
      username: 'admin',
      password_hash: '123', // In early dev; expandable with SHA-256
      name: 'Administrator Panitia',
      email: 'admin.pdh@campus.ac.id',
      role: CONFIG.ROLES.PANITIA,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    });

    appendData(CONFIG.SHEETS.USERS, {
      user_id: 'USR-MHS-01',
      username: 'mhs',
      password_hash: '123',
      name: 'Ahmad Mahasiswa',
      email: 'ahmad.mhs@campus.ac.id',
      role: CONFIG.ROLES.MAHASISWA,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    });
  }

  // 2. Initialize SETTINGS sheet
  var settingsSheet = getSheet(CONFIG.SHEETS.SETTINGS);
  var existingSettings = batchRead(CONFIG.SHEETS.SETTINGS);
  if (existingSettings.length === 0) {
    var now = new Date().toISOString();
    appendData(CONFIG.SHEETS.SETTINGS, {
      setting_key: 'SYSTEM_NAME',
      setting_value: 'PDH Campus Order System',
      description: 'Nama Resmi Aplikasi Sistem Pemesanan PDH',
      updated_at: now
    });
    appendData(CONFIG.SHEETS.SETTINGS, {
      setting_key: 'ACTIVE_PERIOD',
      setting_value: 'PO PDH Angkatan 2026/2027',
      description: 'Periode Pre-Order yang sedang aktif',
      updated_at: now
    });
    appendData(CONFIG.SHEETS.SETTINGS, {
      setting_key: 'ALLOW_NEW_ORDERS',
      setting_value: 'true',
      description: 'Status penerimaan pesanan mahasiswa',
      updated_at: now
    });
  }

  // 3. Initialize AUDIT_LOG sheet
  getSheet(CONFIG.SHEETS.AUDIT_LOG);

  // Log system initialization
  logAudit('SYSTEM', 'INIT_DATABASE', 'SYSTEM', 'Database initialized successfully with ID: ' + ss.getId());

  return {
    success: true,
    spreadsheetId: ss.getId(),
    url: ss.getUrl(),
    message: 'Database berhasil diinisialisasi dengan tabel USERS, SETTINGS, dan AUDIT_LOG.'
  };
}
