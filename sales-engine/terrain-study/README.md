# CTTX Reserve Terrain Study: design standard

Every reserve CTTX identifies as a potential client gets this study as the **first-contact document**. It contains no pricing. Its job is to get the decision-maker's attention with their own terrain.

## What it produces
- **Aerial map:** Sentinel-2 imagery of the reserve with the candidate carrier uplink, ridge high-sites, relays, links to every lodge, and radio coverage shading.
- **Link planning:** a terrain profile for every link (Copernicus 30 m DEM, 5.8 GHz, k = 4/3, ≥60% first-Fresnel clearance). Blocked paths are never drawn (CTTX_CRITICAL_DECISIONS.md).
- **One backbone for every driver:** guest experience, staff communication, and security and operations, with named customer proof from `evidence.json`.
- **Ownership case:** today versus owned backbone, plus the four ROI lenses in words, then next steps.
- Output: `sales-engine/customers/<slug>/<Short>_Reserve_Network_CTTX.pdf` + `.html`, and `terrain-study/` (map, profiles, metrics, config, artifact page).

## Run it
```bash
pip install -r sales-engine/terrain-study/requirements.txt
cp sales-engine/terrain-study/reserves/amakhala.json sales-engine/terrain-study/reserves/<slug>.json   # edit
python3 sales-engine/terrain-study/engine.py sales-engine/terrain-study/reserves/<slug>.json
```

## Reserve config
| Field | Meaning |
|---|---|
| `slug`, `reserve`, `short` | Folder name, full name, short name used in the title |
| `prepared_for` | "First name, Reserve" |
| `lodges[]` | `name`, `lat`, `lon`. Use published GPS coordinates only, and note any that conflict |
| `uplink` | `{"mode":"town_high_ground","town","lat","lon","radius_m"}`: highest ground near a town. Or `{"mode":"known_site","label","lat","lon"}` once Vodacom confirms a tower |
| `today[]` | 3–4 bullets on the current state, from **evidence only** (published listings, the customer's own words) |
| `context`, `security_note` | One paragraph each, reserve-specific, evidence-based |

## Single sources of truth
- `brand.json`: every colour and font (HTML, PDF, map and profile images). Taken from the Barefoot Addo Network Proposal (26 Sep 2026): near-black #0A0A0B, lime #CCFF00, alert #FF3B30; Inter Tight, Inter, Roboto Mono.
- `evidence.json`: customer proof points. Name a customer only with recorded permission. No pricing.
- `template.html`: page layout.
- `payback_model.json`: **internal** assumptions for the payback table (only months/years are shown). Conservative: excludes the top spend band and deducts running costs. The claim is capped at "typically under three years".

## Rules
- No pricing in this document. Internal quotes stay in `INTERNAL_*` files.
- High-site and uplink positions are **desktop candidates**. The page says so, and a survey plus Cambium LINKPlanner confirm them.
- POPI: business contacts only. The covering email goes to drafts, never sent automatically.
