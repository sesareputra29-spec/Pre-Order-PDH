import React, { useState, useEffect, useRef } from 'react';
import { User, OrderRecord, PDHMasterData } from '../types';
import { api } from '../services/apiClient';
import {
  Clock,
  Package,
  ChevronDown,
  ChevronUp,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shirt,
  Upload,
  Building,
  Phone,
  X,
  FileText,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Eye,
  Download,
  Info,
  ShoppingBag
} from 'lucide-react';

interface StudentOrderHistoryProps {
  user: User;
  masterData?: PDHMasterData | null;
}

export const StudentOrderHistory: React.FC<StudentOrderHistoryProps> = ({ user, masterData: propsMasterData }) => {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [masterData, setMasterData] = useState<PDHMasterData | null>(propsMasterData || null);

  // Payment Modal States
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'TRANSFER' | 'CASH'>('TRANSFER');
  const [fileBase64, setFileBase64] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [mimeType, setMimeType] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Preview Proof Modal
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadOrders();
    if (!masterData) {
      loadMasterData();
    }
  }, [user.userId, user.nim]);

  const loadMasterData = async () => {
    try {
      const res = await api.getPDHMasterData();
      if (res.success && res.data) {
        setMasterData(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getStudentOrders(user.nim || user.username || user.userId);
      if (res.success && res.data) {
        setOrders(res.data);
        if (res.data.length > 0 && !expandedOrderId) {
          setExpandedOrderId(res.data[0].order_id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const DEFAULT_DESIGN_PHOTO = 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80';

  const getPrimaryPhoto = (ord: OrderRecord): { url: string; isUploadedProgressPhoto: boolean; label: string } => {
    if (Array.isArray(ord.production_history) && ord.production_history.length > 0) {
      const historyWithPhoto = [...ord.production_history]
        .filter((h) => h.photo_url && h.photo_url.trim() !== '')
        .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());

      if (historyWithPhoto.length > 0) {
        return {
          url: historyWithPhoto[0].photo_url || DEFAULT_DESIGN_PHOTO,
          isUploadedProgressPhoto: true,
          label: 'Foto Progres Vendor (Terbaru)'
        };
      }
    }

    if (ord.production_photo_url && ord.production_photo_url.trim() !== '') {
      return {
        url: ord.production_photo_url,
        isUploadedProgressPhoto: true,
        label: 'Foto Progres Vendor (Terbaru)'
      };
    }

    return {
      url: masterData?.images?.[0]?.file_url || DEFAULT_DESIGN_PHOTO,
      isUploadedProgressPhoto: false,
      label: 'Desain Resmi PDH Kampus'
    };
  };

  const handleOpenPaymentModal = (ord: OrderRecord) => {
    setSelectedOrder(ord);
    setPaymentMethod((ord.payment_method as 'TRANSFER' | 'CASH') || 'TRANSFER');
    setFileBase64('');
    setFileName('');
    setMimeType('');
    setPaymentModalOpen(true);
  };

  const handleCopyAccount = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedExts = ['jpg', 'jpeg', 'png', 'pdf'];

    if (!allowedExts.includes(ext)) {
      setToast({
        type: 'error',
        message: 'Format file tidak diperbolehkan! Hanya JPG, JPEG, PNG, dan PDF yang diizinkan.'
      });
      return;
    }

    setFileName(file.name);
    setMimeType(file.type || 'image/jpeg');

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFileBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPayment = async () => {
    if (!selectedOrder) return;
    if (!fileBase64) {
      setToast({
        type: 'error',
        message: 'File bukti pembayaran wajib diunggah!'
      });
      return;
    }

    setUploading(true);
    try {
      const res = await api.uploadPaymentProofForOrder({
        order_id: selectedOrder.order_id,
        method: paymentMethod,
        amount: selectedOrder.total_amount || 185000,
        file_name: fileName,
        mime_type: mimeType,
        base64_data: fileBase64,
        payer_name: user.name,
        payer_nim: user.nim || user.username
      });

      if (res.success) {
        setToast({
          type: 'success',
          message: 'Bukti pembayaran berhasil diunggah! Status: Menunggu Approval Panitia.'
        });
        setPaymentModalOpen(false);
        loadOrders();
      } else {
        setToast({
          type: 'error',
          message: res.message || 'Gagal mengunggah bukti pembayaran.'
        });
      }
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err.message || 'Terjadi kesalahan sistem saat upload.'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCancelOrder = async (orderId: string, orderNumber: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin membatalkan pesanan ${orderNumber}?`)) {
      return;
    }

    try {
      const res = await api.cancelOrder(orderId, 'Dibatalkan oleh mahasiswa pemesan.');
      if (res.success) {
        setToast({
          type: 'success',
          message: `Pesanan ${orderNumber} berhasil dibatalkan.`
        });
        loadOrders();
      } else {
        setToast({
          type: 'error',
          message: res.message || 'Gagal membatalkan pesanan.'
        });
      }
    } catch (e: any) {
      setToast({
        type: 'error',
        message: e.message || 'Gagal membatalkan pesanan.'
      });
    }
  };

  const getWaLink = () => {
    const phone = masterData?.info?.pdhContact?.replace(/\D/g, '') || '6281234567890';
    const text = encodeURIComponent(
      `Halo Panitia PDH Kampus, saya ${user.name} (${user.nim || user.username || '-'}). Ingin konfirmasi pembayaran pesanan PDH No. ${selectedOrder?.order_number || ''}.`
    );
    return `https://wa.me/${phone}?text=${text}`;
  };

  // Helper for lifecycle stepper step determination
  const getOrderStep = (ord: OrderRecord): number => {
    const isLunas = ord.payment_status === 'LUNAS' || ord.payment_status === 'PAID';
    const isPending = ord.payment_status === 'MENUNGGU APPROVAL';
    const isFinished = ord.pickup_status === 'Sudah Diambil' || ord.status === 'SELESAI';
    const isProd = ord.production_status === 'Sedang Diproduksi' || ord.production_status === 'Selesai' || ord.pickup_status === 'Siap Diambil';

    if (isFinished) return 5;
    if (isProd) return 4;
    if (isLunas) return 3;
    if (isPending) return 2.5;
    if (ord.payment_proof_url || ord.payment_proof_file_id) return 2;
    return 1;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold shadow-md animate-fade-in ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span>{toast.message}</span>
          </div>
          <button type="button" onClick={() => setToast(null)} className="text-white/80 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
            <CreditCard className="w-4 h-4" /> Manajemen Pesanan &amp; Pembayaran
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Pesanan &amp; Pembayaran Saya
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Periksa rincian pesanan, unggah bukti pembayaran transfer/cash, dan pantau status persetujuan panitia secara terpadu.
          </p>
        </div>

        <button
          type="button"
          onClick={loadOrders}
          disabled={loading}
          className="min-h-[44px] px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 text-emerald-600 ${loading ? 'animate-spin' : ''}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {loading && orders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-2" />
          <p className="text-xs text-gray-500 font-medium">Memuat pesanan dan status pembayaran Anda...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-gray-900 text-base">Belum Ada Pesanan PDH</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Anda belum membuat pesanan PDH pribadi atau belum terdaftar dalam pesanan kolektif angkatan.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((ord) => {
            const isExpanded = expandedOrderId === ord.order_id;
            const isLunas = ord.payment_status === 'LUNAS' || ord.payment_status === 'PAID';
            const isPending = ord.payment_status === 'MENUNGGU APPROVAL';
            const isDitolak = ord.payment_status === 'DITOLAK' || ord.payment_status === 'REJECTED';
            const isUnpaid = !isLunas && !isPending && !isDitolak;
            const currentStep = getOrderStep(ord);

            return (
              <div
                key={ord.order_id}
                className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden transition"
              >
                {/* 1. TOP HEADER SUMMARY */}
                <div
                  onClick={() => setExpandedOrderId(isExpanded ? null : ord.order_id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer hover:bg-gray-50/80 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-emerald-800 text-sm sm:text-base">
                        {ord.order_number}
                      </span>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        ord.order_type === 'PRIBADI' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {ord.order_type}
                      </span>

                      {/* Payment Status Badges */}
                      {isLunas && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> LUNAS (Disetujui)
                        </span>
                      )}
                      {isPending && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 animate-pulse">
                          <Clock className="w-3 h-3" /> Menunggu Approval
                        </span>
                      )}
                      {isDitolak && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-600" /> Pembayaran Ditolak
                        </span>
                      )}
                      {isUnpaid && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-300">
                          Belum Bayar
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-500">
                      Pemesan: <strong className="text-gray-800 font-semibold">{ord.buyer_name}</strong> ({ord.buyer_class}) &bull; Dibuat: {new Date(ord.created_at).toLocaleString('id-ID')}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Total ({ord.item_count} Item)</span>
                      <span className="font-mono font-black text-gray-900 text-sm sm:text-base">
                        Rp {ord.total_amount.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <button type="button" className="p-1 text-gray-400 hover:text-gray-600">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* 2. ALUR STATUS STEPPER (Pesanan -> Pembayaran -> Verifikasi -> Produksi -> Selesai) */}
                <div className="px-4 sm:px-5 py-3 bg-gray-50/60 border-t border-b border-gray-100">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Alur Status Pesanan &amp; Pembayaran:
                  </div>

                  <div className="grid grid-cols-5 gap-1 text-center">
                    {/* Step 1: Pesanan */}
                    <div className="space-y-1">
                      <div className={`h-1.5 rounded-full ${currentStep >= 1 ? 'bg-emerald-600' : 'bg-gray-200'}`} />
                      <div className="text-[10px] font-bold truncate text-emerald-800">1. Pesanan</div>
                    </div>

                    {/* Step 2: Pembayaran */}
                    <div className="space-y-1">
                      <div className={`h-1.5 rounded-full ${currentStep >= 2 ? 'bg-emerald-600' : isUnpaid ? 'bg-amber-400 animate-pulse' : 'bg-gray-200'}`} />
                      <div className={`text-[10px] font-bold truncate ${currentStep >= 2 ? 'text-emerald-800' : 'text-gray-500'}`}>2. Pembayaran</div>
                    </div>

                    {/* Step 3: Verifikasi */}
                    <div className="space-y-1">
                      <div className={`h-1.5 rounded-full ${currentStep >= 3 ? 'bg-emerald-600' : isPending ? 'bg-amber-400 animate-pulse' : 'bg-gray-200'}`} />
                      <div className={`text-[10px] font-bold truncate ${currentStep >= 3 ? 'text-emerald-800' : isPending ? 'text-amber-700' : 'text-gray-500'}`}>3. Verifikasi</div>
                    </div>

                    {/* Step 4: Produksi */}
                    <div className="space-y-1">
                      <div className={`h-1.5 rounded-full ${currentStep >= 4 ? 'bg-emerald-600' : 'bg-gray-200'}`} />
                      <div className={`text-[10px] font-bold truncate ${currentStep >= 4 ? 'text-emerald-800' : 'text-gray-500'}`}>4. Produksi</div>
                    </div>

                    {/* Step 5: Selesai */}
                    <div className="space-y-1">
                      <div className={`h-1.5 rounded-full ${currentStep >= 5 ? 'bg-emerald-600' : 'bg-gray-200'}`} />
                      <div className={`text-[10px] font-bold truncate ${currentStep >= 5 ? 'text-emerald-800' : 'text-gray-500'}`}>5. Selesai</div>
                    </div>
                  </div>
                </div>

                {/* 3. PAYMENT ACTION BANNER */}
                <div className="px-4 sm:px-5 py-3">
                  {isDitolak && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs">
                      <div className="font-bold text-rose-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        Pembayaran Ditolak Panitia!
                      </div>
                      {ord.payment_rejection_reason && (
                        <p className="text-[11px] text-rose-800 bg-white/80 p-2 rounded-lg border border-rose-200 font-medium">
                          <strong>Alasan Penolakan:</strong> "{ord.payment_rejection_reason}"
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenPaymentModal(ord)}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Kirim Ulang Bukti Pembayaran</span>
                      </button>
                    </div>
                  )}

                  {isUnpaid && (
                    <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5">
                        <div className="font-bold text-emerald-950">Pesanan Belum Dibayar</div>
                        <p className="text-[11px] text-emerald-800">
                          Silakan transfer <strong className="font-mono text-emerald-900">Rp {ord.total_amount.toLocaleString('id-ID')}</strong> lalu upload bukti transfer untuk diproses ke vendor konveksi.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenPaymentModal(ord)}
                        className="min-h-[42px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition cursor-pointer shadow-sm whitespace-nowrap flex items-center gap-1.5 self-stretch sm:self-auto justify-center"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>BAYAR SEKARANG</span>
                      </button>
                    </div>
                  )}

                  {isPending && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-amber-900">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>Bukti transfer telah terkirim. Menunggu verifikasi &amp; approval resmi Panitia.</span>
                      </div>
                      {(ord.payment_proof_url || ord.payment_proof_file_id) && (
                        <button
                          type="button"
                          onClick={() => setPreviewProofUrl(ord.payment_proof_url || `https://drive.google.com/file/d/${ord.payment_proof_file_id}/view`)}
                          className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold rounded-lg text-[11px] cursor-pointer flex items-center gap-1 self-stretch sm:self-auto justify-center"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat Bukti Saya</span>
                        </button>
                      )}
                    </div>
                  )}

                  {isLunas && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-emerald-900 font-medium">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>Pembayaran telah LUNAS &amp; diverifikasi oleh Panitia.</span>
                      </div>
                      {(ord.payment_proof_url || ord.payment_proof_file_id) && (
                        <button
                          type="button"
                          onClick={() => setPreviewProofUrl(ord.payment_proof_url || `https://drive.google.com/file/d/${ord.payment_proof_file_id}/view`)}
                          className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 font-bold rounded-lg text-[11px] cursor-pointer flex items-center gap-1 self-stretch sm:self-auto justify-center"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat Bukti Transfer</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. EXPANDED DETAIL CONTENT */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-100 space-y-5 text-xs">
                    {/* Rekening Pembayaran Resmi Card */}
                    {masterData?.payment && (
                      <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-800 uppercase text-[10px] flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-emerald-600" /> Rekening Pembayaran Resmi Panitia
                          </span>
                          <span className="text-[10px] text-gray-400">a.n. {masterData.payment.accountHolder}</span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                          <div>
                            <span className="text-gray-600 text-xs font-semibold">{masterData.payment.bankName}: </span>
                            <strong className="font-mono text-base font-black text-emerald-900">{masterData.payment.accountNumber}</strong>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopyAccount(masterData.payment.accountNumber)}
                            className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto"
                          >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copied ? 'Tersalin' : 'Salin Rekening'}</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-relaxed">{masterData.payment.instructions}</p>
                      </div>
                    )}

                    {/* Detail Items Table */}
                    <div className="space-y-2">
                      <span className="font-bold text-gray-700 uppercase text-[10px] block">
                        Rincian Anggota &amp; Ukuran Baju ({ord.items.length} Orang / Item):
                      </span>

                      <div className="space-y-2">
                        {ord.items.map((itm, idx) => (
                          <div
                            key={itm.item_id || idx}
                            className="p-3 bg-white rounded-xl border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs"
                          >
                            <div className="space-y-0.5">
                              <div className="font-bold text-gray-900">
                                {itm.student_name || ord.buyer_name}{' '}
                                <span className="font-normal text-gray-500 font-mono">({itm.nim || ord.buyer_nim})</span>
                              </div>
                              <div className="text-gray-500 text-[11px]">
                                Kelas: <strong className="font-mono text-gray-800">{itm.class_name || ord.buyer_class}</strong> &bull; Ukuran: <strong className="font-mono text-emerald-700">{itm.size_code}</strong> &bull; Bordir Nama: <strong className="text-gray-800">{itm.custom_name}</strong>
                              </div>
                            </div>

                            <div className="font-mono font-bold text-emerald-800 text-right">
                              Rp {itm.subtotal.toLocaleString('id-ID')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer Contact & Action Buttons */}
                    <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-gray-500 text-[11px] border-t border-gray-200">
                      <div className="space-y-0.5">
                        <span>WhatsApp Pemesan: <strong className="font-mono text-gray-800">{ord.buyer_whatsapp}</strong></span>
                        <div>Metode: <strong className="text-gray-800">{ord.payment_method || 'TRANSFER'}</strong> &bull; Status Order: <strong className="text-gray-800">{ord.status}</strong></div>
                      </div>

                      {/* Cancel Order (Allowed if unpaid) */}
                      {isUnpaid && (
                        <button
                          type="button"
                          onClick={() => handleCancelOrder(ord.order_id, ord.order_number)}
                          className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 font-bold rounded-lg transition cursor-pointer"
                        >
                          Batalkan Pesanan
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* PAYMENT MODAL (TRANSFER & CASH) */}
      {paymentModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Pembayaran &amp; Upload Bukti Transfer</h3>
                <p className="text-xs text-gray-500 font-mono">No. Pesanan: {selectedOrder.order_number}</p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Banner */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Total Yang Harus Ditransfer</span>
                <span className="text-2xl font-black font-mono text-emerald-800">
                  Rp {selectedOrder.total_amount.toLocaleString('id-ID')}
                </span>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-emerald-600 text-white rounded-lg">
                {selectedOrder.item_count} PCS
              </span>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-gray-700">Pilih Metode Pembayaran</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('TRANSFER')}
                  className={`p-3 rounded-xl border text-left font-bold text-xs transition cursor-pointer flex items-center gap-2 ${
                    paymentMethod === 'TRANSFER'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Building className="w-4 h-4 text-emerald-600" />
                  <span>TRANSFER BANK</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`p-3 rounded-xl border text-left font-bold text-xs transition cursor-pointer flex items-center gap-2 ${
                    paymentMethod === 'CASH'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>CASH / TUNAI</span>
                </button>
              </div>
            </div>

            {/* Transfer Bank Detail Box */}
            {paymentMethod === 'TRANSFER' && masterData && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3 text-xs">
                <span className="font-bold text-gray-800 block uppercase text-[10px]">Rekening Bank Panitia</span>
                <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1">
                  <div className="font-bold text-gray-900">{masterData.payment.bankName}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black font-mono text-emerald-800">{masterData.payment.accountNumber}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyAccount(masterData.payment.accountNumber)}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                  <div className="text-gray-600 font-medium">a.n. {masterData.payment.accountHolder}</div>
                </div>
                <p className="text-[11px] text-gray-500">{masterData.payment.instructions}</p>
              </div>
            )}

            {/* Cash Method Box */}
            {paymentMethod === 'CASH' && (
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-3 text-xs">
                <span className="font-bold text-amber-900 block uppercase text-[10px]">Instruksi Pembayaran Tunai</span>
                <p className="text-amber-800 leading-relaxed font-medium">
                  Silakan hubungi Panitia melalui WhatsApp untuk menyerahkan pembayaran uang tunai secara langsung di sekre kampus.
                </p>

                <a
                  href={getWaLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>HUBUNGI PANITIA VIA WHATSAPP</span>
                </a>
              </div>
            )}

            {/* Upload Box */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-gray-700">
                Upload {paymentMethod === 'TRANSFER' ? 'Struk Transfer / Bukti Pembayaran' : 'Foto Kwitansi Tunai'} <span className="text-rose-500">*</span>
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-emerald-500 bg-gray-50 hover:bg-emerald-50/30 rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2"
              >
                <Upload className="w-6 h-6 text-emerald-600" />
                <div className="text-xs font-semibold text-gray-700">
                  {fileName ? (
                    <span className="text-emerald-700 font-mono font-bold">{fileName}</span>
                  ) : (
                    <span>Klik untuk memilih file bukti transfer</span>
                  )}
                </div>
                <span className="text-[10px] text-gray-400">Format file: JPG, JPEG, PNG, atau PDF</span>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={uploading || !fileBase64}
                onClick={handleSubmitPayment}
                className={`py-3 text-white rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                  fileBase64 ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>{uploading ? 'Mengunggah...' : 'KIRIM BUKTI PEMBAYARAN'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW PROOF MODAL */}
      {previewProofUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">Preview Bukti Pembayaran</h3>
              <button
                type="button"
                onClick={() => setPreviewProofUrl(null)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto rounded-xl bg-gray-100 flex items-center justify-center p-2">
              <img
                src={previewProofUrl}
                alt="Bukti Transfer"
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-xs"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewProofUrl(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
