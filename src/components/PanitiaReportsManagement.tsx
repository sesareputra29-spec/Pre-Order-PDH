import React, { useState, useEffect, useMemo } from 'react';
import { User, OrderRecord, PDHMasterData } from '../types';
import { callGAS } from '../gas/gasBridge';
import {
  generateGeneralReportPDF,
  generateKonveksiReportPDF
} from '../utils/pdfGenerator';
import {
  FileText,
  Printer,
  Download,
  Filter,
  RotateCcw,
  Calendar,
  Layers,
  CreditCard,
  Factory,
  Shirt,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Search,
  RefreshCw,
  Loader2,
  Building,
  CheckCheck,
  Scissors,
  Check
} from 'lucide-react';

interface PanitiaReportsManagementProps {
  user: User;
}

type ReportCategory =
  | 'ringkasan'
  | 'pesanan'
  | 'pembayaran'
  | 'produksi'
  | 'ukuran'
  | 'kelas'
  | 'konveksi';

export const PanitiaReportsManagement: React.FC<PanitiaReportsManagementProps> = ({ user }) => {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [masterData, setMasterData] = useState<PDHMasterData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Active Category View
  const [activeCategory, setActiveCategory] = useState<ReportCategory>('ringkasan');

  // Multi-parameter Filter States
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('ALL');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [prodStatusFilter, setProdStatusFilter] = useState<string>('ALL');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [sizeFilter, setSizeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchReportData();
  }, [refreshKey]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [orderRes, masterRes] = await Promise.all([
        callGAS<OrderRecord[]>('getAllOrdersPanitia', user.userId),
        callGAS<PDHMasterData>('getPDHMasterData')
      ]);

      if (orderRes.success && orderRes.data) {
        setOrders(orderRes.data);
      }
      if (masterRes.success && masterRes.data) {
        setMasterData(masterRes.data);
      }
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setOrderTypeFilter('ALL');
    setPaymentStatusFilter('ALL');
    setOrderStatusFilter('ALL');
    setProdStatusFilter('ALL');
    setClassFilter('ALL');
    setSizeFilter('ALL');
    setSearchQuery('');
  };

  // Extract Unique Classes and Sizes from database
  const uniqueClasses = useMemo(() => {
    const classSet = new Set<string>();
    orders.forEach((o) => {
      if (o.buyer_class) classSet.add(o.buyer_class.trim().toUpperCase());
      if (Array.isArray(o.items)) {
        o.items.forEach((it) => {
          if (it.class_name) classSet.add(it.class_name.trim().toUpperCase());
        });
      }
    });
    return Array.from(classSet).sort();
  }, [orders]);

  const uniqueSizes = useMemo(() => {
    const sizeSet = new Set<string>();
    if (masterData && masterData.sizes) {
      masterData.sizes.forEach((s) => sizeSet.add(s.size_code));
    }
    orders.forEach((o) => {
      if (Array.isArray(o.items)) {
        o.items.forEach((it) => {
          if (it.size_code) sizeSet.add(it.size_code);
        });
      }
    });
    return Array.from(sizeSet).sort();
  }, [orders, masterData]);

  // Filtered Orders Calculation
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. Date Range
      if (startDate) {
        const orderDate = (o.created_at || '').split('T')[0];
        if (orderDate && orderDate < startDate) return false;
      }
      if (endDate) {
        const orderDate = (o.created_at || '').split('T')[0];
        if (orderDate && orderDate > endDate) return false;
      }

      // 2. Order Type
      if (orderTypeFilter !== 'ALL' && o.order_type !== orderTypeFilter) {
        return false;
      }

      // 3. Payment Status
      if (paymentStatusFilter !== 'ALL') {
        const ps = (o.payment_status || '').toUpperCase();
        if (paymentStatusFilter === 'LUNAS' && ps !== 'LUNAS' && ps !== 'PAID' && ps !== 'APPROVED') return false;
        if (paymentStatusFilter === 'MENUNGGU APPROVAL' && ps !== 'MENUNGGU APPROVAL' && ps !== 'PENDING') return false;
        if (paymentStatusFilter === 'BELUM BAYAR' && ps !== 'BELUM_BAYAR' && ps !== 'UNPAID' && ps !== 'BELUM BAYAR') return false;
        if (paymentStatusFilter === 'DITOLAK' && ps !== 'DITOLAK' && ps !== 'REJECTED') return false;
      }

      // 4. Order Status
      if (orderStatusFilter !== 'ALL' && o.status !== orderStatusFilter) {
        return false;
      }

      // 5. Production Status
      if (prodStatusFilter !== 'ALL') {
        const currentProd = o.production_status || 'Belum Diproduksi';
        if (prodStatusFilter === 'Belum Diproduksi' && currentProd !== 'Belum Diproduksi') return false;
        if (prodStatusFilter === 'Sedang Diproduksi' && currentProd !== 'Sedang Diproduksi') return false;
        if (prodStatusFilter === 'Selesai' && currentProd !== 'Selesai' && currentProd !== 'Siap Diambil') return false;
        if (prodStatusFilter === 'Siap Diambil' && o.pickup_status !== 'Siap Diambil') return false;
      }

      // 6. Class Filter
      if (classFilter !== 'ALL') {
        const matchBuyerClass = (o.buyer_class || '').toUpperCase() === classFilter;
        const matchItemClass = Array.isArray(o.items) && o.items.some((it) => (it.class_name || '').toUpperCase() === classFilter);
        if (!matchBuyerClass && !matchItemClass) return false;
      }

      // 7. Size Filter
      if (sizeFilter !== 'ALL') {
        const matchItemSize = Array.isArray(o.items) && o.items.some((it) => it.size_code === sizeFilter);
        if (!matchItemSize) return false;
      }

      // 8. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNo = (o.order_number || '').toLowerCase().includes(q);
        const matchName = (o.buyer_name || '').toLowerCase().includes(q);
        const matchNim = (o.buyer_nim || '').toLowerCase().includes(q);
        const matchClass = (o.buyer_class || '').toLowerCase().includes(q);
        const matchItem = Array.isArray(o.items) && o.items.some((it) =>
          (it.student_name || '').toLowerCase().includes(q) ||
          (it.nim || '').toLowerCase().includes(q) ||
          (it.custom_name || '').toLowerCase().includes(q)
        );
        if (!matchNo && !matchName && !matchNim && !matchClass && !matchItem) return false;
      }

      return true;
    });
  }, [
    orders,
    startDate,
    endDate,
    orderTypeFilter,
    paymentStatusFilter,
    orderStatusFilter,
    prodStatusFilter,
    classFilter,
    sizeFilter,
    searchQuery
  ]);

  // All Items extracted from filtered orders
  const filteredItems = useMemo(() => {
    const itemsList: Array<{
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
    }> = [];

    filteredOrders.forEach((o) => {
      if (Array.isArray(o.items) && o.items.length > 0) {
        o.items.forEach((it) => {
          if (sizeFilter !== 'ALL' && it.size_code !== sizeFilter) return;
          if (classFilter !== 'ALL' && (it.class_name || o.buyer_class || '').toUpperCase() !== classFilter) return;

          itemsList.push({
            order_id: o.order_id,
            order_number: o.order_number,
            order_type: o.order_type,
            buyer_name: o.buyer_name,
            buyer_nim: o.buyer_nim,
            buyer_class: o.buyer_class,
            student_name: it.student_name || it.custom_name || o.buyer_name,
            nim: it.nim || o.buyer_nim,
            class_name: it.class_name || o.buyer_class,
            size_code: it.size_code || 'M',
            custom_name: it.custom_name || '-',
            unit_price: it.unit_price || 0,
            quantity: it.quantity || 1,
            subtotal: it.subtotal || (it.unit_price || 0) * (it.quantity || 1),
            payment_status: o.payment_status || 'BELUM_BAYAR',
            production_status: o.production_status || 'Belum Diproduksi',
            pickup_status: o.pickup_status || 'Belum Siap Diambil',
            created_at: o.created_at
          });
        });
      } else {
        itemsList.push({
          order_id: o.order_id,
          order_number: o.order_number,
          order_type: o.order_type,
          buyer_name: o.buyer_name,
          buyer_nim: o.buyer_nim,
          buyer_class: o.buyer_class,
          student_name: o.buyer_name,
          nim: o.buyer_nim,
          class_name: o.buyer_class,
          size_code: 'M',
          custom_name: o.buyer_name,
          unit_price: o.total_amount || 0,
          quantity: o.item_count || 1,
          subtotal: o.total_amount || 0,
          payment_status: o.payment_status || 'BELUM_BAYAR',
          production_status: o.production_status || 'Belum Diproduksi',
          pickup_status: o.pickup_status || 'Belum Siap Diambil',
          created_at: o.created_at
        });
      }
    });

    return itemsList;
  }, [filteredOrders, sizeFilter, classFilter]);

  // Aggregate Key Performance Metrics
  const metrics = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalPcs = filteredItems.reduce((acc, it) => acc + (it.quantity || 1), 0);
    const totalNominal = filteredOrders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);

    const personalOrders = filteredOrders.filter((o) => o.order_type === 'PRIBADI');
    const collectiveOrders = filteredOrders.filter((o) => o.order_type === 'KOLEKTIF');

    const totalStudents = new Set(filteredItems.map((it) => (it.nim || it.student_name).trim().toLowerCase())).size;

    const paidOrders = filteredOrders.filter((o) => {
      const ps = (o.payment_status || '').toUpperCase();
      return ps === 'LUNAS' || ps === 'PAID' || ps === 'APPROVED';
    });
    const pendingApprovalOrders = filteredOrders.filter((o) => {
      const ps = (o.payment_status || '').toUpperCase();
      return ps === 'MENUNGGU APPROVAL' || ps === 'PENDING';
    });
    const unpaidOrders = filteredOrders.filter((o) => {
      const ps = (o.payment_status || '').toUpperCase();
      return ps === 'BELUM_BAYAR' || ps === 'UNPAID' || ps === 'BELUM BAYAR' || !ps;
    });
    const rejectedOrders = filteredOrders.filter((o) => {
      const ps = (o.payment_status || '').toUpperCase();
      return ps === 'DITOLAK' || ps === 'REJECTED';
    });

    const totalPaidNominal = paidOrders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);
    const totalPendingNominal = pendingApprovalOrders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);
    const totalUnpaidNominal = unpaidOrders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);

    const prodBelum = filteredOrders.filter((o) => !o.production_status || o.production_status === 'Belum Diproduksi');
    const prodSedang = filteredOrders.filter((o) => o.production_status === 'Sedang Diproduksi');
    const prodSelesai = filteredOrders.filter((o) => o.production_status === 'Selesai' || o.production_status === 'Siap Diambil');

    const avgProgress = totalOrders > 0
      ? Math.round(filteredOrders.reduce((acc, o) => acc + (Number(o.production_percentage) || 0), 0) / totalOrders)
      : 0;

    return {
      totalOrders,
      totalPcs,
      totalNominal,
      personalCount: personalOrders.length,
      collectiveCount: collectiveOrders.length,
      personalNominal: personalOrders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0),
      collectiveNominal: collectiveOrders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0),
      totalStudents,
      paidCount: paidOrders.length,
      paidNominal: totalPaidNominal,
      pendingApprovalCount: pendingApprovalOrders.length,
      pendingApprovalNominal: totalPendingNominal,
      unpaidCount: unpaidOrders.length,
      unpaidNominal: totalUnpaidNominal,
      rejectedCount: rejectedOrders.length,
      prodBelumCount: prodBelum.length,
      prodSedangCount: prodSedang.length,
      prodSelesaiCount: prodSelesai.length,
      avgProgress
    };
  }, [filteredOrders, filteredItems]);

  // Breakdown by Size
  const sizeBreakdown = useMemo(() => {
    const map = new Map<string, { sizeCode: string; count: number; totalNominal: number }>();

    if (masterData && masterData.sizes) {
      masterData.sizes.forEach((s) => {
        map.set(s.size_code, { sizeCode: s.size_code, count: 0, totalNominal: 0 });
      });
    }

    filteredItems.forEach((it) => {
      const sCode = it.size_code || 'M';
      if (!map.has(sCode)) {
        map.set(sCode, { sizeCode: sCode, count: 0, totalNominal: 0 });
      }
      const existing = map.get(sCode)!;
      existing.count += it.quantity || 1;
      existing.totalNominal += it.subtotal || 0;
    });

    return Array.from(map.values())
      .filter((s) => s.count > 0 || (sizeFilter !== 'ALL' && s.sizeCode === sizeFilter))
      .sort((a, b) => b.count - a.count);
  }, [filteredItems, masterData, sizeFilter]);

  // Accurate Breakdown by Class (Breaking down every individual member in collective orders)
  const classBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        className: string;
        students: Set<string>;
        orderIds: Set<string>;
        totalPcs: number;
        sizesMap: Map<string, number>;
        totalNominal: number;
        paidNominal: number;
      }
    >();

    filteredItems.forEach((it) => {
      const cName = (it.class_name || it.buyer_class || 'UMUM').trim().toUpperCase();
      if (!map.has(cName)) {
        map.set(cName, {
          className: cName,
          students: new Set<string>(),
          orderIds: new Set<string>(),
          totalPcs: 0,
          sizesMap: new Map<string, number>(),
          totalNominal: 0,
          paidNominal: 0
        });
      }

      const rec = map.get(cName)!;
      const sIdentifier = (it.nim || it.student_name).trim().toLowerCase();
      rec.students.add(sIdentifier);
      rec.orderIds.add(it.order_id || it.order_number);
      const qty = it.quantity || 1;
      rec.totalPcs += qty;

      const sCode = it.size_code || 'M';
      rec.sizesMap.set(sCode, (rec.sizesMap.get(sCode) || 0) + qty);
      rec.totalNominal += it.subtotal || 0;

      const ps = (it.payment_status || '').toUpperCase();
      if (ps === 'LUNAS' || ps === 'PAID' || ps === 'APPROVED') {
        rec.paidNominal += it.subtotal || 0;
      }
    });

    return Array.from(map.values()).map((c) => {
      const sizeList = Array.from(c.sizesMap.entries())
        .map(([sz, count]) => `${sz}: ${count}`)
        .join(', ');

      return {
        className: c.className,
        studentCount: c.students.size,
        orderCount: c.orderIds.size,
        totalPcs: c.totalPcs,
        sizeBreakdownText: sizeList,
        totalNominal: c.totalNominal,
        paidNominal: c.paidNominal
      };
    }).sort((a, b) => b.totalPcs - a.totalPcs);
  }, [filteredItems]);

  // PDF Export Payload Generator
  const pdfOptions = useMemo(() => ({
    user,
    masterData,
    filteredOrders,
    filteredItems,
    sizeBreakdown,
    classBreakdown,
    metrics,
    filters: {
      startDate,
      endDate,
      orderType: orderTypeFilter,
      paymentStatus: paymentStatusFilter,
      orderStatus: orderStatusFilter,
      prodStatus: prodStatusFilter,
      className: classFilter,
      sizeCode: sizeFilter,
      searchQuery
    }
  }), [user, masterData, filteredOrders, filteredItems, sizeBreakdown, classBreakdown, metrics, startDate, endDate, orderTypeFilter, paymentStatusFilter, orderStatusFilter, prodStatusFilter, classFilter, sizeFilter, searchQuery]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadGeneralPDF = () => {
    generateGeneralReportPDF(pdfOptions);
  };

  const handleDownloadKonveksiPDF = () => {
    generateKonveksiReportPDF(pdfOptions);
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. PRINT-ONLY DOCUMENT HEADER (STANDAR LAPORAN & KONVEKSI)                */}
      {/* ========================================================================= */}
      <div className="hidden print:block mb-6 border-b-2 border-gray-950 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider text-gray-950">
              {activeCategory === 'konveksi'
                ? 'SURAT PERINTAH & DAFTAR PRODUKSI KONVEKSI PDH'
                : 'LAPORAN REKAPITULASI PEMESANAN & LOGISTIK PDH'}
            </h1>
            <p className="text-xs text-gray-700 font-semibold mt-0.5">
              {activeCategory === 'konveksi'
                ? 'Dokumen Kerja Resmi Spesifikasi Potong, Jahit & Bordir Nama Vendor'
                : 'Sistem Informasi Resmi Pengadaan Pakaian Dinas Harian (PDH) Kampus'}
            </p>
          </div>
          <div className="text-right text-[10px] text-gray-600 font-mono">
            <div>Waktu Cetak: {new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium' })}</div>
            <div>PIC Panitia: {user.name} ({user.role})</div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-gray-800">
          <span className="font-bold">Kriteria Filter:</span>
          <span>Periode: {startDate || 'Awal'} s/d {endDate || 'Sekarang'}</span> |
          <span>Jenis: {orderTypeFilter}</span> |
          <span>Status Produksi: {prodStatusFilter}</span> |
          <span>Kelas: {classFilter}</span> |
          <span>Ukuran: {sizeFilter}</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. WEB VIEW: HEADER BANNER & ACTION BAR                                   */}
      {/* ========================================================================= */}
      <div className="print:hidden bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4" /> Modul Laporan &amp; Rekapitulasi Eksekutif
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Laporan Pemesanan &amp; Logistik PDH
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Rekapitulasi pesanan, pelunasan pembayaran, progres pengerjaan vendor, distribusi ukuran, rekap kelas, dan surat perintah produksi konveksi.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={fetchReportData}
            disabled={loading}
            className="min-h-[44px] px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer"
            title="Muat Ulang Data"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> : <RefreshCw className="w-4 h-4" />}
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="min-h-[44px] px-3.5 sm:px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadGeneralPDF}
            className="min-h-[44px] px-3.5 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer shadow-md shadow-indigo-100"
          >
            <Download className="w-4 h-4" />
            <span>Unduh PDF Laporan</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadKonveksiPDF}
            className="min-h-[44px] px-3.5 sm:px-4 py-2 bg-slate-900 hover:bg-black text-amber-300 border border-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer shadow-md"
          >
            <Scissors className="w-4 h-4 text-amber-400" />
            <span>Unduh PDF Konveksi</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. WEB VIEW: REPORT CATEGORY TAB SELECTOR                                 */}
      {/* ========================================================================= */}
      <div className="print:hidden bg-white p-1.5 rounded-2xl border border-gray-200 shadow-2xs flex gap-1.5 overflow-x-auto text-xs font-bold custom-scrollbar">
        <button
          type="button"
          onClick={() => setActiveCategory('ringkasan')}
          className={`min-h-[40px] px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeCategory === 'ringkasan' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>1. Ringkasan Eksekutif</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('pesanan')}
          className={`min-h-[40px] px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeCategory === 'pesanan' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>2. Laporan Pesanan ({filteredOrders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('pembayaran')}
          className={`min-h-[40px] px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeCategory === 'pembayaran' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>3. Laporan Pembayaran</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('produksi')}
          className={`min-h-[40px] px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeCategory === 'produksi' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Factory className="w-4 h-4" />
          <span>4. Laporan Produksi</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('ukuran')}
          className={`min-h-[40px] px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeCategory === 'ukuran' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Shirt className="w-4 h-4" />
          <span>5. Laporan Ukuran ({sizeBreakdown.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('kelas')}
          className={`min-h-[40px] px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeCategory === 'kelas' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>6. Laporan Kelas ({classBreakdown.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('konveksi')}
          className={`min-h-[40px] px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeCategory === 'konveksi'
              ? 'bg-slate-900 text-amber-300 shadow-xs'
              : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
          }`}
        >
          <Scissors className="w-4 h-4 text-amber-500" />
          <span>7. Laporan Produksi Konveksi</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 4. WEB VIEW: MULTI-PARAMETER FILTER CONTROLS TOOLBAR                      */}
      {/* ========================================================================= */}
      <div className="print:hidden bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-gray-700">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>Filter Kriteria Laporan &amp; Ekspor</span>
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs font-semibold text-gray-500 hover:text-indigo-600 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filter</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Periode Tanggal */}
          <div>
            <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Jenis Pesanan */}
          <div>
            <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Jenis Pesanan</label>
            <select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Jenis (Pribadi &amp; Kolektif)</option>
              <option value="PRIBADI">Hanya Pesanan Pribadi</option>
              <option value="KOLEKTIF">Hanya Pesanan Kolektif</option>
            </select>
          </div>

          {/* Status Pembayaran (Sembunyikan filter jika di mode Konveksi) */}
          {activeCategory !== 'konveksi' ? (
            <div>
              <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Status Pembayaran</label>
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Semua Status Pembayaran</option>
                <option value="LUNAS">Lunas / Disetujui</option>
                <option value="MENUNGGU APPROVAL">Menunggu Approval</option>
                <option value="BELUM BAYAR">Belum Bayar</option>
                <option value="DITOLAK">Ditolak</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Status Pesanan</label>
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Semua Status Pesanan</option>
                <option value="DIPROSES">Diproses</option>
                <option value="SELESAI">Selesai</option>
                <option value="MENUNGGU PEMBAYARAN">Menunggu Pembayaran</option>
              </select>
            </div>
          )}

          {/* Status Produksi */}
          <div>
            <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Status Produksi</label>
            <select
              value={prodStatusFilter}
              onChange={(e) => setProdStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Status Produksi</option>
              <option value="Belum Diproduksi">Belum Diproses (0%)</option>
              <option value="Sedang Diproduksi">Proses Produksi (1–99%)</option>
              <option value="Selesai">Selesai (100%)</option>
              <option value="Siap Diambil">Siap Diambil</option>
            </select>
          </div>

          {/* Filter Kelas */}
          <div>
            <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Kode Kelas</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Kelas ({uniqueClasses.length} Kelas)</option>
              {uniqueClasses.map((c) => (
                <option key={c} value={c}>
                  Kelas {c}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Ukuran */}
          <div>
            <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Ukuran PDH</label>
            <select
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Ukuran</option>
              {uniqueSizes.map((s) => (
                <option key={s} value={s}>
                  Ukuran {s}
                </option>
              ))}
            </select>
          </div>

          {/* Pencarian Keyword */}
          <div>
            <label className="block font-bold text-gray-600 uppercase text-[10px] mb-1">Pencarian Cepat</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="No. Order, NIM, Nama, Bordir..."
                className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs border-t border-gray-100">
          <div className="text-gray-600">
            Terfilter <strong className="text-indigo-700">{filteredOrders.length} Pesanan</strong> ({metrics.totalPcs} Pcs Baju) dari total <strong className="text-gray-900">{orders.length} pesanan database</strong>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. EXECUTIVE METRICS KPI OVERVIEW                                         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-gray-500">Total Pesanan</span>
          <div className="text-xl sm:text-2xl font-black text-gray-900">{metrics.totalOrders}</div>
          <p className="text-[10px] text-gray-500">
            {metrics.personalCount} Pribadi / {metrics.collectiveCount} Kolektif
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-indigo-200 bg-indigo-50/20 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-indigo-700">Total Item PDH</span>
          <div className="text-xl sm:text-2xl font-black text-indigo-900">{metrics.totalPcs} <span className="text-xs font-normal">Pcs</span></div>
          <p className="text-[10px] text-indigo-600">{metrics.totalStudents} Mahasiswa Terdaftar</p>
        </div>

        {activeCategory !== 'konveksi' && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-500">Total Nilai Pesanan</span>
            <div className="text-base sm:text-lg font-black text-slate-900 truncate" title={formatRupiah(metrics.totalNominal)}>
              {formatRupiah(metrics.totalNominal)}
            </div>
            <p className="text-[10px] text-emerald-600 font-semibold">
              {formatRupiah(metrics.paidNominal)} Lunas
            </p>
          </div>
        )}

        {activeCategory !== 'konveksi' && (
          <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase text-emerald-700">Sudah Lunas</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-900">{metrics.paidCount} <span className="text-xs font-normal">Order</span></div>
            <p className="text-[10px] text-emerald-700 font-semibold">{formatRupiah(metrics.paidNominal)}</p>
          </div>
        )}

        <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-blue-700">Progres Vendor</span>
          <div className="text-xl sm:text-2xl font-black text-blue-900">{metrics.avgProgress}%</div>
          <p className="text-[10px] text-blue-600">
            {metrics.prodSelesaiCount} Selesai / {metrics.prodSedangCount} Sedang
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-amber-700">Antrean Produksi</span>
          <div className="text-xl sm:text-2xl font-black text-amber-900">{metrics.prodBelumCount} <span className="text-xs font-normal">Order</span></div>
          <p className="text-[10px] text-amber-600">{metrics.prodSedangCount} Dalam Pengerjaan</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. TAB: LAPORAN PRODUKSI KONVEKSI (KHUSUS VENDOR)                         */}
      {/* ========================================================================= */}
      {(activeCategory === 'konveksi') && (
        <div className="space-y-6">
          {/* KONVEKSI NOTICE BANNER */}
          <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center flex-shrink-0">
                <Scissors className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Lembar Kerja &amp; Perintah Produksi Konveksi</h3>
                <p className="text-xs text-slate-300">
                  Format khusus pihak vendor konveksi (spesifikasi pola potong, rekapitulasi per ukuran, per kelas, per order, dan daftar bordir nama).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleDownloadKonveksiPDF}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Unduh PDF Konveksi</span>
              </button>
            </div>
          </div>

          {/* A & C. REKAP UKURAN & REKAP KELAS FOR KONVEKSI */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rekap Ukuran Konveksi */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Shirt className="w-4 h-4 text-indigo-600" /> A. Rekap Ukuran Pola Potong &amp; Jahit
                  </h3>
                  <p className="text-xs text-gray-500">Jumlah kebutuhan kain dan penjahitan per ukuran baju PDH.</p>
                </div>
                <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg">
                  Total: {metrics.totalPcs} Pcs
                </span>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="p-3">Ukuran PDH</th>
                      <th className="p-3 text-center">Jumlah (Pcs)</th>
                      <th className="p-3 min-w-[120px]">Porsi Target</th>
                      <th className="p-3">Spesifikasi Model</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sizeBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-gray-400 text-xs">
                          Tidak ada data untuk filter ini.
                        </td>
                      </tr>
                    ) : (
                      sizeBreakdown.map((s) => {
                        const pct = metrics.totalPcs > 0 ? Math.round((s.count / metrics.totalPcs) * 100) : 0;
                        return (
                          <tr key={s.sizeCode} className="hover:bg-gray-50/80 transition">
                            <td className="p-3 font-black text-gray-900 flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs">
                                {s.sizeCode}
                              </span>
                              <span>Ukuran {s.sizeCode}</span>
                            </td>
                            <td className="p-3 text-center font-bold text-gray-900 text-sm">
                              {s.count} Pcs
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                                </div>
                                <span className="text-[11px] font-mono text-gray-600 w-8 text-right">{pct}%</span>
                              </div>
                            </td>
                            <td className="p-3 text-gray-600 font-medium">
                              American Drill Navy Blue / Lengan Panjang
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rekap per Kelas Konveksi */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Building className="w-4 h-4 text-emerald-600" /> B. Rekapitulasi per Kode Kelas
                  </h3>
                  <p className="text-xs text-gray-500">Jumlah mahasiswa dan rincian ukuran baju per kelas.</p>
                </div>
                <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg">
                  {classBreakdown.length} Kelas
                </span>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-xl max-h-80 custom-scrollbar">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="p-3">Kode Kelas</th>
                      <th className="p-3 text-center">Jml Mahasiswa</th>
                      <th className="p-3 text-center">Total PDH</th>
                      <th className="p-3">Rincian Ukuran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {classBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-gray-400 text-xs">
                          Tidak ada data untuk filter ini.
                        </td>
                      </tr>
                    ) : (
                      classBreakdown.map((c) => (
                        <tr key={c.className} className="hover:bg-gray-50/80 transition">
                          <td className="p-3 font-bold text-gray-900">
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-800 font-mono text-[11px] rounded-lg border border-gray-200">
                              {c.className}
                            </span>
                          </td>
                          <td className="p-3 text-center font-medium text-gray-700">
                            {c.studentCount} Orang
                          </td>
                          <td className="p-3 text-center font-bold text-indigo-700">
                            {c.totalPcs} Pcs
                          </td>
                          <td className="p-3 text-gray-700 font-mono text-[11px]">
                            {c.sizeBreakdownText || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* E. REKAP PER ORDER ID KONVEKSI (PACKING CHECKLIST) */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" /> C. Rekapitulasi per Order ID (Packing List &amp; Pencocokan Pesanan)
                </h3>
                <p className="text-xs text-gray-500">Daftar paket pesanan untuk memudahkan pihak konveksi memilah packing baju.</p>
              </div>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-lg">
                {filteredOrders.length} Order ID
              </span>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-xl max-h-80 custom-scrollbar">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="p-3 text-center w-12">No.</th>
                    <th className="p-3">Order ID</th>
                    <th className="p-3 text-center">Jenis</th>
                    <th className="p-3">Koordinator / Pemesan</th>
                    <th className="p-3">Kelas</th>
                    <th className="p-3 text-center">Jumlah Baju</th>
                    <th className="p-3 text-center">Status Produksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-gray-400 text-xs">
                        Tidak ada data untuk filter ini.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o, idx) => (
                      <tr key={o.order_id || idx} className="hover:bg-gray-50/80 transition">
                        <td className="p-3 text-center text-gray-400 font-mono">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-gray-900 whitespace-nowrap">{o.order_number}</td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            o.order_type === 'KOLEKTIF' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {o.order_type}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-gray-900 whitespace-nowrap">{o.buyer_name}</td>
                        <td className="p-3 font-mono text-[11px] text-gray-600 whitespace-nowrap">{o.buyer_class || '-'}</td>
                        <td className="p-3 text-center font-black text-indigo-700">
                          {o.item_count || (Array.isArray(o.items) ? o.items.length : 1)} Pcs
                        </td>
                        <td className="p-3 text-center whitespace-nowrap font-medium text-gray-700">
                          {o.production_status || 'Belum Diproduksi'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* B. DAFTAR PRODUKSI TERPERINCI (LEMBAR BORDIR & JAHIT ANGGOTA) */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-amber-600" /> D. Lembar Kerja Bordir &amp; Jahit Anggota ({filteredItems.length} Baju)
                </h3>
                <p className="text-xs text-gray-500">Instruksi bordir nama kustom, ukuran, dan identitas mahasiswa untuk setiap potong baju.</p>
              </div>
              <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-lg">
                Total: {filteredItems.length} Baju
              </span>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-xl max-h-96 custom-scrollbar">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="p-3 text-center w-12">No.</th>
                    <th className="p-3">Order ID</th>
                    <th className="p-3">Kelas</th>
                    <th className="p-3">Nama Mahasiswa</th>
                    <th className="p-3">NIM</th>
                    <th className="p-3 text-center">Ukuran</th>
                    <th className="p-3">Nama Bordir Kustom</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-400 text-xs">
                        Tidak ada data untuk filter ini.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((it, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/80 transition">
                        <td className="p-3 text-center text-gray-400 font-mono">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-gray-900 whitespace-nowrap">{it.order_number}</td>
                        <td className="p-3 font-mono font-bold text-gray-700 whitespace-nowrap">{it.class_name || '-'}</td>
                        <td className="p-3 font-bold text-gray-900 whitespace-nowrap">{it.student_name}</td>
                        <td className="p-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">{it.nim || '-'}</td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-900 font-bold text-xs inline-flex items-center justify-center">
                            {it.size_code}
                          </span>
                        </td>
                        <td className="p-3 font-black text-slate-900 tracking-wide bg-amber-50/40">
                          {it.custom_name && it.custom_name !== '-' ? it.custom_name : it.student_name}
                        </td>
                        <td className="p-3 text-center font-bold text-gray-900">{it.quantity || 1}</td>
                        <td className="p-3 text-center whitespace-nowrap font-medium text-gray-600">
                          {it.production_status || 'Belum Diproses'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. TAB: LAPORAN KELAS (DIPERBAIKI SECARA LENGKAP & MENDALAM)               */}
      {/* ========================================================================= */}
      {(activeCategory === 'ringkasan' || activeCategory === 'kelas') && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-600" /> Rekapitulasi Pemesanan Berdasarkan Kode Kelas
              </h3>
              <p className="text-xs text-gray-500">
                Data diambil dari setiap anggota/item pesanan (termasuk pecahan pesanan kolektif), menampilkan jumlah mahasiswa, pesanan, rekap ukuran, dan nominal.
              </p>
            </div>
            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg">
              {classBreakdown.length} Kelas Terdata
            </span>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
                <tr>
                  <th className="p-3 text-center w-12">No.</th>
                  <th className="p-3">Kode Kelas</th>
                  <th className="p-3 text-center">Jml Mahasiswa</th>
                  <th className="p-3 text-center">Jml Pesanan (Order ID)</th>
                  <th className="p-3 text-center">Total Item (Pcs)</th>
                  <th className="p-3 min-w-[200px]">Rekap Ukuran PDH</th>
                  <th className="p-3 text-right">Total Nominal</th>
                  <th className="p-3 text-right">Nominal Lunas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {classBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400 text-xs">
                      Tidak ada data untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  classBreakdown.map((c, idx) => (
                    <tr key={c.className} className="hover:bg-gray-50/80 transition">
                      <td className="p-3 text-center text-gray-400 font-mono">{idx + 1}</td>
                      <td className="p-3 font-bold text-gray-900">
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-800 font-mono text-[11px] rounded-lg border border-gray-200">
                          {c.className}
                        </span>
                      </td>
                      <td className="p-3 text-center font-semibold text-gray-800">
                        {c.studentCount} Orang
                      </td>
                      <td className="p-3 text-center font-medium text-gray-600">
                        {c.orderCount} Order
                      </td>
                      <td className="p-3 text-center font-bold text-indigo-700 text-sm">
                        {c.totalPcs} Pcs
                      </td>
                      <td className="p-3 text-gray-700 font-mono text-[11px] bg-slate-50/60">
                        {c.sizeBreakdownText || '-'}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-gray-900">
                        {formatRupiah(c.totalNominal)}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-emerald-600">
                        {formatRupiah(c.paidNominal)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. TAB: LAPORAN UKURAN PDH                                                */}
      {/* ========================================================================= */}
      {(activeCategory === 'ringkasan' || activeCategory === 'ukuran') && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Shirt className="w-4 h-4 text-indigo-600" /> Rekapitulasi Distribusi Ukuran PDH
              </h3>
              <p className="text-xs text-gray-500">Jumlah pesanan dan persentase kebutuhan kain berdasarkan ukuran pakaian.</p>
            </div>
            <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg">
              Total: {metrics.totalPcs} Pcs
            </span>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
                <tr>
                  <th className="p-3">Ukuran</th>
                  <th className="p-3 text-center">Jumlah (Pcs)</th>
                  <th className="p-3 min-w-[140px]">Persentase</th>
                  <th className="p-3 text-right">Estimasi Nilai Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sizeBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-400 text-xs">
                      Tidak ada data untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  sizeBreakdown.map((s) => {
                    const pct = metrics.totalPcs > 0 ? Math.round((s.count / metrics.totalPcs) * 100) : 0;
                    return (
                      <tr key={s.sizeCode} className="hover:bg-gray-50/80 transition">
                        <td className="p-3 font-black text-gray-900 flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs">
                            {s.sizeCode}
                          </span>
                          <span>Ukuran {s.sizeCode}</span>
                        </td>
                        <td className="p-3 text-center font-bold text-gray-900 text-sm">
                          {s.count} Pcs
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                            </div>
                            <span className="text-[11px] font-mono text-gray-600 w-8 text-right">{pct}%</span>
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-gray-900">
                          {formatRupiah(s.totalNominal)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. TAB: LAPORAN PESANAN & PEMBAYARAN & PRODUKSI TABEL LENGKAP             */}
      {/* ========================================================================= */}
      {(activeCategory === 'ringkasan' || activeCategory === 'pesanan' || activeCategory === 'pembayaran' || activeCategory === 'produksi') && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                {activeCategory === 'pembayaran' ? 'Laporan Status Pembayaran' : activeCategory === 'produksi' ? 'Laporan Progres Produksi' : 'Daftar Rincian Pesanan Lengkap'} ({filteredOrders.length} Pesanan)
              </h3>
              <p className="text-xs text-gray-500">Rincian seluruh transaksi pesanan terfilter dari database.</p>
            </div>
            <span className="text-xs font-bold text-gray-600">
              Total Nominal: <strong className="text-gray-900 font-mono">{formatRupiah(metrics.totalNominal)}</strong>
            </span>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl max-h-96 custom-scrollbar">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="p-3 text-center w-12">No.</th>
                  <th className="p-3">No. Pesanan</th>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Pemesan / Koordinator</th>
                  <th className="p-3">NIM &amp; Kelas</th>
                  <th className="p-3 text-center">Jenis</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Total (Rp)</th>
                  <th className="p-3 text-center">Status Pembayaran</th>
                  <th className="p-3 text-center">Status Produksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-gray-400 text-xs">
                      Tidak ada data untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord, idx) => {
                    const ps = (ord.payment_status || '').toUpperCase();
                    const isPaid = ps === 'LUNAS' || ps === 'PAID' || ps === 'APPROVED';
                    const isPending = ps === 'MENUNGGU APPROVAL' || ps === 'PENDING';

                    return (
                      <tr key={ord.order_id || idx} className="hover:bg-gray-50/80 transition">
                        <td className="p-3 text-center text-gray-400 font-mono">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                          {ord.order_number}
                        </td>
                        <td className="p-3 text-gray-500 text-[11px] whitespace-nowrap">
                          {ord.created_at ? new Date(ord.created_at).toLocaleDateString('id-ID', { dateStyle: 'short' }) : '-'}
                        </td>
                        <td className="p-3 font-bold text-gray-900 whitespace-nowrap">
                          {ord.buyer_name}
                        </td>
                        <td className="p-3 text-[11px] text-gray-600 whitespace-nowrap">
                          <span className="font-mono font-medium">{ord.buyer_nim || '-'}</span> ({ord.buyer_class || '-'})
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ord.order_type === 'KOLEKTIF' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {ord.order_type}
                          </span>
                        </td>
                        <td className="p-3 text-center font-black text-gray-900">
                          {ord.item_count || (Array.isArray(ord.items) ? ord.items.length : 1)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-gray-900 whitespace-nowrap">
                          {formatRupiah(ord.total_amount)}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isPending
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {ord.payment_status || 'BELUM BAYAR'}
                          </span>
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span className="text-[11px] font-semibold text-gray-700">
                            {ord.production_status || 'Belum Diproduksi'} ({ord.production_percentage || 0}%)
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. PRINT-ONLY SIGNATURE SECTION                                          */}
      {/* ========================================================================= */}
      <div className="hidden print:block pt-8 mt-6 border-t border-gray-300">
        <div className="grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <p className="text-gray-500 mb-16">
              {activeCategory === 'konveksi' ? 'Diserahkan Oleh,' : 'Mengetahui,'}<br />
              <strong className="text-gray-900">
                {activeCategory === 'konveksi' ? 'Divisi Logistik & Produksi Panitia' : 'Ketua Panitia Pengadaan PDH'}
              </strong>
            </p>
            <p className="font-bold border-t border-gray-400 pt-1 w-48 mx-auto text-gray-900">
              {activeCategory === 'konveksi' ? user.name : '( ........................................ )'}
            </p>
          </div>

          <div>
            <p className="text-gray-500 mb-16">
              {activeCategory === 'konveksi' ? 'Diterima Oleh,' : 'Dibuat Oleh,'}<br />
              <strong className="text-gray-900">
                {activeCategory === 'konveksi' ? 'Pihak Vendor / Konveksi' : 'Divisi Logistik & Keuangan'}
              </strong>
            </p>
            <p className="font-bold border-t border-gray-400 pt-1 w-48 mx-auto text-gray-900">
              {activeCategory === 'konveksi' ? '( ........................................ )' : user.name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
