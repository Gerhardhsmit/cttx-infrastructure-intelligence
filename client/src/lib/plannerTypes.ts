import { RESERVE_SITE_TYPES, type ReserveSiteTypeId } from "@shared/reserveFramework";
import type { GisAutoScanResult, GisClearSegment, GisPotentialHighSite, GisProviderMast, GisCoordinate } from "./gisAutoScan";

export type PlannerCoordinate = GisCoordinate;

export type PlannerLayerKey =
  | "inside"
  | "nearby"
  | "remote"
  | "vodacom"
  | "mtn"
  | "cellc"
  | "telkom"
  | "unknown"
  | "uplink"
  | "backbone"
  | "live"
  | "facilities";

export type HighSiteSource = "open-meteo-elevation" | "srtm" | "osm" | "manual";
export type HighSiteCategory = "inside" | "nearby" | "remote";
export type MastProvider = "vodacom" | "mtn" | "cellc" | "telkom" | "unknown";
export type NetworkLinkType = "uplink" | "backbone";

export const FACILITY_TYPES = {
  relay: { label: "Relay Candidate", icon: "📡", color: "#22c55e", reserveSiteType: "high_site" },
  lodge: { label: "Lodge", icon: "🏕️", color: "#3b82f6", reserveSiteType: "lodge" },
  gate: { label: "Gate", icon: "🚪", color: "#f59e0b", reserveSiteType: "gate" },
  camera: { label: "Camera Point", icon: "📷", color: "#8b5cf6", reserveSiteType: "sensor_zone" },
  ranger: { label: "Ranger Post", icon: "🛡️", color: "#22c55e", reserveSiteType: "anti_poaching_point" },
  pump: { label: "Water Pump", icon: "💧", color: "#06b6d4", reserveSiteType: "pump_site" },
  staff: { label: "Staff Quarters", icon: "🏠", color: "#94a3b8", reserveSiteType: "staff_village" },
  office: { label: "Office/HQ", icon: "🏢", color: "#f97316", reserveSiteType: "control_room" },
  other: { label: "Other", icon: "📍", color: "#e2e8f0", reserveSiteType: "lodge" },
} as const satisfies Record<string, { label: string; icon: string; color: string; reserveSiteType: ReserveSiteTypeId }>;

export type FacilityType = keyof typeof FACILITY_TYPES;

export type HighSite = PlannerCoordinate & {
  id: string;
  name: string;
  elevation: number | null;
  source: HighSiteSource;
  inside: boolean;
  distToBoundary: number;
  distToCentre: number;
  category: HighSiteCategory;
};

export type Mast = PlannerCoordinate & {
  id: string;
  name: string;
  provider: MastProvider;
  distFromCentre: number;
  distFromNearestRelay: number;
  nearestRelayName: string | null;
  selected: boolean;
  closestForProvider: boolean;
  hiddenByDefault: boolean;
};

export type NetworkLink = {
  id: string;
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  type: NetworkLinkType;
  live: boolean;
  distKm: number;
  path: [PlannerCoordinate, PlannerCoordinate];
  justification: string;
  viable: boolean;
};

export type Facility = PlannerCoordinate & {
  id: string;
  type: FacilityType;
  name: string;
};

export type PlannerThresholds = {
  viableLinkThresholdKm: number;
};

export type SerializedPlannerTopologyLink = {
  type: NetworkLinkType;
  fromName: string;
  toName: string;
  distKm: number;
  rslDbm: number;
  fadeMarginDb: number;
  outOfRange: boolean;
};

export type SerializedPlannerTopologyHighSite = {
  name: string;
  category: HighSiteCategory;
  elevation: number | null;
  source: HighSiteSource;
  lat: number;
  lng: number;
};

export type SerializedPlannerTopologyMast = {
  name: string;
  provider: MastProvider;
  closestForProvider: boolean;
  lat: number;
  lng: number;
};

export type SerializedPlannerTopologyFacility = {
  name: string;
  type: FacilityType;
  lat: number;
  lng: number;
};

export type SerializedPlannerTopology = {
  planName: string;
  propertyName: string;
  totalDistanceKm: number;
  liveDistanceKm: number;
  linkCount: number;
  uplinkCount: number;
  backboneCount: number;
  overThresholdCount: number;
  weakestFadeMarginDb: number;
  viableLinkThresholdKm: number;
  routeDecisionExplanation: string;
  recommendationSummary: string;
  links: SerializedPlannerTopologyLink[];
  highSites: SerializedPlannerTopologyHighSite[];
  selectedMast: SerializedPlannerTopologyMast | null;
  facilities: SerializedPlannerTopologyFacility[];
};

export type PlannerState = {
  propertyName: string;
  propertyCentre: PlannerCoordinate | null;
  boundaryPolygon: PlannerCoordinate[] | null;
  boundaryAreaHa: number;
  highSites: HighSite[];
  masts: Mast[];
  selectedMastIndex: number | null;
  links: NetworkLink[];
  facilities: Facility[];
  layerVis: Record<PlannerLayerKey, boolean>;
  recommendationSummary: string;
};

export const DEFAULT_PLANNER_LAYER_VISIBILITY: Record<PlannerLayerKey, boolean> = {
  inside: true,
  nearby: true,
  remote: false,
  vodacom: true,
  mtn: true,
  cellc: true,
  telkom: true,
  unknown: false,
  uplink: true,
  backbone: true,
  live: true,
  facilities: true,
};

export function normalizeProvider(provider: string | undefined): MastProvider {
  const value = (provider ?? "").trim().toLowerCase();
  if (value.includes("vodacom")) return "vodacom";
  if (value.includes("mtn")) return "mtn";
  if (value.includes("cell c") || value.includes("cellc")) return "cellc";
  if (value.includes("telkom")) return "telkom";
  return "unknown";
}

export function mapHighSiteCategory(siteClass: GisPotentialHighSite["siteClass"]): HighSiteCategory {
  if (siteClass === "inside-boundary") return "inside";
  if (siteClass === "off-property-near") return "nearby";
  return "remote";
}

export function mapHighSiteSource(source: GisPotentialHighSite["source"]): HighSiteSource {
  if (source === "open-meteo-elevation") return "open-meteo-elevation";
  if (source === "srtm-sampled" || source === "deterministic-terrain-model" || source === "google-elevation-sampled") return "srtm";
  return "srtm";
}

export function estimateBoundaryAreaHa(polygon: PlannerCoordinate[] | null | undefined): number {
  if (!polygon || polygon.length < 3) return 0;
  const meanLat = polygon.reduce((total, point) => total + point.lat, 0) / polygon.length;
  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = Math.cos((meanLat * Math.PI) / 180) * 111_320;
  const shoelace = polygon.reduce((total, point, index) => {
    const next = polygon[(index + 1) % polygon.length];
    return total + point.lng * metersPerDegreeLng * next.lat * metersPerDegreeLat - next.lng * metersPerDegreeLng * point.lat * metersPerDegreeLat;
  }, 0);
  return Number((Math.abs(shoelace) / 2 / 10_000).toFixed(1));
}

export function convertGisHighSite(site: GisPotentialHighSite): HighSite {
  const category = mapHighSiteCategory(site.siteClass);
  return {
    id: site.id,
    lat: site.lat,
    lng: site.lng,
    name: site.label,
    elevation: site.elevationMeters,
    source: mapHighSiteSource(site.source),
    inside: category === "inside",
    distToBoundary: category === "inside" ? 0 : Number(Math.max(0, site.distanceFromPropertyCenterKm - 1.4).toFixed(2)),
    distToCentre: site.distanceFromPropertyCenterKm,
    category,
  };
}

export function convertGisMast(mast: GisProviderMast, selected: boolean): Mast {
  return {
    id: mast.id,
    lat: mast.lat,
    lng: mast.lng,
    name: mast.label,
    provider: normalizeProvider(mast.provider),
    distFromCentre: mast.distanceKm,
    distFromNearestRelay: mast.distanceFromNearestOnPropertyHighSiteKm ?? mast.distanceKm,
    nearestRelayName: mast.nearestOnPropertyHighSiteLabel ?? null,
    selected,
    closestForProvider: Boolean(mast.isClosestForProvider),
    hiddenByDefault: Boolean(mast.hiddenByDefault),
  };
}

export function convertGisLink(segment: GisClearSegment): NetworkLink | null {
  if (!segment.viable) return null;
  if (segment.role !== "uplink" && segment.role !== "backbone") return null;
  if (segment.distanceKm > 15) return null;
  return {
    id: segment.id,
    fromId: segment.sourceId,
    toId: segment.targetId,
    fromName: segment.sourceLabel,
    toName: segment.targetLabel,
    type: segment.role,
    live: false,
    distKm: segment.distanceKm,
    path: segment.path,
    justification: segment.justification,
    viable: true,
  };
}

export function buildPlannerStateFromGisScan(input: {
  propertyName: string;
  scan: GisAutoScanResult;
  selectedMastId?: string;
  previous?: Partial<Pick<PlannerState, "facilities" | "layerVis">>;
}): PlannerState {
  const selectedMastId = input.selectedMastId ?? input.scan.minimumHighSitePlan.clearSegments.find((segment) => segment.role === "uplink")?.sourceId ?? input.scan.providerMasts[0]?.id;
  const selectedMastIndex = input.scan.providerMasts.findIndex((mast) => mast.id === selectedMastId);
  const highSites = input.scan.potentialHighSites.map(convertGisHighSite);
  const masts = input.scan.providerMasts.map((mast) => convertGisMast(mast, mast.id === selectedMastId));
  const links = input.scan.minimumHighSitePlan.clearSegments.map(convertGisLink).filter((link): link is NetworkLink => Boolean(link));
  const uplink = links.find((link) => link.type === "uplink");
  const backboneCount = links.filter((link) => link.type === "backbone").length;
  const selectedMast = masts.find((mast) => mast.selected) ?? masts[0];
  const recommendationSummary = `Minimum viable topology: ${input.scan.minimumHighSitePlan.recommendedHighSiteCount} high-site(s), one earned uplink${uplink && selectedMast ? ` from ${selectedMast.name}` : ""}, and ${backboneCount} nearest-neighbour backbone segment(s). The Link Planner mirrors the audit-map rules: only clear LOS links under the 15 km viability ceiling are shown, with Cambium Networks radios, cnMaestro visibility, Victron Energy power architecture, and Hubble Lithium storage considered during field validation.`;

  return {
    propertyName: input.propertyName,
    propertyCentre: input.scan.property,
    boundaryPolygon: input.scan.propertyBoundary.polygon,
    boundaryAreaHa: estimateBoundaryAreaHa(input.scan.propertyBoundary.polygon),
    highSites,
    masts,
    selectedMastIndex: selectedMastIndex >= 0 ? selectedMastIndex : masts.length > 0 ? 0 : null,
    links,
    facilities: input.previous?.facilities ?? [],
    layerVis: { ...DEFAULT_PLANNER_LAYER_VISIBILITY, ...(input.previous?.layerVis ?? {}) },
    recommendationSummary,
  };
}

export const PLANNER_FACILITY_OPTIONS = Object.entries(FACILITY_TYPES).map(([id, option]) => ({
  id: id as FacilityType,
  ...option,
  reserveLabel: RESERVE_SITE_TYPES.find((siteType) => siteType.id === option.reserveSiteType)?.label ?? option.label,
}));
