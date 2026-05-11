import { calculateBearingDeg, calculateDistanceKm, formatBearing, getDestinationPoint, type GisCoordinate } from "@/lib/gisAutoScan";

export type PlanningPinRole = "property" | "tower" | "pop" | "fibre" | "signal" | "operational";

export type PrecisionPlanningPin = GisCoordinate & {
  id: string;
  label: string;
  role: PlanningPinRole;
  color: string;
  elevationAslMeters: number;
  antennaHeightMeters: number;
  source?: string | null;
};

export type LosStatus = "clear" | "marginal" | "blocked";

export type LosProfileSample = GisCoordinate & {
  index: number;
  distanceKm: number;
  distancePercent: number;
  terrainAslMeters: number;
  signalAslMeters: number;
  fresnelRadiusMeters: number;
  fresnelRequiredAslMeters: number;
  clearanceMeters: number;
  obstruction: boolean;
};

export type LosTerrainProfile = {
  id: string;
  startPinId: string;
  endPinId: string;
  startLabel: string;
  endLabel: string;
  distanceKm: number;
  bearingDeg: number;
  bearing: string;
  frequencyGhz: number;
  fresnelZonePercent: number;
  status: LosStatus;
  statusColor: string;
  minClearanceMeters: number;
  highestObstructionMeters: number;
  samples: LosProfileSample[];
};

const STATUS_COLORS: Record<LosStatus, string> = {
  clear: "#22C55E",
  marginal: "#F59E0B",
  blocked: "#EF4444",
};

const DEFAULT_FREQUENCY_GHZ = 5.8;
const DEFAULT_FRESNEL_PERCENT = 60;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  const decimal = Number(normalized);
  return Number.isFinite(decimal) ? decimal : null;
}

export function parseCoordinateInput(value: string | number | null | undefined): number | null {
  const direct = toNumber(value);
  if (direct !== null) return direct;
  if (typeof value !== "string") return null;

  const normalized = value
    .trim()
    .replace(/[º]/g, "°")
    .replace(/[′’]/g, "'")
    .replace(/[″”]/g, "\"")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ");

  const hemisphereMatch = normalized.match(/[NSEW]/i);
  const hemisphere = (hemisphereMatch?.[0] || "").toUpperCase();
  const numericParts = normalized.match(/[+-]?\d+(?:\.\d+)?/g);
  if (!numericParts?.length) return null;

  const degrees = Number(numericParts[0]);
  const minutes = Number(numericParts[1] || 0);
  const seconds = Number(numericParts[2] || 0);
  if (![degrees, minutes, seconds].every(Number.isFinite)) return null;
  if (Math.abs(minutes) >= 60 || Math.abs(seconds) >= 60) return null;
  let result = Math.abs(degrees) + Math.abs(minutes) / 60 + Math.abs(seconds) / 3600;
  const isNegative = degrees < 0 || hemisphere === "S" || hemisphere === "W";
  if (isNegative) result *= -1;
  return Number(result.toFixed(6));
}

export function formatCoordinate(value: number) {
  return Number(value).toFixed(6);
}

export function estimateElevationAslMeters(point: GisCoordinate) {
  const latWave = Math.sin((point.lat + 34.1) * 17.31);
  const lngWave = Math.cos((point.lng - 26.2) * 13.17);
  const ridgeWave = Math.sin((point.lat * 0.72 + point.lng * 0.91) * 20.2);
  const valleyDip = Math.cos((point.lat - point.lng) * 7.4);
  const elevation = 540 + latWave * 92 + lngWave * 76 + ridgeWave * 58 - valleyDip * 24;
  return Math.round(clamp(elevation, 60, 1950));
}

export function buildPrecisionPlanningPin(input: Omit<PrecisionPlanningPin, "elevationAslMeters" | "antennaHeightMeters"> & { elevationAslMeters?: number | null; antennaHeightMeters?: number | null }): PrecisionPlanningPin {
  return {
    ...input,
    elevationAslMeters: Math.round(input.elevationAslMeters ?? estimateElevationAslMeters(input)),
    antennaHeightMeters: input.antennaHeightMeters ?? (input.role === "tower" || input.role === "pop" ? 30 : input.role === "property" ? 6 : 10),
  };
}

function interpolatePoint(start: GisCoordinate, end: GisCoordinate, fraction: number): GisCoordinate {
  return {
    lat: Number((start.lat + (end.lat - start.lat) * fraction).toFixed(6)),
    lng: Number((start.lng + (end.lng - start.lng) * fraction).toFixed(6)),
  };
}

function fresnelRadiusMeters(distanceAkm: number, distanceBkm: number, totalDistanceKm: number, frequencyGhz: number) {
  if (totalDistanceKm <= 0 || frequencyGhz <= 0) return 0;
  return 17.32 * Math.sqrt((distanceAkm * distanceBkm) / (frequencyGhz * totalDistanceKm));
}

export function buildLosTerrainProfile(start: PrecisionPlanningPin, end: PrecisionPlanningPin, options: { sampleCount?: number; frequencyGhz?: number; fresnelZonePercent?: number } = {}): LosTerrainProfile {
  const sampleCount = clamp(Math.round(options.sampleCount ?? 25), 5, 80);
  const frequencyGhz = options.frequencyGhz ?? DEFAULT_FREQUENCY_GHZ;
  const fresnelZonePercent = options.fresnelZonePercent ?? DEFAULT_FRESNEL_PERCENT;
  const distanceKm = calculateDistanceKm(start, end);
  const bearingDeg = calculateBearingDeg(start, end);
  const startRadioAsl = start.elevationAslMeters + start.antennaHeightMeters;
  const endRadioAsl = end.elevationAslMeters + end.antennaHeightMeters;

  const samples = Array.from({ length: sampleCount }, (_, index) => {
    const fraction = sampleCount === 1 ? 0 : index / (sampleCount - 1);
    const point = interpolatePoint(start, end, fraction);
    const dA = distanceKm * fraction;
    const dB = distanceKm - dA;
    const terrainBase = estimateElevationAslMeters(point);
    const ridgeInfluence = Math.sin(Math.PI * fraction) * (distanceKm > 3 ? 28 : 12);
    const terrainAslMeters = Math.round(terrainBase + ridgeInfluence);
    const signalAslMeters = startRadioAsl + (endRadioAsl - startRadioAsl) * fraction;
    const fresnelRadiusMetersValue = fresnelRadiusMeters(dA, dB, distanceKm, frequencyGhz);
    const fresnelRequiredAslMeters = signalAslMeters - fresnelRadiusMetersValue * (fresnelZonePercent / 100);
    const clearanceMeters = fresnelRequiredAslMeters - terrainAslMeters;
    return {
      ...point,
      index,
      distanceKm: Number(dA.toFixed(3)),
      distancePercent: Number((fraction * 100).toFixed(1)),
      terrainAslMeters,
      signalAslMeters: Number(signalAslMeters.toFixed(1)),
      fresnelRadiusMeters: Number(fresnelRadiusMetersValue.toFixed(1)),
      fresnelRequiredAslMeters: Number(fresnelRequiredAslMeters.toFixed(1)),
      clearanceMeters: Number(clearanceMeters.toFixed(1)),
      obstruction: clearanceMeters < 0,
    };
  });

  const minClearanceMeters = Math.min(...samples.map((sample) => sample.clearanceMeters));
  const highestObstructionMeters = Math.max(0, ...samples.map((sample) => -sample.clearanceMeters));
  const status: LosStatus = minClearanceMeters >= 12 ? "clear" : minClearanceMeters >= 0 ? "marginal" : "blocked";

  return {
    id: `los-profile-${start.id}-${end.id}`,
    startPinId: start.id,
    endPinId: end.id,
    startLabel: start.label,
    endLabel: end.label,
    distanceKm: Number(distanceKm.toFixed(2)),
    bearingDeg: Number(bearingDeg.toFixed(1)),
    bearing: formatBearing(bearingDeg),
    frequencyGhz,
    fresnelZonePercent,
    status,
    statusColor: STATUS_COLORS[status],
    minClearanceMeters: Number(minClearanceMeters.toFixed(1)),
    highestObstructionMeters: Number(highestObstructionMeters.toFixed(1)),
    samples,
  };
}

export function buildDefaultLosProfile(pins: PrecisionPlanningPin[]) {
  const property = pins.find((pin) => pin.role === "property") ?? pins[0];
  const preferredRemote = pins.find((pin) => pin.role === "tower") ?? pins.find((pin) => pin.id !== property?.id);
  if (!property || !preferredRemote || property.id === preferredRemote.id) return null;
  return buildLosTerrainProfile(property, preferredRemote);
}

export function buildRidgeCrestCandidate(origin: GisCoordinate) {
  return buildPrecisionPlanningPin({
    id: "ridge-crest-candidate",
    label: "Ridge crest planning pin",
    role: "operational",
    color: "#C6FF00",
    ...getDestinationPoint(origin, 1.8, 38),
    source: "terrain-planning",
    antennaHeightMeters: 12,
  });
}
