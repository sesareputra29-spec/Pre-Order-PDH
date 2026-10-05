import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { User, OrderType, PDHMasterData, POPeriod, OrderItemInput, OrderPayload } from '../types';
import { api } from '../services/apiClient';
import {
  UserCheck,
  Users,
  Plus,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShoppingBag,
  FileSpreadsheet,
  HelpCircle,
  Shirt,
  Info,
  Download,
  X,
  FileCheck2,
  AlertTriangle
} from 'lucide-react';

interface StudentOrderFormProps {
  user: User;
  masterData: PDHMasterData;
  activePO: (POPeriod & { isOpen: boolean }) | null;
  onOrderSuccess: () => void;
}

// Class format regex: 2 digits + MJSP/MJSM/MJSE + 3 digits
const CLASS_CODE_REGEX = /^\d{2}(MJSP|MJSM|MJSE)\d{3}$/i;

interface ImportRowValidation {
  rowNum: number;
  fullName: string;
  nim: string;
  className: string;
  sizeCode: string;
  isValid: boolean;
  errors: string[];
}

export const StudentOrderForm: React.FC<StudentOrderFormProps> = ({
  user,
  masterData,
  activePO,
  onOrderSuccess
}) => {
  const [orderType, setOrderType] = useState<OrderType>('PRIBADI');

  // Buyer Penanggung Jawab Form
  const [buyerName, setBuyerName] = useState(user.name || '');
  const [buyerNim, setBuyerNim] = useState(user.nim || user.username || '');
  const [buyerClass, setBuyerClass] = useState(user.className || (user as any).class_name || '');
  const [buyerWhatsapp, setBuyerWhatsapp] = useState((user as any).phone || '');
  const [notes, setNotes] = useState('');

  // Items State (For PRIBADI: 1 item; For KOLEKTIF: N items)
  const [singleSize, setSingleSize] = useState('M');
  const [singleCustomName, setSingleCustomName] = useState(user.name || '');

  const [collectiveMembers, setCollectiveMembers] = useState<OrderItemInput[]>([
    {
      fullName: user.name || '',
      nim: user.nim || user.username || '',
      className: user.className || (user as any).class_name || '',
      sizeCode: 'M',
      customName: user.name || '',
      quantity: 1
    }
  ]);

  // Modal & Async states
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [submitting, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [successOrder, setSuccessOrder] = useState<{ order_number: string; total_amount: number } | null>(null);

  // Excel Import State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importedFileName, setImportedFileName] = useState<string>('');
  const [importValidationRows, setImportValidationRows] = useState<ImportRowValidation[]>([]);
  const [importHasError, setImportHasError] = useState<boolean>(false);

  const activeSizes = masterData.sizes.filter((s) => s.status === 'ACTIVE');
  const basePrice = masterData.pricing.price || 185000;

  // Class format validator
  const isClassValid = (c: string) => CLASS_CODE_REGEX.test(c.trim());

  // Calculate live total amount
  const calculateTotal = () => {
    let total = 0;
    if (orderType === 'PRIBADI') {
      const extra = activeSizes.find((s) => s.size_code.toUpperCase() === singleSize.toUpperCase())?.extra_fee || 0;
      total = basePrice + extra;
    } else {
      collectiveMembers.forEach((m) => {
        const extra = activeSizes.find((s) => s.size_code.toUpperCase() === m.sizeCode.toUpperCase())?.extra_fee || 0;
        total += (basePrice + extra) * (m.quantity || 1);
      });
    }
    return total;
  };

  const handleAddMember = () => {
    setCollectiveMembers([
      ...collectiveMembers,
      {
        fullName: '',
        nim: '',
        className: buyerClass,
        sizeCode: 'M',
        customName: '',
        quantity: 1
      }
    ]);
  };

  const handleRemoveMember = (index: number) => {
    if (collectiveMembers.length <= 1) {
      setFeedback({ type: 'error', message: 'Pesanan kolektif harus berisi minimal 1 anggota.' });
      return;
    }
    setCollectiveMembers(collectiveMembers.filter((_, i) => i !== index));
  };

  const handleMemberChange = (index: number, field: keyof OrderItemInput, value: any) => {
    const updated = [...collectiveMembers];
    updated[index] = { ...updated[index], [field]: value };
    setCollectiveMembers(updated);
  };

  // Download Official Excel Template
  const handleDownloadTemplate = () => {
    const activeSizeCodes = activeSizes.map((s) => s.size_code).join(', ') || 'S, M, L, XL, XXL';

    const templateData = [
      ['No', 'Nama Mahasiswa', 'NIM', 'Kelas', 'Ukuran PDH'],
      [1, 'Ahmad Santoso', '2026101001', '01MJSP001', activeSizes[0]?.size_code || 'L'],
      [2, 'Budi Pratama', '2026101002', '01MJSP001', activeSizes[1]?.size_code || 'XL'],
      [3, 'Citra Rahma', '2026101003', '01MJSM001', activeSizes[0]?.size_code || 'M']
    ];

    const instructionsData = [
      ['PETUNJUK PENGISIAN TEMPLATE IMPORT PESANAN KOLEKTIF'],
      [''],
      ['1. Kolom Wajib:', 'No | Nama Mahasiswa | NIM | Kelas | Ukuran PDH'],
      ['2. Format Kelas:', 'Wajib mengikuti aturan: ##MJSP### (Reg A), ##MJSM### (Reg B), atau ##MJSE### (Reg C).'],
      ['   Contoh Kelas Valid:', '01MJSP001, 01MJSM001, 01MJSE001'],
      ['3. Ukuran PDH Aktif:', activeSizeCodes],
      ['4. Ketentuan Lain:', 'Pastikan tidak ada NIM duplikat dan seluruh kolom terisi lengkap.']
    ];

    const wb = XLSX.utils.book_new();

    const wsTemplate = XLSX.utils.aoa_to_sheet(templateData);
    // Set column widths
    wsTemplate['!cols'] = [
      { wch: 6 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 }
    ];

    const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
    wsInstructions['!cols'] = [{ wch: 25 }, { wch: 65 }];

    XLSX.utils.book_append_sheet(wb, wsTemplate, 'Template Pesanan');
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Petunjuk Pengisian');

    XLSX.writeFile(wb, 'Template_Pesanan_Kolektif_PDH.xlsx');
  };

  // Process Excel File Upload & Validation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportedFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (!jsonRows || jsonRows.length <= 1) {
          setImportValidationRows([]);
          setImportHasError(true);
          return;
        }

        // Detect column positions from header row (row 0)
        const headerRow = jsonRows[0].map((h) => String(h || '').trim().toLowerCase());
        let colName = headerRow.findIndex((h) => h.includes('nama'));
        let colNim = headerRow.findIndex((h) => h.includes('nim'));
        let colClass = headerRow.findIndex((h) => h.includes('kelas'));
        let colSize = headerRow.findIndex((h) => h.includes('ukuran') || h.includes('size'));

        // Fallbacks if headers differ
        if (colName === -1) colName = 1;
        if (colNim === -1) colNim = 2;
        if (colClass === -1) colClass = 3;
        if (colSize === -1) colSize = 4;

        const validationResults: ImportRowValidation[] = [];
        const seenNims = new Set<string>();
        let globalErrorFound = false;

        for (let i = 1; i < jsonRows.length; i++) {
          const row = jsonRows[i];
          if (!row || row.length === 0 || row.every((cell) => cell === undefined || cell === null || String(cell).trim() === '')) {
            continue; // Skip empty rows
          }

          const rowNum = i + 1; // 1-indexed Excel row number
          const fullName = String(row[colName] || '').trim();
          const nim = String(row[colNim] || '').trim();
          const className = String(row[colClass] || '').trim().toUpperCase();
          const sizeCode = String(row[colSize] || '').trim().toUpperCase();

          const errors: string[] = [];

          // 1. Nama Wajib
          if (!fullName) {
            errors.push('Nama Mahasiswa wajib diisi.');
          }

          // 2. NIM Wajib & Unique
          if (!nim) {
            errors.push('NIM wajib diisi.');
          } else if (seenNims.has(nim)) {
            errors.push(`NIM '${nim}' duplikat di file import.`);
          } else {
            seenNims.add(nim);
          }

          // 3. Kelas Wajib & Valid Format
          if (!className) {
            errors.push('Kelas wajib diisi.');
          } else if (!isClassValid(className)) {
            errors.push(`Format kelas '${className}' tidak valid. (Contoh: 01MJSP001)`);
          }

          // 4. Ukuran Wajib & Valid Master PDH
          if (!sizeCode) {
            errors.push('Ukuran PDH wajib diisi.');
          } else {
            const sizeExists = activeSizes.some((s) => s.size_code.toUpperCase() === sizeCode);
            if (!sizeExists) {
              errors.push(`Ukuran '${sizeCode}' tidak tersedia pada Master PDH aktif.`);
            }
          }

          const isValid = errors.length === 0;
          if (!isValid) globalErrorFound = true;

          validationResults.push({
            rowNum,
            fullName,
            nim,
            className,
            sizeCode,
            isValid,
            errors
          });
        }

        setImportValidationRows(validationResults);
        setImportHasError(globalErrorFound || validationResults.length === 0);
      } catch (err) {
        console.error('Error parsing Excel file:', err);
        setImportValidationRows([]);
        setImportHasError(true);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Apply Validated Excel Import Data to Form
  const handleApplyImport = () => {
    if (importHasError || importValidationRows.length === 0) return;

    const newMembers: OrderItemInput[] = importValidationRows.map((r) => ({
      fullName: r.fullName,
      nim: r.nim,
      className: r.className,
      sizeCode: r.sizeCode,
      customName: r.fullName,
      quantity: 1
    }));

    setCollectiveMembers(newMembers);
    setImportModalOpen(false);
    setImportValidationRows([]);
    setImportedFileName('');

    setFeedback({
      type: 'success',
      message: `Berhasil mengimpor ${newMembers.length} anggota pesanan kolektif dari file Excel.`
    });
  };

  // Form Submit Handler (Triggers Confirmation Modal)
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Verify PO Status
    if (!activePO || !activePO.isOpen) {
      setFeedback({ type: 'error', message: 'Pembuatan pesanan ditolak: Pre-Order (PO) saat ini sedang ditutup.' });
      return;
    }

    // 2. Verify Buyer Class Format
    if (!isClassValid(buyerClass)) {
      setFeedback({
        type: 'error',
        message: 'Format Kelas pemesan tidak valid! Harus berformat: ##MJSP###, ##MJSM###, atau ##MJSE### (Contoh: 01MJSP001).'
      });
      return;
    }

    // 3. Verify Items Class Formats
    if (orderType === 'KOLEKTIF') {
      for (let i = 0; i < collectiveMembers.length; i++) {
        const m = collectiveMembers[i];
        if (!m.fullName || !m.nim || !m.className) {
          setFeedback({ type: 'error', message: `Data anggota ke-${i + 1} (${m.fullName || 'Tanpa nama'}) belum lengkap.` });
          return;
        }
        if (!isClassValid(m.className)) {
          setFeedback({
            type: 'error',
            message: `Format Kelas untuk anggota '${m.fullName}' tidak valid (${m.className}). Contoh format: 01MJSP001.`
          });
          return;
        }
      }
    }

    setConfirmModalOpen(true);
  };

  // Final Order Submission to Server
  const handleConfirmOrder = async () => {
    setSaving(true);
    try {
      const itemsList: OrderItemInput[] =
        orderType === 'PRIBADI'
          ? [
              {
                fullName: buyerName,
                nim: buyerNim,
                className: buyerClass.toUpperCase(),
                sizeCode: singleSize.toUpperCase(),
                customName: singleCustomName || buyerName,
                quantity: 1
              }
            ]
          : collectiveMembers.map((m) => ({
              ...m,
              className: m.className.toUpperCase(),
              sizeCode: m.sizeCode.toUpperCase()
            }));

      const payload: OrderPayload = {
        orderType,
        buyerName,
        buyerNim,
        buyerClass: buyerClass.toUpperCase(),
        buyerWhatsapp,
        notes,
        items: itemsList
      };

      const res = await api.createOrder(payload);
      setConfirmModalOpen(false);

      if (res.success && res.data) {
        setSuccessOrder({
          order_number: res.data.order_number,
          total_amount: res.data.total_amount
        });
      } else {
        setFeedback({ type: 'error', message: res.message || 'Gagal menyimpan pesanan.' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Order Form Card */}
      <form onSubmit={handleFormSubmit} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
        <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-base">Formulir Pemesanan PDH Kampus</h3>
            <p className="text-xs text-gray-500">Pilih jenis pesanan dan isi data lengkap pemesan &amp; kustomisasi nama.</p>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
            Estimasi: Rp {calculateTotal().toLocaleString('id-ID')}
          </span>
        </div>

        {/* Order Type Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase text-gray-700">Pilih Jenis Pemesanan</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setOrderType('PRIBADI')}
              className={`p-4 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                orderType === 'PRIBADI'
                  ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <UserCheck className={`w-5 h-5 flex-shrink-0 ${orderType === 'PRIBADI' ? 'text-emerald-600' : 'text-gray-400'}`} />
              <div>
                <div className="font-bold text-xs text-gray-900">Pesanan Pribadi</div>
                <div className="text-[11px] text-gray-500 mt-0.5">Pemesanan PDH untuk diri sendiri.</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setOrderType('KOLEKTIF')}
              className={`p-4 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                orderType === 'KOLEKTIF'
                  ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <Users className={`w-5 h-5 flex-shrink-0 ${orderType === 'KOLEKTIF' ? 'text-emerald-600' : 'text-gray-400'}`} />
              <div>
                <div className="font-bold text-xs text-gray-900">Pesanan Kolektif (Rombongan Kelas)</div>
                <div className="text-[11px] text-gray-500 mt-0.5">Pemesanan sekaligus untuk teman sekelas.</div>
              </div>
            </button>
          </div>
        </div>

        {/* Data Pemesan Penanggung Jawab */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
          <span className="text-xs font-bold uppercase text-gray-800 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-emerald-600" /> Data Pemesan Penanggung Jawab
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">NIM</label>
              <input
                type="text"
                value={buyerNim}
                onChange={(e) => setBuyerNim(e.target.value)}
                required
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-mono font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1 flex items-center justify-between">
                <span>Kode Kelas</span>
                <span className="text-[10px] text-emerald-600 font-normal">Format: ##MJSE###</span>
              </label>
              <input
                type="text"
                value={buyerClass}
                onChange={(e) => setBuyerClass(e.target.value.toUpperCase())}
                required
                placeholder="e.g. 01MJSP001"
                className={`w-full px-3 py-2 bg-white border rounded-xl font-mono uppercase font-bold focus:ring-2 ${
                  isClassValid(buyerClass)
                    ? 'border-emerald-500 focus:ring-emerald-500 text-emerald-900'
                    : 'border-rose-400 focus:ring-rose-500 text-rose-800'
                }`}
              />
              {!isClassValid(buyerClass) && (
                <span className="text-[10px] text-rose-600 mt-1 block">
                  Contoh valid: <strong>01MJSP001</strong> (Reg A), <strong>01MJSM001</strong> (Reg B), <strong>01MJSE001</strong> (Reg C)
                </span>
              )}
            </div>

            <div>
              <label className="block font-bold text-gray-700 uppercase mb-1">Nomor WhatsApp Aktif</label>
              <input
                type="text"
                value={buyerWhatsapp}
                onChange={(e) => setBuyerWhatsapp(e.target.value)}
                required
                placeholder="081234567890"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Class Code Helper Badges */}
          <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1 text-[11px] text-gray-600">
            <div className="font-bold text-gray-800 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-emerald-600" /> Aturan Format Kode Kelas:
            </div>
            <div className="flex flex-wrap gap-2 pt-1 font-mono text-[10px]">
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-bold">
                01MJSP001 = Sem 1 Reg A
              </span>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-bold">
                01MJSM001 = Sem 1 Reg B
              </span>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-bold">
                01MJSE001 = Sem 1 Reg C
              </span>
            </div>
          </div>
        </div>

        {/* PRIBADI ORDER SPECIFIC FIELDS */}
        {orderType === 'PRIBADI' && (
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase text-gray-800">Spesifikasi Ukuran &amp; Nama Bordir</span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Ukuran PDH Available</label>
                <select
                  value={singleSize}
                  onChange={(e) => setSingleSize(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500"
                >
                  {activeSizes.map((s) => (
                    <option key={s.size_id} value={s.size_code}>
                      Ukuran {s.size_code} {s.extra_fee > 0 ? `(+Rp ${s.extra_fee.toLocaleString('id-ID')})` : '(Biaya Standar)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Bordir Nama Kustom</label>
                <input
                  type="text"
                  value={singleCustomName}
                  onChange={(e) => setSingleCustomName(e.target.value)}
                  maxLength={25}
                  placeholder="Nama kustom untuk bordir baju"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* KOLEKTIF ORDER MEMBERS TABLE & EXCEL IMPORT */}
        {orderType === 'KOLEKTIF' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase text-gray-800">
                  Daftar Anggota Kelompok ({collectiveMembers.length} Orang)
                </span>
                <p className="text-[11px] text-gray-500">Mahasiswa yang membuat transaksi menjadi penanggung jawab.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* BUTTON: DOWNLOAD TEMPLATE */}
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Download Official Excel Template"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template</span>
                </button>

                {/* BUTTON: IMPORT EXCEL */}
                <button
                  type="button"
                  onClick={() => {
                    setImportValidationRows([]);
                    setImportedFileName('');
                    setImportHasError(false);
                    setImportModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Import Excel</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddMember}
                  className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Manual</span>
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
              {collectiveMembers.map((m, idx) => (
                <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-gray-700">
                    <span>Anggota #{idx + 1}</span>
                    {collectiveMembers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(idx)}
                        className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Nama Lengkap"
                      value={m.fullName}
                      onChange={(e) => handleMemberChange(idx, 'fullName', e.target.value)}
                      required
                      className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="NIM"
                      value={m.nim}
                      onChange={(e) => handleMemberChange(idx, 'nim', e.target.value)}
                      required
                      className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Kelas (01MJSP001)"
                      value={m.className}
                      onChange={(e) => handleMemberChange(idx, 'className', e.target.value.toUpperCase())}
                      required
                      className={`px-2.5 py-1.5 bg-white border rounded-lg font-mono uppercase font-bold ${
                        isClassValid(m.className) ? 'border-gray-300' : 'border-rose-400 text-rose-800'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={m.sizeCode}
                      onChange={(e) => handleMemberChange(idx, 'sizeCode', e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-bold"
                    >
                      {activeSizes.map((s) => (
                        <option key={s.size_id} value={s.size_code}>
                          Ukuran {s.size_code} {s.extra_fee > 0 ? `(+Rp ${s.extra_fee.toLocaleString('id-ID')})` : ''}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Nama Bordir Kustom"
                      value={m.customName}
                      onChange={(e) => handleMemberChange(idx, 'customName', e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block font-bold text-gray-700 uppercase mb-1 text-xs">Catatan Pesanan (Opsional)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan tambahan untuk panitia..."
            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs"
          />
        </div>

        {/* Submit Order Button */}
        <button
          type="submit"
          disabled={!activePO || !activePO.isOpen || submitting}
          className={`w-full py-3.5 text-white rounded-2xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md ${
            activePO && activePO.isOpen
              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Lanjutkan ke Konfirmasi Pesanan</span>
        </button>
      </form>

      {/* ORDER SUMMARY CONFIRMATION MODAL */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-gray-100 p-6 space-y-4">
            <h3 className="font-bold text-gray-900 text-base border-b border-gray-100 pb-2">
              Ringkasan Konfirmasi Pesanan PDH
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-xl">
                <div>
                  <span className="text-gray-400 block uppercase text-[10px]">Pemesan / Penanggung Jawab</span>
                  <span className="font-bold text-gray-900">{buyerName} ({buyerNim})</span>
                </div>
                <div>
                  <span className="text-gray-400 block uppercase text-[10px]">Kelas &amp; WhatsApp</span>
                  <span className="font-bold font-mono text-gray-900">{buyerClass} &bull; {buyerWhatsapp}</span>
                </div>
                <div>
                  <span className="text-gray-400 block uppercase text-[10px]">Jenis Pesanan</span>
                  <span className="font-bold text-emerald-700 uppercase">{orderType}</span>
                </div>
                <div>
                  <span className="text-gray-400 block uppercase text-[10px]">Total Item</span>
                  <span className="font-bold text-gray-900">
                    {orderType === 'PRIBADI' ? '1 Pcs' : `${collectiveMembers.length} Pcs`}
                  </span>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
                <span className="font-bold text-gray-700 uppercase text-[10px]">Rincian Item Baju</span>
                {orderType === 'PRIBADI' ? (
                  <div className="p-2.5 bg-gray-50 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-900">{buyerName}</div>
                      <div className="text-[10px] text-gray-500">Ukuran: {singleSize} &bull; Bordir: {singleCustomName || buyerName}</div>
                    </div>
                    <div className="font-bold font-mono text-emerald-700">Rp {calculateTotal().toLocaleString('id-ID')}</div>
                  </div>
                ) : (
                  collectiveMembers.map((m, idx) => {
                    const extra = activeSizes.find((s) => s.size_code.toUpperCase() === m.sizeCode.toUpperCase())?.extra_fee || 0;
                    const itemPrice = basePrice + extra;
                    return (
                      <div key={idx} className="p-2.5 bg-gray-50 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="font-bold text-gray-900">{m.fullName || `Anggota #${idx + 1}`} ({m.nim})</div>
                          <div className="text-[10px] text-gray-500">Kelas: {m.className} &bull; Ukuran: {m.sizeCode} &bull; Bordir: {m.customName || m.fullName}</div>
                        </div>
                        <div className="font-bold font-mono text-emerald-700">Rp {itemPrice.toLocaleString('id-ID')}</div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Total Summary Price */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-emerald-900 uppercase text-[10px] block">Total Yang Wajib Dibayar</span>
                  <span className="text-xl font-black font-mono text-emerald-800">Rp {calculateTotal().toLocaleString('id-ID')}</span>
                </div>
                <span className="text-xs bg-emerald-600 text-white font-bold px-3 py-1 rounded-lg">PENDING PAYMENT</span>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition cursor-pointer"
              >
                BATAL
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmOrder}
                className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-100"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
                <span>KONFIRMASI PESANAN</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVISI TAHAP 4: EXCEL IMPORT & VALIDATION PREVIEW MODAL */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-gray-900 text-base">Import Data Kolektif via Excel</h3>
              </div>
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Upload & Download Template Controls */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-gray-800 block">Pilih File Excel (.xls / .xlsx)</span>
                  <p className="text-[11px] text-gray-500">Gunakan template resmi sistem agar format sesuai.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>DOWNLOAD TEMPLATE</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xls,.xlsx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <Upload className="w-4 h-4" />
                    <span>PILIH FILE EXCEL</span>
                  </button>
                </div>
              </div>

              {importedFileName && (
                <div className="pt-2 border-t border-gray-200 flex items-center justify-between font-mono text-[11px] text-gray-700">
                  <span>File Terpilih: <strong>{importedFileName}</strong></span>
                  <span className="text-gray-500">{importValidationRows.length} baris terdeteksi</span>
                </div>
              )}
            </div>

            {/* Step 2: Validation Status Summary Banner */}
            {importValidationRows.length > 0 && (
              <div
                className={`p-3 rounded-xl border text-xs font-medium flex items-start gap-2 ${
                  importHasError
                    ? 'bg-rose-50 text-rose-900 border-rose-200'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                }`}
              >
                {importHasError ? (
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <FileCheck2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <div className="font-bold">
                    {importHasError
                      ? 'Validasi Import Gagal! Terdapat kesalahan data per-baris.'
                      : 'Validasi Import Berhasil! Seluruh data valid dan siap diimpor.'}
                  </div>
                  <div className="text-[11px] opacity-90">
                    {importHasError
                      ? 'Harap perbaiki file Excel kamu sesuai dengan daftar kesalahan di bawah ini sebelum melanjutkan.'
                      : `Total ${importValidationRows.length} data mahasiswa dapat langsung dimasukkan ke pesanan kolektif.`}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Per-Row Validation Preview Table */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 min-h-[180px]">
              {importValidationRows.length === 0 ? (
                <div className="h-44 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-gray-400 text-xs">
                  <FileSpreadsheet className="w-10 h-10 text-gray-300 mb-2" />
                  <p className="font-semibold text-gray-600">Belum Ada File Excel Terpilih</p>
                  <p className="text-[11px]">Klik "Pilih File Excel" untuk mengunggah file `.xls` / `.xlsx`</p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px] border-b border-gray-200">
                      <tr>
                        <th className="p-2 w-12 text-center">Baris</th>
                        <th className="p-2">Nama Mahasiswa</th>
                        <th className="p-2">NIM</th>
                        <th className="p-2">Kelas</th>
                        <th className="p-2">Ukuran</th>
                        <th className="p-2">Status Validasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {importValidationRows.map((r) => (
                        <tr
                          key={r.rowNum}
                          className={r.isValid ? 'bg-white hover:bg-emerald-50/30' : 'bg-rose-50/50 hover:bg-rose-50'}
                        >
                          <td className="p-2 font-mono text-center font-bold text-gray-500">#{r.rowNum}</td>
                          <td className="p-2 font-medium text-gray-900">{r.fullName || <span className="text-rose-500 font-italic">(Kosong)</span>}</td>
                          <td className="p-2 font-mono text-gray-800">{r.nim || <span className="text-rose-500 font-italic">(Kosong)</span>}</td>
                          <td className="p-2 font-mono font-bold text-gray-800">{r.className || <span className="text-rose-500 font-italic">(Kosong)</span>}</td>
                          <td className="p-2 font-bold text-emerald-700">{r.sizeCode || <span className="text-rose-500 font-italic">(Kosong)</span>}</td>
                          <td className="p-2">
                            {r.isValid ? (
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded text-[10px]">
                                <CheckCircle2 className="w-3 h-3" /> Valid
                              </span>
                            ) : (
                              <div className="space-y-0.5">
                                {r.errors.map((err, errIdx) => (
                                  <div key={errIdx} className="text-rose-700 text-[10px] font-semibold flex items-center gap-1">
                                    <span>❌</span> <span>{err}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 text-xs font-bold">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={importHasError || importValidationRows.length === 0}
                onClick={handleApplyImport}
                className={`px-5 py-2.5 rounded-xl text-white font-bold transition flex items-center gap-2 cursor-pointer ${
                  !importHasError && importValidationRows.length > 0
                    ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>TERAPKAN IMPORT ({importValidationRows.filter((r) => r.isValid).length} DATA)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS ORDER RESULT MODAL */}
      {successOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-bold text-gray-900">Pesanan Berhasil Dibuat!</h3>
            <p className="text-xs text-gray-600">
              Pesanan PDH anda telah berhasil dicatat secara resmi di sistem.
            </p>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-1">
              <span className="text-gray-500 uppercase text-[10px] font-bold">Nomor Pesanan Resmimu</span>
              <div className="text-2xl font-black font-mono text-emerald-800">{successOrder.order_number}</div>
              <div className="text-gray-700 font-medium pt-1">
                Total Tagihan: <strong className="font-mono text-emerald-800">Rp {successOrder.total_amount.toLocaleString('id-ID')}</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSuccessOrder(null);
                onOrderSuccess();
              }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-md"
            >
              Lihat Pesanan Saya
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

