// Order and Order Members Routes Controller
import { Router, Request, Response } from 'express';
import { requireTenant, authenticate, requireRole, sendApiError } from '../middlewares/authMiddleware.ts';
import { OrderService, OrderStatus } from '../services/orderService.ts';
import { PaymentService } from '../services/paymentService.ts';

export const orderRouter = Router();

// Enforce Tenant Resolution for all Order routes
orderRouter.use(requireTenant);

/**
 * GET /api/orders/track/:query - Public Order Tracking by NIM or Order Code
 */
orderRouter.get('/track/:query', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const query = req.params.query;
    if (!query) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'NIM atau nomor pesanan wajib diisi.');
    }

    const trackingResult = await OrderService.trackOrderPublic(tenantId, query);
    res.json({
      success: true,
      data: trackingResult
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal melacak pesanan.');
  }
});

// Enforce Authentication for all other Order routes
orderRouter.use(authenticate);

// ==========================================
// 1. SPECIALIZED ROUTES (Place before /:id)
// ==========================================

/**
 * GET /api/orders/:orderId/payment - Get complete payment status & history for an order
 */
orderRouter.get('/:orderId/payment', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const orderId = req.params.orderId;
    const user = req.user!;

    const order = await OrderService.getOrderById(tenantId, orderId);
    if (!order) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Pesanan tidak ditemukan.');
    }

    if (user.role !== 'PANITIA') {
      const isCoordinator = user.nim && order.coordinator_nim.toLowerCase() === user.nim.toLowerCase();
      const isMember = user.nim && order.members.some((m) => m.nim.toLowerCase() === user.nim?.toLowerCase());
      if (!isCoordinator && !isMember) {
        return sendApiError(res, 403, 'FORBIDDEN', 'Akses ditolak.');
      }
    }

    const paymentSummary = await PaymentService.getPaymentSummaryByOrder(tenantId, orderId);

    res.json({
      success: true,
      data: paymentSummary
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil informasi pembayaran pesanan.');
  }
});

/**
 * GET /api/orders/my - Get orders for the logged-in student / buyer
 */
orderRouter.get('/my', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const user = req.user!;
    const studentIdentifier = user.nim || user.user_id || user.username;

    const myOrders = await OrderService.listOrdersByStudent(tenantId, studentIdentifier);

    res.json({
      success: true,
      data: myOrders
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil riwayat pesanan saya.');
  }
});

/**
 * GET /api/orders/admin - Filtered & Paginated orders for Panitia Portal
 */
orderRouter.get('/admin', requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const { status, periode_id, class_name, class: classNameParam, coordinator_id, search, page, limit } = req.query;

    const filterResult = await OrderService.listOrders(tenantId, {
      status: status as string,
      periode_id: periode_id as string,
      class_name: (class_name || classNameParam) as string,
      coordinator_id: coordinator_id as string,
      search: search as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 50
    });

    res.json({
      success: true,
      data: filterResult.orders,
      pagination: filterResult.pagination
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil data pesanan admin.');
  }
});

/**
 * GET /api/orders/coordinator/:studentId - Multi-Order summary for a specific coordinator
 */
orderRouter.get('/coordinator/:studentId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const targetCoordinatorId = req.params.studentId;
    const user = req.user!;

    // Authorization: PANITIA or the coordinator themselves
    if (user.role !== 'PANITIA' && user.nim?.toLowerCase() !== targetCoordinatorId.toLowerCase() && user.user_id !== targetCoordinatorId) {
      return sendApiError(res, 403, 'FORBIDDEN', 'Akses ditolak: Anda hanya dapat melihat ringkasan pesanan koordinator milik Anda.');
    }

    const summaryData = await OrderService.getCoordinatorMultiOrderSummary(tenantId, targetCoordinatorId);

    res.json({
      success: true,
      data: summaryData
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil ringkasan koordinator.');
  }
});

/**
 * GET /api/orders/student/:studentId - Get orders for a specific student
 */
orderRouter.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const studentId = req.params.studentId;
    const user = req.user!;

    if (user.role !== 'PANITIA' && user.nim && studentId.toLowerCase() !== user.nim.toLowerCase() && studentId !== user.user_id) {
      return sendApiError(res, 403, 'FORBIDDEN', 'Akses ditolak: Anda hanya dapat melihat pesanan Anda.');
    }

    const orders = await OrderService.listOrdersByStudent(tenantId, studentId);
    res.json({
      success: true,
      data: orders
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil data pesanan mahasiswa.');
  }
});

/**
 * POST /api/orders/bulk-status - Bulk update order status (PANITIA only)
 */
orderRouter.post('/bulk-status', requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const { order_ids, status } = req.body;

    if (!Array.isArray(order_ids) || order_ids.length === 0 || !status) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Field order_ids (array) dan status wajib disertakan.');
    }

    const result = await OrderService.bulkUpdateOrderStatus(tenantId, order_ids, status as OrderStatus, req.user!.user_id);

    res.json({
      success: result.success,
      message: `Bulk status update: ${result.updated.length} pesanan berhasil diperbarui, ${result.failed.length} gagal.`,
      updated: result.updated,
      failed: result.failed
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'BULK_UPDATE_FAILED', err.message || 'Gagal melakukan bulk update status.');
  }
});

// ==========================================
// 2. STANDARD CRUD ORDER ROUTES
// ==========================================

/**
 * GET /api/orders - List orders (PANITIA gets tenant list, MAHASISWA gets own orders)
 */
orderRouter.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const user = req.user!;

    if (user.role === 'PANITIA') {
      const allOrders = await OrderService.listOrders(tenantId, req.query as any);
      return res.json({
        success: true,
        data: allOrders.orders,
        pagination: allOrders.pagination
      });
    }

    // Role is MAHASISWA
    const studentIdentifier = user.nim || user.user_id || user.username;
    const myOrders = await OrderService.listOrdersByStudent(tenantId, studentIdentifier);
    return res.json({
      success: true,
      data: myOrders
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil daftar pesanan.');
  }
});

/**
 * GET /api/orders/:id - Order detail with members
 */
orderRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const orderId = req.params.id;
    const user = req.user!;

    const order = await OrderService.getOrderById(tenantId, orderId);
    if (!order) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Pesanan tidak ditemukan.');
    }

    // RBAC: If MAHASISWA, verify ownership as coordinator or member
    if (user.role !== 'PANITIA') {
      const isCoordinator = user.nim && order.coordinator_nim.toLowerCase() === user.nim.toLowerCase();
      const isMember = user.nim && order.members.some((m) => m.nim.toLowerCase() === user.nim?.toLowerCase());

      if (!isCoordinator && !isMember) {
        return sendApiError(res, 403, 'FORBIDDEN', 'Akses ditolak: Anda tidak memiliki akses terhadap pesanan ini.');
      }
    }

    res.json({
      success: true,
      data: order
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil detail pesanan.');
  }
});

/**
 * POST /api/orders - Create new order
 */
orderRouter.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const user = req.user!;

    const payload = {
      ...req.body,
      coordinator_name: req.body.coordinator_name || req.body.buyerName || user.name,
      coordinator_nim: req.body.coordinator_nim || req.body.buyerNim || user.nim || user.username,
      coordinator_class: req.body.coordinator_class || req.body.buyerClass || user.className || '22MJSP001',
      coordinator_phone: req.body.coordinator_phone || req.body.buyerWhatsapp || '081234567890',
      order_type: req.body.order_type || req.body.orderType || 'INDIVIDU',
      members: (req.body.members && req.body.members.length > 0)
        ? req.body.members
        : (req.body.items && req.body.items.length > 0)
        ? req.body.items.map((it: any) => ({
            nama_lengkap: it.name || req.body.buyerName || user.name,
            nim: it.nim || req.body.buyerNim || user.nim || user.username,
            kelas: it.className || req.body.buyerClass || user.className || '22MJSP001',
            ukuran: it.size || 'L',
            custom_name: it.customName || '',
            jumlah: it.quantity || 1
          }))
        : [{
            nama_lengkap: req.body.buyerName || user.name,
            nim: req.body.buyerNim || user.nim || user.username,
            kelas: req.body.buyerClass || user.className || '22MJSP001',
            ukuran: 'L',
            jumlah: 1
          }]
    };

    const newOrder = await OrderService.createOrder(tenantId, payload, user.user_id);

    res.status(201).json({
      success: true,
      message: 'Pesanan berhasil dibuat.',
      data: newOrder
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'CREATE_ORDER_FAILED', err.message || 'Gagal membuat pesanan.');
  }
});

/**
 * PUT /api/orders/:id - Update order
 */
orderRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const orderId = req.params.id;
    const user = req.user!;

    const order = await OrderService.getOrderById(tenantId, orderId);
    if (!order) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Pesanan tidak ditemukan.');
    }

    if (user.role !== 'PANITIA') {
      const isCoordinator = user.nim && order.coordinator_nim.toLowerCase() === user.nim.toLowerCase();
      if (!isCoordinator) {
        return sendApiError(res, 403, 'FORBIDDEN', 'Akses ditolak: Hanya koordinator atau panitia yang dapat mengubah pesanan.');
      }
    }

    const updated = await OrderService.updateOrder(tenantId, orderId, req.body, user.user_id);

    res.json({
      success: true,
      message: 'Data pesanan berhasil diperbarui.',
      data: updated
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'UPDATE_ORDER_FAILED', err.message || 'Gagal memperbarui pesanan.');
  }
});

/**
 * PUT /api/orders/:id/status - Update order status (PANITIA only)
 */
orderRouter.put('/:id/status', requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const orderId = req.params.id;
    const { status } = req.body;

    if (!status) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Field status wajib disertakan.');
    }

    const updated = await OrderService.updateOrderStatus(tenantId, orderId, status as OrderStatus, req.user!.user_id);

    res.json({
      success: true,
      message: `Status pesanan berhasil diubah menjadi '${status}'.`,
      data: updated
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'UPDATE_STATUS_FAILED', err.message || 'Gagal mengubah status pesanan.');
  }
});

/**
 * PATCH /api/orders/:id/status - Update order status alias (PANITIA only)
 */
orderRouter.patch('/:id/status', requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const orderId = req.params.id;
    const { status } = req.body;

    if (!status) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Field status wajib disertakan.');
    }

    const updated = await OrderService.updateOrderStatus(tenantId, orderId, status as OrderStatus, req.user!.user_id);

    res.json({
      success: true,
      message: `Status pesanan berhasil diubah menjadi '${status}'.`,
      data: updated
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'UPDATE_STATUS_FAILED', err.message || 'Gagal mengubah status pesanan.');
  }
});

/**
 * POST /api/orders/:id/cancel - Cancel order
 */
orderRouter.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const orderId = req.params.id;
    const user = req.user!;

    const order = await OrderService.getOrderById(tenantId, orderId);
    if (!order) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Pesanan tidak ditemukan.');
    }

    if (user.role !== 'PANITIA') {
      const isCoordinator = user.nim && order.coordinator_nim.toLowerCase() === user.nim.toLowerCase();
      if (!isCoordinator) {
        return sendApiError(res, 403, 'FORBIDDEN', 'Akses ditolak: Hanya koordinator atau panitia yang dapat membatalkan pesanan.');
      }
    }

    await OrderService.deleteOrder(tenantId, orderId, user.user_id);

    res.json({
      success: true,
      message: 'Pesanan berhasil dibatalkan.'
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'CANCEL_ORDER_FAILED', err.message || 'Gagal membatalkan pesanan.');
  }
});

/**
 * DELETE /api/orders/:id - Cancel/Archive order
 */
orderRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const orderId = req.params.id;
    const user = req.user!;

    const order = await OrderService.getOrderById(tenantId, orderId);
    if (!order) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Pesanan tidak ditemukan.');
    }

    if (user.role !== 'PANITIA') {
      const isCoordinator = user.nim && order.coordinator_nim.toLowerCase() === user.nim.toLowerCase();
      if (!isCoordinator) {
        return sendApiError(res, 403, 'FORBIDDEN', 'Akses ditolak: Hanya koordinator atau panitia yang dapat membatalkan pesanan.');
      }
    }

    await OrderService.deleteOrder(tenantId, orderId, user.user_id);

    res.json({
      success: true,
      message: 'Pesanan berhasil dibatalkan.'
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'DELETE_ORDER_FAILED', err.message || 'Gagal membatalkan pesanan.');
  }
});

// ==========================================
// 3. ORDER MEMBERS ROUTES
// ==========================================

/**
 * GET /api/orders/:id/members
 */
orderRouter.get('/:id/members', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const orderId = req.params.id;
    const user = req.user!;

    const order = await OrderService.getOrderById(tenantId, orderId);
    if (!order) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Pesanan tidak ditemukan.');
    }

    if (user.role !== 'PANITIA') {
      const isCoordinator = user.nim && order.coordinator_nim.toLowerCase() === user.nim.toLowerCase();
      const isMember = user.nim && order.members.some((m) => m.nim.toLowerCase() === user.nim?.toLowerCase());
      if (!isCoordinator && !isMember) {
        return sendApiError(res, 403, 'FORBIDDEN', 'Akses ditolak.');
      }
    }

    const members = await OrderService.listMembers(tenantId, orderId);
    res.json({
      success: true,
      data: members
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil anggota pesanan.');
  }
});

/**
 * POST /api/orders/:id/members
 */
orderRouter.post('/:id/members', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const orderId = req.params.id;
    const { nama_lengkap, nim, ukuran, custom_name, jumlah, kelas } = req.body;

    if (!nama_lengkap || !nim || !ukuran) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Field nama_lengkap, nim, dan ukuran wajib diisi.');
    }

    const newMember = await OrderService.addMember(
      tenantId,
      orderId,
      { nama_lengkap, nim, ukuran, custom_name, jumlah, kelas },
      req.user!.user_id
    );

    res.status(201).json({
      success: true,
      message: 'Anggota pesanan berhasil ditambahkan.',
      data: newMember
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'ADD_MEMBER_FAILED', err.message || 'Gagal menambahkan anggota.');
  }
});

/**
 * PUT /api/orders/:id/members/:memberId
 */
orderRouter.put('/:id/members/:memberId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const orderId = req.params.id;
    const memberId = req.params.memberId;

    const updated = await OrderService.updateMember(tenantId, orderId, memberId, req.body, req.user!.user_id);

    res.json({
      success: true,
      message: 'Anggota pesanan berhasil diperbarui.',
      data: updated
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'UPDATE_MEMBER_FAILED', err.message || 'Gagal memperbarui anggota.');
  }
});

/**
 * DELETE /api/orders/:id/members/:memberId
 */
orderRouter.delete('/:id/members/:memberId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const orderId = req.params.id;
    const memberId = req.params.memberId;

    await OrderService.deleteMember(tenantId, orderId, memberId, req.user!.user_id);

    res.json({
      success: true,
      message: 'Anggota pesanan berhasil dihapus.'
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'DELETE_MEMBER_FAILED', err.message || 'Gagal menghapus anggota.');
  }
});
