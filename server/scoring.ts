export type InfrastructurePointInput = {
  label: string;
  category: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
};

export type PreliminaryScoringInput = {
  sector: string;
  latitude?: number;
  longitude?: number;
  propertySizeHa?: number;
  operationalZones?: string[];
  currentConnectivity?: string;
  knownProblems?: string[];
  infrastructureNotes?: string;
  infrastructurePoints?: InfrastructurePointInput[];
  applicationProfile?: string[];
};

export type CisSubMetric = {
  key: "fibreProximity" | "signalQuality" | "backhaulType";
  label: string;
  value: number;
  evidence: string;
};

export type TciObstructionZone = {
  key: "valleyShadow" | "ridgeObstruction" | "longHaulExposure";
  label: string;
  severity: "Monitor" | "Medium" | "High";
  startPercent: number;
  endPercent: number;
  elevationPercent: number;
  evidence: string;
};

export type TciProfileSample = {
  distancePercent: number;
  elevationPercent: number;
  source: "site" | "valley" | "ridge" | "distribution" | "egress";
};

export type UptimeModel = {
  projectedUptimePercent: number;
  weakestComponent: string;
  biggestImpactUpgrade: string;
  componentScores: Array<{ component: string; contributionPercent: number; evidence: string }>;
};

export type ProductStackRecommendation = {
  vendor: "Cambium Networks" | "Victron Energy" | "Hubble Lithium";
  role: string;
  recommendation: string;
  remotelyManaged: boolean;
};

export const APPLICATION_PROFILE_OPTIONS = [
  "Standard IP cameras",
  "PTZ cameras",
  "VoIP",
  "IoT sensors",
  "Guest WiFi",
  "Payment systems",
  "Security control room",
] as const;

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function hasText(value?: string) {
  return Boolean(value && value.trim().length > 0);
}

function includesAny(text: string, keywords: string[]) {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function formatMissingData(missingData: string[]) {
  if (missingData.length === 0) return "no critical intake gaps were identified";
  if (missingData.length === 1) return missingData[0];
  return `${missingData.slice(0, -1).join(", ")} and ${missingData[missingData.length - 1]}`;
}

function hasCategory(points: InfrastructurePointInput[], keywords: string[]) {
  return points.some((point) => includesAny(`${point.label} ${point.category} ${point.notes ?? ""}`, keywords));
}


function buildApplicationProfileText(applicationProfile: string[]) {
  if (applicationProfile.length === 0) return "No structured application profile was selected; CTTX should confirm camera, VoIP, payment, guest Wi-Fi, IoT, and security-control loads during discovery.";
  const profile = applicationProfile.join(", ");
  const ptzNote = applicationProfile.includes("PTZ cameras")
    ? " PTZ cameras are present, so CTTX should treat camera uplink as a symmetric-link requirement rather than a best-effort download-speed requirement."
    : "";
  return `Application profile captured: ${profile}.${ptzNote}`;
}

function buildUptimeModel(args: { hasPowerRisk: boolean; hasRedundancyRisk: boolean; hasSatellite: boolean; hasWirelessBackhaul: boolean; hasFibreSignal: boolean; mappedPointCount: number; applicationProfile: string[] }): UptimeModel {
  const componentScores = [
    {
      component: "Power system",
      contributionPercent: clampPercent(84 + (args.hasPowerRisk ? -18 : 4) + (args.applicationProfile.includes("Security control room") ? 3 : 0)),
      evidence: args.hasPowerRisk ? "Known load-shedding or outage risk reduces expected site availability." : "No explicit power-failure problem was selected in the intake.",
    },
    {
      component: "Radio hardware",
      contributionPercent: clampPercent(88 + (args.hasWirelessBackhaul ? 5 : -4) + (args.hasFibreSignal ? 3 : 0)),
      evidence: args.hasWirelessBackhaul || args.hasFibreSignal ? "Backhaul evidence supports a managed radio/fibre edge design." : "Backhaul type remains unconfirmed and must be validated.",
    },
    {
      component: "Mast and high-site structure",
      contributionPercent: clampPercent(82 + Math.min(args.mappedPointCount * 3, 10)),
      evidence: args.mappedPointCount > 0 ? "Mapped infrastructure points improve high-site and mast-placement confidence." : "No mapped infrastructure landing points were supplied.",
    },
    {
      component: "Monitoring and remote management",
      contributionPercent: clampPercent(78 + (args.applicationProfile.length >= 4 ? 6 : 0)),
      evidence: "Cloud-managed Cambium, Victron, and Hubble components are recommended as the monitored operating baseline.",
    },
    {
      component: "Backhaul redundancy",
      contributionPercent: clampPercent(72 + (args.hasSatellite ? 12 : 0) + (args.hasFibreSignal && args.hasWirelessBackhaul ? 8 : 0) - (args.hasRedundancyRisk ? 14 : 0)),
      evidence: args.hasSatellite ? "Independent satellite failover improves continuity risk." : "Add an independent failover path where mission-critical operations require continuity.",
    },
  ];
  const weakest = [...componentScores].sort((a, b) => a.contributionPercent - b.contributionPercent)[0];
  const average = componentScores.reduce((total, component) => total + component.contributionPercent, 0) / componentScores.length;
  const biggestImpactUpgrade = weakest.component === "Power system"
    ? "Add monitored Victron inverter/charger capacity with Hubble Lithium battery autonomy sized for the critical radio, security, payment, and VoIP loads."
    : weakest.component === "Backhaul redundancy"
      ? "Add a second independently powered backhaul path, typically satellite failover or a second LOS-clear microwave path."
      : weakest.component === "Monitoring and remote management"
        ? "Bring all active network, energy, and battery components into cloud monitoring with alerting and owner escalation."
        : "Validate mast height, grounding, and radio selection during the CTTX field survey.";
  return {
    projectedUptimePercent: Number(Math.min(99.95, Math.max(82, average)).toFixed(2)),
    weakestComponent: weakest.component,
    biggestImpactUpgrade,
    componentScores,
  };
}

function buildProductStackRecommendation(applicationProfile: string[], hasUnmonitoredLegacyRisk: boolean): ProductStackRecommendation[] {
  return [
    {
      vendor: "Cambium Networks",
      role: "Carrier-grade wireless backhaul and distribution",
      recommendation: applicationProfile.includes("PTZ cameras") ? "Design symmetric Cambium microwave/ePMP or cnWave segments for camera uplink, control-room monitoring, VoIP, and payment traffic." : "Use managed Cambium radio links for LOS-clear backhaul, high-site backbone, and controlled property distribution.",
      remotelyManaged: true,
    },
    {
      vendor: "Victron Energy",
      role: "Site power, inverter/charger, solar, and telemetry",
      recommendation: "Size monitored Victron power systems for high sites, relays, security nodes, and the main lodge core so outage risk is engineered rather than assumed.",
      remotelyManaged: true,
    },
    {
      vendor: "Hubble Lithium",
      role: "Battery autonomy for high sites and critical operating nodes",
      recommendation: "Use Hubble Lithium storage where battery telemetry and predictable autonomy are required for remote infrastructure continuity.",
      remotelyManaged: !hasUnmonitoredLegacyRisk,
    },
  ];
}

function buildCisSubMetrics(args: {
  hasSitePin: boolean;
  mappedPointCount: number;
  hasFibreSignal: boolean;
  hasWirelessBackhaul: boolean;
  hasSatellite: boolean;
  knownProblems: string[];
  combinedText: string;
  infrastructurePoints: InfrastructurePointInput[];
}): CisSubMetric[] {
  const hasFibrePoint = hasCategory(args.infrastructurePoints, ["fibre", "fiber", "pop", "handoff", "dark fibre"]);
  const hasTowerPoint = hasCategory(args.infrastructurePoints, ["tower", "high-site", "high site", "microwave", "mast"]);
  const noSignalRisk = args.knownProblems.some((problem) => /no signal|dead zone|blackspot|valley/i.test(problem));
  const poorLteRisk = args.knownProblems.some((problem) => /poor lte|weak signal|intermittent/i.test(problem));
  const unreliableWispRisk = args.knownProblems.some((problem) => /unreliable wisp|wisp/i.test(problem));

  const fibreProximity = clampScore(
    24 +
      (args.hasSitePin ? 12 : 0) +
      (args.hasFibreSignal ? 28 : 0) +
      (hasFibrePoint ? 18 : 0) +
      Math.min(args.mappedPointCount * 4, 18),
  );
  const signalQuality = clampScore(
    42 +
      (args.hasWirelessBackhaul ? 14 : 0) +
      (hasTowerPoint ? 12 : 0) +
      (args.hasSatellite ? 8 : 0) +
      Math.min(args.mappedPointCount * 5, 20) -
      (noSignalRisk ? 14 : 0) -
      (poorLteRisk ? 8 : 0) -
      (unreliableWispRisk ? 6 : 0),
  );
  const backhaulType = clampScore(
    30 +
      (args.hasFibreSignal ? 24 : 0) +
      (args.hasWirelessBackhaul ? 18 : 0) +
      (args.hasSatellite ? 12 : 0) +
      (hasFibrePoint || hasTowerPoint ? 10 : 0) +
      (includesAny(args.combinedText, ["lte", "4g", "5g"]) ? 5 : 0),
  );

  return [
    {
      key: "fibreProximity",
      label: "Fibre Proximity",
      value: fibreProximity,
      evidence: hasFibrePoint || args.hasFibreSignal ? "Fibre, POP, or handoff evidence captured in intake data." : "No confirmed fibre or handoff evidence yet; desktop validation required.",
    },
    {
      key: "signalQuality",
      label: "Signal Quality",
      value: signalQuality,
      evidence: noSignalRisk || poorLteRisk ? "Known signal-risk problems reduce the preliminary quality estimate." : "Mapped pins and available backhaul notes support the preliminary signal estimate.",
    },
    {
      key: "backhaulType",
      label: "Backhaul Type",
      value: backhaulType,
      evidence: args.hasFibreSignal || args.hasWirelessBackhaul || args.hasSatellite ? "Recognised backhaul options were identified in the submitted connectivity notes." : "Backhaul type remains unconfirmed until CTTX validates nearby towers, fibre, or satellite options.",
    },
  ];
}

function severityFromScore(score: number): "Monitor" | "Medium" | "High" {
  if (score >= 72) return "High";
  if (score >= 48) return "Medium";
  return "Monitor";
}

function buildTciProfileSamples(args: {
  tciScore: number;
  propertySizeHa?: number;
  operationalZoneCount: number;
  mappedPointCount: number;
  combinedText: string;
  knownProblems: string[];
}): TciProfileSample[] {
  const hasValleyEvidence = includesAny(args.combinedText, ["valley", "kloof", "river", "shadow"]) || args.knownProblems.some((problem) => /no signal|valley|dead zone/i.test(problem));
  const hasRidgeEvidence = includesAny(args.combinedText, ["ridge", "mountain", "high-site", "high site", "line-of-sight", "los"]);
  const largePropertyLift = (args.propertySizeHa ?? 0) >= 10000 ? 8 : 0;
  const multiZoneLift = args.operationalZoneCount >= 4 ? 8 : 0;
  const mappedPointLift = Math.min(args.mappedPointCount * 3, 12);

  return [
    { distancePercent: 0, elevationPercent: clampPercent(22 + largePropertyLift), source: "site" },
    { distancePercent: 18, elevationPercent: clampPercent(hasValleyEvidence ? 24 : 36), source: "valley" },
    { distancePercent: 42, elevationPercent: clampPercent(38 + args.tciScore * 0.22 + mappedPointLift), source: "distribution" },
    { distancePercent: 68, elevationPercent: clampPercent((hasRidgeEvidence ? 64 : 48) + args.tciScore * 0.18 + multiZoneLift), source: "ridge" },
    { distancePercent: 100, elevationPercent: clampPercent(30 + largePropertyLift + mappedPointLift), source: "egress" },
  ];
}

function buildTciObstructionZones(args: {
  tciScore: number;
  propertySizeHa?: number;
  operationalZoneCount: number;
  mappedPointCount: number;
  combinedText: string;
  knownProblems: string[];
  profileSamples: TciProfileSample[];
}): TciObstructionZone[] {
  const hasValleyEvidence = includesAny(args.combinedText, ["valley", "kloof", "river", "shadow"]) || args.knownProblems.some((problem) => /no signal|valley|dead zone/i.test(problem));
  const hasRidgeEvidence = includesAny(args.combinedText, ["ridge", "mountain", "high-site", "high site", "line-of-sight", "los"]);
  const hasLongHaulExposure = (args.propertySizeHa ?? 0) >= 10000 || args.operationalZoneCount >= 4 || args.mappedPointCount >= 4;

  const zones: TciObstructionZone[] = [];
  if (hasValleyEvidence || args.tciScore >= 55) {
    zones.push({
      key: "valleyShadow",
      label: "Valley shadow",
      severity: severityFromScore(args.tciScore + (hasValleyEvidence ? 10 : 0)),
      startPercent: args.profileSamples[1]?.distancePercent ?? 18,
      endPercent: clampPercent((args.profileSamples[2]?.distancePercent ?? 42) + args.tciScore * 0.06),
      elevationPercent: args.profileSamples[1]?.elevationPercent ?? clampPercent(34 + args.tciScore * 0.22),
      evidence: hasValleyEvidence ? "Valley, river, shadow, or no-signal evidence appears in the submitted site context." : "TCI score is high enough to flag a probable low-lying shadow zone for validation.",
    });
  }

  if (hasRidgeEvidence || args.tciScore >= 45) {
    zones.push({
      key: "ridgeObstruction",
      label: "Ridge obstruction",
      severity: severityFromScore(args.tciScore + (hasRidgeEvidence ? 8 : 0)),
      startPercent: clampPercent((args.profileSamples[2]?.distancePercent ?? 42) + 4),
      endPercent: clampPercent((args.profileSamples[3]?.distancePercent ?? 68) + args.tciScore * 0.12),
      elevationPercent: args.profileSamples[3]?.elevationPercent ?? clampPercent(55 + args.tciScore * 0.25),
      evidence: hasRidgeEvidence ? "Ridge, mountain, high-site, or line-of-sight evidence appears in the submitted site context." : "Medium terrain complexity warrants ridge-path validation on the first engineering review.",
    });
  }

  if (hasLongHaulExposure) {
    zones.push({
      key: "longHaulExposure",
      label: "Long-haul exposure",
      severity: severityFromScore(args.tciScore + (args.mappedPointCount >= 4 ? 5 : 0)),
      startPercent: clampPercent((args.profileSamples[3]?.distancePercent ?? 68) + 4),
      endPercent: clampPercent((args.profileSamples[4]?.distancePercent ?? 100) - 6),
      elevationPercent: args.profileSamples[4]?.elevationPercent ?? clampPercent(45 + args.tciScore * 0.18),
      evidence: "Large property size, multiple operating zones, or several mapped pins indicate longer distribution paths that need obstruction checks.",
    });
  }

  return zones;
}

export function calculatePreliminaryAuditIntelligence(input: PreliminaryScoringInput) {
  const knownProblems = input.knownProblems ?? [];
  const operationalZones = input.operationalZones ?? [];
  const infrastructurePoints = input.infrastructurePoints ?? [];
  const applicationProfile = (input.applicationProfile ?? []).filter(Boolean);
  const mappedPoints = infrastructurePoints.filter(
    (point) => typeof point.latitude === "number" && typeof point.longitude === "number",
  );
  const combinedText = [input.currentConnectivity, input.infrastructureNotes, ...knownProblems, ...infrastructurePoints.map((point) => `${point.label} ${point.category} ${point.notes ?? ""}`)].filter(Boolean).join(" ");
  const hasSitePin = typeof input.latitude === "number" && typeof input.longitude === "number";
  const hasWirelessBackhaul = includesAny(combinedText, ["wisp", "microwave", "wireless", "tower", "lte", "5g", "4g"]);
  const hasFibreSignal = includesAny(combinedText, ["fibre", "fiber", "backhaul", "handoff", "pop", "dark fibre"]);
  const hasSatellite = includesAny(combinedText, ["starlink", "satellite", "vsat"]);
  const hasPowerRisk = knownProblems.some((problem) => /load|power|outage|shedding/i.test(problem));
  const hasRedundancyRisk = knownProblems.some((problem) => /redund|fail|unreliable|weak/i.test(problem));
  const hasPtzRequirement = applicationProfile.includes("PTZ cameras");
  const applicationProfileText = buildApplicationProfileText(applicationProfile);

  const cisSubMetrics = buildCisSubMetrics({
    hasSitePin,
    mappedPointCount: mappedPoints.length,
    hasFibreSignal,
    hasWirelessBackhaul,
    hasSatellite,
    knownProblems,
    combinedText,
    infrastructurePoints,
  });

  let cisScore = Math.round(cisSubMetrics.reduce((total, metric) => total + metric.value, 0) / cisSubMetrics.length);
  if (knownProblems.includes("No signal areas")) cisScore -= 4;
  if (knownProblems.includes("Unreliable WISP")) cisScore -= 3;

  let tciScore = 18;
  if ((input.propertySizeHa ?? 0) >= 10000) tciScore += 18;
  if ((input.propertySizeHa ?? 0) >= 50000) tciScore += 10;
  if (["Game Reserve", "Mining", "Farm"].includes(input.sector)) tciScore += 12;
  if (operationalZones.length >= 4) tciScore += 12;
  if (mappedPoints.length >= 3) tciScore += 8;
  if (knownProblems.includes("No signal areas")) tciScore += 10;
  if (includesAny(combinedText, ["valley", "mountain", "ridge", "kloof", "terrain", "river"])) tciScore += 10;

  let resilienceScore = 30;
  if (hasSatellite) resilienceScore += 16;
  if (hasFibreSignal) resilienceScore += 12;
  if (hasWirelessBackhaul) resilienceScore += 10;
  if (mappedPoints.length >= 2) resilienceScore += 10;
  if (mappedPoints.length >= 5) resilienceScore += 6;
  if (hasPowerRisk) resilienceScore -= 12;
  if (hasRedundancyRisk) resilienceScore -= 8;
  if (knownProblems.includes("No redundancy")) resilienceScore -= 10;

  const uptimeModel = buildUptimeModel({ hasPowerRisk, hasRedundancyRisk, hasSatellite, hasWirelessBackhaul, hasFibreSignal, mappedPointCount: mappedPoints.length, applicationProfile });
  const finalCisScore = clampScore(cisScore + (hasPtzRequirement ? 2 : 0));
  const finalTciScore = clampScore(tciScore);
  const finalResilienceScore = clampScore(uptimeModel.projectedUptimePercent);
  const payloadThroughputMbps = Math.max(35, Math.round(60 + mappedPoints.length * 18 + (hasFibreSignal ? 80 : 0) + (hasWirelessBackhaul ? 55 : 0) + (hasPtzRequirement ? 45 : 0) - finalTciScore * 0.35));
  const targetBer = "< 10^-6";
  const linkQuality = `${targetBer} target BER · ${payloadThroughputMbps} Mbps estimated actual payload throughput · ${hasPtzRequirement ? "symmetric PTZ uplink requirement flagged" : "asymmetric general-service payload acceptable until confirmed"}.`;
  const productStack = buildProductStackRecommendation(applicationProfile, includesAny(combinedText, ["unmanaged", "legacy", "consumer router", "unmonitored"]));
  const remoteMonitoringFlag = productStack.every((item) => item.remotelyManaged)
    ? "All recommended active layers are cloud-monitorable through Cambium Networks, Victron Energy, and Hubble Lithium operating telemetry."
    : "At least one recommended or legacy-dependent link cannot yet be confirmed as remotely monitored or managed; CTTX should flag it before proposal sign-off.";
  const tciProfileSamples = buildTciProfileSamples({
    tciScore: finalTciScore,
    propertySizeHa: input.propertySizeHa,
    operationalZoneCount: operationalZones.length,
    mappedPointCount: mappedPoints.length,
    combinedText,
    knownProblems,
  });
  const tciObstructionZones = buildTciObstructionZones({
    tciScore: finalTciScore,
    propertySizeHa: input.propertySizeHa,
    operationalZoneCount: operationalZones.length,
    mappedPointCount: mappedPoints.length,
    combinedText,
    knownProblems,
    profileSamples: tciProfileSamples,
  });

  const primaryArchitecture = hasFibreSignal
    ? "Backhaul from provider handoff through a monitored core at the main lodge, with LOS-clear high-site hubs forming the backbone and single LOS-clear distribution legs to internal facilities."
    : hasWirelessBackhaul
      ? "Multi-hop licensed microwave path from the nearest LOS-clear provider mast through intermediate high sites into the reserve backbone, then single clear distribution from high sites to facilities."
      : "Infrastructure discovery required: identify the minimum high-site set, then validate provider-to-high-site backhaul, high-site-to-high-site backbone redundancy, and facility distribution as separate LOS-clear layers.";

  const backupArchitecture = hasSatellite
    ? "Retain satellite/Starlink as independent monitored failover for command, payment, guest, camera, VoIP, and security-control traffic."
    : "Add monitored satellite or second-provider failover where the projected uptime model shows backhaul redundancy as a weak component.";

  const missingData: string[] = [];
  if (!hasSitePin) missingData.push("property pin");
  if (mappedPoints.length === 0) missingData.push("infrastructure or operational-zone pins");
  if (!hasText(input.currentConnectivity)) missingData.push("current connectivity method");
  if (!hasText(input.infrastructureNotes)) missingData.push("nearby tower, fibre, high-site, or handoff notes");

  const executiveSummary = hasSitePin
    ? `The intake has enough location context to start a practical first-pass connectivity review. The reserve has a preliminary connectivity score of ${finalCisScore}/100, a terrain complexity score of ${finalTciScore}/100, projected uptime of ${uptimeModel.projectedUptimePercent}%, target BER ${targetBer}, and estimated actual payload throughput of ${payloadThroughputMbps} Mbps. CTTX should now validate only LOS-clear backhaul, backbone, and facility-distribution segments before turning this into a priced design.`
    : `This report is an early readiness view. It can identify the next information required, but CTTX should not recommend a final network route until the property pin and infrastructure landing points have been captured.`;

  const reserveManagerRecommendations = [
    hasFibreSignal || hasWirelessBackhaul
      ? "Ask CTTX to validate the most likely backhaul route first, including line-of-sight, fibre handoff availability, tower access, and landlord/provider constraints."
      : "Nominate one or two likely high-sites, nearby towers, ridge points, or existing equipment rooms so CTTX can identify a realistic first backhaul path.",
    mappedPoints.length > 0
      ? "Use the mapped pins to prioritise the first coverage zones: main lodge, security control, gates, CCTV/sensor positions, water points, and anti-poaching posts."
      : "Add pins for the main lodge, entrance gates, security control room, pumps, CCTV zones, and any known tower or fibre sightings before the next review.",
    uptimeModel.projectedUptimePercent < 95
      ? `Treat uptime as an engineered requirement, not an add-on. The weakest component is ${uptimeModel.weakestComponent}; prepare power, mast, monitoring, and failover details for the follow-up call.`
      : `Keep uptime in the scope by confirming which applications must stay online; ${applicationProfileText}`,
    "Prepare the current connectivity provider details, monthly spend, invoices if available, speed tests, outage history, gate-access constraints, and preferred site contact for a CTTX engineering discovery call.",
  ];

  const followUpWorkflow = [
    "After the audit is submitted, CTTX reviews the property pin, infrastructure pins, current-connectivity notes, known problems, and budget context.",
    "CTTX should contact the submitted email to schedule a discovery call and confirm whether the next step is desktop validation, field survey, or direct proposal scoping.",
    "The engineering review should verify backhaul availability, line-of-sight, distribution zones, power resilience, commercial feasibility, and any access or environmental constraints before a final recommendation is issued.",
  ];

  const contactAction = `Next action: request a CTTX engineering discovery call. The reserve manager should prepare ${formatMissingData(missingData)} plus current provider, power, access, and priority-zone information.`;

  const engineeringNotes = [
    "Preliminary infrastructure intelligence generated from the intake data.",
    hasSitePin
      ? `The property pin is captured at ${input.latitude?.toFixed(6)}, ${input.longitude?.toFixed(6)}, which allows the next engineering step to evaluate high-sites, handoff options, terrain, and operational-zone reach.`
      : "A property pin has not been captured yet, so location-dependent tower, fibre, and terrain checks remain limited.",
    mappedPoints.length > 0
      ? `${mappedPoints.length} coordinate-backed infrastructure or operational-zone point${mappedPoints.length === 1 ? "" : "s"} were captured. These points can be used to reason about where a wireless link can land, which high-site hubs are justified, and which facilities need single LOS-clear distribution legs.`
      : "No infrastructure points were captured yet. The next useful action is to drop pins for candidate handoff sites, high sites, lodges, gates, security rooms, pumps, CCTV zones, and anti-poaching posts.",
    applicationProfileText,
    `Availability model: projected uptime ${uptimeModel.projectedUptimePercent}%, weakest component ${uptimeModel.weakestComponent}, biggest-impact upgrade: ${uptimeModel.biggestImpactUpgrade}`,
    `Link design target: ${linkQuality} CTTX designs toward minimum error rate and managed payload quality rather than headline maximum transmission speed.`,
    `Product stack recommendation: ${productStack.map((item) => `${item.vendor} for ${item.role}`).join("; ")}. ${remoteMonitoringFlag}`,
    tciObstructionZones.length > 0
      ? `Structured terrain flags for the first engineering review: ${tciObstructionZones.map((zone) => `${zone.label} (${zone.severity})`).join(", ")}.`
      : "No structured terrain obstruction zone has been flagged yet; confirm terrain risk during desktop validation.",
    missingData.length > 0
      ? `This is an estimate, not a final engineering design. Confidence will improve when the following data is added: ${missingData.join(", ")}.`
      : "The intake contains enough location and infrastructure context to produce a practical first-pass connectivity pathway for an engineering review.",
  ].join("\n\n");

  return {
    cisScore: finalCisScore,
    tciScore: finalTciScore,
    resilienceScore: finalResilienceScore,
    applicationProfile,
    projectedUptimePercent: uptimeModel.projectedUptimePercent,
    uptimeModel,
    targetBer,
    payloadThroughputMbps,
    linkQuality,
    productStack,
    remoteMonitoringFlag,
    cisSubMetrics,
    tciObstructionZones,
    tciProfileSamples,
    primaryArchitecture,
    backupArchitecture,
    engineeringNotes,
    executiveSummary,
    reserveManagerRecommendations,
    followUpWorkflow,
    contactAction,
  };
}
