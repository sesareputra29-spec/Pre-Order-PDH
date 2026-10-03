/**
 * PDH CAMPUS ORDER SYSTEM
 * Master PDH Service: PDHMaster.gs
 * 
 * Manages Master PDH Info, Size Catalog, Pricing, Design Images, and Payment Info.
 * Enforces server-side authorization and audit logging.
 */

/**
 * Get full Master PDH Data (Accessible by both Panitia & Mahasiswa)
 */
function apiGetPDHMasterData() {
  try {
    var settings = batchRead(CONFIG.SHEETS.SETTINGS);
    var settingsMap = {};
    for (var i = 0; i < settings.length; i++) {
      settingsMap[settings[i].setting_key] = settings[i].setting_value;
    }

    // Default Info fallback
    var info = {
      pdhName: settingsMap['PDH_NAME'] || 'Pakaian Dinas Harian (PDH) Kampus 2026',
      pdhYear: settingsMap['PDH_YEAR'] || '2026/2027',
      pdhDescription: settingsMap['PDH_DESCRIPTION'] || 'Seragam resmi PDH Kampus berkualitas tinggi dengan bahan American Drill premium dan bordir kustom nama.',
      pdhSpec: settingsMap['PDH_SPEC'] || 'Lengan Panjang, Kerah Kemeja, 2 Saku Depan dengan Penutup, Bordir Logo Kampus & Bordir Nama Kustom',
      pdhMaterial: settingsMap['PDH_MATERIAL'] || 'American Drill Premium (Dingin, Menyerap Keringat, Awet)',
      pdhModel: settingsMap['PDH_MODEL'] || 'Unisex (Slim Fit & Reguler)',
      pdhColor: settingsMap['PDH_COLOR'] || 'Navy Blue / Biru Dongker dengan Aksentuasi Abu-Abu',
      pdhTerms: settingsMap['PDH_TERMS'] || '1. Wajib melunasi pembayaran sesuai jadwal.\n2. Nama bordir kustom maksimal 18 karakter.\n3. Ukuran tidak dapat diubah setelah batas akhir PO.',
      pdhContact: settingsMap['PDH_CONTACT'] || 'WhatsApp Panitia: 0812-3456-7890 (Humas PDH)'
    };

    // Default Pricing fallback
    var pricing = {
      price: parseFloat(settingsMap['PDH_PRICE'] || '185000'),
      active: settingsMap['PDH_PRICE_ACTIVE'] === undefined ? true : String(settingsMap['PDH_PRICE_ACTIVE']) === 'true',
      notes: settingsMap['PDH_PRICE_NOTES'] || 'Harga termasuk bordir nama & logo resmi kampus.'
    };

    // Default Payment Info fallback
    var payment = {
      method: settingsMap['PAYMENT_METHOD'] || 'Transfer Bank / QRIS',
      bankName: settingsMap['PAYMENT_BANK'] || 'Bank Mandiri',
      accountNumber: settingsMap['PAYMENT_NUMBER'] || '137-00-1234567-8',
      accountHolder: settingsMap['PAYMENT_HOLDER'] || 'Panitia PDH Kampus 2026',
      instructions: settingsMap['PAYMENT_INSTRUCTIONS'] || 'Sertakan Kode Unik Pesanan pada berita transfer dan simpan bukti transfer untuk diunggah.'
    };

    // Read Product Sizes
    var rawSizes = batchRead(CONFIG.SHEETS.PRODUCT_SIZES);
    var sizes = [];
    if (rawSizes.length === 0) {
      // Default sizes seed if empty
      sizes = [
        { size_id: 'SZ-01', size_code: 'S', size_name: 'Small (S)', chest_width: '48 cm', body_length: '65 cm', sleeve_length: '56 cm', extra_fee: 0, status: 'ACTIVE', notes: 'Ukuran Standar' },
        { size_id: 'SZ-02', size_code: 'M', size_name: 'Medium (M)', chest_width: '51 cm', body_length: '68 cm', sleeve_length: '58 cm', extra_fee: 0, status: 'ACTIVE', notes: 'Ukuran Standar' },
        { size_id: 'SZ-03', size_code: 'L', size_name: 'Large (L)', chest_width: '54 cm', body_length: '71 cm', sleeve_length: '60 cm', extra_fee: 0, status: 'ACTIVE', notes: 'Ukuran Standar' },
        { size_id: 'SZ-04', size_code: 'XL', size_name: 'Extra Large (XL)', chest_width: '57 cm', body_length: '74 cm', sleeve_length: '62 cm', extra_fee: 5000, status: 'ACTIVE', notes: 'Biaya tambahan +Rp 5.000' },
        { size_id: 'SZ-05', size_code: 'XXL', size_name: 'Double XL (XXL)', chest_width: '60 cm', body_length: '77 cm', sleeve_length: '64 cm', extra_fee: 10000, status: 'ACTIVE', notes: 'Biaya tambahan +Rp 10.000' }
      ];
    } else {
      for (var j = 0; j < rawSizes.length; j++) {
        sizes.push({
          size_id: rawSizes[j].size_id,
          size_code: rawSizes[j].size_code,
          size_name: rawSizes[j].size_code + (rawSizes[j].notes ? ' (' + rawSizes[j].notes + ')' : ''),
          chest_width: rawSizes[j].chest_width || '-',
          body_length: rawSizes[j].body_length || '-',
          sleeve_length: rawSizes[j].sleeve_length || '-',
          extra_fee: parseFloat(rawSizes[j].extra_fee || 0),
          status: rawSizes[j].status || 'ACTIVE',
          notes: rawSizes[j].notes || ''
        });
      }
    }

    // Read Product Images
    var rawImages = batchRead(CONFIG.SHEETS.PRODUCT_IMAGES);
    var images = [];
    if (rawImages.length === 0) {
      images = [
        {
          image_id: 'IMG-01',
          drive_file_id: 'DRV-FILE-PDH-DEFAULT',
          file_url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80',
          file_name: 'Desain_Utama_PDH_2026.jpg',
          is_primary: true,
          uploaded_at: new Date().toISOString()
        }
      ];
    } else {
      for (var k = 0; k < rawImages.length; k++) {
        images.push({
          image_id: rawImages[k].image_id,
          product_id: rawImages[k].product_id,
          drive_file_id: rawImages[k].drive_file_id,
          file_url: rawImages[k].file_url,
          file_name: rawImages[k].file_name || 'Desain_PDH.jpg',
          is_primary: String(rawImages[k].is_primary) === 'true',
          uploaded_at: rawImages[k].created_at || new Date().toISOString()
        });
      }
    }

    return createResponse(true, {
      info: info,
      pricing: pricing,
      sizes: sizes,
      images: images,
      payment: payment
    }, 'Data Master PDH berhasil dimuat.');
  } catch (err) {
    Logger.log('Error apiGetPDHMasterData: ' + err.message);
    return createResponse(false, null, 'Gagal memuat Master PDH: ' + err.message);
  }
}

/**
 * Update PDH Information (Info & Ketentuan)
 */
function apiUpdatePDHInfo(userId, infoData) {
  if (!authorizeRole(userId, CONFIG.ROLES.PANITIA)) {
    return createResponse(false, null, 'Akses ditolak. Hanya Panitia yang dapat memperbarui Info PDH.');
  }

  try {
    var now = new Date().toISOString();
    var keyMap = {
      PDH_NAME: infoData.pdhName,
      PDH_YEAR: infoData.pdhYear,
      PDH_DESCRIPTION: infoData.pdhDescription,
      PDH_SPEC: infoData.pdhSpec,
      PDH_MATERIAL: infoData.pdhMaterial,
      PDH_MODEL: infoData.pdhModel,
      PDH_COLOR: infoData.pdhColor,
      PDH_TERMS: infoData.pdhTerms,
      PDH_CONTACT: infoData.pdhContact
    };

    Object.keys(keyMap).forEach(function(k) {
      var updated = updateData(CONFIG.SHEETS.SETTINGS, 'setting_key', k, {
        setting_value: keyMap[k],
        updated_at: now
      });
      if (!updated) {
        appendData(CONFIG.SHEETS.SETTINGS, {
          setting_key: k,
          setting_value: keyMap[k],
          description: 'Master PDH setting ' + k,
          updated_at: now
        });
      }
    });

    logAudit(userId, 'UPDATE_PDH_INFO', 'MASTER_PDH', infoData);
    return createResponse(true, infoData, 'Informasi & Ketentuan PDH berhasil diperbarui.');
  } catch (err) {
    return createResponse(false, null, 'Gagal menyimpan informasi PDH: ' + err.message);
  }
}

/**
 * Update PDH Active Pricing
 */
function apiUpdatePDHPricing(userId, pricingData) {
  if (!authorizeRole(userId, CONFIG.ROLES.PANITIA)) {
    return createResponse(false, null, 'Akses ditolak. Hanya Panitia yang dapat memperbarui harga PDH.');
  }

  try {
    var now = new Date().toISOString();
    var updates = {
      PDH_PRICE: String(pricingData.price || 0),
      PDH_PRICE_ACTIVE: String(!!pricingData.active),
      PDH_PRICE_NOTES: pricingData.notes || ''
    };

    Object.keys(updates).forEach(function(k) {
      var updated = updateData(CONFIG.SHEETS.SETTINGS, 'setting_key', k, {
        setting_value: updates[k],
        updated_at: now
      });
      if (!updated) {
        appendData(CONFIG.SHEETS.SETTINGS, {
          setting_key: k,
          setting_value: updates[k],
          description: 'Master PDH Pricing setting ' + k,
          updated_at: now
        });
      }
    });

    logAudit(userId, 'UPDATE_PDH_PRICE', 'MASTER_PDH', pricingData);
    return createResponse(true, pricingData, 'Harga Aktif PDH berhasil diperbarui.');
  } catch (err) {
    return createResponse(false, null, 'Gagal menyimpan harga: ' + err.message);
  }
}

/**
 * Save / Add / Update PDH Size
 */
function apiSavePDHSize(userId, sizeData) {
  if (!authorizeRole(userId, CONFIG.ROLES.PANITIA)) {
    return createResponse(false, null, 'Akses ditolak. Hanya Panitia yang dapat memperbarui daftar ukuran.');
  }

  try {
    var sizeId = sizeData.size_id || generateUniqueId('SZ');
    var existingSizes = batchRead(CONFIG.SHEETS.PRODUCT_SIZES);
    var found = false;

    for (var i = 0; i < existingSizes.length; i++) {
      if (existingSizes[i].size_id === sizeId) {
        found = true;
        break;
      }
    }

    var rowPayload = {
      size_id: sizeId,
      product_id: 'PDH-2026-MAIN',
      size_code: sizeData.size_code,
      extra_fee: sizeData.extra_fee || 0,
      chest_width: sizeData.chest_width || '',
      body_length: sizeData.body_length || '',
      sleeve_length: sizeData.sleeve_length || '',
      status: sizeData.status || 'ACTIVE',
      notes: sizeData.notes || ''
    };

    if (found) {
      updateData(CONFIG.SHEETS.PRODUCT_SIZES, 'size_id', sizeId, rowPayload);
    } else {
      appendData(CONFIG.SHEETS.PRODUCT_SIZES, rowPayload);
    }

    logAudit(userId, 'SAVE_PDH_SIZE', 'MASTER_PDH', rowPayload);
    return createResponse(true, rowPayload, 'Ukuran PDH ' + sizeData.size_code + ' berhasil disimpan.');
  } catch (err) {
    return createResponse(false, null, 'Gagal menyimpan ukuran: ' + err.message);
  }
}

/**
 * Upload PDH Design Image to Google Drive & Save File ID (Max 5 Desain)
 */
function apiUploadPDHDesign(userId, filePayload) {
  if (!authorizeRole(userId, CONFIG.ROLES.PANITIA)) {
    return createResponse(false, null, 'Akses ditolak. Hanya Panitia yang dapat mengunggah desain.');
  }

  try {
    var rawImages = batchRead(CONFIG.SHEETS.PRODUCT_IMAGES);
    if (rawImages.length >= 5) {
      return createResponse(false, null, 'Batas maksimal tercapai! Desain PDH maksimal berjumlah 5 gambar.');
    }

    // Save to Google Drive under 'DESIGN' folder
    var driveRes = saveFileToDrive(
      'DESIGN',
      filePayload.fileName || 'PDH_Design.jpg',
      filePayload.mimeType || 'image/jpeg',
      filePayload.base64Data
    );

    if (!driveRes.success || !driveRes.data) {
      throw new Error(driveRes.message || 'Gagal menyimpan file ke Google Drive.');
    }

    var fileMeta = driveRes.data;
    var imageId = generateUniqueId('IMG');

    var imageRecord = {
      image_id: imageId,
      product_id: 'PDH-2026-MAIN',
      drive_file_id: fileMeta.fileId,
      file_url: fileMeta.fileUrl,
      file_name: fileMeta.fileName,
      is_primary: rawImages.length === 0 ? 'true' : 'false',
      sort_order: rawImages.length + 1
    };

    appendData(CONFIG.SHEETS.PRODUCT_IMAGES, imageRecord);

    logAudit(userId, 'UPLOAD_PDH_DESIGN', 'MASTER_PDH', {
      imageId: imageId,
      driveFileId: fileMeta.fileId,
      fileName: fileMeta.fileName
    });

    return createResponse(true, {
      image_id: imageId,
      drive_file_id: fileMeta.fileId,
      file_url: fileMeta.fileUrl,
      file_name: fileMeta.fileName,
      is_primary: imageRecord.is_primary === 'true'
    }, 'Desain PDH berhasil diunggah ke Google Drive!');
  } catch (err) {
    return createResponse(false, null, 'Gagal upload desain: ' + err.message);
  }
}

/**
 * Delete PDH Design Image from Database & Drive
 */
function apiDeletePDHDesign(userId, imageId) {
  if (!authorizeRole(userId, CONFIG.ROLES.PANITIA)) {
    return createResponse(false, null, 'Akses ditolak. Hanya Panitia yang dapat menghapus desain.');
  }

  try {
    var rawImages = batchRead(CONFIG.SHEETS.PRODUCT_IMAGES);
    var target = null;
    for (var i = 0; i < rawImages.length; i++) {
      if (rawImages[i].image_id === imageId) {
        target = rawImages[i];
        break;
      }
    }

    if (!target) {
      return createResponse(false, null, 'Gambar desain tidak ditemukan.');
    }

    deleteData(CONFIG.SHEETS.PRODUCT_IMAGES, 'image_id', imageId);

    logAudit(userId, 'DELETE_PDH_DESIGN', 'MASTER_PDH', {
      imageId: imageId,
      driveFileId: target.drive_file_id
    });

    return createResponse(true, null, 'Foto desain berhasil dihapus.');
  } catch (err) {
    return createResponse(false, null, 'Gagal menghapus foto desain: ' + err.message);
  }
}

/**
 * Replace existing PDH Design Image with a new file
 */
function apiReplacePDHDesign(userId, imageId, filePayload) {
  if (!authorizeRole(userId, CONFIG.ROLES.PANITIA)) {
    return createResponse(false, null, 'Akses ditolak. Hanya Panitia yang dapat mengganti desain.');
  }

  try {
    var rawImages = batchRead(CONFIG.SHEETS.PRODUCT_IMAGES);
    var target = null;
    for (var i = 0; i < rawImages.length; i++) {
      if (rawImages[i].image_id === imageId) {
        target = rawImages[i];
        break;
      }
    }

    if (!target) {
      return createResponse(false, null, 'Gambar desain tidak ditemukan.');
    }

    var driveRes = saveFileToDrive(
      'DESIGN',
      filePayload.fileName || 'PDH_Design_Replaced.jpg',
      filePayload.mimeType || 'image/jpeg',
      filePayload.base64Data
    );

    if (!driveRes.success || !driveRes.data) {
      throw new Error(driveRes.message || 'Gagal menyimpan file baru ke Google Drive.');
    }

    var fileMeta = driveRes.data;
    var updatedPayload = {
      drive_file_id: fileMeta.fileId,
      file_url: fileMeta.fileUrl,
      file_name: fileMeta.fileName,
      updated_at: new Date().toISOString()
    };

    updateData(CONFIG.SHEETS.PRODUCT_IMAGES, 'image_id', imageId, updatedPayload);

    logAudit(userId, 'REPLACE_PDH_DESIGN', 'MASTER_PDH', {
      imageId: imageId,
      oldFileId: target.drive_file_id,
      newFileId: fileMeta.fileId
    });

    return createResponse(true, {
      image_id: imageId,
      drive_file_id: fileMeta.fileId,
      file_url: fileMeta.fileUrl,
      file_name: fileMeta.fileName
    }, 'Foto desain berhasil diganti!');
  } catch (err) {
    return createResponse(false, null, 'Gagal mengganti foto desain: ' + err.message);
  }
}

/**
 * Update Payment Information
 */
function apiUpdatePDHPaymentInfo(userId, paymentData) {
  if (!authorizeRole(userId, CONFIG.ROLES.PANITIA)) {
    return createResponse(false, null, 'Akses ditolak. Hanya Panitia yang dapat memperbarui informasi pembayaran.');
  }

  try {
    var now = new Date().toISOString();
    var keyMap = {
      PAYMENT_METHOD: paymentData.method,
      PAYMENT_BANK: paymentData.bankName,
      PAYMENT_NUMBER: paymentData.accountNumber,
      PAYMENT_HOLDER: paymentData.accountHolder,
      PAYMENT_INSTRUCTIONS: paymentData.instructions
    };

    Object.keys(keyMap).forEach(function(k) {
      var updated = updateData(CONFIG.SHEETS.SETTINGS, 'setting_key', k, {
        setting_value: keyMap[k],
        updated_at: now
      });
      if (!updated) {
        appendData(CONFIG.SHEETS.SETTINGS, {
          setting_key: k,
          setting_value: keyMap[k],
          description: 'Payment setting ' + k,
          updated_at: now
        });
      }
    });

    logAudit(userId, 'UPDATE_PAYMENT_INFO', 'MASTER_PDH', paymentData);
    return createResponse(true, paymentData, 'Informasi Pembayaran berhasil diperbarui.');
  } catch (err) {
    return createResponse(false, null, 'Gagal menyimpan informasi pembayaran: ' + err.message);
  }
}
