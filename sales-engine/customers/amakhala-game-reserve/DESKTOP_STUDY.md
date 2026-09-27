# Amakhala Game Reserve: Desktop Study

**Prepared by:** CTTX Services | **Date:** 27 September 2026 | **Status:** Desktop only (no site visit, KMZ or Link Planner yet)
**Opportunity type:** Hybrid Infrastructure (carrier + private reserve backbone), auto-classified per CLAUDE.md
**Addressee:** Richard (richard@amakhala.co.za). Most likely Richard Pearse, listed as Reserve General Manager / CEO. *Unverified, see §6.*

---

## 1. Reserve profile (published sources)

| Item | Finding | Source |
|---|---|---|
| Location | Malaria-free Eastern Cape, near Paterson, ~60–70 km from Gqeberha via the R342 | amakhala.co.za, nmbt.co.za |
| Size | Published as 7,000–9,000 ha (sources differ). The website states >18,000 acres (~7,300 ha) | amakhala.co.za, sa-venues.com |
| Boundaries | Bushman's River to the south (the river runs "through the heart" of the reserve). Addo Elephant National Park to the north | amakhala.co.za/conservation |
| Formation | Started in 1999 as a joint conservation venture between six lodge-owning families. It now combines several former farms | amakhala.co.za, Notion CRM |
| Ownership | Founder families (Weeber / Fowlds / Howard-Bisset, per Notion). Lodges are owned individually | Notion CTTX Pipeline |
| Accommodation | 11 establishments, including Bush Lodge, Bukela Game Lodge, Safari Lodge, Hlosi Game Lodge, Woodbury Lodge, Woodbury Tented Camp, HillsNek Safaris, Leeuwenbosch and Carnarvon Dale | amakhala.co.za/lodges |
| Central reserve teams | Maintenance Department, Security & Anti-Poaching Department, Ecology Unit | amakhala.co.za/conservation |
| Security operations | Equine Anti-Poaching Unit, K9 unit, an "Eye in the Sky" (aerial) capability and a dedicated rhino monitoring programme (black rhino and cheetah are priority species) | amakhala.co.za blog + conservation pages |

## 2. Current connectivity: what the public evidence shows

Published lodge listings describe Wi-Fi like this:

- **Safari Lodge:** "WiFi in all rooms and public areas"
- **Hlosi, Woodbury Lodge, Bush Lodge, Woodbury Tented Camp:** "WiFi in *public areas by the main lodge*"

**Reading:** connectivity is handled **lodge by lodge**, and at most lodges it stops at the main building. Nothing published shows a shared, reserve-wide backbone connecting the central security, ecology and maintenance teams to each other, to the gates or to the field. This has to be confirmed with Richard. It is an inference from the published lodge listings, not a reported fault.

## 3. Terrain and RF reading (desktop, to validate)

- **Terrain:** Albany thicket and rolling valley country. The Bushman's River valley cuts through the reserve. Valley-floor lodges usually do **not** have line of sight to each other. They do have line of sight to the ridgelines above them.
- **Implication:** the design needs **two ridge high-sites** that together see into the river valley and across the northern plains toward the Addo boundary. A chain of lodge-to-lodge hops would not work. This matches CTTX's rule of *minimum viable infrastructure: fewest high sites, fewest hops*.
- **Carrier entry:** we assume a Vodacom Business Connect entry point at the reserve HQ / central operations area (the most central staffed building with grid power). Vodacom feasibility (via Duane Forlee) decides the exact point.
- **Next technical step:** pull a DEM and the lodge coordinates into the CTTX terrain engine and Link Planner. Candidate ridges get confirmed on a one-day survey. **No link is committed until it is confirmed LOS-clear** (CTTX_CRITICAL_DECISIONS.md).

## 4. Operational requirements inferred from the evidence

| Driver | Evidence | Network requirement |
|---|---|---|
| Security / anti-poaching | Equine APU, K9, aerial surveillance, rhino monitoring | Coverage from the APU base and gates out to the field. Camera backhaul at the gates. A LoRaWAN layer for fence, water point and trigger sensors. Power independent of Eskom at every relay |
| Staff communication | 11 separate lodges plus 3 central departments | One private network joining the lodges, HQ, the APU base, the ecology unit and the workshop. VoIP-capable, BER-first design |
| Guest experience | Wi-Fi limited to public areas at most lodges | A 1:1 uncontended carrier feed shared across the reserve, handed to each lodge at a guaranteed rate. Each lodge's room Wi-Fi is an optional upgrade |

## 5. Commercial angle: the shared conservancy backbone

Amakhala's structure (11 independent lodges on one reserve) is the strongest argument for a shared backbone. **One** uncontended Vodacom Business Connect service plus **one** CTTX-built private network replaces several separate, contended, lodge-level connections. The reserve's security and ecology operations get covered as well, and the cost can be split per establishment. (Indicative split: see PROPOSAL.md §6.)

## 6. Stakeholders and open intelligence items

| Name | Role (per source) | Confidence |
|---|---|---|
| Richard Pearse | Reserve General Manager / CEO (ZoomInfo, RocketReach). Previously Conservation Manager at Pumba PGR | Medium. Third-party data aggregators |
| Dwain Strydom | Reserve Manager (Amakhala blog "Meet our new Reserve Manager") | Medium. The blog is undated in the search results, and the two roles may overlap |
| Richard Gush | Owner, Woodbury Lodge (founding family) | Low. Single aggregator source |
| Founder families | Weeber / Fowlds / Howard-Bisset | Notion CRM |

⚠️ **Flag:** there are two possible "Richards". The email should use first name only and ask Richard to redirect it if the infrastructure owner is someone else.

## 7. What is genuinely missing (MISSING → WHY → QUESTION)

1. **Throughput and contract term.** These drive the carrier price. *Assumed: 200 Mbps shared over 24 months.* Question: "How many guests and staff are on the network at peak, and what term suits the reserve?"
2. **Incident history.** Needed for the ROI section. Question: "In the last 24 months, how many security incidents or fence breaches were there, and how did the teams communicate during them?"
3. **What is unmonitored today.** Question: "Which gates, water points, fences or pumps currently need a vehicle trip to check?"
4. **Lodge coordinates / KMZ and HQ location.** Needed for LOS validation. Question: "Can you share a map or KMZ of the lodges, HQ, the APU base and the main gates?"
5. **Existing radio/VHF system.** Needed for PSI integration scope. Question: "What do rangers and the APU use for field radio today?"

## 8. Adjacent CTTX intelligence

- The **Amakhala Emoyeni Wind Farm** (Cookhouse/Bedford area) is already in the CTTX Pipeline. It is a separate site and business, linked through the Amakhala Emoyeni Community Trust. Treat it as relationship context only, not a shared-infrastructure claim.
- Eastern Cape reserve cluster: Samara Karoo and Shamwari are in the priority database. A reference build at Amakhala would support the regional reserve play.

---

**Sources:** [amakhala.co.za](https://www.amakhala.co.za/) · [Conservation on Amakhala](https://www.amakhala.co.za/conservation/conservation-on-amakhala) · [Equine APU](https://www.amakhala.co.za/blog/posts/amakhala-s-equine-anti-poaching-unit) · [Lodges](https://www.amakhala.co.za/lodges) · [Hlosi](https://www.amakhala.co.za/lodges/hlosi-game-lodge) · [Safari Lodge](https://www.amakhala.co.za/lodges/safari-lodge) · [New Reserve Manager](https://www.amakhala.co.za/blog/posts/meet-our-new-reserve-manager-dwain-strydom) · [ZoomInfo: Richard Pearse](https://www.zoominfo.com/p/Richard-Pearse/10803375929) · [sa-venues](https://www.sa-venues.com/game-reserves/amakhala.php) · Notion CTTX Pipeline record "Amakhala Game Reserve"
