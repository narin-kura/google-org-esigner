/**
 * Entry points: menu (admin, inside the bound Sheet) and the public web app
 * (signer-facing, reached via emailed tokenized links only).
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('E-Signer')
    .addItem('New envelope...', 'showEnvelopeDialog')
    .addItem('Setup sheets', 'ensureSheetsExist_')
    .addToUi();
}

function showEnvelopeDialog() {
  ensureSheetsExist_();
  var html = HtmlService.createTemplateFromFile('Html/EnvelopeDialog')
    .evaluate()
    .setWidth(520)
    .setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(html, 'New signing envelope');
}

/** Included by HTML templates to inline shared partials (CSS, JS). */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function renderTemplate_(name, data) {
  var t = HtmlService.createTemplateFromFile('Html/' + name);
  t.data = data || {};
  return t.evaluate()
    .setTitle('Sign document')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Public entry point for signers. Must stay side-effect free on GET —
 * corporate email scanners (e.g. Outlook Safe Links) pre-fetch emailed
 * links before a human ever clicks them, so no state changes happen here.
 */
function doGet(e) {
  var token = e && e.parameter ? e.parameter.token : null;
  if (!token) {
    return renderTemplate_('SignPage', { state: 'invalid' });
  }

  var signer = findSignerRowByToken_(token);
  if (!signer) {
    return renderTemplate_('SignPage', { state: 'invalid' });
  }

  var envelope = getEnvelopeById_(signer.envelopeId);
  if (!envelope || envelope.status === 'Voided') {
    return renderTemplate_('SignPage', { state: 'voided' });
  }
  if (signer.status === 'Signed') {
    return renderTemplate_('SignPage', { state: 'already_signed', signerName: signer.name });
  }
  if (signer.status === 'Declined') {
    return renderTemplate_('SignPage', { state: 'declined' });
  }

  var allSigners = getSignersForEnvelope_(signer.envelopeId);
  var notYourTurn = allSigners.some(function (s) {
    return s.signingOrder < signer.signingOrder && s.status !== 'Signed';
  });
  if (notYourTurn) {
    return renderTemplate_('SignPage', { state: 'waiting' });
  }

  return renderTemplate_('SignPage', {
    state: 'ready',
    token: token,
    signerName: signer.name,
    signerEmail: signer.email,
    envelopeTitle: envelope.title,
    previewUrl: 'https://docs.google.com/document/d/' + envelope.workingDocId + '/preview'
  });
}
