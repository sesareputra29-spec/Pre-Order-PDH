/**
 * PDH CAMPUS ORDER SYSTEM
 * Order Service File: OrderService.gs
 * 
 * Manages Order Creation, Server-side Class Validation, Price/Size Calculation, and Order History.
 */

// Regex for Class Code: 2 digits semester + MJSP/MJSM/MJSE + 3 digits class
var CLASS_CODE_REGEX = /^\d{2}(MJSP|MJSM|MJSE)\d{3}$/i;

/**
 * Validate class code string
 * @param {string} classCode 
 * @returns {boolean}
 */
function isValidClassCode(classCode) {
  if (!classCode) return false;
  return CLASS_CODE_REGEX.test(String(classCode).trim());
}

/**
 * Process new order creation with server-side validation & pricing calculation
 * @param {string} userId 
 * @param {Object} payload 
 */
function apiCreateOrder(userId, payload) {
  try {
    if (!userId) {
      return createResponse(false, null, 'Sesi pengguna tidak valid. Silakan login kembali.');
    }

    // 1. Server-side PO Access Validation (Requirement 7)
    var poValidation = apiValidatePOAccess();
    if (!poValidation.success) {
      return createResponse(false, null, poValidation.message);
    }

    // 2. Validate Order Buyer Payload
    if (!payload || !payload.buyerName || !payload.buyerNim || !payload.buyerClass || !payload.buyerWhatsapp) {
      return createResponse(false, null, 'Data pemesan (Nama, NIM, Kelas, WhatsApp) wajib diisi.');
    }

    var buyerClassClean = String(payload.buyerClass).trim().toUpperCase();
    if (!isValidClassCode(buyerClassClean)) {
      return createResponse(false, null, 'Format Kelas pemesan tidak valid! Contoh format valid: 01MJSP001, 01MJSM001, 01MJSE001.');
    }

    if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
      return createResponse(false, null, 'Pesanan harus berisi minimal 1 item/anggota.');
    }

    // 2b. Server-Side Anti-Duplication Check (Requirement 5)
    var nimsToCheck = [String(payload.buyerNim).trim()];
    payload.items.forEach(function(itm) {
      if (itm.nim) nimsToCheck.push(String(itm.nim).trim());
    });

    // Check duplicate NIMs within the same payload first
    var seenInPayload = new Set();
    for (var n = 0; n < nimsToCheck.length; n++) {
      var checkNim = nimsToCheck[n];
      if (seenInPayload.has(checkNim)) {
        return createResponse(false, null, 'NIM ' + checkNim + ' terdaftar duplikat dalam pengisian pesanan ini.');
      }
      seenInPayload.add(checkNim);
    }

    // Check duplicate NIMs against existing active orders in DB
    var activeOrders = batchRead(CONFIG.SHEETS.ORDERS);
    var activeItems = batchRead(CONFIG.SHEETS.ORDER_ITEMS);
    var activeNimSet = new Set();

    for (var o = 0; o < activeOrders.length; o++) {
      var ordRec = activeOrders[o];
      if (ordRec.status === 'DIBATALKAN') continue;

      if (ordRec.buyer_nim) activeNimSet.add(String(ordRec.buyer_nim).trim().toLowerCase());

      for (var it = 0; it < activeItems.length; it++) {
        if (activeItems[it].order_id === ordRec.order_id && activeItems[it].nim) {
          activeNimSet.add(String(activeItems[it].nim).trim().toLowerCase());
        }
      }
    }

    for (var c = 0; c < nimsToCheck.length; c++) {
      var targetNimLower = nimsToCheck[c].toLowerCase();
      if (activeNimSet.has(targetNimLower)) {
        return createResponse(false, null, 'NIM ' + nimsToCheck[c] + ' sudah terdaftar dalam pesanan PDH aktif.');
      }
    }

    // 3. Fetch Master PDH Active Pricing & Sizes from Database
    var masterRes = apiGetPDHMasterData();
    if (!masterRes.success || !masterRes.data) {
      return createResponse(false, null, 'Gagal mengambil data harga & ukuran dari Master PDH.');
    }

    var basePrice = masterRes.data.pricing.price || 185000;
    var activeSizesMap = {};
    masterRes.data.sizes.forEach(function(s) {
      if (s.status === 'ACTIVE') {
        activeSizesMap[s.size_code.toUpperCase()] = s.extra_fee || 0;
      }
    });

    // 4. Validate Each Item & Calculate Total Server-Side (Never Trust Client Total)
    var processedItems = [];
    var calculatedTotal = 0;
    var totalQuantity = 0;

    for (var i = 0; i < payload.items.length; i++) {
      var item = payload.items[i];

      var itemName = String(item.fullName || payload.buyerName).trim();
      var itemNim = String(item.nim || payload.buyerNim).trim();
      var itemClass = String(item.className || buyerClassClean).trim().toUpperCase();
      var sizeCode = String(item.sizeCode || 'M').trim().toUpperCase();
      var quantity = parseInt(item.quantity || 1, 10);
      if (quantity < 1) quantity = 1;

      if (!isValidClassCode(itemClass)) {
        return createResponse(false, null, 'Format kelas tidak valid untuk anggota ' + itemName + ' (' + itemClass + '). Contoh: 01MJSP001');
      }

      if (activeSizesMap[sizeCode] === undefined) {
        return createResponse(false, null, 'Ukuran ' + sizeCode + ' tidak tersedia atau nonaktif.');
      }

      var extraFee = activeSizesMap[sizeCode];
      var unitPrice = basePrice + extraFee;
      var subtotal = unitPrice * quantity;

      calculatedTotal += subtotal;
      totalQuantity += quantity;

      processedItems.push({
        student_name: itemName,
        nim: itemNim,
        class_name: itemClass,
        size_code: sizeCode,
        custom_name: String(item.customName || itemName).trim(),
        quantity: quantity,
        unit_price: unitPrice,
        subtotal: subtotal
      });
    }

    // 5. Generate Unique Order ID & Order Number
    var orderId = generateUniqueId('ORD');
    var datePrefix = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd');
    var randomOrderNum = Math.floor(1000 + Math.random() * 9000);
    var orderNumber = 'PDH-' + datePrefix + '-' + randomOrderNum;

    var now = new Date().toISOString();

    // 6. Save Order Header to ORDERS Sheet
    var orderHeader = {
      order_id: orderId,
      order_number: orderNumber,
      user_id: userId,
      order_type: payload.orderType || 'PRIBADI',
      status: 'PENDING_PAYMENT',
      payment_status: 'UNPAID',
      total_amount: calculatedTotal,
      buyer_name: payload.buyerName.trim(),
      buyer_nim: payload.buyerNim.trim(),
      buyer_class: buyerClassClean,
      buyer_whatsapp: payload.buyerWhatsapp.trim(),
      item_count: totalQuantity,
      notes: payload.notes || '',
      created_at: now
    };

    appendData(CONFIG.SHEETS.ORDERS, orderHeader);

    // 7. Save Order Items to ORDER_ITEMS Sheet
    for (var j = 0; j < processedItems.length; j++) {
      var itm = processedItems[j];
      var itemId = generateUniqueId('ITM');

      appendData(CONFIG.SHEETS.ORDER_ITEMS, {
        item_id: itemId,
        order_id: orderId,
        product_id: 'PDH-2026-MAIN',
        size_code: itm.size_code,
        custom_name: itm.custom_name,
        quantity: itm.quantity,
        unit_price: itm.unit_price,
        subtotal: itm.subtotal,
        student_name: itm.student_name,
        nim: itm.nim,
        class_name: itm.class_name
      });

      // Also upsert to STUDENTS sheet
      appendData(CONFIG.SHEETS.STUDENTS, {
        student_id: generateUniqueId('STD'),
        user_id: userId,
        nim: itm.nim,
        full_name: itm.student_name,
        class_name: itm.class_name,
        whatsapp: payload.buyerWhatsapp.trim(),
        created_at: now
      });
    }

    // 8. Audit Log Registration
    logAudit(userId, 'CREATE_ORDER', 'ORDER', {
      orderId: orderId,
      orderNumber: orderNumber,
      orderType: payload.orderType,
      itemCount: totalQuantity,
      totalAmount: calculatedTotal
    });

    return createResponse(true, {
      order_id: orderId,
      order_number: orderNumber,
      total_amount: calculatedTotal,
      item_count: totalQuantity,
      status: 'PENDING_PAYMENT'
    }, 'Pesanan PDH berhasil dibuat dengan Nomor Order: ' + orderNumber);

  } catch(err) {
    Logger.log('Error apiCreateOrder: ' + err.message);
    return createResponse(false, null, 'Gagal menyimpan pesanan: ' + err.message);
  }
}

/**
 * Get student's order history
 * @param {string} userId 
 */
function apiGetStudentOrders(userId) {
  try {
    if (!userId) return createResponse(false, [], 'User ID required.');

    var allOrders = batchRead(CONFIG.SHEETS.ORDERS);
    var allItems = batchRead(CONFIG.SHEETS.ORDER_ITEMS);

    var studentOrders = [];

    for (var i = 0; i < allOrders.length; i++) {
      var ord = allOrders[i];
      if (ord.user_id === userId) {
        var itemsForOrder = [];
        for (var j = 0; j < allItems.length; j++) {
          if (allItems[j].order_id === ord.order_id) {
            itemsForOrder.push({
              item_id: allItems[j].item_id,
              order_id: allItems[j].order_id,
              size_code: allItems[j].size_code,
              custom_name: allItems[j].custom_name,
              quantity: parseFloat(allItems[j].quantity || 1),
              unit_price: parseFloat(allItems[j].unit_price || 0),
              subtotal: parseFloat(allItems[j].subtotal || 0),
              student_name: allItems[j].student_name,
              nim: allItems[j].nim,
              class_name: allItems[j].class_name
            });
          }
        }

        studentOrders.push({
          order_id: ord.order_id,
          order_number: ord.order_number,
          user_id: ord.user_id,
          order_type: ord.order_type || 'PRIBADI',
          status: ord.status || 'PENDING_PAYMENT',
          payment_status: ord.payment_status || 'BELUM_BAYAR',
          payment_method: ord.payment_method || '',
          payment_proof_file_id: ord.payment_proof_file_id || '',
          payment_proof_url: ord.payment_proof_url || '',
          payment_rejection_reason: ord.payment_rejection_reason || '',
          payment_uploaded_at: ord.payment_uploaded_at || '',
          payment_approved_at: ord.payment_approved_at || '',
          total_amount: parseFloat(ord.total_amount || 0),
          buyer_name: ord.buyer_name,
          buyer_nim: ord.buyer_nim,
          buyer_class: ord.buyer_class,
          buyer_whatsapp: ord.buyer_whatsapp,
          item_count: parseFloat(ord.item_count || 1),
          items: itemsForOrder,
          created_at: ord.created_at
        });
      }
    }

    // Sort descending by date
    studentOrders.sort(function(a, b) {
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return createResponse(true, studentOrders, 'Daftar pesanan berhasil dimuat.');
  } catch(err) {
    return createResponse(false, [], 'Gagal memuat pesanan: ' + err.message);
  }
}

/**
 * Upload payment proof (transfer proof / cash receipt) for an order
 * @param {string} userId 
 * @param {string} orderId 
 * @param {string} method TRANSFER | CASH
 * @param {string} fileBase64 Base64 string of uploaded proof
 * @param {string} fileName Original filename
 * @param {string} mimeType File mime type (image/jpeg, image/png, application/pdf)
 */
function apiUploadPaymentProof(userId, orderId, method, fileBase64, fileName, mimeType) {
  try {
    if (!userId || !orderId) {
      return createResponse(false, null, 'Parameter userId dan orderId wajib diisi.');
    }

    if (!fileBase64) {
      return createResponse(false, null, 'Bukti pembayaran wajib diunggah.');
    }

    // Validate File Type (JPG, JPEG, PNG, PDF allowed)
    var ext = (fileName || '').split('.').pop().toLowerCase();
    var allowedExts = ['jpg', 'jpeg', 'png', 'pdf'];
    var allowedMimes = ['image/jpeg', 'image/png', 'application/pdf', 'image/jpg'];

    var isExtValid = allowedExts.indexOf(ext) >= 0;
    var isMimeValid = !mimeType || allowedMimes.indexOf(mimeType.toLowerCase()) >= 0;

    if (!isExtValid && !isMimeValid) {
      return createResponse(false, null, 'Format file tidak diperbolehkan. Hanya file JPG, JPEG, PNG, dan PDF yang diperbolehkan.');
    }

    var orders = batchRead(CONFIG.SHEETS.ORDERS);
    var targetIdx = -1;
    var targetOrder = null;

    for (var i = 0; i < orders.length; i++) {
      if (orders[i].order_id === orderId) {
        targetIdx = i;
        targetOrder = orders[i];
        break;
      }
    }

    if (!targetOrder) {
      return createResponse(false, null, 'Pesanan dengan ID ' + orderId + ' tidak ditemukan.');
    }

    // Verify ownership (or Panitia)
    if (targetOrder.user_id !== userId && !hasRole(userId, 'PANITIA')) {
      return createResponse(false, null, 'Anda tidak memiliki akses untuk mengunggah bukti pada pesanan ini.');
    }

    // Upload to Google Drive PAYMENT_PROOF folder
    var folderId = getDriveSubfolderId('PAYMENT_PROOF');
    var uploadRes = uploadFileToFolder(folderId, fileName || ('PROOF_' + orderId + '.' + ext), mimeType || 'image/jpeg', fileBase64);

    var fileId = uploadRes ? uploadRes.id : ('DRV-PROOF-' + Date.now());
    var fileUrl = uploadRes ? uploadRes.url : ('https://drive.google.com/file/d/' + fileId + '/view');
    var now = new Date().toISOString();

    // Update Order Header in Database
    var updatedOrder = {
      order_id: targetOrder.order_id,
      payment_method: method || 'TRANSFER',
      payment_status: 'MENUNGGU APPROVAL',
      payment_proof_file_id: fileId,
      payment_proof_url: fileUrl,
      payment_uploaded_at: now,
      payment_rejection_reason: '',
      updated_at: now
    };

    updateData(CONFIG.SHEETS.ORDERS, 'order_id', orderId, updatedOrder);

    logAudit(userId, 'UPLOAD_PAYMENT_PROOF', 'ORDER', {
      orderId: orderId,
      method: method,
      fileId: fileId,
      fileName: fileName
    });

    return createResponse(true, {
      order_id: orderId,
      payment_method: method,
      payment_status: 'MENUNGGU APPROVAL',
      payment_proof_file_id: fileId,
      payment_proof_url: fileUrl,
      payment_uploaded_at: now
    }, 'Bukti pembayaran berhasil diunggah. Status: MENUNGGU APPROVAL');

  } catch(err) {
    Logger.log('Error apiUploadPaymentProof: ' + err.message);
    return createResponse(false, null, 'Gagal mengunggah bukti pembayaran: ' + err.message);
  }
}

/**
 * Get all payment records for Panitia
 * @param {string} userId 
 */
function apiGetAllPayments(userId) {
  try {
    if (!hasRole(userId, 'PANITIA')) {
      return createResponse(false, [], 'Akses ditolak: Hanya Panitia yang dapat mengakses data pembayaran.');
    }

    var allOrders = batchRead(CONFIG.SHEETS.ORDERS);

    // Filter or map orders
    var payments = allOrders.map(function(ord) {
      return {
        order_id: ord.order_id,
        order_number: ord.order_number,
        buyer_name: ord.buyer_name,
        buyer_nim: ord.buyer_nim,
        buyer_class: ord.buyer_class,
        buyer_whatsapp: ord.buyer_whatsapp,
        order_type: ord.order_type || 'PRIBADI',
        payment_method: ord.payment_method || 'TRANSFER',
        payment_status: ord.payment_status || 'BELUM_BAYAR',
        total_amount: parseFloat(ord.total_amount || 0),
        payment_proof_file_id: ord.payment_proof_file_id || '',
        payment_proof_url: ord.payment_proof_url || '',
        payment_uploaded_at: ord.payment_uploaded_at || '',
        payment_rejection_reason: ord.payment_rejection_reason || '',
        created_at: ord.created_at
      };
    });

    payments.sort(function(a, b) {
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return createResponse(true, payments, 'Daftar seluruh pembayaran berhasil dimuat.');
  } catch(err) {
    return createResponse(false, [], 'Gagal memuat data pembayaran: ' + err.message);
  }
}

/**
 * Approve student payment (Panitia action)
 * @param {string} userId 
 * @param {string} orderId 
 */
function apiApprovePayment(userId, orderId) {
  try {
    if (!hasRole(userId, 'PANITIA')) {
      return createResponse(false, null, 'Akses ditolak: Hanya Panitia yang dapat menyetujui pembayaran.');
    }

    if (!orderId) {
      return createResponse(false, null, 'Order ID wajib diisi.');
    }

    var orders = batchRead(CONFIG.SHEETS.ORDERS) || [];
    var targetOrder = null;
    for (var i = 0; i < orders.length; i++) {
      if (orders[i].order_id === orderId || orders[i].order_number === orderId) {
        targetOrder = orders[i];
        break;
      }
    }

    if (!targetOrder) {
      return createResponse(false, null, 'Pesanan tidak ditemukan.');
    }

    if (targetOrder.payment_status === 'LUNAS' || targetOrder.payment_status === 'PAID') {
      return createResponse(false, null, 'Pembayaran pesanan ini sudah LUNAS / disetujui sebelumnya.');
    }

    var users = batchRead(CONFIG.SHEETS.USERS) || [];
    var panitiaUser = users.find(function(u) { return u.user_id === userId || u.username === userId; });
    var panitiaName = panitiaUser ? (panitiaUser.name || panitiaUser.username) : userId;

    var now = new Date().toISOString();
    var updatePayload = {
      order_id: targetOrder.order_id,
      payment_status: 'LUNAS',
      status: 'PEMBAYARAN LUNAS',
      payment_approved_at: now,
      payment_approved_by: panitiaName,
      updated_at: now
    };

    updateData(CONFIG.SHEETS.ORDERS, 'order_id', targetOrder.order_id, updatePayload);

    logAudit(userId, 'APPROVE_PAYMENT', 'ORDER', {
      orderId: targetOrder.order_id,
      status: 'LUNAS',
      approvedBy: panitiaName
    });

    if (targetOrder.buyer_nim) {
      createNotification(
        targetOrder.buyer_nim,
        targetOrder.order_id,
        'PAYMENT_APPROVED',
        'Pembayaran Lunas & Disetujui',
        'Selamat! Pembayaran untuk pesanan ' + targetOrder.order_number + ' telah diverifikasi LUNAS oleh Panitia.',
        true
      );
    }

    return createResponse(true, { order_id: targetOrder.order_id, payment_status: 'LUNAS' }, 'Pembayaran berhasil disetujui.');
  } catch(err) {
    return createResponse(false, null, 'Gagal menyetujui pembayaran: ' + err.message);
  }
}

/**
 * Reject student payment with required reason (Panitia action)
 * @param {string} userId 
 * @param {string} orderId 
 * @param {string} reason 
 */
function apiRejectPayment(userId, orderId, reason) {
  try {
    if (!hasRole(userId, 'PANITIA')) {
      return createResponse(false, null, 'Akses ditolak: Hanya Panitia yang dapat menolak pembayaran.');
    }

    if (!reason || !String(reason).trim()) {
      return createResponse(false, null, 'Alasan penolakan wajib diisi oleh Panitia.');
    }

    var now = new Date().toISOString();
    var updatePayload = {
      order_id: orderId,
      payment_status: 'DITOLAK',
      payment_rejection_reason: String(reason).trim(),
      updated_at: now
    };

    updateData(CONFIG.SHEETS.ORDERS, 'order_id', orderId, updatePayload);

    logAudit(userId, 'REJECT_PAYMENT', 'ORDER', {
      orderId: orderId,
      reason: reason
    });

    return createResponse(true, { order_id: orderId, payment_status: 'DITOLAK' }, 'Pembayaran ditolak. Alasan: ' + reason);
  } catch(err) {
    return createResponse(false, null, 'Gagal menolak pembayaran: ' + err.message);
  }
}

/**
 * Get all student orders for Panitia Management Portal
 * @param {string} userId 
 */
function apiGetAllOrdersPanitia(userId) {
  try {
    if (!hasRole(userId, 'PANITIA')) {
      return createResponse(false, [], 'Akses ditolak: Hanya Panitia yang dapat mengelola seluruh pesanan.');
    }

    var allOrders = batchRead(CONFIG.SHEETS.ORDERS);
    var allItems = batchRead(CONFIG.SHEETS.ORDER_ITEMS);

    var ordersList = [];

    for (var i = 0; i < allOrders.length; i++) {
      var ord = allOrders[i];
      var itemsForOrder = [];

      for (var j = 0; j < allItems.length; j++) {
        if (allItems[j].order_id === ord.order_id) {
          itemsForOrder.push({
            item_id: allItems[j].item_id,
            order_id: allItems[j].order_id,
            size_code: allItems[j].size_code,
            custom_name: allItems[j].custom_name,
            quantity: parseFloat(allItems[j].quantity || 1),
            unit_price: parseFloat(allItems[j].unit_price || 0),
            subtotal: parseFloat(allItems[j].subtotal || 0),
            student_name: allItems[j].student_name,
            nim: allItems[j].nim,
            class_name: allItems[j].class_name
          });
        }
      }

      ordersList.push({
        order_id: ord.order_id,
        order_number: ord.order_number,
        user_id: ord.user_id,
        order_type: ord.order_type || 'PRIBADI',
        status: ord.status || 'MENUNGGU PEMBAYARAN',
        payment_status: ord.payment_status || 'BELUM_BAYAR',
        payment_method: ord.payment_method || 'TRANSFER',
        payment_proof_file_id: ord.payment_proof_file_id || '',
        payment_proof_url: ord.payment_proof_url || '',
        payment_rejection_reason: ord.payment_rejection_reason || '',
        cancel_reason: ord.cancel_reason || '',
        total_amount: parseFloat(ord.total_amount || 0),
        buyer_name: ord.buyer_name,
        buyer_nim: ord.buyer_nim,
        buyer_class: ord.buyer_class,
        buyer_whatsapp: ord.buyer_whatsapp,
        item_count: parseFloat(ord.item_count || itemsForOrder.length || 1),
        notes: ord.notes || '',
        items: itemsForOrder,
        created_at: ord.created_at,
        updated_at: ord.updated_at
      });
    }

    ordersList.sort(function(a, b) {
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return createResponse(true, ordersList, 'Daftar seluruh pesanan berhasil dimuat.');
  } catch(err) {
    return createResponse(false, [], 'Gagal memuat pesanan: ' + err.message);
  }
}

/**
 * Edit student order data (Panitia action)
 * @param {string} userId 
 * @param {string} orderId 
 * @param {Object} payload { buyer_name, buyer_nim, buyer_class, buyer_whatsapp, notes, items: [...] }
 */
function apiUpdateOrderDetails(userId, orderId, payload) {
  try {
    if (!hasRole(userId, 'PANITIA')) {
      return createResponse(false, null, 'Akses ditolak: Hanya Panitia yang dapat mengubah data pesanan.');
    }

    if (!payload || !payload.buyer_name || !payload.buyer_nim || !payload.buyer_class) {
      return createResponse(false, null, 'Data pemesan (Nama, NIM, Kelas) wajib diisi.');
    }

    var buyerClassClean = String(payload.buyer_class).trim().toUpperCase();
    if (!isValidClassCode(buyerClassClean)) {
      return createResponse(false, null, 'Format Kelas pemesan tidak valid! Harus berformat ##MJSP###, ##MJSM###, atau ##MJSE###.');
    }

    var orders = batchRead(CONFIG.SHEETS.ORDERS);
    var targetOrder = null;
    for (var i = 0; i < orders.length; i++) {
      if (orders[i].order_id === orderId) {
        targetOrder = orders[i];
        break;
      }
    }

    if (!targetOrder) {
      return createResponse(false, null, 'Pesanan tidak ditemukan.');
    }

    // Fetch Master PDH Pricing to validate size fees
    var masterRes = apiGetPDHMasterData();
    var basePrice = masterRes.success && masterRes.data ? (masterRes.data.pricing.price || 185000) : 185000;
    var activeSizesMap = {};
    if (masterRes.success && masterRes.data && masterRes.data.sizes) {
      masterRes.data.sizes.forEach(function(s) {
        if (s.status === 'ACTIVE') activeSizesMap[s.size_code.toUpperCase()] = s.extra_fee || 0;
      });
    }

    var updatedItems = payload.items || [];
    var calculatedTotal = 0;
    var totalQty = 0;

    for (var j = 0; j < updatedItems.length; j++) {
      var itm = updatedItems[j];
      var itmClass = String(itm.class_name || buyerClassClean).trim().toUpperCase();
      var sizeCode = String(itm.size_code || 'M').trim().toUpperCase();
      var qty = Math.max(1, parseInt(itm.quantity || 1, 10));

      if (!isValidClassCode(itmClass)) {
        return createResponse(false, null, 'Format kelas anggota ' + itm.student_name + ' tidak valid.');
      }

      var extraFee = activeSizesMap[sizeCode] !== undefined ? activeSizesMap[sizeCode] : 0;
      var unitPrice = basePrice + extraFee;
      var subtotal = unitPrice * qty;

      calculatedTotal += subtotal;
      totalQty += qty;

      itm.unit_price = unitPrice;
      itm.subtotal = subtotal;
      itm.class_name = itmClass;
      itm.size_code = sizeCode;
    }

    var now = new Date().toISOString();
    var updatedHeader = {
      order_id: orderId,
      buyer_name: String(payload.buyer_name).trim(),
      buyer_nim: String(payload.buyer_nim).trim(),
      buyer_class: buyerClassClean,
      buyer_whatsapp: String(payload.buyer_whatsapp || '').trim(),
      notes: String(payload.notes || '').trim(),
      total_amount: calculatedTotal,
      item_count: totalQty,
      updated_at: now
    };

    updateData(CONFIG.SHEETS.ORDERS, 'order_id', orderId, updatedHeader);

    logAudit(userId, 'EDIT_ORDER', 'ORDER', {
      orderId: orderId,
      before: {
        buyer_name: targetOrder.buyer_name,
        buyer_nim: targetOrder.buyer_nim,
        buyer_class: targetOrder.buyer_class,
        total_amount: targetOrder.total_amount
      },
      after: {
        buyer_name: updatedHeader.buyer_name,
        buyer_nim: updatedHeader.buyer_nim,
        buyer_class: updatedHeader.buyer_class,
        total_amount: calculatedTotal
      }
    });

    return createResponse(true, updatedHeader, 'Data pesanan berhasil diperbarui dan disimpan.');
  } catch(err) {
    return createResponse(false, null, 'Gagal memperbarui pesanan: ' + err.message);
  }
}

/**
 * Cancel student order with mandatory reason (Panitia action)
 * @param {string} userId 
 * @param {string} orderId 
 * @param {string} cancelReason 
 */
function apiCancelOrder(userId, orderId, cancelReason) {
  try {
    if (!hasRole(userId, 'PANITIA')) {
      return createResponse(false, null, 'Akses ditolak: Hanya Panitia yang dapat membatalkan pesanan.');
    }

    if (!cancelReason || !String(cancelReason).trim()) {
      return createResponse(false, null, 'Alasan pembatalan pesanan wajib diisi oleh Panitia.');
    }

    var now = new Date().toISOString();
    var updatePayload = {
      order_id: orderId,
      status: 'DIBATALKAN',
      cancel_reason: String(cancelReason).trim(),
      updated_at: now
    };

    updateData(CONFIG.SHEETS.ORDERS, 'order_id', orderId, updatePayload);

    logAudit(userId, 'CANCEL_ORDER', 'ORDER', {
      orderId: orderId,
      reason: cancelReason,
      status: 'DIBATALKAN'
    });

    return createResponse(true, { order_id: orderId, status: 'DIBATALKAN' }, 'Pesanan berhasil dibatalkan. Record tetap tersimpan di database.');
  } catch(err) {
    return createResponse(false, null, 'Gagal membatalkan pesanan: ' + err.message);
  }
}

/**
 * Update order status (Panitia action)
 * @param {string} userId 
 * @param {string} orderId 
 * @param {string} newStatus 
 */
function apiUpdateOrderStatus(userId, orderId, newStatus) {
  try {
    if (!hasRole(userId, 'PANITIA')) {
      return createResponse(false, null, 'Akses ditolak: Hanya Panitia yang dapat mengubah status pesanan.');
    }

    var validStatuses = [
      'MENUNGGU PEMBAYARAN',
      'MENUNGGU APPROVAL PEMBAYARAN',
      'PEMBAYARAN LUNAS',
      'DIPROSES',
      'SELESAI',
      'DIBATALKAN'
    ];

    if (validStatuses.indexOf(newStatus) < 0) {
      return createResponse(false, null, 'Status pesanan tidak valid: ' + newStatus);
    }

    var now = new Date().toISOString();
    var updatePayload = {
      order_id: orderId,
      status: newStatus,
      updated_at: now
    };

    updateData(CONFIG.SHEETS.ORDERS, 'order_id', orderId, updatePayload);

    logAudit(userId, 'UPDATE_ORDER_STATUS', 'ORDER', {
      orderId: orderId,
      newStatus: newStatus
    });

    return createResponse(true, { order_id: orderId, status: newStatus }, 'Status pesanan diperbarui menjadi: ' + newStatus);
  } catch(err) {
    return createResponse(false, null, 'Gagal memperbarui status pesanan: ' + err.message);
  }
}

/**
 * Public Track Order by NIM without login (Requirement 6 & 7)
 * @param {string} targetNim 
 */
function apiTrackOrderPublic(targetNim) {
  try {
    if (!targetNim || !String(targetNim).trim()) {
      return createResponse(false, { found: false, message: 'NIM wajib diisi untuk melacak pesanan.' }, 'NIM kosong.');
    }

    var cleanNim = String(targetNim).trim();
    var allOrders = batchRead(CONFIG.SHEETS.ORDERS);
    var allItems = batchRead(CONFIG.SHEETS.ORDER_ITEMS);

    var matchedItem = null;
    var matchedOrder = null;

    for (var i = 0; i < allOrders.length; i++) {
      var ord = allOrders[i];
      if (ord.status === 'DIBATALKAN') continue;

      // Check if buyer
      if (String(ord.buyer_nim || '').trim().toLowerCase() === cleanNim.toLowerCase()) {
        matchedOrder = ord;
        for (var k = 0; k < allItems.length; k++) {
          if (allItems[k].order_id === ord.order_id && String(allItems[k].nim || '').trim().toLowerCase() === cleanNim.toLowerCase()) {
            matchedItem = allItems[k];
            break;
          }
        }
        if (!matchedItem) {
          for (var k2 = 0; k2 < allItems.length; k2++) {
            if (allItems[k2].order_id === ord.order_id) {
              matchedItem = allItems[k2];
              break;
            }
          }
        }
        break;
      }

      // Check if collective member item
      for (var j = 0; j < allItems.length; j++) {
        if (allItems[j].order_id === ord.order_id && String(allItems[j].nim || '').trim().toLowerCase() === cleanNim.toLowerCase()) {
          matchedOrder = ord;
          matchedItem = allItems[j];
          break;
        }
      }
      if (matchedOrder) break;
    }

    if (!matchedOrder) {
      return createResponse(true, {
        found: false,
        message: 'Data NIM ' + cleanNim + ' tidak ditemukan dalam pesanan PDH.'
      }, 'Data NIM tidak ditemukan.');
    }

    // Sanitized result for public tracking
    var trackResult = {
      found: true,
      studentName: matchedItem ? matchedItem.student_name : matchedOrder.buyer_name,
      nim: cleanNim,
      className: matchedItem ? matchedItem.class_name : matchedOrder.buyer_class,
      sizeCode: matchedItem ? matchedItem.size_code : 'M',
      customName: matchedItem ? matchedItem.custom_name : matchedOrder.buyer_name,
      orderNumber: matchedOrder.order_number,
      orderType: matchedOrder.order_type || 'PRIBADI',
      paymentStatus: matchedOrder.payment_status || 'BELUM_BAYAR',
      orderStatus: matchedOrder.status || 'MENUNGGU PEMBAYARAN',
      productionStatus: matchedOrder.production_status || 'Belum Diproduksi',
      productionPercentage: parseInt(matchedOrder.production_percentage || 0, 10),
      productionNotes: matchedOrder.production_notes || '',
      productionPhotoUrl: matchedOrder.production_photo_url || '',
      isBuyer: String(matchedOrder.buyer_nim || '').trim().toLowerCase() === cleanNim.toLowerCase()
    };

    return createResponse(true, trackResult, 'Data pesanan berhasil ditemukan.');
  } catch(err) {
    return createResponse(false, null, 'Gagal melacak pesanan: ' + err.message);
  }
}

/**
 * Get orders in production stage for Panitia
 * @param {string} userId 
 */
function apiGetProductionOrdersPanitia(userId) {
  try {
    if (!hasRole(userId, 'PANITIA')) {
      return createResponse(false, [], 'Akses ditolak: Hanya Panitia yang dapat mengelola produksi.');
    }

    var orders = batchRead(CONFIG.SHEETS.ORDERS);
    var prodOrders = orders.filter(function(ord) {
      return ord.status !== 'DIBATALKAN' &&
        (ord.payment_status === 'LUNAS' || ord.status === 'PEMBAYARAN LUNAS' || ord.status === 'SELESAI' || ord.production_status);
    });

    return createResponse(true, prodOrders, 'Daftar pesanan produksi berhasil dimuat.');
  } catch(err) {
    return createResponse(false, [], 'Gagal memuat pesanan produksi: ' + err.message);
  }
}

/**
 * Update production progress for order
 * @param {string} userId 
 * @param {string} orderId 
 * @param {Object} payload 
 */
function apiUpdateProductionProgress(userId, orderId, payload) {
  try {
    if (!hasRole(userId, 'PANITIA')) {
      return createResponse(false, null, 'Akses ditolak: Hanya Panitia yang dapat memperbarui progres produksi.');
    }

    payload = payload || {};
    var percentage = Math.min(100, Math.max(0, parseInt(payload.percentage || 0, 10)));
    var prodStatus = payload.productionStatus || (percentage === 100 ? 'Selesai' : percentage > 0 ? 'Sedang Diproduksi' : 'Belum Diproduksi');
    var notes = String(payload.notes || '').trim();

    var orders = batchRead(CONFIG.SHEETS.ORDERS);
    var targetOrder = null;
    for (var i = 0; i < orders.length; i++) {
      if (orders[i].order_id === orderId) {
        targetOrder = orders[i];
        break;
      }
    }

    if (!targetOrder) {
      return createResponse(false, null, 'Pesanan tidak ditemukan.');
    }

    var now = new Date().toISOString();
    var photoUrl = targetOrder.production_photo_url || '';
    var drivePhotoId = targetOrder.production_drive_photo_id || '';

    if (payload.fileBase64) {
      drivePhotoId = 'DRV-PROG-' + new Date().getTime();
      photoUrl = payload.fileBase64;
    }

    var updates = {
      production_status: prodStatus,
      production_percentage: percentage,
      production_notes: notes,
      production_photo_url: photoUrl,
      production_drive_photo_id: drivePhotoId,
      production_updated_at: now
    };

    if (percentage === 100 || prodStatus === 'Selesai' || prodStatus === 'Siap Diambil') {
      updates.status = 'SELESAI';
    } else if (percentage > 0 || prodStatus === 'Sedang Diproduksi') {
      updates.status = 'DIPROSES';
    }

    updateRecord(CONFIG.SHEETS.ORDERS, 'order_id', orderId, updates);

    // Append to PRODUCTION_PROGRESS sheet table
    var historyRecord = {
      progress_id: 'PROG-' + generateUniqueId('PRG'),
      order_id: orderId,
      percentage: percentage,
      production_status: prodStatus,
      notes: notes,
      photo_url: photoUrl,
      drive_photo_id: drivePhotoId,
      updated_at: now,
      updated_by: userId
    };

    try {
      appendData('PRODUCTION_PROGRESS', historyRecord);
    } catch(e) {
      Logger.log('Notice appending production progress history: ' + e.message);
    }

    logAudit(userId, 'UPDATE_PRODUCTION_PROGRESS', 'PRODUCTION', 'Order ID: ' + orderId + ', Progress: ' + percentage + '%, Status: ' + prodStatus);

    return createResponse(true, updates, 'Progres produksi berhasil diperbarui.');
  } catch(err) {
    return createResponse(false, null, 'Gagal memperbarui progres produksi: ' + err.message);
  }
}

/**
 * Get global pickup settings
 */
function apiGetPickupSettings() {
  try {
    var settings = batchRead(CONFIG.SHEETS.SETTINGS);
    var settingsMap = {};
    for (var i = 0; i < settings.length; i++) {
      settingsMap[settings[i].setting_key] = settings[i].setting_value;
    }

    var pickupInfo = {
      status: settingsMap['PICKUP_STATUS'] || 'Belum Siap Diambil',
      location: settingsMap['PICKUP_LOCATION'] || 'Gedung Kemahasiswaan Lantai 1 (Sekre Ormawa)',
      fullAddress: settingsMap['PICKUP_FULL_ADDRESS'] || 'Jl. Kampus Utama No. 1, Ruang 102 (Samping Perpustakaan)',
      startDate: settingsMap['PICKUP_START_DATE'] || '2026-10-15',
      endDate: settingsMap['PICKUP_END_DATE'] || '2026-10-22',
      pickupHours: settingsMap['PICKUP_HOURS'] || '09:00 - 16:00 WIB',
      contactPerson: settingsMap['PICKUP_CONTACT'] || '0812-3456-7890 (Panitia Logistik PDH)',
      instructions: settingsMap['PICKUP_INSTRUCTIONS'] || '1. Wajib menunjukkan Kartu Tanda Mahasiswa (KTM) asli / Bukti Identitas.\n2. Wajib menunjukkan nomor pesanan atau bukti pembayaran lunas.\n3. Pengambilan kolektif diwakilkan oleh Ketua/Penanggung Jawab Kelas.',
      additionalNotes: settingsMap['PICKUP_NOTES'] || 'Harap mengambil pesanan sesuai jadwal jam operasional yang ditentukan.'
    };

    return createResponse(true, pickupInfo, 'Informasi pengambilan PDH berhasil dimuat.');
  } catch(err) {
    return createResponse(false, null, 'Gagal memuat informasi pengambilan: ' + err.message);
  }
}

/**
 * Save global pickup settings (Panitia action)
 * @param {string} userId 
 * @param {Object} payload 
 */
function apiSavePickupSettings(userId, payload) {
  try {
    if (!hasRole(userId, 'PANITIA')) {
      return createResponse(false, null, 'Akses ditolak: Hanya Panitia yang dapat memperbarui informasi pengambilan.');
    }

    payload = payload || {};
    var map = {
      'PICKUP_STATUS': payload.status || 'Belum Siap Diambil',
      'PICKUP_LOCATION': payload.location || '',
      'PICKUP_FULL_ADDRESS': payload.fullAddress || '',
      'PICKUP_START_DATE': payload.startDate || '',
      'PICKUP_END_DATE': payload.endDate || '',
      'PICKUP_HOURS': payload.pickupHours || '',
      'PICKUP_CONTACT': payload.contactPerson || '',
      'PICKUP_INSTRUCTIONS': payload.instructions || '',
      'PICKUP_NOTES': payload.additionalNotes || ''
    };

    Object.keys(map).forEach(function(key) {
      updateRecord(CONFIG.SHEETS.SETTINGS, 'setting_key', key, { setting_value: map[key] });
    });

    logAudit(userId, 'UPDATE_PICKUP_SETTINGS', 'SETTINGS', 'Status Global: ' + map['PICKUP_STATUS'] + ', Lokasi: ' + map['PICKUP_LOCATION']);

    return createResponse(true, map, 'Informasi pengambilan PDH berhasil disimpan.');
  } catch(err) {
    return createResponse(false, null, 'Gagal menyimpan pengaturan pengambilan: ' + err.message);
  }
}

/**
 * Mark individual order as Siap Diambil (Requires production finished 100%)
 * @param {string} userId 
 * @param {string} orderId 
 */
function apiMarkOrderSiapDiambil(userId, orderId) {
  try {
    if (!hasRole(userId, 'PANITIA')) {
      return createResponse(false, null, 'Akses ditolak: Hanya Panitia yang dapat memperbarui status pengambilan.');
    }

    var orders = batchRead(CONFIG.SHEETS.ORDERS);
    var targetOrder = null;
    for (var i = 0; i < orders.length; i++) {
      if (orders[i].order_id === orderId) {
        targetOrder = orders[i];
        break;
      }
    }

    if (!targetOrder) {
      return createResponse(false, null, 'Pesanan tidak ditemukan.');
    }

    var pct = parseInt(targetOrder.production_percentage || 0, 10);
    var isFinished = pct === 100 || targetOrder.production_status === 'Selesai' || targetOrder.production_status === 'Siap Diambil';

    if (!isFinished) {
      return createResponse(false, null, 'Pesanan hanya dapat berstatus "Siap Diambil" jika produksi sudah selesai (100%).');
    }

    updateRecord(CONFIG.SHEETS.ORDERS, 'order_id', orderId, {
      pickup_status: 'Siap Diambil',
      production_status: 'Siap Diambil'
    });

    logAudit(userId, 'MARK_ORDER_SIAP_DIAMBIL', 'PICKUP', 'Order ID: ' + orderId);

    return createResponse(true, null, 'Status pesanan berhasil diubah menjadi Siap Diambil.');
  } catch(err) {
    return createResponse(false, null, 'Gagal memperbarui status: ' + err.message);
  }
}

/**
 * Confirm order pickup (Sudah Diambil)
 * @param {string} userId 
 * @param {string} orderId 
 * @param {string} notes 
 */
function apiConfirmOrderPickup(userId, orderId, notes) {
  try {
    if (!hasRole(userId, 'PANITIA')) {
      return createResponse(false, null, 'Akses ditolak: Hanya Panitia yang dapat mengonfirmasi penyerahan PDH.');
    }

    var orders = batchRead(CONFIG.SHEETS.ORDERS);
    var targetOrder = null;
    for (var i = 0; i < orders.length; i++) {
      if (orders[i].order_id === orderId) {
        targetOrder = orders[i];
        break;
      }
    }

    if (!targetOrder) {
      return createResponse(false, null, 'Pesanan tidak ditemukan.');
    }

    if (targetOrder.pickup_status !== 'Siap Diambil' && targetOrder.production_status !== 'Siap Diambil') {
      return createResponse(false, null, 'Pesanan belum berstatus "Siap Diambil". Tidak dapat ditandai sebagai "Sudah Diambil".');
    }

    var now = new Date().toISOString();
    updateRecord(CONFIG.SHEETS.ORDERS, 'order_id', orderId, {
      pickup_status: 'Sudah Diambil',
      pickup_at: now,
      pickup_by_panitia: userId,
      pickup_notes: notes || '',
      status: 'SELESAI'
    });

    logAudit(userId, 'CONFIRM_ORDER_PICKUP', 'PICKUP', 'Order ID: ' + orderId + ', Catatan: ' + notes);

    return createResponse(true, null, 'Pesanan berhasil dikonfirmasi sebagai SUDAH DIAMBIL.');
  } catch(err) {
    return createResponse(false, null, 'Gagal mengonfirmasi penyerahan: ' + err.message);
  }
}

/**
 * Bulk Update Production Progress for Multiple Order IDs
 * @param {string} userId 
 * @param {Array<string>} orderIds 
 * @param {string} stageName 
 * @param {number} percentage 
 * @param {string} notes 
 * @param {Object} photoPayload 
 */
function apiBulkUpdateProductionProgress(userId, orderIds, stageName, percentage, notes, photoPayload) {
  try {
    if (!hasRole(userId, 'PANITIA')) {
      return createResponse(false, null, 'Akses ditolak: Hanya Panitia yang dapat memperbarui progres produksi.');
    }

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return createResponse(false, null, 'Pilih minimal 1 pesanan untuk diperbarui.');
    }

    if (!stageName) {
      return createResponse(false, null, 'Tahapan produksi wajib dipilih.');
    }

    var pct = parseInt(percentage, 10);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return createResponse(false, null, 'Persentase produksi harus antara 0% - 100%.');
    }

    var photoUrl = '';
    var drivePhotoId = '';
    if (photoPayload && photoPayload.base64Data) {
      var driveRes = saveFileToDrive(
        'PRODUCTION_PROGRESS',
        photoPayload.fileName || 'bulk_production_' + Date.now() + '.jpg',
        photoPayload.mimeType || 'image/jpeg',
        photoPayload.base64Data
      );
      if (driveRes.success && driveRes.data) {
        drivePhotoId = driveRes.data.fileId;
        photoUrl = driveRes.data.fileUrl;
      }
    }

    var now = new Date().toISOString();
    var updatedCount = 0;

    orderIds.forEach(function(oId) {
      var updatePayload = {
        production_stage: stageName,
        production_percentage: pct,
        production_status: pct === 100 ? 'Selesai' : 'Sedang Diproduksi',
        production_notes: notes || '',
        updated_at: now
      };

      if (drivePhotoId) {
        updatePayload.production_photo_id = drivePhotoId;
        updatePayload.production_photo_url = photoUrl;
      }

      updateRecord(CONFIG.SHEETS.ORDERS, 'order_id', oId, updatePayload);
      updatedCount++;
    });

    logAudit(
      userId,
      'BULK_UPDATE_PRODUCTION',
      'PRODUCTION',
      'Total: ' + updatedCount + ' pesanan, Tahap: ' + stageName + ' (' + pct + '%), Catatan: ' + (notes || '-')
    );

    return createResponse(true, { updatedCount: updatedCount }, 'Berhasil memperbarui progres ' + updatedCount + ' pesanan ke tahap "' + stageName + '" (' + pct + '%).');
  } catch (err) {
    return createResponse(false, null, 'Gagal update masal: ' + err.message);
  }
}

/**
 * Upload Production Progress Photo for multiple orders
 * @param {string} userId 
 * @param {Array<string>} orderIds 
 * @param {Object} photoPayload 
 */
function apiUploadBulkProductionPhoto(userId, orderIds, photoPayload) {
  try {
    if (!hasRole(userId, 'PANITIA')) {
      return createResponse(false, null, 'Akses ditolak.');
    }

    if (!photoPayload || !photoPayload.base64Data) {
      return createResponse(false, null, 'Berkas foto tidak valid.');
    }

    var driveRes = saveFileToDrive(
      'PRODUCTION_PROGRESS',
      photoPayload.fileName || 'bulk_prod_' + Date.now() + '.jpg',
      photoPayload.mimeType || 'image/jpeg',
      photoPayload.base64Data
    );

    if (!driveRes.success || !driveRes.data) {
      throw new Error(driveRes.message || 'Gagal menyimpan foto ke Google Drive.');
    }

    var fileMeta = driveRes.data;
    var now = new Date().toISOString();

    (orderIds || []).forEach(function(oId) {
      updateRecord(CONFIG.SHEETS.ORDERS, 'order_id', oId, {
        production_photo_id: fileMeta.fileId,
        production_photo_url: fileMeta.fileUrl,
        updated_at: now
      });
    });

    logAudit(userId, 'UPLOAD_BULK_PRODUCTION_PHOTO', 'PRODUCTION', 'Photo File ID: ' + fileMeta.fileId + ', Orders: ' + (orderIds || []).length);

    return createResponse(true, fileMeta, 'Foto progres vendor berhasil diunggah ke Google Drive dan ditautkan ke pesanan.');
  } catch (err) {
    return createResponse(false, null, 'Gagal upload foto: ' + err.message);
  }
}

/**
 * Upload Individual Production Progress Photo
 * @param {string} userId 
 * @param {string} orderId 
 * @param {Object} photoPayload 
 */
function apiUploadProductionProgressPhoto(userId, orderId, photoPayload) {
  return apiUploadBulkProductionPhoto(userId, [orderId], photoPayload);
}

/**
 * Get Student PDH Order History by NIM / Order ID (Personal & Collective)
 * @param {string} userIdOrNim 
 */
function apiGetStudentPDHHistory(userIdOrNim) {
  try {
    if (!userIdOrNim) {
      return createResponse(false, null, 'NIM atau User ID wajib diberikan.');
    }

    var cleanNim = String(userIdOrNim).trim().toLowerCase();
    var allOrders = batchRead(CONFIG.SHEETS.ORDERS);
    var allItems = batchRead(CONFIG.SHEETS.ORDER_ITEMS);

    var matchingOrders = [];
    var seenOrderIds = new Set();

    // 1. Direct buyer orders
    allOrders.forEach(function(ord) {
      var bNim = String(ord.buyer_nim || '').toLowerCase();
      var bUser = String(ord.user_id || '').toLowerCase();
      var ordNum = String(ord.order_number || '').toLowerCase();

      if (bNim === cleanNim || bUser === cleanNim || ordNum === cleanNim) {
        if (!seenOrderIds.has(ord.order_id)) {
          seenOrderIds.add(ord.order_id);
          var items = allItems.filter(function(i) { return i.order_id === ord.order_id; });
          var ordCopy = JSON.parse(JSON.stringify(ord));
          ordCopy.items = items;
          ordCopy.isBuyer = true;
          matchingOrders.push(ordCopy);
        }
      }
    });

    // 2. Member of collective orders
    allItems.forEach(function(itm) {
      var itmNim = String(itm.nim || itm.student_nim || '').toLowerCase();
      if (itmNim === cleanNim) {
        if (!seenOrderIds.has(itm.order_id)) {
          seenOrderIds.add(itm.order_id);
          var parentOrder = null;
          for (var p = 0; p < allOrders.length; p++) {
            if (allOrders[p].order_id === itm.order_id) {
              parentOrder = allOrders[p];
              break;
            }
          }
          if (parentOrder) {
            var parentCopy = JSON.parse(JSON.stringify(parentOrder));
            parentCopy.items = allItems.filter(function(i) { return i.order_id === parentOrder.order_id; });
            parentCopy.isBuyer = false;
            parentCopy.memberItem = itm;
            matchingOrders.push(parentCopy);
          }
        }
      }
    });

    return createResponse(true, matchingOrders, 'Riwayat pemesanan PDH berhasil dimuat.');
  } catch (err) {
    return createResponse(false, null, 'Gagal memuat riwayat: ' + err.message);
  }
}
