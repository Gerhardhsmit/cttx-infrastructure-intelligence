# Swartkops Sea Salt: Cost of Disconnection vs Value of Connected Operations

**Sprint date:** 28 September 2026 · **Status:** Pre-survey ROI framing. **No pricing is included.** Feasibility comes before price, and the ZAR figures below are ranges to validate with Chrisjan, not claims.

**Lead lens for this prospect: Avoided Loss.** Theft and vandalism on the Swartkops Estuary are documented. A pump that is down, or a perimeter breach nobody sees, stops production on a process that runs on continuous pumping.

---

## 1. Avoided Loss

What this operation is exposed to:
- **Theft and vandalism of pumps, cables, pipe and electrical gear** at intake and transfer points far from the works. A solar saltworks on this estuary was abandoned in 2018 because of continuous theft and vandalism (sourced; operator not verified).
- **Undetected pump failure.** If seawater or brine intake stops overnight or over a weekend, the pans lose days of their evaporation cycle. The salt harvest is set by the season, and those days can't be recovered.
- **Fuel, battery and solar theft** at the yard and at remote pump points.
- **Perimeter breach** onto open pans, with people on site who shouldn't be there. That is a safety liability and a product-integrity problem for a food-grade producer.
- **Cameras that record locally but nobody watches**, so the footage is only found after the loss.

How to quantify it (fill in on the call):
- Cost of one pump-station theft: pump + cable + labour + downtime. Typical industrial pump and cabling replacement falls in a **low-six-figure ZAR range per incident** (ASSUME, validate).
- Cost of one lost pumping week in peak evaporation season, in tonnes of salt not produced × the ex-works price. **Ask Chrisjan for the number.**
- Framing to use: *"What did your last serious incident cost, all in?"*

## 2. Operational Efficiency

- **Remote pump status and alarms**: running, stopped, power loss, low flow. This replaces drive-out checks across the floodplain.
- **Connected cameras at pump stations, gates and the yard**, viewable from the office and on a phone.
- **Brine-level and flow telemetry** on key pans. Process decisions rest on data instead of a walk-around.
- **Gate and access control** at the works, with a log.
- **Dispatch and weighbridge** on the same network as the office.
- **Staff comms across the site**: Wi-Fi calling and data at the plant and workshop.
- **Fewer vehicle trips.** Each avoided patrol or check run saves fuel, time and vehicle wear.

## 3. Infrastructure Ownership

| Renting fragmented services | CTTX-built private network |
|---|---|
| Separate LTE SIMs, DVRs and alarm contracts per site | One engineered backbone across the pans, owned by Swartkops Sea Salt |
| Coverage limited to wherever the carrier's signal happens to reach | Coverage designed around the pans and pump stations |
| Every new camera or sensor needs its own service | New cameras, sensors and telemetry plug into existing capacity |
| No single view of the site | cnMaestro + Victron VRM + Hubble monitoring: one view of radios and power |
| Cable links exposed to theft | Wireless links in stainless cabinets, with nothing in the ground to steal |

The carrier supplies connectivity at the works. From there the property owns its communications backbone.

## 4. Executive Risk Reduction

- **Real-time visibility** of the process-critical asset (pumps) and the perimeter.
- **Faster incident response.** The alarm reaches a person in minutes, not the next morning.
- **Evidence of diligence** for insurers, food-safety auditors, and mine health and safety obligations if the works is MHSA-regulated (verify).
- **Management control.** The Mine Manager and the owner see the same picture without being on site.
- **Low environmental footprint.** Few masts and no trenching, which suits the protected estuary.

---

## Formula

> **Connectivity ROI = avoided losses + operational savings + improved response capability + infrastructure asset value + future expansion potential.**

## Inputs needed before a costed business case

| Missing | Why it matters | Where from |
|---|---|---|
| Pan and pump-station locations | Defines the links, masts and hop count | Chrisjan / site survey |
| Incident history (24 months) | Sizes the Avoided Loss | Chrisjan |
| Current connectivity and costs | Current vs proposed recurring cost | Chrisjan |
| LOS and Fresnel results | Feasibility comes before price | Link Planner + survey |
| Equipment margins and install day-rate | Pricing | **Not yet in Notion or the repo** (see CLAUDE.md "Missing — requires director decision") |
