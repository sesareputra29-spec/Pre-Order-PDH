import React, { useState, useEffect } from 'react';
import { User, OrderRecord, OrderItemRecord, PDHMasterData } from '../types';
import { api } from '../services/apiClient';
import {
  Package,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  Users,
  Shirt,
  DollarSign,
  Loader2,
  FileText,
  AlertCircle,
  X,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Save,
  Plus
} from 'lucide-react';

interface PanitiaOrderManagementProps {
  user: User;
}

const CLASS_CODE_REGEX = /^\d{2}(MJSP|MJSM|MJSE)\d{3}$/i;

export const PanitiaOrderManagement: React.FC<PanitiaOrderManagementProps> = ({ user }) => {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [masterData, setMasterData] = useState<PDHMasterData | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [filterSize, setFilterSize] = useState('ALL');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('ALL');
  const [filterOrderStatus, setFilterOrderStatus] = useState('ALL');

  // Modals
  const [detailModalOrder, setDetailModalOpen] = useState<OrderRecord | null>(null);
  const [editModalOrder, setEditModalOrder] = useState<OrderRecord | null>(null);
  const [editFormBuyerName, setEditBuyerName] = useState('');
  const [editFormBuyerNim, setEditBuyerNim] = useState('');
  const [editFormBuyerClass, setEditBuyerClass] = useState('');
  const [editFormBuyerWa, setEditBuyerWa] = useState('');
  const [editFormNotes, setEditNotes] = useState('');
  const [editFormItems, setEditItems] = useState<OrderItemRecord[]>([]);

  const [cancelModalOrder, setCancelModalOrder] = useState<OrderRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [user.userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, masterRes] = await Promise.all([
        api.listOrders(),
        api.getPDHMasterData()
      ]);

      if (ordersRes.success && ordersRes.data) setOrders(ordersRes.data);
      if (masterRes.success && masterRes.data) setMasterData(masterRes.data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (ord: OrderRecord) => {
    setEditModalOrder(ord);
    setEditBuyerName(ord.buyer_name);
    setEditBuyerNim(ord.buyer_nim);
    setEditBuyerClass(ord.buyer_class);
    setEditBuyerWa(ord.buyer_whatsapp || '');
    setEditNotes(ord.notes || '');
    setEditItems(JSON.parse(JSON.stringify(ord.items || [])));
  };

  // Handle Edit Item change
  const handleEditItemChange = (idx: number, field: keyof OrderItemRecord, value: any) => {
    const updated = [...editFormItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setEditItems(updated);
  };

  // Save Edit Order
  const handleSaveEdit = async () => {
    if (!editModalOrder) return;

    if (!editFormBuyerName.trim() || !editFormBuyerNim.trim() || !editFormBuyerClass.trim()) {
      setToast({ type: 'error', message: 'Data pemesan (Nama, NIM, Kelas) wajib diisi.' });
      return;
    }

    if (!CLASS_CODE_REGEX.test(editFormBuyerClass.trim())) {
      setToast({ type: 'error', message: 'Format kelas pemesan tidak valid! Harus berformat ##MJSP###, ##MJSM###, atau ##MJSE### (Contoh: 01MJSP001).' });
      return;
    }

    for (let i = 0; i < editFormItems.length; i++) {
      const itm = editFormItems[i];
      if (!CLASS_CODE_REGEX.test((itm.class_name || editFormBuyerClass).trim())) {
        setToast({ type: 'error', message: `Format kelas anggota ke-${i + 1} (${itm.student_name}) tidak valid.` });
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        buyer_name: editFormBuyerName,
        buyer_nim: editFormBuyerNim,
        buyer_class: editFormBuyerClass.toUpperCase(),
        buyer_whatsapp: editFormBuyerWa,
        notes: editFormNotes,
        items: editFormItems
      };

      const res = await api.updateOrderDetails(editModalOrder.order_id, payload);
      if (res.success) {
        setToast({ type: 'success', message: 'Data pesanan berhasil dikoreksi dan dicatat di Audit Log.' });
        setEditModalOrder(null);
        loadData();
      } else {
        setToast({ type: 'error', message: res.message || 'Gagal menyimpan perubahan.' });
      }
    } catch (e: any) {
      setToast({ type: 'error', message: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Order Status quick toggle
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setSubmitting(true);
    try {
      const res = await api.updateOrderStatus(orderId, newStatus);
      if (res.success) {
        setToast({ type: 'success', message: `Status pesanan berhasil diperbarui menjadi ${newStatus}.` });
        loadData();
      } else {
        setToast({ type: 'error', message: res.message || 'Gagal mengubah status.' });
      }
    } catch (e: any) {
      setToast({ type: 'error', message: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel Order Modal Confirm
  const handleConfirmCancel = async () => {
    if (!cancelModalOrder) return;
    if (!cancelReason.trim()) {
      setToast({ type: 'error', message: 'Alasan pembatalan pesanan wajib diisi!' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.cancelOrder(cancelModalOrder.order_id, cancelReason);
      if (res.success) {
        setToast({ type: 'success', message: 'Pesanan telah dibatalkan. Data tetap tersimpan di database.' });
        setCancelModalOrder(null);
        setCancelReason('');
        loadData();
      } else {
        setToast({ type: 'error', message: res.message || 'Gagal membatalkan pesanan.' });
      }
    } catch (e: any) {
      setToast({ type: 'error', message: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered List Logic
  const filteredOrders = orders.filter((ord) => {
    const matchesSearch =
      ord.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ord.buyer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ord.buyer_nim.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ord.buyer_class.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ord.items && ord.items.some((i) => (i.student_name || '').toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesClass = filterClass === 'ALL' || ord.buyer_class.toUpperCase() === filterClass.toUpperCase();
    const matchesType = filterType === 'ALL' || ord.order_type === filterType;

    const matchesSize =
      filterSize === 'ALL' || (ord.items && ord.items.some((i) => i.size_code.toUpperCase() === filterSize.toUpperCase()));

    let matchesPay = true;
    if (filterPaymentStatus !== 'ALL') {
      if (filterPaymentStatus === 'LUNAS') matchesPay = ord.payment_status === 'LUNAS' || ord.payment_status === 'PAID';
      else if (filterPaymentStatus === 'MENUNGGU APPROVAL') matchesPay = ord.payment_status === 'MENUNGGU APPROVAL' || ord.payment_status === 'PENDING';
      else if (filterPaymentStatus === 'DITOLAK') matchesPay = ord.payment_status === 'DITOLAK' || ord.payment_status === 'REJECTED';
      else if (filterPaymentStatus === 'BELUM_BAYAR') matchesPay = ord.payment_status === 'BELUM_BAYAR' || ord.payment_status === 'UNPAID';
    }

    const matchesStatus = filterOrderStatus === 'ALL' || ord.status === filterOrderStatus;

    return matchesSearch && matchesClass && matchesType && matchesSize && matchesPay && matchesStatus;
  });

  // State for expanded buyer groups
  const [expandedBuyers, setExpandedBuyers] = useState<Record<string, boolean>>({});

  const toggleBuyerExpand = (key: string) => {
    setExpandedBuyers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Reusable Badge Components for Status Pesanan, Status Pembayaran, and Jenis Pesanan
  const renderOrderTypeBadge = (type: string) => {
    const isPribadi = type === 'PRIBADI';
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 border shadow-2xs whitespace-nowrap ${
          isPribadi
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
            : 'bg-indigo-50 text-indigo-800 border-indigo-300'
        }`}
      >
        <Shirt className="w-3 h-3 flex-shrink-0" />
        <span>{type}</span>
      </span>
    );
  };

  const renderPaymentStatusBadge = (status: string) => {
    const stUpper = String(status || '').toUpperCase();
    if (stUpper === 'LUNAS' || stUpper === 'PAID' || stUpper === 'PEMBAYARAN LUNAS') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs whitespace-nowrap">
          <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
          <span>LUNAS</span>
        </span>
      );
    }
    if (stUpper === 'MENUNGGU APPROVAL' || stUpper === 'APPROVAL' || stUpper === 'MENUNGGU APPROVAL PEMBAYARAN') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 bg-blue-100 text-blue-900 border border-blue-300 shadow-2xs animate-pulse whitespace-nowrap">
          <Clock className="w-3 h-3 text-blue-600 flex-shrink-0" />
          <span>MENUNGGU APPROVAL</span>
        </span>
      );
    }
    if (stUpper === 'DITOLAK' || stUpper === 'REJECTED') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs whitespace-nowrap">
          <AlertTriangle className="w-3 h-3 text-rose-600 flex-shrink-0" />
          <span>DITOLAK</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs whitespace-nowrap">
        <Clock className="w-3 h-3 text-amber-600 flex-shrink-0" />
        <span>BELUM BAYAR</span>
      </span>
    );
  };

  const renderOrderStatusBadge = (status: string) => {
    const stUpper = String(status || '').toUpperCase();
    if (stUpper === 'DIBATALKAN' || stUpper === 'CANCELLED') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs whitespace-nowrap">
          <Ban className="w-3 h-3 text-rose-600 flex-shrink-0" />
          <span>DIBATALKAN</span>
        </span>
      );
    }
    if (stUpper === 'SELESAI' || stUpper === 'COMPLETED') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 bg-teal-100 text-teal-900 border border-teal-300 shadow-2xs whitespace-nowrap">
          <CheckCircle2 className="w-3 h-3 text-teal-600 flex-shrink-0" />
          <span>SELESAI</span>
        </span>
      );
    }
    if (stUpper === 'DIPROSES' || stUpper === 'PROCESSING') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs whitespace-nowrap">
          <Package className="w-3 h-3 text-purple-600 flex-shrink-0" />
          <span>DIPROSES</span>
        </span>
      );
    }
    if (stUpper === 'PEMBAYARAN LUNAS') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs whitespace-nowrap">
          <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
          <span>PEMBAYARAN LUNAS</span>
        </span>
      );
    }
    if (stUpper === 'MENUNGGU APPROVAL PEMBAYARAN') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 bg-blue-100 text-blue-900 border border-blue-300 shadow-2xs whitespace-nowrap">
          <Clock className="w-3 h-3 text-blue-600 flex-shrink-0" />
          <span>MENUNGGU APPROVAL</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs whitespace-nowrap">
        <Clock className="w-3 h-3 text-amber-600 flex-shrink-0" />
        <span>MENUNGGU PEMBAYARAN</span>
      </span>
    );
  };

  // Group filtered orders by buyer / coordinator
  const groupedOrders = React.useMemo(() => {
    const groups: {
      buyerKey: string;
      buyerName: string;
      buyerNim: string;
      buyerClass: string;
      buyerWa: string;
      totalItems: number;
      totalAmount: number;
      orders: OrderRecord[];
    }[] = [];

    const map = new Map<string, typeof groups[0]>();

    filteredOrders.forEach((ord) => {
      const key = (ord.buyer_nim || ord.buyer_name || 'GUEST').trim().toLowerCase();
      if (!map.has(key)) {
        const newGroup = {
          buyerKey: key,
          buyerName: ord.buyer_name,
          buyerNim: ord.buyer_nim,
          buyerClass: ord.buyer_class,
          buyerWa: ord.buyer_whatsapp || '',
          totalItems: 0,
          totalAmount: 0,
          orders: []
        };
        map.set(key, newGroup);
        groups.push(newGroup);
      }

      const grp = map.get(key)!;
      grp.orders.push(ord);
      grp.totalItems += (ord.item_count || (ord.items ? ord.items.length : 1));
      grp.totalAmount += (ord.total_amount || 0);
    });

    return groups;
  }, [filteredOrders]);

  // Calculate Summary
  const totalOrders = orders.length;
  const countPribadi = orders.filter((o) => o.order_type === 'PRIBADI').length;
  const countKolektif = orders.filter((o) => o.order_type === 'KOLEKTIF').length;
  const totalStudentsCount = orders.reduce((sum, o) => sum + (o.item_count || 1), 0);
  const totalNominal = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

  const countLunas = orders.filter((o) => o.payment_status === 'LUNAS' || o.payment_status === 'PAID').length;
  const countMenunggu = orders.filter((o) => o.payment_status === 'MENUNGGU APPROVAL' || o.payment_status === 'PENDING').length;
  const countBelum = orders.filter((o) => !['LUNAS', 'PAID', 'MENUNGGU APPROVAL', 'PENDING'].includes(o.payment_status)).length;

  // Extract list of unique classes for filter
  const uniqueClasses = Array.from(new Set(orders.map((o) => o.buyer_class))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Toast alert */}
      {toast && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 animate-fade-in ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button type="button" onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600">
            &times;
          </button>
        </div>
      )}

      {/* SUMMARY METRICS CARDS (Requirement 4) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-[10px] text-gray-500 font-bold uppercase block">Total Pesanan</span>
          <div className="text-xl font-black text-gray-900">{totalOrders}</div>
        </div>

        <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200 shadow-xs space-y-1">
          <span className="text-[10px] text-emerald-800 font-bold uppercase block">Pribadi</span>
          <div className="text-xl font-black text-emerald-900">{countPribadi}</div>
        </div>

        <div className="bg-indigo-50/60 p-3 rounded-2xl border border-indigo-200 shadow-xs space-y-1">
          <span className="text-[10px] text-indigo-800 font-bold uppercase block">Kolektif</span>
          <div className="text-xl font-black text-indigo-900">{countKolektif}</div>
        </div>

        <div className="bg-purple-50/60 p-3 rounded-2xl border border-purple-200 shadow-xs space-y-1">
          <span className="text-[10px] text-purple-800 font-bold uppercase block">Total Pcs Baju</span>
          <div className="text-xl font-black text-purple-900">{totalStudentsCount}</div>
        </div>

        <div className="bg-teal-50/60 p-3 rounded-2xl border border-teal-200 shadow-xs space-y-1 col-span-2 sm:col-span-2">
          <span className="text-[10px] text-teal-800 font-bold uppercase block">Total Nominal Omzet</span>
          <div className="text-lg font-black font-mono text-teal-900">
            Rp {totalNominal.toLocaleString('id-ID')}
          </div>
        </div>

        <div className="bg-emerald-100/70 p-3 rounded-2xl border border-emerald-300 shadow-xs space-y-1">
          <span className="text-[10px] text-emerald-800 font-bold uppercase block">Sudah Bayar</span>
          <div className="text-xl font-black text-emerald-900">{countLunas}</div>
        </div>

        <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200 shadow-xs space-y-1">
          <span className="text-[10px] text-amber-800 font-bold uppercase block">Menunggu Appr</span>
          <div className="text-xl font-black text-amber-900">{countMenunggu}</div>
        </div>
      </div>

      {/* ORDERS TABLE CARD */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600" /> Daftar Manajemen Seluruh Pesanan PDH
            </h3>
            <p className="text-xs text-gray-500">Kelola pesanan pribadi &amp; kolektif, koreksi data, dan batalkan pesanan.</p>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
            <span>Refresh Data</span>
          </button>
        </div>

        {/* SEARCH AND FILTERS TOOLBAR (Requirement 3) */}
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
            <div className="relative sm:col-span-2">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari No Pesanan, Nama, NIM, Kelas..."
                className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-2.5 py-2 bg-gray-50 border border-gray-300 rounded-xl font-bold"
            >
              <option value="ALL">Jenis: Semua</option>
              <option value="PRIBADI">Pribadi</option>
              <option value="KOLEKTIF">Kolektif</option>
            </select>

            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="px-2.5 py-2 bg-gray-50 border border-gray-300 rounded-xl font-bold"
            >
              <option value="ALL">Kelas: Semua</option>
              {uniqueClasses.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={filterSize}
              onChange={(e) => setFilterSize(e.target.value)}
              className="px-2.5 py-2 bg-gray-50 border border-gray-300 rounded-xl font-bold"
            >
              <option value="ALL">Ukuran: Semua</option>
              {masterData?.sizes.map((s) => (
                <option key={s.size_id} value={s.size_code}>{s.size_code}</option>
              ))}
            </select>

            <select
              value={filterPaymentStatus}
              onChange={(e) => setFilterPaymentStatus(e.target.value)}
              className="px-2.5 py-2 bg-gray-50 border border-gray-300 rounded-xl font-bold"
            >
              <option value="ALL">Status Bayar: Semua</option>
              <option value="BELUM_BAYAR">Belum Bayar</option>
              <option value="MENUNGGU APPROVAL">Menunggu Approval</option>
              <option value="LUNAS">Lunas</option>
              <option value="DITOLAK">Ditolak</option>
            </select>
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-500 px-1 pt-1">
            <span>Menampilkan <strong>{filteredOrders.length}</strong> dari {orders.length} total pesanan.</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-700">Filter Status Pesanan:</span>
              <select
                value={filterOrderStatus}
                onChange={(e) => setFilterOrderStatus(e.target.value)}
                className="px-2 py-1 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold"
              >
                <option value="ALL">Semua Workflow Status</option>
                <option value="MENUNGGU PEMBAYARAN">Menunggu Pembayaran</option>
                <option value="MENUNGGU APPROVAL PEMBAYARAN">Menunggu Approval Pembayaran</option>
                <option value="PEMBAYARAN LUNAS">Pembayaran Lunas</option>
                <option value="DIPROSES">Diproses</option>
                <option value="SELESAI">Selesai</option>
                <option value="DIBATALKAN">Dibatalkan</option>
              </select>
            </div>
          </div>
        </div>

        {/* ORDERS LIST GROUPED BY BUYER / COORDINATOR */}
        <div className="space-y-3">
          {groupedOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-400 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
              <p className="font-semibold text-gray-700">Tidak Ada Kelompok Pesanan Ditemukan</p>
              <p className="text-[11px] text-gray-500">Coba ubah kata kunci atau reset filter di atas.</p>
            </div>
          ) : (
            groupedOrders.map((group) => {
              const isExpanded = expandedBuyers[group.buyerKey] || (searchTerm.length > 0);

              return (
                <div key={group.buyerKey} className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-xs transition">
                  {/* Group Header Card */}
                  <div
                    onClick={() => toggleBuyerExpand(group.buyerKey)}
                    className="p-4 bg-slate-50/80 hover:bg-slate-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer border-b border-gray-200/60 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-xs flex-shrink-0">
                        {group.buyerName ? group.buyerName.charAt(0).toUpperCase() : 'M'}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm flex items-center gap-2 flex-wrap">
                          <span>{group.buyerName}</span>
                          <span className="text-xs font-mono font-medium text-gray-500">({group.buyerNim})</span>
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold text-[10px] rounded-full border border-indigo-200 uppercase">
                            {group.buyerClass}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          Kontak: <strong className="text-gray-700">{group.buyerWa || '-'}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Nominal Pemesan</span>
                        <span className="font-mono font-black text-emerald-800 text-sm">
                          Rp {group.totalAmount.toLocaleString('id-ID')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-bold text-xs rounded-xl border border-emerald-300">
                          {group.orders.length} Order ({group.totalItems} Pcs)
                        </span>

                        <div className="p-1 text-gray-400 hover:text-gray-700 transition">
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-emerald-600" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Group Orders Content */}
                  {isExpanded && (
                    <div className="p-3 bg-white space-y-3">
                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-x-auto border border-gray-200 rounded-xl">
                        <table className="w-full text-left text-xs text-gray-600">
                          <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
                            <tr>
                              <th className="p-3">Order ID &amp; Waktu</th>
                              <th className="p-3 text-center">Jenis Pesanan</th>
                              <th className="p-3 text-center">Jumlah</th>
                              <th className="p-3">Total Tagihan</th>
                              <th className="p-3 text-center">Status Pembayaran</th>
                              <th className="p-3 text-center">Status Pesanan</th>
                              <th className="p-3 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {group.orders.map((ord) => {
                              const isCanceled = ord.status === 'DIBATALKAN';

                              return (
                                <tr key={ord.order_id} className={`hover:bg-gray-50/80 transition ${isCanceled ? 'bg-rose-50/30' : ''}`}>
                                  <td className="p-3 space-y-0.5 whitespace-nowrap">
                                    <div className="font-mono font-bold text-gray-900 text-xs">{ord.order_number}</div>
                                    <div className="text-[10px] text-gray-400 font-mono">
                                      {ord.created_at ? new Date(ord.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                                    </div>
                                  </td>

                                  <td className="p-3 text-center">
                                    {renderOrderTypeBadge(ord.order_type)}
                                  </td>

                                  <td className="p-3 text-center font-mono font-bold text-gray-800">
                                    {ord.item_count || (ord.items ? ord.items.length : 1)} Pcs
                                  </td>

                                  <td className="p-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                                    Rp {(ord.total_amount || 0).toLocaleString('id-ID')}
                                  </td>

                                  <td className="p-3 text-center">
                                    {renderPaymentStatusBadge(ord.payment_status)}
                                  </td>

                                  <td className="p-3 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      {renderOrderStatusBadge(ord.status)}
                                      {!isCanceled && (
                                        <select
                                          value={ord.status}
                                          onChange={(e) => handleUpdateStatus(ord.order_id, e.target.value)}
                                          className="px-2 py-0.5 rounded text-[10px] font-bold border border-gray-200 bg-gray-50 hover:bg-white text-gray-700 focus:ring-1 focus:ring-indigo-500 cursor-pointer max-w-[160px]"
                                          title="Ubah Status Pesanan"
                                        >
                                          <option value="MENUNGGU PEMBAYARAN">Menunggu Pembayaran</option>
                                          <option value="MENUNGGU APPROVAL PEMBAYARAN">Menunggu Approval</option>
                                          <option value="PEMBAYARAN LUNAS">Pembayaran Lunas</option>
                                          <option value="DIPROSES">Diproses</option>
                                          <option value="SELESAI">Selesai</option>
                                          <option value="DIBATALKAN">Dibatalkan</option>
                                        </select>
                                      )}
                                    </div>
                                  </td>

                                  <td className="p-3 text-center whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setDetailModalOpen(ord)}
                                        className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition cursor-pointer"
                                        title="Detail Pesanan"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>

                                      <button
                                        type="button"
                                        disabled={isCanceled}
                                        onClick={() => handleOpenEditModal(ord)}
                                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                                          isCanceled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                        }`}
                                        title="Edit Data Pesanan"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>

                                      <button
                                        type="button"
                                        disabled={isCanceled}
                                        onClick={() => {
                                          setCancelModalOrder(ord);
                                          setCancelReason('');
                                        }}
                                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                                          isCanceled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                                        }`}
                                        title="Batalkan Pesanan"
                                      >
                                        <Ban className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Cards View */}
                      <div className="block md:hidden space-y-3">
                        {group.orders.map((ord) => {
                          const isCanceled = ord.status === 'DIBATALKAN';

                          return (
                            <div key={ord.order_id} className={`p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2.5 text-xs ${isCanceled ? 'bg-rose-50/30' : ''}`}>
                              <div className="flex items-start justify-between gap-2 border-b border-gray-200 pb-2">
                                <div>
                                  <span className="font-mono font-bold text-gray-900 text-xs block">{ord.order_number}</span>
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    {ord.created_at ? new Date(ord.created_at).toLocaleDateString('id-ID') : '-'}
                                  </span>
                                </div>
                                {renderOrderTypeBadge(ord.order_type)}
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div>
                                  <span className="text-gray-400 block text-[10px]">Jumlah Items</span>
                                  <span className="font-mono font-bold text-gray-800">{ord.item_count || (ord.items ? ord.items.length : 1)} Pcs</span>
                                </div>

                                <div>
                                  <span className="text-gray-400 block text-[10px]">Total Tagihan</span>
                                  <span className="font-mono font-bold text-emerald-800">Rp {(ord.total_amount || 0).toLocaleString('id-ID')}</span>
                                </div>
                              </div>

                              <div className="flex flex-col gap-2 pt-1 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-400 text-[10px]">Status Bayar:</span>
                                  {renderPaymentStatusBadge(ord.payment_status)}
                                </div>

                                <div className="flex items-center justify-between">
                                  <span className="text-gray-400 text-[10px]">Status Pesanan:</span>
                                  {renderOrderStatusBadge(ord.status)}
                                </div>

                                {!isCanceled && (
                                  <div className="pt-1">
                                    <select
                                      value={ord.status}
                                      onChange={(e) => handleUpdateStatus(ord.order_id, e.target.value)}
                                      className="w-full px-2 py-1.5 rounded-lg text-xs font-bold border border-gray-300 bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                    >
                                      <option value="MENUNGGU PEMBAYARAN">Menunggu Pembayaran</option>
                                      <option value="MENUNGGU APPROVAL PEMBAYARAN">Menunggu Approval</option>
                                      <option value="PEMBAYARAN LUNAS">Pembayaran Lunas</option>
                                      <option value="DIPROSES">Diproses</option>
                                      <option value="SELESAI">Selesai</option>
                                      <option value="DIBATALKAN">Dibatalkan</option>
                                    </select>
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 border-t border-gray-200 flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setDetailModalOpen(ord)}
                                  className="px-3 py-1.5 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Detail</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={isCanceled}
                                  onClick={() => handleOpenEditModal(ord)}
                                  className={`px-3 py-1.5 font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1 ${
                                    isCanceled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-50 text-emerald-700'
                                  }`}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={isCanceled}
                                  onClick={() => {
                                    setCancelModalOrder(ord);
                                    setCancelReason('');
                                  }}
                                  className={`px-3 py-1.5 font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1 ${
                                    isCanceled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-rose-50 text-rose-700'
                                  }`}
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Batal</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* DETAIL PESANAN MODAL (Requirement 2) */}
      {detailModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Detail Pesanan PDH Kampus</h3>
                <p className="text-xs text-gray-500 font-mono">Order No: {detailModalOrder.order_number}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pemesan & Payment Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase text-gray-500 block">Data Pemesan / PJ</span>
                <div className="font-bold text-gray-900">{detailModalOrder.buyer_name}</div>
                <div className="font-mono text-gray-700">NIM: {detailModalOrder.buyer_nim}</div>
                <div className="font-mono font-bold text-indigo-700">Kelas: {detailModalOrder.buyer_class}</div>
                <div className="text-gray-600">WhatsApp: {detailModalOrder.buyer_whatsapp}</div>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-gray-500 block">Status Pembayaran &amp; Workflow</span>
                <div className="font-bold text-emerald-800">
                  Total Tagihan: <span className="font-mono text-base">Rp {detailModalOrder.total_amount.toLocaleString('id-ID')}</span>
                </div>
                <div className="text-gray-600">Metode: <strong className="uppercase font-mono">{detailModalOrder.payment_method || 'TRANSFER'}</strong></div>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-gray-500 font-bold">Jenis:</span>
                  {renderOrderTypeBadge(detailModalOrder.order_type)}
                </div>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-gray-500 font-bold">Status Bayar:</span>
                  {renderPaymentStatusBadge(detailModalOrder.payment_status)}
                </div>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-gray-500 font-bold">Status Order:</span>
                  {renderOrderStatusBadge(detailModalOrder.status)}
                </div>
              </div>
            </div>

            {/* Members Table Detail */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase text-gray-800 block">
                Daftar Mahasiswa Pemesan ({detailModalOrder.items?.length || 1} Orang)
              </span>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px] border-b border-gray-200">
                    <tr>
                      <th className="p-2 w-8">#</th>
                      <th className="p-2">Nama Mahasiswa</th>
                      <th className="p-2">NIM</th>
                      <th className="p-2">Kelas</th>
                      <th className="p-2">Ukuran</th>
                      <th className="p-2">Bordir Nama</th>
                      <th className="p-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(detailModalOrder.items || []).map((itm, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="p-2 font-mono text-gray-400 text-center">{idx + 1}</td>
                        <td className="p-2 font-bold text-gray-900">{itm.student_name || detailModalOrder.buyer_name}</td>
                        <td className="p-2 font-mono text-gray-800">{itm.nim || detailModalOrder.buyer_nim}</td>
                        <td className="p-2 font-mono font-bold text-indigo-700">{itm.class_name || detailModalOrder.buyer_class}</td>
                        <td className="p-2 font-mono font-bold text-emerald-700">{itm.size_code}</td>
                        <td className="p-2 text-gray-800">{itm.custom_name}</td>
                        <td className="p-2 font-mono font-bold text-right text-gray-900">
                          Rp {(itm.subtotal || 0).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {detailModalOrder.notes && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                <span className="font-bold text-amber-900 block uppercase text-[10px]">Catatan Tambahan Mahasiswa:</span>
                <p className="text-amber-800">{detailModalOrder.notes}</p>
              </div>
            )}

            {detailModalOrder.cancel_reason && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                <span className="font-bold text-rose-900 block uppercase text-[10px]">Alasan Pembatalan Pesanan:</span>
                <p className="text-rose-800">{detailModalOrder.cancel_reason}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDetailModalOpen(null)}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PESANAN MODAL (Requirement 6) */}
      {editModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Koreksi &amp; Edit Data Pesanan</h3>
                <p className="text-xs text-gray-500 font-mono">Order No: {editModalOrder.order_number}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOrder(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pemesan Header Fields */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3 text-xs">
              <span className="font-bold text-gray-800 block uppercase text-[10px]">Data Pemesan Utama</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Nama Pemesan</label>
                  <input
                    type="text"
                    value={editFormBuyerName}
                    onChange={(e) => setEditBuyerName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">NIM</label>
                  <input
                    type="text"
                    value={editFormBuyerNim}
                    onChange={(e) => setEditBuyerNim(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Kode Kelas (##MJSE###)</label>
                  <input
                    type="text"
                    value={editFormBuyerClass}
                    onChange={(e) => setEditBuyerClass(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-xl font-mono font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={editFormBuyerWa}
                    onChange={(e) => setEditBuyerWa(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Items Edit List */}
            <div className="space-y-3">
              <span className="font-bold text-gray-800 uppercase text-xs block">Koreksi Data Item Anggota</span>
              <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                {editFormItems.map((itm, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-xs">
                    <div className="font-bold text-gray-700">Anggota #{idx + 1}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Nama Lengkap"
                        value={itm.student_name || ''}
                        onChange={(e) => handleEditItemChange(idx, 'student_name', e.target.value)}
                        className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="NIM"
                        value={itm.nim || ''}
                        onChange={(e) => handleEditItemChange(idx, 'nim', e.target.value)}
                        className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-mono"
                      />
                      <input
                        type="text"
                        placeholder="Kelas"
                        value={itm.class_name || ''}
                        onChange={(e) => handleEditItemChange(idx, 'class_name', e.target.value.toUpperCase())}
                        className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-mono font-bold uppercase"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        value={itm.size_code}
                        onChange={(e) => handleEditItemChange(idx, 'size_code', e.target.value)}
                        className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-bold"
                      >
                        {masterData?.sizes.map((s) => (
                          <option key={s.size_id} value={s.size_code}>
                            Ukuran {s.size_code} {s.extra_fee > 0 ? `(+Rp ${s.extra_fee.toLocaleString('id-ID')})` : ''}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Bordir Nama Kustom"
                        value={itm.custom_name || ''}
                        onChange={(e) => handleEditItemChange(idx, 'custom_name', e.target.value)}
                        className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1 text-xs">Catatan Pesanan</label>
              <textarea
                rows={2}
                value={editFormNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-bold border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEditModalOrder(null)}
                className="py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSaveEdit}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>SIMPAN PERUBAHAN &amp; CATAT AUDIT</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL PESANAN MANDATORY REASON MODAL (Requirement 7) */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-gray-900 text-base border-b border-gray-100 pb-2">
              Pembatalan Pesanan ({cancelModalOrder.order_number})
            </h3>

            <p className="text-xs text-gray-600">
              Panitia dapat membatalkan pesanan. Data pesanan <strong>TIDAK akan dihapus</strong> dari database dan status akan diubah menjadi <strong className="text-rose-700">DIBATALKAN</strong>.
            </p>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase text-gray-700">
                Alasan Pembatalan <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Contoh: Mahasiswa mengajukan pembatalan, pembayaran kadaluarsa, atau kesalahan pemesanan."
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setCancelModalOrder(null)}
                className="py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting || !cancelReason.trim()}
                onClick={handleConfirmCancel}
                className={`py-2.5 rounded-xl text-white transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  cancelReason.trim() ? 'bg-rose-600 hover:bg-rose-700 shadow-md' : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                <span>KONFIRMASI BATALKAN</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
