import React, { useState, useEffect, useMemo } from 'react';
import { User, OrderRecord } from '../types';
import { callGAS } from '../gas/gasBridge';
import {
  Compass,
  CheckCircle2,
  Circle,
  ArrowRight,
  UserCheck,
  Shirt,
  Layers,
  ShoppingBag,
  CreditCard,
  Activity,
  MapPin,
  Award,
  Sparkles,
  Info,
  Clock,
  RotateCcw,
  Check
} from 'lucide-react';

interface StudentRoadmapGuideProps {
  user: User;
  onNavigate: (tab: string) => void;
}

export const StudentRoadmapGuide: React.FC<StudentRoadmapGuideProps> = ({ user, onNavigate }) => {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStudentOrders();
  }, [user.userId, user.nim]);

  const fetchStudentOrders = async () => {
    setLoading(true);
    try {
      const res = await callGAS<OrderRecord[]>('getStudentOrders', user.userId, user.nim || user.username);
      if (res.success && res.data) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error('Failed to load student orders for roadmap:', err);
    } finally {
      setLoading(false);
    }
  };

  // Compute dynamic completed states from existing real orders
  const latestOrder = orders.length > 0 ? orders[0] : null;

  const isProfileComplete = Boolean(user.name && (user.nim || user.username));
  const hasOrders = orders.length > 0;
  const isProofUploaded = Boolean(
    latestOrder && (latestOrder.payment_proof_file_id || latestOrder.payment_proof_url)
  );
  const isPaid = Boolean(
    latestOrder &&
      ((latestOrder.payment_status || '').toUpperCase() === 'LUNAS' ||
        (latestOrder.payment_status || '').toUpperCase() === 'PAID' ||
        (latestOrder.payment_status || '').toUpperCase() === 'APPROVED')
  );
  const isInProduction = Boolean(
    latestOrder &&
      (latestOrder.production_status === 'Sedang Diproduksi' ||
        latestOrder.production_status === 'Selesai' ||
        (latestOrder.production_percentage || 0) > 0)
  );
  const isPickupReady = Boolean(
    latestOrder &&
      (latestOrder.pickup_status === 'Siap Diambil' || latestOrder.production_status === 'Selesai')
  );
  const isCompleted = Boolean(
    latestOrder &&
      (latestOrder.pickup_status === 'Sudah Diambil' || latestOrder.status === 'SELESAI')
  );

  const steps = [
    {
      step: 1,
      id: 'step-1-akun',
      title: 'STEP 1 — LENGKAPI DATA AKUN',
      description: 'Pastikan nama lengkap, NIM, kelas, WhatsApp, dan data akun sudah benar sebelum memesan.',
      targetTab: 'beranda',
      buttonLabel: 'Buka Profil & Beranda',
      icon: <UserCheck className="w-5 h-5 text-emerald-600" />,
      isAutoCompleted: isProfileComplete,
      tips: `Akun terdaftar: ${user.name} (${user.nim || user.username || '-'}), Kelas: ${user.className || (user as any).class_name || '-'}`
    },
    {
      step: 2,
      id: 'step-2-desain',
      title: 'STEP 2 — LIHAT DESAIN PDH',
      description: 'Lihat spesifikasi model, panduan ukuran (Size Chart), dan ketentuan resmi pemesanan PDH.',
      targetTab: 'beranda',
      buttonLabel: 'Lihat Desain & Size Chart',
      icon: <Shirt className="w-5 h-5 text-indigo-600" />,
      isAutoCompleted: true,
      tips: 'Periksa panduan lebar dada dan panjang baju agar ukuran pas saat dikenakan.'
    },
    {
      step: 3,
      id: 'step-3-jenis',
      title: 'STEP 3 — PILIH JENIS PESANAN',
      description: 'Pilih sesuai kondisi: Pesanan Pribadi (1 orang) atau Pesanan Kolektif (kelompok/kelas).',
      targetTab: 'pesan',
      buttonLabel: 'Pilih Jenis Pesanan',
      icon: <Layers className="w-5 h-5 text-purple-600" />,
      isAutoCompleted: hasOrders,
      tips: 'Jika sudah didaftarkan oleh ketua kelas dalam pesanan kolektif, gunakan fitur pelacakan kolektif.'
    },
    {
      step: 4,
      id: 'step-4-pesan',
      title: 'STEP 4 — BUAT PESANAN',
      description: 'Isi data pemesan, pilih ukuran PDH, masukkan nama bordir kustom, dan kirimkan pesanan.',
      targetTab: 'pesan',
      buttonLabel: 'Buat Pesanan Baru',
      icon: <ShoppingBag className="w-5 h-5 text-teal-600" />,
      isAutoCompleted: hasOrders,
      tips: hasOrders
        ? `Pesanan aktif Anda: ${latestOrder?.order_number} (${latestOrder?.order_type})`
        : 'Formulir otomatis memeriksa batas kuota dan tanggal akhir periode Pre-Order.'
    },
    {
      step: 5,
      id: 'step-5-periksa',
      title: 'STEP 5 — PERIKSA PESANAN',
      description: 'Periksa detail pesanan, jumlah item, ukuran, nama bordir, total harga, dan nomor rekening panitia.',
      targetTab: 'pesanan_saya',
      buttonLabel: 'Buka Pesanan Saya',
      icon: <Clock className="w-5 h-5 text-blue-600" />,
      isAutoCompleted: hasOrders,
      tips: 'Simpan No. Pesanan Anda sebagai bukti transaksi saat verifikasi atau pengambilan.'
    },
    {
      step: 6,
      id: 'step-6-bayar',
      title: 'STEP 6 — PEMBAYARAN',
      description: 'Lakukan transfer pembayaran sesuai nominal, lalu upload bukti transfer dan tunggu persetujuan panitia.',
      targetTab: 'pembayaran',
      buttonLabel: 'Buka Pembayaran & Upload Bukti',
      icon: <CreditCard className="w-5 h-5 text-emerald-600" />,
      isAutoCompleted: isPaid || isProofUploaded,
      tips: isPaid
        ? 'Status: Pembayaran LUNAS & telah disetujui panitia.'
        : isProofUploaded
        ? 'Status: Bukti transfer terkirim, menunggu approval panitia.'
        : 'Pastikan mengunggah foto struk/screenshot transfer yang jelas dan terbaca.'
    },
    {
      step: 7,
      id: 'step-7-progres',
      title: 'STEP 7 — PANTAU PROGRES',
      description: 'Pantau perkembangan pengerjaan PDH di vendor konveksi dari tahap kain, pola, jahit, hingga selesai.',
      targetTab: 'progres',
      buttonLabel: 'Buka Progres PDH',
      icon: <Activity className="w-5 h-5 text-amber-600" />,
      isAutoCompleted: isInProduction,
      tips: isInProduction
        ? `Progres saat ini: ${latestOrder?.production_percentage || 0}% (${latestOrder?.production_status || 'Dalam Pengerjaan'})`
        : 'Progres pengerjaan diperbarui berkala disertai foto perkembangan langsung dari vendor.'
    },
    {
      step: 8,
      id: 'step-8-ambil',
      title: 'STEP 8 — PENGAMBILAN',
      description: 'Setelah seragam PDH selesai diproduksi, ikuti informasi lokasi, jam operasional, dan syarat pengambilan.',
      targetTab: 'progres',
      buttonLabel: 'Lihat Info Pengambilan',
      icon: <MapPin className="w-5 h-5 text-rose-600" />,
      isAutoCompleted: isPickupReady,
      tips: 'Tunjukkan Kartu Tanda Mahasiswa (KTM) atau Nomor Pesanan saat mengambil seragam di sekre.'
    },
    {
      step: 9,
      id: 'step-9-selesai',
      title: 'STEP 9 — SELESAI',
      description: 'Pesanan selesai setelah seragam PDH diterima. Selamat mengenakan PDH kebanggaan kampus Anda!',
      targetTab: 'pesanan_saya',
      buttonLabel: 'Lihat Status Akhir',
      icon: <Award className="w-5 h-5 text-emerald-600" />,
      isAutoCompleted: isCompleted,
      tips: 'Periksa kelengkapan kancing dan bordir nama saat seragam PDH pertama kali diterima.'
    }
  ];

  const totalSteps = steps.length;
  const completedCount = steps.filter((s) => s.isAutoCompleted).length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  // Find the first non-completed step as current active step
  const activeStepNumber = steps.find((s) => !s.isAutoCompleted)?.step || totalSteps;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Compass className="w-4 h-4" /> Panduan Mahasiswa
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Roadmap Pemesanan PDH Mahasiswa
          </h2>
          <p className="text-xs text-gray-500 mt-1 max-w-xl">
            Panduan lengkap langkah demi langkah mulai dari pengecekan akun, pemilihan ukuran baju, konfirmasi pembayaran, hingga pengambilan seragam PDH.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchStudentOrders}
          disabled={loading}
          className="min-h-[44px] px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>Cek Status Terbaru</span>
        </button>
      </div>

      {/* Progress Summary Card */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 p-5 rounded-2xl text-white shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <span className="font-black text-sm uppercase tracking-wider text-emerald-100">
              Progres Pemesanan Anda
            </span>
          </div>
          <div className="text-xs font-bold text-emerald-200">
            <strong className="text-white text-base">{completedCount}</strong> dari <strong className="text-white">{totalSteps}</strong> Langkah Selesai ({progressPercent}%)
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-emerald-500/30 p-0.5">
          <div
            className="bg-gradient-to-r from-amber-300 via-emerald-400 to-teal-300 h-full rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        <p className="text-[11px] text-emerald-100/80">
          Langkah bertanda <strong className="text-white">✓ Selesai</strong> terdeteksi otomatis dari status akun dan pesanan Anda. Klik tombol <strong className="text-white">"Buka Menu"</strong> pada kartu aktif untuk melanjutkan.
        </p>
      </div>

      {/* Steps List */}
      <div className="space-y-3">
        {steps.map((st) => {
          const isDone = st.isAutoCompleted;
          const isCurrent = st.step === activeStepNumber;

          return (
            <div
              key={st.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                isDone
                  ? 'bg-emerald-50/40 border-emerald-200/80'
                  : isCurrent
                  ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                  : 'bg-white border-gray-200 shadow-2xs hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Left: Step Info & Status Icon */}
                <div className="flex items-start gap-3 sm:gap-4 flex-1">
                  <div className="mt-0.5 flex-shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-100" />
                    ) : isCurrent ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center animate-pulse">
                        {st.step}
                      </div>
                    ) : (
                      <Circle className="w-6 h-6 text-gray-300" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        isDone
                          ? 'bg-emerald-100 text-emerald-800'
                          : isCurrent
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {st.title}
                      </span>

                      {isDone && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" /> Selesai
                        </span>
                      )}

                      {isCurrent && !isDone && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
                          Langkah Aktif Saat Ini
                        </span>
                      )}
                    </div>

                    <p className={`text-xs font-semibold leading-relaxed ${isDone ? 'text-gray-700' : 'text-gray-900'}`}>
                      {st.description}
                    </p>

                    <div className="text-[11px] text-gray-500 flex items-center gap-1.5 pt-0.5">
                      <Info className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>{st.tips}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Direct Navigation Action Button */}
                <div className="flex items-center gap-2 sm:self-center pl-9 sm:pl-0">
                  <button
                    type="button"
                    onClick={() => onNavigate(st.targetTab)}
                    className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs whitespace-nowrap ${
                      isCurrent
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100 ring-2 ring-emerald-300'
                        : isDone
                        ? 'bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    <span>{st.buttonLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
