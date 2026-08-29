/**
 * Signers within an envelope, addressed by their single-use token. All
 * mutation (submitSignature) is wrapped in a script lock: with the web app
 * deployed "Execute as: Me" + "Anyone", the token is the only access
 * control there is, and two signers (or a double-click) could otherwise
 * race the same working Doc.
 */

function submitSignature(payload) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    throw new Error('System is busy processing another signature — please try again in a moment.');
  }
  try {
    var signer = findSignerRowByToken_(payload.token);
    if (!signer) throw new Error('Invalid or expired signing link.');
    if (signer.status === 'Signed') throw new Error('This document has already been signed.');
    if (signer.status === 'Declined') throw new Error('This signing request was declined.');

    var envelope = getEnvelopeById_(signer.envelopeId);
    if (!envelope) throw new Error('Envelope not found.');
    if (envelope.status === 'Voided') throw new Error('This envelope has been voided.');

    var allSigners = getSignersForEnvelope_(signer.envelopeId);
    var notYourTurn = allSigners.some(function (s) {
      return s.signingOrder < signer.signingOrder && s.status !== 'Signed';
    });
    if (notYourTurn) throw new Error('It is not your turn to sign yet.');

    var typedName = (payload.typedName || '').trim();
    if (!typedName) throw new Error('Please type your full name.');

    var blob = dataUrlToBlob_(payload.signatureDataUrl, 'signature.png');
    var now = new Date();
    var tz = Session.getScriptTimeZone();
    var caption = 'Signed by ' + typedName + ' <' + signer.email + '> on ' +
      Utilities.formatDate(now, tz, 'yyyy-MM-dd HH:mm:ss z') +
      (payload.location ? ' from ' + payload.location : '');

    insertSignatureImage_(envelope.workingDocId, signer, blob, caption);

    updateSigner_(signer.signerId, {
      Status: 'Signed',
      SignedAt: now,
      SignedName: typedName,
      SignedIP: payload.ip || '',
      SignedLocation: payload.location || '',
      UserAgent: payload.userAgent || ''
    });

    logEvent_(signer.envelopeId, signer.signerId, 'FieldsSubmitted',
      'Signed by ' + typedName + ' (IP ' + (payload.ip || 'unknown') + ')');

    var viewUrl = 'https://docs.google.com/document/d/' + envelope.workingDocId + '/preview';
    var remaining = getSignersForEnvelope_(signer.envelopeId).filter(function (s) { return s.status !== 'Signed'; });
    if (remaining.length === 0) {
      finalizeEnvelope_(signer.envelopeId);
    } else {
      var next = remaining.sort(function (a, b) { return a.signingOrder - b.signingOrder; })[0];
      if (next.status === 'Pending') {
        sendInviteEmail_(next, envelope);
        logEvent_(signer.envelopeId, next.signerId, 'InviteSent', next.email);
      }
    }
    return { ok: true, viewUrl: viewUrl };
  } finally {
    lock.releaseLock();
  }
}

function declineSignature(token, reason) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('System is busy — please try again.');
  try {
    var signer = findSignerRowByToken_(token);
    if (!signer) throw new Error('Invalid signing link.');
    updateSigner_(signer.signerId, { Status: 'Declined' });
    logEvent_(signer.envelopeId, signer.signerId, 'Declined', reason || '');
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function appendSignerRow_(fields) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Signers');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(headers.map(function (h) { return fields.hasOwnProperty(h) ? fields[h] : ''; }));
}

function updateSigner_(signerId, fields) {
  var rows = sheetRowsAsObjects_('Signers');
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].SignerId === signerId) {
      setCellsByHeader_('Signers', rows[i]._row, fields);
      return;
    }
  }
  throw new Error('Signer not found: ' + signerId);
}

function findSignerRowByToken_(token) {
  var rows = sheetRowsAsObjects_('Signers');
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].Token === token) return normalizeSigner_(rows[i]);
  }
  return null;
}

function getSignersForEnvelope_(envelopeId) {
  return sheetRowsAsObjects_('Signers')
    .filter(function (r) { return r.EnvelopeId === envelopeId; })
    .map(normalizeSigner_);
}

function normalizeSigner_(r) {
  return {
    row: r._row,
    signerId: r.SignerId,
    envelopeId: r.EnvelopeId,
    name: r.Name,
    email: r.Email,
    signingOrder: Number(r.SigningOrder),
    token: r.Token,
    status: r.Status
  };
}
