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

**Primary Business Model: CTTX Hybrid Infrastructure**

CTTX does NOT merely resell connectivity.

CTTX builds telecommunications infrastructure.

**The Model:**
1. Carrier (Vodacom) supplies connectivity to the property entry point
2. CTTX designs and builds private infrastructure that distributes reliable communications across the property
3. Result: Property gains an owned, controlled communications backbone

**What This Includes:**
- Carrier handoff and integration
- Private wireless backbone and distribution
- Fiber or point-to-point links where applicable
- Masts, poles, mounting infrastructure
- Switching, routing, network management
- Power systems (solar, batteries, UPS) where required
- Wi-Fi access and guest services
- Security communications infrastructure
- Redundancy and failover
- Installation, commissioning, ongoing managed service

**Core Proposition:**
"The objective is not simply to purchase another internet connection. The objective is to establish a reliable communications backbone for the property that supports its actual operational requirements."

**Customer Value Comparison:**
| Existing Model | CTTX Hybrid Model |
|---|---|
| Customer pays for connectivity/service | Customer obtains carrier + private infrastructure |
| Dependent on provider's coverage/reliability | Property gains owned infrastructure asset |
| Operational limitations may remain | Infrastructure designed around actual requirements |
| Recurring cost only | CAPEX investment → recurring saving/operational benefit |

**Three Business Success Drivers (for lodges/reserves/farms):**
1. **Guest/Client Experience:** Reliable connectivity = better guest experience, reputation, service capability
2. **Staff Communication:** Reliable internal communications (lodge, field, remote areas, security, incident response)
3. **Security/Operational Continuity:** Network must support security systems, incident response, emergency communication

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

- **Assessment** — GIS feasibility, design, RF analysis, cost estimate, business case
- **Resell** — Straightforward product/service resale (Vodacom packages, equipment)
- **Carrier** — Connectivity-only opportunity (no private infrastructure)
- **Private Infrastructure** — CTTX designs/builds property network (backbone, high sites, distribution, power, switching)
- **Hybrid** — CTTX infrastructure + carrier connectivity (Vodacom primary model)
- **PSI** — Private Spectrum Infrastructure (property-wide radio/dispatch comms)
- **Project** — Approved opportunity in delivery phase

**AUTOMATIC CLASSIFICATION RULE:**

When opportunity type = **Lodge / Reserve / Farm / Property + Connectivity Requirement**

→ Automatically consider: **HYBRID INFRASTRUCTURE OPPORTUNITY**

Do NOT default to: "Buy internet → Add Wi-Fi → Quote"

**Instead ask:** "What infrastructure does this property need to operate reliably?"

The private infrastructure (carrier entry point, backbone, distribution, power, security comms) is the core product. Carrier connectivity is one component of the solution.

**Reference:** See new-opportunity skill intake workflow

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
| Vodacom Business | LTE Business, connectivity packages, upstream link | PRIMARY RESELLER | Core component of CTTX Hybrid Network model |
| Varrucom | Wireless connectivity, point-to-point links, backhaul | ALTERNATIVE | Optional upstream for hybrid solutions (if preferred) |
| Cambium Networks | 5.8 GHz wireless radios, cnMaestro management | STANDARD STACK | Private network infrastructure (CTTX_CRITICAL_DECISIONS.md) |
| Victron Energy | MPPT, inverters, monitoring systems | STANDARD STACK | Private network power systems; remote monitoring required |
| Hubble Lithium | Lithium battery packs, battery management | STANDARD STACK | Private network energy storage; integrated Victron monitoring |

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

## PROPOSAL STRUCTURE FOR HYBRID INFRASTRUCTURE OPPORTUNITIES

**For lodge/reserve/farm/property opportunities, structure around:**

1. **Executive Summary** — What the property needs and why
2. **Current Situation** — Existing connectivity, documented operational problems, evidence of failures
3. **Three Business Drivers**
   - Guest/client experience impact
   - Staff communication requirement (lodge → field → remote areas)
   - Security/operational continuity (incident response, emergency comms)
4. **Architecture** — Where carrier enters, how CTTX distributes across property
5. **Infrastructure** — Equipment, links, masts, power, switching, Wi-Fi, security, redundancy
6. **Commercial Model** — CAPEX, recurring carrier cost, CTTX services
7. **Financial Case**
   - Current recurring cost
   - Proposed recurring cost
   - Monthly/annual saving (if applicable)
   - CAPEX investment
   - Simple payback period (calculated from actual numbers only)
   - Long-term operational value
8. **Operational Outcome** — What the property can reliably do (with evidence connection)
9. **Assumptions & Exclusions** — Clearly documented
10. **Next Steps** — Assessment, approval, implementation, or as appropriate

**Critical:** Use customer-reported evidence, not invented scenarios. (E.g., Elephant Barefoot: "Elephants broke out after 21:00 and staff had no effective communication" → Solution requirement: "Network must provide dependable communications beyond normal hours and across operational areas where incident response may occur.")

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
