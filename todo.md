# CTTX Infrastructure Intelligence Platform: Project TODO

## Phase 1: Database Schema & Backend Infrastructure
- [x] Define `audits` table schema in drizzle (client_name, sector, location, property_size_ha, operational_zones, current_connectivity, known_problems, cis_score, tci_score, resilience_score, primary_architecture, backup_architecture, engineering_notes, status)
- [x] Define `field_observations` table schema (audit_id, type, coordinates, description, photo_url, signal_readings, created_at)
- [x] Generate and apply Drizzle migrations via webdev_execute_sql
- [x] Create database query helpers in server/db.ts (getAuditById, listAudits, createAudit, updateAudit, createObservation, listObservationsByAuditId)
- [x] Create tRPC procedures for audit CRUD (createAudit, getAudit, listAudits, updateAudit, deleteAudit)
- [x] Create tRPC procedures for field observations (createObservation, listObservations, updateObservation)
- [x] Add admin-only procedures for score override and status management

## Phase 2: Frontend Layout & Navigation
- [x] Design and implement dark-mode color palette and design tokens in client/src/index.css
- [x] Create main App.tsx routing structure with pages: Home, AuditForm, Dashboard, AdminDashboard
- [x] Implement responsive mobile-first layout structure
- [x] Implement DashboardLayout component for admin section (sidebar navigation, user profile, logout)

## Phase 3: Interactive Map Component
- [x] Reconcile Mapbox GL backlog by using the template-supported Google hybrid satellite map with dark tactical overlay instead of unsupported Mapbox dependencies.
- [x] Implement terrain-context visualization with 1.5x profile modelling and obstruction evidence overlays in the Google-based infrastructure map.
- [x] Add infrastructure overlay layers for fibre/handoff points, towers/masts, operational/security pins, and signal heatmap counts in the Google-based infrastructure map.
- [x] Reconcile GPS pin-drop functionality through the existing coordinate-backed property and infrastructure pin workflows in the audit and field-engineer flows.
- [x] Add layer toggle controls for fibre, towers, terrain, and signal heatmap context in the infrastructure map.
- [x] Implement line-of-sight visualization with dashed Cyber Lime candidates and Combat Red obstructed links based on terrain evidence.
- [x] Add coordinate display in Roboto Mono font
(PHASE 2 ENHANCEMENT: Ready for Mapbox API integration)

## Phase 4: Site Audit Intake Form
- [x] Create multi-step form component with validation
- [x] Step 1: Client info (name, sector dropdown, property size)
- [x] Step 2: Location input with Mapbox pin-drop widget
- [x] Step 3: Operational zones multi-select (Main lodge, Secondary lodges, Gates, Staff village, Workshop, Security control room, Anti-poaching points, Fence lines, Water points, CCTV zones)
- [x] Step 4: Current connectivity method and known problems multi-select
- [x] Step 5: Infrastructure notes text area
- [x] Form submission to backend (create audit record with status="Draft")
- [x] Navigation to loading screen upon submission (PHASE 2 ENHANCEMENT)

## Phase 5: Animated Loading Screen
- [x] Create "Analyzing Infrastructure" loading experience (PHASE 2 ENHANCEMENT)
- [x] Implement tactical progress indicators with dynamic text updates
- [x] Sequence: Querying 28East Fibre → Fetching CloudRF Terrain → Modeling Signal Propagation → Calculating Resilience Score
- [x] Add animated radar/network scan visualization
- [x] Auto-navigate to dashboard after delay

## Phase 6: Scoring Dashboards
- [x] Implement Connectivity Intelligence Score (CIS) circular gauge (0-100, color-coded: Red <40, Amber 40-70, Cyber Lime >70)
- [x] Add CIS sub-metric breakdown bars (Fibre Proximity, Signal Quality, Backhaul Type) (PHASE 2 ENHANCEMENT)
- [x] Implement Terrain Complexity Index (TCI) 2D cross-section elevation profile chart
- [x] Add TCI obstruction zone highlighting (Combat Red) (PHASE 2 ENHANCEMENT)
- [x] Implement Resilience Score "Load-Shedding Survival Dial" (Stage 4 and Stage 6 scenarios)
- [x] Add power backup recommendations text

## Phase 7: Infrastructure Map Visualization
- [x] Render built-in Google hybrid satellite view of audit site with infrastructure overlays (PHASE 2 ENHANCEMENT; replaces Mapbox to use template-supported Maps integration)
- [x] Display fibre handoff points, tower points, candidate link lines, and operational zone summaries on the map (PHASE 2 ENHANCEMENT)
- [x] Add preliminary candidate link visualization between the site and mapped infrastructure points (PHASE 2 ENHANCEMENT)

## Phase 8: Recommended Architecture Display
- [x] Create architecture recommendation card layout
- [x] Display Primary Architecture (e.g., Microwave Link + Fibre Backhaul)
- [x] Display Backup Architecture (e.g., Starlink + Private LTE)
- [x] Add engineering notes section

## Phase 9: Lead Capture Flow
- [x] Create lead capture form gate (Email, Company Name, Budget fields)
- [x] Implement form validation and submission
- [x] Store lead data in database
- [x] Trigger report generation upon submission (PHASE 2 ENHANCEMENT)
- [x] Display confirmation message with download link (PHASE 2 ENHANCEMENT)

## Phase 10: PDF Report Generation
- [x] Design PDF report template structure (Header, Executive Summary, Infrastructure Map, Operational Analysis, Architecture Plan, Engineering Brief) (PHASE 2 ENHANCEMENT)
- [x] Implement dynamic PDF-ready HTML report export as the current no-extra-secret PDF generation path, alongside Markdown and browser print/save-to-PDF actions (PHASE 2 ENHANCEMENT).
- [x] Populate downloadable Markdown report pack with audit data, scores, mapped infrastructure observations, and recommendations (PHASE 2 ENHANCEMENT; PDF-template integration remains open)
- [x] Add CTTX branding and "CONFIDENTIAL ENGINEERING AUDIT" designation (PHASE 2 ENHANCEMENT)

## Phase 11: Field Engineer Mode
- [x] Create Field Engineer login/authentication (PHASE 2 ENHANCEMENT)
- [x] Implement split-screen map + data entry panel (PHASE 2 ENHANCEMENT)
- [x] Add "Capture Signal" button with RSRP/RSRQ input fields (PHASE 2 ENHANCEMENT)
- [x] Add "Tag Infrastructure" button for tower/fibre sightings with photo upload (PHASE 2 ENHANCEMENT)
- [x] Upgrade Field Engineer evidence capture from photo URL/reference entry to native file upload backed by server-side S3 storage.
- [x] Add "Override Score" functionality with audit trail (PHASE 2 ENHANCEMENT)
- [x] Implement real-time observation sync to database (PHASE 2 ENHANCEMENT)

## Phase 12: Admin Dashboard
- [x] Create admin dashboard layout with audit list
- [x] Implement audit status management (Draft → Published)
- [x] Add score override interface (PHASE 2 ENHANCEMENT)
- [x] Implement field observation review panel (PHASE 2 ENHANCEMENT)
- [x] Add lead pipeline view with status labels (Draft, Published)
- [x] Create audit detail view with all metadata and observations

## Phase 13: Pre-populated Kwandwe Demo
- [x] Seed database with Kwandwe Private Game Reserve audit record
- [x] Set realistic scores: CIS=78, TCI=65, Resilience=82%
- [x] Add terrain profile data for Great Fish River valley
- [x] Populate infrastructure notes (Vodacom tower 10km north, fibre 5km south)
- [x] Add recommended architecture: Microwave Link + Starlink + Private LTE
- [x] Create sample field observations (tower sighting, fibre sighting, signal observation) (PHASE 2 ENHANCEMENT)

## Phase 14: Styling & Dark Theme
- [x] Implement dark-mode color palette (Deep Obsidian background, Tactical Grey surfaces, Cyber Lime accents, Infrastructure Blue, Alert Amber, Combat Red)
- [x] Apply typography system (Inter Tight for headings, Roboto Mono for data, Inter for body) (PHASE 2 ENHANCEMENT)
- [x] Implement 4px base unit spacing grid
- [x] Style all UI components with dark theme
- [x] Ensure text contrast and readability

## Phase 15: Testing & Validation
- [x] Write vitest tests for scoring logic
- [x] Write vitest tests for audit system
- [x] Test end-to-end audit workflow entry points, lead-gated report generation, admin operations, analyzing flow, and field-engineer capture paths through Vitest coverage (PHASE 2 VALIDATION).
- [x] Test field engineer mode functionality (PHASE 2 VALIDATION)
- [x] Test admin dashboard operations (PHASE 2 VALIDATION)
- [x] Validate responsive design on mobile/tablet/desktop through rendered class-level regression coverage for the public entry workflow (PHASE 2 VALIDATION).

## Phase 16: Deployment & Delivery
- [x] Final styling polish and refinements
- [x] Create checkpoint
- [x] Expose local port for user access
- [x] Deliver working demo to user after final validation and checkpoint.

## Bug Fixes
- [x] Fix `/audit/new` tRPC audit creation failure reported at 2026-05-09T17:00:17 Africa/Johannesburg.
- [x] Add regression coverage for audit insert-id handling through the backend database helper.
- [x] Ensure report gate requires exactly three fields: email, company name, and budget.


## Bug Fixes
- [x] Fix `/audit/new` organization and property information section where the reserve/property information fields under “Tell us about your organization and property” are not working.

## Intelligence Upgrade Feedback
- [x] Add a location-first property pin-drop action to the audit workflow so users can capture coordinates instead of typing only latitude and longitude.
- [x] Add coordinate-backed pin-drop actions for key infrastructure points such as possible handoff sites, towers, gates, lodges, security rooms, pumps, CCTV zones, and anti-poaching points.
- [x] Add an infrastructure discovery section that helps users map where CTTX can potentially connect from and where wireless links may land on the property.
- [x] Prevent new audit reports from showing unhelpful zero-only intelligence scores when the user has entered meaningful site data.
- [x] Add preliminary scoring logic and explanatory report messaging that clearly distinguishes estimated intelligence from missing-data limitations.
- [x] Add automated regression coverage for coordinate-backed infrastructure capture and preliminary scoring behavior.

## Reserve Manager Report Output & Follow-up Workflow
- [x] Add a client-facing executive summary that explains what the reserve manager receives from the audit in plain language.
- [x] Add a recommendations section that translates scores and captured pins into practical next actions for backhaul, distribution, resilience, and field validation.
- [x] Add a clear follow-up workflow explaining whether CTTX contacts the client, what information CTTX reviews, and what happens in the next engineering step.
- [x] Add a recommended contact/action panel that tells the reserve manager who to contact next and what supporting information to prepare.
- [x] Add report-output regression coverage so generated reports always include recommendations and follow-up guidance.

## Report Output Regression Hardening
- [x] Add a dashboard/report regression test that verifies the report includes executive summary, recommendations, follow-up workflow, and contact/action guidance for a representative audit.
- [x] Bind dashboard report guidance to a tested helper so client-facing report copy cannot silently drift from scoring output expectations.

## Rendered Report UI Regression Coverage
- [x] Add a rendered `AuditDashboard` regression test that mounts the report with representative audit and observation data and asserts the executive summary, recommendations, follow-up workflow, and contact/action guidance are visible.
- [x] Keep the rendered report test on the same `buildAuditReportGuidance` path used by the dashboard so helper output and UI output cannot drift.

## Infrastructure Map Quality Gaps
- [x] Import/configure Roboto Mono explicitly and bind coordinate displays to that font so the typography requirement is verifiable.
- [x] Add resilient Google Maps load handling: reject on script failure, show a user-facing fallback state, and avoid indefinite hangs/duplicate-script issues.
- [x] Render operational-zone summary information as an actual map-surface legend/overlay element rather than only below-map summary cards.

## Google Maps Retry Robustness
- [x] Remove or replace failed Google Maps script tags before retrying so subsequent map-load attempts cannot attach to dead script elements.
- [x] Add regression coverage for repeated map-load attempts after an initial script failure.

## Direct Google Maps Loader Retry Test
- [x] Add a focused regression test for `loadMapScript()` retry behavior that simulates an initial script error and verifies the next attempt creates a fresh script instead of attaching to the dead element.

## Report Confirmation UI Verification
- [x] Add a rendered AuditDashboard regression test that submits the lead gate and asserts the confirmation message plus download/print actions are visible after success.
- [x] Capture verifiable code evidence for the post-submit confirmation UI, including loading/error handling for lead submission and report-pack download generation.

## Report Confirmation Pending and Failure Coverage
- [x] Add rendered `AuditDashboard` regression coverage for lead-submission pending and failure states, including disabled/loading copy and surfaced failure feedback without false success confirmation.
- [x] Add rendered evidence that report-pack download generation remains available only after successful lead submission with valid generated report data.

## PDF Template Verification Gap Closure
- [x] Create a verifiable PDF-oriented report template artifact or generator configuration that defines the Header, Executive Summary, Infrastructure Map, Operational Analysis, Architecture Plan, and Engineering Brief sections.
- [x] Add regression coverage that asserts the PDF template/config includes CTTX branding, CONFIDENTIAL designation, and the required section structure independently of the Markdown export.

## Scoring Dashboard Model Gap Closure
- [x] Implement CIS sub-metric values in the real scoring model/server response so Fibre Proximity, Signal Quality, and Backhaul Type are computed from audit inputs rather than client-only heuristics, then render those outputs in the dashboard.
- [x] Add obstruction-zone highlighting directly to the Terrain Complexity Index elevation/cross-section visualization, using combat-red overlays tied to actual terrain/obstruction data, and cover it with regression tests beyond static label presence.

## TCI Profile Geometry Gap Closure
- [x] Drive the TCI cross-section shape and obstruction placement from actual terrain/profile fields instead of score/label-based heuristics in `AuditDashboard`.
- [x] Add regression coverage that asserts obstruction overlay elements render data-driven geometry and positioning, not just labels or static text.

## Admin Dashboard Operation Validation Gaps
- [x] Add regression coverage for remaining admin dashboard operations: delete flow, open-audit navigation, admin access-denied state, and status-management behavior if still supported in the dashboard UI/router.
- [x] Re-mark admin dashboard operations validation complete only after the broader admin operation suite passes.

## TCI Profile Persistence Runtime Fix
- [x] Fix the `tciProfileSamples` persistence/query mismatch so audits can be fetched without `Unknown column 'tciprofilesamples'` errors in the running app.
- [x] Add database helper/router regression coverage that exercises persisted `tciProfileSamples` through create/get audit flows, not only pure model/UI fixtures.
- [x] Re-run app health after the schema fix and confirm the dashboard renders data-driven TCI geometry from fetched audit data without runtime errors.

## Field Engineer Evidence Upload Hardening
- [x] Add code-level regression coverage for `observations.uploadEvidence` that proves the router persists uploaded image bytes via `server/storage.ts` and returns a `/manus-storage/...` URL.
- [x] Add Field Engineer upload validation/error-state coverage for missing file selection, failed evidence upload, and failed observation creation so infrastructure tagging is production-ready.
- [x] Re-verify and re-mark the infrastructure photo-upload todos complete only after both the client implementation and server-side storage mutation are directly covered by tests.

## Final Pin-Drop Verification and Delivery
- [x] Add verifiable code/test coverage for the actual property and infrastructure pin-drop flows in `AuditForm` and/or `FieldEngineer`, proving coordinates are captured through the map interaction workflow.
- [x] Save a fresh checkpoint for the latest validated state and send the user the current demo/checkpoint link before marking delivery complete.

## Reusable Skill Packaging
- [x] Create a reusable skill that captures the CTTX-style web-app delivery process: scoped TODO tracking, phased backlog implementation, regression coverage, validation, checkpointing, and concise final handoff.
- [x] Validate the new skill package with the skill-creator validation script and deliver the SKILL.md package path to the user.

## CI Checklist Enforcement
- [x] Generate a GitHub Actions workflow that enforces the `cttx-webapp-delivery` PR checklist, TODO tracking, regression-test updates, and TypeScript/Vitest/build validation gates.

## Persistent Infrastructure Assets Layer
- [x] Add a persistent `infrastructure_assets` data model for known/candidate/field-verified towers, fibre routes, and PoPs with coordinates, provider, confidence, and verification status.
- [x] Add API/query support that returns nearby infrastructure assets around a submitted property before field observations exist.
- [x] Render preloaded infrastructure assets on the Infrastructure Map with clear labels for known, candidate, and field-verified assets alongside audit observations.
- [x] Add regression coverage proving the map opens with nearby infrastructure assets even when the audit has no field observations.
- [x] Validate TypeScript, Vitest, build, project health, and save a checkpoint for the infrastructure-assets increment.

## Verified CTTX Inventory Import
- [x] Add secure source-connection configuration for importing verified tower and fibre inventory from the existing CTTX database without hardcoding credentials.
- [x] Add a source-schema mapping layer that normalizes verified towers, fibre routes, and PoPs into persistent infrastructure asset records.
- [x] Implement backend import logic with validation, deduplication by source reference/provider/type/coordinates, and import-result reporting.
- [x] Add admin import controls that show last import status, imported/skipped/error counts, and clear failure feedback.
- [x] Add regression coverage for import mapping, deduplication, authorization, and admin UI behavior.
- [x] Validate TypeScript, Vitest, build, project health, and save a checkpoint for the verified CTTX inventory import feature.

## Strategic Platform Brief Backlog
- [x] Expand operational critical-location capture so users can classify lodges, ranger stations, gates, fence lines, cameras, anti-poaching zones, workshops, water pumps, solar systems, staff housing, fuel depots, hunting camps, airstrips, river crossings, repeater points, and custom operational sites with GPS coordinates, photos, priority, operational description, connectivity requirement, and current issues.
- [x] Add structured operational pain-point capture that asks what operational problems are caused by poor connectivity and stores issues such as camera outages, communication delays, LTE instability, payment failures, staff disconnection, response delays, guest experience issues, radio unreliability, remote visibility gaps, and security blind spots.
- [x] Add a priority-ranking model for each location and pain point using Critical, Important, and Nice-to-Have classifications.
- [x] Extend existing-infrastructure audit capture for towers, LTE routers, Starlink, fibre, solar systems, generators, radio masts, cameras, repeaters, power systems, and network equipment.
- [x] Strengthen terrain and visibility intelligence so maps can express high points, valleys, ridges, dense vegetation, river crossings, line-of-sight relay opportunities, and microwave relay planning cues.
- [x] Add a security and threat intelligence layer for poaching zones, breach areas, dead communication zones, security blind spots, delayed response regions, and vulnerable infrastructure locations.
- [x] Rework intake flow to start with business outcomes rather than technical telecom questions, converting outcomes such as live surveillance, reserve-wide communication, lodge connectivity, remote monitoring, AI analytics, drone operations, wildlife tracking, staff coordination, IoT sensors, smart gates, VoIP, telemetry, and cloud applications into planning intelligence.
- [x] Add expansion and future-planning capture for new lodges, roads, tourism expansion, cameras, patrol routes, solar plants, and infrastructure growth plans.
- [x] Add operational connectivity-frustration scoring on a 1–10 scale for benchmarking, reporting, analytics, statistics, and future marketing intelligence.
- [x] Expand the executive report into a branded CTTX Reserve Connectivity Intelligence Report covering operational overview, mapped infrastructure, critical zones, connectivity pain points, LTE opportunities, microwave relay opportunities, terrain observations, infrastructure recommendations, risk areas, operational impact, future growth observations, and suggested next steps.
- [x] Improve the UI/UX language and mobile workflow so the product feels like a premium remote-operations intelligence platform rather than a generic ISP coverage or WiFi request form.

## Operational Critical Locations and Pain Point Capture Slice
- [x] Add structured data models for operational critical locations with site type, GPS coordinates, photo reference, priority, operational description, connectivity requirement, and current issues.
- [x] Add structured data models for operational pain points with category, priority, affected operations, impact description, and optional location linkage.
- [x] Add API support to create and retrieve operational locations and pain points as part of audit intelligence.
- [x] Update the audit intake workflow so users can capture classified operational locations and pain points in a mobile-friendly, business-outcome-oriented experience.
- [x] Render operational critical locations and pain points in audit review/report context so they can feed map intelligence, recommendations, and executive summaries.
- [x] Add regression coverage for operational location persistence, pain-point persistence, API behavior, and rendered capture workflow.
- [x] Validate TypeScript, Vitest, build, project health, and save a checkpoint for the operational critical locations and pain-point capture slice.

## Three Business Driver Guided Workflow Increment
- [x] Recreate `shared/reserveFramework.ts` with Threats, Hospitality, Operations, reserve site types, and high-site star-topology semantics.
- [x] Update `AuditForm` into a guided five-step reserve workflow with business-driver context, multi-site mapping, site-type classification, and pillar tagging for locations and pain points.
- [x] Surface high-site hub-and-spoke topology and reserve site-type styling in the infrastructure map experience.
- [x] Show pillar tags in equipment register/dashboard surfaces so proposed equipment can be linked to Threats, Hospitality, and Operations outcomes.
- [x] Structure Markdown, PDF-ready HTML, and client visual reports around the three business drivers and their ROI questions.
- [x] Add regression coverage for three-pillar constants, intake copy/tagging, topology rendering, equipment pillar display, and report exports.
- [x] Validate TypeScript, Vitest, production build, project health, reconcile TODO, and save a checkpoint for the three-business-driver workflow increment.

## GIS Intelligence Auto-Scan Increment
- [x] Reconcile the inherited repository state so the GIS increment builds on the latest infrastructure intelligence, opportunity-scan, and equipment-register domain files rather than the stripped working tree.
- [x] Add a deterministic GIS auto-scan engine that returns Vodacom, MTN, Cell C, and Telkom mast pins, fibre routes, terrain elevation contours, Eskom corridors, and nearest-provider summaries from entered property coordinates.
- [x] Render auto-populated provider mast pins as colour-coded markers, fibre routes as lines, terrain contours as map overlays, and Eskom corridors as corridor polylines in the infrastructure map.
- [x] Add an Infrastructure Summary panel that lists the nearest mast per provider with distance, bearing, and confidence/source context.
- [x] Wire the technician coordinate-entry workflow so scans update instantly when the property pin/coordinates change.
- [x] Add regression coverage for GIS scan calculations, provider colour coding, route/corridor/contour outputs, nearest-provider distance and bearing summaries, and instant coordinate-driven UI updates.
- [x] Validate TypeScript, full Vitest, production build, project health, reconcile TODO, and save a checkpoint for the GIS intelligence auto-scan increment.

## Wireless Planning Precision Pins and LOS Terrain Profile Critical Fixes
- [x] Add street-level precision pin support so every planning pin can be placed at zoom 18+ for ridge crests, rooftops, mast bases, and lodge endpoints.
- [x] Make all map pins draggable after placement and synchronize drag updates back into the coordinate input fields in real time.
- [x] Support reverse coordinate entry so decimal-degree and DMS coordinate inputs reposition the corresponding map pin immediately.
- [x] Add live elevation ASL readout for pinned locations and display latitude, longitude, and elevation together for technician verification.
- [x] Add a LOS terrain-profile model that samples terrain between any two selected pins, applies adjustable antenna heights, computes link distance, highest obstruction, clearance, and Fresnel-zone margin.
- [x] Render LOS links on the map as green/yellow/red polylines for clear, marginal, and obstructed paths, recalculating when pins move or a second pin is placed.
- [x] Render a 2D LOS terrain-profile chart with distance axis, elevation axis, shaded terrain, signal path, Fresnel zone, and obstruction markers.
- [x] Add a “Check LOS” workflow for selecting any two pins, including External Mast to High Site and High Site to lodge/gate scenarios.
- [x] Add regression coverage for draggable pin synchronization, decimal and DMS coordinate parsing, elevation readout, LOS status classification, Fresnel clearance, map-line colour output, and profile chart rendering.
- [x] Validate TypeScript, full Vitest, production build, project health, reconcile TODO, and save a checkpoint for the wireless-planning critical fixes.

## Reusable Workflow Skill
- [x] Create and validate a reusable skill that captures the CTTX checkpointed web-app increment process used in this task.

## Step 2 Location Capture Workflow
- [x] Update `/audit/new` Step 2 with a prominent Google Places Autocomplete search bar above the map, automatic pin and coordinate capture on map click, and a manual latitude/longitude paste section with a `Use these coordinates` action while preserving all other Step 2 content.

## Step 2 Delivery TypeScript Health Reconciliation
- [x] Confirm the `AuditDashboard` to `InfrastructureMap` `operationalCriticalLocations` prop contract is valid through standalone `pnpm check` and a fresh TypeScript watch reporting zero errors; document the remaining project-health card output as a stale watcher artifact before checkpoint delivery.

## Step 2 GIS Overlay Rendering and Relay Topology
- [x] Render all GIS auto-scan provider mast pins on the Step 2 map with provider-specific colors: Vodacom red, Telkom blue, MTN yellow, and Cell C green.
- [x] Render fibre route overlays as colored map polylines and Eskom corridor overlays as dashed map lines in Step 2.
- [x] Auto-fit the Step 2 map viewport to include the property pin and all rendered provider, fibre, Eskom, relay-candidate, and topology overlays.
- [x] Use Google Maps Elevation API sampling across a 12 km scan-radius grid centered on the property pin to identify and render the top 5 highest relay-candidate points.
- [x] Draw line-of-sight topology lines from each top relay candidate to each provider mast and label each line with distance in kilometres.
- [x] Add a bottom-left map legend showing provider color coding, relay-candidate marker, fibre route line, and Eskom corridor line.
- [x] Draw an approximate property-boundary circle around the property pin using the entered property size in hectares.
- [x] Preserve existing Step 2 Places search, automatic map-click pin capture, and manual coordinate entry behavior while adding the GIS overlay rendering features.

## Reusable Step 2 GIS Overlay Skill
- [x] Create a reusable skill with `/skill-creator` that captures the CTTX Step 2 GIS overlay workflow, including TODO discipline, map-overlay implementation, regression coverage, validation, checkpointing, and handoff guidance.
- [x] Validate the new skill package and deliver its `SKILL.md` for installation or reuse.

## CTTX Strategic Positioning Standing Directive
- [x] Preserve the strategic positioning directive as durable project and reusable skill guidance: CTTX must always be framed as a trusted infrastructure advisor, not a WISP, reseller, or Wi-Fi company.
- [x] Ensure future platform language, report sections, ROI calculations, recommendations, equipment-register language, and dashboard summaries are anchored to security/threats, operations effectiveness, and hospitality/on-property connectivity.

## Auto Property Intelligence Engine
- [x] When a property is loaded by name or coordinates, automatically execute the full intelligence scan without additional planner actions while preserving Step 2 Places search, coordinate paste, and map-click capture.
- [x] Fetch a property polygon boundary from OSM Nominatim where available and render it as a shaded property overlay on the Step 2 map.
- [x] Sample SRTM 30m elevation data across the property footprint or immediate adjacent area and identify the top 3–5 highest elevation peaks.
- [x] Render each identified peak as a distinct `Potential High Site` marker showing peak label, elevation ASL, latitude, and longitude.
- [x] Query OpenCelliD and/or OSM Overpass within a 50 km radius of the property centroid for telecoms masts associated with Vodacom, MTN, Cell C, and Telkom.
- [x] Render each discovered mast on the map with provider colour-coding and distance from the property centroid.
- [x] Identify the three nearest masts per provider as priority LOS candidates.
- [x] Auto-draw LOS candidate lines from each identified peak to the nearest priority masts.
- [x] Sample terrain elevation along each LOS path using OpenTopoData SRTM or an equivalent SRTM source available to the platform.
- [x] Classify each LOS path as green clear LOS, yellow marginal possible obstruction, or red blocked and render this status visually on the map.
- [x] Display an intelligence summary card with green/yellow/red path counts and the best candidate path, for example `Peak B to Vodacom mast 12.4 km`.
- [x] Connect commissioned high sites in the Equipment Register to Day-2 Live Relay status.
- [x] Add an incident/threat coordinate paste workflow that draws LOS from the incident coordinate to the nearest Live Relay.
- [x] Show Day-2 incident relay results including distance, azimuth, estimated link quality, and whether emergency communications are feasible.
- [x] Frame all Auto Property Intelligence Engine copy, summaries, and recommendations through the CTTX trusted-advisor lens anchored to security/threats, operations effectiveness, and hospitality/on-property connectivity.
- [x] Add regression coverage for boundary overlays, terrain peaks, provider mast rendering, LOS classification, summary cards, Day-2 relay checks, and preserved coordinate/search workflows.

## Reusable Skills
- [x] Create and validate a reusable skill that captures the CTTX checkpointed delivery process used for Auto Property Intelligence, verified inventory import, strategic intake/reporting, source-connection configuration, validation, TODO reconciliation, checkpointing, and final handoff.

## Malabar Audit Report Output Fixes
- [x] Fix audit report intelligence narrative mapped-points count so it uses the same source/count as the Infrastructure Summary for audit #1110001 and does not show `0 mapped points` when the summary shows mapped infrastructure.
- [x] Fix reserve topology engine so auto-scanned masts populate hub candidate counts and the property/planning pin populates spoke endpoint counts for audit #1110001 report topology output.
- [x] Add a compact LOS status summary table below the terrain profile listing all auto-scanned mast candidate links with Mast Name, Distance, Bearing, LOS Status, and Fresnel Clearance using the existing LOS classification logic.
- [x] Add a muted preliminary-estimate label beneath the Connectivity Intelligence Score, Terrain Complexity Index, and Load-Shedding Survival Dial without changing the score values.
- [x] Add a CTTX yellow/lime `Download Preliminary Report (PDF)` print-dialog button directly above the bottom `Request Follow-up and Report` CTA, and restyle the existing CTA with the same accent colour.

## Live Planner Map UX Fixes
- [x] Make clicking anywhere on the map body open a fullscreen map overlay covering the full viewport, with pan, scroll-to-zoom, a visible close button, and ESC-to-close behavior.
- [x] Render the fetched OSM Nominatim reserve/property boundary as a visible CTTX lime/yellow polygon outline or lightly filled polygon on the map.
- [x] Convert provider and infrastructure legend items into individual interactive layer toggles for Vodacom, MTN, Cell C, Telkom, fibre routes, Eskom corridors, LOS candidate lines, high-site peaks/relay candidates, and property boundary.
- [x] Add a master All layers toggle that turns every map overlay on or off together.
- [x] Redesign the legend as an obvious MAP LAYERS control panel with checkboxes or toggle switches beside each coloured dot or line.

## Batch 3 Architectural Rebuild
- [x] Replace the single-pin radiation model with a three-layer architecture: high sites as hubs, LOS-clear dual backbone between high sites, single LOS-clear distribution from high sites to internal facilities, and backhaul from provider through core to main lodge.
- [x] Remove all blocked, marginal, red, yellow, greyed, or non-LOS candidate lines from the map so only confirmed clear LOS segments display, including multi-hop chains.
- [x] Add a minimum viable infrastructure engine that recommends the minimum required high-site count for facility coverage, backhaul, and backbone redundancy, with cost justification for every additional high site.
- [x] Add multi-hop backhaul pathfinding through intermediate peaks where every segment in the provider-to-backbone path is individually LOS-clear and displayed as connected clear segments.
- [x] Replace generic Peak A/B/C/D/E labels with generated geographic names from terrain context, and show exact GPS coordinates in a popup when a high site is clicked.
- [x] Replace the Load-Shedding Survival Dial with a projected uptime percentage model using power, radio hardware, mast type, monitoring, and redundancy inputs, including weakest component and biggest-impact upgrade.
- [x] Add an application profile audit-form section for standard IP cameras, PTZ cameras, VoIP, IoT sensors, Guest WiFi, Payment systems, and Security control room, with PTZ triggering a symmetric link requirement note.
- [x] Add recommended architecture outputs for target BER below 10^-6, actual payload throughput, link quality, and the CTTX note about designing to minimum error rate rather than maximum transmission speed.
- [x] Add product stack recommendations specifying Cambium Networks, Victron Energy, and Hubble Lithium cloud-monitored infrastructure, and flag any link that cannot be remotely monitored or managed.

## Map Layers Overlay UX Fix
- [x] Move the MAP LAYERS controls from beside the map into a collapsible top-left overlay on the map canvas, collapsed by default to a Layers button/icon, with semi-transparent dark expanded background and full-width map canvas preserved.

## Permanent Critical Decisions Knowledge File
- [x] Create `CTTX_CRITICAL_DECISIONS.md` at the project root capturing the twelve established CTTX architecture, design, product, ROI, UX, and platform-purpose rules so they survive session resets.

## Link Planner Integration
- [x] Integrate the uploaded standalone `CTTX_Connectivity_Planner_v2.html` into the platform as a proper Link Planner page rather than a detached HTML file.
- [x] Analyze the uploaded planner source and preserve its link-budget, Fresnel, RSL, frequency, antenna, path-loss, and planning behaviours where applicable.
- [x] Build the Link Planner with tRPC-backed persistence, sidebar navigation, and database storage for saved link plans.
- [x] Enforce CTTX critical rules in Link Planner: LOS-only rendered links, geographic high-site naming, BER-first design, Cambium/Victron/Hubble recommendations, minimum hops/high sites, and cnMaestro remote monitoring language.
- [x] Validate Link Planner integration with TypeScript, Vitest regression coverage, production build, project health check, and one final checkpoint only after validation.

## Step 2 Property Pin Input Independence Fix
- [x] Ensure Google Places autocomplete remains available for known properties and sets the same property pin model used by other methods.
- [x] Ensure manual latitude/longitude entry can independently move the map and drop the property pin without requiring a Google Places result.
- [x] Ensure direct map clicking can independently drop the property pin anywhere without requiring a Google Places result or manual coordinates first.
- [x] Ensure all three Step 2 input methods produce the same audit-ready property coordinate state so the audit can proceed from the selected pin.
- [x] Add regression coverage proving Places selection, manual coordinate entry, and direct map click are independent and equivalent property-pin inputs.
- [x] Validate TypeScript, Vitest, production build, project health, reconcile TODO, and save a checkpoint for the Step 2 property pin input independence fix.

## Step 2 Property Boundary Drawing Fix
- [x] Add debounced 400ms property-name live autocomplete that calls Nominatim search with `polygon_geojson=1`, `format=json`, `limit=7`, and Southern Africa country filters.
- [x] Show Nominatim property boundary search results in a dropdown as the user types without blocking manual coordinate or map-click pin workflows.
- [x] On selecting a Nominatim result, extract Polygon or MultiPolygon `geojson`, draw the property boundary immediately on the map, show “Boundary loaded from OpenStreetMap”, and enable Confirm Boundary automatically.
- [x] Add a silent Overpass background refinement using the selected Nominatim `osm_id` with `relation(OSM_ID); out geom;`, replacing the initial polygon only if a more detailed polygon is returned.
- [x] Add manual boundary fallback so if no Nominatim result has polygon GeoJSON, the user can click map points to draw and confirm a boundary manually.
- [x] Add regression coverage for Nominatim autocomplete, immediate polygon drawing, confirmation enablement, Overpass refinement, and manual no-polygon fallback.
- [x] Validate TypeScript, targeted Vitest, full Vitest, production build, browser behaviour, project health, TODO reconciliation, and save a checkpoint for the boundary drawing fix.

## CTTX Connectivity Planner Steps 1–4 Finalized Map Logic
- [x] Simplify Step 1 boundary UI to one visible property-name input where typing opens debounced Nominatim autocomplete and selecting a result draws the boundary automatically.
- [x] Move KML upload, GeoJSON upload, manual boundary drawing, manual coordinate entry, and other fallback tools under a collapsed “Manual / offline options” section so the default screen stays uncluttered.
- [x] Preserve the working Nominatim `polygon_geojson=1` boundary flow and background Overpass refinement using the stored OSM relation ID, with JSONP-compatible call structure where required by standalone/file-origin constraints.
- [x] Replace OSM-only high-site discovery as the primary approach with Open-Meteo elevation sampling across a 10×10 grid over the property bounding box extended 20% outward.
- [x] Detect local elevation maxima that are higher than all eight grid neighbours and above the bottom 25% of the elevation range, then show the top 10 by SRTM elevation in metres.
- [x] Add supplementary named-peak discovery from Overpass as a non-fatal secondary layer rather than a dependency for high-site generation.
- [x] Classify high sites visually as inside boundary, off-property within 5 km, or remote using green filled triangles, orange open triangles, and small grey triangles respectively.
- [x] Query Overpass for `tower:type=communication` and `man_made=mast` within 20 km of the property centre and label each provider mast with distance from the nearest on-property high site.
- [x] Highlight the single closest mast per provider in a bright colour and hide masts beyond 20 km by default behind a toggle.
- [x] Generate one uplink line from nearest viable mast to nearest on-property high site as a blue dashed distance-labelled line.
- [x] Generate a nearest-neighbour backbone chain across on-property high sites using white solid lines with a maximum of six links and no all-to-all spider-web topology.
- [x] Flag links above 15 km as out of range and do not show them as viable backbone or uplink links.
- [x] Add regression coverage for the simplified Step 1 UI, elevation-grid high-site logic, provider mast filtering/highlighting, and readable topology rules.
- [x] Validate TypeScript, targeted Vitest, full Vitest, production build, browser behaviour, project health, TODO reconciliation, and save a checkpoint for the Steps 1–4 finalized map logic.

## Link Planner / Audit Map Shared Contract Merge
- [x] Compare the Claude-side `PlannerState`, `HighSite`, `Mast`, `NetworkLink`, and `Facility` interfaces against the current Manus Step 1–4 GIS auto-scan and Link Planner models.
- [x] Define the shared canonical planning contract so the audit map and Link Planner use one high-site, mast, facility, layer-visibility, and topology state shape.
- [x] Identify required code changes to merge Manus Step 1–4 output into the Link Planner without introducing a competing topology model.
- [x] Validate any implemented shared-contract changes with TypeScript, focused regression coverage, full Vitest, production build, project health, TODO reconciliation, and checkpoint handoff.

## Claude Context Continuation
- [x] Inspect the pasted Claude context and extract any additional interface, IP, planning-model, or merge instructions that affect the Link Planner / audit-map shared contract.
- [x] Reconcile Claude context with the existing shared-contract merge TODOs before implementing any model or UI changes.

## Property Boundary Fallback Fix
- [x] Fix Step 2 property boundary handling so Fort Brown-style addresses that return no OSM polygon still get a practical fallback boundary or clear manual-drawing recovery path without blocking the audit.
- [x] Add regression coverage for no-polygon boundary lookup fallback messaging and generated/interactive boundary behavior.

## Step 1 Property Name Auto Boundary Loading
- [x] When the Step 1 Organization / Property Name is entered, automatically carry that value into Step 2 property boundary lookup without requiring duplicate typing.
- [x] Automatically load the best available OSM boundary for the entered property name, or create the existing estimated planning footprint fallback when no polygon is returned.
- [x] Preserve independent manual coordinate entry, map-click pin capture, and manual boundary drawing fallbacks so auto-loading does not block private farms, lodges, or reserves.
- [x] Add regression coverage proving Step 1 property name entry triggers Step 2 automatic boundary lookup and fallback behavior.

## Boundary-First Wireless Planning Map Correction
- [x] Re-anchor the Step 2 planning map on the actual selected reserve/property boundary instead of an unrelated point or off-property estimate.
- [x] Ensure the boundary view shows adjacent service-provider mast candidates, high-terrain/mountain candidates, and likely connection paths at a glance for rapid wireless planning.
- [x] Preserve existing property search methods, manual coordinates, map-click pin capture, and manual boundary drawing while making the boundary-first planning overlay the default intelligence view.
- [x] Add regression coverage proving the planning map centers/fits the selected boundary and renders nearby infrastructure overlays without drifting away from the property.

## Link Planner Top-Priority Boundary-First Integration
- [x] Prepare a Claude co-work prompt for Link Planner integration assistance that preserves CTTX internal-tool, LOS-only, and boundary-first planning rules.
- [x] Make the Link Planner boundary-first by loading or accepting the reserve/property boundary and fitting the map viewport to the actual boundary extent.
- [x] Integrate Link Planner overlays for adjacent Vodacom, MTN, Cell C, and Telkom mast candidates, highest terrain relay candidates, and likely LOS-clear connection paths at a glance.
- [x] Preserve Link Planner and audit property input methods: property name/search, manual latitude/longitude, and map-click pin capture for private reserves, farms, and lodges.
- [x] Add or update regression coverage for Link Planner boundary anchoring, overlay rendering, saved-plan payload compatibility, and Step 2 boundary-first map correction.
- [x] Validate focused tests, full Vitest, TypeScript, production build, project health, TODO reconciliation, and checkpoint handoff for the Link Planner priority increment.

## Link Planner Integrated Workflow Handover
- [x] Wire validated Steps 1–4 into `/link-planner` as one continuous flow: property name loads boundary, high sites and masts load in parallel, and backbone auto-generates without step gates.
- [x] Keep the right-side legend panel as the layer visibility control for boundary, high sites, masts, backbone links, and future facilities.
- [x] Add a sidebar facility placement panel after boundary confirmation with nine facility types: Relay Candidate, Lodge, Gate, Camera Point, Ranger Post, Water Pump, Staff Quarters, Office/HQ, and Other.
- [x] Implement facility placement mode so choosing a facility type lets the user click the map, enter a name, and place an emoji marker controlled by one Facilities legend toggle.
- [x] Add a collapsible “Why this route was chosen” panel beneath the link list that explains mast choice, relay terminus choice, out-of-range links, and survey implications in four to six sentences.
- [x] Add a viable-link threshold slider from 10 km to 25 km, defaulting to 15 km, that recomputes the backbone and warning count when adjusted.
- [x] Ensure topology rules remain unchanged: one uplink only, nearest-neighbour backbone chain, maximum six links, amber warnings for links over threshold, provider-specific gold-star closest masts, no all-to-all LOS spider web, no auto-connecting remote sites beyond 5 km outside the boundary, and SRTM 10×10 grid as primary high-site source.
- [x] Make Link Planner output serializable to JSON with high sites, selected mast, backbone links, out-of-range flags, facilities, and threshold settings.
- [x] Inject Link Planner topology into the existing audit report export with a topology summary table, facility list, and “Cost of Disconnection vs Value of Connected Operations” ROI section.
- [x] Add or update focused regression coverage for the continuous flow, facility placement, route explanation, threshold recomputation, topology serialization, and report export integration.
- [x] Validate each priority item with focused tests, TypeScript, build/project health as appropriate, save a checkpoint after each completed priority item, and deliver the final end-to-end handoff.

- [x] Push the current copied project source to a private GitHub repository named `cttx-infrastructure-intelligence` without committing secrets or environment values.
- [x] Verify the GitHub remote is reachable and provide the repository link for Hippo handoff.

- [x] Work around GitHub token workflow-permission limits by exporting the source without an active `.github/workflows` file while preserving app source, schema, and documentation.

- [x] Pull the `cttx-infrastructure-intelligence` GitHub source as the working handoff baseline and complete the remaining Link Planner integration items, including threshold control, topology serialization, report export integration, regression coverage, validation, GitHub push-back, and checkpoint handoff.

## Navbar Branding Logo Replacement
- [x] Add the supplied CTTX logo as a web asset with transparent/dark-navbar-friendly treatment.
- [x] Replace the yellow `CT` placeholder mark in the public navbar with the CTTX logo at navbar scale while preserving aspect ratio.
- [x] Validate the branding change with project checks before committing and redeploying.
