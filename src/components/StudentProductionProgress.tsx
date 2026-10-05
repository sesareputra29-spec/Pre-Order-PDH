import React, { useState, useEffect } from 'react';
import { User, OrderRecord, PickupInfoSettings, PickupStatus } from '../types';
import { api } from '../services/apiClient';
import {
  Factory,
  Clock,
  Shirt,
  Loader2,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  CheckCircle2,
  PackageCheck,
  MapPin,
  X,
  Sparkles,
  Calendar,
  Phone,
  Info,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface StudentProductionProgressProps {
  user: User;
}

export const StudentProductionProgress: React.FC<StudentProductionProgressProps> = ({ user }) => {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [pickupSettings, setPickupSettings] = useState<PickupInfoSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [activePhotoModalUrl, setActivePhotoModalUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [user.userId]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ordRes, pickupRes] = await Promise.all([
        api.getStudentOrders(user.nim || user.username || user.userId),
        api.getPickupSettings()
      ]);

      if (ordRes.success && ordRes.data) {
        setOrders(ordRes.data);
      } else if (!ordRes.success) {
        setError(ordRes.message || 'Gagal memuat pesanan mahasiswa.');
      }

      if (pickupRes.success && pickupRes.data) {
        setPickupSettings(pickupRes.data);
      }
    } catch (err: any) {
      console.error('Gagal memuat data progres & pengambilan:', err);
      setError(err?.message || 'Gagal memuat data progres.');
    } finally {
      setLoading(false);
    }
  };

  const DEFAULT_DESIGN_PHOTO = 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80';

  const getPrimaryPhoto = (ord: OrderRecord): { url: string; isUploadedProgressPhoto: boolean; label: string } => {
    // 1. Check production history for latest photo by updated_at timestamp
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

    // 2. Fallback to order's direct production_photo_url if present
    if (ord.production_photo_url && ord.production_photo_url.trim() !== '') {
      return {
        url: ord.production_photo_url,
        isUploadedProgressPhoto: true,
        label: 'Foto Progres Vendor (Terbaru)'
      };
    }

    // 3. Fallback to default product design image if no progress photo uploaded yet
    return {
      url: DEFAULT_DESIGN_PHOTO,
      isUploadedProgressPhoto: false,
      label: 'Desain Resmi PDH Kampus'
    };
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  // 5 Stages of Production Progression
  const STAGES = [
    'Belum Diproduksi',
    'Sedang Diproduksi',
    'Selesai',
    'Siap Diambil',
    'Sudah Diambil'
  ];

  const getStageIndex = (prodStatus: string, pickupStatus?: string, pct?: number) => {
    if (pickupStatus === 'Sudah Diambil') return 4;
    if (pickupStatus === 'Siap Diambil' || prodStatus === 'Siap Diambil') return 3;
    if (prodStatus === 'Selesai' || pct === 100) return 2;
    if (prodStatus === 'Sedang Diproduksi' || (pct && pct > 0)) return 1;
    return 0;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Lightbox Image Preview Modal */}
      {activePhotoModalUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-4 max-w-2xl w-full space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-600" /> Foto Progres Produksi Vendor
              </span>
              <button
                type="button"
                onClick={() => setActivePhotoModalUrl(null)}
                className="text-gray-400 hover:text-gray-600 font-bold p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center max-h-[75vh]">
              <img
                src={activePhotoModalUrl}
                alt="Foto Progres Vendor"
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Banner Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white p-6 rounded-2xl shadow-md space-y-2">
        <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider">
          <Factory className="w-4 h-4" /> Progres Produksi &amp; Status Baju PDH
        </div>
        <h2 className="text-xl font-black tracking-tight">Pantau Tahap Pembuatan Baju PDH Kamu</h2>
        <p className="text-xs text-emerald-100 max-w-2xl leading-relaxed">
          Lacak tahapan pengerjaan vendor, persentase progres, serta lokasi &amp; jadwal resmi pengambilan PDH setelah selesai diproduksi.
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-red-700 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Coba Lagi
          </button>
        </div>
      )}

      {/* Orders Progress Cards */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 shadow-xs">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
          <p className="text-xs text-gray-500 font-medium">Memuat status progres produksi...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 space-y-3 shadow-xs">
          <Shirt className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="font-bold text-gray-800 text-sm">Belum Ada Pesanan Aktif</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Kamu belum memiliki pesanan PDH. Silakan buat pesanan baru melalui menu <strong>Pesan PDH</strong>.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((ord) => {
            const pct = ord.production_percentage || 0;
            const currentStatus = ord.production_status || 'Belum Diproduksi';
            const isExpanded = expandedOrders[ord.order_id] || false;
            const currentStageIdx = getStageIndex(currentStatus, ord.pickup_status, pct);

            return (
              <div key={ord.order_id} className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden space-y-5 p-5 sm:p-6">
                {/* Header Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black font-mono text-gray-900">{ord.order_number}</span>
                      <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-800 font-bold text-[10px] rounded-full uppercase border border-indigo-200">
                        {ord.order_type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Pemesan: <strong className="text-gray-800">{ord.buyer_name}</strong> ({ord.buyer_class})
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">Status Tahap Saat Ini</span>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-bold text-xs rounded-full border border-emerald-300 inline-block mt-0.5">
                      {STAGES[currentStageIdx]}
                    </span>
                  </div>
                </div>

                {/* 5-STAGE TIMELINE STEPPER (Prioritas Utama) */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-800 uppercase tracking-wider text-[11px]">Progres Pengerjaan Vendor</span>
                    <span className="text-emerald-700 text-lg font-black font-mono">{pct}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden shadow-inner">
                    <div
                      className={`h-full transition-all duration-500 ${
                        pct === 100 ? 'bg-emerald-500' : pct > 40 ? 'bg-blue-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Visual Stepper */}
                  <div className="grid grid-cols-5 gap-1 pt-2">
                    {STAGES.map((stageName, idx) => {
                      const isDone = idx < currentStageIdx;
                      const isCurrent = idx === currentStageIdx;

                      return (
                        <div key={idx} className="flex flex-col items-center text-center space-y-1">
                          <div
                            className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center transition ${
                              isCurrent
                                ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 font-black'
                                : isDone
                                ? 'bg-emerald-100 text-emerald-800 font-bold'
                                : 'bg-gray-200 text-gray-400'
                            }`}
                          >
                            {isDone ? '✓' : idx + 1}
                          </div>
                          <span
                            className={`text-[9px] leading-tight sm:text-[10px] font-semibold ${
                              isCurrent ? 'text-emerald-800 font-bold' : isDone ? 'text-gray-700' : 'text-gray-400'
                            }`}
                          >
                            {stageName}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {ord.production_notes && (
                    <p className="text-xs text-gray-700 pt-1 border-t border-gray-200/80 mt-2">
                      Catatan Vendor: <strong>{ord.production_notes}</strong>
                    </p>
                  )}
                </div>

                {/* PICKUP INFORMATION CARD (Jika Selesai / Siap Diambil / Sudah Diambil) */}
                {(currentStageIdx >= 3 || ord.pickup_status === 'Siap Diambil' || ord.pickup_status === 'Sudah Diambil') && (
                  <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                      <span className="text-xs font-black uppercase text-emerald-900 tracking-wider flex items-center gap-1.5">
                        <PackageCheck className="w-4 h-4 text-emerald-600" /> Informasi Pengambilan PDH
                      </span>
                      <span
                        className={`px-3 py-0.5 rounded-full text-[10px] font-bold ${
                          ord.pickup_status === 'Sudah Diambil'
                            ? 'bg-emerald-700 text-white'
                            : 'bg-emerald-600 text-white animate-pulse'
                        }`}
                      >
                        {ord.pickup_status === 'Sudah Diambil' ? 'SUDAH DIAMBIL' : 'SIAP DIAMBIL'}
                      </span>
                    </div>

                    {pickupSettings && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3.5 rounded-xl border border-emerald-200">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">Lokasi Pengambilan</span>
                          <span className="font-bold text-gray-900">{pickupSettings.location}</span>
                          <p className="text-[11px] text-gray-500 mt-0.5">{pickupSettings.fullAddress}</p>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">Jadwal &amp; Jam Operasional</span>
                          <span className="font-bold text-emerald-800">{pickupSettings.startDate} s/d {pickupSettings.endDate}</span>
                          <p className="text-[11px] text-gray-600 font-mono mt-0.5">{pickupSettings.pickupHours}</p>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">Kontak Panitia</span>
                          <span className="font-bold text-indigo-700">{pickupSettings.contactPerson}</span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">Instruksi Tambahan</span>
                          <p className="text-[11px] text-gray-700 whitespace-pre-line mt-0.5">{pickupSettings.instructions}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Visual Foto Utama Order (Foto Progres Vendor Terbaru / Default Design Fallback) */}
                {(() => {
                  const primaryPhoto = getPrimaryPhoto(ord);
                  return (
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 border border-gray-200 p-4 rounded-2xl">
                      <div
                        onClick={() => setActivePhotoModalUrl(primaryPhoto.url || null)}
                        className="w-full sm:w-44 h-36 bg-slate-200 rounded-xl overflow-hidden border border-gray-200 cursor-pointer hover:opacity-90 transition relative group flex-shrink-0"
                      >
                        <img
                          src={primaryPhoto.url}
                          alt={primaryPhoto.label}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-bold">
                          Klik Perbesar
                        </div>
                        <span
                          className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-black uppercase shadow-xs ${
                            primaryPhoto.isUploadedProgressPhoto
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-700 text-white'
                          }`}
                        >
                          {primaryPhoto.isUploadedProgressPhoto ? '📸 FOTO PROGRES VENDOR' : 'DESAIN RESMI PDH'}
                        </span>
                      </div>

                      <div className="space-y-1.5 flex-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              primaryPhoto.isUploadedProgressPhoto
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-gray-100 text-gray-700 border border-gray-300'
                            }`}
                          >
                            {primaryPhoto.label}
                          </span>
                        </div>
                        <p className="text-gray-600 leading-relaxed text-[11px]">
                          {primaryPhoto.isUploadedProgressPhoto
                            ? 'Panitia telah mengunggah foto progres pengerjaan vendor terbaru untuk pesanan ini. Foto ini menjadi foto utama tampilan pesanan Anda.'
                            : 'Belum ada foto progres dari vendor untuk pesanan ini. Menampilkan foto sampel desain resmi PDH Kampus sebagai foto utama.'}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Expanded Details: Item Sizes & History */}
                <div className="border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={() => toggleExpand(ord.order_id)}
                    className="w-full flex items-center justify-between text-xs font-bold text-indigo-700 hover:text-indigo-900 transition cursor-pointer py-1"
                  >
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" /> Lihat Detail Item &amp; Catatan Riwayat Progres ({ord.production_history?.length || 0})
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 space-y-3 pt-1 animate-fade-in">
                      {/* Rincian Ukuran Item */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase text-gray-400 block">Rincian Item Ukuran</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {ord.items.map((itm, i) => (
                            <div key={itm.item_id || i} className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                              <div>
                                <div className="font-bold text-gray-900">{itm.student_name || ord.buyer_name}</div>
                                <div className="text-[10px] text-gray-500 font-mono">Bordir: "{itm.custom_name}"</div>
                              </div>
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 font-bold text-xs rounded-lg font-mono">
                                {itm.size_code}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Timeline Log History */}
                      {ord.production_history && ord.production_history.length > 0 && (
                        <div className="space-y-2 pt-1 border-t border-gray-100">
                          <span className="text-[10px] font-bold uppercase text-gray-400 block">Riwayat Catatan Update</span>
                          <div className="space-y-2 pl-2 border-l-2 border-indigo-200">
                            {ord.production_history.map((hist, idx) => (
                              <div key={hist.progress_id || idx} className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-1">
                                <div className="flex items-center justify-between font-bold">
                                  <span className="text-emerald-800 font-mono">{hist.percentage}% — {hist.production_status}</span>
                                  <span className="text-[10px] text-gray-400 font-normal">{new Date(hist.updated_at).toLocaleString('id-ID')}</span>
                                </div>
                                <p className="text-gray-700 font-medium">{hist.notes || '-'}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
