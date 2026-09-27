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
7. **Email.** Draft (never send) a short covering email in the Microsoft 365 connector's Outlook if available, otherwise Gmail. Tell Gerhard to attach the PDF. The email must:
   - lead with the terrain result (lodges on clear paths, uplink distance, coverage);
   - allude to payback as "typically under three years on connectivity spend alone", with no rand figures and nothing more aggressive;
   - offer to calculate *their* payback from each lodge's latest connectivity invoice. This is the hook: whoever holds the bills is the decision-maker;
   - invite forwarding to whoever signs off infrastructure (owners, reserve manager, lodge managers);
   - ask for a 30-minute call and include an opt-out line.
8. **Log.** Update the prospect's Notion page (next action, study done, PDF location). Commit the customer folder and the config.

## Payback rules
- The study shows the "find your row" table (payback in years by lodge count × spend per lodge) from `sales-engine/terrain-study/payback_model.json`. The rand assumptions are internal and never shown.
- Claim only "typically under three years on connectivity spend alone". The grounded reference is Barefoot Addo's approved quote: 34-month break-even without the managed retainer. Never quote the 14-month figure from the later web proposal.
- Real payback is calculated only from the prospect's own invoices, after first contact.

## Keep the standard current
- New customer outcome with permission → add it to `sales-engine/terrain-study/evidence.json`.
- Brand change → edit only `sales-engine/terrain-study/brand.json`, then re-run.
