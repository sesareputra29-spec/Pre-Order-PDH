import React, { useState, useEffect } from 'react';
import { User, PDHMasterData, PDHInfo, PDHPricing, PDHSize, PDHPaymentInfo } from '../types';
import { api } from '../services/apiClient';
import { PanitiaPOManagement } from './PanitiaPOManagement';
import {
  Shirt,
  Tag,
  DollarSign,
  Image as ImageIcon,
  CreditCard,
  Save,
  Plus,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  ExternalLink,
  Ruler,
  Calendar
} from 'lucide-react';

interface PanitiaPDHSettingsProps {
  user: User;
  onRefreshAuditLogs?: () => void;
}

type PDHSubTab = 'info' | 'po_period' | 'ukuran' | 'harga' | 'desain' | 'pembayaran';


export const PanitiaPDHSettings: React.FC<PanitiaPDHSettingsProps> = ({ user, onRefreshAuditLogs }) => {
  const [subTab, setSubTab] = useState<PDHSubTab>('info');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [masterData, setMasterData] = useState<PDHMasterData | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states
  const [infoForm, setInfoForm] = useState<PDHInfo>({
    pdhName: '',
    pdhYear: '',
    pdhDescription: '',
    pdhSpec: '',
    pdhMaterial: '',
    pdhModel: '',
    pdhColor: '',
    pdhTerms: '',
    pdhContact: ''
  });

  const [pricingForm, setPricingForm] = useState<PDHPricing>({
    price: 185000,
    active: true,
    notes: ''
  });

  const [paymentForm, setPaymentForm] = useState<PDHPaymentInfo>({
    method: 'Transfer Bank / QRIS',
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    instructions: ''
  });

  // Size Form Modal state
  const [sizeModalOpen, setSizeModalOpen] = useState(false);
  const [editingSize, setEditingSize] = useState<PDHSize>({
    size_id: '',
    size_code: '',
    size_name: '',
    chest_width: '',
    body_length: '',
    sleeve_length: '',
    extra_fee: 0,
    status: 'ACTIVE',
    notes: ''
  });

  // Image Upload & Gallery state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeLightboxUrl, setActiveLightboxUrl] = useState<string | null>(null);
  const [replacingImageId, setReplacingImageId] = useState<string | null>(null);
  const replaceFileInputRef = React.useRef<HTMLInputElement>(null);
  const uploadFileInputRef = React.useRef<HTMLInputElement>(null);

  // Compression helper
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

  // Upload New Design Image (Max 5)
  const handleUploadNewImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showFeedback('error', 'Format file tidak valid! Wajib mengunggah file gambar (JPG, PNG, WEBP).');
      return;
    }

    if ((masterData?.images?.length || 0) >= 5) {
      showFeedback('error', 'Maksimal 5 foto desain PDH. Hapus salah satu foto terlebih dahulu.');
      return;
    }

    setUploadingImage(true);
    try {
      const compressed = await compressImage(file, 800, 800, 0.75);
      const res = await api.uploadPDHDesignImage({
        file_name: file.name,
        mime_type: 'image/jpeg',
        base64_data: compressed.base64,
        caption: file.name
      });

      if (res.success) {
        showFeedback('success', 'Foto desain PDH berhasil diunggah!');
        loadMasterData();
        if (onRefreshAuditLogs) onRefreshAuditLogs();
      } else {
        showFeedback('error', res.message || 'Gagal mengunggah foto desain.');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Gagal memproses foto.');
    } finally {
      setUploadingImage(false);
      if (uploadFileInputRef.current) uploadFileInputRef.current.value = '';
    }
  };

  // Replace Existing Design Image
  const handleReplaceImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const file = e.target.files?.[0];
    if (!file || !replacingImageId) return;

    if (!file.type.startsWith('image/')) {
      showFeedback('error', 'Format file tidak valid! Wajib mengunggah file gambar.');
      return;
    }

    setUploadingImage(true);
    try {
      const compressed = await compressImage(file, 800, 800, 0.75);
      const res = await api.replacePDHDesignImage(replacingImageId, {
        file_name: file.name,
        mime_type: 'image/jpeg',
        base64_data: compressed.base64,
        caption: file.name
      });

      if (res.success) {
        showFeedback('success', 'Foto desain PDH berhasil diganti!');
        loadMasterData();
        if (onRefreshAuditLogs) onRefreshAuditLogs();
      } else {
        showFeedback('error', res.message || 'Gagal mengganti foto.');
      }
    } catch (err: any) {
      showFeedback('error', err.message || 'Gagal memproses foto.');
    } finally {
      setUploadingImage(false);
      setReplacingImageId(null);
      if (replaceFileInputRef.current) replaceFileInputRef.current.value = '';
    }
  };

  // Delete Design Image
  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus foto desain ini?')) return;

    setUploadingImage(true);
    try {
      const res = await api.deletePDHDesignImage(imageId);
      if (res.success) {
        showFeedback('success', 'Foto desain berhasil dihapus!');
        loadMasterData();
        if (onRefreshAuditLogs) onRefreshAuditLogs();
      } else {
        showFeedback('error', res.message || 'Gagal menghapus foto.');
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    setLoading(true);
    try {
      const res = await api.getPDHMasterData();
      if (res.success && res.data) {
        setMasterData(res.data);
        setInfoForm(res.data.info);
        setPricingForm(res.data.pricing);
        setPaymentForm(res.data.payment);
      }
    } catch (e: any) {
      showFeedback('error', 'Gagal memuat data Master PDH.');
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // 1. Save Info
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updatePDHInfo(infoForm);
      if (res.success) {
        showFeedback('success', 'Informasi & Ketentuan PDH berhasil diperbarui.');
        loadMasterData();
        if (onRefreshAuditLogs) onRefreshAuditLogs();
      } else {
        showFeedback('error', res.message || 'Gagal menyimpan info.');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  // 2. Save Pricing
  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updatePDHPricing(pricingForm);
      if (res.success) {
        showFeedback('success', 'Harga Aktif PDH berhasil diperbarui.');
        loadMasterData();
        if (onRefreshAuditLogs) onRefreshAuditLogs();
      } else {
        showFeedback('error', res.message || 'Gagal menyimpan harga.');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  // 3. Save Size
  const handleSaveSize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSize.size_code) return;
    setSaving(true);
    try {
      const res = await api.savePDHSize(editingSize);
      if (res.success) {
        showFeedback('success', `Ukuran ${editingSize.size_code} berhasil disimpan.`);
        setSizeModalOpen(false);
        loadMasterData();
        if (onRefreshAuditLogs) onRefreshAuditLogs();
      } else {
        showFeedback('error', res.message || 'Gagal menyimpan ukuran.');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  // 4. Save Payment Info
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updatePDHPaymentInfo(paymentForm);
      if (res.success) {
        showFeedback('success', 'Informasi Pembayaran berhasil diperbarui.');
        loadMasterData();
        if (onRefreshAuditLogs) onRefreshAuditLogs();
      } else {
        showFeedback('error', res.message || 'Gagal menyimpan informasi pembayaran.');
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  // 5. Upload Design Image
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = (event.target?.result as string).split(',')[1];

      try {
        const res = await api.uploadPDHDesignImage({
          file_name: file.name,
          mime_type: file.type,
          base64_data: base64Data,
          caption: file.name
        });

        if (res.success) {
          showFeedback('success', 'Desain PDH baru berhasil diunggah ke Google Drive!');
          loadMasterData();
          if (onRefreshAuditLogs) onRefreshAuditLogs();
        } else {
          showFeedback('error', res.message || 'Gagal mengunggah desain.');
        }
      } catch (err: any) {
        showFeedback('error', err.message);
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const subMenuItems: { id: PDHSubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'info', label: 'Info & Ketentuan', icon: <Info className="w-4 h-4" /> },
    { id: 'po_period', label: 'Periode Pre Order', icon: <Calendar className="w-4 h-4" /> },
    { id: 'ukuran', label: 'Daftar Ukuran', icon: <Ruler className="w-4 h-4" /> },
    { id: 'harga', label: 'Harga Aktif', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'desain', label: 'Foto & Desain', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'pembayaran', label: 'Pembayaran', icon: <CreditCard className="w-4 h-4" /> }
  ];


  if (loading && !masterData) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" />
        <p className="text-xs text-gray-500 font-medium">Memuat Pengaturan Master PDH...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub Menu Navigation Tabs */}
      <div className="bg-white border border-gray-200 rounded-2xl p-1.5 flex gap-1 overflow-x-auto shadow-2xs">
        {subMenuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setSubTab(item.id)}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              subTab === item.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
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

      {/* 1. INFO & KETENTUAN */}
      {subTab === 'info' && (
        <form onSubmit={handleSaveInfo} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Pengaturan Informasi &amp; Ketentuan PDH</h3>
              <p className="text-xs text-gray-500">
                Informasi ini langsung sinkron dan ditampilkan pada Portal Mahasiswa.
              </p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Simpan Informasi</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Nama PDH</label>
              <input
                type="text"
                value={infoForm.pdhName}
                onChange={(e) => setInfoForm({ ...infoForm, pdhName: e.target.value })}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Tahun / Angkatan</label>
              <input
                type="text"
                value={infoForm.pdhYear}
                onChange={(e) => setInfoForm({ ...infoForm, pdhYear: e.target.value })}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-gray-700 uppercase mb-1">Deskripsi PDH</label>
              <textarea
                rows={3}
                value={infoForm.pdhDescription}
                onChange={(e) => setInfoForm({ ...infoForm, pdhDescription: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-gray-700 uppercase mb-1">Spesifikasi Detail</label>
              <input
                type="text"
                value={infoForm.pdhSpec}
                onChange={(e) => setInfoForm({ ...infoForm, pdhSpec: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Bahan Kain</label>
              <input
                type="text"
                value={infoForm.pdhMaterial}
                onChange={(e) => setInfoForm({ ...infoForm, pdhMaterial: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Model / Potongan</label>
              <input
                type="text"
                value={infoForm.pdhModel}
                onChange={(e) => setInfoForm({ ...infoForm, pdhModel: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Warna Utama</label>
              <input
                type="text"
                value={infoForm.pdhColor}
                onChange={(e) => setInfoForm({ ...infoForm, pdhColor: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Kontak Panitia / Humas</label>
              <input
                type="text"
                value={infoForm.pdhContact}
                onChange={(e) => setInfoForm({ ...infoForm, pdhContact: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-gray-700 uppercase mb-1">Ketentuan Pemesanan</label>
              <textarea
                rows={3}
                value={infoForm.pdhTerms}
                onChange={(e) => setInfoForm({ ...infoForm, pdhTerms: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </form>
      )}

      {/* PERIODE PRE ORDER */}
      {subTab === 'po_period' && (
        <PanitiaPOManagement user={user} onRefreshAuditLogs={onRefreshAuditLogs} />
      )}


      {/* 2. DAFTAR UKURAN */}
      {subTab === 'ukuran' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden space-y-4 p-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Daftar Ukuran PDH</h3>
              <p className="text-xs text-gray-500">Kelola ukuran (S, M, L, XL, XXL) dan biaya tambahan.</p>
            </div>
            <button
              onClick={() => {
                setEditingSize({
                  size_id: '',
                  size_code: '',
                  size_name: '',
                  chest_width: '',
                  body_length: '',
                  sleeve_length: '',
                  extra_fee: 0,
                  status: 'ACTIVE',
                  notes: ''
                });
                setSizeModalOpen(true);
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Ukuran</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 uppercase text-[10px] font-bold text-gray-700">
                <tr>
                  <th className="px-4 py-3">Kode</th>
                  <th className="px-4 py-3">Lebar Dada</th>
                  <th className="px-4 py-3">Panjang Badan</th>
                  <th className="px-4 py-3">Panjang Lengan</th>
                  <th className="px-4 py-3">Extra Fee</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {masterData?.sizes.map((s) => (
                  <tr key={s.size_id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-bold font-mono text-gray-900">{s.size_code}</td>
                    <td className="px-4 py-3 text-gray-600">{s.chest_width || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.body_length || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.sleeve_length || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {s.extra_fee > 0 ? `+Rp ${s.extra_fee.toLocaleString('id-ID')}` : 'Rp 0'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setEditingSize(s);
                          setSizeModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-semibold"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. HARGA AKTIF */}
      {subTab === 'harga' && (
        <form onSubmit={handleSavePricing} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Pengaturan Harga PDH Aktif</h3>
              <p className="text-xs text-gray-500">Harga yang diset di sini akan langsung berlaku untuk transaksi mahasiswa.</p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Simpan Harga</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Harga Satuan PDH (Rp)</label>
              <input
                type="number"
                value={pricingForm.price}
                onChange={(e) => setPricingForm({ ...pricingForm, price: parseFloat(e.target.value) || 0 })}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold font-mono text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Status Publikasi Harga</label>
              <select
                value={pricingForm.active ? 'true' : 'false'}
                onChange={(e) => setPricingForm({ ...pricingForm, active: e.target.value === 'true' })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="true">AKTIF (Tampilkan di Portal Mahasiswa)</option>
                <option value="false">NONAKTIF (Sembunyikan Harga)</option>
              </select>
            </div>

            <div className="md:col-span-2 p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2">
              <span className="font-bold text-indigo-900 uppercase text-[10px] block">Simulasi Harga Final yang Dilihat Mahasiswa</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-xl border border-indigo-100">
                  <span className="text-[10px] text-gray-400 font-bold block uppercase">Ukuran Standard (S-XL)</span>
                  <span className="font-mono font-bold text-gray-900 text-sm">
                    Rp {pricingForm.price.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-indigo-100">
                  <span className="text-[10px] text-gray-400 font-bold block uppercase">Ukuran Jumbo (XXL +10k)</span>
                  <span className="font-mono font-bold text-indigo-700 text-sm">
                    Rp {(pricingForm.price + 10000).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-indigo-100">
                  <span className="text-[10px] text-gray-400 font-bold block uppercase">Ukuran Super Jumbo (3XL +15k)</span>
                  <span className="font-mono font-bold text-indigo-700 text-sm">
                    Rp {(pricingForm.price + 15000).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-gray-700 uppercase mb-1">Keterangan / Catatan Harga</label>
              <textarea
                rows={2}
                value={pricingForm.notes}
                onChange={(e) => setPricingForm({ ...pricingForm, notes: e.target.value })}
                placeholder="Contoh: Sudah termasuk bordir nama dan logo resmi kampus."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </form>
      )}

      {/* 4. FOTO & DESAIN */}
      {subTab === 'desain' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
          {/* Lightbox Modal */}
          {activeLightboxUrl && (
            <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-4 max-w-2xl w-full space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-indigo-600" /> Preview Foto Desain PDH
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveLightboxUrl(null)}
                    className="text-gray-400 hover:text-gray-600 font-bold p-1 rounded-lg cursor-pointer"
                  >
                    &times;
                  </button>
                </div>
                <div className="bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center max-h-[75vh]">
                  <img
                    src={activeLightboxUrl}
                    alt="Preview Desain"
                    className="max-h-[75vh] w-auto object-contain"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Hidden File Inputs */}
          <input
            ref={uploadFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUploadNewImage}
            className="hidden"
          />
          <input
            ref={replaceFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleReplaceImage}
            className="hidden"
          />

          <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-600" /> Foto &amp; Desain Resmi Baju PDH
              </h3>
              <p className="text-xs text-gray-500">
                Maksimal 5 foto desain. Foto di sini akan ditampilkan sebagai sampel desain resmi kepada mahasiswa.
              </p>
            </div>

            <button
              type="button"
              disabled={uploadingImage || (masterData?.images?.length || 0) >= 5}
              onClick={() => uploadFileInputRef.current?.click()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
            >
              {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>
                {(masterData?.images?.length || 0) >= 5
                  ? 'Batas Maksimal (5 Foto)'
                  : 'Tambah Foto Desain'}
              </span>
            </button>
          </div>

          {/* Info Banner */}
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span>
                Jumlah Foto Terpasang: <strong>{masterData?.images?.length || 0} dari 5 foto</strong>. Foto pertama adalah Desain Utama.
              </span>
            </div>
          </div>

          {/* Gallery Grid */}
          {!masterData?.images || masterData.images.length === 0 ? (
            <div className="p-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300 space-y-3">
              <ImageIcon className="w-10 h-10 text-gray-300 mx-auto" />
              <h4 className="font-bold text-gray-700 text-sm">Belum Ada Foto Desain PDH</h4>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">
                Silakan unggah foto sampel desain PDH resmi untuk ditampilkan kepada mahasiswa.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {masterData.images.map((img, idx) => (
                <div
                  key={img.image_id || idx}
                  className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden space-y-2 p-3 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="aspect-4/3 rounded-xl bg-slate-900 overflow-hidden relative group">
                      <img
                        src={img.file_url}
                        alt={`Desain PDH #${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <span
                        className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-black uppercase shadow-xs ${
                          idx === 0
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-700 text-white'
                        }`}
                      >
                        {idx === 0 ? '★ DESAIN UTAMA' : `FOTO #${idx + 1}`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-800 text-[11px] truncate">
                        {img.file_name || `Foto_Desain_${idx + 1}.jpg`}
                      </span>
                    </div>
                  </div>

                  {/* Actions: View, Replace, Delete */}
                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setActiveLightboxUrl(img.file_url)}
                      className="py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>Lihat</span>
                    </button>

                    <button
                      type="button"
                      disabled={uploadingImage}
                      onClick={() => {
                        setReplacingImageId(img.image_id);
                        replaceFileInputRef.current?.click();
                      }}
                      className="py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>Ganti</span>
                    </button>

                    <button
                      type="button"
                      disabled={uploadingImage}
                      onClick={() => handleDeleteImage(img.image_id)}
                      className="py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. PEMBAYARAN */}
      {subTab === 'pembayaran' && (
        <form onSubmit={handleSavePayment} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
          <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Informasi Rekening &amp; Pembayaran</h3>
              <p className="text-xs text-gray-500">Ditampilkan kepada mahasiswa saat melunasi tagihan PDH.</p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Simpan Pembayaran</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Metode Pembayaran</label>
              <input
                type="text"
                value={paymentForm.method}
                onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Nama Bank / E-Wallet</label>
              <input
                type="text"
                value={paymentForm.bankName}
                onChange={(e) => setPaymentForm({ ...paymentForm, bankName: e.target.value })}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Nomor Rekening / Akun</label>
              <input
                type="text"
                value={paymentForm.accountNumber}
                onChange={(e) => setPaymentForm({ ...paymentForm, accountNumber: e.target.value })}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-mono text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Nama Pemilik / Penerima</label>
              <input
                type="text"
                value={paymentForm.accountHolder}
                onChange={(e) => setPaymentForm({ ...paymentForm, accountHolder: e.target.value })}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-gray-700 uppercase mb-1">Instruksi Pembayaran</label>
              <textarea
                rows={3}
                value={paymentForm.instructions}
                onChange={(e) => setPaymentForm({ ...paymentForm, instructions: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </form>
      )}

      {/* SIZE FORM MODAL */}
      {sizeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveSize}
            className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-gray-100 p-6 space-y-4"
          >
            <h3 className="font-bold text-gray-900 text-sm">Formulir Ukuran PDH</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase text-gray-700 mb-1">Kode Ukuran (e.g. S, M, L, XL)</label>
                <input
                  type="text"
                  value={editingSize.size_code}
                  onChange={(e) => setEditingSize({ ...editingSize, size_code: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl uppercase font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold uppercase text-gray-700 mb-1">Lebar Dada</label>
                  <input
                    type="text"
                    value={editingSize.chest_width}
                    onChange={(e) => setEditingSize({ ...editingSize, chest_width: e.target.value })}
                    placeholder="51 cm"
                    className="w-full px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-gray-700 mb-1">Panjang Badan</label>
                  <input
                    type="text"
                    value={editingSize.body_length}
                    onChange={(e) => setEditingSize({ ...editingSize, body_length: e.target.value })}
                    placeholder="68 cm"
                    className="w-full px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase text-gray-700 mb-1">Panjang Lengan</label>
                  <input
                    type="text"
                    value={editingSize.sleeve_length}
                    onChange={(e) => setEditingSize({ ...editingSize, sleeve_length: e.target.value })}
                    placeholder="58 cm"
                    className="w-full px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-gray-700 mb-1">Biaya Tambahan (Rp)</label>
                <input
                  type="number"
                  value={editingSize.extra_fee}
                  onChange={(e) => setEditingSize({ ...editingSize, extra_fee: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-gray-700 mb-1">Status Ukuran</label>
                <select
                  value={editingSize.status}
                  onChange={(e) => setEditingSize({ ...editingSize, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-bold"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSizeModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold"
              >
                Simpan Ukuran
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
