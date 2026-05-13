# Claude Co-Work Prompt: CTTX Link Planner Boundary-First Integration

You are assisting with the **CTTX Infrastructure Intelligence** web application. Treat this as an internal CTTX operational intelligence tool, not a public marketing site, not a WISP ordering flow, and not a generic Wi-Fi quote form. The immediate priority is to develop the **Link Planner** into a boundary-first wireless planning workflow that shares the same canonical planning contract as the audit map.

## Working Context

The current project path is `/home/ubuntu/cttx-infrastructure-intelligence`. The main implementation surface is `client/src/pages/LinkPlanner.tsx`, with canonical shared types and GIS adapter helpers in `client/src/lib/plannerTypes.ts`. The Link Planner currently builds `PlannerState` from a coordinate-seeded `buildGisAutoScan()` call, renders Google Maps overlays imperatively, persists link plans through `trpc.linkPlans.create/update`, and stores the serialized `plannerState` in the saved-plan assumptions payload.

The highest priority is to make the planner **boundary-first**. The map should be anchored on the actual selected reserve/property boundary wherever possible, not an unrelated centroid, off-property fallback, or generic coordinate estimate. At a glance, the planner must show the boundary, adjacent provider mast candidates, high-terrain relay candidates, and likely LOS-clear topology paths.

## Non-Negotiable CTTX Product Rules

The Link Planner must preserve the established CTTX decisions. CTTX is a trusted infrastructure advisor focused on security/threats, operations effectiveness, and hospitality/on-property connectivity. Do not position CTTX as a WISP, ISP reseller, generic internet provider, or Wi-Fi company.

Only **clear LOS** links should be rendered as viable map paths. Do not render blocked, marginal, red, yellow, greyed, speculative, or all-to-all spider-web links as candidate architecture. The planner must continue using a minimum viable topology model: one earned uplink, nearest-neighbour backbone, and only justified high sites or hops.

The planner language should stay BER-first and infrastructure-grade. It should reference Cambium Networks radios, cnMaestro remote visibility, Victron Energy power architecture, and Hubble Lithium storage as planning assumptions where product stack language is needed.

## Canonical Contract to Preserve

Do not introduce a competing topology model. Reuse `PlannerState` from `client/src/lib/plannerTypes.ts`, including these concepts: `propertyCentre`, `boundaryPolygon`, `boundaryAreaHa`, `highSites`, `masts`, `selectedMastIndex`, `links`, `facilities`, `layerVis`, and `recommendationSummary`.

The Link Planner currently saves through the existing tRPC router payload shape: scalar plan fields, `boundary`, `highSites`, `providerMasts`, `links`, and `assumptions.plannerState`. Any suggested change should preserve backward compatibility with this payload unless a migration and test update are explicitly included.

## Requested Claude Assistance

Please review or propose implementation changes for the Link Planner with the following goals.

| Goal | Expected Direction | Guardrail |
|---|---|---|
| Boundary-first anchoring | Add property boundary search/loading or accept a boundary from the audit flow, then fit the Google Maps viewport to the boundary polygon extent using `LatLngBounds`. | Do not rely only on `map.panTo(center)` when a boundary polygon exists. |
| Overlay intelligence | Ensure adjacent Vodacom, MTN, Cell C, and Telkom masts, high-terrain relay candidates, and LOS-clear topology paths are visible at a glance. | Do not show blocked or marginal links as planned architecture. |
| Input preservation | Keep property name/search, manual latitude/longitude, and map-click pin capture available for private farms, reserves, and lodges where OSM boundaries may be incomplete. | Do not make a Places or OSM result mandatory. |
| Shared model alignment | Use `buildPlannerStateFromGisScan()` and `PlannerState` rather than inventing separate high-site, mast, facility, or link interfaces. | Any adapter changes belong in `plannerTypes.ts` or GIS helpers, not ad hoc local-only state. |
| Persistence safety | Preserve `linkPlans.create/update` compatibility and saved-plan restore expectations. | Do not change the backend payload shape without tests and migration analysis. |
| Regression coverage | Add focused Vitest coverage for Link Planner boundary anchoring, overlay rendering, and save payload compatibility. Also keep Step 2 audit-map boundary-fit behavior covered. | Browser visual inspection does not replace Vitest coverage. |

## Current Observations

`LinkPlanner.tsx` creates planner state with `createPlannerState(propertyName, centre, selectedMastId, previous)` and currently calls `mapRef.current?.panTo(center)` after rebuilding. Overlay rendering already creates a property `Polygon`, LOS `Polyline` objects, high-site `Marker` objects, mast `Marker` objects, and facility markers. This means a likely first fix is to add a reusable `fitMapToPlannerState(map, plannerState)` helper that extends bounds from `boundaryPolygon` first, then visible high sites, masts, links, and facilities as needed, and call it after map readiness and whenever a planner state rebuild completes.

`plannerTypes.ts` already derives `boundaryPolygon` from `scan.propertyBoundary.polygon` and estimates `boundaryAreaHa`. If richer selected boundaries from OSM/Nominatim or the audit workflow become available, the preferred approach is to feed them into the canonical scan-to-planner adapter or create a narrow adapter extension that overrides the scan boundary while preserving the rest of the contract.

`AuditForm.pin-drop.test.tsx` already mocks `LatLngBounds`, `fitBounds`, map overlays, provider markers, property boundary polygons, and high-site markers. Use that style for any Step 2 boundary-first regression. If adding Link Planner frontend tests, mock `MapView`, `trpc.linkPlans`, and Google Maps constructors similarly.

## Desired Output From Claude

Please return a concise implementation plan with the specific files to edit, the exact helper functions or components to add, and the regression tests to write. If you propose code, keep it aligned with the current TypeScript/React/tRPC stack and avoid external dependencies. The strongest response will identify the smallest safe change that makes the Link Planner boundary-first while preserving persistence and shared-contract compatibility.
