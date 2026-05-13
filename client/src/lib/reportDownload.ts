import type { AuditReportGuidance } from "./reportGuidance";
import { CTTX_CONFIDENTIAL_DESIGNATION, getReportTemplateSectionTitle } from "./reportTemplate";
import { BUSINESS_DRIVERS, RESERVE_SITE_TYPE_BY_ID, formatDriverLabels, type BusinessDriverId, type ReserveSiteTypeId } from "@shared/reserveFramework";
import type { SerializedPlannerTopology } from "./plannerTypes";

export type ReportDownloadAudit = {
  id: number;
  clientName: string;
  sector?: string | null;
  propertySizeHa?: number | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  currentConnectivity?: string | null;
  knownProblems?: unknown;
  infrastructureNotes?: string | null;
  operationalFrustrationScore?: number | null;
  cisScore?: number | null;
  tciScore?: number | null;
  resilienceScore?: number | null;
  projectedUptimePercent?: number | string | null;
  applicationProfile?: unknown;
  uptimeModel?: unknown;
  targetBer?: string | null;
  payloadThroughputMbps?: number | null;
  linkQuality?: string | null;
  productStack?: unknown;
  remoteMonitoringFlag?: string | null;
  primaryArchitecture?: string | null;
  backupArchitecture?: string | null;
  engineeringNotes?: string | null;
  linkPlannerTopology?: SerializedPlannerTopology | null;
};

export type ReportDownloadObservation = {
  type?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  description?: string | null;
};

export type ReportDownloadOperationalCriticalLocation = {
  name?: string | null;
  locationType?: string | null;
  priority?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  connectivityRequirement?: string | null;
  businessImpact?: string | null;
  notes?: string | null;
  reserveSiteType?: string | null;
  topologyRole?: string | null;
  businessDrivers?: unknown;
};

export type ReportDownloadOperationalPainPoint = {
  title?: string | null;
  category?: string | null;
  severity?: string | null;
  affectedLocation?: string | null;
  description?: string | null;
  businessImpact?: string | null;
  businessDrivers?: unknown;
};

export type LeadReportConfirmation = {
  email: string;
  company: string;
  budget: string;
  generatedAt: string;
};

function formatCoordinate(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return "Not captured";
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(6) : String(value);
}

function bulletList(items: string[]) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- Not captured";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") || "cttx-report";
}

export function buildGeneratedReportFileName(clientName: string, auditId: number) {
  return `${slugify(clientName)}-audit-${auditId}-cttx-report.md`;
}

export function buildGeneratedReportHtmlFileName(clientName: string, auditId: number) {
  return `${slugify(clientName)}-audit-${auditId}-cttx-pdf-ready-report.html`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function htmlList(items: string[]) {
  const safeItems = items.length > 0 ? items : ["Not captured"];
  return `<ul>${safeItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function formatTopologyType(value: string) {
  return value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildLinkPlannerTopologyHtml(topology?: SerializedPlannerTopology | null) {
  if (!topology) return "";
  const selectedMast = topology.selectedMast ? `${topology.selectedMast.name} (${formatTopologyType(topology.selectedMast.provider)}${topology.selectedMast.closestForProvider ? ", provider closest" : ""})` : "Not selected";
  return `
    <h2>Link Planner Topology</h2>
    <p><strong>Plan:</strong> ${escapeHtml(topology.planName)} · <strong>Property:</strong> ${escapeHtml(topology.propertyName)}</p>
    <div class="score-grid">
      <div class="score"><span>Total links</span><strong>${escapeHtml(topology.linkCount)}</strong><p>${escapeHtml(`${topology.uplinkCount} uplink · ${topology.backboneCount} backbone`)}</p></div>
      <div class="score"><span>Distance</span><strong>${escapeHtml(`${topology.totalDistanceKm} km`)}</strong><p>${escapeHtml(`${topology.liveDistanceKm} km marked live`)}</p></div>
      <div class="score"><span>Threshold risk</span><strong>${escapeHtml(topology.overThresholdCount)}</strong><p>${escapeHtml(`Over ${topology.viableLinkThresholdKm} km threshold`)}</p></div>
      <div class="score"><span>Weakest fade margin</span><strong>${escapeHtml(`${topology.weakestFadeMarginDb.toFixed(1)} dB`)}</strong><p>BER-first planning indicator</p></div>
    </div>
    <p>${escapeHtml(topology.routeDecisionExplanation)}</p>
    <p><strong>Selected provider mast:</strong> ${escapeHtml(selectedMast)}</p>
    <table><thead><tr><th>Type</th><th>Path</th><th>Distance</th><th>RSL</th><th>Fade margin</th><th>Threshold status</th></tr></thead><tbody>
      ${topology.links.map((link) => `<tr><td>${escapeHtml(formatTopologyType(link.type))}</td><td>${escapeHtml(`${link.fromName} → ${link.toName}`)}</td><td>${escapeHtml(`${link.distKm} km`)}</td><td>${escapeHtml(`${link.rslDbm} dBm`)}</td><td>${escapeHtml(`${link.fadeMarginDb} dB`)}</td><td>${escapeHtml(link.outOfRange ? "Amber warning: over threshold" : "Within threshold")}</td></tr>`).join("") || `<tr><td colspan="6">No clear LOS links serialized from the Link Planner.</td></tr>`}
    </tbody></table>
    <p><strong>High sites serialized:</strong></p>${htmlList(topology.highSites.map((site) => `${site.name} — ${formatTopologyType(site.category)} (${site.elevation ?? "unknown"} m)`))}
    <p><strong>Facilities captured:</strong></p>${htmlList(topology.facilities.map((facility) => `${facility.name} — ${formatTopologyType(facility.type)} (${formatCoordinate(facility.lat)}, ${formatCoordinate(facility.lng)})`))}
    <h3>Cost of Disconnection vs Value of Connected Operations</h3>
    <p>${escapeHtml(topology.recommendationSummary)}</p>
    <p>This ROI note frames connectivity as operational continuity for guest experience, anti-poaching coordination, gate control, pumping, monitoring, and management communications rather than a commodity bandwidth purchase.</p>
  `;
}

function buildLinkPlannerTopologyMarkdown(topology?: SerializedPlannerTopology | null) {
  if (!topology) return [];
  return [
    `## 5. Link Planner Topology`,
    ``,
    `This section serializes the current Link Planner state for CTTX engineering review. It preserves the shared topology policy of one earned uplink plus a nearest-neighbour backbone and does not convert the desktop plan into construction approval.`,
    ``,
    `| Field | Detail |`,
    `| --- | --- |`,
    `| Plan name | ${topology.planName} |`,
    `| Property | ${topology.propertyName} |`,
    `| Link count | ${topology.linkCount} total; ${topology.uplinkCount} uplink; ${topology.backboneCount} backbone |`,
    `| Distance | ${topology.totalDistanceKm} km total; ${topology.liveDistanceKm} km marked live |`,
    `| Viable-link threshold | ${topology.viableLinkThresholdKm} km |`,
    `| Over-threshold links | ${topology.overThresholdCount} |`,
    `| Weakest fade margin | ${topology.weakestFadeMarginDb.toFixed(1)} dB |`,
    `| Selected provider mast | ${topology.selectedMast ? `${topology.selectedMast.name} (${formatTopologyType(topology.selectedMast.provider)}${topology.selectedMast.closestForProvider ? ", provider closest" : ""})` : "Not selected"} |`,
    ``,
    `**Route decision explanation:** ${topology.routeDecisionExplanation}`,
    ``,
    `| Type | Path | Distance | RSL | Fade margin | Threshold status |`,
    `| --- | --- | ---: | ---: | ---: | --- |`,
    ...(topology.links.length > 0
      ? topology.links.map((link) => `| ${formatTopologyType(link.type)} | ${link.fromName} → ${link.toName} | ${link.distKm} km | ${link.rslDbm} dBm | ${link.fadeMarginDb} dB | ${link.outOfRange ? "Amber warning: over threshold" : "Within threshold"} |`)
      : [`| Not captured | No clear LOS links serialized from the Link Planner. | 0 km | 0 dBm | 0 dB | Not captured |`]),
    ``,
    `**High sites serialized**`,
    ``,
    bulletList(topology.highSites.map((site) => `${site.name} — ${formatTopologyType(site.category)} (${site.elevation ?? "unknown"} m, ${site.source})`)),
    ``,
    `**Facilities captured**`,
    ``,
    bulletList(topology.facilities.map((facility) => `${facility.name} — ${formatTopologyType(facility.type)} (${formatCoordinate(facility.lat)}, ${formatCoordinate(facility.lng)})`)),
    ``,
    `**Cost of Disconnection vs Value of Connected Operations**`,
    ``,
    topology.recommendationSummary,
    ``,
    `Use this ROI framing to compare the avoided cost of disconnected guest, anti-poaching, gate, pumping, monitoring, and management operations against the value of a resilient private connectivity design.`,
    ``,
  ];
}

function coerceBusinessDrivers(value: unknown): BusinessDriverId[] {
  if (!Array.isArray(value)) return [];
  return value.filter((driver): driver is BusinessDriverId => BUSINESS_DRIVERS.some((candidate) => candidate.id === driver));
}

function formatOperationalLocation(location: ReportDownloadOperationalCriticalLocation) {
  const coordinate = location.latitude && location.longitude
    ? ` (${formatCoordinate(location.latitude)}, ${formatCoordinate(location.longitude)})`
    : "";
  const driverLabels = formatDriverLabels(coerceBusinessDrivers(location.businessDrivers));
  const reserveRole = location.reserveSiteType
    ? RESERVE_SITE_TYPE_BY_ID[location.reserveSiteType as ReserveSiteTypeId]?.label ?? location.reserveSiteType
    : undefined;
  const details = [
    reserveRole ? `Reserve role: ${reserveRole}` : undefined,
    location.topologyRole ? `Topology role: ${location.topologyRole}` : undefined,
    `Drivers: ${driverLabels}`,
    location.connectivityRequirement,
    location.businessImpact,
    location.notes,
  ].filter(Boolean).join(" · ");
  return `${location.name || "Critical location"}${coordinate} — ${location.priority || "unranked"} priority ${location.locationType ? `· ${location.locationType}` : ""}${details ? ` — ${details}` : ""}`;
}

function formatOperationalPainPoint(point: ReportDownloadOperationalPainPoint) {
  const location = point.affectedLocation ? ` at ${point.affectedLocation}` : "";
  const details = [`Drivers: ${formatDriverLabels(coerceBusinessDrivers(point.businessDrivers))}`, point.description, point.businessImpact].filter(Boolean).join(" · ");
  return `${point.title || "Operational pain point"}${location} — ${point.severity || "unranked"} severity ${point.category ? `· ${point.category}` : ""}${details ? ` — ${details}` : ""}`;
}

function buildBusinessDriverSummary(locations: ReportDownloadOperationalCriticalLocation[], painPoints: ReportDownloadOperationalPainPoint[]) {
  return BUSINESS_DRIVERS.map((driver) => {
    const locationCount = locations.filter((location) => coerceBusinessDrivers(location.businessDrivers).includes(driver.id)).length;
    const painPointCount = painPoints.filter((point) => coerceBusinessDrivers(point.businessDrivers).includes(driver.id)).length;
    return {
      driver,
      locationCount,
      painPointCount,
      total: locationCount + painPointCount,
    };
  });
}

export function buildGeneratedReportHtml(input: {
  audit: ReportDownloadAudit;
  observations: ReportDownloadObservation[];
  operationalCriticalLocations?: ReportDownloadOperationalCriticalLocation[];
  operationalPainPoints?: ReportDownloadOperationalPainPoint[];
  guidance: AuditReportGuidance;
  lead: LeadReportConfirmation;
}) {
  const { audit, observations, operationalCriticalLocations = [], operationalPainPoints = [], guidance, lead } = input;
  const knownProblems = Array.isArray(audit.knownProblems)
    ? audit.knownProblems.filter((item): item is string => typeof item === "string")
    : [];
  const mappedObservations = observations.filter((observation) => observation.latitude && observation.longitude);
  const generatedAt = new Date(lead.generatedAt).toLocaleString();
  const scoreRows = [
    ["Connectivity Intelligence Score", `${audit.cisScore ?? 0}/100`],
    ["Terrain Complexity Index", `${audit.tciScore ?? 0}/100`],
    ["Projected uptime", `${audit.projectedUptimePercent ?? audit.resilienceScore ?? 0}%`],
    ["Target BER", audit.targetBer ?? "< 10^-6"],
    ["Actual payload throughput", audit.payloadThroughputMbps ? `${audit.payloadThroughputMbps} Mbps` : "Pending validation"],
  ];
  const businessDriverSummary = buildBusinessDriverSummary(operationalCriticalLocations, operationalPainPoints);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(audit.clientName)} CTTX PDF-ready report</title>
  <style>
    @page { margin: 18mm; }
    body { margin: 0; font-family: Inter, Arial, sans-serif; color: #0f172a; background: #f8fafc; line-height: 1.55; }
    main { max-width: 960px; margin: 0 auto; background: white; padding: 40px; }
    header { border-bottom: 4px solid #ffe600; padding-bottom: 24px; margin-bottom: 28px; }
    h1 { font-size: 34px; margin: 0 0 8px; letter-spacing: -0.04em; }
    h2 { break-after: avoid; color: #111827; margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
    .confidential { display: inline-block; background: #111827; color: #ffe600; padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    .summary { background: #fefce8; border: 1px solid #fde047; border-radius: 14px; padding: 18px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; }
    .score-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 18px 0; }
    .score { border: 1px solid #dbeafe; background: #eff6ff; border-radius: 12px; padding: 14px; }
    .score strong { display: block; font-size: 24px; color: #1d4ed8; }
    .driver-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
    .driver-card { border: 1px solid #fde047; background: #fefce8; border-radius: 12px; padding: 14px; }
    .driver-card strong { display: block; font-size: 18px; color: #111827; }
    .score p { margin: 4px 0 0; color: #475569; }
    li { margin: 6px 0; }
    footer { margin-top: 36px; border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 12px; color: #64748b; }
    @media print { body { background: white; } main { padding: 0; } .score-grid { break-inside: avoid; } }
  </style>
</head>
<body>
  <main>
    <header>
      <span class="confidential">${escapeHtml(CTTX_CONFIDENTIAL_DESIGNATION)}</span>
      <h1>CTTX Reserve Connectivity Intelligence Report</h1>
      <p>Prepared for ${escapeHtml(lead.company)} (${escapeHtml(lead.email)}) · Audit #${escapeHtml(audit.id)} · ${escapeHtml(generatedAt)}</p>
    </header>

    <section class="summary">
      <h2>${escapeHtml(getReportTemplateSectionTitle("executive-summary"))}</h2>
      <p>${escapeHtml(guidance.reportSummary)}</p>
      <p><strong>Recommended next decision:</strong> Request a CTTX engineering discovery call to confirm the practical connection path, priority zones, and whether the next step is desktop validation, field survey, or proposal scoping.</p>
    </section>

    <h2>${escapeHtml(getReportTemplateSectionTitle("header"))}</h2>
    <table><tbody>
      <tr><th>Property / Client</th><td>${escapeHtml(audit.clientName)}</td></tr>
      <tr><th>Sector</th><td>${escapeHtml(audit.sector || "Not captured")}</td></tr>
      <tr><th>Budget context</th><td>${escapeHtml(lead.budget)}</td></tr>
      <tr><th>Property pin</th><td>${escapeHtml(`${formatCoordinate(audit.latitude)}, ${formatCoordinate(audit.longitude)}`)}</td></tr>
    </tbody></table>

    <h2>${escapeHtml(getReportTemplateSectionTitle("infrastructure-map"))}</h2>
    <p>This PDF-ready report records ${mappedObservations.length} coordinate-backed infrastructure point(s) for CTTX engineering review.</p>
    <table><thead><tr><th>Map item</th><th>Coordinate / detail</th></tr></thead><tbody>
      ${mappedObservations.map((observation) => `<tr><td>${escapeHtml(observation.type || "Mapped point")}</td><td>${escapeHtml(observation.description || "Captured infrastructure point")} (${escapeHtml(formatCoordinate(observation.latitude))}, ${escapeHtml(formatCoordinate(observation.longitude))})</td></tr>`).join("") || `<tr><td colspan="2">No coordinate-backed infrastructure points captured yet.</td></tr>`}
    </tbody></table>

    <h2>${escapeHtml(getReportTemplateSectionTitle("operational-analysis"))}</h2>
    <div class="score-grid">${scoreRows.map(([label, value]) => `<div class="score"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</div>
    <p><strong>Current connectivity:</strong> ${escapeHtml(audit.currentConnectivity || "Not captured")}</p>
    <p><strong>Three business driver framework:</strong></p>
    <div class="driver-grid">${businessDriverSummary.map(({ driver, locationCount, painPointCount, total }) => `<div class="driver-card"><span>${escapeHtml(driver.shortLabel)}</span><strong>${escapeHtml(driver.label)}</strong><p>${escapeHtml(`${total} linked item${total === 1 ? "" : "s"}: ${locationCount} location${locationCount === 1 ? "" : "s"}, ${painPointCount} pain point${painPointCount === 1 ? "" : "s"}.`)}</p></div>`).join("")}</div>
    <p><strong>Operational critical locations:</strong></p>${htmlList(operationalCriticalLocations.map(formatOperationalLocation))}
    <p><strong>Operational pain points:</strong></p>${htmlList(operationalPainPoints.map(formatOperationalPainPoint))}
    <p><strong>Known operating problems:</strong></p>${htmlList(knownProblems)}
    <p><strong>Operational connectivity-frustration score:</strong> ${escapeHtml(audit.operationalFrustrationScore ? `${audit.operationalFrustrationScore}/10` : "Not captured")}</p>
    <p><strong>Strategic intelligence focus:</strong> This section links security and threat response, operations effectiveness, hospitality connectivity, terrain observations, LTE opportunities, microwave relay opportunities, risk areas, and future-growth cues into a practical planning brief.</p>

    <h2>${escapeHtml(getReportTemplateSectionTitle("architecture-plan"))}</h2>
    <table><tbody>
      <tr><th>Primary architecture</th><td>${escapeHtml(audit.primaryArchitecture || "To be confirmed after engineering validation")}</td></tr>
      <tr><th>Backup architecture</th><td>${escapeHtml(audit.backupArchitecture || "To be confirmed after engineering validation")}</td></tr>
      <tr><th>Link quality design target</th><td>${escapeHtml(audit.linkQuality || "CTTX to validate payload quality and BER during engineering review.")}</td></tr>
      <tr><th>Remote monitoring</th><td>${escapeHtml(audit.remoteMonitoringFlag || "Cambium Networks, Victron Energy, and Hubble Lithium monitoring to be confirmed.")}</td></tr>
    </tbody></table>

    ${buildLinkPlannerTopologyHtml(audit.linkPlannerTopology)}

    <h2>${escapeHtml(getReportTemplateSectionTitle("reserve-manager-recommendations"))}</h2>${htmlList(guidance.reserveManagerRecommendations)}
    <h2>${escapeHtml(getReportTemplateSectionTitle("cttx-follow-up-workflow"))}</h2>${htmlList(guidance.cttxFollowUpSteps)}
    <h2>${escapeHtml(getReportTemplateSectionTitle("decision-pack"))}</h2>${htmlList(guidance.decisionPackItems)}
    <h2>${escapeHtml(getReportTemplateSectionTitle("engineering-brief"))}</h2>
    <p>${escapeHtml(audit.engineeringNotes || audit.infrastructureNotes || "No engineering notes captured yet.")}</p>

    <footer>This ${escapeHtml(CTTX_CONFIDENTIAL_DESIGNATION)} is a preliminary CTTX infrastructure-intelligence output. Use the browser print dialog to save this HTML as a PDF for review.</footer>
  </main>
</body>
</html>`;
}

export function buildGeneratedReportMarkdown(input: {
  audit: ReportDownloadAudit;
  observations: ReportDownloadObservation[];
  operationalCriticalLocations?: ReportDownloadOperationalCriticalLocation[];
  operationalPainPoints?: ReportDownloadOperationalPainPoint[];
  guidance: AuditReportGuidance;
  lead: LeadReportConfirmation;
}) {
  const { audit, observations, operationalCriticalLocations = [], operationalPainPoints = [], guidance, lead } = input;
  const knownProblems = Array.isArray(audit.knownProblems)
    ? audit.knownProblems.filter((item): item is string => typeof item === "string")
    : [];
  const mappedObservations = observations.filter((observation) => observation.latitude && observation.longitude);
  const generatedAt = new Date(lead.generatedAt).toLocaleString();
  const businessDriverSummary = buildBusinessDriverSummary(operationalCriticalLocations, operationalPainPoints);

  return [
    `# CTTX Reserve Connectivity Intelligence Report`,
    ``,
    `> **${CTTX_CONFIDENTIAL_DESIGNATION}**. Prepared for ${lead.company} by CTTX Infrastructure Intelligence. This report pack is intended for engineering-discovery and decision-support use before any procurement or construction commitment.`,
    ``,
    `## 0. ${getReportTemplateSectionTitle("header")}`,
    ``,
    `| Field | Detail |`,
    `| --- | --- |`,
    `| Property / Client | ${audit.clientName} |`,
    `| Audit ID | ${audit.id} |`,
    `| Prepared for | ${lead.company} (${lead.email}) |`,
    `| Budget context | ${lead.budget} |`,
    `| Generated at | ${generatedAt} |`,
    `| Report status | Preliminary desktop intelligence pack; field validation still required |`,
    ``,
    `## 1. ${getReportTemplateSectionTitle("executive-summary")}`,
    ``,
    guidance.reportSummary,
    ``,
    `**Recommended next decision:** Request a CTTX engineering discovery call to confirm the practical connection path, priority zones, and whether the next step is desktop validation, field survey, or proposal scoping.`,
    ``,
    `## 2. ${getReportTemplateSectionTitle("infrastructure-map")}`,
    ``,
    `This section records the property pin and the coordinate-backed infrastructure points captured during the audit. These points guide the first engineering review and help CTTX decide which fibre handoff, tower, operational zone, or internal distribution path should be validated next.`,
    ``,
    `| Map item | Coordinate / Detail |`,
    `| --- | --- |`,
    `| Property pin | ${formatCoordinate(audit.latitude)}, ${formatCoordinate(audit.longitude)} |`,
    `| Coordinate-backed points captured | ${mappedObservations.length} |`,
    ``,
    mappedObservations.length > 0
      ? mappedObservations
          .map((observation) => `- ${observation.type || "Mapped point"}: ${observation.description || "Captured infrastructure point"} (${formatCoordinate(observation.latitude)}, ${formatCoordinate(observation.longitude)})`)
          .join("\n")
      : "- No coordinate-backed infrastructure points captured yet.",
    ``,
    `## 3. ${getReportTemplateSectionTitle("operational-analysis")}`,
    ``,
    `| Metric | Current finding |`,
    `| --- | --- |`,
    `| Sector | ${audit.sector || "Not captured"} |`,
    `| Property size | ${audit.propertySizeHa ? `${audit.propertySizeHa} ha` : "Not captured"} |`,
    `| Current connectivity | ${audit.currentConnectivity || "Not captured"} |`,
    `| Connectivity Intelligence Score (CIS) | ${audit.cisScore ?? 0}/100 |`,
    `| Terrain Complexity Index (TCI) | ${audit.tciScore ?? 0}/100 |`,
    `| Projected uptime | ${audit.projectedUptimePercent ?? audit.resilienceScore ?? 0}% |`,
    `| Target BER | ${audit.targetBer ?? "< 10^-6"} |`,
    `| Actual payload throughput | ${audit.payloadThroughputMbps ? `${audit.payloadThroughputMbps} Mbps` : "Pending validation"} |`,
    `| Operational connectivity-frustration score | ${audit.operationalFrustrationScore ? `${audit.operationalFrustrationScore}/10` : "Not captured"} |`,
    ``,
    `**Three business driver framework**`,
    ``,
    `| Driver | Linked locations | Linked pain points | Total |`,
    `| --- | ---: | ---: | ---: |`,
    ...businessDriverSummary.map(({ driver, locationCount, painPointCount, total }) => `| ${driver.label} | ${locationCount} | ${painPointCount} | ${total} |`),
    ``,
    `**Operational critical locations**`,
    ``,
    bulletList(operationalCriticalLocations.map(formatOperationalLocation)),
    ``,
    `**Operational pain points**`,
    ``,
    bulletList(operationalPainPoints.map(formatOperationalPainPoint)),
    ``,
    `**Known operating problems**`,
    ``,
    bulletList(knownProblems),
    ``,
    `## 4. ${getReportTemplateSectionTitle("architecture-plan")}`,
    ``,
    `| Architecture layer | Recommendation |`,
    `| --- | --- |`,
    `| Primary architecture | ${audit.primaryArchitecture || "To be confirmed after engineering validation"} |`,
    `| Backup architecture | ${audit.backupArchitecture || "To be confirmed after engineering validation"} |`,
    `| Link quality design target | ${audit.linkQuality || "CTTX to validate payload quality and BER during engineering review."} |`,
    `| Remote monitoring | ${audit.remoteMonitoringFlag || "Cambium Networks, Victron Energy, and Hubble Lithium monitoring to be confirmed."} |`,
    ``,
    ...buildLinkPlannerTopologyMarkdown(audit.linkPlannerTopology),
    `## ${audit.linkPlannerTopology ? "6" : "5"}. ${getReportTemplateSectionTitle("reserve-manager-recommendations")}`,
    ``,
    bulletList(guidance.reserveManagerRecommendations),
    ``,
    `## ${audit.linkPlannerTopology ? "7" : "6"}. ${getReportTemplateSectionTitle("cttx-follow-up-workflow")}`,
    ``,
    bulletList(guidance.cttxFollowUpSteps),
    ``,
    `## ${audit.linkPlannerTopology ? "8" : "7"}. ${getReportTemplateSectionTitle("decision-pack")}`,
    ``,
    bulletList(guidance.decisionPackItems),
    ``,
    `## ${audit.linkPlannerTopology ? "9" : "8"}. ${getReportTemplateSectionTitle("engineering-brief")}`,
    ``,
    audit.engineeringNotes || audit.infrastructureNotes || "No engineering notes captured yet.",
    ``,
    `---`,
    `This **${CTTX_CONFIDENTIAL_DESIGNATION}** is a preliminary CTTX infrastructure-intelligence output. It should be reviewed with CTTX engineering before procurement, trenching, tower work, radio planning, or resilience-system investment decisions.`,
    ``,
  ].join("\n");
}
