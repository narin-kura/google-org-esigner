# eSigner

A minimal, self-hosted-by-Google e-signature tool for Google Docs — no
server, no database, no cloud deployment to pay for or manage. Built on
Google Apps Script for internal/nonprofit use.

## What it does

You put a tag like `{{signature:jane@example.org}}` in a Google Doc. You
tell eSigner who should sign, in what order. Each signer gets an emailed
link, reviews the actual document read-only, draws their signature, and
submits. eSigner stamps their signature directly into that same document,
records who/when/where in an audit log, and — once everyone's done — saves
a signed PDF to Drive and emails it to everyone involved.

**The original document is edited in place.** Tags are consumed as people
sign. If you want to reuse a document as a template, **File → Make a copy**
first and send the copy.

## How it's built

| Piece | What it is |
|---|---|
| Datastore | A Google Sheet — `Envelopes`, `Signers`, `AuditLog` tabs |
| Admin UI | A custom **E-Signer** menu in that Sheet |
| Signer UI | A Web App page (Apps Script `doGet`), reached via a unique emailed link |
| Document editing | Apps Script's `DocumentApp` service, editing the Doc directly |
| Email | `MailApp` |
| Hosting | The Apps Script Web App deployment itself — Google runs it for free |

Everything lives in one Apps Script project bound to the Sheet, pushed with
[`clasp`](https://github.com/google/clasp) (Google's CLI for Apps Script) so
the code can live in normal files and git instead of only in the browser
editor.

## Setup (one-time)

1. **Install and log in to clasp**, as the Google account that should own
   everything and send the emails:
   ```
   npm install -g @google/clasp
   clasp login
   ```
2. **Enable the Apps Script API** for that account at
   [script.google.com/home/usersettings](https://script.google.com/home/usersettings)
   (toggle it on — takes a minute or two to propagate).
3. **Create the project**, from this folder:
   ```
   clasp create --type sheets --title "eSigner" --rootDir .
   clasp push --force
   ```
   This creates a new Google Sheet *and* a script project bound to it, and
   pushes all the code. If `clasp create` refuses ("Project file already
   exists"), the folder must be empty of `appsscript.json` first, and there
   must be no `.clasp.json` in any parent folder — `clasp create` (unlike
   `clasp push`) checks the whole ancestor chain.
4. **Deploy as a Web App**: `clasp open` to open the script editor, then
   **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone within your domain** (internal-only signing)
     or **Anyone** (if outside signers need to sign too)

   ⚠️ **This setting has to be confirmed once through this browser dialog.**
   Setting `access`/`executeAs` only in `appsscript.json` and deploying via
   `clasp deploy` does **not** reliably take effect — we lost real time to
   this. If a signer's link ever unexpectedly redirects to a Google login
   page, come back to **Deploy → Manage deployments → pencil icon** and
   re-confirm the access level here.
5. **Pin the Web App URL.** Copy the `/exec` URL from Manage deployments,
   then in `Mail.gs` set it as the constant inside `setWebAppUrl()`. Push,
   then run **`setWebAppUrl`** once from the editor's function dropdown
   (top toolbar, next to Run). This matters because
   `ScriptApp.getService().getUrl()` — the "just look up your own URL"
   method — proved unreliable when called from a menu action rather than a
   real web request; it produced links to a deployment that didn't exist.
   Pinning the URL removes that failure mode entirely.
6. **Authorize the script.** Open the Sheet, reload the tab, and you should
   see an **E-Signer** menu next to Help. Click **E-Signer → Setup sheets**.
   The first run shows Google's "unverified app" screen (normal for a
   personal script) — click **Advanced → Go to eSigner (unsafe) → Allow**.
   This creates the `Envelopes`/`Signers`/`AuditLog` tabs.

## Sending an envelope

1. In your Google Doc, put a tag on its own line wherever someone should
   sign:
   ```
   {{signature:jane@example.org}}
   ```
   Numeric tags (`{{signature:1}}`, matching signing order) also work if
   you'd rather not use emails. A signer can have more than one tag (e.g.
   initials on every page) — all of them get filled in.

   Typing tags by hand is easy to get wrong, so there's a companion
   [Docs add-on](#docs-add-on-docs-addon) that inserts them for you via a
   menu.

2. In the Sheet: **E-Signer → New envelope...** — paste the Doc's URL, give
   it a title, and list signers in signing order (their email must match
   their tag exactly). Click **Create & send**.

3. Signers are invited **one at a time, in order**. Each gets an email with
   a unique link. They review the document (read-only preview), type their
   name, draw a signature, and submit. eSigner records their typed name,
   email, drawn signature, best-effort IP/location, browser, and a server
   timestamp — then invites the next signer.

4. When the last signer finishes: a "Certificate of Completion" page (who
   signed, when, from where) is appended to the document, the whole thing
   is exported to PDF, saved into an **"E-Signer - Signed Documents"**
   Drive folder, and emailed to every signer plus whoever created the
   envelope.

You can watch progress at any time in the **Envelopes** and **Signers**
tabs of the Sheet (`Status` column: `Sent` → `Completed`).

## Docs add-on (`docs-addon/`)

A second, separate Apps Script project (its own `.clasp.json`, since
`clasp create` needs a folder with no ancestor config — see above) that adds
**Extensions → eSigner Docs Helper → Insert signature tag** inside any
Google Doc: it prompts for an email and inserts a correctly formatted tag
on its own line at your cursor.

It has its own real, versioned deployment (not just the auto "Head"
deployment) — **`AKfycbz2MwDY4cxN-qWVWITM-ALFRqvsJp8s42jxcGJ0tZoCYssWCaBrmdrwbvxpmbMhMr9j`**
("eSigner Docs Helper v1") — so documents run stable, released code rather
than whatever's currently open in the editor.

To install it in a document:

1. From `docs-addon/`: `clasp open` to open its script editor.
2. **Deploy → Test deployments** → set type to **Editor Add-on**, and make
   sure the deployment selector is set to the **v1 deployment above**, not
   "Head Deployment."
3. Under "Test document," **Add test** → pick the Doc → "Installed for:
   Current user" → **Save**.
4. Open that Doc, reload the tab, and the menu appears under **Extensions**
   after a few seconds (first use triggers an authorization prompt).

This only attaches the menu to documents you explicitly add as test
documents (existing docs work fine, not just new ones — just add them the
same way). Making it appear automatically on *every* doc with no manual add
requires publishing it as a private Google Workspace Marketplace add-on,
installed domain-wide by a Workspace Super Admin — not done yet.

When you change `Addon.gs`, update the same deployment rather than creating
a new one, so already-installed documents pick up the change:
```
cd docs-addon
clasp push --force
clasp deploy -i AKfycbz2MwDY4cxN-qWVWITM-ALFRqvsJp8s42jxcGJ0tZoCYssWCaBrmdrwbvxpmbMhMr9j --description "what changed"
```

## Redeploying the main app after code changes

```
clasp push --force
clasp deploy -i <existing-deployment-id> --description "what changed"
```

**Always** redeploy the *existing* deployment ID — find it with
`clasp deployments`. Creating a brand-new deployment gets a brand-new
`/exec` URL, which breaks every signing link already emailed and won't
match the pinned URL from step 5 above.

## Troubleshooting

**A signer's link shows "Sorry, unable to open the file" or redirects to a
Google sign-in page.**
Almost always the deployment's access level — go re-confirm it via
**Deploy → Manage deployments → pencil icon** in the browser (see step 4).
Also double check the email's link actually starts with the deployment ID
from `clasp deployments` / your pinned URL — an old email sent before a
fix, or a leftover script project from an earlier setup attempt, can look
identical at a glance but point at a dead deployment.

**`Session.getEffectiveUser` / similar permission errors.**
A scope is missing from `oauthScopes` in `appsscript.json`. Add it, push,
and redeploy — Apps Script only grants what's explicitly listed once you've
declared any scopes by hand.

**The document doesn't look updated after a signer signs.**
If you had the Doc open in a browser tab while the script edited it,
reload the tab — Docs doesn't live-refresh script-made edits.

**Multiple "E-Signer - Signed Documents" folders, or "eSigner" Sheets.**
Leftovers from testing/setup attempts. There should be exactly one Sheet
(the one `clasp create` made) and it's safe to consolidate/trash the rest —
nothing else references them.

## Limitations (by design, for a small internal/nonprofit tool)

- **Not ESIGN/UETA/eIDAS-certified.** An inserted image plus an audit
  trail, not a legal compliance product.
- **IP/location is client-reported and best-effort** (tries `ipwho.is`,
  `ipapi.co`, then `ipify.org` from the signer's browser, 5s timeout total).
  Ad-blockers commonly block all three, leaving it "unknown." Timestamp,
  name, email, and the signature itself are the reliable audit fields —
  Apps Script has no server-side access to a visitor's real IP at all.
- **Access control = your chosen deployment access level, plus possession
  of the emailed link.** No SMS/ID verification.
- **Google account quotas** (Workspace: ~1,500 emails/day, ~6-minute
  execution ceiling) size this for small volume, not enterprise scale.
- **Tags must sit alone in their own paragraph or table cell.**
- **Single owner** — every Drive/Doc/Sheet/Mail action runs as whichever
  account deployed the Web App.
- **Sequential signing only** — each signer is invited only after the
  previous one finishes; no all-at-once parallel signing yet.
