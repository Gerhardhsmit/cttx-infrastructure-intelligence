# Swartkops Sea Salt — Intelligence Brief

**Sprint date:** 28 September 2026
**Prepared for:** Gerhard Smit, CTTX
**Opportunity type:** Private Infrastructure (industrial / multi-site). Hybrid if a carrier handoff is needed at the works.
**Status:** Not contacted. An Outlook draft to Chrisjan Joubert exists but has **not been sent** (see Outreach Pack).

Labels used below: **FACT** (sourced) · **INTERP** (interpretation) · **ASSUME** (to verify on the call or survey).

---

## 1. The property

| Item | Detail | Basis |
|---|---|---|
| Company | Swartkops Sea Salt (Pty) Ltd | FACT |
| Brand | Marina Sea Salt, a local brand since 1979 | FACT |
| Location | Redhouse, Swartkops Estuary, Gqeberha, Eastern Cape. About 15 min from CTTX HQ | FACT (location), INTERP (drive time) |
| Size | 50–99 employees per ZoomInfo; another listing says 51–200 | FACT, sources disagree |
| Web / email domain | saltpan.co.za. The Marina FSA certificate is hosted on salt.co.za | FACT |
| Industry | Solar sea-salt production: seawater and brine pumped into prepared clay evaporation pans, then harvested, processed and packed | FACT (method since late 1950s) |
| Regulatory class | The contact's title is "Mine Manager", so the works probably fall under mining regulation (MHSA) | INTERP, verify |
| Terrain class | Flat estuarine floodplain between two ridges: Amsterdamhoek/Bluewater Bay to the north, Bethelsdorp/Chatty to the south | INTERP from regional geography |

**Pans in the area** (who operates each one is **not yet confirmed**):
- Redhouse saltpan, on the middle-reach floodplain of the Swartkops Estuary. A stream from the Swartkops River feeds it. **Conflict:** BirdLife lists the Redhouse pans as operated by *Cerebos*. Other sources put Swartkops Sea Salt at Redhouse. Do not state either as fact until Chrisjan confirms.
- Chatty pans, south side of the estuary.
- Missionvale / Bethelsdorp pan, about 12 km NE of central Gqeberha on the old Uitenhage road.

## 2. Operational footprint (ASSUME, confirm on the call)

- Seawater and brine intake pumps and pipelines, running continuously. This is the process-critical asset.
- Evaporation and crystallisation pans spread across the floodplain. These are large, open, hard-to-patrol areas.
- Harvesting plant, washing, drying, processing and packing plant (Marina retail and industrial product).
- Workshop, fuel store, vehicle and yellow-plant yard.
- Weighbridge and dispatch.
- Office and admin, with likely food-safety (FSA) documentation and traceability systems.
- Perimeter gates and fencing along a public estuary with informal access.

## 3. Current connectivity (best guess)

- **Works office:** probably fixed-line or fibre, or LTE. The urban edge of Gqeberha has decent carrier coverage. (ASSUME)
- **Pans, pumps and outlying sites:** probably no dedicated network. Monitoring likely means driving out and checking by eye. (ASSUME)
- **Cameras:** unknown. If any exist, they are probably standalone DVRs on-site with no central view. (ASSUME)
- **INTERP:** the problem here is not "bandwidth to the office". The pans, pumps and perimeter are not connected to each other at all.

## 4. Decision-makers

| Name | Role | Channel | Status |
|---|---|---|---|
| Chrisjan Joubert | Mine Manager | chrisjan@saltpan.co.za · [LinkedIn](https://www.linkedin.com/in/chrisjan-joubert-za/) | FACT (role per LinkedIn / RocketReach) |
| Petra de Villiers (name partly obscured in source) | Unknown | — | To verify |
| MD / owner | Unknown | — | To verify. Ask Chrisjan who signs off capex |
| Switchboard | Redhouse office, 041 46x xxxx (truncated in Brabys listing) | — | To verify. Get the full number from Brabys or Snupit |

Chrisjan is the right entry point: operations, security and production uptime are his day-to-day problems. He is probably not the capex signatory.

## 5. Strategic hooks

1. **Theft and vandalism are proven in this exact location (FACT).** A solar saltworks on the Swartkops Estuary was **abandoned in 2018 because of continuous theft and vandalism of the infrastructure** (BirdLife SA / Nature Commitments). Whether that was a Swartkops Sea Salt site is **not verified**. Either way, it is the neighbourhood's documented risk. Raise it carefully: ask about it, don't assert it.
2. **Informal access to the pans (FACT, context).** GroundUp has reported unemployed people harvesting salt from abandoned pans around Gqeberha. That means people are on the floodplain and perimeter pressure is real.
3. **Telecom theft in the metro (FACT).** SA telecom theft rose 189% in one year, from R69.6M to R201.5M (ICASA, State of ICT 2026). Cable-based links on an estuary edge are exposed.
4. **Food-safety compliance (FACT: FSA certificate held, 2021).** Connected monitoring (pump status, process logs, CCTV on handling areas) supports audit evidence.
5. **Protected-area sensitivity (FACT).** The Swartkops Estuary and the Redhouse/Chatty pans are an Important Bird Area. Masts must have a low footprint and be sited sensibly. CTTX's minimal-high-site design fits this.
6. **Local advantage.** CTTX is Gqeberha-based, with same-day response and BBBEE Level 1. We can survey this week.

## 6. Terrain and high-site notes (INTERP, needs Link Planner validation)

- **The pans are flat and open.** Line of sight across the floodplain is easy once a mast clears the processing buildings. Fresnel clearance over water and salt flats needs checking for reflection. Reflective surfaces argue for space diversity or a shorter hop design.
- **Candidate hub:** the processing works or office roof or yard mast, as the main distribution hub (CTTX rule: main building = primary hub).
- **Candidate high ground:** the ridges on either side of the estuary. Use them only if a works-level mast can't see all the pans. **Minimum viable infrastructure:** fewest high sites.
- **Backhaul:** carrier handoff at the works (existing fibre/LTE or a Vodacom Business Connect entry point). Price only after the survey (feasibility before price).
- **Environment:** salt spray and corrosion. Specify CTTX in-house stainless cabinets. Victron/Hubble power at pump sites that have no reliable grid.
- **Next technical step:** pull the pan outlines and the works coordinates into Link Planner and run LOS from the works to each pan and pump station.

## 7. What's missing (targeted questions for Chrisjan)

1. Which pans does Swartkops Sea Salt operate, and where are the pump stations? (Defines the topology.)
2. What have you lost in the last 24 months: theft, vandalism, pump downtime? (Quantifies Avoided Loss.)
3. How do you currently know a pump has stopped or a fence has been cut? (Operational baseline.)
4. Who signs off infrastructure capex? (Decision path.)

---

**Sources:**
- [Chrisjan Joubert, LinkedIn](https://www.linkedin.com/in/chrisjan-joubert-za/)
- [RocketReach, Chrisjan Joubert](https://rocketreach.co/chrisjan-joubert-email_738439832)
- [ZoomInfo, Swartkops Sea Salt](https://www.zoominfo.com/pic/swartkops-sea-salt-pty-ltd/1316015510)
- [BirdLife SA, Swartkops Estuary–Redhouse & Chatty Salt Pans](https://www.birdlife.org.za/iba-directory/swartkops-estuary-redhouse-and-chatty-salt-pans/)
- [Nature Commitments, restoring abandoned salt pans](https://naturecommitments.org/commitments/1295)
- [GroundUp, Gqeberha's secret salt harvesters](https://groundup.org.za/article/how-unemployed-people-make-a-living-from-abandoned-salt-pans/)
- [Marina Sea Salt FSA certificate 2021](https://www.salt.co.za/file/60ae35de55b06/food-safety-assessment-fsa-certificate-2021-marina-sea-salt.pdf)
- [ScienceDirect, Redhouse saltpan study](https://www.sciencedirect.com/science/article/abs/pii/S0022098122000314)
- [Brabys listing](https://www.brabys.com/za/eastern-cape/port-elizabeth/redhouse/salt/swartkops-sea-salt-pty-ltd)
- ICASA State of ICT 2026, via the CTTX Master Capability & Proof Document (Notion)

The search-result summaries were verified. The pages themselves (saltpan.co.za, BirdLife, GroundUp, Nature Commitments) were **not opened directly**, because the session's network blocked them. Re-check the 2018 abandonment detail before quoting it to the customer.
