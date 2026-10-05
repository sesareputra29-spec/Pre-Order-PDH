import React, { useState, useEffect, useRef } from 'react';
import { User, NotificationRecord } from '../types';
import { api } from '../services/apiClient';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  Package,
  CreditCard,
  Factory,
  PackageCheck,
  Mail,
  X,
  CheckCheck,
  Sparkles,
  ShieldAlert,
  Loader2
} from 'lucide-react';

interface NotificationDropdownProps {
  user: User;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [panitiaAlerts, setPanitiaAlerts] = useState<{
    pendingPaymentsCount: number;
    pendingOrdersCount: number;
    productionActiveCount: number;
    readyPickupCount: number;
    alertsList: Array<{ id: string; title: string; count: number; type: string; message: string }>;
  } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const isPanitia = user.role === 'PANITIA';

  const fetchNotifications = async () => {
    try {
      if (isPanitia) {
        const [ordersRes, paymentsRes] = await Promise.all([
          api.listOrders(),
          api.listPayments()
        ]);
        const orders = ordersRes.data || [];
        const payments = paymentsRes.data || [];
        const pendingPayments = payments.filter((p: any) => p.status === 'PENDING' || p.status === 'SUBMITTED' || p.status === 'MENUNGGU VERIFIKASI').length;
        const pendingOrders = orders.filter((o: any) => o.status === 'MENUNGGU_PEMBAYARAN' || o.payment_status === 'MENUNGGU VERIFIKASI').length;
        const prodActive = orders.filter((o: any) => o.production_status === 'Sedang Diproduksi').length;
        const readyPickup = orders.filter((o: any) => o.pickup_status === 'Siap Diambil').length;

        setPanitiaAlerts({
          pendingPaymentsCount: pendingPayments,
          pendingOrdersCount: pendingOrders,
          productionActiveCount: prodActive,
          readyPickupCount: readyPickup,
          alertsList: [
            { id: 'pay', title: 'Pembayaran Menunggu Verifikasi', count: pendingPayments, type: 'PAYMENT', message: `${pendingPayments} pembayaran memerlukan verifikasi segera.` },
            { id: 'ord', title: 'Pesanan Baru Masuk', count: pendingOrders, type: 'ORDER', message: `${pendingOrders} pesanan berstatus menunggu pembayaran/verifikasi.` },
            { id: 'prod', title: 'Pesanan Sedang Diproduksi', count: prodActive, type: 'PRODUCTION', message: `${prodActive} pesanan sedang dalam proses jahit konveksi.` },
            { id: 'pck', title: 'Pesanan Siap Diambil', count: readyPickup, type: 'PICKUP', message: `${readyPickup} pesanan selesai jahit dan siap diserahkan.` }
          ]
        });
      } else {
        const res = await api.listNotifications();
        if (res.success && res.data) {
          const list = Array.isArray(res.data) ? res.data : (res.data as any).notifications || [];
          setNotifications(list);
        }
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Polling every 10 seconds
    return () => clearInterval(interval);
  }, [user.userId, user.nim, isPanitia]);

  // Handle Outside Click to Close Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = isPanitia
    ? (panitiaAlerts?.pendingPaymentsCount || 0) + (panitiaAlerts?.pendingOrdersCount || 0)
    : notifications.filter((n) => !n.read_status).length;

  const handleMarkAsRead = async (notifId: string) => {
    try {
      await api.markNotificationAsRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === notifId ? { ...n, read_status: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (isPanitia) return;
    setLoading(true);
    try {
      await api.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read_status: true })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Icon Helper for Notification Types
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'REGISTRATION':
      case 'ACCOUNT_VERIFIED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'ORDER_CREATED':
        return <Package className="w-4 h-4 text-indigo-600" />;
      case 'PAYMENT_SUBMITTED':
      case 'PAYMENT_APPROVED':
        return <CreditCard className="w-4 h-4 text-emerald-600" />;
      case 'PAYMENT_REJECTED':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      case 'PRODUCTION_STARTED':
      case 'PRODUCTION_PROGRESS':
        return <Factory className="w-4 h-4 text-blue-600" />;
      case 'PRODUCTION_COMPLETED':
      case 'PICKUP_READY':
        return <PackageCheck className="w-4 h-4 text-emerald-600" />;
      case 'PICKUP_COMPLETED':
        return <CheckCircle2 className="w-4 h-4 text-teal-600" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-600" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Notifikasi &amp; Informasi Sistem"
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition cursor-pointer flex items-center justify-center"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-rose-600 text-white font-mono font-black text-[10px] rounded-full animate-bounce shadow-xs min-w-[18px] text-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden animate-fade-in space-y-0">
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider">
                {isPanitia ? 'Notifikasi & Status Panitia' : 'Notifikasi Mahasiswa'}
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 font-mono font-bold text-[10px] rounded-full border border-rose-500/30">
                  {unreadCount} Baru
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isPanitia && notifications.some((n) => !n.read_status) && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={loading}
                  title="Tandai semua telah dibaca"
                  className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>Tandai Semua Dibaca</span>
                </button>
              )}

              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-96 overflow-y-auto custom-scrollbar divide-y divide-gray-100">
            {isPanitia ? (
              /* Panitia Alert List */
              <div className="p-4 space-y-3">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Ringkasan Event Menunggu Aksi Panitia
                </div>

                {panitiaAlerts?.alertsList.map((alt) => (
                  <div
                    key={alt.id}
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      alt.count > 0 ? 'bg-amber-50/60 border-amber-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-gray-900">{alt.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-black ${
                          alt.count > 0 ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {alt.count} Pending
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">{alt.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              /* Student Notification List */
              notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs space-y-2">
                  <Bell className="w-8 h-8 text-gray-300 mx-auto opacity-50" />
                  <p className="font-semibold text-gray-600">Belum Ada Notifikasi</p>
                  <p className="text-[11px] text-gray-400">Pemberitahuan status pesanan &amp; PDH Anda akan muncul di sini.</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.notification_id}
                    onClick={() => !notif.read_status && handleMarkAsRead(notif.notification_id)}
                    className={`p-3.5 transition cursor-pointer hover:bg-gray-50 flex items-start gap-3 ${
                      !notif.read_status ? 'bg-indigo-50/50' : 'bg-white'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-gray-100 flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notif.type)}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900 leading-snug">
                          {notif.title}
                        </span>
                        {!notif.read_status && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 flex-shrink-0"></span>
                        )}
                      </div>

                      <p className="text-xs text-gray-600 leading-relaxed font-normal">
                        {notif.message}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          {new Date(notif.created_at).toLocaleString('id-ID')}
                        </span>

                        {notif.email_sent && (
                          <span className="flex items-center gap-1 text-emerald-600 font-sans font-medium">
                            <Mail className="w-3 h-3" /> Email terkirim
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-gray-50 border-t border-gray-100 text-center text-[11px] text-gray-500 font-medium">
            Notifikasi otomatis terhubung ke akun NIM: <strong>{user.nim || user.username}</strong>
          </div>
        </div>
      )}
    </div>
  );
};
