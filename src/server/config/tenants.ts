// Tenant Configuration Registry

export interface TenantConfig {
  tenant_id: string;
  nama_universitas: string;
  nama_fakultas: string;
  nama_prodi: string;
  kode_prodi: string;
  spreadsheet_id: string;
  drive_root_id: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  created_at: string;
}

export interface PublicTenantInfo {
  tenant_id: string;
  nama_universitas: string;
  nama_fakultas: string;
  nama_prodi: string;
  kode_prodi: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
}

/**
 * Master Tenant Registry.
 * TENANT-001 serves as the baseline tenant for Program Studi Manajemen.
 * IMPORTANT: Never modify or move existing data from Prodi Manajemen.
 */
export const TENANTS_REGISTRY: Record<string, TenantConfig> = {
  'TENANT-001': {
    tenant_id: 'TENANT-001',
    nama_universitas: process.env.TENANT_001_NAMA_UNIVERSITAS || 'Universitas Terbuka / Kampus Nasional',
    nama_fakultas: process.env.TENANT_001_NAMA_FAKULTAS || 'Fakultas Ekonomi dan Bisnis',
    nama_prodi: process.env.TENANT_001_NAMA_PRODI || 'Manajemen',
    kode_prodi: process.env.TENANT_001_KODE_PRODI || 'MJSP',
    // Existing Spreadsheet ID from baseline configuration
    spreadsheet_id: process.env.TENANT_001_SPREADSHEET_ID || '1SpreadsheetIdPDHCampusOrderDatabase2026',
    // Existing Google Drive Root Folder ID from baseline configuration
    drive_root_id: process.env.TENANT_001_DRIVE_ROOT_ID || '1DriveRootFolderPDH2026',
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00.000Z'
  },
  'TENANT-002': {
    tenant_id: 'TENANT-002',
    nama_universitas: process.env.TENANT_002_NAMA_UNIVERSITAS || 'Universitas Terbuka / Kampus Nasional',
    nama_fakultas: process.env.TENANT_002_NAMA_FAKULTAS || 'Fakultas Ekonomi dan Bisnis',
    nama_prodi: process.env.TENANT_002_NAMA_PRODI || 'Akuntansi',
    kode_prodi: process.env.TENANT_002_KODE_PRODI || 'AKSP',
    spreadsheet_id: process.env.TENANT_002_SPREADSHEET_ID || '1SpreadsheetIdPDHCampusOrderDatabase2026_Akuntansi',
    drive_root_id: process.env.TENANT_002_DRIVE_ROOT_ID || '1DriveRootFolderPDH2026_Akuntansi',
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00.000Z'
  }
};

export function getTenantById(tenantId: string): TenantConfig | null {
  if (!tenantId) return null;
  const config = TENANTS_REGISTRY[tenantId.trim().toUpperCase()];
  return config || null;
}

export function getAllActiveTenants(): PublicTenantInfo[] {
  return Object.values(TENANTS_REGISTRY)
    .filter((t) => t.status === 'ACTIVE')
    .map((t) => ({
      tenant_id: t.tenant_id,
      nama_universitas: t.nama_universitas,
      nama_fakultas: t.nama_fakultas,
      nama_prodi: t.nama_prodi,
      kode_prodi: t.kode_prodi,
      status: t.status
    }));
}
