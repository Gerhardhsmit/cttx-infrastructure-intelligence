import { MapView } from "@/components/Map";
import { Button } from "@/components/ui/button";
import { buildGisAutoScanWithApis, calculateBearingDeg, isValidGisCoordinate, sanitizePath, type GisCoordinate } from "@/lib/gisAutoScan";
import {
  DEFAULT_CARRIER_MAST_HEIGHT_M,
  DEFAULT_HIGH_SITE_ANTENNA_HEIGHT_M,
  DEFAULT_PLANNER_LAYER_VISIBILITY,
  FACILITY_TYPES,
  PLANNER_FACILITY_OPTIONS,
  buildPlannerStateFromGisScan,
  type Facility,
  type FacilityType,
  type Mast,
  type NetworkLink,
  type PlannerLayerKey,
  type PlannerState,
} from "@/lib/plannerTypes";
import { trpc } from "@/lib/trpc";
import { Activity, Antenna, CheckCircle2, CloudCog, Layers3, MapPin, Mountain, RadioTower, RefreshCw, Save, ShieldCheck, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

const DEFAULT_CENTER = { lat: -33.482, lng: 26.633 };
const DEFAULT_PROPERTY_NAME = "Kwandwe Ridge Trial Property";
const DEFAULT_FACILITY_ANTENNA_HEIGHT_M = 10;
const LOS_CONFIRMED_CLEARANCE_M = 10;
const HIGH_SITE_HEIGHT_OPTIONS = [15, 20, 25, 30, 35, 40, 45, 50, 60];
const CARRIER_MAST_HEIGHT_OPTIONS = [25, 30, 35, 40, 45, 50, 60];

type HeightSelection = { type: "highSite" | "mast"; id: string } | null;

type LinkBudget = {
  bearingDeg: number;
  fadeMarginDb: number;
  rslDbm: number;
  fresnelM: number;
  throughputMbps: number;
  targetBer: string;
};

type ScanStatus = {
  loading: boolean;
  phase: string;
  issues: string[];
};

const layerLabels: Record<PlannerLayerKey, string> = {
  inside: "On-property high sites",
  nearby: "Nearby high sites",
  remote: "Remote high sites",
  vodacom: "Vodacom masts",
  mtn: "MTN masts",
  cellc: "Cell C masts",
  telkom: "Telkom masts",
  unknown: "Unknown masts",
  uplink: "Carrier uplinks",
  backbone: "Backbone links",
  distribution: "Facility links",
  live: "Field-confirmed links",
  facilities: "Facilities",
};

function formatCoord(value: number) {
  return Number.isFinite(value) ? value.toFixed(6) : "—";
}

function metricClass(value: number) {
  if (value >= 20) return "text-emerald-300";
  if (value >= 10) return "text-amber-300";
  return "text-red-300";
}

function createEmptyPlannerState(propertyName = DEFAULT_PROPERTY_NAME, centre: GisCoordinate = DEFAULT_CENTER): PlannerState {
  return {
    propertyName,
    propertyCentre: centre,
    boundaryPolygon: null,
    boundaryAreaHa: 0,
    highSites: [],
    masts: [],
    selectedMastIndex: null,
    links: [],
    facilities: [],
    layerVis: DEFAULT_PLANNER_LAYER_VISIBILITY,
    recommendationSummary: "Awaiting real boundary, elevation, mast, facility, and LOS responses.",
  };
}

export async function createContinuousPlannerState(propertyName: string, centre: GisCoordinate, selectedMastId?: string, previous?: Partial<Pick<PlannerState, "facilities" | "layerVis" | "highSites" | "masts">>) {
  if (!isValidGisCoordinate(centre)) throw new Error("Invalid planning coordinate");
  const scan = await buildGisAutoScanWithApis(centre, { propertyName });
  if (!scan) throw new Error("Unable to build planner state from the selected coordinate");
  return buildPlannerStateFromGisScan({ propertyName, scan, selectedMastId, previous });
}

export function getBoundaryFirstViewportPoints(plannerState: PlannerState) {
  const boundary = sanitizePath(plannerState.boundaryPolygon ?? []);
  const context: GisCoordinate[] = [...boundary];
  const addPoint = (point: GisCoordinate) => {
    if (isValidGisCoordinate(point)) context.push({ lat: point.lat, lng: point.lng });
  };

  plannerState.highSites
    .filter((site) => plannerState.layerVis[site.category] && site.category !== "remote")
    .forEach(addPoint);
  plannerState.masts
    .filter((mast) => isMastVisible(mast, plannerState.layerVis) && (mast.selected || mast.closestForProvider || mast.distFromNearestRelay <= 15))
    .forEach(addPoint);
  plannerState.links
    .filter((link) => isLinkVisible(link, plannerState.layerVis))
    .forEach((link) => link.path.forEach(addPoint));
  if (plannerState.layerVis.facilities) plannerState.facilities.forEach(addPoint);
  if (context.length === 0 && plannerState.propertyCentre) addPoint(plannerState.propertyCentre);

  return { boundary, context };
}

export function fitPlannerMapToState(map: google.maps.Map | null, plannerState: PlannerState, padding = 56) {
  if (!map || !window.google?.maps?.LatLngBounds || typeof map.fitBounds !== "function") return false;
  const { context } = getBoundaryFirstViewportPoints(plannerState);
  if (context.length === 0) return false;
  const bounds = new window.google.maps.LatLngBounds();
  context.filter(isValidGisCoordinate).forEach((point) => bounds.extend(point));
  map.fitBounds(bounds, padding);
  return true;
}

export function createFacilityFromMapClick(input: { type: FacilityType; name: string; coordinate: GisCoordinate; existingCount: number; timestamp?: number }): Facility {
  return {
    id: `facility-${input.timestamp ?? Date.now()}-${input.existingCount + 1}`,
    type: input.type,
    name: input.name.trim() || `${FACILITY_TYPES[input.type].label} ${input.existingCount + 1}`,
    lat: Number(input.coordinate.lat.toFixed(6)),
    lng: Number(input.coordinate.lng.toFixed(6)),
  };
}

export function buildRouteDecisionExplanation(plannerState: PlannerState, viableLinkThresholdKm = 15): string {
  const selectedMast = plannerState.selectedMastIndex === null ? null : plannerState.masts[plannerState.selectedMastIndex] ?? null;
  const uplink = plannerState.links.find((link) => link.type === "uplink");
  const backboneLinks = plannerState.links.filter((link) => link.type === "backbone");
  const distributionLinks = plannerState.links.filter((link) => link.type === "distribution");
  const blockedLinks = plannerState.links.filter((link) => link.losStatus === "blocked");
  const overThresholdLinks = plannerState.links.filter((link) => link.distKm > viableLinkThresholdKm);
  const terminus = uplink?.fromName ?? plannerState.highSites.find((site) => site.category === "inside")?.name ?? plannerState.highSites[0]?.name ?? "the highest on-property relay candidate";
  const mastSentence = selectedMast
    ? `The planner evaluated ${selectedMast.name} as a carrier mast candidate and selected the best LOS-qualified uplink path near ${selectedMast.nearestRelayName ?? terminus}.`
    : "The planner has not found a carrier mast candidate yet, so the uplink remains a diagnostic pending Overpass results.";
  const relaySentence = `The first relay terminus is ${terminus}, keeping the design anchored to the property boundary before extending through ${backboneLinks.length} backbone segment${backboneLinks.length === 1 ? "" : "s"} and ${distributionLinks.length} facility path${distributionLinks.length === 1 ? "" : "s"}.`;
  const topologySentence = `Every rendered link is backed by a 20-point Open-Meteo elevation profile: green is confirmed LOS, amber is marginal, and red is blocked terrain diagnostics.`;
  const rangeSentence = overThresholdLinks.length > 0
    ? `${overThresholdLinks.length} link${overThresholdLinks.length === 1 ? " is" : "s are"} above the ${viableLinkThresholdKm} km field-validation threshold and should be treated as amber survey risk before quoting or construction.`
    : `No rendered link is currently above the ${viableLinkThresholdKm} km field-validation threshold, so the displayed topology is a planning candidate rather than construction approval.`;
  const surveySentence = blockedLinks.length > 0 ? `${blockedLinks.length} blocked path${blockedLinks.length === 1 ? " is" : "s are"} retained in red so the field team can see why alternate high sites or mast paths were preferred.` : `A field survey must still confirm Fresnel clearance, tower height, power autonomy, and final radio choice before CTTX treats the route as build-ready.`;
  return [mastSentence, relaySentence, topologySentence, rangeSentence, surveySentence].join(" ");
}

function calculateLinkBudget(link: NetworkLink): LinkBudget {
  const frequencyGhz = link.type === "uplink" ? 5.8 : 5.4;
  const antennaGainDbi = link.type === "distribution" ? 23 : 30;
  const txPowerDbm = 24;
  const pathLoss = 92.45 + 20 * Math.log10(Math.max(link.distKm, 0.1)) + 20 * Math.log10(frequencyGhz);
  const rsl = txPowerDbm + antennaGainDbi * 2 - pathLoss;
  return {
    bearingDeg: Number(calculateBearingDeg(link.path[0], link.path[1]).toFixed(0)),
    fadeMarginDb: Number((rsl + 76).toFixed(1)),
    rslDbm: Number(rsl.toFixed(1)),
    fresnelM: Number((17.32 * Math.sqrt(link.distKm / (4 * frequencyGhz))).toFixed(1)),
    throughputMbps: link.type === "uplink" ? 280 : link.type === "distribution" ? 160 : 220,
    targetBer: "≤ 10⁻⁶ before handover",
  };
}

function mastLayerKey(mast: Mast): PlannerLayerKey {
  return mast.provider;
}

function isMastVisible(mast: Mast, layerVis: PlannerState["layerVis"]) {
  return layerVis[mastLayerKey(mast)] && (!mast.hiddenByDefault || layerVis.unknown || mast.selected || mast.closestForProvider);
}

function isLinkVisible(link: NetworkLink, layerVis: PlannerState["layerVis"]) {
  if (link.live && !layerVis.live) return false;
  return layerVis[link.type];
}

function linkStrokeColor(link: NetworkLink) {
  if (link.losStatus === "confirmed") return "#22c55e";
  if (link.losStatus === "marginal") return "#f59e0b";
  if (link.losStatus === "blocked") return "#ef4444";
  return link.type === "uplink" ? "#3b82f6" : "#ffffff";
}

function losLabel(link: NetworkLink) {
  if (link.losStatus === "confirmed") return "Confirmed LOS";
  if (link.losStatus === "marginal") return "Marginal LOS";
  if (link.losStatus === "blocked") return "Blocked";
  return "LOS pending";
}

function linkStatusToken(link: NetworkLink) {
  if (link.losStatus === "confirmed") return "confirmed";
  if (link.losStatus === "marginal") return "marginal";
  if (link.losStatus === "blocked") return "blocked";
  return "pending";
}

function clearanceLabel(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "clr —";
  const rounded = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
  return `${rounded}m clr`;
}

function linkMapLabel(link: NetworkLink) {
  return `${link.type === "uplink" ? "Uplink" : link.type === "backbone" ? "Backbone" : "Facility"} · ${link.distKm.toFixed(1)} km · ${linkStatusToken(link)} · ${clearanceLabel(link.terrainMarginMeters)}`;
}

function pathMidpoint(path: NetworkLink["path"]) {
  return { lat: Number(((path[0].lat + path[1].lat) / 2).toFixed(6)), lng: Number(((path[0].lng + path[1].lng) / 2).toFixed(6)) };
}

function endpointHeightForLink(plannerState: PlannerState, endpointId: string, fallback: number) {
  const highSite = plannerState.highSites.find((site) => site.id === endpointId);
  if (highSite) return highSite.antennaHeightM ?? DEFAULT_HIGH_SITE_ANTENNA_HEIGHT_M;
  const mast = plannerState.masts.find((candidate) => candidate.id === endpointId);
  if (mast) return mast.antennaHeightM ?? DEFAULT_CARRIER_MAST_HEIGHT_M;
  return fallback;
}

function recalculateLinkForEndpointHeights(link: NetworkLink, plannerState: PlannerState): NetworkLink {
  const elevation = link.elevationProfile;
  if (!Array.isArray(elevation) || elevation.length < 2 || elevation.some((value) => typeof value !== "number" || !Number.isFinite(value))) return link;

  const startHeight = endpointHeightForLink(plannerState, link.fromId, link.type === "distribution" ? DEFAULT_FACILITY_ANTENNA_HEIGHT_M : DEFAULT_HIGH_SITE_ANTENNA_HEIGHT_M);
  const endHeight = endpointHeightForLink(plannerState, link.toId, link.type === "uplink" ? DEFAULT_CARRIER_MAST_HEIGHT_M : DEFAULT_HIGH_SITE_ANTENNA_HEIGHT_M);
  const startElev = elevation[0] + startHeight;
  const endElev = elevation[elevation.length - 1] + endHeight;
  let hasLineOfSight = true;
  let worstClearance = Infinity;

  for (let index = 0; index < elevation.length; index += 1) {
    const t = elevation.length === 1 ? 0 : index / (elevation.length - 1);
    const signalHeight = startElev + t * (endElev - startElev);
    const clearance = signalHeight - elevation[index];
    if (index > 0 && index < elevation.length - 1) {
      if (clearance < 0) hasLineOfSight = false;
      if (clearance < worstClearance) worstClearance = clearance;
    }
  }

  if (!Number.isFinite(worstClearance)) worstClearance = Math.min(startHeight, endHeight);
  const losStatus = !hasLineOfSight ? "blocked" : worstClearance < LOS_CONFIRMED_CLEARANCE_M ? "marginal" : "confirmed";
  const terrainMarginMeters = Number(worstClearance.toFixed(1));
  const baseJustification = link.justification.replace(/ · -?\d+(?:\.\d+)? m terrain clearance$/, "");

  return {
    ...link,
    viable: losStatus === "confirmed" || losStatus === "marginal",
    losStatus,
    terrainMarginMeters,
    justification: `${baseJustification} · ${terrainMarginMeters.toFixed(1)} m terrain clearance`,
  };
}

export function recalculatePlannerLinks(plannerState: PlannerState): PlannerState {
  return { ...plannerState, links: plannerState.links.map((link) => recalculateLinkForEndpointHeights(link, plannerState)) };
}

function layerCounts(plannerState: PlannerState): Record<PlannerLayerKey, number> {
  return {
    inside: plannerState.highSites.filter((site) => site.category === "inside").length,
    nearby: plannerState.highSites.filter((site) => site.category === "nearby").length,
    remote: plannerState.highSites.filter((site) => site.category === "remote").length,
    vodacom: plannerState.masts.filter((mast) => mast.provider === "vodacom").length,
    mtn: plannerState.masts.filter((mast) => mast.provider === "mtn").length,
    cellc: plannerState.masts.filter((mast) => mast.provider === "cellc").length,
    telkom: plannerState.masts.filter((mast) => mast.provider === "telkom").length,
    unknown: plannerState.masts.filter((mast) => mast.provider === "unknown").length,
    uplink: plannerState.links.filter((link) => link.type === "uplink").length,
    backbone: plannerState.links.filter((link) => link.type === "backbone").length,
    distribution: plannerState.links.filter((link) => link.type === "distribution").length,
    live: plannerState.links.filter((link) => link.live).length,
    facilities: plannerState.facilities.length,
  };
}

export default function LinkPlanner() {
  const [propertyName, setPropertyName] = useState(DEFAULT_PROPERTY_NAME);
  const [planName, setPlanName] = useState("CTTX LOS Backbone Draft");
  const [latitude, setLatitude] = useState(DEFAULT_CENTER.lat.toString());
  const [longitude, setLongitude] = useState(DEFAULT_CENTER.lng.toString());
  const [selectedMastId, setSelectedMastId] = useState<string | undefined>();
  const [pendingFacilityType, setPendingFacilityType] = useState<FacilityType | null>(null);
  const [propertyPinClickMode, setPropertyPinClickMode] = useState(false);
  const [heightSelection, setHeightSelection] = useState<HeightSelection>(null);
  const [plannerState, setPlannerState] = useState<PlannerState>(() => createEmptyPlannerState(DEFAULT_PROPERTY_NAME, DEFAULT_CENTER));
  const [scanStatus, setScanStatus] = useState<ScanStatus>({ loading: true, phase: "Preparing real API-backed scan", issues: [] });
  const [lastSavedId, setLastSavedId] = useState<number | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const lastAutoBuildSignatureRef = useRef("");
  const scanRequestIdRef = useRef(0);
  const overlayRefs = useRef<Array<google.maps.Polygon | google.maps.Polyline | google.maps.Marker>>([]);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const utils = trpc.useUtils();
  const savedPlans = trpc.linkPlans.list.useQuery({ limit: 8 });
  const createPlanMutation = trpc.linkPlans.create.useMutation({
    onSuccess: (plan) => {
      setLastSavedId(plan.id);
      utils.linkPlans.list.invalidate();
      toast.success("Link plan saved for field validation");
    },
    onError: (error) => toast.error(error.message),
  });
  const updatePlanMutation = trpc.linkPlans.update.useMutation({
    onSuccess: (plan) => {
      setLastSavedId(plan.id);
      utils.linkPlans.list.invalidate();
      toast.success("Link plan updated");
    },
    onError: (error) => toast.error(error.message),
  });

  const center = useMemo(() => {
    const parsedLat = Number(latitude);
    const parsedLng = Number(longitude);
    return isValidGisCoordinate({ lat: parsedLat, lng: parsedLng }) ? { lat: parsedLat, lng: parsedLng } : DEFAULT_CENTER;
  }, [latitude, longitude]);

  const budgets = useMemo(() => new Map(plannerState.links.map((link) => [link.id, calculateLinkBudget(link)])), [plannerState.links]);
  const counts = useMemo(() => layerCounts(plannerState), [plannerState]);
  const selectedMast = plannerState.selectedMastIndex === null ? null : plannerState.masts[plannerState.selectedMastIndex] ?? null;
  const selectedHeightEndpoint = heightSelection?.type === "highSite" ? plannerState.highSites.find((site) => site.id === heightSelection.id) ?? null : heightSelection?.type === "mast" ? plannerState.masts.find((mast) => mast.id === heightSelection.id) ?? null : null;
  const routeDecisionExplanation = useMemo(() => buildRouteDecisionExplanation(plannerState), [plannerState]);
  const totals = useMemo(() => {
    const totalDistanceKm = plannerState.links.reduce((total, link) => total + link.distKm, 0);
    const liveDistanceKm = plannerState.links.filter((link) => link.live).reduce((total, link) => total + link.distKm, 0);
    const fadeMargins = plannerState.links.map((link) => budgets.get(link.id)?.fadeMarginDb ?? 0);
    const weakestFadeMargin = fadeMargins.length ? Math.min(...fadeMargins) : 0;
    return { totalDistanceKm: Number(totalDistanceKm.toFixed(2)), liveDistanceKm: Number(liveDistanceKm.toFixed(2)), weakestFadeMargin };
  }, [budgets, plannerState.links]);

  const rebuildPlan = useCallback(async (nextSelectedMastId?: string, keepFacilities = true, overrideCenter?: GisCoordinate) => {
    const requestId = scanRequestIdRef.current + 1;
    scanRequestIdRef.current = requestId;
    const scanCentre = overrideCenter ?? center;
    if (!isValidGisCoordinate(scanCentre)) {
      toast.error("Invalid property coordinate");
      return;
    }
    setScanStatus({ loading: true, phase: "Loading Nominatim boundary, Open-Meteo SRTM grid, Overpass masts, and facilities", issues: [] });
    try {
      const next = await createContinuousPlannerState(propertyName.trim() || DEFAULT_PROPERTY_NAME, scanCentre, nextSelectedMastId, keepFacilities ? { facilities: plannerState.facilities, layerVis: plannerState.layerVis, highSites: plannerState.highSites, masts: plannerState.masts } : { layerVis: plannerState.layerVis, highSites: plannerState.highSites, masts: plannerState.masts });
      if (scanRequestIdRef.current !== requestId) return;
      setPlannerState(recalculatePlannerLinks(next));
      const resolvedMastId = nextSelectedMastId ?? next.masts[next.selectedMastIndex ?? 0]?.id;
      setSelectedMastId(resolvedMastId);
      setScanStatus({ loading: false, phase: "Real API-backed topology ready", issues: [] });
      window.setTimeout(() => fitPlannerMapToState(mapRef.current, next), 0);
      toast.success("Real-data LOS topology refreshed");
    } catch (error) {
      if (scanRequestIdRef.current !== requestId) return;
      const message = error instanceof Error ? error.message : "Unable to build real-data Link Planner topology";
      setScanStatus({ loading: false, phase: "Scan incomplete", issues: [message] });
      toast.error(message);
    }
  }, [center, plannerState.facilities, plannerState.highSites, plannerState.layerVis, plannerState.masts, propertyName]);

  useEffect(() => {
    const signature = `${propertyName.trim()}|${center.lat.toFixed(6)}|${center.lng.toFixed(6)}|${selectedMastId ?? "auto"}`;
    if (lastAutoBuildSignatureRef.current === signature) return;
    const timeout = window.setTimeout(() => {
      lastAutoBuildSignatureRef.current = signature;
      void rebuildPlan(selectedMastId, true, center);
    }, 550);
    return () => window.clearTimeout(timeout);
  }, [center, propertyName, rebuildPlan, selectedMastId]);

  const toggleLayer = (key: PlannerLayerKey) => {
    setPlannerState((current) => ({ ...current, layerVis: { ...current.layerVis, [key]: !current.layerVis[key] } }));
  };

  const setAllLayers = (visible: boolean) => {
    setPlannerState((current) => ({
      ...current,
      layerVis: Object.fromEntries(Object.keys(DEFAULT_PLANNER_LAYER_VISIBILITY).map((key) => [key, visible])) as Record<PlannerLayerKey, boolean>,
    }));
  };

  const toggleLinkLive = (linkId: string) => {
    setPlannerState((current) => ({ ...current, links: current.links.map((link) => (link.id === linkId ? { ...link, live: !link.live } : link)) }));
  };

  const updateHighSiteHeight = (siteId: string, height: number) => {
    setPlannerState((current) => {
      const next = { ...current, highSites: current.highSites.map((site) => (site.id === siteId ? { ...site, antennaHeightM: height } : site)) };
      return recalculatePlannerLinks(next);
    });
    toast.success(`High-site mast height set to ${height} m; connected links recalculated`);
  };

  const updateCarrierMastHeight = (mastId: string, height: number) => {
    setPlannerState((current) => {
      const next = { ...current, masts: current.masts.map((mast) => (mast.id === mastId ? { ...mast, antennaHeightM: height } : mast)) };
      return recalculatePlannerLinks(next);
    });
    toast.success(`Carrier mast height set to ${height} m; connected uplinks recalculated`);
  };

  const removeFacility = (facilityId: string) => {
    setPlannerState((current) => ({ ...current, facilities: current.facilities.filter((facility) => facility.id !== facilityId) }));
  };

  const savePlan = () => {
    const payload = {
      planName,
      propertyName: plannerState.propertyName,
      centerLatitude: plannerState.propertyCentre?.lat ?? center.lat,
      centerLongitude: plannerState.propertyCentre?.lng ?? center.lng,
      propertyAreaHa: plannerState.boundaryAreaHa,
      selectedMastId: selectedMast?.id,
      boundary: plannerState.boundaryPolygon ?? [],
      highSites: plannerState.highSites,
      providerMasts: plannerState.masts,
      links: plannerState.links.map((link) => ({ ...link, role: link.type, distanceKm: link.distKm, losStatus: link.losStatus, terrainMarginMeters: link.terrainMarginMeters, ...budgets.get(link.id) })),
      assumptions: {
        plannerState,
        losPolicy: "Green links are confirmed LOS, amber links are marginal, and red links are blocked diagnostics retained for field validation.",
        topologyPolicy: "Facility-to-high-site, high-site backbone, and high-site-to-carrier-mast paths are all generated from real API responses.",
        validation: "Field survey and final RF design required before construction.",
        stack: "Cambium Networks, cnMaestro, Victron Energy, Hubble Lithium",
      },
      recommendationSummary: plannerState.recommendationSummary,
      totalDistanceKm: totals.totalDistanceKm,
      liveDistanceKm: totals.liveDistanceKm,
      status: "Ready for Field Validation" as const,
    };
    if (lastSavedId) updatePlanMutation.mutate({ id: lastSavedId, ...payload });
    else createPlanMutation.mutate(payload);
  };

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;
    overlayRefs.current.forEach((overlay) => overlay.setMap(null));
    overlayRefs.current = [];

    const boundaryPath = sanitizePath(plannerState.boundaryPolygon ?? []);
    if (boundaryPath.length >= 3) {
      const boundary = new window.google.maps.Polygon({
        paths: boundaryPath,
        strokeColor: "#f8fafc",
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: "#f8fafc",
        fillOpacity: 0.06,
        map,
      });
      overlayRefs.current.push(boundary);
    }

    plannerState.links.filter((link) => isLinkVisible(link, plannerState.layerVis) && sanitizePath(link.path).length === 2).forEach((link) => {
      const polyline = new window.google.maps.Polyline({
        path: sanitizePath(link.path),
        geodesic: true,
        strokeColor: linkStrokeColor(link),
        strokeOpacity: link.losStatus === "blocked" ? 0.8 : 0.96,
        strokeWeight: link.live ? 4 : link.losStatus === "blocked" ? 2 : 3,
        icons: link.losStatus === "blocked" ? [{ icon: { path: "M 0,0 m -1,0 a 1,1 0 1,0 2,0 a 1,1 0 1,0 -2,0", fillColor: linkStrokeColor(link), fillOpacity: 1, strokeOpacity: 0, scale: 2 }, offset: "0", repeat: "14px" }] : link.losStatus === "marginal" ? [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "20px" }] : undefined,
        map,
      });
      overlayRefs.current.push(polyline);

      const label = new window.google.maps.Marker({
        map,
        position: pathMidpoint(link.path),
        title: linkMapLabel(link),
        label: { text: linkMapLabel(link), color: linkStrokeColor(link), fontWeight: "800", fontSize: "11px" },
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 0 },
      });
      overlayRefs.current.push(label);
    });

    plannerState.highSites.filter((site) => plannerState.layerVis[site.category] && isValidGisCoordinate(site)).forEach((site) => {
      const color = site.category === "inside" ? "#22c55e" : site.category === "nearby" ? "#f97316" : "#94a3b8";
      const marker = new window.google.maps.Marker({
        map,
        position: { lat: site.lat, lng: site.lng },
        title: `${site.name} · ${site.elevation ?? "Unknown"} m ASL · ${site.antennaHeightM ?? DEFAULT_HIGH_SITE_ANTENNA_HEIGHT_M} m mast`,
        label: { text: "▲", color, fontWeight: "900", fontSize: site.category === "remote" ? "14px" : "20px" },
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 0 },
      });
      marker.addListener("click", () => setHeightSelection({ type: "highSite", id: site.id }));
      overlayRefs.current.push(marker);
    });

    plannerState.masts.filter((mast) => isMastVisible(mast, plannerState.layerVis) && isValidGisCoordinate(mast)).forEach((mast) => {
      const marker = new window.google.maps.Marker({
        map,
        position: { lat: mast.lat, lng: mast.lng },
        title: `${mast.name} · ${mast.distFromNearestRelay.toFixed(1)} km from relay · ${mast.antennaHeightM ?? DEFAULT_CARRIER_MAST_HEIGHT_M} m mast`,
        label: { text: mast.closestForProvider ? "★" : "M", color: mast.selected ? "#facc15" : "#020617", fontWeight: "900" },
      });
      marker.addListener("click", () => {
        setSelectedMastId(mast.id);
        setPlannerState((current) => recalculatePlannerLinks({ ...current, selectedMastIndex: current.masts.findIndex((candidate) => candidate.id === mast.id), masts: current.masts.map((candidate) => ({ ...candidate, selected: candidate.id === mast.id })) }));
        setHeightSelection({ type: "mast", id: mast.id });
      });
      overlayRefs.current.push(marker);
    });

    if (plannerState.layerVis.facilities) {
      plannerState.facilities.filter(isValidGisCoordinate).forEach((facility) => {
        const facilityType = FACILITY_TYPES[facility.type];
        const marker = new window.google.maps.Marker({
          map,
          position: { lat: facility.lat, lng: facility.lng },
          title: `${facility.name} · ${facilityType.label}`,
          label: { text: facilityType.icon, color: "#020617", fontWeight: "900" },
        });
        overlayRefs.current.push(marker);
      });
    }

    fitPlannerMapToState(map, plannerState);

    return () => {
      overlayRefs.current.forEach((overlay) => overlay.setMap(null));
      overlayRefs.current = [];
    };
  }, [plannerState]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;
    clickListenerRef.current?.remove();
    if (!pendingFacilityType && !propertyPinClickMode) return;
    clickListenerRef.current = map.addListener("click", (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      const clicked = { lat: Number(event.latLng.lat().toFixed(6)), lng: Number(event.latLng.lng().toFixed(6)) };
      if (!isValidGisCoordinate(clicked)) {
        toast.error("Map click returned an invalid coordinate");
        return;
      }

      if (propertyPinClickMode) {
        setLatitude(formatCoord(clicked.lat));
        setLongitude(formatCoord(clicked.lng));
        setPropertyPinClickMode(false);
        void rebuildPlan(selectedMastId, true, clicked);
        toast.success("Property pin captured; real-data scan started");
        return;
      }

      if (!pendingFacilityType) return;
      const facilityType = FACILITY_TYPES[pendingFacilityType];
      const fallbackName = `${facilityType.label} ${plannerState.facilities.length + 1}`;
      const name = window.prompt(`Facility name for ${facilityType.label}`, fallbackName) || fallbackName;
      const facility = createFacilityFromMapClick({ type: pendingFacilityType, name, coordinate: clicked, existingCount: plannerState.facilities.length });
      setPlannerState((current) => ({ ...current, facilities: [...current.facilities, facility], layerVis: { ...current.layerVis, facilities: true } }));
      setPendingFacilityType(null);
      toast.success(`${facilityType.label} added to coverage targets`);
    });
    return () => clickListenerRef.current?.remove();
  }, [pendingFacilityType, plannerState.facilities, plannerState.layerVis, propertyName, propertyPinClickMode, rebuildPlan, selectedMastId]);

  return (
    <div className="min-h-screen rounded-3xl bg-slate-950 text-slate-100">
      <section className="grid gap-6 p-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-3xl border border-cyan-400/20 bg-slate-900/85 p-5 shadow-2xl shadow-cyan-950/30">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">CTTX Native Planner</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">LOS Link Planner</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">The Link Planner now runs the boundary, SRTM high-site scan, carrier mast discovery, facility detection, and LOS topology generation automatically from real Nominatim, Overpass, and Open-Meteo responses.</p>
            <div className={`mt-4 rounded-2xl border p-3 text-xs leading-5 ${scanStatus.loading ? "border-amber-300/30 bg-amber-300/10 text-amber-50" : scanStatus.issues.length ? "border-red-300/30 bg-red-500/10 text-red-50" : "border-emerald-300/30 bg-emerald-300/10 text-emerald-50"}`}>
              <div className="font-semibold text-white">{scanStatus.loading ? "Scanning real GIS sources" : scanStatus.phase}</div>
              <div>{scanStatus.phase}</div>
              {scanStatus.issues.map((issue) => <div key={issue} className="mt-1 text-red-100">{issue}</div>)}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="grid gap-3">
              <label className="text-sm font-medium text-slate-200">Plan name<input value={planName} onChange={(event) => setPlanName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2" /></label>
              <label className="text-sm font-medium text-slate-200">Property / reserve<input value={propertyName} onChange={(event) => setPropertyName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2" /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium text-slate-200">Latitude<input value={latitude} onChange={(event) => setLatitude(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2" /></label>
                <label className="text-sm font-medium text-slate-200">Longitude<input value={longitude} onChange={(event) => setLongitude(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2" /></label>
              </div>
              <label className="text-sm font-medium text-slate-200">Preferred carrier mast<select value={selectedMast?.id ?? ""} onChange={(event) => { setSelectedMastId(event.target.value); void rebuildPlan(event.target.value); }} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2"><option value="" disabled>{plannerState.masts.length ? "Select a carrier mast" : "Awaiting mast discovery"}</option>{plannerState.masts.map((mast) => <option key={mast.id} value={mast.id}>{mast.name} · {mast.distFromNearestRelay.toFixed(1)} km from relay</option>)}</select></label>
            </div>
            <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-xs leading-5 text-cyan-50">No step gates are used: changing the property, coordinate, or carrier mast starts a fresh real-data scan and topology rebuild automatically.</div>
            <div className="mt-5 grid grid-cols-2 gap-3"><Button type="button" onClick={() => void rebuildPlan(selectedMastId)} disabled={scanStatus.loading} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"><RefreshCw className={`mr-2 h-4 w-4 ${scanStatus.loading ? "animate-spin" : ""}`} /> Refresh plan</Button><Button type="button" onClick={savePlan} disabled={scanStatus.loading || createPlanMutation.isPending || updatePlanMutation.isPending} variant="outline" className="border-emerald-400/40 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20"><Save className="mr-2 h-4 w-4" /> Save</Button><Button type="button" variant="outline" onClick={() => { setPendingFacilityType(null); setPropertyPinClickMode((current) => !current); }} className={`col-span-2 border-cyan-300/30 ${propertyPinClickMode ? "bg-cyan-300/20 text-cyan-50" : "bg-slate-950 text-cyan-100"}`}><MapPin className="mr-2 h-4 w-4" /> {propertyPinClickMode ? "Click map to set property pin" : "Use map click as property pin"}</Button></div>
          </div>

          <Panel title="Facility placement" icon={<MapPin className="h-4 w-4 text-sky-300" />}>
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-xs leading-5 text-cyan-50">
              Overpass-detected lodges, gates, buildings, staff structures, pumps, offices, and other operational targets appear automatically when they fall inside the boundary. You can still add manual facilities by choosing a type and clicking the map.
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {PLANNER_FACILITY_OPTIONS.map((option) => (
                <Button key={option.id} type="button" variant="outline" onClick={() => { setPropertyPinClickMode(false); setPendingFacilityType(option.id); }} className={`justify-start border-white/10 bg-slate-950 text-xs text-slate-100 hover:bg-white/10 ${pendingFacilityType === option.id ? "ring-2 ring-cyan-300" : ""}`}>
                  <span className="mr-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full text-sm" style={{ backgroundColor: option.color }}>{option.icon}</span>{option.label}
                </Button>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              {plannerState.facilities.map((facility) => (
                <div key={facility.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-sm">
                  <div><div className="font-medium text-white">{FACILITY_TYPES[facility.type].icon} {facility.name}</div><div className="text-xs text-slate-400">{FACILITY_TYPES[facility.type].label} · {formatCoord(facility.lat)}, {formatCoord(facility.lng)}</div></div>
                  <Button type="button" size="sm" variant="outline" onClick={() => removeFacility(facility.id)} className="border-red-300/30 bg-red-500/10 text-red-100 hover:bg-red-500/20">Remove</Button>
                </div>
              ))}
              {plannerState.facilities.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">No facilities detected or placed yet. Add lodges, gates, camera points, pumps, ranger posts, offices, or other operational targets.</p>}
            </div>
          </Panel>

          <div className="grid grid-cols-2 gap-3"><MetricCard icon={<RadioTower className="h-4 w-4" />} label="LOS links" value={plannerState.links.length.toString()} detail="Green/amber/red" /><MetricCard icon={<Activity className="h-4 w-4" />} label="Field-confirmed" value={`${totals.liveDistanceKm} km`} detail={`${totals.totalDistanceKm} km planned`} /><MetricCard icon={<Zap className="h-4 w-4" />} label="Weakest margin" value={`${totals.weakestFadeMargin.toFixed(1)} dB`} detail="BER-first model" valueClass={metricClass(totals.weakestFadeMargin)} /><MetricCard icon={<CloudCog className="h-4 w-4" />} label="Monitoring" value="cnMaestro" detail="Remote visibility" /></div>
        </aside>

        <main className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-slate-950">
            <MapView className="h-[620px]" initialCenter={isValidGisCoordinate(center) ? center : DEFAULT_CENTER} initialZoom={12} onMapReady={(map) => { mapRef.current = map; map.setMapTypeId("hybrid"); fitPlannerMapToState(map, plannerState); }} />
            <div className="absolute right-4 top-4 z-10 w-72 rounded-2xl border border-white/15 bg-slate-950/80 p-3 text-xs text-slate-100 shadow-2xl backdrop-blur">
              <div className="mb-2 flex items-center gap-2 font-semibold text-white"><Layers3 className="h-4 w-4 text-cyan-300" /> Map layers</div>
              <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                {(Object.keys(layerLabels) as PlannerLayerKey[]).map((key) => <button key={key} type="button" onClick={() => toggleLayer(key)} className={`flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left transition ${plannerState.layerVis[key] ? "bg-white/10 text-white" : "bg-slate-900/70 text-slate-500 opacity-60"}`}><span>{layerLabels[key]}</span><span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200">{counts[key]}</span></button>)}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setAllLayers(true)} className="h-8 border-white/15 bg-white/10 text-xs text-white hover:bg-white/20">All on</Button><Button type="button" size="sm" variant="outline" onClick={() => setAllLayers(false)} className="h-8 border-white/15 bg-slate-900 text-xs text-slate-200 hover:bg-white/10">All off</Button></div>
            </div>
            {selectedHeightEndpoint && heightSelection && <div className="absolute left-4 bottom-4 z-20 w-80 rounded-2xl border border-cyan-300/25 bg-slate-950/90 p-4 text-xs text-slate-100 shadow-2xl backdrop-blur">
              <div className="flex items-start justify-between gap-3"><div><div className="font-semibold text-white">{heightSelection.type === "mast" ? "Carrier mast height" : "High-site mast height"}</div><div className="mt-1 leading-5 text-slate-300">{selectedHeightEndpoint.name} · current {selectedHeightEndpoint.antennaHeightM ?? (heightSelection.type === "mast" ? DEFAULT_CARRIER_MAST_HEIGHT_M : DEFAULT_HIGH_SITE_ANTENNA_HEIGHT_M)} m</div></div><button type="button" onClick={() => setHeightSelection(null)} className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-slate-300 hover:bg-white/10">Close</button></div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {(heightSelection.type === "mast" ? CARRIER_MAST_HEIGHT_OPTIONS : HIGH_SITE_HEIGHT_OPTIONS).map((height) => <button key={height} type="button" onClick={() => heightSelection.type === "mast" ? updateCarrierMastHeight(selectedHeightEndpoint.id, height) : updateHighSiteHeight(selectedHeightEndpoint.id, height)} className={`rounded-xl border px-2 py-2 font-semibold transition ${(selectedHeightEndpoint.antennaHeightM ?? (heightSelection.type === "mast" ? DEFAULT_CARRIER_MAST_HEIGHT_M : DEFAULT_HIGH_SITE_ANTENNA_HEIGHT_M)) === height ? "border-emerald-300 bg-emerald-300/20 text-emerald-50" : "border-white/10 bg-slate-900 text-slate-200 hover:border-cyan-300/50 hover:bg-cyan-300/10"}`}>{height}m</button>)}
              </div>
              <div className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-2 leading-5 text-emerald-50">Changing either endpoint recalculates clearance immediately while keeping every connected link visible.</div>
            </div>}
            {scanStatus.loading && <div className="absolute left-4 top-4 z-10 rounded-2xl border border-amber-300/30 bg-slate-950/90 px-4 py-3 text-sm text-amber-100 shadow-xl"><RefreshCw className="mr-2 inline h-4 w-4 animate-spin" /> {scanStatus.phase}</div>}
            {pendingFacilityType && <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-cyan-300/40 bg-slate-950/90 px-4 py-2 text-sm text-cyan-100 shadow-xl">Click the map to place {FACILITY_TYPES[pendingFacilityType].label}. Press another facility button to change type.</div>}
            {propertyPinClickMode && <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-emerald-300/40 bg-slate-950/90 px-4 py-2 text-sm text-emerald-100 shadow-xl">Click the property centre or reserve entrance. The planner will start the real-data scan immediately.</div>}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title="High-site candidates" icon={<Mountain className="h-4 w-4 text-cyan-300" />}><div className="space-y-3">{plannerState.highSites.map((site) => <button key={site.id} type="button" onClick={() => setHeightSelection({ type: "highSite", id: site.id })} className={`w-full rounded-2xl border p-3 text-left hover:border-cyan-300/50 ${heightSelection?.type === "highSite" && heightSelection.id === site.id ? "border-cyan-300/60 bg-cyan-300/10" : "border-white/10 bg-slate-950/70"}`}><div className="font-medium text-white">{site.name}</div><div className="mt-1 text-xs text-slate-400">{site.category} · {site.elevation ?? "unknown"} m ASL · mast {site.antennaHeightM ?? DEFAULT_HIGH_SITE_ANTENNA_HEIGHT_M} m · {formatCoord(site.lat)}, {formatCoord(site.lng)}</div></button>)}{!plannerState.highSites.length && <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">Awaiting Open-Meteo elevation grid results.</p>}</div></Panel>
            <Panel title="Carrier mast candidates" icon={<Antenna className="h-4 w-4 text-amber-300" />}><div className="space-y-3">{plannerState.masts.map((mast) => <button key={mast.id} type="button" onClick={() => { setSelectedMastId(mast.id); setHeightSelection({ type: "mast", id: mast.id }); void rebuildPlan(mast.id); }} className={`w-full rounded-2xl border p-3 text-left ${mast.selected || (heightSelection?.type === "mast" && heightSelection.id === mast.id) ? "border-amber-300/60 bg-amber-300/10" : "border-white/10 bg-slate-950/70"}`}><div className="font-medium text-white">{mast.closestForProvider ? "★ " : ""}{mast.name}</div><div className="mt-1 text-xs text-slate-400">{mast.provider.toUpperCase()} · mast {mast.antennaHeightM ?? DEFAULT_CARRIER_MAST_HEIGHT_M} m · {mast.distFromNearestRelay.toFixed(1)} km from relay · {mast.distFromCentre.toFixed(1)} km from centre</div></button>)}{!plannerState.masts.length && <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">Awaiting 30 km Overpass mast discovery.</p>}</div></Panel>
            <Panel title="Saved plans" icon={<ShieldCheck className="h-4 w-4 text-emerald-300" />}><div className="space-y-3">{(savedPlans.data ?? []).map((plan) => <button key={plan.id} type="button" onClick={() => setLastSavedId(plan.id)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-left hover:border-cyan-300/50"><div className="font-medium text-white">{plan.planName}</div><div className="mt-1 text-xs text-slate-400">{plan.propertyName} · {plan.status}</div></button>)}{!savedPlans.data?.length && <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">No saved link plans yet. Save the current field-validation draft to start the operational record.</p>}</div></Panel>
          </div>

          <Panel title="LOS-based link budget" icon={<CheckCircle2 className="h-4 w-4 text-emerald-300" />}><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm"><thead className="text-xs uppercase tracking-[0.18em] text-slate-400"><tr><th className="py-3">Type</th><th>Path</th><th>Distance</th><th>Bearing</th><th>RSL</th><th>Fade margin</th><th>Fresnel</th><th>Terrain</th><th>Status</th></tr></thead><tbody className="divide-y divide-white/10">{plannerState.links.map((link) => { const budget = budgets.get(link.id)!; return <tr key={link.id}><td className="py-3 text-cyan-200">{link.type.toUpperCase()}</td><td>{link.fromName} → {link.toName}</td><td>{link.distKm} km</td><td>{budget.bearingDeg}°</td><td>{budget.rslDbm} dBm</td><td className={metricClass(budget.fadeMarginDb)}>{budget.fadeMarginDb} dB</td><td>{budget.fresnelM} m</td><td>{typeof link.terrainMarginMeters === "number" ? `${link.terrainMarginMeters} m` : "—"}</td><td><button type="button" onClick={() => toggleLinkLive(link.id)} className="rounded-full px-2 py-1 text-xs" style={{ backgroundColor: `${linkStrokeColor(link)}22`, color: linkStrokeColor(link) }}>{losLabel(link)} · {link.live ? "field confirmed" : "planned"}</button></td></tr>; })}{!plannerState.links.length && <tr><td colSpan={9} className="py-6 text-center text-slate-400">Awaiting LOS topology generation.</td></tr>}</tbody></table></div><details className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-6 text-cyan-50"><summary className="cursor-pointer font-semibold text-white">Why this route was chosen</summary><p className="mt-3 text-cyan-50/90">{routeDecisionExplanation}</p></details></Panel>
          <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5 text-sm leading-6 text-emerald-50"><strong className="text-white">Recommendation:</strong> {plannerState.recommendationSummary}</div>
        </main>
      </section>
    </div>
  );
}

function MetricCard({ icon, label, value, detail, valueClass = "text-white" }: { icon: ReactNode; label: string; value: string; detail: string; valueClass?: string }) { return <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"><div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">{icon}{label}</div><div className={`mt-3 text-2xl font-semibold ${valueClass}`}>{value}</div><div className="mt-1 text-xs text-slate-500">{detail}</div></div>; }
function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) { return <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">{icon}{title}</div>{children}</section>; }
