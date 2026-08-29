/**
 * eSigner Docs helper: adds an "Insert signature tag" item under the
 * Extensions menu of any Doc it's installed in. Inserts a correctly
 * formatted {{signature:email}} tag alone on its own line — the format
 * the eSigner web app searches for when placing signatures.
 */

function onOpen(e) {
  DocumentApp.getUi()
    .createAddonMenu()
    .addItem('Insert signature tag', 'insertSignatureTag')
    .addToUi();
}

function onInstall(e) {
  onOpen(e);
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
      // The tag must sit alone in its own paragraph, so insert a new
      // paragraph right after the one holding the cursor.
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
      // No usable cursor position (e.g. cursor in a header/footnote, or
      // no cursor at all) — fall back to the end of the document.
      body.appendParagraph(tag);
    }
  } catch (err) {
    ui.alert('Could not insert the tag: ' + err.message);
  }
}
