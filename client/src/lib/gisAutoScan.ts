export type GisProvider = "Vodacom" | "MTN" | "Cell C" | "Telkom" | "Unknown";

export type GisCoordinate = {
  lat: number;
  lng: number;
};

export type GisProviderMast = GisCoordinate & {
  id: string;
  provider: GisProvider;
  label: string;
  color: string;
  bearingDeg: number;
  distanceKm: number;
  confidence: number;
  source: "provider-scan" | "asset-register" | "osm-overpass" | "opencellid";
  priorityRank?: number;
  distanceFromNearestOnPropertyHighSiteKm?: number;
  nearestOnPropertyHighSiteLabel?: string;
  isClosestForProvider?: boolean;
  hiddenByDefault?: boolean;
  tags?: Record<string, string>;
};

export type GisRoute = {
  id: string;
  label: string;
  provider: string;
  color: string;
  path: GisCoordinate[];
  distanceKm: number;
  confidence: number;
};

export type GisContour = {
  id: string;
  label: string;
  radiusKm: number;
  elevationMeters: number;
  color: string;
};

export type GisCorridor = {
  id: string;
  label: string;
  operator: "Eskom";
  color: string;
  path: GisCoordinate[];
  distanceKm: number;
  confidence: number;
};

export type GisPropertyBoundary = {
  id: string;
  label: string;
  source: "osm-nominatim" | "computed-footprint";
  confidence: number;
  centroid: GisCoordinate;
  polygon: GisCoordinate[];
  radiusKm: number;
};

export type GisHighSiteClass = "inside-boundary" | "off-property-near" | "remote";

export type GisPotentialHighSite = GisCoordinate & {
  id: string;
  label: string;
  elevationMeters: number;
  rank: number;
  source: "open-meteo-elevation" | "srtm-sampled" | "google-elevation-sampled" | "deterministic-terrain-model" | "osm-overpass";
  siteClass: GisHighSiteClass;
  distanceFromPropertyCenterKm: number;
};

export type GisLosClassification = "green" | "yellow" | "red";
export type GisLosStatus = "confirmed" | "marginal" | "blocked" | "unknown";

export type GisLosCandidate = {
  id: string;
  peakId: string;
  peakLabel: string;
  mastId: string;
  mastLabel: string;
  provider: GisProvider;
  color: string;
  classification: GisLosClassification;
  classificationLabel: string;
  distanceKm: number;
  bearingDeg: number;
  azimuthLabel: string;
  terrainMarginMeters: number;
  path: [GisCoordinate, GisCoordinate];
  source: "opentopodata-srtm" | "deterministic-srtm-model" | "open-meteo-elevation";
  losStatus?: GisLosStatus;
  elevationProfile?: number[];
};

export type GisLosSummary = {
  green: number;
  yellow: number;
  red: number;
  bestCandidate: GisLosCandidate | null;
};

export type GisClearSegment = {
  id: string;
  sourceId: string;
  sourceLabel: string;
  targetId: string;
  targetLabel: string;
  path: [GisCoordinate, GisCoordinate];
  distanceKm: number;
  role: "uplink" | "backhaul" | "backbone" | "distribution";
  justification: string;
  viable: boolean;
  outOfRange?: boolean;
  losStatus?: GisLosStatus;
  terrainMarginMeters?: number;
  elevationProfile?: number[];
};

export type GisDetectedFacilityType = "relay" | "lodge" | "gate" | "camera" | "ranger" | "pump" | "staff" | "office" | "other";

export type GisDetectedFacility = GisCoordinate & {
  id: string;
  type: GisDetectedFacilityType;
  label: string;
  source: "osm-overpass";
  tags?: Record<string, string>;
};

export type GisMinimumHighSitePlan = {
  recommendedHighSiteCount: number;
  coverageHighSiteCount: number;
  redundancyHighSiteCount: number;
  costJustification: string[];
  clearSegments: GisClearSegment[];
  multiHopBackhaul: GisClearSegment[];
};

export type GisIncidentRelayResult = {
  incident: GisCoordinate;
  relay: GisPotentialHighSite;
  distanceKm: number;
  azimuthDeg: number;
  azimuthLabel: string;
  linkQuality: "Good" | "Marginal" | "Poor";
  emergencyCommsFeasible: boolean;
  classification: GisLosClassification;
};

export type GisNearestMastSummary = {
  provider: GisProvider;
  label: string;
  color: string;
  distanceKm: number;
  bearingDeg: number;
  bearing: string;
  confidence: number;
  source: GisProviderMast["source"];
};

export type GisAutoScanResult = {
  property: GisCoordinate;
  propertyBoundary: GisPropertyBoundary;
  potentialHighSites: GisPotentialHighSite[];
  providerMasts: GisProviderMast[];
  priorityMasts: GisProviderMast[];
  fibreRoutes: GisRoute[];
  terrainContours: GisContour[];
  eskomCorridors: GisCorridor[];
  detectedFacilities: GisDetectedFacility[];
  losCandidates: GisLosCandidate[];
  losSummary: GisLosSummary;
  clearLosCandidates: GisLosCandidate[];
  minimumHighSitePlan: GisMinimumHighSitePlan;
  nearestMasts: GisNearestMastSummary[];
  scanRadiusKm: number;
  providerScanRadiusKm: number;
  scanIssues: string[];
};

export type GisAutoScanOptions = {
  propertyName?: string;
  includeBlockedDiagnostics?: boolean;
};

type NominatimResult = {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  display_name?: string;
  lat?: string;
  lon?: string;
  boundingbox?: string[];
  geojson?: unknown;
};

type LineOfSightResult = {
  hasLOS: boolean;
  losStatus: GisLosStatus;
  worstClearance: number;
  elevationProfile: number[];
  error?: string;
};

export const GIS_PROVIDER_STYLES: Record<GisProvider, { color: string; seedBearing: number; seedDistanceKm: number }> = {
  Vodacom: { color: "#E60000", seedBearing: 0, seedDistanceKm: 0 },
  MTN: { color: "#FFCC00", seedBearing: 0, seedDistanceKm: 0 },
  "Cell C": { color: "#22C55E", seedBearing: 0, seedDistanceKm: 0 },
  Telkom: { color: "#0072CE", seedBearing: 0, seedDistanceKm: 0 },
  Unknown: { color: "#94A3B8", seedBearing: 0, seedDistanceKm: 0 },
};

export const GIS_LOS_CLASSIFICATION_STYLES: Record<GisLosClassification, { color: string; label: string; quality: "Good" | "Marginal" | "Poor" }> = {
  green: { color: "#22C55E", label: "Green confirmed LOS", quality: "Good" },
  yellow: { color: "#F59E0B", label: "Amber marginal LOS", quality: "Marginal" },
  red: { color: "#EF4444", label: "Red blocked LOS", quality: "Poor" },
};

const EARTH_RADIUS_KM = 6371.0088;
const OPEN_METEO_ELEVATION_URL = "https://api.open-meteo.com/v1/elevation";
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];
const HIGH_SITE_GRID_SIZE = 10;
const LOS_SAMPLE_COUNT = 20;
const FACILITY_ANTENNA_HEIGHT_M = 10;
const HIGH_SITE_ANTENNA_HEIGHT_M = 30;
const CARRIER_MAST_HEIGHT_M = 40;
const LOS_MARGIN_METRES = 10;
const LOS_CONCURRENCY = 6;
const MAX_FACILITY_LOS_PAIRS = 640;
const MAX_MAST_LOS_PAIRS = 360;
const scanCache = new Map<string, GisAutoScanResult>();

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number) {
  return (value * 180) / Math.PI;
}

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

function cacheKey(origin: GisCoordinate, propertyName?: string) {
  return `${propertyName ?? ""}|${origin.lat.toFixed(6)},${origin.lng.toFixed(6)}`;
}

export function isValidCoordinate(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function isValidGisCoordinate(point: Partial<GisCoordinate> | null | undefined): point is GisCoordinate {
  return Boolean(point && isValidCoordinate(Number(point.lat), Number(point.lng)));
}

function finiteCoordinatePair(lat: unknown, lng: unknown): GisCoordinate | null {
  const coordinate = { lat: typeof lat === "number" ? lat : Number(lat), lng: typeof lng === "number" ? lng : Number(lng) };
  return isValidGisCoordinate(coordinate) ? coordinate : null;
}

export function sanitizeCoordinate(point: Partial<GisCoordinate> | null | undefined): GisCoordinate | null {
  if (!isValidGisCoordinate(point)) return null;
  return { lat: Number(point.lat), lng: Number(point.lng) };
}

export function sanitizePath<T extends Partial<GisCoordinate>>(points: T[] | null | undefined): GisCoordinate[] {
  return (points ?? []).map((point) => sanitizeCoordinate(point)).filter((point): point is GisCoordinate => Boolean(point));
}

export function getDestinationPoint(origin: GisCoordinate, distanceKm: number, bearingDeg: number): GisCoordinate {
  const angularDistance = distanceKm / EARTH_RADIUS_KM;
  const bearing = toRadians(bearingDeg);
  const lat1 = toRadians(origin.lat);
  const lng1 = toRadians(origin.lng);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angularDistance) + Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing));
  const lng2 = lng1 + Math.atan2(Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1), Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: Number(toDegrees(lat2).toFixed(6)), lng: Number((((toDegrees(lng2) + 540) % 360) - 180).toFixed(6)) };
}

export function calculateDistanceKm(a: GisCoordinate, b: GisCoordinate) {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLng = toRadians(b.lng - a.lng);
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function calculateBearingDeg(a: GisCoordinate, b: GisCoordinate) {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLng = toRadians(b.lng - a.lng);
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  return normalizeDegrees(toDegrees(Math.atan2(y, x)));
}

export function formatBearing(degrees: number) {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return directions[Math.round(normalizeDegrees(degrees) / 22.5) % directions.length];
}

export function pointInPolygon(point: GisCoordinate, polygon: GisCoordinate[]) {
  if (!isValidGisCoordinate(point) || polygon.length < 3) return false;
  let inside = false;
  const x = point.lng;
  const y = point.lat;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function centroidFromPolygon(polygon: GisCoordinate[], fallback: GisCoordinate): GisCoordinate {
  const valid = sanitizePath(polygon);
  if (!valid.length) return fallback;
  return {
    lat: Number((valid.reduce((sum, point) => sum + point.lat, 0) / valid.length).toFixed(6)),
    lng: Number((valid.reduce((sum, point) => sum + point.lng, 0) / valid.length).toFixed(6)),
  };
}

function boundaryRadiusKm(polygon: GisCoordinate[], centroid: GisCoordinate) {
  if (!polygon.length) return 0;
  return Number(Math.max(...polygon.map((point) => calculateDistanceKm(point, centroid))).toFixed(2));
}

function boundsFromBoundary(boundaryPolygon: GisCoordinate[] | null | undefined, centre: GisCoordinate, padFactor = 0.12) {
  const polygon = sanitizePath(boundaryPolygon);
  let minLat: number;
  let maxLat: number;
  let minLng: number;
  let maxLng: number;
  if (polygon.length >= 3) {
    minLat = Math.min(...polygon.map((point) => point.lat));
    maxLat = Math.max(...polygon.map((point) => point.lat));
    minLng = Math.min(...polygon.map((point) => point.lng));
    maxLng = Math.max(...polygon.map((point) => point.lng));
  } else {
    const offset = 0.135;
    minLat = centre.lat - offset;
    maxLat = centre.lat + offset;
    minLng = centre.lng - offset;
    maxLng = centre.lng + offset;
  }
  const latPad = Math.max((maxLat - minLat) * padFactor, 0.01);
  const lngPad = Math.max((maxLng - minLng) * padFactor, 0.01);
  return { minLat: minLat - latPad, maxLat: maxLat + latPad, minLng: minLng - lngPad, maxLng: maxLng + lngPad };
}

function overpassBbox(bounds: ReturnType<typeof boundsFromBoundary>) {
  return `${bounds.minLat},${bounds.minLng},${bounds.maxLat},${bounds.maxLng}`;
}

export function flattenNominatimPolygon(geojson: unknown): GisCoordinate[] {
  const candidate = geojson as { type?: string; coordinates?: unknown } | null;
  if (!candidate?.coordinates) return [];
  if (candidate.type === "Polygon" && Array.isArray(candidate.coordinates)) {
    return sanitizePath(((candidate.coordinates[0] as Array<[number, number]>) ?? []).map(([lng, lat]) => ({ lat, lng })));
  }
  if (candidate.type === "MultiPolygon" && Array.isArray(candidate.coordinates)) {
    const largest = (candidate.coordinates as number[][][][])
      .map((poly) => poly?.[0] ?? [])
      .sort((a, b) => b.length - a.length)[0];
    return sanitizePath((largest ?? []).map(([lng, lat]) => ({ lat, lng })));
  }
  return [];
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { Accept: "application/json", ...(init?.headers ?? {}) } });
  if (!response.ok) throw new Error(`Request failed with ${response.status}`);
  return response.json() as Promise<T>;
}

export async function overpassQuery(query: string) {
  let lastError: Error | null = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      return await fetchJson<{ elements?: unknown[] }>(`${endpoint}?data=${encodeURIComponent(query)}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Overpass request failed");
    }
  }
  throw lastError ?? new Error("Overpass request failed");
}

function elementPoint(element: any): GisCoordinate | null {
  const directPoint = finiteCoordinatePair(element?.lat, element?.lon);
  if (directPoint) return directPoint;
  const centerPoint = finiteCoordinatePair(element?.center?.lat, element?.center?.lon);
  if (centerPoint) return centerPoint;
  if (Array.isArray(element?.geometry) && element.geometry.length) {
    const points = element.geometry.map((point: any) => finiteCoordinatePair(point?.lat, point?.lon)).filter(Boolean) as GisCoordinate[];
    if (!points.length) return null;
    return finiteCoordinatePair(points.reduce((sum, point) => sum + point.lat, 0) / points.length, points.reduce((sum, point) => sum + point.lng, 0) / points.length);
  }
  return null;
}

function tagsText(tags: Record<string, string> | undefined) {
  if (!tags) return "";
  return Object.entries(tags)
    .filter(([key]) => /operator|network|brand|name|owner|description|telecom|communication|ref|site|mobile|radio|tower|contact|source/i.test(key))
    .map(([key, value]) => `${key}:${value}`)
    .join(" ")
    .toLowerCase();
}

function classifyMastProvider(tags: Record<string, string> | undefined): GisProvider {
  const raw = tagsText(tags);
  const compact = raw.replace(/[^a-z0-9]+/g, "");
  if (/vodacom|vodafone|voda\s*com/i.test(raw) || compact.includes("vodacom") || compact.includes("vodafone")) return "Vodacom";
  if (/(^|[^a-z0-9])mtn([^a-z0-9]|$)|mobile telephone networks|mtn group/i.test(raw) || compact.includes("mtnsa") || compact.endsWith("mtn") || compact.includes("operatormtn")) return "MTN";
  if (/cell\s*c|cell-c|cell_c|cellular\s+c/i.test(raw) || compact.includes("cellc")) return "Cell C";
  if (/telkom|8\.ta|8ta|openserve|telkomsa|telkom mobile/i.test(raw) || compact.includes("telkom") || compact.includes("openserve")) return "Telkom";
  return "Unknown";
}

function pushSpacedCandidate<T extends GisCoordinate>(target: T[], candidate: T, minSpacingKm: number, limit: number) {
  if (!isValidGisCoordinate(candidate)) return;
  if (target.length >= limit) return;
  if (target.some((existing) => calculateDistanceKm(existing, candidate) < minSpacingKm)) return;
  target.push(candidate);
}

function classificationFromLosStatus(status: GisLosStatus): GisLosClassification {
  if (status === "confirmed") return "green";
  if (status === "marginal") return "yellow";
  return "red";
}

function losStatusFromClearance(hasLOS: boolean, worstClearance: number): GisLosStatus {
  if (!hasLOS) return "blocked";
  return worstClearance < LOS_MARGIN_METRES ? "marginal" : "confirmed";
}

function losUsable(los: LineOfSightResult) {
  return los.losStatus === "confirmed" || los.losStatus === "marginal";
}

function losPreference(los: LineOfSightResult) {
  if (los.losStatus === "confirmed") return 0;
  if (los.losStatus === "marginal") return 1;
  if (los.losStatus === "blocked") return 2;
  return 3;
}

function formatClearance(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "clearance unavailable";
  return `${value.toFixed(1)} m terrain clearance`;
}

function sampleLine(pointA: GisCoordinate, pointB: GisCoordinate, samples = LOS_SAMPLE_COUNT): GisCoordinate[] {
  const points: GisCoordinate[] = [];
  const count = Math.max(2, samples);
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0 : i / (count - 1);
    points.push({ lat: pointA.lat + t * (pointB.lat - pointA.lat), lng: pointA.lng + t * (pointB.lng - pointA.lng) });
  }
  return points;
}

async function fetchElevationProfile(points: GisCoordinate[]): Promise<number[]> {
  const validPoints = sanitizePath(points);
  if (validPoints.length !== points.length) throw new Error("Invalid coordinate in elevation profile");
  const latitude = validPoints.map((point) => point.lat.toFixed(6)).join(",");
  const longitude = validPoints.map((point) => point.lng.toFixed(6)).join(",");
  const data = await fetchJson<{ elevation?: unknown[] }>(`${OPEN_METEO_ELEVATION_URL}?latitude=${latitude}&longitude=${longitude}`);
  const elevation = data.elevation;
  if (!Array.isArray(elevation) || elevation.length !== validPoints.length || elevation.some((value) => typeof value !== "number")) {
    throw new Error("Open-Meteo returned an incomplete elevation profile");
  }
  return elevation as number[];
}

function evaluateLineOfSight(pointA: GisCoordinate, pointB: GisCoordinate, elevation: number[], antennaHeightA: number, antennaHeightB: number): LineOfSightResult {
  const sampleCount = elevation.length;
  const startElev = elevation[0] + antennaHeightA;
  const endElev = elevation[sampleCount - 1] + antennaHeightB;
  let hasLOS = true;
  let worstClearance = Infinity;
  for (let index = 0; index < sampleCount; index += 1) {
    const t = sampleCount === 1 ? 0 : index / (sampleCount - 1);
    const lineHeight = startElev + t * (endElev - startElev);
    const clearance = lineHeight - elevation[index];
    if (index > 0 && index < sampleCount - 1) {
      if (clearance < 0) hasLOS = false;
      if (clearance < worstClearance) worstClearance = clearance;
    }
  }
  if (!Number.isFinite(worstClearance)) worstClearance = Math.min(antennaHeightA, antennaHeightB);
  return { hasLOS, losStatus: losStatusFromClearance(hasLOS, worstClearance), worstClearance, elevationProfile: elevation };
}

export async function checkLineOfSight(pointA: GisCoordinate, pointB: GisCoordinate, antennaHeightA = FACILITY_ANTENNA_HEIGHT_M, antennaHeightB = HIGH_SITE_ANTENNA_HEIGHT_M): Promise<LineOfSightResult> {
  const points = sampleLine(pointA, pointB, LOS_SAMPLE_COUNT);
  const elevation = await fetchElevationProfile(points);
  return evaluateLineOfSight(pointA, pointB, elevation, antennaHeightA, antennaHeightB);
}

function failedLineOfSight(error: unknown): LineOfSightResult {
  return {
    hasLOS: false,
    losStatus: "blocked",
    worstClearance: Number.NEGATIVE_INFINITY,
    elevationProfile: [],
    error: error instanceof Error ? error.message : "Elevation profile unavailable",
  };
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, Math.max(items.length, 1)) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

function nominatimBoundaryFromResult(result: NominatimResult, fallback: GisCoordinate): GisPropertyBoundary | null {
  const polygon = flattenNominatimPolygon(result.geojson);
  if (polygon.length < 3) return null;
  const centroid = centroidFromPolygon(polygon, fallback);
  return {
    id: `nominatim-${result.place_id ?? result.osm_id ?? Date.now()}`,
    label: result.display_name ?? "Nominatim property boundary",
    source: "osm-nominatim",
    confidence: 0.92,
    centroid,
    polygon,
    radiusKm: boundaryRadiusKm(polygon, centroid),
  };
}

export async function fetchPropertyBoundary(propertyName: string | undefined, centre: GisCoordinate): Promise<GisPropertyBoundary> {
  const query = propertyName?.trim();
  const candidates: GisPropertyBoundary[] = [];
  if (query) {
    const params = new URLSearchParams({ format: "jsonv2", polygon_geojson: "1", addressdetails: "1", limit: "8", q: query });
    const results = await fetchJson<NominatimResult[]>(`${NOMINATIM_BASE_URL}/search?${params.toString()}`);
    results.forEach((result) => {
      const boundary = nominatimBoundaryFromResult(result, centre);
      if (boundary) candidates.push(boundary);
    });
  }

  if (!candidates.length) {
    const params = new URLSearchParams({ format: "jsonv2", polygon_geojson: "1", addressdetails: "1", lat: centre.lat.toFixed(6), lon: centre.lng.toFixed(6) });
    const result = await fetchJson<NominatimResult>(`${NOMINATIM_BASE_URL}/reverse?${params.toString()}`);
    const boundary = nominatimBoundaryFromResult(result, centre);
    if (boundary) candidates.push(boundary);
  }

  if (candidates.length) {
    return candidates.sort((a, b) => calculateDistanceKm(a.centroid, centre) - calculateDistanceKm(b.centroid, centre))[0];
  }

  return {
    id: "nominatim-boundary-unavailable",
    label: query ? `${query} · Nominatim polygon unavailable` : "Nominatim polygon unavailable",
    source: "osm-nominatim",
    confidence: 0,
    centroid: centre,
    polygon: [],
    radiusKm: 0,
  };
}

export async function findHighSites(boundaryPolygon: GisCoordinate[] | null, propertyCentre: GisCoordinate): Promise<GisPotentialHighSite[]> {
  const bounds = boundsFromBoundary(boundaryPolygon, propertyCentre, 0.2);
  const polygon = sanitizePath(boundaryPolygon);
  const allSites: Array<GisCoordinate & { label: string; elevationMeters: number; source: GisPotentialHighSite["source"] }> = [];

  const gridPoints: Array<GisCoordinate & { gi: number; gj: number; elevationMeters?: number }> = [];
  for (let i = 0; i < HIGH_SITE_GRID_SIZE; i += 1) {
    for (let j = 0; j < HIGH_SITE_GRID_SIZE; j += 1) {
      gridPoints.push({
        lat: bounds.minLat + (bounds.maxLat - bounds.minLat) * (i / (HIGH_SITE_GRID_SIZE - 1)),
        lng: bounds.minLng + (bounds.maxLng - bounds.minLng) * (j / (HIGH_SITE_GRID_SIZE - 1)),
        gi: i,
        gj: j,
      });
    }
  }

  const elevations = await fetchElevationProfile(gridPoints);
  const grid2d = Array.from({ length: HIGH_SITE_GRID_SIZE }, () => new Array<number>(HIGH_SITE_GRID_SIZE).fill(0));
  gridPoints.forEach((point, index) => {
    point.elevationMeters = elevations[index];
    grid2d[point.gi][point.gj] = elevations[index];
  });

  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  const threshold = minElevation + (maxElevation - minElevation) * 0.22;
  const maxima: Array<GisCoordinate & { gi: number; gj: number; elevationMeters: number }> = [];
  for (let i = 0; i < HIGH_SITE_GRID_SIZE; i += 1) {
    for (let j = 0; j < HIGH_SITE_GRID_SIZE; j += 1) {
      const elevation = grid2d[i][j];
      if (elevation < threshold) continue;
      let isMaximum = true;
      for (let di = -1; di <= 1 && isMaximum; di += 1) {
        for (let dj = -1; dj <= 1 && isMaximum; dj += 1) {
          if (di === 0 && dj === 0) continue;
          const ni = i + di;
          const nj = j + dj;
          if (ni < 0 || ni >= HIGH_SITE_GRID_SIZE || nj < 0 || nj >= HIGH_SITE_GRID_SIZE) continue;
          if (grid2d[ni][nj] >= elevation) isMaximum = false;
        }
      }
      if (isMaximum) maxima.push(gridPoints[i * HIGH_SITE_GRID_SIZE + j] as GisCoordinate & { gi: number; gj: number; elevationMeters: number });
    }
  }

  const rankedGrid = gridPoints
    .filter((point): point is GisCoordinate & { gi: number; gj: number; elevationMeters: number } => typeof point.elevationMeters === "number" && (polygon.length >= 3 ? pointInPolygon(point, polygon) : true))
    .sort((a, b) => b.elevationMeters - a.elevationMeters);
  const latSpanKm = calculateDistanceKm({ lat: bounds.minLat, lng: bounds.minLng }, { lat: bounds.maxLat, lng: bounds.minLng });
  const lngSpanKm = calculateDistanceKm({ lat: bounds.minLat, lng: bounds.minLng }, { lat: bounds.minLat, lng: bounds.maxLng });
  const spacingKm = Math.max(0.75, Math.min(3, Math.max(latSpanKm, lngSpanKm) / 9));
  const selected: Array<GisCoordinate & { gi: number; gj: number; elevationMeters: number }> = [];
  maxima.sort((a, b) => b.elevationMeters - a.elevationMeters).forEach((point) => pushSpacedCandidate(selected, point, spacingKm, 12));
  rankedGrid.forEach((point) => pushSpacedCandidate(selected, point, spacingKm * 0.8, 16));
  if (selected.length < 5) rankedGrid.forEach((point) => pushSpacedCandidate(selected, point, Math.max(0.35, spacingKm * 0.45), 16));

  selected.forEach((point, index) => {
    allSites.push({
      lat: Number(point.lat.toFixed(6)),
      lng: Number(point.lng.toFixed(6)),
      label: index < 5 ? `Core High ${index + 1} · ${Math.round(point.elevationMeters)} m` : `High Point ${Math.round(point.elevationMeters)} m`,
      elevationMeters: point.elevationMeters,
      source: "open-meteo-elevation",
    });
  });

  const peakQuery = `[out:json][timeout:20];(node["natural"="peak"](${overpassBbox(bounds)});node["natural"="hill"](${overpassBbox(bounds)}););out tags;`;
  try {
    const data = await overpassQuery(peakQuery);
    (data.elements ?? []).forEach((node: any) => {
      const point = finiteCoordinatePair(node?.lat, node?.lon);
      if (!point) return;
      if (allSites.some((site) => calculateDistanceKm(site, point) < 0.8)) return;
      const ele = node.tags?.ele ? Number.parseFloat(String(node.tags.ele).replace(/[^0-9.-]/g, "")) : NaN;
      allSites.push({ ...point, label: node.tags?.name || (Number.isFinite(ele) ? `OSM Peak ${Math.round(ele)} m` : "OSM high point"), elevationMeters: Number.isFinite(ele) ? ele : 0, source: "osm-overpass" });
    });
  } catch {
    // OSM peaks are a fallback/enrichment source; Open-Meteo grid results remain authoritative when available.
  }

  return allSites
    .filter(isValidGisCoordinate)
    .map((site, index) => {
      const inside = polygon.length >= 3 ? pointInPolygon(site, polygon) : false;
      const distanceFromPropertyCenterKm = Number(calculateDistanceKm(propertyCentre, site).toFixed(2));
      const siteClass: GisHighSiteClass = inside ? "inside-boundary" : distanceFromPropertyCenterKm < 5 ? "off-property-near" : "remote";
      return { ...site, id: `real-high-site-${index + 1}`, rank: index + 1, elevationMeters: Math.round(site.elevationMeters), siteClass, distanceFromPropertyCenterKm };
    })
    .sort((a, b) => b.elevationMeters - a.elevationMeters)
    .map((site, index) => ({ ...site, rank: index + 1 }));
}

export async function findMasts(propertyCentre: GisCoordinate): Promise<GisProviderMast[]> {
  const { lat, lng } = propertyCentre;
  const query = `[out:json][timeout:30];
(
  node["man_made"="mast"]["tower:type"="communication"](around:30000,${lat},${lng});
  node["man_made"="tower"]["tower:type"="communication"](around:30000,${lat},${lng});
  node["man_made"="mast"]["operator"~"Vodacom|MTN|Cell C|Telkom",i](around:30000,${lat},${lng});
  node["man_made"="tower"](around:30000,${lat},${lng});
  way["man_made"="mast"]["tower:type"="communication"](around:30000,${lat},${lng});
);
out center;`;
  const data = await overpassQuery(query);
  const seen = new Set<string>();
  return ((data.elements ?? []) as any[])
    .map((element): GisProviderMast | null => {
      const point = elementPoint(element);
      if (!point) return null;
      const key = `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
      if (seen.has(key)) return null;
      seen.add(key);
      const tags = element.tags || {};
      const provider = classifyMastProvider(tags);
      const distanceKm = Number(calculateDistanceKm(propertyCentre, point).toFixed(2));
      const bearingDeg = Number(calculateBearingDeg(propertyCentre, point).toFixed(1));
      const providerLabel = provider === "Unknown" ? "Unknown carrier" : provider;
      return {
        id: `osm-mast-${element.type}-${element.id}`,
        provider,
        label: tags.name || tags.operator || tags.network || tags.brand || tags.owner || `${providerLabel} communication mast`,
        color: GIS_PROVIDER_STYLES[provider].color,
        bearingDeg,
        distanceKm,
        confidence: provider === "Unknown" ? 62 : 88,
        source: "osm-overpass" as const,
        hiddenByDefault: provider === "Unknown" || distanceKm > 20,
        tags,
        ...point,
      } satisfies GisProviderMast;
    })
    .filter((mast): mast is GisProviderMast => Boolean(mast))
    .sort((a, b) => (a.provider === "Unknown" ? 1 : 0) - (b.provider === "Unknown" ? 1 : 0) || a.distanceKm - b.distanceKm);
}

function annotateProviderMasts(masts: GisProviderMast[], propertyCentre: GisCoordinate, highSites: GisPotentialHighSite[]) {
  const coreSites = getCoreHighSites(highSites, 5);
  const refSite = coreSites[0] ?? highSites.find((site) => site.siteClass !== "remote") ?? null;
  const rebased = masts.map((mast) => {
    const nearest = coreSites.length ? [...coreSites].sort((a, b) => calculateDistanceKm(mast, a) - calculateDistanceKm(mast, b))[0] : refSite;
    const relayDistance = nearest ? Number(calculateDistanceKm(mast, nearest).toFixed(2)) : Number(calculateDistanceKm(mast, propertyCentre).toFixed(2));
    return {
      ...mast,
      distanceKm: Number(calculateDistanceKm(propertyCentre, mast).toFixed(2)),
      bearingDeg: Number(calculateBearingDeg(propertyCentre, mast).toFixed(1)),
      distanceFromNearestOnPropertyHighSiteKm: relayDistance,
      nearestOnPropertyHighSiteLabel: nearest?.label,
    };
  });
  const closestPerProvider = new Map<GisProvider, string>();
  rebased.forEach((mast) => {
    if (mast.provider === "Unknown") return;
    const currentId = closestPerProvider.get(mast.provider);
    const current = currentId ? rebased.find((candidate) => candidate.id === currentId) : null;
    if (!current || (mast.distanceFromNearestOnPropertyHighSiteKm ?? mast.distanceKm) < (current.distanceFromNearestOnPropertyHighSiteKm ?? current.distanceKm)) {
      closestPerProvider.set(mast.provider, mast.id);
    }
  });
  return rebased.map((mast) => ({
    ...mast,
    isClosestForProvider: closestPerProvider.get(mast.provider) === mast.id,
    priorityRank: mast.provider === "Unknown" ? undefined : [...rebased].filter((candidate) => candidate.provider === mast.provider).sort((a, b) => (a.distanceFromNearestOnPropertyHighSiteKm ?? a.distanceKm) - (b.distanceFromNearestOnPropertyHighSiteKm ?? b.distanceKm)).findIndex((candidate) => candidate.id === mast.id) + 1,
  }));
}

function classifyFacility(tags: Record<string, string> | undefined): GisDetectedFacilityType {
  const text = `${tags?.tourism || ""} ${tags?.amenity || ""} ${tags?.building || ""} ${tags?.barrier || ""} ${tags?.man_made || ""} ${tags?.name || ""}`.toLowerCase();
  if (/gate/.test(text)) return "gate";
  if (/guest_house|hotel|lodge|camp|chalet|safari/.test(text)) return "lodge";
  if (/ranger|post|office|headquarters|hq|administration/.test(text)) return text.includes("office") || text.includes("hq") || text.includes("headquarters") ? "office" : "ranger";
  if (/staff|house|residential|hut|cabin|dormitory/.test(text)) return "staff";
  if (/water|pump|reservoir|tank|well/.test(text)) return "pump";
  if (/camera|surveillance/.test(text)) return "camera";
  return "other";
}

function facilityName(tags: Record<string, string> | undefined, type: GisDetectedFacilityType, index: number) {
  const labels: Record<GisDetectedFacilityType, string> = { relay: "Relay Candidate", lodge: "Lodge", gate: "Gate", camera: "Camera Point", ranger: "Ranger Post", pump: "Water Pump", staff: "Staff Quarters", office: "Office/HQ", other: "Facility" };
  return tags?.name || tags?.operator || tags?.ref || `${labels[type]} ${index}`;
}

export async function findFacilities(boundaryPolygon: GisCoordinate[] | null, propertyCentre: GisCoordinate): Promise<GisDetectedFacility[]> {
  const polygon = sanitizePath(boundaryPolygon);
  const bounds = boundsFromBoundary(boundaryPolygon, propertyCentre, 0.02);
  const bbox = overpassBbox(bounds);
  const query = `[out:json][timeout:35];(
    node["tourism"~"guest_house|hotel|chalet|camp_site|wilderness_hut|apartment|camp_pitch",i](${bbox});
    way["tourism"~"guest_house|hotel|chalet|camp_site|wilderness_hut|apartment|camp_pitch",i](${bbox});
    relation["tourism"~"guest_house|hotel|chalet|camp_site|wilderness_hut|apartment|camp_pitch",i](${bbox});
    node["building"](${bbox});
    way["building"](${bbox});
    node["barrier"="gate"](${bbox});
    way["barrier"="gate"](${bbox});
    node["highway"="gate"](${bbox});
    node["amenity"~"ranger_station|police|fire_station|clinic|fuel|parking",i](${bbox});
    node["man_made"~"water_tower|storage_tank|surveillance",i](${bbox});
    way["man_made"~"water_tower|storage_tank|surveillance",i](${bbox});
  );out center geom tags;`;
  const data = await overpassQuery(query);
  const facilities: GisDetectedFacility[] = [];
  const seen = new Set<string>();
  (data.elements ?? []).forEach((element: any) => {
    const tags = element.tags || {};
    const point = elementPoint(element);
    if (!point) return;
    const inside = polygon.length >= 3 ? pointInPolygon(point, polygon) : calculateDistanceKm(propertyCentre, point) < 8;
    if (!inside) return;
    const type = classifyFacility(tags);
    const key = `${type}-${point.lat.toFixed(5)}-${point.lng.toFixed(5)}`;
    if (seen.has(key)) return;
    seen.add(key);
    facilities.push({ id: `osm-facility-${element.type}-${element.id}`, ...point, type, label: facilityName(tags, type, facilities.length + 1), source: "osm-overpass", tags });
  });
  return facilities.slice(0, 180);
}

export function getCoreHighSites(highSites: GisPotentialHighSite[], limit = 5): GisPotentialHighSite[] {
  const ranked = highSites.slice().sort((a, b) => b.elevationMeters - a.elevationMeters || a.distanceFromPropertyCenterKm - b.distanceFromPropertyCenterKm);
  const inside = ranked.filter((site) => site.siteClass === "inside-boundary");
  const nearby = ranked.filter((site) => site.siteClass === "off-property-near");
  const remote = ranked.filter((site) => site.siteClass === "remote");
  const selected: GisPotentialHighSite[] = [];
  inside.forEach((site) => pushSpacedCandidate(selected, site, 0.35, limit));
  if (selected.length < 2) nearby.forEach((site) => pushSpacedCandidate(selected, site, 0.35, limit));
  if (selected.length < 2) remote.forEach((site) => pushSpacedCandidate(selected, site, 0.35, limit));
  if (selected.length < limit) inside.forEach((site) => pushSpacedCandidate(selected, site, 0, limit));
  return selected.slice(0, limit);
}

function rankedHighSiteCandidates(facility: GisDetectedFacility, coreSites: GisPotentialHighSite[], limit: number) {
  return coreSites
    .slice()
    .sort((a, b) => calculateDistanceKm(facility, a) - calculateDistanceKm(facility, b) || b.elevationMeters - a.elevationMeters)
    .slice(0, limit);
}

function rankedMastCandidates(site: GisPotentialHighSite, masts: GisProviderMast[], limit: number) {
  const preferred = masts.filter((mast) => mast.provider !== "Unknown");
  const source = preferred.length ? preferred : masts;
  return source
    .slice()
    .sort((a, b) => (a.provider === "Unknown" ? 1 : 0) - (b.provider === "Unknown" ? 1 : 0) || calculateDistanceKm(site, a) - calculateDistanceKm(site, b))
    .slice(0, limit);
}

function chooseBestLosCandidate<T extends { los: LineOfSightResult; distanceKm: number }>(candidates: T[]) {
  if (!candidates.length) return null;
  const usable = candidates.filter((candidate) => losUsable(candidate.los));
  const source = usable.length ? usable : candidates;
  return source.slice().sort((a, b) => losPreference(a.los) - losPreference(b.los) || b.los.worstClearance - a.los.worstClearance || a.distanceKm - b.distanceKm)[0];
}

function segmentFromLos(input: {
  sourceId: string;
  sourceLabel: string;
  source: GisCoordinate;
  targetId: string;
  targetLabel: string;
  target: GisCoordinate;
  role: GisClearSegment["role"];
  los: LineOfSightResult;
  justification: string;
}): GisClearSegment {
  const distanceKm = Number(calculateDistanceKm(input.source, input.target).toFixed(2));
  return {
    id: `${input.role}-${input.sourceId}-${input.targetId}`,
    sourceId: input.sourceId,
    sourceLabel: input.sourceLabel,
    targetId: input.targetId,
    targetLabel: input.targetLabel,
    path: [input.source, input.target],
    distanceKm,
    role: input.role,
    justification: input.justification,
    viable: losUsable(input.los),
    outOfRange: distanceKm > 15,
    losStatus: input.los.losStatus,
    terrainMarginMeters: Number(input.los.worstClearance.toFixed(1)),
    elevationProfile: input.los.elevationProfile,
  };
}

export async function buildLosTopology(highSites: GisPotentialHighSite[], facilities: GisDetectedFacility[], masts: GisProviderMast[]) {
  const coreSites = getCoreHighSites(highSites, Math.min(8, Math.max(5, highSites.length)));
  const clearSegments: GisClearSegment[] = [];
  const losCandidates: GisLosCandidate[] = [];
  if (!coreSites.length) return { clearSegments, losCandidates };

  const backboneEdges: Array<{ from: GisPotentialHighSite; to: GisPotentialHighSite; distanceKm: number }> = [];
  if (coreSites.length > 1) {
    const remaining = coreSites.slice(1);
    const visited = [coreSites[0]];
    while (remaining.length) {
      let bestFrom = visited[0];
      let bestIdx = 0;
      let bestDistance = Infinity;
      visited.forEach((from) => {
        remaining.forEach((candidate, index) => {
          const distanceKm = calculateDistanceKm(from, candidate);
          if (distanceKm < bestDistance) {
            bestFrom = from;
            bestIdx = index;
            bestDistance = distanceKm;
          }
        });
      });
      const next = remaining.splice(bestIdx, 1)[0];
      visited.push(next);
      backboneEdges.push({ from: bestFrom, to: next, distanceKm: bestDistance });
    }
  }

  const backboneEvaluations = await mapWithConcurrency(backboneEdges, LOS_CONCURRENCY, async (edge) => {
    try {
      return { ...edge, los: await checkLineOfSight(edge.from, edge.to, HIGH_SITE_ANTENNA_HEIGHT_M, HIGH_SITE_ANTENNA_HEIGHT_M) };
    } catch (error) {
      return { ...edge, los: failedLineOfSight(error) };
    }
  });
  backboneEvaluations.forEach((edge) => {
    clearSegments.push(segmentFromLos({ sourceId: edge.from.id, sourceLabel: edge.from.label, source: edge.from, targetId: edge.to.id, targetLabel: edge.to.label, target: edge.to, role: "backbone", los: edge.los, justification: `High-site backbone · ${formatClearance(edge.los.worstClearance)}` }));
  });

  const perFacilityLimit = facilities.length * coreSites.length <= MAX_FACILITY_LOS_PAIRS ? coreSites.length : Math.max(3, Math.floor(MAX_FACILITY_LOS_PAIRS / Math.max(facilities.length, 1)));
  const facilityPairs = facilities.flatMap((facility) => rankedHighSiteCandidates(facility, coreSites, perFacilityLimit).map((site) => ({ facility, site, distanceKm: calculateDistanceKm(facility, site) })));
  const facilityEvaluations = await mapWithConcurrency(facilityPairs, LOS_CONCURRENCY, async (pair) => {
    try {
      return { ...pair, los: await checkLineOfSight(pair.facility, pair.site, FACILITY_ANTENNA_HEIGHT_M, HIGH_SITE_ANTENNA_HEIGHT_M) };
    } catch (error) {
      return { ...pair, los: failedLineOfSight(error) };
    }
  });
  facilities.forEach((facility) => {
    const best = chooseBestLosCandidate(facilityEvaluations.filter((candidate) => candidate.facility.id === facility.id));
    if (!best) return;
    clearSegments.push(segmentFromLos({ sourceId: facility.id, sourceLabel: facility.label, source: facility, targetId: best.site.id, targetLabel: best.site.label, target: best.site, role: "distribution", los: best.los, justification: `Facility to high-site path · ${formatClearance(best.los.worstClearance)}` }));
  });

  const usableMasts = (masts.filter((mast) => mast.provider !== "Unknown").length ? masts.filter((mast) => mast.provider !== "Unknown") : masts).filter((mast) => mast.hiddenByDefault !== true || mast.isClosestForProvider);
  const perSiteMastLimit = coreSites.length * usableMasts.length <= MAX_MAST_LOS_PAIRS ? usableMasts.length : Math.max(4, Math.floor(MAX_MAST_LOS_PAIRS / Math.max(coreSites.length, 1)));
  const mastPairs = coreSites.flatMap((site) => rankedMastCandidates(site, usableMasts, perSiteMastLimit).map((mast) => ({ site, mast, distanceKm: calculateDistanceKm(site, mast) })));
  const mastEvaluations = await mapWithConcurrency(mastPairs, LOS_CONCURRENCY, async (pair) => {
    try {
      return { ...pair, los: await checkLineOfSight(pair.site, pair.mast, HIGH_SITE_ANTENNA_HEIGHT_M, CARRIER_MAST_HEIGHT_M) };
    } catch (error) {
      return { ...pair, los: failedLineOfSight(error) };
    }
  });
  coreSites.forEach((site) => {
    const candidates = mastEvaluations.filter((candidate) => candidate.site.id === site.id);
    candidates.forEach((candidate) => {
      const classification = classificationFromLosStatus(candidate.los.losStatus);
      const bearingDeg = Number(calculateBearingDeg(site, candidate.mast).toFixed(1));
      losCandidates.push({
        id: `los-${site.id}-${candidate.mast.id}`,
        peakId: site.id,
        peakLabel: site.label,
        mastId: candidate.mast.id,
        mastLabel: candidate.mast.label,
        provider: candidate.mast.provider,
        color: GIS_PROVIDER_STYLES[candidate.mast.provider].color,
        classification,
        classificationLabel: GIS_LOS_CLASSIFICATION_STYLES[classification].label,
        distanceKm: Number(candidate.distanceKm.toFixed(2)),
        bearingDeg,
        azimuthLabel: `${Math.round(bearingDeg)}° ${formatBearing(bearingDeg)}`,
        terrainMarginMeters: Number(candidate.los.worstClearance.toFixed(1)),
        path: [site, candidate.mast],
        source: "open-meteo-elevation",
        losStatus: candidate.los.losStatus,
        elevationProfile: candidate.los.elevationProfile,
      });
    });
    const best = chooseBestLosCandidate(candidates);
    if (!best) return;
    const providerName = best.mast.provider === "Unknown" ? "Unknown carrier" : best.mast.provider;
    clearSegments.push(segmentFromLos({ sourceId: site.id, sourceLabel: site.label, source: site, targetId: best.mast.id, targetLabel: best.mast.label, target: best.mast, role: "uplink", los: best.los, justification: `${providerName} carrier mast path · ${formatClearance(best.los.worstClearance)}` }));
  });

  return { clearSegments, losCandidates };
}

export function buildPriorityMasts(masts: GisProviderMast[]): GisProviderMast[] {
  return (Object.keys(GIS_PROVIDER_STYLES) as GisProvider[]).flatMap((provider) =>
    masts
      .filter((mast) => mast.provider === provider && (mast.isClosestForProvider || mast.priorityRank === 1))
      .sort((a, b) => (a.distanceFromNearestOnPropertyHighSiteKm ?? a.distanceKm) - (b.distanceFromNearestOnPropertyHighSiteKm ?? b.distanceKm))
      .slice(0, provider === "Unknown" ? 0 : 1),
  );
}

export function summarizeLosCandidates(candidates: GisLosCandidate[]): GisLosSummary {
  const summary = candidates.reduce<GisLosSummary>((acc, candidate) => {
    acc[candidate.classification] += 1;
    if (!acc.bestCandidate) {
      acc.bestCandidate = candidate;
      return acc;
    }
    const score = (item: GisLosCandidate) => (item.classification === "green" ? 3 : item.classification === "yellow" ? 2 : 1) * 1000 + item.terrainMarginMeters - item.distanceKm;
    if (score(candidate) > score(acc.bestCandidate)) acc.bestCandidate = candidate;
    return acc;
  }, { green: 0, yellow: 0, red: 0, bestCandidate: null });
  return summary;
}

export function buildNearestMastSummary(origin: GisCoordinate, masts: GisProviderMast[]): GisNearestMastSummary[] {
  return (Object.keys(GIS_PROVIDER_STYLES) as GisProvider[]).flatMap((provider) => {
    if (provider === "Unknown") return [];
    const providerMasts = masts.filter((mast) => mast.provider === provider);
    if (providerMasts.length === 0) return [];
    const nearest = [...providerMasts].sort((a, b) => calculateDistanceKm(origin, a) - calculateDistanceKm(origin, b))[0];
    const bearingDeg = calculateBearingDeg(origin, nearest);
    return [{ provider, label: nearest.label, color: nearest.color, distanceKm: Number(calculateDistanceKm(origin, nearest).toFixed(2)), bearingDeg: Number(bearingDeg.toFixed(1)), bearing: formatBearing(bearingDeg), confidence: nearest.confidence, source: nearest.source }];
  });
}

export async function buildGisAutoScanWithApis(origin: GisCoordinate, options: GisAutoScanOptions = {}): Promise<GisAutoScanResult | null> {
  const centre = sanitizeCoordinate(origin);
  if (!centre) return null;
  const scanIssues: string[] = [];

  let propertyBoundary: GisPropertyBoundary;
  try {
    propertyBoundary = await fetchPropertyBoundary(options.propertyName, centre);
    if (!propertyBoundary.polygon.length) scanIssues.push("Nominatim did not return a polygon boundary for this property; the scan used the coordinate-centred search window for real data discovery.");
  } catch (error) {
    scanIssues.push(error instanceof Error ? `Boundary lookup failed: ${error.message}` : "Boundary lookup failed");
    propertyBoundary = { id: "nominatim-boundary-error", label: options.propertyName ? `${options.propertyName} · boundary lookup failed` : "Boundary lookup failed", source: "osm-nominatim", confidence: 0, centroid: centre, polygon: [], radiusKm: 0 };
  }

  const [facilityResult, highSiteResult, mastResult] = await Promise.allSettled([
    findFacilities(propertyBoundary.polygon, centre),
    findHighSites(propertyBoundary.polygon, centre),
    findMasts(centre),
  ]);

  const detectedFacilities = facilityResult.status === "fulfilled" ? facilityResult.value : [];
  if (facilityResult.status === "rejected") scanIssues.push(`Facility discovery failed: ${facilityResult.reason instanceof Error ? facilityResult.reason.message : "Overpass request failed"}`);
  const potentialHighSites = highSiteResult.status === "fulfilled" ? highSiteResult.value : [];
  if (highSiteResult.status === "rejected") scanIssues.push(`High-site discovery failed: ${highSiteResult.reason instanceof Error ? highSiteResult.reason.message : "Open-Meteo or Overpass request failed"}`);
  const rawMasts = mastResult.status === "fulfilled" ? mastResult.value : [];
  if (mastResult.status === "rejected") scanIssues.push(`Carrier mast discovery failed: ${mastResult.reason instanceof Error ? mastResult.reason.message : "Overpass request failed"}`);

  const providerMasts = annotateProviderMasts(rawMasts, centre, potentialHighSites);
  const priorityMasts = buildPriorityMasts(providerMasts);
  let topology = { clearSegments: [] as GisClearSegment[], losCandidates: [] as GisLosCandidate[] };
  if (potentialHighSites.length) {
    try {
      topology = await buildLosTopology(potentialHighSites, detectedFacilities, providerMasts);
    } catch (error) {
      scanIssues.push(`LOS topology generation failed: ${error instanceof Error ? error.message : "Open-Meteo elevation request failed"}`);
    }
  }

  const losSummary = summarizeLosCandidates(topology.losCandidates);
  const clearLosCandidates = topology.losCandidates.filter((candidate) => candidate.classification === "green" || candidate.classification === "yellow");
  const coreSites = getCoreHighSites(potentialHighSites, 8);
  const minimumHighSitePlan: GisMinimumHighSitePlan = {
    recommendedHighSiteCount: coreSites.length,
    coverageHighSiteCount: coreSites.filter((site) => site.siteClass === "inside-boundary").length,
    redundancyHighSiteCount: Math.max(0, coreSites.length - 1),
    clearSegments: topology.clearSegments,
    multiHopBackhaul: topology.clearSegments.filter((segment) => segment.role === "backbone"),
    costJustification: [
      "Topology is derived from real Nominatim, Overpass, and Open-Meteo elevation responses.",
      "Facility, backbone, and carrier-mast paths are evaluated with 20-point elevation profiles before map rendering.",
      "Green links are confirmed LOS, amber links are marginal, and red links are obstruction diagnostics requiring field validation.",
    ],
  };

  const result: GisAutoScanResult = {
    property: centre,
    propertyBoundary,
    potentialHighSites,
    providerMasts,
    priorityMasts,
    fibreRoutes: [],
    terrainContours: [],
    eskomCorridors: [],
    detectedFacilities,
    losCandidates: topology.losCandidates,
    losSummary,
    clearLosCandidates,
    minimumHighSitePlan,
    nearestMasts: buildNearestMastSummary(centre, providerMasts),
    scanRadiusKm: propertyBoundary.radiusKm || 15,
    providerScanRadiusKm: 30,
    scanIssues,
  };
  scanCache.set(cacheKey(centre, options.propertyName), result);
  return result;
}

export function buildGisAutoScan(origin: GisCoordinate, options: GisAutoScanOptions = {}): GisAutoScanResult | null {
  const centre = sanitizeCoordinate(origin);
  if (!centre) return null;
  return scanCache.get(cacheKey(centre, options.propertyName)) ?? null;
}

export function buildIncidentRelayResult(incident: GisCoordinate, relays: GisPotentialHighSite[]): GisIncidentRelayResult | null {
  if (!isValidCoordinate(incident.lat, incident.lng) || relays.length === 0) return null;
  const relay = [...relays].sort((a, b) => calculateDistanceKm(incident, a) - calculateDistanceKm(incident, b))[0];
  const distanceKm = Number(calculateDistanceKm(incident, relay).toFixed(2));
  const azimuthDeg = Number(calculateBearingDeg(incident, relay).toFixed(1));
  const classification: GisLosClassification = distanceKm <= 5 ? "green" : distanceKm <= 12 ? "yellow" : "red";
  const style = GIS_LOS_CLASSIFICATION_STYLES[classification];
  return { incident, relay, distanceKm, azimuthDeg, azimuthLabel: `${azimuthDeg.toFixed(0)}° ${formatBearing(azimuthDeg)}`, linkQuality: style.quality, emergencyCommsFeasible: classification !== "red", classification };
}
