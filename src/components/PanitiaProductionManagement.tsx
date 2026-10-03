import React, { useState, useEffect } from 'react';
import { User, OrderRecord, ProductionStatus, PickupStatus, PickupInfoSettings, ApiResponse } from '../types';
import { callGAS } from '../gas/gasBridge';
import {
  Factory,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Camera,
  Layers,
  Sparkles,
  Edit3,
  X,
  MapPin,
  Calendar,
  Phone,
  Info,
  CheckSquare,
  PackageCheck,
  Building,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface PanitiaProductionManagementProps {
  user: User;
}

export const PanitiaProductionManagement: React.FC<PanitiaProductionManagementProps> = ({ user }) => {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Pickup Settings State
  const [pickupSettings, setPickupSettings] = useState<PickupInfoSettings | null>(null);
  const [isPickupSettingsOpen, setIsPickupSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Modal State
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isConfirmPickupModalOpen, setIsConfirmPickupModalOpen] = useState(false);

  // Form State for Single Update
  const [prodPercentage, setProdPercentage] = useState<number>(0);
  const [prodStatus, setProdStatus] = useState<ProductionStatus>('Belum Diproduksi');
  const [prodNotes, setProdNotes] = useState('');
  const [fileBase64, setFileBase64] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [mimeType, setMimeType] = useState<string>('');
  const [filePreview, setFilePreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [pickupNotesInput, setPickupNotesInput] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Multi-Select Bulk Update State
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const [bulkPercentage, setBulkPercentage] = useState<number>(50);
  const [bulkStatus, setBulkStatus] = useState<ProductionStatus>('Sedang Diproduksi');
  const [bulkNotes, setBulkNotes] = useState<string>('Update progres masal produksi panitia');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Bulk Progress Photo State
  const [bulkFileBase64, setBulkFileBase64] = useState<string>('');
  const [bulkFileName, setBulkFileName] = useState<string>('');
  const [bulkMimeType, setBulkMimeType] = useState<string>('');
  const [bulkFilePreview, setBulkFilePreview] = useState<string>('');
  const [bulkError, setBulkError] = useState<string | null>(null);
  const bulkFileInputRef = React.useRef<HTMLInputElement>(null);

  // Helper RPC with timeout protection
  const callWithTimeout = async <T,>(funcName: string, ...args: any[]): Promise<ApiResponse<T>> => {
    const TIMEOUT_MS = 15000;
    let timeoutId: any;

    const timeoutPromise = new Promise<ApiResponse<T>>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Timeout server (${TIMEOUT_MS / 1000}s) saat memproses ${funcName}.`));
      }, TIMEOUT_MS);
    });

    try {
      const result = await Promise.race([callGAS<T>(funcName, ...args), timeoutPromise]);
      clearTimeout(timeoutId);
      return result;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  };

  // Canvas-based image compression helper (Max 800px, ~50KB-100KB Base64)
  const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.75): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context error'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const mimeType = 'image/jpeg';
          const compressedBase64 = canvas.toDataURL(mimeType, quality);
          resolve({ base64: compressedBase64, mimeType });
        };
        img.onerror = (err) => reject(err);
        img.src = e.target?.result as string;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Handle Bulk Progress Photo Selection
  const handleBulkFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setBulkError('Format file tidak valid! Wajib mengunggah file gambar (JPG, PNG, WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setBulkError('Ukuran file foto maksimal 10MB.');
      return;
    }

    setBulkError(null);
    setBulkFileName(file.name);
    setBulkMimeType('image/jpeg');

    try {
      // Compress image to ~50KB-100KB for instant RPC transmission
      const compressed = await compressImage(file, 800, 800, 0.75);
      setBulkFileBase64(compressed.base64);
      setBulkFilePreview(compressed.base64);
    } catch (err: any) {
      console.warn('Image compression fallback to direct FileReader:', err);
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = reader.result as string;
          if (b64) {
            setBulkFileBase64(b64);
            setBulkFilePreview(b64);
          }
        };
        reader.readAsDataURL(file);
      } catch (fErr) {
        console.error('FileReader fallback error:', fErr);
        setBulkError('Gagal membaca file foto.');
      }
    }
  };

  const handleClearBulkFile = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setBulkFileBase64('');
    setBulkFileName('');
    setBulkMimeType('');
    setBulkFilePreview('');
    setBulkError(null);
    if (bulkFileInputRef.current) {
      bulkFileInputRef.current.value = '';
    }
  };

  // Toggle single order selection
  const handleToggleOrderSelect = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  // Toggle select all filtered orders
  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredOrders.map((o) => o.order_id);
    const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedOrderIds.includes(id));

    if (isAllSelected) {
      setSelectedOrderIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  // Toggle group selection
  const handleToggleGroupSelect = (groupOrders: OrderRecord[]) => {
    const groupIds = groupOrders.map((o) => o.order_id);
    const isAllGroupSelected = groupIds.length > 0 && groupIds.every((id) => selectedOrderIds.includes(id));

    if (isAllGroupSelected) {
      setSelectedOrderIds((prev) => prev.filter((id) => !groupIds.includes(id)));
    } else {
      setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...groupIds])));
    }
  };

  // Filter orders
  const filteredOrders = React.useMemo(() => {
    return orders.filter((o) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        o.order_number.toLowerCase().includes(q) ||
        o.buyer_name.toLowerCase().includes(q) ||
        o.buyer_nim.toLowerCase().includes(q) ||
        o.buyer_class.toLowerCase().includes(q);

      const currentStatus = o.production_status || 'Belum Diproduksi';
      const matchStatus = statusFilter === 'ALL' || currentStatus === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  // Select All Checkbox Ref
  const selectAllCheckboxRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      const allFilteredIds = filteredOrders.map((o) => o.order_id);
      const selectedCount = allFilteredIds.filter((id) => selectedOrderIds.includes(id)).length;
      const isAll = allFilteredIds.length > 0 && selectedCount === allFilteredIds.length;
      const isSome = selectedCount > 0 && !isAll;

      selectAllCheckboxRef.current.indeterminate = isSome;
    }
  }, [selectedOrderIds, filteredOrders]);

  // Bulk Submit
  const handleBulkUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (selectedOrderIds.length === 0) {
      setFeedback({ type: 'error', message: 'Tidak ada pesanan terpilih.' });
      return;
    }

    if (bulkError) {
      setFeedback({ type: 'error', message: bulkError });
      return;
    }

    setBulkSubmitting(true);
    setFeedback(null);

    let successCount = 0;
    let failCount = 0;
    let lastError = '';

    const payload = {
      percentage: bulkPercentage,
      productionStatus: bulkStatus,
      notes: bulkNotes || 'Update progres masal produksi',
      fileBase64: bulkFileBase64 || undefined,
      fileName: bulkFileName || undefined,
      mimeType: bulkMimeType || undefined
    };

    try {
      for (const orderId of selectedOrderIds) {
        try {
          const res = await callWithTimeout<OrderRecord>('updateProductionProgress', user.userId, orderId, payload);
          if (res && res.success) {
            successCount++;
          } else {
            failCount++;
            lastError = res?.message || `Gagal memperbarui order ${orderId}.`;
          }
        } catch (err: any) {
          console.error(`Gagal update progres order ${orderId}:`, err);
          failCount++;
          lastError = err?.message || 'Terjadi kesalahan sistem/jaringan.';
        }
      }

      if (successCount > 0) {
        // Success: Close modal, refresh data, reset selection, clear photo, notify
        setIsBulkUpdateModalOpen(false);
        setSelectedOrderIds([]);
        handleClearBulkFile();
        fetchOrders();
        setFeedback({
          type: 'success',
          message: `Progres berhasil diperbarui (${successCount} pesanan).`
        });
      } else {
        // Fail: Keep modal open, show error message
        setFeedback({
          type: 'error',
          message: `Gagal memperbarui progres: ${lastError || 'Terjadi kesalahan.'}`
        });
      }
    } catch (err: any) {
      console.error('Fatal bulk update error:', err);
      setFeedback({
        type: 'error',
        message: err?.message || 'Gagal memperbarui progres masal.'
      });
    } finally {
      setBulkSubmitting(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchPickupSettings();
  }, [user.userId]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await callGAS<OrderRecord[]>('getProductionOrdersPanitia', user.userId);
      if (res.success && res.data) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error('Gagal memuat pesanan produksi:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPickupSettings = async () => {
    try {
      const res = await callGAS<PickupInfoSettings>('getPickupSettings');
      if (res.success && res.data) {
        setPickupSettings(res.data);
      }
    } catch (err) {
      console.error('Gagal memuat informasi pengambilan:', err);
    }
  };

  const handleSavePickupSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupSettings) return;

    setSavingSettings(true);
    setFeedback(null);

    try {
      const res = await callGAS<PickupInfoSettings>('savePickupSettings', user.userId, pickupSettings);
      if (res.success && res.data) {
        setPickupSettings(res.data);
        setFeedback({ type: 'success', message: 'Pengaturan informasi pengambilan PDH berhasil disimpan!' });
        setTimeout(() => setFeedback(null), 3000);
      } else {
        setFeedback({ type: 'error', message: res.message || 'Gagal menyimpan pengaturan pengambilan.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Terjadi kesalahan sistem.' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleOpenUpdateModal = (ord: OrderRecord) => {
    setSelectedOrder(ord);
    setProdPercentage(ord.production_percentage || 0);
    setProdStatus(ord.production_status || 'Belum Diproduksi');
    setProdNotes(ord.production_notes || '');
    setFileBase64('');
    setFileName('');
    setMimeType('');
    setFilePreview(ord.production_photo_url || '');
    setFeedback(null);
    setIsUpdateModalOpen(true);
  };

  const handleOpenHistoryModal = (ord: OrderRecord) => {
    setSelectedOrder(ord);
    setIsHistoryModalOpen(true);
  };

  const handleOpenConfirmPickupModal = (ord: OrderRecord) => {
    setSelectedOrder(ord);
    setPickupNotesInput(`Diambil oleh ${ord.buyer_name} / perwakilan`);
    setFeedback(null);
    setIsConfirmPickupModalOpen(true);
  };

  const handleMarkSiapDiambil = async (ord: OrderRecord) => {
    setLoading(true);
    try {
      const res = await callGAS<OrderRecord>('markOrderSiapDiambil', user.userId, ord.order_id);
      if (res.success) {
        fetchOrders();
      } else {
        setFeedback({ type: 'error', message: res.message || 'Gagal mengubah status pengambilan.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal mengubah status pengambilan.' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPickupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await callGAS<OrderRecord>('confirmOrderPickup', user.userId, selectedOrder.order_id, pickupNotesInput);
      if (res.success && res.data) {
        setFeedback({ type: 'success', message: 'Pesanan berhasil dikonfirmasi sebagai SUDAH DIAMBIL.' });
        setTimeout(() => {
          setIsConfirmPickupModalOpen(false);
          fetchOrders();
        }, 1200);
      } else {
        setFeedback({ type: 'error', message: res.message || 'Gagal mengonfirmasi pengambilan.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Terjadi kesalahan sistem.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Ukuran file foto maksimal 5MB.' });
      return;
    }

    setFileName(file.name);
    setMimeType(file.type || 'image/jpeg');

    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result as string;
      setFileBase64(b64);
      setFilePreview(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyPreset = (pct: number, status: ProductionStatus, defaultNote: string) => {
    setProdPercentage(pct);
    setProdStatus(status);
    if (!prodNotes || prodNotes === defaultNote) {
      setProdNotes(defaultNote);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const payload = {
        percentage: prodPercentage,
        productionStatus: prodStatus,
        notes: prodNotes,
        fileBase64: fileBase64 || undefined,
        fileName: fileName || undefined,
        mimeType: mimeType || undefined
      };

      const res = await callGAS<OrderRecord>('updateProductionProgress', user.userId, selectedOrder.order_id, payload);

      if (res.success && res.data) {
        setFeedback({ type: 'success', message: res.message });
        setTimeout(() => {
          setIsUpdateModalOpen(false);
          fetchOrders();
        }, 1200);
      } else {
        setFeedback({ type: 'error', message: res.message || 'Gagal memperbarui progres produksi.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Terjadi kesalahan sistem.' });
    } finally {
      setSubmitting(false);
    }
  };

  const [expandedBuyers, setExpandedBuyers] = useState<Record<string, boolean>>({});

  const toggleBuyerExpand = (key: string) => {
    setExpandedBuyers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const groupedProductionOrders = React.useMemo(() => {
    const groups: {
      buyerKey: string;
      buyerName: string;
      buyerNim: string;
      buyerClass: string;
      totalItems: number;
      orders: OrderRecord[];
    }[] = [];

    const map = new Map<string, typeof groups[0]>();

    filteredOrders.forEach((ord) => {
      const key = (ord.buyer_nim || ord.buyer_name || 'GUEST').trim().toLowerCase();
      if (!map.has(key)) {
        const newGroup = {
          buyerKey: key,
          buyerName: ord.buyer_name,
          buyerNim: ord.buyer_nim,
          buyerClass: ord.buyer_class,
          totalItems: 0,
          orders: []
        };
        map.set(key, newGroup);
        groups.push(newGroup);
      }

      const grp = map.get(key)!;
      grp.orders.push(ord);
      grp.totalItems += (ord.item_count || (ord.items ? ord.items.length : 1));
    });

    return groups;
  }, [filteredOrders]);

  // Summary Metrics
  const totalInProduction = orders.length;
  const countBelum = orders.filter((o) => (!o.production_status || o.production_status === 'Belum Diproduksi')).length;
  const countSedang = orders.filter((o) => o.production_status === 'Sedang Diproduksi').length;
  const countSelesai = orders.filter((o) => o.production_status === 'Selesai' || o.production_status === 'Siap Diambil').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Factory className="w-4 h-4" /> Tahap 7 — Manajemen Produksi &amp; Progres PDH
          </div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Monitoring &amp; Update Produksi PDH</h2>
          <p className="text-xs text-gray-500 mt-1">
            Kelola persentase progres (0–100%), status produksi, upload foto perkembangan vendor, dan riwayat history per pesanan lunas.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          disabled={loading}
          className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-gray-400">Total Pesanan Masuk Produksi</span>
          <div className="text-2xl font-black text-gray-900">{totalInProduction} Pesanan</div>
          <p className="text-[11px] text-gray-500">Status Pembayaran Lunas</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-amber-700">Belum Diproduksi (0%)</span>
          <div className="text-2xl font-black text-amber-900">{countBelum} Pesanan</div>
          <p className="text-[11px] text-amber-600">Menunggu Antrean Vendor</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-blue-700">Sedang Diproduksi (1–99%)</span>
          <div className="text-2xl font-black text-blue-900">{countSedang} Pesanan</div>
          <p className="text-[11px] text-blue-600">Dalam Tahap Pemotongan/Jahit/Finishing</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase text-emerald-700">Selesai / Siap Diambil (100%)</span>
          <div className="text-2xl font-black text-emerald-900">{countSelesai} Pesanan</div>
          <p className="text-[11px] text-emerald-600">Produksi Selesai Dikerjakan</p>
        </div>
      </div>

      {/* PENGATURAN INFORMASI PENGAMBILAN (GLOBAL) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Pengaturan Informasi Pengambilan PDH</h3>
              <p className="text-[11px] text-gray-500">Atur lokasi, alamat, tanggal, jam, kontak, dan instruksi pengambilan yang tampil di Portal Mahasiswa &amp; Lacak NIM.</p>
            </div>
          </div>

          <button
            onClick={() => setIsPickupSettingsOpen(!isPickupSettingsOpen)}
            className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            {isPickupSettingsOpen ? 'Tutup Pengaturan' : 'Edit Informasi Pengambilan'}
          </button>
        </div>

        {isPickupSettingsOpen && pickupSettings && (
          <form onSubmit={handleSavePickupSettings} className="p-6 space-y-4 animate-fade-in bg-gray-50/50 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold uppercase text-gray-600 mb-1">Status Pengambilan Global</label>
                <select
                  value={pickupSettings.status}
                  onChange={(e) => setPickupSettings({ ...pickupSettings, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-bold"
                >
                  <option value="Belum Siap Diambil">Belum Siap Diambil</option>
                  <option value="Siap Diambil">Siap Diambil</option>
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase text-gray-600 mb-1">Lokasi Pengambilan</label>
                <input
                  type="text"
                  value={pickupSettings.location}
                  onChange={(e) => setPickupSettings({ ...pickupSettings, location: e.target.value })}
                  required
                  placeholder="e.g. Gedung Kemahasiswaan Lantai 1"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-gray-600 mb-1">Alamat / Lokasi Lengkap</label>
                <input
                  type="text"
                  value={pickupSettings.fullAddress}
                  onChange={(e) => setPickupSettings({ ...pickupSettings, fullAddress: e.target.value })}
                  required
                  placeholder="e.g. Jl. Kampus Utama No. 1, Ruang Sekre 102"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-gray-600 mb-1">Kontak Panitia</label>
                <input
                  type="text"
                  value={pickupSettings.contactPerson}
                  onChange={(e) => setPickupSettings({ ...pickupSettings, contactPerson: e.target.value })}
                  required
                  placeholder="e.g. 0812-3456-7890 (Panitia Logistik)"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-gray-600 mb-1">Tanggal Mulai — Tanggal Selesai</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={pickupSettings.startDate}
                    onChange={(e) => setPickupSettings({ ...pickupSettings, startDate: e.target.value })}
                    required
                    className="px-3 py-2 bg-white border border-gray-300 rounded-xl font-medium"
                  />
                  <input
                    type="date"
                    value={pickupSettings.endDate}
                    onChange={(e) => setPickupSettings({ ...pickupSettings, endDate: e.target.value })}
                    required
                    className="px-3 py-2 bg-white border border-gray-300 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-gray-600 mb-1">Jam Operasional Pengambilan</label>
                <input
                  type="text"
                  value={pickupSettings.pickupHours}
                  onChange={(e) => setPickupSettings({ ...pickupSettings, pickupHours: e.target.value })}
                  required
                  placeholder="e.g. 09:00 - 16:00 WIB"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Instruksi Pengambilan</label>
              <textarea
                value={pickupSettings.instructions}
                onChange={(e) => setPickupSettings({ ...pickupSettings, instructions: e.target.value })}
                rows={3}
                required
                placeholder="Petunjuk membawa KTM, nomor order, dll."
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Catatan Tambahan</label>
              <input
                type="text"
                value={pickupSettings.additionalNotes || ''}
                onChange={(e) => setPickupSettings({ ...pickupSettings, additionalNotes: e.target.value })}
                placeholder="e.g. Pengambilan kolektif diwakilkan oleh Penanggung Jawab Kelas."
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium"
              />
            </div>

            <div className="pt-2 text-right">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md inline-flex items-center gap-2 cursor-pointer"
              >
                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>SIMPAN PENGATURAN PENGAMBILAN</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari No. Order, Nama, NIM, Kelas..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 focus:bg-white"
          >
            <option value="ALL">Semua Status Produksi</option>
            <option value="Belum Diproduksi">Belum Diproduksi (0%)</option>
            <option value="Sedang Diproduksi">Sedang Diproduksi (1–99%)</option>
            <option value="Selesai">Selesai (100%)</option>
            <option value="Siap Diambil">Siap Diambil</option>
          </select>
        </div>
      </div>

      {/* STICKY FLOATING BULK ACTION TOOLBAR */}
      {selectedOrderIds.length > 0 && (
        <div className="sticky top-2 z-40 bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl flex items-center justify-between gap-4 border border-slate-700 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-amber-500 text-slate-950 font-black text-xs rounded-lg shadow-xs">
              {selectedOrderIds.length} Order Terpilih
            </span>
            <span className="text-xs font-semibold text-slate-300 hidden sm:inline">
              Pilih beberapa pesanan untuk memperbarui progres produksi secara masal.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedOrderIds([])}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Batal Pilihan
            </button>

            <button
              type="button"
              onClick={() => setIsBulkUpdateModalOpen(true)}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Update Progres Masal</span>
            </button>
          </div>
        </div>
      )}

      {/* Production Table & Cards */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Factory className="w-4 h-4 text-indigo-600" /> Daftar Status &amp; Progres Produksi PDH
            </h3>
            <p className="text-xs text-gray-500">Pantau progres pengerjaan vendor (0-100%), foto perkembangan, dan status penyerahan.</p>
          </div>

          <button
            type="button"
            onClick={fetchOrders}
            disabled={loading}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>Refresh</span>
          </button>
        </div>

        {/* GLOBAL SELECT ALL CHECKBOX BANNER BAR */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <label className="flex items-center gap-2.5 font-bold text-slate-800 cursor-pointer select-none">
            <input
              type="checkbox"
              ref={selectAllCheckboxRef}
              checked={
                filteredOrders.length > 0 &&
                filteredOrders.every((o) => selectedOrderIds.includes(o.order_id))
              }
              onChange={handleSelectAllFiltered}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
            />
            <span>Pilih Semua Pesanan ({filteredOrders.length} Pesanan Tampil)</span>
          </label>

          <div className="flex items-center gap-3">
            {selectedOrderIds.length > 0 && (
              <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-extrabold text-xs rounded-lg border border-amber-300">
                {selectedOrderIds.length} Order Terpilih
              </span>
            )}
            <span className="text-slate-500 text-[11px]">
              Tandai seluruh pesanan untuk update progres masal.
            </span>
          </div>
        </div>

        {/* GROUPED PRODUCTION VIEW BY BUYER / COORDINATOR */}
        <div className="space-y-3">
          {loading ? (
            <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-gray-200">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
              <span className="text-xs">Memuat data pesanan produksi...</span>
            </div>
          ) : groupedProductionOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-gray-200">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <span className="text-xs font-semibold">Belum ada pesanan lunas dalam antrean produksi.</span>
            </div>
          ) : (
            groupedProductionOrders.map((group) => {
              const isExpanded = expandedBuyers[group.buyerKey] || (searchQuery.length > 0);

              return (
                <div key={group.buyerKey} className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-xs transition">
                  {/* Group Header Card */}
                  <div
                    onClick={() => toggleBuyerExpand(group.buyerKey)}
                    className="p-4 bg-slate-50/80 hover:bg-slate-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer border-b border-gray-200/60 transition"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={group.orders.length > 0 && group.orders.every((o) => selectedOrderIds.includes(o.order_id))}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleGroupSelect(group.orders);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                        title="Pilih seluruh pesanan kelompok ini"
                      />
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs flex-shrink-0">
                        {group.buyerName ? group.buyerName.charAt(0).toUpperCase() : 'M'}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm flex items-center gap-2 flex-wrap">
                          <span>{group.buyerName}</span>
                          <span className="text-xs font-mono font-medium text-gray-500">({group.buyerNim})</span>
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold text-[10px] rounded-full uppercase border border-indigo-200">
                            {group.buyerClass}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          Total Baju Dalam Produksi: <strong className="text-gray-800">{group.totalItems} Pcs</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-900 font-bold text-xs rounded-xl border border-indigo-300">
                        {group.orders.length} Order ID ({group.totalItems} Pcs Total)
                      </span>

                      <div className="p-1 text-gray-400 hover:text-gray-700 transition">
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-indigo-600" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Group Order List */}
                  {isExpanded && (
                    <div className="p-3 bg-white space-y-3">
                      <div className="overflow-x-auto border border-gray-200 rounded-xl">
                        <table className="w-full text-left text-xs text-gray-600">
                          <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
                            <tr>
                              <th className="p-3 text-center w-10">
                                <input
                                  type="checkbox"
                                  checked={group.orders.length > 0 && group.orders.every((o) => selectedOrderIds.includes(o.order_id))}
                                  onChange={() => handleToggleGroupSelect(group.orders)}
                                  className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                                />
                              </th>
                              <th className="p-3">No. Pesanan</th>
                              <th className="p-3">Jenis Pesanan</th>
                              <th className="p-3 text-center">Jumlah</th>
                              <th className="p-3 min-w-[140px]">Progress</th>
                              <th className="p-3 text-center">Status Produksi</th>
                              <th className="p-3">Update Terakhir</th>
                              <th className="p-3 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {group.orders.map((ord) => {
                              const pct = ord.production_percentage || 0;
                              const currentProdStatus = ord.production_status || 'Belum Diproduksi';
                              const currentPickupStatus = ord.pickup_status || 'Belum Siap Diambil';
                              const isFinished = pct === 100 || currentProdStatus === 'Selesai' || currentProdStatus === 'Siap Diambil';
                              const isSelected = selectedOrderIds.includes(ord.order_id);

                              let prodBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
                              if (currentProdStatus === 'Sedang Diproduksi') prodBadgeClass = 'bg-blue-50 text-blue-800 border-blue-200';
                              if (currentProdStatus === 'Selesai' || currentProdStatus === 'Siap Diambil') prodBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';

                              return (
                                <tr key={ord.order_id} className={`transition ${isSelected ? 'bg-amber-50/60' : 'hover:bg-gray-50/80'}`}>
                                  <td className="p-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleToggleOrderSelect(ord.order_id)}
                                      className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="p-3 font-mono font-bold text-gray-900">
                                    {ord.order_number}
                                    <div className="text-[10px] text-gray-400 font-normal">
                                      {ord.created_at ? new Date(ord.created_at).toLocaleDateString('id-ID') : '-'}
                                    </div>
                                  </td>

                                  <td className="p-3">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        ord.order_type === 'KOLEKTIF' ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'
                                      }`}
                                    >
                                      {ord.order_type}
                                    </span>
                                  </td>

                                  <td className="p-3 text-center font-bold text-gray-800">
                                    {ord.item_count || 1} Pcs
                                  </td>

                                  {/* Visual Progress Bar 0% - 100% */}
                                  <td className="p-3 min-w-[140px]">
                                    <div className="space-y-1">
                                      <div className="flex items-center justify-between text-[11px] font-black">
                                        <span className="text-gray-900">{pct}%</span>
                                        <span className="text-[10px] text-gray-400 font-normal">0 - 100%</span>
                                      </div>
                                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full transition-all duration-500 ${
                                            pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : pct > 0 ? 'bg-amber-500' : 'bg-slate-300'
                                          }`}
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                    </div>
                                  </td>

                                  <td className="p-3 text-center">
                                    <div className="space-y-1 inline-block">
                                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border block ${prodBadgeClass}`}>
                                        {currentProdStatus}
                                      </span>
                                      {currentPickupStatus === 'Siap Diambil' && (
                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-black text-[9px] rounded-md block animate-pulse">
                                          SIAP DIAMBIL
                                        </span>
                                      )}
                                      {currentPickupStatus === 'Sudah Diambil' && (
                                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 font-bold text-[9px] rounded-md block">
                                          SUDAH DIAMBIL
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="p-3 text-[11px] text-gray-500 font-mono">
                                    {ord.production_updated_at || ord.created_at ? new Date(ord.production_updated_at || ord.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                                  </td>

                                  <td className="p-3 text-center">
                                    <div className="flex items-center justify-center gap-1 flex-wrap">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenUpdateModal(ord)}
                                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition cursor-pointer shadow-xs inline-flex items-center gap-1"
                                        title="Update Progres Produksi"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        <span>Progres</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleOpenHistoryModal(ord)}
                                        className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                        title="Lihat Riwayat Update"
                                      >
                                        <span>Riwayat</span>
                                      </button>

                                      {/* Button Tandai Siap Diambil */}
                                      {currentPickupStatus === 'Belum Siap Diambil' && (
                                        <button
                                          type="button"
                                          onClick={() => handleMarkSiapDiambil(ord)}
                                          disabled={!isFinished}
                                          title={!isFinished ? 'Produksi harus 100% Selesai terlebih dahulu' : 'Tandai Siap Diambil'}
                                          className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition ${
                                            isFinished
                                              ? 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs'
                                              : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                          }`}
                                        >
                                          Siap Diambil
                                        </button>
                                      )}

                                      {/* Button Konfirmasi Sudah Diambil */}
                                      {currentPickupStatus === 'Siap Diambil' && (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenConfirmPickupModal(ord)}
                                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition cursor-pointer shadow-xs inline-flex items-center gap-1 animate-pulse"
                                        >
                                          <PackageCheck className="w-3.5 h-3.5" />
                                          <span>Diambil</span>
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL UPDATE PROGRES PRODUKSI */}
      {isUpdateModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <Factory className="w-5 h-5 text-indigo-600" /> Update Progres Produksi PDH
                </h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  Order No: <strong className="text-gray-900">{selectedOrder.order_number}</strong> ({selectedOrder.buyer_name})
                </p>
              </div>

              <button
                onClick={() => setIsUpdateModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              {/* Presets Quick Action */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase text-gray-600">Quick Presets Progres</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(0, 'Belum Diproduksi', 'Belum Diproduksi')}
                    className="p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-700 text-center transition cursor-pointer"
                  >
                    0% Belum
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(25, 'Sedang Diproduksi', '25% — Proses Pemotongan Bahan')}
                    className="p-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-[11px] font-bold text-amber-800 text-center transition cursor-pointer"
                  >
                    25% Potong
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(50, 'Sedang Diproduksi', '50% — Proses Bordir & Jahit')}
                    className="p-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-[11px] font-bold text-blue-800 text-center transition cursor-pointer"
                  >
                    50% Jahit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(100, 'Selesai', '100% — Selesai & QC Finished')}
                    className="p-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[11px] font-bold text-emerald-800 text-center transition cursor-pointer"
                  >
                    100% Selesai
                  </button>
                </div>
              </div>

              {/* Percentage Slider */}
              <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-gray-700 uppercase">Persentase Progres</label>
                  <span className="font-black text-indigo-700 text-sm font-mono">{prodPercentage}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={prodPercentage}
                  onChange={(e) => setProdPercentage(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Status Produksi */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Status Produksi</label>
                <select
                  value={prodStatus}
                  onChange={(e) => setProdStatus(e.target.value as ProductionStatus)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:bg-white"
                >
                  <option value="Belum Diproduksi">Belum Diproduksi</option>
                  <option value="Sedang Diproduksi">Sedang Diproduksi</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Siap Diambil">Siap Diambil</option>
                </select>
              </div>

              {/* Keterangan Progres */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Keterangan Progres</label>
                <textarea
                  value={prodNotes}
                  onChange={(e) => setProdNotes(e.target.value)}
                  rows={3}
                  required
                  placeholder="Contoh: 50% — Kain sedang dijahit oleh vendor, bordir logo kampus selesai..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:bg-white"
                />
              </div>

              {/* Foto Progres Upload */}
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Foto Progres (Opsional - Disimpan di Drive PRODUCTION_PROGRESS)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={handleFileChange}
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition cursor-pointer"
                />

                {filePreview && (
                  <div className="mt-2 relative w-full h-32 bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                    <img src={filePreview} alt="Preview Foto Progres" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsUpdateModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>SIMPAN PROGRES PRODUKSI</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RIWAYAT PROGRES PRODUKSI */}
      {isHistoryModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-gray-100 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" /> Riwayat Progres Produksi PDH
                </h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  Order No: <strong className="text-gray-900">{selectedOrder.order_number}</strong> ({selectedOrder.buyer_name})
                </p>
              </div>

              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {!selectedOrder.production_history || selectedOrder.production_history.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl text-gray-400 text-xs">
                  Belum ada riwayat update progres untuk pesanan ini.
                </div>
              ) : (
                selectedOrder.production_history.map((hist, idx) => (
                  <div key={hist.progress_id || idx} className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                      <span className="font-bold text-indigo-800 font-mono text-sm">{hist.percentage}% — {hist.production_status}</span>
                      <span className="text-[10px] text-gray-400">{new Date(hist.updated_at).toLocaleString('id-ID')}</span>
                    </div>

                    <p className="text-gray-700 font-medium whitespace-pre-line">{hist.notes || 'Tidak ada keterangan'}</p>

                    {hist.photo_url && (
                      <div className="mt-2 w-full h-40 bg-black/5 rounded-lg overflow-hidden border border-gray-200">
                        <img src={hist.photo_url} alt="Foto Progres" className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="text-[10px] text-gray-400 font-mono pt-1">
                      Updated by Panitia: {hist.updated_by}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="text-right pt-2 border-t border-gray-100">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI SUDAH DIAMBIL */}
      {isConfirmPickupModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 text-emerald-600" /> Konfirmasi Pengambilan PDH
                </h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  Order No: <strong className="text-gray-900">{selectedOrder.order_number}</strong>
                </p>
              </div>

              <button
                onClick={() => setIsConfirmPickupModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleConfirmPickupSubmit} className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-xs text-amber-900">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Konfirmasi Serah Terima PDH</span>
                </div>
                <p className="text-amber-800 leading-relaxed">
                  Apakah Anda yakin ingin menandai pesanan <strong>{selectedOrder.order_number}</strong> ({selectedOrder.buyer_name}) sebagai <strong>SUDAH DIAMBIL</strong>?
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                  Catatan Pengambilan / Penerima
                </label>
                <input
                  type="text"
                  value={pickupNotesInput}
                  onChange={(e) => setPickupNotesInput(e.target.value)}
                  required
                  placeholder="Contoh: Diambil oleh Ahmad Mahasiswa (KTM Terverifikasi)"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:bg-white"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmPickupModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>YA, KONFIRMASI SUDAH DIAMBIL</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL UPDATE PROGRES MASAL PRODUKSI */}
      {isBulkUpdateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-gray-900 text-base">Update Progres Masal ({selectedOrderIds.length} Pesanan)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkUpdateModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleBulkUpdateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Preset Progres Produksi</label>
                <div className="grid grid-cols-5 gap-1">
                  {[0, 25, 50, 75, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setBulkPercentage(preset);
                        if (preset === 0) setBulkStatus('Belum Diproduksi');
                        else if (preset === 100) setBulkStatus('Selesai');
                        else setBulkStatus('Sedang Diproduksi');
                      }}
                      className={`py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                        bulkPercentage === preset ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {preset}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Status Produksi</label>
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value as ProductionStatus)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-bold"
                >
                  <option value="Belum Diproduksi">Belum Diproduksi (0%)</option>
                  <option value="Sedang Diproduksi">Sedang Diproduksi (1–99%)</option>
                  <option value="Selesai">Selesai (100%)</option>
                  <option value="Siap Diambil">Siap Diambil</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-gray-700 uppercase">Persentase Progres ({bulkPercentage}%)</label>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={bulkPercentage}
                  onChange={(e) => setBulkPercentage(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Catatan Progres Masal</label>
                <textarea
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  rows={2}
                  placeholder="Catatan progres masal..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:bg-white"
                />
              </div>

              {/* Upload Foto Progres Vendor Masal */}
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-indigo-600" />
                  <span>Foto Progres Vendor (Opsional)</span>
                </label>
                <div className="space-y-2">
                  <input
                    ref={bulkFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBulkFileChange}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      bulkFileInputRef.current?.click();
                    }}
                    className="w-full py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{bulkFilePreview ? 'Ganti Foto Progres' : 'Pilih Foto Progres Vendor'}</span>
                  </button>

                  {bulkError && (
                    <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{bulkError}</span>
                    </p>
                  )}

                  {bulkFilePreview && (
                    <div className="relative rounded-xl border border-gray-200 overflow-hidden bg-slate-50 p-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <img src={bulkFilePreview} alt="Preview Foto Progres" className="w-12 h-12 object-cover rounded-lg flex-shrink-0 border border-gray-200" />
                        <span className="text-[11px] text-gray-700 font-bold truncate">{bulkFileName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearBulkFile}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-[10px] transition cursor-pointer flex-shrink-0"
                      >
                        Hapus Foto
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] font-medium">
                <strong>Konfirmasi:</strong> Anda akan memperbarui progres <strong>{selectedOrderIds.length} pesanan</strong> terpilih secara bersamaan.
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkUpdateModalOpen(false)}
                  className="py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={bulkSubmitting}
                  className="py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  {bulkSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
                  <span>Simpan Masal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
