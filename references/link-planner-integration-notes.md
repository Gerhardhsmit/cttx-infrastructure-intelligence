# Link Planner Integration Notes

## Uploaded Source

The uploaded `CTTX_Connectivity_Planner_v2.html` is a four-step standalone planner using Leaflet and Overpass API. It supports property boundary lookup or manual drawing, high-site discovery from OSM `natural=peak` and `natural=hill`, provider mast discovery from OSM mast/tower tags, selected backhaul mast choice, automatic backbone proposal, manual link addition, live-link toggling, total-distance reporting, and HTML report export.

## Behaviours to Preserve

The native implementation should preserve the operator workflow, but use the platform-approved React, Google Maps, tRPC, and database stack instead of embedding the standalone HTML. The preserved behaviours are: named property and fallback coordinates; boundary polygon entry; area and centroid calculation; high-site categorisation as on-property, nearby, or remote; provider mast categorisation by Vodacom, MTN, Cell C, Telkom, or unknown; selectable mast list with distance sorting; proposed uplink/backbone/manual links; link live/proposed status; total and live distance metrics; reset/new-plan workflow; and report-ready ROI language.

## CTTX Rules to Enforce

The planner must not show blocked, marginal, speculative, or unknown LOS links as visible map lines. Each visible link will therefore carry `losStatus: "clear"` and an engineering notice that final RF/terrain validation is required before construction. Link output should frame the model as Backbone, Distribution, and Backhaul rather than generic internet connectivity. High-site names should use geographic labels from source data or sensible local directional names, avoiding user-facing labels such as Peak A or Node 1. Recommendations must reference Cambium Networks, cnMaestro, Victron Energy, and Hubble Lithium as the standard cloud-monitorable stack. Planning text should emphasize BER-first design, actual payload throughput, minimum viable high sites/hops, 98–99% availability modelling, and operational risk/ROI.

## Target Platform Mapping

A new `/link-planner` internal page should be wrapped by `DashboardLayout` and added to sidebar navigation. Persistence should use a `linkPlans` table with JSON columns for boundary polygon, high sites, provider masts, links, assumptions, and recommendation summary, plus scalar fields for property name, centre coordinate, area, selected mast, total distance, live distance, status, and owner user id. tRPC should expose protected `create`, `update`, `getById`, and `list` procedures. The frontend should calculate deterministic geometry locally for instant planning feedback and persist the full plan through tRPC.
