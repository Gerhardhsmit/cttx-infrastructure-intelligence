# CTTX Critical Decisions

**Document purpose:** This file is the permanent project knowledge record for the CTTX Infrastructure Intelligence platform. It captures the architectural decisions, design principles, product rules, sales framing, and UX constraints established to date so future sessions, contributors, and implementation passes preserve the same operating logic.

**Status:** Canonical project decision record. Treat this document as source-of-truth guidance unless the business owner explicitly supersedes it.

**Last updated:** 2026-05-10

## 1. Network Architecture

The CTTX reserve, farm, and mine planning model uses a **three-layer network architecture**: **Backbone → Distribution → Backhaul**. High sites are the network hubs, not decorative terrain markers. The **main lodge is the primary distribution hub** because it is typically the operational, hospitality, and management centre of the property.

The canonical traffic and topology flow is **provider mast → backbone high site → main lodge → all other facilities**. The provider mast should feed the backbone through one or more LOS-clear hops. The backbone high site then feeds the main lodge, and the main lodge distributes service to lodges, gates, staff compounds, operations facilities, camera points, telemetry sites, and other internal endpoints.

| Layer | Primary role | Link rule | Redundancy rule |
|---|---|---|---|
| **Backbone** | Connect provider-side access into the core high-site network and main lodge path. | LOS-clear high-capacity links only. | **Dual redundant links are allowed here only** when justified by coverage and uptime requirements. |
| **Distribution** | Connect main lodge and high-site hubs to internal facilities. | Single LOS-clear links to facilities. | No routine dual-link redundancy; preserve minimum viable infrastructure unless a business-critical exception is approved. |
| **Backhaul** | Reach upstream provider infrastructure through direct or multi-hop clear LOS paths. | Provider mast to backbone high site through confirmed LOS-clear hops. | Use multi-hop LOS-clear chains where direct LOS does not exist. |

> **Decision rule:** High sites are hubs. Main lodge is the primary distribution hub. Provider mast routes through the backbone high-site layer, then to main lodge, then to all other facilities.

## 2. LOS Display Rule

The map must **never show red, yellow, blocked, marginal, greyed, speculative, or non-LOS candidate lines**. The visual map is a planning confidence surface, not a list of failed ideas. If a link is not confirmed LOS-clear, it is invisible on the map.

Only **confirmed LOS-clear links** may be rendered. When a connection requires multiple hops, the map must display that route as a sequence of individual LOS-clear segments. The system should not imply end-to-end direct LOS when the actual engineering route depends on intermediate peaks.

| Link condition | Map display behavior |
|---|---|
| Confirmed clear LOS | Render as an active planned link. |
| Multi-hop clear LOS chain | Render each individual hop as its own clear segment. |
| Blocked LOS | Do not render. |
| Marginal LOS | Do not render. |
| Unknown or unverified LOS | Do not render as a candidate link. |

> **Decision rule:** Non-LOS equals invisible. The map only shows buildable, LOS-clear infrastructure logic.

## 3. Minimum Viable Infrastructure

CTTX planning must prioritize the **fewest high sites, fewest hops, and fewest links** required to cover all necessary facilities. Every high site increases capital expenditure, maintenance obligations, installation complexity, solar requirements, battery sizing, monitoring surface area, and operational risk.

Each additional high site implies a stack that may include a mast or mounting structure, solar panels, Victron MPPT and power electronics, Hubble Lithium battery capacity, Cambium radio equipment, enclosures, grounding, installation labour, periodic maintenance, monitoring, and incident response. Therefore, the platform must justify every added high site through facility coverage, backhaul feasibility, or backbone resilience.

| Infrastructure element | Cost implication | Planning posture |
|---|---|---|
| Additional high site | Mast, solar, batteries, radio, monitoring, installation, maintenance. | Add only when required for LOS coverage, backhaul, or backbone resilience. |
| Additional hop | More equipment, more failure points, more alignment and power requirements. | Use only when needed to achieve LOS-clear routing. |
| Additional distribution link | More radios and more endpoint support burden. | Keep single-link unless a specific operational requirement exists. |
| Backbone redundancy | Higher cost but may materially improve availability. | Apply only on backbone, not routine distribution. |

> **Decision rule:** Build the minimum viable infrastructure first. Add redundancy only on the backbone unless a specific business-critical exception is explicitly defined.

## 4. Multi-Hop Pathfinding

Most rural, reserve, farm, and mining links do **not** have direct LOS between every source and destination. The GIS engine must assume that many viable routes require intermediate terrain peaks or relay high sites. The system’s pathfinding responsibility is to find the chain of peaks that creates a sequence of LOS-clear hops from source to destination.

This means the engine should not stop at a failed direct path. It must evaluate intermediate peaks and construct a practical chain where every segment is individually clear. Multi-hop routing is especially important for provider mast to backbone high site, backbone to main lodge, and high-site to facility distribution where terrain obstruction is common.

| Pathfinding scenario | Required behavior |
|---|---|
| Direct provider-to-core LOS exists | Render the direct LOS-clear backhaul segment. |
| Direct provider-to-core LOS fails | Search intermediate peaks and render only the successful clear-hop chain. |
| Facility lacks direct LOS to main lodge | Route via the minimum necessary high-site hub if clear. |
| No clear chain exists | Do not render a speculative line; flag as unresolved in analysis rather than drawing it. |

> **Decision rule:** Multi-hop chains are valid only when every hop in the chain is independently LOS-clear.

## 5. Geographic Naming

High sites must be named using **local geographic names** that rangers, reserve managers, farm managers, and field teams can recognize. The platform must not use generic labels such as **Peak A**, **Peak B**, **Node 1**, **Relay 2**, or similar placeholder names in user-facing planning output.

Names should be derived from terrain context, nearby property areas, known ridges, roads, gates, lodges, valleys, dams, local landmarks, or recognizable directional language. When exact formal names are unavailable, the generated names should still sound operationally meaningful and geographically anchored.

| Bad naming pattern | Acceptable naming pattern |
|---|---|
| Peak A | North Ridge High Site |
| Peak B | Main Lodge Ridge Relay |
| Node 1 | Western Escarpment High Site |
| Relay 2 | Gate Road Ridge Relay |
| Candidate 3 | Kloof Overlook High Site |

> **Decision rule:** A ranger must be able to understand the high-site name in the field. Placeholder labels are not acceptable for final map or report output.

## 6. Availability Model

The design target is **98–99% projected uptime**. Uptime is not a single score derived only from connectivity; it is a system-level model where every component contributes. Radio hardware, mast type, solar design, battery reserve, power electronics, monitoring, redundancy, and terrain exposure all affect availability.

The platform must flag the **weakest link** in the availability chain and identify the highest-impact upgrade. The operating principle is: **if you cannot measure it, you cannot improve it**. Monitoring is therefore not optional; it is a core availability requirement.

| Availability input | Why it matters |
|---|---|
| Radio hardware | Determines link stability, management capability, and field reliability. |
| Mast type and mounting | Affects alignment, wind loading, durability, and maintenance risk. |
| Solar generation | Determines energy recovery under field conditions. |
| Battery reserve | Determines runtime during poor weather and outage periods. |
| Victron monitoring | Enables power diagnostics and remote operational visibility. |
| Cambium cnMaestro monitoring | Enables radio diagnostics and remote network management. |
| Backbone redundancy | Reduces single-point-of-failure exposure in the core network. |

> **Decision rule:** The platform must expose projected uptime, weakest component, and biggest-impact upgrade rather than presenting resilience as a vague qualitative label.

## 7. Product Stack

The standard CTTX infrastructure stack is **Cambium Networks**, **Victron Energy**, and **Hubble Lithium**. Cambium provides radio infrastructure and cnMaestro cloud management. Victron provides solar and MPPT power electronics. Hubble Lithium provides battery storage. The stack must be treated as a cloud-monitorable operating system for remote infrastructure, not merely a bill of materials.

CTTX does **not** deploy infrastructure that cannot be remotely monitored. Any link, site, power subsystem, or critical infrastructure component that lacks remote visibility must be flagged as unacceptable or requiring redesign.

| Product domain | Standard stack | Product rule |
|---|---|---|
| Wireless radios | Cambium Networks | Must support professional link planning and cloud management through cnMaestro where applicable. |
| Radio management | Cambium cnMaestro | Must provide remote monitoring and operational diagnostics. |
| Solar and power electronics | Victron Energy | Must support remote visibility and power-system diagnostics. |
| Batteries | Hubble Lithium | Must support dependable reserve capacity and monitoring-compatible deployment. |
| Site operations | Cloud-monitorable stack | CTTX does not accept blind infrastructure. |

> **Decision rule:** If CTTX cannot remotely monitor it, CTTX should not deploy it.

## 8. BER Design Principle

CTTX designs links for **minimum bit error rate**, not maximum advertised Mbps. Headline throughput is less important than clean, stable, predictable payload performance. The platform must expose target BER, actual payload throughput, and link quality rather than encouraging oversimplified speed-based decisions.

Actual payload throughput matters because cameras, VoIP, payment systems, gate control, telemetry, and staff communications have different latency, symmetry, and reliability requirements. **PTZ cameras require symmetric high-speed links** because they combine video, control traffic, and operational responsiveness.

| Design metric | Product meaning |
|---|---|
| Target BER below 10^-6 | Link is designed for low error rate and stable service quality. |
| Actual payload throughput | Useful capacity after real-world overhead and link conditions. |
| Symmetry requirement | Determines whether upstream performance is sufficient for cameras, control, VoIP, and operations traffic. |
| Link quality | Operational confidence indicator for practical field use. |

> **Decision rule:** Engineer for low error rate and usable payload throughput. Do not optimize only for theoretical maximum Mbps.

## 9. Application Profiles

Application profiles must drive network design because different site functions have different bandwidth, latency, reliability, and symmetry requirements. The intake and scoring model must distinguish between standard cameras, PTZ cameras, VoIP, IoT and telemetry, staff communications, guest Wi-Fi, payment systems, and gate or access control.

| Application profile | Planning implication |
|---|---|
| Standard IP cameras | Requires stable upstream capacity and predictable packet quality. |
| PTZ cameras | Requires symmetric high-speed links and low-control latency. |
| VoIP | Requires low latency, low jitter, and stable packet delivery. |
| IoT / telemetry | Usually low bandwidth, but high continuity and monitoring value. |
| Staff communications | Requires practical coverage across operational areas. |
| Guest Wi-Fi | Requires segmentation from operational traffic and realistic contention planning. |
| Payment systems | Requires high availability and reliability even if bandwidth is modest. |
| Gate / access control | Requires uptime, remote visibility, and operational continuity. |

> **Decision rule:** The platform must design for the application mix, not for a generic internet pipe.

## 10. ROI Framing

CTTX does **not** sell internet. CTTX sells **avoided loss, operational efficiency, infrastructure ownership, and executive risk reduction**. The ROI narrative must connect infrastructure design to business outcomes that owners, executives, reserve managers, farm operators, and mine decision-makers understand.

The preliminary audit should frame connectivity as a risk and operations asset. It should show where poor infrastructure increases loss exposure, operational inefficiency, security weakness, guest dissatisfaction, payment interruption, or lack of management visibility.

| CTTX value category | Meaning |
|---|---|
| Avoided loss | Reduced exposure from security incidents, outages, failed payments, blind cameras, and operational downtime. |
| Operational efficiency | Better staff communications, faster response, more reliable systems, and fewer manual workarounds. |
| Infrastructure ownership | Long-term control over mission-critical communications rather than dependence on ad hoc connectivity. |
| Executive risk reduction | Clearer visibility, measurable infrastructure health, and defensible investment logic. |

> **Decision rule:** The sales conversation starts with operational risk and business value, not bandwidth packages.

## 11. Map UX Rules

The map is the core planning surface and must preserve maximum spatial context. The **layer panel floats on the map as a collapsible overlay**, positioned on top of the canvas rather than beside it. The map canvas must always use the full available width. Fullscreen mode must remain available for field-style inspection and planning review.

The property boundary polygon must always be rendered when boundary data is available. The boundary gives the planner, salesperson, and client a visual anchor for interpreting high sites, facilities, provider masts, and distribution paths.

| Map UX element | Rule |
|---|---|
| Layer panel | Float on top of map as a collapsible overlay, not beside the map. |
| Default layer-panel state | Collapsed, showing only the Layers button/icon. |
| Expanded layer-panel state | Semi-transparent dark background so the map remains visible beneath it. |
| Map canvas | Always full width. |
| Fullscreen mode | Must remain available. |
| Property boundary | Always render polygon when available. |

> **Decision rule:** Do not sacrifice map width for controls. Controls must sit on the map, not beside it.

## 12. Platform Purpose

The CTTX Infrastructure Intelligence platform is an **internal GIS planning tool** for reserve, farm, and mine outreach. It is not a public onboarding product. Its primary job is to support sales discovery, preliminary engineering, site-intelligence generation, and trusted-advisor conversations.

The preliminary audit PDF is the **sales conversation opener**. It should make the invisible infrastructure problem visible enough for a client to understand risk, value, and next steps. The expansion path is **reserves → farms → mines → rural South Africa database → telco partnership**.

| Platform focus | Product implication |
|---|---|
| Internal GIS planning | Prioritize CTTX workflow speed, planning clarity, and decision support. |
| Reserve outreach | Lead with security, hospitality connectivity, camera coverage, and operational reliability. |
| Farm outreach | Lead with telemetry, payment systems, staff communications, and operational continuity. |
| Mine outreach | Lead with safety, uptime, operational systems, and executive risk reduction. |
| Rural SA database | Build structured intelligence that compounds over time. |
| Telco partnership | Position verified rural infrastructure intelligence as strategic channel value. |

> **Decision rule:** The platform exists to turn GIS intelligence into credible CTTX sales and engineering conversations.

## Implementation Guardrails

Future implementation work must preserve these decisions across code, tests, map behavior, report output, intake wording, scoring logic, and UI design. If a feature proposal conflicts with this file, the conflict should be called out explicitly before code is changed.

| Area | Guardrail |
|---|---|
| Map rendering | Never reintroduce non-LOS visible candidate lines. |
| Architecture scoring | Preserve Backbone → Distribution → Backhaul semantics. |
| Report wording | Frame CTTX as trusted advisor for risk reduction and operational intelligence. |
| Product recommendations | Keep Cambium, Victron, and Hubble as the default monitored stack. |
| UX layout | Preserve full-width map canvas and overlay controls. |
| Intake design | Capture application profile requirements before architecture recommendations. |
| Naming | Use geographic high-site names instead of generic placeholders. |

## Change Control

This document may be updated only when the business owner changes the product strategy, engineering doctrine, or platform rules. Updates should be deliberate and should preserve historical clarity by editing the relevant section rather than scattering contradictory rules elsewhere in the project.
