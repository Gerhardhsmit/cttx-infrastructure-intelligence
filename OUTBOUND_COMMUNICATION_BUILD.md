# CTTX Persistent Outbound Communication Infrastructure

**Status:** IMPLEMENTATION IN PROGRESS  
**Started:** 2026-09-27  
**Foundation Blocks:** 1-7 being implemented

---

## Architecture Overview

```
CTTX COMMERCIAL ENGINE
        ↓
OPPORTUNITY QUEUE (prospects_batch1.json + Notion)
        ↓
CONTACT / ACCOUNT DATA
        ↓
MESSAGE GENERATOR (Claude)
        ↓
APPROVAL / POLICY GATE (HUMAN)
        ↓
OUTBOUND QUEUE (outbound_messages table)
        ↓
COMMUNICATION WORKER (Python/Node script)
        ↓
OUTLOOK ADAPTER (Microsoft Graph + Local COM fallback)
        ↓
DELIVERY VERIFICATION (Sent Items check)
        ↓
RECEIPT STORE (outbound_receipts table)
        ↓
PIPELINE / REGISTER UPDATE
        ↓
FOLLOW-UP QUEUE
        ↓
SALES LEARNING
```

---

## Implementation Blocks

### BLOCK 1: Persistent Outbound Queue
**Status:** DESIGNING

Tables needed:
- `outbound_messages` — Main queue
- `outbound_message_attempts` — Retry tracking
- `outbound_receipts` — Delivery verification

Message states:
```
DRAFT
READY
APPROVED
QUEUED
SENDING
SENT
VERIFIED
FOLLOW_UP_DUE
RESPONDED
CLOSED

Failures:
RETRY
BLOCKED
FAILED
DEAD_LETTER
```

### BLOCK 2: Local Outlook Adapter
**Status:** DESIGN PENDING

Current state:
- Microsoft Graph API: BLOCKED (service principal disabled)
- Local Outlook COM: NOT YET TESTED
- Fallback: Use local Windows Outlook (when available)

Plan:
1. Implement Microsoft Graph adapter (when auth restored)
2. Implement local Outlook COM adapter (for Windows machines)
3. Abstract into pluggable transports

### BLOCK 3: Send Worker
**Status:** DESIGN PENDING

Executable independently of Claude.
Responsibilities:
1. Check outbound queue
2. Find eligible messages
3. Check policy/approval
4. Select healthy transport
5. Attempt delivery
6. Verify delivery
7. Write receipt
8. Update pipeline
9. Schedule follow-up

### BLOCK 4: Delivery Verification
**Status:** DESIGN PENDING

For Outlook:
- Check Sent Items via Graph API
- Verify recipient + subject match
- Create verification record

### BLOCK 5: Receipts
**Status:** DESIGN PENDING

Every send must create:
- Message ID
- Recipient
- Subject
- Transport used
- Timestamp
- Sent Items verification
- Provider confirmation
- Pipeline update marker

### BLOCK 6: Retry / Failure Handling
**Status:** DESIGN PENDING

Classify failures:
- TRANSIENT (retry with backoff)
- PERMANENT (dead-letter)
- HUMAN REQUIRED (escalate)

### BLOCK 7: Watchdog
**Status:** DESIGN PENDING

Monitor:
- Worker running
- Queue growing
- No successful sends
- Receipts missing
- Outlook availability
- Authentication failure

---

## Immediate Implementation (Next Steps)

1. ✓ Inspect existing infrastructure
2. Implement Block 1: Database schema (outbound_messages table)
3. Implement Block 2: Outlook adapter selection
4. Implement Block 3: Send worker script
5. Implement Block 4: Delivery verification
6. Implement Block 5: Receipt system
7. Test with first prospect batch

---

## Data: The 25 Assessment Prospects

File: `sales-engine/prospects_batch1.json`

Ready to queue assessment outreach for:
1. Sekala Private Game Lodge (Vaalwater)
2. Mabula Game Lodge (Bela-Bela)
3. Khaya Ndlovu Manor House (Hoedspruit)
... [22 more]

---

## First Execution Target

**Campaign:** Assessment Outreach — Reserve/Lodge Infrastructure  
**Batch Size:** 5 → 10 → 25  
**Message Type:** `ASSESSMENT_INITIAL`  
**Approval:** HUMAN (initial contact)  
**Transport:** Outlook (via Graph or COM)

---

## Success Criteria

After implementation:
```
NEW PROSPECT IN prospects_batch1.json
    ↓
ASSESSMENT OUTREACH GENERATED
    ↓
QUEUED IN outbound_messages
    ↓
APPROVED BY GERHARD
    ↓
WORKER PROCESSES QUEUE
    ↓
EMAIL SENT VIA OUTLOOK
    ↓
VERIFIED IN SENT ITEMS
    ↓
RECEIPT CREATED
    ↓
PIPELINE UPDATED
    ↓
FOLLOW-UP CREATED
    ↓
WATCHDOG MONITORS

ALL PERSISTENT IN DATABASE
NO MANUAL RE-CREATION NEEDED
SYSTEM RUNS TOMORROW WITHOUT CLAUDE
```

---

## Working Directory

- Implementation: `/home/user/cttx-infrastructure-intelligence/outbound-communication/`
- Database: Existing MySQL (Drizzle ORM)
- Worker: Node.js or Python (TBD)
- Adapter: Microsoft Graph (primary) + Local COM (fallback)
- Tests: Real prospect data (first 5)

