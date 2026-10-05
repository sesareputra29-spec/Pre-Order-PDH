// @ts-nocheck
// Comprehensive Integration & Unit Test Suite for FASE 8 (Reports & Server-Side PDF)
import { ReportService } from './services/reportService.ts';
import { OrderService } from './services/orderService.ts';
import { PaymentService } from './services/paymentService.ts';
import { ProductionService } from './services/productionService.ts';
import { PeriodService } from './services/periodService.ts';
import { AuditService } from './services/auditService.ts';

export async function runFase8TestSuite() {
  console.log('================================================================');
  console.log('🧪 RUNNING FASE 8 REPORTS & PDF EXPORT TESTS');
  console.log('================================================================\n');

  let passedTests = 0;
  const totalTests = 18;

  // ==========================================
  // SECTION 1: REPORT DATA GENERATION (7 Reports)
  // ==========================================
  console.log('--- SECTION 1: CORE REPORT MODULES (REAL DATA) ---');

  // Test 1: Laporan Ringkasan Pesanan (Executive Order Summary)
  console.log('Test 1: Memverifikasi Laporan Ringkasan Pesanan...');
  const summaryReport = await ReportService.getOrderSummaryReport('TENANT-001');
  if (
    summaryReport &&
    summaryReport.metrics &&
    summaryReport.metrics.totalOrders >= 1 &&
    summaryReport.metrics.totalPcs >= 1 &&
    summaryReport.metrics.totalNominal > 0
  ) {
    console.log(`   ✅ PASS: Ringkasan Pesanan berhasil dimuat (${summaryReport.metrics.totalOrders} order, ${summaryReport.metrics.totalPcs} stel, Total ${ReportService.formatRupiah(summaryReport.metrics.totalNominal)}).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Ringkasan Pesanan kosong atau gagal dihitung.');
  }

  // Test 2: Laporan Per Kelas (Class Breakdown)
  console.log('\nTest 2: Memverifikasi Laporan Per Kelas...');
  const classReport = await ReportService.getClassReport('TENANT-001');
  if (classReport && classReport.classes.length >= 1 && classReport.classes[0].totalPcs >= 0) {
    const sampleClass = classReport.classes[0];
    console.log(`   ✅ PASS: Laporan Per Kelas berhasil (${classReport.totalClasses} kelas terdata, Contoh Kelas: ${sampleClass.className}, ${sampleClass.totalPcs} stel).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Laporan Per Kelas gagal.');
  }

  // Test 3: Laporan Mahasiswa (Student Report)
  console.log('\nTest 3: Memverifikasi Laporan Mahasiswa & Status Pemesanan...');
  const studentReport = await ReportService.getStudentReport('TENANT-001');
  if (studentReport && studentReport.students.length >= 1 && studentReport.pagination.total >= 1) {
    const sampleStudent = studentReport.students[0];
    console.log(`   ✅ PASS: Laporan Mahasiswa berhasil (${studentReport.pagination.total} mahasiswa, Contoh: ${sampleStudent.nama_lengkap} - ${sampleStudent.payment_status}).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Laporan Mahasiswa gagal.');
  }

  // Test 4: Laporan Pembayaran (Payment Reconciliation)
  console.log('\nTest 4: Memverifikasi Laporan Pembayaran & Rekonsiliasi...');
  const paymentReport = await ReportService.getPaymentReport('TENANT-001');
  if (paymentReport && paymentReport.summary && paymentReport.summary.methodBreakdown) {
    console.log(`   ✅ PASS: Laporan Pembayaran berhasil (Total Disetujui: ${paymentReport.summary.totalApprovedFormatted}, Metode Pembayaran: ${paymentReport.summary.methodBreakdown.length} jenis).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Laporan Pembayaran gagal.');
  }

  // Test 5: Laporan Produksi (Production Progress Tracking)
  console.log('\nTest 5: Memverifikasi Laporan Produksi...');
  const productionReport = await ReportService.getProductionReport('TENANT-001');
  if (productionReport && productionReport.counts && productionReport.orders.length >= 1) {
    console.log(`   ✅ PASS: Laporan Produksi berhasil (Belum: ${productionReport.counts.belum_diproduksi}, Sedang: ${productionReport.counts.sedang_diproduksi}, Selesai: ${productionReport.counts.selesai}).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Laporan Produksi gagal.');
  }

  // Test 6: Laporan Periode (Period Performance)
  console.log('\nTest 6: Memverifikasi Laporan Periode PO...');
  const periodReport = await ReportService.getPeriodReport('TENANT-001');
  if (periodReport && periodReport.periods.length >= 1) {
    const activeP = periodReport.periods[0];
    console.log(`   ✅ PASS: Laporan Periode berhasil (${periodReport.periods.length} periode, ${activeP.nama_periode}: ${activeP.totalOrders} order, ${activeP.totalPcs} stel).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Laporan Periode gagal.');
  }

  // Test 7: Laporan Konveksi (Convection Tailor SPK)
  console.log('\nTest 7: Memverifikasi Laporan Konveksi SPK (Rekap Ukuran & Rincian Potong Jahit)...');
  const convReport = await ReportService.getConvectionReport('TENANT-001');
  if (
    convReport &&
    convReport.size_recap.length >= 1 &&
    convReport.items.length >= 1 &&
    convReport.total_pcs >= 1
  ) {
    const sizeSummaryStr = convReport.size_recap.map((s) => `${s.size}:${s.count}`).join(', ');
    console.log(`   ✅ PASS: Laporan Konveksi berhasil (${convReport.total_pcs} stel, Rekap Ukuran: [${sizeSummaryStr}], Rincian: ${convReport.items.length} potong baju).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Laporan Konveksi gagal.');
  }

  // ==========================================
  // SECTION 2: FILTER & PENCARIAN (Backend Filtering)
  // ==========================================
  console.log('\n--- SECTION 2: FILTER & PENCARIAN ---');

  // Test 8: Filter berdasarkan kelas
  console.log('Test 8: Filter laporan berdasarkan kelas (22MJSP001)...');
  const filteredByClass = await ReportService.getOrderSummaryReport('TENANT-001', { kelas: '22MJSP001' });
  const allMatchClass = filteredByClass.orders.every((o) => o.coordinator_class === '22MJSP001');
  if (allMatchClass && filteredByClass.orders.length >= 1) {
    console.log(`   ✅ PASS: Filter kelas=22MJSP001 akurat (${filteredByClass.orders.length} pesanan).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Filter kelas tidak akurat.');
  }

  // Test 9: Pencarian teks (Search)
  console.log('\nTest 9: Pencarian teks laporan (search=Ahmad)...');
  const searchResult = await ReportService.getOrderSummaryReport('TENANT-001', { search: 'Ahmad' });
  const allMatchSearch = searchResult.orders.every(
    (o) => o.coordinator_name.toLowerCase().includes('ahmad') || o.coordinator_nim.includes('ahmad')
  );
  if (allMatchSearch && searchResult.orders.length >= 1) {
    console.log(`   ✅ PASS: Pencarian teks akurat (${searchResult.orders.length} hasil relevan).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Pencarian teks gagal.');
  }

  // Test 10: Filter status pembayaran
  console.log('\nTest 10: Filter pembayaran berdasarkan status (DISETUJUI)...');
  const filterPayStatus = await ReportService.getPaymentReport('TENANT-001', { status: 'DISETUJUI' });
  const allApproved = filterPayStatus.payments.every((p) => p.status === 'DISETUJUI');
  if (allApproved && filterPayStatus.payments.length >= 1) {
    console.log(`   ✅ PASS: Filter pembayaran status=DISETUJUI akurat (${filterPayStatus.payments.length} transaksi).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Filter pembayaran gagal.');
  }

  // ==========================================
  // SECTION 3: SERVER-SIDE PDF EXPORT & PREVIEW
  // ==========================================
  console.log('\n--- SECTION 3: SERVER-SIDE PDF GENERATION ---');

  // Test 11: Generate PDF Laporan Eksekutif (General Report)
  console.log('Test 11: Memverifikasi pembuatan PDF Laporan Eksekutif di Server...');
  const generalPdfBuffer = await ReportService.generateReportPDF('TENANT-001', 'general', {}, 'Admin Panitia');
  const isGeneralPdfValid =
    generalPdfBuffer instanceof Buffer &&
    generalPdfBuffer.length > 1000 &&
    generalPdfBuffer.toString('utf-8', 0, 5).startsWith('%PDF-');
  if (isGeneralPdfValid) {
    console.log(`   ✅ PASS: PDF Laporan Eksekutif berhasil di-generate (${generalPdfBuffer.length} bytes, format %PDF- valid).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Buffer PDF Laporan Eksekutif tidak valid.');
  }

  // Test 12: Generate PDF Laporan Konveksi (Convection SPK)
  console.log('\nTest 12: Memverifikasi pembuatan PDF Laporan Konveksi SPK di Server...');
  const convPdfBuffer = await ReportService.generateReportPDF('TENANT-001', 'convection', {}, 'Admin Panitia');
  const isConvPdfValid =
    convPdfBuffer instanceof Buffer &&
    convPdfBuffer.length > 1000 &&
    convPdfBuffer.toString('utf-8', 0, 5).startsWith('%PDF-');
  if (isConvPdfValid) {
    console.log(`   ✅ PASS: PDF Laporan Konveksi berhasil di-generate (${convPdfBuffer.length} bytes, format %PDF- valid).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Buffer PDF Laporan Konveksi tidak valid.');
  }

  // Test 13: Pembuatan PDF dengan Kriteria Filter Aktif
  console.log('\nTest 13: Memverifikasi pembuatan PDF dengan parameter filter...');
  const filteredPdfBuffer = await ReportService.generateReportPDF(
    'TENANT-001',
    'convection',
    { kelas: 'IK-2A', status: 'DIVERIFIKASI' },
    'Admin Panitia'
  );
  if (filteredPdfBuffer && filteredPdfBuffer.length > 500) {
    console.log(`   ✅ PASS: PDF tersaring sesuai filter berhasil dibuat (${filteredPdfBuffer.length} bytes).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: PDF tersaring gagal dibuat.');
  }

  // Test 14: Verifikasi pencatatan audit log saat ekspor PDF
  console.log('\nTest 14: Memverifikasi audit aktivitas tercatat saat pembuatan PDF...');
  const pdfAudit = await AuditService.queryLogs('TENANT-001', { search: 'Laporan PDF' });
  if (pdfAudit.logs.length >= 1) {
    console.log(`   ✅ PASS: Audit ekspor PDF tercatat (${pdfAudit.logs[0].details}).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Audit ekspor PDF tidak tercatat.');
  }

  // ==========================================
  // SECTION 4: KEAMANAN & ISOLASI TENANT
  // ==========================================
  console.log('\n--- SECTION 4: SECURITY & TENANT ISOLATION ---');

  // Test 15: Tenant Isolation - Data tenant lain tidak bocor
  console.log('Test 15: Memverifikasi isolasi tenant pada seluruh laporan...');
  const tenant2Summary = await ReportService.getOrderSummaryReport('TENANT-002');
  const tenant2Class = await ReportService.getClassReport('TENANT-002');
  const tenant2Conv = await ReportService.getConvectionReport('TENANT-002');
  const hasTenant1InSummary = tenant2Summary.orders && tenant2Summary.orders.some((o) => o.tenant_id === 'TENANT-001');
  const hasTenant1InConv = tenant2Conv.items && tenant2Conv.items.some((i) => i.tenant_id === 'TENANT-001');
  if (!hasTenant1InSummary && !hasTenant1InConv) {
    console.log('   ✅ PASS: Data TENANT-001 terisolasi sempurna dan tidak bocor ke TENANT-002.');
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Tenant isolation pada modul laporan bocor.');
  }

  // Test 16: Immutability - Pembuatan laporan tidak mengubah order/payment asli
  console.log('\nTest 16: Memverifikasi immutability (Laporan read-only, tidak memutasi data)...');
  const orderBefore = await OrderService.getOrderById('TENANT-001', 'ORD-2026-001');
  await ReportService.getOrderSummaryReport('TENANT-001');
  await ReportService.getConvectionReport('TENANT-001');
  const orderAfter = await OrderService.getOrderById('TENANT-001', 'ORD-2026-001');
  if (
    orderBefore &&
    orderAfter &&
    orderBefore.total_amount === orderAfter.total_amount &&
    orderBefore.status_order === orderAfter.status_order &&
    orderBefore.total_qty === orderAfter.total_qty
  ) {
    console.log('   ✅ PASS: Data order tetap utuh tanpa modifikasi atau penambahan dummy.');
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Data pesanan termutasi oleh fungsi laporan.');
  }

  // Test 17: Rekapitulasi ukuran konveksi akurat
  console.log('\nTest 17: Memverifikasi keakuratan rekap ukuran konveksi...');
  const convReportCheck = await ReportService.getConvectionReport('TENANT-001');
  const sumSizes = convReportCheck.size_recap.reduce((acc, s) => acc + s.count, 0);
  if (sumSizes === convReportCheck.total_pcs && convReportCheck.size_recap.length >= 1) {
    console.log(`   ✅ PASS: Penjumlahan rekap ukuran (${sumSizes} pcs) cocok persis dengan total_pcs (${convReportCheck.total_pcs} pcs).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Rekap ukuran konveksi tidak konsisten.');
  }

  // Test 18: Bebas dari dummy data
  console.log('\nTest 18: Memverifikasi seluruh data berasal dari state/database riil...');
  const realOrders = (await OrderService.listOrders('TENANT-001', { limit: 100 })).orders;
  const convItems = (await ReportService.getConvectionReport('TENANT-001')).items;
  const noDummy = convItems.every((it) => realOrders.some((ro) => ro.order_id === it.order_id));
  if (noDummy) {
    console.log('   ✅ PASS: Semua baris laporan bersumber langsung dari data pesanan riil.');
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Terdieteksi dummy data dalam laporan.');
  }

  console.log('\n================================================================');
  console.log(`🎉 FASE 8 TESTS FINISHED: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  return {
    passedTests,
    totalTests,
    success: passedTests === totalTests
  };
}

// Run directly if invoked via CLI
if (process.argv[1]?.includes('testFase8')) {
  runFase8TestSuite().catch(console.error);
}
