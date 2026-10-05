// Payment & Payment Proofs Routes Controller
import { Router, Request, Response } from 'express';
import { requireTenant, authenticate, requireRole, sendApiError } from '../middlewares/authMiddleware.ts';
import { PaymentService, PaymentStatus } from '../services/paymentService.ts';

export const paymentRouter = Router();

// Apply Tenant Resolution and Authentication to all Payment routes
paymentRouter.use(requireTenant);
paymentRouter.use(authenticate);

// ==========================================
// 1. PAYMENT LIST & DETAILS
// ==========================================

/**
 * GET /api/payments - List payments (PANITIA gets full tenant list, MAHASISWA gets own payments)
 */
paymentRouter.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const user = req.user!;
    const { status, order_id, student_id, search, page, limit } = req.query;

    const filterOptions: any = {
      status: status as string,
      order_id: order_id as string,
      search: search as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50
    };

    if (user.role === 'PANITIA') {
      if (student_id) filterOptions.student_id = student_id as string;
    } else {
      // MAHASISWA is locked to own NIM / ID
      filterOptions.student_id = user.nim || user.user_id || user.username;
    }

    const result = await PaymentService.listPayments(tenantId, filterOptions);

    res.json({
      success: true,
      data: result.payments,
      pagination: result.pagination
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil daftar pembayaran.');
  }
});

/**
 * GET /api/payments/:id - Get payment details
 */
paymentRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const paymentId = req.params.id;
    const user = req.user!;

    const payment = await PaymentService.getPaymentById(tenantId, paymentId);
    if (!payment) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Data pembayaran tidak ditemukan.');
    }

    // RBAC: Mahasiswa can only view own payment
    if (user.role !== 'PANITIA' && user.nim && payment.payer_nim.toLowerCase() !== user.nim.toLowerCase()) {
      return sendApiError(res, 403, 'FORBIDDEN', 'Akses ditolak: Anda hanya dapat melihat pembayaran milik Anda sendiri.');
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil data pembayaran.');
  }
});

/**
 * POST /api/payments - Create new payment submission
 */
paymentRouter.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const user = req.user!;
    const { order_id, jumlah, metode, payer_name, payer_nim, catatan, idempotency_key } = req.body;
    const idempotencyHeader = req.headers['idempotency-key'] as string | undefined;

    if (!order_id || !jumlah) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Field order_id dan jumlah wajib disertakan.');
    }

    const newPayment = await PaymentService.createPayment(
      tenantId,
      {
        order_id,
        jumlah: Number(jumlah),
        metode: metode || 'Transfer Bank',
        payer_name: payer_name || user.name,
        payer_nim: payer_nim || user.nim || user.username,
        catatan,
        idempotency_key: idempotency_key || idempotencyHeader
      },
      user.user_id
    );

    res.status(201).json({
      success: true,
      message: 'Pembayaran berhasil diajukan.',
      data: newPayment
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'CREATE_PAYMENT_FAILED', err.message || 'Gagal membuat pembayaran.');
  }
});

/**
 * PUT /api/payments/:id - Update payment details
 */
paymentRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const paymentId = req.params.id;
    const user = req.user!;

    const payment = await PaymentService.getPaymentById(tenantId, paymentId);
    if (!payment) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Pembayaran tidak ditemukan.');
    }

    if (user.role !== 'PANITIA' && user.nim && payment.payer_nim.toLowerCase() !== user.nim.toLowerCase()) {
      return sendApiError(res, 403, 'FORBIDDEN', 'Akses ditolak.');
    }

    const updated = await PaymentService.updatePayment(tenantId, paymentId, req.body, user.user_id);

    res.json({
      success: true,
      message: 'Data pembayaran berhasil diperbarui.',
      data: updated
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'UPDATE_PAYMENT_FAILED', err.message || 'Gagal memperbarui pembayaran.');
  }
});

// ==========================================
// 2. APPROVAL & REJECTION (PANITIA ONLY)
// ==========================================

/**
 * POST /api/payments/:id/approve - Approve payment
 */
paymentRouter.post('/:id/approve', requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const paymentId = req.params.id;
    const { notes } = req.body;

    const approved = await PaymentService.approvePayment(tenantId, paymentId, req.user!.user_id, notes);

    res.json({
      success: true,
      message: 'Pembayaran berhasil disetujui (DISETUJUI).',
      data: approved
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'APPROVE_PAYMENT_FAILED', err.message || 'Gagal menyetujui pembayaran.');
  }
});

/**
 * POST /api/payments/:id/reject - Reject payment
 */
paymentRouter.post('/:id/reject', requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const paymentId = req.params.id;
    const { reason, catatan } = req.body;
    const rejectReason = reason || catatan;

    if (!rejectReason) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Alasan penolakan (reason) wajib diisi.');
    }

    const rejected = await PaymentService.rejectPayment(tenantId, paymentId, req.user!.user_id, rejectReason);

    res.json({
      success: true,
      message: 'Pembayaran berhasil ditolak (DITOLAK).',
      data: rejected
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'REJECT_PAYMENT_FAILED', err.message || 'Gagal menolak pembayaran.');
  }
});

/**
 * PUT /api/payments/:id/status - Update payment status manually (PANITIA only)
 */
paymentRouter.put('/:id/status', requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const paymentId = req.params.id;
    const { status, reason, notes } = req.body;

    if (!status) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Field status wajib disertakan.');
    }

    if (status === 'DISETUJUI') {
      const approved = await PaymentService.approvePayment(tenantId, paymentId, req.user!.user_id, notes);
      return res.json({ success: true, message: 'Pembayaran disetujui.', data: approved });
    }

    if (status === 'DITOLAK') {
      const rejected = await PaymentService.rejectPayment(tenantId, paymentId, req.user!.user_id, reason || notes || 'Ditolak');
      return res.json({ success: true, message: 'Pembayaran ditolak.', data: rejected });
    }

    const updated = await PaymentService.updatePayment(tenantId, paymentId, { status: status as PaymentStatus }, req.user!.user_id);
    return res.json({ success: true, message: `Status pembayaran diubah menjadi '${status}'.`, data: updated });
  } catch (err: any) {
    return sendApiError(res, 400, 'UPDATE_STATUS_FAILED', err.message || 'Gagal mengubah status.');
  }
});

// ==========================================
// 3. PAYMENT PROOFS (GOOGLE DRIVE STORAGE)
// ==========================================

/**
 * GET /api/payments/:id/proof - List proofs
 */
paymentRouter.get('/:id/proof', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const paymentId = req.params.id;
    const user = req.user!;

    const payment = await PaymentService.getPaymentById(tenantId, paymentId);
    if (!payment) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Pembayaran tidak ditemukan.');
    }

    if (user.role !== 'PANITIA' && user.nim && payment.payer_nim.toLowerCase() !== user.nim.toLowerCase()) {
      return sendApiError(res, 403, 'FORBIDDEN', 'Akses ditolak.');
    }

    const proofs = await PaymentService.listProofs(tenantId, paymentId);
    res.json({
      success: true,
      data: proofs
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil bukti pembayaran.');
  }
});

/**
 * POST /api/payments/:id/proof and /api/payments/:id/proofs - Upload proof to Google Drive
 */
const handleUploadProof = async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const paymentId = req.params.id;
    const user = req.user!;
    const { file_name, mime_type, file_size, file_size_bytes, file_url, base64_data } = req.body;
    const actualSize = file_size || file_size_bytes || (base64_data ? Math.round(base64_data.length * 0.75) : 1000);

    if (!file_name || !mime_type) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Metadata file (file_name, mime_type) wajib disertakan.');
    }

    const payment = await PaymentService.getPaymentById(tenantId, paymentId);
    if (!payment) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Pembayaran tidak ditemukan.');
    }

    if (user.role !== 'PANITIA' && user.nim && payment.payer_nim.toLowerCase() !== user.nim.toLowerCase()) {
      return sendApiError(res, 403, 'FORBIDDEN', 'Akses ditolak.');
    }

    const proof = await PaymentService.uploadProof(
      tenantId,
      paymentId,
      { file_name, mime_type, file_size: actualSize, file_url, base64_data },
      user.user_id
    );

    res.status(201).json({
      success: true,
      message: 'Bukti pembayaran berhasil diunggah ke Google Drive.',
      data: proof
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'UPLOAD_PROOF_FAILED', err.message || 'Gagal mengunggah bukti pembayaran.');
  }
};

paymentRouter.post('/:id/proof', handleUploadProof);
paymentRouter.post('/:id/proofs', handleUploadProof);

/**
 * DELETE /api/payments/:id/proof/:proofId - Delete proof
 */
paymentRouter.delete('/:id/proof/:proofId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const paymentId = req.params.id;
    const proofId = req.params.proofId;
    const user = req.user!;

    const payment = await PaymentService.getPaymentById(tenantId, paymentId);
    if (!payment) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Pembayaran tidak ditemukan.');
    }

    if (user.role !== 'PANITIA' && user.nim && payment.payer_nim.toLowerCase() !== user.nim.toLowerCase()) {
      return sendApiError(res, 403, 'FORBIDDEN', 'Akses ditolak.');
    }

    await PaymentService.deleteProof(tenantId, paymentId, proofId, user.user_id);

    res.json({
      success: true,
      message: 'Bukti pembayaran berhasil dihapus.'
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'DELETE_PROOF_FAILED', err.message || 'Gagal menghapus bukti pembayaran.');
  }
});
