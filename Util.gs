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

/** One-off: creates the docs-addon's ToS/Privacy Policy docs, shares them
 * viewable, and logs their URLs for pasting into the Marketplace listing. */
function createLegalDocs_() {
  var tos = DocumentApp.create('eSigner Docs Helper - Terms of Service');
  tos.getBody().setText(
    'eSigner Docs Helper - Terms of Service\n\n' +
    'This is an internal tool built for and used exclusively by Sri Lakshmi Narasimha Hindu Temple ' +
    '(slnhindutemple.org) staff and volunteers. It is not distributed publicly and is not available ' +
    'for use outside this organization.\n\n' +
    'The tool inserts a short placeholder tag into a Google Doc you are actively editing, at your ' +
    'explicit request, for use with the organization\'s internal eSigner document-signing system. ' +
    'It does not access, read, or transmit document content beyond that single insertion action.\n\n' +
    'Use of this tool is subject to the organization\'s own internal policies. By using it, you agree ' +
    'to use it only for its intended purpose within the organization.\n\n' +
    'Questions: board-treasurer@slnhindutemple.org'
  );
  DriveApp.getFileById(tos.getId()).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var pp = DocumentApp.create('eSigner Docs Helper - Privacy Policy');
  pp.getBody().setText(
    'eSigner Docs Helper - Privacy Policy\n\n' +
    'This add-on is an internal tool for Sri Lakshmi Narasimha Hindu Temple (slnhindutemple.org). ' +
    'It requests access only to the specific Google Doc you are actively editing when you use it ' +
    '(the documents.currentonly permission) - it cannot access any other file in your Drive.\n\n' +
    'What it does: when you choose "Insert signature tag" from its menu, it inserts a short text tag ' +
    '(e.g. {{signature:name@example.com}}) at your cursor location, using the email address you type ' +
    'into the prompt.\n\n' +
    'What it does not do: it does not collect, store, transmit, or share any data outside of the ' +
    'single document you are editing. It uses no analytics, tracking, or third-party services. ' +
    'No data leaves Google\'s own infrastructure.\n\n' +
    'Data retention: none - the add-on holds no data of its own. All content lives only in your ' +
    'Google Doc, under your organization\'s normal Google Workspace data controls.\n\n' +
    'Contact: board-treasurer@slnhindutemple.org'
  );
  DriveApp.getFileById(pp.getId()).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  Logger.log('Terms of Service: ' + tos.getUrl());
  Logger.log('Privacy Policy: ' + pp.getUrl());
  return { tos: tos.getUrl(), privacy: pp.getUrl() };
}

/** Sheet-menu wrapper for createLegalDocs_: shows the URLs in a dialog. */
function createLegalDocsMenu_() {
  var urls = createLegalDocs_();
  var html = HtmlService.createHtmlOutput(
    '<div style="font-family:Arial;font-size:13px;padding:8px">' +
    '<p><b>Terms of Service:</b><br><a href="' + urls.tos + '" target="_blank">' + urls.tos + '</a></p>' +
    '<p><b>Privacy Policy:</b><br><a href="' + urls.privacy + '" target="_blank">' + urls.privacy + '</a></p>' +
    '<p>Both are view-only-by-link. Copy these into the Marketplace Store Listing fields.</p>' +
    '</div>'
  ).setWidth(520).setHeight(220);
  SpreadsheetApp.getUi().showModalDialog(html, 'Legal doc URLs');
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
