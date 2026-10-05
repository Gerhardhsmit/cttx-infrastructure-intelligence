# CTTX Reserve Terrain Study: design standard

Every reserve CTTX identifies as a potential client gets this study as the **first-contact document**. It contains no pricing. Its job is to get the decision-maker's attention with their own terrain.

## What it produces
- **Aerial map:** Sentinel-2 imagery of the reserve with the candidate carrier uplink, ridge high-sites, relays, links to every lodge, and radio coverage shading.
- **Link planning:** a terrain profile for every link (Copernicus 30 m DEM, 5.8 GHz, k = 4/3, ≥60% first-Fresnel clearance). Blocked paths are never drawn (CTTX_CRITICAL_DECISIONS.md).
- **One backbone for every driver:** guest experience, staff communication, and security and operations, with named customer proof from `evidence.json`.
- **Ownership case:** today versus owned backbone, plus the four ROI lenses in words, then next steps.
- Output: `sales-engine/customers/<slug>/<Short>_Reserve_Network_CTTX.pdf` + `.html`, **`<Short>_Reserve_Network_CTTX_3D.kmz` (Google Earth: masts at modelled height, radio paths mast-top to mast-top at true altitude, fly-through tour)**, and `terrain-study/` (map, profiles, metrics, config, artifact page).

## Run it
```bash
pip install -r sales-engine/terrain-study/requirements.txt
cp sales-engine/terrain-study/reserves/amakhala.json sales-engine/terrain-study/reserves/<slug>.json   # edit
python3 sales-engine/terrain-study/engine.py sales-engine/terrain-study/reserves/<slug>.json
```

## Site types
Set `site_type` in the config: `reserve` (default), `wind` or `farm`. The wording comes from `site_types.json`, the drivers and evidence from `evidence.json` (`by_type`), and the terrain/imagery/link-planning core is shared.
- **wind:** add `osm_turbines`: `{"farms": [{"name","lat","lon","turbines"}], "exclude_operators": [...], "radius_km": 8}`. Turbines and the nearest substation come from OpenStreetMap (via Overture), assigned to each farm by its published location and turbine count. High sites are chosen for line of sight to the turbines.
- **farm:** needs published site positions (office, packhouse, pumps) or an `area`. If none are published, the farm goes on the call list with a request for a KMZ.
- **Uplink `auto`:** mapped communication masts within 25 km first, falling back to town high ground.

## How the engine handles gaps (built in)
- **Lodges without published positions:** give the reserve `area` (`lat`, `lon`, `radius_km`, `source`) from a published reserve point and its size. The engine picks high sites for the best coverage of the area, still links every lodge that has a position, and lists the others as "Position to confirm". If there is no area and no lodge positions, there is no study; the prospect goes on the call list and gets asked for a KMZ.
- **Clouds:** imagery is built from the clearest passes in the last 12 months, judged over the study area itself. A pass is used only if its local cloud is 1% or less, and gaps are filled pass by pass until the whole window is covered.
- **Cost figures:** the engine refuses to build if a rand amount appears in the study.
- **Filenames:** made safe (letters, digits and `_` only).

## Optional config
- `area.high_sites_inside: true` keeps candidate high sites inside the mapped boundary (tenure).
- `wording`: per-study overrides of `site_types.json` keys (e.g. `"site_word": "site"` when the sites are not all lodges).

## Reserve config
| Field | Meaning |
|---|---|
| `slug`, `reserve`, `short` | Folder name, full name, short name used in the title |
| `prepared_for` | "First name, Reserve" |
| `lodges[]` | `name`, `lat`, `lon` (null if not published), `units`, `wifi_today` (`public`/`all_rooms`/`unknown`), `coord_source`. Published coordinates only; never estimate. |
| `area` | Optional: `{"lat","lon","radius_km","source"}` for the reserve extent (a published reserve point, radius from the hectares) |
| `uplink` | `{"mode":"town_high_ground","town","lat","lon","radius_m"}`: highest ground near a town. Or `{"mode":"known_site","label","lat","lon"}` once Vodacom confirms a tower |
| `today[]` | 3–4 bullets on the current state, from **evidence only** (published listings, the customer's own words) |
| `context`, `security_note` | One paragraph each, reserve-specific, evidence-based |

## Single sources of truth
- `brand.json`: every colour and font (HTML, PDF, map and profile images). Taken from the Barefoot Addo Network Proposal (26 Sep 2026): near-black #0A0A0B, lime #CCFF00, alert #FF3B30; Inter Tight, Inter, Roboto Mono.
- `evidence.json`: customer proof points. Name a customer only with recorded permission. No pricing.
- `template.html`: page layout.
- `payback_model.json` / `estimate_model.json`: **internal** assumptions for the AP count, the current-cost estimate and the conservative payback. None of it is shown to the customer. The study only says "typically under three years".

## Rules
- **No cost figures of any kind** in the study: no prices, spend estimates or rand amounts. The engine refuses to build if one appears. The per-lodge AP count and the estimated current (Herotel-style) cost are written to `customers/<slug>/INTERNAL_AP_and_Herotel_Estimate.md`, for Gerhard only.
- High-site and uplink positions are **desktop candidates**. The page says so, and a survey plus Cambium LINKPlanner confirm them.
- POPI: business contacts only. The covering email is an Outlook `.eml` draft (see `.claude/skills/reserve-terrain-study.md` step 7), never sent automatically.
