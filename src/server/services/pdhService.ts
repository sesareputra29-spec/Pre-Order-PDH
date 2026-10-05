// PDH Master, Sizes, and Design Images Service Layer (Google Sheets Persistent)
import { google } from 'googleapis';
import { AuditService } from './auditService.ts';
import { DriveFolderService } from './driveFolderService.ts';
import { ConfigService } from './configService.ts';
import { GoogleSheetsService } from './googleSheetsService.ts';
import { GoogleAuthService } from './googleAuthService.ts';
import { getTenantById } from '../config/tenants.ts';

export interface PDHProductRecord {
  produk_id: string;
  tenant_id: string;
  periode_id: string;
  nama_produk: string;
  tahun: string;
  deskripsi: string;
  spesifikasi: string;
  bahan: string;
  model: string;
  warna: string;
  ketentuan: string;
  kontak: string;
  harga: number;
  catatan_harga: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  created_at: string;
  updated_at: string;
}

export interface PDHSizeRecord {
  size_id: string;
  tenant_id: string;
  produk_id: string;
  kode_ukuran: string;
  nama_ukuran: string;
  chest_width?: string;
  body_length?: string;
  sleeve_length?: string;
  extra_fee: number;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PDHImageRecord {
  image_id: string;
  tenant_id: string;
  produk_id: string;
  drive_file_id: string;
  file_url: string;
  nama_file: string;
  mime_type: string;
  file_size_bytes?: number;
  urutan: number;
  is_primary: boolean;
  status: 'ACTIVE' | 'DELETED';
  created_at: string;
}

export class PDHService {
  private static productsStore: Map<string, PDHProductRecord> = new Map();
  private static sizesStore: Map<string, PDHSizeRecord> = new Map();
  private static imagesStore: Map<string, PDHImageRecord> = new Map();
  private static initializedTenants: Set<string> = new Set();
  private static lastLoadedAt: Map<string, number> = new Map();
  private static CACHE_TTL_MS = Number(process.env.CACHE_TTL_PDH_MS) || 30000;

  static invalidateCache(tenantId?: string): void {
    if (tenantId) {
      this.initializedTenants.delete(tenantId);
      this.lastLoadedAt.delete(tenantId);
      for (const [key, p] of this.productsStore.entries()) {
        if (p.tenant_id === tenantId) this.productsStore.delete(key);
      }
      for (const [key, s] of this.sizesStore.entries()) {
        if (s.tenant_id === tenantId) this.sizesStore.delete(key);
      }
      for (const [key, i] of this.imagesStore.entries()) {
        if (i.tenant_id === tenantId) this.imagesStore.delete(key);
      }
    } else {
      this.initializedTenants.clear();
      this.lastLoadedAt.clear();
      this.productsStore.clear();
      this.sizesStore.clear();
      this.imagesStore.clear();
    }
  }

  private static usedSizeCodesInOrders: Set<string> = new Set(['SZ-01', 'SZ-02', 'SZ-03', 'S', 'M', 'L']);

  private static async loadFromSheets(tenantId: string): Promise<boolean> {
    const tenant = getTenantById(tenantId);
    if (!tenant || !tenant.spreadsheet_id) {
      return false;
    }
    try {
      // 1. Products
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'PDHProducts');
      const prodRows = await GoogleSheetsService.getValues(tenant.spreadsheet_id, 'PDHProducts!A2:Q');
      if (prodRows && prodRows.length > 0) {
        for (const [key, p] of this.productsStore.entries()) {
          if (p.tenant_id === tenantId) this.productsStore.delete(key);
        }
        for (const row of prodRows) {
          if (!row[0]) continue;
          const p: PDHProductRecord = {
            produk_id: String(row[0]),
            tenant_id: String(row[1] || tenantId),
            periode_id: String(row[2] || ''),
            nama_produk: String(row[3] || ''),
            tahun: String(row[4] || ''),
            deskripsi: String(row[5] || ''),
            spesifikasi: String(row[6] || ''),
            bahan: String(row[7] || ''),
            model: String(row[8] || ''),
            warna: String(row[9] || ''),
            ketentuan: String(row[10] || ''),
            kontak: String(row[11] || ''),
            harga: Number(row[12] || 0),
            catatan_harga: String(row[13] || ''),
            status: (row[14] || 'ACTIVE') as any,
            created_at: String(row[15] || new Date().toISOString()),
            updated_at: String(row[16] || new Date().toISOString())
          };
          this.productsStore.set(`${tenantId}:${p.produk_id}`, p);
        }
      }

      // 2. Sizes
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'PDHSizes');
      const sizeRows = await GoogleSheetsService.getValues(tenant.spreadsheet_id, 'PDHSizes!A2:M');
      if (sizeRows && sizeRows.length > 0) {
        for (const [key, s] of this.sizesStore.entries()) {
          if (s.tenant_id === tenantId) this.sizesStore.delete(key);
        }
        for (const row of sizeRows) {
          if (!row[0]) continue;
          const s: PDHSizeRecord = {
            size_id: String(row[0]),
            tenant_id: String(row[1] || tenantId),
            produk_id: String(row[2] || ''),
            kode_ukuran: String(row[3] || ''),
            nama_ukuran: String(row[4] || ''),
            chest_width: row[5] ? String(row[5]) : undefined,
            body_length: row[6] ? String(row[6]) : undefined,
            sleeve_length: row[7] ? String(row[7]) : undefined,
            extra_fee: Number(row[8] || 0),
            status: (row[9] || 'ACTIVE') as any,
            notes: row[10] ? String(row[10]) : undefined,
            created_at: String(row[11] || new Date().toISOString()),
            updated_at: String(row[12] || new Date().toISOString())
          };
          this.sizesStore.set(`${tenantId}:${s.size_id}`, s);
        }
      }

      // 3. Images
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'PDHImages');
      const imgRows = await GoogleSheetsService.getValues(tenant.spreadsheet_id, 'PDHImages!A2:M');
      if (imgRows && imgRows.length > 0) {
        for (const [key, img] of this.imagesStore.entries()) {
          if (img.tenant_id === tenantId) this.imagesStore.delete(key);
        }
        for (const row of imgRows) {
          if (!row[0]) continue;
          const img: PDHImageRecord = {
            image_id: String(row[0]),
            tenant_id: String(row[1] || tenantId),
            produk_id: String(row[2] || ''),
            drive_file_id: String(row[3] || ''),
            file_url: String(row[4] || ''),
            nama_file: String(row[5] || ''),
            mime_type: String(row[6] || ''),
            file_size_bytes: row[7] ? Number(row[7]) : undefined,
            urutan: Number(row[8] || 0),
            is_primary: String(row[9]) === 'true',
            status: (row[10] || 'ACTIVE') as any,
            created_at: String(row[11] || new Date().toISOString())
          };
          this.imagesStore.set(`${tenantId}:${img.image_id}`, img);
        }
      }

      return true;
    } catch (err: any) {
      console.warn(`[PDHService] Gagal memuat data PDH dari Google Sheets untuk tenant ${tenantId}:`, err.message || err);
      return false;
    }
  }

  private static async saveToSheets(tenantId: string): Promise<void> {
    const tenant = getTenantById(tenantId);
    if (!tenant || !tenant.spreadsheet_id) {
      return;
    }
    try {
      // 1. Products
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'PDHProducts');
      const tenantProds = Array.from(this.productsStore.values()).filter(p => p.tenant_id === tenantId);
      const prodHeaders = [
        'produk_id', 'tenant_id', 'periode_id', 'nama_produk', 'tahun', 'deskripsi', 'spesifikasi', 'bahan', 'model', 'warna', 'ketentuan', 'kontak', 'harga', 'catatan_harga', 'status', 'created_at', 'updated_at'
      ];
      const prodRows = tenantProds.map(p => [
        p.produk_id, p.tenant_id, p.periode_id, p.nama_produk, p.tahun, p.deskripsi, p.spesifikasi, p.bahan, p.model, p.warna, p.ketentuan, p.kontak, p.harga, p.catatan_harga, p.status, p.created_at, p.updated_at
      ]);
      await GoogleSheetsService.updateValues(tenant.spreadsheet_id, `PDHProducts!A1:Q${prodRows.length + 1}`, [prodHeaders, ...prodRows]);

      // 2. Sizes
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'PDHSizes');
      const tenantSizes = Array.from(this.sizesStore.values()).filter(s => s.tenant_id === tenantId);
      const sizeHeaders = [
        'size_id', 'tenant_id', 'produk_id', 'kode_ukuran', 'nama_ukuran', 'chest_width', 'body_length', 'sleeve_length', 'extra_fee', 'status', 'notes', 'created_at', 'updated_at'
      ];
      const sizeRows = tenantSizes.map(s => [
        s.size_id, s.tenant_id, s.produk_id, s.kode_ukuran, s.nama_ukuran, s.chest_width || '', s.body_length || '', s.sleeve_length || '', s.extra_fee, s.status, s.notes || '', s.created_at, s.updated_at
      ]);
      await GoogleSheetsService.updateValues(tenant.spreadsheet_id, `PDHSizes!A1:M${sizeRows.length + 1}`, [sizeHeaders, ...sizeRows]);

      // 3. Images
      await GoogleSheetsService.ensureSheetExists(tenant.spreadsheet_id, 'PDHImages');
      const tenantImages = Array.from(this.imagesStore.values()).filter(img => img.tenant_id === tenantId);
      const imgHeaders = [
        'image_id', 'tenant_id', 'produk_id', 'drive_file_id', 'file_url', 'nama_file', 'mime_type', 'file_size_bytes', 'urutan', 'is_primary', 'status', 'created_at'
      ];
      const imgRows = tenantImages.map(img => [
        img.image_id, img.tenant_id, img.produk_id, img.drive_file_id, img.file_url, img.nama_file, img.mime_type, img.file_size_bytes || '', img.urutan, img.is_primary ? 'true' : 'false', img.status, img.created_at
      ]);
      await GoogleSheetsService.updateValues(tenant.spreadsheet_id, `PDHImages!A1:L${imgRows.length + 1}`, [imgHeaders, ...imgRows]);
    } catch (err: any) {
      console.error(`[PDHService] Gagal menyimpan data PDH ke Google Sheets untuk tenant ${tenantId}:`, err.message || err);
    }
  }

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
        console.log(`[PDHService] Data PDH kosong atau gagal dibaca untuk tenant ${tenantId}. Mengunggah seed baseline ke Google Sheets...`);
        await this.saveToSheets(tenantId);
      }
    }

    this.lastLoadedAt.set(tenantId, Date.now());
    this.initializedTenants.add(tenantId);
  }

  private static seedBaseline(tenantId: string) {
    const now = new Date().toISOString();

    const defaultProduct: PDHProductRecord = {
      produk_id: 'PRD-PDH-2026',
      tenant_id: tenantId,
      periode_id: 'PO-2026-GEL1',
      nama_produk: 'Pakaian Dinas Harian (PDH) Kampus 2026',
      tahun: '2026/2027',
      deskripsi: 'Seragam resmi PDH Kampus berkualitas tinggi dengan bahan American Drill premium dan bordir kustom nama.',
      spesifikasi: 'Lengan Panjang, Kerah Kemeja, 2 Saku Depan dengan Penutup, Bordir Logo Kampus & Bordir Nama Kustom',
      bahan: 'American Drill Premium (Dingin, Menyerap Keringat, Awet)',
      model: 'Unisex (Slim Fit & Reguler)',
      warna: 'Navy Blue / Biru Dongker dengan Aksentuasi Abu-Abu',
      ketentuan: '1. Wajib melunasi pembayaran sesuai jadwal.\n2. Nama bordir kustom maksimal 18 karakter.\n3. Ukuran tidak dapat diubah setelah batas akhir PO.',
      kontak: 'WhatsApp Panitia: 0812-3456-7890 (Humas PDH)',
      harga: 185000,
      catatan_harga: 'Harga termasuk bordir nama & logo resmi kampus.',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    };

    if (!this.productsStore.has(`${tenantId}:${defaultProduct.produk_id}`)) {
      this.productsStore.set(`${tenantId}:${defaultProduct.produk_id}`, defaultProduct);
    }

    const defaultSizes: PDHSizeRecord[] = [
      { size_id: 'SZ-01', tenant_id: tenantId, produk_id: 'PRD-PDH-2026', kode_ukuran: 'S', nama_ukuran: 'Small (S)', chest_width: '48 cm', body_length: '65 cm', sleeve_length: '56 cm', extra_fee: 0, status: 'ACTIVE', notes: 'Ukuran Standar', created_at: now, updated_at: now },
      { size_id: 'SZ-02', tenant_id: tenantId, produk_id: 'PRD-PDH-2026', kode_ukuran: 'M', nama_ukuran: 'Medium (M)', chest_width: '51 cm', body_length: '68 cm', sleeve_length: '58 cm', extra_fee: 0, status: 'ACTIVE', notes: 'Ukuran Standar', created_at: now, updated_at: now },
      { size_id: 'SZ-03', tenant_id: tenantId, produk_id: 'PRD-PDH-2026', kode_ukuran: 'L', nama_ukuran: 'Large (L)', chest_width: '54 cm', body_length: '71 cm', sleeve_length: '60 cm', extra_fee: 0, status: 'ACTIVE', notes: 'Ukuran Standar', created_at: now, updated_at: now },
      { size_id: 'SZ-04', tenant_id: tenantId, produk_id: 'PRD-PDH-2026', kode_ukuran: 'XL', nama_ukuran: 'Extra Large (XL)', chest_width: '57 cm', body_length: '74 cm', sleeve_length: '62 cm', extra_fee: 5000, status: 'ACTIVE', notes: 'Biaya tambahan +Rp 5.000', created_at: now, updated_at: now },
      { size_id: 'SZ-05', tenant_id: tenantId, produk_id: 'PRD-PDH-2026', kode_ukuran: 'XXL', nama_ukuran: 'Double XL (XXL)', chest_width: '60 cm', body_length: '77 cm', sleeve_length: '64 cm', extra_fee: 10000, status: 'ACTIVE', notes: 'Biaya tambahan +Rp 10.000', created_at: now, updated_at: now }
    ];

    for (const s of defaultSizes) {
      if (!this.sizesStore.has(`${tenantId}:${s.size_id}`)) {
        this.sizesStore.set(`${tenantId}:${s.size_id}`, s);
      }
    }
  }

  static async listProducts(tenantId: string): Promise<PDHProductRecord[]> {
    await this.initForTenant(tenantId);
    const list: PDHProductRecord[] = [];
    for (const p of this.productsStore.values()) {
      if (p.tenant_id === tenantId && p.status !== 'ARCHIVED') {
        list.push({ ...p });
      }
    }
    return list;
  }

  static async getProductById(tenantId: string, produkId: string): Promise<PDHProductRecord | null> {
    await this.initForTenant(tenantId);
    const product = this.productsStore.get(`${tenantId}:${produkId}`);
    return product ? { ...product } : null;
  }

  static async createProduct(
    tenantId: string,
    data: {
      periode_id: string;
      nama_produk: string;
      tahun: string;
      deskripsi: string;
      spesifikasi: string;
      bahan: string;
      model: string;
      warna: string;
      ketentuan: string;
      kontak: string;
      harga: number;
      catatan_harga?: string;
    },
    performedByUserId?: string
  ): Promise<PDHProductRecord> {
    await this.initForTenant(tenantId);

    const produkId = `PRD-PDH-${Date.now().toString(36).toUpperCase().substring(2, 6)}`;
    const now = new Date().toISOString();

    const newProduct: PDHProductRecord = {
      produk_id: produkId,
      tenant_id: tenantId,
      periode_id: data.periode_id,
      nama_produk: data.nama_produk.trim(),
      tahun: data.tahun.trim(),
      deskripsi: data.deskripsi.trim(),
      spesifikasi: data.spesifikasi.trim(),
      bahan: data.bahan.trim(),
      model: data.model || 'Unisex',
      warna: data.warna.trim(),
      ketentuan: data.ketentuan,
      kontak: data.kontak.trim(),
      harga: Number(data.harga || 0),
      catatan_harga: data.catatan_harga?.trim() || '',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    };

    this.productsStore.set(`${tenantId}:${produkId}`, newProduct);
    await this.saveToSheets(tenantId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      'CREATE_PDH',
      `Produk ${newProduct.nama_produk}`,
      `Membuat produk kustom PDH baru: ${newProduct.nama_produk}`
    );

    return { ...newProduct };
  }

  static async updateProduct(
    tenantId: string,
    produkId: string,
    data: Partial<{
      nama_produk: string;
      tahun: string;
      deskripsi: string;
      spesifikasi: string;
      bahan: string;
      model: string;
      warna: string;
      ketentuan: string;
      kontak: string;
      harga: number;
      catatan_harga: string;
      status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
    }>,
    performedByUserId?: string
  ): Promise<PDHProductRecord> {
    await this.initForTenant(tenantId);

    const product = this.productsStore.get(`${tenantId}:${produkId}`);
    if (!product) {
      throw new Error(`Produk dengan ID '${produkId}' tidak ditemukan.`);
    }

    if (data.nama_produk !== undefined) product.nama_produk = data.nama_produk.trim();
    if (data.tahun !== undefined) product.tahun = data.tahun.trim();
    if (data.deskripsi !== undefined) product.deskripsi = data.deskripsi.trim();
    if (data.spesifikasi !== undefined) product.spesifikasi = data.spesifikasi.trim();
    if (data.bahan !== undefined) product.bahan = data.bahan.trim();
    if (data.model !== undefined) product.model = data.model;
    if (data.warna !== undefined) product.warna = data.warna.trim();
    if (data.ketentuan !== undefined) product.ketentuan = data.ketentuan;
    if (data.kontak !== undefined) product.kontak = data.kontak.trim();
    if (data.harga !== undefined) product.harga = Number(data.harga);
    if (data.catatan_harga !== undefined) product.catatan_harga = data.catatan_harga.trim();
    if (data.status !== undefined) product.status = data.status;
    product.updated_at = new Date().toISOString();

    this.productsStore.set(`${tenantId}:${produkId}`, product);
    await this.saveToSheets(tenantId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      'UPDATE_PDH',
      `Produk ${product.nama_produk}`,
      `Memperbarui detail produk kustom PDH: ${product.nama_produk}`
    );

    return { ...product };
  }

  static async deleteProduct(tenantId: string, produkId: string, performedByUserId?: string): Promise<boolean> {
    await this.initForTenant(tenantId);

    const product = this.productsStore.get(`${tenantId}:${produkId}`);
    if (!product) {
      throw new Error(`Produk dengan ID '${produkId}' tidak ditemukan.`);
    }

    product.status = 'ARCHIVED';
    product.updated_at = new Date().toISOString();
    this.productsStore.set(`${tenantId}:${produkId}`, product);
    await this.saveToSheets(tenantId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      'DELETE_PDH',
      `Produk ${product.nama_produk}`,
      `Arsipkan produk PDH: ${product.nama_produk}`
    );

    return true;
  }

  static async updatePricing(
    tenantId: string,
    produkId: string,
    harga: number,
    catatan_harga: string,
    performedByUserId?: string
  ): Promise<PDHProductRecord> {
    await this.initForTenant(tenantId);

    const product = this.productsStore.get(`${tenantId}:${produkId}`);
    if (!product) {
      throw new Error(`Produk dengan ID '${produkId}' tidak ditemukan.`);
    }

    product.harga = Number(harga);
    product.catatan_harga = catatan_harga.trim();
    product.updated_at = new Date().toISOString();

    this.productsStore.set(`${tenantId}:${produkId}`, product);
    await this.saveToSheets(tenantId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      'UPDATE_PDH_PRICE',
      `Produk ${product.nama_produk}`,
      `Mengubah harga produk ${product.nama_produk} menjadi Rp ${harga.toLocaleString('id-ID')}`
    );

    return { ...product };
  }

  static async listSizes(tenantId: string, produkId: string): Promise<PDHSizeRecord[]> {
    await this.initForTenant(tenantId);
    const list: PDHSizeRecord[] = [];
    for (const s of this.sizesStore.values()) {
      if (s.tenant_id === tenantId && s.produk_id === produkId && s.status !== 'ARCHIVED') {
        list.push({ ...s });
      }
    }
    return list;
  }

  static async getSizeById(tenantId: string, produkId: string, sizeId: string): Promise<PDHSizeRecord | null> {
    await this.initForTenant(tenantId);
    const s = this.sizesStore.get(`${tenantId}:${sizeId}`);
    return s && s.produk_id === produkId ? { ...s } : null;
  }

  static async createSize(
    tenantId: string,
    produkId: string,
    data: {
      kode_ukuran: string;
      nama_ukuran: string;
      chest_width?: string;
      body_length?: string;
      sleeve_length?: string;
      extra_fee?: number;
      notes?: string;
    },
    performedByUserId?: string
  ): Promise<PDHSizeRecord> {
    await this.initForTenant(tenantId);

    const sizes = await this.listSizes(tenantId, produkId);
    const code = data.kode_ukuran.trim().toUpperCase();
    if (sizes.some(s => s.kode_ukuran === code)) {
      throw new Error(`Ukuran dengan kode '${code}' sudah terdaftar.`);
    }

    const sizeId = `SZ-${Date.now().toString(36).toUpperCase().substring(2, 6)}`;
    const now = new Date().toISOString();

    const newSize: PDHSizeRecord = {
      size_id: sizeId,
      tenant_id: tenantId,
      produk_id: produkId,
      kode_ukuran: code,
      nama_ukuran: data.nama_ukuran.trim(),
      chest_width: data.chest_width?.trim(),
      body_length: data.body_length?.trim(),
      sleeve_length: data.sleeve_length?.trim(),
      extra_fee: Number(data.extra_fee || 0),
      status: 'ACTIVE',
      notes: data.notes?.trim() || '',
      created_at: now,
      updated_at: now
    };

    this.sizesStore.set(`${tenantId}:${sizeId}`, newSize);
    await this.saveToSheets(tenantId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      'CREATE_PDH_SIZE',
      `Ukuran ${newSize.kode_ukuran}`,
      `Menambahkan ukuran baru: ${newSize.nama_ukuran} (Biaya: Rp ${newSize.extra_fee.toLocaleString('id-ID')})`
    );

    return { ...newSize };
  }

  static async updateSize(
    tenantId: string,
    produkId: string,
    sizeId: string,
    data: Partial<{
      nama_ukuran: string;
      chest_width: string;
      body_length: string;
      sleeve_length: string;
      extra_fee: number;
      notes: string;
      status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
    }>,
    performedByUserId?: string
  ): Promise<PDHSizeRecord> {
    await this.initForTenant(tenantId);

    const s = this.sizesStore.get(`${tenantId}:${sizeId}`);
    if (!s || s.produk_id !== produkId) {
      throw new Error(`Ukuran dengan ID '${sizeId}' tidak ditemukan.`);
    }

    if (data.nama_ukuran !== undefined) s.nama_ukuran = data.nama_ukuran.trim();
    if (data.chest_width !== undefined) s.chest_width = data.chest_width.trim();
    if (data.body_length !== undefined) s.body_length = data.body_length.trim();
    if (data.sleeve_length !== undefined) s.sleeve_length = data.sleeve_length.trim();
    if (data.extra_fee !== undefined) s.extra_fee = Number(data.extra_fee);
    if (data.notes !== undefined) s.notes = data.notes.trim();
    if (data.status !== undefined) s.status = data.status;
    s.updated_at = new Date().toISOString();

    this.sizesStore.set(`${tenantId}:${sizeId}`, s);
    await this.saveToSheets(tenantId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      'UPDATE_PDH_SIZE',
      `Ukuran ${s.kode_ukuran}`,
      `Memperbarui detail ukuran: ${s.nama_ukuran}`
    );

    return { ...s };
  }

  static async deleteSize(tenantId: string, produkId: string, sizeId: string, performedByUserId?: string): Promise<boolean> {
    await this.initForTenant(tenantId);

    const s = this.sizesStore.get(`${tenantId}:${sizeId}`);
    if (!s || s.produk_id !== produkId) {
      throw new Error(`Ukuran dengan ID '${sizeId}' tidak ditemukan.`);
    }

    if (this.usedSizeCodesInOrders.has(s.kode_ukuran)) {
      s.status = 'ARCHIVED';
      s.updated_at = new Date().toISOString();
      this.sizesStore.set(`${tenantId}:${sizeId}`, s);
    } else {
      this.sizesStore.delete(`${tenantId}:${sizeId}`);
    }
    await this.saveToSheets(tenantId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      'DELETE_PDH_SIZE',
      `Ukuran ${s.kode_ukuran}`,
      `Menghapus/mengarsipkan ukuran: ${s.nama_ukuran}`
    );

    return true;
  }

  static async listImages(tenantId: string, produkId: string): Promise<PDHImageRecord[]> {
    await this.initForTenant(tenantId);
    const list: PDHImageRecord[] = [];
    for (const img of this.imagesStore.values()) {
      if (img.tenant_id === tenantId && img.produk_id === produkId && img.status === 'ACTIVE') {
        list.push({ ...img });
      }
    }
    return list;
  }

  static async uploadImage(
    tenantId: string,
    produkId: string,
    fileMeta: {
      file_name: string;
      mime_type: string;
      file_size_bytes: number;
      base64_data?: string;
    },
    performedByUserId?: string
  ): Promise<PDHImageRecord> {
    await this.initForTenant(tenantId);

    const product = this.productsStore.get(`${tenantId}:${produkId}`);
    if (!product) {
      throw new Error(`Produk dengan ID '${produkId}' tidak ditemukan.`);
    }

    const currentImages = await this.listImages(tenantId, produkId);
    if (currentImages.length >= 5) {
      throw new Error('Unggahan gambar desain maksimal 5 berkas per produk PDH.');
    }

    const imageId = `IMG-${produkId.replace('PRD-', '')}-${Date.now().toString(36).slice(-4).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const driveFolder = await DriveFolderService.getOrCreateProductDesignFolder(tenantId, produkId);
    const driveFileId = `DRV-DESIGN-${tenantId}-${imageId}`;
    const fileUrl = `https://drive.google.com/uc?id=${driveFileId}`;

    const newImage: PDHImageRecord = {
      image_id: imageId,
      tenant_id: tenantId,
      produk_id: produkId,
      drive_file_id: driveFileId,
      file_url: fileUrl,
      nama_file: fileMeta.file_name.replace(/[^a-zA-Z0-9._-]/g, '_'),
      mime_type: fileMeta.mime_type,
      file_size_bytes: fileMeta.file_size_bytes,
      urutan: currentImages.length + 1,
      is_primary: currentImages.length === 0,
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    };

    this.imagesStore.set(`${tenantId}:${imageId}`, newImage);
    await this.saveToSheets(tenantId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      'UPLOAD_PDH_IMAGE',
      `Gambar ${newImage.nama_file}`,
      `Unggah gambar desain baru: ${newImage.nama_file} ke folder desain`
    );

    return { ...newImage };
  }

  static async deleteImage(tenantId: string, produkId: string, imageId: string, performedByUserId?: string): Promise<boolean> {
    await this.initForTenant(tenantId);

    const img = this.imagesStore.get(`${tenantId}:${imageId}`);
    if (!img || img.produk_id !== produkId) {
      throw new Error(`Gambar dengan ID '${imageId}' tidak ditemukan.`);
    }

    img.status = 'DELETED';
    this.imagesStore.set(`${tenantId}:${imageId}`, img);
    await this.saveToSheets(tenantId);

    await AuditService.logEvent(
      tenantId,
      performedByUserId || 'SYSTEM',
      'DELETE_PDH_IMAGE',
      `Gambar ${img.nama_file}`,
      `Menghapus gambar desain: ${img.nama_file}`
    );

    return true;
  }

  // ==========================================
  // 4. FRONTEND-ALIGNED MASTER METHODS
  // ==========================================

  static async getMasterData(tenantId: string) {
    await this.initForTenant(tenantId);
    const products = await this.listProducts(tenantId);
    const prod = products[0] || null;
    const prodId = prod ? prod.produk_id : 'PRD-PDH-2026';
    const sizes = await this.listSizes(tenantId, prodId);
    const images = await this.listImages(tenantId, prodId);
    const config = await ConfigService.getConfig(tenantId);

    return {
      info: {
        title: prod?.nama_produk || 'Pakaian Dinas Harian (PDH) Kampus 2026',
        year: prod?.tahun || '2026/2027',
        description: prod?.deskripsi || '',
        specifications: prod?.spesifikasi || '',
        material: prod?.bahan || '',
        model: prod?.model || 'Unisex',
        color: prod?.warna || '',
        terms: prod?.ketentuan || '',
        contact: prod?.kontak || ''
      },
      pricing: {
        basePrice: prod?.harga || 185000,
        notes: prod?.catatan_harga || 'Harga termasuk bordir nama & logo resmi kampus.'
      },
      sizes: sizes.map(s => ({
        code: s.kode_ukuran,
        name: s.nama_ukuran,
        chestWidth: s.chest_width || '',
        bodyLength: s.body_length || '',
        sleeveLength: s.sleeve_length || '',
        extraFee: s.extra_fee,
        notes: s.notes || ''
      })),
      images: images.map(img => ({
        id: img.image_id,
        url: img.file_url,
        caption: img.nama_file,
        isPrimary: img.is_primary,
        order: img.urutan
      })),
      payment: {
        bankName: config?.informasi_pembayaran?.bank_name || 'Bank Central Asia (BCA)',
        accountNumber: config?.informasi_pembayaran?.account_number || '1234567890',
        accountHolder: config?.informasi_pembayaran?.account_holder || 'Panitia Seragam PDH Kampus',
        qrisUrl: config?.informasi_pembayaran?.qris_url || '',
        instructions: config?.informasi_pembayaran?.instructions || 'Transfer sesuai total nominal ke rekening resmi panitia dan simpan bukti transfer untuk diunggah.'
      }
    };
  }

  static async updateMasterInfo(tenantId: string, info: any, userId?: string) {
    await this.initForTenant(tenantId);
    const products = await this.listProducts(tenantId);
    const prod = products[0] || null;
    if (!prod) throw new Error('Produk master PDH tidak ditemukan.');

    const updated = await this.updateProduct(
      tenantId,
      prod.produk_id,
      {
        nama_produk: info.title,
        tahun: info.year,
        deskripsi: info.description,
        spesifikasi: info.specifications,
        bahan: info.material,
        model: info.model,
        warna: info.color,
        ketentuan: info.terms,
        kontak: info.contact
      },
      userId
    );
    return updated;
  }

  static async updateMasterPricing(tenantId: string, pricing: any, userId?: string) {
    await this.initForTenant(tenantId);
    const products = await this.listProducts(tenantId);
    const prod = products[0] || null;
    if (!prod) throw new Error('Produk master PDH tidak ditemukan.');

    return await this.updatePricing(
      tenantId,
      prod.produk_id,
      Number(pricing.basePrice),
      pricing.notes || '',
      userId
    );
  }

  static async saveMasterSize(tenantId: string, sizeData: any, userId?: string) {
    await this.initForTenant(tenantId);
    const products = await this.listProducts(tenantId);
    const prod = products[0] || null;
    const prodId = prod ? prod.produk_id : 'PRD-PDH-2026';

    const existingSizes = await this.listSizes(tenantId, prodId);
    const existing = existingSizes.find(s => s.kode_ukuran.toUpperCase() === String(sizeData.code).toUpperCase());

    if (existing) {
      return await this.updateSize(
        tenantId,
        prodId,
        existing.size_id,
        {
          nama_ukuran: sizeData.name || existing.nama_ukuran,
          chest_width: sizeData.chestWidth || existing.chest_width,
          body_length: sizeData.bodyLength || existing.body_length,
          sleeve_length: sizeData.sleeveLength || existing.sleeve_length,
          extra_fee: sizeData.extraFee !== undefined ? Number(sizeData.extraFee) : existing.extra_fee,
          notes: sizeData.notes !== undefined ? sizeData.notes : existing.notes
        },
        userId
      );
    }

    return await this.createSize(
      tenantId,
      prodId,
      {
        kode_ukuran: sizeData.code,
        nama_ukuran: sizeData.name || `Ukuran ${sizeData.code}`,
        chest_width: sizeData.chestWidth || '',
        body_length: sizeData.bodyLength || '',
        sleeve_length: sizeData.sleeveLength || '',
        extra_fee: Number(sizeData.extraFee || 0),
        notes: sizeData.notes || ''
      },
      userId
    );
  }

  static async updateMasterPayment(tenantId: string, paymentData: any, userId?: string) {
    return await ConfigService.updateConfig(
      tenantId,
      {
        informasi_pembayaran: {
          bank_name: paymentData.bankName,
          account_number: paymentData.accountNumber,
          account_holder: paymentData.accountHolder,
          qris_url: paymentData.qrisUrl,
          instructions: paymentData.instructions
        }
      },
      userId
    );
  }
}
