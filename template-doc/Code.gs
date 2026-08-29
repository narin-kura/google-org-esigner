/**
 * Bound directly to the "eSigner Template" Doc. Since Apps Script container
 * bindings travel with a file when it's copied, every File > Make a copy
 * of this Doc carries this menu along automatically — no add-on install,
 * no admin console, works in any copy immediately.
 */

function onOpen() {
  DocumentApp.getUi()
    .createMenu('eSigner Tools')
    .addItem('Insert signature tag', 'insertSignatureTag')
    .addToUi();
}

function insertSignatureTag() {
  var ui = DocumentApp.getUi();
  try {
    var resp = ui.prompt(
      'Insert signature tag',
      "Signer's email address (must match what you enter in the eSigner envelope):",
      ui.ButtonSet.OK_CANCEL
    );
    if (resp.getSelectedButton() !== ui.Button.OK) return;
    var email = resp.getResponseText().trim();
    if (!email) {
      ui.alert('No email entered — nothing inserted.');
      return;
    }

    var doc = DocumentApp.getActiveDocument();
    var body = doc.getBody();
    var tag = '{{signature:' + email + '}}';

    var inserted = false;
    var cursor = doc.getCursor();
    if (cursor) {
      var el = cursor.getElement();
      while (el.getParent() && el.getParent().getType() !== DocumentApp.ElementType.BODY_SECTION) {
        el = el.getParent();
      }
      if (el.getParent() && el.getParent().getType() === DocumentApp.ElementType.BODY_SECTION) {
        body.insertParagraph(body.getChildIndex(el) + 1, tag);
        inserted = true;
      }
    }
    if (!inserted) {
      body.appendParagraph(tag);
    }
  } catch (err) {
    ui.alert('Could not insert the tag: ' + err.message);
  }
}
