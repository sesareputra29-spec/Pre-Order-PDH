/**
 * PDH CAMPUS ORDER SYSTEM
 * Drive Service File: DriveService.gs
 * 
 * Manages Google Drive folder hierarchy and File ID tracking.
 * Folder Structure:
 * PDH_CAMPUS
 * ├── DESIGN
 * ├── PAYMENT_PROOF
 * ├── RECEIPT
 * └── PRODUCTION_PROGRESS
 */

/**
 * Initialize or locate Google Drive folder hierarchy
 * Returns Folder IDs for secure storage and reference
 */
function apiInitDriveFolders() {
  try {
    var rootName = CONFIG.DRIVE.ROOT_FOLDER_NAME; // PDH_CAMPUS
    var subfolderNames = CONFIG.DRIVE.SUBFOLDERS;

    var rootFolder = getOrCreateFolderInDrive(rootName, null);
    var rootFolderId = rootFolder.getId();

    var folderStructure = {
      root: {
        id: rootFolderId,
        name: rootName,
        url: rootFolder.getUrl()
      },
      subfolders: {}
    };

    // Create subfolders inside root
    Object.keys(subfolderNames).forEach(function(key) {
      var subName = subfolderNames[key];
      var subFolder = getOrCreateFolderInDrive(subName, rootFolder);
      folderStructure.subfolders[key] = {
        id: subFolder.getId(),
        name: subName,
        url: subFolder.getUrl()
      };
    });

    logAudit('SYSTEM', 'INIT_DRIVE_FOLDERS', 'DRIVE', folderStructure);

    return createResponse(true, folderStructure, 'Struktur Google Drive PDH_CAMPUS berhasil dibuat/ditemukan.');
  } catch (err) {
    Logger.log('Drive Service Error: ' + err.message);
    return createResponse(false, null, 'Gagal menginisialisasi Google Drive: ' + err.message);
  }
}

/**
 * Get or create folder in Google Drive
 * @param {string} folderName 
 * @param {GoogleAppsScript.Drive.Folder} [parentFolder] 
 * @returns {GoogleAppsScript.Drive.Folder}
 */
function getOrCreateFolderInDrive(folderName, parentFolder) {
  var folders;
  if (parentFolder) {
    folders = parentFolder.getFoldersByName(folderName);
  } else {
    folders = DriveApp.getFoldersByName(folderName);
  }

  if (folders.hasNext()) {
    return folders.next();
  } else {
    if (parentFolder) {
      return parentFolder.createFolder(folderName);
    } else {
      return DriveApp.createFolder(folderName);
    }
  }
}

/**
 * Register file reference storing File ID and Metadata
 * @param {string} folderKey DESIGN | PAYMENT_PROOF | RECEIPT | PRODUCTION_PROGRESS
 * @param {string} fileName 
 * @param {string} mimeType 
 * @param {string} base64Data 
 */
function saveFileToDrive(folderKey, fileName, mimeType, base64Data) {
  try {
    var driveRes = apiInitDriveFolders();
    if (!driveRes.success || !driveRes.data) {
      throw new Error('Gagal mengakses struktur Google Drive.');
    }

    var targetFolderId = driveRes.data.subfolders[folderKey] ? driveRes.data.subfolders[folderKey].id : driveRes.data.root.id;
    var targetFolder = DriveApp.getFolderById(targetFolderId);

    var bytes = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(bytes, mimeType, fileName);
    var file = targetFolder.createFile(blob);

    var fileMeta = {
      fileId: file.getId(),
      fileName: file.getName(),
      fileUrl: file.getUrl(),
      mimeType: file.getMimeType(),
      size: file.getSize(),
      folderKey: folderKey,
      created_at: new Date().toISOString()
    };

    return createResponse(true, fileMeta, 'File berhasil disimpan di Google Drive.');
  } catch (err) {
    return createResponse(false, null, 'Gagal menyiampan file: ' + err.message);
  }
}
