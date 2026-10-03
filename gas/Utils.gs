/**
 * PDH CAMPUS ORDER SYSTEM
 * Utils File: Utils.gs
 * 
 * Helper utilities, standard response formats, and string/date processing.
 */

/**
 * Standardize server response format for all RPC calls
 * @param {boolean} success 
 * @param {*} [data] 
 * @param {string} [message] 
 * @returns {Object}
 */
function createResponse(success, data, message) {
  return {
    success: !!success,
    data: data !== undefined ? data : null,
    message: message || (success ? 'Operasi berhasil.' : 'Terjadi kesalahan.'),
    timestamp: new Date().toISOString()
  };
}

/**
 * Get audit log history for Panitia Dashboard
 * @param {string} userId 
 * @param {number} [limit] 
 */
function apiGetAuditLogs(userId, limit) {
  try {
    if (!authorizeRole(userId, CONFIG.ROLES.PANITIA)) {
      return createResponse(false, null, 'Akses ditolak. Membutuhkan hak akses Panitia.');
    }

    var logs = batchRead(CONFIG.SHEETS.AUDIT_LOG);
    var max = limit || 50;

    // Sort descending by timestamp
    logs.sort(function(a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    var sliced = logs.slice(0, max);
    return createResponse(true, sliced, 'Audit log berhasil dimuat.');
  } catch (err) {
    return createResponse(false, null, 'Gagal memuat audit log: ' + err.message);
  }
}

/**
 * Sanitize string input against dangerous characters
 * @param {string} str 
 */
function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>?/gm, '').trim();
}
