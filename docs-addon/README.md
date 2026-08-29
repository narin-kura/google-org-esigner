Source for the "eSigner Docs Helper" add-on (see main README's "Docs add-on"
section for what it does and how to install it).

This copy is tracked here for version control. The actual `clasp`-linked
working copy lives in a **sibling** folder (`../../eSigner-docs-addon/`)
rather than nested inside the main eSigner project — `clasp create` refuses
to run in a folder that has an ancestor `.clasp.json`, which this project's
root does. When editing the add-on, edit both copies (or copy this one over
the sibling before `clasp push`).
