import React, { useState, useEffect } from 'react';
import {
  Shirt,
  ArrowRight,
  KeyRound,
  User,
  Loader2,
  ShieldAlert,
  Sparkles,
  Search,
  UserPlus,
  LogIn,
  Mail,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { api } from '../services/apiClient';
import { User as UserType, TrackOrderResult } from '../types';
import { HelpModal } from './HelpModal';

interface LoginViewProps {
  onLoginSuccess: (user: UserType) => void;
}

type AuthMode = 'login' | 'register' | 'forgot' | 'reset_password' | 'track' | 'setup_admin';

const CLASS_CODE_REGEX = /^\d{2}(MJSP|MJSM|MJSE)\d{3}$/i;

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Initial Admin Setup State (FASE J1-A)
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [isSetupNeeded, setIsSetupNeeded] = useState(false);

  // Register State
  const [regNim, setRegNim] = useState('');
  const [regName, setRegName] = useState('');
  const [regClass, setRegClass] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [simVerifyLink, setSimVerifyLink] = useState('');

  // Forgot / Reset Password State
  const [forgotNim, setForgotNim] = useState('');
  const [resetTokenState, setResetTokenState] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [simResetLink, setSimResetLink] = useState('');

  // Track State
  const [trackNim, setTrackNim] = useState('');
  const [tracking, setTracking] = useState(false);
  const [trackResult, setTrackResult] = useState<TrackOrderResult | null>(null);

  // Check URL query parameters for verify_token or reset_token on mount
  useEffect(() => {
    const checkInitialSetup = async () => {
      try {
        const res = await api.getSetupStatus();
        if (res.success && res.data?.is_setup_needed) {
          setIsSetupNeeded(true);
          setAuthMode('setup_admin');
        }
      } catch {}
    };
    checkInitialSetup();

    const params = new URLSearchParams(window.location.search);
    const verifyToken = params.get('verify_token') || params.get('token');
    const resetToken = params.get('reset_token');

    if (verifyToken) {
      handleVerifyToken(verifyToken);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (resetToken) {
      setResetTokenState(resetToken);
      setAuthMode('reset_password');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleVerifyToken = async (token: string) => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await api.verifyAccountToken(token);
      if (res.success) {
        setSuccessMessage(res.message || 'Akun berhasil diverifikasi. Silakan login.');
        setSimVerifyLink('');
        setAuthMode('login');
      } else {
        setErrorMessage(res.message || 'Gagal memverifikasi akun.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat memverifikasi token.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password Link Request
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotNim.trim()) return;

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    setSimResetLink('');

    try {
      const res = await api.forgotPassword(forgotNim.trim());
      if (res.success) {
        setSuccessMessage(res.message || 'Jika akun terdaftar, link reset password akan dikirim ke email yang terdaftar.');
        if (res.data && res.data.resetLink) {
          setSimResetLink(res.data.resetLink);
        }
      } else {
        setErrorMessage(res.message || 'Gagal memproses permintaan reset password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Initial Admin Setup (FASE J1-A)
  const handleSetupAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!adminName.trim() || !adminEmail.trim() || !adminPassword) {
      setErrorMessage('Nama lengkap, email, dan kata sandi wajib diisi.');
      return;
    }

    if (adminPassword.length < 6) {
      setErrorMessage('Kata sandi minimal 6 karakter.');
      return;
    }

    if (adminPassword !== adminConfirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.setupInitialAdmin({
        name: adminName.trim(),
        email: adminEmail.trim().toLowerCase(),
        password: adminPassword,
        confirmPassword: adminConfirmPassword
      });

      if (res.success) {
        setSuccessMessage('Akun Panitia pertama berhasil dibuat! Silakan login untuk melanjutkan.');
        setIsSetupNeeded(false);
        setAuthMode('login');
        setUsername(adminEmail.trim().toLowerCase());
        setPassword('');
        setAdminName('');
        setAdminEmail('');
        setAdminPassword('');
        setAdminConfirmPassword('');
      } else {
        setErrorMessage(res.message || 'Gagal membuat akun panitia awal.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat membuat akun panitia.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Reset Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) return;

    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi password tidak cocok.');
      return;
    }

    if (newPassword.length < 3) {
      setErrorMessage('Password minimal terdiri dari 3 karakter.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await api.resetPassword(resetTokenState, newPassword);
      if (res.success) {
        setSuccessMessage(res.message || 'Password berhasil diubah. Silakan login.');
        setNewPassword('');
        setConfirmPassword('');
        setResetTokenState('');
        setSimResetLink('');
        setAuthMode('login');
      } else {
        setErrorMessage(res.message || 'Gagal mengubah password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await api.login({ username, password });
      if (res.success && res.data) {
        onLoginSuccess(res.data);
      } else {
        setErrorMessage(res.message || 'Login gagal.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Register (Requirement 1, 2, 3)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setSimVerifyLink('');

    if (!regNim.trim() || !regName.trim() || !regClass.trim() || !regEmail.trim() || !regPassword) {
      setErrorMessage('Seluruh kolom wajib diisi.');
      return;
    }

    if (!CLASS_CODE_REGEX.test(regClass.trim())) {
      setErrorMessage('Format Kelas tidak valid! Harus berformat ##MJSP###, ##MJSM###, atau ##MJSE### (Contoh: 01MJSP001).');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        nim: regNim.trim(),
        name: regName.trim(),
        className: regClass.trim().toUpperCase(),
        email: regEmail.trim(),
        password: regPassword
      };

      const res = await api.registerStudent(payload);
      if (res.success && res.data) {
        setSuccessMessage(res.message || 'Registrasi berhasil! Silakan cek email Anda untuk memverifikasi akun.');
        if (res.data.verificationLink) {
          setSimVerifyLink(res.data.verificationLink);
        }
        setRegNim('');
        setRegName('');
        setRegClass('');
        setRegEmail('');
        setRegPassword('');
      } else {
        setErrorMessage(res.message || 'Registrasi gagal.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Track Order Public
  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackNim.trim()) return;

    setTracking(true);
    setErrorMessage('');
    setTrackResult(null);

    try {
      const res = await api.trackOrderPublic(trackNim);
      if (res.success && res.data) {
        setTrackResult(res.data);
      } else {
        setErrorMessage(res.message || 'Gagal melacak pesanan.');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setTracking(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMessage('');
    setAuthMode('login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-emerald-50 flex items-center justify-center p-4 relative">
      {/* Floating Top Right Panduan Button */}
      <div className="absolute top-4 right-4 z-20">
        <button
          type="button"
          onClick={() => setHelpModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold transition cursor-pointer border border-indigo-200 shadow-sm"
          title="Buka Panduan Aplikasi"
        >
          <HelpCircle className="w-4 h-4 text-indigo-600" />
          <span>Panduan</span>
        </button>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-6">
        {/* App Logo & Title */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-200">
            <Shirt className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">PDH Campus Order</h1>
          <p className="text-xs text-gray-500 font-medium">Sistem Pemesanan PDH &amp; Database Terintegrasi</p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'login' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Masuk</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'register' ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Registrasi</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode('track');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'track' ? 'bg-white text-amber-700 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Lacak NIM</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-emerald-800 text-xs animate-fade-in font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Simulated Email Verification Box */}
        {simVerifyLink && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-xs text-amber-900 animate-fade-in">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <Mail className="w-4 h-4 text-amber-600" />
              <span>Simulasi Email Masuk (Environment Preview)</span>
            </div>
            <p className="text-[11px] text-amber-700">
              Email berisi link verifikasi dikirimkan. Klik tombol di bawah untuk mensimulasikan verifikasi link email Anda:
            </p>
            <a
              href={simVerifyLink}
              onClick={(e) => {
                e.preventDefault();
                const url = new URL(simVerifyLink);
                const token = url.searchParams.get('verify_token');
                if (token) handleVerifyToken(token);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>KLIK LINK VERIFIKASI AKUN EMAIL</span>
            </a>
          </div>
        )}

        {/* Simulated Reset Link Box */}
        {simResetLink && (
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2 text-xs text-indigo-900 animate-fade-in">
            <div className="font-bold flex items-center gap-1.5 text-indigo-800">
              <Mail className="w-4 h-4 text-indigo-600" />
              <span>Simulasi Email Reset Password (Environment Preview)</span>
            </div>
            <p className="text-[11px] text-indigo-700">
              Email berisi link reset password dikirimkan. Klik tombol di bawah untuk mensimulasikan membuka link email Anda:
            </p>
            <button
              type="button"
              onClick={() => {
                const url = new URL(simResetLink);
                const token = url.searchParams.get('reset_token');
                if (token) {
                  setResetTokenState(token);
                  setAuthMode('reset_password');
                  setErrorMessage('');
                  setSuccessMessage('');
                  setSimResetLink('');
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition shadow-xs cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>KLIK LINK RESET PASSWORD</span>
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs animate-shake font-medium">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* TAB 1: LOGIN FORM */}
        {authMode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                Username / NIM
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Masukkan NIM atau username admin"
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Masukkan password"
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-semibold text-xs transition shadow-md shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi Akses...</span>
                </>
              ) : (
                <>
                  <span>Masuk Aplikasi</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Lupa Password Link */}
            <div className="text-right pt-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('forgot');
                  setErrorMessage('');
                  setSuccessMessage('');
                  setForgotNim(username);
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer hover:underline"
              >
                Lupa Password?
              </button>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {authMode === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-4 animate-fade-in">
            <div className="border-b border-gray-100 pb-2">
              <h2 className="text-base font-black text-gray-900 uppercase tracking-tight">RESET PASSWORD</h2>
              <p className="text-xs text-gray-500">Masukkan NIM akun Anda untuk menerima link reset password.</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                NIM
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={forgotNim}
                  onChange={(e) => setForgotNim(e.target.value)}
                  required
                  placeholder="Masukkan NIM Anda"
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              <span>KIRIM LINK RESET PASSWORD</span>
            </button>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
              Jika akun terdaftar, link reset password akan dikirim ke email yang terdaftar.
            </div>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="text-xs font-bold text-gray-500 hover:text-gray-800 transition cursor-pointer"
              >
                ← Kembali ke Halaman Login
              </button>
            </div>
          </form>
        )}

        {/* RESET PASSWORD NEW PASSWORD FORM */}
        {authMode === 'reset_password' && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4 animate-fade-in">
            <div className="border-b border-gray-100 pb-2">
              <h2 className="text-base font-black text-gray-900 uppercase tracking-tight">BUAT PASSWORD BARU</h2>
              <p className="text-xs text-gray-500">Silakan tentukan password baru untuk akun Anda.</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                Password Baru
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Masukkan password baru"
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                Konfirmasi Password Baru
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Ulangi password baru"
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>SIMPAN PASSWORD BARU</span>
            </button>
          </form>
        )}

        {/* INITIAL ADMIN SETUP FORM (FASE J1-A) */}
        {authMode === 'setup_admin' && (
          <form onSubmit={handleSetupAdminSubmit} className="space-y-3.5 animate-fade-in">
            <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-1">
              <div className="flex items-center gap-2 text-indigo-900 font-black text-xs uppercase tracking-tight">
                <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <span>Inisialisasi Administrator Panitia</span>
              </div>
              <p className="text-[11px] text-indigo-700 leading-relaxed">
                Tenant prodi ini belum memiliki akun Panitia aktif. Silakan daftarkan akun administrator utama pertama untuk mulai mengelola sistem pemesanan PDH.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                Nama Lengkap Panitia
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  required
                  placeholder="Contoh: Admin Panitia PDH"
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                Email Resmi / Email Pribadi
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  placeholder="admin.pdh@campus.ac.id"
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block font-bold uppercase text-gray-600 mb-1">Kata Sandi</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Min. 6 Karakter"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-gray-600 mb-1">Konfirmasi Sandi</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={adminConfirmPassword}
                    onChange={(e) => setAdminConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Ulangi Sandi"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>SELESAIKAN SETUP & BUAT AKUN PANITIA</span>
            </button>

            {!isSetupNeeded && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-xs font-bold text-gray-500 hover:text-gray-800 transition cursor-pointer"
                >
                  ← Kembali ke Halaman Login
                </button>
              </div>
            )}
          </form>
        )}

        {/* TAB 2: REGISTRASI MAHASISWA FORM (Requirement 1, 2, 8) */}
        {authMode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block font-bold uppercase text-gray-600 mb-1">NIM (Student ID)</label>
                <input
                  type="text"
                  value={regNim}
                  onChange={(e) => setRegNim(e.target.value)}
                  required
                  placeholder="e.g. 2026101005"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-gray-600 mb-1">Kelas (01MJSP001)</label>
                <input
                  type="text"
                  value={regClass}
                  onChange={(e) => setRegClass(e.target.value.toUpperCase())}
                  required
                  placeholder="e.g. 01MJSP001"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-mono font-bold uppercase text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
                placeholder="Nama sesuai KTM"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Email Pribadi</label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
                placeholder="mahasiswa@gmail.com"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Password</label>
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
                placeholder="Buat password akun"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium"
              />
            </div>

            {/* Requirement 8 Info Box */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
              <Mail className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>Setelah mendaftar, link verifikasi akan dikirim ke email pribadi Anda.</span>
            </div>

            {/* Requirement 2 Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              <span>DAFTAR AKUN MAHASISWA</span>
            </button>
          </form>
        )}

        {/* TAB 3: FITUR LACAK PESANAN PUBLIC (Requirement 6 & 7) */}
        {authMode === 'track' && (
          <div className="space-y-4">
            <p className="text-xs text-gray-600">
              Cukup masukkan <strong>NIM</strong> kamu tanpa perlu login untuk mengecek status keikutsertaan pesanan PDH.
            </p>

            <form onSubmit={handleTrackSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">NIM Mahasiswa</label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={trackNim}
                    onChange={(e) => setTrackNim(e.target.value)}
                    required
                    placeholder="Masukkan NIM e.g. 2026101001"
                    className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono font-bold"
                  />
                  <button
                    type="submit"
                    disabled={tracking}
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    {tracking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    <span>Lacak</span>
                  </button>
                </div>
              </div>
            </form>

            {/* TRACKING RESULT POPUP CARD */}
            {trackResult && (
              <div className="animate-fade-in space-y-3">
                {trackResult.found ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                      <span className="px-2.5 py-0.5 bg-emerald-600 text-white font-black text-[10px] rounded-md uppercase">
                        DATA PESANAN DITEMUKAN
                      </span>
                      <span className="font-mono font-bold text-emerald-800">{trackResult.orderNumber}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400 block text-[10px] uppercase font-bold">Nama Mahasiswa</span>
                        <span className="font-bold text-gray-900">{trackResult.studentName}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px] uppercase font-bold">NIM &amp; Kelas</span>
                        <span className="font-mono font-bold text-gray-900">{trackResult.nim} ({trackResult.className})</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px] uppercase font-bold">Ukuran PDH</span>
                        <span className="font-mono font-black text-emerald-800 text-sm">Ukuran {trackResult.sizeCode}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px] uppercase font-bold">Bordir Nama Kustom</span>
                        <span className="font-bold text-gray-900">{trackResult.customName}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px] uppercase font-bold">Jenis Pemesanan</span>
                        <span className="font-bold text-indigo-700 uppercase">{trackResult.orderType}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px] uppercase font-bold">Status Pembayaran</span>
                        <span className="font-bold text-emerald-800 uppercase">{trackResult.paymentStatus}</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white border border-emerald-200 rounded-xl space-y-2 text-[11px] text-emerald-900">
                      <div className="flex items-center justify-between">
                        <span>Status Produksi Vendor:</span>
                        <span className="font-bold uppercase text-emerald-700">{trackResult.productionStatus || 'Belum Diproduksi'}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span>Progres: {trackResult.productionPercentage || 0}%</span>
                          <span className="text-[10px] text-gray-500 font-normal">{trackResult.productionNotes || '-'}</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              (trackResult.productionPercentage || 0) === 100
                                ? 'bg-emerald-500'
                                : (trackResult.productionPercentage || 0) > 40
                                ? 'bg-blue-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${trackResult.productionPercentage || 0}%` }}
                          />
                        </div>
                      </div>

                      {trackResult.productionPhotoUrl && (
                        <div className="pt-1">
                          <span className="text-[10px] font-bold text-gray-500 block mb-1">Foto Perkembangan Vendor Terbaru:</span>
                          <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden border border-emerald-100">
                            <img src={trackResult.productionPhotoUrl} alt="Foto Progres Vendor" className="w-full h-full object-cover" />
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t border-emerald-100 flex items-center justify-between text-[11px] font-bold">
                        <span>Status Pengambilan:</span>
                        {trackResult.pickupStatus === 'Sudah Diambil' ? (
                          <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-black">SUDAH DIAMBIL</span>
                        ) : trackResult.pickupStatus === 'Siap Diambil' ? (
                          <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-black animate-pulse">PDH Sudah Dapat Diambil</span>
                        ) : (
                          <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded">PDH Belum Siap Diambil</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-1 text-center">
                    <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
                    <div className="font-bold">{trackResult.message || 'Data NIM Anda tidak ditemukan dalam pesanan PDH.'}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Public Landing Page Help Modal */}
      <HelpModal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
        mode="PUBLIC"
      />
    </div>
  );
};
