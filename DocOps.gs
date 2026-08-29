/**
 * All Google Doc / Drive manipulation.
 *
 * Template convention: each signer's spot in the source Doc must contain
 * the tag {{signature:N}} ALONE on its own paragraph/line, where N is that
 * signer's position in the signing order (1, 2, 3, ...). The tag's whole
 * paragraph is cleared and replaced with an inline image + a small caption
 * paragraph when that signer signs.
 */

/**
 * Signatures go directly into the source document (no working copy).
 * View sharing is needed so the read-only preview iframe on the signing
 * page can load for signers who don't otherwise have access to the file.
 */
function prepareSourceDoc_(sourceDocId) {
  var file = DriveApp.getFileById(sourceDocId);
  try {
    file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e2) {
      // Sharing policy blocked both — in-domain signers may still have access.
    }
  }
  return sourceDocId;
}

function insertSignatureImage_(docId, signer, imageBlob, captionText) {
  var doc = DocumentApp.openById(docId);
  var body = doc.getBody();
  // A signer's spot can be tagged by email (preferred, self-documenting)
  // or by signing-order number (legacy).
  var patterns = [
    '\\{\\{signature:' + escapeRegexForFindText_(signer.email) + '\\}\\}',
    '\\{\\{signature:' + signer.signingOrder + '\\}\\}'
  ];

  // Replace EVERY occurrence of this signer's tag (initial-every-page
  // style docs have several). Each replacement removes the tag text, so
  // re-searching from the top always advances.
  var replaced = 0;
  patterns.forEach(function (pattern) {
    var range = body.findText(pattern);
    while (range) {
      var textEl = range.getElement().asText();
      var paragraph = textEl.getParent();
      textEl.setText('');

      var image = paragraph.insertInlineImage(0, imageBlob.copyBlob());
      image.setWidth(150).setHeight(50);

      if (captionText) {
        var parent = paragraph.getParent();
        var captionPara = null;
        if (parent.getType() === DocumentApp.ElementType.BODY_SECTION) {
          captionPara = body.insertParagraph(body.getChildIndex(paragraph) + 1, captionText);
        } else if (parent.getType() === DocumentApp.ElementType.TABLE_CELL) {
          captionPara = parent.asTableCell().appendParagraph(captionText);
        }
        if (captionPara) captionPara.editAsText().setFontSize(8).setItalic(true);
      }

      replaced++;
      range = body.findText(pattern);
    }
  });

  if (replaced === 0) {
    throw new Error('Could not find {{signature:' + signer.email + '}} or {{signature:' +
      signer.signingOrder + '}} in the document.');
  }

  doc.saveAndClose();
}

function appendCertificatePage_(docId, envelope, signers) {
  var doc = DocumentApp.openById(docId);
  var body = doc.getBody();
  var signerRows = sheetRowsAsObjects_('Signers');

  body.appendPageBreak();
  body.appendParagraph('Certificate of Completion').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('Document: ' + envelope.title);
  body.appendParagraph(' ');

  signers.forEach(function (s) {
    var r = signerRows.filter(function (row) { return row.SignerId === s.signerId; })[0] || {};
    var signedAt = r.SignedAt ? Utilities.formatDate(new Date(r.SignedAt), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss z') : '(not signed)';
    body.appendParagraph(
      s.signingOrder + '. ' + (r.SignedName || s.name) + '  <' + s.email + '>\n' +
      '   Signed: ' + signedAt + '\n' +
      '   IP: ' + (r.SignedIP || 'unknown') + '   Location: ' + (r.SignedLocation || 'unknown')
    );
  });

  doc.saveAndClose();
}

function exportDocToPdf_(docId, title) {
  var file = DriveApp.getFileById(docId);
  var pdfBlob = file.getAs(MimeType.PDF);
  var folder = getOrCreateSignedFolder_();
  var pdfFile = folder.createFile(pdfBlob);
  pdfFile.setName(title + ' - Signed.pdf');
  return pdfFile.getId();
}

function getOrCreateSignedFolder_() {
  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty('SIGNED_FOLDER_ID');
  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (e) {
      // Folder was deleted/moved out of reach — fall through and recreate.
    }
  }
  var folder = DriveApp.createFolder('E-Signer - Signed Documents');
  props.setProperty('SIGNED_FOLDER_ID', folder.getId());
  return folder;
}
