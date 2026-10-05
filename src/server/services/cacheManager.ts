// Central Cache Manager for Serverless In-Memory Cache Synchronization
import { ConfigService } from './configService.ts';
import { PDHService } from './pdhService.ts';
import { PeriodService } from './periodService.ts';
import { UserService } from './userService.ts';
import { StudentService } from './studentService.ts';
import { OrderService } from './orderService.ts';
import { PaymentService } from './paymentService.ts';
import { ProductionService } from './productionService.ts';
import { NotificationService } from './notificationService.ts';
import { AuditService } from './auditService.ts';
import { AuthService } from './authService.ts';

export class CacheManager {
  /**
   * Invalidates in-memory caches across all services for a given tenant or globally.
   * Forces subsequent reads to fetch fresh, up-to-date state directly from Google Sheets.
   */
  static invalidateAll(tenantId?: string): void {
    ConfigService.invalidateCache(tenantId);
    PDHService.invalidateCache(tenantId);
    PeriodService.invalidateCache(tenantId);
    UserService.invalidateCache(tenantId);
    StudentService.invalidateCache(tenantId);
    OrderService.invalidateCache(tenantId);
    PaymentService.invalidateCache(tenantId);
    ProductionService.invalidateCache(tenantId);
    NotificationService.invalidateCache(tenantId);
    AuditService.invalidateCache(tenantId);
    AuthService.invalidateCache(tenantId);
  }
}
