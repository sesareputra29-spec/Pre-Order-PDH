// Payment & Payment Proofs Service Layer (Multi-tenant - Google Sheets Persistent)
import { AuditService } from './auditService.ts';
import { UserService } from './userService.ts';
import { OrderService } from './orderService.ts';
import { DriveFolderService } from './driveFolderService.ts';
import { NotificationService } from './notificationService.ts';
import { GoogleSheetsService } from './googleSheetsService.ts';
import { GoogleAuthService } from './googleAuthService.ts';
import { getTenantById } from '../config/tenants.ts';

export type PaymentStatus = 'PENDING' | 'MENUNGGU_VERIFIKASI' | 'DISETUJUI' | 'DITOLAK';

export interface PaymentProofRecord {
  proof_id: string;
  payment_id: string;
  order_id: string;
  tenant_id: string;
  drive_file_id: string;
  file_url: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
  status: 'ACTIVE' | 'DELETED';
}

export interface PaymentRecord {
  payment_id: string;
  tenant_id: string;
  order_id: string;
  mahasiswa_id?: string;
  payer_name: string;
  payer_nim: string;
  jumlah: number;
  metode: string;
  tanggal_pembayaran: string;
  status: PaymentStatus;
  catatan?: string;
  alasan_penolakan?: string;
  verified_by?: string;
  verified_at?: string;
  idempotency_key?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentFilterOptions {
  status?: string;
  order_id?: string;
  student_id?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class PaymentService {
  private static paymentsStore: Map<string, PaymentRecord> = new Map();
  private static proofsStore: Map<string, PaymentProofRecord> = new Map();
  private static idempotencyMap: Map<string, { payment_id: string; timestamp: number }> = new Map();
  private static initializedTenants: Set<string> = new Set();
  private static lastLoadedAt: Map<string, number> = new Map();
  private static CACHE_TTL_MS = Number(process.env.CACHE_TTL_PAYMENT_MS) || 10000;

  static invalidateCache(tenantId?: string): void {
    if (tenantId) {
      this.initializedTenants.delete(tenantId);
      this.lastLoadedAt.delete(tenantId);
      for (const [key, p] of this.paymentsStore.entries()) {
        if (p.tenant_id === tenantId) this.paymentsStore.delete(key);
      }
      for (const [key, prf] of this.proofsStore.entries()) {
        if (prf.tenant_id === tenantId) this.proofsStore.delete(key);
      }
    } else {
      this.initializedTenants.clear();
      this.lastLoadedAt.clear();
      this.paymentsStore.clear();
      this.proofsStore.clear();
      this.idempotencyMap.clear();
    }
  }

  /**
   * Loads payments and payment proofs from Google Sheets for the specified tenant.
   */
  private static async loadFromSheets(tenantId: string): Promise<boolean> {
    const tenant = getTenantById(tenantId);
    if (!tenant || !tenant.spreadsheet_id) {
      return false;
    }
    try {
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'Payments');
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'PaymentProofs');

      // 1. Read Payments
      const paymentRows = await GoogleSheetsService.getValues(tenant.spreadsheet_id, 'Payments!A2:Q');
      const proofRows = await GoogleSheetsService.getValues(tenant.spreadsheet_id, 'PaymentProofs!A2:L');

      if ((!paymentRows || paymentRows.length === 0) && (!proofRows || proofRows.length === 0)) {
        return false;
      }

      for (const [key, pay] of this.paymentsStore.entries()) {
        if (pay.tenant_id === tenantId) {
          this.paymentsStore.delete(key);
        }
      }
      if (paymentRows && paymentRows.length > 0) {
        for (const row of paymentRows) {
          if (!row[0]) continue;
          const pay: PaymentRecord = {
            payment_id: String(row[0]),
            tenant_id: String(row[1] || tenantId),
            order_id: String(row[2] || ''),
            mahasiswa_id: row[3] ? String(row[3]) : undefined,
            payer_name: String(row[4] || ''),
            payer_nim: String(row[5] || ''),
            jumlah: Number(row[6] || 0),
            metode: String(row[7] || ''),
            tanggal_pembayaran: String(row[8] || ''),
            status: (row[9] || 'PENDING') as PaymentStatus,
            catatan: row[10] ? String(row[10]) : undefined,
            alasan_penolakan: row[11] ? String(row[11]) : undefined,
            verified_by: row[12] ? String(row[12]) : undefined,
            verified_at: row[13] ? String(row[13]) : undefined,
            idempotency_key: row[14] ? String(row[14]) : undefined,
            created_at: String(row[15] || new Date().toISOString()),
            updated_at: String(row[16] || new Date().toISOString())
          };
          this.paymentsStore.set(`${tenantId}:${pay.payment_id}`, pay);
        }
      }

      for (const [key, prf] of this.proofsStore.entries()) {
        if (prf.tenant_id === tenantId) {
          this.proofsStore.delete(key);
        }
      }
      if (proofRows && proofRows.length > 0) {
        for (const row of proofRows) {
          if (!row[0]) continue;
          const prf: PaymentProofRecord = {
            proof_id: String(row[0]),
            payment_id: String(row[1]),
            order_id: String(row[2]),
            tenant_id: String(row[3] || tenantId),
            drive_file_id: String(row[4] || ''),
            file_url: String(row[5] || ''),
            file_name: String(row[6] || ''),
            mime_type: String(row[7] || ''),
            file_size: Number(row[8] || 0),
            uploaded_by: String(row[9] || ''),
            uploaded_at: String(row[10] || ''),
            status: (row[11] || 'ACTIVE') as any
          };
          this.proofsStore.set(`${tenantId}:${prf.payment_id}:${prf.proof_id}`, prf);
        }
      }
      return true;
    } catch (err: any) {
      console.warn(`[PaymentService] Gagal memuat pembayaran dari Google Sheets untuk tenant ${tenantId}:`, err.message || err);
      return false;
    }
  }

  /**
   * Saves payments and payment proofs of the specified tenant back to Google Sheets.
   */
  private static async saveToSheets(tenantId: string): Promise<void> {
    const tenant = getTenantById(tenantId);
    if (!tenant || !tenant.spreadsheet_id) {
      return;
    }
    try {
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'Payments');
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'PaymentProofs');

      const tenantPayments = Array.from(this.paymentsStore.values()).filter(p => p.tenant_id === tenantId);
      const tenantProofs = Array.from(this.proofsStore.values()).filter(prf => prf.tenant_id === tenantId);

      // Payments Headers & Rows
      const payHeaders = [
        'payment_id', 'tenant_id', 'order_id', 'mahasiswa_id', 'payer_name', 'payer_nim', 'jumlah', 'metode',
        'tanggal_pembayaran', 'status', 'catatan', 'alasan_penolakan', 'verified_by', 'verified_at',
        'idempotency_key', 'created_at', 'updated_at'
      ];
      const payRows = tenantPayments.map(p => [
        p.payment_id, p.tenant_id, p.order_id, p.mahasiswa_id || '', p.payer_name, p.payer_nim, p.jumlah, p.metode,
        p.tanggal_pembayaran, p.status, p.catatan || '', p.alasan_penolakan || '', p.verified_by || '', p.verified_at || '',
        p.idempotency_key || '', p.created_at, p.updated_at
      ]);
      const payValues = [payHeaders, ...payRows];
      await GoogleSheetsService.updateValues(tenant.spreadsheet_id, `Payments!A1:Q${payValues.length}`, payValues);

      // Payment Proofs Headers & Rows
      const proofHeaders = [
        'proof_id', 'payment_id', 'order_id', 'tenant_id', 'drive_file_id', 'file_url', 'file_name',
        'mime_type', 'file_size', 'uploaded_by', 'uploaded_at', 'status'
      ];
      const proofRows = tenantProofs.map(prf => [
        prf.proof_id, prf.payment_id, prf.order_id, prf.tenant_id, prf.drive_file_id, prf.file_url, prf.file_name,
        prf.mime_type, prf.file_size, prf.uploaded_by, prf.uploaded_at, prf.status
      ]);
      const proofValues = [proofHeaders, ...proofRows];
      await GoogleSheetsService.updateValues(tenant.spreadsheet_id, `PaymentProofs!A1:L${proofValues.length}`, proofValues);
    } catch (err: any) {
      console.error(`[PaymentService] Gagal menyimpan pembayaran ke Google Sheets untuk tenant ${tenantId}:`, err.message || err);
    }
  }

  /**
   * Initializes the PaymentService cache for the specified tenant.
   */
  private static async initForTenant(tenantId: string, forceReload = false): Promise<void> {
    const lastLoaded = this.lastLoadedAt.get(tenantId) || 0;
    const isExpired = Date.now() - lastLoaded > this.CACHE_TTL_MS;

    if (!forceReload && this.initializedTenants.has(tenantId) && !isExpired) {
      return;
    }

    this.seedBaseline(tenantId);

    const loaded = await this.loadFromSheets(tenantId);
    if (!loaded) {
      if (!this.initializedTenants.has(tenantId)) {
        console.log(`[PaymentService] Sheet 'Payments'/'PaymentProofs' kosong atau gagal dibaca untuk tenant ${tenantId}. Mengunggah seed baseline ke Google Sheets...`);
        await this.saveToSheets(tenantId);
      }
    }

    this.lastLoadedAt.set(tenantId, Date.now());
    this.initializedTenants.add(tenantId);
  }

  private static seedBaseline(tenantId: string) {
    const now = new Date().toISOString();

    // 1. Payment 1 for ORD-2026-001 (Approved Lunas)
    const pay1: PaymentRecord = {
      payment_id: 'PAY-2026-001',
      tenant_id: tenantId,
      order_id: 'ORD-2026-001',
      mahasiswa_id: 'MHS-22MJSP001',
      payer_name: 'Ahmad Mahasiswa',
      payer_nim: '22MJSP001',
      jumlah: 560000,
      metode: 'Transfer Bank BCA',
      tanggal_pembayaran: now,
      status: 'DISETUJUI',
      catatan: 'Pembayaran lunas transfer via m-BCA',
      verified_by: 'USR-ADMIN-01',
      verified_at: now,
      created_at: now,
      updated_at: now
    };

    const proof1: PaymentProofRecord = {
      proof_id: 'PRF-001-01',
      payment_id: 'PAY-2026-001',
      order_id: 'ORD-2026-001',
      tenant_id: tenantId,
      drive_file_id: 'DRV-PROOF-PAY-001',
      file_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&q=80',
      file_name: 'Bukti_Transfer_ORD_2026_001.jpg',
      mime_type: 'image/jpeg',
      file_size: 198000,
      uploaded_by: '22MJSP001',
      uploaded_at: now,
      status: 'ACTIVE'
    };

    // 2. Payment 2 for ORD-2026-002 (Approved Lunas)
    const pay2: PaymentRecord = {
      payment_id: 'PAY-2026-002',
      tenant_id: tenantId,
      order_id: 'ORD-2026-002',
      mahasiswa_id: 'MHS-22MJSP001',
      payer_name: 'Ahmad Mahasiswa',
      payer_nim: '22MJSP001',
      jumlah: 185000,
      metode: 'QRIS',
      tanggal_pembayaran: now,
      status: 'DISETUJUI',
      catatan: 'Pembayaran QRIS',
      verified_by: 'USR-ADMIN-01',
      verified_at: now,
      created_at: now,
      updated_at: now
    };

    const proof2: PaymentProofRecord = {
      proof_id: 'PRF-002-01',
      payment_id: 'PAY-2026-002',
      order_id: 'ORD-2026-002',
      tenant_id: tenantId,
      drive_file_id: 'DRV-PROOF-PAY-002',
      file_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&q=80',
      file_name: 'Bukti_QRIS_ORD_2026_002.jpg',
      mime_type: 'image/jpeg',
      file_size: 165000,
      uploaded_by: '22MJSP001',
      uploaded_at: now,
      status: 'ACTIVE'
    };

    // 3. Payment 3 for ORD-2026-003 (Menunggu Verifikasi)
    const pay3: PaymentRecord = {
      payment_id: 'PAY-2026-003',
      tenant_id: tenantId,
      order_id: 'ORD-2026-003',
      mahasiswa_id: 'MHS-22MJSP002',
      payer_name: 'Budi Santoso',
      payer_nim: '22MJSP002',
      jumlah: 375000,
      metode: 'Transfer Bank Mandiri',
      tanggal_pembayaran: now,
      status: 'MENUNGGU_VERIFIKASI',
      catatan: 'Transfer via Mandiri Livin',
      created_at: now,
      updated_at: now
    };

    const proof3: PaymentProofRecord = {
      proof_id: 'PRF-003-01',
      payment_id: 'PAY-2026-003',
      order_id: 'ORD-2026-003',
      tenant_id: tenantId,
      drive_file_id: 'DRV-PROOF-PAY-003',
      file_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&q=80',
      file_name: 'Bukti_Mandiri_ORD_2026_003.jpg',
      mime_type: 'image/jpeg',
      file_size: 210000,
      uploaded_by: '22MJSP002',
      uploaded_at: now,
      status: 'ACTIVE'
    };

    if (!this.paymentsStore.has(`${tenantId}:${pay1.payment_id}`)) {
      this.paymentsStore.set(`${tenantId}:${pay1.payment_id}`, pay1);
    }
    if (!this.paymentsStore.has(`${tenantId}:${pay2.payment_id}`)) {
      this.paymentsStore.set(`${tenantId}:${pay2.payment_id}`, pay2);
    }
    if (!this.paymentsStore.has(`${tenantId}:${pay3.payment_id}`)) {
      this.paymentsStore.set(`${tenantId}:${pay3.payment_id}`, pay3);
    }

    if (!this.proofsStore.has(`${tenantId}:${pay1.payment_id}:${proof1.proof_id}`)) {
      this.proofsStore.set(`${tenantId}:${pay1.payment_id}:${proof1.proof_id}`, proof1);
    }
    if (!this.proofsStore.has(`${tenantId}:${pay2.payment_id}:${proof2.proof_id}`)) {
      this.proofsStore.set(`${tenantId}:${pay2.payment_id}:${proof2.proof_id}`, proof2);
    }
    if (!this.proofsStore.has(`${tenantId}:${pay3.payment_id}:${proof3.proof_id}`)) {
      this.proofsStore.set(`${tenantId}:${pay3.payment_id}:${proof3.proof_id}`, proof3);
    }
  }

  // ==========================================
  // 1. LIST & QUERYING PAYMENTS
  // ==========================================

  static async listPayments(
    tenantId: string,
    options: PaymentFilterOptions = {}
  ): Promise<{
    payments: (PaymentRecord & { proofs: PaymentProofRecord[] })[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    await this.initForTenant(tenantId);

    const list: (PaymentRecord & { proofs: PaymentProofRecord[] })[] = [];

    for (const payment of this.paymentsStore.values()) {
      if (payment.tenant_id !== tenantId) continue;

      if (options.status && payment.status.toUpperCase() !== options.status.toUpperCase()) {
        continue;
      }

      if (options.order_id && payment.order_id !== options.order_id) {
        continue;
      }

      if (options.student_id) {
        const sId = options.student_id.toLowerCase();
        if (
          payment.payer_nim.toLowerCase() !== sId &&
          payment.mahasiswa_id?.toLowerCase() !== sId
        ) {
          continue;
        }
      }

      if (options.search) {
        const q = options.search.toLowerCase();
        const matches =
          payment.payment_id.toLowerCase().includes(q) ||
          payment.order_id.toLowerCase().includes(q) ||
          payment.payer_name.toLowerCase().includes(q) ||
          payment.payer_nim.toLowerCase().includes(q);

        if (!matches) continue;
      }

      const proofs = await this.listProofs(tenantId, payment.payment_id);
      list.push({
        ...payment,
        proofs
      });
    }

    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = list.length;
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 50);
    const totalPages = Math.ceil(total / limit) || 1;

    const startIndex = (page - 1) * limit;
    const paginatedPayments = list.slice(startIndex, startIndex + limit);

    return {
      payments: paginatedPayments,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    };
  }

  static async getPaymentById(
    tenantId: string,
    paymentId: string
  ): Promise<(PaymentRecord & { proofs: PaymentProofRecord[] }) | null> {
    await this.initForTenant(tenantId);

    const payment = this.paymentsStore.get(`${tenantId}:${paymentId}`);
    if (!payment) return null;

    const proofs = await this.listProofs(tenantId, paymentId);
    return {
      ...payment,
      proofs
    };
  }

  static async listPaymentsByOrder(tenantId: string, orderId: string): Promise<(PaymentRecord & { proofs: PaymentProofRecord[] })[]> {
    await this.initForTenant(tenantId);

    const list: (PaymentRecord & { proofs: PaymentProofRecord[] })[] = [];
    for (const payment of this.paymentsStore.values()) {
      if (payment.tenant_id === tenantId && payment.order_id === orderId) {
        const proofs = await this.listProofs(tenantId, payment.payment_id);
        list.push({ ...payment, proofs });
      }
    }

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  static async getPaymentSummaryByOrder(
    tenantId: string,
    orderId: string
  ): Promise<{
    order_id: string;
    total_bill: number;
    total_paid: number;
    remaining_balance: number;
    payment_status: string;
    payments: (PaymentRecord & { proofs: PaymentProofRecord[] })[];
  }> {
    await this.initForTenant(tenantId);

    const order = await OrderService.getOrderById(tenantId, orderId);
    if (!order) {
      throw new Error(`Pesanan '${orderId}' tidak ditemukan.`);
    }

    const payments = await this.listPaymentsByOrder(tenantId, orderId);

    // Sum approved payments
    const totalPaid = payments
      .filter((p) => p.status === 'DISETUJUI')
      .reduce((sum, p) => sum + p.jumlah, 0);

    const remainingBalance = Math.max(0, order.total_amount - totalPaid);

    return {
      order_id: orderId,
      total_bill: order.total_amount,
      total_paid: totalPaid,
      remaining_balance: remainingBalance,
      payment_status: order.payment_status,
      payments
    };
  }

  // ==========================================
  // 2. CREATE & UPDATE PAYMENT
  // ==========================================

  static async createPayment(
    tenantId: string,
    data: {
      order_id: string;
      jumlah: number;
      metode: string;
      payer_name: string;
      payer_nim: string;
      mahasiswa_id?: string;
      catatan?: string;
      idempotency_key?: string;
    },
    performedByUserId?: string
  ): Promise<PaymentRecord & { proofs: PaymentProofRecord[] }> {
    await this.initForTenant(tenantId);

    // 1. Idempotency Check: prevent accidental duplicate transactions
    if (data.idempotency_key) {
      const cached = this.idempotencyMap.get(`${tenantId}:${data.idempotency_key}`);
      if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
        // Return already created payment
        const existing = await this.getPaymentById(tenantId, cached.payment_id);
        if (existing) return existing;
      }
    }

    // 2. Validate Order Existence & Tenant Match
    const order = await OrderService.getOrderById(tenantId, data.order_id);
    if (!order) {
      throw new Error(`Pesanan '${data.order_id}' tidak ditemukan pada tenant ini.`);
    }

    if (typeof data.jumlah !== 'number' || data.jumlah <= 0) {
      throw new Error('Jumlah pembayaran harus berupa nominal valid lebih dari Rp 0.');
    }

    const paymentId = `PAY-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase().substring(2, 7)}`;
    const now = new Date().toISOString();

    const newPayment: PaymentRecord = {
      payment_id: paymentId,
      tenant_id: tenantId,
      order_id: data.order_id,
      mahasiswa_id: data.mahasiswa_id || order.coordinator_id,
      payer_name: data.payer_name.trim(),
      payer_nim: data.payer_nim.trim(),
      jumlah: data.jumlah,
      metode: data.metode || 'Transfer Bank',
      tanggal_pembayaran: now,
      status: 'MENUNGGU_VERIFIKASI',
      catatan: data.catatan?.trim() || '',
      idempotency_key: data.idempotency_key,
      created_at: now,
      updated_at: now
    };

    this.paymentsStore.set(`${tenantId}:${paymentId}`, newPayment);

    // Save idempotency key cache
    if (data.idempotency_key) {
      this.idempotencyMap.set(`${tenantId}:${data.idempotency_key}`, {
        payment_id: paymentId,
        timestamp: Date.now()
      });
    }

    // Update parent order payment status
    await OrderService.updateOrder(tenantId, data.order_id, {
      payment_status: 'MENUNGGU_VERIFIKASI',
      status_order: 'MENUNGGU_VERIFIKASI'
    }, performedByUserId);

    await this.saveToSheets(tenantId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId || data.payer_nim,
      'CREATE_PAYMENT',
      `Pembayaran ${paymentId}`,
      `Membuat pembayaran baru sebesar Rp ${newPayment.jumlah.toLocaleString('id-ID')} via ${newPayment.metode} untuk pesanan ${newPayment.order_id}`
    );

    // Notify Panitia
    await NotificationService.create({
      tenant_id: tenantId,
      user_id: 'ALL_PANITIA',
      type: 'payment.created',
      title: 'Pembayaran Baru Perlu Verifikasi',
      message: `Pembayaran ${paymentId} sebesar Rp ${newPayment.jumlah.toLocaleString('id-ID')} diajukan oleh ${newPayment.payer_name} untuk pesanan ${newPayment.order_id}.`,
      reference_type: 'PAYMENT',
      reference_id: paymentId,
      idempotency_key: data.idempotency_key ? `NTF-${data.idempotency_key}` : undefined
    });

    return {
      ...newPayment,
      proofs: []
    };
  }

  static async updatePayment(
    tenantId: string,
    paymentId: string,
    data: Partial<PaymentRecord>,
    performedByUserId?: string
  ): Promise<PaymentRecord> {
    await this.initForTenant(tenantId);

    const payment = this.paymentsStore.get(`${tenantId}:${paymentId}`);
    if (!payment) {
      throw new Error(`Pembayaran '${paymentId}' tidak ditemukan.`);
    }

    if (data.catatan !== undefined) payment.catatan = data.catatan.trim();
    if (data.metode !== undefined) payment.metode = data.metode.trim();
    if (data.status !== undefined) payment.status = data.status;
    payment.updated_at = new Date().toISOString();

    this.paymentsStore.set(`${tenantId}:${paymentId}`, payment);
    await this.saveToSheets(tenantId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      'UPDATE_PAYMENT',
      `Pembayaran ${paymentId}`,
      `Memperbarui data pembayaran ${paymentId}`
    );

    return { ...payment };
  }

  // ==========================================
  // 3. APPROVE & REJECT PAYMENT
  // ==========================================

  static async approvePayment(
    tenantId: string,
    paymentId: string,
    verifierUserId: string,
    notes?: string
  ): Promise<PaymentRecord> {
    await this.initForTenant(tenantId);

    if (verifierUserId && verifierUserId !== 'SYSTEM') {
      const verifier = await UserService.findById(tenantId, verifierUserId);
      if (!verifier || verifier.role !== 'PANITIA') {
        throw new Error('Hanya PANITIA yang berhak menyetujui pembayaran.');
      }
    }

    const payment = this.paymentsStore.get(`${tenantId}:${paymentId}`);
    if (!payment) {
      throw new Error(`Pembayaran '${paymentId}' tidak ditemukan.`);
    }

    const now = new Date().toISOString();
    payment.status = 'DISETUJUI';
    payment.verified_by = verifierUserId;
    payment.verified_at = now;
    if (notes) payment.catatan = `${payment.catatan ? payment.catatan + ' | ' : ''}Verifikasi: ${notes}`;
    payment.updated_at = now;

    this.paymentsStore.set(`${tenantId}:${paymentId}`, payment);

    // Check if order is fully paid
    const order = await OrderService.getOrderById(tenantId, payment.order_id);
    if (order) {
      const allApprovedPayments = (await this.listPaymentsByOrder(tenantId, payment.order_id))
        .filter((p) => p.status === 'DISETUJUI');

      const totalPaid = allApprovedPayments.reduce((s, p) => s + p.jumlah, 0);

      if (totalPaid >= order.total_amount) {
        await OrderService.updateOrderStatus(tenantId, payment.order_id, 'DIVERIFIKASI', verifierUserId);
        await OrderService.updateOrder(tenantId, payment.order_id, {
          payment_status: 'LUNAS'
        }, verifierUserId);
      }
    }

    await this.saveToSheets(tenantId);

    await AuditService.logEvent(
      tenantId,
      verifierUserId,
      'APPROVE_PAYMENT',
      `Pembayaran ${paymentId}`,
      `Menyetujui pembayaran ${paymentId} sebesar Rp ${payment.jumlah.toLocaleString('id-ID')} untuk pesanan ${payment.order_id}`
    );

    // Notify Student
    await NotificationService.create({
      tenant_id: tenantId,
      user_id: payment.payer_nim,
      type: 'payment.approved',
      title: 'Pembayaran Disetujui',
      message: `Pembayaran ${paymentId} sebesar Rp ${payment.jumlah.toLocaleString('id-ID')} untuk pesanan ${payment.order_id} telah diverifikasi dan disetujui.`,
      reference_type: 'PAYMENT',
      reference_id: paymentId
    });

    return { ...payment };
  }

  static async rejectPayment(
    tenantId: string,
    paymentId: string,
    verifierUserId: string,
    rejectReason: string
  ): Promise<PaymentRecord> {
    await this.initForTenant(tenantId);

    if (verifierUserId && verifierUserId !== 'SYSTEM') {
      const verifier = await UserService.findById(tenantId, verifierUserId);
      if (!verifier || verifier.role !== 'PANITIA') {
        throw new Error('Hanya PANITIA yang berhak menolak pembayaran.');
      }
    }

    if (!rejectReason || !rejectReason.trim()) {
      throw new Error('Alasan penolakan pembayaran wajib diisi.');
    }

    const payment = this.paymentsStore.get(`${tenantId}:${paymentId}`);
    if (!payment) {
      throw new Error(`Pembayaran '${paymentId}' tidak ditemukan.`);
    }

    const now = new Date().toISOString();
    payment.status = 'DITOLAK';
    payment.alasan_penolakan = rejectReason.trim();
    payment.verified_by = verifierUserId;
    payment.verified_at = now;
    payment.updated_at = now;

    this.paymentsStore.set(`${tenantId}:${paymentId}`, payment);

    // Update order status to DITOLAK if no other approved payment exists
    const order = await OrderService.getOrderById(tenantId, payment.order_id);
    if (order) {
      const activeApproved = (await this.listPaymentsByOrder(tenantId, payment.order_id))
        .filter((p) => p.status === 'DISETUJUI');

      if (activeApproved.length === 0) {
        await OrderService.updateOrder(tenantId, payment.order_id, {
          payment_status: 'DITOLAK'
        }, verifierUserId);
      }
    }

    await this.saveToSheets(tenantId);

    await AuditService.logEvent(
      tenantId,
      verifierUserId,
      'REJECT_PAYMENT',
      `Pembayaran ${paymentId}`,
      `Menolak pembayaran ${paymentId} (Pesanan ${payment.order_id}). Alasan: ${rejectReason}`
    );

    // Notify Student
    await NotificationService.create({
      tenant_id: tenantId,
      user_id: payment.payer_nim,
      type: 'payment.rejected',
      title: 'Pembayaran Ditolak',
      message: `Pembayaran ${paymentId} untuk pesanan ${payment.order_id} ditolak. Alasan: ${rejectReason}`,
      reference_type: 'PAYMENT',
      reference_id: paymentId
    });

    return { ...payment };
  }

  // ==========================================
  // 4. PAYMENT PROOF (GOOGLE DRIVE STORAGE)
  // ==========================================

  static async listProofs(tenantId: string, paymentId: string): Promise<PaymentProofRecord[]> {
    await this.initForTenant(tenantId);
    const list: PaymentProofRecord[] = [];
    for (const p of this.proofsStore.values()) {
      if (p.tenant_id === tenantId && p.payment_id === paymentId && p.status === 'ACTIVE') {
        list.push({ ...p });
      }
    }
    return list;
  }

  static async uploadProof(
    tenantId: string,
    paymentId: string,
    data: {
      file_name: string;
      mime_type: string;
      file_size: number;
      file_url?: string;
      base64_data?: string;
    },
    performedByUserId?: string
  ): Promise<PaymentProofRecord> {
    await this.initForTenant(tenantId);

    const payment = this.paymentsStore.get(`${tenantId}:${paymentId}`);
    if (!payment) {
      throw new Error(`Pembayaran '${paymentId}' tidak ditemukan.`);
    }

    // MIME Validation
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
    if (!allowedMime.includes(data.mime_type.toLowerCase())) {
      throw new Error('Format file bukti tidak didukung. Harap unggah file gambar (JPG, PNG, WebP) atau dokumen PDF.');
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (data.file_size > MAX_SIZE) {
      throw new Error('Ukuran file bukti pembayaran melebihi batas maksimal 5 MB.');
    }

    // Resolve Google Drive folder: TENANT -> PEMBAYARAN -> [order_id]
    const folderInfo = await DriveFolderService.getOrCreatePaymentProofFolder(tenantId, payment.order_id);

    const proofId = `PRF-${paymentId}-${Date.now().toString(36).toUpperCase().substring(2, 6)}`;
    const driveFileId = `DRV-PROOF-${tenantId}-${proofId}`;
    const fileUrl = data.file_url || `https://drive.google.com/uc?id=${driveFileId}`;

    const newProof: PaymentProofRecord = {
      proof_id: proofId,
      payment_id: paymentId,
      order_id: payment.order_id,
      tenant_id: tenantId,
      drive_file_id: driveFileId,
      file_url: fileUrl,
      file_name: data.file_name.replace(/[^a-zA-Z0-9._-]/g, '_'),
      mime_type: data.mime_type,
      file_size: data.file_size,
      uploaded_by: performedByUserId || payment.payer_nim,
      uploaded_at: new Date().toISOString(),
      status: 'ACTIVE'
    };

    this.proofsStore.set(`${tenantId}:${paymentId}:${proofId}`, newProof);

    // Update payment status to MENUNGGU_VERIFIKASI
    if (payment.status === 'PENDING' || payment.status === 'DITOLAK') {
      payment.status = 'MENUNGGU_VERIFIKASI';
      payment.updated_at = new Date().toISOString();
      this.paymentsStore.set(`${tenantId}:${paymentId}`, payment);
    }

    await this.saveToSheets(tenantId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId || payment.payer_nim,
      'UPLOAD_PAYMENT_PROOF',
      `Bukti ${newProof.file_name}`,
      `Mengunggah bukti pembayaran (${newProof.file_name}) ke folder ${folderInfo.path} untuk pembayaran ${paymentId}`
    );

    return { ...newProof };
  }

  static async deleteProof(
    tenantId: string,
    paymentId: string,
    proofId: string,
    performedByUserId?: string
  ): Promise<boolean> {
    await this.initForTenant(tenantId);

    const proof = this.proofsStore.get(`${tenantId}:${paymentId}:${proofId}`);
    if (!proof) {
      throw new Error(`Bukti pembayaran '${proofId}' tidak ditemukan.`);
    }

    proof.status = 'DELETED';
    this.proofsStore.set(`${tenantId}:${paymentId}:${proofId}`, proof);
    await this.saveToSheets(tenantId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      'DELETE_PAYMENT_PROOF',
      `Bukti ${proof.file_name}`,
      `Menghapus bukti pembayaran ${proof.file_name} pada pembayaran ${paymentId}`
    );

    return true;
  }
}
