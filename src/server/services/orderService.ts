// Order and Order Members Service Layer (Multi-tenant - Google Sheets Persistent)
import { Role, OrderType } from '../../types/index.ts';
import { AuditService } from './auditService.ts';
import { StudentService } from './studentService.ts';
import { PDHService } from './pdhService.ts';
import { NotificationService } from './notificationService.ts';
import { GoogleSheetsService } from './googleSheetsService.ts';
import { GoogleAuthService } from './googleAuthService.ts';
import { getTenantById } from '../config/tenants.ts';

export type OrderStatus =
  | 'DRAFT'
  | 'MENUNGGU_PEMBAYARAN'
  | 'MENUNGGU_VERIFIKASI'
  | 'DIVERIFIKASI'
  | 'PRODUKSI'
  | 'SELESAI'
  | 'BATAL';

export interface OrderMemberRecord {
  member_id: string;
  order_id: string;
  tenant_id: string;
  mahasiswa_id?: string;
  nama_lengkap: string;
  nim: string;
  kelas: string;
  ukuran: string;
  custom_name?: string;
  unit_price: number;
  extra_fee: number;
  subtotal: number;
  jumlah: number;
  status: 'ACTIVE' | 'CANCELLED';
  created_at: string;
  updated_at: string;
}

export interface OrderRecord {
  order_id: string;
  tenant_id: string;
  periode_id: string;
  produk_id: string;
  order_type: OrderType;
  order_number: string;
  coordinator_id?: string;
  coordinator_name: string;
  coordinator_nim: string;
  coordinator_class: string;
  coordinator_phone: string;
  total_qty: number;
  total_amount: number;
  status_order: OrderStatus;
  payment_status: 'BELUM_BAYAR' | 'MENUNGGU_VERIFIKASI' | 'LUNAS' | 'DITOLAK';
  production_status: 'Belum Diproduksi' | 'Sedang Diproduksi' | 'Selesai' | 'Siap Diambil';
  production_percentage: number;
  pickup_status: 'Belum Siap Diambil' | 'Siap Diambil' | 'Sudah Diambil';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderFilterOptions {
  status?: string;
  periode_id?: string;
  class_name?: string;
  coordinator_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class OrderService {
  private static ordersStore: Map<string, OrderRecord> = new Map();
  private static membersStore: Map<string, OrderMemberRecord> = new Map();
  private static initializedTenants: Set<string> = new Set();
  private static lastLoadedAt: Map<string, number> = new Map();
  private static CACHE_TTL_MS = Number(process.env.CACHE_TTL_ORDER_MS) || 10000;

  static invalidateCache(tenantId?: string): void {
    if (tenantId) {
      this.initializedTenants.delete(tenantId);
      this.lastLoadedAt.delete(tenantId);
      for (const [key, o] of this.ordersStore.entries()) {
        if (o.tenant_id === tenantId) this.ordersStore.delete(key);
      }
      for (const [key, m] of this.membersStore.entries()) {
        if (m.tenant_id === tenantId) this.membersStore.delete(key);
      }
    } else {
      this.initializedTenants.clear();
      this.lastLoadedAt.clear();
      this.ordersStore.clear();
      this.membersStore.clear();
    }
  }

  /**
   * Loads orders and order members from Google Sheets for the specified tenant.
   */
  private static async loadFromSheets(tenantId: string): Promise<boolean> {
    const tenant = getTenantById(tenantId);
    if (!tenant || !tenant.spreadsheet_id) {
      return false;
    }
    try {
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'Orders');
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'OrderMembers');

      // 1. Read Orders
      const orderRows = await GoogleSheetsService.getValues(tenant.spreadsheet_id, 'Orders!A2:U');
      const memberRows = await GoogleSheetsService.getValues(tenant.spreadsheet_id, 'OrderMembers!A2:P');

      if ((!orderRows || orderRows.length === 0) && (!memberRows || memberRows.length === 0)) {
        return false;
      }

      // Clear cached orders for this tenant
      for (const [key, order] of this.ordersStore.entries()) {
        if (order.tenant_id === tenantId) {
          this.ordersStore.delete(key);
        }
      }
      if (orderRows && orderRows.length > 0) {
        for (const row of orderRows) {
          if (!row[0]) continue;
          const order: OrderRecord = {
            order_id: String(row[0]),
            tenant_id: String(row[1] || tenantId),
            periode_id: String(row[2] || ''),
            produk_id: String(row[3] || ''),
            order_type: (row[4] || 'KOLEKTIF') as OrderType,
            order_number: String(row[5] || ''),
            coordinator_id: row[6] ? String(row[6]) : undefined,
            coordinator_name: String(row[7] || ''),
            coordinator_nim: String(row[8] || ''),
            coordinator_class: String(row[9] || ''),
            coordinator_phone: String(row[10] || ''),
            total_qty: Number(row[11] || 0),
            total_amount: Number(row[12] || 0),
            status_order: (row[13] || 'DRAFT') as OrderStatus,
            payment_status: (row[14] || 'BELUM_BAYAR') as any,
            production_status: (row[15] || 'Belum Diproduksi') as any,
            production_percentage: Number(row[16] || 0),
            pickup_status: (row[17] || 'Belum Siap Diambil') as any,
            notes: row[18] ? String(row[18]) : undefined,
            created_at: String(row[19] || new Date().toISOString()),
            updated_at: String(row[20] || new Date().toISOString())
          };
          this.ordersStore.set(`${tenantId}:${order.order_id}`, order);
        }
      }

      // Clear cached members for this tenant
      for (const [key, m] of this.membersStore.entries()) {
        if (m.tenant_id === tenantId) {
          this.membersStore.delete(key);
        }
      }
      if (memberRows && memberRows.length > 0) {
        for (const row of memberRows) {
          if (!row[0]) continue;
          const member: OrderMemberRecord = {
            member_id: String(row[0]),
            order_id: String(row[1]),
            tenant_id: String(row[2] || tenantId),
            mahasiswa_id: row[3] ? String(row[3]) : undefined,
            nama_lengkap: String(row[4] || ''),
            nim: String(row[5] || ''),
            kelas: String(row[6] || ''),
            ukuran: String(row[7] || ''),
            custom_name: row[8] ? String(row[8]) : undefined,
            unit_price: Number(row[9] || 0),
            extra_fee: Number(row[10] || 0),
            subtotal: Number(row[11] || 0),
            jumlah: Number(row[12] || 0),
            status: (row[13] || 'ACTIVE') as any,
            created_at: String(row[14] || new Date().toISOString()),
            updated_at: String(row[15] || new Date().toISOString())
          };
          this.membersStore.set(`${tenantId}:${member.order_id}:${member.member_id}`, member);
        }
      }
      return true;
    } catch (err: any) {
      console.warn(`[OrderService] Gagal memuat orders dari Google Sheets untuk tenant ${tenantId}:`, err.message || err);
      return false;
    }
  }

  /**
   * Saves orders and order members of the specified tenant back to Google Sheets.
   */
  private static async saveToSheets(tenantId: string): Promise<void> {
    const tenant = getTenantById(tenantId);
    if (!tenant || !tenant.spreadsheet_id) {
      return;
    }
    try {
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'Orders');
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'OrderMembers');

      const tenantOrders = Array.from(this.ordersStore.values()).filter(o => o.tenant_id === tenantId);
      const tenantMembers = Array.from(this.membersStore.values()).filter(m => m.tenant_id === tenantId);

      // Orders Headers & Rows
      const orderHeaders = [
        'order_id', 'tenant_id', 'periode_id', 'produk_id', 'order_type', 'order_number', 'coordinator_id',
        'coordinator_name', 'coordinator_nim', 'coordinator_class', 'coordinator_phone', 'total_qty',
        'total_amount', 'status_order', 'payment_status', 'production_status', 'production_percentage',
        'pickup_status', 'notes', 'created_at', 'updated_at'
      ];
      const orderRows = tenantOrders.map(o => [
        o.order_id, o.tenant_id, o.periode_id, o.produk_id, o.order_type, o.order_number, o.coordinator_id || '',
        o.coordinator_name, o.coordinator_nim, o.coordinator_class, o.coordinator_phone, o.total_qty,
        o.total_amount, o.status_order, o.payment_status, o.production_status, o.production_percentage,
        o.pickup_status, o.notes || '', o.created_at, o.updated_at
      ]);
      const orderValues = [orderHeaders, ...orderRows];
      await GoogleSheetsService.updateValues(tenant.spreadsheet_id, `Orders!A1:U${orderValues.length}`, orderValues);

      // Members Headers & Rows
      const memberHeaders = [
        'member_id', 'order_id', 'tenant_id', 'mahasiswa_id', 'nama_lengkap', 'nim', 'kelas', 'ukuran',
        'custom_name', 'unit_price', 'extra_fee', 'subtotal', 'jumlah', 'status', 'created_at', 'updated_at'
      ];
      const memberRows = tenantMembers.map(m => [
        m.member_id, m.order_id, m.tenant_id, m.mahasiswa_id || '', m.nama_lengkap, m.nim, m.kelas, m.ukuran,
        m.custom_name || '', m.unit_price, m.extra_fee, m.subtotal, m.jumlah, m.status, m.created_at, m.updated_at
      ]);
      const memberValues = [memberHeaders, ...memberRows];
      await GoogleSheetsService.updateValues(tenant.spreadsheet_id, `OrderMembers!A1:P${memberValues.length}`, memberValues);
    } catch (err: any) {
      console.error(`[OrderService] Gagal menyimpan orders ke Google Sheets untuk tenant ${tenantId}:`, err.message || err);
    }
  }

  /**
   * Initializes the OrderService cache for the specified tenant.
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
        console.log(`[OrderService] Sheet 'Orders'/'OrderMembers' kosong atau gagal dibaca untuk tenant ${tenantId}. Mengunggah seed baseline ke Google Sheets...`);
        await this.saveToSheets(tenantId);
      }
    }

    this.lastLoadedAt.set(tenantId, Date.now());
    this.initializedTenants.add(tenantId);
  }

  private static seedBaseline(tenantId: string) {
    const now = new Date().toISOString();

    // 1. Baseline Order 1: Kolektif Kelas 22MJSP001 (Coordinator: Ahmad Mahasiswa)
    const order1: OrderRecord = {
      order_id: 'ORD-2026-001',
      tenant_id: tenantId,
      periode_id: 'PO-2026-GEL1',
      produk_id: 'PRD-PDH-2026',
      order_type: 'KOLEKTIF',
      order_number: 'PO-2026-001',
      coordinator_id: 'MHS-22MJSP001',
      coordinator_name: 'Ahmad Mahasiswa',
      coordinator_nim: '22MJSP001',
      coordinator_class: '22MJSP001',
      coordinator_phone: '081234567890',
      total_qty: 3,
      total_amount: 560000,
      status_order: 'DIVERIFIKASI',
      payment_status: 'LUNAS',
      production_status: 'Sedang Diproduksi',
      production_percentage: 45,
      pickup_status: 'Belum Siap Diambil',
      notes: 'Pesanan kolektif kelas 22MJSP001 gelombang 1',
      created_at: now,
      updated_at: now
    };

    // Members of Order 1
    const membersOrder1: OrderMemberRecord[] = [
      { member_id: 'MBR-ORD-001-01', order_id: 'ORD-2026-001', tenant_id: tenantId, mahasiswa_id: 'MHS-22MJSP001', nama_lengkap: 'Ahmad Mahasiswa', nim: '22MJSP001', kelas: '22MJSP001', ukuran: 'L', custom_name: 'AHMAD M.', unit_price: 185000, extra_fee: 0, subtotal: 185000, jumlah: 1, status: 'ACTIVE', created_at: now, updated_at: now },
      { member_id: 'MBR-ORD-001-02', order_id: 'ORD-2026-001', tenant_id: tenantId, mahasiswa_id: 'MHS-22MJSP002', nama_lengkap: 'Budi Santoso', nim: '22MJSP002', kelas: '22MJSP001', ukuran: 'XL', custom_name: 'BUDI S.', unit_price: 185000, extra_fee: 5000, subtotal: 190000, jumlah: 1, status: 'ACTIVE', created_at: now, updated_at: now },
      { member_id: 'MBR-ORD-001-03', order_id: 'ORD-2026-001', tenant_id: tenantId, nama_lengkap: 'Siti Aminah', nim: '22MJSP003', kelas: '22MJSP001', ukuran: 'M', custom_name: 'SITI A.', unit_price: 185000, extra_fee: 0, subtotal: 185000, jumlah: 1, status: 'ACTIVE', created_at: now, updated_at: now }
    ];

    // 2. Baseline Order 2: Multi-Order Koordinator (Ahmad Mahasiswa order kedua)
    const order2: OrderRecord = {
      order_id: 'ORD-2026-002',
      tenant_id: tenantId,
      periode_id: 'PO-2026-GEL1',
      produk_id: 'PRD-PDH-2026',
      order_type: 'PRIBADI',
      order_number: 'PO-2026-002',
      coordinator_id: 'MHS-22MJSP001',
      coordinator_name: 'Ahmad Mahasiswa',
      coordinator_nim: '22MJSP001',
      coordinator_class: '22MJSP001',
      coordinator_phone: '081234567890',
      total_qty: 1,
      total_amount: 185000,
      status_order: 'PRODUKSI',
      payment_status: 'LUNAS',
      production_status: 'Sedang Diproduksi',
      production_percentage: 60,
      pickup_status: 'Belum Siap Diambil',
      notes: 'Pesanan tambahan pribadi',
      created_at: now,
      updated_at: now
    };

    const membersOrder2: OrderMemberRecord[] = [
      { member_id: 'MBR-ORD-002-01', order_id: 'ORD-2026-002', tenant_id: tenantId, mahasiswa_id: 'MHS-22MJSP001', nama_lengkap: 'Ahmad Mahasiswa', nim: '22MJSP001', kelas: '22MJSP001', ukuran: 'L', custom_name: 'AHMAD (2)', unit_price: 185000, extra_fee: 0, subtotal: 185000, jumlah: 1, status: 'ACTIVE', created_at: now, updated_at: now }
    ];

    // 3. Baseline Order 3: Budi Santoso (Coordinator)
    const order3: OrderRecord = {
      order_id: 'ORD-2026-003',
      tenant_id: tenantId,
      periode_id: 'PO-2026-GEL1',
      produk_id: 'PRD-PDH-2026',
      order_type: 'KOLEKTIF',
      order_number: 'PO-2026-003',
      coordinator_id: 'MHS-22MJSP002',
      coordinator_name: 'Budi Santoso',
      coordinator_nim: '22MJSP002',
      coordinator_class: '22MJSP001',
      coordinator_phone: '081298765432',
      total_qty: 2,
      total_amount: 375000,
      status_order: 'MENUNGGU_PEMBAYARAN',
      payment_status: 'BELUM_BAYAR',
      production_status: 'Belum Diproduksi',
      production_percentage: 0,
      pickup_status: 'Belum Siap Diambil',
      notes: 'Kolektif kelompok 2',
      created_at: now,
      updated_at: now
    };

    const membersOrder3: OrderMemberRecord[] = [
      { member_id: 'MBR-ORD-003-01', order_id: 'ORD-2026-003', tenant_id: tenantId, mahasiswa_id: 'MHS-22MJSP002', nama_lengkap: 'Budi Santoso', nim: '22MJSP002', kelas: '22MJSP001', ukuran: 'XL', custom_name: 'BUDI S.', unit_price: 185000, extra_fee: 5000, subtotal: 190000, jumlah: 1, status: 'ACTIVE', created_at: now, updated_at: now },
      { member_id: 'MBR-ORD-003-02', order_id: 'ORD-2026-003', tenant_id: tenantId, nama_lengkap: 'Rian Pratama', nim: '22MJSP004', kelas: '22MJSP001', ukuran: 'S', custom_name: 'RIAN P.', unit_price: 185000, extra_fee: 0, subtotal: 185000, jumlah: 1, status: 'ACTIVE', created_at: now, updated_at: now }
    ];

    // Store orders if not present
    if (!this.ordersStore.has(`${tenantId}:${order1.order_id}`)) {
      this.ordersStore.set(`${tenantId}:${order1.order_id}`, order1);
    }
    if (!this.ordersStore.has(`${tenantId}:${order2.order_id}`)) {
      this.ordersStore.set(`${tenantId}:${order2.order_id}`, order2);
    }
    if (!this.ordersStore.has(`${tenantId}:${order3.order_id}`)) {
      this.ordersStore.set(`${tenantId}:${order3.order_id}`, order3);
    }

    // Store members if not present
    for (const m of [...membersOrder1, ...membersOrder2, ...membersOrder3]) {
      const key = `${tenantId}:${m.order_id}:${m.member_id}`;
      if (!this.membersStore.has(key)) {
        this.membersStore.set(key, m);
      }
    }
  }

  // ==========================================
  // 1. ORDER LIST & QUERYING
  // ==========================================

  static async listOrders(tenantId: string, options: OrderFilterOptions = {}): Promise<{
    orders: OrderRecord[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    await this.initForTenant(tenantId);

    let list: OrderRecord[] = [];
    for (const order of this.ordersStore.values()) {
      if (order.tenant_id !== tenantId) continue;

      // Filter: Status
      if (options.status && order.status_order.toUpperCase() !== options.status.toUpperCase()) {
        continue;
      }

      // Filter: Periode
      if (options.periode_id && order.periode_id !== options.periode_id) {
        continue;
      }

      // Filter: Class
      if (options.class_name && order.coordinator_class.toUpperCase() !== options.class_name.toUpperCase()) {
        continue;
      }

      // Filter: Coordinator ID / NIM
      if (options.coordinator_id) {
        const cId = options.coordinator_id.toLowerCase();
        if (
          (order.coordinator_id && order.coordinator_id.toLowerCase() === cId) ||
          order.coordinator_nim.toLowerCase() === cId
        ) {
          // Matched
        } else {
          continue;
        }
      }

      // Search Query (Search across order_id, order_number, coordinator_name, coordinator_nim)
      if (options.search) {
        const query = options.search.toLowerCase();
        const matches =
          order.order_id.toLowerCase().includes(query) ||
          order.order_number.toLowerCase().includes(query) ||
          order.coordinator_name.toLowerCase().includes(query) ||
          order.coordinator_nim.toLowerCase().includes(query) ||
          order.coordinator_class.toLowerCase().includes(query);

        if (!matches) continue;
      }

      list.push({ ...order });
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = list.length;
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 50);
    const totalPages = Math.ceil(total / limit) || 1;

    const startIndex = (page - 1) * limit;
    const paginatedOrders = list.slice(startIndex, startIndex + limit);

    return {
      orders: paginatedOrders,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    };
  }

  static async getOrderById(tenantId: string, orderId: string): Promise<(OrderRecord & { members: OrderMemberRecord[] }) | null> {
    await this.initForTenant(tenantId);

    const order = this.ordersStore.get(`${tenantId}:${orderId}`);
    if (!order) return null;

    const members = await this.listMembers(tenantId, orderId);

    return {
      ...order,
      members
    };
  }

  // ==========================================
  // 2. STUDENT ORDER HISTORY
  // ==========================================

  static async listOrdersByStudent(tenantId: string, studentIdentifier: string): Promise<OrderRecord[]> {
    await this.initForTenant(tenantId);
    const cleanId = String(studentIdentifier || '').trim().toLowerCase();
    if (!cleanId) return [];

    const matchedOrderIds = new Set<string>();

    // 1. Match where student is the coordinator
    for (const order of this.ordersStore.values()) {
      if (order.tenant_id !== tenantId) continue;
      if (
        (order.coordinator_id && order.coordinator_id.toLowerCase() === cleanId) ||
        order.coordinator_nim.toLowerCase() === cleanId
      ) {
        matchedOrderIds.add(order.order_id);
      }
    }

    // 2. Match where student is listed in order members
    for (const member of this.membersStore.values()) {
      if (member.tenant_id !== tenantId) continue;
      if (
        (member.mahasiswa_id && member.mahasiswa_id.toLowerCase() === cleanId) ||
        member.nim.toLowerCase() === cleanId
      ) {
        matchedOrderIds.add(member.order_id);
      }
    }

    const result: OrderRecord[] = [];
    for (const orderId of matchedOrderIds) {
      const order = this.ordersStore.get(`${tenantId}:${orderId}`);
      if (order) result.push({ ...order });
    }

    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // ==========================================
  // 3. MULTI-ORDER KOORDINATOR SUMMARY
  // ==========================================

  static async getCoordinatorMultiOrderSummary(
    tenantId: string,
    coordinatorIdentifier: string
  ): Promise<{
    coordinator: {
      nim: string;
      nama_lengkap: string;
      kelas: string;
      no_wa: string;
    } | null;
    orders: (OrderRecord & { member_count: number })[];
    summary: {
      total_orders: number;
      total_members: number;
      total_quantity: number;
      total_amount: number;
    };
  }> {
    await this.initForTenant(tenantId);
    const cleanId = String(coordinatorIdentifier || '').trim().toLowerCase();

    const matchedOrders: (OrderRecord & { member_count: number })[] = [];
    let coordinatorInfo: { nim: string; nama_lengkap: string; kelas: string; no_wa: string } | null = null;

    let totalMembers = 0;
    let totalQuantity = 0;
    let totalAmount = 0;

    for (const order of this.ordersStore.values()) {
      if (order.tenant_id !== tenantId) continue;

      if (
        (order.coordinator_id && order.coordinator_id.toLowerCase() === cleanId) ||
        order.coordinator_nim.toLowerCase() === cleanId
      ) {
        const members = await this.listMembers(tenantId, order.order_id);
        const memberCount = members.length;

        if (!coordinatorInfo) {
          coordinatorInfo = {
            nim: order.coordinator_nim,
            nama_lengkap: order.coordinator_name,
            kelas: order.coordinator_class,
            no_wa: order.coordinator_phone
          };
        }

        matchedOrders.push({
          ...order,
          member_count: memberCount
        });

        totalMembers += memberCount;
        totalQuantity += order.total_qty;
        totalAmount += order.total_amount;
      }
    }

    return {
      coordinator: coordinatorInfo,
      orders: matchedOrders,
      summary: {
        total_orders: matchedOrders.length,
        total_members: totalMembers,
        total_quantity: totalQuantity,
        total_amount: totalAmount
      }
    };
  }

  // ==========================================
  // 4. CREATE, UPDATE & DELETE ORDER
  // ==========================================

  static async createOrder(
    tenantId: string,
    data: {
      order_id?: string;
      periode_id?: string;
      produk_id?: string;
      order_type?: OrderType;
      coordinator_name: string;
      coordinator_nim: string;
      coordinator_class: string;
      coordinator_phone: string;
      members: {
        nama_lengkap: string;
        nim: string;
        kelas?: string;
        ukuran: string;
        custom_name?: string;
        jumlah?: number;
      }[];
      notes?: string;
    },
    performedByUserId?: string
  ): Promise<OrderRecord & { members: OrderMemberRecord[] }> {
    await this.initForTenant(tenantId);

    if (!data.coordinator_name || !data.coordinator_nim || !data.coordinator_class) {
      throw new Error('Informasi koordinator (nama, NIM, kelas) wajib diisi.');
    }

    if (!data.members || data.members.length === 0) {
      throw new Error('Pesanan harus memiliki minimal satu anggota.');
    }

    const orderId = data.order_id || `ORD-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase().substring(2, 7)}`;
    const orderNumber = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const produkId = data.produk_id || 'PRD-PDH-2026';
    const periodeId = data.periode_id || 'PO-2026-GEL1';
    const now = new Date().toISOString();

    // Link coordinator to student if exists without duplicate student creation
    const existingStudent = await StudentService.getStudentByNim(tenantId, data.coordinator_nim);
    const coordinatorId = existingStudent?.mahasiswa_id || `MHS-${data.coordinator_nim.toUpperCase()}`;

    // Get current master product price
    const product = await PDHService.getProductById(tenantId, produkId);
    const basePrice = product?.harga || 185000;
    const sizes = await PDHService.listSizes(tenantId, produkId);

    let totalQty = 0;
    let totalAmount = 0;
    const createdMembers: OrderMemberRecord[] = [];

    data.members.forEach((m, index) => {
      const memberId = `MBR-${orderId}-${(index + 1).toString().padStart(2, '0')}`;
      const qty = m.jumlah || 1;
      const sizeObj = sizes.find((s) => s.kode_ukuran.toUpperCase() === m.ukuran.toUpperCase());
      const extraFee = sizeObj?.extra_fee || 0;
      const subtotal = (basePrice + extraFee) * qty;

      totalQty += qty;
      totalAmount += subtotal;

      const memberRecord: OrderMemberRecord = {
        member_id: memberId,
        order_id: orderId,
        tenant_id: tenantId,
        nama_lengkap: m.nama_lengkap.trim(),
        nim: m.nim.trim(),
        kelas: m.kelas?.trim() || data.coordinator_class.trim(),
        ukuran: m.ukuran.trim().toUpperCase(),
        custom_name: m.custom_name?.trim() || m.nama_lengkap.trim(),
        unit_price: basePrice,
        extra_fee: extraFee,
        subtotal: subtotal,
        jumlah: qty,
        status: 'ACTIVE',
        created_at: now,
        updated_at: now
      };

      this.membersStore.set(`${tenantId}:${orderId}:${memberId}`, memberRecord);
      createdMembers.push(memberRecord);
    });

    const newOrder: OrderRecord = {
      order_id: orderId,
      tenant_id: tenantId,
      periode_id: periodeId,
      produk_id: produkId,
      order_type: data.order_type || (data.members.length > 1 ? 'KOLEKTIF' : 'PRIBADI'),
      order_number: orderNumber,
      coordinator_id: coordinatorId,
      coordinator_name: data.coordinator_name.trim(),
      coordinator_nim: data.coordinator_nim.trim(),
      coordinator_class: data.coordinator_class.trim(),
      coordinator_phone: data.coordinator_phone?.trim() || '',
      total_qty: totalQty,
      total_amount: totalAmount,
      status_order: 'MENUNGGU_PEMBAYARAN',
      payment_status: 'BELUM_BAYAR',
      production_status: 'Belum Diproduksi',
      production_percentage: 0,
      pickup_status: 'Belum Siap Diambil',
      notes: data.notes?.trim() || '',
      created_at: now,
      updated_at: now
    };

    this.ordersStore.set(`${tenantId}:${orderId}`, newOrder);
    await this.saveToSheets(tenantId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId || data.coordinator_nim,
      'CREATE_ORDER',
      `Pesanan ${newOrder.order_id}`,
      `Membuat pesanan baru (${newOrder.order_type}): ${newOrder.total_qty} baju, Total Rp ${newOrder.total_amount.toLocaleString('id-ID')} (Koordinator: ${newOrder.coordinator_name})`
    );

    // Notify Student
    await NotificationService.create({
      tenant_id: tenantId,
      user_id: newOrder.coordinator_nim,
      type: 'order.created',
      title: 'Pesanan Berhasil Dibuat',
      message: `Pesanan PDH ${newOrder.order_id} berhasil diajukan dengan total ${newOrder.total_qty} stel. Silakan selesaikan pembayaran.`,
      reference_type: 'ORDER',
      reference_id: newOrder.order_id
    });

    // Notify Panitia
    await NotificationService.create({
      tenant_id: tenantId,
      user_id: 'ALL_PANITIA',
      type: 'order.created',
      title: 'Pesanan Baru Masuk',
      message: `Pesanan baru ${newOrder.order_id} dibuat oleh ${newOrder.coordinator_name} (${newOrder.coordinator_class}).`,
      reference_type: 'ORDER',
      reference_id: newOrder.order_id
    });

    return {
      ...newOrder,
      members: createdMembers
    };
  }

  static async updateOrder(
    tenantId: string,
    orderId: string,
    data: Partial<OrderRecord>,
    performedByUserId?: string
  ): Promise<OrderRecord> {
    await this.initForTenant(tenantId);

    const order = this.ordersStore.get(`${tenantId}:${orderId}`);
    if (!order) {
      throw new Error(`Pesanan '${orderId}' tidak ditemukan.`);
    }

    if (data.coordinator_name !== undefined) order.coordinator_name = data.coordinator_name.trim();
    if (data.coordinator_phone !== undefined) order.coordinator_phone = data.coordinator_phone.trim();
    if (data.coordinator_class !== undefined) order.coordinator_class = data.coordinator_class.trim();
    if (data.notes !== undefined) order.notes = data.notes.trim();
    if (data.production_percentage !== undefined) order.production_percentage = data.production_percentage;
    if (data.production_status !== undefined) order.production_status = data.production_status;
    if (data.status_order !== undefined) order.status_order = data.status_order;
    if (data.pickup_status !== undefined) order.pickup_status = data.pickup_status;
    if (data.payment_status !== undefined) order.payment_status = data.payment_status;
    if (data.total_qty !== undefined) order.total_qty = data.total_qty;
    if (data.total_amount !== undefined) order.total_amount = data.total_amount;
    order.updated_at = new Date().toISOString();

    this.ordersStore.set(`${tenantId}:${orderId}`, order);
    await this.saveToSheets(tenantId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      'UPDATE_ORDER',
      `Pesanan ${order.order_id}`,
      `Memperbarui informasi pesanan ${order.order_id}`
    );

    return { ...order };
  }

  static async deleteOrder(tenantId: string, orderId: string, performedByUserId?: string): Promise<boolean> {
    await this.initForTenant(tenantId);

    const order = this.ordersStore.get(`${tenantId}:${orderId}`);
    if (!order) {
      throw new Error(`Pesanan '${orderId}' tidak ditemukan.`);
    }

    order.status_order = 'BATAL';
    order.updated_at = new Date().toISOString();
    this.ordersStore.set(`${tenantId}:${orderId}`, order);
    await this.saveToSheets(tenantId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      'DELETE_ORDER',
      `Pesanan ${order.order_id}`,
      `Membatalkan pesanan ${order.order_id}`
    );

    return true;
  }

  // ==========================================
  // 5. STATUS & BULK STATUS UPDATE
  // ==========================================

  static async updateOrderStatus(
    tenantId: string,
    orderId: string,
    newStatus: OrderStatus,
    performedByUserId?: string
  ): Promise<OrderRecord> {
    await this.initForTenant(tenantId);

    const order = this.ordersStore.get(`${tenantId}:${orderId}`);
    if (!order) {
      throw new Error(`Pesanan '${orderId}' tidak ditemukan.`);
    }

    const validStatuses: OrderStatus[] = [
      'DRAFT',
      'MENUNGGU_PEMBAYARAN',
      'MENUNGGU_VERIFIKASI',
      'DIVERIFIKASI',
      'PRODUKSI',
      'SELESAI',
      'BATAL'
    ];

    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Status '${newStatus}' tidak valid.`);
    }

    const oldStatus = order.status_order;
    order.status_order = newStatus;
    order.updated_at = new Date().toISOString();

    // Side-effects on sub-statuses
    if (newStatus === 'DIVERIFIKASI') {
      order.payment_status = 'LUNAS';
    } else if (newStatus === 'PRODUKSI') {
      order.production_status = 'Sedang Diproduksi';
    } else if (newStatus === 'SELESAI') {
      order.production_status = 'Selesai';
      order.production_percentage = 100;
      order.pickup_status = 'Siap Diambil';
    }

    this.ordersStore.set(`${tenantId}:${orderId}`, order);
    await this.saveToSheets(tenantId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      'UPDATE_ORDER_STATUS',
      `Pesanan ${order.order_id}`,
      `Mengubah status pesanan dari '${oldStatus}' menjadi '${newStatus}'`
    );

    await NotificationService.create({
      tenant_id: tenantId,
      user_id: order.coordinator_nim,
      type: 'order.status_changed',
      title: 'Status Pesanan Diperbarui',
      message: `Status pesanan ${order.order_id} telah berubah menjadi '${newStatus}'.`,
      reference_type: 'ORDER',
      reference_id: order.order_id
    });

    return { ...order };
  }

  static async bulkUpdateOrderStatus(
    tenantId: string,
    orderIds: string[],
    newStatus: OrderStatus,
    performedByUserId?: string
  ): Promise<{
    success: boolean;
    updated: string[];
    failed: { order_id: string; reason: string }[];
  }> {
    await this.initForTenant(tenantId);

    const updated: string[] = [];
    const failed: { order_id: string; reason: string }[] = [];

    for (const orderId of orderIds) {
      try {
        const order = this.ordersStore.get(`${tenantId}:${orderId}`);
        if (!order) {
          failed.push({ order_id: orderId, reason: 'Pesanan tidak ditemukan di tenant ini.' });
          continue;
        }

        await this.updateOrderStatus(tenantId, orderId, newStatus, performedByUserId);
        updated.push(orderId);
      } catch (err: any) {
        failed.push({ order_id: orderId, reason: err.message || 'Gagal mengubah status.' });
      }
    }

    await AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      'BULK_UPDATE_ORDER_STATUS',
      'Bulk Order Status',
      `Bulk update status ke '${newStatus}': ${updated.length} berhasil, ${failed.length} gagal.`
    );

    return {
      success: failed.length === 0,
      updated,
      failed
    };
  }

  // ==========================================
  // 6. ORDER MEMBERS MANAGEMENT
  // ==========================================

  static async listMembers(tenantId: string, orderId: string): Promise<OrderMemberRecord[]> {
    await this.initForTenant(tenantId);
    const result: OrderMemberRecord[] = [];
    for (const m of this.membersStore.values()) {
      if (m.tenant_id === tenantId && m.order_id === orderId && m.status === 'ACTIVE') {
        result.push({ ...m });
      }
    }
    return result;
  }

  static async addMember(
    tenantId: string,
    orderId: string,
    data: {
      nama_lengkap: string;
      nim: string;
      kelas?: string;
      ukuran: string;
      custom_name?: string;
      jumlah?: number;
    },
    performedByUserId?: string
  ): Promise<OrderMemberRecord> {
    await this.initForTenant(tenantId);

    const order = this.ordersStore.get(`${tenantId}:${orderId}`);
    if (!order) {
      throw new Error(`Pesanan '${orderId}' tidak ditemukan.`);
    }

    const memberId = `MBR-${orderId}-${Date.now().toString(36).toUpperCase().substring(2, 6)}`;
    const now = new Date().toISOString();
    const product = await PDHService.getProductById(tenantId, order.produk_id);
    const basePrice = product?.harga || 185000;
    const sizes = await PDHService.listSizes(tenantId, order.produk_id);
    const sizeObj = sizes.find((s) => s.kode_ukuran.toUpperCase() === data.ukuran.toUpperCase());
    const extraFee = sizeObj?.extra_fee || 0;
    const qty = data.jumlah || 1;
    const subtotal = (basePrice + extraFee) * qty;

    const newMember: OrderMemberRecord = {
      member_id: memberId,
      order_id: orderId,
      tenant_id: tenantId,
      nama_lengkap: data.nama_lengkap.trim(),
      nim: data.nim.trim(),
      kelas: data.kelas?.trim() || order.coordinator_class,
      ukuran: data.ukuran.trim().toUpperCase(),
      custom_name: data.custom_name?.trim() || data.nama_lengkap.trim(),
      unit_price: basePrice,
      extra_fee: extraFee,
      subtotal: subtotal,
      jumlah: qty,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    };

    this.membersStore.set(`${tenantId}:${orderId}:${memberId}`, newMember);

    // Recalculate parent order totals
    await this.recalculateOrderTotals(tenantId, orderId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      'ADD_ORDER_MEMBER',
      `Pesanan ${orderId}`,
      `Menambahkan anggota ${newMember.nama_lengkap} (${newMember.ukuran}) ke pesanan ${orderId}`
    );

    return { ...newMember };
  }

  static async updateMember(
    tenantId: string,
    orderId: string,
    memberId: string,
    data: Partial<OrderMemberRecord>,
    performedByUserId?: string
  ): Promise<OrderMemberRecord> {
    await this.initForTenant(tenantId);

    const member = this.membersStore.get(`${tenantId}:${orderId}:${memberId}`);
    if (!member) {
      throw new Error(`Anggota pesanan '${memberId}' tidak ditemukan.`);
    }

    if (data.nama_lengkap !== undefined) member.nama_lengkap = data.nama_lengkap.trim();
    if (data.nim !== undefined) member.nim = data.nim.trim();
    if (data.kelas !== undefined) member.kelas = data.kelas.trim();
    if (data.custom_name !== undefined) member.custom_name = data.custom_name.trim();

    if (data.ukuran !== undefined) {
      member.ukuran = data.ukuran.trim().toUpperCase();
      const order = this.ordersStore.get(`${tenantId}:${orderId}`);
      if (order) {
        const sizes = await PDHService.listSizes(tenantId, order.produk_id);
        const sizeObj = sizes.find((s) => s.kode_ukuran.toUpperCase() === member.ukuran);
        member.extra_fee = sizeObj?.extra_fee || 0;
        member.subtotal = (member.unit_price + member.extra_fee) * member.jumlah;
      }
    }

    if (data.jumlah !== undefined) {
      member.jumlah = data.jumlah;
      member.subtotal = (member.unit_price + member.extra_fee) * member.jumlah;
    }

    member.updated_at = new Date().toISOString();
    this.membersStore.set(`${tenantId}:${orderId}:${memberId}`, member);

    // Recalculate totals
    await this.recalculateOrderTotals(tenantId, orderId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      'UPDATE_ORDER_MEMBER',
      `Pesanan ${orderId}`,
      `Memperbarui data anggota ${member.nama_lengkap} pada pesanan ${orderId}`
    );

    return { ...member };
  }

  static async deleteMember(
    tenantId: string,
    orderId: string,
    memberId: string,
    performedByUserId?: string
  ): Promise<boolean> {
    await this.initForTenant(tenantId);

    const member = this.membersStore.get(`${tenantId}:${orderId}:${memberId}`);
    if (!member) {
      throw new Error(`Anggota pesanan '${memberId}' tidak ditemukan.`);
    }

    member.status = 'CANCELLED';
    this.membersStore.set(`${tenantId}:${orderId}:${memberId}`, member);

    // Recalculate totals
    await this.recalculateOrderTotals(tenantId, orderId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      'DELETE_ORDER_MEMBER',
      `Pesanan ${orderId}`,
      `Menghapus anggota ${member.nama_lengkap} dari pesanan ${orderId}`
    );

    return true;
  }

  private static async recalculateOrderTotals(tenantId: string, orderId: string): Promise<void> {
    const order = this.ordersStore.get(`${tenantId}:${orderId}`);
    if (!order) return;

    const activeMembers = await this.listMembers(tenantId, orderId);
    let totalQty = 0;
    let totalAmount = 0;

    for (const m of activeMembers) {
      totalQty += m.jumlah;
      totalAmount += m.subtotal;
    }

    order.total_qty = totalQty;
    order.total_amount = totalAmount;
    order.updated_at = new Date().toISOString();

    this.ordersStore.set(`${tenantId}:${orderId}`, order);
    await this.saveToSheets(tenantId);
  }

  static async trackOrderPublic(tenantId: string, query: string): Promise<any> {
    await this.initForTenant(tenantId);
    const q = query.trim().toLowerCase();
    const resultList = await this.listOrders(tenantId);
    const orders = resultList.orders || [];
    let matchedOrder: (OrderRecord & { members: OrderMemberRecord[] }) | null = null;
    let matchedMember: OrderMemberRecord | null = null;

    for (const ord of orders) {
      if (ord.status_order === 'BATAL') continue;
      const members = await this.listMembers(tenantId, ord.order_id);
      if (ord.order_id.toLowerCase() === q || ord.coordinator_nim.toLowerCase() === q) {
        matchedOrder = { ...ord, members };
        matchedMember = members[0] || null;
        break;
      }
      const member = members.find((m: any) => m.nim.toLowerCase() === q);
      if (member) {
        matchedOrder = { ...ord, members };
        matchedMember = member;
        break;
      }
    }

    if (!matchedOrder) {
      return {
        found: false,
        message: `Data NIM / Kode Pesanan '${query}' tidak ditemukan dalam pesanan PDH.`
      };
    }

    return {
      found: true,
      orderId: matchedOrder.order_id,
      studentName: matchedMember ? matchedMember.nama_lengkap : matchedOrder.coordinator_name,
      nim: matchedMember ? matchedMember.nim : matchedOrder.coordinator_nim,
      className: matchedMember ? matchedMember.kelas : matchedOrder.coordinator_class,
      sizeCode: matchedMember ? matchedMember.ukuran : 'M',
      customName: matchedMember ? matchedMember.custom_name : matchedOrder.coordinator_name,
      paymentStatus: matchedOrder.payment_status,
      productionStatus: matchedOrder.production_status,
      productionPercentage: matchedOrder.production_percentage,
      pickupStatus: matchedOrder.pickup_status,
      pickupNotes: (matchedOrder as any).pickup_notes || ''
    };
  }
}
