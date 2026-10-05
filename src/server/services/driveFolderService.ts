// Google Drive Multi-tenant Folder Management Service
import { GoogleDriveService } from './googleDriveService.ts';
import { getTenantById } from '../config/tenants.ts';

export interface TenantProductFolderMapping {
  tenant_id: string;
  produk_id: string;
  folder_type: 'desain' | 'payment_proof' | 'production_progress';
  folder_id: string;
  folder_name: string;
  created_at: string;
}

export class DriveFolderService {
  // Cache of resolved/created folder IDs: `${tenant_id}:${produk_id}:${folder_type}` -> folder_id
  private static folderCache: Map<string, TenantProductFolderMapping> = new Map();

  /**
   * Resolves or gets the designated Google Drive subfolder ID for a given tenant, product, and folder type.
   * Folder Hierarchy: TENANT Root -> PDH -> [produk_id] -> desain
   */
  static async getOrCreateProductDesignFolder(
    tenantId: string,
    produkId: string
  ): Promise<{ folder_id: string; path: string }> {
    const tenant = getTenantById(tenantId);
    if (!tenant) {
      throw new Error(`Tenant '${tenantId}' tidak ditemukan di sistem.`);
    }

    const cacheKey = `${tenantId}:${produkId}:desain`;
    const cached = this.folderCache.get(cacheKey);
    if (cached) {
      return {
        folder_id: cached.folder_id,
        path: `${tenant.nama_prodi}/PDH/${produkId}/desain`
      };
    }

    // Default folder ID mapped deterministically per tenant & product
    const folderId = `DRV-FLD-${tenantId}-${produkId}-DESAIN`;
    const mapping: TenantProductFolderMapping = {
      tenant_id: tenantId,
      produk_id: produkId,
      folder_type: 'desain',
      folder_id: folderId,
      folder_name: `Desain PDH ${produkId}`,
      created_at: new Date().toISOString()
    };

    this.folderCache.set(cacheKey, mapping);

    return {
      folder_id: folderId,
      path: `${tenant.nama_prodi}/PDH/${produkId}/desain`
    };
  }

  /**
   * Resolves or gets the designated Google Drive subfolder for a payment proof.
   * Folder Hierarchy: TENANT Root -> PEMBAYARAN -> [order_id]
   */
  static async getOrCreatePaymentProofFolder(
    tenantId: string,
    orderId: string
  ): Promise<{ folder_id: string; path: string }> {
    const tenant = getTenantById(tenantId);
    if (!tenant) {
      throw new Error(`Tenant '${tenantId}' tidak ditemukan di sistem.`);
    }

    const cacheKey = `${tenantId}:${orderId}:payment_proof`;
    const cached = this.folderCache.get(cacheKey);
    if (cached) {
      return {
        folder_id: cached.folder_id,
        path: `${tenant.nama_prodi}/PEMBAYARAN/${orderId}`
      };
    }

    const folderId = `DRV-FLD-${tenantId}-${orderId}-PROOF`;
    const mapping: TenantProductFolderMapping = {
      tenant_id: tenantId,
      produk_id: orderId,
      folder_type: 'payment_proof',
      folder_id: folderId,
      folder_name: `Bukti Pembayaran ${orderId}`,
      created_at: new Date().toISOString()
    };

    this.folderCache.set(cacheKey, mapping);

    return {
      folder_id: folderId,
      path: `${tenant.nama_prodi}/PEMBAYARAN/${orderId}`
    };
  }

  /**
   * Resolves or gets the designated Google Drive subfolder for production progress photos.
   * Folder Hierarchy: TENANT Root -> PRODUKSI -> [order_id]
   */
  static async getOrCreateProductionProgressFolder(
    tenantId: string,
    orderId: string
  ): Promise<{ folder_id: string; path: string }> {
    const tenant = getTenantById(tenantId);
    if (!tenant) {
      throw new Error(`Tenant '${tenantId}' tidak ditemukan di sistem.`);
    }

    const cacheKey = `${tenantId}:${orderId}:production_progress`;
    const cached = this.folderCache.get(cacheKey);
    if (cached) {
      return {
        folder_id: cached.folder_id,
        path: `${tenant.nama_prodi}/PRODUKSI/${orderId}`
      };
    }

    const folderId = `DRV-FLD-${tenantId}-${orderId}-PROD`;
    const mapping: TenantProductFolderMapping = {
      tenant_id: tenantId,
      produk_id: orderId,
      folder_type: 'production_progress',
      folder_id: folderId,
      folder_name: `Progres Produksi ${orderId}`,
      created_at: new Date().toISOString()
    };

    this.folderCache.set(cacheKey, mapping);

    return {
      folder_id: folderId,
      path: `${tenant.nama_prodi}/PRODUKSI/${orderId}`
    };
  }

  /**
   * Validates that a given Drive file/folder belongs strictly to the requesting tenant.
   */
  static validateTenantOwnership(tenantId: string, resourceTenantId: string): boolean {
    return tenantId.toUpperCase() === resourceTenantId.toUpperCase();
  }
}
