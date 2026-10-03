/**
 * PDH CAMPUS ORDER SYSTEM
 * Import & Export Management Module
 * 
 * Server-side validation and processing for importing student data, collective order members,
 * and recording audit trail logs for data export.
 */

/**
 * Import Student Data (Server-Side Validation & Insertion)
 * @param {string} panitiaUserId 
 * @param {string} filename 
 * @param {Array<Object>} studentRows 
 * @param {boolean} confirmSave 
 * @returns {Object} ApiResponse
 */
function apiImportStudents(panitiaUserId, filename, studentRows, confirmSave) {
  try {
    if (!authorizeRole(panitiaUserId, CONFIG.ROLES.PANITIA)) {
      return createResponse(false, null, 'Akses ditolak: Hanya Panitia yang berhak melakukan import.');
    }

    if (!studentRows || !Array.isArray(studentRows) || studentRows.length === 0) {
      return createResponse(false, null, 'Tidak ada baris data mahasiswa yang diberikan untuk diimport.');
    }

    var classRegex = /^\d{2}(MJSP|MJSM|MJSE)\d{3}$/i;
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    var existingUsers = batchRead(CONFIG.SHEETS.USERS) || [];
    var existingNIMs = {};
    var existingEmails = {};

    existingUsers.forEach(function(u) {
      if (u.nim) existingNIMs[String(u.nim).toLowerCase()] = true;
      if (u.username) existingNIMs[String(u.username).toLowerCase()] = true;
      if (u.email) existingEmails[String(u.email).toLowerCase()] = true;
    });

    var fileNIMs = {};
    var fileEmails = {};

    var errors = [];
    var validData = [];

    studentRows.forEach(function(row, idx) {
      var rowNum = idx + 2;
      var nim = String(row.nim || row.NIM || '').trim();
      var name = String(row.name || row.Nama || row.nama || '').trim();
      var className = String(row.className || row.Kelas || row.kelas || '').trim().toUpperCase();
      var email = String(row.email || row.Email || '').trim().toLowerCase();
      var phone = String(row.phone || row.phoneNo || row['No WhatsApp'] || row['No. WhatsApp'] || row['No HP'] || '').trim();

      var rowErrors = [];

      if (!nim) {
        rowErrors.push('NIM wajib diisi');
      } else {
        if (fileNIMs[nim.toLowerCase()]) {
          rowErrors.push('NIM \'' + nim + '\' terdeteksi duplikat pada file import');
        } else {
          fileNIMs[nim.toLowerCase()] = true;
        }
        if (existingNIMs[nim.toLowerCase()]) {
          rowErrors.push('NIM \'' + nim + '\' sudah terdaftar di database existing');
        }
      }

      if (!name) {
        rowErrors.push('Nama Mahasiswa wajib diisi');
      }

      if (!className) {
        rowErrors.push('Kelas wajib diisi');
      } else if (!classRegex.test(className)) {
        rowErrors.push('Format Kelas \'' + className + '\' tidak valid (Gunakan format ##MJSP###, ##MJSM###, ##MJSE###)');
      }

      if (!email) {
        rowErrors.push('Email wajib diisi');
      } else if (!emailRegex.test(email)) {
        rowErrors.push('Format Email \'' + email + '\' tidak valid');
      } else {
        if (fileEmails[email]) {
          rowErrors.push('Email \'' + email + '\' terdeteksi duplikat pada file import');
        } else {
          fileEmails[email] = true;
        }
        if (existingEmails[email]) {
          rowErrors.push('Email \'' + email + '\' sudah digunakan akun lain di database');
        }
      }

      if (rowErrors.length > 0) {
        errors.push({
          row: rowNum,
          nim: nim || '-',
          name: name || '-',
          message: rowErrors.join('; ')
        });
      } else {
        validData.push({
          nim: nim,
          name: name,
          className: className,
          email: email,
          phone: phone || '-'
        });
      }
    });

    var importedCount = 0;
    if (confirmSave && validData.length > 0) {
      var now = new Date().toISOString();
      validData.forEach(function(item) {
        var newUser = {
          user_id: 'USR-MHS-' + item.nim,
          username: item.nim,
          nim: item.nim,
          name: item.name,
          class_name: item.className,
          email: item.email,
          phone: item.phone,
          password_hash: hashPassword('123456'),
          role: 'MAHASISWA',
          status: 'TERVERIFIKASI',
          created_at: now,
          updated_at: now
        };
        appendRow(CONFIG.SHEETS.USERS, newUser);
        importedCount++;
      });

      logAudit(
        panitiaUserId,
        'IMPORT_STUDENTS',
        'USER',
        'File: ' + filename + ', Total File: ' + studentRows.length + ', Berhasil: ' + importedCount + ', Gagal: ' + errors.length
      );
    }

    return createResponse(true, {
      totalRows: studentRows.length,
      validRowsCount: validData.length,
      invalidRowsCount: errors.length,
      errors: errors,
      validData: validData,
      importedCount: importedCount
    }, confirmSave ? 'Berhasil mengimport data mahasiswa.' : 'Validasi import data mahasiswa selesai.');
  } catch (err) {
    return createResponse(false, null, 'Gagal memproses import data mahasiswa: ' + err.message);
  }
}

/**
 * Import Collective Order Members (Server-Side Validation & Insertion)
 * @param {string} panitiaUserId 
 * @param {string} filename 
 * @param {Array<Object>} memberRows 
 * @param {boolean} confirmSave 
 * @returns {Object} ApiResponse
 */
function apiImportCollectiveMembers(panitiaUserId, filename, memberRows, confirmSave) {
  try {
    if (!authorizeRole(panitiaUserId, CONFIG.ROLES.PANITIA)) {
      return createResponse(false, null, 'Akses ditolak: Hanya Panitia yang berhak melakukan import.');
    }

    if (!memberRows || !Array.isArray(memberRows) || memberRows.length === 0) {
      return createResponse(false, null, 'Tidak ada baris anggota kolektif yang diberikan.');
    }

    var classRegex = /^\d{2}(MJSP|MJSM|MJSE)\d{3}$/i;
    var allOrders = apiGetAllOrdersPanitia(panitiaUserId).data || [];
    var masterData = apiGetPDHMasterData().data || {};

    var activeSizeCodes = {};
    (masterData.sizes || []).forEach(function(s) {
      if (s.status === 'ACTIVE') {
        activeSizeCodes[String(s.size_code).toUpperCase()] = s;
      }
    });

    var registeredOrderNIMs = {};
    allOrders.forEach(function(o) {
      (o.items || []).forEach(function(itm) {
        if (itm.nim) {
          registeredOrderNIMs[String(itm.nim).toLowerCase()] = o.order_number;
        }
      });
    });

    var fileOrderNIMs = {};
    var errors = [];
    var validData = [];

    memberRows.forEach(function(row, idx) {
      var rowNum = idx + 2;
      var orderNumber = String(row.orderNumber || row['No Pesanan'] || row['No. Pesanan'] || '').trim();
      var nim = String(row.nim || row.NIM || '').trim();
      var name = String(row.name || row.Nama || '').trim();
      var className = String(row.className || row.Kelas || '').trim().toUpperCase();
      var sizeCode = String(row.sizeCode || row.Ukuran || '').trim().toUpperCase();

      var rowErrors = [];

      if (!orderNumber) {
        rowErrors.push('No Pesanan wajib diisi');
      } else {
        var targetOrder = allOrders.find(function(o) { return String(o.order_number).toUpperCase() === orderNumber.toUpperCase(); });
        if (!targetOrder) {
          rowErrors.push('No Pesanan \'' + orderNumber + '\' tidak ditemukan');
        } else if (targetOrder.order_type !== 'KOLEKTIF') {
          rowErrors.push('Pesanan \'' + orderNumber + '\' bukan tipe KOLEKTIF');
        }
      }

      if (!nim) {
        rowErrors.push('NIM wajib diisi');
      } else {
        if (orderNumber) {
          if (!fileOrderNIMs[orderNumber]) fileOrderNIMs[orderNumber] = {};
          if (fileOrderNIMs[orderNumber][nim.toLowerCase()]) {
            rowErrors.push('NIM \'' + nim + '\' terdeteksi duplikat untuk pesanan ' + orderNumber + ' di file import');
          } else {
            fileOrderNIMs[orderNumber][nim.toLowerCase()] = true;
          }
        }

        if (registeredOrderNIMs[nim.toLowerCase()]) {
          rowErrors.push('NIM \'' + nim + '\' sudah terdaftar pada pesanan ' + registeredOrderNIMs[nim.toLowerCase()]);
        }
      }

      if (!name) rowErrors.push('Nama wajib diisi');

      if (!className) {
        rowErrors.push('Kelas wajib diisi');
      } else if (!classRegex.test(className)) {
        rowErrors.push('Format Kelas \'' + className + '\' tidak valid');
      }

      if (!sizeCode) {
        rowErrors.push('Ukuran wajib diisi');
      } else if (!activeSizeCodes[sizeCode]) {
        rowErrors.push('Ukuran \'' + sizeCode + '\' tidak terdaftar di Master PDH');
      }

      if (rowErrors.length > 0) {
        errors.push({
          row: rowNum,
          nim: nim || '-',
          name: name || '-',
          message: rowErrors.join('; ')
        });
      } else {
        validData.push({
          orderNumber: orderNumber,
          nim: nim,
          name: name,
          className: className,
          sizeCode: sizeCode
        });
      }
    });

    var importedCount = 0;
    if (confirmSave && validData.length > 0) {
      var basePrice = masterData.pricing ? Number(masterData.pricing.price || 185000) : 185000;

      var itemsByOrder = {};
      validData.forEach(function(item) {
        var key = item.orderNumber.toUpperCase();
        if (!itemsByOrder[key]) itemsByOrder[key] = [];
        itemsByOrder[key].push(item);
      });

      Object.keys(itemsByOrder).forEach(function(ordNum) {
        var targetOrd = allOrders.find(function(o) { return String(o.order_number).toUpperCase() === ordNum; });
        if (targetOrd) {
          var newMembers = itemsByOrder[ordNum];
          newMembers.forEach(function(m) {
            var sizeObj = activeSizeCodes[m.sizeCode];
            var extraFee = sizeObj ? Number(sizeObj.extra_fee || 0) : 0;

            var newItem = {
              item_id: 'ITM-' + targetOrd.order_id + '-' + m.nim,
              order_id: targetOrd.order_id,
              student_name: m.name,
              nim: m.nim,
              student_class: m.className,
              size_code: m.sizeCode,
              custom_name: m.name,
              extra_fee: extraFee
            };

            appendRow(CONFIG.SHEETS.ORDER_ITEMS, newItem);
            importedCount++;
          });
        }
      });

      logAudit(
        panitiaUserId,
        'IMPORT_COLLECTIVE_MEMBERS',
        'ORDER_ITEM',
        'File: ' + filename + ', Total File: ' + memberRows.length + ', Berhasil: ' + importedCount + ', Gagal: ' + errors.length
      );
    }

    return createResponse(true, {
      totalRows: memberRows.length,
      validRowsCount: validData.length,
      invalidRowsCount: errors.length,
      errors: errors,
      validData: validData,
      importedCount: importedCount
    }, confirmSave ? 'Berhasil mengimport anggota kolektif.' : 'Validasi import anggota kolektif selesai.');
  } catch (err) {
    return createResponse(false, null, 'Gagal memproses import anggota kolektif: ' + err.message);
  }
}

/**
 * Log Export Data Audit
 * @param {string} panitiaUserId 
 * @param {string} exportType 
 * @param {number} rowCount 
 * @returns {Object} ApiResponse
 */
function apiLogExportData(panitiaUserId, exportType, rowCount) {
  try {
    if (!authorizeRole(panitiaUserId, CONFIG.ROLES.PANITIA)) {
      return createResponse(false, null, 'Akses ditolak.');
    }

    logAudit(
      panitiaUserId,
      'EXPORT_DATA',
      'DATABASE',
      'Jenis Export: ' + String(exportType).toUpperCase() + ', Jumlah Data: ' + rowCount + ' baris'
    );

    return createResponse(true, null, 'Export audit log recorded.');
  } catch (err) {
    return createResponse(false, null, err.message);
  }
}
