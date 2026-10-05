// @ts-nocheck
// Comprehensive Integration & Unit Test Suite for FASE 9 (Frontend Migration to Vercel API)
import { AuthService } from './services/authService.ts';
import { UserService } from './services/userService.ts';
import { PDHService } from './services/pdhService.ts';
import { OrderService } from './services/orderService.ts';
import { PaymentService } from './services/paymentService.ts';
import { ProductionService } from './services/productionService.ts';
import { NotificationService } from './services/notificationService.ts';
import { AuditService } from './services/auditService.ts';
import { ReportService } from './services/reportService.ts';
import { verifyAuthToken } from './utils/security.ts';

export async function runFase9TestSuite() {
  console.log('================================================================');
  console.log('🧪 RUNNING FASE 9 FRONTEND TO VERCEL API MIGRATION TESTS');
  console.log('================================================================\n');

  let passedTests = 0;
  const totalTests = 16;

  // Step 1: LOGIN (Auth API)
  console.log('Step 1: Menguji autentikasi login via AuthService...');
  const loginRes = await AuthService.login('TENANT-001', 'admin', 'admin123');
  if (loginRes && loginRes.token && loginRes.user.role === 'PANITIA') {
    console.log(`   ✅ PASS: Login Panitia berhasil (User: ${loginRes.user.name}, Token: ${loginRes.token.substring(0, 15)}...).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Login gagal.');
  }

  // Step 2: DASHBOARD & SESSION RESTORATION (Verify Token / Me)
  console.log('\nStep 2: Menguji pemulihan sesi (Refresh / Me)...');
  const tokenPayload = verifyAuthToken(loginRes.token);
  if (tokenPayload && tokenPayload.username === 'admin' && tokenPayload.tenant_id === 'TENANT-001') {
    console.log(`   ✅ PASS: Token JWT valid dan memulihkan sesi (Tenant: ${tokenPayload.tenant_id}, Role: ${tokenPayload.role}).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Verifikasi sesi gagal.');
  }

  // Step 3: MASTER PDH API
  console.log('\nStep 3: Menguji pengambilan Master PDH...');
  const masterData = await PDHService.getMasterData('TENANT-001');
  if (masterData && masterData.info && masterData.info.title) {
    console.log(`   ✅ PASS: Master PDH aktif dimuat: ${masterData.info.title} (Harga: Rp ${masterData.pricing.basePrice.toLocaleString('id-ID')}).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Gagal memuat Master PDH.');
  }

  // Step 4: PESANAN API (Create Order & List Orders)
  console.log('\nStep 4: Menguji pembuatan dan pembacaan pesanan...');
  const newOrder = await OrderService.createOrder(
    'TENANT-001',
    {
      coordinator_name: 'Mahasiswa Uji Coba',
      coordinator_nim: '22MJSP999',
      coordinator_class: '22MJSP001',
      coordinator_phone: '081299998888',
      order_type: 'PRIBADI',
      members: [
        {
          nama_lengkap: 'Mahasiswa Uji Coba',
          nim: '22MJSP999',
          ukuran: 'L',
          custom_name: 'Uji Coba F9'
        }
      ]
    },
    'USR-ADMIN-01'
  );
  if (newOrder && newOrder.order_id && newOrder.total_qty === 1) {
    console.log(`   ✅ PASS: Pesanan ${newOrder.order_id} (${newOrder.order_number}) berhasil dibuat via OrderService.`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Pembuatan pesanan gagal.');
  }

  // Step 5: PEMBAYARAN API (Create Payment)
  console.log('\nStep 5: Menguji pembuatan transaksi pembayaran...');
  const newPay = await PaymentService.createPayment(
    'TENANT-001',
    {
      order_id: newOrder.order_id,
      jumlah: newOrder.total_amount,
      metode: 'Transfer Bank BCA',
      payer_name: 'Mahasiswa Uji Coba',
      payer_nim: '22MJSP999'
    },
    '22MJSP999'
  );
  if (newPay && newPay.payment_id && newPay.status === 'MENUNGGU_VERIFIKASI') {
    console.log(`   ✅ PASS: Pembayaran ${newPay.payment_id} berhasil dibuat (Status: ${newPay.status}).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Pembuatan pembayaran gagal.');
  }

  // Step 6: UPLOAD BUKTI PEMBAYARAN KE DRIVE
  console.log('\nStep 6: Menguji upload bukti pembayaran ke Google Drive...');
  const dummyBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...';
  const proofUpload = await PaymentService.uploadProof(
    'TENANT-001',
    newPay.payment_id,
    {
      file_name: 'bukti_transfer_999.jpg',
      mime_type: 'image/jpeg',
      file_size: 15420,
      base64_data: dummyBase64
    },
    '22MJSP999'
  );
  if (proofUpload && proofUpload.drive_file_id) {
    console.log(`   ✅ PASS: Bukti pembayaran terunggah ke Drive (Drive ID: ${proofUpload.drive_file_id}).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Upload bukti pembayaran gagal.');
  }

  // Step 7: APPROVAL PEMBAYARAN
  console.log('\nStep 7: Menguji verifikasi dan approval pembayaran panitia...');
  const approvedPay = await PaymentService.approvePayment(
    'TENANT-001',
    newPay.payment_id,
    'USR-ADMIN-01',
    'Pembayaran valid dan lunas.'
  );
  if (approvedPay && approvedPay.status === 'DISETUJUI') {
    console.log(`   ✅ PASS: Pembayaran ${approvedPay.payment_id} disetujui (Status Order: LUNAS).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Approval pembayaran gagal.');
  }

  // Step 8: PRODUKSI (Update Progress Single)
  console.log('\nStep 8: Menguji update progres produksi...');
  const prodProg = await ProductionService.updateOrderProgress(
    'TENANT-001',
    newOrder.order_id,
    {
      percentage: 50,
      production_status: 'Sedang Diproduksi',
      notes: 'Pemotongan pola dan bordir nama selesai.'
    },
    'USR-ADMIN-01'
  );
  if (prodProg && prodProg.percentage === 50) {
    console.log(`   ✅ PASS: Progres produksi pesanan ${newOrder.order_id} diperbarui: 50% (${prodProg.production_status}).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Update progres produksi gagal.');
  }

  // Step 9: BULK UPDATE PRODUKSI
  console.log('\nStep 9: Menguji bulk update progres produksi masal...');
  const bulkRes = await ProductionService.bulkUpdateProgress(
    'TENANT-001',
    {
      order_ids: [newOrder.order_id],
      percentage: 80,
      production_status: 'Sedang Diproduksi',
      notes: 'Finishing kancing dan jahit tepi.'
    },
    'USR-ADMIN-01'
  );
  if (bulkRes && bulkRes.updated.includes(newOrder.order_id)) {
    console.log(`   ✅ PASS: Bulk update progres berhasil (${bulkRes.updated.length} pesanan diperbarui).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Bulk update produksi gagal.');
  }

  // Step 10: UPLOAD FOTO PROGRES PRODUKSI
  console.log('\nStep 10: Menguji upload dokumentasi foto progres produksi...');
  const photoUpload = await ProductionService.updateOrderProgress(
    'TENANT-001',
    newOrder.order_id,
    {
      percentage: 85,
      notes: 'Dokumentasi penjahitan.',
      photo: {
        file_name: 'foto_jahit_fase9.jpg',
        mime_type: 'image/jpeg',
        file_size: 25000,
        base64_data: dummyBase64
      }
    },
    'USR-ADMIN-01'
  );
  if (photoUpload && (photoUpload.drive_photo_id || photoUpload.photo_url)) {
    console.log(`   ✅ PASS: Foto progres produksi tersimpan di Drive (ID: ${photoUpload.drive_photo_id}).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Upload foto progres produksi gagal.');
  }

  // Step 11: NOTIFIKASI
  console.log('\nStep 11: Menguji penerbitan notifikasi otomatis dan mark as read...');
  const notifList = await NotificationService.listNotifications('TENANT-001', '22MJSP999', 'MAHASISWA');
  if (notifList && notifList.notifications.length >= 1) {
    const targetNotif = notifList.notifications[0];
    await NotificationService.markAsRead('TENANT-001', targetNotif.notification_id, '22MJSP999', 'MAHASISWA');
    console.log(`   ✅ PASS: Notifikasi ditemukan (${notifList.notifications.length} notif) dan berhasil ditandai dibaca.`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Notifikasi mahasiswa tidak terbit.');
  }

  // Step 12: AUDIT LOGS
  console.log('\nStep 12: Menguji query audit aktivitas...');
  const auditLogs = await AuditService.queryLogs('TENANT-001', { search: newOrder.order_id });
  if (auditLogs && auditLogs.logs.length >= 1) {
    console.log(`   ✅ PASS: Audit aktivitas pesanan ${newOrder.order_id} tercatat lengkap (${auditLogs.logs.length} catatan audit).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Audit log tidak ditemukan.');
  }

  // Step 13: LAPORAN (Executive Summary & Konveksi)
  console.log('\nStep 13: Menguji agregasi modul laporan backend...');
  const summaryRep = await ReportService.getOrderSummaryReport('TENANT-001');
  const convRep = await ReportService.getConvectionReport('TENANT-001');
  if (summaryRep && convRep && summaryRep.metrics.totalOrders >= 1 && convRep.size_recap.length >= 1) {
    console.log(`   ✅ PASS: Laporan ringkasan & konveksi aktif (${summaryRep.metrics.totalOrders} order, ${convRep.total_pcs} pcs baju).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Agregasi laporan gagal.');
  }

  // Step 14: SERVER-SIDE PDF GENERATION
  console.log('\nStep 14: Menguji pembuatan dokumen PDF Server-Side...');
  const pdfBuffer = await ReportService.generateReportPDF('TENANT-001', 'convection', {}, 'Admin Panitia');
  if (pdfBuffer && pdfBuffer.length > 1000 && pdfBuffer.toString('utf-8', 0, 5).startsWith('%PDF-')) {
    console.log(`   ✅ PASS: Dokumen PDF SPK Konveksi berhasil dibuat (${pdfBuffer.length} bytes, format %PDF- valid).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Pembuatan PDF server-side gagal.');
  }

  // Step 15: TENANT ISOLATION
  console.log('\nStep 15: Menguji isolasi tenant penuh...');
  const tenant2Orders = await OrderService.listOrders('TENANT-002');
  const tenant2Audits = await AuditService.queryLogs('TENANT-002', {});
  const leakedOrders = tenant2Orders.orders.some((o) => o.tenant_id === 'TENANT-001');
  const leakedAudits = tenant2Audits.logs.some((l) => l.tenant_id === 'TENANT-001');
  if (!leakedOrders && !leakedAudits) {
    console.log('   ✅ PASS: Tenant isolation 100% terjaga (0 data TENANT-001 bocor ke TENANT-002).');
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Kebocoran data antar-tenant.');
  }

  // Step 16: RESILIENCE & ERROR HANDLING
  console.log('\nStep 16: Menguji error handling dan resilience...');
  try {
    await PaymentService.approvePayment('TENANT-001', 'PAY-NONEXISTENT', 'USR-ADMIN-01');
    console.error('   ❌ FAIL: Seharusnya error saat pembayaran tidak ditemukan.');
  } catch (err: any) {
    if (err.message.includes('tidak ditemukan')) {
      console.log(`   ✅ PASS: Error ditangani dengan pesan informatif: "${err.message}".`);
      passedTests++;
    } else {
      console.error('   ❌ FAIL: Format error tidak sesuai.');
    }
  }

  console.log('\n================================================================');
  console.log(`🎉 FASE 9 TESTS FINISHED: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  return {
    passedTests,
    totalTests,
    success: passedTests === totalTests
  };
}

// Run directly if invoked via CLI
if (process.argv[1]?.includes('testFase9')) {
  runFase9TestSuite().catch(console.error);
}
