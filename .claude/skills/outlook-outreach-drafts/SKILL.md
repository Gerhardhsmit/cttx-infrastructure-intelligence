---
name: outlook-outreach-drafts
description: CTTX outreach email drafts for Gerhard's Outlook (gerhard@cttx.co.za). Use whenever Gerhard asks for outreach, prospect, follow-up or client emails, or says "put it in my drafts". Explains the only working route into his Outlook Drafts (.eml files + load_drafts.py on his PC), and forbids Gmail, sending, and generic addresses.
---

# CTTX outreach → Outlook Drafts

Gerhard sends professional client mail **only from Outlook, as gerhard@cttx.co.za**.
He does not use Gmail for outreach. Never suggest Gmail as a fallback.

## Why the connectors don't work (don't retry them)
- **Microsoft 365 connector**: cannot reach his mailbox — Exchange Online is
  disabled at tenant level (AADSTS500014). Do not keep trying it, and do not
  "fall back" to anything else.
- **Gmail connector**: a read-only mirror of mail that *arrived* at
  gerhard@cttx.co.za. Use it only to check whether a prospect has written
  before. Never create drafts there, never send from it, never put a gmail
  address in From/To/Cc.

## The route that works (permanent, 28 Sep 2026)
1. Write each email as a plain-text `.eml` file:
   ```
   From: Gerhard Smit <gerhard@cttx.co.za>
   To: <Named Person> <their.verified@company.co.za>
   Cc: gerhard@cttx.co.za
   Subject: <Property>: the network on the reserve, in one page
   Date: <RFC 2822 date>
   X-Unsent: 1
   MIME-Version: 1.0
   Content-Type: text/plain; charset=utf-8
   X-CTTX-Attach: <file.pdf>[, <file2.pdf>]     (optional; files sit next to the .eml)
   X-CTTX-Note: Source of name/address: <URL or "Apollo verified <date>">.

   <body>
   ```
   **Where a study exists, the PDF is EMBEDDED in the `.eml` as a MIME attachment** (build with
   `outbound-communication/make_eml.py`; verify with `--verify`). `X-CTTX-Attach` alone is no longer
   sufficient: the loader extracts embedded attachments, attaches them, and then checks that Outlook
   actually saved them (a draft whose attachment count is short is reported as FAILED, not loaded).
   Filename must contain `_Assessment_`:
   `<Company> - DRAFT_<First_Last>_Assessment_<YYYYMMDD>.eml`
2. Save them, and any attachment named in `X-CTTX-Attach`, under
   `sales-engine/outreach/<YYYY-MM-DD>[-label]/` on branch
   `claude/elegant-pascal-1jsjwa`, then commit and push.
3. Tell Gerhard: **double-click "Load CTTX Drafts" on the Desktop**, or
   `Load CTTX Drafts.bat` in the repo root. It pulls the branch and runs
   `load_drafts.py --from-repo`, which:
   - loads only drafts not yet in `Desktop\CTTX Prospect Drafts\_ledger.txt`, so there are no duplicates;
   - saves each draft in the **gerhard@cttx.co.za** mailbox's Drafts, whatever
     Outlook's default store is, with that account as From;
   - attaches the `X-CTTX-Attach` files, and fails the draft loudly if one is missing;
   - rejects generic addresses and prints "Nothing was sent."
   Never ask him to paste commands, copy files or attach PDFs by hand.
4. Gerhard reviews each draft and presses Send himself.

Helpers: `python outbound-communication\load_drafts.py --find <text>` (read-only:
which mailbox's Drafts holds a subject) · `--install-shortcut` (one-time
Desktop shortcut) · `--from-repo --dry-run` (preview).

## Hard rules
- **Never send.** No `.Send()`, no Graph sendMail, no Resend, no Gmail send.
  `outbound-communication/test_no_send.py` must keep passing.
- **Named decision maker only**, verified direct address (company site or
  Apollo). No info@, reservations@, bookings@, admin@, sales@ or guessed
  addresses. No name → put them on a call list instead.
- **Priority**: Eastern Cape reserves → mines → wind/solar farms, within
  ~400 km of Gqeberha (incl. Garden Route, Karoo, East London).
- **Never cold-draft existing clients** (e.g. Safresco, Kwandwe).
- Check the Gmail mirror for prior contact before drafting.
- Voice: "Gerhard Smit here, CTTX in Gqeberha. We engineer owned networks on
  lodges, reserves and farms; we don't sell packages." One specific,
  verified paragraph about *their* operation; R3,500 ex VAT half-day
  assessment credited against the build; "Can I call you for 10 minutes this
  week?"; signature with 041 371 1089 | 084 550 3281; one-line opt-out (POPI).
- Never invent terrain, distances or link claims.

## Finding named decision makers
Apollo connector: people search (free) by company domains or keyword tags +
`person_locations` + decision-maker titles + `contact_email_status: verified`,
then `apollo_people_bulk_match` by id (1 credit each). Reject shared mailboxes.
