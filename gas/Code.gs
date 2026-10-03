/**
 * PDH CAMPUS ORDER SYSTEM
 * Main Entry Point: Code.gs
 * 
 * Google Apps Script Web App entry point and API dispatcher.
 */

/**
 * Main Web App Entry Point
 * @param {Object} e Event object from GAS Web App request
 * @returns {GoogleAppsScript.HTML.HtmlOutput}
 */
function doGet(e) {
  try {
    var template = HtmlService.createTemplateFromFile('Index');
    
    // Evaluate template to HTML output
    var output = template.evaluate();
    
    // Set web app configuration
    output.setTitle(CONFIG.APP_NAME + ' - System Pemesanan PDH Kampus');
    output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    output.addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
    
    return output;
  } catch (err) {
    return HtmlService.createHtmlOutput('<h3>Error Loading Web App</h3><p>' + err.message + '</p>');
  }
}

/**
 * Helper to include HTML sub-files (Styles.html, Scripts.html) into Index.html
 * @param {string} filename 
 * @returns {string}
 */
function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (err) {
    Logger.log('Optional HTML file include "' + filename + '" skipped: ' + err.message);
    return '';
  }
}

/**
 * Public RPC Functions callable via google.script.run from client-side
 */

// 1. System Config & Health check
function getSystemInfo() {
  return createResponse(true, getSystemPublicConfig(), 'System config loaded.');
}

// 2. Authentication API
function loginUser(credentials) {
  return apiAuthenticateUser(credentials);
}

function getUserProfile(userId) {
  return apiGetUserProfile(userId);
}

function sendOTP(email) {
  return apiSendOTP(email);
}

function registerStudent(payload) {
  return apiRegisterStudent(payload);
}

function verifyAccountToken(token) {
  return apiVerifyAccountToken(token);
}

function sendPasswordResetLink(nim) {
  return apiSendPasswordResetLink(nim);
}

function resetPasswordWithToken(token, newPassword) {
  return apiResetPasswordWithToken(token, newPassword);
}

function trackOrderPublic(nim) {
  return apiTrackOrderPublic(nim);
}

// 3. Database Management (Panitia)
function setupDatabase(spreadsheetId) {
  return initDatabase(spreadsheetId);
}

function getDatabaseTables(userId) {
  if (!authorizeRole(userId, CONFIG.ROLES.PANITIA)) {
    return createResponse(false, null, 'Akses ditolak.');
  }

  try {
    var summary = {};
    Object.keys(CONFIG.SHEETS).forEach(function(key) {
      var sheetName = CONFIG.SHEETS[key];
      var rows = batchRead(sheetName);
      summary[sheetName] = {
        rowCount: rows.length,
        headers: SCHEMAS[sheetName] || []
      };
    });
    return createResponse(true, summary, 'Tabel database berhasil dimuat.');
  } catch (err) {
    return createResponse(false, null, 'Gagal membaca status database: ' + err.message);
  }
}

// 4. Drive Storage Setup
function setupDriveFolders(userId) {
  if (!authorizeRole(userId, CONFIG.ROLES.PANITIA)) {
    return createResponse(false, null, 'Akses ditolak.');
  }
  return apiInitDriveFolders();
}

// 5. Audit Log Viewer
function getAuditLogs(userId, limit) {
  return apiGetAuditLogs(userId, limit);
}

// 6. Master PDH Management
function getPDHMasterData() {
  return apiGetPDHMasterData();
}

function updatePDHInfo(userId, infoData) {
  return apiUpdatePDHInfo(userId, infoData);
}

function updatePDHPricing(userId, pricingData) {
  return apiUpdatePDHPricing(userId, pricingData);
}

function savePDHSize(userId, sizeData) {
  return apiSavePDHSize(userId, sizeData);
}

function uploadPDHDesignImage(userId, filePayload) {
  return apiUploadPDHDesign(userId, filePayload);
}

function updatePDHPaymentInfo(userId, paymentData) {
  return apiUpdatePDHPaymentInfo(userId, paymentData);
}

// 7. PO Period Management
function getActivePOPeriod() {
  return apiGetActivePOPeriod();
}

function getAllPOPeriods() {
  return apiGetAllPOPeriods();
}

function savePOPeriod(userId, poData) {
  return apiSavePOPeriod(userId, poData);
}

function togglePOStatus(userId, periodId, targetStatus) {
  return apiTogglePOStatus(userId, periodId, targetStatus);
}

function validatePOAccess() {
  return apiValidatePOAccess();
}

// 8. Order Management (Student)
function createOrder(userId, payload) {
  return apiCreateOrder(userId, payload);
}

function getStudentOrders(userId) {
  return apiGetStudentOrders(userId);
}

// 9. Payment & Panitia Order Management
function uploadPaymentProof(userId, orderId, method, fileBase64, fileName, mimeType) {
  return apiUploadPaymentProof(userId, orderId, method, fileBase64, fileName, mimeType);
}

function getAllPayments(userId) {
  return apiGetAllPayments(userId);
}

function approvePayment(userId, orderId) {
  return apiApprovePayment(userId, orderId);
}

function rejectPayment(userId, orderId, reason) {
  return apiRejectPayment(userId, orderId, reason);
}

function getAllOrdersPanitia(userId) {
  return apiGetAllOrdersPanitia(userId);
}

function updateOrderDetails(userId, orderId, payload) {
  return apiUpdateOrderDetails(userId, orderId, payload);
}

function cancelOrder(userId, orderId, cancelReason) {
  return apiCancelOrder(userId, orderId, cancelReason);
}

function getProductionOrdersPanitia(userId) {
  return apiGetProductionOrdersPanitia(userId);
}

function updateProductionProgress(userId, orderId, payload) {
  return apiUpdateProductionProgress(userId, orderId, payload);
}

function getPickupSettings() {
  return apiGetPickupSettings();
}

function savePickupSettings(userId, payload) {
  return apiSavePickupSettings(userId, payload);
}

function markOrderSiapDiambil(userId, orderId) {
  return apiMarkOrderSiapDiambil(userId, orderId);
}

function confirmOrderPickup(userId, orderId, notes) {
  return apiConfirmOrderPickup(userId, orderId, notes);
}

function updateOrderStatus(userId, orderId, newStatus) {
  return apiUpdateOrderStatus(userId, orderId, newStatus);
}

function importStudents(panitiaUserId, filename, studentRows, confirmSave) {
  return apiImportStudents(panitiaUserId, filename, studentRows, confirmSave);
}

function importCollectiveMembers(panitiaUserId, filename, memberRows, confirmSave) {
  return apiImportCollectiveMembers(panitiaUserId, filename, memberRows, confirmSave);
}

function logExportData(panitiaUserId, exportType, rowCount) {
  return apiLogExportData(panitiaUserId, exportType, rowCount);
}

function getStudentNotifications(userIdOrNim) {
  return apiGetStudentNotifications(userIdOrNim);
}

function markNotificationAsRead(userIdOrNim, notifId) {
  return apiMarkNotificationAsRead(userIdOrNim, notifId);
}

function markAllNotificationsAsRead(userIdOrNim) {
  return apiMarkAllNotificationsAsRead(userIdOrNim);
}

function getPanitiaAlerts(panitiaUserId) {
  return apiGetPanitiaAlerts(panitiaUserId);
}

// 10. Tahap 13 Enhancements: Master Design, Bulk Production, User Access, and Student History
function deletePDHDesignImage(userId, imageId) {
  return apiDeletePDHDesign(userId, imageId);
}

function replacePDHDesignImage(userId, imageId, filePayload) {
  return apiReplacePDHDesign(userId, imageId, filePayload);
}

function bulkUpdateProductionProgress(userId, orderIds, stageName, percentage, notes, photoPayload) {
  return apiBulkUpdateProductionProgress(userId, orderIds, stageName, percentage, notes, photoPayload);
}

function uploadBulkProductionPhoto(userId, orderIds, photoPayload) {
  return apiUploadBulkProductionPhoto(userId, orderIds, photoPayload);
}

function uploadProductionProgressPhoto(userId, orderId, photoPayload) {
  return apiUploadProductionProgressPhoto(userId, orderId, photoPayload);
}

function getAllPanitiaUsers(userId) {
  return apiGetAllPanitiaUsers(userId);
}

function createPanitiaUser(userId, payload) {
  return apiCreatePanitiaUser(userId, payload);
}

function updatePanitiaUser(userId, targetUserId, payload) {
  return apiUpdatePanitiaUser(userId, targetUserId, payload);
}

function togglePanitiaUserStatus(userId, targetUserId, newStatus) {
  return apiTogglePanitiaUserStatus(userId, targetUserId, newStatus);
}

function resetPanitiaUserPassword(userId, targetUserId, newPassword, confirmPassword) {
  return apiResetPanitiaUserPassword(userId, targetUserId, newPassword, confirmPassword);
}

function getAllStudentsPanitia(userId) {
  return apiGetAllStudentsPanitia(userId);
}

function getStudentPDHHistory(userIdOrNim) {
  return apiGetStudentPDHHistory(userIdOrNim);
}



