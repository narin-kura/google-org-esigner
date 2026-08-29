/**
 * The bound Spreadsheet is the entire datastore. Three tabs: Envelopes,
 * Signers, AuditLog. Config (e.g. the signed-docs Drive folder) lives in
 * PropertiesService instead, so nobody has to hand-edit config cells.
 */

function ensureSheetsExist_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet_(ss, 'Envelopes', [
    'EnvelopeId', 'Title', 'SourceDocId', 'WorkingDocId', 'Status',
    'CreatedBy', 'CreatedAt', 'CompletedAt', 'SignedPdfFileId'
  ]);
  ensureSheet_(ss, 'Signers', [
    'SignerId', 'EnvelopeId', 'Name', 'Email', 'SigningOrder', 'Token',
    'Status', 'InvitedAt', 'SignedAt', 'SignedName', 'SignedIP', 'SignedLocation', 'UserAgent'
  ]);
  ensureSheet_(ss, 'AuditLog', ['Timestamp', 'EnvelopeId', 'SignerId', 'Event', 'Detail']);
}

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Returns every data row of a tab as {Header: value, ...} plus a 1-based _row. */
function sheetRowsAsObjects_(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) obj[headers[j]] = values[i][j];
    obj._row = i + 1;
    rows.push(obj);
  }
  return rows;
}

function setCellsByHeader_(sheetName, rowNumber, fields) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  headers.forEach(function (header, idx) {
    if (fields.hasOwnProperty(header)) {
      sheet.getRange(rowNumber, idx + 1).setValue(fields[header]);
    }
  });
}

function logEvent_(envelopeId, signerId, event, detail) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('AuditLog');
  sheet.appendRow([new Date(), envelopeId, signerId || '', event, detail || '']);
}
