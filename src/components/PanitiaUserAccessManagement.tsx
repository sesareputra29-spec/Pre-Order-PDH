import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { callGAS } from '../gas/gasBridge';
import {
  UserCheck,
  Search,
  Filter,
  ShieldCheck,
  Shield,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  User as UserIcon,
  UserPlus,
  Key,
  Lock,
  X,
  Edit2,
  Ban,
  Check,
  Calendar,
  GraduationCap,
  Users
} from 'lucide-react';

interface PanitiaUserProps {
  user: User;
}

interface PanitiaUserAccount {
  user_id: string;
  username: string;
  name: string;
  email: string;
  role: 'PANITIA';
  status: 'ACTIVE' | 'INACTIVE' | 'AKTIF' | 'NONAKTIF' | string;
  created_at?: string;
  updated_at?: string;
}

interface StudentUserAccount {
  user_id: string;
  username: string;
  nim: string;
  name: string;
  class_name: string;
  email: string;
  phone?: string;
  role: string;
  status: 'TERVERIFIKASI' | 'BELUM VERIFIKASI' | 'ACTIVE' | 'INACTIVE' | string;
  created_at?: string;
}

type UserSubTab = 'PANITIA' | 'MAHASISWA';

export const PanitiaUserAccessManagement: React.FC<PanitiaUserProps> = ({ user }) => {
  const [activeSubTab, setActiveSubTab] = useState<UserSubTab>('PANITIA');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Data
  const [panitiaUsers, setPanitiaUsers] = useState<PanitiaUserAccount[]>([]);
  const [studentUsers, setStudentUsers] = useState<StudentUserAccount[]>([]);

  // Search & Filters - Panitia
  const [searchPanitia, setSearchPanitia] = useState('');
  const [statusPanitiaFilter, setStatusPanitiaFilter] = useState('ALL');

  // Search & Filters - Mahasiswa
  const [searchStudent, setSearchStudent] = useState('');
  const [statusStudentFilter, setStatusStudentFilter] = useState('ALL');

  // Modals
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [editPanitiaModalUser, setEditPanitiaModalUser] = useState<PanitiaUserAccount | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<{ user_id: string; name: string; username: string; role: string } | null>(null);
  const [detailStudentUser, setDetailStudentUser] = useState<StudentUserAccount | null>(null);

  // Form States - Add Panitia User
  const [addName, setAddName] = useState('');
  const [addUsername, setAddUsername] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addConfirmPassword, setAddConfirmPassword] = useState('');

  // Form States - Edit Panitia
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Form States - Reset Password
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');

  useEffect(() => {
    loadData();
  }, [user.userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [panitiaRes, studentRes] = await Promise.all([
        callGAS<any[]>('getAllPanitiaUsers', user.userId),
        callGAS<StudentUserAccount[]>('getAllStudentsPanitia', user.userId)
      ]);

      if (panitiaRes.success && panitiaRes.data) {
        const panitiaOnly = panitiaRes.data.filter((u: any) => u.role === 'PANITIA') as PanitiaUserAccount[];
        setPanitiaUsers(panitiaOnly);
      }

      if (studentRes.success && studentRes.data) {
        setStudentUsers(studentRes.data);
      }
    } catch (err: any) {
      console.error(err);
      setToast({ type: 'error', message: 'Gagal memuat data pengguna.' });
    } finally {
      setLoading(false);
    }
  };

  // 1. TAMBAH USER PANITIA
  const handleCreatePanitiaUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!addName.trim() || !addUsername.trim() || !addEmail.trim() || !addPassword || !addConfirmPassword) {
      setToast({ type: 'error', message: 'Semua field form Tambah User Panitia wajib diisi!' });
      return;
    }

    if (addPassword !== addConfirmPassword) {
      setToast({ type: 'error', message: 'Konfirmasi password tidak cocok dengan password!' });
      return;
    }

    if (addPassword.length < 3) {
      setToast({ type: 'error', message: 'Password minimal 3 karakter!' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: addName.trim(),
        username: addUsername.trim().toLowerCase(),
        email: addEmail.trim().toLowerCase(),
        password: addPassword,
        confirmPassword: addConfirmPassword,
        role: 'PANITIA'
      };

      const res = await callGAS('createPanitiaUser', user.userId, payload);
      if (res.success) {
        setToast({ type: 'success', message: res.message || 'User Panitia baru berhasil ditambahkan!' });
        setAddUserModalOpen(false);
        setAddName('');
        setAddUsername('');
        setAddEmail('');
        setAddPassword('');
        setAddConfirmPassword('');
        loadData();
      } else {
        setToast({ type: 'error', message: res.message || 'Gagal menambahkan user panitia.' });
      }
    } catch (err: any) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // 2. SAVE EDIT PANITIA
  const handleSaveEditPanitia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPanitiaModalUser) return;

    if (!editName.trim() || !editEmail.trim()) {
      setToast({ type: 'error', message: 'Nama dan Email tidak boleh kosong!' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: editName.trim(),
        email: editEmail.trim().toLowerCase()
      };

      const res = await callGAS('updatePanitiaUser', user.userId, editPanitiaModalUser.user_id, payload);
      if (res.success) {
        setToast({ type: 'success', message: 'Data user panitia berhasil diperbarui!' });
        setEditPanitiaModalUser(null);
        loadData();
      } else {
        setToast({ type: 'error', message: res.message || 'Gagal memperbarui data user.' });
      }
    } catch (err: any) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // 3. TOGGLE PANITIA STATUS
  const handleTogglePanitiaStatus = async (targetUser: PanitiaUserAccount) => {
    if (targetUser.username === 'admin' || targetUser.user_id === 'USR-ADMIN-01') {
      setToast({ type: 'error', message: 'Dilarang menonaktifkan atau mengubah akun Administrator Utama (admin)!' });
      return;
    }

    const currentActive = targetUser.status === 'ACTIVE' || targetUser.status === 'AKTIF' || targetUser.status === 'TERVERIFIKASI';
    const nextStatus = currentActive ? 'INACTIVE' : 'ACTIVE';

    if (!confirm(`Apakah Anda yakin ingin ${currentActive ? 'menonaktifkan' : 'mengaktifkan'} akun Panitia ${targetUser.name} (${targetUser.username})?`)) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await callGAS('togglePanitiaUserStatus', user.userId, targetUser.user_id, nextStatus);
      if (res.success) {
        setToast({
          type: 'success',
          message: `Status akun panitia ${targetUser.name} berhasil diubah menjadi ${nextStatus}.`
        });
        loadData();
      } else {
        setToast({ type: 'error', message: res.message || 'Gagal mengubah status akun.' });
      }
    } catch (err: any) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // 4. TOGGLE MAHASISWA STATUS
  const handleToggleStudentStatus = async (targetStudent: StudentUserAccount) => {
    const currentActive = targetStudent.status === 'ACTIVE' || targetStudent.status === 'AKTIF' || targetStudent.status === 'TERVERIFIKASI';
    const nextStatus = currentActive ? 'INACTIVE' : 'ACTIVE';

    if (!confirm(`Apakah Anda yakin ingin ${currentActive ? 'menonaktifkan' : 'mengaktifkan'} akun Mahasiswa ${targetStudent.name} (NIM: ${targetStudent.nim || targetStudent.username})?`)) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await callGAS('togglePanitiaUserStatus', user.userId, targetStudent.user_id || targetStudent.nim || targetStudent.username, nextStatus);
      if (res.success) {
        setToast({
          type: 'success',
          message: `Status akun mahasiswa ${targetStudent.name} berhasil diubah menjadi ${nextStatus}.`
        });
        loadData();
      } else {
        setToast({ type: 'error', message: res.message || 'Gagal mengubah status akun mahasiswa.' });
      }
    } catch (err: any) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // 5. SAVE RESET PASSWORD
  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;

    if (!resetPassword || !resetConfirmPassword) {
      setToast({ type: 'error', message: 'Password baru dan konfirmasi password wajib diisi!' });
      return;
    }

    if (resetPassword !== resetConfirmPassword) {
      setToast({ type: 'error', message: 'Konfirmasi password tidak cocok dengan password baru!' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await callGAS(
        'resetPanitiaUserPassword',
        user.userId,
        resetPasswordUser.user_id,
        resetPassword,
        resetConfirmPassword
      );

      if (res.success) {
        setToast({
          type: 'success',
          message: `Password akun ${resetPasswordUser.username} berhasil diperbarui!`
        });
        setResetPasswordUser(null);
        setResetPassword('');
        setResetConfirmPassword('');
      } else {
        setToast({ type: 'error', message: res.message || 'Gagal mereset password.' });
      }
    } catch (err: any) {
      setToast({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Lists
  const filteredPanitiaUsers = panitiaUsers.filter((u) => {
    const q = searchPanitia.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (u.name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q);

    let matchesStatus = true;
    if (statusPanitiaFilter !== 'ALL') {
      const isActive = u.status === 'ACTIVE' || u.status === 'AKTIF' || u.status === 'TERVERIFIKASI';
      if (statusPanitiaFilter === 'ACTIVE') matchesStatus = isActive;
      else if (statusPanitiaFilter === 'INACTIVE') matchesStatus = !isActive;
    }

    return matchesSearch && matchesStatus;
  });

  const filteredStudentUsers = studentUsers.filter((st) => {
    const q = searchStudent.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (st.name || '').toLowerCase().includes(q) ||
      (st.nim || st.username || '').toLowerCase().includes(q) ||
      (st.email || '').toLowerCase().includes(q) ||
      (st.class_name || '').toLowerCase().includes(q);

    let matchesStatus = true;
    if (statusStudentFilter !== 'ALL') {
      const isActive = st.status === 'ACTIVE' || st.status === 'AKTIF' || st.status === 'TERVERIFIKASI';
      if (statusStudentFilter === 'ACTIVE') matchesStatus = isActive;
      else if (statusStudentFilter === 'INACTIVE') matchesStatus = !isActive;
    }

    return matchesSearch && matchesStatus;
  });

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

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" /> Pengelolaan User &amp; Hak Akses
          </div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Otorisasi User Portal Panitia &amp; Mahasiswa</h2>
          <p className="text-xs text-gray-500 mt-1">
            Kelola akun petugas Panitia dan akun Mahasiswa secara terpisah dalam tab mandiri yang aman.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {activeSubTab === 'PANITIA' && (
            <button
              type="button"
              onClick={() => setAddUserModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah User Panitia</span>
            </button>
          )}

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="bg-white p-1.5 border border-gray-200 rounded-2xl flex gap-2 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveSubTab('PANITIA')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
            activeSubTab === 'PANITIA'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>[ USER PANITIA ]</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeSubTab === 'PANITIA' ? 'bg-purple-800 text-purple-100' : 'bg-gray-200 text-gray-700'
          }`}>
            {panitiaUsers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('MAHASISWA')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
            activeSubTab === 'MAHASISWA'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>[ USER MAHASISWA ]</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeSubTab === 'MAHASISWA' ? 'bg-indigo-800 text-indigo-100' : 'bg-gray-200 text-gray-700'
          }`}>
            {studentUsers.length}
          </span>
        </button>
      </div>

      {/* ---------------- SECTION 1: TAB USER PANITIA ---------------- */}
      {activeSubTab === 'PANITIA' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-4">
          {/* Toolbar Filter & Search */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchPanitia}
                onChange={(e) => setSearchPanitia(e.target.value)}
                placeholder="Cari Nama, Username, Email Panitia..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusPanitiaFilter}
                onChange={(e) => setStatusPanitiaFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 focus:bg-white"
              >
                <option value="ALL">Semua Status Akun Panitia</option>
                <option value="ACTIVE">🟢 Aktif</option>
                <option value="INACTIVE">🔴 Nonaktif</option>
              </select>
            </div>
          </div>

          {/* DESKTOP TABLE USER PANITIA */}
          <div className="hidden md:block overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
                <tr>
                  <th className="p-3">Nama Lengkap</th>
                  <th className="p-3">Username</th>
                  <th className="p-3">Email</th>
                  <th className="p-3 text-center">Role</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3">Tanggal Dibuat</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                      <span>Memuat data panitia...</span>
                    </td>
                  </tr>
                ) : filteredPanitiaUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      <p className="font-semibold">Tidak Ada User Panitia Ditemukan</p>
                      <p className="text-[11px]">Belum ada pengguna panitia sesuai kriteria pencarian.</p>
                    </td>
                  </tr>
                ) : (
                  filteredPanitiaUsers.map((u) => {
                    const isActive = u.status === 'ACTIVE' || u.status === 'AKTIF' || u.status === 'TERVERIFIKASI';
                    const isAdminMain = u.username === 'admin' || u.user_id === 'USR-ADMIN-01';

                    return (
                      <tr key={u.user_id || u.username} className="hover:bg-gray-50/80 transition">
                        <td className="p-3 font-bold text-gray-900">
                          {u.name}
                        </td>

                        <td className="p-3 font-mono font-bold text-purple-900">
                          @{u.username}
                        </td>

                        <td className="p-3 text-gray-700 font-medium">
                          {u.email || '-'}
                        </td>

                        <td className="p-3 text-center">
                          <span className="px-2.5 py-0.5 bg-purple-100 text-purple-900 border border-purple-300 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                            <Shield className="w-3 h-3 text-purple-600" />
                            <span>PANITIA</span>
                          </span>
                        </td>

                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 border ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : 'bg-rose-100 text-rose-900 border-rose-300'
                            }`}
                          >
                            {isActive ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Ban className="w-3 h-3 text-rose-600" />}
                            <span>{isActive ? 'AKTIF' : 'NONAKTIF'}</span>
                          </span>
                        </td>

                        <td className="p-3 text-gray-500 font-mono text-[11px]">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID') : '-'}
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditPanitiaModalUser(u);
                                setEditName(u.name);
                                setEditEmail(u.email);
                              }}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                              title="Edit Data Panitia"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              disabled={submitting || isAdminMain}
                              onClick={() => handleTogglePanitiaStatus(u)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                isAdminMain
                                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                  : isActive
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                              }`}
                              title={isAdminMain ? 'Admin Utama Tidak Dapat Dinonaktifkan' : isActive ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                            >
                              <span>{isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setResetPasswordUser({ user_id: u.user_id, name: u.name, username: u.username, role: 'PANITIA' });
                                setResetPassword('');
                                setResetConfirmPassword('');
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                              title="Reset Password"
                            >
                              <Key className="w-3 h-3" />
                              <span>Reset Pass</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE RESPONSIVE PANITIA CARDS */}
          <div className="block md:hidden space-y-3">
            {filteredPanitiaUsers.map((u) => {
              const isActive = u.status === 'ACTIVE' || u.status === 'AKTIF' || u.status === 'TERVERIFIKASI';
              const isAdminMain = u.username === 'admin' || u.user_id === 'USR-ADMIN-01';

              return (
                <div key={u.user_id || u.username} className="p-4 bg-purple-50/50 border border-purple-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2 border-b border-purple-200/60 pb-2">
                    <div>
                      <span className="font-bold text-gray-900 text-sm block">{u.name}</span>
                      <span className="font-mono text-purple-900 font-bold text-xs block">@{u.username} &bull; {u.email}</span>
                    </div>

                    <span className="px-2 py-0.5 text-[9px] font-black rounded-full bg-purple-100 text-purple-900 border border-purple-200 uppercase">
                      PANITIA
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-500">
                      Status: <strong className={isActive ? 'text-emerald-700' : 'text-rose-700'}>{isActive ? 'AKTIF' : 'NONAKTIF'}</strong>
                    </span>
                    <span className="text-gray-400 font-mono text-[10px]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID') : '-'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-purple-200/60 flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditPanitiaModalUser(u);
                        setEditName(u.name);
                        setEditEmail(u.email);
                      }}
                      className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      disabled={submitting || isAdminMain}
                      onClick={() => handleTogglePanitiaStatus(u)}
                      className={`px-2.5 py-1 font-bold rounded-lg text-xs cursor-pointer ${
                        isAdminMain
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : isActive
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-600 text-white shadow-xs'
                      }`}
                    >
                      <span>{isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setResetPasswordUser({ user_id: u.user_id, name: u.name, username: u.username, role: 'PANITIA' });
                        setResetPassword('');
                        setResetConfirmPassword('');
                      }}
                      className="px-2.5 py-1 bg-slate-100 text-slate-800 font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>Reset Pass</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- SECTION 2: TAB USER MAHASISWA ---------------- */}
      {activeSubTab === 'MAHASISWA' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-4">
          {/* Toolbar Filter & Search */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                placeholder="Cari Nama, NIM, Email, atau Kelas..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusStudentFilter}
                onChange={(e) => setStatusStudentFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 focus:bg-white"
              >
                <option value="ALL">Semua Status Akun Mahasiswa</option>
                <option value="ACTIVE">🟢 Aktif / Terverifikasi</option>
                <option value="INACTIVE">🔴 Nonaktif</option>
              </select>
            </div>
          </div>

          {/* DESKTOP TABLE USER MAHASISWA */}
          <div className="hidden md:block overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
                <tr>
                  <th className="p-3">Nama Lengkap</th>
                  <th className="p-3">NIM</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Kelas</th>
                  <th className="p-3 text-center">Status Akun</th>
                  <th className="p-3">Tanggal Registrasi</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                      <span>Memuat data akun mahasiswa...</span>
                    </td>
                  </tr>
                ) : filteredStudentUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      <p className="font-semibold">Tidak Ada User Mahasiswa Ditemukan</p>
                      <p className="text-[11px]">Belum ada data akun mahasiswa terdaftar sesuai pencarian.</p>
                    </td>
                  </tr>
                ) : (
                  filteredStudentUsers.map((st) => {
                    const isActive = st.status === 'ACTIVE' || st.status === 'AKTIF' || st.status === 'TERVERIFIKASI';

                    return (
                      <tr key={st.user_id || st.nim} className="hover:bg-gray-50/80 transition">
                        <td className="p-3 font-bold text-gray-900">
                          {st.name}
                        </td>

                        <td className="p-3 font-mono font-bold text-indigo-800">
                          {st.nim || st.username || '-'}
                        </td>

                        <td className="p-3 text-gray-700 font-medium">
                          {st.email || '-'}
                        </td>

                        <td className="p-3 font-mono font-bold text-indigo-700">
                          <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded-md">
                            {st.class_name || '-'}
                          </span>
                        </td>

                        <td className="p-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 border ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : 'bg-rose-100 text-rose-900 border-rose-300'
                            }`}
                          >
                            {isActive ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Ban className="w-3 h-3 text-rose-600" />}
                            <span>{isActive ? 'TERVERIFIKASI' : 'NONAKTIF'}</span>
                          </span>
                        </td>

                        <td className="p-3 text-gray-500 font-mono text-[11px]">
                          {st.created_at ? new Date(st.created_at).toLocaleDateString('id-ID') : '-'}
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setDetailStudentUser(st)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                              title="Lihat Detail Profil Mahasiswa"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Detail</span>
                            </button>

                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => handleToggleStudentStatus(st)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                isActive
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                              }`}
                              title={isActive ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                            >
                              <span>{isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setResetPasswordUser({ user_id: st.user_id || st.nim, name: st.name, username: st.nim || st.username, role: 'MAHASISWA' });
                                setResetPassword('');
                                setResetConfirmPassword('');
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                              title="Reset Password Akun Mahasiswa"
                            >
                              <Key className="w-3.5 h-3.5" />
                              <span>Reset Pass</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE RESPONSIVE MAHASISWA CARDS */}
          <div className="block md:hidden space-y-3">
            {filteredStudentUsers.map((st) => {
              const isActive = st.status === 'ACTIVE' || st.status === 'AKTIF' || st.status === 'TERVERIFIKASI';

              return (
                <div key={st.user_id || st.nim} className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2 border-b border-indigo-200/60 pb-2">
                    <div>
                      <span className="font-bold text-gray-900 text-sm block">{st.name}</span>
                      <span className="font-mono text-indigo-900 font-bold text-xs block">NIM: {st.nim || st.username} &bull; {st.class_name || '-'}</span>
                    </div>

                    <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200 uppercase">
                      MAHASISWA
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-500">
                      Status: <strong className={isActive ? 'text-emerald-700' : 'text-rose-700'}>{isActive ? 'TERVERIFIKASI' : 'NONAKTIF'}</strong>
                    </span>
                    <span className="text-gray-400 font-mono text-[10px]">
                      {st.created_at ? new Date(st.created_at).toLocaleDateString('id-ID') : '-'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-indigo-200/60 flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDetailStudentUser(st)}
                      className="px-2.5 py-1 bg-indigo-100 text-indigo-800 font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Detail</span>
                    </button>

                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleToggleStudentStatus(st)}
                      className={`px-2.5 py-1 font-bold rounded-lg text-xs cursor-pointer ${
                        isActive
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-600 text-white shadow-xs'
                      }`}
                    >
                      <span>{isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setResetPasswordUser({ user_id: st.user_id || st.nim, name: st.name, username: st.nim || st.username, role: 'MAHASISWA' });
                        setResetPassword('');
                        setResetConfirmPassword('');
                      }}
                      className="px-2.5 py-1 bg-slate-100 text-slate-800 font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>Reset Pass</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 1. MODAL TAMBAH USER PANITIA */}
      {addUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Tambah User Panitia Baru</h3>
                <p className="text-xs text-gray-500">Buat kredensial akun petugas Panitia untuk mengakses Portal Panitia.</p>
              </div>
              <button
                type="button"
                onClick={() => setAddUserModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePanitiaUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Nama Lengkap Petugas</label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Contoh: Budi Susanto, S.T."
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Username Login</label>
                <input
                  type="text"
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                  placeholder="Contoh: panitia_budi"
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-mono text-purple-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Email Resmi</label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="Contoh: budi.panitia@campus.ac.id"
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Password Login</label>
                <input
                  type="password"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  placeholder="Masukkan password rahasia"
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Konfirmasi Password</label>
                <input
                  type="password"
                  value={addConfirmPassword}
                  onChange={(e) => setAddConfirmPassword(e.target.value)}
                  placeholder="Ulangi password rahasia"
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Role Otorisasi</label>
                <input
                  type="text"
                  value="PANITIA"
                  disabled
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-xl font-black text-purple-800 cursor-not-allowed uppercase"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">Role dikunci secara khusus pada sistem Otorisasi PANITIA.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAddUserModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  <span>Simpan User Panitia</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. MODAL EDIT PANITIA */}
      {editPanitiaModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Edit Data User Panitia</h3>
                <p className="text-xs text-gray-500 font-mono">Username: @{editPanitiaModalUser.username}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditPanitiaModalUser(null)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPanitia} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold text-gray-900"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditPanitiaModalUser(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. MODAL RESET PASSWORD */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-indigo-600" />
                  <span>Reset Password User ({resetPasswordUser.role})</span>
                </h3>
                <p className="text-xs text-gray-500 font-mono">User: {resetPasswordUser.name} (@{resetPasswordUser.username})</p>
              </div>
              <button
                type="button"
                onClick={() => setResetPasswordUser(null)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Password Baru</label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Masukkan password baru"
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Konfirmasi Password Baru</label>
                <input
                  type="password"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <p className="text-[10px] text-gray-400">
                Password rahasia akan disimpan dengan enkripsi aman. Password lama tidak akan pernah ditampilkan kembali.
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setResetPasswordUser(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL DETAIL MAHASISWA */}
      {detailStudentUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Profil Akun Mahasiswa</h3>
                  <p className="text-xs text-gray-500 font-mono">NIM: {detailStudentUser.nim || detailStudentUser.username}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailStudentUser(null)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <span className="font-bold text-gray-900 text-sm">{detailStudentUser.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                    MAHASISWA
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">NIM Mahasiswa</span>
                    <span className="font-mono font-bold text-gray-900">{detailStudentUser.nim || detailStudentUser.username}</span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Kode Kelas</span>
                    <span className="font-mono font-bold text-indigo-700">{detailStudentUser.class_name || '-'}</span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Email Terdaftar</span>
                    <span className="text-gray-800 font-medium">{detailStudentUser.email || '-'}</span>
                  </div>

                  {detailStudentUser.phone && (
                    <div className="col-span-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">No. WhatsApp</span>
                      <span className="text-gray-800 font-mono">{detailStudentUser.phone}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-[11px]">
                  <span className="text-gray-500">Status Akun:</span>
                  <span className="font-bold text-emerald-700">
                    {detailStudentUser.status === 'ACTIVE' || detailStudentUser.status === 'AKTIF' || detailStudentUser.status === 'TERVERIFIKASI'
                      ? 'TERVERIFIKASI / AKTIF'
                      : 'BELUM VERIFIKASI / NONAKTIF'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setDetailStudentUser(null)}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Tutup Profil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
