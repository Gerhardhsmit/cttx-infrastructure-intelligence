# Skill: Reserve Terrain Study (design standard)

**Also covers wind farms and farms** (`site_type` in the config: `reserve` / `wind` / `farm`; see the engine README).

**Trigger:** any reserve, wind farm, farm,, game reserve, conservancy, lodge group or large property identified as a potential client, including "do a desktop study", "proposal for <reserve>", "work this reserve", or a reserve name from the prospect database.

**Standard:** every such prospect gets the terrain study as the first-contact document **before any pricing**. Engine and rules: `sales-engine/terrain-study/README.md`.

## Steps
1. **Context.** Check Notion CTTX Pipeline and `sales-engine/customers/` for the prospect. Identify the named contact.
2. **Boundary first.** Use a confirmed boundary where one exists: query Overture (OpenStreetMap) `theme=base type=land_use subtype=protected` for the reserve polygon, save it as `sales-engine/terrain-study/reserves/<slug>.boundary.geojson` and reference it as `area.polygon_geojson` (the engine derives centre and equivalent radius, draws the real outline and measures coverage inside it). Fall back to a published reserve point plus stated hectares only when no mapped polygon exists, and say so in the config `source`.
3. **Lodge coordinates.** Find published GPS coordinates for every lodge or camp (lodge sites, directory pages). Record conflicts, pick the better-sourced one, and flag it. Never estimate a position. Where lodges have none, add the reserve `area` from a published reserve point and its size. If neither exists (e.g. only a jetty or reception address), don't build a study: put the prospect on the call list and ask for a KMZ or marked map.
4. **Uplink.** Use a known Vodacom site if Notion or Duane Forlee has one (`known_site`). Otherwise `"mode": "auto"`: mapped communication masts within 25 km (Overture/OSM), else the nearest town's high ground. Label the result honestly: if no mast carries a Vodacom operator tag in public data, the PDF and the email say the Vodacom site is to be confirmed with Duane Forlee.
5. **Config.** Write `sales-engine/terrain-study/reserves/<slug>.json`. The `today`, `context` and `security_note` fields come from evidence, never invented scenarios.
6. **Run.** `python3 sales-engine/terrain-study/engine.py sales-engine/terrain-study/reserves/<slug>.json`. If a lodge shows "Needs survey", say so rather than forcing a link.
7. **Look once.** Check the map and the lodge table. Publish `terrain-study/artifact.html` as a private artifact for Gerhard.
8. **Email.** Follow the `outlook-outreach-drafts` skill and outreach rules on branch `claude/elegant-pascal-1jsjwa` exactly:
   - The email is a plain-text `.eml` for Gerhard's Outlook (From: Gerhard Smit <gerhard@cttx.co.za>, Cc: gerhard@cttx.co.za, X-Unsent: 1). The filename contains `_Assessment_`. Save it under `sales-engine/outreach/<date>/` on that branch, with the study PDF alongside to attach.
   - **Never Gmail, never the Microsoft 365 connector, never send.** Gmail is only a read-only check for prior contact.
   - Named decision-maker only (owner / GM / reserve manager / site manager), verified on the company site or in Apollo. No generic addresses. No name → call list.
   - Voice: "Gerhard Smit here, CTTX in Gqeberha. We engineer owned networks on lodges, reserves and farms; we don't sell packages." Include one verified paragraph about their operation, point to the attached terrain study (positions are desktop candidates), and offer the half-day assessment: R3,500 ex VAT, credited against the build. Add the invoice hook for actual payback, then "Can I call you for 10 minutes this week?". Use the standard signature (041 371 1089 | 084 550 3281) and a one-line POPI opt-out.
   - Never invent terrain facts or distances. Only the engine's own results, labelled as a desktop study.
   - Build the `.eml` with `python3 outbound-communication/make_eml.py --to ... --subject ... --body body.txt --attach sales-engine/customers/<slug>/<Short>_Reserve_Network_CTTX.pdf --note ... --out "<Company> - DRAFT_<First_Last>_Assessment_<YYYYMMDD>.eml"`. It EMBEDS the study PDF as a MIME attachment (and still writes `X-CTTX-Attach`), then prints the embedded attachments; exit code 1 means no attachment. Keep a copy of the PDF next to the `.eml` as well.
   - **Acceptance criterion (Gerhard, 28 Sep 2026): a prospect email is NOT complete unless the property-specific study exists and, where a study is promised or generated, that exact PDF is embedded in the `.eml`.** Verify with `make_eml.py --verify <file.eml>` before committing. Never attach a generic brochure.
   - Tell Gerhard: double-click **Load CTTX Drafts** on his Desktop. It pulls, loads only new drafts into the gerhard@cttx.co.za Drafts folder, attaches the PDF, and never sends. Never ask him to paste commands, copy files or attach by hand.
9. **Log.** Update the prospect's Notion page (next action, study done, PDF location). Commit the customer folder and the config.

## Cost rules (Gerhard, 28 Sep 2026)
- **The study never contains cost figures:** no prices, estimated spend, rand amounts or payback tables. The engine enforces this and refuses to build.
- The only payback wording allowed is "typically recovers the investment in under three years on connectivity costs alone", plus the invoice hook.
- The AP estimate (rooms → APs today / needed) and the Herotel-style cost estimate (≈R256 per rented AP per month + uplink tier) go to `INTERNAL_AP_and_Herotel_Estimate.md` for call preparation only. Never attach it and never quote it in an email.
- Real payback is calculated only from the prospect's own invoices.

## Keep the standard current
- New customer outcome with permission → add it to `sales-engine/terrain-study/evidence.json`.
- Brand change → edit only `sales-engine/terrain-study/brand.json`, then re-run.
