/**
 * PDH CAMPUS ORDER SYSTEM
 * PO Period Service: POPeriod.gs
 * 
 * Manages Pre-Order (PO) Periods, Manual/Automatic Mode, Overrides, and Server Validation.
 */

/**
 * Evaluate PO status taking into account Mode, Timezone (Asia/Jakarta), Schedule & Manual Override
 * @param {Object} period 
 * @returns {string} 'OPEN' | 'CLOSED'
 */
function evaluatePOStatus(period) {
  if (!period) return 'CLOSED';

  // Manual Mode -> Status is explicitly set by Panitia
  if (period.mode === 'MANUAL' || period.manual_override === true || String(period.manual_override) === 'true') {
    return period.status === 'OPEN' ? 'OPEN' : 'CLOSED';
  }

  // Automatic Mode -> Evaluate current time against start and end schedule
  try {
    var now = new Date();
    // Parse Asia/Jakarta start time
    if (period.start_date && period.end_date) {
      var startStr = period.start_date + 'T' + (period.start_time || '00:00') + ':00+07:00';
      var endStr = period.end_date + 'T' + (period.end_time || '23:59') + ':59+07:00';

      var startTime = new Date(startStr);
      var endTime = new Date(endStr);

      if (now >= startTime && now <= endTime) {
        return 'OPEN';
      }
    }
  } catch(e) {
    Logger.log('Error evaluating automatic PO schedule: ' + e.message);
  }

  return 'CLOSED';
}

/**
 * Get active PO Period with computed live status
 */
function apiGetActivePOPeriod() {
  try {
    var periods = batchRead(CONFIG.SHEETS.PO_PERIODS);
    if (periods.length === 0) {
      // Seed default initial PO period if none exists
      var defaultPO = {
        period_id: 'PO-2026-GEL1',
        name: 'PO PDH Angkatan 2026/2027 Gelombang 1',
        start_date: Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd'),
        start_time: '08:00',
        end_date: Utilities.formatDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), 'Asia/Jakarta', 'yyyy-MM-dd'),
        end_time: '23:59',
        mode: 'MANUAL',
        status: 'OPEN',
        manual_override: false,
        target_quota: 500,
        notes: 'Pre-Order resmi PDH Kampus Gelombang 1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      appendData(CONFIG.SHEETS.PO_PERIODS, defaultPO);
      periods = [defaultPO];
    }

    // Sort descending to get latest active period
    periods.sort(function(a, b) {
      return new Date(b.created_at || b.updated_at || 0) - new Date(a.created_at || a.updated_at || 0);
    });

    var activePeriod = periods[0];
    var computedStatus = evaluatePOStatus(activePeriod);

    var result = {
      period_id: activePeriod.period_id,
      name: activePeriod.name,
      start_date: activePeriod.start_date || '',
      start_time: activePeriod.start_time || '08:00',
      end_date: activePeriod.end_date || '',
      end_time: activePeriod.end_time || '23:59',
      mode: activePeriod.mode || 'MANUAL',
      status: computedStatus,
      raw_status: activePeriod.status,
      manual_override: String(activePeriod.manual_override) === 'true',
      target_quota: parseFloat(activePeriod.target_quota || 0),
      notes: activePeriod.notes || '',
      isOpen: computedStatus === 'OPEN'
    };

    return createResponse(true, result, 'Status Periode PO berhasil dievaluasi.');
  } catch(err) {
    Logger.log('Error apiGetActivePOPeriod: ' + err.message);
    return createResponse(false, null, 'Gagal mendapatkan status PO: ' + err.message);
  }
}

/**
 * Get full history of all PO Periods
 */
function apiGetAllPOPeriods() {
  try {
    var periods = batchRead(CONFIG.SHEETS.PO_PERIODS);
    periods.forEach(function(p) {
      p.computed_status = evaluatePOStatus(p);
    });
    return createResponse(true, periods, 'Riwayat periode PO berhasil dimuat.');
  } catch(err) {
    return createResponse(false, null, 'Gagal memuat riwayat PO: ' + err.message);
  }
}

/**
 * Save / Create / Edit PO Period with Server-side Form Validation
 */
function apiSavePOPeriod(userId, poData) {
  if (!authorizeRole(userId, CONFIG.ROLES.PANITIA)) {
    return createResponse(false, null, 'Akses ditolak. Hanya Panitia yang dapat mengelola periode PO.');
  }

  try {
    if (!poData.name || !poData.name.trim()) {
      return createResponse(false, null, 'Nama periode PO wajib diisi.');
    }

    // Validation for OTOMATIS mode
    if (poData.mode === 'OTOMATIS') {
      if (!poData.start_date || !poData.start_time || !poData.end_date || !poData.end_time) {
        return createResponse(false, null, 'Mode OTOMATIS wajib menyertakan Tanggal & Jam Mulai serta Selesai.');
      }

      var startDT = new Date(poData.start_date + 'T' + poData.start_time + ':00');
      var endDT = new Date(poData.end_date + 'T' + poData.end_time + ':00');

      if (isNaN(startDT.getTime()) || isNaN(endDT.getTime())) {
        return createResponse(false, null, 'Format tanggal/jam tidak valid.');
      }

      if (endDT <= startDT) {
        return createResponse(false, null, 'Tanggal/jam selesai harus setelah tanggal/jam mulai.');
      }
    }

    var periodId = poData.period_id || generateUniqueId('PO');
    var now = new Date().toISOString();

    var existing = batchRead(CONFIG.SHEETS.PO_PERIODS);
    var found = false;

    for (var i = 0; i < existing.length; i++) {
      if (existing[i].period_id === periodId) {
        found = true;
        break;
      }
    }

    var rowPayload = {
      period_id: periodId,
      name: poData.name.trim(),
      start_date: poData.start_date || '',
      start_time: poData.start_time || '08:00',
      end_date: poData.end_date || '',
      end_time: poData.end_time || '23:59',
      mode: poData.mode || 'MANUAL',
      status: poData.status || 'OPEN',
      manual_override: String(poData.manual_override) === 'true',
      target_quota: poData.target_quota || 0,
      notes: poData.notes || '',
      updated_at: now
    };

    if (found) {
      updateData(CONFIG.SHEETS.PO_PERIODS, 'period_id', periodId, rowPayload);
      logAudit(userId, 'UPDATE_PO', 'PO_PERIOD', {
        poId: periodId,
        name: poData.name,
        mode: poData.mode,
        status: poData.status
      });
    } else {
      rowPayload.created_at = now;
      appendData(CONFIG.SHEETS.PO_PERIODS, rowPayload);
      logAudit(userId, 'CREATE_PO', 'PO_PERIOD', {
        poId: periodId,
        name: poData.name,
        mode: poData.mode,
        status: poData.status
      });
    }

    return createResponse(true, rowPayload, 'Periode PO ' + poData.name + ' berhasil disimpan.');
  } catch(err) {
    return createResponse(false, null, 'Gagal menyimpan periode PO: ' + err.message);
  }
}

/**
 * Toggle PO Status (Open / Close PO) with Manual Override Tracking & Audit Log
 */
function apiTogglePOStatus(userId, periodId, targetStatus) {
  if (!authorizeRole(userId, CONFIG.ROLES.PANITIA)) {
    return createResponse(false, null, 'Akses ditolak. Hanya Panitia yang dapat merubah status PO.');
  }

  try {
    var periods = batchRead(CONFIG.SHEETS.PO_PERIODS);
    var targetPeriod = null;

    for (var i = 0; i < periods.length; i++) {
      if (periods[i].period_id === periodId) {
        targetPeriod = periods[i];
        break;
      }
    }

    if (!targetPeriod) {
      return createResponse(false, null, 'Periode PO tidak ditemukan.');
    }

    var prevStatus = targetPeriod.status;
    var now = new Date().toISOString();

    var updatePayload = {
      status: targetStatus, // 'OPEN' | 'CLOSED'
      manual_override: true, // Mark manual override active
      updated_at: now
    };

    updateData(CONFIG.SHEETS.PO_PERIODS, 'period_id', periodId, updatePayload);

    var actionName = targetStatus === 'OPEN' ? 'OPEN_PO' : 'CLOSE_PO';
    logAudit(userId, actionName, 'PO_PERIOD', {
      poId: periodId,
      activity: 'Manual ' + targetStatus + ' override',
      previousStatus: prevStatus,
      newStatus: targetStatus,
      overrideTime: now
    });

    return createResponse(true, updatePayload, 'Periode PO berhasil di-override menjadi ' + targetStatus + '.');
  } catch(err) {
    return createResponse(false, null, 'Gagal mengubah status PO: ' + err.message);
  }
}

/**
 * Server-side order creation access check
 */
function apiValidatePOAccess() {
  var activeRes = apiGetActivePOPeriod();
  if (!activeRes.success || !activeRes.data || !activeRes.data.isOpen) {
    return createResponse(false, null, 'Pembuatan pesanan ditolak: Pre-Order (PO) saat ini sedang ditutup.');
  }
  return createResponse(true, activeRes.data, 'Akses PO Valid.');
}
