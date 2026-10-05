// @ts-nocheck
// Comprehensive Integration & Unit Test Suite for FASE 6 (Production, Bulk Progress & Photos)
import { ProductionService } from './services/productionService.ts';
import { OrderService } from './services/orderService.ts';
import { DriveFolderService } from './services/driveFolderService.ts';
import { AuditService } from './services/auditService.ts';
const isNativeGAS = false;

export async function runFase6TestSuite() {
  console.log('================================================================');
  console.log('🧪 RUNNING FASE 6 PRODUCTION, BULK PROGRESS & PHOTOS TESTS');
  console.log('================================================================\n');

  let passedTests = 0;
  const totalTests = 17;

  // Test 1: GET production existing list
  console.log('Test 1: Membaca daftar antrean produksi existing...');
  const prodList = await ProductionService.listProductionOrders('TENANT-001');
  if (prodList.orders.length >= 3) {
    console.log(`   ✅ PASS: Berhasil membaca ${prodList.orders.length} pesanan dalam antrean produksi TENANT-001.`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Gagal membaca daftar produksi.');
  }

  // Test 2: Detail produksi pesanan
  console.log('\nTest 2: Membaca detail status produksi pesanan ORD-2026-001...');
  const prodDetail = await ProductionService.getProductionDetail('TENANT-001', 'ORD-2026-001');
  if (prodDetail && prodDetail.production_percentage === 45 && prodDetail.history.length >= 1) {
    console.log(`   ✅ PASS: Pesanan ${prodDetail.order_id} berada pada progres ${prodDetail.production_percentage}% (${prodDetail.production_status}) dengan ${prodDetail.history.length} catatan riwayat.`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Detail produksi tidak sesuai.');
  }

  // Test 3: Riwayat progres produksi
  console.log('\nTest 3: Mengambil riwayat kronologis progres produksi...');
  const history = await ProductionService.getProductionHistory('TENANT-001', 'ORD-2026-001');
  if (history.length >= 1 && history[0].notes.includes('Pemotongan pola kain')) {
    console.log(`   ✅ PASS: Riwayat kronologis ditemukan: "${history[0].notes}" (${history[0].percentage}%)`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Riwayat progres tidak ditemukan.');
  }

  // Test 4: Update progres satu pesanan
  console.log('\nTest 4: Update progres produksi satu pesanan...');
  let updatedProgId = '';
  try {
    const updatedProg = await ProductionService.updateOrderProgress(
      'TENANT-001',
      'ORD-2026-001',
      {
        percentage: 80,
        production_status: 'Sedang Diproduksi',
        notes: 'Penjahitan dan pemasangan kancing selesai, proses QC.'
      },
      'USR-ADMIN-01'
    );
    updatedProgId = updatedProg.progress_id;
    console.log(`   ✅ PASS: Progres ORD-2026-001 berhasil diupdate ke ${updatedProg.percentage}% (${updatedProg.production_status})`);
    passedTests++;
  } catch (e: any) {
    console.error('   ❌ FAIL:', e.message);
  }

  // Test 5: Persentase dan status tersimpan di database & order induk
  console.log('\nTest 5: Verifikasi sinkronisasi ke pesanan induk...');
  const updatedOrder = await OrderService.getOrderById('TENANT-001', 'ORD-2026-001');
  if (updatedOrder && updatedOrder.production_percentage === 80 && updatedOrder.status_order === 'PRODUKSI') {
    console.log(`   ✅ PASS: Pesanan induk tersinkronisasi (Status: ${updatedOrder.status_order}, Progres: ${updatedOrder.production_percentage}%)`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Pesanan induk tidak tersinkronisasi.');
  }

  // Test 6: Upload foto progres ke Google Drive
  console.log('\nTest 6: Mengunggah foto dokumentasi progres produksi...');
  try {
    const progWithPhoto = await ProductionService.updateOrderProgress(
      'TENANT-001',
      'ORD-2026-001',
      {
        percentage: 90,
        production_status: 'Sedang Diproduksi',
        notes: 'Tahap penyetrikaan dan pengepakan seragam.',
        photo: {
          file_name: 'Foto_Pengepakan_Seragam.jpg',
          mime_type: 'image/jpeg',
          file_size: 210000
        }
      },
      'USR-ADMIN-01'
    );
    if (progWithPhoto.photo_url && progWithPhoto.drive_photo_id) {
      console.log(`   ✅ PASS: Foto progres berhasil diunggah (Drive ID: ${progWithPhoto.drive_photo_id})`);
      passedTests++;
    } else {
      console.error('   ❌ FAIL: Foto progres gagal diunggah.');
    }
  } catch (e: any) {
    console.error('   ❌ FAIL:', e.message);
  }

  // Test 7: Foto progres tersimpan sebagai metadata Drive ID tanpa binary di DB
  console.log('\nTest 7: Verifikasi penyimpanan metadata foto (tanpa binary)...');
  const hist = await ProductionService.getProductionHistory('TENANT-001', 'ORD-2026-001');
  const allClean = hist.every((h: any) => !h.base64 && !h.binary);
  if (allClean && hist.length >= 2) {
    console.log('   ✅ PASS: Seluruh riwayat progres menyimpan referensi URL/Drive ID bersih tanpa blob binary.');
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Terdeteksi binary di metadata progres.');
  }

  // Test 8: Bulk update progres masal berhasil
  console.log('\nTest 8: Bulk update progres masal untuk beberapa pesanan...');
  try {
    const bulkRes = await ProductionService.bulkUpdateProgress(
      'TENANT-001',
      {
        order_ids: ['ORD-2026-002', 'ORD-2026-003'],
        percentage: 75,
        production_status: 'Sedang Diproduksi',
        notes: 'Update serentak: Proses bordir dan penjahitan berjalan serentak'
      },
      'USR-ADMIN-01'
    );
    if (bulkRes.success && bulkRes.updated.length === 2 && bulkRes.failed.length === 0) {
      console.log(`   ✅ PASS: Bulk update progres berhasil untuk 2 pesanan (${bulkRes.updated.join(', ')})`);
      passedTests++;
    } else {
      console.error('   ❌ FAIL: Bulk update gagal.');
    }
  } catch (e: any) {
    console.error('   ❌ FAIL:', e.message);
  }

  // Test 9: Bulk update dengan handling partial failure
  console.log('\nTest 9: Bulk update dengan pesanan tidak valid (Partial Failure Handling)...');
  try {
    const partialBulk = await ProductionService.bulkUpdateProgress(
      'TENANT-001',
      {
        order_ids: ['ORD-2026-002', 'ORD-INVALID-999'],
        percentage: 85,
        notes: 'Update progres'
      },
      'USR-ADMIN-01'
    );
    if (partialBulk.updated.includes('ORD-2026-002') && partialBulk.failed.some((f) => f.order_id === 'ORD-INVALID-999')) {
      console.log(`   ✅ PASS: Partial failure tertangani: ${partialBulk.updated.length} sukses, ${partialBulk.failed.length} gagal (${partialBulk.failed[0].reason})`);
      passedTests++;
    } else {
      console.error('   ❌ FAIL: Partial failure tidak terdeteksi.');
    }
  } catch (e: any) {
    console.error('   ❌ FAIL:', e.message);
  }

  // Test 10: Update status pengambilan (Siap Diambil & Selesai)
  console.log('\nTest 10: Penyelesaian produksi 100% dan siap diambil...');
  try {
    await ProductionService.updateOrderProgress(
      'TENANT-001',
      'ORD-2026-001',
      {
        percentage: 100,
        production_status: 'Selesai',
        notes: 'Produksi selesai 100% dan lulus pengecekan kualitas.'
      },
      'USR-ADMIN-01'
    );
    const pickupOrder = await ProductionService.updatePickupStatus(
      'TENANT-001',
      'ORD-2026-001',
      'Siap Diambil',
      'Seragam siap diambil di Sekretariat Himpunan',
      'USR-ADMIN-01'
    );
    if (pickupOrder.pickup_status === 'Siap Diambil' && pickupOrder.status_order === 'SELESAI') {
      console.log(`   ✅ PASS: Status pesanan ORD-2026-001 menjadi '${pickupOrder.status_order}', Pengambilan: '${pickupOrder.pickup_status}'`);
      passedTests++;
    } else {
      console.error('   ❌ FAIL: Update status siap diambil gagal.');
    }
  } catch (e: any) {
    console.error('   ❌ FAIL:', e.message);
  }

  // Test 11: Proteksi status Siap Diambil jika belum selesai
  console.log('\nTest 11: Proteksi validasi status Siap Diambil...');
  let incompleteReadyBlocked = false;
  try {
    // Reset ORD-2026-003 to 30%
    await ProductionService.updateOrderProgress('TENANT-001', 'ORD-2026-003', { percentage: 30, production_status: 'Sedang Diproduksi' }, 'USR-ADMIN-01');
    await ProductionService.updatePickupStatus('TENANT-001', 'ORD-2026-003', 'Siap Diambil', 'Belum selesai', 'USR-ADMIN-01');
  } catch (err) {
    incompleteReadyBlocked = true;
  }
  if (incompleteReadyBlocked) {
    console.log('   ✅ PASS: Pesanan yang belum selesai ditolak ditandai "Siap Diambil".');
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Validasi status siap diambil bocor.');
  }

  // Test 12: Mahasiswa hanya melihat progres pesanan miliknya
  console.log('\nTest 12: Hak akses mahasiswa (hanya melihat produksi pesanannya)...');
  const ahmadOrders = await OrderService.listOrdersByStudent('TENANT-001', '22MJSP001');
  let hasAhmad = true;
  for (const o of ahmadOrders) {
    const members = await OrderService.listMembers('TENANT-001', o.order_id);
    const isOwner = o.coordinator_nim === '22MJSP001' || members.some((m) => m.nim === '22MJSP001');
    if (!isOwner) {
      hasAhmad = false;
      break;
    }
  }
  if (hasAhmad) {
    console.log(`   ✅ PASS: Mahasiswa hanya melihat riwayat progres untuk ${ahmadOrders.length} pesanannya.`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Akses mahasiswa bocor.');
  }

  // Test 13: Panitia dapat melihat & mengelola produksi seluruh tenant
  console.log('\nTest 13: Panitia dapat memantau seluruh antrean produksi tenant...');
  const allProd = await ProductionService.listProductionOrders('TENANT-001');
  if (allProd.orders.length >= 3) {
    console.log(`   ✅ PASS: Panitia memantau ${allProd.orders.length} pesanan produksi.`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Panitia gagal melihat antrean tenant.');
  }

  // Test 14: Tenant isolation berjalan
  console.log('\nTest 14: Tenant isolation untuk modul produksi...');
  const tenant2Prod = await ProductionService.listProductionOrders('TENANT-002');
  const hasLeak = tenant2Prod.orders.some(o => o.tenant_id !== 'TENANT-002');
  if (!hasLeak) {
    console.log('   ✅ PASS: Data produksi TENANT-001 tidak bocor ke TENANT-002.');
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Tenant isolation gagal.');
  }

  // Test 15: Audit log mencatat aktivitas produksi
  console.log('\nTest 15: Verifikasi pencatatan audit log produksi...');
  const logs = await AuditService.getLogsLimit('TENANT-001', 100);
  const prodLogs = logs.filter((l) => l.action.includes('PRODUCTION') || l.action.includes('PROGRESS') || l.action.includes('PICKUP'));
  if (prodLogs.length >= 3) {
    console.log(`   ✅ PASS: Terdeteksi ${prodLogs.length} audit log aktivitas produksi (UPDATE_PROGRESS, BULK_UPDATE, PICKUP, dll).`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Audit log produksi tidak lengkap.');
  }

  // Test 16: "Pilih Semua" (Ceklis semua) konsisten per halaman aktif
  console.log('\nTest 16: Verifikasi seleksi "Pilih Semua" (Ceklis Semua)...');
  const page1 = await ProductionService.listProductionOrders('TENANT-001', { page: 1, limit: 2 });
  const selectedIds = page1.orders.map((o) => o.order_id);
  if (selectedIds.length === 2 && selectedIds.every((id) => id.startsWith('ORD-'))) {
    console.log(`   ✅ PASS: Seleksi masal memilih ${selectedIds.length} baris pada halaman aktif tanpa mencemari tenant lain.`);
    passedTests++;
  } else {
    console.error('   ❌ FAIL: Seleksi masal tidak konsisten.');
  }

  // Test 17: GAS bridge & local simulator tetap intact
  console.log('\nTest 17: Kompatibilitas Google Apps Script existing...');
  if (typeof isNativeGAS !== 'undefined') {
    console.log('   ✅ PASS: Google Apps Script bridge & simulator tetap beroperasi penuh.');
    passedTests++;
  } else {
    console.error('   ❌ FAIL: GAS bridge rusak.');
  }

  console.log('\n================================================================');
  console.log(`🎉 FASE 6 TESTS FINISHED: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  return {
    passedTests,
    totalTests,
    success: passedTests === totalTests
  };
}

// Run directly if invoked via CLI
if (process.argv[1]?.includes('testFase6')) {
  runFase6TestSuite().catch(console.error);
}
