import React, { useState, useEffect } from 'react';
import {
  Compass,
  CheckCircle2,
  Circle,
  ArrowRight,
  Shirt,
  Calendar,
  Users,
  Package,
  CreditCard,
  Factory,
  FileText,
  MapPin,
  Activity,
  Award,
  Sparkles,
  RotateCcw,
  ExternalLink,
  Info
} from 'lucide-react';

interface PanitiaRoadmapGuideProps {
  onNavigate: (tab: string) => void;
}

interface RoadmapStep {
  step: number;
  id: string;
  title: string;
  description: string;
  targetTab: string;
  buttonLabel: string;
  category: 'SETUP' | 'ORDER' | 'PRODUKSI' | 'DISTRIBUSI';
  icon: React.ReactNode;
  tips: string;
}

const ROADMAP_STORAGE_KEY = 'pdh_panitia_roadmap_progress';

export const PanitiaRoadmapGuide: React.FC<PanitiaRoadmapGuideProps> = ({ onNavigate }) => {
  const [completedSteps, setCompletedSteps] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(ROADMAP_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [1];
    } catch {
      return [1];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(ROADMAP_STORAGE_KEY, JSON.stringify(completedSteps));
    } catch (e) {
      console.error('Failed to save roadmap progress:', e);
    }
  }, [completedSteps]);

  const toggleStepCompleted = (stepNum: number) => {
    setCompletedSteps((prev) => {
      if (prev.includes(stepNum)) {
        return prev.filter((s) => s !== stepNum);
      } else {
        return [...prev, stepNum].sort((a, b) => a - b);
      }
    });
  };

  const resetRoadmapProgress = () => {
    setCompletedSteps([]);
    try {
      localStorage.removeItem(ROADMAP_STORAGE_KEY);
    } catch {}
  };

  const steps: RoadmapStep[] = [
    {
      step: 1,
      id: 'step-1-pdh',
      title: 'STEP 1 — PENGATURAN PDH',
      description: 'Atur produk, ukuran, harga, dan desain PDH sebelum periode pemesanan dibuka.',
      targetTab: 'pengaturan_pdh',
      buttonLabel: 'Buka Pengaturan PDH',
      category: 'SETUP',
      icon: <Shirt className="w-5 h-5 text-indigo-600" />,
      tips: 'Pastikan panduan ukuran (Size Chart) dan rekening bank pembayaran sudah tepat.'
    },
    {
      step: 2,
      id: 'step-2-po',
      title: 'STEP 2 — PERIODE PRE ORDER',
      description: 'Buat dan atur periode Pre Order sebelum mahasiswa mulai melakukan pemesanan.',
      targetTab: 'pengaturan_pdh',
      buttonLabel: 'Buka Pengaturan PO',
      category: 'SETUP',
      icon: <Calendar className="w-5 h-5 text-purple-600" />,
      tips: 'Tentukan tanggal mulai, batas akhir, dan kuota target pemesanan gelombang ini.'
    },
    {
      step: 3,
      id: 'step-3-mhs',
      title: 'STEP 3 — DATA MAHASISWA',
      description: 'Pastikan data mahasiswa dan akun mahasiswa tersedia.',
      targetTab: 'mahasiswa',
      buttonLabel: 'Buka Data Mahasiswa',
      category: 'SETUP',
      icon: <Users className="w-5 h-5 text-blue-600" />,
      tips: 'Gunakan fitur Import Excel untuk memasukkan daftar mahasiswa per kelas secara massal.'
    },
    {
      step: 4,
      id: 'step-4-pesanan',
      title: 'STEP 4 — PEMESANAN',
      description: 'Pantau pesanan pribadi dan kolektif yang masuk.',
      targetTab: 'pesanan',
      buttonLabel: 'Buka Pesanan',
      category: 'ORDER',
      icon: <Package className="w-5 h-5 text-emerald-600" />,
      tips: 'Cek daftar pesanan baru dan pastikan data custom nama bordir telah lengkap.'
    },
    {
      step: 5,
      id: 'step-5-bayar',
      title: 'STEP 5 — PEMBAYARAN',
      description: 'Periksa bukti pembayaran dan lakukan persetujuan/penolakan.',
      targetTab: 'pembayaran',
      buttonLabel: 'Buka Pembayaran',
      category: 'ORDER',
      icon: <CreditCard className="w-5 h-5 text-teal-600" />,
      tips: 'Validasi mutasi bank dengan bukti transfer yang diunggah mahasiswa sebelum Approve.'
    },
    {
      step: 6,
      id: 'step-6-produksi',
      title: 'STEP 6 — PRODUKSI',
      description: 'Pantau dan perbarui progres produksi, termasuk update progres masal dan foto progres.',
      targetTab: 'produksi',
      buttonLabel: 'Buka Produksi',
      category: 'PRODUKSI',
      icon: <Factory className="w-5 h-5 text-amber-600" />,
      tips: 'Unggah foto progres kain, pola potong, dan bordir dari vendor konveksi.'
    },
    {
      step: 7,
      id: 'step-7-laporan',
      title: 'STEP 7 — LAPORAN',
      description: 'Buat laporan pesanan, pembayaran, produksi, kelas, ukuran, dan laporan untuk konveksi.',
      targetTab: 'laporan',
      buttonLabel: 'Buka Laporan',
      category: 'PRODUKSI',
      icon: <FileText className="w-5 h-5 text-rose-600" />,
      tips: 'Unduh PDF Laporan Konveksi untuk diserahkan ke pihak penjahit/vendor.'
    },
    {
      step: 8,
      id: 'step-8-pengambilan',
      title: 'STEP 8 — PENGAMBILAN',
      description: 'Gunakan informasi pengambilan untuk memantau proses penyerahan PDH.',
      targetTab: 'produksi',
      buttonLabel: 'Buka Menu Pengambilan',
      category: 'DISTRIBUSI',
      icon: <MapPin className="w-5 h-5 text-orange-600" />,
      tips: 'Atur jadwal dan lokasi sekre pengambilan saat baju PDH telah tiba dari vendor.'
    },
    {
      step: 9,
      id: 'step-9-audit',
      title: 'STEP 9 — AUDIT & PENGAWASAN',
      description: 'Periksa aktivitas operasional panitia melalui Audit Log.',
      targetTab: 'pengaturan_sistem',
      buttonLabel: 'Buka Audit & Sistem',
      category: 'DISTRIBUSI',
      icon: <Activity className="w-5 h-5 text-indigo-600" />,
      tips: 'Seluruh persetujuan pembayaran dan perubahan status tercatat otomatis dan transparan.'
    },
    {
      step: 10,
      id: 'step-10-selesai',
      title: 'STEP 10 — SELESAI',
      description: 'Pastikan seluruh pesanan telah selesai diproduksi, dibayar, dan diserahkan.',
      targetTab: 'dashboard',
      buttonLabel: 'Buka Dashboard Utama',
      category: 'DISTRIBUSI',
      icon: <Award className="w-5 h-5 text-emerald-600" />,
      tips: 'Siklus pengadaan PDH selesai dengan sukses! Arsipkan data laporan untuk evaluasi.'
    }
  ];

  const totalSteps = steps.length;
  const completedCount = completedSteps.length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Compass className="w-4 h-4" /> Alur Kerja Operasional Panitia
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Roadmap Penggunaan Aplikasi
          </h2>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Panduan praktis langkah demi langkah mulai dari persiapan produk PDH, pengelolaan gelombang Pre-Order, approval pembayaran, pemantauan vendor konveksi, hingga distribusi pengambilan seragam.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={resetRoadmapProgress}
            className="min-h-[44px] px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
            title="Reset checklist langkah"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Progress</span>
          </button>
        </div>
      </div>

      {/* Progress Summary Card */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-5 rounded-2xl text-white shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <span className="font-black text-sm uppercase tracking-wider text-indigo-100">
              Progres Siklus Pengadaan PDH
            </span>
          </div>
          <div className="text-xs font-bold text-indigo-200">
            <strong className="text-white text-base">{completedCount}</strong> dari <strong className="text-white">{totalSteps}</strong> Langkah Selesai ({progressPercent}%)
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-indigo-500/30 p-0.5">
          <div
            className="bg-gradient-to-r from-emerald-400 to-indigo-400 h-full rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        <p className="text-[11px] text-indigo-200/80">
          Klik tombol <strong>"Buka Menu"</strong> pada setiap kartu untuk langsung menuju modul sistem yang bersangkutan. Anda juga dapat mencentang kartu setelah langkah selesai dilaksanakan.
        </p>
      </div>

      {/* Roadmap Steps List */}
      <div className="space-y-3">
        {steps.map((st) => {
          const isDone = completedSteps.includes(st.step);
          return (
            <div
              key={st.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                isDone
                  ? 'bg-emerald-50/40 border-emerald-200/80'
                  : 'bg-white border-gray-200 shadow-2xs hover:border-indigo-200 hover:shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Left: Step Info & Checkbox */}
                <div className="flex items-start gap-3 sm:gap-4 flex-1">
                  <button
                    type="button"
                    onClick={() => toggleStepCompleted(st.step)}
                    className="mt-0.5 text-gray-400 hover:text-emerald-600 transition cursor-pointer flex-shrink-0"
                    title={isDone ? 'Tandai belum selesai' : 'Tandai selesai'}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-100" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-300 hover:text-indigo-600" />
                    )}
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-50 text-indigo-700'
                      }`}>
                        {st.title}
                      </span>
                      {isDone && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Selesai
                        </span>
                      )}
                    </div>

                    <p className={`text-xs font-semibold leading-relaxed ${isDone ? 'text-gray-600' : 'text-gray-900'}`}>
                      {st.description}
                    </p>

                    <div className="text-[11px] text-gray-500 flex items-center gap-1.5 pt-0.5">
                      <Info className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
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
                      isDone
                        ? 'bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
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
