# Kwandwe Private Game Reserve: Desktop Network Design

**Prepared by:** CTTX Services | **Date:** 28 September 2026 | **Status:** Desktop only (rev 2, 28 Sep 2026). No site visit, KMZ or LINKPlanner run yet
**Opportunity type:** Hybrid Infrastructure (Vodacom carrier + CTTX private reserve backbone), auto-classified per CLAUDE.md
**Stage:** Assessment / Survey. Angus Sholto-Douglas (MD) replied on 25 Sep: "happy to discuss". Gerhard offered Thu/Fri next week for the half-day assessment (Notion CTTX Pipeline, 27 Sep)
**Purpose:** this is the design hypothesis CTTX takes into the half-day assessment. Every position below is a desktop candidate. The assessment confirms it or corrects it.

Customer-facing study (no pricing): `Kwandwe_Reserve_Network_CTTX.pdf`. Engine inputs and outputs: `terrain-study/`, config `sales-engine/terrain-study/reserves/kwandwe.json`.

---

## 1. Reserve profile (evidence)

| Item | Finding | Source / confidence |
|---|---|---|
| Location | NE of Makhanda, off the R67 via Ecca Pass. The reserve gate is about 5 km along a gravel road, then 6 km on to the lodges | Published directions (lodge listings) |
| Size | **Mapped boundary: 18,482 ha** (OSM way 1239610155). Published figures: 22,000 / 25,000 / 30,000 ha | ⚠️ Conflict, see §7 |
| River | The Great Fish River gives about 30 km of frontage and almost divides the reserve in half | Wikipedia / lodge listings |
| Lodges | Great Fish River Lodge (9 suites), Ecca Lodge (6), Melton Manor (4, exclusive use), Uplands Homestead (3 bedrooms) | Lodge listings, Sep 2026 |
| Stakeholders in thread | Angus Sholto-Douglas (MD), Bongi, Gary Tandy (TFT Security), enviro@ (environmental team) | Gmail thread of 25 Sep; Notion |

## 2. Sites (facility detection over the mapped boundary, 28 Sep 2026 rev 2)

Method: the platform's Link Planner facility-detection approach (buildings, places, gates, farmyards, dams inside the boundary), run on Overture Maps (OpenStreetMap + Google/Microsoft building footprints + places) because Overpass is blocked from the cloud session. Buildings within 350 m are grouped into one site.

| Site | Lat, Lon | Evidence | Served from | Path |
|---|---|---|---|---|
| Great Fish River Lodge | -33.09110, 26.57404 | OSM building **named** "Great Fish River Lodge", 657 m², on the river | GFR Lodge relay | 0.7 km |
| Ecca Lodge | -33.11025, 26.52672 | Places point + 3 buildings within 60 m | High Site North | 5.9 km |
| Uplands Homestead | -33.12837, 26.47247 | Places point only, **no building mapped there**. The nearest group is 2.2 km east | High Site North | 10.2 km |
| Heatherton Towers | -33.14654, 26.52542 | OSM building **named**, 865 m² | High Site North | 9.8 km |
| Airstrip (FAKG) | -33.13380, 26.57912 | OSM aerodrome "Kwandwe Airport", 2,060 m concrete runway | High Site South | 5.1 km |
| East complex | -33.10005, 26.60772 | 10 buildings, ~1,160 m² (largest unnamed group: staff/ops/workshop?) | High Site South | 0.8 km |
| West of GFR Lodge | -33.09499, 26.56880 | 1 OSM building, 406 m² | GFR Lodge relay | 1.3 km |
| North-west of GFR Lodge | -33.08667, 26.55751 | 2 footprints | GFR Lodge relay | 2.1 km |
| East of Ecca Lodge | -33.10491, 26.53940 | 3 OSM buildings | High Site North | 5.0 km |
| Dam buildings | -33.12336, 26.50785 | 2 footprints by a mapped dam | High Site North | 7.9 km |
| East of Uplands | -33.12802, 26.49573 | 2 footprints (may be the real Uplands) | High Site North | 8.9 km |
| South-west outpost | -33.15530, 26.49129 | 4 small structures | High Site North | 11.7 km |
| North boundary | -33.05932, 26.53818 | 2 footprints on the boundary | High Site North | 0.7 km |
| North ridge farmstead | -33.05559, 26.51873 | 8 OSM buildings, **30 m outside** the mapped boundary | High Site North | 2.5 km |
| R67 edge buildings | -33.12827, 26.61345 | 3 footprints on the east boundary by the R67 (a possible gate) | High Site South | 3.1 km |
| Melton Manor | **not located** | No published or mapped position | — | — |

**Correction to rev 1:** rev 1 put Great Fish River Lodge at -33.12972, 26.53743. That point is a generic reserve places point, about 5 km from the named lodge building. All rev 1 lodge links are superseded.

## 3. Topology: three layers (rev 2)

```
 LAYER 1 · CARRIER
 [Mapped mast, Makhanda ridge -33.28428, 26.70253 — operator TBC (Vodacom via Duane Forlee)]
          │ 22.0 km PTP, Fresnel-clear (30 m tower / 18 m high site)
          ▼
 LAYER 2 · BACKBONE (the reserve owns it; both high sites inside the mapped boundary)
 [HIGH SITE SOUTH 356 m  -33.10010, 26.61599]  ◄── 8.0 km ──►  [HIGH SITE NORTH 613 m  -33.05981, 26.54515]
   (east ridge, 179 m inside the boundary)                       (north ridge, 16 m inside the boundary)
          │                                                             │  4.6 km (⚠ clearance only just meets the 60% minimum)
          │                                                     [GFR LODGE RELAY 349 m  -33.08835, 26.58036]
 LAYER 3 · DISTRIBUTION
   High Site South → Airstrip, East complex, R67 edge
   High Site North → Ecca, Uplands, Heatherton Towers, East of Ecca, Dam, East of Uplands, SW outpost, North boundary, North ridge farmstead
   GFR relay       → Great Fish River Lodge, West of GFR, North-west of GFR
```

- **15 of 15 located sites** are on clear, Fresnel-checked paths. **53%** of the mapped 185 km² is in line of sight for a 3 m field terminal.
- **Weakest link:** GFR relay ↔ High Site North (4.6 km). Its clearance only just meets the 60% minimum. On survey, check whether a taller relay mast or a different relay spot is needed. If it fails, GFR Lodge needs another feed path (e.g. from High Site South).
- **Hub:** the East complex (10 buildings, 0.8 km from High Site South) is the likely operations hub and carrier handoff point, if the assessment confirms it is staff/ops. Great Fish River Lodge stays a primary guest node.
- **Engine changes made for this study:**
  - The new `area.high_sites_inside` flag keeps high sites on the property. Without it, High Site South landed 1.3 km outside the boundary.
  - Relays now carry the full site name.
  - Fixed a bug that printed "3" instead of the evidence list. This affected earlier studies, see §7.
- **Naming:** "High Site North/South" are engine placeholders. Replace them with Kwandwe's own ridge names at the assessment.

## 4. Equipment by layer (quantities only, no pricing: feasibility before price)

| Layer | Item | Qty | Note |
|---|---|---|---|
| Carrier uplink (22.0 km) | Cambium PTP 820S licensed, or PTP 670/550E | 1 link (2 ends) | Licensed band preferred at 22 km for BER-first design. Tower-end space and rights depend on the tower owner |
| Backbone (8.0 km) | Cambium PTP 550E / PTP 670 | 1 link | Crosses the river-valley axis. LINKPlanner sets the band and antennas |
| Relay | 18 m mast, solar + lithium, PTP to High Site North + sector | 1 (GFR Lodge relay) | 4.6 km backhaul, weakest link |
| Distribution | Cambium ePMP 3000 sectors (per high site/relay) + PTP 450b for the longest spurs | 15 sites now, +1 for Melton Manor | Longest: SW outpost 11.7 km, Uplands 10.2 km, Heatherton 9.8 km |
| Field / security | ePMP 3000 sector per high site | 2–4 sectors | Gates, APU base, cameras. Scope comes from TFT Security at the assessment |
| Core | Cambium cnMatrix EX2028-P at the hub | 1 | VLANs: guest / ops / security / IoT |
| Failover | Teltonika RUTX11 dual-SIM | 1 at the hub | LTE signal to be measured on site |
| IoT | Dragino LoRaWAN gateway | 1–2 | Fence, water point, pump and fuel sensors |
| Power per high site / relay | Victron MPPT + Hubble lithium, solar array sized to load, 3–5 days autonomy | 3 sites | Remote monitoring is mandatory (no blind infrastructure) |
| Structures | 18 m masts at the 2 high sites + relay; 8 m site masts | 3 + up to 16 | Mast height is the main lever on the uplink (§5) |
| Management | cnMaestro + Victron VRM | All sites | |

## 5. What decides feasibility (to settle at the assessment)

1. **Carrier entry point.** Is the Makhanda-ridge mast (22.0 km) a Vodacom site, and can CTTX mount there? Duane Forlee confirms the Vodacom site.
2. **High Site North tenure.** It is 16 m inside the mapped boundary, next to the north ridge farmstead. Whose land is it, and what vehicle access and fencing are there?
3. **The GFR relay path.** Clearance only just meets the 60% minimum. Check it on site, and plan LINKPlanner at mast height +3 m.
4. **Sites the map can't name.** Get Melton Manor, HQ/ops, APU base, gates, workshop and staff village (a KMZ or marked map). Confirm what the East complex, the North ridge farmstead and the R67 edge buildings are.
5. **Uplands Homestead position.** Is it the places point or the "East of Uplands" buildings 2.2 km away?
6. **Existing systems.** Current ISP per lodge, Wi-Fi, radios/VHF, cameras (TFT Security) and power. Also get the monthly connectivity invoices, which give the real payback.

## 6. Assessment-day agenda (half day)

1. 30 min with Angus, Bongi, Gary Tandy (TFT) and enviro. Cover: what fails today, incidents, after-hours comms, what's unmonitored.
2. Drive to High Site South and High Site North (or the nearest reachable ridge). Take GPS, look at LOS toward the lodges and toward Makhanda, check access.
3. Take LTE readings at the lodges and hub (for failover).
4. Collect the site list and KMZ, the invoices and the camera/gate inventory.
5. Output: re-run the engine with confirmed positions, run LINKPlanner on the uplink and backbone, then write the proposal (hybrid template, with "Cost of Disconnection vs Value of Connected Operations").

## 7. Discrepancies and flags (not silently resolved)

- **Reserve size.** Notion says 22,000 ha. The May 2026 conceptual analysis (Drive) says 30,000 ha. OSM maps 18,482 ha. The study models the mapped polygon and says so. Ask Kwandwe for the true boundary/KMZ.
- **Ownership.** Notion names Carl DeSantis as founder. The May analysis says "Chouest family". Neither is verified here. Confirm who signs off capex (Angus as MD is the working contact).
- **24 Sep email claims.** The email to Angus said "six usable backbone corridors" and "nearest existing tower about 18 km out". That desk study was not committed anywhere searchable, so it is **NOT VERIFIED**. Rev 2 shows **2 high sites + 1 relay, an 8.0 km backbone and a 22.0 km uplink** across 15 located sites. The draft follow-up email uses only these numbers.
- **Earlier studies affected by the evidence-list bug:** every study built with room counts printed "3" under "What the public record shows" (e.g. Amakhala, Sibuya, Gondwana, Pumba, Buffalo Kloof PDFs on branch `elegant-pascal`). Fixed in the engine here. Re-run those studies before any follow-up.
- **Seed data.** `server/seed-kwandwe.ts` holds demo data (e.g. "Unreliable WISP", TFA fibre 5 km, scores). It is not evidence and is not used here.
- **Outreach rule.** Kwandwe is on the "never cold-email" list. The draft is a follow-up in Angus's own reply thread (requested by Gerhard, 28 Sep): `sales-engine/outreach/2026-09-28-kwandwe/`. The role mailbox `enviro@` is left off (the loader rejects role mailboxes).

## 8. ROI lenses (for the proposal; numbers only from Kwandwe's own data)

- **Avoided loss:** Big Five with rhino, and security run by TFT. Camera, gate and alarm backhaul plus after-hours ranger comms reduce response time to incidents.
- **Operational efficiency:** four lodges and central teams on one network. Fewer vehicle trips to check gates, pumps and water points.
- **Infrastructure ownership:** one carrier feed plus an owned backbone, instead of separate per-lodge services. The internal estimate is in `INTERNAL_AP_and_Herotel_Estimate.md` (never send).
- **Executive risk reduction:** a monitored network (cnMaestro/VRM) with measurable uptime, which gives evidence of diligence for owners and guests.

---
**Sources:** Overture Maps release 2026-09-23.1 (OpenStreetMap: places, land_use, infrastructure) · Copernicus DEM 30 m · Sentinel-2 L2A 14 Jul 2026 · [Wikipedia: Kwandwe Private Game Reserve](https://en.wikipedia.org/wiki/Kwandwe_Private_Game_Reserve) · lodge listings (siyabona.com, expertafrica.com, travelbutlers.com) · Notion CTTX Pipeline "Kwandwe Private Game Reserve" · Gmail thread "Kwandwe: the network on the reserve, in one page" (24–25 Sep 2026) · Drive "CTTX_Kwandwe_Infrastructure_Analysis_May2026"
