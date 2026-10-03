import React, { useState, useEffect, useRef } from 'react';
import { User, OrderRecord, PDHMasterData } from '../types';
import { callGAS } from '../gas/gasBridge';
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
  RefreshCw
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
  }, [user.userId]);

  const loadMasterData = async () => {
    try {
      const res = await callGAS<PDHMasterData>('getPDHMasterData');
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
      const res = await callGAS<OrderRecord[]>('getStudentOrders', user.userId);
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
    setMimeType(file.type || (ext === 'pdf' ? 'application/pdf' : 'image/jpeg'));

    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      setFileBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPayment = async () => {
    if (!selectedOrder) return;
    if (!fileBase64) {
      setToast({
        type: 'error',
        message: paymentMethod === 'TRANSFER' ? 'Bukti transfer wajib diunggah!' : 'Kwitansi pembayaran tunai wajib diunggah!'
      });
      return;
    }

    setUploading(true);
    try {
      const res = await callGAS(
        'uploadPaymentProof',
        user.userId,
        selectedOrder.order_id,
        paymentMethod,
        fileBase64,
        fileName,
        mimeType
      );

      if (res.success) {
        setToast({
          type: 'success',
          message: 'Bukti pembayaran berhasil diunggah! Status pembayaran kini MENUNGGU APPROVAL.'
        });
        setPaymentModalOpen(false);
        loadOrders();
      } else {
        setToast({ type: 'error', message: res.message || 'Gagal mengunggah bukti pembayaran.' });
      }
    } catch (e: any) {
      setToast({ type: 'error', message: e.message });
    } finally {
      setUploading(false);
    }
  };

  // WhatsApp Link Helper
  const getWaLink = () => {
    const waContact = masterData?.info.pdhContact || '081234567890';
    const waClean = waContact.replace(/\D/g, '').replace(/^0/, '62');
    const msg = encodeURIComponent(
      `Halo Panitia PDH Kampus, saya ${user.name} (${selectedOrder?.buyer_class || ''}) hendak melakukan pembayaran CASH/Tunai untuk Nomor Pesanan: ${selectedOrder?.order_number}. Mohon info waktu dan tempat penyerahan.`
    );
    return `https://wa.me/${waClean}?text=${msg}`;
  };

  if (loading && orders.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 shadow-xs">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-2" />
        <p className="text-xs text-gray-500 font-medium">Memuat Daftar Pesanan &amp; Status Pembayaran...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center space-y-3 shadow-xs">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-gray-900 text-base">Belum Ada Pesanan</h3>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          Anda belum memiliki pesanan. Silakan buat pesanan baru melalui menu <strong>Pesan PDH</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
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
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" /> Status Pesanan &amp; Pembayaran Saya ({orders.length})
          </h3>
          <p className="text-xs text-gray-500">Kelola pembayaran transfer/cash dan pantau verifikasi panitia.</p>
        </div>

        <button
          type="button"
          onClick={loadOrders}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="space-y-4">
        {orders.map((ord) => {
          const isExpanded = expandedOrderId === ord.order_id;
          const isLunas = ord.payment_status === 'LUNAS' || ord.payment_status === 'PAID';
          const isPending = ord.payment_status === 'MENUNGGU APPROVAL' || ord.payment_status === 'PENDING';
          const isDitolak = ord.payment_status === 'DITOLAK' || ord.payment_status === 'REJECTED';
          const isUnpaid = !isLunas && !isPending && !isDitolak;

          return (
            <div key={ord.order_id} className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden transition space-y-0">
              {/* Main Card Header */}
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

                    {/* Payment Badge Requirement */}
                    {isLunas && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Disetujui (Lunas)
                      </span>
                    )}
                    {isPending && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 animate-pulse">
                        <Clock className="w-3 h-3" /> Menunggu Approval
                      </span>
                    )}
                    {isDitolak && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" /> Ditolak
                      </span>
                    )}
                    {isUnpaid && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-300">
                        Belum Bayar
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500">
                    Pemesan: <strong className="text-gray-800 font-semibold">{ord.buyer_name}</strong> ({ord.buyer_class}) &bull; {new Date(ord.created_at).toLocaleString('id-ID')}
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

              {/* Payment Action Alert Banner inside Order Card */}
              <div className="px-4 sm:px-5 pb-4">
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
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs transition cursor-pointer shadow-xs flex items-center gap-1"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Kirim Bukti Pembayaran Kembali</span>
                    </button>
                  </div>
                )}

                {isUnpaid && (
                  <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 text-xs">
                    <div className="text-emerald-900 font-medium">
                      Pesanan belum dibayar. Silakan lakukan pembayaran via Transfer / Cash.
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenPaymentModal(ord)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition cursor-pointer shadow-xs whitespace-nowrap flex items-center gap-1.5"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>BAYAR SEKARANG</span>
                    </button>
                  </div>
                )}

                {isPending && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-900">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>Bukti telah diunggah. Menunggu verifikasi Panitia.</span>
                    </div>
                    {(ord.payment_proof_url || ord.payment_proof_file_id) && (
                      <button
                        type="button"
                        onClick={() => setPreviewProofUrl(ord.payment_proof_url || `https://drive.google.com/file/d/${ord.payment_proof_file_id}/view`)}
                        className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold rounded-lg text-[11px] cursor-pointer"
                      >
                        Lihat Bukti Saya
                      </button>
                    )}
                  </div>
                )}

                {isLunas && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 text-xs text-emerald-900 font-medium">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Pembayaran lunas &amp; disetujui resmi oleh Panitia.</span>
                    </div>
                    {(ord.payment_proof_url || ord.payment_proof_file_id) && (
                      <button
                        type="button"
                        onClick={() => setPreviewProofUrl(ord.payment_proof_url || `https://drive.google.com/file/d/${ord.payment_proof_file_id}/view`)}
                        className="px-3 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 font-bold rounded-lg text-[11px] cursor-pointer"
                      >
                        Lihat Bukti
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Card Expanded Item Details */}
              {isExpanded && (
                <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-100 space-y-4 text-xs">
                  {/* Foto Utama Progres / Desain Order */}
                  {(() => {
                    const primaryPhoto = getPrimaryPhoto(ord);
                    return (
                      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white border border-gray-200 p-3 rounded-xl">
                        <div
                          onClick={() => setPreviewProofUrl(primaryPhoto.url || null)}
                          className="w-full sm:w-32 h-28 bg-slate-100 rounded-lg overflow-hidden border border-gray-200 cursor-pointer hover:opacity-90 transition relative group flex-shrink-0"
                        >
                          <img
                            src={primaryPhoto.url}
                            alt={primaryPhoto.label}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[9px] font-bold">
                            Perbesar
                          </div>
                        </div>
                        <div className="space-y-1 flex-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase inline-block ${
                              primaryPhoto.isUploadedProgressPhoto
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-gray-100 text-gray-700 border border-gray-300'
                            }`}
                          >
                            {primaryPhoto.label}
                          </span>
                          <p className="text-gray-500 text-[11px]">
                            {primaryPhoto.isUploadedProgressPhoto
                              ? 'Foto progres pengerjaan vendor resmi terbaru untuk pesanan Anda.'
                              : 'Foto sampel desain resmi PDH Kampus. Foto progres vendor akan muncul jika sudah diunggah.'}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  <span className="font-bold text-gray-700 uppercase text-[10px] block">Rincian Anggota &amp; Ukuran Baju</span>

                  <div className="space-y-2">
                    {ord.items.map((itm, idx) => (
                      <div key={itm.item_id || idx} className="p-3 bg-white rounded-xl border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="font-bold text-gray-900">
                            {itm.student_name || ord.buyer_name} <span className="font-normal text-gray-500 font-mono">({itm.nim || ord.buyer_nim})</span>
                          </div>
                          <div className="text-gray-500 text-[11px]">
                            Kelas: <strong className="font-mono text-gray-800">{itm.class_name || ord.buyer_class}</strong> &bull; Ukuran: <strong className="font-mono text-emerald-700">{itm.size_code}</strong> &bull; Bordir: <strong className="text-gray-800">{itm.custom_name}</strong>
                          </div>
                        </div>

                        <div className="font-mono font-bold text-emerald-800 text-right">
                          Rp {itm.subtotal.toLocaleString('id-ID')}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-gray-500 text-[11px]">
                    <span>Kontak WhatsApp Pemesan: <strong className="font-mono text-gray-800">{ord.buyer_whatsapp}</strong></span>
                    <span className="text-emerald-700 font-bold uppercase">
                      Metode: {ord.payment_method || 'TRANSFER'} &bull; Status: {ord.payment_status}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* PAYMENT SELECTION & UPLOAD MODAL */}
      {paymentModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Pembayaran Pesanan PDH</h3>
                <p className="text-xs text-gray-500 font-mono">Order No: {selectedOrder.order_number}</p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Amount Banner */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Total Yang Harus Dibayar</span>
                <span className="text-2xl font-black font-mono text-emerald-800">
                  Rp {selectedOrder.total_amount.toLocaleString('id-ID')}
                </span>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-emerald-600 text-white rounded-lg">
                {selectedOrder.item_count} PCS
              </span>
            </div>

            {/* Payment Method Tabs (TRANSFER / CASH) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-gray-700">Pilih Metode Pembayaran</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('TRANSFER')}
                  className={`p-3 rounded-xl border text-left font-bold text-xs transition cursor-pointer flex items-center gap-2 ${
                    paymentMethod === 'TRANSFER'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Building className="w-4 h-4 text-indigo-600" />
                  <span>TRANSFER BANK</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`p-3 rounded-xl border text-left font-bold text-xs transition cursor-pointer flex items-center gap-2 ${
                    paymentMethod === 'CASH'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>CASH / TUNAI</span>
                </button>
              </div>
            </div>

            {/* TRANSFER METHOD CONTENT */}
            {paymentMethod === 'TRANSFER' && masterData && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3 text-xs">
                <span className="font-bold text-gray-800 block uppercase text-[10px]">Rekening Tujuan Pembayaran</span>
                <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1">
                  <div className="font-bold text-gray-900">{masterData.payment.bankName}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black font-mono text-indigo-700">{masterData.payment.accountNumber}</span>
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

            {/* CASH METHOD CONTENT */}
            {paymentMethod === 'CASH' && (
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-3 text-xs">
                <span className="font-bold text-amber-900 block uppercase text-[10px]">Instruksi Pembayaran Tunai</span>
                <p className="text-amber-800 leading-relaxed font-medium">
                  "Silakan hubungi Panitia melalui WhatsApp untuk menentukan waktu dan tempat pembayaran."
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

                <p className="text-[11px] text-amber-700 pt-1">
                  * Setelah melakukan pembayaran uang secara langsung, minta kwitansi dari panitia dan upload foto kwitansi di bawah.
                </p>
              </div>
            )}

            {/* FILE UPLOAD SECTION */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-gray-700">
                Upload {paymentMethod === 'TRANSFER' ? 'Bukti Transfer' : 'Kwitansi Pembayaran'} <span className="text-rose-500">*</span>
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
                className="border-2 border-dashed border-gray-300 hover:border-indigo-500 bg-gray-50 hover:bg-indigo-50/30 rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2"
              >
                <Upload className="w-6 h-6 text-indigo-600" />
                <div className="text-xs font-semibold text-gray-700">
                  {fileName ? (
                    <span className="text-indigo-700 font-mono font-bold">{fileName}</span>
                  ) : (
                    <span>Klik untuk memilih file bukti ({paymentMethod === 'TRANSFER' ? 'Transfer' : 'Kwitansi'})</span>
                  )}
                </div>
                <span className="text-[10px] text-gray-400">Format diperbolehkan: JPG, JPEG, PNG, PDF</span>
              </div>
            </div>

            {/* MODAL ACTION BUTTONS */}
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
                <span>KIRIM BUKTI PEMBAYARAN</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROOF PREVIEW MODAL */}
      {previewProofUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" /> Bukti Pembayaran Saya
              </h3>
              <button
                type="button"
                onClick={() => setPreviewProofUrl(null)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-center min-h-[220px]">
              {previewProofUrl.startsWith('data:image') || previewProofUrl.includes('unsplash') || previewProofUrl.endsWith('.jpg') || previewProofUrl.endsWith('.png') ? (
                <img
                  src={previewProofUrl}
                  alt="Bukti Pembayaran"
                  className="max-h-[350px] rounded-lg object-contain border border-gray-200 shadow-xs"
                />
              ) : previewProofUrl.startsWith('data:application/pdf') ? (
                <div className="text-center p-6 space-y-2">
                  <FileText className="w-12 h-12 text-rose-500 mx-auto" />
                  <p className="font-bold text-gray-800 text-xs">Dokumen Bukti PDF</p>
                  <a
                    href={previewProofUrl}
                    download="bukti_pembayaran.pdf"
                    className="inline-block px-4 py-2 bg-rose-600 text-white font-bold rounded-xl text-xs"
                  >
                    Download File PDF
                  </a>
                </div>
              ) : (
                <div className="text-center p-6 space-y-3">
                  <ExternalLink className="w-10 h-10 text-emerald-600 mx-auto" />
                  <p className="font-bold text-gray-800 text-xs">File Bukti Terverifikasi</p>
                  <a
                    href={previewProofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
                  >
                    <span>Lihat File Bukti</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewProofUrl(null)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
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
