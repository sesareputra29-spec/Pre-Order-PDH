// @ts-nocheck
// Comprehensive Integration & Unit Test Suite for FASE 7 (Notifications & Activity Audit)
import { NotificationService } from './services/notificationService.ts';
import { AuditService } from './services/auditService.ts';
import { OrderService } from './services/orderService.ts';
import { PaymentService } from './services/paymentService.ts';
import { ProductionService } from './services/productionService.ts';
const isNativeGAS = false;

export async function runFase7TestSuite() {
  console.log('================================================================');
  console.log('🧪 RUNNING FASE 7 NOTIFICATIONS & AUDIT TESTS');
  console.log('================================================================\n');

  let passedTests = 0;
  const totalTests = 29;

  // ==========================================
  // SECTION 1: NOTIFICATION TESTS (11 Tests)
  // ==========================================
  console.log('--- SECTION 1: NOTIFICATION TESTS ---');

  // Test 1: Notification dapat dibuat
  console.log('Test 1: Membuat notifikasi baru secara langsung...');
  const newNotif = await NotificationService.create({
    tenant_id: 'TENANT-001',
    user_id: '22MJSP001',
    type: 'system.announcement',
    title: 'Pengumuman Pengambilan Seragam',
    message: 'Pengambilan seragam PDH dijadwalkan hari Senin depan.',
    reference_type: 'ANNOUNCEMENT',
    reference_id: 'ANN-2026-001'
  });
  if (newNotif && newNotif.notification_id && newNotif.title.includes('Pengumuman')) {
    console.log(`   ✅ PASS: Notifikasi ${newNotif.notification_id} berhasil dibuat.`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Gagal membuat notifikasi.');
  }

  // Test 2: Notification dapat dibaca
  console.log('\nTest 2: Membaca daftar notifikasi mahasiswa...');
  const notifList = await NotificationService.listNotifications('TENANT-001', '22MJSP001', 'MAHASISWA');
  if (notifList.notifications.length >= 1) {
    console.log(`   ✅ PASS: Berhasil mengambil ${notifList.notifications.length} notifikasi untuk 22MJSP001.`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Daftar notifikasi kosong.');
  }

  // Test 3: Unread count benar
  console.log('\nTest 3: Memeriksa akurasi unread count...');
  const unreadCountBefore = await NotificationService.getUnreadCount('TENANT-001', '22MJSP001', 'MAHASISWA');
  if (unreadCountBefore >= 1) {
    console.log(`   ✅ PASS: Unread count mahasiswa terhitung akurat: ${unreadCountBefore} belum dibaca.`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Unread count tidak valid.');
  }

  // Test 4: Mark as read berhasil
  console.log('\nTest 4: Menandai satu notifikasi sebagai telah dibaca (mark as read)...');
  const readResult = await NotificationService.markAsRead('TENANT-001', newNotif.notification_id, '22MJSP001', 'MAHASISWA');
  if (readResult.is_read && readResult.read_at) {
    console.log(`   ✅ PASS: Notifikasi ${readResult.notification_id} ditandai dibaca pada ${readResult.read_at}.`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Gagal mark as read.');
  }

  // Test 5: Read all berhasil
  console.log('\nTest 5: Menandai seluruh notifikasi mahasiswa sebagai telah dibaca (read all)...');
  const readAllResult = await NotificationService.markAllAsRead('TENANT-001', '22MJSP001', 'MAHASISWA');
  const unreadCountAfter = await NotificationService.getUnreadCount('TENANT-001', '22MJSP001', 'MAHASISWA');
  if (unreadCountAfter === 0) {
    console.log(`   ✅ PASS: Read all berhasil (${readAllResult.count} notifikasi diperbarui, unread count = 0).`);
    passedTests++;
  } else {
    console.error(`   ❌ FAIL: Masih tersisa unread count: ${unreadCountAfter}`);
  }

  // Test 6: Notifikasi hanya muncul pada user yang benar
  console.log('\nTest 6: Memverifikasi penerima notifikasi spesifik per user...');
  const studentBNotifs = await NotificationService.listNotifications('TENANT-001', '22MJSP002', 'MAHASISWA');
  const hasAhmadNotif = studentBNotifs.notifications.some((n) => n.notification_id === newNotif.notification_id);
  if (!hasAhmadNotif) {
    console.log('   ✅ PASS: Mahasiswa lain tidak dapat melihat notifikasi milik 22MJSP001.');
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Notifikasi bocor ke mahasiswa lain.');
  }

  // Test 7: Tenant isolation berhasil
  console.log('\nTest 7: Tenant isolation notifikasi...');
  const tenant2Notifs = await NotificationService.listNotifications('TENANT-002', '22MJSP001', 'MAHASISWA');
  const hasAhmadNotifT2 = tenant2Notifs.notifications.some((n) => n.notification_id === newNotif.notification_id);
  if (!hasAhmadNotifT2) {
    console.log('   ✅ PASS: Notifikasi TENANT-001 terisolasi dan tidak muncul di TENANT-002.');
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Notifikasi bocor antar tenant.');
  }

  // Test 8: Retry tidak membuat duplicate
  console.log('\nTest 8: Proteksi retry / double click idempotency...');
  const idemKey = `IDEM-NOTIF-TEST-${Date.now()}`;
  const firstCall = await NotificationService.create({
    tenant_id: 'TENANT-001',
    user_id: '22MJSP001',
    type: 'system.announcement',
    title: 'Idempotency Check 1',
    message: 'Pesan pengujian idempotency.',
    reference_type: 'ANNOUNCEMENT',
    reference_id: 'IDEM-001',
    idempotency_key: idemKey
  });
  const retryCall = await NotificationService.create({
    tenant_id: 'TENANT-001',
    user_id: '22MJSP001',
    type: 'system.announcement',
    title: 'Idempotency Check 1',
    message: 'Pesan pengujian idempotency.',
    reference_type: 'ANNOUNCEMENT',
    reference_id: 'IDEM-001',
    idempotency_key: idemKey
  });
  if (firstCall.notification_id === retryCall.notification_id) {
    console.log(`   ✅ PASS: Retry menghasilkan ID yang sama (${firstCall.notification_id}), tidak membuat duplikasi.`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Terjadi duplicate notification.');
  }

  // Test 9: Polling/refresh tidak membuat duplicate
  console.log('\nTest 9: Polling query tidak menimbulkan duplikasi...');
  const poll1 = await NotificationService.listNotifications('TENANT-001', '22MJSP001', 'MAHASISWA');
  const poll2 = await NotificationService.listNotifications('TENANT-001', '22MJSP001', 'MAHASISWA');
  if (poll1.notifications.length === poll2.notifications.length) {
    console.log('   ✅ PASS: Refresh/polling berulang menghasilkan jumlah data stabil.');
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Polling merusak integritas notifikasi.');
  }

  // Test 10: Event production menghasilkan notification sesuai aturan
  console.log('\nTest 10: Event perubahan progres produksi memicu notifikasi otomatis...');
  await ProductionService.updateOrderProgress(
    'TENANT-001',
    'ORD-2026-001',
    {
      percentage: 95,
      production_status: 'Sedang Diproduksi',
      notes: 'Finishing kancing dan label.'
    },
    'USR-ADMIN-01'
  );
  const mhsNotifsAfterProd = await NotificationService.listNotifications('TENANT-001', '22MJSP001', 'MAHASISWA');
  const prodNotifFound = mhsNotifsAfterProd.notifications.some((n) => n.reference_id === 'ORD-2026-001' && n.type === 'production.updated');
  if (prodNotifFound) {
    console.log('   ✅ PASS: Perubahan progres produksi menghasilkan notifikasi [production.updated] bagi pemesan.');
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Notifikasi progres produksi tidak terbit.');
  }

  // Test 11: Payment approve/reject menghasilkan notification sesuai aturan
  console.log('\nTest 11: Event verifikasi pembayaran memicu notifikasi otomatis...');
  // Create payment & reject to trigger notification
  const dummyPay = await PaymentService.createPayment(
    'TENANT-001',
    {
      order_id: 'ORD-2026-001',
      jumlah: 10000,
      metode: 'Tunai',
      payer_name: 'Ahmad Mahasiswa',
      payer_nim: '22MJSP001'
    },
    '22MJSP001'
  );
  await PaymentService.rejectPayment('TENANT-001', dummyPay.payment_id, 'USR-ADMIN-01', 'Nominal tidak sesuai ketentuan');
  const mhsNotifsAfterPay = await NotificationService.listNotifications('TENANT-001', '22MJSP001', 'MAHASISWA');
  const payRejectNotif = mhsNotifsAfterPay.notifications.some((n) => n.reference_id === dummyPay.payment_id && n.type === 'payment.rejected');
  if (payRejectNotif) {
    console.log('   ✅ PASS: Penolakan pembayaran berhasil menerbitkan notifikasi [payment.rejected] ke mahasiswa.');
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Notifikasi pembayaran tidak terbit.');
  }

  // ==========================================
  // SECTION 2: AUDIT TESTS (18 Tests)
  // ==========================================
  console.log('\n--- SECTION 2: AUDIT ACTIVITY TESTS ---');

  // Test 12: Login tercatat
  console.log('Test 12: Memverifikasi pencatatan audit LOGIN...');
  await AuditService.logEvent('TENANT-001', 'USR-ADMIN-01', 'LOGIN', 'Sesi Login Panitia', 'Login berhasil ke Portal Panitia');
  const loginAudit = await AuditService.queryLogs('TENANT-001', { action: 'LOGIN' });
  if (loginAudit.logs.length >= 1) {
    console.log(`   ✅ PASS: Audit LOGIN ditemukan (${loginAudit.logs[0].details}).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Audit LOGIN tidak ditemukan.');
  }

  // Test 13: Create/update user tercatat
  console.log('\nTest 13: Memverifikasi pencatatan audit USER...');
  await AuditService.logEvent('TENANT-001', 'USR-ADMIN-01', 'CREATE_USER', 'User USR-PANITIA-TEST', 'Membuat akun panitia baru');
  const userAudit = await AuditService.queryLogs('TENANT-001', { action: 'CREATE_USER' });
  if (userAudit.logs.length >= 1) {
    console.log(`   ✅ PASS: Audit CREATE_USER ditemukan (${userAudit.logs[0].entity}).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Audit user tidak ditemukan.');
  }

  // Test 14: Update PDH tercatat
  console.log('\nTest 14: Memverifikasi pencatatan audit MASTER PDH...');
  await AuditService.logEvent('TENANT-001', 'USR-ADMIN-01', 'UPDATE_PDH_PRICE', 'PDH-2026-001', 'Pembaruan harga master PDH');
  const pdhAudit = await AuditService.queryLogs('TENANT-001', { action: 'UPDATE_PDH_PRICE' });
  if (pdhAudit.logs.length >= 1) {
    console.log(`   ✅ PASS: Audit UPDATE_PDH_PRICE ditemukan.`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Audit PDH tidak ditemukan.');
  }

  // Test 15: Create/update order tercatat
  console.log('\nTest 15: Memverifikasi pencatatan audit ORDER...');
  await OrderService.createOrder(
    'TENANT-001',
    {
      coordinator_name: 'Ahmad Mahasiswa',
      coordinator_nim: '22MJSP001',
      coordinator_class: 'IK-2A',
      coordinator_phone: '081234567890',
      members: [{ nama_lengkap: 'Ahmad Mahasiswa', nim: '22MJSP001', ukuran: 'L' }]
    },
    'USR-ADMIN-01'
  );
  const orderAudit = await AuditService.queryLogs('TENANT-001', { action: 'CREATE_ORDER' });
  if (orderAudit.logs.length >= 1) {
    console.log(`   ✅ PASS: Audit CREATE_ORDER terdeteksi (${orderAudit.logs.length} catatan).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Audit CREATE_ORDER tidak ditemukan.');
  }

  // Test 16: Bulk order update tercatat
  console.log('\nTest 16: Memverifikasi pencatatan audit BULK ORDER UPDATE...');
  await AuditService.logEvent('TENANT-001', 'USR-ADMIN-01', 'BULK_UPDATE_ORDER_STATUS', 'Bulk Orders', 'Bulk update status pesanan');
  const bulkOrderAudit = await AuditService.queryLogs('TENANT-001', { action: 'BULK_UPDATE_ORDER_STATUS' });
  if (bulkOrderAudit.logs.length >= 1) {
    console.log(`   ✅ PASS: Audit BULK_UPDATE_ORDER_STATUS terdeteksi.`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Audit bulk order status tidak ditemukan.');
  }

  // Test 17: Payment approve/reject tercatat
  console.log('\nTest 17: Memverifikasi pencatatan audit PAYMENT APPROVE/REJECT...');
  const payAudits = await AuditService.queryLogs('TENANT-001', { module: 'PAYMENT' });
  const hasApproveOrReject = payAudits.logs.some((l) => l.action === 'APPROVE_PAYMENT' || l.action === 'REJECT_PAYMENT');
  if (hasApproveOrReject) {
    console.log(`   ✅ PASS: Audit APPROVE_PAYMENT & REJECT_PAYMENT tercatat (${payAudits.logs.length} catatan modul PAYMENT).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Audit verifikasi pembayaran tidak ditemukan.');
  }

  // Test 18: Production update tercatat
  console.log('\nTest 18: Memverifikasi pencatatan audit PRODUCTION UPDATE...');
  const prodAudits = await AuditService.queryLogs('TENANT-001', { action: 'UPDATE_PRODUCTION_PROGRESS' });
  if (prodAudits.logs.length >= 1) {
    console.log(`   ✅ PASS: Audit UPDATE_PRODUCTION_PROGRESS terdeteksi.`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Audit progres produksi tidak tercatat.');
  }

  // Test 19: Bulk production update tercatat
  console.log('\nTest 19: Memverifikasi pencatatan audit BULK PRODUCTION UPDATE...');
  await AuditService.logEvent('TENANT-001', 'USR-ADMIN-01', 'BULK_UPDATE_PRODUCTION_PROGRESS', 'Bulk Production', 'Pembaruan serentak progres produksi');
  const bulkProdAudit = await AuditService.queryLogs('TENANT-001', { action: 'BULK_UPDATE_PRODUCTION_PROGRESS' });
  if (bulkProdAudit.logs.length >= 1) {
    console.log(`   ✅ PASS: Audit BULK_UPDATE_PRODUCTION_PROGRESS terdeteksi.`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Audit bulk update produksi tidak ditemukan.');
  }

  // Test 20: Upload foto produksi tercatat
  console.log('\nTest 20: Memverifikasi pencatatan audit UPLOAD FOTO PRODUKSI...');
  await AuditService.logEvent('TENANT-001', 'USR-ADMIN-01', 'UPLOAD_PRODUCTION_PHOTO', 'Pesanan ORD-2026-001', 'Mengunggah dokumentasi progres produksi');
  const photoAudit = await AuditService.queryLogs('TENANT-001', { action: 'UPLOAD_PRODUCTION_PHOTO' });
  if (photoAudit.logs.length >= 1) {
    console.log(`   ✅ PASS: Audit UPLOAD_PRODUCTION_PHOTO terdeteksi.`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Audit upload foto produksi tidak tercatat.');
  }

  // Test 21: Filter audit berhasil
  console.log('\nTest 21: Pengujian filter audit berdasarkan modul (AUTH vs PAYMENT vs ORDER)...');
  const authOnly = await AuditService.queryLogs('TENANT-001', { module: 'AUTH' });
  const allAuth = authOnly.logs.every((l) => l.module === 'AUTH');
  if (allAuth && authOnly.logs.length >= 1) {
    console.log(`   ✅ PASS: Filter module=AUTH akurat (${authOnly.logs.length} data).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Filter modul audit tidak akurat.');
  }

  // Test 22: Search audit berhasil
  console.log('\nTest 22: Pengujian pencarian teks audit (search)...');
  const searchRes = await AuditService.queryLogs('TENANT-001', { search: 'ORD-2026-001' });
  if (searchRes.logs.length >= 1 && searchRes.logs.every((l) => l.details.includes('ORD-2026-001') || l.entity.includes('ORD-2026-001') || l.target_id.includes('ORD-2026-001'))) {
    console.log(`   ✅ PASS: Pencarian 'ORD-2026-001' menemukan ${searchRes.logs.length} catatan audit relevan.`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Pencarian audit gagal.');
  }

  // Test 23: Pagination 50 berhasil
  console.log('\nTest 23: Pagination limit 50...');
  const page50 = await AuditService.queryLogs('TENANT-001', { limit: 50, page: 1 });
  if (page50.pagination.limit === 50 && page50.logs.length <= 50) {
    console.log(`   ✅ PASS: Pagination 50 berhasil (Ditemukan: ${page50.logs.length}, Total: ${page50.pagination.total}).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Pagination 50 gagal.');
  }

  // Test 24: Pagination 100 berhasil
  console.log('\nTest 24: Pagination limit 100...');
  const page100 = await AuditService.queryLogs('TENANT-001', { limit: 100, page: 1 });
  if (page100.pagination.limit === 100 && page100.logs.length <= 100) {
    console.log(`   ✅ PASS: Pagination 100 berhasil (Limit: ${page100.pagination.limit}).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Pagination 100 gagal.');
  }

  // Test 25: Mode semua data tetap aman
  console.log('\nTest 25: Mode "Tampilkan Semua" dengan safety cap...');
  const allLogs = await AuditService.queryLogs('TENANT-001', { limit: 'all' });
  if (allLogs.pagination.limit <= 500 && allLogs.logs.length === allLogs.pagination.total) {
    console.log(`   ✅ PASS: Mode 'all' terproteksi aman (Limit tercap maksimal ${allLogs.pagination.limit}, memuat ${allLogs.logs.length} data tanpa hang).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Mode semua data tidak terproteksi.');
  }

  // Test 26: Tenant isolation berhasil
  console.log('\nTest 26: Tenant isolation audit aktivitas...');
  const tenant2Audit = await AuditService.queryLogs('TENANT-002', {});
  const hasTenant1Audit = tenant2Audit.logs.some((l) => l.tenant_id === 'TENANT-001' || l.details.includes('Tenant TENANT-001'));
  if (!hasTenant1Audit) {
    console.log('   ✅ PASS: Audit TENANT-001 tidak bocor ke TENANT-002 (0 log bocor).');
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Tenant isolation audit gagal.');
  }

  // Test 27: Audit tidak dapat diedit (immutability)
  console.log('\nTest 27: Immutability check (Audit tidak menyediakan edit API)...');
  const hasUpdateMethod = typeof (AuditService as any).updateLog === 'function' || typeof (AuditService as any).editLog === 'function';
  if (!hasUpdateMethod) {
    console.log('   ✅ PASS: Audit bersifat murni Append-Only, tidak ada fungsi edit audit.');
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Ditemukan fungsi mutasi audit!');
  }

  // Test 28: Audit tidak dapat dihapus (append-only)
  console.log('\nTest 28: Append-only check (Audit tidak menyediakan delete API)...');
  const hasDeleteMethod = typeof (AuditService as any).deleteLog === 'function' || typeof (AuditService as any).removeLog === 'function';
  if (!hasDeleteMethod) {
    console.log('   ✅ PASS: Audit murni Append-Only, tidak ada fungsi delete audit.');
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Ditemukan fungsi penghapusan audit!');
  }

  // Test 29: Tidak ada password / token dalam audit (Sanitization check)
  console.log('\nTest 29: Sanitization check (Pencegahan bocor password / token di audit)...');
  await AuditService.logEvent(
    'TENANT-001',
    'USR-ADMIN-01',
    'CHANGE_PASSWORD',
    'User Akun',
    'Mengubah password: password="SuperSecret123!" dan token="jwt-secret-token-abcdef"'
  );
  const sanitizedLogs = await AuditService.queryLogs('TENANT-001', { action: 'CHANGE_PASSWORD' });
  const leakFound = sanitizedLogs.logs.some((l) => l.details.includes('SuperSecret123!') || l.details.includes('jwt-secret-token'));
  if (!leakFound && sanitizedLogs.logs[0].details.includes('[REDACTED]')) {
    console.log(`   ✅ PASS: Kredensial rahasia otomatis ter-sanitize: "${sanitizedLogs.logs[0].details}".`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Password atau token bocor dalam audit!');
  }

  console.log('\n================================================================');
  console.log(`🎉 FASE 7 TESTS FINISHED: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  return {
    passedTests,
    totalTests,
    success: passedTests === totalTests
  };
}

// Run directly if invoked via CLI
if (process.argv[1]?.includes('testFase7')) {
  runFase7TestSuite().catch(console.error);
}
