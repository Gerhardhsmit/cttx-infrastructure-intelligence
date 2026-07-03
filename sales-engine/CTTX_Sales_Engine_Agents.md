# CTTX Sales Engine — Agent Reference

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CTTX SALES ENGINE v1                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  INBOUND FUNNEL                    OUTBOUND FUNNEL           │
│  ─────────────                    ──────────────            │
│  Agent 1: CRUISER (BLOCKED)       Agent 3: PROSPECTOR        │
│  Agent 2: SEO (BLOCKED)           Agent 4: CALLER PREP       │
│  Agent 5: RESPONDER               Agent 6: NURTURER          │
│                                                              │
│  MEASUREMENT                                                 │
│  ───────────                                                │
│  Agent 7: SCOREKEEPER                                        │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  CRM: Notion "CTTX Outreach Tracker"                         │
│  Email: Gmail (gerhardcttx@gmail.com → gerhard@cttx.co.za)  │
│  Schedule: Manus Scheduled Tasks (Mon-Fri 06:00 SAST)       │
└─────────────────────────────────────────────────────────────┘
```

---

## Agent 1 — CRUISER (Lead Magnet)
**Status:** BLOCKED (Manus hosting = client-side JS, no SSR)
**Owner:** Claude Code (SSG migration)
**Purpose:** Speed test tool on cruiser.cttx.co.za that captures leads with consent

---

## Agent 2 — SEO (Crawlability)
**Status:** BLOCKED (same root cause as Agent 1)
**Owner:** Claude Code
**Purpose:** Make cttx.co.za crawlable by Google (SSG, meta tags, sitemap, segment landing pages)

---

## Agent 3 — PROSPECTOR
**Status:** LIVE + SCHEDULED
**Fires:** Daily 06:00 SAST (Mon-Fri)
**Purpose:** Research 25 new prospects daily from public sources
**Output:** Notion CRM rows with phone, segment, pain signal, source URL
**Target:** 80%+ phone rate, 125 new prospects/week

---

## Agent 4 — CALLER PREP
**Status:** LIVE + SCHEDULED
**Fires:** Daily 07:00 SAST (Mon-Fri)
**Purpose:** Generate 10-prospect call sheet with personalised openers
**Output:** Email to gerhard@cttx.co.za with phone numbers, openers, objection handlers
**Target:** 10 prospects/day, each with 20-second opener and 2 objection rebuttals

---

## Agent 5 — RESPONDER (Speed-to-Lead)
**Status:** READY (send disabled until Resend API key configured)
**Fires:** On-demand / part of daily check
**Purpose:** Monitor inbox for genuine enquiries, draft qualifying reply within 5 min
**Output:** Gmail drafts (not sent until flag enabled)
**Target:** <5 min median response time, 40% enquiry-to-call rate

---

## Agent 6 — NURTURER
**Status:** READY (send disabled until Resend API key configured)
**Fires:** Daily check for consented leads
**Purpose:** 3-touch follow-up sequence for leads with logged consent
**Output:** Touch 2 (day 4) and Touch 3 (day 9), then stop forever
**Target:** 8%+ reply rate, max 3 touches, one-click opt-out in every email

---

## Agent 7 — SCOREKEEPER
**Status:** LIVE + SCHEDULED
**Fires:** Daily 17:00 SAST (Mon-Fri)
**Purpose:** Daily scoreboard with all pipeline metrics and kill-switch status
**Output:** Email to gerhard@cttx.co.za with funnel numbers, segment breakdown, blockers
**Target:** Delivered by 17:05 SAST every weekday

---

## Notion CRM Schema

| Field | Type | Purpose |
|-------|------|---------|
| Reserve Name | Title | Business name |
| Decision Maker | Text | Contact person |
| Status | Select | Not Sent / Sent / Replied / Meeting Booked / Quoted / Won / Lost |
| Channel | Select | Phone / Email / LinkedIn / WhatsApp |
| First Touch Date | Date | When first contacted |
| Phone | Phone | Direct phone number |
| Email | Email | Business email |
| Town | Text | Location |
| Pain Signal | Text | Why they need connectivity |
| Coverage Note | Text | Vodacom LTE status, fibre availability |
| Source URL | URL | Where prospect was found |
| Consent | Checkbox | POPIA consent logged |
| Consent Date | Date | When consent was given |
| Consent Source | Text | How consent was obtained |
| Lead Score | Select | HOT / WARM / COLD |
| Segment | Select | Reserve/Lodge / Farm / School / Security / Construction / Mine / Factory/Warehouse |
| Nurture Stage | Select | Not Started / Touch 2 / Touch 3 / Complete / Opted Out |
| Agent Source | Text | Which agent created the record |

---

## POPIA Guardrails

1. No marketing email without Consent = TRUE in Notion
2. Consent must be logged with date and source
3. One-click opt-out in every marketing email
4. Opt-outs honoured same day, suppression list permanent
5. Max 3 touches then stop forever
6. Call sheets and scoreboards go to gerhard@cttx.co.za ONLY
7. Kill-switch: bounce >2%, complaint >0.1%, or POPIA complaint = STOP ALL SENDING

---

## Kill-Switch Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| Bounce rate | >2% | Pause all sending, alert Gerhard |
| Complaint rate | >0.1% | Pause all sending, alert Gerhard |
| POPIA complaint | Any | Kill all outbound immediately |
| Opt-out not honoured | Any | Kill all outbound immediately |
