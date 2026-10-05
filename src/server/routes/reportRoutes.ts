// Reports & PDF Routes Controller (PANITIA Access Only, Multi-Tenant - Async/Await)
import { Router, Request, Response } from 'express';
import { requireTenant, authenticate, requireRole, sendApiError } from '../middlewares/authMiddleware.ts';
import { ReportService, ReportFilterOptions } from '../services/reportService.ts';

export const reportRouter = Router();

// Apply Tenant Resolution, Authentication, and PANITIA Role Check
reportRouter.use(requireTenant);
reportRouter.use(authenticate);
reportRouter.use(requireRole(['PANITIA']));

const extractFilters = (req: Request): ReportFilterOptions => {
  const {
    periode_id,
    kelas,
    status,
    date_from,
    date_to,
    search,
    produk_id,
    page,
    limit
  } = req.query;

  return {
    periode_id: (periode_id as string)?.trim() || undefined,
    kelas: (kelas as string)?.trim() || undefined,
    status: (status as string)?.trim() || undefined,
    date_from: (date_from as string)?.trim() || undefined,
    date_to: (date_to as string)?.trim() || undefined,
    search: (search as string)?.trim() || undefined,
    produk_id: (produk_id as string)?.trim() || undefined,
    page: page ? parseInt(page as string, 10) : 1,
    limit: limit ? parseInt(limit as string, 10) : 50
  };
};

/**
 * GET /api/reports/summary - Ringkasan Pesanan & Metrik Eksekutif
 */
reportRouter.get('/summary', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const filters = extractFilters(req);
    const data = await ReportService.getOrderSummaryReport(tenantId, filters);

    res.json({
      success: true,
      data
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'REPORT_ERROR', err.message || 'Gagal memuat ringkasan pesanan.');
  }
});

/**
 * GET /api/reports/classes - Laporan Rekapitulasi Per Kelas
 */
reportRouter.get('/classes', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const filters = extractFilters(req);
    const data = await ReportService.getClassReport(tenantId, filters);

    res.json({
      success: true,
      data
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'REPORT_ERROR', err.message || 'Gagal memuat laporan per kelas.');
  }
});

/**
 * GET /api/reports/students - Laporan Mahasiswa & Status Pemesanan
 */
reportRouter.get('/students', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const filters = extractFilters(req);
    const data = await ReportService.getStudentReport(tenantId, filters);

    res.json({
      success: true,
      data
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'REPORT_ERROR', err.message || 'Gagal memuat laporan mahasiswa.');
  }
});

/**
 * GET /api/reports/payments - Laporan Pembayaran & Rekonsiliasi Keuangan
 */
reportRouter.get('/payments', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const filters = extractFilters(req);
    const data = await ReportService.getPaymentReport(tenantId, filters);

    res.json({
      success: true,
      data
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'REPORT_ERROR', err.message || 'Gagal memuat laporan pembayaran.');
  }
});

/**
 * GET /api/reports/production - Laporan Produksi & Logistik
 */
reportRouter.get('/production', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const filters = extractFilters(req);
    const data = await ReportService.getProductionReport(tenantId, filters);

    res.json({
      success: true,
      data
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'REPORT_ERROR', err.message || 'Gagal memuat laporan produksi.');
  }
});

/**
 * GET /api/reports/periods - Laporan Kinerja Periode
 */
reportRouter.get('/periods', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const data = await ReportService.getPeriodReport(tenantId);

    res.json({
      success: true,
      data
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'REPORT_ERROR', err.message || 'Gagal memuat laporan periode.');
  }
});

/**
 * GET /api/reports/convection - Laporan SPK Produksi Konveksi
 */
reportRouter.get('/convection', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const filters = extractFilters(req);
    const data = await ReportService.getConvectionReport(tenantId, filters);

    res.json({
      success: true,
      data
    });
  } catch (err: any) {
    return sendApiError(res, 500, 'REPORT_ERROR', err.message || 'Gagal memuat laporan konveksi.');
  }
});

/**
 * GET /api/reports/pdf - Server-Side PDF Preview & Download
 * Query params: type ('general' | 'convection'), download ('true' | 'false'), plus filters
 */
reportRouter.get('/pdf', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.tenant_id;
    const type = (req.query.type as string) === 'convection' ? 'convection' : 'general';
    const isDownload = req.query.download === 'true';
    const filters = extractFilters(req);
    const picName = req.user!.name || req.user!.username || 'Panitia PDH';

    const pdfBuffer = await ReportService.generateReportPDF(tenantId, type, filters, picName);

    const dateSlug = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = type === 'convection'
      ? `Laporan_Konveksi_PDH_${tenantId}_${dateSlug}.pdf`
      : `Laporan_Eksekutif_PDH_${tenantId}_${dateSlug}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${isDownload ? 'attachment' : 'inline'}; filename="${filename}"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (err: any) {
    return sendApiError(res, 500, 'PDF_ERROR', err.message || 'Gagal menghasilkan dokumen PDF.');
  }
});
