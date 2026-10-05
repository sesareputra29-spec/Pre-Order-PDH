import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  ChevronDown,
  ChevronUp,
  LogIn,
  UserPlus,
  Search,
  ShoppingBag,
  CreditCard,
  Building,
  Upload,
  Activity,
  MapPin,
  Users,
  FileSpreadsheet,
  Shirt,
  UserCheck,
  Settings,
  Database,
  Layers,
  LayoutDashboard,
  Factory,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';

export type HelpModalMode = 'PUBLIC' | 'PANITIA' | 'MAHASISWA';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: HelpModalMode;
}

interface AccordionItem {
  id: string;
  title: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, mode }) => {
  const [openAccordionId, setOpenAccordionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const toggleAccordion = (id: string) => {
    setOpenAccordionId(openAccordionId === id ? null : id);
  };

  // 1. PUBLIC / LANDING PAGE HELP CONTENT
  const publicHelpItems: AccordionItem[] = [
    {
      id: 'cara_login',
      title: 'A. Cara Login ke Akun',
      icon: <LogIn className="w-4 h-4 text-indigo-600" />,
      content: (
        <div className="space-y-2 text-xs text-gray-600 leading-relaxed">
          <ol className="list-decimal list-inside space-y-1">
            <li>Buka tab <strong>Masuk</strong> pada halaman awal.</li>
            <li><strong>Mahasiswa:</strong> Masukkan NIM atau Username serta Password yang telah terdaftar.</li>
            <li><strong>Panitia:</strong> Masukkan Username panitia (misal: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-indigo-700 font-bold">admin</code>) dan Password.</li>
            <li>Klik tombol <strong>MASUK KE SISTEM</strong> untuk mengakses portal.</li>
          </ol>
        </div>
      )
    },
    {
      id: 'cara_registrasi',
      title: 'B. Cara Registrasi Akun Mahasiswa Baru',
      icon: <UserPlus className="w-4 h-4 text-emerald-600" />,
      content: (
        <div className="space-y-2 text-xs text-gray-600 leading-relaxed">
          <ol className="list-decimal list-inside space-y-1">
            <li>Klik tab <strong>Registrasi</strong> pada halaman awal.</li>
            <li>Isi formulir pendaftaran:
              <ul className="list-disc list-inside pl-4 mt-1 space-y-0.5 text-gray-500">
                <li><strong>NIM:</strong> Nomor Induk Mahasiswa (contoh: 22MJSP001)</li>
                <li><strong>Nama Lengkap:</strong> Sesuai identitas kampus</li>
                <li><strong>Kelas:</strong> Kode kelas (contoh: 22MJSP001 / MJSP)</li>
                <li><strong>Email:</strong> Email aktif untuk verifikasi akun</li>
                <li><strong>Password:</strong> Minimal 6 karakter</li>
              </ul>
            </li>
            <li>Klik <strong>DAFTAR AKUN MAHASISWA</strong>.</li>
            <li>Buka email Anda dan klik link aktivasi, atau langsung login ke sistem.</li>
          </ol>
        </div>
      )
    },
    {
      id: 'lacak_nim',
      title: 'C. Cara Melacak Pesanan via Lacak NIM (Tanpa Login)',
      icon: <Search className="w-4 h-4 text-amber-600" />,
      content: (
        <div className="space-y-2 text-xs text-gray-600 leading-relaxed">
          <ol className="list-decimal list-inside space-y-1">
            <li>Pilih tab <strong>Lacak NIM</strong> pada halaman depan.</li>
            <li>Masukkan <strong>NIM Anda</strong> pada kolom pencarian.</li>
            <li>Klik tombol <strong>LACAK PESANAN</strong>.</li>
            <li>Sistem akan menampilkan:
              <ul className="list-disc list-inside pl-4 mt-1 space-y-0.5 text-gray-500">
                <li>Status Pemesanan (Pribadi / Anggota Kolektif)</li>
                <li>Status Pembayaran (Belum Bayar, Menunggu Approval, Lunas)</li>
                <li>Progres Pengerjaan Vendor Konveksi &amp; Persentase Produksi</li>
                <li>Informasi Kesiapan Pengambilan di Sekre Kampus</li>
              </ul>
            </li>
          </ol>
        </div>
      )
    },
    {
      id: 'bantuan_pemesanan',
      title: 'D. Bantuan Alur Pemesanan PDH',
      icon: <ShoppingBag className="w-4 h-4 text-teal-600" />,
      content: (
        <div className="space-y-2 text-xs text-gray-600 leading-relaxed">
          <p>Alur pemesanan seragam resmi PDH Kampus:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Masuk ke akun mahasiswa Anda.</li>
            <li>Buka menu <strong>Pesan PDH</strong>.</li>
            <li>Pilih jenis pemesanan: <strong>Pribadi</strong> (1 baju) atau <strong>Kolektif</strong> (banyak anggota per kelas).</li>
            <li>Pilih ukuran baju dan isi bordir nama kustom.</li>
            <li>Periksa ringkasan dan konfirmasi pesanan Anda.</li>
          </ol>
        </div>
      )
    },
    {
      id: 'bantuan_pembayaran',
      title: 'E. Alur Pembayaran & Rekening Panitia',
      icon: <CreditCard className="w-4 h-4 text-emerald-600" />,
      content: (
        <div className="space-y-2 text-xs text-gray-600 leading-relaxed">
          <ol className="list-decimal list-inside space-y-1">
            <li>Buka menu <strong>Pesanan &amp; Pembayaran</strong> pada Portal Mahasiswa.</li>
            <li>Pilih pesanan Anda dan klik <strong>BAYAR SEKARANG</strong>.</li>
            <li>Transfer sesuai nominal ke rekening resmi Bank Panitia yang tertera.</li>
            <li>Upload bukti transfer struk / screenshot pembayaran (JPG, PNG, PDF).</li>
            <li>Tunggu verifikasi Panitia hingga status pembayaran berubah menjadi <strong>LUNAS</strong>.</li>
          </ol>
        </div>
      )
    }
  ];

  // 2. PANITIA HELP CONTENT
  const panitiaHelpItems: AccordionItem[] = [
    {
      id: 'panitia_dashboard',
      title: 'Dashboard & Ringkasan Operasional',
      icon: <LayoutDashboard className="w-4 h-4 text-indigo-600" />,
      content: (
        <p className="text-xs text-gray-600 leading-relaxed">
          Menampilkan statistik total pesanan masuk, tagihan pending payment, antrean verifikasi bukti transfer, pesanan dalam proses produksi vendor, dan seragam siap diambil secara real-time.
        </p>
      )
    },
    {
      id: 'panitia_pesanan',
      title: 'Manajemen Pesanan',
      icon: <ShoppingBag className="w-4 h-4 text-indigo-600" />,
      content: (
        <p className="text-xs text-gray-600 leading-relaxed">
          Kelola seluruh daftar pesanan Pribadi dan Kolektif. Filter berdasarkan status PO, cari berdasarkan NIM/Nama/Kelas pemesan, dan unduh kuitansi atau invoice transaksi resmi format PDF.
        </p>
      )
    },
    {
      id: 'panitia_mahasiswa',
      title: 'Data Mahasiswa & Rekap Kelas',
      icon: <Users className="w-4 h-4 text-indigo-600" />,
      content: (
        <p className="text-xs text-gray-600 leading-relaxed">
          Pantau daftar seluruh mahasiswa per kelas/angkatan, cek siapa saja yang sudah memesan atau belum memesan PDH, serta status verifikasi akun mahasiswa.
        </p>
      )
    },
    {
      id: 'panitia_pembayaran',
      title: 'Verifikasi Pembayaran',
      icon: <CreditCard className="w-4 h-4 text-emerald-600" />,
      content: (
        <p className="text-xs text-gray-600 leading-relaxed">
          Tinjau bukti transfer yang dikirimkan mahasiswa, periksa kesesuaian mutasi rekening, setujui pembayaran menjadi <strong>LUNAS</strong>, atau tolak pembayaran disertai alasan penolakan yang otomatis terkirim ke mahasiswa.
        </p>
      )
    },
    {
      id: 'panitia_produksi',
      title: 'Manajemen Produksi & Vendor',
      icon: <Factory className="w-4 h-4 text-amber-600" />,
      content: (
        <p className="text-xs text-gray-600 leading-relaxed">
          Perbarui tahapan pengerjaan seragam vendor konveksi (Kain, Pola Potong, Jahit, Bordir Nama, Finishing, Selesai), atur persentase progres, dan unggah foto dokumentasi langsung dari vendor.
        </p>
      )
    },
    {
      id: 'panitia_progres_masal',
      title: 'Update Progres Masal',
      icon: <Layers className="w-4 h-4 text-amber-600" />,
      content: (
        <p className="text-xs text-gray-600 leading-relaxed">
          Fitur cepat untuk memperbarui tahapan status produksi dan mengunggah foto progres untuk seluruh pesanan sekaligus dalam satu aksi massal.
        </p>
      )
    },
    {
      id: 'panitia_pengaturan_pdh',
      title: 'Pengaturan PDH & Periode Pre-Order',
      icon: <Shirt className="w-4 h-4 text-teal-600" />,
      content: (
        <p className="text-xs text-gray-600 leading-relaxed">
          Atur harga satuan seragam, buka/tutup periode Pre-Order, atur batas kuota, tabel ukuran (*size chart*), biaya tambahan ukuran jumbo (XXL, 3XL, dst), foto desain, dan ketentuan pemesanan resmi.
        </p>
      )
    },
    {
      id: 'panitia_laporan',
      title: 'Laporan & Rekapitulasi',
      icon: <FileText className="w-4 h-4 text-blue-600" />,
      content: (
        <p className="text-xs text-gray-600 leading-relaxed">
          Lihat rekapitulasi data pesanan, rekap kebutuhan ukuran seragam untuk vendor konveksi, rekapitulasi keuangan masuk, serta berita acara serah terima pengambilan seragam.
        </p>
      )
    },
    {
      id: 'panitia_import_export',
      title: 'Import & Export Data',
      icon: <FileSpreadsheet className="w-4 h-4 text-emerald-600" />,
      content: (
        <p className="text-xs text-gray-600 leading-relaxed">
          Impor master data mahasiswa atau pesanan massal dari file Excel (.xlsx), serta ekspor seluruh database pesanan ke Google Sheets atau spreadsheet.
        </p>
      )
    },
    {
      id: 'panitia_user_akses',
      title: 'User & Akses Akun',
      icon: <UserCheck className="w-4 h-4 text-purple-600" />,
      content: (
        <p className="text-xs text-gray-600 leading-relaxed">
          Kelola akun administrator panitia dan akun mahasiswa, reset kata sandi, blokir atau aktifkan akun pengguna, dan atur peran (*role permission*).
        </p>
      )
    },
    {
      id: 'panitia_audit',
      title: 'Audit Aktivitas Sistem',
      icon: <ShieldCheck className="w-4 h-4 text-rose-600" />,
      content: (
        <p className="text-xs text-gray-600 leading-relaxed">
          Merekam seluruh log riwayat perubahan data, persetujuan pembayaran, perubahan status produksi, dan pembaruan konfigurasi sistem untuk audit transparansi panitia.
        </p>
      )
    },
    {
      id: 'panitia_pengaturan_sistem',
      title: 'Pengaturan Sistem & Database',
      icon: <Settings className="w-4 h-4 text-gray-700" />,
      content: (
        <p className="text-xs text-gray-600 leading-relaxed">
          Kelola konfigurasi integrasi Google Workspace, Spreadsheet ID database, nomor kontak WhatsApp panitia, dan pesan notifikasi sistem.
        </p>
      )
    }
  ];

  // 3. MAHASISWA HELP CONTENT
  const mahasiswaHelpItems: AccordionItem[] = [
    {
      id: 'mhs_cara_pesan',
      title: 'Cara Memesan PDH',
      icon: <ShoppingBag className="w-4 h-4 text-emerald-600" />,
      content: (
        <div className="space-y-2 text-xs text-gray-600 leading-relaxed">
          <ol className="list-decimal list-inside space-y-1">
            <li>Buka menu <strong>Pesan PDH</strong> di bilah navigasi.</li>
            <li>Pilih jenis pemesanan yang diinginkan: <strong>Pribadi</strong> atau <strong>Kolektif</strong>.</li>
            <li>Isi formulir data ukuran dan nama bordir baju.</li>
            <li>Periksa kembali rincian dan harga total.</li>
            <li>Klik tombol <strong>Lanjutkan ke Konfirmasi Pesanan</strong>.</li>
          </ol>
        </div>
      )
    },
    {
      id: 'mhs_pesan_pribadi',
      title: 'Pemesanan Pribadi (1 Baju)',
      icon: <Shirt className="w-4 h-4 text-emerald-600" />,
      content: (
        <p className="text-xs text-gray-600 leading-relaxed">
          Digunakan jika Anda memesan seragam PDH khusus untuk diri sendiri (1 pcs). Anda dapat memilih ukuran badan (S s/d 5XL) dan mengisi bordir nama Anda yang akan dijahit di dada seragam.
        </p>
      )
    },
    {
      id: 'mhs_pesan_kolektif',
      title: 'Pemesanan Kolektif (Banyak Anggota / Kelas)',
      icon: <Users className="w-4 h-4 text-indigo-600" />,
      content: (
        <p className="text-xs text-gray-600 leading-relaxed">
          Digunakan untuk memesan seragam beberapa mahasiswa sekaligus dalam satu rombongan belajar/kelas. Pemesanan dapat diinput secara manual per anggota atau diimpor langsung melalui file template Excel kolektif.
        </p>
      )
    },
    {
      id: 'mhs_data_pj',
      title: 'Data Penanggung Jawab / Koordinator',
      icon: <UserCheck className="w-4 h-4 text-indigo-600" />,
      content: (
        <p className="text-xs text-gray-600 leading-relaxed">
          Pada pemesanan kolektif, akun Anda bertindak sebagai Penanggung Jawab (PJ) pesanan. Nomor WhatsApp PJ akan dihubungi oleh panitia untuk koordinasi pembayaran dan pengambilan seragam massal kelas.
        </p>
      )
    },
    {
      id: 'mhs_data_anggota',
      title: 'Data Anggota Kolektif',
      icon: <Users className="w-4 h-4 text-indigo-600" />,
      content: (
        <p className="text-xs text-gray-600 leading-relaxed">
          Pastikan NIM, Nama Lengkap, Kode Kelas, Ukuran Baju, dan Bordir Nama setiap anggota diisi dengan teliti. Anggota yang terdaftar dalam pesanan kolektif dapat melacak status baju mereka menggunakan fitur Lacak NIM.
        </p>
      )
    },
    {
      id: 'mhs_pesanan_pembayaran',
      title: 'Pesanan & Pembayaran',
      icon: <CreditCard className="w-4 h-4 text-emerald-600" />,
      content: (
        <p className="text-xs text-gray-600 leading-relaxed">
          Di menu <strong>Pesanan &amp; Pembayaran</strong>, Anda dapat melihat rincian transaksi, total tagihan yang harus dibayar, nomor rekening resmi bank panitia, serta status verifikasi pembayaran.
        </p>
      )
    },
    {
      id: 'mhs_upload_bukti',
      title: 'Upload Bukti Pembayaran',
      icon: <Upload className="w-4 h-4 text-emerald-600" />,
      content: (
        <div className="space-y-2 text-xs text-gray-600 leading-relaxed">
          <ol className="list-decimal list-inside space-y-1">
            <li>Buka menu <strong>Pesanan &amp; Pembayaran</strong>.</li>
            <li>Klik tombol <strong>BAYAR SEKARANG</strong> pada pesanan Anda.</li>
            <li>Pilih metode transfer bank atau tunai.</li>
            <li>Pilih file foto struk/screenshot transfer (JPG, PNG, atau PDF).</li>
            <li>Klik <strong>KIRIM BUKTI PEMBAYARAN</strong>.</li>
            <li>Tunggu persetujuan panitia hingga status berubah menjadi <strong>LUNAS</strong>.</li>
          </ol>
        </div>
      )
    },
    {
      id: 'mhs_progres_pdh',
      title: 'Progres Pengerjaan Vendor Konveksi',
      icon: <Activity className="w-4 h-4 text-amber-600" />,
      content: (
        <p className="text-xs text-gray-600 leading-relaxed">
          Buka menu <strong>Progres PDH</strong> untuk memantau tahapan pengerjaan seragam dari vendor konveksi resmi (Penyediaan Kain, Potong Pola, Jahit, Bordir, Finishing, hingga Selesai) lengkap dengan foto perkembangan pengerjaan.
        </p>
      )
    },
    {
      id: 'mhs_lacak_pengambilan',
      title: 'Melacak Pesanan & Pengambilan Seragam',
      icon: <MapPin className="w-4 h-4 text-rose-600" />,
      content: (
        <p className="text-xs text-gray-600 leading-relaxed">
          Ketika status pesanan berubah menjadi <strong>"Siap Diambil"</strong>, Anda dapat mengambil seragam di lokasi sekretariat panitia kampus sesuai jadwal operasional yang tertera dengan menunjukkan Kartu Tanda Mahasiswa (KTM) atau Nomor Pesanan Anda.
        </p>
      )
    }
  ];

  const currentItems =
    mode === 'PUBLIC'
      ? publicHelpItems
      : mode === 'PANITIA'
      ? panitiaHelpItems
      : mahasiswaHelpItems;

  const filteredItems = currentItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    return item.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base leading-tight">
                {mode === 'PANITIA'
                  ? 'Panduan Portal Panitia'
                  : mode === 'MAHASISWA'
                  ? 'Panduan Portal Mahasiswa'
                  : 'Panduan Penggunaan Sistem'}
              </h3>
              <p className="text-xs text-gray-500">Petunjuk penggunaan aplikasi &amp; alur pemesanan PDH</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
            aria-label="Tutup Panduan"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search filter in modal */}
        <div className="px-4 sm:px-5 pt-3 pb-1 border-b border-gray-100 bg-white">
          <div className="relative">
            <input
              type="text"
              placeholder="Cari topik bantuan / petunjuk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Modal Scrollable Accordion Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs space-y-2">
              <Info className="w-6 h-6 mx-auto text-gray-300" />
              <p>Tidak ada panduan yang cocok dengan pencarian "{searchQuery}".</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isOpen = openAccordionId === item.id;
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border transition overflow-hidden ${
                    isOpen ? 'border-indigo-200 bg-indigo-50/20 shadow-2xs' : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(item.id)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left transition cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5 font-bold text-xs text-gray-900">
                      {item.icon}
                      <span>{item.title}</span>
                    </div>
                    <div className="text-gray-400 flex-shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-3.5 pt-1 border-t border-gray-100/80 bg-white/70 animate-fade-in">
                      {item.content}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span className="text-[11px] font-medium">PDH Campus Order &bull; Sistem Terpadu</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition cursor-pointer shadow-xs text-xs"
          >
            Tutup Bantuan
          </button>
        </div>
      </div>
    </div>
  );
};
