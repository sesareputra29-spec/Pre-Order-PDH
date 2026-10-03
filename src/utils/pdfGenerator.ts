import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { User, OrderRecord, PDHMasterData } from '../types';

export interface PDFReportOptions {
  user: User;
  masterData: PDHMasterData | null;
  filteredOrders: OrderRecord[];
  filteredItems: Array<{
    order_id: string;
    order_number: string;
    order_type: string;
    buyer_name: string;
    buyer_nim: string;
    buyer_class: string;
    student_name: string;
    nim: string;
    class_name: string;
    size_code: string;
    custom_name: string;
    unit_price: number;
    quantity: number;
    subtotal: number;
    payment_status: string;
    production_status: string;
    pickup_status: string;
    created_at: string;
  }>;
  sizeBreakdown: Array<{ sizeCode: string; count: number; totalNominal: number }>;
  classBreakdown: Array<{
    className: string;
    studentCount: number;
    orderCount: number;
    totalPcs: number;
    sizeBreakdownText: string;
    totalNominal: number;
    paidNominal: number;
  }>;
  metrics: {
    totalOrders: number;
    totalPcs: number;
    totalNominal: number;
    personalCount: number;
    collectiveCount: number;
    personalNominal: number;
    collectiveNominal: number;
    totalStudents: number;
    paidCount: number;
    paidNominal: number;
    pendingApprovalCount: number;
    pendingApprovalNominal: number;
    unpaidCount: number;
    unpaidNominal: number;
    rejectedCount: number;
    prodBelumCount: number;
    prodSedangCount: number;
    prodSelesaiCount: number;
    avgProgress: number;
  };
  filters: {
    startDate?: string;
    endDate?: string;
    orderType?: string;
    paymentStatus?: string;
    orderStatus?: string;
    prodStatus?: string;
    className?: string;
    sizeCode?: string;
    searchQuery?: string;
  };
}

const formatRupiah = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(val || 0);
};

export const generateGeneralReportPDF = (options: PDFReportOptions) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });

  // Header Banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('LAPORAN REKAPITULASI PEMESANAN & LOGISTIK PDH', 14, 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Sistem Informasi Pemesanan Resmi Pakaian Dinas Harian (PDH) Kampus', 14, 17);

  // Metadata Info Box
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  let currentY = 30;

  doc.text(`Waktu Cetak: ${nowStr}`, 14, currentY);
  doc.text(`Dicetak Oleh: ${options.user.name} (${options.user.role})`, pageWidth - 14, currentY, { align: 'right' });

  currentY += 4;
  doc.setFont('helvetica', 'normal');
  const filterList: string[] = [];
  if (options.filters.startDate || options.filters.endDate) {
    filterList.push(`Periode: ${options.filters.startDate || 'Awal'} s/d ${options.filters.endDate || 'Sekarang'}`);
  }
  if (options.filters.orderType && options.filters.orderType !== 'ALL') filterList.push(`Jenis: ${options.filters.orderType}`);
  if (options.filters.paymentStatus && options.filters.paymentStatus !== 'ALL') filterList.push(`Status Bayar: ${options.filters.paymentStatus}`);
  if (options.filters.prodStatus && options.filters.prodStatus !== 'ALL') filterList.push(`Status Prod: ${options.filters.prodStatus}`);
  if (options.filters.className && options.filters.className !== 'ALL') filterList.push(`Kelas: ${options.filters.className}`);
  if (options.filters.sizeCode && options.filters.sizeCode !== 'ALL') filterList.push(`Ukuran: ${options.filters.sizeCode}`);

  const filterText = filterList.length > 0 ? `Filter Aktif: ${filterList.join(' | ')}` : 'Filter: Semua Data (Tanpa Filter)';
  doc.text(filterText, 14, currentY);

  currentY += 4;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, currentY, pageWidth - 14, currentY);
  currentY += 4;

  // Executive KPI Summary Table
  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['Total Pesanan', 'Total Item PDH', 'Total Mahasiswa', 'Total Nilai (Rp)', 'Lunas (Rp)', 'Progres Prod.']],
    body: [[
      `${options.metrics.totalOrders} Order`,
      `${options.metrics.totalPcs} Pcs`,
      `${options.metrics.totalStudents} Orang`,
      formatRupiah(options.metrics.totalNominal),
      formatRupiah(options.metrics.paidNominal),
      `${options.metrics.avgProgress}%`
    ]],
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'center' },
    bodyStyles: { fontSize: 8, fontStyle: 'bold', halign: 'center', textColor: [30, 41, 59] },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // 1. Rekapitulasi Ukuran PDH
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('1. Rekapitulasi Kebutuhan Ukuran Baju PDH', 14, currentY);
  currentY += 2;

  const sizeRows = options.sizeBreakdown.map((s) => {
    const pct = options.metrics.totalPcs > 0 ? Math.round((s.count / options.metrics.totalPcs) * 100) : 0;
    return [
      `Ukuran ${s.sizeCode}`,
      `${s.count} Pcs`,
      `${pct}%`,
      formatRupiah(s.totalNominal)
    ];
  });

  autoTable(doc, {
    startY: currentY,
    theme: 'striped',
    head: [['Ukuran', 'Jumlah (Pcs)', 'Persentase', 'Estimasi Nilai (Rp)']],
    body: sizeRows.length > 0 ? sizeRows : [['Tidak ada data', '0', '0%', 'Rp 0']],
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center', fontStyle: 'bold' },
      2: { halign: 'center' },
      3: { halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // 2. Rekapitulasi per Kelas
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('2. Rekapitulasi Pemesanan Berdasarkan Kelas Mahasiswa', 14, currentY);
  currentY += 2;

  const classRows = options.classBreakdown.map((c) => [
    c.className,
    `${c.studentCount} Mhs`,
    `${c.orderCount} Order`,
    `${c.totalPcs} Pcs`,
    c.sizeBreakdownText || '-',
    formatRupiah(c.totalNominal)
  ]);

  autoTable(doc, {
    startY: currentY,
    theme: 'striped',
    head: [['Kode Kelas', 'Jml Mahasiswa', 'Jml Order', 'Total Pcs', 'Rincian Ukuran', 'Total Nominal']],
    body: classRows.length > 0 ? classRows : [['Tidak ada data', '0', '0', '0', '-', 'Rp 0']],
    headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 7.5 },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center', fontStyle: 'bold' },
      4: { fontStyle: 'normal' },
      5: { halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // 3. Detail Daftar Pesanan
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`3. Daftar Rincian Pesanan Terfilter (${options.filteredOrders.length} Pesanan)`, 14, currentY);
  currentY += 2;

  const orderRows = options.filteredOrders.map((o, idx) => [
    String(idx + 1),
    o.order_number,
    o.buyer_name,
    `${o.buyer_nim || '-'} (${o.buyer_class || '-'})`,
    o.order_type,
    String(o.item_count || (Array.isArray(o.items) ? o.items.length : 1)),
    formatRupiah(o.total_amount),
    o.payment_status || 'BELUM BAYAR',
    o.production_status || 'Belum Diproduksi'
  ]);

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['No', 'No. Order', 'Nama Pemesan', 'NIM & Kelas', 'Jenis', 'Qty', 'Total (Rp)', 'Status Bayar', 'Produksi']],
    body: orderRows.length > 0 ? orderRows : [['-', '-', 'Tidak ada data pesanan', '-', '-', '-', '-', '-', '-']],
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 7.5 },
    bodyStyles: { fontSize: 7 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { fontStyle: 'bold' },
      4: { halign: 'center' },
      5: { halign: 'center', fontStyle: 'bold' },
      6: { halign: 'right' },
      7: { halign: 'center' },
      8: { halign: 'center' }
    },
    margin: { left: 14, right: 14 }
  });

  // Signatures on Last Page
  const finalY = (doc as any).lastAutoTable.finalY + 12;
  const pageHeight = doc.internal.pageSize.getHeight();
  let sigY = finalY;

  if (sigY + 35 > pageHeight) {
    doc.addPage();
    sigY = 25;
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  const sigCol1 = 35;
  const sigCol2 = pageWidth - 45;

  doc.text('Mengetahui,', sigCol1, sigY, { align: 'center' });
  doc.text('Ketua Panitia Pengadaan PDH', sigCol1, sigY + 4, { align: 'center' });

  doc.text('Dibuat Oleh,', sigCol2, sigY, { align: 'center' });
  doc.text('Divisi Logistik & Keuangan', sigCol2, sigY + 4, { align: 'center' });

  doc.line(sigCol1 - 22, sigY + 22, sigCol1 + 22, sigY + 22);
  doc.text('( ........................................ )', sigCol1, sigY + 26, { align: 'center' });

  doc.line(sigCol2 - 22, sigY + 22, sigCol2 + 22, sigY + 22);
  doc.setFont('helvetica', 'bold');
  doc.text(options.user.name || 'Panitia PDH', sigCol2, sigY + 26, { align: 'center' });

  // Add Page Numbers
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Dokumen Resmi Sistem PDH Kampus — Halaman ${i} dari ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  const dateSlug = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  doc.save(`Laporan_Rekapitulasi_PDH_${dateSlug}.pdf`);
};

export const generateKonveksiReportPDF = (options: PDFReportOptions) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });

  // Konveksi Header
  doc.setFillColor(15, 23, 42); // Slate-900
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('SURAT PERINTAH & DAFTAR PRODUKSI KONVEKSI PDH', 14, 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Dokumen Kerja Resmi Spesifikasi Potong, Jahit & Bordir Nama Vendor', 14, 17);

  // Metadata Box
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  let currentY = 30;

  doc.text(`Tanggal Perintah Kerja: ${nowStr}`, 14, currentY);
  doc.text(`PIC Panitia: ${options.user.name}`, pageWidth - 14, currentY, { align: 'right' });

  currentY += 4;
  doc.setFont('helvetica', 'normal');
  const filterList: string[] = [];
  if (options.filters.startDate || options.filters.endDate) {
    filterList.push(`Periode: ${options.filters.startDate || 'Awal'} s/d ${options.filters.endDate || 'Sekarang'}`);
  }
  if (options.filters.className && options.filters.className !== 'ALL') filterList.push(`Kelas: ${options.filters.className}`);
  if (options.filters.sizeCode && options.filters.sizeCode !== 'ALL') filterList.push(`Ukuran: ${options.filters.sizeCode}`);
  if (options.filters.prodStatus && options.filters.prodStatus !== 'ALL') filterList.push(`Status Prod: ${options.filters.prodStatus}`);

  const filterText = filterList.length > 0 ? `Target Filter: ${filterList.join(' | ')}` : 'Target: Semua Antrean Produksi';
  doc.text(filterText, 14, currentY);

  currentY += 4;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, currentY, pageWidth - 14, currentY);
  currentY += 4;

  // A. REKAP PRODUKSI EXECUTIVE SUMMARY
  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['Total Target PDH', 'Total Mahasiswa / Pemesan', 'Total Pesanan / Order ID', 'Pribadi', 'Kolektif', 'Progres Selesai']],
    body: [[
      `${options.metrics.totalPcs} Pcs`,
      `${options.metrics.totalStudents} Orang`,
      `${options.metrics.totalOrders} Order`,
      `${options.metrics.personalCount} Order`,
      `${options.metrics.collectiveCount} Order`,
      `${options.metrics.prodSelesaiCount} Order`
    ]],
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'center' },
    bodyStyles: { fontSize: 8, fontStyle: 'bold', halign: 'center', textColor: [15, 23, 42] },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // C. REKAP UKURAN UNTUK POLA POTONG & JAHIT
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('A. Rekapitulasi Kebutuhan Ukuran (Pola Potong & Jahit)', 14, currentY);
  currentY += 2;

  const sizeRows = options.sizeBreakdown.map((s) => {
    const pct = options.metrics.totalPcs > 0 ? Math.round((s.count / options.metrics.totalPcs) * 100) : 0;
    return [
      `Ukuran ${s.sizeCode}`,
      `${s.count} Pcs`,
      `${pct}%`,
      'American Drill Navy Blue / Lengan Panjang'
    ];
  });

  autoTable(doc, {
    startY: currentY,
    theme: 'striped',
    head: [['Ukuran PDH', 'Jumlah Produksi (Pcs)', 'Porsi Target', 'Spesifikasi Kain & Model']],
    body: sizeRows.length > 0 ? sizeRows : [['-', '0 Pcs', '0%', '-']],
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center', fontStyle: 'bold' },
      2: { halign: 'center' },
      3: { fontStyle: 'normal' }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // D. REKAP PER KELAS
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('B. Rekapitulasi Jumlah & Ukuran Berdasarkan Kelas', 14, currentY);
  currentY += 2;

  const classRows = options.classBreakdown.map((c) => [
    c.className,
    `${c.studentCount} Orang`,
    `${c.totalPcs} Pcs`,
    c.sizeBreakdownText || '-'
  ]);

  autoTable(doc, {
    startY: currentY,
    theme: 'striped',
    head: [['Kode Kelas', 'Jumlah Mahasiswa', 'Total PDH (Pcs)', 'Rincian Ukuran']],
    body: classRows.length > 0 ? classRows : [['-', '0', '0 Pcs', '-']],
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'center', fontStyle: 'bold' },
      3: { fontStyle: 'normal' }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // E. REKAP PER ORDER ID (PACKING CHECKLIST)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('C. Rekapitulasi per Order ID (Packing & Distribusi List)', 14, currentY);
  currentY += 2;

  const orderSummaryRows = options.filteredOrders.map((o, idx) => [
    String(idx + 1),
    o.order_number,
    o.order_type,
    o.buyer_name,
    o.buyer_class || '-',
    `${o.item_count || (Array.isArray(o.items) ? o.items.length : 1)} Pcs`,
    o.production_status || 'Belum Diproduksi'
  ]);

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['No', 'Order ID', 'Jenis', 'Koordinator / Pemesan', 'Kelas', 'Jumlah Item', 'Status Produksi']],
    body: orderSummaryRows.length > 0 ? orderSummaryRows : [['-', '-', '-', 'Tidak ada data pesanan', '-', '0 Pcs', '-']],
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 7.5 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { fontStyle: 'bold' },
      2: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center', fontStyle: 'bold' },
      6: { halign: 'center' }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // B. DAFTAR PRODUKSI TERPERINCI (CUTTING & CUSTOM EMBROIDERY SHEET)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`D. Lembar Kerja Bordir & Jahit Setiap Anggota (${options.filteredItems.length} Baju)`, 14, currentY);
  currentY += 2;

  const itemRows = options.filteredItems.map((it, idx) => [
    String(idx + 1),
    it.order_number,
    it.class_name || '-',
    it.student_name,
    it.nim || '-',
    it.size_code,
    it.custom_name && it.custom_name !== '-' ? it.custom_name : it.student_name,
    String(it.quantity || 1),
    it.production_status || 'Belum Diproses'
  ]);

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['No', 'Order ID', 'Kelas', 'Nama Mahasiswa', 'NIM', 'Ukuran', 'Bordir Nama Kustom', 'Qty', 'Status']],
    body: itemRows.length > 0 ? itemRows : [['-', '-', '-', 'Belum ada data anggota produksi', '-', '-', '-', '0', '-']],
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 7.5 },
    bodyStyles: { fontSize: 7 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { fontStyle: 'bold' },
      2: { halign: 'center' },
      5: { halign: 'center', fontStyle: 'bold' },
      6: { fontStyle: 'bold', textColor: [15, 23, 42] },
      7: { halign: 'center', fontStyle: 'bold' },
      8: { halign: 'center' }
    },
    margin: { left: 14, right: 14 }
  });

  // Handover Signatures on Last Page
  const finalY = (doc as any).lastAutoTable.finalY + 12;
  let sigY = finalY;

  if (sigY + 35 > pageHeight) {
    doc.addPage();
    sigY = 25;
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  const sigCol1 = 40;
  const sigCol2 = pageWidth - 45;

  doc.text('Diserahkan Oleh,', sigCol1, sigY, { align: 'center' });
  doc.text('Divisi Logistik & Produksi Panitia', sigCol1, sigY + 4, { align: 'center' });

  doc.text('Diterima Oleh,', sigCol2, sigY, { align: 'center' });
  doc.text('Pihak Vendor / Konveksi', sigCol2, sigY + 4, { align: 'center' });

  doc.line(sigCol1 - 24, sigY + 22, sigCol1 + 24, sigY + 22);
  doc.setFont('helvetica', 'bold');
  doc.text(options.user.name || 'Panitia PDH', sigCol1, sigY + 26, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.line(sigCol2 - 24, sigY + 22, sigCol2 + 24, sigY + 22);
  doc.text('( Tanda Tangan & Nama Terang Vendor )', sigCol2, sigY + 26, { align: 'center' });

  // Add Page Numbers
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Lembar Kerja Konveksi PDH Kampus — Halaman ${i} dari ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  const dateSlug = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  doc.save(`Laporan_Produksi_Konveksi_PDH_${dateSlug}.pdf`);
};
