/**
 * PDH CAMPUS ORDER SYSTEM
 * Notification & Communication Service Module
 * 
 * Handles storing notifications in NOTIFICATIONS sheet, fetching user-bound notifications,
 * marking read status, and sending automated emails via MailApp / GmailApp.
 */

/**
 * Add a notification entry to NOTIFICATIONS sheet and optionally send email
 * @param {string} nim 
 * @param {string} orderId 
 * @param {string} type 
 * @param {string} title 
 * @param {string} message 
 * @param {boolean} sendEmail 
 */
function createNotification(nim, orderId, type, title, message, sendEmail) {
  try {
    if (!nim) return;

    var notifId = 'NTF-' + Date.now().toString(36).toUpperCase();
    var now = new Date().toISOString();

    var notifRecord = {
      notification_id: notifId,
      nim: String(nim).trim(),
      order_id: orderId || '',
      type: type || 'GENERAL',
      title: title,
      message: message,
      read_status: 'FALSE',
      created_at: now
    };

    appendRow(CONFIG.SHEETS.NOTIFICATIONS, notifRecord);

    if (sendEmail) {
      sendNotificationEmail(nim, title, message);
    }
  } catch (err) {
    Logger.log('Error creating notification: ' + err.message);
  }
}

/**
 * Send email notification to registered student
 * @param {string} nim 
 * @param {string} subject 
 * @param {string} body 
 */
function sendNotificationEmail(nim, subject, body) {
  try {
    var users = batchRead(CONFIG.SHEETS.USERS) || [];
    var user = users.find(function(u) {
      return String(u.nim || u.username).toLowerCase() === String(nim).toLowerCase();
    });

    if (user && user.email) {
      var htmlBody = '<div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; border-radius: 12px;">' +
        '<h2 style="color: #4f46e5; margin-bottom: 8px;">' + subject + '</h2>' +
        '<p style="color: #334155; font-size: 14px; line-height: 1.6;">' + body + '</p>' +
        '<hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">' +
        '<p style="color: #94a3b8; font-size: 12px;">Email otomatis dari PDH Campus Order System. Harap tidak membalas email ini.</p>' +
        '</div>';

      if (typeof MailApp !== 'undefined' && MailApp.sendEmail) {
        MailApp.sendEmail({
          to: user.email,
          subject: '[PDH CAMPUS] ' + subject,
          htmlBody: htmlBody
        });
      }
    }
  } catch (err) {
    Logger.log('Error sending notification email: ' + err.message);
  }
}

/**
 * Get student notifications for specific NIM
 * @param {string} userIdOrNim 
 * @returns {Object} ApiResponse
 */
function apiGetStudentNotifications(userIdOrNim) {
  try {
    var notifs = batchRead(CONFIG.SHEETS.NOTIFICATIONS) || [];
    var users = batchRead(CONFIG.SHEETS.USERS) || [];
    var user = users.find(function(u) {
      return u.user_id === userIdOrNim || u.username === userIdOrNim || u.nim === userIdOrNim;
    });

    var targetNim = user ? (user.nim || user.username) : userIdOrNim;

    var filtered = notifs.filter(function(n) {
      return String(n.nim).toLowerCase() === String(targetNim).toLowerCase();
    }).map(function(n) {
      return {
        notification_id: n.notification_id,
        nim: n.nim,
        order_id: n.order_id,
        type: n.type,
        title: n.title,
        message: n.message,
        read_status: String(n.read_status).toUpperCase() === 'TRUE',
        created_at: n.created_at
      };
    });

    filtered.sort(function(a, b) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return createResponse(true, filtered, 'Notifikasi berhasil dimuat.');
  } catch (err) {
    return createResponse(false, null, err.message);
  }
}

/**
 * Mark notification as read
 * @param {string} userIdOrNim 
 * @param {string} notifId 
 * @returns {Object} ApiResponse
 */
function apiMarkNotificationAsRead(userIdOrNim, notifId) {
  try {
    updateRowByField(CONFIG.SHEETS.NOTIFICATIONS, 'notification_id', notifId, { read_status: 'TRUE' });
    return createResponse(true, null, 'Notifikasi ditandai sebagai dibaca.');
  } catch (err) {
    return createResponse(false, null, err.message);
  }
}

/**
 * Mark all notifications as read for student
 * @param {string} userIdOrNim 
 * @returns {Object} ApiResponse
 */
function apiMarkAllNotificationsAsRead(userIdOrNim) {
  try {
    var users = batchRead(CONFIG.SHEETS.USERS) || [];
    var user = users.find(function(u) {
      return u.user_id === userIdOrNim || u.username === userIdOrNim || u.nim === userIdOrNim;
    });

    var targetNim = user ? (user.nim || user.username) : userIdOrNim;
    var notifs = batchRead(CONFIG.SHEETS.NOTIFICATIONS) || [];

    notifs.forEach(function(n) {
      if (String(n.nim).toLowerCase() === String(targetNim).toLowerCase()) {
        updateRowByField(CONFIG.SHEETS.NOTIFICATIONS, 'notification_id', n.notification_id, { read_status: 'TRUE' });
      }
    });

    return createResponse(true, null, 'Semua notifikasi ditandai telah dibaca.');
  } catch (err) {
    return createResponse(false, null, err.message);
  }
}

/**
 * Get Panitia system alerts & pending counts
 * @param {string} panitiaUserId 
 * @returns {Object} ApiResponse
 */
function apiGetPanitiaAlerts(panitiaUserId) {
  try {
    if (!authorizeRole(panitiaUserId, CONFIG.ROLES.PANITIA)) {
      return createResponse(false, null, 'Akses ditolak.');
    }

    var orders = apiGetAllOrdersPanitia(panitiaUserId).data || [];

    var pendingPaymentsCount = orders.filter(function(o) { return o.payment_status === 'MENUNGGU APPROVAL'; }).length;
    var pendingOrdersCount = orders.filter(function(o) { return o.status === 'PENDING_PAYMENT'; }).length;
    var productionActiveCount = orders.filter(function(o) { return o.production_status === 'Sedang Diproduksi'; }).length;
    var readyPickupCount = orders.filter(function(o) { return o.pickup_status === 'Siap Diambil'; }).length;

    return createResponse(true, {
      pendingPaymentsCount: pendingPaymentsCount,
      pendingOrdersCount: pendingOrdersCount,
      productionActiveCount: productionActiveCount,
      readyPickupCount: readyPickupCount,
      alertsList: [
        { id: 'ALT-01', title: 'Pembayaran Menunggu Approval', count: pendingPaymentsCount, type: 'PAYMENT', message: pendingPaymentsCount + ' bukti transfer menunggu verifikasi.' },
        { id: 'ALT-02', title: 'Pesanan Menunggu Pembayaran', count: pendingOrdersCount, type: 'ORDER', message: pendingOrdersCount + ' pesanan belum dibayar.' },
        { id: 'ALT-03', title: 'Progres Produksi Aktif', count: productionActiveCount, type: 'PRODUCTION', message: productionActiveCount + ' pesanan sedang dikerjakan vendor.' },
        { id: 'ALT-04', title: 'Pesanan Siap Diambil', count: readyPickupCount, type: 'PICKUP', message: readyPickupCount + ' pesanan siap diserahkan.' }
      ]
    }, 'Panitia alerts loaded.');
  } catch (err) {
    return createResponse(false, null, err.message);
  }
}
