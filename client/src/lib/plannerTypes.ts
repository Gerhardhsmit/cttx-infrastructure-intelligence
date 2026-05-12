import { RESERVE_SITE_TYPES, type ReserveSiteTypeId } from "@shared/reserveFramework";
import type { GisAutoScanResult, GisClearSegment, GisPotentialHighSite, GisProviderMast, GisCoordinate, GisDetectedFacility, GisLosStatus } from "./gisAutoScan";

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
  | "distribution"
  | "live"
  | "facilities";

export type HighSiteSource = "open-meteo-elevation" | "srtm" | "osm" | "manual";
export type HighSiteCategory = "inside" | "nearby" | "remote";
export type MastProvider = "vodacom" | "mtn" | "cellc" | "telkom" | "unknown";
export type NetworkLinkType = "uplink" | "backbone" | "distribution";

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
  antennaHeightM?: number;
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
  antennaHeightM?: number;
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
  losStatus: GisLosStatus;
  terrainMarginMeters?: number;
  elevationProfile?: number[];
};

export type Facility = PlannerCoordinate & {
  id: string;
  type: FacilityType;
  name: string;
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
  distribution: true,
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
  if (source === "osm-overpass") return "osm";
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

export const DEFAULT_HIGH_SITE_ANTENNA_HEIGHT_M = 30;
export const DEFAULT_CARRIER_MAST_HEIGHT_M = 45;

export function convertGisHighSite(site: GisPotentialHighSite, previous?: HighSite): HighSite {
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
    antennaHeightM: previous?.antennaHeightM ?? DEFAULT_HIGH_SITE_ANTENNA_HEIGHT_M,
  };
}

export function convertGisMast(mast: GisProviderMast, selected: boolean, previous?: Mast): Mast {
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
    antennaHeightM: previous?.antennaHeightM ?? DEFAULT_CARRIER_MAST_HEIGHT_M,
  };
}

export function convertGisFacility(facility: GisDetectedFacility): Facility {
  return {
    id: facility.id,
    lat: facility.lat,
    lng: facility.lng,
    type: facility.type,
    name: facility.label,
  };
}

export function convertGisLink(segment: GisClearSegment): NetworkLink | null {
  if (segment.role !== "uplink" && segment.role !== "backbone" && segment.role !== "distribution") return null;
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
    viable: segment.viable,
    losStatus: segment.losStatus ?? (segment.viable ? "confirmed" : "blocked"),
    terrainMarginMeters: segment.terrainMarginMeters,
    elevationProfile: segment.elevationProfile,
  };
}

export function buildPlannerStateFromGisScan(input: {
  propertyName: string;
  scan: GisAutoScanResult;
  selectedMastId?: string;
  previous?: Partial<Pick<PlannerState, "facilities" | "layerVis" | "highSites" | "masts">>;
}): PlannerState {
  const selectedMastId = input.selectedMastId ?? input.scan.minimumHighSitePlan.clearSegments.find((segment) => segment.role === "uplink")?.targetId ?? input.scan.providerMasts[0]?.id;
  const selectedMastIndex = input.scan.providerMasts.findIndex((mast) => mast.id === selectedMastId);
  const previousHighSiteById = new Map((input.previous?.highSites ?? []).map((site) => [site.id, site]));
  const previousMastById = new Map((input.previous?.masts ?? []).map((mast) => [mast.id, mast]));
  const highSites = input.scan.potentialHighSites.map((site) => convertGisHighSite(site, previousHighSiteById.get(site.id)));
  const masts = input.scan.providerMasts.map((mast) => convertGisMast(mast, mast.id === selectedMastId, previousMastById.get(mast.id)));
  const links = input.scan.minimumHighSitePlan.clearSegments.map(convertGisLink).filter((link): link is NetworkLink => Boolean(link));
  const detectedFacilities = input.scan.detectedFacilities.map(convertGisFacility);
  const previousFacilities = input.previous?.facilities ?? [];
  const facilityById = new Map<string, Facility>();
  detectedFacilities.forEach((facility) => facilityById.set(facility.id, facility));
  previousFacilities.forEach((facility) => facilityById.set(facility.id, facility));
  const uplink = links.find((link) => link.type === "uplink");
  const backboneCount = links.filter((link) => link.type === "backbone").length;
  const distributionCount = links.filter((link) => link.type === "distribution").length;
  const selectedMast = masts.find((mast) => mast.selected) ?? masts[0];
  const recommendationSummary = `API-backed topology: ${input.scan.minimumHighSitePlan.recommendedHighSiteCount} high-site(s), ${distributionCount} facility-to-high-site path(s), ${backboneCount} backbone segment(s), and ${uplink && selectedMast ? `a carrier mast uplink via ${selectedMast.name}` : "carrier mast uplink diagnostics"}. Green links are confirmed LOS, amber links are marginal, and red links are blocked diagnostics requiring field validation.`;

  return {
    propertyName: input.propertyName,
    propertyCentre: input.scan.property,
    boundaryPolygon: input.scan.propertyBoundary.polygon,
    boundaryAreaHa: estimateBoundaryAreaHa(input.scan.propertyBoundary.polygon),
    highSites,
    masts,
    selectedMastIndex: selectedMastIndex >= 0 ? selectedMastIndex : masts.length > 0 ? 0 : null,
    links,
    facilities: Array.from(facilityById.values()),
    layerVis: { ...DEFAULT_PLANNER_LAYER_VISIBILITY, ...(input.previous?.layerVis ?? {}) },
    recommendationSummary,
  };
}

export const PLANNER_FACILITY_OPTIONS = Object.entries(FACILITY_TYPES).map(([id, option]) => ({
  id: id as FacilityType,
  ...option,
  reserveLabel: RESERVE_SITE_TYPES.find((siteType) => siteType.id === option.reserveSiteType)?.label ?? option.label,
}));
