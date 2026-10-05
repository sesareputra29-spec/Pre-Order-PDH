// Google Auth Service Account Provider
import { google } from 'googleapis';
import { serverEnv } from '../config/env.ts';

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive'
];

export class GoogleAuthService {
  private static authClient: InstanceType<typeof google.auth.GoogleAuth> | null = null;
  private static lastAuthError: string | null = null;

  /**
   * Checks if required Google Service Account credentials are fully configured.
   */
  static isConfigured(): boolean {
    return Boolean(
      serverEnv.GOOGLE_CLIENT_EMAIL &&
      serverEnv.GOOGLE_PRIVATE_KEY &&
      serverEnv.GOOGLE_PRIVATE_KEY.length > 20
    );
  }

  /**
   * Gets or initializes the singleton GoogleAuth client.
   */
  static getAuthClient(): InstanceType<typeof google.auth.GoogleAuth> {
    if (!this.isConfigured()) {
      throw new Error(
        'Google Service Account credentials (GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY) belum dikonfigurasi di server environment.'
      );
    }

    if (!this.authClient) {
      try {
        this.authClient = new google.auth.GoogleAuth({
          credentials: {
            client_email: serverEnv.GOOGLE_CLIENT_EMAIL,
            private_key: serverEnv.GOOGLE_PRIVATE_KEY,
            project_id: serverEnv.GOOGLE_PROJECT_ID || undefined
          },
          scopes: GOOGLE_SCOPES
        });
        this.lastAuthError = null;
      } catch (err: any) {
        this.lastAuthError = err.message || 'Gagal menginisialisasi GoogleAuth client.';
        throw new Error(this.lastAuthError ?? undefined);
      }
    }

    return this.authClient;
  }

  /**
   * Tests authentication validity by requesting an access token.
   */
  static async verifyCredentials(): Promise<{ valid: boolean; message: string }> {
    if (!this.isConfigured()) {
      return {
        valid: false,
        message: 'Credentials belum diisi di environment variables (GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY).'
      };
    }

    try {
      const auth = this.getAuthClient();
      const client = await auth.getClient();
      await client.getAccessToken();
      return {
        valid: true,
        message: `Berhasil terotentikasi sebagai Service Account: ${serverEnv.GOOGLE_CLIENT_EMAIL}`
      };
    } catch (err: any) {
      const safeMessage = err.message || 'Gagal memverifikasi Service Account Google.';
      return {
        valid: false,
        message: safeMessage
      };
    }
  }

  static getLastAuthError(): string | null {
    return this.lastAuthError;
  }
}
