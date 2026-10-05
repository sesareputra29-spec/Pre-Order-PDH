// Report & Analytics Service Layer (Multi-tenant, Real Data, Server-Side PDF - Google Sheets Persistent)
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AuditService } from './auditService.ts';
import { OrderService, OrderRecord, OrderMemberRecord } from './orderService.ts';
import { PaymentService, PaymentRecord } from './paymentService.ts';
import { ProductionService } from './productionService.ts';
import { PeriodService, PeriodRecord } from './periodService.ts';
import { PDHService, PDHProductRecord } from './pdhService.ts';
import { StudentService, StudentRecord } from './studentService.ts';

export interface ReportFilterOptions {
  periode_id?: string;
  kelas?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  produk_id?: string;
  page?: number;
  limit?: number;
}

export interface SizeRecapEntry {
  size: string;
  count: number;
  subtotal: number;
}

export interface ConvectionItemRecord {
  no: number;
  order_id: string;
  order_number: string;
  kelas: string;
  coordinator_name: string;
  coordinator_phone: string;
  nama_mahasiswa: string;
  nim: string;
  ukuran: string;
  custom_name: string;
  product_name: string;
  qty: number;
  production_status: string;
  production_notes: string;
}

export class ReportService {
  /**
   * Helper to format numbers into Indonesian Rupiah string
   */
  static formatRupiah(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  }

  // ==========================================
  // 1. ORDER SUMMARY REPORT (Ringkasan Pesanan)
  // ==========================================
  static async getOrderSummaryReport(tenantId: string, filters: ReportFilterOptions = {}): Promise<any> {
    const ordersResult = await OrderService.listOrders(tenantId, {
      periode_id: filters.periode_id,
      class_name: filters.kelas,
      status: filters.status,
      search: filters.search,
      page: filters.page || 1,
      limit: filters.limit || 50
    });

    // Compute executive metrics across all orders for this tenant
    const allTenantOrdersResult = await OrderService.listOrders(tenantId, {
      periode_id: filters.periode_id,
      class_name: filters.kelas,
      search: filters.search,
      limit: 1000
    });
    const allTenantOrders = allTenantOrdersResult.orders;

    let totalOrders = allTenantOrders.length;
    let totalPcs = 0;
    let totalNominal = 0;
    let personalCount = 0;
    let collectiveCount = 0;
    let personalNominal = 0;
    let collectiveNominal = 0;
    let paidCount = 0;
    let paidNominal = 0;
    let pendingApprovalCount = 0;
    let pendingApprovalNominal = 0;
    let unpaidCount = 0;
    let unpaidNominal = 0;

    for (const ord of allTenantOrders) {
      totalPcs += ord.total_qty || 0;
      totalNominal += ord.total_amount || 0;

      if (ord.order_type === 'KOLEKTIF') {
        collectiveCount++;
        collectiveNominal += ord.total_amount || 0;
      } else {
        personalCount++;
        personalNominal += ord.total_amount || 0;
      }

      if (ord.payment_status === 'LUNAS') {
        paidCount++;
        paidNominal += ord.total_amount || 0;
      } else if (ord.payment_status === 'MENUNGGU_VERIFIKASI') {
        pendingApprovalCount++;
        pendingApprovalNominal += ord.total_amount || 0;
      } else {
        unpaidCount++;
        unpaidNominal += ord.total_amount || 0;
      }
    }

    return {
      metrics: {
        totalOrders,
        totalPcs,
        totalNominal,
        personalCount,
        collectiveCount,
        personalNominal,
        collectiveNominal,
        paidCount,
        paidNominal,
        pendingApprovalCount,
        pendingApprovalNominal,
        unpaidCount,
        unpaidNominal,
        unpaidNominalTotal: Math.max(0, totalNominal - paidNominal), // Ensure this falls back correctly
        collectionRate: totalNominal > 0 ? Math.round((paidNominal / totalNominal) * 100) : 0
      },
      orders: ordersResult.orders,
      pagination: ordersResult.pagination
    };
  }

  // ==========================================
  // 2. CLASS REPORT (Laporan Per Kelas)
  // ==========================================
  static async getClassReport(tenantId: string, filters: ReportFilterOptions = {}): Promise<any> {
    const allTenantOrdersResult = await OrderService.listOrders(tenantId, {
      periode_id: filters.periode_id,
      class_name: filters.kelas,
      limit: 1000
    });
    const allTenantOrders = allTenantOrdersResult.orders;

    const students: StudentRecord[] = await StudentService.listStudents(tenantId);

    // Grouping map
    const classMap: Map<string, {
      className: string;
      studentCount: number;
      orderCount: number;
      totalPcs: number;
      totalNominal: number;
      paidNominal: number;
      sizeCounts: Map<string, number>;
      unpaidCount: number;
      paidCount: number;
    }> = new Map();

    // Initialize registered students count per class
    for (const st of students) {
      const cls = st.kelas?.trim() || 'Tanpa Kelas';
      if (filters.kelas && filters.kelas !== 'ALL' && cls !== filters.kelas) continue;

      if (!classMap.has(cls)) {
        classMap.set(cls, {
          className: cls,
          studentCount: 0,
          orderCount: 0,
          totalPcs: 0,
          totalNominal: 0,
          paidNominal: 0,
          sizeCounts: new Map(),
          unpaidCount: 0,
          paidCount: 0
        });
      }
      classMap.get(cls)!.studentCount++;
    }

    // Tally orders into classes
    for (const ord of allTenantOrders) {
      const cls = ord.coordinator_class?.trim() || 'Tanpa Kelas';
      if (filters.kelas && filters.kelas !== 'ALL' && cls !== filters.kelas) continue;

      if (!classMap.has(cls)) {
        classMap.set(cls, {
          className: cls,
          studentCount: 0,
          orderCount: 0,
          totalPcs: 0,
          totalNominal: 0,
          paidNominal: 0,
          sizeCounts: new Map(),
          unpaidCount: 0,
          paidCount: 0
        });
      }

      const entry = classMap.get(cls)!;
      entry.orderCount++;
      entry.totalPcs += ord.total_qty || 0;
      entry.totalNominal += ord.total_amount || 0;

      if (ord.payment_status === 'LUNAS') {
        entry.paidNominal += ord.total_amount || 0;
        entry.paidCount++;
      } else {
        entry.unpaidCount++;
      }

      // Tally size counts from order members
      const members = await OrderService.listMembers(tenantId, ord.order_id);
      for (const m of members) {
        const sz = m.ukuran || 'M';
        entry.sizeCounts.set(sz, (entry.sizeCounts.get(sz) || 0) + 1);
      }
    }

    const classList = Array.from(classMap.values()).map((c) => {
      const sizeBreakdownText = Array.from(c.sizeCounts.entries())
        .map(([sz, cnt]) => `${sz}: ${cnt}`)
        .join(', ') || '-';

      return {
        className: c.className,
        studentCount: c.studentCount,
        orderCount: c.orderCount,
        totalPcs: c.totalPcs,
        totalNominal: c.totalNominal,
        paidNominal: c.paidNominal,
        unpaidNominal: Math.max(0, c.totalNominal - c.paidNominal),
        paidCount: c.paidCount,
        unpaidCount: c.unpaidCount,
        sizeBreakdownText
      };
    });

    classList.sort((a, b) => a.className.localeCompare(b.className));

    return {
      classes: classList,
      totalClasses: classList.length
    };
  }

  // ==========================================
  // 3. STUDENT REPORT (Laporan Mahasiswa)
  // ==========================================
  static async getStudentReport(tenantId: string, filters: ReportFilterOptions = {}): Promise<any> {
    const students: StudentRecord[] = await StudentService.listStudents(tenantId);
    const allOrdersResult = await OrderService.listOrders(tenantId, { limit: 1000 });
    const allOrders = allOrdersResult.orders;

    let list = students.map((st: StudentRecord) => {
      // Find orders where student is either coordinator or has this NIM
      const matchingOrder = allOrders.find(
        (o) => o.coordinator_nim === st.nim
      );

      return {
        nim: st.nim,
        nama_lengkap: st.nama_lengkap,
        kelas: st.kelas,
        no_wa: st.no_wa,
        has_order: !!matchingOrder,
        order_id: matchingOrder?.order_id || '-',
        order_number: matchingOrder?.order_number || '-',
        order_type: matchingOrder?.order_type || '-',
        total_qty: matchingOrder?.total_qty || 0,
        total_amount: matchingOrder?.total_amount || 0,
        payment_status: matchingOrder?.payment_status || 'BELUM_PESAN',
        status_order: matchingOrder?.status_order || 'BELUM_PESAN',
        production_status: matchingOrder?.production_status || '-'
      };
    });

    if (filters.kelas && filters.kelas !== 'ALL') {
      list = list.filter((s) => s.kelas === filters.kelas);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((s) => s.nama_lengkap.toLowerCase().includes(q) || s.nim.toLowerCase().includes(q));
    }

    if (filters.status && filters.status !== 'ALL') {
      list = list.filter((s) => s.payment_status === filters.status || s.status_order === filters.status);
    }

    const total = list.length;
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, filters.limit || 50);
    const paginated = list.slice((page - 1) * limit, page * limit);

    return {
      students: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  // ==========================================
  // 4. PAYMENT REPORT (Laporan Pembayaran)
  // ==========================================
  static async getPaymentReport(tenantId: string, filters: ReportFilterOptions = {}): Promise<any> {
    const paymentsResult = await PaymentService.listPayments(tenantId, {
      status: filters.status,
      start_date: filters.date_from,
      end_date: filters.date_to,
      search: filters.search,
      page: filters.page || 1,
      limit: filters.limit || 50
    });

    const allPaymentsResult = await PaymentService.listPayments(tenantId, { limit: 1000 });
    const allPayments = allPaymentsResult.payments;

    let totalApproved = 0;
    let totalPending = 0;
    let totalRejected = 0;
    const methodsMap: Map<string, number> = new Map();

    for (const p of allPayments) {
      if (p.status === 'DISETUJUI') {
        totalApproved += p.jumlah;
      } else if (p.status === 'MENUNGGU_VERIFIKASI') {
        totalPending += p.jumlah;
      } else if (p.status === 'DITOLAK') {
        totalRejected += p.jumlah;
      }

      methodsMap.set(p.metode, (methodsMap.get(p.metode) || 0) + p.jumlah);
    }

    const methodBreakdown = Array.from(methodsMap.entries()).map(([metode, total]) => ({
      metode,
      total,
      totalFormatted: this.formatRupiah(total)
    }));

    return {
      summary: {
        totalApproved,
        totalPending,
        totalRejected,
        totalApprovedFormatted: this.formatRupiah(totalApproved),
        totalPendingFormatted: this.formatRupiah(totalPending),
        totalRejectedFormatted: this.formatRupiah(totalRejected),
        methodBreakdown
      },
      payments: paymentsResult.payments,
      pagination: paymentsResult.pagination
    };
  }

  // ==========================================
  // 5. PRODUCTION REPORT (Laporan Produksi)
  // ==========================================
  static async getProductionReport(tenantId: string, filters: ReportFilterOptions = {}): Promise<any> {
    const result = await ProductionService.listProductionOrders(tenantId, {
      periode_id: filters.periode_id,
      class_name: filters.kelas,
      production_status: filters.status as any,
      search: filters.search,
      page: filters.page || 1,
      limit: filters.limit || 50
    });

    const allOrdersResult = await ProductionService.listProductionOrders(tenantId, { limit: 1000 });
    const allOrders = allOrdersResult.orders;
    let belum_diproduksi = 0;
    let sedang_diproduksi = 0;
    let selesai = 0;

    for (const ord of allOrders) {
      if (ord.production_status === 'Selesai' || ord.production_status === 'Siap Diambil') {
        selesai++;
      } else if (ord.production_status === 'Sedang Diproduksi') {
        sedang_diproduksi++;
      } else {
        belum_diproduksi++;
      }
    }

    return {
      counts: {
        belum_diproduksi,
        sedang_diproduksi,
        selesai
      },
      orders: result.orders,
      pagination: result.pagination
    };
  }

  // ==========================================
  // 6. PERIOD REPORT (Laporan Periode)
  // ==========================================
  static async getPeriodReport(tenantId: string): Promise<any> {
    const periods: PeriodRecord[] = await PeriodService.listPeriods(tenantId);
    const allOrdersResult = await OrderService.listOrders(tenantId, { limit: 1000 });
    const allOrders = allOrdersResult.orders;

    const periodStats = periods.map((p: PeriodRecord) => {
      const periodOrders = allOrders.filter((o) => o.periode_id === p.periode_id);
      const totalPcs = periodOrders.reduce((sum, o) => sum + (o.total_qty || 0), 0);
      const totalNominal = periodOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const paidNominal = periodOrders
        .filter((o) => o.payment_status === 'LUNAS')
        .reduce((sum, o) => sum + (o.total_amount || 0), 0);

      return {
        periode_id: p.periode_id,
        nama_periode: p.nama_periode,
        tahun: p.tahun,
        angkatan: p.angkatan,
        status: p.status,
        tanggal_mulai: p.tanggal_mulai,
        tanggal_selesai: p.tanggal_selesai,
        totalOrders: periodOrders.length,
        totalPcs,
        totalNominal,
        paidNominal,
        collectionRate: totalNominal > 0 ? Math.round((paidNominal / totalNominal) * 100) : 0
      };
    });

    return {
      periods: periodStats
    };
  }

  // ==========================================
  // 7. CONVECTION REPORT (Laporan Konveksi)
  // ==========================================
  static async getConvectionReport(tenantId: string, filters: ReportFilterOptions = {}): Promise<any> {
    const allOrdersResult = await OrderService.listOrders(tenantId, {
      periode_id: filters.periode_id,
      class_name: filters.kelas,
      status: filters.status,
      search: filters.search,
      limit: 1000
    });
    const allOrders = allOrdersResult.orders;

    const products = await PDHService.listProducts(tenantId);
    const productName = products.length > 0 ? products[0].nama_produk : 'Kemeja PDH Mahasiswa';

    const sizeRecapMap: Map<string, number> = new Map([
      ['S', 0],
      ['M', 0],
      ['L', 0],
      ['XL', 0],
      ['XXL', 0],
      ['3XL', 0]
    ]);

    const convectionItems: ConvectionItemRecord[] = [];
    let itemNumber = 1;
    let totalPcs = 0;

    for (const ord of allOrders) {
      const members = await OrderService.listMembers(tenantId, ord.order_id);

      if (members.length === 0) {
        // Fallback for orders without separate member breakdown
        const sz = 'M';
        const qty = ord.total_qty || 1;
        totalPcs += qty;
        sizeRecapMap.set(sz, (sizeRecapMap.get(sz) || 0) + qty);

        convectionItems.push({
          no: itemNumber++,
          order_id: ord.order_id,
          order_number: ord.order_number,
          kelas: ord.coordinator_class,
          coordinator_name: ord.coordinator_name,
          coordinator_phone: ord.coordinator_phone || '-',
          nama_mahasiswa: ord.coordinator_name,
          nim: ord.coordinator_nim,
          ukuran: sz,
          custom_name: ord.coordinator_name,
          product_name: productName,
          qty,
          production_status: ord.production_status || 'Belum Diproses',
          production_notes: ord.notes || '-'
        });
      } else {
        for (const m of members) {
          const sz = (m.ukuran || 'M').toUpperCase();
          sizeRecapMap.set(sz, (sizeRecapMap.get(sz) || 0) + 1);
          totalPcs += 1;

          convectionItems.push({
            no: itemNumber++,
            order_id: ord.order_id,
            order_number: ord.order_number,
            kelas: m.kelas || ord.coordinator_class,
            coordinator_name: ord.coordinator_name,
            coordinator_phone: ord.coordinator_phone || '-',
            nama_mahasiswa: m.nama_lengkap,
            nim: m.nim,
            ukuran: sz,
            custom_name: m.custom_name && m.custom_name !== '-' ? m.custom_name : m.nama_lengkap,
            product_name: productName,
            qty: 1,
            production_status: ord.production_status || 'Belum Diproses',
            production_notes: ord.notes || '-'
          });
        }
      }
    }

    const sizeRecap: SizeRecapEntry[] = Array.from(sizeRecapMap.entries())
      .filter(([_, count]) => count > 0)
      .map(([size, count]) => ({
        size,
        count,
        subtotal: count
      }));

    return {
      product_name: productName,
      total_orders: allOrders.length,
      total_pcs: totalPcs,
      size_recap: sizeRecap,
      items: convectionItems
    };
  }

  // ==========================================
  // 8. SERVER-SIDE PDF GENERATION
  // ==========================================
  static async generateReportPDF(
    tenantId: string,
    reportType: 'general' | 'convection',
    filters: ReportFilterOptions = {},
    picName: string = 'Panitia PDH'
  ): Promise<Buffer> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });

    if (reportType === 'convection') {
      // --- CONVECTION PDF REPORT ---
      const convData = await this.getConvectionReport(tenantId, filters);

      // Header Banner
      doc.setFillColor(15, 23, 42); // Slate-900
      doc.rect(0, 0, pageWidth, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('LEMBAR KERJA SPK PRODUKSI & KONVEKSI PDH', 14, 11);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tenant ID: ${tenantId} | Dokumen Resmi Manufaktur & Penjahitan Seragam`, 14, 18);

      let currentY = 30;
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`Tanggal Cetak: ${nowStr}`, 14, currentY);
      doc.text(`PIC Panitia: ${picName}`, pageWidth - 14, currentY, { align: 'right' });

      currentY += 4;
      doc.setFont('helvetica', 'normal');
      const filterSummary = `Periode: ${filters.periode_id || 'Semua'} | Kelas: ${filters.kelas || 'Semua'} | Status: ${filters.status || 'Semua'}`;
      doc.text(`Kriteria Filter: ${filterSummary}`, 14, currentY);

      currentY += 4;
      doc.setDrawColor(203, 213, 225);
      doc.line(14, currentY, pageWidth - 14, currentY);
      currentY += 4;

      // Size Recap Table
      const sizeRows = convData.size_recap.map((s: any) => [s.size, `${s.count} Stel`]);
      sizeRows.push(['TOTAL KESELURUHAN', `${convData.total_pcs} Stel`]);

      autoTable(doc, {
        startY: currentY,
        theme: 'grid',
        tableWidth: 'wrap',
        head: [['Rekapitulasi Ukuran Baju', 'Jumlah']],
        body: sizeRows,
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 50 },
          1: { halign: 'center', cellWidth: 35 }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;

      // Convection Items Table
      const itemRows = convData.items.map((it: any) => [
        String(it.no),
        it.order_number || it.order_id,
        it.kelas,
        it.nama_mahasiswa,
        it.nim,
        it.ukuran,
        it.custom_name,
        String(it.qty),
        it.production_status
      ]);

      autoTable(doc, {
        startY: currentY,
        theme: 'grid',
        tableWidth: 'auto',
        head: [['No', 'Order', 'Kelas', 'Nama Mahasiswa', 'NIM', 'Ukuran', 'Bordir Nama', 'Qty', 'Status']],
        body: itemRows.length > 0 ? itemRows : [['-', '-', '-', 'Tidak ada data pesanan konveksi', '-', '-', '-', '0', '-']],
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 7.5 },
        bodyStyles: { fontSize: 7 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 8 },
          1: { fontStyle: 'bold' },
          2: { halign: 'center' },
          5: { halign: 'center', fontStyle: 'bold' },
          6: { fontStyle: 'bold' },
          7: { halign: 'center', fontStyle: 'bold' },
          8: { halign: 'center' }
        },
        margin: { left: 14, right: 14 }
      });

      // Signature Block on Last Page
      let sigY = (doc as any).lastAutoTable.finalY + 12;
      if (sigY + 35 > pageHeight) {
        doc.addPage();
        sigY = 25;
      }

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text('Diserahkan Oleh (Panitia):', 40, sigY, { align: 'center' });
      doc.text('Diterima Oleh (Vendor Konveksi):', pageWidth - 45, sigY, { align: 'center' });
      doc.line(16, sigY + 20, 64, sigY + 20);
      doc.line(pageWidth - 69, sigY + 20, pageWidth - 21, sigY + 20);
      doc.setFont('helvetica', 'bold');
      doc.text(picName, 40, sigY + 24, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text('( Tanda Tangan & Cap Vendor )', pageWidth - 45, sigY + 24, { align: 'center' });
    } else {
      // --- GENERAL EXECUTIVE REPORT ---
      const summaryData = await this.getOrderSummaryReport(tenantId, filters);

      doc.setFillColor(30, 41, 59); // Slate-800
      doc.rect(0, 0, pageWidth, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('LAPORAN REKAPITULASI PEMESANAN & KEUANGAN PDH', 14, 11);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tenant ID: ${tenantId} | Sistem Terintegrasi Pemesanan PDH`, 14, 18);

      let currentY = 30;
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`Tanggal Cetak: ${nowStr}`, 14, currentY);
      doc.text(`Dicetak Oleh: ${picName}`, pageWidth - 14, currentY, { align: 'right' });

      currentY += 4;
      doc.setFont('helvetica', 'normal');
      doc.text(`Filter: ${filters.periode_id || 'Semua Periode'} | Kelas: ${filters.kelas || 'Semua Kelas'}`, 14, currentY);

      currentY += 4;
      doc.setDrawColor(203, 213, 225);
      doc.line(14, currentY, pageWidth - 14, currentY);
      currentY += 4;

      // Executive Metrics Summary
      autoTable(doc, {
        startY: currentY,
        theme: 'grid',
        head: [['Total Pesanan', 'Total Baju (Pcs)', 'Total Tagihan', 'Sudah Dibayar', 'Sisa Belum Bayar', 'Collection Rate']],
        body: [[
          `${summaryData.metrics.totalOrders} Order`,
          `${summaryData.metrics.totalPcs} Stel`,
          this.formatRupiah(summaryData.metrics.totalNominal),
          this.formatRupiah(summaryData.metrics.paidNominal),
          this.formatRupiah(summaryData.metrics.unpaidNominalTotal),
          `${summaryData.metrics.collectionRate}%`
        ]],
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5, halign: 'center' },
        bodyStyles: { fontSize: 7.5, fontStyle: 'bold', halign: 'center' },
        margin: { left: 14, right: 14 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;

      // Order Table
      const orderRows = summaryData.orders.map((o: any, idx: number) => [
        String(idx + 1),
        o.order_number || o.order_id,
        o.coordinator_class,
        o.coordinator_name,
        `${o.total_qty} Stel`,
        this.formatRupiah(o.total_amount),
        o.payment_status,
        o.production_status || 'Belum Diproses'
      ]);

      autoTable(doc, {
        startY: currentY,
        theme: 'grid',
        head: [['No', 'Nomor Order', 'Kelas', 'Koordinator', 'Jumlah', 'Total Harga', 'Pembayaran', 'Produksi']],
        body: orderRows.length > 0 ? orderRows : [['-', '-', '-', 'Tidak ada data pesanan', '-', '-', '-', '-']],
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 7.5 },
        bodyStyles: { fontSize: 7 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 8 },
          1: { fontStyle: 'bold' },
          2: { halign: 'center' },
          4: { halign: 'center', fontStyle: 'bold' },
          5: { halign: 'right' },
          6: { halign: 'center' },
          7: { halign: 'center' }
        },
        margin: { left: 14, right: 14 }
      });
    }

    // Add Page Numbers to all pages
    const totalPages = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Dokumen Laporan PDH — Halaman ${i} dari ${totalPages}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
    }

    // Log PDF export in Audit
    await AuditService.logEvent(
      tenantId,
      picName,
      'EXPORT_DATA',
      `Laporan PDF (${reportType})`,
      `Mencetak/Mengunduh laporan PDF tipe '${reportType}' (${totalPages} halaman)`
    );

    const arrayBuffer = doc.output('arraybuffer');
    return Buffer.from(arrayBuffer);
  }
}
