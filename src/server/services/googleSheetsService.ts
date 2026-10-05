// Google Sheets Service Layer Abstraction (Production API + Simulated Fallback)
import { google, sheets_v4 } from 'googleapis';
import { GoogleAuthService } from './googleAuthService.ts';

export interface SheetConnectionTestResult {
  connected: boolean;
  spreadsheetTitle?: string;
  sheetsCount?: number;
  sheetNames?: string[];
  message: string;
}

export class GoogleSheetsService {
  private static sheetsInstance: sheets_v4.Sheets | null = null;
  private static simulatedStore: Map<string, any[][]> = new Map();

  private static getClient(): sheets_v4.Sheets {
    const auth = GoogleAuthService.getAuthClient();
    if (!this.sheetsInstance) {
      this.sheetsInstance = google.sheets({ version: 'v4', auth });
    }
    return this.sheetsInstance;
  }

  /**
   * Tests read-only connection to target Google Spreadsheet without modifying any data.
   */
  static async testConnection(spreadsheetId: string): Promise<SheetConnectionTestResult> {
    if (!spreadsheetId) {
      return {
        connected: false,
        message: 'Spreadsheet ID tidak disediakan.'
      };
    }

    if (!GoogleAuthService.isConfigured()) {
      return {
        connected: false,
        message: 'Google Service Account belum dikonfigurasi pada server environment.'
      };
    }

    try {
      const sheets = this.getClient();
      const res = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'properties.title,sheets.properties.title'
      });

      const title = res.data.properties?.title || 'Untitled Spreadsheet';
      const sheetNames = res.data.sheets?.map((s) => s.properties?.title || '').filter(Boolean) || [];

      return {
        connected: true,
        spreadsheetTitle: title,
        sheetsCount: sheetNames.length,
        sheetNames,
        message: `Berhasil terhubung ke Google Sheets: "${title}" (${sheetNames.length} sheet terdeteksi).`
      };
    } catch (err: any) {
      const errorDetail = err.response?.data?.error?.message || err.message || 'Gagal membaca Google Sheets.';
      return {
        connected: false,
        message: `Gagal mengakses Spreadsheet (${spreadsheetId.slice(0, 6)}...): ${errorDetail}`
      };
    }
  }

  /**
   * Safely reads cell range from the target Google Spreadsheet.
   */
  static async getValues(spreadsheetId: string, range: string): Promise<any[][] | null> {
    if (!GoogleAuthService.isConfigured()) {
      const sheetName = range.split('!')[0];
      const stored = this.simulatedStore.get(`${spreadsheetId}:${sheetName}`);
      if (!stored || stored.length === 0) return [];
      if (range.includes('!A2')) {
        return stored.slice(1);
      }
      return stored;
    }

    try {
      const sheets = this.getClient();
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range
      });
      return res.data.values || [];
    } catch (err: any) {
      console.warn(`[GoogleSheetsService] API error on getValues (${range}):`, err.message || err);
      return [];
    }
  }

  /**
   * Safely updates cell range in the target Google Spreadsheet.
   */
  static async updateValues(spreadsheetId: string, range: string, values: any[][]): Promise<void> {
    const sheetName = range.split('!')[0];
    this.simulatedStore.set(`${spreadsheetId}:${sheetName}`, values);

    if (!GoogleAuthService.isConfigured()) {
      return;
    }

    try {
      const sheets = this.getClient();
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: { values }
      });
    } catch (err: any) {
      console.warn(`[GoogleSheetsService] API error on updateValues (${range}):`, err.message || err);
    }
  }

  /**
   * Safely appends rows to a sheet in the target Google Spreadsheet.
   */
  static async appendValues(spreadsheetId: string, range: string, values: any[][]): Promise<void> {
    const sheetName = range.split('!')[0];
    const existing = this.simulatedStore.get(`${spreadsheetId}:${sheetName}`) || [];
    this.simulatedStore.set(`${spreadsheetId}:${sheetName}`, [...existing, ...values]);

    if (!GoogleAuthService.isConfigured()) {
      return;
    }

    try {
      const sheets = this.getClient();
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: { values }
      });
    } catch (err: any) {
      console.warn(`[GoogleSheetsService] API error on appendValues (${range}):`, err.message || err);
    }
  }

  /**
   * Safely ensures that a sheet with the specified name exists in the spreadsheet.
   */
  static async ensureSheetExists(spreadsheetId: string, sheetName: string): Promise<void> {
    if (!GoogleAuthService.isConfigured()) return;
    try {
      const sheets = this.getClient();
      const res = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties.title'
      });
      const sheetNames = res.data.sheets?.map(s => s.properties?.title || '').filter(Boolean) || [];
      if (sheetNames.includes(sheetName)) {
        return;
      }
      
      console.log(`[GoogleSheetsService] Membuat sheet baru: '${sheetName}'...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName
                }
              }
            }
          ]
        }
      });
    } catch (err: any) {
      console.error(`[GoogleSheetsService] Gagal memastikan/membuat sheet '${sheetName}':`, err.message || err);
    }
  }
}
