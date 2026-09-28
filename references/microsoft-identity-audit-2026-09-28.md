# CTTX Microsoft / Outlook Identity Audit — 28 September 2026

**Status:** Audit complete. No changes were made to any account, tenant, DNS record or connector.
**Source of truth mailbox:** gerhard@cttx.co.za

---

## 1. Headline finding

**gerhard@cttx.co.za is not a Microsoft mailbox.** It never was.

It is a plain hosted mailbox at **xneelo** (formerly Hetzner South Africa, servers `*.host-h.net`,
control panel konsoleH), reached via the domain's reseller **Webpartner** (support@webpartner.co.za).
That mailbox forwards a copy of everything to the Gmail account **gerhardcttx@gmail.com**.

The Microsoft 365 connector is therefore pointed at a tenant that has **no mailbox at all**, and could
never have reached gerhard@cttx.co.za regardless of which Microsoft identity it signed in with.
The problem is not a wrong Microsoft identity. The problem is that Microsoft does not host the mailbox.

## 2. Evidence

| Check | Result |
|---|---|
| MX record for cttx.co.za | `10 mail.cttx.co.za` (xneelo). No Microsoft `mail.protection.outlook.com` MX. No Google MX. |
| SPF record | `v=spf1 mx a include:spf.host-h.net ~all` (xneelo). No `spf.protection.outlook.com`, no `_spf.google.com`. |
| Domain-verification TXT (`MS=...`) | None. cttx.co.za has never been verified in any Microsoft tenant. |
| `autodiscover.cttx.co.za`, `selector1._domainkey`, `enterpriseregistration` | None exist. Confirms no Microsoft 365 for this domain. |
| Nameservers | Cloudflare (`dion.ns.cloudflare.com`, `mira.ns.cloudflare.com`) since 22 July 2026. |
| Delivery path of a real inbound mail (Raubex, 28 Sep 2026) | Sender → `dedi1538.jnb1.host-h.net` (xneelo) for `gerhard@cttx.co.za` → xneelo forwards (SRS-rewritten) → `mx.google.com` → `Delivered-To: gerhardcttx@gmail.com`. |
| Microsoft 365 connector `get_me` | `gerhardSmit@CTTX.onmicrosoft.com`, tenant `c0bb4ede-fab7-4806-8255-e1b51ae4fc34`. Primary SMTP is also `@CTTX.onmicrosoft.com` (no cttx.co.za address on the account). |
| Microsoft 365 connector mail search | `AADSTS500014: service principal for outlook.office365.com is disabled` — Exchange Online is off in that tenant. |
| Connector granted scopes | Read-only (`Mail.Read`, `Calendars.Read`, `Files.Read`, ...). No `Mail.ReadWrite`, no `Mail.Send`. It could not create drafts even if the tenant were live. |
| Microsoft billing mail | "Microsoft 365 Business Basic subscription was cancelled" on **27 June 2026** (Gerhard replied "I did not cancel") and again on **25 September 2026**, tenant `c0bb4ede-...`. |
| Microsoft consumer mail | Microsoft Defender monthly summary (Aug 2026) for a **personal** Microsoft 365 subscription, device `DESKTOP-JMK6PQR`, "intended for gerhard@cttx.co.za". |
| Microsoft account security mail | A personal Microsoft account signs in as `ge**d@cttx.co.za` (apps connected: Manus, Apollo, OpenAI, LinkedIn, NeoSapien, Fieldwerk, Superhuman, Windsor.ai). A second personal Microsoft account signs in as `ge**x@gmail.com`; `gerhard@cttx.co.za` was added to it as security info on 10 June 2026. |
| Outlook desktop | Mail sent from Outlook shows `From: gerhard@cttx.co.za` with Afrikaans Outlook headers and arrives via xneelo. Outlook desktop is using the **xneelo IMAP/POP + SMTP account**, not a Microsoft mailbox. (Notion, 21 Sep: "Outlook via COM and Gmail — working".) |
| Gmail | The Gmail connector is authenticated as `gerhardcttx@gmail.com`. That account holds all gerhard@cttx.co.za, finance@cttx.co.za and traci@cttx.co.za traffic (forwarded in). Mail sent from Gmail goes out as `gerhardcttx@gmail.com`; no "send as gerhard@cttx.co.za" alias is in use. |

## 3. Identity map

| Identity | What it actually is | Where used | Correct for CTTX mail? | Action |
|---|---|---|---|---|
| **gerhard@cttx.co.za** | xneelo-hosted mailbox (konsoleH), forwards to Gmail | Outlook desktop (IMAP/POP+SMTP), all customer correspondence, Microsoft account sign-in name | **YES — source of truth** | Preserve. Do not migrate. |
| gerhardcttx@gmail.com | Personal Gmail. Receives a forwarded copy of all @cttx.co.za mail. Authenticated identity of the Gmail connector. | Claude Gmail connector, Claude routines, Gmail drafts | Yes as the **working inbox and Claude's draft target** | Preserve. This is the only connector that can see CTTX mail today. |
| gerhardSmit@CTTX.onmicrosoft.com | Cloud-only user in Entra tenant `c0bb4ede-...` ("CTTX .", billing profile CTTX). Business Basic licence cancelled 27 Jun and 25 Sep 2026. Exchange disabled. Domain cttx.co.za never verified in it. | Claude Microsoft 365 connector (current, broken) | **NO** — has no mailbox and never held cttx.co.za mail | Leave as is. Do not re-licence to "fix" mail. Disconnect or ignore the connector. |
| Personal Microsoft account `ge**d@cttx.co.za` | Consumer Microsoft account (MSA) whose sign-in name is the CTTX address. Carries the Microsoft 365 Personal/Family + Defender subscription and the Windows device `DESKTOP-JMK6PQR`. | Windows sign-in, Office activation, third-party app OAuth | Not a mailbox. Fine as a Windows/Office licence identity. | Preserve. Not a mail path. |
| Personal Microsoft account `ge**x@gmail.com` | Consumer MSA on the Gmail address; gerhard@cttx.co.za added as security info Jun 2026. Repeated foreign sign-in alerts (Egypt May 2026, Sweden/unknown Jul 2026). | Unknown (possibly old Windows/Xbox/Skype) | Not a mailbox. | Review security at account.microsoft.com; do not delete during this exercise. |
| Any Outlook.com mailbox | None found. | — | — | None. |

## 4. What was wrong

1. The Microsoft 365 connector was authorised against the Business tenant. That tenant has no Exchange
   licence (cancelled twice) and cttx.co.za was never added to it, so the connector never had any CTTX mail.
2. Even when the licence was active, the account's mailbox would have been `gerhardSmit@CTTX.onmicrosoft.com`,
   a second, empty mailbox. Mail, drafts and Sent Items created there would never appear in Outlook desktop,
   which reads the xneelo mailbox.
3. The connector's scopes are read-only, so "create draft" was never possible through it.
4. Routines and skills were told that Outlook = Microsoft 365, and reported "M365 is down" instead of the
   real state: Microsoft is not in the mail path at all.

## 5. What this means for Phases 4–6 of the brief

- **Phase 4 (fix authentication):** there is nothing to re-authenticate on the Microsoft side. No Microsoft
  identity holds gerhard@cttx.co.za, so no Microsoft connector can be pointed at it without first
  **migrating the mailbox into Microsoft 365** (verify cttx.co.za in the tenant, buy a licence, move MX).
  That is exactly the new-infrastructure / Azure-tenant route the brief forbids by default, and it would
  change where Gerhard's mail lives. **Not done. Requires an explicit decision.**
- **Phase 6 (test draft in gerhard@cttx.co.za → Drafts):** cannot pass with any connector currently
  attached. The xneelo mailbox's Drafts folder is only reachable via IMAP (Outlook desktop). No test
  draft was created, to avoid a false "pass" in the wrong mailbox.

## 6. Options (Gerhard's decision)

| Option | What changes | Effect |
|---|---|---|
| **A. Gmail is the Claude mail path (recommended, zero infrastructure)** | Nothing on the Microsoft side. Claude uses the Gmail connector (`gerhardcttx@gmail.com`) for search, drafts and replies. Optionally add "Send mail as gerhard@cttx.co.za" in Gmail (Settings → Accounts → Send mail as, SMTP `mail.cttx.co.za`, the xneelo mailbox password) so drafts carry the CTTX From address. | Drafts appear in Gmail Drafts (web/phone), not in Outlook desktop's Drafts. Search already covers all CTTX mail. No new accounts. |
| **B. Add the Gmail account to Outlook desktop as well** | Outlook desktop gets `gerhardcttx@gmail.com` (IMAP) alongside the xneelo account. | Claude's Gmail drafts become visible inside Outlook desktop under the Gmail account's Drafts. Still no Microsoft dependency. |
| **C. Migrate gerhard@cttx.co.za to Microsoft 365** | Verify cttx.co.za in tenant `c0bb4ede-...`, re-buy Business Basic/Standard, add gerhard@cttx.co.za as the user's primary address, move MX/SPF/DKIM to Microsoft, migrate the xneelo mailbox, reconnect the connector with write scopes. | Only route that satisfies "draft appears in Outlook → gerhard@cttx.co.za → Drafts via the Microsoft connector". It is a mailbox migration and a recurring licence. Do not start without explicit approval. |

## 7. Things Gerhard must check on the PC (cannot be seen from the cloud)

1. **Windows account:** Settings → Accounts → Your info. Expect a personal Microsoft account (either
   gerhard@cttx.co.za or gerhardcttx@gmail.com as the sign-in name). Do not change it.
2. **Outlook desktop accounts:** File → Account Settings → Account Settings. Expect `gerhard@cttx.co.za`
   of type **IMAP/SMTP** or **POP/SMTP** with server `mail.cttx.co.za`. If you also see
   `gerhardSmit@CTTX.onmicrosoft.com` (type Microsoft Exchange), that is the stale Business profile; it can
   be removed later, but leave it during the audit.
3. **Mailbox admin:** konsoleH at https://konsoleh.co.za (login is the domain admin / mailbox credentials
   held by Webpartner). This is where the forward-to-Gmail rule and the mailbox password live.
   Do not paste any password into Claude.
4. **Personal Microsoft account security:** https://account.microsoft.com/security — review the foreign
   sign-in alerts on the Gmail-named account. No changes needed for mail.

## 8. Side findings (not fixed, flagged only)

- **DKIM is broken for mail sent via xneelo.** Inbound headers show `dkim=permerror (no key for signature)
  header.s=xneelo`. The xneelo DKIM selector record was not carried over when DNS moved to Cloudflare in
  July 2026. Mail from Outlook desktop is currently unsigned; DMARC is `p=none` so it still delivers, but
  deliverability to strict recipients (Microsoft 365 customers such as Paratus) is weaker than it should be.
  Fix: publish the `xneelo._domainkey.cttx.co.za` record from konsoleH into Cloudflare.
- Gmail-to-cttx.co.za bounced with `550 Administrative prohibition` on 8–9 July 2026 during the DNS
  outage. Resolved since; noted for history.
- Two Microsoft 365 Business Basic cancellations (27 Jun, 25 Sep). If the June one was not intentional,
  it may have been a failed payment; the September one appears deliberate. Either way the tenant is idle.

## 9. Permanent rule (mirrored in CLAUDE.md)

See "MICROSOFT / OUTLOOK IDENTITY RULE" in CLAUDE.md.
