# Skill: Reserve Terrain Study (design standard)

**Trigger:** any reserve, game reserve, conservancy, lodge group or large property identified as a potential client, including "do a desktop study", "proposal for <reserve>", "work this reserve", or a reserve name from the prospect database.

**Standard:** every such prospect gets the terrain study as the first-contact document **before any pricing**. Engine and rules: `sales-engine/terrain-study/README.md`.

## Steps
1. **Context.** Check Notion CTTX Pipeline and `sales-engine/customers/` for the prospect. Identify the named contact.
2. **Lodge coordinates.** Find published GPS coordinates for every lodge or camp (lodge sites, directory pages). Record conflicts, pick the better-sourced one, and flag it.
3. **Uplink.** Use a known Vodacom site if Notion or Duane Forlee has one (`known_site`). Otherwise use the nearest town's high ground (`town_high_ground`) and say it is a candidate.
4. **Config.** Write `sales-engine/terrain-study/reserves/<slug>.json`. The `today`, `context` and `security_note` fields come from evidence, never invented scenarios.
5. **Run.** `python3 sales-engine/terrain-study/engine.py sales-engine/terrain-study/reserves/<slug>.json`. If a lodge shows "Needs survey", say so rather than forcing a link.
6. **Look once.** Check the map and the lodge table. Publish `terrain-study/artifact.html` as a private artifact for Gerhard.
7. **Email.** Follow the `outlook-outreach-drafts` skill and outreach rules on branch `claude/elegant-pascal-1jsjwa` exactly:
   - The email is a plain-text `.eml` for Gerhard's Outlook (From: Gerhard Smit <gerhard@cttx.co.za>, Cc: gerhard@cttx.co.za, X-Unsent: 1). The filename contains `_Assessment_`. Save it under `sales-engine/outreach/<date>/` on that branch, with the study PDF alongside to attach.
   - **Never Gmail, never the Microsoft 365 connector, never send.** Gmail is only a read-only check for prior contact.
   - Named decision-maker only (owner / GM / reserve manager / site manager), verified on the company site or in Apollo. No generic addresses. No name → call list.
   - Voice: "Gerhard Smit here, CTTX in Gqeberha. We engineer owned networks on lodges, reserves and farms; we don't sell packages." Include one verified paragraph about their operation, point to the attached terrain study (positions are desktop candidates), and offer the half-day assessment: R3,500 ex VAT, credited against the build. Add the invoice hook for actual payback, then "Can I call you for 10 minutes this week?". Use the standard signature (041 371 1089 | 084 550 3281) and a one-line POPI opt-out.
   - Never invent terrain facts or distances. Only the engine's own results, labelled as a desktop study.
   - Put the study PDF next to the `.eml` and add the header `X-CTTX-Attach: <Short>_Reserve_Network_CTTX.pdf`. The loader attaches it automatically.
   - Tell Gerhard: double-click **Load CTTX Drafts** on his Desktop. It pulls, loads only new drafts into the gerhard@cttx.co.za Drafts folder, attaches the PDF, and never sends. Never ask him to paste commands, copy files or attach by hand.
8. **Log.** Update the prospect's Notion page (next action, study done, PDF location). Commit the customer folder and the config.

## Payback rules
- The study shows the "find your row" table (payback in years by lodge count × spend per lodge) from `sales-engine/terrain-study/payback_model.json`. The rand assumptions are internal and never shown.
- Claim only "typically under three years on connectivity spend alone". The grounded reference is Barefoot Addo's approved quote: 34-month break-even without the managed retainer. Never quote the 14-month figure from the later web proposal.
- Real payback is calculated only from the prospect's own invoices, after first contact.

## Keep the standard current
- New customer outcome with permission → add it to `sales-engine/terrain-study/evidence.json`.
- Brand change → edit only `sales-engine/terrain-study/brand.json`, then re-run.
