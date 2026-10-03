import React, { useState } from 'react';
import { FileCode, Copy, Check, ExternalLink, ShieldCheck, Download } from 'lucide-react';

interface GASFile {
  filename: string;
  type: 'gs' | 'html';
  description: string;
  code: string;
}

const GAS_FILES: GASFile[] = [
  {
    filename: 'Code.gs',
    type: 'gs',
    description: 'Entry point doGet() dan dispatcher RPC server-side',
    code: `/**
 * PDH CAMPUS ORDER SYSTEM
 * Main Entry Point: Code.gs
 */
function doGet(e) {
  try {
    var template = HtmlService.createTemplateFromFile('Index');
    var output = template.evaluate();
    output.setTitle(CONFIG.APP_NAME + ' - System Pemesanan PDH Kampus');
    output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    output.addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
    return output;
  } catch (err) {
    return HtmlService.createHtmlOutput('<h3>Error Loading Web App</h3><p>' + err.message + '</p>');
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getSystemInfo() {
  return createResponse(true, getSystemPublicConfig(), 'System config loaded.');
}

function loginUser(credentials) {
  return apiAuthenticateUser(credentials);
}

function getUserProfile(userId) {
  return apiGetUserProfile(userId);
}

function setupDatabase(spreadsheetId) {
  return initDatabase(spreadsheetId);
}

function getDatabaseTables(userId) {
  if (!authorizeRole(userId, CONFIG.ROLES.PANITIA)) return createResponse(false, null, 'Akses ditolak.');
  try {
    var summary = {};
    Object.keys(CONFIG.SHEETS).forEach(function(key) {
      var sheetName = CONFIG.SHEETS[key];
      var rows = batchRead(sheetName);
      summary[sheetName] = { rowCount: rows.length, headers: SCHEMAS[sheetName] || [] };
    });
    return createResponse(true, summary, 'Tabel database berhasil dimuat.');
  } catch (err) {
    return createResponse(false, null, 'Gagal membaca database: ' + err.message);
  }
}

function setupDriveFolders(userId) {
  if (!authorizeRole(userId, CONFIG.ROLES.PANITIA)) return createResponse(false, null, 'Akses ditolak.');
  return apiInitDriveFolders();
}

function getAuditLogs(userId, limit) {
  return apiGetAuditLogs(userId, limit);
}`
  },
  {
    filename: 'Config.gs',
    type: 'gs',
    description: 'Konfigurasi terpusat ID Spreadsheet, Drive, dan Roles',
    code: `/**
 * PDH CAMPUS ORDER SYSTEM
 * Configuration File: Config.gs
 */
var CONFIG = {
  APP_NAME: 'PDH Campus Order',
  APP_VERSION: '1.0.0 (Tahap 1 - Fondasi)',
  SPREADSHEET_ID: (function() {
    try {
      var props = PropertiesService.getScriptProperties();
      return props.getProperty('SPREADSHEET_ID') || '';
    } catch(e) { return ''; }
  })(),
  SHEETS: {
    USERS: 'USERS',
    SETTINGS: 'SETTINGS',
    AUDIT_LOG: 'AUDIT_LOG',
    PRODUCTS: 'PRODUCTS',
    PRODUCT_SIZES: 'PRODUCT_SIZES',
    PRODUCT_IMAGES: 'PRODUCT_IMAGES',
    PO_PERIODS: 'PO_PERIODS',
    STUDENTS: 'STUDENTS',
    CLASSES: 'CLASSES',
    ORDERS: 'ORDERS',
    ORDER_ITEMS: 'ORDER_ITEMS',
    PAYMENTS: 'PAYMENTS',
    PAYMENT_PROOFS: 'PAYMENT_PROOFS',
    PRODUCTION_PROGRESS: 'PRODUCTION_PROGRESS',
    PICKUP_INFORMATION: 'PICKUP_INFORMATION',
    NOTIFICATIONS: 'NOTIFICATIONS'
  },
  DRIVE: {
    ROOT_FOLDER_NAME: 'PDH_CAMPUS',
    SUBFOLDERS: {
      DESIGN: 'DESIGN',
      PAYMENT_PROOF: 'PAYMENT_PROOF',
      RECEIPT: 'RECEIPT',
      PRODUCTION_PROGRESS: 'PRODUCTION_PROGRESS'
    }
  },
  ROLES: { PANITIA: 'PANITIA', MAHASISWA: 'MAHASISWA' },
  ORDER_TYPES: { PRIBADI: 'PRIBADI', KOLEKTIF: 'KOLEKTIF' }
};`
  },
  {
    filename: 'Database.gs',
    type: 'gs',
    description: 'Akses Google Sheets, Schema 16 Tabel, Batch Operations, Audit Log',
    code: `/**
 * PDH CAMPUS ORDER SYSTEM
 * Database File: Database.gs
 */
var SCHEMAS = {
  USERS: ['user_id', 'username', 'password_hash', 'name', 'email', 'role', 'status', 'created_at', 'updated_at'],
  SETTINGS: ['setting_key', 'setting_value', 'description', 'updated_at'],
  AUDIT_LOG: ['log_id', 'timestamp', 'user_id', 'action', 'entity', 'details', 'ip_address'],
  PRODUCTS: ['product_id', 'code', 'name', 'description', 'base_price', 'category', 'status', 'created_at'],
  PRODUCT_SIZES: ['size_id', 'product_id', 'size_code', 'extra_fee', 'chest_width', 'body_length', 'sleeve_length'],
  PRODUCT_IMAGES: ['image_id', 'product_id', 'drive_file_id', 'file_url', 'is_primary', 'sort_order'],
  PO_PERIODS: ['period_id', 'name', 'start_date', 'end_date', 'target_quota', 'status', 'notes'],
  STUDENTS: ['student_id', 'user_id', 'nim', 'full_name', 'class_name', 'phone', 'whatsapp'],
  CLASSES: ['class_id', 'class_name', 'department', 'batch_year'],
  ORDERS: ['order_id', 'order_number', 'user_id', 'order_type', 'status', 'total_amount', 'shipping_type', 'created_at'],
  ORDER_ITEMS: ['item_id', 'order_id', 'product_id', 'size_code', 'custom_name', 'quantity', 'unit_price', 'subtotal'],
  PAYMENTS: ['payment_id', 'order_id', 'payment_method', 'amount', 'status', 'verification_status', 'created_at'],
  PAYMENT_PROOFS: ['proof_id', 'payment_id', 'drive_file_id', 'file_name', 'mime_type', 'uploaded_at'],
  PRODUCTION_PROGRESS: ['progress_id', 'period_id', 'stage_name', 'percentage', 'notes', 'drive_photo_id', 'updated_at'],
  PICKUP_INFORMATION: ['pickup_id', 'order_id', 'status', 'location', 'pickup_date', 'picked_up_by', 'receipt_signature'],
  NOTIFICATIONS: ['notification_id', 'user_id', 'title', 'message', 'type', 'is_read', 'created_at']
};

function getSpreadsheet() {
  var id = CONFIG.SPREADSHEET_ID;
  if (id) return SpreadsheetApp.openById(id);
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  throw new Error('Spreadsheet ID belum dikonfigurasi.');
}

function getSheet(sheetName) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (SCHEMAS[sheetName]) {
      sheet.appendRow(SCHEMAS[sheetName]);
      sheet.getRange(1, 1, 1, SCHEMAS[sheetName].length).setFontWeight('bold').setBackground('#F3F4F6');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function batchRead(sheetName) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var rowObj = {};
    for (var j = 0; j < headers.length; j++) rowObj[headers[j]] = data[i][j];
    rows.push(rowObj);
  }
  return rows;
}

function appendData(sheetName, rowData) {
  var sheet = getSheet(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn() || SCHEMAS[sheetName].length).getValues()[0];
  var newRow = headers.map(function(h) { return rowData[h] !== undefined ? rowData[h] : ''; });
  sheet.appendRow(newRow);
  return true;
}

function initDatabase(optionalSpreadsheetId) {
  var ss = optionalSpreadsheetId ? SpreadsheetApp.openById(optionalSpreadsheetId) : SpreadsheetApp.create('PDH Campus Order Database');
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
  
  var existingUsers = batchRead(CONFIG.SHEETS.USERS);
  if (existingUsers.length === 0) {
    var now = new Date().toISOString();
    appendData(CONFIG.SHEETS.USERS, {
      user_id: 'USR-ADMIN-01', username: 'admin', password_hash: '123',
      name: 'Administrator Panitia', email: 'admin.pdh@campus.ac.id',
      role: 'PANITIA', status: 'ACTIVE', created_at: now, updated_at: now
    });
    appendData(CONFIG.SHEETS.USERS, {
      user_id: 'USR-MHS-01', username: 'mhs', password_hash: '123',
      name: 'Ahmad Mahasiswa', email: 'ahmad.mhs@campus.ac.id',
      role: 'MAHASISWA', status: 'ACTIVE', created_at: now, updated_at: now
    });
  }
  return { success: true, spreadsheetId: ss.getId(), url: ss.getUrl() };
}`
  },
  {
    filename: 'Auth.gs',
    type: 'gs',
    description: 'Modul Autentikasi Server-side, Verifikasi Password & Session Token',
    code: `/**
 * PDH CAMPUS ORDER SYSTEM
 * Auth Module: Auth.gs
 */
function apiAuthenticateUser(credentials) {
  if (!credentials || !credentials.username || !credentials.password) {
    return createResponse(false, null, 'Username dan password wajib diisi.');
  }
  var username = String(credentials.username).trim().toLowerCase();
  var password = String(credentials.password).trim();
  var users = batchRead(CONFIG.SHEETS.USERS);
  var user = users.find(function(u) { return String(u.username).toLowerCase() === username; });

  if (!user || String(user.password_hash) !== password) {
    return createResponse(false, null, 'Username atau password salah.');
  }

  var token = 'SESS-' + new Date().getTime();
  return createResponse(true, {
    userId: user.user_id, username: user.username, name: user.name,
    email: user.email, role: user.role, token: token
  }, 'Login berhasil!');
}

function authorizeRole(userId, requiredRole) {
  if (!userId) return false;
  var users = batchRead(CONFIG.SHEETS.USERS);
  var user = users.find(function(u) { return u.user_id === userId; });
  return user && user.status === 'ACTIVE' && (!requiredRole || user.role === requiredRole);
}`
  },
  {
    filename: 'DriveService.gs',
    type: 'gs',
    description: 'Manajemen Struktur Folder Google Drive (PDH_CAMPUS & Subfolders)',
    code: `/**
 * PDH CAMPUS ORDER SYSTEM
 * Drive Service: DriveService.gs
 */
function apiInitDriveFolders() {
  try {
    var rootName = CONFIG.DRIVE.ROOT_FOLDER_NAME;
    var rootFolder = getOrCreateFolderInDrive(rootName, null);
    var subfolders = {};

    Object.keys(CONFIG.DRIVE.SUBFOLDERS).forEach(function(key) {
      var subName = CONFIG.DRIVE.SUBFOLDERS[key];
      var sub = getOrCreateFolderInDrive(subName, rootFolder);
      subfolders[key] = { id: sub.getId(), name: subName, url: sub.getUrl() };
    });

    return createResponse(true, {
      root: { id: rootFolder.getId(), name: rootName, url: rootFolder.getUrl() },
      subfolders: subfolders
    }, 'Struktur Google Drive berhasil dikonfigurasi.');
  } catch(err) {
    return createResponse(false, null, 'Drive error: ' + err.message);
  }
}

function getOrCreateFolderInDrive(folderName, parentFolder) {
  var folders = parentFolder ? parentFolder.getFoldersByName(folderName) : DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return parentFolder ? parentFolder.createFolder(folderName) : DriveApp.createFolder(folderName);
}`
  },
  {
    filename: 'PDHMaster.gs',
    type: 'gs',
    description: 'Modul Master PDH, Pengaturan Informasi, Ukuran, Harga, Desain Drive & Rekening',
    code: `/**
 * PDH CAMPUS ORDER SYSTEM
 * Master PDH Service: PDHMaster.gs
 */
function apiGetPDHMasterData() {
  var settings = batchRead(CONFIG.SHEETS.SETTINGS);
  var map = {};
  for (var i = 0; i < settings.length; i++) map[settings[i].setting_key] = settings[i].setting_value;

  var info = {
    pdhName: map['PDH_NAME'] || 'Pakaian Dinas Harian (PDH) Kampus 2026',
    pdhYear: map['PDH_YEAR'] || '2026/2027',
    pdhDescription: map['PDH_DESCRIPTION'] || 'Seragam resmi PDH Kampus berkualitas tinggi dengan bahan American Drill premium.',
    pdhSpec: map['PDH_SPEC'] || 'Lengan Panjang, Kerah Kemeja, 2 Saku Depan, Bordir Logo Kampus & Bordir Nama',
    pdhMaterial: map['PDH_MATERIAL'] || 'American Drill Premium',
    pdhModel: map['PDH_MODEL'] || 'Unisex (Slim Fit & Reguler)',
    pdhColor: map['PDH_COLOR'] || 'Navy Blue / Biru Dongker',
    pdhTerms: map['PDH_TERMS'] || 'Wajib melunasi pembayaran sesuai jadwal. Nama bordir kustom max 18 karakter.',
    pdhContact: map['PDH_CONTACT'] || 'WhatsApp Panitia: 0812-3456-7890'
  };

  var pricing = {
    price: parseFloat(map['PDH_PRICE'] || '185000'),
    active: String(map['PDH_PRICE_ACTIVE']) !== 'false',
    notes: map['PDH_PRICE_NOTES'] || 'Harga termasuk bordir nama & logo resmi kampus.'
  };

  var payment = {
    method: map['PAYMENT_METHOD'] || 'Transfer Bank / QRIS',
    bankName: map['PAYMENT_BANK'] || 'Bank Mandiri',
    accountNumber: map['PAYMENT_NUMBER'] || '137-00-1234567-8',
    accountHolder: map['PAYMENT_HOLDER'] || 'Panitia PDH Kampus 2026',
    instructions: map['PAYMENT_INSTRUCTIONS'] || 'Sertakan Kode Unik Pesanan pada berita transfer.'
  };

  var rawSizes = batchRead(CONFIG.SHEETS.PRODUCT_SIZES);
  var sizes = rawSizes.map(function(s) {
    return {
      size_id: s.size_id, size_code: s.size_code, size_name: s.size_code,
      chest_width: s.chest_width, body_length: s.body_length, sleeve_length: s.sleeve_length,
      extra_fee: parseFloat(s.extra_fee || 0), status: s.status || 'ACTIVE'
    };
  });

  var rawImages = batchRead(CONFIG.SHEETS.PRODUCT_IMAGES);
  var images = rawImages.map(function(img) {
    return {
      image_id: img.image_id, drive_file_id: img.drive_file_id, file_url: img.file_url,
      file_name: img.file_name, is_primary: String(img.is_primary) === 'true'
    };
  });

  return createResponse(true, { info: info, pricing: pricing, sizes: sizes, images: images, payment: payment }, 'Master PDH loaded.');
}`
  },
  {
    filename: 'POPeriod.gs',
    type: 'gs',
    description: 'Modul Evaluasi Periode Pre-Order (PO), Mode Otomatis/Manual & Validation',
    code: `/**
 * PDH CAMPUS ORDER SYSTEM
 * PO Period Service: POPeriod.gs
 */
function apiGetActivePOPeriod() {
  var periods = batchRead(CONFIG.SHEETS.PO_PERIODS);
  if (periods.length === 0) return createResponse(false, null, 'Tidak ada PO.');
  var active = periods[0];
  var isOpen = active.status === 'OPEN';
  return createResponse(true, { period_id: active.period_id, name: active.name, status: active.status, isOpen: isOpen }, 'PO active loaded.');
}

function apiTogglePOStatus(userId, periodId, targetStatus) {
  if (!authorizeRole(userId, CONFIG.ROLES.PANITIA)) return createResponse(false, null, 'Akses ditolak.');
  updateData(CONFIG.SHEETS.PO_PERIODS, 'period_id', periodId, { status: targetStatus, manual_override: true });
  logAudit(userId, targetStatus === 'OPEN' ? 'OPEN_PO' : 'CLOSE_PO', 'PO_PERIOD', { poId: periodId });
  return createResponse(true, null, 'Status PO berhasil diubah.');
}`
  },
  {
    filename: 'OrderService.gs',
    type: 'gs',
    description: 'Modul Pemesanan PDH (Pribadi/Kolektif), Validasi Format Kelas & Kalkulasi Harga Server',
    code: `/**
 * PDH CAMPUS ORDER SYSTEM
 * Order Service: OrderService.gs
 */
var CLASS_CODE_REGEX = /^\\d{2}(MJSP|MJSM|MJSE)\\d{3}$/i;

function isValidClassCode(classCode) {
  return classCode && CLASS_CODE_REGEX.test(String(classCode).trim());
}

function apiCreateOrder(userId, payload) {
  var poCheck = apiValidatePOAccess();
  if (!poCheck.success) return createResponse(false, null, poCheck.message);

  if (!payload || !payload.buyerName || !payload.buyerNim || !isValidClassCode(payload.buyerClass)) {
    return createResponse(false, null, 'Data pemesan & format kelas wajib valid (e.g. 01MJSP001).');
  }

  var orderId = generateUniqueId('ORD');
  var orderNumber = 'PDH-' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd') + '-' + Math.floor(1000 + Math.random() * 9000);

  appendData(CONFIG.SHEETS.ORDERS, {
    order_id: orderId, order_number: orderNumber, user_id: userId,
    order_type: payload.orderType || 'PRIBADI', status: 'PENDING_PAYMENT',
    payment_status: 'UNPAID', total_amount: 185000, buyer_name: payload.buyerName,
    buyer_nim: payload.buyerNim, buyer_class: payload.buyerClass, created_at: new Date().toISOString()
  });

  logAudit(userId, 'CREATE_ORDER', 'ORDER', { orderId: orderId, orderNumber: orderNumber });
  return createResponse(true, { order_id: orderId, order_number: orderNumber, total_amount: 185000 }, 'Pesanan berhasil dibuat.');
}`
  },
  {
    filename: 'Index.html',
    type: 'html',
    description: 'Template Utama Web App HTML Service',
    code: `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= CONFIG.APP_NAME ?></title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <?!= include('Styles'); ?>
</head>
<body class="bg-gray-50 text-gray-900 font-sans antialiased min-h-screen">
  <div id="app" class="flex-1 flex flex-col min-h-screen"></div>
  <?!= include('Scripts'); ?>
</body>
</html>`
  }
];

export const GASExporterModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<GASFile>(GAS_FILES[0]);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <FileCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">Google Apps Script Deployment Exporter</h3>
              <p className="text-xs text-slate-400">Kode Lengkap Siap Salin ke script.google.com</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            ✕
          </button>
        </div>

        {/* Instructions Banner */}
        <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3 flex items-center justify-between text-xs text-indigo-900">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span>Langkah Deploy: Buka <strong className="font-semibold">script.google.com</strong> &gt; Buat Proyek &gt; Buat File Sesuai Daftar &gt; Deploy as Web App.</span>
          </div>
          <a
            href="https://script.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-semibold text-indigo-700 hover:underline"
          >
            Buka GAS <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Selector Sidebar */}
          <div className="w-64 bg-slate-50 border-r border-gray-200 p-3 space-y-1 overflow-y-auto">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-1">
              File Backend &amp; Frontend GAS
            </div>
            {GAS_FILES.map((f) => (
              <button
                key={f.filename}
                onClick={() => setSelectedFile(f)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between transition ${
                  selectedFile.filename === f.filename
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'hover:bg-gray-200/60 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-2 h-2 rounded-full ${f.type === 'gs' ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                  <span className="truncate">{f.filename}</span>
                </div>
                <span className="text-[10px] opacity-75 font-mono">{f.type.toUpperCase()}</span>
              </button>
            ))}
          </div>

          {/* Code Viewer */}
          <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="font-mono font-bold text-indigo-400">{selectedFile.filename}</span>
                <span className="ml-3 text-slate-400 text-[11px]">{selectedFile.description}</span>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-md text-xs transition shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin!' : 'Salin Kode'}</span>
              </button>
            </div>

            <div className="flex-1 p-4 overflow-auto font-mono text-xs leading-relaxed text-slate-300">
              <pre>{selectedFile.code}</pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg text-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
