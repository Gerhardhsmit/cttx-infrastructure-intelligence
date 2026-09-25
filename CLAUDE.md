# CLAUDE.md — CTTX Infrastructure Intelligence Permanent Context

**Purpose:** Persistent operating context for Claude Code. Loads automatically in every session.

**Authority:** Consolidates existing CTTX strategic guidance and architecture.

**Last Updated:** 25 September 2026

---

## QUICK REFERENCE

**Company:** CTTX Services (Pty) Ltd  
**Director:** Gerhard Smit (gerhard@cttx.co.za | 084 550 3281)  
**Market:** Rural/remote reserve and farm infrastructure (South Africa)  
**Core Positioning:** Trusted infrastructure advisor, NOT a commodity connectivity reseller

**Authoritative Documents:**
- **Network Architecture Rules:** `CTTX_CRITICAL_DECISIONS.md`
- **Strategic Positioning:** `references/cttx-strategic-positioning.md`
- **Sales Automation:** `sales-engine/CTTX_Sales_Engine_Agents.md`
- **Proposal Templates:** `sales-engine/CTTX_Proposal_Template.md`
- **Prospect Register:** `sales-engine/prospects_batch1.json` + Notion CRM

---

## CORE OPERATING PRINCIPLE

**CONTEXT FIRST → EXECUTION SECOND → QUESTIONS LAST**

Before asking the user for information:
1. Search existing CTTX knowledge (files, docs, Notion)
2. Inspect supplied evidence (KMZ, Link Planner, designs)
3. Determine what's genuinely missing
4. Ask only targeted questions using MISSING → WHY → QUESTION format

---

## OPPORTUNITY CLASSIFICATION

**Recognize these types.** Single opportunity may contain multiple:

- **Assessment** — GIS feasibility, design, RF analysis, cost estimate
- **Resell** — Straightforward product/service resale (Vodacom, supplier goods)
- **Carrier** — Connectivity opportunity (Varrucom wireless, VSAT, fiber)
- **Private Infrastructure** — CTTX designs/builds property network (backbone, high sites, distribution)
- **Hybrid** — CTTX infrastructure + carrier connectivity  
- **PSI** — Private Spectrum Infrastructure (property-wide comms)
- **Project** — Approved opportunity in delivery phase

**Reference:** See opportunity classification workflow in new-opportunity skill (when implemented)

---

## COMMERCIAL FLOW

Customer → Requirement → Assessment → Architecture → Carrier (if applicable) → Equipment → Pricing → Proposal → Approval → Delivery → Recurring Service

**Principle:** The customer's requirement defines the architecture. The architecture defines the equipment. Do NOT let supplier product lists define the solution.

---

## CRITICAL BUSINESS RULES

1. **Supplier ≠ Customer**
   - CTTX owns the customer relationship and solution
   - Supplier cost stays internal (unless explicitly requested)
   - Quotation shows CTTX pricing, not supplier cost

2. **Reseller Status is Persistent Context**
   - If CTTX is an established reseller (e.g., Varrucom), treat as fact
   - Do NOT ask "Are you a reseller?" when documented relationship exists

3. **Pricing Must Be Retrieved, Never Invented**
   - Retrieve supplier pricing from authoritative source (rate cards, Notion, etc.)
   - Retrieve markup rules from established commercial rules
   - Do NOT guess or invent pricing

4. **Hybrid ≠ Generic Reseller**
   - When hybrid identified, CTTX is infrastructure architect, not commodity vendor
   - Components: wireless backbone, fiber, towers, power, backhaul, carrier link, installation, engineering, service
   - Customer requirement defines solution, not supplier product list

5. **Minimum-Question Principle**
   - Ask only when: can't find in existing knowledge, can't derive from supplied files, materially affects price/solution
   - Format: MISSING → WHY IT MATTERS → QUESTION

---

## SUPPLIER RELATIONSHIPS & EQUIPMENT STANDARDS

**Established Resellers/Vendors:**

| Supplier | Products | Status | Notes |
|----------|----------|--------|-------|
| Varrucom | Wireless connectivity, point-to-point links, backhaul | PRIMARY | Preferred upstream for hybrid solutions |
| Vodacom Business | LTE Business, VSAT, connectivity packages | SECONDARY | Backup links, failover, secondary carrier |
| Cambium Networks | 5.8 GHz wireless radios, cnMaestro management | STANDARD STACK | Specified in all designs (CTTX_CRITICAL_DECISIONS.md) |
| Victron Energy | MPPT, inverters, monitoring systems | STANDARD STACK | All off-grid power designs; remote monitoring required |
| Hubble Lithium | Lithium battery packs, battery management | STANDARD STACK | All energy storage; integrated Victron monitoring |

**Where to find:** Rate cards, pricing, and specific commercial terms → Retrieve from authoritative source (to be confirmed with director)

---

## NETWORK ARCHITECTURE & TECHNICAL RULES

**Authority:** `CTTX_CRITICAL_DECISIONS.md`

Key rules:
- Three-layer network: Backbone → Distribution → Backhaul
- LOS-clear links only (no speculative, marginal, or blocked paths)
- Minimum viable infrastructure (fewest high sites, fewest hops)
- Main lodge = primary distribution hub
- Cambium + Victron + Hubble = standard monitored stack
- Design for min 98–99% availability
- BER-first (low error rate) not speed-first design
- Application profiles drive network design (PTZ cameras, VoIP, IoT, guest WiFi, payment systems, access control)

---

## STRATEGIC POSITIONING

**Authority:** `references/cttx-strategic-positioning.md`

Three business drivers:
1. **Security/Threats** — Connectivity supports anti-poaching, perimeter monitoring, camera uptime, incident detection
2. **Operations Effectiveness** — Connectivity enables ranger coordination, telemetry, gate control, maintenance response
3. **Hospitality/On-Property Connectivity** — Connectivity supports guest WiFi, POS, booking platforms, revenue

**Key Principle:** CTTX is a trusted infrastructure advisor, NOT a commodity connectivity reseller. Frame as "carrier-grade reserve infrastructure owned and controlled by customer" rather than bandwidth packages.

---

## SALES AUTOMATION & CUSTOMER DATA

**Authority:** `sales-engine/CTTX_Sales_Engine_Agents.md`

Agents running daily:
- **Agent 3 (Prospector)** — Research 25 new prospects → Notion CRM
- **Agent 4 (Caller Prep)** — Generate call sheets with openers
- **Agent 7 (Scorekeeper)** — Daily pipeline metrics

Notion CRM Schema: Prospect tracking with phone, segment, pain signal, consent, lead score, nurture stage

**Prospect Register:** `sales-engine/prospects_batch1.json` (25 rural properties, reserves, farms, schools, mines)

---

## PROPOSAL & QUOTATION WORKFLOW

**Authority:** `sales-engine/CTTX_Proposal_Template.md` and customer proposals

Customer-Facing Components:
- Executive summary
- Customer requirement
- Proposed solution + architecture
- Scope + equipment
- Implementation timeline
- Investment options and pricing
- Support + warranty terms
- Assumptions + exclusions
- Next steps + acceptance form

Internal-Only Components:
- Supplier costs
- Markup/commercial calculations
- Source pricing references
- Procurement notes
- Internal assumptions

**Key Principle:** Keep internal and customer-facing information appropriately separated

---

## FILE INSPECTION & EVIDENCE

**When customer provides files:** Extract and use automatically
- **KMZ/KML:** Extract coordinates, terrain, distances
- **Link Planner output:** Extract RF predictions, fade margin, antenna specs, capacity
- **Network designs:** Analyze topology, constraints, current architecture
- **RF reports/propagation:** Extract coverage analysis, LOS paths, throughput
- **Site photos:** Understand physical constraints
- **Previous quotations:** Understand pricing patterns

**Do NOT ask:** "What files do you have?" or "Can you send the KMZ?"  
**DO:** If files mentioned, inspect them directly. If files are relevant but not mentioned, ask specifically.

---

## NEW OPPORTUNITY INTAKE WORKFLOW

**Trigger:** Recognize natural language like "New opportunity", "New hybrid", "Build proposal", etc.

**Workflow:**
1. Parse customer name and opportunity details
2. Load CTTX business context (this file)
3. Retrieve customer context (if prior engagement exists)
4. Retrieve opportunity-specific context (by type)
5. Inspect supplied files and extract data
6. Identify genuinely missing information (use Minimum-Question Principle)
7. Route to appropriate workflow (Assessment / Resell / Hybrid / PSI / etc.)
8. Start proposal/quotation generation
9. File opportunity in directory + Notion
10. Preserve reusable intelligence for future opportunities

**Authority:** `.claude/skills/new-opportunity.md` (skill to be implemented)

---

## MISSING — REQUIRES DIRECTOR DECISION

The following information does NOT exist in documented form and must be provided by director or sourced from authoritative records:

**Commercial Rules:**
- [ ] Varrucom markup/margin
- [ ] Vodacom Business margin
- [ ] Equipment reseller margins (Cambium, Victron, Hubble)
- [ ] Installation rate (per day or per type)
- [ ] Assessment fee pricing
- [ ] Recurring service pricing structure
- [ ] Discount/volume rules
- [ ] Payment terms and conditions

**Supplier Relationships:**
- [ ] Varrucom reseller agreement details
- [ ] Rate cards and pricing (if locked in)
- [ ] Volume commitments or targets
- [ ] Territory exclusivity
- [ ] Support/SLA terms with each supplier

**Operational:**
- [ ] CTTX company registration / tax details
- [ ] Formal service level agreement (SLA) template
- [ ] Standard installation/support rates
- [ ] Warranty claim procedure
- [ ] Escalation procedures for customer issues

**Where to find:** Director to specify authoritative location (Notion database, spreadsheet, supplier contracts, etc.)

---

## DIRECTORY STRUCTURE

```
cttx-infrastructure-intelligence/

├── CLAUDE.md                          ← This file (permanent context)
├── CTTX_CRITICAL_DECISIONS.md         ← Network architecture rules
├── README.md                          ← Tech stack and Link Planner
├── references/                        ← Strategy and positioning
│   ├── cttx-strategic-positioning.md
│   ├── psi-disruption-playbook.md
│   ├── link-planner-integration-notes.md
│   └── [other reference materials]
│
├── .claude/
│   └── skills/
│       └── [skills to be created]
│
├── sales-engine/
│   ├── CTTX_Proposal_Template.md      ← Base proposal template
│   ├── CTTX_Proposal_Template.pdf
│   ├── CTTX_Sales_Engine_Agents.md    ← Sales automation
│   ├── prospects_batch1.json          ← Prospect database
│   └── customers/
│       └── [customer-specific opportunities]
│
└── [other directories: Link Planner, revenue-os, drizzle, etc.]
```

---

## SESSION STARTUP BEHAVIOR

**Every new Claude Code session should:**

1. Load this CLAUDE.md for context
2. Check .claude/skills/ for available project skills
3. When user provides opportunity intent, recognize it and route to new-opportunity workflow
4. Retrieve customer context from existing files (if customer already worked on)
5. Inspect supplied files automatically
6. Reference CTTX_CRITICAL_DECISIONS for network/technical rules
7. Reference strategic positioning and sales engine for commercial context
8. Mark any invoked pricing/commercial rules as coming from specific authoritative source
9. Flag any information that does NOT exist with MISSING → WHY IT MATTERS → QUESTION format

---

## ACCEPTANCE CRITERIA FOR THIS IMPLEMENTATION

✓ Gerhard provides an opportunity with minimal detail  
✓ Claude retrieves existing CTTX context automatically  
✓ Claude asks ONLY for genuinely missing information  
✓ Claude does NOT ask questions whose answers exist in the system  
✓ Claude produces proposal generation toward completion  
✓ Opportunity is filed correctly for future sessions  
✓ Reusable intelligence is captured  

---

**END CLAUDE.MD**

*This is the source of record for CTTX Claude Code permanent context. Loads automatically in every session.*
