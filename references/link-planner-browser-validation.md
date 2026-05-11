# Link Planner Browser Validation Notes

The `/link-planner` route was opened successfully in the running CTTX preview on May 11, 2026. The page rendered inside the authenticated CTTX Console sidebar with the **Link Planner** navigation item selected.

The visible page includes the native **LOS Link Planner** panel, editable plan/property/coordinate/property-size controls, a preferred backhaul mast selector, refresh and save actions, satellite Google Maps surface, metric cards for visible LOS links, live distance, weakest fade margin, and cnMaestro monitoring. The extracted page content confirms the high-site candidate list, provider mast list, saved-plan area, LOS-only link budget table, and recommendation text are present.

The initial deterministic plan rendered four clear LOS paths: one backhaul, two backbone links, and one distribution link. The table includes distance, bearing, RSL, fade margin, Fresnel clearance, payload throughput, and live/proposed status. The recommendation text explicitly preserves the required CTTX stack and rules: Cambium Networks, cnMaestro remote monitoring, Victron Energy, Hubble Lithium, BER target of ≤ 10⁻⁶, payload throughput, and field-confirmed LOS before installation.

A live Save action was clicked. The saved-plan panel updated immediately with `CTTX LOS Backbone Draft — Kwandwe Ridge Trial Property · Ready for Field Validation`, confirming that the tRPC persistence flow and database-backed saved-plan listing are operational in the preview.

Screenshots captured by the browser tooling:

- `/home/ubuntu/screenshots/3000-igr61xkuzzeqown_2026-05-11_04-25-01_4947.webp`
- `/home/ubuntu/screenshots/3000-igr61xkuzzeqown_2026-05-11_04-25-17_7072.webp`
