/**
 * CTTX Link Planner — Professional RF Network Planning Tool
 * ─────────────────────────────────────────────────────────────
 * Features:
 * 1. Location search with property boundary display
 * 2. Structure auto-identification (Overpass API)
 * 3. High site identification (Open-Meteo elevation)
 * 4. Carrier tower integration (Overpass + manual)
 * 5. Automated topology generation (MST backbone + nearest-neighbour)
 * 6. LOS/Fresnel elevation profile visualization
 * 7. Manual editing (add/remove links, place facilities, adjust thresholds)
 * 8. Coordinate display with elevation & link metrics
 * 9. Save/Load planner state (tRPC persistence)
 * 10. Report export (HTML topology report)
 */

import { MapView } from "@/components/Map";
import { Button } from "@/components/ui/button";
import { calculateBearingDeg, calculateDistanceKm, type GisCoordinate } from "@/lib/gisAutoScan";
import {
  buildPlannerStateFromGisScan,
  DEFAULT_HIGH_SITE_ANTENNA_HEIGHT_M,
  DEFAULT_CARRIER_MAST_HEIGHT_M,
  DEFAULT_PLANNER_LAYER_VISIBILITY,
  FACILITY_TYPES,
  PLANNER_FACILITY_OPTIONS,
  type Facility,
  type FacilityType,
  type HighSite,
  type Mast,
  type NetworkLink,
  type PlannerState,
  type SerializedPlannerTopology,
} from "@/lib/plannerTypes";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Layers3,
  MapPin,
  Mountain,
  Plus,
  Radio,
  Save,
  Search,
  Settings2,
  Trash2,
  Upload,
  XCircle,
  Zap,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const NOMINATIM_COUNTRIES = "za,zw,bw,na,mz,sz,ls";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const OPEN_METEO_ELEVATION = "https://api.open-meteo.com/v1/elevation";

// Layer colors
const LC: Record<string, string> = {
  L0: "#F97316",    // orange  — carrier uplink
  L1: "#FFFFFF",    // white   — core backbone
  relay: "#A855F7", // purple  — relay link
  L2: "#3B82F6",    // blue    — distribution
  L3: "#22D3EE",    // cyan    — access
  boundary: "#FFE600", // yellow — property boundary
  hs: "#22C55E",    // green   — high site triangles
  facility: "#F59E0B", // amber — facilities
};

// Default AGL heights (planner-overridable per link)
const DEFAULT_AGL: Record<string, number> = {
  L0: 18, L1: 18, relay: 9, L2: 6, L3: 6,
};

const ELEV_SPACING_KM = 0.5;
const ELEV_BATCH = 100;
const LOS_SPACING_KM = 0.15;
const CARRIER_RADIUS_M = 15_000;
const FREQ_GHZ = 5.8;
const FRESNEL_MIN_PCT = 60;
const MARGINAL_DEFICIT_M = 5;
const MAX_LINKS_PER_NODE = 6;

const MIN_VIABLE_LINK_THRESHOLD_KM = 5;
const MAX_VIABLE_LINK_THRESHOLD_KM = 30;
const DEFAULT_VIABLE_LINK_THRESHOLD_KM = 15;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Coord = GisCoordinate;
type LosStatus = "CLEAR" | "MARGINAL" | "BLOCKED" | "PENDING";
type Layer = "L0" | "L1" | "relay" | "L2" | "L3";

type HSNode = {
  id: string; lat: number; lng: number; elevation: number;
  rank: number; label: string;
};

type DistribNode = {
  id: string; lat: number; lng: number; elevation: number | null;
  name: string; osmType: string;
};

type CarrierNode = {
  id: string; lat: number; lng: number; operator: string;
  name: string | null; rank: number; distKm: number;
  elevation?: number;
};

type NetLink = {
  id: string; layer: Layer;
  fromId: string; toId: string; label: string;
  fromPt: Coord; toPt: Coord;
  distKm: number; losStatus: LosStatus;
  aglTx: number; aglRx: number; dashed: boolean;
  elevationProfile?: number[];
};

type NomResult = {
  place_id: number; osm_type: string; osm_id: number;
  display_name: string; lat: string; lon: string;
};

type BuildPhase =
  | "idle" | "boundary" | "elevation" | "highsites"
  | "distribution" | "carrier" | "topology" | "los" | "done";

type PlacementMode = FacilityType | "carrier" | null;

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

function linkFadeMargin(distKm: number): number {
  const pl = 92.45 + 20 * Math.log10(Math.max(distKm, 0.1)) + 20 * Math.log10(FREQ_GHZ);
  return Number((24 + 30 * 2 - pl + 76).toFixed(1));
}

function estimateAreaHa(poly: Coord[]): number {
  if (poly.length < 3) return 0;
  const meanLat = poly.reduce((t, p) => t + p.lat, 0) / poly.length;
  const mPerLat = 111320;
  const mPerLng = Math.cos((meanLat * Math.PI) / 180) * 111320;
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    area += poly[i].lng * mPerLng * poly[j].lat * mPerLat;
    area -= poly[j].lng * mPerLng * poly[i].lat * mPerLat;
  }
  return Math.round(Math.abs(area) / 2 / 10000);
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
  // Cap grid size to avoid excessive API calls
  const maxPts = 400;
  const actualRows = Math.min(rows, Math.floor(Math.sqrt(maxPts)));
  const actualCols = Math.min(cols, Math.floor(Math.sqrt(maxPts)));
  const pts: ElevGrid[] = [];
  for (let r = 0; r <= actualRows; r++) {
    for (let c = 0; c <= actualCols; c++) {
      const lat = Number((bbox.s + ((bbox.n - bbox.s) * r) / actualRows).toFixed(6));
      const lng = Number((bbox.w + ((bbox.e - bbox.w) * c) / actualCols).toFixed(6));
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

  const maxima: ElevGrid[] = [];
  for (const pt of grid) {
    if ((pt.elevation - minE) / range < 0.25) continue;
    const neighbours = grid.filter(g =>
      Math.abs(g.row - pt.row) <= 1 && Math.abs(g.col - pt.col) <= 1 && g !== pt
    );
    if (!neighbours.length || neighbours.every(n => pt.elevation >= n.elevation)) {
      maxima.push(pt);
    }
  }

  // Deduplicate peaks that are too close together (< 500m)
  const deduped: ElevGrid[] = [];
  for (const pt of (maxima.length ? maxima : grid.sort((a, b) => b.elevation - a.elevation).slice(0, 20))) {
    const tooClose = deduped.some(d => calculateDistanceKm(d, pt) < 0.5);
    if (!tooClose) deduped.push(pt);
  }

  return deduped
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
      label: `HS-${i + 1} (${pt.elevation}m)`,
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
  node["amenity"~"fuel|water_point|restaurant|community_centre|parking"](${b.s},${b.w},${b.n},${b.e});
  node["building"~"barn|house|farm|yes|commercial|industrial"](${b.s},${b.w},${b.n},${b.e});
  node["man_made"~"water_tower|water_well|pumping_station|tower|surveillance"](${b.s},${b.w},${b.n},${b.e});
  node["barrier"~"gate|toll_booth|entrance"](${b.s},${b.w},${b.n},${b.e});
  node["landuse"="farmyard"](${b.s},${b.w},${b.n},${b.e});
  way["building"](${b.s},${b.w},${b.n},${b.e});
  way["barrier"="gate"](${b.s},${b.w},${b.n},${b.e});
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
    const osmType = tags.tourism ?? tags.amenity ?? tags.building ?? tags.man_made ?? tags.barrier ?? el.type;
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
  node["telecom"="exchange"](around:${CARRIER_RADIUS_M},${centre.lat},${centre.lng});
  node["communication:mobile_phone"="yes"](around:${CARRIER_RADIUS_M},${centre.lat},${centre.lng});
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

function buildMstBackbone(nodes: HSNode[], maxDistKm: number): NetLink[] {
  if (nodes.length < 2) return [];
  const edges: { from: HSNode; to: HSNode; dist: number }[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dist = calculateDistanceKm(nodes[i], nodes[j]);
      if (dist <= maxDistKm) {
        edges.push({ from: nodes[i], to: nodes[j], dist });
      }
    }
  }
  edges.sort((a, b) => a.dist - b.dist);
  const parent = new Map<string, string>(nodes.map(n => [n.id, n.id]));
  function find(id: string): string {
    if (parent.get(id) !== id) parent.set(id, find(parent.get(id)!));
    return parent.get(id)!;
  }
  const links: NetLink[] = [];
  for (const e of edges) {
    if (find(e.from.id) === find(e.to.id)) continue;
    parent.set(find(e.from.id), find(e.to.id));
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
    if (links.length === nodes.length - 1) break;
  }
  return links;
}

function buildDistribLinks(distribNodes: DistribNode[], hsNodes: HSNode[], maxDistKm: number): NetLink[] {
  if (!hsNodes.length) return [];
  // Track link count per node to respect MAX_LINKS_PER_NODE
  const linkCount = new Map<string, number>();
  hsNodes.forEach(hs => linkCount.set(hs.id, 0));

  return distribNodes
    .map(d => {
      // Find nearest HS that hasn't exceeded max links
      const candidates = hsNodes
        .filter(hs => (linkCount.get(hs.id) ?? 0) < MAX_LINKS_PER_NODE)
        .map(hs => ({ hs, dist: calculateDistanceKm(d, hs) }))
        .filter(c => c.dist <= maxDistKm)
        .sort((a, b) => a.dist - b.dist);

      const best = candidates[0];
      if (!best) return null;

      linkCount.set(best.hs.id, (linkCount.get(best.hs.id) ?? 0) + 1);
      return {
        id: `L2-${best.hs.id}-${d.id}`,
        layer: "L2" as Layer,
        fromId: best.hs.id, toId: d.id,
        label: `${best.hs.label} → ${d.name}`,
        fromPt: { lat: best.hs.lat, lng: best.hs.lng },
        toPt: { lat: d.lat, lng: d.lng },
        distKm: r2(best.dist),
        losStatus: "PENDING" as LosStatus,
        aglTx: DEFAULT_AGL.L1, aglRx: DEFAULT_AGL.L2, dashed: false,
      };
    })
    .filter(Boolean) as NetLink[];
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
    aglTx: DEFAULT_AGL.L0, aglRx: DEFAULT_AGL.L1, dashed: true,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LOS / FRESNEL ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

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
  grid?: ElevGrid[],
): Promise<{ status: LosStatus; profile: number[] }> {
  const totalKm = calculateDistanceKm(link.fromPt, link.toPt);
  const intervals = Math.max(2, Math.ceil(totalKm / LOS_SPACING_KM));
  // Cap intervals for performance
  const actualIntervals = Math.min(intervals, 50);
  const pts: Coord[] = Array.from({ length: actualIntervals + 1 }, (_, i) => ({
    lat: link.fromPt.lat + (link.toPt.lat - link.fromPt.lat) * (i / actualIntervals),
    lng: link.fromPt.lng + (link.toPt.lng - link.fromPt.lng) * (i / actualIntervals),
  }));

  let elevs: number[];
  if (grid && grid.length) {
    elevs = pts.map(p => interpolateElevFromGrid(p, grid));
  } else {
    try {
      elevs = await batchElevation(pts, signal);
    } catch {
      return { status: "PENDING", profile: [] };
    }
  }
  if (signal.aborted) return { status: "PENDING", profile: [] };

  const startEl = (elevs[0] ?? 0) + aglTx;
  const endEl = (elevs[elevs.length - 1] ?? 0) + aglRx;
  let worstClearance = Infinity;

  for (let i = 1; i < pts.length - 1; i++) {
    const frac = i / actualIntervals;
    const d1 = totalKm * frac, d2 = totalKm * (1 - frac);
    const signalEl = startEl + (endEl - startEl) * frac;
    const fz = fresnelRadius(d1, d2, totalKm);
    const req = signalEl - fz * (FRESNEL_MIN_PCT / 100);
    const clearance = req - (elevs[i] ?? 0);
    if (clearance < worstClearance) worstClearance = clearance;
  }

  let status: LosStatus;
  if (worstClearance >= 0) status = "CLEAR";
  else if (Math.abs(worstClearance) <= MARGINAL_DEFICIT_M) status = "MARGINAL";
  else status = "BLOCKED";

  return { status, profile: elevs };
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
// REPORT GENERATION
// ─────────────────────────────────────────────────────────────────────────────

function generateReportHtml(opts: {
  propertyName: string;
  boundary: Coord[];
  hsNodes: HSNode[];
  distribNodes: DistribNode[];
  carrierMasts: CarrierNode[];
  links: NetLink[];
  thresholdKm: number;
  facilities: Array<{ name: string; type: FacilityType; lat: number; lng: number }>;
}): string {
  const { propertyName, boundary, hsNodes, distribNodes, carrierMasts, links, thresholdKm, facilities } = opts;
  const clearLinks = links.filter(l => l.losStatus === "CLEAR");
  const blockedLinks = links.filter(l => l.losStatus === "BLOCKED");
  const totalDist = links.reduce((s, l) => s + l.distKm, 0).toFixed(1);
  const weakestFade = links.length ? Math.min(...links.map(l => linkFadeMargin(l.distKm))).toFixed(1) : "N/A";
  const areaHa = estimateAreaHa(boundary);

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>CTTX Link Planner Report — ${propertyName}</title>
<style>
body{font-family:'Segoe UI',system-ui,sans-serif;margin:0;padding:40px;background:#0f172a;color:#e2e8f0;line-height:1.6}
h1{color:#22d3ee;border-bottom:2px solid #22d3ee40;padding-bottom:12px}
h2{color:#f8fafc;margin-top:32px}
table{width:100%;border-collapse:collapse;margin:16px 0;font-size:13px}
th{background:#1e293b;color:#94a3b8;text-align:left;padding:10px 12px;text-transform:uppercase;font-size:11px;letter-spacing:0.05em}
td{padding:8px 12px;border-bottom:1px solid #1e293b}
.clear{color:#22c55e} .marginal{color:#f59e0b} .blocked{color:#ef4444}
.metric{display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:12px 20px;margin:6px;text-align:center}
.metric-value{font-size:24px;font-weight:700;color:#fff}
.metric-label{font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em}
.footer{margin-top:48px;padding-top:16px;border-top:1px solid #334155;font-size:12px;color:#64748b}
</style></head><body>
<h1>CTTX Link Planner — ${propertyName}</h1>
<p>Generated: ${new Date().toISOString().split("T")[0]} · Viable-link threshold: ${thresholdKm} km</p>

<div style="display:flex;flex-wrap:wrap;gap:8px;margin:24px 0">
<div class="metric"><div class="metric-value">${hsNodes.length}</div><div class="metric-label">High Sites</div></div>
<div class="metric"><div class="metric-value">${distribNodes.length}</div><div class="metric-label">Structures</div></div>
<div class="metric"><div class="metric-value">${carrierMasts.length}</div><div class="metric-label">Carrier Towers</div></div>
<div class="metric"><div class="metric-value">${links.length}</div><div class="metric-label">Total Links</div></div>
<div class="metric"><div class="metric-value">${totalDist} km</div><div class="metric-label">Total Distance</div></div>
<div class="metric"><div class="metric-value">${weakestFade} dB</div><div class="metric-label">Weakest Fade</div></div>
<div class="metric"><div class="metric-value">${areaHa} ha</div><div class="metric-label">Property Area</div></div>
</div>

<h2>High Sites (Relay Candidates)</h2>
<table><thead><tr><th>Rank</th><th>Label</th><th>Latitude</th><th>Longitude</th><th>Elevation (m ASL)</th></tr></thead><tbody>
${hsNodes.map(hs => `<tr><td>${hs.rank}</td><td>${hs.label}</td><td>${hs.lat.toFixed(6)}</td><td>${hs.lng.toFixed(6)}</td><td>${hs.elevation}</td></tr>`).join("")}
</tbody></table>

<h2>Carrier Towers</h2>
<table><thead><tr><th>Rank</th><th>Operator</th><th>Name</th><th>Distance</th><th>Latitude</th><th>Longitude</th></tr></thead><tbody>
${carrierMasts.map(m => `<tr><td>${m.rank}</td><td>${m.operator}</td><td>${m.name ?? "—"}</td><td>${m.distKm} km</td><td>${m.lat.toFixed(6)}</td><td>${m.lng.toFixed(6)}</td></tr>`).join("")}
</tbody></table>

<h2>Network Links</h2>
<table><thead><tr><th>Layer</th><th>Path</th><th>Distance</th><th>LOS</th><th>Fade Margin</th><th>Bearing</th></tr></thead><tbody>
${links.map(l => {
  const fade = linkFadeMargin(l.distKm);
  const bearing = Math.round(calculateBearingDeg(l.fromPt, l.toPt));
  const cls = l.losStatus === "CLEAR" ? "clear" : l.losStatus === "MARGINAL" ? "marginal" : l.losStatus === "BLOCKED" ? "blocked" : "";
  return `<tr><td>${l.layer}</td><td>${l.label}</td><td>${l.distKm} km</td><td class="${cls}">${l.losStatus}</td><td>${fade} dB</td><td>${bearing}°</td></tr>`;
}).join("")}
</tbody></table>

${facilities.length ? `<h2>Facilities</h2>
<table><thead><tr><th>Name</th><th>Type</th><th>Latitude</th><th>Longitude</th></tr></thead><tbody>
${facilities.map(f => `<tr><td>${f.name}</td><td>${FACILITY_TYPES[f.type]?.label ?? f.type}</td><td>${f.lat.toFixed(6)}</td><td>${f.lng.toFixed(6)}</td></tr>`).join("")}
</tbody></table>` : ""}

<h2>LOS Summary</h2>
<p><span class="clear">CLEAR: ${clearLinks.length}</span> · <span class="marginal">MARGINAL: ${links.filter(l => l.losStatus === "MARGINAL").length}</span> · <span class="blocked">BLOCKED: ${blockedLinks.length}</span> · PENDING: ${links.filter(l => l.losStatus === "PENDING").length}</p>

<h2>Route Decision</h2>
<p>The topology uses a Minimum Spanning Tree (MST) backbone connecting ${hsNodes.length} high sites, with nearest-neighbour distribution links to ${distribNodes.length} structures. 
${carrierMasts.length ? `The nearest carrier tower (${carrierMasts[0]?.operator} at ${carrierMasts[0]?.distKm} km) provides the L0 uplink.` : "No carrier towers found within range."}
Links exceeding ${thresholdKm} km require field validation. A site survey is recommended to confirm Fresnel clearance and finalise equipment specifications.</p>

<div class="footer">
<p><strong>CTTX Infrastructure Intelligence</strong> · Carrier-grade wireless network design</p>
<p>This report is a planning document. Field validation required before construction.</p>
</div>
</body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<BuildPhase, string> = {
  idle: "", boundary: "Loading property boundary…",
  elevation: "Scanning terrain elevation…",
  highsites: "Ranking high-site candidates…",
  distribution: "Discovering structures (OSM)…",
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
  const [facilities, setFacilities] = useState<Array<{ id: string; name: string; type: FacilityType; lat: number; lng: number }>>([]);

  // ── Planner overrides
  const [heightOverrides, setHeightOverrides] = useState<Record<string, { tx: number; rx: number }>>({});
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [thresholdKm, setThresholdKm] = useState(DEFAULT_VIABLE_LINK_THRESHOLD_KM);

  // ── Elevation profile panel
  const [profileLink, setProfileLink] = useState<NetLink | null>(null);

  // ── Map
  const [mapReady, setMapReady] = useState(false);
  const [placementMode, setPlacementMode] = useState<PlacementMode>(null);

  // ── Save/Load
  const [planName, setPlanName] = useState("CTTX LOS Backbone Draft");
  const [lastSavedId, setLastSavedId] = useState<number | null>(null);
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [showLoadPanel, setShowLoadPanel] = useState(false);

  // ── Refs
  const mapRef = useRef<any>(null);
  const overlayRefs = useRef<Array<{ remove(): void }>>([]);
  const buildAbortRef = useRef<AbortController | null>(null);
  const nameAbortRef = useRef<AbortController | null>(null);
  const skipSearchRef = useRef(false);
  const elevGridRef = useRef<ElevGrid[]>([]);

  // ── tRPC mutations
  const createPlanMutation = trpc.linkPlans.create.useMutation({
    onSuccess: (data) => {
      setLastSavedId(data.id);
      toast.success(`Plan saved (ID: ${data.id})`);
    },
    onError: (err) => toast.error(`Save failed: ${err.message}`),
  });
  const updatePlanMutation = trpc.linkPlans.update.useMutation({
    onSuccess: () => toast.success("Plan updated"),
    onError: (err) => toast.error(`Update failed: ${err.message}`),
  });
  const savedPlans = trpc.linkPlans.list.useQuery({ limit: 20 }, { enabled: showLoadPanel });

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
    skipSearchRef.current = true;
    setPropertyName(name);
    setNameResults([]);
    setIsSearching(false);
    try {
      const ctrl = new AbortController();
      const poly = await fetchBoundaryPolygon(result.osm_type, result.osm_id, ctrl.signal);
      if (poly.length >= 3) {
        setBoundary(poly);
        fitToBoundary(mapRef.current, poly);
        toast.success(`${name} — boundary loaded (${poly.length} vertices). Press Plan Network to build topology.`);
      } else {
        const lat = Number(result.lat), lng = Number(result.lon);
        const d = 0.045;
        const synthPoly: Coord[] = [
          { lat: lat + d, lng: lng - d }, { lat: lat + d, lng: lng + d },
          { lat: lat - d, lng: lng + d }, { lat: lat - d, lng: lng - d },
        ];
        setBoundary(synthPoly);
        fitToBoundary(mapRef.current, synthPoly);
        toast.info(`${name} — no OSM polygon found. Planning within ~10 km reference area.`);
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

    setHsNodes([]); setDistribNodes([]); setCarrierMasts([]); setLinks([]);
    setSelectedLinkId(null); setProfileLink(null); setFacilities([]);

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
        toast.error("No property boundary available. Search and select a property first.");
        setPhase("idle"); return;
      }

      // Step 2 — elevation grid
      setPhase("elevation");
      let grid: ElevGrid[] = [];
      try {
        grid = await fetchElevationGrid(poly, abort.signal);
        elevGridRef.current = grid;
      } catch (elevErr) {
        const elevMsg = elevErr instanceof Error ? elevErr.message : "";
        if (elevMsg.includes("429")) {
          toast.error("Elevation API rate-limited. Wait 30s then retry.", { duration: 8000 });
          setPhase("idle"); return;
        }
        toast.warning("Elevation fetch failed — high-site detection will use boundary only.");
      }
      if (abort.signal.aborted) return;

      // Step 3 — high sites
      setPhase("highsites");
      const hs = detectHighSites(grid, poly);
      setHsNodes(hs);
      if (abort.signal.aborted) return;
      if (!hs.length) { toast.warning("No elevation peaks found within boundary."); }

      // Step 4 — distribution sites (OSM)
      setPhase("distribution");
      let distrib: DistribNode[] = [];
      try {
        distrib = await fetchDistribSites(poly, abort.signal);
        if (abort.signal.aborted) return;
        // Get elevations for distribution sites
        if (distrib.length && grid.length) {
          distrib = distrib.map(d => ({
            ...d,
            elevation: interpolateElevFromGrid(d, grid),
          }));
        }
        setDistribNodes(distrib);
        if (!distrib.length) toast.info("No OSM structures found. Add sites manually.");
      } catch { toast.warning("OSM structure query failed — add sites manually."); }

      // Step 5 — carrier masts
      setPhase("carrier");
      const centre = centroidOf(poly);
      let masts: CarrierNode[] = [];
      try {
        masts = await fetchCarrierMasts(centre, abort.signal);
        if (abort.signal.aborted) return;
        setCarrierMasts(masts);
        setSelectedCarrierId(masts[0]?.id ?? null);
      } catch { toast.warning("Carrier mast discovery failed."); }

      // Fallback L0
      if (!masts.length && hs.length) {
        const bbox = bboxOf(poly);
        const synthLat = bbox.n + 0.11;
        const synthCarrier: CarrierNode = {
          id: "L0-synth", lat: synthLat, lng: centre.lng,
          operator: "SP Carrier", name: "Nearest carrier (inferred)",
          rank: 1, distKm: r2(calculateDistanceKm({ lat: synthLat, lng: centre.lng }, centre)),
        };
        masts = [synthCarrier];
        setCarrierMasts(masts);
        setSelectedCarrierId(synthCarrier.id);
        toast.info("No carrier masts found — L0 uplink inferred 12 km north.");
      }

      // Step 6 — build topology
      setPhase("topology");
      const carrier = masts.find(m => m.id === (selectedCarrierId ?? masts[0]?.id)) ?? masts[0] ?? null;
      const topoLinks: NetLink[] = [
        ...buildMstBackbone(hs, thresholdKm),
        ...buildDistribLinks(distrib, hs, thresholdKm),
        ...(carrier ? [buildUplinkLink(carrier, hs)].filter(Boolean) as NetLink[] : []),
      ];
      setLinks(topoLinks);
      if (abort.signal.aborted) return;
      fitToBoundary(mapRef.current, poly);

      // Step 7 — LOS calculation
      setPhase("los");
      const updatedLinks = [...topoLinks];
      // Process in batches of 5 to avoid rate limits
      for (let i = 0; i < topoLinks.length; i += 5) {
        const batch = topoLinks.slice(i, i + 5);
        await Promise.all(batch.map(async (link, batchIdx) => {
          const idx = i + batchIdx;
          try {
            const override = heightOverrides[link.id];
            const aglTx = override?.tx ?? link.aglTx;
            const aglRx = override?.rx ?? link.aglRx;
            const { status, profile } = await calcLinkLos(link, aglTx, aglRx, abort.signal, grid);
            if (abort.signal.aborted) return;
            updatedLinks[idx] = { ...link, losStatus: status, elevationProfile: profile };
            setLinks([...updatedLinks]);
          } catch { /* keep PENDING */ }
        }));
        if (abort.signal.aborted) return;
      }

      setPhase("done");
      const clearCount = updatedLinks.filter(l => l.losStatus === "CLEAR").length;
      const blockedCount = updatedLinks.filter(l => l.losStatus === "BLOCKED").length;
      toast.success(`Topology built — ${topoLinks.length} links · ${clearCount} CLEAR · ${blockedCount} BLOCKED`);

    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Network build failed.";
      if (msg.includes("429")) {
        toast.error("API rate-limited. Wait 30 seconds then retry.", { duration: 8000 });
      } else {
        toast.error(msg);
      }
      setPhase("idle");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MANUAL PLACEMENT (click-to-add)
  // ─────────────────────────────────────────────────────────────────────────

  const clickHandlerRef = useRef<((e: any) => void) | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (clickHandlerRef.current) { map.off("click", clickHandlerRef.current); clickHandlerRef.current = null; }
    if (!placementMode) return;

    const handler = (e: any) => {
      const coord: Coord = { lat: Number(e.lngLat.lat.toFixed(6)), lng: Number(e.lngLat.lng.toFixed(6)) };

      if (placementMode === "carrier") {
        const name = window.prompt("Carrier tower name:", `Manual Tower ${carrierMasts.length + 1}`) ?? `Manual Tower ${carrierMasts.length + 1}`;
        const operator = window.prompt("Operator (Vodacom/MTN/Telkom/Cell C):", "Vodacom") ?? "Unknown";
        const newMast: CarrierNode = {
          id: `cm-manual-${Date.now()}`, lat: coord.lat, lng: coord.lng,
          operator, name, rank: carrierMasts.length + 1,
          distKm: r2(calculateDistanceKm(coord, centroidOf(boundary))),
        };
        setCarrierMasts(prev => [...prev, newMast]);
        toast.success(`${name} added as carrier tower`);
      } else {
        // Facility placement
        const facType = placementMode as FacilityType;
        const facLabel = FACILITY_TYPES[facType]?.label ?? facType;
        const name = window.prompt(`${facLabel} name:`, `${facLabel} ${facilities.length + 1}`) ?? `${facLabel} ${facilities.length + 1}`;
        const newFac = { id: `fac-${Date.now()}`, name, type: facType, lat: coord.lat, lng: coord.lng };
        setFacilities(prev => [...prev, newFac]);

        // Also add as a distribution node and create a link
        const newNode: DistribNode = { id: `d-manual-${Date.now()}`, lat: coord.lat, lng: coord.lng, elevation: null, name, osmType: facType };
        setDistribNodes(prev => [...prev, newNode]);
        if (hsNodes.length) {
          const newLinks = buildDistribLinks([newNode], hsNodes, thresholdKm);
          setLinks(prev => [...prev, ...newLinks]);
        }
        toast.success(`${name} placed as ${facLabel}`);
      }
      setPlacementMode(null);
    };
    map.on("click", handler);
    clickHandlerRef.current = handler;
    return () => { map.off("click", handler); clickHandlerRef.current = null; };
  }, [placementMode, carrierMasts, facilities, hsNodes, boundary, thresholdKm, distribNodes]);

  // ─────────────────────────────────────────────────────────────────────────
  // CARRIER SELECTION
  // ─────────────────────────────────────────────────────────────────────────

  const handleSelectCarrier = (id: string) => {
    setSelectedCarrierId(id);
    const mast = carrierMasts.find(m => m.id === id);
    if (!mast) return;
    const uplinkLink = buildUplinkLink(mast, hsNodes);
    if (uplinkLink) {
      setLinks(prev => [...prev.filter(l => l.layer !== "L0"), uplinkLink]);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // HEIGHT OVERRIDE
  // ─────────────────────────────────────────────────────────────────────────

  const applyHeightOverride = async (linkId: string, tx: number, rx: number) => {
    setHeightOverrides(prev => ({ ...prev, [linkId]: { tx, rx } }));
    const link = links.find(l => l.id === linkId);
    if (!link) return;
    setLinks(prev => prev.map(l => l.id === linkId ? { ...l, losStatus: "PENDING" } : l));
    try {
      const ctrl = new AbortController();
      const { status, profile } = await calcLinkLos(link, tx, rx, ctrl.signal, elevGridRef.current);
      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, aglTx: tx, aglRx: rx, losStatus: status, elevationProfile: profile } : l));
    } catch { /* keep PENDING */ }
  };

  const removeLink = (linkId: string) => {
    setLinks(prev => prev.filter(l => l.id !== linkId));
    if (selectedLinkId === linkId) setSelectedLinkId(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SAVE / LOAD
  // ─────────────────────────────────────────────────────────────────────────

  const handleSave = () => {
    const centre = centroidOf(boundary);
    const payload = {
      planName,
      propertyName: propertyName || "Unnamed Property",
      centerLatitude: centre.lat,
      centerLongitude: centre.lng,
      propertyAreaHa: estimateAreaHa(boundary),
      selectedMastId: selectedCarrierId ?? undefined,
      boundary,
      highSites: hsNodes as any[],
      providerMasts: carrierMasts as any[],
      links: links.map(l => ({ ...l })) as any[],
      assumptions: {
        thresholdKm,
        facilities,
        heightOverrides,
      } as any,
      recommendationSummary: `${hsNodes.length} high sites, ${distribNodes.length} structures, ${links.length} links. ${links.filter(l => l.losStatus === "CLEAR").length} CLEAR LOS.`,
      totalDistanceKm: links.reduce((s, l) => s + l.distKm, 0),
      liveDistanceKm: links.filter(l => l.losStatus === "CLEAR").reduce((s, l) => s + l.distKm, 0),
      status: "Ready for Field Validation" as const,
    };
    if (lastSavedId) updatePlanMutation.mutate({ id: lastSavedId, ...payload });
    else createPlanMutation.mutate(payload);
  };

  const handleLoadPlan = (plan: any) => {
    try {
      if (plan.boundary?.length) {
        setBoundary(plan.boundary);
        fitToBoundary(mapRef.current, plan.boundary);
      }
      if (plan.highSites?.length) setHsNodes(plan.highSites);
      if (plan.providerMasts?.length) {
        setCarrierMasts(plan.providerMasts);
        setSelectedCarrierId(plan.selectedMastId ?? plan.providerMasts[0]?.id ?? null);
      }
      if (plan.links?.length) setLinks(plan.links);
      if (plan.assumptions?.facilities?.length) setFacilities(plan.assumptions.facilities);
      if (plan.assumptions?.thresholdKm) setThresholdKm(plan.assumptions.thresholdKm);
      if (plan.assumptions?.heightOverrides) setHeightOverrides(plan.assumptions.heightOverrides);
      setPlanName(plan.planName ?? "Loaded Plan");
      setPropertyName(plan.propertyName ?? "");
      setLastSavedId(plan.id);
      setPhase("done");
      setShowLoadPanel(false);
      toast.success(`Loaded: ${plan.planName}`);
    } catch {
      toast.error("Failed to load plan data");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // JSON SERIALIZATION
  // ─────────────────────────────────────────────────────────────────────────

  const serializeTopology = useCallback((): SerializedPlannerTopology => {
    const overThresholdCount = links.filter(l => l.distKm > thresholdKm).length;
    const fadeMargins = links.map(l => linkFadeMargin(l.distKm));
    const weakestFadeMarginDb = fadeMargins.length > 0 ? Math.min(...fadeMargins) : 0;
    const selectedMast = carrierMasts.find(m => m.id === selectedCarrierId) ?? null;
    return {
      planName,
      propertyName: propertyName || "Unnamed Property",
      totalDistanceKm: links.reduce((s, l) => s + l.distKm, 0),
      liveDistanceKm: links.filter(l => l.losStatus === "CLEAR").reduce((s, l) => s + l.distKm, 0),
      linkCount: links.length,
      uplinkCount: links.filter(l => l.layer === "L0").length,
      backboneCount: links.filter(l => l.layer === "L1").length,
      overThresholdCount,
      weakestFadeMarginDb,
      viableLinkThresholdKm: thresholdKm,
      routeDecisionExplanation: `Topology uses MST backbone with ${hsNodes.length} high sites, nearest-neighbour distribution to ${distribNodes.length} structures, and carrier uplink via ${selectedMast?.operator ?? "unknown"} at ${selectedMast?.distKm ?? 0} km. Links exceeding ${thresholdKm} km require field validation.`,
      recommendationSummary: `${hsNodes.length} high sites, ${distribNodes.length} structures, ${links.length} links. ${links.filter(l => l.losStatus === "CLEAR").length} CLEAR LOS.`,
      links: links.map(l => ({
        type: l.layer === "L0" ? "uplink" as const : l.layer === "L1" ? "backbone" as const : "distribution" as const,
        fromName: l.label.split(" \u2192 ")[0] ?? l.fromId,
        toName: l.label.split(" \u2192 ")[1] ?? l.toId,
        distKm: l.distKm,
        rslDbm: -(92.45 + 20 * Math.log10(Math.max(l.distKm, 0.1)) + 20 * Math.log10(FREQ_GHZ)) + 24 + 30 * 2,
        fadeMarginDb: linkFadeMargin(l.distKm),
        outOfRange: l.distKm > thresholdKm,
      })),
      highSites: hsNodes.map(hs => ({
        name: hs.label,
        category: "inside" as const,
        elevation: hs.elevation,
        source: "srtm" as const,
        lat: hs.lat,
        lng: hs.lng,
      })),
      selectedMast: selectedMast ? {
        name: selectedMast.name ?? selectedMast.operator,
        provider: selectedMast.operator.toLowerCase().includes("vodacom") ? "vodacom" as const :
                  selectedMast.operator.toLowerCase().includes("mtn") ? "mtn" as const :
                  selectedMast.operator.toLowerCase().includes("telkom") ? "telkom" as const :
                  selectedMast.operator.toLowerCase().includes("cell c") ? "cellc" as const : "unknown" as const,
        closestForProvider: selectedMast.rank === 1,
        lat: selectedMast.lat,
        lng: selectedMast.lng,
      } : null,
      facilities: facilities.map(f => ({ name: f.name, type: f.type as any, lat: f.lat, lng: f.lng })),
    };
  }, [links, thresholdKm, hsNodes, distribNodes, carrierMasts, selectedCarrierId, planName, propertyName, facilities]);

  const handleExportJson = () => {
    const topology = serializeTopology();
    const json = JSON.stringify(topology, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CTTX-LinkPlan-${(propertyName || "plan").replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Topology exported as JSON");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // EXPORT REPORT
  // ─────────────────────────────────────────────────────────────────────────

  const handleExportReport = () => {
    const html = generateReportHtml({
      propertyName: propertyName || "Unnamed Property",
      boundary, hsNodes, distribNodes, carrierMasts, links, thresholdKm, facilities,
    });
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CTTX-LinkPlan-${(propertyName || "plan").replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Report exported as HTML");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MAP OVERLAY RENDERING
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const map = mapRef.current;
    const ml = window.maplibregl;
    if (!map || !ml || !mapReady) return;

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

    // ── Links
    const solidFeatures: any[] = [];
    const dashedFeatures: any[] = [];
    for (const link of links) {
      const color = link.losStatus === "BLOCKED" ? "#EF4444" :
                    link.losStatus === "MARGINAL" ? "#F59E0B" :
                    LC[link.layer] ?? "#888";
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
      const mid = { lat: (link.fromPt.lat + link.toPt.lat) / 2, lng: (link.fromPt.lng + link.toPt.lng) / 2 };
      const statusColor = link.losStatus === "CLEAR" ? "#22C55E" : link.losStatus === "MARGINAL" ? "#F59E0B" : "#EF4444";
      const el = document.createElement("div");
      el.style.cssText = `font-size:9px;font-weight:800;color:${statusColor};background:rgba(2,6,23,0.85);padding:1px 4px;border-radius:3px;white-space:nowrap;cursor:pointer;border:1px solid ${statusColor}40;line-height:1.4;`;
      el.textContent = `${link.losStatus} · ${link.distKm}km`;
      el.onclick = () => { setSelectedLinkId(link.id); setProfileLink(link); };
      overlayRefs.current.push(new ml.Marker({ element: el }).setLngLat([mid.lng, mid.lat]).addTo(map));
    }

    // ── High site triangles
    for (const hs of hsNodes) {
      const el = document.createElement("div");
      el.style.cssText = `color:${LC.hs};font-size:22px;font-weight:900;line-height:1;cursor:pointer;text-shadow:0 1px 3px rgba(0,0,0,.8);`;
      el.textContent = "▲";
      el.title = `${hs.label} · ${hs.elevation} m ASL`;
      const labelEl = document.createElement("div");
      labelEl.style.cssText = `font-size:9px;font-weight:700;color:#fff;text-align:center;margin-top:-2px;text-shadow:0 1px 2px rgba(0,0,0,.9);`;
      labelEl.textContent = hs.label;
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "display:flex;flex-direction:column;align-items:center;";
      wrapper.appendChild(el); wrapper.appendChild(labelEl);

      const popup = new ml.Popup({ offset: 25, closeButton: false }).setHTML(
        `<div style="font-size:12px;color:#000;line-height:1.5">
          <strong>${hs.label}</strong><br/>
          <b>Lat:</b> ${hs.lat.toFixed(6)}<br/>
          <b>Lng:</b> ${hs.lng.toFixed(6)}<br/>
          <b>Elevation:</b> ${hs.elevation} m ASL<br/>
          <b>Rank:</b> #${hs.rank} (relay candidate)
        </div>`
      );
      const marker = new ml.Marker({ element: wrapper }).setLngLat([hs.lng, hs.lat]).setPopup(popup).addTo(map);
      overlayRefs.current.push(marker);
    }

    // ── Distribution site markers
    for (const d of distribNodes) {
      const el = document.createElement("div");
      el.style.cssText = `width:10px;height:10px;border-radius:50%;background:${LC.L2};border:1.5px solid #fff;cursor:pointer;`;
      el.title = `${d.name} · ${d.osmType}`;
      const popup = new ml.Popup({ offset: 12, closeButton: false }).setHTML(
        `<div style="font-size:12px;color:#000;line-height:1.5">
          <strong>${d.name}</strong><br/>
          <b>Type:</b> ${d.osmType}<br/>
          <b>Lat:</b> ${d.lat.toFixed(6)}<br/>
          <b>Lng:</b> ${d.lng.toFixed(6)}<br/>
          ${d.elevation !== null ? `<b>Elevation:</b> ${d.elevation} m ASL` : ""}
        </div>`
      );
      const marker = new ml.Marker({ element: el }).setLngLat([d.lng, d.lat]).setPopup(popup).addTo(map);
      overlayRefs.current.push(marker);
    }

    // ── Carrier mast markers
    for (const m of carrierMasts) {
      const isSelected = m.id === selectedCarrierId;
      const el = document.createElement("div");
      el.style.cssText = `width:${isSelected ? 18 : 12}px;height:${isSelected ? 18 : 12}px;border-radius:50%;background:${isSelected ? LC.L0 : "#64748b"};border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-size:8px;font-weight:900;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.5);`;
      el.textContent = isSelected ? "C" : String(m.rank);
      el.title = `${m.operator}${m.name ? ` · ${m.name}` : ""} · ${m.distKm} km`;
      el.onclick = () => handleSelectCarrier(m.id);
      const popup = new ml.Popup({ offset: 12, closeButton: false }).setHTML(
        `<div style="font-size:12px;color:#000;line-height:1.5">
          <strong>${m.operator}${m.name ? ` — ${m.name}` : ""}</strong><br/>
          <b>Lat:</b> ${m.lat.toFixed(6)}<br/>
          <b>Lng:</b> ${m.lng.toFixed(6)}<br/>
          <b>Distance:</b> ${m.distKm} km from centre<br/>
          <b>Rank:</b> #${m.rank}
        </div>`
      );
      const marker = new ml.Marker({ element: el }).setLngLat([m.lng, m.lat]).setPopup(popup).addTo(map);
      overlayRefs.current.push(marker);
    }

    // ── Facility markers
    for (const f of facilities) {
      const cfg = FACILITY_TYPES[f.type];
      const el = document.createElement("div");
      el.style.cssText = `font-size:18px;cursor:pointer;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.8));`;
      el.textContent = cfg?.icon ?? "📍";
      el.title = `${f.name} (${cfg?.label ?? f.type})`;
      const popup = new ml.Popup({ offset: 12, closeButton: false }).setHTML(
        `<div style="font-size:12px;color:#000;line-height:1.5">
          <strong>${f.name}</strong><br/>
          <b>Type:</b> ${cfg?.label ?? f.type}<br/>
          <b>Lat:</b> ${f.lat.toFixed(6)}<br/>
          <b>Lng:</b> ${f.lng.toFixed(6)}
        </div>`
      );
      const marker = new ml.Marker({ element: el }).setLngLat([f.lng, f.lat]).setPopup(popup).addTo(map);
      overlayRefs.current.push(marker);
    }

  }, [mapReady, boundary, hsNodes, distribNodes, carrierMasts, selectedCarrierId, links, heightOverrides, facilities]);

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
      <section className="grid gap-4 p-4 xl:grid-cols-[380px_minmax(0,1fr)]">

        {/* ═══════════════════════════════ LEFT COLUMN ═══════════════════════ */}
        <aside className="space-y-4 max-h-[calc(100vh-2rem)] overflow-y-auto pr-1">

          {/* Header */}
          <div className="rounded-2xl border border-cyan-400/20 bg-slate-900/85 p-4 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">CTTX · Infrastructure Intelligence</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Link Planner</h1>
            <p className="mt-2 text-xs leading-5 text-slate-400">Professional RF network topology · LOS analysis · Carrier-grade design for reserves, farms & remote sites</p>
          </div>

          {/* Search */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
            <div className="relative">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Property / Reserve</label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  value={propertyName}
                  onChange={e => { setSelectedResult(null); setNameResults([]); setPropertyName(e.target.value); }}
                  onKeyDown={e => { if (e.key === "Enter" && nameResults.length > 0) { e.preventDefault(); handleSelectResult(nameResults[0]); } }}
                  autoComplete="off"
                  placeholder="Search South Africa…"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 pl-10 pr-3 py-2.5 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2 placeholder:text-slate-600"
                />
              </div>
              {(isSearching || nameResults.length > 0) && (
                <div className="absolute left-0 right-0 top-full z-[80] mt-1 overflow-hidden rounded-xl border border-cyan-400/30 bg-slate-900 shadow-2xl max-h-64 overflow-y-auto">
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
                </div>
              )}
            </div>

            {boundary.length >= 3 && (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
                ✓ Boundary loaded · {boundary.length} vertices · ~{estimateAreaHa(boundary)} ha
              </div>
            )}

            <Button
              type="button"
              disabled={isBuilding || (!selectedResult && boundary.length < 3)}
              onClick={handlePlanNetwork}
              className="w-full bg-yellow-400 text-slate-950 hover:bg-yellow-300 font-bold text-sm h-11 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isBuilding
                ? <><Clock className="mr-2 h-4 w-4 animate-spin" />{PHASE_LABELS[phase]}</>
                : <><Zap className="mr-2 h-4 w-4" />Plan Network</>
              }
            </Button>
          </div>

          {/* Threshold slider */}
          {phase === "done" && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Viable Link Threshold</p>
                <span className="text-sm font-bold text-cyan-300">{thresholdKm} km</span>
              </div>
              <input
                type="range"
                min={MIN_VIABLE_LINK_THRESHOLD_KM}
                max={MAX_VIABLE_LINK_THRESHOLD_KM}
                step={1}
                value={thresholdKm}
                onChange={e => {
                  const newThreshold = Number(e.target.value);
                  setThresholdKm(newThreshold);
                  // Recompute backbone and distribution links with new threshold
                  if (hsNodes.length > 0) {
                    const carrier = carrierMasts.find(m => m.id === selectedCarrierId) ?? carrierMasts[0] ?? null;
                    const newLinks: NetLink[] = [
                      ...buildMstBackbone(hsNodes, newThreshold),
                      ...buildDistribLinks(distribNodes, hsNodes, newThreshold),
                      ...(carrier ? [buildUplinkLink(carrier, hsNodes)].filter(Boolean) as NetLink[] : []),
                    ];
                    setLinks(newLinks);
                    const overCount = newLinks.filter(l => l.distKm > newThreshold).length;
                    toast.info(`Threshold ${newThreshold} km — ${newLinks.length} links rebuilt, ${overCount} over-threshold`);
                  }
                }}
                className="w-full accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>{MIN_VIABLE_LINK_THRESHOLD_KM} km</span>
                <span>{MAX_VIABLE_LINK_THRESHOLD_KM} km</span>
              </div>
              {links.some(l => l.distKm > thresholdKm) && (
                <p className="text-xs text-amber-300">
                  ⚠ {links.filter(l => l.distKm > thresholdKm).length} link(s) exceed threshold — field validation required
                </p>
              )}
            </div>
          )}

          {/* Network stats */}
          {(hsNodes.length > 0 || links.length > 0) && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Network Summary</p>
              <div className="grid grid-cols-2 gap-2">
                <StatChip label="High Sites (L1)" value={hsNodes.length} color="text-emerald-300" />
                <StatChip label="Structures (L2)" value={distribNodes.length} color="text-blue-300" />
                <StatChip label="Carrier Towers" value={carrierMasts.length} color="text-orange-300" />
                <StatChip label="Total Links" value={links.length} color="text-white" />
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
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">
                <Radio className="inline h-3 w-3 mr-1" />Carrier Uplink · L0
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
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

          {/* Manual placement */}
          {phase === "done" && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                <Plus className="inline h-3 w-3 mr-1" />Place on Map
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.entries(FACILITY_TYPES) as [FacilityType, typeof FACILITY_TYPES[FacilityType]][]).map(([key, cfg]) => (
                  <button key={key} type="button"
                    onClick={() => setPlacementMode(placementMode === key ? null : key)}
                    className={`rounded-lg border px-2 py-1.5 text-[10px] transition ${placementMode === key ? "border-cyan-400 bg-cyan-400/20 text-white" : "border-white/10 bg-slate-950/60 text-slate-400 hover:border-white/30"}`}>
                    {cfg.icon} {cfg.label}
                  </button>
                ))}
                <button type="button"
                  onClick={() => setPlacementMode(placementMode === "carrier" ? null : "carrier")}
                  className={`rounded-lg border px-2 py-1.5 text-[10px] transition ${placementMode === "carrier" ? "border-orange-400 bg-orange-400/20 text-white" : "border-white/10 bg-slate-950/60 text-slate-400 hover:border-white/30"}`}>
                  📡 Carrier Tower
                </button>
              </div>
            </div>
          )}

          {/* Save/Load/Export */}
          {phase === "done" && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Actions</p>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowSavePanel(!showSavePanel)}
                  className="border-emerald-400/40 text-xs h-9 bg-slate-950 text-emerald-200 hover:bg-emerald-400/10">
                  <Save className="mr-1.5 h-3 w-3" /> Save Plan
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowLoadPanel(!showLoadPanel)}
                  className="border-blue-400/40 text-xs h-9 bg-slate-950 text-blue-200 hover:bg-blue-400/10">
                  <Upload className="mr-1.5 h-3 w-3" /> Load Plan
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleExportReport}
                  className="border-cyan-400/40 text-xs h-9 bg-slate-950 text-cyan-200 hover:bg-cyan-400/10">
                  <Download className="mr-1.5 h-3 w-3" /> Report (HTML)
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleExportJson}
                  className="border-emerald-400/40 text-xs h-9 bg-slate-950 text-emerald-200 hover:bg-emerald-400/10">
                  <Download className="mr-1.5 h-3 w-3" /> Topology (JSON)
                </Button>
              </div>

              {showSavePanel && (
                <div className="mt-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 space-y-2">
                  <input
                    value={planName}
                    onChange={e => setPlanName(e.target.value)}
                    placeholder="Plan name…"
                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white outline-none"
                  />
                  <Button type="button" size="sm" onClick={handleSave}
                    disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
                    className="w-full bg-emerald-500 text-white text-xs h-8 hover:bg-emerald-400">
                    {lastSavedId ? "Update Plan" : "Save New Plan"}
                  </Button>
                </div>
              )}

              {showLoadPanel && (
                <div className="mt-2 rounded-xl border border-blue-400/20 bg-blue-400/5 p-3 space-y-2 max-h-48 overflow-y-auto">
                  {savedPlans.isLoading && <p className="text-xs text-slate-400">Loading…</p>}
                  {savedPlans.data?.map((plan: any) => (
                    <button key={plan.id} type="button" onClick={() => handleLoadPlan(plan)}
                      className="w-full rounded-lg border border-white/10 bg-slate-950/70 p-2 text-left text-xs hover:border-blue-400/40">
                      <span className="font-semibold text-white">{plan.planName}</span>
                      <span className="block text-slate-400">{plan.propertyName} · {plan.status}</span>
                    </button>
                  ))}
                  {!savedPlans.isLoading && !savedPlans.data?.length && (
                    <p className="text-xs text-slate-400">No saved plans yet.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Legend */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-3">Layer Legend</p>
            <div className="space-y-1.5 text-xs">
              <LegendRow color={LC.L0} label="L0 · Carrier uplink" dash />
              <LegendRow color={LC.L1} label="L1 · Core backbone (MST)" />
              <LegendRow color={LC.L2} label="L2 · Distribution" />
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

                map.on("click", "lp-links-solid-line", (e: any) => {
                  const id = e.features?.[0]?.properties?.linkId;
                  if (id) { setSelectedLinkId(id); setProfileLink(links.find(l => l.id === id) ?? null); }
                });
                map.on("click", "lp-links-dashed-line", (e: any) => {
                  const id = e.features?.[0]?.properties?.linkId;
                  if (id) { setSelectedLinkId(id); setProfileLink(links.find(l => l.id === id) ?? null); }
                });

                map.on("mouseenter", "lp-links-solid-line", () => { map.getCanvas().style.cursor = "pointer"; });
                map.on("mouseleave", "lp-links-solid-line", () => { map.getCanvas().style.cursor = ""; });
                map.on("mouseenter", "lp-links-dashed-line", () => { map.getCanvas().style.cursor = "pointer"; });
                map.on("mouseleave", "lp-links-dashed-line", () => { map.getCanvas().style.cursor = ""; });

                setMapReady(true);
              }}
            />

            {/* Placement mode banner */}
            {placementMode && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 rounded-full border border-cyan-400/50 bg-slate-950/90 px-5 py-2.5 text-sm text-cyan-200 shadow-2xl flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Click map to place {placementMode === "carrier" ? "carrier tower" : FACILITY_TYPES[placementMode as FacilityType]?.label ?? placementMode}
                <button onClick={() => setPlacementMode(null)} className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs hover:bg-white/20">Cancel</button>
              </div>
            )}
          </div>

          {/* Elevation Profile Panel */}
          {profileLink && profileLink.elevationProfile && profileLink.elevationProfile.length > 2 && (
            <div className="rounded-2xl border border-cyan-400/20 bg-slate-900 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Mountain className="h-4 w-4 text-cyan-300" />
                  <span className="text-sm font-semibold text-white">Elevation Profile</span>
                  <span className="text-xs text-slate-400">{profileLink.label} · {profileLink.distKm} km</span>
                </div>
                <button onClick={() => setProfileLink(null)} className="text-xs text-slate-400 hover:text-white">Close</button>
              </div>
              <ElevationProfileChart
                profile={profileLink.elevationProfile}
                distKm={profileLink.distKm}
                aglTx={heightOverrides[profileLink.id]?.tx ?? profileLink.aglTx}
                aglRx={heightOverrides[profileLink.id]?.rx ?? profileLink.aglRx}
                losStatus={profileLink.losStatus}
              />
            </div>
          )}

          {/* Links table */}
          {links.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Layers3 className="h-4 w-4 text-cyan-300" />
                <span className="text-sm font-semibold text-white">Network Links</span>
                <span className="ml-auto text-xs text-slate-400">{links.length} links · click row to inspect · click LOS badge for profile</span>
              </div>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="sticky top-0 bg-slate-900 z-10">
                    <tr className="text-[10px] uppercase tracking-[0.15em] text-slate-500">
                      <th className="pb-2 pr-4">Layer</th>
                      <th className="pb-2 pr-4">Link</th>
                      <th className="pb-2 pr-4">Distance</th>
                      <th className="pb-2 pr-4">LOS</th>
                      <th className="pb-2 pr-4">Fade</th>
                      <th className="pb-2 pr-4">Bearing</th>
                      <th className="pb-2 pr-4">TX AGL</th>
                      <th className="pb-2 pr-4">RX AGL</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {links.map(link => {
                      const override = heightOverrides[link.id];
                      const tx = override?.tx ?? link.aglTx;
                      const rx = override?.rx ?? link.aglRx;
                      const fade = linkFadeMargin(link.distKm);
                      const bearing = Math.round(calculateBearingDeg(link.fromPt, link.toPt));
                      const isSelected = link.id === selectedLinkId;
                      const overThreshold = link.distKm > thresholdKm;
                      return (
                        <tr key={link.id}
                          onClick={() => { setSelectedLinkId(isSelected ? null : link.id); setProfileLink(isSelected ? null : link); }}
                          className={`cursor-pointer transition ${isSelected ? "bg-white/10" : "hover:bg-white/5"} ${overThreshold ? "bg-amber-400/5" : ""}`}>
                          <td className="py-2 pr-4">
                            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: LC[link.layer] }} />
                            <span className="font-mono text-[10px] text-slate-300">{link.layer}</span>
                          </td>
                          <td className="py-2 pr-4 text-white max-w-[180px] truncate" title={link.label}>{link.label}</td>
                          <td className={`py-2 pr-4 ${overThreshold ? "text-amber-300 font-semibold" : "text-slate-300"}`}>
                            {link.distKm} km{overThreshold ? " ⚠" : ""}
                          </td>
                          <td className="py-2 pr-4"><LOSBadge status={link.losStatus} /></td>
                          <td className={`py-2 pr-4 ${fade >= 20 ? "text-emerald-300" : fade >= 10 ? "text-amber-300" : "text-red-300"}`}>{fade} dB</td>
                          <td className="py-2 pr-4 text-slate-400">{bearing}°</td>
                          <td className="py-2 pr-4 text-slate-400">{tx} m</td>
                          <td className="py-2 pr-4 text-slate-400">{rx} m</td>
                          <td className="py-2">
                            <button onClick={(e) => { e.stopPropagation(); removeLink(link.id); }}
                              className="rounded p-1 text-red-400/60 hover:text-red-400 hover:bg-red-400/10">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </td>
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
                  <button type="button" onClick={() => { setSelectedLinkId(null); setProfileLink(null); }}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 hover:bg-white/10">
                    Close
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-5 text-xs">
                <MetricTile label="Distance" value={`${selectedLink.distKm} km`} />
                <MetricTile label="Fade margin" value={`${linkFadeMargin(selectedLink.distKm)} dB`}
                  valueClass={linkFadeMargin(selectedLink.distKm) >= 20 ? "text-emerald-300" : "text-amber-300"} />
                <MetricTile label="Bearing" value={`${Math.round(calculateBearingDeg(selectedLink.fromPt, selectedLink.toPt))}°`} />
                <MetricTile label="Frequency" value="5.8 GHz" />
                <MetricTile label="From coords" value={`${selectedLink.fromPt.lat.toFixed(5)}, ${selectedLink.fromPt.lng.toFixed(5)}`} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-cyan-300 mb-2">TX Height AGL (m)</p>
                  <input type="number" min={1} max={150}
                    value={selectedLinkOverride?.tx ?? selectedLink.aglTx}
                    onChange={e => applyHeightOverride(selectedLink.id, Number(e.target.value), selectedLinkOverride?.rx ?? selectedLink.aglRx)}
                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2" />
                  <p className="mt-1 text-[10px] text-slate-500">Default {DEFAULT_AGL[selectedLink.layer]} m</p>
                </div>
                <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-cyan-300 mb-2">RX Height AGL (m)</p>
                  <input type="number" min={1} max={150}
                    value={selectedLinkOverride?.rx ?? selectedLink.aglRx}
                    onChange={e => applyHeightOverride(selectedLink.id, selectedLinkOverride?.tx ?? selectedLink.aglTx, Number(e.target.value))}
                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2" />
                  <p className="mt-1 text-[10px] text-slate-500">Default {DEFAULT_AGL[selectedLink.layer]} m</p>
                </div>
              </div>
            </div>
          )}

          {/* High Sites Table */}
          {hsNodes.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Mountain className="h-4 w-4 text-emerald-300" />
                <span className="text-sm font-semibold text-white">High Sites (Relay Candidates)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.15em] text-slate-500">
                      <th className="pb-2 pr-4">Rank</th>
                      <th className="pb-2 pr-4">Label</th>
                      <th className="pb-2 pr-4">Latitude</th>
                      <th className="pb-2 pr-4">Longitude</th>
                      <th className="pb-2">Elevation (m ASL)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {hsNodes.map(hs => (
                      <tr key={hs.id} className="hover:bg-white/5">
                        <td className="py-2 pr-4 text-emerald-300 font-bold">#{hs.rank}</td>
                        <td className="py-2 pr-4 text-white">{hs.label}</td>
                        <td className="py-2 pr-4 text-slate-300 font-mono text-[11px]">{hs.lat.toFixed(6)}</td>
                        <td className="py-2 pr-4 text-slate-300 font-mono text-[11px]">{hs.lng.toFixed(6)}</td>
                        <td className="py-2 text-slate-300">{hs.elevation} m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ELEVATION PROFILE CHART (SVG-based)
// ─────────────────────────────────────────────────────────────────────────────

function ElevationProfileChart({ profile, distKm, aglTx, aglRx, losStatus }: {
  profile: number[]; distKm: number; aglTx: number; aglRx: number; losStatus: LosStatus;
}) {
  const width = 700, height = 180, padX = 50, padY = 20;
  const chartW = width - padX * 2, chartH = height - padY * 2;

  const minElev = Math.min(...profile) - 10;
  const maxElev = Math.max(...profile) + Math.max(aglTx, aglRx) + 20;
  const elevRange = Math.max(1, maxElev - minElev);

  const toX = (i: number) => padX + (i / (profile.length - 1)) * chartW;
  const toY = (elev: number) => padY + chartH - ((elev - minElev) / elevRange) * chartH;

  // Terrain path
  const terrainPath = profile.map((e, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(e).toFixed(1)}`).join(" ");
  const terrainFill = `${terrainPath} L ${toX(profile.length - 1).toFixed(1)} ${(padY + chartH).toFixed(1)} L ${padX} ${(padY + chartH).toFixed(1)} Z`;

  // LOS line
  const losStartY = toY(profile[0] + aglTx);
  const losEndY = toY(profile[profile.length - 1] + aglRx);
  const losColor = losStatus === "CLEAR" ? "#22C55E" : losStatus === "MARGINAL" ? "#F59E0B" : "#EF4444";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ maxHeight: "200px" }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(f => {
        const y = padY + chartH * (1 - f);
        const elev = Math.round(minElev + elevRange * f);
        return (
          <g key={f}>
            <line x1={padX} y1={y} x2={padX + chartW} y2={y} stroke="#334155" strokeWidth="0.5" />
            <text x={padX - 5} y={y + 3} textAnchor="end" fill="#64748b" fontSize="9">{elev}m</text>
          </g>
        );
      })}
      {/* Distance labels */}
      {[0, 0.25, 0.5, 0.75, 1].map(f => {
        const x = padX + chartW * f;
        return <text key={f} x={x} y={height - 2} textAnchor="middle" fill="#64748b" fontSize="9">{(distKm * f).toFixed(1)}km</text>;
      })}
      {/* Terrain fill */}
      <path d={terrainFill} fill="#1e293b" opacity="0.8" />
      <path d={terrainPath} fill="none" stroke="#475569" strokeWidth="1.5" />
      {/* LOS line */}
      <line x1={toX(0)} y1={losStartY} x2={toX(profile.length - 1)} y2={losEndY} stroke={losColor} strokeWidth="2" strokeDasharray="6 3" />
      {/* TX/RX towers */}
      <line x1={toX(0)} y1={toY(profile[0])} x2={toX(0)} y2={losStartY} stroke="#22D3EE" strokeWidth="2" />
      <line x1={toX(profile.length - 1)} y1={toY(profile[profile.length - 1])} x2={toX(profile.length - 1)} y2={losEndY} stroke="#22D3EE" strokeWidth="2" />
      {/* Labels */}
      <text x={toX(0) + 4} y={losStartY - 5} fill="#22D3EE" fontSize="9">TX {aglTx}m AGL</text>
      <text x={toX(profile.length - 1) - 4} y={losEndY - 5} textAnchor="end" fill="#22D3EE" fontSize="9">RX {aglRx}m AGL</text>
      <text x={width / 2} y={padY - 4} textAnchor="middle" fill={losColor} fontSize="10" fontWeight="bold">{losStatus} · {distKm} km</text>
    </svg>
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

export async function createContinuousPlannerState(
  propertyName: string,
  origin: GisCoordinate,
): Promise<PlannerState> {
  const { buildGisAutoScanWithApis } = await import("@/lib/gisAutoScan");
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

export function getBoundaryFirstViewportPoints(state: PlannerState): {
  boundary: GisCoordinate[] | null;
  context: GisCoordinate[];
} {
  const boundary = state.boundaryPolygon ?? null;
  const context: GisCoordinate[] = [...(boundary ?? [])];
  for (const hs of state.highSites) {
    if (hs.category === "remote") continue;
    context.push({ lat: hs.lat, lng: hs.lng });
  }
  for (const mast of state.masts) {
    if (mast.hiddenByDefault) continue;
    context.push({ lat: mast.lat, lng: mast.lng });
  }
  if (state.layerVis.facilities) {
    for (const fac of state.facilities) {
      context.push({ lat: fac.lat, lng: fac.lng });
    }
  }
  for (const link of state.links) {
    if (!link.viable) continue;
    context.push(link.path[0]);
    context.push(link.path[1]);
  }
  return { boundary, context };
}

export function recalculatePlannerLinks(state: PlannerState): PlannerState {
  const mastById = new Map(state.masts.map((m) => [m.id, m]));
  const hsById = new Map(state.highSites.map((hs) => [hs.id, hs]));
  const updatedLinks = state.links.map((link) => {
    if (!link.elevationProfile || link.elevationProfile.length < 3) return link;
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
    return { ...link, losStatus, terrainMarginMeters: Math.round(worstMargin * 10) / 10 >= 10 ? 10 : link.terrainMarginMeters };
  });
  return { ...state, links: updatedLinks };
}

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

export function fitPlannerMapToState(
  map: any,
  state: PlannerState,
  padding: number,
): boolean {
  if (!map || !(window as any).google?.maps) return false;
  const { context } = getBoundaryFirstViewportPoints(state);
  if (!context.length) return false;
  const bounds = new (window as any).google.maps.LatLngBounds();
  context.forEach((pt: any) => bounds.extend(pt));
  map.fitBounds(bounds, padding);
  return true;
}
