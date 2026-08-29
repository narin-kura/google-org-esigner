/**
 * Envelope = one document sent out for signature by one or more people,
 * in order. Called from the admin dialog (EnvelopeDialog.html) and from
 * the signing flow when the last signer finishes (finalizeEnvelope_).
 */

function createEnvelope(payload) {
  ensureSheetsExist_();

  var sourceDocId = extractDocId_(payload.docUrl);
  if (!sourceDocId) throw new Error('Could not find a Google Doc ID in that URL.');
  if (!payload.signers || payload.signers.length === 0) throw new Error('Add at least one signer.');

  var envelopeId = Utilities.getUuid();
  var workingDocId = prepareSourceDoc_(sourceDocId);

  appendEnvelopeRow_({
    EnvelopeId: envelopeId,
    Title: payload.title,
    SourceDocId: sourceDocId,
    WorkingDocId: workingDocId,
    Status: 'Sent',
    CreatedBy: Session.getEffectiveUser().getEmail(),
    CreatedAt: new Date(),
    CompletedAt: '',
    SignedPdfFileId: ''
  });

  payload.signers.forEach(function (s, idx) {
    appendSignerRow_({
      SignerId: Utilities.getUuid(),
      EnvelopeId: envelopeId,
      Name: s.name,
      Email: s.email,
      SigningOrder: idx + 1,
      Token: generateToken_(),
      Status: idx === 0 ? 'Pending' : 'Pending',
      InvitedAt: '',
      SignedAt: '', SignedName: '', SignedIP: '', SignedLocation: '', UserAgent: ''
    });
  });

  logEvent_(envelopeId, '', 'EnvelopeCreated', payload.title);

  var envelope = getEnvelopeById_(envelopeId);
  var firstSigner = getSignersForEnvelope_(envelopeId)[0];
  sendInviteEmail_(firstSigner, envelope);
  logEvent_(envelopeId, firstSigner.signerId, 'InviteSent', firstSigner.email);

  return { envelopeId: envelopeId };
}

function finalizeEnvelope_(envelopeId) {
  var envelope = getEnvelopeById_(envelopeId);
  var signers = getSignersForEnvelope_(envelopeId).sort(function (a, b) { return a.signingOrder - b.signingOrder; });

  appendCertificatePage_(envelope.workingDocId, envelope, signers);
  var pdfFileId = exportDocToPdf_(envelope.workingDocId, envelope.title);

  updateEnvelope_(envelopeId, {
    Status: 'Completed',
    CompletedAt: new Date(),
    SignedPdfFileId: pdfFileId
  });

  sendCompletionEmail_(envelope, signers, pdfFileId);
  logEvent_(envelopeId, '', 'EnvelopeCompleted', 'All signers complete');
}

function voidEnvelope(envelopeId, reason) {
  updateEnvelope_(envelopeId, { Status: 'Voided' });
  logEvent_(envelopeId, '', 'EnvelopeVoided', reason || '');
}

function appendEnvelopeRow_(fields) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Envelopes');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(headers.map(function (h) { return fields.hasOwnProperty(h) ? fields[h] : ''; }));
}

function updateEnvelope_(envelopeId, fields) {
  var rows = sheetRowsAsObjects_('Envelopes');
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].EnvelopeId === envelopeId) {
      setCellsByHeader_('Envelopes', rows[i]._row, fields);
      return;
    }
  }
  throw new Error('Envelope not found: ' + envelopeId);
}

function getEnvelopeById_(envelopeId) {
  var rows = sheetRowsAsObjects_('Envelopes');
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].EnvelopeId === envelopeId) return normalizeEnvelope_(rows[i]);
  }
  return null;
}

function normalizeEnvelope_(r) {
  return {
    row: r._row,
    envelopeId: r.EnvelopeId,
    title: r.Title,
    sourceDocId: r.SourceDocId,
    workingDocId: r.WorkingDocId,
    status: r.Status,
    createdBy: r.CreatedBy
  };
}
