// Google Drive Service Layer Abstraction
import { google, drive_v3 } from 'googleapis';
import { GoogleAuthService } from './googleAuthService.ts';

export interface DriveConnectionTestResult {
  connected: boolean;
  folderName?: string;
  folderMimeType?: string;
  message: string;
}

export class GoogleDriveService {
  private static driveInstance: drive_v3.Drive | null = null;

  private static getClient(): drive_v3.Drive {
    const auth = GoogleAuthService.getAuthClient();
    if (!this.driveInstance) {
      this.driveInstance = google.drive({ version: 'v3', auth });
    }
    return this.driveInstance;
  }

  /**
   * Tests read-only access to target Google Drive folder without modifying or deleting any files.
   */
  static async testConnection(folderId: string): Promise<DriveConnectionTestResult> {
    if (!folderId) {
      return {
        connected: false,
        message: 'Google Drive Root Folder ID tidak disediakan.'
      };
    }

    if (!GoogleAuthService.isConfigured()) {
      return {
        connected: false,
        message: 'Google Service Account belum dikonfigurasi pada server environment.'
      };
    }

    try {
      const drive = this.getClient();
      const res = await drive.files.get({
        fileId: folderId,
        fields: 'id,name,mimeType,trashed',
        supportsAllDrives: true
      });

      const name = res.data.name || 'Root Folder';
      const isTrashed = res.data.trashed || false;

      if (isTrashed) {
        return {
          connected: false,
          folderName: name,
          message: `Folder Drive "${name}" berada di tempat sampah (trashed).`
        };
      }

      return {
        connected: true,
        folderName: name,
        folderMimeType: res.data.mimeType || 'application/vnd.google-apps.folder',
        message: `Berhasil terhubung ke Google Drive folder: "${name}".`
      };
    } catch (err: any) {
      const errorDetail = err.response?.data?.error?.message || err.message || 'Gagal membaca Google Drive folder.';
      return {
        connected: false,
        message: `Gagal mengakses Google Drive Folder (${folderId.slice(0, 6)}...): ${errorDetail}`
      };
    }
  }
}
