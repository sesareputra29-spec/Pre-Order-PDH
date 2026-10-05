// Production Email Dispatcher Service (Resend API & Development Fallback)
import { Resend } from 'resend';
import { getTenantById } from '../config/tenants.ts';

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  mode: 'RESEND_API' | 'DEV_FALLBACK';
  error?: string;
}

export class EmailService {
  private static getResendClient(): Resend | null {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey.startsWith('re_placeholder') || apiKey.trim() === '') {
      return null;
    }
    return new Resend(apiKey.trim());
  }

  private static getAppBaseUrl(): string {
    const baseUrl = process.env.APP_BASE_URL || process.env.VERCEL_URL;
    if (!baseUrl) {
      return 'http://localhost:3000';
    }
    if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
      return baseUrl.replace(/\/+$/, '');
    }
    return `https://${baseUrl.replace(/\/+$/, '')}`;
  }

  private static getSenderEmail(tenantId?: string): string {
    if (process.env.EMAIL_FROM && process.env.EMAIL_FROM.trim()) {
      return process.env.EMAIL_FROM.trim();
    }
    const tenant = tenantId ? getTenantById(tenantId) : null;
    const prodiName = tenant ? tenant.nama_prodi : 'PDH Campus Order';
    return `${prodiName} <onboarding@resend.dev>`;
  }

  /**
   * Sends student account email verification email.
   */
  static async sendVerificationEmail(payload: {
    tenantId: string;
    email: string;
    name: string;
    verificationToken: string;
  }): Promise<SendEmailResult> {
    const { tenantId, email, name, verificationToken } = payload;
    const baseUrl = this.getAppBaseUrl();
    const verifyLink = `${baseUrl}/?verify_token=${verificationToken}`;
    const tenant = getTenantById(tenantId);
    const universityName = tenant ? tenant.nama_universitas : 'Universitas';
    const prodiName = tenant ? tenant.nama_prodi : 'Program Studi';

    const subject = `[PDH Campus Order] Verifikasi Akun Mahasiswa Anda`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifikasi Akun - PDH Campus Order</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 0; color: #333333; }
    .container { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
    .header { background-color: #1e3a8a; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 30px 24px; line-height: 1.6; }
    .greeting { font-size: 16px; font-weight: 600; color: #1e293b; margin-bottom: 12px; }
    .btn-container { text-align: center; margin: 30px 0; }
    .btn { background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 14px 28px; font-size: 15px; font-weight: 600; border-radius: 6px; display: inline-block; box-shadow: 0 2px 5px rgba(37,99,235,0.3); }
    .expiry-notice { background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #1e40af; margin-top: 20px; }
    .footer { background-color: #f8fafc; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .link-fallback { font-size: 12px; color: #64748b; word-break: break-all; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PDH CAMPUS ORDER</h1>
      <p>${prodiName} - ${universityName}</p>
    </div>
    <div class="content">
      <div class="greeting">Halo ${name},</div>
      <p>Pendaftaran akun Anda pada sistem pemesanan Pakaian Dinas Harian (PDH) Kampus telah berhasil diproses.</p>
      <p>Untuk mengaktifkan akun dan mulai melakukan pemesanan seragam, silakan verifikasi alamat email Anda dengan menekan tombol di bawah ini:</p>
      
      <div class="btn-container">
        <a href="${verifyLink}" class="btn" target="_blank">Verifikasi Akun Saya</a>
      </div>

      <div class="expiry-notice">
        <strong>🔒 Informasi Keamanan:</strong> Tautan verifikasi ini berlaku selama <strong>24 jam</strong>. Demi keamanan akun Anda, jangan bagikan tautan ini kepada siapapun.
      </div>

      <div class="link-fallback">
        Jika tombol di atas tidak dapat diklik, salin dan tempel tautan berikut pada browser Anda:<br>
        <a href="${verifyLink}" style="color: #2563eb;">${verifyLink}</a>
      </div>
    </div>
    <div class="footer">
      &copy; 2026 ${prodiName} - ${universityName}. All rights reserved.<br>
      Pesan ini dikirim secara otomatis oleh sistem PDH Campus Order.
    </div>
  </div>
</body>
</html>
    `;

    const resend = this.getResendClient();
    if (!resend) {
      console.log(`[EmailService] [DEV FALLBACK] Verifikasi email disimulasikan untuk ${email} (Tenant: ${tenantId}).`);
      return {
        success: true,
        mode: 'DEV_FALLBACK'
      };
    }

    try {
      const from = this.getSenderEmail(tenantId);
      const res = await resend.emails.send({
        from,
        to: [email],
        subject,
        html: htmlContent
      });

      if (res.error) {
        console.error(`[EmailService] Resend API Error saat mengirim verifikasi email ke ${email}:`, res.error.message || res.error);
        return {
          success: false,
          mode: 'RESEND_API',
          error: res.error.message || 'Gagal mengirim email verifikasi.'
        };
      }

      console.log(`[EmailService] [RESEND API] Email verifikasi berhasil dikirim ke ${email} (ID: ${res.data?.id}).`);
      return {
        success: true,
        messageId: res.data?.id,
        mode: 'RESEND_API'
      };
    } catch (err: any) {
      console.error(`[EmailService] Exception saat mengirim email verifikasi ke ${email}:`, err.message || err);
      return {
        success: false,
        mode: 'RESEND_API',
        error: err.message || 'Gagal terhubung ke layanan email Resend.'
      };
    }
  }

  /**
   * Sends password reset link email.
   */
  static async sendPasswordResetEmail(payload: {
    tenantId: string;
    email: string;
    name: string;
    resetToken: string;
  }): Promise<SendEmailResult> {
    const { tenantId, email, name, resetToken } = payload;
    const baseUrl = this.getAppBaseUrl();
    const resetLink = `${baseUrl}/?reset_token=${resetToken}`;
    const tenant = getTenantById(tenantId);
    const universityName = tenant ? tenant.nama_universitas : 'Universitas';
    const prodiName = tenant ? tenant.nama_prodi : 'Program Studi';

    const subject = `[PDH Campus Order] Instruksi Reset Kata Sandi Akun Anda`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Kata Sandi - PDH Campus Order</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 0; color: #333333; }
    .container { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
    .header { background-color: #1e3a8a; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 30px 24px; line-height: 1.6; }
    .greeting { font-size: 16px; font-weight: 600; color: #1e293b; margin-bottom: 12px; }
    .btn-container { text-align: center; margin: 30px 0; }
    .btn { background-color: #dc2626; color: #ffffff !important; text-decoration: none; padding: 14px 28px; font-size: 15px; font-weight: 600; border-radius: 6px; display: inline-block; box-shadow: 0 2px 5px rgba(220,38,38,0.3); }
    .warning-notice { background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #991b1b; margin-top: 20px; }
    .footer { background-color: #f8fafc; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .link-fallback { font-size: 12px; color: #64748b; word-break: break-all; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PDH CAMPUS ORDER</h1>
      <p>${prodiName} - ${universityName}</p>
    </div>
    <div class="content">
      <div class="greeting">Halo ${name},</div>
      <p>Kami menerima permintaan untuk mereset kata sandi akun PDH Campus Order Anda.</p>
      <p>Silakan klik tombol di bawah ini untuk membuat kata sandi baru:</p>
      
      <div class="btn-container">
        <a href="${resetLink}" class="btn" target="_blank">Reset Kata Sandi Saya</a>
      </div>

      <div class="warning-notice">
        <strong>⚠️ Perhatian:</strong> Tautan ini berlaku selama <strong>2 jam</strong>. Jika Anda tidak merasa mengajukan permintaan reset kata sandi, silakan abaikan email ini. Kata sandi Anda akan tetap aman.
      </div>

      <div class="link-fallback">
        Jika tombol di atas tidak dapat diklik, salin dan tempel tautan berikut pada browser Anda:<br>
        <a href="${resetLink}" style="color: #dc2626;">${resetLink}</a>
      </div>
    </div>
    <div class="footer">
      &copy; 2026 ${prodiName} - ${universityName}. All rights reserved.<br>
      Pesan ini dikirim secara otomatis oleh sistem PDH Campus Order.
    </div>
  </div>
</body>
</html>
    `;

    const resend = this.getResendClient();
    if (!resend) {
      console.log(`[EmailService] [DEV FALLBACK] Email reset password disimulasikan untuk ${email} (Tenant: ${tenantId}).`);
      return {
        success: true,
        mode: 'DEV_FALLBACK'
      };
    }

    try {
      const from = this.getSenderEmail(tenantId);
      const res = await resend.emails.send({
        from,
        to: [email],
        subject,
        html: htmlContent
      });

      if (res.error) {
        console.error(`[EmailService] Resend API Error saat mengirim reset password email ke ${email}:`, res.error.message || res.error);
        return {
          success: false,
          mode: 'RESEND_API',
          error: res.error.message || 'Gagal mengirim email reset password.'
        };
      }

      console.log(`[EmailService] [RESEND API] Email reset password berhasil dikirim ke ${email} (ID: ${res.data?.id}).`);
      return {
        success: true,
        messageId: res.data?.id,
        mode: 'RESEND_API'
      };
    } catch (err: any) {
      console.error(`[EmailService] Exception saat mengirim email reset password ke ${email}:`, err.message || err);
      return {
        success: false,
        mode: 'RESEND_API',
        error: err.message || 'Gagal terhubung ke layanan email Resend.'
      };
    }
  }
}
