/**
 * PDH CAMPUS ORDER SYSTEM - TypeScript Types Definition
 */

export type Role = 'PANITIA' | 'MAHASISWA';

export type OrderType = 'PRIBADI' | 'KOLEKTIF';

export interface User {
  userId: string;
  username: string;
  nim?: string;
  className?: string;
  name: string;
  email: string;
  role: Role;
  token?: string;
  status?: string;
  loginAt?: string;
}

export type ProductionStatus = 'Belum Diproduksi' | 'Sedang Diproduksi' | 'Selesai' | 'Siap Diambil';

export interface ProductionProgressEntry {
  progress_id: string;
  order_id: string;
  percentage: number; // 0 - 100
  production_status: ProductionStatus;
  notes: string;
  photo_url?: string;
  drive_photo_id?: string;
  updated_at: string;
  updated_by: string;
}

export type PickupStatus = 'Belum Siap Diambil' | 'Siap Diambil' | 'Sudah Diambil';

export interface PickupInfoSettings {
  status: 'Belum Siap Diambil' | 'Siap Diambil';
  location: string;
  fullAddress: string;
  startDate: string;
  endDate: string;
  pickupHours: string;
  contactPerson: string;
  instructions: string;
  additionalNotes?: string;
}

export interface TrackOrderResult {
  found: boolean;
  message?: string;
  studentName?: string;
  nim?: string;
  className?: string;
  sizeCode?: string;
  customName?: string;
  orderNumber?: string;
  orderType?: OrderType;
  paymentStatus?: string;
  orderStatus?: string;
  productionStatus?: ProductionStatus;
  productionPercentage?: number;
  productionNotes?: string;
  productionPhotoUrl?: string;
  productionHistory?: ProductionProgressEntry[];
  pickupStatus?: PickupStatus;
  pickupInfo?: PickupInfoSettings;
  pickupAt?: string;
  pickupByPanitia?: string;
  isBuyer?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  message: string;
  timestamp: string;
}

export interface SheetSchemaSummary {
  [sheetName: string]: {
    rowCount: number;
    headers: string[];
  };
}

export interface DriveSubfolderMeta {
  id: string;
  name: string;
  url: string;
}

export interface DriveFolderStructure {
  root: DriveSubfolderMeta;
  subfolders: {
    DESIGN: DriveSubfolderMeta;
    PAYMENT_PROOF: DriveSubfolderMeta;
    RECEIPT: DriveSubfolderMeta;
    PRODUCTION_PROGRESS: DriveSubfolderMeta;
  };
}

export interface AuditLogEntry {
  log_id: string;
  timestamp: string;
  user_id: string;
  action: string;
  entity: string;
  details: string;
  ip_address?: string;
}

export interface NotificationRecord {
  notification_id: string;
  nim: string;
  order_id?: string;
  type: string;
  title: string;
  message: string;
  read_status: boolean;
  created_at: string;
  email_sent?: boolean;
}

export interface SystemConfig {
  appName: string;
  version: string;
  hasSpreadsheetId: boolean;
  roles: Role[];
  sheets: string[];
  driveFolders: Record<string, string>;
}

export interface PDHInfo {
  pdhName: string;
  pdhYear: string;
  pdhDescription: string;
  pdhSpec: string;
  pdhMaterial: string;
  pdhModel: string;
  pdhColor: string;
  pdhTerms: string;
  pdhContact: string;
}

export interface PDHPricing {
  price: number;
  active: boolean;
  notes: string;
}

export interface PDHSize {
  size_id: string;
  size_code: string;
  size_name: string;
  chest_width?: string;
  body_length?: string;
  sleeve_length?: string;
  extra_fee: number;
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string;
}

export interface PDHImage {
  image_id: string;
  product_id?: string;
  drive_file_id: string;
  file_url: string;
  file_name?: string;
  is_primary: boolean;
  uploaded_at?: string;
}

export interface PDHPaymentInfo {
  method: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  instructions: string;
}

export interface PDHMasterData {
  info: PDHInfo;
  pricing: PDHPricing;
  sizes: PDHSize[];
  images: PDHImage[];
  payment: PDHPaymentInfo;
}

export type POMode = 'MANUAL' | 'OTOMATIS';
export type POStatus = 'OPEN' | 'CLOSED';

export interface POPeriod {
  period_id: string;
  name: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  mode: POMode;
  status: POStatus;
  manual_override?: boolean;
  target_quota: number;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrderItemInput {
  fullName: string;
  nim: string;
  className: string; // Validated against ##MJSE### / ##MJSP### / ##MJSM###
  sizeCode: string;
  customName: string; // Bordir nama kustom
  quantity: number;
}

export interface OrderItemRecord {
  item_id: string;
  order_id: string;
  product_id?: string;
  size_code: string;
  custom_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  student_name?: string;
  nim?: string;
  class_name?: string;
}

export interface OrderPayload {
  orderType: OrderType; // PRIBADI | KOLEKTIF
  buyerName: string;
  buyerNim: string;
  buyerClass: string;
  buyerWhatsapp: string;
  notes?: string;
  items: OrderItemInput[];
}

export interface OrderRecord {
  order_id: string;
  order_number: string;
  user_id: string;
  order_type: OrderType;
  status: string;
  payment_status: 'BELUM_BAYAR' | 'MENUNGGU APPROVAL' | 'LUNAS' | 'DITOLAK' | 'UNPAID' | 'PENDING' | 'PAID' | 'REJECTED';
  payment_method?: 'TRANSFER' | 'CASH' | string;
  payment_proof_file_id?: string;
  payment_proof_url?: string;
  payment_rejection_reason?: string;
  payment_uploaded_at?: string;
  payment_approved_at?: string;
  production_status?: ProductionStatus;
  production_percentage?: number;
  production_notes?: string;
  production_photo_url?: string;
  production_drive_photo_id?: string;
  production_updated_at?: string;
  production_history?: ProductionProgressEntry[];
  pickup_status?: PickupStatus;
  pickup_at?: string;
  pickup_by_panitia?: string;
  pickup_notes?: string;
  total_amount: number;
  buyer_name: string;
  buyer_nim: string;
  buyer_class: string;
  buyer_whatsapp: string;
  notes?: string;
  cancel_reason?: string;
  item_count: number;
  items: OrderItemRecord[];
  created_at: string;
}



