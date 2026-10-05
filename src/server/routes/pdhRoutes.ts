// PDH Master, Pricing, Sizes, and Design Images Routes Controller
import { Router, Request, Response } from 'express';
import { requireTenant, optionalAuth, authenticate, requireRole, sendApiError } from '../middlewares/authMiddleware.ts';
import { PDHService } from '../services/pdhService.ts';

export const pdhRouter = Router();

// Apply tenant resolution to all PDH routes
pdhRouter.use(requireTenant);

// ==========================================
// 1. MASTER PDH
// ==========================================

/**
 * GET /api/pdh - List all active PDH products for current tenant
 */
pdhRouter.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const products = await PDHService.listProducts(tenantId);
    res.json({
      success: true,
      data: products
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil data produk PDH.');
  }
});

/**
 * GET /api/pdh/master - Complete PDH Master Data structure for frontend
 */
pdhRouter.get('/master', optionalAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const masterData = await PDHService.getMasterData(tenantId);
    res.json({
      success: true,
      data: masterData
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil data master PDH.');
  }
});

/**
 * PUT /api/pdh/info - Update PDH Info
 */
pdhRouter.put('/info', authenticate, requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const updated = await PDHService.updateMasterInfo(tenantId, req.body, req.user!.user_id);
    res.json({
      success: true,
      message: 'Informasi spesifikasi PDH berhasil diperbarui.',
      data: updated
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'UPDATE_INFO_FAILED', err.message || 'Gagal memperbarui info PDH.');
  }
});

/**
 * PUT /api/pdh/pricing - Update PDH Pricing
 */
pdhRouter.put('/pricing', authenticate, requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const updated = await PDHService.updateMasterPricing(tenantId, req.body, req.user!.user_id);
    res.json({
      success: true,
      message: 'Harga master PDH berhasil diperbarui.',
      data: updated
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'UPDATE_PRICING_FAILED', err.message || 'Gagal memperbarui harga PDH.');
  }
});

/**
 * POST /api/pdh/sizes - Save/update PDH size
 */
pdhRouter.post('/sizes', authenticate, requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const updated = await PDHService.saveMasterSize(tenantId, req.body, req.user!.user_id);
    res.json({
      success: true,
      message: 'Data ukuran PDH berhasil disimpan.',
      data: updated
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'SAVE_SIZE_FAILED', err.message || 'Gagal menyimpan ukuran PDH.');
  }
});

/**
 * PUT /api/pdh/payment-info - Update PDH Payment Info
 */
pdhRouter.put('/payment-info', authenticate, requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const updated = await PDHService.updateMasterPayment(tenantId, req.body, req.user!.user_id);
    res.json({
      success: true,
      message: 'Informasi rekening pembayaran PDH berhasil diperbarui.',
      data: updated
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'UPDATE_PAYMENT_INFO_FAILED', err.message || 'Gagal memperbarui info pembayaran.');
  }
});

/**
 * GET /api/pdh/:id - Get specific PDH product with complete sizes & images
 */
pdhRouter.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const produkId = req.params.id;

    const product = await PDHService.getProductById(tenantId, produkId);
    if (!product) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Produk PDH tidak ditemukan.');
    }

    const sizes = await PDHService.listSizes(tenantId, produkId);
    const images = await PDHService.listImages(tenantId, produkId);

    res.json({
      success: true,
      data: {
        ...product,
        sizes,
        images
      }
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil data produk PDH.');
  }
});

/**
 * POST /api/pdh - Create new PDH product (PANITIA only)
 */
pdhRouter.post('/', authenticate, requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const { nama_produk } = req.body;

    if (!nama_produk) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Nama produk wajib diisi.');
    }

    const newProduct = await PDHService.createProduct(tenantId, req.body, req.user!.user_id);

    res.status(201).json({
      success: true,
      message: 'Produk PDH berhasil ditambahkan.',
      data: newProduct
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'CREATE_PDH_FAILED', err.message || 'Gagal membuat produk PDH.');
  }
});

/**
 * PUT /api/pdh/:id - Update PDH product specifications (PANITIA only)
 */
pdhRouter.put('/:id', authenticate, requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const produkId = req.params.id;

    const updated = await PDHService.updateProduct(tenantId, produkId, req.body, req.user!.user_id);

    res.json({
      success: true,
      message: 'Spesifikasi produk PDH berhasil diperbarui.',
      data: updated
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'UPDATE_PDH_FAILED', err.message || 'Gagal memperbarui produk PDH.');
  }
});

/**
 * DELETE /api/pdh/:id - Archive/Delete PDH product (PANITIA only)
 */
pdhRouter.delete('/:id', authenticate, requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const produkId = req.params.id;

    await PDHService.deleteProduct(tenantId, produkId, req.user!.user_id);

    res.json({
      success: true,
      message: 'Produk PDH berhasil diarsipkan.'
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'DELETE_PDH_FAILED', err.message || 'Gagal menghapus produk PDH.');
  }
});

// ==========================================
// 2. PRICING
// ==========================================

/**
 * GET /api/pdh/:id/pricing - Get current master pricing
 */
pdhRouter.get('/:id/pricing', optionalAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const produkId = req.params.id;

    const product = await PDHService.getProductById(tenantId, produkId);
    if (!product) {
      return sendApiError(res, 404, 'NOT_FOUND', 'Produk PDH tidak ditemukan.');
    }

    res.json({
      success: true,
      data: {
        produk_id: product.produk_id,
        harga: product.harga,
        catatan_harga: product.catatan_harga,
        updated_at: product.updated_at
      }
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil data harga.');
  }
});

/**
 * PUT /api/pdh/:id/pricing - Update master pricing (PANITIA only)
 */
pdhRouter.put('/:id/pricing', authenticate, requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const produkId = req.params.id;
    const { harga, catatan_harga } = req.body;

    if (harga === undefined || typeof harga !== 'number') {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Field harga nominal angka wajib disertakan.');
    }

    const updated = await PDHService.updatePricing(tenantId, produkId, harga, catatan_harga, req.user!.user_id);

    res.json({
      success: true,
      message: 'Harga master PDH berhasil diperbarui. Perubahan ini tidak mempengaruhi nominal transaksi order sebelumnya.',
      data: updated
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'UPDATE_PRICING_FAILED', err.message || 'Gagal mengubah harga.');
  }
});

// ==========================================
// 3. SIZES
// ==========================================

/**
 * GET /api/pdh/:id/sizes - List sizes
 */
pdhRouter.get('/:id/sizes', optionalAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const produkId = req.params.id;

    const sizes = await PDHService.listSizes(tenantId, produkId);
    res.json({
      success: true,
      data: sizes
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil daftar ukuran.');
  }
});

/**
 * POST /api/pdh/:id/sizes - Create new size (PANITIA only)
 */
pdhRouter.post('/:id/sizes', authenticate, requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const produkId = req.params.id;
    const { kode_ukuran, nama_ukuran } = req.body;

    if (!kode_ukuran || !nama_ukuran) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Kode ukuran dan nama ukuran wajib diisi.');
    }

    const newSize = await PDHService.createSize(tenantId, produkId, req.body, req.user!.user_id);

    res.status(201).json({
      success: true,
      message: 'Ukuran baru berhasil ditambahkan.',
      data: newSize
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'CREATE_SIZE_FAILED', err.message || 'Gagal menambahkan ukuran.');
  }
});

/**
 * PUT /api/pdh/:id/sizes/:sizeId - Update size (PANITIA only)
 */
pdhRouter.put('/:id/sizes/:sizeId', authenticate, requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const produkId = req.params.id;
    const sizeId = req.params.sizeId;

    const updated = await PDHService.updateSize(tenantId, produkId, sizeId, req.body, req.user!.user_id);

    res.json({
      success: true,
      message: 'Ukuran berhasil diperbarui.',
      data: updated
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'UPDATE_SIZE_FAILED', err.message || 'Gagal memperbarui ukuran.');
  }
});

/**
 * DELETE /api/pdh/:id/sizes/:sizeId - Delete or Archive size (PANITIA only)
 */
pdhRouter.delete('/:id/sizes/:sizeId', authenticate, requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const produkId = req.params.id;
    const sizeId = req.params.sizeId;

    const result = await PDHService.deleteSize(tenantId, produkId, sizeId, req.user!.user_id);

    res.json({
      success: true,
      message: 'Ukuran berhasil dihapus atau diarsipkan.',
      data: { success: result }
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'DELETE_SIZE_FAILED', err.message || 'Gagal menghapus ukuran.');
  }
});

// ==========================================
// 4. DESIGN / IMAGES (MAX 5 ACTIVE)
// ==========================================

/**
 * GET /api/pdh/:id/images - List active design images
 */
pdhRouter.get('/:id/images', optionalAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const produkId = req.params.id;

    const images = await PDHService.listImages(tenantId, produkId);
    res.json({
      success: true,
      data: images
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'INTERNAL_ERROR', err.message || 'Gagal mengambil gambar desain.');
  }
});

/**
 * POST /api/pdh/:id/images - Upload design image (PANITIA only)
 */
pdhRouter.post('/:id/images', authenticate, requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const produkId = req.params.id;
    const { file_name, mime_type, file_size_bytes, base64_data } = req.body;

    if (!file_name || !mime_type || !file_size_bytes) {
      return sendApiError(res, 400, 'VALIDATION_ERROR', 'Metadata file (file_name, mime_type, file_size_bytes) wajib disertakan.');
    }

    const uploaded = await PDHService.uploadImage(
      tenantId,
      produkId,
      { file_name, mime_type, file_size_bytes, base64_data },
      req.user!.user_id
    );

    res.status(201).json({
      success: true,
      message: 'Foto desain PDH berhasil diunggah dan disimpan ke Google Drive.',
      data: uploaded
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'UPLOAD_IMAGE_FAILED', err.message || 'Gagal mengunggah foto desain.');
  }
});

/**
 * DELETE /api/pdh/:id/images/:imageId - Delete design image (PANITIA only)
 */
pdhRouter.delete('/:id/images/:imageId', authenticate, requireRole(['PANITIA']), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const produkId = req.params.id;
    const imageId = req.params.imageId;

    await PDHService.deleteImage(tenantId, produkId, imageId, req.user!.user_id);

    res.json({
      success: true,
      message: 'Foto desain PDH berhasil dihapus.'
    });
  } catch (err: any) {
    return sendApiError(res, 400, 'DELETE_IMAGE_FAILED', err.message || 'Gagal menghapus foto desain.');
  }
});
