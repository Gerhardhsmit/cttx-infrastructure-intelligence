# Agent 6 — NURTURER (Consented Follow-up Only)

## Purpose
Send a 3-touch nurture sequence ONLY to leads with logged consent in Notion CRM. Plain text, under 80 words, one link max, one-click opt-out.

## SEND FLAG
**SEND_ENABLED = FALSE** — All emails remain as DRAFTS until Resend API key is live and Gerhard enables this flag.

## Execution Logic (runs daily at 08:00 SAST as part of Agent check)

1. Query Notion CRM: `Consent = TRUE AND Nurture Stage != 'Complete' AND Nurture Stage != 'Opted Out'`
2. For each lead:
   - If `Nurture Stage = 'Not Started'` AND days since Consent Date >= 4 → send Touch 2, update stage to 'Touch 2'
   - If `Nurture Stage = 'Touch 2'` AND days since last touch >= 5 → send Touch 3, update stage to 'Touch 3'
   - If `Nurture Stage = 'Touch 3'` → update to 'Complete', stop forever
3. On any reply → update Status to 'Replied', stop sequence
4. On opt-out → update Nurture Stage to 'Opted Out', add to suppression list, stop immediately

## Touch Templates

### Touch 2 (Day 4) — Value delivery
```
Subject: [Business name] — coverage confirmed

Hi [Name],

I checked Vodacom's coverage map for [their town/address]. You have strong LTE signal, which means a dedicated wireless link is viable without any trenching.

From R1,600/month, no capital outlay.

Worth a quick call? Reply with a time that suits you.

Gerhard Smit | CTTX Services
cttx.co.za

Unsubscribe: [one-click opt-out link]
```

### Touch 3 (Day 9) — Direct ask
```
Subject: [Business name] — site survey

Hi [Name],

Last note from me. If connectivity is still a pain point, I'd like to offer a site survey — R3,500 excl VAT, fully credited against your first build.

Takes 2 hours on-site. I handle everything.

Reply 'yes' and I'll send available dates.

Gerhard Smit | CTTX Services
cttx.co.za

Unsubscribe: [one-click opt-out link]
```

## Rules
- MAX 3 touches then stop FOREVER (Touch 1 = Agent 5 reply, Touch 2, Touch 3)
- Plain text only, under 80 words
- One link maximum per email
- One-click opt-out in every email
- Stop instantly on reply or opt-out
- Opt-outs honoured same day, suppression list forever
- NEVER send without logged consent record

## KPI Target
- Reply rate: 8%+

## Kill Rules
- Max 3 touches then stop forever
- No send without consent checkbox = TRUE in Notion
- Opt-out not honoured = kill switch (stop all sending, alert Gerhard)

## Email Deliverability Ramp (via Resend/send.cttx.co.za)
- Week 1: max 5 emails/day
- Week 2: max 10 emails/day
- Week 3: max 25 emails/day
- Cap: 50 emails/day
- Never burst; consistent daily volume
- Send as: sales@cttx.co.za
