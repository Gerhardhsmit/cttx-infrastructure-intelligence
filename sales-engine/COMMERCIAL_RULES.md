# COMMERCIAL RULES — CTTX Infrastructure Services

**Status:** FRAMEWORK ONLY — Awaiting Director Authorization

**Purpose:** Authoritative source for CTTX pricing, markup, and commercial terms.

**Authority:** To be confirmed by Gerhard Smit (Director)

**Last Updated:** 25 September 2026

---

## PART 1: SUPPLIER PRICING & RATE CARDS

**Vodacom Business (PRIMARY CONNECTIVITY RESELLER)**

```
STATUS: FOUND — AUTHORITATIVE SOURCE IS NOTION (not this repo)

Do NOT copy the full rate card into this file. Retrieve it live from Notion
each time — Vodacom pricing changes (promotions expire, rates get revised).

AUTHORITATIVE LOCATION:
  Primary (current): "💰 Vodacom Products & Pricing"
  https://app.notion.com/p/380ab0d207a781f9bd0dc1f234632915
  Last updated: 15 June 2026
  Under: 🏢 CTTX Services — Master Workspace / 📡 Vodacom Reseller — Lead Intake & Quote System

  Channel Manager: Duane Forlee — Duane.Forlee@vodacom.co.za
  (confirms site-specific cost/feasibility — rate card is the general guide,
  actual cost is confirmed per deal)

⚠️ CONFLICT FLAGGED — NOT SILENTLY RESOLVED:
  A second, older page exists: "CTTX Vodacom Reseller — Business Connectivity
  Sales" (created 31 May 2026) — https://app.notion.com/p/371ab0d207a781288360c5c97408c3e1
  It states a FLAT 20% markup on all products, with different cost figures
  (e.g. Business Connect 100Mbps cost R6,082 incl VAT @ 24mo vs R5,682 ex VAT
  on the newer page). The newer page's TIERED markup policy (20-30% by
  product/bandwidth) is corroborated by:
    - "Solo Sales Machine — Master Playbook" (R8,168/month for 100Mbps = exact
      match to newer page's client price)
    - Lynco Projects real deal (cost R5,235.36 ex VAT × 1.25 = R6,544.20 —
      confirms 25% markup actually applied on 100Mbps, not 20%)
  CONCLUSION: Treat the 15 June 2026 page as current. The 31 May 2026 page
  appears superseded but has not been archived — flag to director for cleanup.

MARKUP POLICY (tiered, per newer page — do not apply flat 20% to everything):
  Business Internet LTE:              20%
  Business Internet 5G (≤100Mbps):    20-22%
  Business Internet 5G (Unrestricted): 25%
  Business Internet Wireless (10-40):  20-25%
  Business Internet Wireless (80):     30%
  Business Connect (10-30 Mbps):       20%
  Business Connect (50-100 Mbps):      22-25%
  Business Connect (200-500 Mbps):     27-30%

REFERENCE POINT USED FOR ELEPHANT BAREFOOT (Business Connect 100 Mbps):
  CTTX Cost: R5,682 ex VAT (retrieved 2026-09-25 from Notion — reconfirm with
  Duane Forlee before final quote, cost may vary by site)
  Markup: 25%
  Client Price: R7,103 ex VAT / R8,168 incl VAT (monthly recurring)
  NRC (once-off connection): R2,608 cost → 20% markup → R3,130 ex VAT / R3,599 incl VAT

Minimum qualifying deal: R1,600/month. Target deal: R6,000-R14,000/month (1:1).
```

**Varrucom (ALTERNATIVE WIRELESS RESELLER)**

```
STATUS: OPTIONAL UPSTREAM (IF CUSTOMER PREFERENCE)

Alternative connectivity source where Vodacom is unavailable or customer prefers.

Required Information:
  ☐ ODU (Outdoor Unit) pricing for 20/20, 50/50, 100/100 Mbps tiers
  ☐ IDU (Indoor Unit) pricing
  ☐ Antenna and mounting hardware pricing
  ☐ Monthly recurring service rates for each tier
  ☐ Installation and commissioning costs (if separate)
  ☐ SLA terms and response times
  ☐ CTTX reseller status, discount, and margin allowance

Source: Varrucom reseller agreement / rate card
Location: [TBD]
```

**Cambium Networks (Radio Equipment)**

```
STATUS: EQUIPMENT SUPPLIER — REQUIRES AUTHORIZATION

Required Information:
  ☐ 5.8 GHz radio equipment pricing (various models/capacities)
  ☐ cnMaestro management platform licensing
  ☐ Antenna and mounting hardware pricing
  ☐ Installation labor rates (if offered)
  ☐ Warranty and support terms
  ☐ CTTX reseller discount (if applicable)

Source: Cambium reseller account / rate card
Location: [TBD]
```

**Victron Energy (Power Systems)**

```
STATUS: EQUIPMENT SUPPLIER — REQUIRES AUTHORIZATION

Required Information:
  ☐ MPPT charge controller pricing (various kW ratings)
  ☐ Inverter pricing (various kW ratings)
  ☐ Monitoring module pricing
  ☐ Cabling and installation hardware
  ☐ CTTX reseller discount

Source: Victron reseller account / rate card
Location: [TBD]
```

**Hubble Lithium (Battery Storage)**

```
STATUS: EQUIPMENT SUPPLIER — REQUIRES AUTHORIZATION

Required Information:
  ☐ Lithium battery pack pricing (various kWh capacities)
  ☐ Battery management system (BMS) pricing
  ☐ Cabling and integration hardware
  ☐ CTTX reseller discount

Source: Hubble Lithium reseller account / rate card
Location: [TBD]
```

---

## PART 2: CTTX MARKUP & MARGIN RULES

**Equipment Resale Markup**

```
STATUS: DIRECTOR AUTHORIZATION REQUIRED

Questions to Answer:
  ☐ Standard markup percentage on equipment (% above supplier cost)?
  ☐ Does markup vary by equipment category (radios vs power vs other)?
  ☐ Volume-based discount rules (bulk purchases get lower margin)?
  ☐ Margin targets by product category (Cambium/Victron/Hubble/other)?
  ☐ Pricing strategy: cost-plus, margin target, or negotiated per opportunity?

Decision Required By: Director
```

**Installation Labor Rates**

```
STATUS: DIRECTOR AUTHORIZATION REQUIRED

Questions to Answer:
  ☐ Standard rate per day for field engineers (R/day)?
  ☐ Rate for senior/lead engineers vs junior staff?
  ☐ Minimum job size or day-rate threshold?
  ☐ Travel and logistics markup (km/travel time)?
  ☐ Site survey rate (separate from installation)?
  ☐ Configuration and commissioning rates?
  ☐ Staff training rates (per hour, per day, included)?

Decision Required By: Director
```

**Assessment & Consulting**

```
STATUS: DIRECTOR AUTHORIZATION REQUIRED

Questions to Answer:
  ☐ Standard assessment fee (R value or % of expected project)?
  ☐ Assessment includes: site survey, RF analysis, BOM, proposal, report?
  ☐ Is assessment fee credited toward project if customer proceeds?
  ☐ Standalone assessment (no follow project) pricing?
  ☐ Link Planner analysis rates?
  ☐ Feasibility study rates?

Decision Required By: Director
```

**Recurring Managed Service**

```
STATUS: DIRECTOR AUTHORIZATION REQUIRED

Questions to Answer:
  ☐ Base managed service rate (R/month, % of recurring carrier cost)?
  ☐ 24/7 monitoring and support included?
  ☐ Includes preventive maintenance? How often?
  ☐ Does customer provide equipment or CTTX? Who bears depreciation?
  ☐ Minimum contract term?
  ☐ Price escalation rules (annual CPI, fixed %, other)?
  ☐ Emergency support markup (e.g., 4-hour response premium)?

Decision Required By: Director
```

---

## PART 3: COMMERCIAL TERMS

**Invoice & Payment**

```
STATUS: DIRECTOR AUTHORIZATION REQUIRED

Questions to Answer:
  ☐ Payment terms: Net 30? Net 15? Upfront?
  ☐ Deposit requirement (% of setup costs)?
  ☐ Recurring service billing: monthly in advance or arrears?
  ☐ Invoice frequency (monthly, quarterly, annual)?
  ☐ Accepted payment methods?

Decision Required By: Director
```

**Contract & Commitment**

```
STATUS: DIRECTOR AUTHORIZATION REQUIRED

Questions to Answer:
  ☐ Minimum contract term for recurring services (12 months? 24 months? Other)?
  ☐ Early termination penalty (% of remaining contract value)?
  ☐ Equipment ownership: CTTX or Customer?
  ☐ Warranty period on equipment and installation?
  ☐ Maintenance obligations (customer vs CTTX)?

Decision Required By: Director
```

**Service Level Agreements (SLA)**

```
STATUS: DIRECTOR AUTHORIZATION REQUIRED

Questions to Answer:
  ☐ Uptime target (99%? 99.5%? 99.9%)?
  ☐ Response time commitment for different severity levels (critical/standard)?
  ☐ Resolution time targets?
  ☐ Maintenance windows (scheduled downtime allowed)?
  ☐ Credits or rebates for SLA breaches?

Decision Required By: Director
```

---

## PART 4: CURRENT STATUS BY OPPORTUNITY TYPE

| Opportunity Type | Equipment Pricing | Labor Rates | Markup Rules | Service Pricing | Status |
|---|---|---|---|---|---|
| Assessment | MISSING | MISSING | MISSING | N/A | BLOCKED |
| Resell | MISSING | N/A | MISSING | N/A | BLOCKED |
| Carrier | Supplier rates | N/A | MISSING | MISSING | BLOCKED |
| Private Infrastructure | MISSING | MISSING | MISSING | MISSING | BLOCKED |
| Hybrid | MISSING | MISSING | MISSING | MISSING | BLOCKED |
| PSI | MISSING | MISSING | MISSING | MISSING | BLOCKED |
| Project | MISSING | MISSING | MISSING | MISSING | BLOCKED |

---

## PART 5: IMPLEMENTATION NOTES

**Constraint:** Do NOT invent or guess any of the above.

**For Elephant Barefoot Lodge (Hybrid Opportunity):**
- Quotation has been created with STRUCTURE in place
- All pricing fields are marked [AWAITING COMMERCIAL RULES]
- Setup will be finalized once commercial rules are provided
- Monthly service rates will be calculated once pricing framework is confirmed

**For Future Opportunities:**
- New-opportunity intake skill will reference this document
- Pricing will be retrieved from this file (once populated)
- If any rule is missing, opportunity will be flagged as BLOCKED on commercials
- Director authorization will be requested before customer presentation

**Authority & Updates:**
- Only Director (Gerhard Smit) can update this document
- All pricing changes must be documented with date and reason
- Quarterly review of margins vs actual costs recommended
- Supplier rate cards should be updated as contracts change

---

## PART 6: AUTHORIZATION WORKFLOW

**When information is provided:**

Director provides (or confirms location of):
1. [ ] Varrucom rate card and reseller agreement
2. [ ] CTTX markup rules for each product category
3. [ ] CTTX labor rates (engineering, survey, config, training)
4. [ ] Assessment and consulting fees
5. [ ] Recurring managed service pricing
6. [ ] Contract terms and SLA commitments

**Then:**
- This file is populated with authoritative data
- All [AWAITING] placeholders are replaced with actual rates
- Future opportunities reference this file instead of inventing pricing
- Elephant Barefoot quotation is finalized with real numbers

---

**STATUS: AWAITING DIRECTOR AUTHORIZATION**

*Do not use this file for customer quotations until fully populated and authorized.*

*Current opportunities referencing this file are marked [AWAITING COMMERCIAL RULES] until rules are provided.*

---

**END COMMERCIAL_RULES.md**
