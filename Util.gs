function generateToken_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

/** Body.findText treats its pattern as a regex, so literal values (emails
 * with dots, etc.) must be escaped before searching. */
function escapeRegexForFindText_(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Strips the data: URL prefix and decodes to a Blob for Doc insertion. */
function dataUrlToBlob_(dataUrl, filename) {
  var comma = dataUrl.indexOf(',');
  var meta = dataUrl.substring(5, comma); // after "data:"
  var mime = meta.split(';')[0] || 'image/png';
  var bytes = Utilities.base64Decode(dataUrl.substring(comma + 1));
  return Utilities.newBlob(bytes, mime, filename);
}

/**
 * Accepts a full Google Doc URL (docs.google.com/document/d/...,
 * drive.google.com/open?id=..., or drive.google.com/file/d/...) or a
 * bare file ID.
 */
function extractDocId_(urlOrId) {
  var s = (urlOrId || '').trim();
  var match = s.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  match = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return s;
  return null;
}

/**
 * One-time cleanup: trashes every working-copy Doc this project has ever
 * created (named "... (envelope XXXXXXXX)", per copyTemplateDoc_). Never
 * touches your original template Docs, since those don't have that suffix.
 * Run manually from the editor's function dropdown, then delete/ignore.
 */
/** Diagnostic: lists every "E-Signer - Signed Documents" folder and what's
 * in each, plus the cached folder ID, to find duplicate-folder confusion. */
function diagnoseSignedFolder_() {
  var cachedId = PropertiesService.getScriptProperties().getProperty('SIGNED_FOLDER_ID');
  Logger.log('Cached SIGNED_FOLDER_ID: ' + cachedId);
  if (cachedId) {
    try {
      var f = DriveApp.getFolderById(cachedId);
      Logger.log('  -> exists, trashed=' + f.isTrashed() + ', name="' + f.getName() + '"');
    } catch (e) {
      Logger.log('  -> getFolderById threw: ' + e.message);
    }
  }

  var folders = DriveApp.getFoldersByName('E-Signer - Signed Documents');
  var i = 0;
  while (folders.hasNext()) {
    var folder = folders.next();
    i++;
    var fileNames = [];
    var files = folder.getFiles();
    while (files.hasNext()) fileNames.push(files.next().getName());
    Logger.log('Folder #' + i + ': id=' + folder.getId() + ', trashed=' + folder.isTrashed() +
      ', files=[' + fileNames.join(', ') + ']');
  }
  Logger.log('Total folders named "E-Signer - Signed Documents": ' + i);
}

function cleanupTestEnvelopeCopies_() {
  var files = DriveApp.searchFiles('title contains "(envelope " and mimeType = "application/vnd.google-apps.document"');
  var count = 0;
  while (files.hasNext()) {
    var f = files.next();
    f.setTrashed(true);
    count++;
  }
  Logger.log('Trashed ' + count + ' working copies.');
}
