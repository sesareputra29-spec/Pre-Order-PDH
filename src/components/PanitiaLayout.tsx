import React, { useState, useEffect } from 'react';
import { User, SheetSchemaSummary, DriveFolderStructure, AuditLogEntry, OrderRecord, POPeriod } from '../types';
import { callGAS, isNativeGAS } from '../gas/gasBridge';
import {
  LayoutDashboard,
  Package,
  Users,
  CreditCard,
  Factory,
  Shirt,
  FileSpreadsheet,
  UserCheck,
  Settings,
  Database,
  FolderTree,
  Activity,
  Code,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Info,
  Layers,
  Sparkles,
  Clock,
  ArrowRight,
  ChevronRight,
  Calendar,
  AlertTriangle,
  ShoppingBag,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  Check,
  RotateCcw,
  Filter,
  Search,
  Menu,
  X
} from 'lucide-react';

import { PanitiaPDHSettings } from './PanitiaPDHSettings';
import { PanitiaPaymentManagement } from './PanitiaPaymentManagement';
import { PanitiaOrderManagement } from './PanitiaOrderManagement';
import { PanitiaProductionManagement } from './PanitiaProductionManagement';
import { PanitiaImportExport } from './PanitiaImportExport';
import { PanitiaStudentManagement } from './PanitiaStudentManagement';
import { PanitiaUserAccessManagement } from './PanitiaUserAccessManagement';

interface PanitiaLayoutProps {
  user: User;
  onOpenGASExporter: () => void;
}

type PanitiaTab =
  | 'dashboard'
  | 'pesanan'
  | 'mahasiswa'
  | 'pembayaran'
  | 'produksi'
  | 'pengaturan_pdh'
  | 'import_export'
  | 'user_akses'
  | 'pengaturan_sistem';

export const PanitiaLayout: React.FC<PanitiaLayoutProps> = ({ user, onOpenGASExporter }) => {
  const [activeTab, setActiveTabState] = useState<PanitiaTab>(() => {
    const saved = sessionStorage.getItem('pdh_panitia_active_tab');
    return (saved as PanitiaTab) || 'dashboard';
  });

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const setActiveTab = (tab: PanitiaTab) => {
    setActiveTabState(tab);
    sessionStorage.setItem('pdh_panitia_active_tab', tab);
    setIsMobileSidebarOpen(false);
  };
  const [tables, setTables] = useState<SheetSchemaSummary | null>(null);
  const [driveStructure, setDriveStructure] = useState<DriveFolderStructure | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [spreadsheetIdInput, setSpreadsheetIdInput] = useState('1SpreadsheetIdPDHCampusOrderDatabase2026');
  const [systemMessage, setSystemMessage] = useState('');

  // Operational Dashboard Metrics
  const [ordersSummary, setOrdersSummary] = useState<{
    total: number;
    pendingPayment: number;
    pendingApproval: number;
    inProduction: number;
    completed: number;
    readyPickup: number;
    recentOrders: OrderRecord[];
  }>({
    total: 0,
    pendingPayment: 0,
    pendingApproval: 0,
    inProduction: 0,
    completed: 0,
    readyPickup: 0,
    recentOrders: []
  });

  const [activePO, setActivePO] = useState<POPeriod | null>(null);

  // Audit Log Filter States
  const [auditFilterUser, setAuditFilterUser] = useState<string>('ALL');
  const [auditFilterAction, setAuditFilterAction] = useState<string>('ALL');
  const [auditFilterEntity, setAuditFilterEntity] = useState<string>('ALL');
  const [auditFilterStartDate, setAuditFilterStartDate] = useState<string>('');
  const [auditFilterEndDate, setAuditFilterEndDate] = useState<string>('');
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');
  const [auditPageSize, setAuditPageSize] = useState<number | 'ALL'>(50);

  const handleResetAuditFilters = () => {
    setAuditFilterUser('ALL');
    setAuditFilterAction('ALL');
    setAuditFilterEntity('ALL');
    setAuditFilterStartDate('');
    setAuditFilterEndDate('');
    setAuditSearchQuery('');
    setAuditPageSize(50);
  };

  const uniqueAuditUsers = React.useMemo(() => {
    const set = new Set<string>();
    auditLogs.forEach((log) => {
      if (log.user_id) set.add(log.user_id);
    });
    return Array.from(set).sort();
  }, [auditLogs]);

  const uniqueAuditActions = React.useMemo(() => {
    const set = new Set<string>();
    auditLogs.forEach((log) => {
      if (log.action) set.add(log.action);
    });
    return Array.from(set).sort();
  }, [auditLogs]);

  const uniqueAuditEntities = React.useMemo(() => {
    const set = new Set<string>();
    auditLogs.forEach((log) => {
      if (log.entity) set.add(log.entity);
    });
    return Array.from(set).sort();
  }, [auditLogs]);

  const filteredAuditLogs = React.useMemo(() => {
    return auditLogs.filter((log) => {
      if (auditFilterUser !== 'ALL' && log.user_id !== auditFilterUser) {
        return false;
      }
      if (auditFilterAction !== 'ALL' && log.action !== auditFilterAction) {
        return false;
      }
      if (auditFilterEntity !== 'ALL' && log.entity !== auditFilterEntity) {
        return false;
      }
      if (auditFilterStartDate) {
        const logDateStr = log.timestamp ? log.timestamp.substring(0, 10) : '';
        if (logDateStr < auditFilterStartDate) return false;
      }
      if (auditFilterEndDate) {
        const logDateStr = log.timestamp ? log.timestamp.substring(0, 10) : '';
        if (logDateStr > auditFilterEndDate) return false;
      }
      if (auditSearchQuery.trim()) {
        const q = auditSearchQuery.toLowerCase().trim();
        const matches =
          (log.user_id || '').toLowerCase().includes(q) ||
          (log.action || '').toLowerCase().includes(q) ||
          (log.entity || '').toLowerCase().includes(q) ||
          (log.details || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [
    auditLogs,
    auditFilterUser,
    auditFilterAction,
    auditFilterEntity,
    auditFilterStartDate,
    auditFilterEndDate,
    auditSearchQuery
  ]);

  const displayedAuditLogs = React.useMemo(() => {
    if (auditPageSize === 'ALL') {
      return filteredAuditLogs;
    }
    return filteredAuditLogs.slice(0, Number(auditPageSize));
  }, [filteredAuditLogs, auditPageSize]);

  useEffect(() => {
    loadData();
  }, [user.userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tableRes, driveRes, auditRes, ordersRes, poRes] = await Promise.all([
        callGAS<SheetSchemaSummary>('getDatabaseTables', user.userId),
        callGAS<DriveFolderStructure>('setupDriveFolders', user.userId),
        callGAS<AuditLogEntry[]>('getAuditLogs', user.userId),
        callGAS<OrderRecord[]>('getAllOrdersPanitia', user.userId),
        callGAS<POPeriod[]>('getPOPeriods', user.userId)
      ]);

      if (tableRes.success && tableRes.data) setTables(tableRes.data);
      if (driveRes.success && driveRes.data) setDriveStructure(driveRes.data);
      if (auditRes.success && auditRes.data) setAuditLogs(auditRes.data);

      if (ordersRes.success && ordersRes.data) {
        const all = ordersRes.data;
        const total = all.length;
        const pendingPayment = all.filter(
          (o) => o.payment_status === 'BELUM_BAYAR' || o.payment_status === 'UNPAID' || o.status === 'MENUNGGU PEMBAYARAN'
        ).length;
        const pendingApproval = all.filter(
          (o) => o.payment_status === 'MENUNGGU APPROVAL' || o.payment_status === 'PENDING'
        ).length;
        const inProduction = all.filter(
          (o) => o.production_status === 'Sedang Diproduksi' || o.status === 'DIPROSES'
        ).length;
        const completed = all.filter(
          (o) => o.status === 'SELESAI' || o.production_percentage === 100 || o.pickup_status === 'Sudah Diambil'
        ).length;
        const readyPickup = all.filter((o) => o.pickup_status === 'Siap Diambil').length;
        const recentOrders = all.slice(0, 5);

        setOrdersSummary({
          total,
          pendingPayment,
          pendingApproval,
          inProduction,
          completed,
          readyPickup,
          recentOrders
        });
      }

      if (poRes.success && poRes.data && poRes.data.length > 0) {
        setActivePO(poRes.data[0]);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInitDatabase = async () => {
    setLoading(true);
    setSystemMessage('');
    const res = await callGAS('setupDatabase', spreadsheetIdInput);
    if (res.success) {
      setSystemMessage('Database Google Sheets berhasil diinisialisasi & dihubungkan!');
      loadData();
    } else {
      setSystemMessage(`Error: ${res.message}`);
    }
    setLoading(false);
  };

  const menuGroups: {
    group: string;
    items: { id: PanitiaTab; label: string; icon: React.ReactNode }[];
  }[] = [
    {
      group: 'UTAMA',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'pesanan', label: 'Pesanan', icon: <Package className="w-4 h-4" /> },
        { id: 'pembayaran', label: 'Pembayaran', icon: <CreditCard className="w-4 h-4" /> },
        { id: 'produksi', label: 'Produksi', icon: <Factory className="w-4 h-4" /> }
      ]
    },
    {
      group: 'DATA',
      items: [
        { id: 'mahasiswa', label: 'Data Mahasiswa', icon: <Users className="w-4 h-4" /> },
        { id: 'import_export', label: 'Import / Export', icon: <FileSpreadsheet className="w-4 h-4" /> }
      ]
    },
    {
      group: 'PENGATURAN',
      items: [
        { id: 'pengaturan_pdh', label: 'Pengaturan PDH', icon: <Shirt className="w-4 h-4" /> },
        { id: 'user_akses', label: 'User & Akses', icon: <UserCheck className="w-4 h-4" /> },
        { id: 'pengaturan_sistem', label: 'Pengaturan Sistem', icon: <Settings className="w-4 h-4" /> }
      ]
    }
  ];

  const allMenuItems = menuGroups.flatMap((g) => g.items);

  return (
    <div className="flex h-[calc(100vh-61px)] bg-gray-100 overflow-hidden relative">
      {/* Mobile & Tablet Drawer Backdrop Overlay */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs transition-opacity lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Mobile & Tablet Slide-in Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Navigasi Panitia</span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono">PANITIA</span>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Tutup Menu"
            aria-label="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-4 text-xs font-medium custom-scrollbar">
          {menuGroups.map((grp) => (
            <div key={grp.group} className="space-y-1">
              <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {grp.group}
              </div>
              {grp.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition cursor-pointer text-xs ${
                    activeTab === item.id
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Desktop Static Sidebar Navigation */}
      <aside className="hidden lg:flex lg:w-64 bg-slate-900 text-slate-300 flex-col flex-shrink-0 border-r border-slate-800">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Navigasi Panitia</span>
          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono">PANITIA</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-4 text-xs font-medium custom-scrollbar">
          {menuGroups.map((grp) => (
            <div key={grp.group} className="space-y-1">
              <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {grp.group}
              </div>
              {grp.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition cursor-pointer ${
                    activeTab === item.id
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden bg-gray-50">
        {/* View Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between shadow-2xs gap-3">
          <div className="flex items-center gap-3">
            {/* Hamburger Button for Mobile & Tablet (< lg) */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition cursor-pointer shadow-2xs"
              title="Buka Menu Navigasi"
              aria-label="Buka Menu Navigasi"
            >
              <Menu className="w-5 h-5 text-gray-800" />
            </button>

            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900 capitalize">
                {allMenuItems.find((m) => m.id === activeTab)?.label}
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-500 truncate max-w-[200px] sm:max-w-none">
                Portal Pengelolaan Pemesanan &amp; Logistik PDH Kampus
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-semibold flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="hidden sm:inline">Sistem Aktif</span>
            </span>
          </div>
        </div>

        {/* View Content Container with Responsive Padding */}
        <div className="p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-6 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              {/* Operational Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-indigo-900/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-amber-400" /> Pusat Kendali Operasional
                  </div>
                  <h3 className="text-xl font-black">Dashboard Panitia PDH Kampus</h3>
                  <p className="text-xs text-indigo-200 max-w-xl">
                    Pantau seluruh status pemesanan, verifikasi bukti pembayaran, progres pengerjaan vendor, dan informasi pengambilan baju PDH secara terpusat.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('pembayaran')}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Approval Payment</span>
                    {ordersSummary.pendingApproval > 0 && (
                      <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black animate-pulse">
                        {ordersSummary.pendingApproval}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('pesanan')}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Daftar Pesanan</span>
                  </button>
                </div>
              </div>

              {/* 6 Operational Stat Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Total Orders */}
                <div
                  onClick={() => setActiveTab('pesanan')}
                  className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs hover:border-indigo-300 transition cursor-pointer space-y-1 group"
                >
                  <div className="flex items-center justify-between text-gray-500 text-[11px] font-bold uppercase">
                    <span>Total Pesanan</span>
                    <Package className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition" />
                  </div>
                  <div className="text-2xl font-black text-gray-900">{ordersSummary.total}</div>
                  <p className="text-[10px] text-gray-400">Seluruh transaksi terdaftar</p>
                </div>

                {/* Unpaid Orders */}
                <div
                  onClick={() => setActiveTab('pesanan')}
                  className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200 shadow-xs hover:border-amber-400 transition cursor-pointer space-y-1 group"
                >
                  <div className="flex items-center justify-between text-amber-700 text-[11px] font-bold uppercase">
                    <span>Menunggu Bayar</span>
                    <Clock className="w-4 h-4 text-amber-600 group-hover:scale-110 transition" />
                  </div>
                  <div className="text-2xl font-black text-amber-950">{ordersSummary.pendingPayment}</div>
                  <p className="text-[10px] text-amber-600 font-medium">Belum melakukan transfer</p>
                </div>

                {/* Pending Approval */}
                <div
                  onClick={() => setActiveTab('pembayaran')}
                  className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200 shadow-xs hover:border-blue-400 transition cursor-pointer space-y-1 group relative overflow-hidden"
                >
                  {ordersSummary.pendingApproval > 0 && (
                    <div className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-bl-lg animate-ping" />
                  )}
                  <div className="flex items-center justify-between text-blue-700 text-[11px] font-bold uppercase">
                    <span>Butuh Approval</span>
                    <CreditCard className="w-4 h-4 text-blue-600 group-hover:scale-110 transition" />
                  </div>
                  <div className="text-2xl font-black text-blue-950">{ordersSummary.pendingApproval}</div>
                  <p className="text-[10px] text-blue-600 font-medium">Bukti transfer terunggah</p>
                </div>

                {/* In Production */}
                <div
                  onClick={() => setActiveTab('produksi')}
                  className="bg-purple-50/50 p-4 rounded-2xl border border-purple-200 shadow-xs hover:border-purple-400 transition cursor-pointer space-y-1 group"
                >
                  <div className="flex items-center justify-between text-purple-700 text-[11px] font-bold uppercase">
                    <span>Sedang Produksi</span>
                    <Factory className="w-4 h-4 text-purple-600 group-hover:scale-110 transition" />
                  </div>
                  <div className="text-2xl font-black text-purple-950">{ordersSummary.inProduction}</div>
                  <p className="text-[10px] text-purple-600 font-medium">Pengerjaan di vendor</p>
                </div>

                {/* Ready Pickup */}
                <div
                  onClick={() => setActiveTab('produksi')}
                  className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 shadow-xs hover:border-emerald-400 transition cursor-pointer space-y-1 group"
                >
                  <div className="flex items-center justify-between text-emerald-700 text-[11px] font-bold uppercase">
                    <span>Siap Diambil</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition" />
                  </div>
                  <div className="text-2xl font-black text-emerald-950">{ordersSummary.readyPickup}</div>
                  <p className="text-[10px] text-emerald-600 font-medium">Siap diserahkan</p>
                </div>

                {/* Completed */}
                <div
                  onClick={() => setActiveTab('pesanan')}
                  className="bg-slate-100 p-4 rounded-2xl border border-slate-300 shadow-xs hover:border-slate-400 transition cursor-pointer space-y-1 group"
                >
                  <div className="flex items-center justify-between text-slate-700 text-[11px] font-bold uppercase">
                    <span>Selesai</span>
                    <Shirt className="w-4 h-4 text-slate-600 group-hover:scale-110 transition" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{ordersSummary.completed}</div>
                  <p className="text-[10px] text-slate-500">Lunas &amp; diserahkan</p>
                </div>
              </div>

              {/* Status PO Period Card & Quick Navigation */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active PO Info */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">Status Periode Pre-Order (PO) PDH</h4>
                        <p className="text-[11px] text-gray-500">Gelombang pemesanan baju PDH yang sedang berjalan</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('pengaturan_pdh')}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition flex items-center gap-1 cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Pengaturan PO</span>
                    </button>
                  </div>

                  {activePO ? (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-gray-900 text-sm">{activePO.name}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                activePO.status === 'OPEN'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {activePO.status === 'OPEN' ? '🟢 GELOMBANG DIBUKA' : '🔴 PO DITUTUP'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">
                            Jadwal: <span className="font-semibold text-gray-800">{activePO.start_date} ({activePO.start_time})</span> s/d <span className="font-semibold text-gray-800">{activePO.end_date} ({activePO.end_time})</span>
                          </p>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-[10px] font-bold text-gray-400 uppercase block">Mode Pengaturan</span>
                          <span className="text-xs font-bold text-indigo-700 uppercase bg-indigo-50 px-2.5 py-1 rounded-md inline-block">
                            {activePO.mode} {activePO.manual_override ? '(MANUAL OVERRIDE)' : ''}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <span className="text-[10px] text-gray-400 font-bold uppercase block">Target Kuota</span>
                          <span className="font-bold text-gray-800">{activePO.target_quota || 500} Pcs</span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <span className="text-[10px] text-gray-400 font-bold uppercase block">Total Pesanan Masuk</span>
                          <span className="font-bold text-indigo-700">{ordersSummary.total} Pesanan</span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 col-span-2 sm:col-span-1">
                          <span className="text-[10px] text-gray-400 font-bold uppercase block">Persentase Tercapai</span>
                          <span className="font-bold text-emerald-700">
                            {Math.round((ordersSummary.total / (activePO.target_quota || 500)) * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">Data periode PO sedang dimuat...</p>
                  )}
                </div>

                {/* Quick Panitia Action Links */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-2">Aksi Cepat Panitia</h4>
                    <p className="text-xs text-gray-500 mt-1">Pintasan navigasi langsung ke modul operasional utama.</p>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('pembayaran')}
                      className="w-full p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-amber-600" />
                        <span>Verifikasi Bukti Transfer</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-amber-500" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('produksi')}
                      className="w-full p-2.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Factory className="w-4 h-4 text-purple-600" />
                        <span>Update Progres Vendor</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-purple-500" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('import_export')}
                      className="w-full p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                        <span>Import / Export Excel</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-indigo-500" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent Orders & Recent Activity Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Orders Table */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden space-y-3 p-5">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-indigo-600" />
                      <h4 className="font-bold text-gray-900 text-sm">Pesanan Terbaru Masuk</h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('pesanan')}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <span>Lihat Semua ({ordersSummary.total})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-left text-xs text-gray-600">
                      <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px] border-b border-gray-200">
                        <tr>
                          <th className="p-3">No Pesanan</th>
                          <th className="p-3">Pemesan</th>
                          <th className="p-3">Jenis</th>
                          <th className="p-3">Total Tagihan</th>
                          <th className="p-3">Status Payment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {ordersSummary.recentOrders.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-gray-400">
                              Belum ada pesanan masuk.
                            </td>
                          </tr>
                        ) : (
                          ordersSummary.recentOrders.map((ord) => (
                            <tr key={ord.order_id} className="hover:bg-gray-50/80 transition">
                              <td className="p-3 font-mono font-bold text-gray-900">{ord.order_number}</td>
                              <td className="p-3">
                                <div className="font-bold text-gray-800">{ord.buyer_name}</div>
                                <div className="text-[10px] text-gray-400 font-mono">{ord.buyer_nim} ({ord.buyer_class})</div>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  ord.order_type === 'PRIBADI' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                                }`}>
                                  {ord.order_type}
                                </span>
                              </td>
                              <td className="p-3 font-mono font-bold text-gray-900">
                                Rp {(ord.total_amount || 0).toLocaleString('id-ID')}
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  ord.payment_status === 'LUNAS' || ord.payment_status === 'PAID'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : ord.payment_status === 'MENUNGGU APPROVAL'
                                    ? 'bg-blue-100 text-blue-800'
                                    : ord.payment_status === 'DITOLAK'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {ord.payment_status || 'BELUM_BAYAR'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Operational Activity Log */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-purple-600" />
                      <h4 className="font-bold text-gray-900 text-sm">Aktivitas Operasional</h4>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">Terkini</span>
                  </div>

                  <div className="space-y-3 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                    {auditLogs.length === 0 ? (
                      <p className="text-xs text-gray-400 italic text-center py-4">Belum ada catatan aktivitas.</p>
                    ) : (
                      auditLogs.slice(0, 6).map((log) => {
                        let badgeBg = 'bg-gray-100 text-gray-700';
                        let actionLabel = log.action;

                        if (log.action === 'APPROVE_PAYMENT') {
                          badgeBg = 'bg-emerald-100 text-emerald-800';
                          actionLabel = 'Pembayaran Disetujui';
                        } else if (log.action === 'REJECT_PAYMENT') {
                          badgeBg = 'bg-rose-100 text-rose-800';
                          actionLabel = 'Pembayaran Ditolak';
                        } else if (log.action === 'CREATE_ORDER') {
                          badgeBg = 'bg-indigo-100 text-indigo-800';
                          actionLabel = 'Pesanan Baru Dibuat';
                        } else if (log.action === 'UPDATE_PRODUCTION_PROGRESS') {
                          badgeBg = 'bg-purple-100 text-purple-800';
                          actionLabel = 'Update Progres Vendor';
                        } else if (log.action === 'UPDATE_PO_PERIOD' || log.action === 'TOGGLE_PO_STATUS') {
                          badgeBg = 'bg-amber-100 text-amber-800';
                          actionLabel = 'Update Periode PO';
                        }

                        return (
                          <div key={log.log_id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badgeBg}`}>
                                {actionLabel}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-700 truncate font-medium">{log.details}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pengaturan_sistem' && (
            <div className="space-y-6">
              {/* Konfigurasi Sistem Card */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      <Settings className="w-4 h-4 text-indigo-600" /> Konfigurasi Integrasi &amp; Penyimpanan Sistem
                    </h3>
                    <p className="text-xs text-gray-500">
                      Pengaturan tautan database utama dan folder penyimpanan berkas sistem PDH.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Terhubung &amp; Aktif</span>
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      ID Database Penyimpanan Utama
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={spreadsheetIdInput}
                        onChange={(e) => setSpreadsheetIdInput(e.target.value)}
                        placeholder="Masukkan ID Database..."
                        className="flex-1 px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleInitDatabase}
                        disabled={loading}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs whitespace-nowrap"
                      >
                        Simpan Koneksi Database
                      </button>
                    </div>
                  </div>

                  {systemMessage && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{systemMessage}</span>
                    </div>
                  )}

                  {/* Folder Structure Overview */}
                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Folder Penyimpanan Cloud Terverifikasi</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {driveStructure &&
                        Object.entries(driveStructure.subfolders).map(([key, meta]) => (
                          <div key={key} className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-0.5">
                            <div className="font-bold text-gray-800 truncate">{meta.name}</div>
                            <div className="text-[10px] text-emerald-600 font-semibold">Siap Digunakan</div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Audit Log Viewer */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden space-y-4 p-5">
                <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      <Activity className="w-4 h-4 text-purple-600" /> Audit Aktivitas Operasional Panitia
                    </h3>
                    <p className="text-xs text-gray-500">Pencatatan riwayat perubahan data, approval, dan aktivitas panitia sistem.</p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-xs font-bold text-indigo-700 font-mono bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                      Tampil {displayedAuditLogs.length} dari {filteredAuditLogs.length} Log (Total {auditLogs.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleResetAuditFilters}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      title="Reset Filter"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Filter</span>
                    </button>
                  </div>
                </div>

                {/* Filter Controls Toolbar */}
                <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-200/80 space-y-3 text-xs">
                  <div className="font-bold text-gray-800 uppercase text-[10px] tracking-wider flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Filter &amp; Pencarian Audit Log</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Search Input */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cari Kata Kunci</label>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          value={auditSearchQuery}
                          onChange={(e) => setAuditSearchQuery(e.target.value)}
                          placeholder="Cari user, detail..."
                          className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Filter User */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">User / Panitia</label>
                      <select
                        value={auditFilterUser}
                        onChange={(e) => setAuditFilterUser(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="ALL">Semua User / Panitia</option>
                        {uniqueAuditUsers.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Filter Aktivitas / Action */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Aktivitas</label>
                      <select
                        value={auditFilterAction}
                        onChange={(e) => setAuditFilterAction(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="ALL">Semua Aktivitas</option>
                        {uniqueAuditActions.map((act) => (
                          <option key={act} value={act}>
                            {act}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Filter Entity */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Entity / Objek</label>
                      <select
                        value={auditFilterEntity}
                        onChange={(e) => setAuditFilterEntity(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="ALL">Semua Entity</option>
                        {uniqueAuditEntities.map((ent) => (
                          <option key={ent} value={ent}>
                            {ent}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date Range Start */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Dari Tanggal</label>
                      <input
                        type="date"
                        value={auditFilterStartDate}
                        onChange={(e) => setAuditFilterStartDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Date Range End */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Sampai Tanggal</label>
                      <input
                        type="date"
                        value={auditFilterEndDate}
                        onChange={(e) => setAuditFilterEndDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Audit Log Table */}
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-left text-xs text-gray-600">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="p-3">Waktu &amp; Tanggal</th>
                        <th className="p-3">User / Panitia</th>
                        <th className="p-3 text-center">Aktivitas</th>
                        <th className="p-3 text-center">Entity</th>
                        <th className="p-3">Detail Aktivitas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {displayedAuditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-gray-400">
                            <p className="font-semibold text-xs">Tidak Ada Log Ditemukan</p>
                            <p className="text-[11px] mt-0.5">Coba ubah kriteria filter atau klik "Reset Filter".</p>
                          </td>
                        </tr>
                      ) : (
                        displayedAuditLogs.map((log, idx) => (
                          <tr key={log.log_id || idx} className="hover:bg-gray-50/80 transition">
                            <td className="p-3 text-gray-500 font-mono text-[11px] whitespace-nowrap">
                              {log.timestamp ? new Date(log.timestamp).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' }) : '-'}
                            </td>

                            <td className="p-3 font-bold text-gray-900 whitespace-nowrap">
                              {log.user_id || 'System Panitia'}
                            </td>

                            <td className="p-3 text-center whitespace-nowrap">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 inline-block">
                                {log.action}
                              </span>
                            </td>

                            <td className="p-3 text-center whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-50 text-purple-800 border border-purple-200 inline-block">
                                {log.entity || '-'}
                              </span>
                            </td>

                            <td className="p-3 text-gray-700 font-medium leading-relaxed">
                              {log.details || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Page Size / Limits Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-gray-500">
                    Menampilkan <strong className="text-gray-900">{displayedAuditLogs.length}</strong> dari <strong className="text-gray-900">{filteredAuditLogs.length}</strong> log tersaring
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500">Tampilkan Data:</span>
                    <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                      <button
                        type="button"
                        onClick={() => setAuditPageSize(50)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                          auditPageSize === 50
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        50
                      </button>

                      <button
                        type="button"
                        onClick={() => setAuditPageSize(100)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                          auditPageSize === 100
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        100
                      </button>

                      <button
                        type="button"
                        onClick={() => setAuditPageSize('ALL')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                          auditPageSize === 'ALL'
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Semua
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pesanan' && (
            <PanitiaOrderManagement user={user} />
          )}

          {activeTab === 'mahasiswa' && (
            <PanitiaStudentManagement user={user} />
          )}

          {activeTab === 'pengaturan_pdh' && (
            <PanitiaPDHSettings user={user} onRefreshAuditLogs={loadData} />
          )}

          {activeTab === 'pembayaran' && (
            <PanitiaPaymentManagement user={user} />
          )}

          {activeTab === 'produksi' && (
            <PanitiaProductionManagement user={user} />
          )}

          {activeTab === 'import_export' && (
            <PanitiaImportExport user={user} onRefreshAuditLogs={loadData} />
          )}

          {activeTab === 'user_akses' && (
            <PanitiaUserAccessManagement user={user} />
          )}

          {/* Placeholders for other menus */}
          {!['dashboard', 'pengaturan_sistem', 'pengaturan_pdh', 'pembayaran', 'pesanan', 'produksi', 'import_export', 'mahasiswa', 'user_akses'].includes(activeTab) && (
            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-xs text-center space-y-3">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 text-base capitalize">
                Halaman {allMenuItems.find((m) => m.id === activeTab)?.label}
              </h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Struktur navigasi dan routing halaman dasar telah terkonfigurasi pada Tahap 1. Fitur pengelolaan detail akan diimplementasikan pada tahap berikutnya.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
