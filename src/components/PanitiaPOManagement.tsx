import React, { useState, useEffect } from 'react';
import { User, POPeriod, POMode, POStatus } from '../types';
import { callGAS } from '../gas/gasBridge';
import {
  Calendar,
  Clock,
  Play,
  Square,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  RotateCcw,
  Sliders,
  History,
  Info,
  Layers
} from 'lucide-react';

interface PanitiaPOManagementProps {
  user: User;
  onRefreshAuditLogs?: () => void;
}

export const PanitiaPOManagement: React.FC<PanitiaPOManagementProps> = ({ user, onRefreshAuditLogs }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activePO, setActivePO] = useState<POPeriod | null>(null);
  const [historyPO, setHistoryPO] = useState<POPeriod[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; targetStatus: POStatus } | null>(null);

  // Form modal state for Create/Edit PO
  const [poFormOpen, setPoFormOpen] = useState(false);
  const [poForm, setPoForm] = useState<POPeriod>({
    period_id: '',
    name: '',
    start_date: new Date().toISOString().split('T')[0],
    start_time: '08:00',
    end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_time: '23:59',
    mode: 'MANUAL',
    status: 'OPEN',
    target_quota: 500,
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [activeRes, allRes] = await Promise.all([
        callGAS<POPeriod & { isOpen: boolean }>('getActivePOPeriod'),
        callGAS<POPeriod[]>('getAllPOPeriods')
      ]);

      if (activeRes.success && activeRes.data) {
        setActivePO(activeRes.data);
      }
      if (allRes.success && allRes.data) {
        setHistoryPO(allRes.data);
      }
    } catch (e: any) {
      showFeedback('error', 'Gagal memuat status PO.');
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleTogglePOStatus = async (targetStatus: POStatus) => {
    if (!activePO) return;
    setSaving(true);
    setConfirmModal(null);
    try {
      const res = await callGAS('togglePOStatus', user.userId, activePO.period_id, targetStatus);
      if (res.success) {
        showFeedback('success', `Status Pre-Order berhasil diubah menjadi ${targetStatus === 'OPEN' ? 'DIBUKA (🟢)' : 'DITUTUP (🔴)'}.`);
        loadData();
        if (onRefreshAuditLogs) onRefreshAuditLogs();
      } else {
        showFeedback('error', res.message || 'Gagal merubah status PO.');
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await callGAS('savePOPeriod', user.userId, poForm);
      if (res.success) {
        showFeedback('success', `Periode PO ${poForm.name} berhasil disimpan.`);
        setPoFormOpen(false);
        loadData();
        if (onRefreshAuditLogs) onRefreshAuditLogs();
      } else {
        showFeedback('error', res.message || 'Gagal menyimpan periode PO.');
      }
    } catch (err: any) {
      showFeedback('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !activePO) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" />
        <p className="text-xs text-gray-500 font-medium">Memuat Pengaturan Periode Pre-Order (PO)...</p>
      </div>
    );
  }

  const isPOOpen = activePO?.status === 'OPEN';

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
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

      {/* Active PO Control Banner */}
      {activePO && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  PERIODE PO AKTIF
                </span>
                {activePO.manual_override && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200">
                    MANUAL OVERRIDE AKTIF
                  </span>
                )}
              </div>
              <h3 className="text-lg font-black text-gray-900">{activePO.name}</h3>
              <p className="text-xs text-gray-500">Mode Sistem: <strong className="font-bold text-gray-800">{activePO.mode}</strong> &bull; Target: <strong className="font-bold text-gray-800">{activePO.target_quota ? `${activePO.target_quota} Pcs` : 'Tanpa Batas'}</strong></p>
            </div>

            {/* Status Control Toggle Buttons Requirement: "🟢 BUKA PO / 🔴 TUTUP PO" */}
            <div className="flex items-center gap-2">
              {isPOOpen ? (
                <button
                  type="button"
                  onClick={() => setConfirmModal({ open: true, targetStatus: 'CLOSED' })}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-rose-100"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>🔴 TUTUP PO</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmModal({ open: true, targetStatus: 'OPEN' })}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-100"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>🟢 BUKA PO</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setPoForm(activePO);
                  setPoFormOpen(true);
                }}
                className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
              >
                Edit Periode
              </button>
            </div>
          </div>

          {/* Details & Schedule Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
              <span className="font-bold text-gray-400 uppercase text-[10px]">Status Evaluasi Live</span>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${isPOOpen ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`}></span>
                <span className={`font-black text-sm ${isPOOpen ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {isPOOpen ? '🟢 PRE ORDER DIBUKA' : '🔴 PRE ORDER DITUTUP'}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
              <span className="font-bold text-gray-400 uppercase text-[10px]">Jadwal Otomatis (Asia/Jakarta)</span>
              <div className="font-semibold text-gray-800 font-mono">
                {activePO.start_date ? `${activePO.start_date} ${activePO.start_time}` : 'Tdk Diatur'} &rarr; {activePO.end_date ? `${activePO.end_date} ${activePO.end_time}` : 'Tdk Diatur'}
              </div>
            </div>

            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
              <span className="font-bold text-gray-400 uppercase text-[10px]">Target / Quota</span>
              <div className="font-bold text-gray-900 text-sm font-mono">
                {activePO.target_quota > 0 ? `${activePO.target_quota} Pcs` : 'Tidak Dibatasi'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" /> Riwayat Periode Pre-Order (PO)
            </h3>
            <p className="text-xs text-gray-500">Daftar seluruh periode PO yang pernah dibuat di sistem.</p>
          </div>
          <button
            onClick={() => {
              setPoForm({
                period_id: '',
                name: '',
                start_date: new Date().toISOString().split('T')[0],
                start_time: '08:00',
                end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                end_time: '23:59',
                mode: 'OTOMATIS',
                status: 'OPEN',
                target_quota: 500,
                notes: ''
              });
              setPoFormOpen(true);
            }}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Periode Baru</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-200 uppercase text-[10px] font-bold text-gray-700">
              <tr>
                <th className="px-4 py-3 w-10 text-center">#</th>
                <th className="px-4 py-3">Nama Periode PO</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Jadwal Mulai</th>
                <th className="px-4 py-3">Jadwal Selesai</th>
                <th className="px-4 py-3">Status Live</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {historyPO.map((p, idx) => (
                <tr key={p.period_id || idx} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-gray-400 text-center">{idx + 1}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-gray-600">{p.mode}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono">{p.start_date || '-'} {p.start_time || ''}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono">{p.end_date || '-'} {p.end_time || ''}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        (p as any).computed_status === 'OPEN' || p.status === 'OPEN'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {(p as any).computed_status === 'OPEN' || p.status === 'OPEN' ? 'OPEN 🟢' : 'CLOSED 🔴'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        setPoForm(p);
                        setPoFormOpen(true);
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

      {/* CONFIRMATION MODAL */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-4 text-center">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
              confirmModal.targetStatus === 'OPEN' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
            }`}>
              <AlertCircle className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-gray-900 text-base">Konfirmasi Akses Pre-Order</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Apakah anda yakin ingin merubah status Pre-Order menjadi <strong className="font-bold uppercase">{confirmModal.targetStatus}</strong>?
              {confirmModal.targetStatus === 'CLOSED' ? ' Mahasiswa tidak dapat membuat pesanan baru saat ditutup.' : ' Mahasiswa akan dapat membuat pesanan.'}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-bold">
              <button
                onClick={() => setConfirmModal(null)}
                className="py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={() => handleTogglePOStatus(confirmModal.targetStatus)}
                className={`py-2.5 text-white rounded-xl ${
                  confirmModal.targetStatus === 'OPEN' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT PO FORM MODAL */}
      {poFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSavePO}
            className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden border border-gray-100 p-6 space-y-4"
          >
            <h3 className="font-bold text-gray-900 text-sm">Formulir Periode Pre-Order (PO)</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase text-gray-700 mb-1">Nama Periode PO</label>
                <input
                  type="text"
                  value={poForm.name}
                  onChange={(e) => setPoForm({ ...poForm, name: e.target.value })}
                  required
                  placeholder="e.g. PO PDH Angkatan 2026 Gelombang 1"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-gray-700 mb-1">Mode Kontrol PO</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPoForm({ ...poForm, mode: 'MANUAL' })}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition cursor-pointer ${
                      poForm.mode === 'MANUAL'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    MANUAL
                  </button>
                  <button
                    type="button"
                    onClick={() => setPoForm({ ...poForm, mode: 'OTOMATIS' })}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition cursor-pointer ${
                      poForm.mode === 'OTOMATIS'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    OTOMATIS
                  </button>
                </div>
              </div>

              {/* Schedule Fields */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <span className="font-bold text-gray-700 uppercase text-[10px]">
                  Jadwal Otomatis (WIB / Asia/Jakarta) {poForm.mode === 'OTOMATIS' && <span className="text-rose-500">*Wajib</span>}
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-0.5">Tanggal Mulai</label>
                    <input
                      type="date"
                      value={poForm.start_date}
                      onChange={(e) => setPoForm({ ...poForm, start_date: e.target.value })}
                      required={poForm.mode === 'OTOMATIS'}
                      className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-0.5">Jam Mulai</label>
                    <input
                      type="time"
                      value={poForm.start_time}
                      onChange={(e) => setPoForm({ ...poForm, start_time: e.target.value })}
                      required={poForm.mode === 'OTOMATIS'}
                      className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-0.5">Tanggal Selesai</label>
                    <input
                      type="date"
                      value={poForm.end_date}
                      onChange={(e) => setPoForm({ ...poForm, end_date: e.target.value })}
                      required={poForm.mode === 'OTOMATIS'}
                      className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-0.5">Jam Selesai</label>
                    <input
                      type="time"
                      value={poForm.end_time}
                      onChange={(e) => setPoForm({ ...poForm, end_time: e.target.value })}
                      required={poForm.mode === 'OTOMATIS'}
                      className="w-full px-2 py-1.5 bg-white border border-gray-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-gray-700 mb-1">Target Quota Pesanan</label>
                <input
                  type="number"
                  value={poForm.target_quota}
                  onChange={(e) => setPoForm({ ...poForm, target_quota: parseFloat(e.target.value) || 0 })}
                  placeholder="500"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-gray-700 mb-1">Catatan / Ketentuan PO</label>
                <textarea
                  rows={2}
                  value={poForm.notes}
                  onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
                  placeholder="Catatan tambahan untuk panitia & mahasiswa"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPoFormOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold"
              >
                Simpan Periode PO
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
