import React, { useState, useEffect } from 'react';
import { User, OrderRecord } from '../types';
import { callGAS } from '../gas/gasBridge';
import {
  Users,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
  X,
  Mail,
  Phone,
  GraduationCap,
  ShoppingBag,
  ShieldCheck
} from 'lucide-react';

interface StudentRecord {
  user_id: string;
  username: string;
  nim: string;
  name: string;
  class_name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  created_at: string;
}

interface PanitiaStudentManagementProps {
  user: User;
}

export const PanitiaStudentManagement: React.FC<PanitiaStudentManagementProps> = ({ user }) => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [allOrders, setAllOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Detail Modal
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderRecord | null>(null);

  const getStudentItemSize = (ord: OrderRecord, nim: string) => {
    if (!ord.items || ord.items.length === 0) return '-';
    const cleanNim = String(nim).trim().toLowerCase();
    const matchedItem = ord.items.find((it) => String(it.nim || '').trim().toLowerCase() === cleanNim);
    if (matchedItem) return matchedItem.size_code;
    return ord.items.map((i) => i.size_code).join(', ');
  };

  useEffect(() => {
    loadData();
  }, [user.userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [studentsRes, ordersRes] = await Promise.all([
        callGAS<StudentRecord[]>('getAllStudentsPanitia', user.userId),
        callGAS<OrderRecord[]>('getAllOrdersPanitia', user.userId)
      ]);

      if (studentsRes.success && studentsRes.data) {
        setStudents(studentsRes.data);
      }
      if (ordersRes.success && ordersRes.data) {
        setAllOrders(ordersRes.data);
      }
    } catch (err: any) {
      console.error(err);
      setToast({ type: 'error', message: 'Gagal memuat data mahasiswa.' });
    } finally {
      setLoading(false);
    }
  };

  // Filtered logic
  const filteredStudents = students.filter((st) => {
    const sTerm = searchTerm.toLowerCase();
    const nimText = String(st.nim || st.username || '').toLowerCase();
    const nameText = String(st.name || '').toLowerCase();
    const classText = String(st.class_name || '').toLowerCase();
    const emailText = String(st.email || '').toLowerCase();

    const matchesSearch =
      nimText.includes(sTerm) ||
      nameText.includes(sTerm) ||
      classText.includes(sTerm) ||
      emailText.includes(sTerm);

    const matchesClass = filterClass === 'ALL' || classText.toUpperCase() === filterClass.toUpperCase();

    let matchesStatus = true;
    if (filterStatus !== 'ALL') {
      const stUpper = String(st.status || '').toUpperCase();
      if (filterStatus === 'TERVERIFIKASI') {
        matchesStatus = stUpper === 'TERVERIFIKASI' || stUpper === 'ACTIVE';
      } else if (filterStatus === 'BELUM TERVERIFIKASI') {
        matchesStatus = stUpper === 'BELUM TERVERIFIKASI' || stUpper === 'UNVERIFIED' || stUpper === 'PENDING';
      }
    }

    return matchesSearch && matchesClass && matchesStatus;
  });

  // Extract unique classes
  const uniqueClasses = Array.from(
    new Set(students.map((st) => String(st.class_name || '').toUpperCase()))
  ).filter(Boolean);

  // Summary Metrics
  const totalCount = students.length;
  const verifiedCount = students.filter((st) => {
    const s = String(st.status || '').toUpperCase();
    return s === 'TERVERIFIKASI' || s === 'ACTIVE';
  }).length;
  const unverifiedCount = students.filter((st) => {
    const s = String(st.status || '').toUpperCase();
    return s === 'BELUM TERVERIFIKASI' || s === 'UNVERIFIED' || s === 'PENDING';
  }).length;

  // Student orders lookup
  const getStudentOrders = (nim: string) => {
    if (!nim) return [];
    return allOrders.filter((ord) => {
      if (String(ord.buyer_nim || '').toLowerCase() === nim.toLowerCase()) return true;
      if (ord.items && ord.items.some((it) => String(it.nim || '').toLowerCase() === nim.toLowerCase())) return true;
      return false;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
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

      {/* SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase">
            <span>Total Mahasiswa Terdaftar</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-gray-900">{totalCount}</div>
          <p className="text-[11px] text-gray-400">Akun terdaftar dalam database</p>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-bold uppercase">
            <span>Terverifikasi</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-950">{verifiedCount}</div>
          <p className="text-[11px] text-emerald-700">Akun aktif &amp; terverifikasi email</p>
        </div>

        <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-800 text-xs font-bold uppercase">
            <span>Belum Verifikasi</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-950">{unverifiedCount}</div>
          <p className="text-[11px] text-amber-700">Menunggu verifikasi link email</p>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-600" /> Data Mahasiswa Terdaftar
            </h3>
            <p className="text-xs text-gray-500">Pencarian data akun mahasiswa, status verifikasi, dan riwayat pesanan PDH.</p>
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

        {/* SEARCH AND FILTERS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="relative sm:col-span-1">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari Nama, NIM, Email, Kelas..."
              className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-2.5 py-2 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-700"
          >
            <option value="ALL">Filter Kelas: Semua Kelas</option>
            {uniqueClasses.map((cls) => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-2 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-700"
          >
            <option value="ALL">Filter Status: Semua Status Akun</option>
            <option value="TERVERIFIKASI">Terverifikasi / Aktif</option>
            <option value="BELUM TERVERIFIKASI">Belum Verifikasi</option>
          </select>
        </div>

        <div className="text-[11px] text-gray-500 px-1">
          Menampilkan <strong>{filteredStudents.length}</strong> dari {students.length} mahasiswa terdaftar.
        </div>

        {/* TABLE VIEW (DESKTOP) */}
        <div className="hidden md:block overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
              <tr>
                <th className="p-3">Nama Mahasiswa</th>
                <th className="p-3">NIM</th>
                <th className="p-3">Kelas</th>
                <th className="p-3">Email</th>
                <th className="p-3">WhatsApp / No. HP</th>
                <th className="p-3 text-center">Status Akun</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    <p className="font-semibold">Data Mahasiswa Tidak Ditemukan</p>
                    <p className="text-[11px]">Coba sesuaikan kata kunci atau filter pencarian.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => {
                  const isVerified = String(st.status || '').toUpperCase() === 'TERVERIFIKASI' || String(st.status || '').toUpperCase() === 'ACTIVE';

                  return (
                    <tr key={st.user_id || st.nim} className="hover:bg-gray-50/80 transition">
                      <td className="p-3 font-bold text-gray-900">
                        {st.name || '-'}
                      </td>

                      <td className="p-3 font-mono font-bold text-gray-800">
                        {st.nim || st.username || '-'}
                      </td>

                      <td className="p-3 font-mono font-bold text-indigo-700">
                        <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded-md">
                          {st.class_name || '-'}
                        </span>
                      </td>

                      <td className="p-3 text-gray-700 font-medium">
                        {st.email || '-'}
                      </td>

                      <td className="p-3 font-mono text-gray-700">
                        {st.phone || '-'}
                      </td>

                      <td className="p-3 text-center">
                        {isVerified ? (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>TERVERIFIKASI</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>BELUM VERIFIKASI</span>
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(st)}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition flex items-center justify-center gap-1 cursor-pointer mx-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* CARDS VIEW (MOBILE RESPONSIVE) */}
        <div className="block md:hidden space-y-3">
          {filteredStudents.length === 0 ? (
            <div className="p-6 text-center text-gray-400 bg-gray-50 rounded-xl border border-gray-200">
              <p className="font-semibold text-xs">Data Mahasiswa Tidak Ditemukan</p>
            </div>
          ) : (
            filteredStudents.map((st) => {
              const isVerified = String(st.status || '').toUpperCase() === 'TERVERIFIKASI' || String(st.status || '').toUpperCase() === 'ACTIVE';

              return (
                <div key={st.user_id || st.nim} className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{st.name || '-'}</h4>
                      <p className="text-[11px] font-mono text-gray-500">NIM: {st.nim || st.username || '-'}</p>
                    </div>

                    {isVerified ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">
                        TERVERIFIKASI
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full">
                        BELUM VERIFIKASI
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <div>
                      <span className="text-gray-400 block font-bold uppercase text-[9px]">Kelas</span>
                      <span className="font-bold text-indigo-700">{st.class_name || '-'}</span>
                    </div>

                    <div>
                      <span className="text-gray-400 block font-bold uppercase text-[9px]">Email</span>
                      <span className="text-gray-800 truncate block">{st.email || '-'}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-200 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(st)}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Lihat Detail</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* DETAIL MAHASISWA MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar animate-fade-in border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Profil Lengkap Mahasiswa</h3>
                  <p className="text-xs text-gray-500 font-mono">NIM: {selectedStudent.nim || selectedStudent.username}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Student Info Card */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <span className="font-bold text-gray-800 text-sm">{selectedStudent.name}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  String(selectedStudent.status || '').toUpperCase() === 'TERVERIFIKASI' || String(selectedStudent.status || '').toUpperCase() === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {selectedStudent.status || 'BELUM TERVERIFIKASI'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">NIM Mahasiswa</span>
                  <span className="font-mono font-bold text-gray-900">{selectedStudent.nim || selectedStudent.username}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Kode Kelas</span>
                  <span className="font-mono font-bold text-indigo-700">{selectedStudent.class_name || '-'}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block flex items-center gap-1">
                    <Mail className="w-3 h-3 text-gray-400" /> Email Pribadi
                  </span>
                  <span className="text-gray-800">{selectedStudent.email || '-'}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block flex items-center gap-1">
                    <Phone className="w-3 h-3 text-gray-400" /> No. WhatsApp
                  </span>
                  <span className="text-gray-800 font-mono">{selectedStudent.phone || '-'}</span>
                </div>
              </div>

              {selectedStudent.created_at && (
                <div className="pt-2 border-t border-gray-200 text-[10px] text-gray-500">
                  Tanggal Registrasi Akun: {new Date(selectedStudent.created_at).toLocaleString('id-ID')}
                </div>
              )}
            </div>

            {/* Riwayat Pemesanan PDH */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <h4 className="font-bold text-gray-900 text-xs flex items-center justify-between uppercase tracking-wide">
                <span className="flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-indigo-600" />
                  <span>Riwayat Pemesanan PDH</span>
                </span>
                <span className="text-[10px] text-gray-400 font-normal font-mono">
                  NIM: {selectedStudent.nim || selectedStudent.username}
                </span>
              </h4>

              {(() => {
                const studentNim = selectedStudent.nim || selectedStudent.username;
                const stOrders = getStudentOrders(studentNim);

                if (stOrders.length === 0) {
                  return (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center text-xs text-gray-500 font-medium">
                      Belum ada riwayat pemesanan PDH.
                    </div>
                  );
                }

                return (
                  <div className="border border-gray-200 rounded-xl overflow-hidden text-xs bg-white shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-100 font-bold uppercase text-[10px] border-b border-gray-200 text-slate-700">
                          <tr>
                            <th className="p-2.5">No Pesanan &amp; Tanggal</th>
                            <th className="p-2.5">Jenis</th>
                            <th className="p-2.5">Ukuran</th>
                            <th className="p-2.5 text-center">Jumlah</th>
                            <th className="p-2.5 text-right">Total Nominal</th>
                            <th className="p-2.5 text-center">Status Pesanan</th>
                            <th className="p-2.5 text-center">Status Bayar</th>
                            <th className="p-2.5 text-center">Status Produksi</th>
                            <th className="p-2.5 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-[11px]">
                          {stOrders.map((ord) => {
                            const isCanceled = ord.status === 'DIBATALKAN';
                            const studentSize = getStudentItemSize(ord, studentNim);
                            const matchedItem = (ord.items || []).find(
                              (it) => String(it.nim || '').trim().toLowerCase() === String(studentNim).trim().toLowerCase()
                            );
                            const itemQty = matchedItem?.quantity || ord.item_count || 1;

                            return (
                              <tr key={ord.order_id} className={`hover:bg-gray-50/80 transition ${isCanceled ? 'bg-rose-50/40' : ''}`}>
                                <td className="p-2.5 font-mono">
                                  <div className="font-bold text-gray-900">{ord.order_number}</div>
                                  <div className="text-[10px] text-gray-400">
                                    {ord.created_at ? new Date(ord.created_at).toLocaleString('id-ID') : '-'}
                                  </div>
                                </td>

                                <td className="p-2.5">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                      ord.order_type === 'PRIBADI'
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                        : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                                    }`}
                                  >
                                    {ord.order_type}
                                  </span>
                                </td>

                                <td className="p-2.5 font-mono font-bold text-emerald-700">
                                  {studentSize}
                                </td>

                                <td className="p-2.5 text-center font-mono font-bold text-gray-800">
                                  {itemQty} Pcs
                                </td>

                                <td className="p-2.5 font-mono font-bold text-right text-gray-900">
                                  Rp {(ord.total_amount || 0).toLocaleString('id-ID')}
                                </td>

                                <td className="p-2.5 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                      isCanceled
                                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                        : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                                    }`}
                                  >
                                    {ord.status}
                                  </span>
                                </td>

                                <td className="p-2.5 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                      ord.payment_status === 'LUNAS' || ord.payment_status === 'PAID'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : ord.payment_status === 'MENUNGGU APPROVAL'
                                        ? 'bg-blue-100 text-blue-800'
                                        : ord.payment_status === 'DITOLAK'
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {ord.payment_status}
                                  </span>
                                </td>

                                <td className="p-2.5 text-center">
                                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                    {ord.production_status || 'Belum Diproduksi'}
                                  </span>
                                </td>

                                <td className="p-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedOrderDetail(ord)}
                                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] transition cursor-pointer flex items-center justify-center gap-1 mx-auto shadow-2xs"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Lihat Detail</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Tutup Profil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL PESANAN OVERLAY MODAL */}
      {selectedOrderDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Detail Pesanan PDH Kampus</h3>
                <p className="text-xs text-gray-500 font-mono">Order No: {selectedOrderDetail.order_number}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderDetail(null)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pemesan & Payment Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase text-gray-500 block">Data Pemesan / PJ</span>
                <div className="font-bold text-gray-900">{selectedOrderDetail.buyer_name}</div>
                <div className="font-mono text-gray-700">NIM: {selectedOrderDetail.buyer_nim}</div>
                <div className="font-mono font-bold text-indigo-700">Kelas: {selectedOrderDetail.buyer_class}</div>
                <div className="text-gray-600">WhatsApp: {selectedOrderDetail.buyer_whatsapp}</div>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase text-gray-500 block">Status Pembayaran &amp; Workflow</span>
                <div className="font-bold text-emerald-800">
                  Total Tagihan: <span className="font-mono text-base">Rp {selectedOrderDetail.total_amount.toLocaleString('id-ID')}</span>
                </div>
                <div>Metode: <strong className="uppercase font-mono">{selectedOrderDetail.payment_method || 'TRANSFER'}</strong></div>
                <div>Status Bayar: <strong className="text-emerald-700">{selectedOrderDetail.payment_status}</strong></div>
                <div>Status Pesanan: <strong className="text-indigo-700">{selectedOrderDetail.status}</strong></div>
                <div>Status Produksi: <strong className="text-amber-700">{selectedOrderDetail.production_status || 'Belum Diproduksi'}</strong></div>
              </div>
            </div>

            {/* Members Table Detail */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase text-gray-800 block">
                Daftar Mahasiswa Pemesan ({selectedOrderDetail.items?.length || 1} Orang)
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
                    {(selectedOrderDetail.items || []).map((itm, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="p-2 font-mono text-gray-400 text-center">{idx + 1}</td>
                        <td className="p-2 font-bold text-gray-900">{itm.student_name || selectedOrderDetail.buyer_name}</td>
                        <td className="p-2 font-mono text-gray-800">{itm.nim || selectedOrderDetail.buyer_nim}</td>
                        <td className="p-2 font-mono font-bold text-indigo-700">{itm.class_name || selectedOrderDetail.buyer_class}</td>
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

            {/* Catatan / Keterangan Pembatalan */}
            {selectedOrderDetail.status === 'DIBATALKAN' && selectedOrderDetail.cancel_reason && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
                <strong>Alasan Pembatalan:</strong> {selectedOrderDetail.cancel_reason}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedOrderDetail(null)}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
