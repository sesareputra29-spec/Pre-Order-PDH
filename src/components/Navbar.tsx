import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { Shirt, LogOut, Code, Shield, UserCheck, Key, User as UserIcon, ChevronDown, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';
import { callGAS } from '../gas/gasBridge';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  onOpenGASExporter: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout, onOpenGASExporter }) => {
  if (!user) return null;

  const isPanitia = user.role === 'PANITIA';

  // Account Menu Popover State
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);

  // Change Password Form State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Close account menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 3) {
      setPasswordFeedback({ type: 'error', message: 'Password baru minimal 3 karakter.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'Konfirmasi password baru tidak cocok.' });
      return;
    }

    setSavingPassword(true);
    setPasswordFeedback(null);

    try {
      // In simulator or GAS, we update user password
      const res = await callGAS('resetPasswordWithToken', user.userId, newPassword);
      if (res.success) {
        setPasswordFeedback({ type: 'success', message: 'Password berhasil diperbarui!' });
        setTimeout(() => {
          setChangePasswordModalOpen(false);
          setOldPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setPasswordFeedback(null);
        }, 1500);
      } else {
        setPasswordFeedback({ type: 'error', message: res.message || 'Gagal mengubah password.' });
      }
    } catch (err: any) {
      setPasswordFeedback({ type: 'error', message: err.message || 'Gagal mengubah password.' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-2 sticky top-0 z-30 shadow-2xs flex items-center justify-between gap-2">
      {/* Brand Header */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white font-bold shadow-xs flex-shrink-0 ${
            isPanitia ? 'bg-indigo-600 shadow-indigo-100' : 'bg-emerald-600 shadow-emerald-100'
          }`}
        >
          <Shirt className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
            <h1 className="font-bold text-gray-900 text-xs sm:text-base leading-tight truncate">PDH Campus Order</h1>
            <span
              className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full uppercase border whitespace-nowrap ${
                isPanitia
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {isPanitia ? 'PANITIA' : 'MAHASISWA'}
            </span>
          </div>
          <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">Sistem Pemesanan Resmi Kampus</p>
        </div>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
        {/* Notification Bell Dropdown */}
        <NotificationDropdown user={user} />

        {/* Account Menu Dropdown */}
        <div className="relative" ref={accountMenuRef}>
          <button
            type="button"
            onClick={() => setAccountMenuOpen(!accountMenuOpen)}
            className="min-h-[44px] flex items-center gap-2 bg-gray-50 hover:bg-gray-100 px-2.5 sm:px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 transition cursor-pointer"
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 ${
                isPanitia ? 'bg-indigo-600' : 'bg-emerald-600'
              }`}
            >
              {user.name ? user.name.charAt(0).toUpperCase() : 'M'}
            </div>
            <span className="hidden sm:inline max-w-[120px] truncate">{user.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {/* Account Popover Menu */}
          {accountMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden text-xs animate-fade-in divide-y divide-gray-100">
              {/* Profile Overview Header */}
              <div className="p-3.5 bg-gray-50 space-y-0.5">
                <div className="font-bold text-gray-900 truncate">{user.name}</div>
                <div className="text-[11px] text-gray-500 font-mono">@{user.username || user.nim}</div>
                <span className="inline-block mt-1 text-[9px] font-bold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                  {user.role}
                </span>
              </div>

              {/* Menu Actions */}
              <div className="p-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    setChangePasswordModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 hover:text-emerald-700 rounded-xl transition flex items-center gap-2 font-medium cursor-pointer"
                >
                  <Key className="w-4 h-4 text-emerald-600" />
                  <span>Ubah Password</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl transition flex items-center gap-2 font-medium cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>Logout / Keluar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      {changePasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-gray-900 text-base">Ubah Password Akun</h3>
              </div>
              <button
                type="button"
                onClick={() => setChangePasswordModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  passwordFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {passwordFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{passwordFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Password Baru</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Masukkan password baru..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Konfirmasi Password Baru</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Ketik ulang password baru..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setChangePasswordModalOpen(false)}
                  className="py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold cursor-pointer transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-100"
                >
                  {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  <span>Simpan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
