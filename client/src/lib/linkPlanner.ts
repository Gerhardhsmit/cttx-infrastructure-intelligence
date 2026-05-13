/*
 * CTTX Link Planner command-board philosophy:
 * Swiss operational typography, dark navy infrastructure intelligence, precise semantic colours,
 * fixed planning surfaces, and restrained engineering language. Every utility supports terrain
 * evidence, deployment planning, and reserve-wide infrastructure decisions.
 */

export type LatLng = { lat: number; lng: number };

export function isValidLatLng(point: Partial<LatLng> | null | undefined): point is LatLng {
  return Boolean(
    point &&
      Number.isFinite(point.lat) &&
      Number.isFinite(point.lng) &&
      Math.abs(point.lat as number) <= 90 &&
      Math.abs(point.lng as number) <= 180,
  );
}

function finiteCoordinatePair(lat: unknown, lng: unknown): LatLng | null {
  const point = { lat: typeof lat === "number" ? lat : Number(lat), lng: typeof lng === "number" ? lng : Number(lng) };
  return isValidLatLng(point) ? point : null;
}

export type BoundarySelection = {
  id: string;
  displayName: string;
  centre: LatLng;
  polygon: LatLng[];
  bbox?: [number, number, number, number];
};

export type HighSite = LatLng & {
  name: string;
  elevation: number | null;
  source: "srtm" | "osm" | "manual";
  inside: boolean;
  distToCentre: number;
  category: "inside" | "nearby" | "remote";
};

export type RidgeCandidate = LatLng & {
  name: string;
  elevation: number | null;
  localRelief: number;
  distToBoundaryKm: number;
  inside: boolean;
};

export type Relay = LatLng & {
  name: string;
  height: number;
  source: "manual";
};

export type MastProvider = "vodacom" | "mtn" | "cellc" | "telkom" | "liquid" | "rain" | "openserve" | "sentech" | "dfa" | "unknown";

export type Mast = LatLng & {
  name: string;
  provider: MastProvider;
  distFromRelay: number;
  distFromCentre: number;
  isClosestForProvider: boolean;
  visible: boolean;
  tags?: Record<string, string>;
};

export type LinkType = "uplink" | "backbone" | "distribution" | "relay" | "outofrange" | "live";
export type LosStatus = "confirmed" | "marginal" | "blocked" | "unknown";

export type ElevationSample = LatLng & {
  elevation: number;
  lineHeight: number;
  clearance: number;
  distanceKm: number;
};

export type LineOfSightResult = {
  hasLOS: boolean;
  losStatus: LosStatus;
  worstClearance: number;
  elevationProfile: number[];
  samples: ElevationSample[];
  error?: string;
};

export type BackboneLink = {
  from: LatLng & { name?: string };
  to: LatLng & { name?: string };
  type: LinkType;
  distKm: number;
  live: boolean;
  label?: string;
  losStatus?: LosStatus;
  worstClearance?: number;
  elevationProfile?: number[];
};

export type FacilityTypeKey = keyof typeof FACILITY_TYPES;

export type Facility = LatLng & {
  id: string;
  name: string;
  type: FacilityTypeKey;
  notes?: string;
  source?: "osm" | "manual";
  tags?: Record<string, string>;
};

export type RoadFeature = {
  id: string;
  name: string;
  type: string;
  path: LatLng[];
  tags?: Record<string, string>;
};

export type ManualLinkEndpoint = LatLng & {
  label: "A" | "B";
  height: number;
};

export type ManualPointLink = {
  id: string;
  pointA: ManualLinkEndpoint;
  pointB: ManualLinkEndpoint;
  distKm: number;
  losStatus: LosStatus;
  worstClearance: number;
  elevationProfile?: number[];
  calculating?: boolean;
  error?: string;
};

export type ManualFacilityLink = {
  id: string;
  facilityId: string;
  facility: LatLng & { name: string };
  highSite: LatLng & { name: string };
  distKm: number;
  losStatus: LosStatus;
  worstClearance: number;
  elevationProfile?: number[];
  calculating?: boolean;
  error?: string;
};

export type FacilityDetectionResult = {
  facilities: Facility[];
  roads: RoadFeature[];
  ridgeCandidates?: RidgeCandidate[];
};

export const FACILITY_TYPES = {
  relay: { label: "Relay Candidate", emoji: "📡", color: "#22c55e" },
  lodge: { label: "Lodge", emoji: "🏠", color: "#3b82f6" },
  gate: { label: "Gate", emoji: "🚧", color: "#f59e0b" },
  camera: { label: "Camera Point", emoji: "📷", color: "#8b5cf6" },
  ranger: { label: "Ranger Post", emoji: "🔭", color: "#22c55e" },
  pump: { label: "Water Pump", emoji: "💧", color: "#06b6d4" },
  staff: { label: "Staff Quarters", emoji: "🏘", color: "#94a3b8" },
  office: { label: "Office/HQ", emoji: "🏢", color: "#f97316" },
  other: { label: "Facility", emoji: "📍", color: "#e2e8f0" },
} as const;

export const LINK_STYLES: Record<LinkType, { color: string; strokeWeight: number; dashed?: boolean; dotted?: boolean; dash?: string; label?: string }> = {
  uplink: { color: "#06b6d4", strokeWeight: 3.5, dashed: true, dash: "12,6" },
  backbone: { color: "#ffffff", strokeWeight: 4 },
  distribution: { color: "#22c55e", strokeWeight: 2, dashed: true, dash: "5,7" },
  relay: { color: "#06b6d4", strokeWeight: 2, dashed: true, dash: "3,5" },
  outofrange: { color: "#ef4444", strokeWeight: 3, dotted: true, dash: "1,7", label: "⚠" },
  live: { color: "#eab308", strokeWeight: 3 },
};

export const LOS_LINK_STYLES: Record<LosStatus, { color: string; strokeWeight: number; dashed?: boolean; dotted?: boolean; label: string }> = {
  confirmed: { color: "#22c55e", strokeWeight: 3.2, label: "LOS confirmed" },
  marginal: { color: "#f59e0b", strokeWeight: 3.2, dashed: true, label: "LOS marginal" },
  blocked: { color: "#ef4444", strokeWeight: 3, dotted: true, label: "LOS blocked" },
  unknown: { color: "#94a3b8", strokeWeight: 2.4, dashed: true, label: "LOS pending" },
};

export const PROVIDER_COLOURS: Record<MastProvider, string> = {
  vodacom: "#ef4444",
  mtn: "#facc15",
  cellc: "#fb7185",
  telkom: "#38bdf8",
  liquid: "#a855f7",
  rain: "#60a5fa",
  openserve: "#14b8a6",
  sentech: "#f97316",
  dfa: "#f43f5e",
  unknown: "#94a3b8",
};

export const PROVIDER_LABELS: Record<MastProvider, string> = {
  vodacom: "Vodacom",
  mtn: "MTN",
  cellc: "Cell C",
  telkom: "Telkom",
  liquid: "Liquid",
  rain: "Rain",
  openserve: "Openserve",
  sentech: "Sentech",
  dfa: "Dark Fibre Africa",
  unknown: "Unknown carrier",
};

export function mastProviderLabel(provider: MastProvider) {
  return PROVIDER_LABELS[provider] || "Unknown carrier";
}

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function pointInPolygon(point: LatLng, polygon: LatLng[]) {
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

export async function overpassQuery(q: string) {
  const endpoints = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.openstreetmap.ru/api/interpreter"];
  let lastError: Error | null = null;
  for (const endpoint of endpoints) {
    try {
      // Always use POST to avoid HTTP 414 (URI Too Long) with large poly filters
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(q)}`,
      });
      if (!resp.ok) throw new Error(`Overpass request failed with ${resp.status}`);
      return resp.json();
    } catch (error: any) {
      lastError = error;
      continue;
    }
  }
  throw lastError || new Error("Overpass request failed");
}

export function roughBoundaryAroundCentre(centre: LatLng, radiusKm = 8, sides = 24): LatLng[] {
  if (!isValidLatLng(centre)) return [];
  const latRadius = radiusKm / 111.32;
  const lngRadius = radiusKm / (111.32 * Math.max(0.2, Math.cos((centre.lat * Math.PI) / 180)));
  return Array.from({ length: sides }, (_, index) => {
    const angle = (index / sides) * Math.PI * 2;
    return {
      lat: centre.lat + Math.sin(angle) * latRadius,
      lng: centre.lng + Math.cos(angle) * lngRadius,
    };
  }).filter(isValidLatLng);
}

function validPathFromCoordinates(coordinates: any[]): LatLng[] {
  return coordinates
    .map((coord: any) => Array.isArray(coord) ? finiteCoordinatePair(coord[1], coord[0]) : null)
    .filter(isValidLatLng);
}

function boundaryFromBounds(points: LatLng[], minimumRadiusKm = 6): LatLng[] {
  const safePoints = points.filter(isValidLatLng);
  if (!safePoints.length) return [];
  if (safePoints.length === 1) return roughBoundaryAroundCentre(safePoints[0], minimumRadiusKm);
  const minLat = Math.min(...safePoints.map(p => p.lat));
  const maxLat = Math.max(...safePoints.map(p => p.lat));
  const minLng = Math.min(...safePoints.map(p => p.lng));
  const maxLng = Math.max(...safePoints.map(p => p.lng));
  const centre = { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
  const padLat = Math.max(0.015, (maxLat - minLat) * 0.18);
  const padLng = Math.max(0.015, (maxLng - minLng) * 0.18);
  const box = [
    { lat: minLat - padLat, lng: minLng - padLng },
    { lat: minLat - padLat, lng: maxLng + padLng },
    { lat: maxLat + padLat, lng: maxLng + padLng },
    { lat: maxLat + padLat, lng: minLng - padLng },
  ].filter(isValidLatLng);
  return box.length >= 3 ? box : roughBoundaryAroundCentre(centre, minimumRadiusKm);
}

export function flattenNominatimPolygon(geojson: any): LatLng[] {
  if (!geojson?.type) return [];
  if (geojson.type === "Polygon") return validPathFromCoordinates(geojson.coordinates?.[0] || []);
  if (geojson.type === "MultiPolygon") {
    const largest = (geojson.coordinates || [])
      .map((poly: number[][][]) => validPathFromCoordinates(poly?.[0] || []))
      .sort((a: LatLng[], b: LatLng[]) => b.length - a.length)[0];
    return largest || [];
  }
  if (geojson.type === "GeometryCollection") {
    const best = (geojson.geometries || [])
      .map((geometry: any) => flattenNominatimPolygon(geometry))
      .sort((a: LatLng[], b: LatLng[]) => b.length - a.length)[0];
    return best || [];
  }
  if (geojson.type === "LineString" || geojson.type === "MultiPoint") return boundaryFromBounds(validPathFromCoordinates(geojson.coordinates || []));
  if (geojson.type === "MultiLineString") return boundaryFromBounds((geojson.coordinates || []).flatMap((line: any[]) => validPathFromCoordinates(line || [])));
  if (geojson.type === "Point") {
    const point = finiteCoordinatePair(geojson.coordinates?.[1], geojson.coordinates?.[0]);
    return point ? roughBoundaryAroundCentre(point, 6) : [];
  }
  return [];
}

export function boundaryCentreFromPolygon(polygon: LatLng[], fallback: LatLng): LatLng {
  if (!polygon.length) return fallback;
  return {
    lat: polygon.reduce((sum, p) => sum + p.lat, 0) / polygon.length,
    lng: polygon.reduce((sum, p) => sum + p.lng, 0) / polygon.length,
  };
}

function boundsFromBoundary(boundaryPolygon: LatLng[] | null, centre: LatLng, padFactor = 0.12) {
  const polygon = boundaryPolygon ?? [];
  let minLat: number;
  let maxLat: number;
  let minLng: number;
  let maxLng: number;
  if (polygon.length >= 3) {
    minLat = Math.min(...polygon.map(p => p.lat));
    maxLat = Math.max(...polygon.map(p => p.lat));
    minLng = Math.min(...polygon.map(p => p.lng));
    maxLng = Math.max(...polygon.map(p => p.lng));
  } else {
    const o = 0.135;
    minLat = centre.lat - o;
    maxLat = centre.lat + o;
    minLng = centre.lng - o;
    maxLng = centre.lng + o;
  }
  const latPad = Math.max((maxLat - minLat) * padFactor, 0.01);
  const lngPad = Math.max((maxLng - minLng) * padFactor, 0.01);
  return { minLat: minLat - latPad, maxLat: maxLat + latPad, minLng: minLng - lngPad, maxLng: maxLng + lngPad };
}

function overpassBbox(bounds: ReturnType<typeof boundsFromBoundary>) {
  return `${bounds.minLat},${bounds.minLng},${bounds.maxLat},${bounds.maxLng}`;
}

function elementPoint(element: any): LatLng | null {
  const directPoint = finiteCoordinatePair(element?.lat, element?.lon);
  if (directPoint) return directPoint;

  const centerPoint = finiteCoordinatePair(element?.center?.lat, element?.center?.lon);
  if (centerPoint) return centerPoint;

  if (Array.isArray(element?.geometry) && element.geometry.length) {
    const points = element.geometry
      .map((p: any) => finiteCoordinatePair(p?.lat, p?.lon))
      .filter(isValidLatLng);
    if (!points.length) return null;
    return finiteCoordinatePair(
      points.reduce((sum: number, p: LatLng) => sum + p.lat, 0) / points.length,
      points.reduce((sum: number, p: LatLng) => sum + p.lng, 0) / points.length,
    );
  }
  return null;
}

function mastElementPoint(element: any): LatLng | null {
  if (element?.type === "node") return finiteCoordinatePair(element.lat, element.lon);
  if (element?.type === "way") return finiteCoordinatePair(element.center?.lat, element.center?.lon);
  return elementPoint(element);
}

function tagsText(tags: Record<string, string> | undefined) {
  if (!tags) return "";
  return Object.entries(tags)
    .filter(([key]) => /operator|network|brand|name|owner|description|telecom|communication|ref|site|mobile|radio|tower|contact|source/i.test(key))
    .map(([key, value]) => `${key}:${value}`)
    .join(" ")
    .toLowerCase();
}

function simplifyPolygonForOverpass(polygon: LatLng[], maxVertices = 50): LatLng[] {
  const safe = polygon.filter(isValidLatLng);
  if (safe.length <= maxVertices) return safe;

  // Use Ramer-Douglas-Peucker algorithm to preserve polygon shape.
  // This ensures the simplified polygon covers the same geographic area
  // rather than naively sampling every Nth point (which can miss entire lobes).
  function perpendicularDistance(point: LatLng, lineStart: LatLng, lineEnd: LatLng): number {
    // Use simple Euclidean distance in lat/lng space (sufficient for simplification)
    const dx = lineEnd.lng - lineStart.lng;
    const dy = lineEnd.lat - lineStart.lat;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.sqrt((point.lat - lineStart.lat) ** 2 + (point.lng - lineStart.lng) ** 2);
    const t = Math.max(0, Math.min(1, ((point.lng - lineStart.lng) * dx + (point.lat - lineStart.lat) * dy) / lenSq));
    const projLat = lineStart.lat + t * dy;
    const projLng = lineStart.lng + t * dx;
    return Math.sqrt((point.lat - projLat) ** 2 + (point.lng - projLng) ** 2);
  }

  function rdp(points: LatLng[], epsilon: number): LatLng[] {
    if (points.length <= 2) return points;
    let maxDist = 0;
    let maxIdx = 0;
    const last = points.length - 1;
    for (let i = 1; i < last; i++) {
      const d = perpendicularDistance(points[i], points[0], points[last]);
      if (d > maxDist) { maxDist = d; maxIdx = i; }
    }
    if (maxDist > epsilon) {
      const left = rdp(points.slice(0, maxIdx + 1), epsilon);
      const right = rdp(points.slice(maxIdx), epsilon);
      return left.slice(0, -1).concat(right);
    }
    return [points[0], points[last]];
  }

  // Binary search for the right epsilon that gives us <= maxVertices
  let lo = 0.00001;
  let hi = 0.1;
  let result = safe;
  for (let iter = 0; iter < 20; iter++) {
    const mid = (lo + hi) / 2;
    const simplified = rdp(safe, mid);
    if (simplified.length <= maxVertices) {
      result = simplified;
      hi = mid;
    } else {
      lo = mid;
    }
  }

  // Ensure we don't exceed maxVertices
  if (result.length > maxVertices) {
    // Final fallback: uniform sampling but ensure we close the polygon
    const step = Math.ceil(result.length / maxVertices);
    result = result.filter((_, i) => i % step === 0).slice(0, maxVertices);
  }

  // Ensure polygon closure
  if (result.length >= 3) {
    const first = result[0];
    const last = result[result.length - 1];
    if (first && last && (Math.abs(first.lat - last.lat) > 0.0001 || Math.abs(first.lng - last.lng) > 0.0001)) {
      if (result.length < maxVertices) result.push(first);
    }
  }

  return result;
}

function overpassPolyString(polygon: LatLng[]): string | null {
  const simplified = simplifyPolygonForOverpass(polygon, 50);
  if (simplified.length < 3) return null;
  return simplified.map(point => `${point.lat.toFixed(6)} ${point.lng.toFixed(6)}`).join(" ");
}

function mastQueryFragments(selector: string, area: string) {
  return `
  node${selector}${area};
  way${selector}${area};`;
}

export function classifyMastProvider(tags: Record<string, string> | undefined): MastProvider {
  if (!tags) return "unknown";
  const allText = [
    tags.operator || "",
    tags.name || "",
    tags.ref || "",
    tags.description || "",
    tags["network:name"] || "",
    tags.owner || "",
    tags.brand || "",
    tags.network || "",
  ].join(" ");
  const raw = allText.toLowerCase();
  const compact = raw.replace(/[^a-z0-9]+/g, "");
  if (/vodacom|vodafone|voda\s*com/i.test(raw) || compact.includes("vodacom") || compact.includes("vodafone")) return "vodacom";
  if (/(^|[^a-z0-9])mtn([^a-z0-9]|$)|mobile telephone networks|mtn group/i.test(raw) || compact.includes("mtnsa") || compact.endsWith("mtn") || compact.includes("operatormtn")) return "mtn";
  if (/cell\s*c|cell-c|cell_c|cellular\s+c/i.test(raw) || compact.includes("cellc")) return "cellc";
  if (/openserve/i.test(raw) || compact.includes("openserve")) return "openserve";
  if (/telkom|8\.ta|8ta|telkomsa|telkom mobile/i.test(raw) || compact.includes("telkom")) return "telkom";
  if (/liquid|liquid intelligent|liquid telecom/i.test(raw) || compact.includes("liquid")) return "liquid";
  if (/(^|[^a-z0-9])rain([^a-z0-9]|$)|rain telecom|raindotcom/i.test(raw) || compact.includes("raindotcom")) return "rain";
  if (/dark fibre|darkfibre|dark fibre africa|dfa/i.test(raw) || compact.includes("darkfibre") || compact === "dfa") return "dfa";
  if (/sentech/i.test(raw) || compact.includes("sentech")) return "sentech";
  return "unknown";
}

function pushSpacedCandidate<T extends LatLng>(target: T[], candidate: T, minSpacingKm: number, limit: number) {
  if (!isValidLatLng(candidate)) return;
  if (target.length >= limit) return;
  if (target.some(existing => haversine(existing.lat, existing.lng, candidate.lat, candidate.lng) < minSpacingKm)) return;
  target.push(candidate);
}

async function fetchElevationBatch(points: LatLng[], context: string): Promise<number[]> {
  const validPoints = points.filter(isValidLatLng);
  if (validPoints.length !== points.length) throw new Error(`${context}: invalid coordinate in elevation request`);
  if (Date.now() < openMeteoRateLimitedUntil) throw new Error(`${context}: Open-Meteo temporarily rate limited`);

  const elevations: number[] = [];
  const batchSize = context === "LOS profile" ? 21 : 80;
  for (let start = 0; start < points.length; start += batchSize) {
    const batch = points.slice(start, start + batchSize);
    const lats = batch.map(point => point.lat.toFixed(6)).join(",");
    const lngs = batch.map(point => point.lng.toFixed(6)).join(",");
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), ELEVATION_REQUEST_TIMEOUT_MS);
    try {
      const resp = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`, { signal: controller.signal });
      if (resp.status === 429) {
        openMeteoRateLimitedUntil = Date.now() + 60000;
        throw new Error(`${context}: Open-Meteo request failed with 429`);
      }
      if (!resp.ok) throw new Error(`${context}: Open-Meteo request failed with ${resp.status}`);
      const body = await resp.json();
      const values = Array.isArray(body?.elevation) ? body.elevation : [];
      if (values.length !== batch.length || values.some((value: unknown) => typeof value !== "number" || !Number.isFinite(value))) {
        throw new Error(`${context}: incomplete elevation response`);
      }
      elevations.push(...values);
    } finally {
      window.clearTimeout(timeoutId);
    }
  }
  return elevations;
}

export async function findHighSites(boundaryPolygon: LatLng[] | null, propertyCentre: LatLng): Promise<HighSite[]> {
  const { lat, lng } = propertyCentre;
  const bounds = boundsFromBoundary(boundaryPolygon, propertyCentre, 0.2);
  const polygon = boundaryPolygon ?? [];
  let allSites: Array<LatLng & { name: string; elevation: number | null; source: "srtm" | "osm" }> = [];

  try {
    const GRID = 14;
    const gridPoints: Array<LatLng & { gi: number; gj: number; elevation?: number }> = [];
    for (let i = 0; i < GRID; i++) {
      for (let j = 0; j < GRID; j++) {
        gridPoints.push({
          lat: bounds.minLat + (bounds.maxLat - bounds.minLat) * (i / (GRID - 1)),
          lng: bounds.minLng + (bounds.maxLng - bounds.minLng) * (j / (GRID - 1)),
          gi: i,
          gj: j,
        });
      }
    }
    const elevations = await fetchElevationBatch(gridPoints, "SRTM grid");
    const grid2d = Array.from({ length: GRID }, () => new Array<number>(GRID).fill(0));
    gridPoints.forEach((p, idx) => {
      p.elevation = elevations[idx];
      grid2d[p.gi][p.gj] = elevations[idx];
    });

    const minE = Math.min(...elevations);
    const maxE = Math.max(...elevations);
    const threshold = minE + (maxE - minE) * 0.22;
    const maxima: Array<LatLng & { gi: number; gj: number; elevation: number }> = [];
    for (let i = 0; i < GRID; i++) {
      for (let j = 0; j < GRID; j++) {
        const e = grid2d[i][j];
        if (e < threshold) continue;
        let isMax = true;
        for (let di = -1; di <= 1 && isMax; di++) {
          for (let dj = -1; dj <= 1 && isMax; dj++) {
            if (di === 0 && dj === 0) continue;
            const ni = i + di;
            const nj = j + dj;
            if (ni < 0 || ni >= GRID || nj < 0 || nj >= GRID) continue;
            if (grid2d[ni][nj] >= e) isMax = false;
          }
        }
        if (isMax) maxima.push(gridPoints[i * GRID + j] as LatLng & { gi: number; gj: number; elevation: number });
      }
    }

    const insideGrid = gridPoints
      .filter((p): p is LatLng & { gi: number; gj: number; elevation: number } => typeof p.elevation === "number" && (polygon.length >= 3 ? pointInPolygon(p, polygon) : true))
      .sort((a, b) => b.elevation - a.elevation);
    const rankedMaxima = maxima.sort((a, b) => b.elevation - a.elevation);
    const latSpanKm = haversine(bounds.minLat, bounds.minLng, bounds.maxLat, bounds.minLng);
    const lngSpanKm = haversine(bounds.minLat, bounds.minLng, bounds.minLat, bounds.maxLng);
    const spacingKm = Math.max(0.75, Math.min(3, Math.max(latSpanKm, lngSpanKm) / 9));
    const selected: Array<LatLng & { gi: number; gj: number; elevation: number }> = [];

    rankedMaxima.forEach(p => pushSpacedCandidate(selected, p, spacingKm, 12));
    insideGrid.forEach(p => pushSpacedCandidate(selected, p, spacingKm * 0.8, 16));
    if (selected.length < 5) insideGrid.forEach(p => pushSpacedCandidate(selected, p, Math.max(0.35, spacingKm * 0.45), 16));

    allSites = selected.map((p, index) => ({
      lat: p.lat,
      lng: p.lng,
      name: index < 5 ? `Core High ${index + 1} · ${Math.round(p.elevation)}m` : `High Point ${Math.round(p.elevation)}m`,
      elevation: p.elevation,
      source: "srtm",
    }));
  } catch (e: any) {
    console.warn("SRTM failed:", e.message);
  }

  if (allSites.length < 3) {
    const fallbackCandidates: Array<LatLng & { name: string; elevation: number | null; source: "srtm" | "osm" }> = [];
    const FALLBACK_GRID = 9;
    for (let i = 1; i < FALLBACK_GRID - 1; i++) {
      for (let j = 1; j < FALLBACK_GRID - 1; j++) {
        const point = {
          lat: bounds.minLat + (bounds.maxLat - bounds.minLat) * (i / (FALLBACK_GRID - 1)),
          lng: bounds.minLng + (bounds.maxLng - bounds.minLng) * (j / (FALLBACK_GRID - 1)),
        };
        if (!isValidLatLng(point)) continue;
        if (polygon.length >= 3 && !pointInPolygon(point, polygon)) continue;
        pushSpacedCandidate(fallbackCandidates, {
          ...point,
          name: `Boundary Relay Candidate ${fallbackCandidates.length + 1}`,
          elevation: null,
          source: "srtm",
        }, 1.4, 8);
      }
    }
    if (fallbackCandidates.length < 3 && isValidLatLng(propertyCentre)) {
      pushSpacedCandidate(fallbackCandidates, {
        ...propertyCentre,
        name: "Boundary Relay Candidate Centre",
        elevation: null,
        source: "srtm",
      }, 0.5, 8);
    }
    allSites.push(...fallbackCandidates);
  }

  try {
    const q = `[out:json][timeout:20];(node["natural"="peak"](${overpassBbox(bounds)});node["natural"="hill"](${overpassBbox(bounds)}););out tags;`;
    const data = await overpassQuery(q);
    data.elements?.forEach((node: any) => {
      const point = finiteCoordinatePair(node?.lat, node?.lon);
      if (!point) return;
      if (allSites.some(s => haversine(s.lat, s.lng, point.lat, point.lng) < 0.8)) return;
      const ele = node.tags?.ele ? parseFloat(String(node.tags.ele).replace(/[^0-9.-]/g, "")) : null;
      allSites.push({ ...point, name: node.tags?.name || (ele ? `Peak ${ele}m` : "Named Kopje"), elevation: ele, source: "osm" });
    });
  } catch (e: any) {
    console.warn("OSM peaks failed:", e.message);
  }

  return allSites
    .filter(isValidLatLng)
    .map(site => {
      const inside = polygon.length >= 3 ? pointInPolygon(site, polygon) : false;
      const distToCentre = haversine(lat, lng, site.lat, site.lng);
      const category: HighSite["category"] = inside ? "inside" : distToCentre < 5 ? "nearby" : "remote";
      return { ...site, inside, distToCentre, category };
    })
    .sort((a, b) => (b.elevation ?? -Infinity) - (a.elevation ?? -Infinity));
}

export async function findMasts(
  propertyCentre: LatLng,
  boundaryPolygon: LatLng[] | null,
  insideHighSites: HighSite[] = [],
  onStatus?: (message: string) => void,
): Promise<Mast[]> {
  const centre = boundaryCentreFromPolygon(boundaryPolygon || [], propertyCentre);
  const refPt = insideHighSites.length > 0 ? getCoreHighSites(insideHighSites, 1)[0] || insideHighSites[0] : centre;
  const lat = centre.lat.toFixed(6);
  const lng = centre.lng.toFixed(6);

  const primaryQuery = `[out:json][timeout:30];
(
  node["man_made"="mast"]["tower:type"="communication"](around:30000,${lat},${lng});
  node["man_made"="tower"]["tower:type"="communication"](around:30000,${lat},${lng});
  node["man_made"="mast"]["operator"~"Vodacom|MTN|Cell C|Telkom",i](around:30000,${lat},${lng});
  node["man_made"="tower"](around:30000,${lat},${lng});
  way["man_made"="mast"]["tower:type"="communication"](around:30000,${lat},${lng});
  node["man_made"="communications_tower"](around:30000,${lat},${lng});
  node["telecom"="exchange"](around:30000,${lat},${lng});
  node["telecom"="antenna"](around:30000,${lat},${lng});
);
out center;`;

  const simpleRetryQuery = `[out:json][timeout:30];
(
  node["man_made"="mast"](around:40000,${lat},${lng});
  node["man_made"="tower"](around:40000,${lat},${lng});
  node["man_made"="communications_tower"](around:40000,${lat},${lng});
  node["telecom"="exchange"](around:40000,${lat},${lng});
  node["telecom"="antenna"](around:40000,${lat},${lng});
  way["man_made"="mast"](around:40000,${lat},${lng});
  way["man_made"="tower"](around:40000,${lat},${lng});
);
out center;`;

  const elements: any[] = [];
  try {
    const primaryResult = await overpassQuery(primaryQuery);
    elements.push(...(primaryResult.elements || []));
    if (!elements.length) {
      console.warn("Mast discovery primary centroid-radius query returned 0 results; retrying with simpler broad query.");
      onStatus?.("Mast discovery failed — retrying with a broader tower query…");
      const retryResult = await overpassQuery(simpleRetryQuery);
      elements.push(...(retryResult.elements || []));
    }
  } catch (error) {
    console.warn("Mast discovery primary centroid-radius query failed; retrying with simpler broad query.", error);
    onStatus?.("Mast discovery failed — retrying with a broader tower query…");
    try {
      const retryResult = await overpassQuery(simpleRetryQuery);
      elements.push(...(retryResult.elements || []));
    } catch (retryError) {
      console.warn("Mast discovery retry query failed.", retryError);
      onStatus?.("Mast discovery failed after retry. Continuing with any polygon-based evidence available…");
    }
  }

  const poly = overpassPolyString(boundaryPolygon || []);
  if (poly) {
    const selectors = [
      `["man_made"="mast"]`,
      `["man_made"="tower"]`,
      `["man_made"="communications_tower"]`,
      `["telecom"="exchange"]`,
      `["telecom"="antenna"]`,
      `["communication:mobile_phone"="yes"]`,
    ];
    const perimeterArea = `(around:10000, poly:"${poly}")`;
    const insideArea = `(poly:"${poly}")`;
    const perimeterQuery = `[out:json][timeout:30];
(
${selectors.map(selector => mastQueryFragments(selector, perimeterArea)).join("\n")}
);
out center;`;
    const insideQuery = `[out:json][timeout:30];
(
${selectors.map(selector => mastQueryFragments(selector, insideArea)).join("\n")}
);
out center;`;
    const [perimeterResult, insideResult] = await Promise.allSettled([overpassQuery(perimeterQuery), overpassQuery(insideQuery)]);
    if (perimeterResult.status === "fulfilled") elements.push(...(perimeterResult.value.elements || []));
    else console.warn("Mast discovery polygon perimeter bonus query failed.", perimeterResult.reason);
    if (insideResult.status === "fulfilled") elements.push(...(insideResult.value.elements || []));
    else console.warn("Mast discovery polygon inside bonus query failed.", insideResult.reason);
  }

  const seen = new Set<string>();
  const masts = elements
    .map((element: any) => {
      const point = mastElementPoint(element);
      if (!point) return null;
      const key = `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
      if (seen.has(key)) return null;
      seen.add(key);
      const tags = element.tags || {};
      const provider = classifyMastProvider(tags);
      const providerLabel = mastProviderLabel(provider);
      return {
        ...point,
        name: tags.name || tags.operator || tags.network || tags["network:name"] || tags.brand || tags.owner || `${providerLabel} mast`,
        provider,
        distFromRelay: haversine(refPt.lat, refPt.lng, point.lat, point.lng),
        distFromCentre: haversine(centre.lat, centre.lng, point.lat, point.lng),
        tags,
      } as Mast;
    })
    .filter(Boolean) as Mast[];

  return markClosestMasts(masts, centre, insideHighSites);
}

export function markClosestMasts(masts: Mast[], propertyCentre: LatLng, insideHighSites: HighSite[]): Mast[] {
  const coreSites = getCoreHighSites(insideHighSites);
  const refPt = coreSites[0] || insideHighSites.find(site => site.category !== "remote") || propertyCentre;
  const rebased = masts
    .map(m => ({ ...m, distFromRelay: haversine(refPt.lat, refPt.lng, m.lat, m.lng), distFromCentre: haversine(propertyCentre.lat, propertyCentre.lng, m.lat, m.lng) }))
    .sort((a, b) => (a.provider === "unknown" ? 1 : 0) - (b.provider === "unknown" ? 1 : 0) || a.distFromRelay - b.distFromRelay);
  const closestPerProvider: Partial<Record<MastProvider, number>> = {};
  rebased.forEach((m, i) => {
    if (m.provider !== "unknown" && !(m.provider in closestPerProvider)) closestPerProvider[m.provider] = i;
  });
  const highlightedIdxs = new Set(Object.values(closestPerProvider));
  return rebased.map((m, i) => ({
    ...m,
    isClosestForProvider: highlightedIdxs.has(i),
    visible: true,
  }));
}

export function rebaseMastsToRelay(masts: Mast[], propertyCentre: LatLng, insideHighSites: HighSite[]): Mast[] {
  return markClosestMasts(masts, propertyCentre, insideHighSites);
}

function classifyFacility(tags: Record<string, string> | undefined): FacilityTypeKey {
  const tourism = tags?.tourism || "";
  const amenity = tags?.amenity || "";
  const building = tags?.building || "";
  const barrier = tags?.barrier || "";
  const manMade = tags?.man_made || "";
  const power = tags?.power || "";
  const waterway = tags?.waterway || "";
  const landuse = tags?.landuse || "";
  const name = tags?.name || "";
  const text = `${tourism} ${amenity} ${building} ${barrier} ${manMade} ${power} ${waterway} ${landuse} ${name}`.toLowerCase();
  if (/gate/.test(text) || barrier === "gate" || tags?.highway === "gate") return "gate";
  if (/guest_house|hotel|lodge|camp|chalet|safari|wilderness_hut/.test(text) || /guest_house|hotel|chalet|camp_site|wilderness_hut/.test(tourism)) return "lodge";
  if (/ranger_station|ranger|post|headquarters|hq|administration/.test(text) || amenity === "ranger_station") return text.includes("office") || text.includes("hq") || text.includes("headquarters") ? "office" : "ranger";
  if (amenity === "shelter") return "ranger";
  if (/water_tower|windmill|storage_tank|dam|reservoir/.test(manMade) || waterway === "dam" || /water|pump|reservoir|tank|well|dam/.test(text)) return "pump";
  if (/camera|surveillance/.test(text)) return "camera";
  if (/substation|pole|tower|generator/.test(power) || /power|electric|substation/.test(text)) return "other";
  if (/staff|residential|dormitory/.test(text) || landuse === "residential") return "staff";
  if (/house|cabin|hut|bungalow|shed|farm|barn/.test(building) || /house|cabin|hut|bungalow|shed|farm/.test(text) || landuse === "farmyard") return "staff";
  return "other";
}

function facilityName(tags: Record<string, string> | undefined, type: FacilityTypeKey, index: number) {
  const label = FACILITY_TYPES[type].label;
  return tags?.name || tags?.operator || tags?.ref || `${label} ${index}`;
}

export async function findFacilities(boundaryPolygon: LatLng[] | null, propertyCentre: LatLng): Promise<FacilityDetectionResult> {
  const polygon = boundaryPolygon ?? [];
  // Use a LARGER bounding box (~500m buffer beyond boundary edges) as the PRIMARY query method.
  // This is faster and more reliable than poly filters. Client-side point-in-polygon filtering
  // ensures only facilities inside (or very near) the boundary are included.
  const bounds = boundsFromBoundary(boundaryPolygon, propertyCentre, 0.06); // ~500m buffer
  const bbox = overpassBbox(bounds);

  // AGGRESSIVE facility query — catch ALL mapped structures inside the bbox.
  // Uses bbox as primary (fast, reliable, no URI length issues).
  // Client-side polygon check filters results afterwards.
  const facilityQ = `[out:json][timeout:60];(
    node["building"]${`(${bbox})`};
    way["building"]${`(${bbox})`};
    node["tourism"]${`(${bbox})`};
    way["tourism"]${`(${bbox})`};
    node["amenity"]${`(${bbox})`};
    way["amenity"]${`(${bbox})`};
    node["man_made"]${`(${bbox})`};
    way["man_made"]${`(${bbox})`};
    node["barrier"="gate"]${`(${bbox})`};
    way["barrier"="gate"]${`(${bbox})`};
    node["barrier"="fence"]${`(${bbox})`};
    node["highway"="gate"]${`(${bbox})`};
    node["landuse"~"farmyard|residential"]${`(${bbox})`};
    way["landuse"~"farmyard|residential"]${`(${bbox})`};
    node["waterway"="dam"]${`(${bbox})`};
    way["waterway"="dam"]${`(${bbox})`};
    node["power"]${`(${bbox})`};
    way["power"]${`(${bbox})`};
    node["name"]${`(${bbox})`};
  );out center tags;`;

  // Road query — uses "out geom tags" so we get the path geometry for rendering.
  const roadQ = `[out:json][timeout:45];(
    way["highway"](${bbox});
  );out geom tags;`;

  const facilities: Facility[] = [];
  const roads: RoadFeature[] = [];
  const seenFacilities = new Set<string>();

  // Run both queries in parallel; road query failure is non-fatal.
  const [facilityResult, roadResult] = await Promise.allSettled([
    overpassQuery(facilityQ),
    overpassQuery(roadQ),
  ]);

  // STRICT containment: only facilities physically inside the boundary polygon are included.
  // No buffer. If it's outside the cyan boundary line, it does not appear.
  function isInsideBoundary(point: LatLng): boolean {
    if (polygon.length < 3) return haversine(propertyCentre.lat, propertyCentre.lng, point.lat, point.lng) < 8;
    return pointInPolygon(point, polygon);
  }

  // Process facilities
  if (facilityResult.status === "fulfilled") {
    (facilityResult.value.elements || []).forEach((element: any) => {
      const tags = element.tags || {};
      // Skip pure road/path elements that aren't structures
      if (tags.highway && tags.highway !== "gate" && !tags.building && !tags.amenity && !tags.tourism && !tags.man_made) return;
      // Skip natural features (rivers, trees, etc.)
      if (tags.natural && !tags.building && !tags.man_made) return;
      // Skip route relations and boundary elements
      if (tags.type === "route" || tags.type === "boundary" || tags.boundary) return;
      // Skip elements with ONLY a name but no structural tag (catches road names, place names, etc.)
      const hasStructuralTag = tags.tourism || tags.building || tags.amenity || tags.man_made ||
        tags.barrier || tags.highway === "gate" || tags.landuse || tags.waterway || tags.power;
      if (!hasStructuralTag && tags.name) {
        // Only include named nodes if the name suggests a facility
        const n = (tags.name || "").toLowerCase();
        const isFacilityName = /lodge|house|camp|gate|dam|tower|station|quarters|office|school|clinic|store|shop|farm|pump|tank|windmill/.test(n);
        if (!isFacilityName) return;
      }
      if (!hasStructuralTag && !tags.name) return;

      const point = elementPoint(element);
      if (!point) return;
      if (!isInsideBoundary(point)) return;
      const type = classifyFacility(tags);
      const key = `${point.lat.toFixed(5)}-${point.lng.toFixed(5)}`;
      if (seenFacilities.has(key)) return;
      seenFacilities.add(key);
      facilities.push({ id: `osm-${element.type}-${element.id}`, ...point, type, name: facilityName(tags, type, facilities.length + 1), source: "osm", tags });
    });
  } else {
    console.warn("Facility Overpass query failed:", facilityResult.reason);
  }

  // Process roads
  if (roadResult.status === "fulfilled") {
    (roadResult.value.elements || []).forEach((element: any) => {
      const tags = element.tags || {};
      if (!tags.highway) return;
      const geom = element.geometry;
      if (!Array.isArray(geom) || geom.length < 2) return;
      const path = geom
        .map((p: any) => ({ lat: p.lat, lng: p.lon }))
        .filter((p: LatLng) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
      if (path.length < 2) return;
      const inside = polygon.length >= 3
        ? path.some((point: LatLng) => pointInPolygon(point, polygon))
        : haversine(propertyCentre.lat, propertyCentre.lng, path[0].lat, path[0].lng) < 8;
      if (!inside) return;
      roads.push({ id: `road-${element.type}-${element.id}`, name: tags.name || tags.ref || tags.highway, type: tags.highway, path, tags });
    });
  } else {
    console.warn("Road Overpass query failed:", roadResult.reason);
  }

  return { facilities: facilities.slice(0, 500), roads: roads.slice(0, 300) };
}

/**
 * Sample elevation along the boundary perimeter at ~500m intervals and flag
 * points that are significantly higher than their immediate surroundings as
 * ridge-line / boundary high-ground candidates suitable for gateway relay sites.
 */
export async function findRidgeCandidates(boundaryPolygon: LatLng[] | null, propertyCentre: LatLng): Promise<RidgeCandidate[]> {
  const polygon = (boundaryPolygon ?? []).filter(isValidLatLng);
  if (polygon.length < 3) return [];

  // Compute perimeter length
  let perimeterKm = 0;
  for (let i = 0; i < polygon.length; i++) {
    perimeterKm += haversine(polygon[i].lat, polygon[i].lng, polygon[(i + 1) % polygon.length].lat, polygon[(i + 1) % polygon.length].lng);
  }

  // Sample at ~500m intervals along the perimeter
  const sampleIntervalKm = 0.5;
  const totalSamples = Math.max(8, Math.min(80, Math.round(perimeterKm / sampleIntervalKm)));
  const perimeterSamples: LatLng[] = [];
  let accumulated = 0;
  let segIdx = 0;
  for (let s = 0; s < totalSamples; s++) {
    const targetDist = (s / totalSamples) * perimeterKm;
    while (segIdx < polygon.length) {
      const from = polygon[segIdx];
      const to = polygon[(segIdx + 1) % polygon.length];
      const segLen = haversine(from.lat, from.lng, to.lat, to.lng);
      if (accumulated + segLen >= targetDist) {
        const t = segLen > 0 ? (targetDist - accumulated) / segLen : 0;
        perimeterSamples.push({ lat: from.lat + t * (to.lat - from.lat), lng: from.lng + t * (to.lng - from.lng) });
        break;
      }
      accumulated += segLen;
      segIdx++;
    }
  }

  if (perimeterSamples.length < 4) return [];

  // Fetch elevations for all perimeter samples
  let elevations: number[];
  try {
    elevations = await fetchElevationBatch(perimeterSamples, "ridge perimeter");
  } catch {
    return [];
  }

  // For each sample, compute local relief vs. neighbours within ~1.5km window
  const WINDOW_KM = 1.5;
  const RELIEF_THRESHOLD_M = 12;
  const candidates: RidgeCandidate[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < perimeterSamples.length; i++) {
    const point = perimeterSamples[i];
    const elev = elevations[i];
    if (!Number.isFinite(elev)) continue;

    // Gather neighbour elevations within window
    const neighbourElevs: number[] = [];
    for (let j = 0; j < perimeterSamples.length; j++) {
      if (j === i) continue;
      const dist = haversine(point.lat, point.lng, perimeterSamples[j].lat, perimeterSamples[j].lng);
      if (dist <= WINDOW_KM && Number.isFinite(elevations[j])) neighbourElevs.push(elevations[j]);
    }
    if (!neighbourElevs.length) continue;
    const avgNeighbour = neighbourElevs.reduce((sum, e) => sum + e, 0) / neighbourElevs.length;
    const localRelief = elev - avgNeighbour;
    if (localRelief < RELIEF_THRESHOLD_M) continue;

    // Deduplicate nearby candidates
    const key = `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    // Check no existing candidate is within 1km
    const tooClose = candidates.some(c => haversine(c.lat, c.lng, point.lat, point.lng) < 1.0);
    if (tooClose) continue;
    seen.add(key);

    const distToBoundary = distanceToBoundaryKm(point, polygon);
    candidates.push({
      lat: point.lat,
      lng: point.lng,
      name: `Ridge Candidate ${candidates.length + 1}`,
      elevation: elev,
      localRelief: Math.round(localRelief),
      distToBoundaryKm: Math.round(distToBoundary * 10) / 10,
      inside: pointInPolygon(point, polygon),
    });
  }

  return candidates.sort((a, b) => (b.localRelief) - (a.localRelief)).slice(0, 20);
}

export const FACILITY_ANTENNA_HEIGHT_M = 5;
export const FACILITY_HEIGHT_OPTIONS = [5, 6, 9, 12, 15] as const;
export const HIGH_SITE_ANTENNA_HEIGHT_M = 9;
export const HIGH_SITE_MAST_HEIGHT_OPTIONS = [9, 12, 15, 18, 24, 30, 36] as const;
export const MANUAL_LINK_HEIGHT_OPTIONS = [10, 15, 18, 24, 30, 36, 45] as const;
export const CARRIER_MAST_HEIGHT_M = 45;
export const CARRIER_MAST_HEIGHT_OPTIONS = [25, 30, 35, 40, 45, 50, 60] as const;
const LOS_SAMPLE_COUNT = 20;
const LOS_MARGIN_METRES = 10;
const LOS_CONCURRENCY = 1;
const MAX_FACILITY_LOS_PAIRS = 500; // Exhaustive: every high point scans every facility
const MAX_MAST_LOS_PAIRS = 500;
const ELEVATION_REQUEST_TIMEOUT_MS = 6000;
let openMeteoRateLimitedUntil = 0;

function losStatusFromClearance(hasLOS: boolean, worstClearance: number): LosStatus {
  if (!hasLOS) return "blocked";
  return worstClearance <= LOS_MARGIN_METRES ? "marginal" : "confirmed";
}

function sampleLine(pointA: LatLng, pointB: LatLng, samples = LOS_SAMPLE_COUNT): LatLng[] {
  const points: LatLng[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    points.push({
      lat: pointA.lat + t * (pointB.lat - pointA.lat),
      lng: pointA.lng + t * (pointB.lng - pointA.lng),
    });
  }
  return points;
}

async function fetchElevationProfile(points: LatLng[]): Promise<number[]> {
  const elevation = await fetchElevationBatch(points, "LOS profile");
  return elevation;
}

function evaluateLineOfSight(pointA: LatLng, pointB: LatLng, elevation: number[], antennaHeightA: number, antennaHeightB: number): LineOfSightResult {
  const samples = elevation.length - 1;
  const startElev = elevation[0] + antennaHeightA;
  const endElev = elevation[samples] + antennaHeightB;
  const totalDistance = haversine(pointA.lat, pointA.lng, pointB.lat, pointB.lng);
  let hasLOS = true;
  let worstClearance = Infinity;
  const sampledPoints = sampleLine(pointA, pointB, samples);
  const profile: ElevationSample[] = sampledPoints.map((point, index) => {
    const t = index / samples;
    const lineHeight = startElev + t * (endElev - startElev);
    const terrainHeight = elevation[index];
    const clearance = lineHeight - terrainHeight;
    if (index > 0 && index < samples) {
      if (clearance < 0) hasLOS = false;
      if (clearance < worstClearance) worstClearance = clearance;
    }
    return { ...point, elevation: terrainHeight, lineHeight, clearance, distanceKm: totalDistance * t };
  });
  if (!Number.isFinite(worstClearance)) worstClearance = Math.min(antennaHeightA, antennaHeightB);
  return {
    hasLOS,
    losStatus: losStatusFromClearance(hasLOS, worstClearance),
    worstClearance,
    elevationProfile: elevation,
    samples: profile,
  };
}

export async function checkLineOfSight(pointA: LatLng, pointB: LatLng, antennaHeightA = FACILITY_ANTENNA_HEIGHT_M, antennaHeightB = HIGH_SITE_ANTENNA_HEIGHT_M): Promise<LineOfSightResult> {
  const points = sampleLine(pointA, pointB, LOS_SAMPLE_COUNT);
  const elevation = await fetchElevationProfile(points);
  return evaluateLineOfSight(pointA, pointB, elevation, antennaHeightA, antennaHeightB);
}

export async function calculateManualPointLink(link: Pick<ManualPointLink, "id" | "pointA" | "pointB">): Promise<ManualPointLink> {
  const distKm = haversine(link.pointA.lat, link.pointA.lng, link.pointB.lat, link.pointB.lng);
  try {
    const los = await checkLineOfSight(link.pointA, link.pointB, link.pointA.height, link.pointB.height);
    return {
      ...link,
      distKm,
      losStatus: los.losStatus,
      worstClearance: los.worstClearance,
      elevationProfile: los.elevationProfile,
      calculating: false,
      error: los.error,
    };
  } catch (error) {
    const fallback = failedLineOfSight(link.pointA, link.pointB, error, link.pointA.height, link.pointB.height);
    return {
      ...link,
      distKm,
      losStatus: fallback.losStatus,
      worstClearance: fallback.worstClearance,
      elevationProfile: fallback.elevationProfile,
      calculating: false,
      error: fallback.error,
    };
  }
}

export async function calculateManualFacilityLink(
  link: Pick<ManualFacilityLink, "id" | "facilityId" | "facility" | "highSite">,
  facilityHeight = FACILITY_ANTENNA_HEIGHT_M,
  highSiteHeight = HIGH_SITE_ANTENNA_HEIGHT_M,
): Promise<ManualFacilityLink> {
  const distKm = haversine(link.facility.lat, link.facility.lng, link.highSite.lat, link.highSite.lng);
  try {
    const los = await checkLineOfSight(link.facility, link.highSite, facilityHeight, highSiteHeight);
    return {
      ...link,
      distKm,
      losStatus: los.losStatus,
      worstClearance: los.worstClearance,
      elevationProfile: los.elevationProfile,
      calculating: false,
      error: los.error,
    };
  } catch (error) {
    const fallback = failedLineOfSight(link.facility, link.highSite, error, facilityHeight, highSiteHeight);
    return {
      ...link,
      distKm,
      losStatus: fallback.losStatus,
      worstClearance: fallback.worstClearance,
      elevationProfile: fallback.elevationProfile,
      calculating: false,
      error: fallback.error,
    };
  }
}

function failedLineOfSight(pointA: LatLng, pointB: LatLng, error: unknown, antennaHeightA = FACILITY_ANTENNA_HEIGHT_M, antennaHeightB = HIGH_SITE_ANTENNA_HEIGHT_M): LineOfSightResult {
  const message = error instanceof Error ? error.message : "Elevation profile unavailable";
  const distanceKm = haversine(pointA.lat, pointA.lng, pointB.lat, pointB.lng);
  const transient = /429|rate limited|abort|timeout/i.test(message);
  const endpointA = typeof (pointA as HighSite).elevation === "number" && Number.isFinite((pointA as HighSite).elevation as number) ? ((pointA as HighSite).elevation as number) : 0;
  const endpointB = typeof (pointB as HighSite).elevation === "number" && Number.isFinite((pointB as HighSite).elevation as number) ? ((pointB as HighSite).elevation as number) : endpointA;
  const syntheticTerrain = Math.max(endpointA, endpointB) - Math.max(6, Math.min(antennaHeightA, antennaHeightB) * 0.35);
  const startLine = endpointA + antennaHeightA;
  const endLine = endpointB + antennaHeightB;
  const midpointLine = (startLine + endLine) / 2;
  const fallbackClearance = Math.max(1, midpointLine - syntheticTerrain);
  const status: LosStatus = transient ? (fallbackClearance >= LOS_MARGIN_METRES ? "confirmed" : "marginal") : "blocked";
  const clearance = transient ? fallbackClearance : Number.NEGATIVE_INFINITY;
  return {
    hasLOS: status !== "blocked",
    losStatus: status,
    worstClearance: clearance,
    elevationProfile: transient ? [endpointA, syntheticTerrain, endpointB] : [],
    samples: [
      { ...pointA, elevation: endpointA, lineHeight: startLine, clearance: antennaHeightA, distanceKm: 0 },
      { lat: (pointA.lat + pointB.lat) / 2, lng: (pointA.lng + pointB.lng) / 2, elevation: syntheticTerrain, lineHeight: midpointLine, clearance, distanceKm: distanceKm / 2 },
      { ...pointB, elevation: endpointB, lineHeight: endLine, clearance: antennaHeightB, distanceKm },
    ],
    error: message,
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
  return `${value.toFixed(1)}m clearance`;
}

export function highSiteKey(site: LatLng & { name?: string }) {
  return `${site.name || "high-site"}:${site.lat.toFixed(5)}:${site.lng.toFixed(5)}`;
}

export function mastKey(mast: LatLng & { name?: string; provider?: string }) {
  return `${mast.provider || "carrier"}:${mast.name || "mast"}:${mast.lat.toFixed(5)}:${mast.lng.toFixed(5)}`;
}

export function facilityKey(facility: LatLng & { id?: string; name?: string; type?: string }) {
  return `${facility.id || facility.type || "facility"}:${facility.name || "operating-point"}:${facility.lat.toFixed(5)}:${facility.lng.toFixed(5)}`;
}

export type LosTopologyOptions = {
  highSiteMastHeights?: Record<string, number>;
  carrierMastHeight?: number;
  carrierMastHeights?: Record<string, number>;
  facilityHeights?: Record<string, number>;
  boundaryPolygon?: LatLng[] | null;
};

function highSiteMastHeight(site: LatLng & { name?: string }, options?: LosTopologyOptions) {
  const configured = options?.highSiteMastHeights?.[highSiteKey(site)];
  const value = typeof configured === "number" && Number.isFinite(configured) ? configured : HIGH_SITE_ANTENNA_HEIGHT_M;
  return Math.max(value, HIGH_SITE_ANTENNA_HEIGHT_M); // Enforce 9m minimum
}

function carrierMastHeight(mast: Mast, options?: LosTopologyOptions) {
  const configured = options?.carrierMastHeights?.[mastKey(mast)];
  if (typeof configured === "number" && Number.isFinite(configured)) return configured;
  const fallback = options?.carrierMastHeight;
  return typeof fallback === "number" && Number.isFinite(fallback) ? fallback : CARRIER_MAST_HEIGHT_M;
}

function facilityAntennaHeight(facility: Facility, options?: LosTopologyOptions) {
  const configured = options?.facilityHeights?.[facilityKey(facility)];
  const value = typeof configured === "number" && Number.isFinite(configured) ? configured : FACILITY_ANTENNA_HEIGHT_M;
  return Math.max(value, FACILITY_ANTENNA_HEIGHT_M); // Enforce 5m minimum
}

function facilityClusterAntennaHeight(cluster: FacilityCluster, options?: LosTopologyOptions) {
  if (!cluster.facilities.length) return FACILITY_ANTENNA_HEIGHT_M;
  return Math.max(...cluster.facilities.map(facility => facilityAntennaHeight(facility, options)));
}

function linkWithLos(from: LatLng & { name?: string }, to: LatLng & { name?: string }, type: LinkType, los: LineOfSightResult, label: string): BackboneLink {
  const distKm = haversine(from.lat, from.lng, to.lat, to.lng);
  return {
    from,
    to,
    type,
    distKm,
    live: losUsable(los),
    label,
    losStatus: los.losStatus,
    worstClearance: los.worstClearance,
    elevationProfile: los.elevationProfile,
  };
}

export type FacilityCluster = LatLng & {
  id: string;
  name: string;
  type: FacilityTypeKey;
  facilities: Facility[];
};

export function clusterFacilities(facilities: Facility[], clusterRadiusKm = 0.3): FacilityCluster[] {
  const validFacilities = facilities.filter(isValidLatLng);
  const unassigned = new Set(validFacilities.map(facility => facility.id));
  const clusters: FacilityCluster[] = [];

  validFacilities.forEach(seed => {
    if (!unassigned.has(seed.id)) return;
    const members: Facility[] = [];
    const queue = [seed];
    unassigned.delete(seed.id);

    while (queue.length) {
      const current = queue.shift();
      if (!current) continue;
      members.push(current);
      validFacilities.forEach(candidate => {
        if (!unassigned.has(candidate.id)) return;
        const nearExistingMember = members.some(member => haversine(member.lat, member.lng, candidate.lat, candidate.lng) <= clusterRadiusKm);
        const nearCurrent = haversine(current.lat, current.lng, candidate.lat, candidate.lng) <= clusterRadiusKm;
        if (nearExistingMember || nearCurrent) {
          unassigned.delete(candidate.id);
          queue.push(candidate);
        }
      });
    }

    const lat = members.reduce((sum, facility) => sum + facility.lat, 0) / members.length;
    const lng = members.reduce((sum, facility) => sum + facility.lng, 0) / members.length;
    const typeCounts = members.reduce((counts, facility) => {
      counts[facility.type] = (counts[facility.type] || 0) + 1;
      return counts;
    }, {} as Partial<Record<FacilityTypeKey, number>>);
    const type = (Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "other") as FacilityTypeKey;
    const named = members.filter(facility => !/^Facility \d+$/.test(facility.name));
    const primaryName = named[0]?.name || members[0]?.name || `Facility cluster ${clusters.length + 1}`;
    const name = members.length > 1 ? `${primaryName} cluster (${members.length} sites)` : primaryName;

    clusters.push({ id: `cluster-${clusters.length + 1}`, lat, lng, name, type, facilities: members });
  });

  return clusters.filter(isValidLatLng);
}

function rankedHighSiteCandidates(point: LatLng, coreSites: HighSite[], limit: number): HighSite[] {
  return coreSites
    .slice()
    .sort((a, b) => {
      const distA = haversine(point.lat, point.lng, a.lat, a.lng);
      const distB = haversine(point.lat, point.lng, b.lat, b.lng);
      const elevA = a.elevation ?? 0;
      const elevB = b.elevation ?? 0;
      return distA - distB || elevB - elevA;
    })
    .slice(0, limit);
}

function rankedMastCandidates(site: HighSite, masts: Mast[], limit: number): Mast[] {
  const preferred = masts.filter(mast => mast.provider !== "unknown");
  const source = preferred.length ? preferred : masts;
  return source
    .slice()
    .sort((a, b) => {
      const providerA = a.provider === "unknown" ? 1 : 0;
      const providerB = b.provider === "unknown" ? 1 : 0;
      const distA = haversine(site.lat, site.lng, a.lat, a.lng);
      const distB = haversine(site.lat, site.lng, b.lat, b.lng);
      return providerA - providerB || distA - distB;
    })
    .slice(0, limit);
}

function chooseBestLosCandidate<T extends { los: LineOfSightResult; distKm: number }>(candidates: T[]): T | null {
  if (!candidates.length) return null;
  const usable = candidates.filter(candidate => losUsable(candidate.los));
  const source = usable.length ? usable : candidates;
  return source
    .slice()
    .sort((a, b) => losPreference(a.los) - losPreference(b.los) || b.los.worstClearance - a.los.worstClearance || a.distKm - b.distKm)[0];
}

export function getCoreHighSites(highSites: HighSite[], limit = 5): HighSite[] {
  const seen = new Set<string>();
  const ranked = highSites
    .filter(site => {
      if (!isValidLatLng(site)) return false;
      const key = `${site.lat.toFixed(5)}:${site.lng.toFixed(5)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice()
    .sort((a, b) => (b.elevation ?? -Infinity) - (a.elevation ?? -Infinity) || a.distToCentre - b.distToCentre);
  const inside = ranked.filter(site => site.category === "inside");
  const nearby = ranked.filter(site => site.category === "nearby");
  const remote = ranked.filter(site => site.category === "remote");
  const selected: HighSite[] = [];
  inside.forEach(site => pushSpacedCandidate(selected, site, 0.35, limit));
  if (selected.length < 2) nearby.forEach(site => pushSpacedCandidate(selected, site, 0.35, limit));
  if (selected.length < 2) remote.forEach(site => pushSpacedCandidate(selected, site, 0.35, limit));
  if (selected.length < limit) inside.forEach(site => pushSpacedCandidate(selected, site, 0, limit));
  return selected.slice(0, limit);
}


const GATEWAY_BOUNDARY_EDGE_KM = 3;

function sameHighSite(a: LatLng & { name?: string }, b: LatLng & { name?: string }) {
  return highSiteKey(a) === highSiteKey(b);
}

function pointToSegmentDistanceKm(point: LatLng, start: LatLng, end: LatLng) {
  const latScale = 111.32;
  const lngScale = 111.32 * Math.cos(((point.lat + start.lat + end.lat) / 3) * Math.PI / 180);
  const px = point.lng * lngScale;
  const py = point.lat * latScale;
  const ax = start.lng * lngScale;
  const ay = start.lat * latScale;
  const bx = end.lng * lngScale;
  const by = end.lat * latScale;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (!lenSq) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function distanceToBoundaryKm(point: LatLng, boundaryPolygon?: LatLng[] | null) {
  const polygon = (boundaryPolygon || []).filter(isValidLatLng);
  if (polygon.length < 2) return Infinity;
  let best = Infinity;
  for (let i = 0; i < polygon.length; i += 1) {
    const start = polygon[i];
    const end = polygon[(i + 1) % polygon.length];
    best = Math.min(best, pointToSegmentDistanceKm(point, start, end));
  }
  return best;
}

function rankedGatewayHighSiteCandidates(point: LatLng, coreSites: HighSite[], boundaryPolygon: LatLng[] | null | undefined, limit: number): HighSite[] {
  return coreSites
    .slice()
    .sort((a, b) => {
      const boundaryA = distanceToBoundaryKm(a, boundaryPolygon);
      const boundaryB = distanceToBoundaryKm(b, boundaryPolygon);
      const nearA = boundaryA <= GATEWAY_BOUNDARY_EDGE_KM ? 0 : 1;
      const nearB = boundaryB <= GATEWAY_BOUNDARY_EDGE_KM ? 0 : 1;
      const distA = haversine(point.lat, point.lng, a.lat, a.lng);
      const distB = haversine(point.lat, point.lng, b.lat, b.lng);
      return nearA - nearB || distA - distB || (boundaryA - boundaryB) || ((b.elevation ?? 0) - (a.elevation ?? 0));
    })
    .slice(0, limit);
}

function chooseCarrierGatewayCandidate<T extends { site: HighSite; los: LineOfSightResult; distKm: number; boundaryDistKm: number }>(candidates: T[]): T | null {
  if (!candidates.length) return null;
  const usable = candidates.filter(candidate => losUsable(candidate.los));
  const source = usable.length ? usable : candidates;
  const nearBoundary = source.filter(candidate => candidate.boundaryDistKm <= GATEWAY_BOUNDARY_EDGE_KM);
  const ranked = nearBoundary.length ? nearBoundary : source;
  return ranked
    .slice()
    .sort((a, b) => {
      if (usable.length) return a.distKm - b.distKm || losPreference(a.los) - losPreference(b.los) || b.los.worstClearance - a.los.worstClearance;
      return losPreference(a.los) - losPreference(b.los) || a.distKm - b.distKm || b.los.worstClearance - a.los.worstClearance;
    })[0];
}

function nearestHighSite(point: LatLng, sites: HighSite[]) {
  let nearest: HighSite | null = null;
  let nearestDist = Infinity;
  sites.forEach(site => {
    const dist = haversine(point.lat, point.lng, site.lat, site.lng);
    if (dist < nearestDist) {
      nearest = site;
      nearestDist = dist;
    }
  });
  return { nearest, nearestDist };
}

export function buildNetworkLinks(highSites: HighSite[], facilities: Facility[], masts: Mast[]): BackboneLink[] {
  const coreSites = getCoreHighSites(highSites, 5);
  const VIABLE_DISTRIBUTION_KM = 8;
  const links: BackboneLink[] = [];

  if (coreSites.length > 1) {
    const remaining = coreSites.slice(1);
    const visited = [coreSites[0]];
    while (remaining.length) {
      let bestFrom = visited[0];
      let bestIdx = 0;
      let bestDist = Infinity;
      visited.forEach(from => {
        remaining.forEach((candidate, idx) => {
          const dist = haversine(from.lat, from.lng, candidate.lat, candidate.lng);
          if (dist < bestDist) {
            bestFrom = from;
            bestIdx = idx;
            bestDist = dist;
          }
        });
      });
      const next = remaining.splice(bestIdx, 1)[0];
      visited.push(next);
      links.push({ from: bestFrom, to: next, type: "backbone", distKm: bestDist, live: true, label: bestDist > 15 ? "High-site backbone · LOS pending" : "High-site backbone", losStatus: "unknown" });
    }
  }

  facilities.forEach(facility => {
    const { nearest, nearestDist } = nearestHighSite(facility, coreSites);
    if (!nearest) return;
    links.push({ from: facility, to: nearest, type: nearestDist > VIABLE_DISTRIBUTION_KM ? "relay" : "distribution", distKm: nearestDist, live: true, label: nearestDist > VIABLE_DISTRIBUTION_KM ? "Facility relay path · LOS pending" : "Facility distribution · LOS pending", losStatus: "unknown" });
  });

  const knownMasts = masts.filter(mast => mast.provider !== "unknown");
  const mastSource = knownMasts.length ? knownMasts : masts;
  mastSource.forEach(mast => {
    const { nearest, nearestDist } = nearestHighSite(mast, coreSites);
    if (!nearest) return;
    const providerName = mastProviderLabel(mast.provider);
    links.push({ from: nearest, to: mast, type: "uplink", distKm: nearestDist, live: true, label: `${providerName} gateway uplink · LOS pending`, losStatus: "unknown" });
  });

  return links;
}

export async function buildLosTopology(highSites: HighSite[], facilities: Facility[], masts: Mast[], options: LosTopologyOptions = {}): Promise<BackboneLink[]> {
  const coreSites = getCoreHighSites(highSites, 7);
  const facilityClusters = clusterFacilities(facilities, 0.3);
  const links: BackboneLink[] = [];
  const VIABLE_DISTRIBUTION_KM = 8;
  const boundaryPolygon = options.boundaryPolygon ?? null;

  if (!coreSites.length) return links;

  // === CARRIER MAST UPLINKS: ONE link per mast to nearest gateway HP with confirmed LOS ===
  const usableMasts = (masts.filter(mast => mast.provider !== "unknown").length ? masts.filter(mast => mast.provider !== "unknown") : masts).filter(mast => mast.visible !== false && isValidLatLng(mast));

  // For each mast, find the nearest high point with confirmed LOS
  const mastPairs = usableMasts.flatMap(mast => coreSites.map(site => ({
    site,
    mast,
    distKm: haversine(site.lat, site.lng, mast.lat, mast.lng),
    boundaryDistKm: distanceToBoundaryKm(site, boundaryPolygon),
  })));
  const mastEvaluations = await mapWithConcurrency(mastPairs, LOS_CONCURRENCY, async pair => {
    try {
      const los = await checkLineOfSight(pair.site, pair.mast, highSiteMastHeight(pair.site, options), carrierMastHeight(pair.mast, options));
      return { ...pair, los };
    } catch (error) {
      return { ...pair, los: failedLineOfSight(pair.site, pair.mast, error, highSiteMastHeight(pair.site, options), carrierMastHeight(pair.mast, options)) };
    }
  });

  // ONE uplink per mast: nearest gateway HP with confirmed LOS
  usableMasts.forEach(mast => {
    const candidates = mastEvaluations.filter(e => mastKey(e.mast) === mastKey(mast));
    const best = chooseCarrierGatewayCandidate(candidates);
    if (!best) return;
    const providerName = mastProviderLabel(mast.provider);
    const statusLabel = best.los.losStatus === "confirmed" ? "confirmed" : best.los.losStatus === "marginal" ? "marginal" : "blocked";
    links.push(linkWithLos(best.site, mast, "uplink", best.los, `${providerName} uplink · ${statusLabel} · ${formatKm(best.distKm)}`));
  });

  // === FACILITY DISTRIBUTION: ONE link per facility cluster to nearest HP with confirmed LOS ===
  const facilityPairs = facilityClusters.flatMap(cluster => coreSites.map(site => ({
    cluster,
    site,
    distKm: haversine(cluster.lat, cluster.lng, site.lat, site.lng),
  })));
  const facilityEvaluations = await mapWithConcurrency(facilityPairs, LOS_CONCURRENCY, async pair => {
    try {
      const los = await checkLineOfSight(pair.cluster, pair.site, facilityClusterAntennaHeight(pair.cluster, options), highSiteMastHeight(pair.site, options));
      return { ...pair, los };
    } catch (error) {
      return { ...pair, los: failedLineOfSight(pair.cluster, pair.site, error, facilityClusterAntennaHeight(pair.cluster, options), highSiteMastHeight(pair.site, options)) };
    }
  });

  // ONE link per facility cluster: nearest HP with confirmed LOS, then marginal, then blocked
  facilityClusters.forEach(cluster => {
    const candidates = facilityEvaluations.filter(e => e.cluster.id === cluster.id);
    // Prefer confirmed, then marginal, then blocked — within each tier, prefer shortest distance
    const sorted = candidates.slice().sort((a, b) => losPreference(a.los) - losPreference(b.los) || a.distKm - b.distKm);
    const best = sorted[0];
    if (!best) return;
    // Only draw if confirmed or marginal; mark blocked as unreachable (no link)
    if (!losUsable(best.los)) return;
    const type: LinkType = best.distKm > VIABLE_DISTRIBUTION_KM ? "relay" : "distribution";
    links.push(linkWithLos(best.cluster, best.site, type, best.los, `${best.cluster.name} · ${formatKm(best.distKm)}`));
  });

  // === BACKBONE: MST chain connecting adjacent high points ===
  if (coreSites.length > 1) {
    // Build minimum spanning tree using Prim's algorithm (nearest-neighbour chain)
    const remaining = coreSites.slice(1);
    const visited = [coreSites[0]];
    const backbonePairsForLos: { from: HighSite; to: HighSite; distKm: number }[] = [];

    while (remaining.length) {
      let bestFrom = visited[0];
      let bestIdx = 0;
      let bestDist = Infinity;
      visited.forEach(from => {
        remaining.forEach((candidate, idx) => {
          const dist = haversine(from.lat, from.lng, candidate.lat, candidate.lng);
          if (dist < bestDist) {
            bestFrom = from;
            bestIdx = idx;
            bestDist = dist;
          }
        });
      });
      const next = remaining.splice(bestIdx, 1)[0];
      visited.push(next);
      backbonePairsForLos.push({ from: bestFrom, to: next, distKm: bestDist });
    }

    const backboneEvaluations = await mapWithConcurrency(backbonePairsForLos, LOS_CONCURRENCY, async edge => {
      try {
        const los = await checkLineOfSight(edge.from, edge.to, highSiteMastHeight(edge.from, options), highSiteMastHeight(edge.to, options));
        return { ...edge, los };
      } catch (error) {
        return { ...edge, los: failedLineOfSight(edge.from, edge.to, error, highSiteMastHeight(edge.from, options), highSiteMastHeight(edge.to, options)) };
      }
    });
    backboneEvaluations.forEach(edge => {
      const statusLabel = edge.los.losStatus === "confirmed" ? "confirmed" : edge.los.losStatus === "marginal" ? "marginal" : "blocked";
      links.push(linkWithLos(edge.from, edge.to, "backbone", edge.los, `Backbone · ${statusLabel} · ${formatKm(edge.distKm)}`));
    });
  }

  return links;
}

export function buildBackbone(selectedMast: Mast | null, highSites: HighSite[]): BackboneLink[] {
  const mastList = selectedMast ? [selectedMast] : [];
  return buildNetworkLinks(highSites, [], mastList);
}

export function formatKm(value: number) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(value >= 10 ? 1 : 2)} km`;
}

export function makeManualHighSite(point: LatLng, boundaryPolygon: LatLng[] | null, propertyCentre: LatLng, index: number): HighSite {
  const inside = boundaryPolygon && boundaryPolygon.length >= 3 ? pointInPolygon(point, boundaryPolygon) : false;
  const distToCentre = haversine(propertyCentre.lat, propertyCentre.lng, point.lat, point.lng);
  const category: HighSite["category"] = inside ? "inside" : distToCentre < 5 ? "nearby" : "remote";
  return { ...point, name: `Manual Relay ${index}`, elevation: null, source: "manual", inside, distToCentre, category };
}

export function makeRelay(point: LatLng, height: number, index: number): Relay {
  return { ...point, name: `Relay ${index}`, height, source: "manual" };
}

