export type BusinessDriverId = "threats" | "hospitality" | "operations";

export type ReserveSiteTypeId =
  | "high_site"
  | "lodge"
  | "gate"
  | "security_post"
  | "control_room"
  | "staff_village"
  | "workshop"
  | "pump_site"
  | "sensor_zone"
  | "fence_line"
  | "anti_poaching_point"
  | "backhaul_handoff";

export type HighSiteTopologyRole = "hub" | "spoke" | "relay" | "handoff";

export type BusinessDriver = {
  id: BusinessDriverId;
  label: string;
  shortLabel: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  question: string;
  reportFocus: string;
  examples: string[];
};

export type ReserveSiteType = {
  id: ReserveSiteTypeId;
  label: string;
  topologyRole: HighSiteTopologyRole;
  defaultDrivers: BusinessDriverId[];
  description: string;
};

export const BUSINESS_DRIVERS: BusinessDriver[] = [
  {
    id: "threats",
    label: "Threats",
    shortLabel: "Threats",
    color: "#EF4444",
    bgClass: "bg-red-500/10",
    textClass: "text-red-300",
    borderClass: "border-red-400/40",
    question: "Will the network close anti-poaching, perimeter, emergency, CCTV, and access-control blind spots?",
    reportFocus: "Security resilience, threat response, sensor backhaul, and control-room continuity.",
    examples: ["anti-poaching teams", "CCTV and sensors", "perimeter fence lines", "security gates", "emergency comms"],
  },
  {
    id: "hospitality",
    label: "Hospitality",
    shortLabel: "Guest",
    color: "#F59E0B",
    bgClass: "bg-amber-500/10",
    textClass: "text-amber-300",
    borderClass: "border-amber-400/40",
    question: "Will the network protect guest experience, bookings, payments, lodge Wi-Fi, and review-sensitive services?",
    reportFocus: "Guest-facing connectivity, lodge uptime, payment reliability, and reputation protection.",
    examples: ["main lodge Wi-Fi", "guest suites", "payments", "bookings", "VoIP and concierge"],
  },
  {
    id: "operations",
    label: "Operations",
    shortLabel: "Ops",
    color: "#22C55E",
    bgClass: "bg-emerald-500/10",
    textClass: "text-emerald-300",
    borderClass: "border-emerald-400/40",
    question: "Will the network reduce operational delays across staff, pumps, workshops, logistics, and management systems?",
    reportFocus: "Day-to-day operating continuity, staff coordination, telemetry, pumps, stock, and management workflows.",
    examples: ["staff village", "workshop", "water pumps", "logistics", "management systems"],
  },
];

export const BUSINESS_DRIVER_BY_ID = BUSINESS_DRIVERS.reduce(
  (accumulator, driver) => ({ ...accumulator, [driver.id]: driver }),
  {} as Record<BusinessDriverId, BusinessDriver>,
);

export const RESERVE_SITE_TYPES: ReserveSiteType[] = [
  { id: "high_site", label: "High site / repeater hub", topologyRole: "hub", defaultDrivers: ["threats", "operations"], description: "Primary ridge, tower, or building hub for star-topology distribution." },
  { id: "backhaul_handoff", label: "External backhaul handoff", topologyRole: "handoff", defaultDrivers: ["operations"], description: "Point where fibre, WISP, microwave, LTE, or carrier services can enter the property network." },
  { id: "lodge", label: "Lodge / guest area", topologyRole: "spoke", defaultDrivers: ["hospitality", "operations"], description: "Guest-facing operating area with Wi-Fi, VoIP, payments, and staff coordination needs." },
  { id: "gate", label: "Gate / access-control point", topologyRole: "spoke", defaultDrivers: ["threats", "operations"], description: "Controlled entry point requiring access, voice, CCTV, and emergency communications." },
  { id: "security_post", label: "Security post", topologyRole: "spoke", defaultDrivers: ["threats"], description: "Remote guard, patrol, or tactical security post." },
  { id: "control_room", label: "Control room", topologyRole: "hub", defaultDrivers: ["threats", "operations"], description: "Operational command location that aggregates alerts, cameras, and incident response." },
  { id: "staff_village", label: "Staff village", topologyRole: "spoke", defaultDrivers: ["operations"], description: "Staff accommodation and coordination area." },
  { id: "workshop", label: "Workshop", topologyRole: "spoke", defaultDrivers: ["operations"], description: "Maintenance and fleet support site." },
  { id: "pump_site", label: "Water / pump / power site", topologyRole: "spoke", defaultDrivers: ["operations"], description: "Utility telemetry, pump, power, or water-control site." },
  { id: "sensor_zone", label: "CCTV / sensor zone", topologyRole: "spoke", defaultDrivers: ["threats"], description: "Camera, sensor, analytics, or telemetry cluster." },
  { id: "fence_line", label: "Fence line", topologyRole: "spoke", defaultDrivers: ["threats"], description: "Long perimeter segment needing surveillance, alerts, or patrol communications." },
  { id: "anti_poaching_point", label: "Anti-poaching observation point", topologyRole: "relay", defaultDrivers: ["threats"], description: "Observation, patrol, or early-warning point that may relay through a high site." },
];

export const RESERVE_SITE_TYPE_BY_ID = RESERVE_SITE_TYPES.reduce(
  (accumulator, siteType) => ({ ...accumulator, [siteType.id]: siteType }),
  {} as Record<ReserveSiteTypeId, ReserveSiteType>,
);

const LOCATION_TYPE_TO_SITE_TYPE: Record<string, ReserveSiteTypeId> = {
  lodge: "lodge",
  gate: "gate",
  "security post": "security_post",
  "control room": "control_room",
  "staff village": "staff_village",
  workshop: "workshop",
  "water/pump site": "pump_site",
  "cctv/sensor zone": "sensor_zone",
  "fence line": "fence_line",
  "anti-poaching point": "anti_poaching_point",
};

const CATEGORY_TO_DRIVER: Record<string, BusinessDriverId[]> = {
  "security blind spot": ["threats"],
  "coverage gap": ["operations"],
  "unstable link": ["operations", "hospitality"],
  "power dependency": ["operations"],
  "operational delay": ["operations"],
  "guest experience": ["hospitality"],
};

export function getBusinessDrivers(ids: BusinessDriverId[] | undefined): BusinessDriver[] {
  return Array.from(new Set(ids ?? [])).map((id) => BUSINESS_DRIVER_BY_ID[id]).filter(Boolean);
}

export function inferReserveSiteType(locationType: string): ReserveSiteTypeId {
  return LOCATION_TYPE_TO_SITE_TYPE[locationType.trim().toLowerCase()] ?? "lodge";
}

export function inferDriversForLocation(locationType: string, requirement = "", impact = ""): BusinessDriverId[] {
  const siteType = RESERVE_SITE_TYPE_BY_ID[inferReserveSiteType(locationType)];
  const haystack = `${locationType} ${requirement} ${impact}`.toLowerCase();
  const inferred = new Set<BusinessDriverId>(siteType.defaultDrivers);

  if (/guest|lodge|booking|payment|wifi|wi-fi|review|hospitality/.test(haystack)) inferred.add("hospitality");
  if (/security|poach|cctv|sensor|gate|fence|threat|control|emergency|patrol/.test(haystack)) inferred.add("threats");
  if (/pump|staff|workshop|operations|operational|logistics|water|power|management|fleet/.test(haystack)) inferred.add("operations");

  return Array.from(inferred);
}

export function inferDriversForPainPoint(category: string, description = "", impact = ""): BusinessDriverId[] {
  const haystack = `${category} ${description} ${impact}`.toLowerCase();
  const inferred = new Set<BusinessDriverId>(CATEGORY_TO_DRIVER[category.trim().toLowerCase()] ?? ["operations"]);

  if (/guest|lodge|booking|payment|wifi|wi-fi|review|hospitality/.test(haystack)) inferred.add("hospitality");
  if (/security|poach|cctv|sensor|gate|fence|threat|control|emergency|patrol/.test(haystack)) inferred.add("threats");
  if (/pump|staff|workshop|operations|operational|logistics|water|power|management|fleet|delay/.test(haystack)) inferred.add("operations");

  return Array.from(inferred);
}

export function formatDriverLabels(ids: BusinessDriverId[] | undefined): string {
  const labels = getBusinessDrivers(ids).map((driver) => driver.label);
  return labels.length > 0 ? labels.join(" + ") : "Operations";
}

export function describeTopologyRole(siteTypeId: ReserveSiteTypeId): string {
  const siteType = RESERVE_SITE_TYPE_BY_ID[siteTypeId];
  if (!siteType) return "spoke site";
  if (siteType.topologyRole === "hub") return "High-site hub in the reserve star topology";
  if (siteType.topologyRole === "handoff") return "External service handoff feeding the reserve topology";
  if (siteType.topologyRole === "relay") return "Relay or observation spoke that may extend the hub";
  return "Spoke endpoint served from the nearest high-site hub";
}
