# eSigner Signature Blocks

Copy-paste source for signature placeholders — the practical alternative to
the tag-inserter add-on (whose domain-wide install is blocked pending
domain verification). Keep these in a Google Doc (e.g. "eSigner Signature
Blocks — copy from here") stored beside the eSigner LIVE Sheet, and paste
into any document being sent for signature.

## Rules

1. Replace `EMAIL_HERE` with the signer's real email — it must **exactly
   match** the email entered in the E-Signer envelope form.
2. A `{{signature:...}}` tag must sit **alone on its own line** (or alone
   in a table cell) — never inside a sentence.
3. The same signer may have any number of tags (initial-every-page style);
   all of them get stamped.
4. Don't add date lines — when signed, each signature image gets a caption
   underneath automatically: "Signed by NAME <email> on DATE from LOCATION".

## Single signer

```
Signed and agreed:

{{signature:EMAIL_HERE}}
```

## Two signers

```
Approved by:

{{signature:FIRST_PERSON_EMAIL}}

{{signature:SECOND_PERSON_EMAIL}}
```

## Formal block with printed name and title

```
For Sri Lakshmi Narasimha Hindu Temple:

Name: ______________________
Title: ______________________

{{signature:EMAIL_HERE}}
```
