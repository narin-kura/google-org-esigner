function getWebAppUrl_() {
  var url = PropertiesService.getScriptProperties().getProperty('WEB_APP_URL');
  if (!url) {
    throw new Error('WEB_APP_URL is not configured. Run the setWebAppUrl function once from the script editor.');
  }
  return url;
}

/**
 * One-time setup: paste the /exec URL from Deploy > Manage deployments
 * into the value below, then run this once from the editor's function
 * dropdown. ScriptApp.getService().getUrl() proved unreliable from menu
 * context (it produced links to a nonexistent deployment), so the URL is
 * pinned explicitly instead.
 */
function setWebAppUrl() {
  var url = 'https://script.google.com/macros/s/AKfycbwsEtGmf7bws7jKXJxnRXLf4j3esoinfQ4Kjn4_3T-hUmntLBvwGCcenTziCxckr9m-7g/exec';
  PropertiesService.getScriptProperties().setProperty('WEB_APP_URL', url);
  Logger.log('Web app URL set to: ' + url);
}

function sendInviteEmail_(signer, envelope) {
  var url = getWebAppUrl_() + '?token=' + signer.token;
  var body =
    'Hello ' + signer.name + ',\n\n' +
    'You have been asked to review and sign "' + envelope.title + '".\n\n' +
    'Open the document and sign here (this link is unique to you — please do not forward it):\n' +
    url + '\n\n' +
    'If you were not expecting this, you can ignore this email.';

  MailApp.sendEmail(signer.email, 'Please sign: ' + envelope.title, body);
  updateSigner_(signer.signerId, { Status: 'Invited', InvitedAt: new Date() });
}

function sendCompletionEmail_(envelope, signers, pdfFileId) {
  var pdfFile = DriveApp.getFileById(pdfFileId);
  var pdfBlob = pdfFile.getBlob();
  var recipients = signers.map(function (s) { return s.email; }).join(',');
  var body =
    '"' + envelope.title + '" has been signed by all parties. ' +
    'The completed, signed document is attached as a PDF.\n\n' +
    'You can also view it in Drive here:\n' + pdfFile.getUrl();

  MailApp.sendEmail({
    to: recipients,
    cc: envelope.createdBy,
    subject: 'Completed: ' + envelope.title,
    body: body,
    attachments: [pdfBlob]
  });
}
