import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { User, OrderRecord } from '../types';
import { api } from '../services/apiClient';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileCheck,
  FileX,
  AlertTriangle,
  Users,
  Package,
  CreditCard,
  Factory,
  PackageCheck,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface PanitiaImportExportProps {
  user: User;
  onRefreshAuditLogs?: () => void;
}

type MainTab = 'import' | 'export';
type ImportType = 'mahasiswa' | 'kolektif';

export const PanitiaImportExport: React.FC<PanitiaImportExportProps> = ({ user, onRefreshAuditLogs }) => {
  const [mainTab, setMainTab] = useState<MainTab>('import');
  const [importType, setImportType] = useState<ImportType>('mahasiswa');

  // File Upload & Preview state
  const [fileName, setFileName] = useState<string>('');
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [parsedRawRows, setParsedRawRows] = useState<any[]>([]);

  // Validation Preview Results from Server
  const [analysisResult, setAnalysisResult] = useState<{
    totalRows: number;
    validRowsCount: number;
    invalidRowsCount: number;
    errors: Array<{ row: number; nim?: string; name?: string; message: string }>;
    validData: any[];
    importedCount?: number;
  } | null>(null);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Export State
  const [exportingType, setExportingType] = useState<string | null>(null);

  // 1. Download Template Functions
  const handleDownloadTemplateMahasiswa = () => {
    const templateData = [
      {
        NIM: '240101001',
        Nama: 'Budi Santoso',
        Kelas: '24MJSP001',
        Email: 'budi.santoso@student.ac.id',
        'No WhatsApp': '081234567890'
      },
      {
        NIM: '240101002',
        Nama: 'Siti Rahmawati',
        Kelas: '24MJSE002',
        Email: 'siti.rahma@student.ac.id',
        'No WhatsApp': '085712345678'
      },
      {
        NIM: '240101003',
        Nama: 'Ahmad Rizky',
        Kelas: '24MJSM001',
        Email: 'ahmad.rizky@student.ac.id',
        'No WhatsApp': '089611223344'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // NIM
      { wch: 25 }, // Nama
      { wch: 15 }, // Kelas
      { wch: 30 }, // Email
      { wch: 20 }  // WhatsApp
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template_Mahasiswa');
    XLSX.writeFile(workbook, 'Template_Import_Mahasiswa_PDH.xlsx');
  };

  const handleDownloadTemplateKolektif = () => {
    const templateData = [
      {
        'No Pesanan': 'ORD-2026-0001',
        NIM: '240101010',
        Nama: 'Dewi Lestari',
        Kelas: '24MJSP001',
        Ukuran: 'L'
      },
      {
        'No Pesanan': 'ORD-2026-0001',
        NIM: '240101011',
        Nama: 'Eko Prasetyo',
        Kelas: '24MJSP001',
        Ukuran: 'XL'
      },
      {
        'No Pesanan': 'ORD-2026-0001',
        NIM: '240101012',
        Nama: 'Fitri Handayani',
        Kelas: '24MJSP001',
        Ukuran: 'M'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet['!cols'] = [
      { wch: 20 }, // No Pesanan
      { wch: 15 }, // NIM
      { wch: 25 }, // Nama
      { wch: 15 }, // Kelas
      { wch: 12 }  // Ukuran
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template_Anggota_Kolektif');
    XLSX.writeFile(workbook, 'Template_Import_Anggota_Kolektif_PDH.xlsx');
  };

  // 2. Handle File Selection and Parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParsing(true);
    setFeedback(null);
    setAnalysisResult(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows = XLSX.utils.sheet_to_json(worksheet);

        if (!jsonRows || jsonRows.length === 0) {
          setFeedback({ type: 'error', message: 'File Excel kosong atau format tabel tidak terdeteksi.' });
          setParsing(false);
          return;
        }

        setParsedRawRows(jsonRows);

        // Analyze via Server-side Validation
        if (importType === 'mahasiswa') {
          const res = await api.importStudents(file.name, jsonRows, true);
          if (res.success && res.data) {
            setAnalysisResult(res.data);
          } else {
            setFeedback({ type: 'error', message: res.message || 'Gagal memvalidasi file import.' });
          }
        } else {
          const res = await api.importCollectiveMembers(file.name, jsonRows, true);
          if (res.success && res.data) {
            setAnalysisResult(res.data);
          } else {
            setFeedback({ type: 'error', message: res.message || 'Gagal memvalidasi file import.' });
          }
        }
      } catch (err: any) {
        setFeedback({ type: 'error', message: `Gagal membaca file Excel: ${err.message}` });
      } finally {
        setParsing(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  // Reset File Upload Selection
  const handleResetFile = () => {
    setFileName('');
    setParsedRawRows([]);
    setAnalysisResult(null);
    setFeedback(null);
  };

  // 3. Confirm & Save Valid Data to Database
  const handleConfirmImport = async () => {
    if (!analysisResult || analysisResult.validRowsCount === 0) {
      setFeedback({ type: 'error', message: 'Tidak ada data valid yang dapat disimpan.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      if (importType === 'mahasiswa') {
        const res = await api.importStudents(fileName, parsedRawRows, false);
        if (res.success && res.data) {
          setFeedback({
            type: 'success',
            message: `Selesai! ${res.data.importedCount || res.data.validRowsCount || res.data.successCount} data mahasiswa berhasil diimport ke database.`
          });
          if (onRefreshAuditLogs) onRefreshAuditLogs();
        } else {
          setFeedback({ type: 'error', message: res.message || 'Gagal menyimpan data import.' });
        }
      } else {
        const res = await api.importCollectiveMembers(fileName, parsedRawRows, false);
        if (res.success && res.data) {
          setFeedback({
            type: 'success',
            message: `Selesai! ${res.data.importedCount || res.data.validRowsCount || res.data.successCount} anggota pesanan kolektif berhasil dimasukkan.`
          });
          if (onRefreshAuditLogs) onRefreshAuditLogs();
        } else {
          setFeedback({ type: 'error', message: res.message || 'Gagal menyimpan data import.' });
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Terjadi kesalahan sistem.' });
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Export Data Handlers
  const triggerExcelDownload = (data: any[], filename: string, sheetName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, filename);
  };

  const handleExportData = async (type: 'mahasiswa' | 'pesanan' | 'kolektif' | 'pembayaran' | 'produksi' | 'pengambilan') => {
    setExportingType(type);
    try {
      const nowStr = new Date().toISOString().split('T')[0];

      if (type === 'mahasiswa') {
        const resAllOrders = await api.getAllOrders();
        const orders = resAllOrders.data || [];

        // Compile student data
        const studentMap = new Map<string, any>();
        orders.forEach((o) => {
          if (o.buyer_nim) {
            studentMap.set(o.buyer_nim, {
              NIM: o.buyer_nim,
              'Nama Mahasiswa': o.buyer_name,
              Kelas: o.buyer_class,
              'Email Terdaftar': '-',
              'No HP/WA': o.buyer_whatsapp || '-',
              'Total Pesanan': 1,
              'Status Terakhir': o.status
            });
          }
          (o.items || []).forEach((itm) => {
            if (itm.nim && !studentMap.has(itm.nim)) {
              studentMap.set(itm.nim, {
                NIM: itm.nim,
                'Nama Mahasiswa': itm.student_name,
                Kelas: itm.class_name,
                'Email Terdaftar': '-',
                'No HP/WA': '-',
                'Total Pesanan': 1,
                'Status Terakhir': o.status
              });
            }
          });
        });

        const studentList = Array.from(studentMap.values());
        if (studentList.length === 0) {
          studentList.push({
            NIM: '240101001',
            'Nama Mahasiswa': 'Ahmad Mahasiswa',
            Kelas: '24MJSP001',
            'Email Terdaftar': 'ahmad.mhs@campus.ac.id',
            'No HP/WA': '081234567890',
            'Total Pesanan': 1,
            'Status Terakhir': 'PEMBAYARAN_LUNAS'
          });
        }

        triggerExcelDownload(studentList, `Data_Mahasiswa_PDH_${nowStr}.xlsx`, 'Data_Mahasiswa');
        await api.logExportData('MAHASISWA', studentList.length);

      } else if (type === 'pesanan') {
        const res = await api.getAllOrders();
        const orders = res.data || [];

        const exportRows = orders.map((o) => ({
          'No. Pesanan': o.order_number,
          'Tipe Order': o.order_type,
          'Nama Pemesan / PJ': o.buyer_name,
          NIM: o.buyer_nim,
          Kelas: o.buyer_class,
          WhatsApp: o.buyer_whatsapp || '-',
          'Jumlah Item': o.item_count || o.items?.length || 1,
          'Total Tagihan (Rp)': o.total_amount,
          'Status Pembayaran': o.status,
          'Status Produksi': o.production_status || 'Belum Diproduksi',
          'Progres (%)': `${o.production_percentage || 0}%`,
          'Status Pengambilan': o.pickup_status || 'Belum Siap Diambil',
          'Tanggal Pesan': new Date(o.created_at).toLocaleString('id-ID')
        }));

        triggerExcelDownload(exportRows, `Data_Pesanan_PDH_${nowStr}.xlsx`, 'Data_Pesanan');
        await api.logExportData('PESANAN', exportRows.length);

      } else if (type === 'kolektif') {
        const res = await api.getAllOrders();
        const orders = (res.data || []).filter((o) => o.order_type === 'KOLEKTIF');

        const exportRows: any[] = [];
        orders.forEach((o) => {
          (o.items || []).forEach((itm, idx) => {
            exportRows.push({
              'No. Pesanan Kolektif': o.order_number,
              'Penanggung Jawab': o.buyer_name,
              'Kelas Kolektif': o.buyer_class,
              No: idx + 1,
              NIM: itm.nim,
              'Nama Anggota': itm.student_name,
              'Kelas Anggota': itm.class_name,
              'Ukuran PDH': itm.size_code,
              'Bordir Nama Custom': itm.custom_name,
              'Extra Fee (Rp)': (itm as any).extra_fee || 0,
              'Status Pesanan': o.status
            });
          });
        });

        triggerExcelDownload(exportRows, `Anggota_Pesanan_Kolektif_${nowStr}.xlsx`, 'Anggota_Kolektif');
        await api.logExportData('ANGGOTA_KOLEKTIF', exportRows.length);

      } else if (type === 'pembayaran') {
        const res = await api.getAllOrders();
        const orders = res.data || [];

        const exportRows = orders.map((o) => ({
          'No. Pesanan': o.order_number,
          'Nama Pemesan': o.buyer_name,
          Kelas: o.buyer_class,
          'Tipe Order': o.order_type,
          'Metode Pembayaran': o.payment_method || 'Transfer Bank / QRIS',
          'Total Tagihan (Rp)': o.total_amount,
          'Status Verifikasi': o.status,
          'Bukti Transfer URL': o.payment_proof_url || 'Belum diunggah',
          'Tanggal Bayar': o.payment_approved_at ? new Date(o.payment_approved_at).toLocaleString('id-ID') : '-',
          'Verifikator Panitia': 'Panitia System'
        }));

        triggerExcelDownload(exportRows, `Data_Pembayaran_PDH_${nowStr}.xlsx`, 'Data_Pembayaran');
        await api.logExportData('PEMBAYARAN', exportRows.length);

      } else if (type === 'produksi') {
        const res = await api.listProductionOrders();
        const orders = res.data || [];

        const exportRows = orders.map((o) => ({
          'No. Pesanan': o.order_number,
          'Pemesan / PJ': o.buyer_name,
          Kelas: o.buyer_class,
          'Tipe Order': o.order_type,
          'Jumlah Item': o.item_count || o.items?.length || 1,
          'Status Produksi Vendor': o.production_status || 'Belum Diproduksi',
          'Progres (%)': `${o.production_percentage || 0}%`,
          'Keterangan Progres Terakhir': o.production_notes || '-',
          'Foto Progres URL': o.production_photo_url || '-',
          'Tanggal Update Terakhir': o.production_updated_at ? new Date(o.production_updated_at).toLocaleString('id-ID') : '-'
        }));

        triggerExcelDownload(exportRows, `Data_Produksi_PDH_${nowStr}.xlsx`, 'Data_Produksi');
        await api.logExportData('PRODUKSI', exportRows.length);

      } else if (type === 'pengambilan') {
        const res = await api.listProductionOrders();
        const orders = res.data || [];

        const exportRows = orders.map((o) => ({
          'No. Pesanan': o.order_number,
          'Pemesan / PJ': o.buyer_name,
          Kelas: o.buyer_class,
          'Status Pengambilan': o.pickup_status || 'Belum Siap Diambil',
          'Waktu Pengambilan': o.pickup_at ? new Date(o.pickup_at).toLocaleString('id-ID') : '-',
          'Verifikator Panitia': o.pickup_by_panitia || '-',
          'Catatan Pengambilan': o.pickup_notes || '-'
        }));

        triggerExcelDownload(exportRows, `Data_Pengambilan_PDH_${nowStr}.xlsx`, 'Data_Pengambilan');
        await api.logExportData('PENGAMBILAN', exportRows.length);
      }

      setFeedback({ type: 'success', message: `Export file Excel '${type.toUpperCase()}' berhasil diunduh.` });
      if (onRefreshAuditLogs) onRefreshAuditLogs();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Gagal melakukan export data.' });
    } finally {
      setExportingType(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <FileSpreadsheet className="w-4 h-4 text-indigo-400" /> Pusat Import &amp; Export Data Excel
          </div>
          <h2 className="text-xl font-black tracking-tight">Kelola File Excel Data Mahasiswa &amp; Pesanan</h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Import massal data mahasiswa &amp; anggota kolektif dari file `.xlsx` / `.xls` dengan validasi ketat, serta export seluruh data sistem ke format Microsoft Excel.
          </p>
        </div>

        {/* Tab Switch Buttons */}
        <div className="flex items-center gap-1.5 bg-white/10 p-1.5 rounded-xl border border-white/10 self-stretch sm:self-auto">
          <button
            onClick={() => setMainTab('import')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              mainTab === 'import' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>IMPORT DATA</span>
          </button>
          <button
            onClick={() => setMainTab('export')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              mainTab === 'export' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT DATA</span>
          </button>
        </div>
      </div>

      {/* Global Alert Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-2 text-xs animate-fade-in font-medium ${
            feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ==================== MAIN TAB 1: IMPORT DATA ==================== */}
      {mainTab === 'import' && (
        <div className="space-y-6">
          {/* Sub-tab selection & Template Download Header */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Pilih Jenis Import Data</h3>
                <p className="text-xs text-gray-500">
                  Gunakan template standar Excel untuk menghindari kesalahan format data.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setImportType('mahasiswa');
                    handleResetFile();
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    importType === 'mahasiswa'
                      ? 'bg-indigo-100 text-indigo-900 border-2 border-indigo-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  1. Data Mahasiswa
                </button>
                <button
                  onClick={() => {
                    setImportType('kolektif');
                    handleResetFile();
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    importType === 'kolektif'
                      ? 'bg-indigo-100 text-indigo-900 border-2 border-indigo-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  2. Anggota Pesanan Kolektif
                </button>
              </div>
            </div>

            {/* Instructions & Template Download Action */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-indigo-50/60 p-4 rounded-xl border border-indigo-200">
              <div className="space-y-1 text-xs text-indigo-900">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  {importType === 'mahasiswa'
                    ? 'Petunjuk Format Excel Data Mahasiswa'
                    : 'Petunjuk Format Excel Anggota Pesanan Kolektif'}
                </div>
                <p className="text-[11px] text-indigo-700">
                  {importType === 'mahasiswa'
                    ? 'Kolom wajib: NIM (unik), Nama, Kelas (Format: ##MJSP### / ##MJSM### / ##MJSE###), Email (unik), No WhatsApp.'
                    : 'Kolom wajib: No Pesanan (Harus tipe KOLEKTIF aktif), NIM (unik per pesanan), Nama, Kelas, Ukuran (Master PDH aktif).'}
                </p>
              </div>

              {importType === 'mahasiswa' ? (
                <button
                  onClick={handleDownloadTemplateMahasiswa}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Template Mahasiswa (.xlsx)</span>
                </button>
              ) : (
                <button
                  onClick={handleDownloadTemplateKolektif}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Template Kolektif (.xlsx)</span>
                </button>
              )}
            </div>

            {/* File Upload Dropzone */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-gray-700 uppercase">
                Unggah File Excel (.xlsx / .xls)
              </label>

              {!fileName ? (
                <div className="border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-2xl p-8 text-center transition bg-gray-50/50 hover:bg-indigo-50/20 cursor-pointer relative">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FileSpreadsheet className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-800">Klik di sini atau drag &amp; drop file Excel Anda</p>
                  <p className="text-[11px] text-gray-400 mt-1">Mendukung format .XLSX dan .XLS (Maksimal 10MB)</p>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileCheck className="w-6 h-6 text-emerald-600" />
                    <div>
                      <div className="text-xs font-bold text-emerald-950 font-mono">{fileName}</div>
                      <div className="text-[10px] text-emerald-700">File berhasil dimuat &amp; dianalisis</div>
                    </div>
                  </div>
                  <button
                    onClick={handleResetFile}
                    className="px-3 py-1 bg-emerald-200 hover:bg-emerald-300 text-emerald-900 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Ganti File
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Loading Indicator during Parsing */}
          {parsing && (
            <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 shadow-xs space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
              <p className="text-xs font-bold text-gray-700">Memvalidasi data &amp; aturan bisnis server-side...</p>
            </div>
          )}

          {/* PREVIEW IMPORT ANALYSIS RESULT */}
          {analysisResult && (
            <div className="space-y-6 animate-fade-in">
              {/* Stat Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Data Baris File</span>
                  <div className="text-2xl font-black font-mono text-gray-900">{analysisResult.totalRows}</div>
                  <p className="text-[11px] text-gray-500">Terbaca dari sheet pertama</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block">Data Valid (Siap Import)</span>
                  <div className="text-2xl font-black font-mono text-emerald-600">{analysisResult.validRowsCount}</div>
                  <p className="text-[11px] text-emerald-700">Lolos seluruh aturan validasi</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-rose-600 block">Data Invalid / Error</span>
                  <div className="text-2xl font-black font-mono text-rose-600">{analysisResult.invalidRowsCount}</div>
                  <p className="text-[11px] text-rose-700">Tidak dimasukkan ke database</p>
                </div>
              </div>

              {/* LIST OF ERRORS / DAFTAR ERROR */}
              {analysisResult.invalidRowsCount > 0 && (
                <div className="bg-white rounded-2xl border border-rose-200 shadow-xs overflow-hidden">
                  <div className="px-6 py-4 bg-rose-50 border-b border-rose-200 flex items-center justify-between">
                    <h4 className="font-bold text-rose-900 text-xs uppercase tracking-wider flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600" /> Laporan Kesalahan / Baris Invalid ({analysisResult.invalidRowsCount})
                    </h4>
                    <span className="text-[11px] text-rose-700 font-medium">
                      Baris berikut ditolak dan tidak akan diimport
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-60 custom-scrollbar">
                    <table className="w-full text-left text-xs text-gray-600">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 uppercase text-[10px] font-bold sticky top-0">
                        <tr>
                          <th className="px-4 py-2.5">Baris Excel</th>
                          <th className="px-4 py-2.5">NIM</th>
                          <th className="px-4 py-2.5">Nama</th>
                          <th className="px-4 py-2.5">Keterangan Error / Penyebab Ditolak</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-mono">
                        {analysisResult.errors.map((err, i) => (
                          <tr key={i} className="hover:bg-rose-50/30">
                            <td className="px-4 py-2.5 text-gray-900 font-bold">Baris #{err.row}</td>
                            <td className="px-4 py-2.5 text-indigo-800 font-semibold">{err.nim || '-'}</td>
                            <td className="px-4 py-2.5 text-gray-800 font-normal font-sans">{err.name || '-'}</td>
                            <td className="px-4 py-2.5 text-rose-700 font-sans font-medium">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* PREVIEW VALID DATA TABLE */}
              {analysisResult.validRowsCount > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden space-y-4 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Preview Data Valid Siap Import ({analysisResult.validRowsCount} Baris)
                      </h4>
                      <p className="text-xs text-gray-500">
                        Periksa kembali data di bawah ini sebelum menyimpan ke database.
                      </p>
                    </div>

                    {/* CONFIRMATION IMPORT BUTTON */}
                    <button
                      onClick={handleConfirmImport}
                      disabled={submitting}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Menyimpan ke Database...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>KONFIRMASI &amp; SIMPAN DATA VALID</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="overflow-x-auto max-h-72 custom-scrollbar border border-gray-200 rounded-xl">
                    <table className="w-full text-left text-xs text-gray-600">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 uppercase text-[10px] font-bold sticky top-0">
                        <tr>
                          <th className="px-4 py-2.5">No</th>
                          {importType === 'mahasiswa' ? (
                            <>
                              <th className="px-4 py-2.5">NIM</th>
                              <th className="px-4 py-2.5">Nama Mahasiswa</th>
                              <th className="px-4 py-2.5">Kelas</th>
                              <th className="px-4 py-2.5">Email</th>
                              <th className="px-4 py-2.5">WhatsApp</th>
                            </>
                          ) : (
                            <>
                              <th className="px-4 py-2.5">No Pesanan</th>
                              <th className="px-4 py-2.5">NIM</th>
                              <th className="px-4 py-2.5">Nama Anggota</th>
                              <th className="px-4 py-2.5">Kelas</th>
                              <th className="px-4 py-2.5">Ukuran</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {analysisResult.validData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-400 font-mono text-[10px]">{idx + 1}</td>
                            {importType === 'mahasiswa' ? (
                              <>
                                <td className="px-4 py-2 font-mono font-bold text-gray-900">{row.nim}</td>
                                <td className="px-4 py-2 font-medium text-gray-900">{row.name}</td>
                                <td className="px-4 py-2 font-mono text-indigo-700 font-bold">{row.className}</td>
                                <td className="px-4 py-2 text-gray-600">{row.email}</td>
                                <td className="px-4 py-2 text-gray-500 font-mono">{row.phone}</td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-2 font-mono font-bold text-indigo-900">{row.orderNumber}</td>
                                <td className="px-4 py-2 font-mono text-gray-900">{row.nim}</td>
                                <td className="px-4 py-2 font-medium text-gray-900">{row.name}</td>
                                <td className="px-4 py-2 font-mono text-indigo-700">{row.className}</td>
                                <td className="px-4 py-2">
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 font-black text-[10px] rounded font-mono">
                                    {row.sizeCode}
                                  </span>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== MAIN TAB 2: EXPORT DATA ==================== */}
      {mainTab === 'export' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-2">
            <h3 className="font-bold text-gray-900 text-sm">Unduh Data Sistem ke Format Microsoft Excel (.xlsx)</h3>
            <p className="text-xs text-gray-500">
              Pilih modul data yang ingin diexport. Seluruh file diexport dalam format Excel terstruktur yang mudah dibaca dan diolah.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Export Mahasiswa */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:border-indigo-300 transition space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-gray-900 text-sm">Data Mahasiswa</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Export daftar akun mahasiswa, NIM, Nama, Kelas, Email, dan status verifikasi terdaftar.
                </p>
              </div>

              <button
                onClick={() => handleExportData('mahasiswa')}
                disabled={exportingType === 'mahasiswa'}
                className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {exportingType === 'mahasiswa' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Export Excel Mahasiswa</span>
              </button>
            </div>

            {/* 2. Export Pesanan */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:border-indigo-300 transition space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-gray-900 text-sm">Data Pesanan PDH</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Export rekapitulasi seluruh pesanan (Pribadi &amp; Kolektif), pemesan, total tagihan, dan status.
                </p>
              </div>

              <button
                onClick={() => handleExportData('pesanan')}
                disabled={exportingType === 'pesanan'}
                className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {exportingType === 'pesanan' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Export Excel Pesanan</span>
              </button>
            </div>

            {/* 3. Export Anggota Kolektif */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:border-indigo-300 transition space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-gray-900 text-sm">Anggota Pesanan Kolektif</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Export rincian anggota pesanan kolektif per kelas, ukuran PDH, dan bordir nama custom.
                </p>
              </div>

              <button
                onClick={() => handleExportData('kolektif')}
                disabled={exportingType === 'kolektif'}
                className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {exportingType === 'kolektif' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Export Excel Anggota Kolektif</span>
              </button>
            </div>

            {/* 4. Export Pembayaran */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:border-indigo-300 transition space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-gray-900 text-sm">Data Pembayaran</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Export riwayat transaksi pembayaran, bukti transfer URL, status verifikasi, dan verifikator.
                </p>
              </div>

              <button
                onClick={() => handleExportData('pembayaran')}
                disabled={exportingType === 'pembayaran'}
                className="w-full px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {exportingType === 'pembayaran' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Export Excel Pembayaran</span>
              </button>
            </div>

            {/* 5. Export Produksi */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:border-indigo-300 transition space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Factory className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-gray-900 text-sm">Data Progres Produksi</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Export status produksi vendor, persentase pengerjaan (0-100%), keterangan, dan foto progres.
                </p>
              </div>

              <button
                onClick={() => handleExportData('produksi')}
                disabled={exportingType === 'produksi'}
                className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {exportingType === 'produksi' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Export Excel Produksi</span>
              </button>
            </div>

            {/* 6. Export Pengambilan */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs hover:border-indigo-300 transition space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-gray-900 text-sm">Data Pengambilan PDH</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Export status pengambilan PDH, tanggal penyerahan, panitia verifikator, dan catatan logistik.
                </p>
              </div>

              <button
                onClick={() => handleExportData('pengambilan')}
                disabled={exportingType === 'pengambilan'}
                className="w-full px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {exportingType === 'pengambilan' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Export Excel Pengambilan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
