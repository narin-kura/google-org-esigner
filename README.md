# eSigner

A minimal, self-hosted-by-Google e-signature tool for Google Docs — no server,
no database, no cloud deployment. Built on Google Apps Script for
internal/nonprofit use.

- **Datastore**: a Google Sheet (`Envelopes` / `Signers` / `AuditLog` tabs)
- **Documents**: signatures are drawn directly into the original Google Doc,
  replacing `{{signature:email@example.com}}` placeholder tags
- **Delivery**: emailed one-time links (`MailApp`); access restricted to the
  Google Workspace domain the app is deployed in
- **Hosting**: the Apps Script Web App itself — Google hosts it for free

## How it works

1. Put a `{{signature:their@email.com}}` tag alone on its own line wherever
   someone should sign (numeric `{{signature:1}}` by signing order also
   works). Multiple tags for the same signer all get stamped — e.g. a
   signature on every page. The companion Docs add-on (`docs-addon/`) adds
   an **Extensions → eSigner Docs Helper → Insert signature tag** menu so
   tags are always correctly formatted.
2. From the bound Sheet's **E-Signer** menu, choose **New envelope...**,
   paste the Doc URL, give it a title, and list signers in signing order
   (emails must match the tags).
3. Signers are invited one at a time, in order. Each gets a unique link,
   reviews the document read-only, types their name, draws a signature, and
   submits. The app records typed name, email, drawn signature, approximate
   IP/location, browser user agent, and server timestamp.
4. When the last signer finishes, the app appends a "Certificate of
   Completion" page to the document, exports it to PDF, saves the PDF to an
   "E-Signer - Signed Documents" Drive folder, and emails it to all signers
   plus the envelope creator.

> **The original document is modified in place.** The tags are consumed as
> people sign. To reuse a document as a template, **File → Make a copy**
> first and send the copy for signing.

## Setup (one-time)

1. `npm install -g @google/clasp && clasp login` (log in as the account that
   will own everything and send the emails).
2. Enable the Apps Script API at script.google.com/home/usersettings.
3. From this folder: `clasp create --type sheets --title "eSigner" --rootDir .`
   then `clasp push --force`. (If `clasp create` complains, the folder must
   contain no `appsscript.json` yet and no ancestor `.clasp.json`.)
4. `clasp open` → **Deploy → New deployment → Web app**, Execute as **Me**,
   Who has access per your needs (**Anyone within your domain** for
   internal-only signing, **Anyone** for external signers). If links later
   redirect to a login page unexpectedly, re-set the access level through
   **Deploy → Manage deployments** in the browser — the manifest setting
   alone does not always stick.
5. Edit `setWebAppUrl()` in `Mail.gs` to hold your deployment's `/exec` URL
   (from Manage deployments), push, then run `setWebAppUrl` once from the
   editor's function dropdown. Invite links are built from this pinned URL —
   `ScriptApp.getService().getUrl()` proved unreliable from menu context.
6. Open the Sheet, reload, run **E-Signer → Setup sheets**, and authorize
   when prompted (Advanced → Go to eSigner → Allow).

### Redeploying after code changes

```
clasp push --force
clasp deploy -i <existing-deployment-id> --description "what changed"
```

Always redeploy the existing deployment ID (`clasp deployments` lists it) —
a brand-new deployment gets a new URL, breaking every link already emailed.

### Docs add-on (`docs-addon/`)

A separate tiny Apps Script project (own `.clasp.json`) providing the
tag-inserter menu inside Google Docs. Installed per-account via the script
editor's **Deploy → Test deployments → Editor Add-on** flow; publishing
domain-wide requires a private Google Workspace Marketplace listing (not
done yet).

## Limitations (by design, for a small internal/nonprofit tool)

- **Not ESIGN/UETA/eIDAS-certified.** An inserted image plus an audit trail,
  not a legal compliance product.
- **IP/location is client-reported and best-effort** (tries ipwho.is,
  ipapi.co, ipify from the signer's browser; ad-blockers commonly block all
  three, leaving "unknown"). Timestamp, name, email, and the signature
  itself are the reliable audit fields.
- **Access control = domain login + possession of the emailed link.** No
  SMS/ID verification.
- **Google quota ceilings** (Workspace: ~1,500 emails/day, 6-min execution
  cap) size this for small volume.
- **Tags must sit alone in their own paragraph or table cell.**
- **Single owner** — everything runs as the deploying account.
- **Sequential signing only** — each signer is invited after the previous
  one finishes.
