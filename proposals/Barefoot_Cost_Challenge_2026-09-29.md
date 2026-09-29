# Barefoot Addo - Cost Challenge & ROI Recovery (internal)

**For:** Gerhard Smit  **Prepared:** 29 September 2026  **Status:** decision memo - nothing here goes to the client as-is
## 1. What Shelley actually said (29 Sep, 08:47)

- "I don't think we can approve the investment in its current form." Upfront R355,000 is too high against a projected 36-month saving of ~R24,573.
- Vodacom's final site survey only happens after the mast is built - they would commit a substantial amount before knowing the link can be delivered at the stated speed.
- "I'm certain Falk would not approve an investment of R355,000 on that basis."
- **The ask:** "a more modest, itemized proposal to improve the existing connection and provide reliable coverage across the property" - "another, more affordable option?"

Read that as three separate objections: (1) upfront size, (2) 36-month payback, (3) Vodacom risk sequencing. Each needs its own answer; a lower price alone fixes only the first.
## 2. Abel's revised BOM (29 Sep, 12:37) - costed

Abel's changes: 6m tower (was 9m), 2x 120° sectors, 25 subscriber radios (was 28; three staff houses go on LAN), 25 **outdoor** APs + 1 indoor (was 28 indoor + 2 outdoor), 2 managed + 2 unmanaged switches (was 4 managed), 2x 620W panels + 5kWh battery + off-grid inverter (Herholdt's quote R25,951 ex VAT), extended warranties added, TP-Link APs possible via Pinnacle (unconfirmed).

| Item | Qty | Source | Cost ex VAT | Note |
|---|---|---|---:|---|
| ePMP 4500L base station radio | 2 | Duxnet V2 | R16,940 |  |
| Sector antenna 90/120° | 2 | Duxnet V2 | R6,418 |  |
| ePMP Force 4525L subscriber radio | 25 (was 28) | Duxnet V2 | R68,625 | -R8,235 vs 28 |
| DuxNet Wi-Fi 6 indoor ceiling AP | 1 (was 28) | Duxnet V2 | R1,025 |  |
| DuxNet Wi-Fi 6 outdoor AP | 25 (was 2) | Duxnet V2 | R47,125 | +R18,355 - outdoor units cost 84% more than indoor |
| DuxNet 8-port managed PoE+ switch | 2 (was 4) | Duxnet V2 | R3,798 | -R3,798 |
| Unmanaged 6-port PoE switch | 2 (new) | TBC - est. R650 ea | R1,300 | TBC |
| Extended warranty 2 yrs: 4500L x2, 4525L x25 | new | TBC - not on Duxnet V2 | R0 | TBC - recommend drop or offer as option |
| Solar kit: 2x660W Aiko, Victron MPPT 150/35, 5.32kWh LFP, Solis 5kW off-grid, DB components | 1 | Herholdt's Q488632 (29 Sep, valid 7 days) | R25,951 | replaces 4x680W + inverter + MPPT/battery in cabinet |
| Outdoor cabinet, bare (MPPT/battery now in solar kit) | 1 | CTTX stock - TBC, est. | R10,000 | TBC (was R28,670 fully fitted) |
| 4U wall boxes | 4 (new) | TBC est. R600 ea | R2,400 | TBC |
| 6m mast with plinth, installed | 1 (was 9m) | CTTX stock - TBC, est. | R25,000 | TBC (9m was R38,700) |
| Radio brackets | 25 | CTTX rate | R11,250 |  |
| Outdoor cable (as quoted: 40m total @ R12/m) | 40m | CTTX rate | R480 | see challenge - unrealistic for 25 sites |
| Labour: survey/design 1d, install 3d x 2 techs, commissioning 1d, handover 0.5d | - | CTTX rate card | R38,250 |  |
| **Total (with TBC estimates)** | | | **R258,562** | Original build cost was R264,084 |

**Finding:** the revision saves only **R5,522** at cost. The 25 outdoor APs (R47,125) more than cancel the savings from fewer radios and switches, and the warranties add cost we haven't priced. At the same GP as before (R44,612, 14.5%) this sells at **R348,649 incl VAT** - the client will not see that as "more modest".
## 3. Cost challenge - where we can safely save

| Lever | Effect on cost | Risk | Call |
|---|---:|---|---|
| Outdoor APs only where an outdoor unit is needed (villa, main lodge, boma - say 4); indoor ceiling APs elsewhere | R-18,060 | None - indoor APs in staff houses is the normal design. Abel to confirm the 4. | Recommend |
| Cabling at a realistic 40m per site x 25 sites, not 40m total | R+11,520 | Correcting an under-estimate; not a saving | Must do |
| Staff village (10 houses, 2.3-3 km): 3 subscriber radios + LAN between clustered houses instead of 10 radios | R-22,365 | Needs Abel's confirmation that houses are close enough to cable; adds trenching/cable cost not yet priced | Ask Abel |
| Extended warranties: rely on vendor standard warranty; offer 2-yr extension as a priced option | R+0 | None to the build; client choice | Recommend |
| 6m mast and bare cabinet priced from actual CTTX stock rather than my estimates | R-9,000 | Engineering: 6m must still clear LOS to the 3 km staff village AND to Olifants Nek. Do not cut height to save money - Vodacom LOS at 6m is unconfirmed (Abel sent coords to Duane today) | Gerhard to price; Abel/Duane to confirm LOS |
| Vodacom Business Connect MRC at the updated Sept 2026 reseller rate (Duane, 14 Sep AAG) - every R500/mo off the client MRC = R18,000 over the term | n/a (recurring) | None - this is the single biggest ROI lever and costs CTTX nothing | Need the AAG sheet |

**If every lever lands:** cost ≈ **R220,657** → sells at **R305,059 incl VAT** at the same GP. That is the honest floor for the full build with our margin intact. Going below it means cutting GP, and GP is already 14.5% on a R300k+ project.
## 4. ROI per option (incl VAT; current bill R18,105.60; 8% escalation on the current provider from year 2; CTTX monthly locked 36 months)

| Option | Upfront | New monthly | Saving/mo | Payback | 36-month net | 5-year net |
|---|---:|---:|---:|---:|---:|---:|
| A1 - As proposed (R355,000) | R358,599 | R8,949 | R9,157 | 3.3 yrs | R-28,961 | R+352,621 |
| A2 - Abel's revised BOM, sold at the same GP | R352,599 | R8,949 | R9,157 | 3.2 yrs | R-22,961 | R+358,621 |
| A3 - Revised BOM after all challenge levers land | R308,599 | R8,949 | R9,157 | 2.8 yrs | R+21,039 | R+402,621 |
| A4 - A3 plus Vodacom MRC R500/mo lower (illustrative until AAG confirmed) | R308,599 | R8,449 | R9,657 | 2.7 yrs | R+39,039 | R+434,099 |
| B - Phase 1 only: build, keep the current link (no Vodacom dependency) | R305,000 | R13,431 | R4,675 | 5.4 yrs | R-136,709 | R+124,057 |

**Option C - rent-to-own (zero upfront):** the lodge pays a fixed monthly for 36 months and owns the network at month 36. At R305,000 spread over 36 months with no finance cost (illustrative only) that is R8,472 + R8,949 = **R17,421/month vs R18,106 today**, then R8,949/month from month 37. Cash-neutral for the lodge from day one, R305,000 of infrastructure on their balance sheet at the end. For CTTX this only works if a finance partner funds the build (you said cash deal) - the financed rate must come from them, not from me. This is the only option that answers "upfront too high" head-on.

**Option B (phase 1, keep the current link):** payback is poor on its own because the link saving (R4,482/mo) never happens - the build's ROI depends on the Vodacom swap. B is a risk-mitigation story, not a savings story. Don't lead with it.
## 5. The Vodacom objection - fix the sequence, not the price

Duane's own note (16 Sep): "Only option would be Olifants Nek which is non-R1 AND beyond Radwin range (so SIAE). Also a Telkom site just for added complexity. So in short, to even be considered, would have to be a high bandwidth link." Shelley's worry is legitimate.

Abel sent Duane the 6m mast coordinates (33.31005S, 025.73183E) this morning. The answer to the client is: **Vodacom desktop feasibility is obtained before any order is placed**, and the order is conditional on it. If Vodacom cannot deliver 100 Mbps at that mast, the lodge keeps its current link and still owns the distribution network - the AP-rental saving (R6,400/mo) does not depend on Vodacom. Put that in writing.

**Vodacom pricing:** Duane sent an updated At-a-Glance ("Fixed Services AAG 092026.xlsx", 14 Sep: "Business Connect - bandwidth and installation costing updated") and on 16 Sep said to compare old vs new and re-cost. I can see the email but the Gmail mirror won't give me the attachment. **The R7,224 in the proposal is the June rate book - it may already be wrong.**
## 6. What I recommend we send Shelley

1. **Itemized proposal** (she asked for it): line items with quantities and a price per section (backbone & mast / distribution radios / Wi-Fi / power / installation), not per unit - we still don't expose unit cost.
2. **Two prices, one build:** (A3) buy outright at the challenged figure, or (C) rent-to-own over 36 months at or below today's bill. Let Falk choose the cash profile.
3. **Vodacom made conditional and sequenced first** - feasibility before order, and the build stands on its own if Vodacom says no.
4. **Lead the ROI with the part that is certain:** R6,400/month currently paid to rent Wi-Fi equipment that costs a fraction of that to own - that is R230,000 over the term for equipment the lodge never owns. Then the link saving on top once Vodacom confirms.
5. Keep the 5-year view, the balance-sheet asset and the spa/expansion point - they were right, they just weren't enough on their own.
## 7. Needed before I can build the client documents (MISSING → WHY → PROPOSE)

| Missing | Why it matters | Proposed |
|---|---|---|
| Duane's 14 Sep email with **Fixed Services AAG 092026.xlsx** | It is the new reseller cost; the proposal MRC and every ROI line depend on it | Drag the .msg from Outlook into this chat (subject "Fixed Services AAG - Updated") |
| Abel: cost of 6m mast installed, bare outdoor cabinet, 4U wall boxes, unmanaged switches, extended warranties, TP-Link AP prices from Pinnacle | Five TBC lines = ~R40k of my estimate | Abel to reply with numbers; I'll swap them in |
| Abel: is 6m enough for LOS to the 3 km staff village AND to Olifants Nek? Can the 10 staff houses be clustered on 3 radios + LAN? | Height cut and clustering are the two engineering savings; both carry link risk | Abel confirms from the survey; Duane confirms Vodacom LOS at 6m |
| Your call on Option C (rent-to-own via a finance partner) | It is the only option that removes the upfront objection | Yes/no, and who the finance partner is |
| Your call on GP floor | Every rand off the price below the challenged floor comes out of margin | Confirm 14.5% holds, or set a new floor |
