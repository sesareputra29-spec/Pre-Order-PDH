/**
 * PDH CAMPUS ORDER SYSTEM
 * Configuration File: Config.gs
 * 
 * Centralized configuration for Google Apps Script Web App.
 * Manages Spreadsheet ID, Sheet definitions, Drive structure, and System constants.
 */

var CONFIG = {
  APP_NAME: 'PDH Campus Order',
  APP_VERSION: '1.0.0 (Tahap 1 - Fondasi)',
  
  // Spreadsheet Database Configuration
  // Uses ScriptProperties or fallback placeholder for initial setup
  SPREADSHEET_ID: (function() {
    try {
      var props = PropertiesService.getScriptProperties();
      var id = props.getProperty('SPREADSHEET_ID');
      return id || ''; // Can be set via initDatabase() or Script Properties
    } catch(e) {
      return '';
    }
  })(),

  // Google Sheets Table Names
  SHEETS: {
    // Phase 1 - Foundation Tables
    USERS: 'USERS',
    SETTINGS: 'SETTINGS',
    AUDIT_LOG: 'AUDIT_LOG',

    // Future Tables (Prepared Schemas)
    PRODUCTS: 'PRODUCTS',
    PRODUCT_SIZES: 'PRODUCT_SIZES',
    PRODUCT_IMAGES: 'PRODUCT_IMAGES',
    PO_PERIODS: 'PO_PERIODS',
    STUDENTS: 'STUDENTS',
    CLASSES: 'CLASSES',
    ORDERS: 'ORDERS',
    ORDER_ITEMS: 'ORDER_ITEMS',
    PAYMENTS: 'PAYMENTS',
    PAYMENT_PROOFS: 'PAYMENT_PROOFS',
    PRODUCTION_PROGRESS: 'PRODUCTION_PROGRESS',
    PICKUP_INFORMATION: 'PICKUP_INFORMATION',
    NOTIFICATIONS: 'NOTIFICATIONS'
  },

  // Google Drive Storage Structure
  DRIVE: {
    ROOT_FOLDER_NAME: 'PDH_CAMPUS',
    SUBFOLDERS: {
      DESIGN: 'DESIGN',
      PAYMENT_PROOF: 'PAYMENT_PROOF',
      RECEIPT: 'RECEIPT',
      PRODUCTION_PROGRESS: 'PRODUCTION_PROGRESS'
    }
  },

  // Application Roles (Strictly 2 Portals, No Koordinator role)
  ROLES: {
    PANITIA: 'PANITIA',
    MAHASISWA: 'MAHASISWA'
  },

  // Order types selected by student during checkout (not a user role)
  ORDER_TYPES: {
    PRIBADI: 'PRIBADI',
    KOLEKTIF: 'KOLEKTIF'
  },

  // Session Token Expiration (in milliseconds - 24 hours)
  SESSION_DURATION: 24 * 60 * 60 * 1000
};

/**
 * Update central Spreadsheet ID in Script Properties
 * @param {string} spreadsheetId 
 */
function setSpreadsheetId(spreadsheetId) {
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheetId.trim());
  CONFIG.SPREADSHEET_ID = spreadsheetId.trim();
  return { success: true, message: 'Spreadsheet ID berhasil disimpan: ' + spreadsheetId };
}

/**
 * Retrieve current configuration safely for frontend inspection
 */
function getSystemPublicConfig() {
  return {
    appName: CONFIG.APP_NAME,
    version: CONFIG.APP_VERSION,
    hasSpreadsheetId: !!CONFIG.SPREADSHEET_ID,
    roles: [CONFIG.ROLES.PANITIA, CONFIG.ROLES.MAHASISWA],
    sheets: Object.keys(CONFIG.SHEETS),
    driveFolders: CONFIG.DRIVE.SUBFOLDERS
  };
}
