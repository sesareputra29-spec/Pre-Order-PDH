// Centralized final Vercel API Client for PDH Campus App (Fase 11 Finals)
import { ApiResponse, User, PDHMasterData, OrderRecord, POPeriod, ProductionStatus } from '../types';

const TOKEN_KEY = 'pdh_auth_token';
const USER_KEY = 'pdh_auth_user';
const TENANT_KEY = 'pdh_tenant_id';

class ApiClient {
  private baseUrl: string = '/api';

  // ==========================================
  // 1. TOKEN & SESSION STORAGE
  // ==========================================
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  setToken(token: string) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch {}
  }

  getUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  setUser(user: User) {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
      if ((user as any).tenant_id) {
        localStorage.setItem(TENANT_KEY, (user as any).tenant_id);
      }
    } catch {}
  }

  getTenantId(): string {
    try {
      const user = this.getUser();
      return (user as any)?.tenant_id || localStorage.getItem(TENANT_KEY) || 'TENANT-001';
    } catch {
      return 'TENANT-001';
    }
  }

  clearAuth() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      sessionStorage.removeItem('pdh_user_session');
    } catch {}
  }

  // ==========================================
  // 2. CORE FETCH WITH TIMEOUT & ERROR HANDLER
  // ==========================================
  private async request<T = any>(
    path: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const tenantId = this.getTenantId();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
      ...(options.headers as Record<string, string> || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
      const response = await fetch(url, {
        ...options,
        headers
      });

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg = json?.error?.message || json?.message || `HTTP ${response.status}: Permintaan gagal diproses.`;
        return {
          success: false,
          data: null as any,
          message: errorMsg,
          timestamp: new Date().toISOString()
        };
      }

      // Backend envelopes responses either in { success: true, data: ... } or { success: true, ... }
      return {
        success: json?.success !== false,
        data: json?.data !== undefined ? json.data : json,
        message: json?.message || 'Sukses',
        timestamp: json?.timestamp || new Date().toISOString()
      };
    } catch (err: any) {
      return {
        success: false,
        data: null as any,
        message: err?.message || 'Gagal terhubung ke server backend Vercel API.',
        timestamp: new Date().toISOString()
      };
    }
  }

  // ==========================================
  // 3. AUTHENTICATION SERVICE & INITIAL SETUP
  // ==========================================
  async getSetupStatus(): Promise<ApiResponse<{ has_active_admin: boolean; is_setup_needed: boolean; tenant_id: string; nama_prodi?: string }>> {
    return this.request('/setup/status', { method: 'GET' });
  }

  async setupInitialAdmin(payload: {
    name: string;
    email: string;
    password: string;
    confirmPassword?: string;
    username?: string;
  }): Promise<ApiResponse<{ user: User }>> {
    return this.request('/setup/admin', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async login(payload: { username: string; password: string; tenant_id?: string }): Promise<ApiResponse<User>> {
    const tenantId = payload.tenant_id || this.getTenantId();
    const res = await this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: payload.username.trim(),
        password: payload.password,
        tenant_id: tenantId
      })
    });

    if (res.success && res.data) {
      if (res.data.token) this.setToken(res.data.token);
      if (res.data.user) this.setUser(res.data.user);
      return {
        success: true,
        data: res.data.user,
        message: 'Login berhasil.',
        timestamp: new Date().toISOString()
      };
    }

    return res as any;
  }

  async verifySession(): Promise<ApiResponse<User>> {
    const token = this.getToken();
    if (!token) {
      return { success: false, data: null as any, message: 'Tidak ada sesi aktif.', timestamp: new Date().toISOString() };
    }
    const res = await this.request<{ user: User }>('/auth/me');
    if (res.success && res.data) {
      const user = res.data.user || (res.data as any);
      this.setUser(user);
      return { success: true, data: user, message: 'Sukses', timestamp: new Date().toISOString() };
    }
    return { success: false, data: null as any, message: 'Sesi berakhir.', timestamp: new Date().toISOString() };
  }

  async registerStudent(payload: {
    nim: string;
    name: string;
    className: string;
    email: string;
    password: string;
  }): Promise<ApiResponse<any>> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        nim: payload.nim.trim(),
        nama_lengkap: payload.name.trim(),
        kelas: payload.className.trim(),
        email: payload.email.trim().toLowerCase(),
        password: payload.password
      })
    });
  }

  async sendOTP(email: string): Promise<ApiResponse<any>> {
    return this.request('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase() })
    });
  }

  async forgotPassword(nim: string): Promise<ApiResponse<any>> {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ nim: nim.trim() })
    });
  }

  async resetPassword(token: string, newPass: string): Promise<ApiResponse<any>> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPass })
    });
  }

  async verifyAccountToken(token: string): Promise<ApiResponse<any>> {
    return this.request('/auth/verify-account', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse<any>> {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword })
    });
  }

  // ==========================================
  // 4. USER & ACCESS MANAGEMENT
  // ==========================================
  async getDatabaseTables(): Promise<ApiResponse<any>> {
    return this.request('/config/database');
  }

  async setupDriveFolders(): Promise<ApiResponse<any>> {
    return this.request('/config/drive');
  }

  async setupDatabase(spreadsheetId: string): Promise<ApiResponse<any>> {
    return this.request('/config/database', {
      method: 'POST',
      body: JSON.stringify({ spreadsheetId })
    });
  }

  async listUsers(options: { role?: string; search?: string } = {}): Promise<ApiResponse<User[]>> {
    const query = new URLSearchParams(options as any).toString();
    const res = await this.request<{ users: User[] }>(`/users?${query}`);
    if (res.success && res.data) {
      return { success: true, data: res.data.users || (res.data as any), message: 'Sukses', timestamp: new Date().toISOString() };
    }
    return res as any;
  }

  async createUser(payload: {
    username: string;
    name: string;
    email: string;
    role: string;
    division?: string;
    password?: string;
  }): Promise<ApiResponse<any>> {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateUser(userId: string, payload: Partial<User>): Promise<ApiResponse<any>> {
    return this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async toggleUserStatus(userId: string, newStatus: string): Promise<ApiResponse<any>> {
    return this.request(`/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
  }

  async resetUserPasswordByAdmin(userId: string, newPass: string): Promise<ApiResponse<any>> {
    return this.request(`/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password: newPass, newPassword: newPass })
    });
  }

  // Student Methods
  async listStudents(options: any = {}): Promise<ApiResponse<any[]>> {
    const q = new URLSearchParams(options).toString();
    const res = await this.request<{ students: any[] }>(`/students?${q}`);
    if (res.success && res.data) {
      const data = Array.isArray(res.data) ? res.data : (res.data.students || (res.data as any));
      return { success: true, data, message: 'Sukses', timestamp: new Date().toISOString() };
    }
    return res as any;
  }

  async getStudent(studentId: string): Promise<ApiResponse<any>> {
    return this.request(`/students/${studentId}`);
  }

  async createStudent(payload: any): Promise<ApiResponse<any>> {
    return this.request('/students', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateStudent(studentId: string, payload: any): Promise<ApiResponse<any>> {
    return this.request(`/students/${studentId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async importStudents(fileName: string, students: any[], isDryRun: boolean = false): Promise<ApiResponse<any>> {
    return this.request('/students/import', {
      method: 'POST',
      body: JSON.stringify({ fileName, students, isDryRun })
    });
  }

  async importCollectiveMembers(fileName: string, members: any[], isDryRun: boolean = false): Promise<ApiResponse<any>> {
    return this.request('/students/import-collective', {
      method: 'POST',
      body: JSON.stringify({ fileName, members, isDryRun })
    });
  }

  async logExportData(category: string, count: number): Promise<ApiResponse<any>> {
    return this.request('/audit/log-export', {
      method: 'POST',
      body: JSON.stringify({ category, count })
    });
  }

  // ==========================================
  // 5. MASTER PDH
  // ==========================================
  async getPDHMasterData(): Promise<ApiResponse<PDHMasterData>> {
    return this.request<PDHMasterData>('/pdh/master');
  }

  async updatePDHInfo(info: any): Promise<ApiResponse<any>> {
    return this.request('/pdh/info', {
      method: 'PUT',
      body: JSON.stringify(info)
    });
  }

  async updatePDHPricing(pricing: any): Promise<ApiResponse<any>> {
    return this.request('/pdh/pricing', {
      method: 'PUT',
      body: JSON.stringify(pricing)
    });
  }

  async savePDHSize(sizeData: any): Promise<ApiResponse<any>> {
    return this.request('/pdh/sizes', {
      method: 'POST',
      body: JSON.stringify(sizeData)
    });
  }

  async updatePDHPaymentInfo(paymentInfo: any): Promise<ApiResponse<any>> {
    return this.request('/pdh/payment-info', {
      method: 'PUT',
      body: JSON.stringify(paymentInfo)
    });
  }

  async uploadPDHDesignImage(payload: {
    file_name: string;
    mime_type: string;
    file_size_bytes?: number;
    base64_data: string;
    caption?: string;
  }): Promise<ApiResponse<any>> {
    return this.request('/pdh/images', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async deletePDHDesignImage(imageId: string): Promise<ApiResponse<any>> {
    return this.request(`/pdh/images/${imageId}`, {
      method: 'DELETE'
    });
  }

  async replacePDHDesignImage(replacingImageId: string, payload: any): Promise<ApiResponse<any>> {
    await this.deletePDHDesignImage(replacingImageId);
    return this.uploadPDHDesignImage(payload);
  }

  // ==========================================
  // 6. PO PERIODS
  // ==========================================
  async getActivePOPeriod(): Promise<ApiResponse<POPeriod & { isOpen: boolean }>> {
    return this.request<POPeriod & { isOpen: boolean }>('/periods/active');
  }

  async getAllPOPeriods(): Promise<ApiResponse<POPeriod[]>> {
    const res = await this.request<{ periods: POPeriod[] }>('/periods');
    if (res.success && res.data) {
      return { success: true, data: res.data.periods || (res.data as any), message: 'Sukses', timestamp: new Date().toISOString() };
    }
    return res as any;
  }

  async listPOPeriods(): Promise<ApiResponse<POPeriod[]>> {
    return this.getAllPOPeriods();
  }

  async savePOPeriod(periodData: any): Promise<ApiResponse<any>> {
    return this.request('/periods', {
      method: 'POST',
      body: JSON.stringify(periodData)
    });
  }

  async togglePOStatus(periodId: string, status: string): Promise<ApiResponse<any>> {
    return this.request(`/periods/${periodId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  // ==========================================
  // 7. ORDER MANAGEMENT
  // ==========================================
  async listOrders(filters: any = {}): Promise<ApiResponse<OrderRecord[]>> {
    const q = new URLSearchParams(filters).toString();
    const res = await this.request<{ orders: OrderRecord[] }>(`/orders?${q}`);
    if (res.success && res.data) {
      return { success: true, data: res.data.orders || (res.data as any), message: 'Sukses', timestamp: new Date().toISOString() };
    }
    return res as any;
  }

  async getAllOrders(filters: any = {}): Promise<ApiResponse<OrderRecord[]>> {
    return this.listOrders(filters);
  }

  async getStudentOrders(nimOrUserId: string): Promise<ApiResponse<OrderRecord[]>> {
    const res = await this.request<{ orders: OrderRecord[] }>(`/orders/student/${nimOrUserId}`);
    if (res.success && res.data) {
      return { success: true, data: res.data.orders || (res.data as any), message: 'Sukses', timestamp: new Date().toISOString() };
    }
    return res as any;
  }

  async getOrderById(orderId: string): Promise<ApiResponse<OrderRecord>> {
    return this.request<OrderRecord>(`/orders/${orderId}`);
  }

  async createOrder(payload: any): Promise<ApiResponse<OrderRecord>> {
    return this.request<OrderRecord>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateOrderDetails(orderId: string, payload: any): Promise<ApiResponse<any>> {
    return this.request(`/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async updateOrderStatus(orderId: string, status: string): Promise<ApiResponse<any>> {
    return this.request(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  async cancelOrder(orderId: string, reason: string): Promise<ApiResponse<any>> {
    return this.request(`/orders/${orderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  async trackOrder(nimOrOrder: string): Promise<ApiResponse<any>> {
    return this.request(`/orders/track/${encodeURIComponent(nimOrOrder)}`);
  }

  async trackOrderPublic(nimOrOrder: string): Promise<ApiResponse<any>> {
    return this.trackOrder(nimOrOrder);
  }

  // ==========================================
  // 8. PAYMENT & PAYMENT PROOFS
  // ==========================================
  async listPayments(filters: any = {}): Promise<ApiResponse<any[]>> {
    const q = new URLSearchParams(filters).toString();
    const res = await this.request<{ payments: any[] }>(`/payments?${q}`);
    if (res.success && res.data) {
      return { success: true, data: res.data.payments || (res.data as any), message: 'Sukses', timestamp: new Date().toISOString() };
    }
    return res as any;
  }

  async createPayment(payload: any): Promise<ApiResponse<any>> {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async approvePayment(paymentIdOrOrderId: string, catatan?: string): Promise<ApiResponse<any>> {
    return this.request(`/payments/${paymentIdOrOrderId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ catatan })
    });
  }

  async rejectPayment(paymentIdOrOrderId: string, reason: string): Promise<ApiResponse<any>> {
    return this.request(`/payments/${paymentIdOrOrderId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  async uploadPaymentProof(paymentId: string, proofData: {
    file_name: string;
    mime_type: string;
    file_size_bytes?: number;
    base64_data: string;
  }): Promise<ApiResponse<any>> {
    return this.request(`/payments/${paymentId}/proofs`, {
      method: 'POST',
      body: JSON.stringify(proofData)
    });
  }

  async uploadPaymentProofForOrder(payload: {
    order_id: string;
    method?: string;
    amount?: number;
    file_name: string;
    mime_type: string;
    base64_data: string;
    payer_name?: string;
    payer_nim?: string;
  }): Promise<ApiResponse<any>> {
    const user = this.getUser();
    // 1. Submit payment
    const payRes = await this.request<any>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        order_id: payload.order_id,
        jumlah: payload.amount || 185000,
        metode: payload.method || 'Transfer Bank',
        payer_name: payload.payer_name || user?.name || 'Mahasiswa',
        payer_nim: payload.payer_nim || user?.nim || user?.username || 'NIM'
      })
    });

    const paymentId = payRes.data?.payment_id || payRes.data?.id || `PAY-${payload.order_id}`;

    // 2. Upload proof directly to Google Drive endpoint
    return this.request(`/payments/${paymentId}/proofs`, {
      method: 'POST',
      body: JSON.stringify({
        file_name: payload.file_name,
        mime_type: payload.mime_type,
        base64_data: payload.base64_data
      })
    });
  }

  // ==========================================
  // 9. PRODUCTION & BULK PROGRESS
  // ==========================================
  async listProductionOrders(filters: any = {}): Promise<ApiResponse<any[]>> {
    const q = new URLSearchParams(filters).toString();
    const res = await this.request<{ orders: any[] }>(`/production?${q}`);
    if (res.success && res.data) {
      return { success: true, data: res.data.orders || (res.data as any), message: 'Sukses', timestamp: new Date().toISOString() };
    }
    return res as any;
  }

  async updateProductionProgress(orderId: string, payload: {
    percentage: number;
    production_status?: ProductionStatus;
    notes?: string;
  }): Promise<ApiResponse<any>> {
    return this.request(`/production/${orderId}/progress`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async bulkUpdateProductionProgress(payload: {
    order_ids: string[];
    percentage?: number;
    production_status?: ProductionStatus;
    notes?: string;
    photo?: any;
  }): Promise<ApiResponse<any>> {
    return this.request('/production/bulk-progress', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async uploadProductionPhoto(orderId: string, photoData: {
    file_name: string;
    mime_type: string;
    file_size_bytes?: number;
    base64_data: string;
    notes?: string;
  }): Promise<ApiResponse<any>> {
    return this.request(`/production/${orderId}/photos`, {
      method: 'POST',
      body: JSON.stringify(photoData)
    });
  }

  async getPickupSettings(): Promise<ApiResponse<any>> {
    return this.request('/production/pickup-settings');
  }

  async savePickupSettings(settings: any): Promise<ApiResponse<any>> {
    return this.request('/production/pickup-settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
  }

  async markOrderSiapDiambil(orderId: string): Promise<ApiResponse<any>> {
    return this.request(`/production/${orderId}/siap-diambil`, {
      method: 'POST'
    });
  }

  async confirmOrderPickup(orderId: string, notes?: string): Promise<ApiResponse<any>> {
    return this.request(`/production/${orderId}/confirm-pickup`, {
      method: 'POST',
      body: JSON.stringify({ notes })
    });
  }

  // ==========================================
  // 10. NOTIFICATIONS
  // ==========================================
  async listNotifications(options: { is_read?: boolean; page?: number; limit?: number } = {}): Promise<ApiResponse<any>> {
    const q = new URLSearchParams(options as any).toString();
    return this.request(`/notifications?${q}`);
  }

  async getUnreadCount(): Promise<ApiResponse<{ unread_count: number }>> {
    return this.request<{ unread_count: number }>('/notifications/unread');
  }

  async markNotificationAsRead(id: string): Promise<ApiResponse<any>> {
    return this.request(`/notifications/${id}/read`, { method: 'POST' });
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse<any>> {
    return this.request('/notifications/read-all', { method: 'POST' });
  }

  // ==========================================
  // 11. AUDIT LOGS
  // ==========================================
  async getAuditLogs(options: any = {}): Promise<ApiResponse<any>> {
    const q = new URLSearchParams(options).toString();
    return this.request(`/audit?${q}`);
  }

  // ==========================================
  // 12. REPORTS & PDF
  // ==========================================
  async getOrderSummaryReport(filters: any = {}): Promise<ApiResponse<any>> {
    const q = new URLSearchParams(filters).toString();
    return this.request(`/reports/summary?${q}`);
  }

  async getClassReport(filters: any = {}): Promise<ApiResponse<any>> {
    const q = new URLSearchParams(filters).toString();
    return this.request(`/reports/classes?${q}`);
  }

  async getStudentReport(filters: any = {}): Promise<ApiResponse<any>> {
    const q = new URLSearchParams(filters).toString();
    return this.request(`/reports/students?${q}`);
  }

  async getPaymentReport(filters: any = {}): Promise<ApiResponse<any>> {
    const q = new URLSearchParams(filters).toString();
    return this.request(`/reports/payments?${q}`);
  }

  async getProductionReport(filters: any = {}): Promise<ApiResponse<any>> {
    const q = new URLSearchParams(filters).toString();
    return this.request(`/reports/production?${q}`);
  }

  async getPeriodReport(): Promise<ApiResponse<any>> {
    return this.request('/reports/periods');
  }

  async getConvectionReport(filters: any = {}): Promise<ApiResponse<any>> {
    const q = new URLSearchParams(filters).toString();
    return this.request(`/reports/convection?${q}`);
  }

  getPdfUrl(type: 'general' | 'convection', download: boolean = true, filters: any = {}): string {
    const token = this.getToken() || '';
    const params = new URLSearchParams({
      type,
      download: String(download),
      ...(token ? { token } : {}),
      ...filters
    });
    return `${this.baseUrl}/reports/pdf?${params.toString()}`;
  }
}

export const api = new ApiClient();
