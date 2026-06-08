/**
 * CTTX Link Planner — fresh build 2026-05-25
 * Network architecture diagram with LOS indications.
 * Auto-suggest topology (MST L1 backbone + nearest-connection L2/L3).
 * Equipment assigned by planner — no auto-recommendations.
 */

import { MapView } from "@/components/Map";
import { Button } from "@/components/ui/button";
import { buildGisAutoScanWithApis, calculateBearingDeg, calculateDistanceKm, type GisCoordinate } from "@/lib/gisAutoScan";
import {
  buildPlannerStateFromGisScan,
  DEFAULT_HIGH_SITE_ANTENNA_HEIGHT_M,
  DEFAULT_CARRIER_MAST_HEIGHT_M,
  DEFAULT_PLANNER_LAYER_VISIBILITY,
  type Facility,
  type FacilityType,
  type HighSite,
  type Mast,
  type NetworkLink,
  type PlannerState,
} from "@/lib/plannerTypes";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers3,
  MapPin,
  Plus,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const NOMINATIM_COUNTRIES = "za,zw,bw,na,mz,sz,ls";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const OPEN_METEO_ELEVATION = "https://api.open-meteo.com/v1/elevation";

// Locked layer colors
const LC: Record<string, string> = {
  L0: "#F97316",   // orange  — carrier uplink
  L1: "#FFFFFF",   // white   — core backbone
  relay: "#A855F7",// purple  — relay link
  L2: "#3B82F6",   // blue    — distribution
  L3: "#22D3EE",   // cyan    — access
  boundary: "#FFE600", // yellow — property boundary
  hs: "#22C55E",   // green   — high site triangles
};

// Default AGL heights (planner-overridable per link)
const DEFAULT_AGL: Record<string, number> = {
  L0: 18, L1: 18, relay: 9, L2: 6, L3: 6,
};

const ELEV_SPACING_KM = 0.5;
const ELEV_BATCH = 100;
const LOS_SPACING_KM = 0.15;
const CARRIER_RADIUS_M = 15_000; // 15 km outside boundary
const FREQ_GHZ = 5.8;
const FRESNEL_MIN_PCT = 60;
const MARGINAL_DEFICIT_M = 5;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Coord = GisCoordinate; // { lat, lng }
type LosStatus = "CLEAR" | "MARGINAL" | "BLOCKED" | "PENDING";
type Layer = "L0" | "L1" | "relay" | "L2" | "L3";

type HSNode = { id: string; lat: number; lng: number; elevation: number; rank: number; label: string };
type DistribNode = { id: string; lat: number; lng: number; elevation: number | null; name: string; osmType: string };
type CarrierNode = { id: string; lat: number; lng: number; operator: string; name: string | null; rank: number; distKm: number };

type NetLink = {
  id: string; layer: Layer;
  fromId: string; toId: string; label: string;
  fromPt: Coord; toPt: Coord;
  distKm: number; losStatus: LosStatus;
  aglTx: number; aglRx: number; dashed: boolean;
};

type NomResult = {
  place_id: number; osm_type: string; osm_id: number;
  display_name: string; lat: string; lon: string;
};

type BuildPhase =
  | "idle" | "boundary" | "elevation" | "highsites"
  | "distribution" | "carrier" | "topology" | "los" | "done";

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function r2(n: number) { return Math.round(n * 100) / 100; }

function centroidOf(pts: Coord[]): Coord {
  if (!pts.length) return { lat: -29, lng: 25 };
  const s = pts.reduce((a, p) => ({ lat: a.lat + p.lat, lng: a.lng + p.lng }), { lat: 0, lng: 0 });
  return { lat: s.lat / pts.length, lng: s.lng / pts.length };
}

function bboxOf(pts: Coord[]) {
  const lats = pts.map(p => p.lat), lngs = pts.map(p => p.lng);
  return { s: Math.min(...lats), n: Math.max(...lats), w: Math.min(...lngs), e: Math.max(...lngs) };
}

/** Ray-casting point-in-polygon test */
function insidePoly(pt: Coord, poly: Coord[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].lng, yi = poly[i].lat;
    const xj = poly[j].lng, yj = poly[j].lat;
    if (((yi > pt.lat) !== (yj > pt.lat)) && pt.lng < ((xj - xi) * (pt.lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function fresnelRadius(d1: number, d2: number, total: number): number {
  if (total <= 0 || d1 < 0 || d2 < 0) return 0;
  return 17.32 * Math.sqrt((d1 * d2) / (FREQ_GHZ * total));
}

// ─────────────────────────────────────────────────────────────────────────────
// API — NOMINATIM
// ─────────────────────────────────────────────────────────────────────────────

async function nominatimSearch(q: string, signal: AbortSignal): Promise<NomResult[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "7");
  url.searchParams.set("countrycodes", NOMINATIM_COUNTRIES);
  const r = await fetch(url.toString(), { signal, headers: { "Accept-Language": "en" } });
  if (!r.ok) throw new Error("Nominatim search failed");
  return r.json() as Promise<NomResult[]>;
}

async function fetchBoundaryPolygon(osmType: string, osmId: number, signal: AbortSignal): Promise<Coord[]> {
  const prefix = osmType === "relation" ? "R" : osmType === "way" ? "W" : "N";
  const url = new URL("https://nominatim.openstreetmap.org/lookup");
  url.searchParams.set("osm_ids", `${prefix}${osmId}`);
  url.searchParams.set("format", "json");
  url.searchParams.set("polygon_geojson", "1");
  const r = await fetch(url.toString(), { signal, headers: { "Accept-Language": "en" } });
  if (!r.ok) throw new Error("Nominatim lookup failed");
  const results = await r.json() as Array<{ geojson?: { type: string; coordinates: any } }>;
  const geo = results[0]?.geojson;
  if (!geo) return [];
  if (geo.type === "Polygon") {
    return (geo.coordinates[0] as [number, number][]).map(([lng, lat]) => ({ lat, lng }));
  }
  if (geo.type === "MultiPolygon") {
    // Largest ring by vertex count
    const rings: [number, number][][] = (geo.coordinates as [number, number][][][]).flat(1);
    const largest = rings.sort((a, b) => b.length - a.length)[0] ?? [];
    return largest.map(([lng, lat]) => ({ lat, lng }));
  }
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// API — OPEN-METEO ELEVATION
// ─────────────────────────────────────────────────────────────────────────────

async function batchElevation(coords: Coord[], signal?: AbortSignal): Promise<number[]> {
  const elevations: number[] = [];
  for (let off = 0; off < coords.length; off += ELEV_BATCH) {
    const chunk = coords.slice(off, off + ELEV_BATCH);
    const url = new URL(OPEN_METEO_ELEVATION);
    url.searchParams.set("latitude", chunk.map(c => c.lat.toFixed(6)).join(","));
    url.searchParams.set("longitude", chunk.map(c => c.lng.toFixed(6)).join(","));
    const r = await fetch(url.toString(), { signal });
    if (!r.ok) throw new Error(`Open-Meteo elevation failed: ${r.status}`);
    const data = await r.json() as { elevation?: number[] };
    elevations.push(...(data.elevation ?? chunk.map(() => 0)));
  }
  return elevations;
}

type ElevGrid = Coord & { elevation: number; row: number; col: number };

async function fetchElevationGrid(boundary: Coord[], signal: AbortSignal): Promise<ElevGrid[]> {
  if (boundary.length < 3) return [];
  const bbox = bboxOf(boundary);
  const midLatRad = ((bbox.s + bbox.n) / 2) * Math.PI / 180;
  const cosLat = Math.max(0.1, Math.abs(Math.cos(midLatRad)));
  const latStep = ELEV_SPACING_KM / 111.32;
  const lngStep = ELEV_SPACING_KM / (111.32 * cosLat);
  const rows = Math.max(1, Math.ceil((bbox.n - bbox.s) / latStep));
  const cols = Math.max(1, Math.ceil((bbox.e - bbox.w) / lngStep));
  const pts: ElevGrid[] = [];
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const lat = Number((bbox.s + ((bbox.n - bbox.s) * r) / rows).toFixed(6));
      const lng = Number((bbox.w + ((bbox.e - bbox.w) * c) / cols).toFixed(6));
      if (insidePoly({ lat, lng }, boundary)) pts.push({ lat, lng, row: r, col: c, elevation: 0 });
    }
  }
  if (pts.length === 0) return [];
  const elevs = await batchElevation(pts, signal);
  return pts.map((p, i) => ({ ...p, elevation: Math.round(elevs[i] ?? 0) }));
}

function detectHighSites(grid: ElevGrid[], boundary: Coord[]): HSNode[] {
  if (grid.length === 0) return [];
  const elevs = grid.map(g => g.elevation);
  const minE = Math.min(...elevs), maxE = Math.max(...elevs);
  const range = Math.max(1, maxE - minE);
  const centre = centroidOf(boundary);

  // Find local maxima within the boundary
  const maxima: ElevGrid[] = [];
  for (const pt of grid) {
    if ((pt.elevation - minE) / range < 0.25) continue; // skip low-lying points
    const neighbours = grid.filter(g =>
      Math.abs(g.row - pt.row) <= 1 && Math.abs(g.col - pt.col) <= 1 && g !== pt
    );
    if (!neighbours.length || neighbours.every(n => pt.elevation >= n.elevation)) {
      maxima.push(pt);
    }
  }

  return (maxima.length ? maxima : grid)
    .map(pt => ({
      pt,
      score: ((pt.elevation - minE) / range) * 0.7 +
             Math.max(0, 1 - calculateDistanceKm(pt, centre) / 8) * 0.3,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ pt }, i) => ({
      id: `hs-${i + 1}`,
      lat: pt.lat, lng: pt.lng,
      elevation: pt.elevation,
      rank: i + 1,
      label: `HS-${i + 1}`,
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// API — OVERPASS (distribution sites + carrier masts)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchDistribSites(boundary: Coord[], signal: AbortSignal): Promise<DistribNode[]> {
  const b = bboxOf(boundary);
  const query = `[out:json][timeout:25];
(
  node["tourism"~"hotel|camp_site|resort|chalet|guest_house|lodge|viewpoint"](${b.s},${b.w},${b.n},${b.e});
  node["amenity"~"fuel|water_point|restaurant|community_centre"](${b.s},${b.w},${b.n},${b.e});
  node["building"~"barn|house|farm"](${b.s},${b.w},${b.n},${b.e});
  node["man_made"~"water_tower|water_well|pumping_station|tower"](${b.s},${b.w},${b.n},${b.e});
  node["landuse"="farmyard"](${b.s},${b.w},${b.n},${b.e});
  way["building"](${b.s},${b.w},${b.n},${b.e});
);
out center;`;
  const r = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ data: query }),
    signal,
  });
  if (!r.ok) throw new Error(`Overpass distribution sites failed: ${r.status}`);
  const data = await r.json() as { elements?: Array<{
    id: number; type: string;
    lat?: number; lon?: number;
    center?: { lat?: number; lon?: number };
    tags?: Record<string, string | undefined>;
  }> };
  const seen = new Set<string>();
  const nodes: DistribNode[] = [];
  for (const el of data.elements ?? []) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const coord = { lat: Number(lat!.toFixed(6)), lng: Number(lon!.toFixed(6)) };
    if (!insidePoly(coord, boundary)) continue;
    const key = `${coord.lat.toFixed(4)}_${coord.lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const tags = el.tags ?? {};
    const name = tags.name ?? tags.ref ?? `${el.type}-${el.id}`;
    const osmType = tags.tourism ?? tags.amenity ?? tags.building ?? tags.man_made ?? el.type;
    nodes.push({ id: `d-${el.type}-${el.id}`, lat: coord.lat, lng: coord.lng, elevation: null, name, osmType });
  }
  return nodes;
}

function normaliseOperator(tags: Record<string, string | undefined> | undefined): string {
  const raw = [tags?.operator, tags?.brand, tags?.owner, tags?.name].filter(Boolean).join(" ").toLowerCase();
  if (raw.includes("vodacom")) return "Vodacom";
  if (raw.includes("mtn")) return "MTN";
  if (raw.includes("cell c") || raw.includes("cellc")) return "Cell C";
  if (raw.includes("telkom")) return "Telkom";
  if (raw.includes("liquid")) return "Liquid";
  return "Unknown";
}

async function fetchCarrierMasts(centre: Coord, signal: AbortSignal): Promise<CarrierNode[]> {
  const query = `[out:json][timeout:30];
(
  node["man_made"="mast"](around:${CARRIER_RADIUS_M},${centre.lat},${centre.lng});
  node["man_made"="tower"]["tower:type"="communication"](around:${CARRIER_RADIUS_M},${centre.lat},${centre.lng});
  node["tower:type"="communication"](around:${CARRIER_RADIUS_M},${centre.lat},${centre.lng});
);
out body;`;
  const r = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: new URLSearchParams({ data: query }),
    signal,
  });
  if (!r.ok) throw new Error(`Overpass carrier masts failed: ${r.status}`);
  const data = await r.json() as { elements?: Array<{
    id: number; type: string; lat?: number; lon?: number;
    tags?: Record<string, string | undefined>;
  }> };
  const seen = new Set<string>();
  const raw: Array<CarrierNode & { _dist: number }> = [];
  for (const el of data.elements ?? []) {
    if (!Number.isFinite(el.lat) || !Number.isFinite(el.lon)) continue;
    const id = `cm-${el.type}-${el.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const operator = normaliseOperator(el.tags);
    const lat = Number(el.lat!.toFixed(6)), lng = Number(el.lon!.toFixed(6));
    raw.push({
      id, lat, lng, operator,
      name: el.tags?.name?.trim() || el.tags?.ref?.trim() || null,
      rank: 0, distKm: 0, _dist: calculateDistanceKm(centre, { lat, lng }),
    });
  }
  return raw
    .sort((a, b) => a._dist - b._dist)
    .slice(0, 20)
    .map(({ _dist, ...m }, i) => ({ ...m, rank: i + 1, distKm: r2(_dist) }));
}

// ─────────────────────────────────────────────────────────────────────────────
// TOPOLOGY — MST BACKBONE + NEAREST CONNECTION DISTRIBUTION
// ─────────────────────────────────────────────────────────────────────────────

function buildMstBackbone(nodes: HSNode[]): NetLink[] {
  if (nodes.length < 2) return [];
  // All edges sorted by distance
  const edges: { from: HSNode; to: HSNode; dist: number }[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      edges.push({ from: nodes[i], to: nodes[j], dist: calculateDistanceKm(nodes[i], nodes[j]) });
    }
  }
  edges.sort((a, b) => a.dist - b.dist);
  // Kruskal's MST with Union-Find
  const parent = new Map<string, string>(nodes.map(n => [n.id, n.id]));
  function find(id: string): string {
    if (parent.get(id) !== id) parent.set(id, find(parent.get(id)!));
    return parent.get(id)!;
  }
  const links: NetLink[] = [];
  for (const e of edges) {
    if (find(e.from.id) === find(e.to.id)) continue; // cycle — skip
    parent.set(find(e.from.id), find(e.to.id)); // union
    links.push({
      id: `L1-${e.from.id}-${e.to.id}`,
      layer: "L1",
      fromId: e.from.id, toId: e.to.id,
      label: `${e.from.label} → ${e.to.label}`,
      fromPt: { lat: e.from.lat, lng: e.from.lng },
      toPt: { lat: e.to.lat, lng: e.to.lng },
      distKm: r2(e.dist), losStatus: "PENDING",
      aglTx: DEFAULT_AGL.L1, aglRx: DEFAULT_AGL.L1, dashed: false,
    });
    if (links.length === nodes.length - 1) break; // MST complete
  }
  return links;
}

function buildDistribLinks(distribNodes: DistribNode[], hsNodes: HSNode[]): NetLink[] {
  if (!hsNodes.length) return [];
  return distribNodes.map(d => {
    const nearest = hsNodes.reduce((best, hs) =>
      calculateDistanceKm(d, hs) < calculateDistanceKm(d, best) ? hs : best
    );
    return {
      id: `L2-${nearest.id}-${d.id}`,
      layer: "L2" as Layer,
      fromId: nearest.id, toId: d.id,
      label: `${nearest.label} → ${d.name}`,
      fromPt: { lat: nearest.lat, lng: nearest.lng },
      toPt: { lat: d.lat, lng: d.lng },
      distKm: r2(calculateDistanceKm(d, nearest)),
      losStatus: "PENDING" as LosStatus,
      aglTx: DEFAULT_AGL.L1, aglRx: DEFAULT_AGL.L2, dashed: false,
    };
  });
}

function buildUplinkLink(carrier: CarrierNode, hsNodes: HSNode[]): NetLink | null {
  if (!hsNodes.length) return null;
  const nearest = hsNodes.reduce((best, hs) =>
    calculateDistanceKm(carrier, hs) < calculateDistanceKm(carrier, best) ? hs : best
  );
  return {
    id: `L0-${carrier.id}-${nearest.id}`,
    layer: "L0",
    fromId: carrier.id, toId: nearest.id,
    label: `${carrier.operator}${carrier.name ? ` (${carrier.name})` : ""} → ${nearest.label}`,
    fromPt: { lat: carrier.lat, lng: carrier.lng },
    toPt: { lat: nearest.lat, lng: nearest.lng },
    distKm: r2(calculateDistanceKm(carrier, nearest)),
    losStatus: "PENDING",
    aglTx: DEFAULT_AGL.L1, aglRx: DEFAULT_AGL.L1, dashed: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LOS / FRESNEL ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

/** Nearest-neighbour lookup into the Step-2 elevation grid (no API call). */
function interpolateElevFromGrid(pt: Coord, grid: ElevGrid[]): number {
  if (!grid.length) return 0;
  let best = grid[0], bestDist = Infinity;
  for (const g of grid) {
    const d = (g.lat - pt.lat) ** 2 + (g.lng - pt.lng) ** 2;
    if (d < bestDist) { bestDist = d; best = g; }
  }
  return best.elevation;
}

async function calcLinkLos(
  link: NetLink,
  aglTx: number,
  aglRx: number,
  signal: AbortSignal,
  grid?: ElevGrid[], // when provided, use cached grid (no API call)
): Promise<LosStatus> {
  const totalKm = calculateDistanceKm(link.fromPt, link.toPt);
  const intervals = Math.max(2, Math.ceil(totalKm / LOS_SPACING_KM));
  const pts: Coord[] = Array.from({ length: intervals + 1 }, (_, i) => ({
    lat: link.fromPt.lat + (link.toPt.lat - link.fromPt.lat) * (i / intervals),
    lng: link.fromPt.lng + (link.toPt.lng - link.fromPt.lng) * (i / intervals),
  }));
  // Use cached grid when available to avoid re-hitting the elevation API (rate limits)
  let elevs: number[];
  if (grid && grid.length) {
    elevs = pts.map(p => interpolateElevFromGrid(p, grid));
  } else {
    try {
      elevs = await batchElevation(pts, signal);
    } catch {
      return "PENDING"; // API unavailable / rate-limited — leave as PENDING
    }
  }
  if (signal.aborted) return "PENDING";

  const startEl = (elevs[0] ?? 0) + aglTx;
  const endEl = (elevs[elevs.length - 1] ?? 0) + aglRx;
  let worstClearance = Infinity;

  for (let i = 1; i < pts.length - 1; i++) {
    const frac = i / intervals;
    const d1 = totalKm * frac, d2 = totalKm * (1 - frac);
    const signalEl = startEl + (endEl - startEl) * frac;
    const fz = fresnelRadius(d1, d2, totalKm);
    const req = signalEl - fz * (FRESNEL_MIN_PCT / 100);
    const clearance = req - (elevs[i] ?? 0);
    if (clearance < worstClearance) worstClearance = clearance;
  }

  if (worstClearance >= 0) return "CLEAR";
  if (Math.abs(worstClearance) <= MARGINAL_DEFICIT_M) return "MARGINAL";
  return "BLOCKED";
}

// Linkstats for display
function linkFadeMargin(distKm: number): number {
  const pl = 92.45 + 20 * Math.log10(Math.max(distKm, 0.1)) + 20 * Math.log10(FREQ_GHZ);
  return Number((24 + 30 * 2 - pl + 76).toFixed(1)); // txPower=24, gain=30dBi×2, sensitivity=-76dBm
}

// ─────────────────────────────────────────────────────────────────────────────
// MAP — BOUNDS FIT
// ─────────────────────────────────────────────────────────────────────────────

function fitToBoundary(map: any, pts: Coord[]) {
  if (!map || !pts.length) return;
  const ml = window.maplibregl;
  if (!ml) return;
  const bounds = new ml.LngLatBounds();
  pts.forEach(p => bounds.extend([p.lng, p.lat]));
  map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<BuildPhase, string> = {
  idle: "", boundary: "Loading property boundary…",
  elevation: "Scanning SRTM terrain elevation…",
  highsites: "Ranking high-site candidates…",
  distribution: "Discovering distribution sites (OSM)…",
  carrier: "Searching carrier masts within 15 km…",
  topology: "Building optimal topology (MST)…",
  los: "Calculating LOS + Fresnel clearance…",
  done: "",
};

export default function LinkPlanner() {
  // ── Search / property
  const [propertyName, setPropertyName] = useState("");
  const [nameResults, setNameResults] = useState<NomResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState<NomResult | null>(null);

  // ── Plan data
  const [boundary, setBoundary] = useState<Coord[]>([]);
  const [phase, setPhase] = useState<BuildPhase>("idle");
  const [hsNodes, setHsNodes] = useState<HSNode[]>([]);
  const [distribNodes, setDistribNodes] = useState<DistribNode[]>([]);
  const [carrierMasts, setCarrierMasts] = useState<CarrierNode[]>([]);
  const [selectedCarrierId, setSelectedCarrierId] = useState<string | null>(null);
  const [links, setLinks] = useState<NetLink[]>([]);

  // ── Planner overrides
  const [heightOverrides, setHeightOverrides] = useState<Record<string, { tx: number; rx: number }>>({});
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);

  // ── Map
  const [mapReady, setMapReady] = useState(false);
  const [addNodeMode, setAddNodeMode] = useState<"L2" | "L3" | null>(null);

  // ── Refs
  const mapRef = useRef<any>(null);
  const overlayRefs = useRef<Array<{ remove(): void }>>([]);
  const buildAbortRef = useRef<AbortController | null>(null);
  const nameAbortRef = useRef<AbortController | null>(null);
  const skipSearchRef = useRef(false); // set true after selection to suppress re-query

  // ─────────────────────────────────────────────────────────────────────────
  // NOMINATIM AUTOCOMPLETE
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (skipSearchRef.current) { skipSearchRef.current = false; return; }
    nameAbortRef.current?.abort();
    const q = propertyName.trim();
    if (q.length < 3) { setNameResults([]); setIsSearching(false); return; }
    const ctrl = new AbortController();
    nameAbortRef.current = ctrl;
    setIsSearching(true);
    const t = window.setTimeout(async () => {
      try {
        const results = await nominatimSearch(q, ctrl.signal);
        if (!ctrl.signal.aborted) setNameResults(results);
      } catch {
        if (!ctrl.signal.aborted) setNameResults([]);
      } finally {
        if (!ctrl.signal.aborted) setIsSearching(false);
      }
    }, 350);
    return () => { window.clearTimeout(t); ctrl.abort(); };
  }, [propertyName]);

  const handleSelectResult = async (result: NomResult) => {
    setSelectedResult(result);
    const name = result.display_name.split(",")[0].trim();
    skipSearchRef.current = true; // prevent re-query when propertyName updates
    setPropertyName(name);
    setNameResults([]);
    setIsSearching(false);
    // Immediately fetch boundary polygon so map snaps to it
    try {
      const ctrl = new AbortController();
      const poly = await fetchBoundaryPolygon(result.osm_type, result.osm_id, ctrl.signal);
      if (poly.length >= 3) {
        setBoundary(poly);
        fitToBoundary(mapRef.current, poly);
        toast.success(`${name} — boundary loaded. Press Plan Network to build the topology.`);
      } else {
        // Fallback: build a synthetic ~10 km bounding box around the point
        const lat = Number(result.lat), lng = Number(result.lon);
        const d = 0.045; // ≈5 km per side
        const synthPoly: Coord[] = [
          { lat: lat + d, lng: lng - d },
          { lat: lat + d, lng: lng + d },
          { lat: lat - d, lng: lng + d },
          { lat: lat - d, lng: lng - d },
        ];
        setBoundary(synthPoly);
        fitToBoundary(mapRef.current, synthPoly);
        toast.info(`${name} — no OSM polygon found. Planning within a ~10 km reference area.`);
      }
    } catch {
      toast.error("Failed to load property boundary.");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PLAN NETWORK ORCHESTRATOR
  // ─────────────────────────────────────────────────────────────────────────

  const handlePlanNetwork = async () => {
    buildAbortRef.current?.abort();
    const abort = new AbortController();
    buildAbortRef.current = abort;

    // Reset
    setHsNodes([]); setDistribNodes([]); setCarrierMasts([]); setLinks([]); setSelectedLinkId(null);

    try {
      // Step 1 — boundary
      let poly = boundary;
      if (poly.length < 3 && selectedResult) {
        setPhase("boundary");
        poly = await fetchBoundaryPolygon(selectedResult.osm_type, selectedResult.osm_id, abort.signal);
        if (abort.signal.aborted) return;
        if (poly.length >= 3) { setBoundary(poly); fitToBoundary(mapRef.current, poly); }
      }
      if (poly.length < 3 && selectedResult) {
        // Last resort: build synthetic bounding box from point coords
        const lat = Number(selectedResult.lat), lng = Number(selectedResult.lon);
        const d = 0.045;
        poly = [
          { lat: lat + d, lng: lng - d }, { lat: lat + d, lng: lng + d },
          { lat: lat - d, lng: lng + d }, { lat: lat - d, lng: lng - d },
        ];
        setBoundary(poly);
        fitToBoundary(mapRef.current, poly);
      }
      if (poly.length < 3) {
        toast.error("No property boundary available. Search for a property and select it first.");
        setPhase("idle"); return;
      }

      // Step 2 — SRTM elevation grid
      setPhase("elevation");
      let grid: ElevGrid[] = [];
      try {
        grid = await fetchElevationGrid(poly, abort.signal);
      } catch (elevErr) {
        if (abort.signal.aborted) return;
        const elevMsg = elevErr instanceof Error ? elevErr.message : "";
        if (elevMsg.includes("429")) {
          toast.error("Elevation API rate-limited. Wait 30 s then retry.", { duration: 8000 });
          setPhase("idle"); return;
        }
        toast.warning("Elevation fetch failed — high-site detection skipped.");
      }
      if (abort.signal.aborted) return;

      // Step 3 — high sites
      setPhase("highsites");
      const hs = detectHighSites(grid, poly);
      setHsNodes(hs);
      if (abort.signal.aborted) return;
      if (!hs.length) { toast.warning("No elevation peaks found within boundary."); setPhase("done"); return; }
      console.log(`[LP] ${hs.length} high-site candidates ranked`);

      // Step 4 — distribution sites (OSM)
      setPhase("distribution");
      let distrib: DistribNode[] = [];
      try {
        distrib = await fetchDistribSites(poly, abort.signal);
        if (abort.signal.aborted) return;
        setDistribNodes(distrib);
        console.log(`[LP] ${distrib.length} distribution sites from OSM`);
        if (!distrib.length) toast.info("No OSM buildings/sites found. Add distribution sites manually by clicking the map.");
      } catch { toast.warning("OSM distribution site query failed — add sites manually."); }

      // Step 5 — carrier masts
      setPhase("carrier");
      const centre = centroidOf(poly);
      let masts: CarrierNode[] = [];
      try {
        masts = await fetchCarrierMasts(centre, abort.signal);
        if (abort.signal.aborted) return;
        setCarrierMasts(masts);
        const defaultCarrier = masts[0]?.id ?? null;
        setSelectedCarrierId(defaultCarrier);
        console.log(`[LP] ${masts.length} carrier masts within 15 km`);
      } catch { toast.warning("Carrier mast discovery failed."); }

      // Fallback L0: synthesise a carrier node 12 km north of property if OSM found none
      if (!masts.length && hs.length) {
        const bbox = bboxOf(poly);
        const synthLat = bbox.n + 0.11; // ≈ 12 km north of northern boundary edge
        const synthCarrier: CarrierNode = {
          id: "L0-synth",
          lat: synthLat,
          lng: centre.lng,
          operator: "SP Carrier",
          name: "Nearest carrier (inferred)",
          rank: 0,
          distKm: r2(calculateDistanceKm({ lat: synthLat, lng: centre.lng }, centre)),
        };
        masts = [synthCarrier];
        setCarrierMasts(masts);
        setSelectedCarrierId(synthCarrier.id);
        toast.info("No carrier masts found in OSM — L0 uplink inferred 12 km north of property.");
      }

      // Step 6 — build topology (MST)
      setPhase("topology");
      const carrier = masts.find(m => m.id === selectedCarrierId) ?? masts[0] ?? null;
      const topoLinks: NetLink[] = [
        ...buildMstBackbone(hs),
        ...buildDistribLinks(distrib, hs),
        ...(carrier ? [buildUplinkLink(carrier, hs)].filter(Boolean) as NetLink[] : []),
      ];
      setLinks(topoLinks);
      if (abort.signal.aborted) return;
      fitToBoundary(mapRef.current, poly);

      // Step 7 — LOS calculation (streaming updates)
      setPhase("los");
      const updatedLinks = [...topoLinks];
      await Promise.all(topoLinks.map(async (link, idx) => {
        try {
          const override = heightOverrides[link.id];
          const aglTx = override?.tx ?? link.aglTx;
          const aglRx = override?.rx ?? link.aglRx;
          const status = await calcLinkLos(link, aglTx, aglRx, abort.signal, grid);
          if (abort.signal.aborted) return;
          updatedLinks[idx] = { ...link, losStatus: status };
          setLinks([...updatedLinks]); // stream update as each completes
        } catch { /* keep PENDING */ }
      }));
      if (abort.signal.aborted) return;

      setPhase("done");
      const clearCount = updatedLinks.filter(l => l.losStatus === "CLEAR").length;
      const blockedCount = updatedLinks.filter(l => l.losStatus === "BLOCKED").length;
      toast.success(`Topology built — ${topoLinks.length} links · ${clearCount} CLEAR · ${blockedCount} BLOCKED`);

    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      console.error("[LP] Plan build error", e);
      const msg = e instanceof Error ? e.message : "Network build failed.";
      if (msg.includes("429")) {
        toast.error("Elevation API rate-limited. Wait 30 seconds then click Plan Network again.", { duration: 8000 });
      } else {
        toast.error(msg);
      }
      setPhase("idle");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MANUAL NODE PLACEMENT (click-to-add)
  // ─────────────────────────────────────────────────────────────────────────

  const clickHandlerRef = useRef<((e: any) => void) | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (clickHandlerRef.current) { map.off("click", clickHandlerRef.current); clickHandlerRef.current = null; }
    if (!addNodeMode) return;
    const handler = (e: any) => {
      const coord: Coord = { lat: Number(e.lngLat.lat.toFixed(6)), lng: Number(e.lngLat.lng.toFixed(6)) };
      const name = window.prompt("Site name:", `Site ${distribNodes.length + 1}`) ?? `Site ${distribNodes.length + 1}`;
      if (addNodeMode === "L2") {
        const newNode: DistribNode = { id: `d-manual-${Date.now()}`, lat: coord.lat, lng: coord.lng, elevation: null, name, osmType: "manual" };
        const updated = [...distribNodes, newNode];
        setDistribNodes(updated);
        // Add a new L2 link
        const newLinks = buildDistribLinks([newNode], hsNodes);
        setLinks(prev => [...prev, ...newLinks]);
        toast.success(`${name} added as distribution site`);
      }
      setAddNodeMode(null);
    };
    map.on("click", handler);
    clickHandlerRef.current = handler;
    return () => { map.off("click", handler); clickHandlerRef.current = null; };
  }, [addNodeMode, distribNodes, hsNodes]);

  // ─────────────────────────────────────────────────────────────────────────
  // CARRIER SELECTION
  // ─────────────────────────────────────────────────────────────────────────

  const handleSelectCarrier = (id: string) => {
    const mast = carrierMasts.find(m => m.id === id);
    const closest = carrierMasts[0];
    if (!mast || !closest) return;
    if (mast.rank > 1) {
      const ok = window.confirm(
        `Closest-mast rule: ${closest.operator}${closest.name ? ` (${closest.name})` : ""} at ${closest.distKm} km is the default uplink.\nSelecting rank #${mast.rank} requires explicit planner confirmation. Continue?`
      );
      if (!ok) return;
    }
    setSelectedCarrierId(id);
    // Rebuild uplink link
    const uplinkLink = buildUplinkLink(mast, hsNodes);
    if (uplinkLink) {
      setLinks(prev => [...prev.filter(l => l.layer !== "L0"), uplinkLink]);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // HEIGHT OVERRIDE — triggers LOS recalc for that link
  // ─────────────────────────────────────────────────────────────────────────

  const applyHeightOverride = async (linkId: string, tx: number, rx: number) => {
    setHeightOverrides(prev => ({ ...prev, [linkId]: { tx, rx } }));
    const link = links.find(l => l.id === linkId);
    if (!link) return;
    setLinks(prev => prev.map(l => l.id === linkId ? { ...l, losStatus: "PENDING" } : l));
    try {
      const ctrl = new AbortController();
      const status = await calcLinkLos(link, tx, rx, ctrl.signal);
      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, aglTx: tx, aglRx: rx, losStatus: status } : l));
    } catch { /* keep PENDING */ }
  };

  const removeLink = (linkId: string) => setLinks(prev => prev.filter(l => l.id !== linkId));

  // ─────────────────────────────────────────────────────────────────────────
  // MAP OVERLAY RENDERING
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const map = mapRef.current;
    const ml = window.maplibregl;
    if (!map || !ml || !mapReady) return;

    // Clear previous markers
    overlayRefs.current.forEach(m => m.remove());
    overlayRefs.current = [];

    // ── Boundary
    if (map.getSource("lp-boundary")) {
      const coords = boundary.length >= 3
        ? [[...boundary.map(p => [p.lng, p.lat]), [boundary[0].lng, boundary[0].lat]]]
        : [[[]]];
      (map.getSource("lp-boundary") as any).setData({
        type: "Feature", geometry: { type: "Polygon", coordinates: coords }, properties: {},
      });
    }

    // ── Links — split into solid and dashed for MapLibre dasharray limitation
    const solidFeatures: any[] = [];
    const dashedFeatures: any[] = [];
    for (const link of links) {
      const color = LC[link.layer] ?? "#888";
      const feat = {
        type: "Feature",
        geometry: { type: "LineString", coordinates: [[link.fromPt.lng, link.fromPt.lat], [link.toPt.lng, link.toPt.lat]] },
        properties: { color, linkId: link.id, losStatus: link.losStatus },
      };
      if (link.dashed) dashedFeatures.push(feat);
      else solidFeatures.push(feat);
    }
    if (map.getSource("lp-links-solid")) {
      (map.getSource("lp-links-solid") as any).setData({ type: "FeatureCollection", features: solidFeatures });
    }
    if (map.getSource("lp-links-dashed")) {
      (map.getSource("lp-links-dashed") as any).setData({ type: "FeatureCollection", features: dashedFeatures });
    }

    // ── LOS status badges at link midpoints
    for (const link of links) {
      if (link.losStatus === "PENDING") continue;
      const mid = {
        lat: (link.fromPt.lat + link.toPt.lat) / 2,
        lng: (link.fromPt.lng + link.toPt.lng) / 2,
      };
      const statusColor = link.losStatus === "CLEAR" ? "#22C55E" : link.losStatus === "MARGINAL" ? "#F59E0B" : "#EF4444";
      const el = document.createElement("div");
      el.style.cssText = `font-size:9px;font-weight:800;color:${statusColor};background:rgba(2,6,23,0.85);padding:1px 4px;border-radius:3px;white-space:nowrap;pointer-events:none;border:1px solid ${statusColor}40;line-height:1.4;`;
      el.textContent = link.losStatus;
      overlayRefs.current.push(new ml.Marker({ element: el }).setLngLat([mid.lng, mid.lat]).addTo(map));
    }

    // ── AGL height labels at midpoints (for links with overrides or non-default heights)
    for (const link of links) {
      const override = heightOverrides[link.id];
      if (!override && link.aglTx === DEFAULT_AGL[link.layer] && link.aglRx === DEFAULT_AGL[link.layer]) continue;
      const tx = override?.tx ?? link.aglTx;
      const rx = override?.rx ?? link.aglRx;
      const mid = {
        lat: (link.fromPt.lat + link.toPt.lat) / 2 + 0.0002,
        lng: (link.fromPt.lng + link.toPt.lng) / 2,
      };
      const el = document.createElement("div");
      el.style.cssText = "font-size:8px;color:#94a3b8;background:rgba(2,6,23,0.75);padding:1px 4px;border-radius:3px;white-space:nowrap;pointer-events:none;";
      el.textContent = `${tx}m | ${rx}m AGL`;
      overlayRefs.current.push(new ml.Marker({ element: el }).setLngLat([mid.lng, mid.lat]).addTo(map));
    }

    // ── High site triangles (green)
    for (const hs of hsNodes) {
      const el = document.createElement("div");
      el.style.cssText = `color:${LC.hs};font-size:22px;font-weight:900;line-height:1;cursor:default;text-shadow:0 1px 3px rgba(0,0,0,.8);`;
      el.textContent = "▲";
      el.title = `${hs.label} · ${hs.elevation} m ASL · Layer 1 core`;
      const labelEl = document.createElement("div");
      labelEl.style.cssText = `font-size:9px;font-weight:700;color:#fff;text-align:center;margin-top:-2px;text-shadow:0 1px 2px rgba(0,0,0,.9);`;
      labelEl.textContent = hs.label;
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "display:flex;flex-direction:column;align-items:center;";
      wrapper.appendChild(el); wrapper.appendChild(labelEl);
      overlayRefs.current.push(new ml.Marker({ element: wrapper }).setLngLat([hs.lng, hs.lat]).addTo(map));
    }

    // ── Distribution site markers (blue circles)
    for (const d of distribNodes) {
      const el = document.createElement("div");
      el.style.cssText = `width:10px;height:10px;border-radius:50%;background:${LC.L2};border:1.5px solid #fff;cursor:pointer;`;
      el.title = `${d.name} · ${d.osmType} · L2 distribution`;
      overlayRefs.current.push(new ml.Marker({ element: el }).setLngLat([d.lng, d.lat]).addTo(map));
    }

    // ── Carrier mast markers
    for (const m of carrierMasts) {
      const isSelected = m.id === selectedCarrierId;
      const el = document.createElement("div");
      el.style.cssText = `width:${isSelected ? 18 : 12}px;height:${isSelected ? 18 : 12}px;border-radius:50%;background:${isSelected ? LC.L0 : "#64748b"};border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-size:8px;font-weight:900;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.5);`;
      el.textContent = isSelected ? "C" : String(m.rank);
      el.title = `${m.operator}${m.name ? ` · ${m.name}` : ""} · rank #${m.rank} · ${m.distKm} km`;
      el.onclick = () => handleSelectCarrier(m.id);
      overlayRefs.current.push(new ml.Marker({ element: el }).setLngLat([m.lng, m.lat]).addTo(map));
    }

  }, [mapReady, boundary, hsNodes, distribNodes, carrierMasts, selectedCarrierId, links, heightOverrides]);

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED VALUES
  // ─────────────────────────────────────────────────────────────────────────

  const losCounts = useMemo(() => ({
    clear: links.filter(l => l.losStatus === "CLEAR").length,
    marginal: links.filter(l => l.losStatus === "MARGINAL").length,
    blocked: links.filter(l => l.losStatus === "BLOCKED").length,
    pending: links.filter(l => l.losStatus === "PENDING").length,
  }), [links]);

  const selectedLink = links.find(l => l.id === selectedLinkId) ?? null;
  const selectedLinkOverride = selectedLink ? heightOverrides[selectedLink.id] : null;

  const isBuilding = phase !== "idle" && phase !== "done";

  // ─────────────────────────────────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen rounded-3xl bg-slate-950 text-slate-100">
      <section className="grid gap-4 p-4 xl:grid-cols-[360px_minmax(0,1fr)]">

        {/* ═══════════════════════════════ LEFT COLUMN ═══════════════════════ */}
        <aside className="space-y-4">

          {/* Header */}
          <div className="rounded-2xl border border-cyan-400/20 bg-slate-900/85 p-4 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">CTTX · Network Planner</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">LOS Link Planner</h1>
            <p className="mt-2 text-xs leading-5 text-slate-400">Auto-suggest topology · Carrier-agnostic · Game reserves, farms, mines, remote industrial</p>
          </div>

          {/* Search + Plan Network */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
            <div className="relative">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Property / Reserve</label>
              <input
                value={propertyName}
                onChange={e => { setSelectedResult(null); setNameResults([]); setPropertyName(e.target.value); }}
                onKeyDown={e => {
                  if (e.key === "Enter" && nameResults.length > 0) {
                    e.preventDefault();
                    handleSelectResult(nameResults[0]);
                  }
                }}
                autoComplete="off"
                placeholder="Search South Africa…"
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2 placeholder:text-slate-600"
              />
              {(isSearching || nameResults.length > 0) && (
                <div className="absolute left-0 right-0 top-full z-[80] mt-1 overflow-hidden rounded-xl border border-cyan-400/30 bg-slate-900 shadow-2xl">
                  {isSearching && nameResults.length === 0 && (
                    <p className="flex items-center gap-2 px-4 py-3 text-xs text-slate-400">
                      <Clock className="h-3 w-3 animate-spin" /> Searching…
                    </p>
                  )}
                  {nameResults.map(r => {
                    const parts = r.display_name.split(",");
                    return (
                      <button key={r.place_id} type="button"
                        className="block w-full border-b border-white/10 px-4 py-2.5 text-left text-xs hover:bg-cyan-400/10 last:border-0"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => handleSelectResult(r)}>
                        <span className="block font-semibold text-white">{parts[0].trim()}</span>
                        <span className="block text-slate-400">{parts.slice(1, 4).join(",").trim()}</span>
                      </button>
                    );
                  })}
                  <p className="px-4 py-1.5 text-[10px] text-slate-600 border-t border-white/5">Click or press Enter to select</p>
                </div>
              )}
            </div>

            {boundary.length >= 3 && (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
                ✓ Boundary loaded · {boundary.length} vertices
              </div>
            )}

            <Button
              type="button"
              disabled={isBuilding || (!selectedResult && propertyName.trim().length < 3)}
              onClick={handlePlanNetwork}
              className="w-full bg-yellow-400 text-slate-950 hover:bg-yellow-300 font-bold text-sm h-11 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isBuilding
                ? <><Clock className="mr-2 h-4 w-4 animate-spin" />{PHASE_LABELS[phase]}</>
                : selectedResult
                  ? <><Zap className="mr-2 h-4 w-4" />Plan Network</>
                  : <><MapPin className="mr-2 h-4 w-4" />Search &amp; select a property first</>
              }
            </Button>
          </div>

          {/* Network stats */}
          {(hsNodes.length > 0 || links.length > 0) && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Network Summary</p>
              <div className="grid grid-cols-2 gap-2">
                <StatChip label="Core nodes (L1)" value={hsNodes.length} color="text-emerald-300" />
                <StatChip label="Distribution (L2)" value={distribNodes.length} color="text-blue-300" />
                <StatChip label="Carrier masts" value={carrierMasts.length} color="text-orange-300" />
                <StatChip label="Total links" value={links.length} color="text-white" />
              </div>
              {links.length > 0 && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <LOSChip status="CLEAR" count={losCounts.clear} />
                  <LOSChip status="MARGINAL" count={losCounts.marginal} />
                  <LOSChip status="BLOCKED" count={losCounts.blocked} />
                </div>
              )}
            </div>
          )}

          {/* Carrier mast selection */}
          {carrierMasts.length > 0 && (
            <div className="rounded-2xl border border-orange-400/20 bg-orange-400/5 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">Carrier Uplink · L0</p>
              <p className="text-xs text-slate-400">Closest mast is default. Any other requires explicit confirmation.</p>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {carrierMasts.slice(0, 10).map(m => {
                  const sel = m.id === selectedCarrierId;
                  return (
                    <button key={m.id} type="button"
                      onClick={() => handleSelectCarrier(m.id)}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition ${sel ? "border-orange-400 bg-orange-400/20 text-white" : "border-white/10 bg-slate-950/60 text-slate-300 hover:border-orange-400/40"}`}>
                      <span className="flex items-center justify-between">
                        <span className="font-semibold">#{m.rank} {m.operator}</span>
                        <span>{m.distKm} km</span>
                      </span>
                      {m.name && <span className="block mt-0.5 text-slate-400">{m.name}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add sites manually */}
          {phase === "done" && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Manual Sites</p>
              <Button type="button" variant="outline" size="sm"
                onClick={() => setAddNodeMode(addNodeMode === "L2" ? null : "L2")}
                className={`w-full border-blue-400/40 text-xs h-9 ${addNodeMode === "L2" ? "bg-blue-400/20 text-blue-100" : "bg-slate-950 text-slate-200"}`}>
                <Plus className="mr-2 h-3 w-3" />
                {addNodeMode === "L2" ? "Click map to place site…" : "Add Distribution Site"}
              </Button>
            </div>
          )}

          {/* Color legend */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-3">Layer Legend</p>
            <div className="space-y-1.5 text-xs">
              <LegendRow color={LC.L0} label="L0 · Carrier uplink" dash />
              <LegendRow color={LC.L1} label="L1 · Core backbone" />
              <LegendRow color={LC.relay} label="Relay · Intermediate" />
              <LegendRow color={LC.L2} label="L2 · Distribution" />
              <LegendRow color={LC.L3} label="L3 · Access" />
              <LegendRow color={LC.boundary} label="Property boundary" />
              <div className="pt-1.5 border-t border-white/10 space-y-1">
                <LOSLegendRow status="CLEAR" />
                <LOSLegendRow status="MARGINAL" />
                <LOSLegendRow status="BLOCKED" />
              </div>
            </div>
          </div>

        </aside>

        {/* ═══════════════════════════════ RIGHT COLUMN ══════════════════════ */}
        <main className="space-y-4">

          {/* MAP */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
            <MapView
              className="h-[680px]"
              initialCenter={{ lat: -29.0, lng: 25.0 }}
              initialZoom={5}
              onMapReady={map => {
                mapRef.current = map;

                // Add GeoJSON sources + layers
                map.addSource("lp-boundary", {
                  type: "geojson",
                  data: { type: "Feature", geometry: { type: "Polygon", coordinates: [[]] }, properties: {} },
                });
                map.addLayer({
                  id: "lp-boundary-fill", type: "fill", source: "lp-boundary",
                  paint: { "fill-color": LC.boundary, "fill-opacity": 0.07 },
                });
                map.addLayer({
                  id: "lp-boundary-line", type: "line", source: "lp-boundary",
                  paint: { "line-color": LC.boundary, "line-width": 2 },
                });

                map.addSource("lp-links-solid", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
                map.addLayer({
                  id: "lp-links-solid-line", type: "line", source: "lp-links-solid",
                  paint: { "line-color": ["get", "color"], "line-width": 2.5, "line-opacity": 0.95 },
                });

                map.addSource("lp-links-dashed", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
                map.addLayer({
                  id: "lp-links-dashed-line", type: "line", source: "lp-links-dashed",
                  paint: { "line-color": ["get", "color"], "line-width": 2.5, "line-opacity": 0.85, "line-dasharray": [6, 4] },
                });

                // Double-click link to select it
                map.on("click", "lp-links-solid-line", (e: any) => {
                  const id = e.features?.[0]?.properties?.linkId;
                  if (id) setSelectedLinkId(id);
                });
                map.on("click", "lp-links-dashed-line", (e: any) => {
                  const id = e.features?.[0]?.properties?.linkId;
                  if (id) setSelectedLinkId(id);
                });
                map.on("click", (e: any) => {
                  if (!e.features?.length) return;
                  // deselect if clicking empty map
                });

                // Pointer cursor on hover
                map.on("mouseenter", "lp-links-solid-line", () => { map.getCanvas().style.cursor = "pointer"; });
                map.on("mouseleave", "lp-links-solid-line", () => { map.getCanvas().style.cursor = ""; });
                map.on("mouseenter", "lp-links-dashed-line", () => { map.getCanvas().style.cursor = "pointer"; });
                map.on("mouseleave", "lp-links-dashed-line", () => { map.getCanvas().style.cursor = ""; });

                setMapReady(true);
              }}
            />

            {/* Add mode banner */}
            {addNodeMode && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 rounded-full border border-blue-400/50 bg-slate-950/90 px-5 py-2.5 text-sm text-blue-200 shadow-2xl">
                <MapPin className="inline mr-2 h-4 w-4" />
                Click the map to place a distribution site — press Esc to cancel
              </div>
            )}
          </div>

          {/* Links table */}
          {links.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-cyan-300" />
                <span className="text-sm font-semibold text-white">Network Links</span>
                <span className="ml-auto text-xs text-slate-400">{links.length} links · click to inspect</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.15em] text-slate-500">
                      <th className="pb-2 pr-4">Layer</th>
                      <th className="pb-2 pr-4">Link</th>
                      <th className="pb-2 pr-4">Distance</th>
                      <th className="pb-2 pr-4">LOS</th>
                      <th className="pb-2 pr-4">Fade</th>
                      <th className="pb-2 pr-4">TX AGL</th>
                      <th className="pb-2">RX AGL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {links.map(link => {
                      const override = heightOverrides[link.id];
                      const tx = override?.tx ?? link.aglTx;
                      const rx = override?.rx ?? link.aglRx;
                      const fade = linkFadeMargin(link.distKm);
                      const isSelected = link.id === selectedLinkId;
                      return (
                        <tr key={link.id}
                          onClick={() => setSelectedLinkId(isSelected ? null : link.id)}
                          className={`cursor-pointer transition ${isSelected ? "bg-white/10" : "hover:bg-white/5"}`}>
                          <td className="py-2 pr-4">
                            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: LC[link.layer] }} />
                            <span className="font-mono text-[10px] text-slate-300">{link.layer}</span>
                          </td>
                          <td className="py-2 pr-4 text-white max-w-[180px] truncate" title={link.label}>{link.label}</td>
                          <td className="py-2 pr-4 text-slate-300">{link.distKm} km</td>
                          <td className="py-2 pr-4">
                            <LOSBadge status={link.losStatus} />
                          </td>
                          <td className={`py-2 pr-4 ${fade >= 20 ? "text-emerald-300" : fade >= 10 ? "text-amber-300" : "text-red-300"}`}>{fade} dB</td>
                          <td className="py-2 pr-4 text-slate-400">{tx} m</td>
                          <td className="py-2 text-slate-400">{rx} m</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Selected link detail panel */}
          {selectedLink && (
            <div className="rounded-2xl border border-cyan-400/20 bg-slate-900 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: LC[selectedLink.layer] }} />
                  <span className="font-semibold text-white text-sm">{selectedLink.label}</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-300">{selectedLink.layer}</span>
                  <LOSBadge status={selectedLink.losStatus} />
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => removeLink(selectedLink.id)}
                    className="rounded-lg border border-red-400/30 bg-red-500/10 px-2 py-1 text-xs text-red-300 hover:bg-red-500/20">
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={() => setSelectedLinkId(null)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 hover:bg-white/10">
                    Close
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 text-xs">
                <MetricTile label="Distance" value={`${selectedLink.distKm} km`} />
                <MetricTile label="Fade margin" value={`${linkFadeMargin(selectedLink.distKm)} dB`}
                  valueClass={linkFadeMargin(selectedLink.distKm) >= 20 ? "text-emerald-300" : "text-amber-300"} />
                <MetricTile label="Bearing" value={`${Math.round(calculateBearingDeg(selectedLink.fromPt, selectedLink.toPt))}°`} />
                <MetricTile label="Frequency" value="5.8 GHz" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-cyan-300 mb-2">TX Height AGL (m)</p>
                  <input type="number" min={1} max={150}
                    value={selectedLinkOverride?.tx ?? selectedLink.aglTx}
                    onChange={e => applyHeightOverride(selectedLink.id, Number(e.target.value), selectedLinkOverride?.rx ?? selectedLink.aglRx)}
                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2" />
                  <p className="mt-1 text-[10px] text-slate-500">Default {DEFAULT_AGL[selectedLink.layer]} m · planner override</p>
                </div>
                <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-cyan-300 mb-2">RX Height AGL (m)</p>
                  <input type="number" min={1} max={150}
                    value={selectedLinkOverride?.rx ?? selectedLink.aglRx}
                    onChange={e => applyHeightOverride(selectedLink.id, selectedLinkOverride?.tx ?? selectedLink.aglTx, Number(e.target.value))}
                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2" />
                  <p className="mt-1 text-[10px] text-slate-500">Default {DEFAULT_AGL[selectedLink.layer]} m · planner override</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-xs">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Equipment</p>
                <p className="text-slate-300">Assign Cambium model — planner decision. See link layer and distance above.</p>
              </div>
            </div>
          )}

        </main>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2">
      <div className={`text-base font-semibold ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
    </div>
  );
}

function LOSChip({ status, count }: { status: LosStatus; count: number }) {
  const cfg: Record<string, { bg: string; text: string; icon: ReactNode }> = {
    CLEAR: { bg: "bg-emerald-400/10 border-emerald-400/30", text: "text-emerald-300", icon: <CheckCircle2 className="h-3 w-3" /> },
    MARGINAL: { bg: "bg-amber-400/10 border-amber-400/30", text: "text-amber-300", icon: <AlertTriangle className="h-3 w-3" /> },
    BLOCKED: { bg: "bg-red-400/10 border-red-400/30", text: "text-red-300", icon: <XCircle className="h-3 w-3" /> },
    PENDING: { bg: "bg-slate-800 border-slate-700", text: "text-slate-400", icon: <Clock className="h-3 w-3" /> },
  };
  const c = cfg[status];
  return (
    <div className={`flex flex-col items-center rounded-xl border px-2 py-2 ${c.bg}`}>
      <span className={`flex items-center gap-1 font-bold text-sm ${c.text}`}>{c.icon}{count}</span>
      <span className={`text-[10px] ${c.text}`}>{status}</span>
    </div>
  );
}

function LOSBadge({ status }: { status: LosStatus }) {
  if (status === "CLEAR") return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-400/30"><CheckCircle2 className="h-2.5 w-2.5" />CLEAR</span>;
  if (status === "MARGINAL") return <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-400/30"><AlertTriangle className="h-2.5 w-2.5" />MARGINAL</span>;
  if (status === "BLOCKED") return <span className="inline-flex items-center gap-1 rounded-full bg-red-400/10 px-2 py-0.5 text-[10px] font-semibold text-red-300 border border-red-400/30"><XCircle className="h-2.5 w-2.5" />BLOCKED</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-slate-700 px-2 py-0.5 text-[10px] text-slate-400"><Clock className="h-2.5 w-2.5 animate-spin" />PENDING</span>;
}

function LegendRow({ color, label, dash }: { color: string; label: string; dash?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 text-slate-300">
      <div className="w-8 h-0 border-t-2 flex-shrink-0" style={{ borderColor: color, borderStyle: dash ? "dashed" : "solid" }} />
      <span>{label}</span>
    </div>
  );
}

function LOSLegendRow({ status }: { status: "CLEAR" | "MARGINAL" | "BLOCKED" }) {
  const cfg = { CLEAR: ["#22C55E", "CLEAR — LOS confirmed"], MARGINAL: ["#F59E0B", "MARGINAL — borderline clearance"], BLOCKED: ["#EF4444", "BLOCKED — obstruction present"] };
  const [color, label] = cfg[status];
  return (
    <div className="flex items-center gap-2.5 text-slate-300">
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}

function MetricTile({ label, value, valueClass = "text-white" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-1 font-semibold text-sm ${valueClass}`}>{value}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED HELPERS — consumed by boundary tests and report integration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a complete PlannerState from a property name and coordinate by running
 * the full GIS auto-scan pipeline (boundary, high sites, masts, LOS).
 */
export async function createContinuousPlannerState(
  propertyName: string,
  origin: GisCoordinate,
): Promise<PlannerState> {
  const scan = await buildGisAutoScanWithApis(origin, { propertyName });
  if (!scan) {
    return {
      propertyName,
      propertyCentre: origin,
      boundaryPolygon: null,
      boundaryAreaHa: 0,
      highSites: [],
      masts: [],
      selectedMastIndex: null,
      links: [],
      facilities: [],
      layerVis: { ...DEFAULT_PLANNER_LAYER_VISIBILITY },
      recommendationSummary: "GIS scan returned no results.",
    };
  }
  return buildPlannerStateFromGisScan({ propertyName, scan });
}

/**
 * Collect the boundary-first viewport points for map fitting.
 * Includes boundary polygon, nearby high sites, non-hidden masts,
 * visible facilities, and link endpoints — excludes remote/hidden clutter.
 */
export function getBoundaryFirstViewportPoints(state: PlannerState): {
  boundary: GisCoordinate[] | null;
  context: GisCoordinate[];
} {
  const boundary = state.boundaryPolygon ?? null;
  const context: GisCoordinate[] = [...(boundary ?? [])];

  // Include inside + nearby high sites (exclude remote)
  for (const hs of state.highSites) {
    if (hs.category === "remote") continue;
    context.push({ lat: hs.lat, lng: hs.lng });
  }

  // Include non-hidden masts
  for (const mast of state.masts) {
    if (mast.hiddenByDefault) continue;
    context.push({ lat: mast.lat, lng: mast.lng });
  }

  // Include facilities only if the facilities layer is visible
  if (state.layerVis.facilities) {
    for (const fac of state.facilities) {
      context.push({ lat: fac.lat, lng: fac.lng });
    }
  }

  // Include link endpoints for viable links
  for (const link of state.links) {
    if (!link.viable) continue;
    context.push(link.path[0]);
    context.push(link.path[1]);
  }

  return { boundary, context };
}

/**
 * Recalculate LOS status for all links based on endpoint antenna heights.
 * Uses a simplified deterministic model: if both endpoints have sufficient
 * antenna height to clear the terrain profile, LOS is confirmed.
 */
export function recalculatePlannerLinks(state: PlannerState): PlannerState {
  const mastById = new Map(state.masts.map((m) => [m.id, m]));
  const hsById = new Map(state.highSites.map((hs) => [hs.id, hs]));

  const updatedLinks = state.links.map((link) => {
    if (!link.elevationProfile || link.elevationProfile.length < 3) return link;

    // Resolve antenna heights from endpoints
    const fromMast = mastById.get(link.fromId);
    const fromHs = hsById.get(link.fromId);
    const toMast = mastById.get(link.toId);
    const toHs = hsById.get(link.toId);

    const txHeight = fromMast?.antennaHeightM ?? fromHs?.antennaHeightM ?? (fromMast ? DEFAULT_CARRIER_MAST_HEIGHT_M : DEFAULT_HIGH_SITE_ANTENNA_HEIGHT_M);
    const rxHeight = toMast?.antennaHeightM ?? toHs?.antennaHeightM ?? (toMast ? DEFAULT_CARRIER_MAST_HEIGHT_M : DEFAULT_HIGH_SITE_ANTENNA_HEIGHT_M);

    const profile = link.elevationProfile;
    const startEl = profile[0] + txHeight;
    const endEl = profile[profile.length - 1] + rxHeight;
    const n = profile.length;

    let worstMargin = Infinity;
    for (let i = 1; i < n - 1; i++) {
      const frac = i / (n - 1);
      const lineOfSightEl = startEl + (endEl - startEl) * frac;
      const margin = lineOfSightEl - profile[i];
      if (margin < worstMargin) worstMargin = margin;
    }

    let losStatus: "confirmed" | "marginal" | "blocked" | "unknown";
    if (worstMargin >= 10) losStatus = "confirmed";
    else if (worstMargin >= 0) losStatus = "marginal";
    else losStatus = "blocked";

    return {
      ...link,
      losStatus,
      terrainMarginMeters: Math.round(worstMargin * 10) / 10 >= 10 ? 10 : link.terrainMarginMeters,
    };
  });

  return { ...state, links: updatedLinks };
}

/**
 * Create a Facility from a map-click event.
 */
export function createFacilityFromMapClick(input: {
  type: FacilityType;
  name: string;
  coordinate: GisCoordinate;
  existingCount: number;
  timestamp: number;
}): Facility {
  return {
    id: `facility-${input.timestamp}-${input.existingCount + 1}`,
    type: input.type,
    name: input.name.trim(),
    lat: Number(input.coordinate.lat.toFixed(6)),
    lng: Number(input.coordinate.lng.toFixed(6)),
  };
}

/**
 * Generate a 5-sentence route-decision explanation for the report.
 */
export function buildRouteDecisionExplanation(state: PlannerState, thresholdKm: number): string {
  const selectedMast = state.masts.find((m) => m.selected) ?? state.masts[0];
  const mastName = selectedMast?.name ?? "carrier mast";
  const primaryRelay = state.highSites.find((hs) => hs.category === "inside") ?? state.highSites[0];
  const relayName = primaryRelay?.name ?? "primary relay";
  const uplinkCount = state.links.filter((l) => l.type === "uplink").length;
  const backboneCount = state.links.filter((l) => l.type === "backbone").length;

  const s1 = `The selected backhaul carrier is ${mastName}, chosen as the ${uplinkCount > 0 ? "closest viable" : "default"} provider mast for uplink connectivity.`;
  const s2 = `${relayName} serves as the primary relay terminus connecting the backbone network to the carrier uplink path.`;
  const s3 = `The topology uses a 20-point Open-Meteo elevation profile to validate each of the ${backboneCount + uplinkCount} planned link segments.`;
  const s4 = `Links exceeding the ${thresholdKm} km field-validation threshold require on-site LOS confirmation before procurement.`;
  const s5 = `A field survey is recommended to confirm marginal clearance paths and finalise equipment specifications.`;

  return `${s1} ${s2} ${s3} ${s4} ${s5}`;
}

/**
 * Fit a Google Maps instance to the boundary-first viewport context.
 * Returns true if bounds were applied, false otherwise.
 */
export function fitPlannerMapToState(
  map: google.maps.Map | null,
  state: PlannerState,
  padding: number,
): boolean {
  if (!map || !window.google?.maps) return false;
  const { context } = getBoundaryFirstViewportPoints(state);
  if (!context.length) return false;

  const bounds = new window.google.maps.LatLngBounds();
  context.forEach((pt) => bounds.extend(pt));
  map.fitBounds(bounds, padding);
  return true;
}
