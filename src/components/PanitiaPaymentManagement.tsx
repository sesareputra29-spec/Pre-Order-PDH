import React, { useState, useEffect } from 'react';
import { User, OrderRecord } from '../types';
import { api } from '../services/apiClient';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  FileText,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Building,
  DollarSign
} from 'lucide-react';

interface PanitiaPaymentManagementProps {
  user: User;
}

export const PanitiaPaymentManagement: React.FC<PanitiaPaymentManagementProps> = ({ user }) => {
  const [payments, setPayments] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Action modals
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [detailModalPayment, setDetailModalPayment] = useState<OrderRecord | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedApproveOrderId, setSelectedApproveOrderId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadPayments();
  }, [user.userId]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = await api.listPayments();
      if (res.success && res.data) {
        setPayments(res.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenApproveModal = (orderId: string) => {
    setSelectedApproveOrderId(orderId);
    setApproveModalOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!selectedApproveOrderId) return;

    setSubmitting(true);
    setToast(null);

    try {
      const res = await api.approvePayment(selectedApproveOrderId);
      if (res.success) {
        setToast({ type: 'success', message: 'Pembayaran berhasil disetujui.' });
        setApproveModalOpen(false);
        setSelectedApproveOrderId(null);
        await loadPayments();
      } else {
        setToast({ type: 'error', message: res.message || 'Gagal menyetujui pembayaran.' });
      }
    } catch (e: any) {
      setToast({ type: 'error', message: e.message || 'Terjadi kesalahan jaringan/sistem.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenRejectModal = (orderId: string) => {
    setSelectedOrderId(orderId);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedOrderId) return;
    if (!rejectionReason.trim()) {
      setToast({ type: 'error', message: 'Alasan penolakan wajib diisi oleh Panitia.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.rejectPayment(selectedOrderId, rejectionReason);
      if (res.success) {
        setToast({ type: 'success', message: 'Pembayaran telah ditolak dan catatan alasan telah disimpan.' });
        setRejectModalOpen(false);
        setSelectedOrderId(null);
        setRejectionReason('');
        loadPayments();
      } else {
        setToast({ type: 'error', message: res.message || 'Gagal menolak pembayaran.' });
      }
    } catch (e: any) {
      setToast({ type: 'error', message: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPayments = payments.filter((item) => {
    const matchesSearch =
      item.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.buyer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.buyer_nim.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.buyer_class.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'ALL') return matchesSearch;
    if (statusFilter === 'MENUNGGU APPROVAL') {
      return matchesSearch && (item.payment_status === 'MENUNGGU APPROVAL' || item.payment_status === 'PENDING');
    }
    if (statusFilter === 'LUNAS') {
      return matchesSearch && (item.payment_status === 'LUNAS' || item.payment_status === 'PAID');
    }
    if (statusFilter === 'DITOLAK') {
      return matchesSearch && (item.payment_status === 'DITOLAK' || item.payment_status === 'REJECTED');
    }
    if (statusFilter === 'BELUM_BAYAR') {
      return matchesSearch && (item.payment_status === 'BELUM_BAYAR' || item.payment_status === 'UNPAID');
    }

    return matchesSearch;
  });

  const pendingCount = payments.filter((p) => p.payment_status === 'MENUNGGU APPROVAL' || p.payment_status === 'PENDING').length;
  const lunasCount = payments.filter((p) => p.payment_status === 'LUNAS' || p.payment_status === 'PAID').length;
  const rejectedCount = payments.filter((p) => p.payment_status === 'DITOLAK' || p.payment_status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 animate-fade-in ${
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

      {/* Summary Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-gray-500 text-[11px] font-bold uppercase block">Total Transaksi</span>
          <div className="text-2xl font-black text-gray-900">{payments.length}</div>
          <p className="text-[10px] text-gray-400">Seluruh pesanan terdaftar</p>
        </div>

        <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 shadow-xs space-y-1">
          <span className="text-amber-700 text-[11px] font-bold uppercase block">Menunggu Approval</span>
          <div className="text-2xl font-black text-amber-900">{pendingCount}</div>
          <p className="text-[10px] text-amber-600 font-medium">Membutuhkan verifikasi Panitia</p>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 shadow-xs space-y-1">
          <span className="text-emerald-700 text-[11px] font-bold uppercase block">Lunas / Disetujui</span>
          <div className="text-2xl font-black text-emerald-900">{lunasCount}</div>
          <p className="text-[10px] text-emerald-600 font-medium">Pembayaran telah terverifikasi</p>
        </div>

        <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200 shadow-xs space-y-1">
          <span className="text-rose-700 text-[11px] font-bold uppercase block">Ditolak</span>
          <div className="text-2xl font-black text-rose-900">{rejectedCount}</div>
          <p className="text-[10px] text-rose-600 font-medium">Membutuhkan upload ulang</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-600" /> Pengelolaan Verifikasi Pembayaran Pesanan
            </h3>
            <p className="text-xs text-gray-500">Periksa dan verifikasi bukti transfer / kwitansi tunai mahasiswa.</p>
          </div>

          <button
            type="button"
            onClick={loadPayments}
            disabled={loading}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
            <span>Refresh Data</span>
          </button>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari No Pesanan, Nama, NIM, atau Kelas..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Status Payment</option>
              <option value="MENUNGGU APPROVAL">🟡 Menunggu Approval</option>
              <option value="LUNAS">🟢 Lunas / Disetujui</option>
              <option value="DITOLAK">🔴 Ditolak</option>
              <option value="BELUM_BAYAR">⚪ Belum Bayar</option>
            </select>
          </div>
        </div>

        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
              <tr>
                <th className="p-3">No. Pesanan</th>
                <th className="p-3">Pemesan</th>
                <th className="p-3">NIM</th>
                <th className="p-3">Jenis Pesanan</th>
                <th className="p-3 font-mono">Total Tagihan</th>
                <th className="p-3">Metode</th>
                <th className="p-3 text-center">Status Pembayaran</th>
                <th className="p-3">Tanggal Upload</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400">
                    <p className="font-semibold">Tidak Ada Data Pembayaran Ditemukan</p>
                    <p className="text-[11px]">Belum ada transaksi pembayaran sesuai kriteria pencarian.</p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((item) => {
                  const isPending = item.payment_status === 'MENUNGGU APPROVAL' || item.payment_status === 'PENDING';
                  const isLunas = item.payment_status === 'LUNAS' || item.payment_status === 'PAID';
                  const isDitolak = item.payment_status === 'DITOLAK' || item.payment_status === 'REJECTED';
                  const hasProof = Boolean(item.payment_proof_url || item.payment_proof_file_id);

                  return (
                    <tr key={item.order_id} className="hover:bg-gray-50/80 transition">
                      <td className="p-3 font-mono font-bold text-gray-900">
                        <button
                          type="button"
                          onClick={() => setDetailModalPayment(item)}
                          className="hover:underline text-indigo-700 cursor-pointer text-left"
                          title="Lihat Detail Pembayaran"
                        >
                          {item.order_number}
                        </button>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-gray-900">{item.buyer_name}</div>
                        <div className="text-[10px] text-indigo-700 font-mono font-semibold">Kelas: {item.buyer_class}</div>
                      </td>

                      <td className="p-3 font-mono font-bold text-gray-800">
                        {item.buyer_nim}
                      </td>

                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.order_type === 'PRIBADI' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                        }`}>
                          {item.order_type}
                        </span>
                      </td>

                      <td className="p-3 font-mono font-bold text-gray-900">
                        Rp {item.total_amount.toLocaleString('id-ID')}
                      </td>

                      <td className="p-3">
                        <span className="font-bold font-mono text-gray-700 uppercase">
                          {item.payment_method || 'TRANSFER'}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        {isLunas && (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full inline-flex items-center gap-1 mx-auto">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>LUNAS</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full inline-flex items-center gap-1 mx-auto animate-pulse">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>MENUNGGU APPROVAL</span>
                          </span>
                        )}
                        {isDitolak && (
                          <div className="space-y-0.5 inline-block text-center">
                            <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-bold text-[10px] rounded-full inline-flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>DITOLAK</span>
                            </span>
                            {item.payment_rejection_reason && (
                              <p className="text-[10px] text-rose-600 font-medium max-w-[130px] truncate mx-auto" title={item.payment_rejection_reason}>
                                {item.payment_rejection_reason}
                              </p>
                            )}
                          </div>
                        )}
                        {!isLunas && !isPending && !isDitolak && (
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 font-bold text-[10px] rounded-full inline-block">
                            BELUM BAYAR
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-[11px] text-gray-500 font-mono">
                        {item.payment_uploaded_at ? new Date(item.payment_uploaded_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Proof button for all uploaded proofs */}
                          {hasProof && (
                            <button
                              type="button"
                              onClick={() => setSelectedProofUrl(item.payment_proof_url || `https://drive.google.com/file/d/${item.payment_proof_file_id}/view`)}
                              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                              title="Lihat Bukti Transfer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Bukti</span>
                            </button>
                          )}

                          {/* Approval actions shown when payment is PENDING APPROVAL */}
                          {isPending && (
                            <>
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() => handleOpenApproveModal(item.order_id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] transition flex items-center gap-1 cursor-pointer shadow-xs"
                                title="Setujui Pembayaran"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>SETUJUI</span>
                              </button>

                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() => handleOpenRejectModal(item.order_id)}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-[11px] transition flex items-center gap-1 cursor-pointer shadow-xs"
                                title="Tolak Pembayaran"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>TOLAK</span>
                              </button>
                            </>
                          )}

                          {/* Detail View Shortcut */}
                          <button
                            type="button"
                            onClick={() => setDetailModalPayment(item)}
                            className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition cursor-pointer"
                            title="Detail Transaksi"
                          >
                            <FileText className="w-3.5 h-3.5" />
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

        {/* MOBILE CARD LIST VIEW */}
        <div className="block md:hidden space-y-3">
          {filteredPayments.length === 0 ? (
            <div className="p-6 text-center text-gray-400 bg-gray-50 rounded-xl border border-gray-200">
              <p className="font-semibold text-xs">Tidak Ada Data Pembayaran Ditemukan</p>
            </div>
          ) : (
            filteredPayments.map((item) => {
              const isPending = item.payment_status === 'MENUNGGU APPROVAL' || item.payment_status === 'PENDING';
              const isLunas = item.payment_status === 'LUNAS' || item.payment_status === 'PAID';
              const isDitolak = item.payment_status === 'DITOLAK' || item.payment_status === 'REJECTED';
              const hasProof = Boolean(item.payment_proof_url || item.payment_proof_file_id);

              return (
                <div key={item.order_id} className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3 text-xs">
                  <div className="flex items-start justify-between gap-2 border-b border-gray-200 pb-2">
                    <div>
                      <span className="font-mono font-bold text-gray-900 text-xs block">{item.order_number}</span>
                      <span className="font-bold text-gray-800 text-xs">{item.buyer_name} ({item.buyer_nim})</span>
                      <span className="text-[10px] text-gray-500 block">Kelas: {item.buyer_class}</span>
                    </div>

                    {isLunas && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">
                        LUNAS
                      </span>
                    )}
                    {isPending && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full animate-pulse">
                        MENUNGGU APPROVAL
                      </span>
                    )}
                    {isDitolak && (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold text-[10px] rounded-full">
                        DITOLAK
                      </span>
                    )}
                    {!isLunas && !isPending && !isDitolak && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 font-bold text-[10px] rounded-full">
                        BELUM BAYAR
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-gray-400 font-bold uppercase text-[9px] block">Total Tagihan</span>
                      <span className="font-mono font-bold text-gray-900 text-xs">
                        Rp {item.total_amount.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-400 font-bold uppercase text-[9px] block">Metode Pembayaran</span>
                      <span className="font-mono font-bold text-gray-700 uppercase">
                        {item.payment_method || 'TRANSFER'}
                      </span>
                    </div>
                  </div>

                  {isDitolak && item.payment_rejection_reason && (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px]">
                      <strong>Alasan Penolakan:</strong> {item.payment_rejection_reason}
                    </div>
                  )}

                  {/* Actions for Mobile */}
                  <div className="pt-2 border-t border-gray-200 flex flex-wrap items-center justify-end gap-1.5">
                    {hasProof && (
                      <button
                        type="button"
                        onClick={() => setSelectedProofUrl(item.payment_proof_url || `https://drive.google.com/file/d/${item.payment_proof_file_id}/view`)}
                        className="px-2.5 py-1.5 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-xs transition flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat Bukti</span>
                      </button>
                    )}

                    {isPending && (
                      <>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleOpenApproveModal(item.order_id)}
                          className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-lg text-xs transition flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>SETUJUI</span>
                        </button>

                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleOpenRejectModal(item.order_id)}
                          className="px-3 py-1.5 bg-rose-600 text-white font-bold rounded-lg text-xs transition flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>TOLAK</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => setDetailModalPayment(item)}
                      className="px-2.5 py-1.5 bg-gray-100 text-gray-700 font-bold rounded-lg text-xs cursor-pointer"
                    >
                      <span>Detail</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* PROOF PREVIEW MODAL */}
      {selectedProofUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" /> Bukti Pembayaran Mahasiswa
              </h3>
              <button
                type="button"
                onClick={() => setSelectedProofUrl(null)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-center min-h-[220px]">
              {selectedProofUrl.startsWith('data:image') || selectedProofUrl.includes('unsplash') || selectedProofUrl.endsWith('.jpg') || selectedProofUrl.endsWith('.png') ? (
                <img
                  src={selectedProofUrl}
                  alt="Bukti Transfer"
                  className="max-h-[350px] rounded-lg object-contain border border-gray-200 shadow-xs"
                />
              ) : selectedProofUrl.startsWith('data:application/pdf') ? (
                <div className="text-center p-6 space-y-2">
                  <FileText className="w-12 h-12 text-rose-500 mx-auto" />
                  <p className="font-bold text-gray-800 text-xs">Dokumen Bukti PDF</p>
                  <a
                    href={selectedProofUrl}
                    download="bukti_pembayaran.pdf"
                    className="inline-block px-4 py-2 bg-rose-600 text-white font-bold rounded-xl text-xs"
                  >
                    Download File PDF
                  </a>
                </div>
              ) : (
                <div className="text-center p-6 space-y-3">
                  <ExternalLink className="w-10 h-10 text-indigo-600 mx-auto" />
                  <p className="font-bold text-gray-800 text-xs">File Tersimpan di Google Drive</p>
                  <a
                    href={selectedProofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs"
                  >
                    <span>Buka File di Google Drive</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedProofUrl(null)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MANDATORY MODAL */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-fade-in">
            <h3 className="font-bold text-gray-900 text-base border-b border-gray-100 pb-2">
              Penolakan Pembayaran Mahasiswa
            </h3>

            <p className="text-xs text-gray-600">
              Panitia wajib memberikan alasan penolakan yang jelas agar mahasiswa dapat memperbaiki atau mengunggah ulang bukti pembayaran.
            </p>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase text-gray-700">
                Alasan Penolakan <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Contoh: Nominal transfer kurang, foto bukti buram/tidak terbaca, atau nomor rekening tujuan salah."
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl cursor-pointer"
              >
                BATAL
              </button>
              <button
                type="button"
                disabled={submitting || !rejectionReason.trim()}
                onClick={handleConfirmReject}
                className={`py-2.5 rounded-xl text-white transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  rejectionReason.trim() ? 'bg-rose-600 hover:bg-rose-700 shadow-md' : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                <span>KONFIRMASI TOLAK</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPROVAL CONFIRMATION MODAL */}
      {approveModalOpen && selectedApproveOrderId && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-fade-in border border-gray-200">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="p-2.5 bg-emerald-50 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Konfirmasi Approval Pembayaran</h3>
                <p className="text-xs text-gray-500">Verifikasi status LUNAS untuk pesanan ini</p>
              </div>
            </div>

            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs font-semibold text-emerald-900">
              Setujui pembayaran pesanan ini?
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Setelah disetujui, status pembayaran pesanan akan diubah menjadi <strong className="text-emerald-700">LUNAS</strong>, notifikasi akan dikirim ke mahasiswa, dan pesanan siap diproses ke tahap produksi vendor.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-bold">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setApproveModalOpen(false);
                  setSelectedApproveOrderId(null);
                }}
                className="py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl cursor-pointer transition"
              >
                BATAL
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmApprove}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>YA, SETUJUI PEMBAYARAN</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* DETAIL PAYMENT MODAL */}
      {detailModalPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 animate-fade-in border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Detail Transaksi Pembayaran</h3>
                <p className="text-xs text-gray-500 font-mono">No Pesanan: {detailModalPayment.order_number}</p>
              </div>

              <button
                type="button"
                onClick={() => setDetailModalPayment(null)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Informasi Pemesan</span>
                <div className="font-bold text-gray-900 text-sm">{detailModalPayment.buyer_name}</div>
                <div className="font-mono text-gray-700">NIM: {detailModalPayment.buyer_nim}</div>
                <div className="font-mono text-indigo-700 font-bold">Kelas: {detailModalPayment.buyer_class}</div>
                <div className="text-gray-600">WhatsApp: {detailModalPayment.buyer_whatsapp || '-'}</div>
              </div>

              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Rincian Pembayaran</span>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Tagihan:</span>
                  <span className="font-mono font-bold text-emerald-800 text-sm">
                    Rp {detailModalPayment.total_amount.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Jenis Pesanan:</span>
                  <span className="font-bold uppercase text-indigo-700">{detailModalPayment.order_type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Metode Pembayaran:</span>
                  <span className="font-mono font-bold uppercase">{detailModalPayment.payment_method || 'TRANSFER'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status Pembayaran:</span>
                  <span className={`font-bold ${
                    detailModalPayment.payment_status === 'LUNAS' || detailModalPayment.payment_status === 'PAID'
                      ? 'text-emerald-700'
                      : detailModalPayment.payment_status === 'MENUNGGU APPROVAL'
                      ? 'text-amber-700'
                      : detailModalPayment.payment_status === 'DITOLAK'
                      ? 'text-rose-700'
                      : 'text-gray-600'
                  }`}>
                    {detailModalPayment.payment_status}
                  </span>
                </div>
                {detailModalPayment.payment_uploaded_at && (
                  <div className="flex items-center justify-between pt-1 border-t border-gray-200 text-[10px] text-gray-400">
                    <span>Waktu Upload Bukti:</span>
                    <span className="font-mono">{new Date(detailModalPayment.payment_uploaded_at).toLocaleString('id-ID')}</span>
                  </div>
                )}
              </div>

              {detailModalPayment.payment_rejection_reason && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1 text-rose-900">
                  <span className="font-bold uppercase text-[10px] block">Catatan Penolakan Panitia:</span>
                  <p>{detailModalPayment.payment_rejection_reason}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              {(detailModalPayment.payment_proof_url || detailModalPayment.payment_proof_file_id) ? (
                <button
                  type="button"
                  onClick={() => {
                    const url = detailModalPayment.payment_proof_url || `https://drive.google.com/file/d/${detailModalPayment.payment_proof_file_id}/view`;
                    setDetailModalPayment(null);
                    setSelectedProofUrl(url);
                  }}
                  className="px-3.5 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Lihat File Bukti</span>
                </button>
              ) : (
                <span className="text-xs text-gray-400 italic">Belum ada bukti diunggah</span>
              )}

              <button
                type="button"
                onClick={() => setDetailModalPayment(null)}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
