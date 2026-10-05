import React, { useState, useEffect } from 'react';
import { User, OrderType, PDHMasterData, POPeriod } from '../types';
import { api } from '../services/apiClient';
import {
  Home,
  ShoppingBag,
  Clock,
  CreditCard,
  Activity,
  CheckCircle2,
  Users,
  UserCheck,
  Shirt,
  Sparkles,
  Info,
  Ruler,
  Tag,
  DollarSign,
  Phone,
  FileText,
  Building,
  Loader2,
  Calendar,
  AlertOctagon,
  Bell,
  Mail,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Compass
} from 'lucide-react';

import { StudentOrderForm } from './StudentOrderForm';
import { StudentOrderHistory } from './StudentOrderHistory';
import { StudentProductionProgress } from './StudentProductionProgress';

interface MahasiswaLayoutProps {
  user: User;
}

type MahasiswaTab = 'beranda' | 'pesan' | 'pesanan_pembayaran' | 'progres';

export const MahasiswaLayout: React.FC<MahasiswaLayoutProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<MahasiswaTab>('beranda');
  const [selectedOrderType, setSelectedOrderType] = useState<OrderType>('PRIBADI');
  const [masterData, setMasterData] = useState<PDHMasterData | null>(null);
  const [activePO, setActivePO] = useState<(POPeriod & { isOpen: boolean }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [activeAccordion, setActiveAccordion] = useState<'spesifikasi' | 'ukuran' | 'ketentuan' | 'pembayaran' | null>('spesifikasi');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [masterRes, poRes] = await Promise.all([
        api.getPDHMasterData(),
        api.getActivePOPeriod()
      ]);

      if (masterRes.success && masterRes.data) setMasterData(masterRes.data);
      if (poRes.success && poRes.data) setActivePO(poRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Live countdown timer calculation
  useEffect(() => {
    if (!activePO || !activePO.end_date || !activePO.isOpen) {
      setTimeLeft(null);
      return;
    }

    const targetStr = `${activePO.end_date}T${activePO.end_time || '23:59'}:00+07:00`;
    const targetTime = new Date(targetStr).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(interval);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activePO]);


  const navItems: { id: MahasiswaTab; label: string; shortLabel: string; icon: React.ReactNode }[] = [
    { id: 'beranda', label: 'Beranda', shortLabel: 'Beranda', icon: <Home className="w-5 h-5 md:w-4 md:h-4" /> },
    { id: 'pesan', label: 'Pesan PDH', shortLabel: 'Pesan', icon: <ShoppingBag className="w-5 h-5 md:w-4 md:h-4" /> },
    { id: 'pesanan_pembayaran', label: 'Pesanan & Pembayaran', shortLabel: 'Pesanan', icon: <CreditCard className="w-5 h-5 md:w-4 md:h-4" /> },
    { id: 'progres', label: 'Progres PDH', shortLabel: 'Progres', icon: <Activity className="w-5 h-5 md:w-4 md:h-4" /> }
  ];

  return (
    <div className="min-h-[calc(100vh-61px)] bg-gray-50 flex flex-col relative">
      {/* Desktop Top Navigation Bar (Hidden on Mobile/Tablet) */}
      <nav className="hidden md:flex bg-white border-b border-gray-200 px-4 sm:px-6 gap-2 overflow-x-auto text-xs font-semibold shadow-2xs sticky top-[61px] z-20">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`py-3.5 px-3 flex items-center gap-2 border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === item.id
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Workspace Content with ample bottom padding to guarantee bottom bar never covers any content */}
      <main
        className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-6 pb-36 sm:pb-40 md:pb-12"
        style={{ paddingBottom: 'calc(76px + env(safe-area-inset-bottom, 16px) + 36px)' }}
      >
        {activeTab === 'beranda' && (
          <div className="space-y-6">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-6 rounded-2xl shadow-md space-y-2">
              <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" /> Katalog Pemesanan Resmi Mahasiswa
              </div>
              <h2 className="text-xl sm:text-2xl font-black">Selamat Datang, {user.name}!</h2>
              <p className="text-xs text-emerald-100 max-w-xl leading-relaxed">
                Pilih ukuran dan pesan Pakaian Dinas Harian (PDH) resmi angkatan Anda melalui sistem pemesanan online kampus.
              </p>
            </div>

            {/* LIVE PO STATUS & COUNTDOWN BANNER */}
            {activePO && (
              <div className={`p-5 sm:p-6 rounded-2xl border shadow-xs space-y-4 ${
                activePO.isOpen
                  ? 'bg-emerald-50/80 border-emerald-200'
                  : 'bg-rose-50/80 border-rose-200'
              }`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        activePO.isOpen
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-rose-600 text-white shadow-xs'
                      }`}>
                        {activePO.isOpen ? '🟢 PRE ORDER DIBUKA' : '🔴 PRE ORDER DITUTUP'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900">{activePO.name}</h3>
                    <p className="text-xs text-gray-600">
                      Jadwal Pemesanan: <strong className="font-mono">{activePO.start_date || '-'} {activePO.start_time || ''}</strong> s/d <strong className="font-mono">{activePO.end_date || '-'} {activePO.end_time || ''}</strong> WIB
                    </p>
                  </div>

                  {/* Countdown Timer Display */}
                  {activePO.isOpen && timeLeft && (
                    <div className="bg-white p-3 rounded-xl border border-emerald-200/80 shadow-2xs text-center flex gap-3 text-xs self-stretch sm:self-auto justify-center">
                      <div className="flex flex-col">
                        <span className="text-lg font-black text-emerald-700 font-mono">{timeLeft.days}</span>
                        <span className="text-[9px] uppercase font-bold text-gray-400">Hari</span>
                      </div>
                      <span className="text-lg font-black text-emerald-300">:</span>
                      <div className="flex flex-col">
                        <span className="text-lg font-black text-emerald-700 font-mono">{String(timeLeft.hours).padStart(2, '0')}</span>
                        <span className="text-[9px] uppercase font-bold text-gray-400">Jam</span>
                      </div>
                      <span className="text-lg font-black text-emerald-300">:</span>
                      <div className="flex flex-col">
                        <span className="text-lg font-black text-emerald-700 font-mono">{String(timeLeft.minutes).padStart(2, '0')}</span>
                        <span className="text-[9px] uppercase font-bold text-gray-400">Menit</span>
                      </div>
                      <span className="text-lg font-black text-emerald-300">:</span>
                      <div className="flex flex-col">
                        <span className="text-lg font-black text-emerald-700 font-mono">{String(timeLeft.seconds).padStart(2, '0')}</span>
                        <span className="text-[9px] uppercase font-bold text-gray-400">Detik</span>
                      </div>
                    </div>
                  )}
                </div>

                {!activePO.isOpen && (
                  <div className="p-3 bg-rose-100/60 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>Periode Pre-Order saat ini ditutup. Pembuatan pesanan baru dinonaktifkan sementara.</span>
                  </div>
                )}
              </div>
            )}

            {loading && !masterData ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 shadow-xs">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500 font-medium">Memuat Katalog PDH...</p>
              </div>
            ) : (
              masterData && (
                <>
                  {/* Master PDH Product Showcase Card (Prioritas Utama) */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                      {/* 1. Product Image (Mobile Main Visual Element) */}
                      <div className="bg-slate-100 p-4 sm:p-6 flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-200">
                        <div className="w-full aspect-4/3 sm:aspect-square rounded-xl overflow-hidden shadow-xs relative">
                          <img
                            src={masterData?.images?.[0]?.file_url || 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&q=80'}
                            alt="Desain PDH Kampus"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-3 left-3 bg-emerald-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase shadow-xs">
                            Desain Resmi {masterData.info.pdhYear}
                          </span>
                        </div>
                      </div>

                      {/* 2. Product Overview & Pricing */}
                      <div className="p-5 sm:p-6 space-y-4 flex flex-col justify-between">
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200 inline-block">
                            PDH ANGKATAN {masterData.info.pdhYear}
                          </span>
                          <h3 className="text-xl font-black text-gray-900 leading-tight">
                            {masterData.info.pdhName}
                          </h3>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            {masterData.info.pdhDescription}
                          </p>
                        </div>

                        {/* Price Badge */}
                        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
                          <span className="text-[10px] font-bold text-emerald-800 uppercase block">Harga Satuan Aktif</span>
                          <div className="text-2xl font-black text-emerald-700 font-mono">
                            {masterData.pricing.active
                              ? `Rp ${masterData.pricing.price.toLocaleString('id-ID')}`
                              : 'Harga Belum Dipublikasi'}
                          </div>
                          {masterData.pricing.notes && (
                            <p className="text-[11px] text-emerald-800 font-medium">{masterData.pricing.notes}</p>
                          )}
                        </div>

                        {/* Primary Action Button: "PESAN PDH" */}
                        <button
                          type="button"
                          onClick={() => {
                            if (activePO && activePO.isOpen) setActiveTab('pesan');
                          }}
                          disabled={!activePO || !activePO.isOpen}
                          className={`w-full py-3.5 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer ${
                            activePO && activePO.isOpen
                              ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                          }`}
                        >
                          <ShoppingBag className="w-4 h-4" />
                          <span>{activePO && activePO.isOpen ? 'PESAN PDH SEKARANG' : 'PRE ORDER SAAT INI DITUTUP'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* INFORMASI TAMBAHAN ACCORDION CARDS */}
                  <div className="space-y-3 pt-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block px-1">
                      Informasi Tambahan &amp; Panduan PDH
                    </span>

                    {/* 1. Spesifikasi PDH Accordion */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setActiveAccordion(activeAccordion === 'spesifikasi' ? null : 'spesifikasi')}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition cursor-pointer"
                      >
                        <span className="font-bold text-gray-900 text-xs flex items-center gap-2">
                          <Shirt className="w-4 h-4 text-emerald-600" /> Spesifikasi &amp; Bahan Kain PDH
                        </span>
                        {activeAccordion === 'spesifikasi' ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </button>

                      {activeAccordion === 'spesifikasi' && (
                        <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-3 text-xs animate-fade-in">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1">
                              <span className="font-bold text-gray-400 uppercase text-[10px]">Bahan Kain</span>
                              <div className="font-semibold text-gray-900">{masterData.info.pdhMaterial || 'Kain Drill Standard Kampus'}</div>
                            </div>
                            <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1">
                              <span className="font-bold text-gray-500 uppercase text-[10px]">Model / Potongan</span>
                              <div className="font-semibold text-gray-900">{masterData.info.pdhModel || 'Regular Fit / Lengan Panjang'}</div>
                            </div>
                            <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1">
                              <span className="font-bold text-gray-500 uppercase text-[10px]">Warna Utama</span>
                              <div className="font-semibold text-gray-900">{masterData.info.pdhColor || 'Navy Blue'}</div>
                            </div>
                            <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1">
                              <span className="font-bold text-gray-500 uppercase text-[10px]">Bordir &amp; Detail</span>
                              <div className="font-semibold text-gray-900">{masterData.info.pdhSpec || 'Bordir Komputer Logo Resmi & Nama Kustom'}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 2. Panduan Ukuran Accordion */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setActiveAccordion(activeAccordion === 'ukuran' ? null : 'ukuran')}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition cursor-pointer"
                      >
                        <span className="font-bold text-gray-900 text-xs flex items-center gap-2">
                          <Ruler className="w-4 h-4 text-emerald-600" /> Panduan &amp; Biaya Tambahan Ukuran
                        </span>
                        {activeAccordion === 'ukuran' ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </button>

                      {activeAccordion === 'ukuran' && (
                        <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-3 text-xs animate-fade-in">
                          <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 uppercase text-[10px] font-bold">
                                <tr>
                                  <th className="px-4 py-2.5">Ukuran</th>
                                  <th className="px-4 py-2.5">Lebar Dada</th>
                                  <th className="px-4 py-2.5">Panjang Badan</th>
                                  <th className="px-4 py-2.5">Panjang Lengan</th>
                                  <th className="px-4 py-2.5">Biaya Tambahan</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {masterData.sizes
                                  .filter((s) => s.status === 'ACTIVE')
                                  .map((s) => (
                                    <tr key={s.size_id} className="hover:bg-gray-50/50">
                                      <td className="px-4 py-2.5 font-bold font-mono text-gray-900">{s.size_code}</td>
                                      <td className="px-4 py-2.5 text-gray-600">{s.chest_width || '-'}</td>
                                      <td className="px-4 py-2.5 text-gray-600">{s.body_length || '-'}</td>
                                      <td className="px-4 py-2.5 text-gray-600">{s.sleeve_length || '-'}</td>
                                      <td className="px-4 py-2.5 font-bold text-emerald-700">
                                        {s.extra_fee > 0 ? `+Rp ${s.extra_fee.toLocaleString('id-ID')}` : 'Rp 0'}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 3. Ketentuan Pemesanan Accordion */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setActiveAccordion(activeAccordion === 'ketentuan' ? null : 'ketentuan')}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition cursor-pointer"
                      >
                        <span className="font-bold text-gray-900 text-xs flex items-center gap-2">
                          <FileText className="w-4 h-4 text-amber-600" /> Ketentuan &amp; Batas Waktu Pemesanan
                        </span>
                        {activeAccordion === 'ketentuan' ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </button>

                      {activeAccordion === 'ketentuan' && (
                        <div className="p-4 border-t border-gray-100 bg-gray-50/50 text-xs leading-relaxed text-gray-700 whitespace-pre-line animate-fade-in">
                          {masterData.info.pdhTerms || 'Setiap mahasiswa wajib memeriksa ejaan nama bordir custom sebelum mengirimkan pesanan.'}
                        </div>
                      )}
                    </div>

                    {/* 4. Informasi Pembayaran Accordion */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setActiveAccordion(activeAccordion === 'pembayaran' ? null : 'pembayaran')}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition cursor-pointer"
                      >
                        <span className="font-bold text-gray-900 text-xs flex items-center gap-2">
                          <Building className="w-4 h-4 text-emerald-600" /> Informasi Rekening Pembayaran Resmi
                        </span>
                        {activeAccordion === 'pembayaran' ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </button>

                      {activeAccordion === 'pembayaran' && (
                        <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-3 text-xs animate-fade-in">
                          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                            <div className="font-bold text-gray-800">{masterData.payment.bankName}</div>
                            <div className="text-lg font-black font-mono text-emerald-800">{masterData.payment.accountNumber}</div>
                            <div className="text-gray-700 font-medium">a.n. {masterData.payment.accountHolder}</div>
                          </div>
                          <p className="text-[11px] text-gray-600">{masterData.payment.instructions}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )
            )}
          </div>
        )}

        {activeTab === 'pesan' && (
          masterData ? (
            <StudentOrderForm
              user={user}
              masterData={masterData}
              activePO={activePO}
              onOrderSuccess={() => setActiveTab('pesanan_pembayaran')}
            />
          ) : (
            <div className="p-8 text-center bg-white rounded-2xl border border-gray-200">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Memuat Katalog Master PDH...</p>
            </div>
          )
        )}

        {activeTab === 'pesanan_pembayaran' && (
          <StudentOrderHistory user={user} masterData={masterData} />
        )}

        {activeTab === 'progres' && (
          <StudentProductionProgress user={user} />
        )}

        {/* Placeholders for other Mahasiswa views */}
        {!['beranda', 'pesan', 'pesanan_pembayaran', 'progres'].includes(activeTab) && (
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-xs text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto">
              <Shirt className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-gray-900 text-base capitalize">Halaman {activeTab.replace('_', ' ')}</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Navigasi dasar Portal Mahasiswa telah aktif. Riwayat dan detail progres akan terhubung di tahap berikutnya.
            </p>
          </div>
        )}
      </main>

      {/* Mobile & Tablet Fixed Bottom Navigation Bar */}
      <nav
        aria-label="Navigasi Utama Mahasiswa"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/90 shadow-2xl px-1.5 py-1.5 flex items-center justify-around"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveTab(item.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`min-h-[46px] flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition cursor-pointer relative select-none ${
                isActive
                  ? 'text-emerald-700'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-emerald-100/90 text-emerald-800 scale-110 shadow-2xs'
                    : 'text-gray-500 hover:bg-gray-100/60'
                }`}
              >
                {item.icon}
              </div>
              <span
                className={`text-[10px] tracking-tight leading-tight mt-0.5 truncate max-w-[54px] ${
                  isActive ? 'font-black text-emerald-800' : 'font-semibold'
                }`}
              >
                {item.shortLabel}
              </span>
              {isActive && (
                <span className="w-1 h-1 bg-emerald-600 rounded-full mt-0.5 animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

const StudentNotificationView: React.FC<{ user: User }> = ({ user }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotifs();
  }, [user.userId]);

  const loadNotifs = async () => {
    setLoading(true);
    try {
      const res = await api.listNotifications();
      if (res.success && res.data) {
        setNotifications(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read_status: true })));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-md space-y-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <Bell className="w-4 h-4" /> Pusat Notifikasi &amp; Informasi
          </div>
          <h2 className="text-xl font-black">Riwayat Notifikasi Mahasiswa</h2>
          <p className="text-xs text-emerald-100 max-w-xl">
            Seluruh pemberitahuan status akun, pendaftaran, pembayaran, dan pengerjaan PDH Anda tersimpan di sini.
          </p>
        </div>

        {notifications.some((n) => !n.read_status) && (
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4" /> Tandai Semua Dibaca
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
          <p className="text-xs text-gray-500">Memuat notifikasi Anda...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 space-y-2">
          <Bell className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="font-bold text-gray-800 text-sm">Belum Ada Notifikasi</h3>
          <p className="text-xs text-gray-500">Notifikasi terkait pesanan dan PDH Anda akan ditampilkan di sini.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs divide-y divide-gray-100 overflow-hidden">
          {notifications.map((notif) => (
            <div
              key={notif.notification_id}
              className={`p-5 transition flex items-start gap-4 ${
                !notif.read_status ? 'bg-emerald-50/50' : 'bg-white'
              }`}
            >
              <div className="p-2.5 rounded-2xl bg-gray-100 text-emerald-700 mt-0.5">
                <Bell className="w-5 h-5" />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-900 text-sm">{notif.title}</h4>
                  <span className="text-[11px] text-gray-400 font-mono">
                    {new Date(notif.created_at).toLocaleString('id-ID')}
                  </span>
                </div>

                <p className="text-xs text-gray-700 leading-relaxed">{notif.message}</p>

                {notif.email_sent && (
                  <div className="pt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
                    <Mail className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Salinan notifikasi telah dikirimkan ke email terdaftar Anda.</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
