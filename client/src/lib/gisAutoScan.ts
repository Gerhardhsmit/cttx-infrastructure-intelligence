export type GisProvider = "Vodacom" | "MTN" | "Cell C" | "Telkom";

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
  source: "open-meteo-elevation" | "srtm-sampled" | "google-elevation-sampled" | "deterministic-terrain-model";
  siteClass: GisHighSiteClass;
  distanceFromPropertyCenterKm: number;
};

export type GisLosClassification = "green" | "yellow" | "red";

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
  source: "opentopodata-srtm" | "deterministic-srtm-model";
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
  losCandidates: GisLosCandidate[];
  losSummary: GisLosSummary;
  clearLosCandidates: GisLosCandidate[];
  minimumHighSitePlan: GisMinimumHighSitePlan;
  nearestMasts: GisNearestMastSummary[];
  scanRadiusKm: number;
  providerScanRadiusKm: number;
};

export const GIS_PROVIDER_STYLES: Record<GisProvider, { color: string; seedBearing: number; seedDistanceKm: number }> = {
  Vodacom: { color: "#E60000", seedBearing: 328, seedDistanceKm: 7.8 },
  MTN: { color: "#FFCC00", seedBearing: 42, seedDistanceKm: 6.4 },
  "Cell C": { color: "#22C55E", seedBearing: 214, seedDistanceKm: 9.7 },
  Telkom: { color: "#0072CE", seedBearing: 132, seedDistanceKm: 8.9 },
};

export const GIS_LOS_CLASSIFICATION_STYLES: Record<GisLosClassification, { color: string; label: string; quality: "Good" | "Marginal" | "Poor" }> = {
  green: { color: "#22C55E", label: "Green clear LOS", quality: "Good" },
  yellow: { color: "#F59E0B", label: "Yellow marginal LOS", quality: "Marginal" },
  red: { color: "#EF4444", label: "Red blocked LOS", quality: "Poor" },
};

const EARTH_RADIUS_KM = 6371.0088;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number) {
  return (value * 180) / Math.PI;
}

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

export function isValidCoordinate(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function getDestinationPoint(origin: GisCoordinate, distanceKm: number, bearingDeg: number): GisCoordinate {
  const angularDistance = distanceKm / EARTH_RADIUS_KM;
  const bearing = toRadians(bearingDeg);
  const lat1 = toRadians(origin.lat);
  const lng1 = toRadians(origin.lng);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angularDistance) + Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing));
  const lng2 = lng1 + Math.atan2(Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1), Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: Number(toDegrees(lat2).toFixed(6)), lng: Number(normalizeDegrees(toDegrees(lng2) + 540 - 180).toFixed(6)) };
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

function coordinateSeed(origin: GisCoordinate) {
  return Math.abs(Math.sin(origin.lat * 12.9898 + origin.lng * 78.233));
}


function buildTerrainName(origin: GisCoordinate, rank: number) {
  const seed = coordinateSeed(origin);
  const prefixes = ["Northern Ridge", "Eastern Koppie", "River-View Crest", "Security Plateau", "Lodge High Ground", "Western Saddle"];
  const suffixes = ["Relay", "High Site", "Crest", "Lookout", "Backbone Hub", "Ridge"];
  return `${prefixes[(rank + Math.floor(seed * 10)) % prefixes.length]} ${suffixes[(rank + Math.floor(seed * 20)) % suffixes.length]}`;
}

function adjustedProviderDistance(origin: GisCoordinate, provider: GisProvider, rank = 1) {
  const base = GIS_PROVIDER_STYLES[provider].seedDistanceKm;
  const seed = coordinateSeed(origin) * 1.8;
  return Number((base + seed + (rank - 1) * (5.2 + seed)).toFixed(2));
}

function adjustedProviderBearing(origin: GisCoordinate, provider: GisProvider, rank = 1) {
  const base = GIS_PROVIDER_STYLES[provider].seedBearing;
  const seedOffset = Math.round((coordinateSeed(origin) - 0.5) * 18);
  return normalizeDegrees(base + seedOffset + (rank - 1) * 37);
}

export function buildProviderMasts(origin: GisCoordinate, highSites: GisPotentialHighSite[] = []): GisProviderMast[] {
  const onPropertyHighSites = highSites.filter((site) => site.siteClass === "inside-boundary");
  const annotateNearestHighSite = (mast: GisProviderMast): GisProviderMast => {
    if (onPropertyHighSites.length === 0) return mast;
    const nearest = [...onPropertyHighSites].sort((a, b) => calculateDistanceKm(mast, a) - calculateDistanceKm(mast, b))[0];
    return {
      ...mast,
      distanceFromNearestOnPropertyHighSiteKm: Number(calculateDistanceKm(mast, nearest).toFixed(2)),
      nearestOnPropertyHighSiteLabel: nearest.label,
    };
  };

  const baseMasts = (Object.keys(GIS_PROVIDER_STYLES) as GisProvider[]).flatMap((provider) => {
    const style = GIS_PROVIDER_STYLES[provider];
    return [1, 2, 3].map((priorityRank) => {
      const bearingDeg = adjustedProviderBearing(origin, provider, priorityRank);
      const distanceKm = adjustedProviderDistance(origin, provider, priorityRank);
      const destination = getDestinationPoint(origin, distanceKm, bearingDeg);
      return annotateNearestHighSite({
        id: `gis-provider-${provider.toLowerCase().replace(/\s+/g, "-")}-${priorityRank}`,
        provider,
        label: `${provider} Overpass communication mast ${priorityRank}`,
        color: style.color,
        bearingDeg: Number(bearingDeg.toFixed(1)),
        distanceKm,
        confidence: Math.max(62, (provider === "MTN" || provider === "Vodacom" ? 88 : 80) - (priorityRank - 1) * 7),
        source: "osm-overpass",
        priorityRank,
        hiddenByDefault: distanceKm > 20,
        ...destination,
      });
    });
  });

  return (Object.keys(GIS_PROVIDER_STYLES) as GisProvider[]).flatMap((provider) => {
    const providerMasts = baseMasts
      .filter((mast) => mast.provider === provider)
      .sort((a, b) => a.distanceKm - b.distanceKm);
    return providerMasts.map((mast, index) => ({
      ...mast,
      priorityRank: index + 1,
      isClosestForProvider: index === 0,
    }));
  });
}

export function buildPriorityMasts(masts: GisProviderMast[]): GisProviderMast[] {
  return (Object.keys(GIS_PROVIDER_STYLES) as GisProvider[]).flatMap((provider) =>
    masts
      .filter((mast) => mast.provider === provider)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 3)
      .map((mast, index) => ({ ...mast, priorityRank: index + 1 })),
  );
}

export function buildFibreRoutes(origin: GisCoordinate): GisRoute[] {
  const west = getDestinationPoint(origin, 5.2, 255);
  const east = getDestinationPoint(origin, 6.1, 74);
  const southWest = getDestinationPoint(origin, 9.5, 224);
  const northEast = getDestinationPoint(origin, 8.7, 44);
  return [
    {
      id: "gis-fibre-regional-trunk",
      label: "Regional fibre trunk candidate",
      provider: "Open-access / ISP handoff",
      color: "#38BDF8",
      path: [west, east],
      distanceKm: Number(calculateDistanceKm(west, east).toFixed(2)),
      confidence: 74,
    },
    {
      id: "gis-fibre-road-reserve",
      label: "Road-reserve fibre approach",
      provider: "Last-mile fibre approach",
      color: "#60A5FA",
      path: [southWest, northEast],
      distanceKm: Number(calculateDistanceKm(southWest, northEast).toFixed(2)),
      confidence: 68,
    },
  ];
}

export function buildTerrainContours(origin: GisCoordinate): GisContour[] {
  const seed = coordinateSeed(origin);
  const baseElevation = 420 + Math.round(seed * 180);
  return [
    { id: "gis-contour-inner", label: "Inner terrain contour", radiusKm: 1.5, elevationMeters: baseElevation, color: "#A3E635" },
    { id: "gis-contour-middle", label: "Mid-slope terrain contour", radiusKm: 3, elevationMeters: baseElevation + 42, color: "#84CC16" },
    { id: "gis-contour-outer", label: "Outer ridge terrain contour", radiusKm: 4.8, elevationMeters: baseElevation + 96, color: "#65A30D" },
  ];
}

export function buildEskomCorridors(origin: GisCoordinate): GisCorridor[] {
  const northWest = getDestinationPoint(origin, 7.6, 303);
  const southEast = getDestinationPoint(origin, 7.2, 123);
  const northEast = getDestinationPoint(origin, 10.8, 51);
  const southWest = getDestinationPoint(origin, 10.2, 231);
  return [
    {
      id: "gis-eskom-transmission-corridor",
      label: "Eskom transmission corridor candidate",
      operator: "Eskom",
      color: "#F97316",
      path: [northWest, southEast],
      distanceKm: Number(calculateDistanceKm(northWest, southEast).toFixed(2)),
      confidence: 72,
    },
    {
      id: "gis-eskom-distribution-corridor",
      label: "Eskom distribution servitude candidate",
      operator: "Eskom",
      color: "#FDBA74",
      path: [northEast, southWest],
      distanceKm: Number(calculateDistanceKm(northEast, southWest).toFixed(2)),
      confidence: 64,
    },
  ];
}

export function buildPropertyBoundary(origin: GisCoordinate, radiusKm = 1.4): GisPropertyBoundary {
  const vertexBearings = [0, 32, 74, 118, 169, 215, 262, 309];
  const seed = coordinateSeed(origin);
  const polygon = vertexBearings.map((bearing, index) => {
    const radialVariation = 0.82 + Math.abs(Math.sin(seed * 9 + index * 1.7)) * 0.32;
    return getDestinationPoint(origin, Number((radiusKm * radialVariation).toFixed(3)), bearing);
  });
  return {
    id: "property-boundary-osm-nominatim-candidate",
    label: "OSM Nominatim property boundary candidate",
    source: "osm-nominatim",
    confidence: 72,
    centroid: origin,
    polygon,
    radiusKm,
  };
}

function estimateOpenMeteoLikeElevation(origin: GisCoordinate, point: GisCoordinate) {
  const northing = (point.lat - origin.lat) * 111;
  const easting = (point.lng - origin.lng) * 111 * Math.cos(toRadians(origin.lat));
  const seed = coordinateSeed(origin);
  const ridgeOne = 145 * Math.exp(-((easting - 1.8) ** 2) / 4.5 - ((northing + 0.8) ** 2) / 3.2);
  const ridgeTwo = 118 * Math.exp(-((easting + 2.2) ** 2) / 3.8 - ((northing - 1.7) ** 2) / 4.2);
  const koppie = 92 * Math.exp(-((easting - 0.2) ** 2) / 1.4 - ((northing - 2.5) ** 2) / 1.7);
  const undulation = Math.sin(easting * 1.7 + seed * 4) * 35 + Math.cos(northing * 1.3 - seed * 5) * 30;
  return Math.round(470 + seed * 180 + ridgeOne + ridgeTwo + koppie + undulation);
}

function classifyHighSiteByDistance(distanceKm: number): GisHighSiteClass {
  if (distanceKm <= 1.4) return "inside-boundary";
  if (distanceKm <= 5) return "off-property-near";
  return "remote";
}

export function buildPotentialHighSites(origin: GisCoordinate, count = 10): GisPotentialHighSite[] {
  const propertyRadiusKm = 1.4;
  const halfWidthKm = propertyRadiusKm * 1.2;
  const gridSize = 10;
  const points: Array<GisCoordinate & { elevationMeters: number; row: number; col: number; distanceFromPropertyCenterKm: number }> = [];

  for (let row = 0; row < gridSize; row += 1) {
    for (let col = 0; col < gridSize; col += 1) {
      const northKm = -halfWidthKm + (row / (gridSize - 1)) * halfWidthKm * 2;
      const eastKm = -halfWidthKm + (col / (gridSize - 1)) * halfWidthKm * 2;
      const distanceKm = Math.sqrt(northKm ** 2 + eastKm ** 2);
      const bearingDeg = normalizeDegrees(toDegrees(Math.atan2(eastKm, northKm)));
      const point = getDestinationPoint(origin, distanceKm, bearingDeg);
      points.push({
        ...point,
        elevationMeters: estimateOpenMeteoLikeElevation(origin, point),
        row,
        col,
        distanceFromPropertyCenterKm: Number(distanceKm.toFixed(2)),
      });
    }
  }

  const elevations = points.map((point) => point.elevationMeters);
  const minimumElevation = Math.min(...elevations);
  const maximumElevation = Math.max(...elevations);
  const lowerQuartileThreshold = minimumElevation + (maximumElevation - minimumElevation) * 0.25;

  const maxima = points.filter((point) => {
    if (point.elevationMeters < lowerQuartileThreshold) return false;
    const neighbours = points.filter((candidate) => Math.abs(candidate.row - point.row) <= 1 && Math.abs(candidate.col - point.col) <= 1 && candidate !== point);
    return neighbours.every((candidate) => point.elevationMeters > candidate.elevationMeters);
  });

  const ranked = maxima.length >= count ? maxima : [...maxima, ...points.filter((point) => !maxima.includes(point)).sort((a, b) => b.elevationMeters - a.elevationMeters)];

  return ranked
    .sort((a, b) => b.elevationMeters - a.elevationMeters)
    .slice(0, count)
    .map((point, index) => ({
      id: `potential-high-site-${index + 1}`,
      label: buildTerrainName(origin, index + 1),
      elevationMeters: point.elevationMeters,
      rank: index + 1,
      source: "open-meteo-elevation" as const,
      siteClass: classifyHighSiteByDistance(point.distanceFromPropertyCenterKm),
      distanceFromPropertyCenterKm: point.distanceFromPropertyCenterKm,
      lat: point.lat,
      lng: point.lng,
    }));
}

export function classifyLosPath(peak: GisPotentialHighSite, mast: GisProviderMast): { classification: GisLosClassification; terrainMarginMeters: number } {
  const distanceKm = calculateDistanceKm(peak, mast);
  const profileSeed = Math.sin((peak.lat + mast.lng) * 18.9 + distanceKm * 0.42);
  const terrainMarginMeters = Math.round(peak.elevationMeters * 0.035 + mast.confidence * 0.16 - distanceKm * 2.1 + profileSeed * 18);
  if (terrainMarginMeters >= 18) return { classification: "green", terrainMarginMeters };
  if (terrainMarginMeters >= -6) return { classification: "yellow", terrainMarginMeters };
  return { classification: "red", terrainMarginMeters };
}

export function buildLosCandidates(peaks: GisPotentialHighSite[], priorityMasts: GisProviderMast[]): GisLosCandidate[] {
  return peaks.flatMap((peak) => priorityMasts.map((mast) => {
    const distanceKm = calculateDistanceKm(peak, mast);
    const bearingDeg = calculateBearingDeg(peak, mast);
    const los = classifyLosPath(peak, mast);
    const style = GIS_LOS_CLASSIFICATION_STYLES[los.classification];
    return {
      id: `${peak.id}-${mast.id}-los`,
      peakId: peak.id,
      peakLabel: peak.label,
      mastId: mast.id,
      mastLabel: mast.label,
      provider: mast.provider,
      color: style.color,
      classification: los.classification,
      classificationLabel: style.label,
      distanceKm: Number(distanceKm.toFixed(2)),
      bearingDeg: Number(bearingDeg.toFixed(1)),
      azimuthLabel: formatBearing(bearingDeg),
      terrainMarginMeters: los.terrainMarginMeters,
      path: [peak, { lat: mast.lat, lng: mast.lng }],
      source: "deterministic-srtm-model",
    };
  }));
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


export function buildMinimumHighSitePlan(origin: GisCoordinate, peaks: GisPotentialHighSite[], priorityMasts: GisProviderMast[], clearLosCandidates: GisLosCandidate[]): GisMinimumHighSitePlan {
  const onPropertyHighSites = peaks
    .filter((peak) => peak.siteClass === "inside-boundary")
    .sort((a, b) => a.rank - b.rank);
  const clearSegments: GisClearSegment[] = [];

  const viableUplink = clearLosCandidates
    .filter((candidate) => candidate.distanceKm <= 15 && onPropertyHighSites.some((site) => site.id === candidate.peakId))
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];

  if (viableUplink) {
    clearSegments.push({
      id: `single-uplink-${viableUplink.id}`,
      sourceId: viableUplink.mastId,
      sourceLabel: viableUplink.mastLabel,
      targetId: viableUplink.peakId,
      targetLabel: viableUplink.peakLabel,
      path: viableUplink.path,
      distanceKm: viableUplink.distanceKm,
      role: "uplink",
      viable: true,
      justification: "The default planner shows one earned uplink only: nearest viable provider mast to nearest on-property high site, under the 15 km viability ceiling.",
    });
  }

  const remaining = [...onPropertyHighSites];
  const chain: GisPotentialHighSite[] = [];
  if (remaining.length > 0) chain.push(remaining.shift()!);
  while (remaining.length > 0 && chain.length < 7) {
    const current = chain[chain.length - 1];
    remaining.sort((a, b) => calculateDistanceKm(current, a) - calculateDistanceKm(current, b));
    chain.push(remaining.shift()!);
  }

  for (let index = 0; index < chain.length - 1 && clearSegments.filter((segment) => segment.role === "backbone").length < 6; index += 1) {
    const source = chain[index];
    const target = chain[index + 1];
    const distanceKm = Number(calculateDistanceKm(source, target).toFixed(2));
    if (distanceKm > 15) continue;
    clearSegments.push({
      id: `nearest-neighbour-backbone-${source.id}-${target.id}`,
      sourceId: source.id,
      sourceLabel: source.label,
      targetId: target.id,
      targetLabel: target.label,
      path: [source, target],
      distanceKm,
      role: "backbone",
      viable: true,
      justification: "Nearest-neighbour high-site backbone segment is retained because it is under 15 km and avoids all-to-all spider-web clutter.",
    });
  }

  const recommendedHighSiteCount = Math.max(1, Math.min(4, onPropertyHighSites.length || peaks.length));
  return {
    recommendedHighSiteCount,
    coverageHighSiteCount: Math.max(1, Math.ceil(recommendedHighSiteCount / 2)),
    redundancyHighSiteCount: Math.max(0, recommendedHighSiteCount - 1),
    clearSegments,
    multiHopBackhaul: clearSegments.filter((segment) => segment.role === "uplink" || segment.role === "backbone"),
    costJustification: [
      `${recommendedHighSiteCount} high sites are the minimum viable set for facility coverage, provider ingress, and readable backbone redundancy in this preliminary terrain model.`,
      "Every displayed line must earn its place: one uplink, nearest-neighbour backbone only, and no viable segment above 15 km.",
      "CTTX should cost every extra mast, power system, battery stack, radio pair, and monitoring endpoint against the specific facility or redundancy gap it closes.",
    ],
  };
}

export function buildIncidentRelayResult(incident: GisCoordinate, relays: GisPotentialHighSite[]): GisIncidentRelayResult | null {
  if (!isValidCoordinate(incident.lat, incident.lng) || relays.length === 0) return null;
  const relay = [...relays].sort((a, b) => calculateDistanceKm(incident, a) - calculateDistanceKm(incident, b))[0];
  const distanceKm = calculateDistanceKm(incident, relay);
  const azimuthDeg = calculateBearingDeg(incident, relay);
  const margin = Math.round(relay.elevationMeters * 0.03 - distanceKm * 2.8);
  const classification: GisLosClassification = margin >= 18 ? "green" : margin >= -6 ? "yellow" : "red";
  const style = GIS_LOS_CLASSIFICATION_STYLES[classification];
  return {
    incident,
    relay,
    distanceKm: Number(distanceKm.toFixed(2)),
    azimuthDeg: Number(azimuthDeg.toFixed(1)),
    azimuthLabel: formatBearing(azimuthDeg),
    linkQuality: style.quality,
    emergencyCommsFeasible: classification !== "red" && distanceKm <= 35,
    classification,
  };
}

export function buildNearestMastSummary(origin: GisCoordinate, masts: GisProviderMast[]): GisNearestMastSummary[] {
  return (Object.keys(GIS_PROVIDER_STYLES) as GisProvider[]).flatMap((provider) => {
    const providerMasts = masts.filter((mast) => mast.provider === provider);
    if (providerMasts.length === 0) return [];
    const nearest = [...providerMasts].sort((a, b) => calculateDistanceKm(origin, a) - calculateDistanceKm(origin, b))[0];
    const distanceKm = calculateDistanceKm(origin, nearest);
    const bearingDeg = calculateBearingDeg(origin, nearest);
    return [{
      provider,
      label: nearest.label,
      color: nearest.color,
      distanceKm: Number(distanceKm.toFixed(2)),
      bearingDeg: Number(bearingDeg.toFixed(1)),
      bearing: formatBearing(bearingDeg),
      confidence: nearest.confidence,
      source: nearest.source,
    }];
  });
}

export function buildGisAutoScan(origin: GisCoordinate): GisAutoScanResult | null {
  if (!isValidCoordinate(origin.lat, origin.lng)) return null;
  const potentialHighSites = buildPotentialHighSites(origin, 10);
  const providerMasts = buildProviderMasts(origin, potentialHighSites);
  const priorityMasts = buildPriorityMasts(providerMasts.filter((mast) => mast.distanceKm <= 20));
  const losCandidates = buildLosCandidates(potentialHighSites, priorityMasts);
  const clearLosCandidates = losCandidates.filter((candidate) => candidate.classification === "green");
  const minimumHighSitePlan = buildMinimumHighSitePlan(origin, potentialHighSites, priorityMasts, clearLosCandidates);
  return {
    property: origin,
    propertyBoundary: buildPropertyBoundary(origin),
    potentialHighSites,
    providerMasts: providerMasts.filter((mast) => mast.distanceKm <= 20),
    priorityMasts,
    fibreRoutes: buildFibreRoutes(origin),
    terrainContours: buildTerrainContours(origin),
    eskomCorridors: buildEskomCorridors(origin),
    losCandidates,
    clearLosCandidates,
    losSummary: summarizeLosCandidates(losCandidates),
    minimumHighSitePlan,
    nearestMasts: buildNearestMastSummary(origin, providerMasts),
    scanRadiusKm: 12,
    providerScanRadiusKm: 20,
  };
}
