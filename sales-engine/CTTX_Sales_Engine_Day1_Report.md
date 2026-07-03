# CTTX Vodacom Reseller Sales Engine — DAY 1 REPORT

**Date:** Thursday 3 July 2026
**Engine Version:** v1.0
**Status:** LIVE (with noted blockers)

---

## EXECUTIVE SUMMARY

The CTTX Sales Engine is operational. 7 agents built, 3 scheduled for daily recurring execution (visible in Scheduled tab), 2 emails delivered to gerhard@cttx.co.za today, 25 prospects loaded into the CRM with phone numbers. Numbers below.

---

## DAY 1 ACCEPTANCE TESTS

| # | Test | Result | Evidence |
|---|------|--------|----------|
| 1 | Notion CRM has 25+ prospects with phone numbers | **PASS** | 31 total records, 25 with phone (81%) |
| 2 | Call sheet emailed to gerhard@cttx.co.za | **PASS** | Message ID: 19f290d8ccd808c2, sent 17:36 UTC |
| 3 | Scoreboard emailed to gerhard@cttx.co.za | **PASS** | Message ID: 19f2914cf995b0c4, sent 17:44 UTC |
| 4 | cttx.co.za crawlable by Google | **BLOCKED** | Client-side JS only; Claude Code taking over |
| 5 | CRUISER on brand domain (cruiser.cttx.co.za) | **BLOCKED** | Same root cause as #4 |
| 6 | Scheduled task visible in Scheduled tab | **PASS** | "CTTX Sales Engine — Agents 3+4+7 (Daily 06:00 SAST)", status: active |
| 7 | Agent 5 (Responder) built with send disabled | **PASS** | Inbox scanned: 0 genuine enquiries (all spam) |
| 8 | Agent 6 (Nurturer) built with send disabled | **PASS** | 0 consented leads (correct — awaiting first call consent) |
| 9 | No marketing email sent to any prospect | **PASS** | 0 outbound to prospects; only gerhard@cttx.co.za |
| 10 | POPIA compliance | **PASS** | Consent checkbox = FALSE for all 31 records; no nurture triggered |

**Score: 8/10 PASS | 2 BLOCKED (known, separate workstream)**

---

## WHAT IS SCHEDULED (VISIBLE IN SCHEDULED TAB)

| Schedule Name | Cron | Fires At (SAST) | Days | Status |
|---------------|------|------------------|------|--------|
| CTTX Sales Engine — Agents 3+4+7 (Daily 06:00 SAST) | `0 0 4 * * 1-5` | 06:00 SAST | Mon–Fri | **ACTIVE** |

**What it does each morning:**
1. **Agent 3 (Prospector)** — Researches 25 new prospects, inserts into Notion CRM with phone, segment, pain signal
2. **Agent 4 (Caller Prep)** — Queries CRM for 10 best uncalled prospects, generates call sheet with openers and objection handlers, emails to gerhard@cttx.co.za
3. **Agent 7 (Scorekeeper)** — Queries CRM for pipeline metrics, composes scoreboard with all KPIs and kill-switch status, emails to gerhard@cttx.co.za

**Connectors attached:** Gmail, Notion

---

## WHAT IS DEPLOYED (RUNNING TODAY)

| Agent | Status | Output Today |
|-------|--------|--------------|
| Agent 1 (CRUISER) | BLOCKED | Manus hosting = JS shell, no SSR |
| Agent 2 (cttx.co.za SEO) | BLOCKED | Same root cause |
| Agent 3 (Prospector) | **LIVE** | 25 prospects inserted into Notion CRM |
| Agent 4 (Caller Prep) | **LIVE** | 10-prospect call sheet emailed |
| Agent 5 (Responder) | **READY** (send disabled) | Inbox scanned, 0 genuine enquiries |
| Agent 6 (Nurturer) | **READY** (send disabled) | 0 consented leads, correctly idle |
| Agent 7 (Scorekeeper) | **LIVE** | Scoreboard emailed with full metrics |

---

## CRM PIPELINE SNAPSHOT (Real Numbers)

| Metric | Value |
|--------|-------|
| Total records in CRM | 31 |
| Records with phone number | 25 (81%) |
| Status: Not Sent | 30 |
| Status: Sent | 1 |
| Status: Replied | 0 |
| Status: Meeting Booked | 0 |
| Status: Quoted | 0 |
| Consented leads | 0 |
| Leads in nurture | 0 |

**Segment Breakdown:**

| Segment | Count |
|---------|-------|
| Reserve/Lodge | 9 |
| Farm | 7 |
| School | 4 |
| Mine | 2 |
| Security | 1 |
| Factory/Warehouse | 1 |
| Construction | 1 |
| Untagged (legacy) | 6 |

---

## BLOCKERS (3)

| # | Blocker | Owner | Impact |
|---|---------|-------|--------|
| 1 | **CRUISER on brand domain** | Claude Code | Agent 1 cannot capture leads until cruiser.cttx.co.za is live with SSG/prerender |
| 2 | **cttx.co.za crawlability** | Claude Code | Agent 2 (SEO) cannot function; Google sees empty div#root |
| 3 | **Resend API key not configured** | Gerhard | Agent 5 + 6 send disabled; replies stay as drafts until key added to environment |

---

## OPEN ITEMS (Require Gerhard Action)

1. **Approve the scheduled task** — It will fire tomorrow (Fri 4 July) at 06:00 SAST. Check your Scheduled tab and confirm.
2. **Add Resend API key** — Once configured, Agent 5 (Responder) and Agent 6 (Nurturer) will activate outbound sending.
3. **CRUISER migration** — Claude Code is building SSG version for cruiser.cttx.co.za. Once live, Agent 1 will start capturing speed-test leads.
4. **First calls** — Use today's call sheet. Any verbal "send me something" = consent. Log in Notion, then the nurture sequence activates.

---

## KILL-SWITCH STATUS

| Switch | Threshold | Current | Status |
|--------|-----------|---------|--------|
| Bounce rate | <2% | 0% | GREEN |
| Complaint rate | <0.1% | 0% | GREEN |
| POPIA complaint | 0 | 0 | GREEN |
| Opt-out honoured | Same day | N/A | GREEN |

**All kill-switches GREEN.**

---

## TOMORROW'S EXPECTED OUTPUT (Fri 4 July 2026)

- 06:00 SAST: Agent 3 adds 25 new prospects to CRM (target: 56 total)
- 07:00 SAST: Agent 4 emails fresh 10-prospect call sheet
- 17:00 SAST: Agent 7 emails Day 2 scoreboard

---

*Numbers or it didn't happen.*

— CTTX Sales Engine v1 | Built 3 July 2026
