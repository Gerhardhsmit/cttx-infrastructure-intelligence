export type AuditReportGuidanceInput = {
  clientName: string;
  cisScore?: number | null;
  resilienceScore?: number | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  currentConnectivity?: string | null;
  infrastructureNotes?: string | null;
  operationalFrustrationScore?: number | null;
  knownProblems?: unknown;
  mappedObservationCount: number;
};

export type AuditReportGuidance = {
  hasPropertyPin: boolean;
  mappedObservationCount: number;
  discoveryGaps: string[];
  reportSummary: string;
  recommendationTone: string;
  reserveManagerRecommendations: string[];
  cttxFollowUpSteps: string[];
  decisionPackItems: string[];
};

export function buildAuditReportGuidance(input: AuditReportGuidanceInput): AuditReportGuidance {
  const cisScore = input.cisScore || 0;
  const resilienceScore = input.resilienceScore || 0;
  const hasPropertyPin = Boolean(input.latitude && input.longitude);
  const mappedObservationCount = input.mappedObservationCount;
  const hasConnectivityContext = Boolean(input.currentConnectivity?.trim());
  const knownProblems = Array.isArray(input.knownProblems) ? input.knownProblems.filter((problem): problem is string => typeof problem === "string") : [];
  const discoveryGaps = [
    !hasPropertyPin ? "confirmed property pin" : undefined,
    mappedObservationCount === 0 ? "infrastructure and operational-zone pins" : undefined,
    !hasConnectivityContext ? "current provider, speeds, outages, and monthly spend" : undefined,
    !input.infrastructureNotes?.trim() ? "nearby tower, fibre, high-site, or handoff notes" : undefined,
  ].filter(Boolean) as string[];

  const reportSummary = hasPropertyPin
    ? `This CTTX Reserve Connectivity Intelligence Report gives ${input.clientName} a first-pass connectivity pathway and operating-risk view. CTTX can now use the captured property location, ${mappedObservationCount} mapped point${mappedObservationCount === 1 ? "" : "s"}, terrain and infrastructure context, known problems, and business outcomes to validate where connectivity can enter the property, which critical zones should be prioritised, and where LTE, microwave relay, power-resilience, and future-growth opportunities need engineering review.`
    : "This report is still missing a property pin. It should be treated as an intake summary until the reserve location and first infrastructure landing points are captured.";

  const recommendationTone = cisScore >= 70
    ? "Good initial potential, pending engineering validation"
    : cisScore >= 45
      ? "Potential exists, but the next step must reduce uncertainty"
      : "Discovery required before a reliable design can be recommended";

  const reserveManagerRecommendations = [
    cisScore >= 60
      ? "Ask CTTX to validate the preferred backhaul path first: tower, fibre handoff, LTE opportunity, microwave relay path, line-of-sight, access permissions, terrain constraints, and commercial availability."
      : "Before requesting pricing, capture or confirm the nearest towers, ridges, fibre routes, equipment rooms, and possible handoff sites so CTTX can identify a realistic first connection path.",
    mappedObservationCount > 0
      ? "Use the mapped pins to rank critical zones for the first design phase, starting with live surveillance, reserve-wide communication, lodge connectivity, remote monitoring, staff coordination, IoT sensors, smart gates, VoIP, telemetry, wildlife tracking, and cloud applications."
      : "Add pins for the main lodge, gates, security control room, pumps, CCTV/sensor positions, anti-poaching posts, and any known high-sites before the engineering call.",
    resilienceScore < 70 || knownProblems.some((problem) => /load|power|redund|fail/i.test(problem))
      ? "Treat power resilience as part of the connectivity design. Prepare inverter, battery, generator, solar, and load-shedding uptime details for the follow-up discussion."
      : "Confirm which systems must remain online during outages, including payments, guest Wi-Fi, security, radio/VoIP, telemetry, and emergency communications.",
    "Nominate a site contact who can approve gate access, identify equipment rooms, escort field teams, confirm current issues, and explain future expansion plans such as new lodges, roads, patrol routes, solar plants, cameras, drones, or additional tourism infrastructure.",
  ];

  const cttxFollowUpSteps = [
    "CTTX reviews the submitted audit, mapped pins, connectivity notes, problems, and budget context.",
    "CTTX contacts the submitted email to schedule a discovery call and confirm whether the next step is desktop validation, field survey, or proposal scoping.",
    "The engineering review validates backhaul availability, line-of-sight, coverage zones, power resilience, installation access, and commercial feasibility before issuing a final recommendation.",
  ];

  const decisionPackItems = [
    "Current provider names, package details, monthly spend, invoices, router/CPE inventory, Starlink terminals, radio masts, fibre handoffs, cameras, repeaters, power systems, and network equipment if available.",
    "Speed tests, outage examples, dead-zone locations, and urgent operational pain points.",
    "Gate access rules, preferred site contact, equipment-room options, and any mast or building restrictions.",
    "Power context for critical locations: inverter, generator, battery, solar, and load-shedding duration.",
  ];

  return {
    hasPropertyPin,
    mappedObservationCount,
    discoveryGaps,
    reportSummary,
    recommendationTone,
    reserveManagerRecommendations,
    cttxFollowUpSteps,
    decisionPackItems,
  };
}
