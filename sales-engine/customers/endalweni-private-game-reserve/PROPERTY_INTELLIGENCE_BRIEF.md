# Endalweni Private Game Reserve — Property Intelligence Brief

**Status:** Desktop assessment — CONTACT UNVERIFIED, OPPORTUNITY ACTIVE
**Date:** 29 September 2026
**Prepared by:** CTTX (Claude Code session)
**Confidence:** Medium — built from public sources and CTTX doctrine; no live GIS/Link Planner run yet (blocked in this session, see Resource Log)

---

## A. PROPERTY

| Field | Detail | Confidence |
|---|---|---|
| Name | Endalweni Private Game Reserve & Country House | Confirmed |
| Address | P.O. Box 69, Kei Mouth, Eastern Cape, South Africa, 5260 | Confirmed (web) |
| Access | 11 km from Kei Mouth via the R349 (fully tarred) | Confirmed (web) |
| Distance from East London (CTTX base) | ~45 min drive / ~90 km via R349→N2 corridor | Confirmed (web) |
| Region character | Wild Coast hinterland, Kei River mouth area — coastal grassland / valley bushveld, malaria-free | Confirmed (marketing copy + regional knowledge) |
| Scale | Not confirmed — "Country House and Private Game Reserve" branding suggests boutique scale (low hundreds to low thousands of ha), materially smaller than Big-5 reserves in this database (Kwandwe 22,000ha, Kariega 10-11,000ha) | **Unconfirmed — flag for site visit/deeds search** |
| Exact GPS / boundary polygon | Not obtained — Nominatim/Overpass (the tools the CTTX Link Planner itself uses for this) returned a 403 policy denial from this coding session's network egress proxy. This is a sandbox restriction, not evidence the data is unavailable — the Link Planner app itself, run by Gerhard or on the deployed platform, is not subject to this restriction. | **Requires Link Planner run outside this session** |
| Terrain | Not measured directly. Regional terrain along this stretch of Wild Coast hinterland is typically moderate rolling relief, not high-mountain — comparable clearance/LOS conditions to other coastal EC reserves already in the CTTX pipeline (Oceana Beach & Wildlife Reserve is the closest analogue: "coastal Big Five + beach reserve blending wildlife and hospitality"). | Inference from regional pattern, not measured |

## Nearby CTTX context

- **CTTX is East London-based** — same regional advantage already used as the outreach hook for Inkwenkwezi PGR ("fastest reserve-wide private network installed from next door").
- **Inkwenkwezi Private Game Reserve** (existing CTTX pipeline prospect, ~35km from East London) is in the same general Eastern Cape coastal corridor but is not confirmed close enough to Endalweni (~90km from EL) to share backbone infrastructure — flagged as worth checking once exact coordinates exist, not asserted as fact.
- **Vodacom is actively investing in this exact municipality.** Public Vodacom announcements confirm an "Upper Bay investment area" covering sites up to Kei Mouth, and a ~R100m Great Kei municipality rollout to extend rural coverage. This is a genuine positive signal for carrier feasibility at this specific site — it should still be confirmed per-site with Duane Forlee (Vodacom channel manager, per CTTX's standard process), but it is not a cold guess.
- Tarred road access (R349) is a real positive for installation logistics compared to dirt-track-only reserve sites elsewhere in the CTTX pipeline.

---

## B. INFRASTRUCTURE HYPOTHESIS

**This is not an internet sale. This is the CTTX Hybrid Infrastructure model applied to a boutique reserve/country-house property.**

**Carrier entry point:** Vodacom Business Connect (or LTE Business as bridge product if fixed-line feasibility is marginal) terminates at the Country House — the natural operational, hospitality, and management centre of the property, consistent with CTTX's standing doctrine that the main lodge is always the primary distribution hub.

**Private distribution (hypothesis, pending field/Link Planner confirmation):**
- Single-hop distribution likely sufficient given the property's probable smaller scale and tarred-road accessibility — unlike large multi-lodge reserves (Kwandwe, Marataba) that need multi-hop backbone chains across tens of kilometres.
- Distribution targets: guest accommodation/chalets (guest WiFi), reception/office (booking + POS), game-viewing/field operations (ranger and guide coordination), gate/entrance (arrival monitoring, access control), staff areas.
- If perimeter or camera security exists or is wanted, this becomes an additional distribution branch, not a separate project.

**Standard CTTX equipment stack (per CTTX_CRITICAL_DECISIONS.md and nature-reserve skill defaults):**
- Distribution: Cambium cnPilot e410 (outdoor AP) or ePMP 3000 (sector) as needed
- Core switching: Cambium cnMatrix EX2028-P
- LTE failover: Teltonika RUTX11 (dual-SIM) — matches the CTTX Hybrid redundancy principle (backbone-only redundancy is the default rule, but a boutique single-hub site makes the carrier link itself the redundancy point)
- Power: 200–400W solar + 200Ah LiFePO4 (Victron + Hubble Lithium per CTTX standard stack) only where any distribution point sits off-grid
- Management: cnMaestro (radio) + Victron monitoring (power) — CTTX does not deploy infrastructure it cannot remotely monitor

**What determines the real BOM:** exact site boundary, building locations, and LOS between Country House and any distribution points — none of which are available without either (a) Gerhard running the Link Planner against this address, or (b) a site visit. This brief does not invent equipment counts or pricing without that data.

---

## C. COMMERCIAL CASE — Four ROI Lenses

**1. Avoided Loss**
A boutique, TripAdvisor/booking-platform-dependent property lives or dies on guest reviews. A failed booking system, no WiFi for a paying overseas guest, or a POS outage during a stay is a direct, visible failure that shows up in reviews and hurts repeat/referral business — the primary revenue channel for a property this size. Basic perimeter/access monitoring also protects against livestock/game loss and staff safety incidents, which carry real cost even at boutique scale.

**2. Operational Efficiency**
A small reserve runs lean. Reliable comms between the Country House and field/game-drive operations reduces wasted trips, coordinates catering and guest timing accurately, and speeds up maintenance response — value that scales with how thin the staffing is, which for a boutique property is usually thinner than at a large multi-lodge reserve.

**3. Infrastructure Ownership**
This reads as an owner-operated property (family/boutique branding, not a corporate multi-lodge group). An owned private network is a durable asset that supports the property's most likely growth path — additional guest units, weddings/events (a common revenue diversification for boutique Eastern Cape reserves) — without recurring cost scaling linearly with each addition.

**4. Executive Risk Reduction**
For an owner running a guest-facing hospitality operation, demonstrable operational reliability and guest-safety infrastructure functions as a reputational and insurance-adjacent asset — evidence of operational diligence rather than an unmanaged, ad-hoc connectivity setup.

---

## D. WHAT THIS BRIEF DOES NOT CLAIM

- No exact hectare figure, GPS coordinates, or terrain profile — flagged, not invented
- No BOM quantities or ZAR pricing — those depend on data this brief doesn't have yet
- No named decision-maker — see Contact Strategy below
- No claim that Vodacom coverage is guaranteed — the investment signal is real, per-site confirmation with Duane Forlee is still required per standard process

---

## E. CONTACT STRATEGY

**Status: GENERIC CONTACT — DECISION MAKER UNVERIFIED** (not a workflow stop)

Only verified public contact point: `info@endalweni.co.za` / +27 (0)43 841 1526.

Five resources checked, all returned no verified name (see Resource Log in Notion pipeline record): Apollo.io, Notion, Gmail, web search, direct site/social fetch (blocked in this session). Outlook connector is currently non-functional at the tenant level (separate infrastructure fault, not a data gap) — the existing unsent draft addressed to info@ may already reference a name that simply can't be read right now.

**Action taken, not deferred:** outreach is addressed to the role, not invented as a person — "The General Manager / Reserve Manager, Endalweni Private Game Reserve" — which is standard practice for exactly this situation and is not the same as sending to a bare info@ inbox with no personalisation. See the drafted email below.

---

## Resource Log — what was actually used

| Resource | Result | Evidence |
|---|---|---|
| Notion (CTTX Pipeline, Lead Pipeline — All Divisions) | No existing Endalweni record found before this session; Inkwenkwezi found as regional comparator with the same unresolved-contact pattern | Search + fetch performed |
| Local repo (.manus/db, sales-engine, references) | No local data on Endalweni or Kei Mouth | grep across repo |
| Gmail | No thread found | search_threads |
| Outlook/M365 | **Infrastructure fault** — Mail.Read scope is granted, get_me succeeds, but outlook_email_search and search_people fail (AADSTS500014: service principal for outlook.office365.com disabled — subscription lapsed or app disabled by tenant admin) | Confirmed via get_granted_scopes + explicit error, not assumed |
| Apollo.io | Zero results — org lookup by domain, company-name search, and people search by domain/keyword all empty. Confirms too small for Apollo's B2B database, not a tool failure | 4 separate Apollo calls |
| Google Drive | No files found (`fullText contains 'Endalweni'` returned clean empty result) | search_files |
| Web search | Address, phone, and general reserve description confirmed. No verified named decision-maker — one AI-search-surfaced name ("Juan Cabrera") could not be corroborated on a follow-up search and was discarded rather than used | Multiple WebSearch calls |
| Direct site/social fetch (endalweni.co.za, Facebook, tourism listings) | Blocked — DNS failure on the domain itself, egress-proxy block on Facebook and third-party listing sites | WebFetch errors |
| Nominatim / Overpass (CTTX's own Link Planner data sources) | **Blocked by this session's network egress policy** (403, explicit policy denial, confirmed via `/root/.ccr/README.md` guidance not to retry). This is a sandbox restriction on this coding session, not evidence CTTX's own GIS tooling is broken — the deployed Link Planner / a session run by Gerhard does not have this restriction | curl to proxy status endpoint showed explicit `connect_rejected` policy denial |

---

## Next automated action

1. Outreach email drafted and saved as `.eml` (see `CTTX_Endalweni_Outreach.eml` in this folder) — Outlook connector fallback, matches the precedent already used for Kwandwe (Outlook .eml drafted, not sent, Gerhard to review and send)
2. Notion Pipeline record updated with full findings, resource log, and next action
3. **Next genuine human decision required:** Gerhard reviews and sends the drafted email (or requests edits). That is the only manual step — no prospecting, no phone calls required to advance this opportunity further right now.
4. Once Gerhard has 2 minutes with the Link Planner tool (outside this sandboxed session) pointed at this address, exact coordinates/terrain/BOM can be finalized — this is a tool-run step, not a research step.
