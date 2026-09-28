## Building a draft with the study embedded
`python outbound-communication/make_eml.py --to "Name <a@b.co.za>" --subject "..." --body body.txt --attach Study.pdf --note "..." --out "Company - DRAFT_First_Last_Assessment_YYYYMMDD.eml"` embeds the PDF as a MIME part. `--verify file.eml` lists what is embedded (exit 1 if nothing). The loader attaches embedded parts and checks Outlook's saved attachment count.

## Loading drafts (the one-click way)
Double-click **Load CTTX Drafts** on the Desktop. The first time, run `python outbound-communication\load_drafts.py --install-shortcut` to create the shortcut, or double-click `Load CTTX Drafts.bat` in the repo root.
It pulls the latest drafts, loads only new ones into the gerhard@cttx.co.za Drafts folder, attaches their PDFs, and never sends. The ledger is `Desktop\CTTX Prospect Drafts\_ledger.txt`: delete a line to load that draft again.

# Outbound communication — DRAFTS ONLY

These scripts save emails into Outlook **Drafts**. They never send.
Gerhard reviews every draft in Outlook and sends it himself.

On 27 Sep 2026 an earlier version of `campaign_assessment.py` sent the
assessment campaign straight out of Outlook, including to guessed
addresses (e.g. `info@khayandlovumanorhouse.co.za`), which bounced.
All send paths (Outlook `.Send()`, Microsoft Graph `sendMail`, Resend API,
`--test-send`) have been removed. `test_no_send.py` fails if one comes back.

    python worker.py --health-check
    python worker.py --test-draft someone@example.com
    python campaign_assessment.py        # creates drafts for review
    python test_no_send.py               # guard check

## Daily flow (routine → Outlook Drafts)

1. 07:30 weekdays — the "CTTX daily prospect drafts" routine (Claude desktop
   app on Gerhard's PC) writes `.eml` files to
   `Desktop\CTTX Prospect Drafts\`.
2. 08:30 weekdays — Windows Task Scheduler runs `load_drafts.py`, which puts
   each `.eml` into Outlook **Drafts** and moves it to `_loaded\`. Drafts to
   info@/reservations@-style addresses go to `_rejected\` with a reason.
3. Gerhard reviews and sends from Outlook himself.
