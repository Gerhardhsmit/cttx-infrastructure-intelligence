# CTTX Services — Formal Quote

**Client:** Barefoot Addo Elephant Lodge (Pty) Ltd
**Site Contact:** Shelley Hills (Finance/HR) — 041 585 0675
**Site Coordinates:** -33.3035020, 25.7362700
**Quote Date:** 25 September 2026
**Valid Until:** 25 October 2026 (30 days)
**Prepared by:** Gerhard Smit, CTTX Services (Pty) Ltd

---

## Executive Summary

### Included
- Private wireless distribution network: 28× indoor Wi-Fi 6 ceiling APs, 2× outdoor Wi-Fi 6 APs, 4× managed L2 PoE+ switches
- Cambium ePMP backhaul radio pair (base station + subscriber modules) mounted on a 9m mast with plinth
- Outdoor equipment cabinet with MPPT solar charge controller and lithium battery switchgear
- Solar power generation (4× 680W panels) with grid-interactive inverter for off-grid resilience
- Comprehensive earthing/lightning protection system (CTTX scope — no separate surge suppressor hardware required)
- Site survey, installation, commissioning, testing, and documentation handover
- Vodacom Business Connect 100 Mbps symmetrical carrier connectivity (uncontended, business SLA)

### Excluded
- Trenching or underground civil work (none required — this is a wireless solution)
- Body corporate / landlord approvals (not applicable — freestanding lodge property)
- CCTV cameras, POS hardware, or other endpoint devices not listed in the BOM
- Ongoing managed service (offered as a separate optional add-on below)
- Any works beyond the confirmed coverage zones without a change order

### Field RF Survey Confirms Design (26 Sept 2026)

Abel Ringisai (CTTX Wireless Team Leader) completed the RF link-planning survey for this site (KML export, field-dated 22 September 2026) — real, confirmed LOS data, not an assumption.

**Confirmed by Gerhard:** both base station radios sit on the **same single 9m pole** — this is one physical mast, not two sites. The mast carries **two 90° sector antennas** (matching the 2× ePMP Sector Antenna already in the BOM), each covering a different arc of the property. The "7" and "Tower" labels in Abel's survey are the two sector radios on that one pole, not separate structures. The 28 subscriber sites sit at varying distances across those two sector coverage arcs — some close in (52–201m, the near sector), some out toward the edge of the arc (up to 3.0km to the staff village, the far sector). That spread in distance is normal sector-antenna geometry, not a sign of a second mast.

**Net effect on the quote:** LOS is confirmed for all 28 links. The single-mast BOM (Section 2) is correct as originally priced — no second infrastructure package is needed. The one open item that remains is verifying link budget/achievable throughput on the longest edge-of-sector hops (up to 3.0km) — see Risk Table.

---

## Network Topology (Corrected — Single Mast, Two Sectors)

```mermaid
graph TD
    V[Vodacom Core Network] -->|Business Connect 100 Mbps SLA| M[9m Mast: 2x ePMP 4500L Base Stations, 2x 90deg Sector Antennas]
    M -->|Sector A: ~50-200m, near arc| SUB1[Rooms 2,3,4,5,9,10 + School + Workshop]
    M -->|Sector B near arc: ~750-950m| SUB2[Rooms 1,6,7,8,11 + Boma + Spa + Main Link]
    M -->|Sector B far arc: ~1.7-3.0km, edge of range| SUB3[Villas + Directors House + Staff 1-10]
    SUB1 --> CAB[Outdoor Equipment Cabinet: MPPT + Li Battery Switchgear]
    SUB2 --> CAB
    SUB3 --> CAB
    SOLAR[Solar Array: 4x Canadian 680W] --> CAB
    CAB --> SW[4x DuxNet L2 PoE+ Cloud Switches]
    SW --> APIN[28x DuxNet Wi-Fi 6 Ceiling APs - Indoor]
    SW --> APOUT[2x DuxNet Outdoor Dual-Band APs]
    APIN --> WIFI[Guest & Operational Wi-Fi]
    APOUT --> WIFI
```

---

## Field RF Survey — Link Detail (Source: Abel Ringisai, CTTX Wireless Team Leader, 22 Sept 2026)

**Site "7"** (co-located with main lodge cluster) — 8 short-range links:

| Link | Distance | Notes |
|------|---------|-------|
| 7 → Room 2 | 86m | Clear |
| 7 → Room 3 | 52m | Clear |
| 7 → Room 4 | 71m | Clear |
| 7 → Room 5 | 97m | Clear |
| 7 → Room 9 | 59m | Clear |
| 7 → Room 10 | 83m | Clear |
| 7 → School | 160m | Clear |
| 7 → Workshop | 201m | Clear |

**Site "Tower"** (~1.3km from Site 7) — 20 links, near cluster + far cluster:

| Link | Distance | Notes |
|------|---------|-------|
| Tower → Room 1 | 772m | Near cluster |
| Tower → Room 6 | 765m | Near cluster |
| Tower → Room 7 | 769m | Near cluster (co-located with Site 7) |
| Tower → Room 8 | 754m | Near cluster |
| Tower → Room 11 | 847m | Near cluster |
| Tower → Boma | 941m | Near cluster |
| Tower → Main Link | 812m | Near cluster |
| Tower → Spa | 845m | Near cluster |
| Tower → Villas | 1,770m | **Mid-range — verify link budget** |
| Tower → Directors House | 2,361m | **Long-range — verify link budget at 100Mbps** |
| Tower → Staff 1 | 2,278m | **Long-range — verify link budget** |
| Tower → Staff 2 | 2,327m | **Long-range — verify link budget** |
| Tower → Staff 3 | 2,587m | **Long-range — verify link budget** |
| Tower → Staff 4 | 2,872m | **Long-range — verify link budget** |
| Tower → Staff 5 | 2,909m | **Long-range — verify link budget** |
| Tower → Staff 6 | 2,940m | **Long-range — verify link budget** |
| Tower → Staff 7 | 2,957m | **Long-range — verify link budget** |
| Tower → Staff 8 | 3,003m | **Longest link in the network — verify link budget** |
| Tower → Staff 9 | 2,976m | **Long-range — verify link budget** |
| Tower → Staff 10 | 2,930m | **Long-range — verify link budget** |

**Design implication:** This is not a uniform PMP cell. Per CTTX's own Backbone → Distribution → Backhaul doctrine, the Site 7 → Tower hop plus the 11 links beyond 1.7km to the staff village function as a genuine **backbone reach into a distant facility cluster**, not routine short-range distribution. The staff village links (up to 3km) need their own link budget check (BER, achievable payload throughput at 100 Mbps target, Fresnel clearance at those specific frequencies/antenna heights) before being priced identically to the sub-100m room links on the same BOM line. This is flagged, not yet resolved.

---

## 1. Hardware BOM (Excl. VAT)

| Item | Model | Qty | Unit Price | Total |
|------|-------|-----|-----------|-------|
| Backhaul Base Station | Cambium ePMP 4500L 5GHz AP, 2x2, AC PoE | 2 | R8,470 | R16,940 |
| Sector Antenna | ePMP Sector Antenna 5GHz 90/120° | 2 | R3,209 | R6,418 |
| Subscriber Modules | Cambium ePMP Force 4525L, 25dBi | 28 | R2,745 | R76,860 |
| Indoor Access Points | DuxNet Wi-Fi 6 Ceiling AP, 1Gb WAN/LAN | 28 | R1,025 | R28,700 |
| Outdoor Access Points | DuxNet Outdoor Dual-Band Wi-Fi 6 AP | 2 | R1,885 | R3,770 |
| Network Switches | DuxNet 8-Port Gigabit PoE+ L2 Cloud Switch | 4 | R1,899 | R7,596 |
| **Hardware Subtotal** | | | | **R140,284.00** |

*Source: Duxbury Networking Quote DUX00455421 v2 (ePMP subscriber modules ETA mid-November 2026 — all other items in stock).*

## 2. Outdoor Infrastructure & Civil (Excl. VAT)

*Mast, cabinet, and mounting hardware are not standard rate-card items — priced as supplier/stock quotes specific to this site.*

| Item | Qty | Unit Price | Total |
|------|-----|-----------|-------|
| 9m Galvanized Steel Mast with Plinth, installed (CTTX second-hand stock) | 1 | R38,700 | R38,700.00 |
| Outdoor Cabinet w/ MPPT Charge Controller & Lithium Battery Switchgear | 1 | R28,670 | R28,670.00 |
| Solar Panels — Canadian Solar 680W Monocrystalline | 4 | R2,200 | R8,800.00 |
| Grid/Solar Inverter | 1 | R2,150 | R2,150.00 |
| Outdoor Cabling — mast-to-cabinet, WAN, AP runs (avg. 40m run) | 40m | R12/m | R480.00 |
| Mounting Brackets & Hardware (radio, AP, solar mounts) | 15 | R450 | R6,750.00 |
| **Infrastructure Subtotal** | | | **R85,550.00** |

> **Note on cabling rate:** R12/m is below CTTX's standard rate-card price for shielded/armoured outdoor cable (R28–45/m). This reflects a bulk/lighter-grade cable assumption. **Confirm actual cable grade and total run length at site survey** — this line is subject to adjustment once real distances and cable spec are confirmed on site.

## 3. Labour (Excl. VAT)

| Task | Effort | Rate | Total |
|------|--------|------|-------|
| Site survey and design | 1 day | R4,500/day | R4,500.00 |
| Installation — AP deployment, cabling, PoE, switch configuration (2-tech team) | 3 days | R9,000/day | R27,000.00 |
| Commissioning and testing | 1 day | R4,500/day | R4,500.00 |
| Documentation and handover | 1 half-day | R2,250 | R2,250.00 |
| **Labour Subtotal** | | | **R38,250.00** |

*Travel/accommodation not applied — Addo is a ~1h45 drive from PE, assumed day trips. To be confirmed if overnight stays are required for the 3-day install.*

*Trenching: Not applicable — wireless solution, no underground civil works required.*

## 4. Summary Pricing (CAPEX)

| Line | Amount (Excl. VAT) |
|------|---------------------|
| Hardware Subtotal | R140,284.00 |
| Infrastructure Subtotal | R85,550.00 |
| Labour Subtotal | R38,250.00 |
| **Subtotal (1+2+3)** | **R264,084.00** |
| Contingency (10%) | R26,408.40 |
| **Project Total (Excl. VAT)** | **R290,492.40** |
| VAT (15%) | R43,573.86 |
| **TOTAL INFRASTRUCTURE INVESTMENT (Incl. VAT)** | **R334,066.26** |

---

## 5. Monthly Recurring — Carrier Connectivity

**Vodacom Business Connect 100 Mbps** — Uncontended (1:1), Uncapped, Unshaped, No FUP, Symmetrical, Business SLA, Huawei router included, 1 static IP standard. 36-month contract (per Gerhard's instruction, 26 Sept 2026 — see note below). Subject to feasibility confirmation.

> ⚠️ **Unconfirmed:** the Notion Vodacom Reseller Pricing Master lists Business Connect on a standard 24-month term; the MRC/NRC figures below are the confirmed 24-month rates. Whether Vodacom's 36-month rate for this product differs (better or worse) has not been checked with Vodacom directly. Confirm before this goes to contract — the monthly figure in this quote may need adjusting once a 36-month rate is confirmed.

| Item | Price (Excl. VAT) | Price (Incl. VAT) |
|------|---------------------|---------------------|
| Monthly Recurring Charge | R7,103.00 | R8,168.00 |
| Once-off Connection Fee (NRC) | R3,130.00 | R3,599.00 |

**24-Month Contract Value:** R170,472.00 (excl. VAT) / R196,032.00 (incl. VAT)

---

## 6. Optional Add-On — CTTX Managed Service Retainer

Recommended given the complexity of this deployment (private mast, solar/battery power system, 30-radio network requiring remote monitoring per CTTX's cloud-monitorable infrastructure standard):

| Tier | Monthly (Excl. VAT) | Monthly (Incl. VAT) | Includes |
|------|----------------------|----------------------|----------|
| Managed Service Retainer | R4,500 | R5,175 | Remote monitoring (Cambium cnMaestro + Victron), proactive maintenance, quarterly on-site visits, battery/solar health checks, priority emergency support |

*Range R3,500–R5,500/month depending on SLA response time selected; R4,500 shown as the recommended mid-tier for this site's complexity.*

---

## 7. Cost of Disconnection vs Value of Connected Operations

Barefoot Addo Elephant Lodge currently operates 23 individually-managed Wi-Fi access points across the property, dependent on Herotel's shared best-effort backhaul. This creates specific, quantifiable exposure:

- **Guest experience risk:** Contended bandwidth degrades during peak occupancy — the exact time guest-facing systems (bookings, POS, communication) matter most.
- **Operational blindness:** Multiple independent APs with no centralized monitoring means outages are discovered reactively, not proactively — no one is watching the system until a guest or staff member reports a problem.
- **Vendor dependency:** Complete reliance on Herotel for both connectivity and Wi-Fi equipment management means the lodge has no infrastructure of its own and no leverage if service quality or pricing changes.
- **Single point of failure:** No solar/battery backup on the current setup — a power outage takes the entire guest and operational network down with it.
- **Physical infrastructure risk:** The current backhaul radios are mounted on a leaning gum pole — a non-engineered, informal structure exposed to wind and weathering, not a proper mast. This is a physical failure risk sitting underneath everything else on this list.

CTTX's proposed solution converts this into owned, remotely-monitored infrastructure (Cambium cnMaestro + Victron visibility) mounted on an engineered 9m galvanized steel mast with plinth foundation, with solar-backed resilience — turning an unmanaged liability into a measured, supportable asset.

---

## 8. Financial Comparison — Current (Herotel) vs Proposed (CTTX)

### Current Herotel Costs (Invoice #8313058, 31 Aug 2026)

| Item | Monthly (Incl. VAT) |
|------|----------------------|
| Business WTTB 100 Mbps Symmetrical | R11,498.85 |
| Static IP | R207.00 |
| 23x Huawei Wi-Fi 6 AP 362 (Managed-lite, mixed 12M/24M terms) | R6,057.05 |
| Managed Wi-Fi (Lite) 0-5 | R342.70 |
| **Herotel Total** | **R18,105.60/month** |

### Proposed CTTX Solution

| Scenario | Monthly (Incl. VAT) | vs Herotel |
|----------|----------------------|------------|
| Vodacom Business Connect only (lodge self-maintains AP network) | R8,168.00 | **−R9,937.60/month** |
| Vodacom Business Connect + CTTX Managed Service Retainer | R13,343.00 | **−R4,762.60/month** |

### Break-Even on Infrastructure Investment

Total upfront (infrastructure R334,066.26 + Vodacom NRC R3,599.00) = **R337,665.26**

| Scenario | Monthly Saving | Break-Even |
|----------|-----------------|------------|
| Without managed retainer | R9,937.60 | **34 months** (~2.8 years) |
| With managed retainer | R4,762.60 | **71 months** (~5.9 years) |

**Recommendation:** Take the managed service retainer. The break-even extends, but so does the risk coverage — this is infrastructure the lodge will depend on for guest experience and operations; unmonitored private infrastructure is not something CTTX deploys as a matter of policy (remote visibility is core to the design, not optional).

---

## 9. Risk Table

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Long-range links (1.7-3.0km to Villas/Directors House/Staff Village) sit at the edge-of-range for the sector serving them — may not sustain full 100 Mbps symmetrical at that distance | Medium | Medium-High | Link budget verification required per link before final commissioning; monitor actual throughput on longest hops post-install |
| Vodacom feasibility delay/rejection at this specific site | Low–Medium | High | Feasibility check submitted early in process; fallback options assessed if declined |
| ePMP Force 4525L stock delay (ETA mid-Nov 2026) | Confirmed | Medium | Installation phased — mast/cabinet/solar/switches proceed first; subscriber modules follow on confirmed ETA |
| Cable run distances differ from 40m estimate | Medium | Low–Medium | Confirmed on-site survey; cable line item adjusted before final invoice if materially different |
| Power system undersized for load (28 APs + backhaul, 2 sector radios on one mast) | Low | High | Solar/battery sizing validated during design phase against actual measured load |
| No managed retainer taken — issues go undetected | Medium | Medium–High | Recommended as add-on; lodge to confirm decision before go-live |

> LOS itself is **no longer a risk item** — Abel Ringisai's field RF survey (22 Sept 2026) confirms modeled LOS/Fresnel clearance for all 28 links from the single mast's two sectors. The earlier draft of this quote incorrectly read the survey's two radio labels ("7" and "Tower") as two separate physical sites — confirmed by Gerhard: it is one 9m mast carrying two 90° sector antennas, replacing the lodge's existing leaning gum-pole mount. No second infrastructure package is needed.

---

## 10. Exclusions

- Trenching / underground civil works
- Body corporate or landlord approvals
- Endpoint devices (CCTV, POS terminals, telephony handsets) not listed in BOM
- Ongoing managed service (unless the optional retainer is selected)
- Any scope beyond confirmed coverage zones without a signed change order
- Travel/accommodation beyond day-trip assumption (to be confirmed at survey)

---

## 11. Payment Terms

- **Validity:** 30 days from quote date
- **Payment:** 50% deposit on order / 50% on commissioning sign-off
- **Warranty:** 24 months hardware, 12 months installation
- **Lead time:** 10–15 working days from deposit (subject to ePMP Force 4525L stock ETA — see Risk Table)

---

## 12. Next Steps

1. Confirm link budget/throughput expectations for the longest edge-of-sector hops (1.7–3.0km) to the staff village / Directors House / Villas cluster
2. Submit Vodacom Business Connect feasibility request for this site
3. Confirm managed service retainer decision
4. Approve quote and pay deposit to commence

---

## 13. Design Note — Single Mast Replaces Existing Gum-Pole Mount

The lodge's current wireless equipment is mounted on a **leaning gum pole** — a non-engineered, informal mounting structure. This quote's 9m galvanized steel mast with plinth foundation (Section 2) replaces that gum pole entirely, carrying both sector antennas that previously depended on an unstable, non-standard mount.

This detail belongs in the client-facing pain-points narrative (Section 7, "Cost of Disconnection") as concrete evidence of the current setup's fragility — not just contended bandwidth and unmonitored APs, but literally unstable physical mounting hardware exposed to wind and weathering. Recommend adding a line to that section when this quote is finalized for presentation to Shelley.

---

**Prepared by:** Gerhard Smit | CTTX Services (Pty) Ltd
📞 084 550 3281 | ✉️ gerhard@cttx.co.za | 🌐 cttx.co.za
