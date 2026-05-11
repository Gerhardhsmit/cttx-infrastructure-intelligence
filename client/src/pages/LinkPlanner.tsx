import { MapView } from "@/components/Map";
import { Button } from "@/components/ui/button";
import { buildGisAutoScan, calculateBearingDeg, calculateDistanceKm, type GisCoordinate } from "@/lib/gisAutoScan";
import {
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

type LinkBudget = {
  bearingDeg: number;
  fadeMarginDb: number;
  rslDbm: number;
  fresnelM: number;
  throughputMbps: number;
  targetBer: string;
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
  uplink: "Uplink links",
  backbone: "Backbone links",
  live: "Live links",
  facilities: "Facilities",
};

function formatCoord(value: number) {
  return value.toFixed(6);
}

function metricClass(value: number) {
  if (value >= 20) return "text-emerald-300";
  if (value >= 10) return "text-amber-300";
  return "text-red-300";
}

export function createContinuousPlannerState(propertyName: string, centre: GisCoordinate, selectedMastId?: string, previous?: Partial<Pick<PlannerState, "facilities" | "layerVis">>) {
  const scan = buildGisAutoScan(centre);
  if (!scan) throw new Error("Invalid planning coordinate");
  return buildPlannerStateFromGisScan({ propertyName, scan, selectedMastId, previous });
}

export function getBoundaryFirstViewportPoints(plannerState: PlannerState) {
  const boundary = plannerState.boundaryPolygon ?? [];
  const context: GisCoordinate[] = [...boundary];
  const addPoint = (point: GisCoordinate) => context.push({ lat: point.lat, lng: point.lng });

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
  context.forEach((point) => bounds.extend(point));
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
  const overThresholdLinks = plannerState.links.filter((link) => link.distKm > viableLinkThresholdKm);
  const terminus = uplink?.toName ?? plannerState.highSites.find((site) => site.category === "inside")?.name ?? plannerState.highSites[0]?.name ?? "the highest on-property relay candidate";
  const mastSentence = selectedMast
    ? `The planner chose ${selectedMast.name} as the single uplink candidate because it is the selected ${selectedMast.provider.toUpperCase()} mast and is about ${Math.round(selectedMast.distFromNearestRelay)} km from ${selectedMast.nearestRelayName ?? terminus}.`
    : "The planner has not selected a provider mast yet, so the route remains a boundary-first candidate plan pending mast confirmation.";
  const relaySentence = `The first relay terminus is ${terminus}, keeping the design anchored to the property boundary before extending through ${backboneLinks.length} nearest-neighbour backbone segment${backboneLinks.length === 1 ? "" : "s"}.`;
  const topologySentence = `Only one uplink is shown and the remaining clear links are chained as a nearest-neighbour backbone, which avoids an all-to-all LOS spider web and keeps the map field-readable.`;
  const rangeSentence = overThresholdLinks.length > 0
    ? `${overThresholdLinks.length} link${overThresholdLinks.length === 1 ? " is" : "s are"} above the ${viableLinkThresholdKm} km viable-link threshold and should be treated as amber survey risk before quoting or construction.`
    : `No rendered link is currently above the ${viableLinkThresholdKm} km viable-link threshold, so the displayed topology is a planning candidate rather than a construction approval.`;
  const surveySentence = `A field survey must still confirm Fresnel clearance, tower height, power autonomy, and final radio choice before CTTX treats the route as build-ready.`;
  return [mastSentence, relaySentence, topologySentence, rangeSentence, surveySentence].join(" ");
}

function calculateLinkBudget(link: NetworkLink): LinkBudget {
  const frequencyGhz = link.type === "uplink" ? 5.8 : 5.4;
  const antennaGainDbi = 30;
  const txPowerDbm = 24;
  const pathLoss = 92.45 + 20 * Math.log10(Math.max(link.distKm, 0.1)) + 20 * Math.log10(frequencyGhz);
  const rsl = txPowerDbm + antennaGainDbi * 2 - pathLoss;
  return {
    bearingDeg: Number(calculateBearingDeg(link.path[0], link.path[1]).toFixed(0)),
    fadeMarginDb: Number((rsl + 76).toFixed(1)),
    rslDbm: Number(rsl.toFixed(1)),
    fresnelM: Number((17.32 * Math.sqrt(link.distKm / (4 * frequencyGhz))).toFixed(1)),
    throughputMbps: link.type === "uplink" ? 280 : 220,
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
  const [plannerState, setPlannerState] = useState<PlannerState>(() => createContinuousPlannerState(DEFAULT_PROPERTY_NAME, DEFAULT_CENTER));
  const [lastSavedId, setLastSavedId] = useState<number | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const lastAutoBuildSignatureRef = useRef("");
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
    return Number.isFinite(parsedLat) && Number.isFinite(parsedLng) ? { lat: parsedLat, lng: parsedLng } : DEFAULT_CENTER;
  }, [latitude, longitude]);

  const budgets = useMemo(() => new Map(plannerState.links.map((link) => [link.id, calculateLinkBudget(link)])), [plannerState.links]);
  const counts = useMemo(() => layerCounts(plannerState), [plannerState]);
  const selectedMast = plannerState.selectedMastIndex === null ? null : plannerState.masts[plannerState.selectedMastIndex] ?? null;
  const routeDecisionExplanation = useMemo(() => buildRouteDecisionExplanation(plannerState), [plannerState]);
  const totals = useMemo(() => {
    const totalDistanceKm = plannerState.links.reduce((total, link) => total + link.distKm, 0);
    const liveDistanceKm = plannerState.links.filter((link) => link.live).reduce((total, link) => total + link.distKm, 0);
    const fadeMargins = plannerState.links.map((link) => budgets.get(link.id)?.fadeMarginDb ?? 0);
    const weakestFadeMargin = fadeMargins.length ? Math.min(...fadeMargins) : 0;
    return { totalDistanceKm: Number(totalDistanceKm.toFixed(2)), liveDistanceKm: Number(liveDistanceKm.toFixed(2)), weakestFadeMargin };
  }, [budgets, plannerState.links]);

  const rebuildPlan = useCallback((nextSelectedMastId?: string, keepFacilities = true) => {
    try {
      const next = createContinuousPlannerState(propertyName, center, nextSelectedMastId, keepFacilities ? { facilities: plannerState.facilities, layerVis: plannerState.layerVis } : { layerVis: plannerState.layerVis });
      setPlannerState(next);
      setSelectedMastId(nextSelectedMastId ?? next.masts[next.selectedMastIndex ?? 0]?.id);
      fitPlannerMapToState(mapRef.current, next);
      toast.success("Shared-contract LOS topology refreshed around the boundary");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to build planner state");
    }
  }, [center, plannerState.facilities, plannerState.layerVis, propertyName]);

  useEffect(() => {
    const signature = `${propertyName.trim()}|${center.lat.toFixed(6)}|${center.lng.toFixed(6)}|${selectedMastId ?? "auto"}`;
    if (lastAutoBuildSignatureRef.current === signature) return;
    const timeout = window.setTimeout(() => {
      try {
        setPlannerState((current) => {
          const next = createContinuousPlannerState(propertyName.trim() || DEFAULT_PROPERTY_NAME, center, selectedMastId, {
            facilities: current.facilities,
            layerVis: current.layerVis,
          });
          lastAutoBuildSignatureRef.current = signature;
          setSelectedMastId(selectedMastId ?? next.masts[next.selectedMastIndex ?? 0]?.id);
          fitPlannerMapToState(mapRef.current, next);
          return next;
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to continuously build Link Planner topology");
      }
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [center, propertyName, selectedMastId]);

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
      links: plannerState.links.map((link) => ({ ...link, role: link.type, distanceKm: link.distKm, losStatus: "clear" as const, ...budgets.get(link.id) })),
      assumptions: {
        plannerState,
        losPolicy: "Only confirmed clear LOS links are rendered; blocked, marginal, and speculative lines remain off-map.",
        topologyPolicy: "One uplink plus nearest-neighbour backbone only; no all-to-all spider web.",
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

    if (plannerState.boundaryPolygon?.length) {
      const boundary = new window.google.maps.Polygon({
        paths: plannerState.boundaryPolygon,
        strokeColor: "#f8fafc",
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: "#f8fafc",
        fillOpacity: 0.06,
        map,
      });
      overlayRefs.current.push(boundary);
    }

    plannerState.links.filter((link) => isLinkVisible(link, plannerState.layerVis)).forEach((link) => {
      const polyline = new window.google.maps.Polyline({
        path: link.path,
        geodesic: true,
        strokeColor: link.live ? "#eab308" : link.type === "uplink" ? "#3b82f6" : "#ffffff",
        strokeOpacity: 0.95,
        strokeWeight: link.live ? 3 : 2,
        icons: link.type === "uplink" && !link.live ? [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 }, offset: "0", repeat: "16px" }] : undefined,
        map,
      });
      overlayRefs.current.push(polyline);
    });

    plannerState.highSites.filter((site) => plannerState.layerVis[site.category]).forEach((site) => {
      const color = site.category === "inside" ? "#22c55e" : site.category === "nearby" ? "#f97316" : "#94a3b8";
      const marker = new window.google.maps.Marker({
        map,
        position: { lat: site.lat, lng: site.lng },
        title: `${site.name} · ${site.elevation ?? "Unknown"} m`,
        label: { text: "▲", color, fontWeight: "900", fontSize: site.category === "remote" ? "14px" : "20px" },
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 0 },
      });
      overlayRefs.current.push(marker);
    });

    plannerState.masts.filter((mast) => isMastVisible(mast, plannerState.layerVis)).forEach((mast) => {
      const marker = new window.google.maps.Marker({
        map,
        position: { lat: mast.lat, lng: mast.lng },
        title: `${mast.name} · ${mast.distFromNearestRelay.toFixed(1)} km from relay`,
        label: { text: mast.closestForProvider ? "★" : "M", color: mast.selected ? "#facc15" : "#020617", fontWeight: "900" },
      });
      overlayRefs.current.push(marker);
    });

    if (plannerState.layerVis.facilities) {
      plannerState.facilities.forEach((facility) => {
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

      if (propertyPinClickMode) {
        try {
          const next = createContinuousPlannerState(propertyName, clicked, selectedMastId, { facilities: plannerState.facilities, layerVis: plannerState.layerVis });
          setLatitude(formatCoord(clicked.lat));
          setLongitude(formatCoord(clicked.lng));
          setPlannerState(next);
          setSelectedMastId(selectedMastId ?? next.masts[next.selectedMastIndex ?? 0]?.id);
          setPropertyPinClickMode(false);
          fitPlannerMapToState(map, next);
          toast.success("Property pin captured and boundary-first Link Planner refreshed");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Unable to build planner state from the clicked property pin");
        }
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
  }, [pendingFacilityType, plannerState.facilities, plannerState.layerVis, propertyName, propertyPinClickMode, selectedMastId]);

  return (
    <div className="min-h-screen rounded-3xl bg-slate-950 text-slate-100">
      <section className="grid gap-6 p-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-3xl border border-cyan-400/20 bg-slate-900/85 p-5 shadow-2xl shadow-cyan-950/30">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">CTTX Native Planner</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">LOS Link Planner</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">The Link Planner runs Steps 1–4 as one continuous workflow: property/boundary context, SRTM high-site scan, provider mast discovery, and nearest-neighbour LOS backbone generation refresh together without step gates.</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="grid gap-3">
              <label className="text-sm font-medium text-slate-200">Plan name<input value={planName} onChange={(event) => setPlanName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2" /></label>
              <label className="text-sm font-medium text-slate-200">Property / reserve<input value={propertyName} onChange={(event) => setPropertyName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2" /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium text-slate-200">Latitude<input value={latitude} onChange={(event) => setLatitude(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2" /></label>
                <label className="text-sm font-medium text-slate-200">Longitude<input value={longitude} onChange={(event) => setLongitude(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2" /></label>
              </div>
              <label className="text-sm font-medium text-slate-200">Preferred backhaul mast<select value={selectedMast?.id ?? ""} onChange={(event) => { setSelectedMastId(event.target.value); rebuildPlan(event.target.value); }} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-cyan-400/40 focus:ring-2">{plannerState.masts.map((mast) => <option key={mast.id} value={mast.id}>{mast.name} · {mast.distFromNearestRelay.toFixed(1)} km from relay</option>)}</select></label>
            </div>
              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-xs leading-5 text-cyan-50">Continuous flow is active: edits rebuild the boundary, high-site list, mast candidates, and backbone automatically. Use Refresh only for a manual field-validation rebuild.</div>
              <div className="mt-5 grid grid-cols-2 gap-3"><Button type="button" onClick={() => rebuildPlan(selectedMastId)} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"><RefreshCw className="mr-2 h-4 w-4" /> Refresh plan</Button><Button type="button" onClick={savePlan} disabled={createPlanMutation.isPending || updatePlanMutation.isPending} variant="outline" className="border-emerald-400/40 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20"><Save className="mr-2 h-4 w-4" /> Save</Button><Button type="button" variant="outline" onClick={() => { setPendingFacilityType(null); setPropertyPinClickMode((current) => !current); }} className={`col-span-2 border-cyan-300/30 ${propertyPinClickMode ? "bg-cyan-300/20 text-cyan-50" : "bg-slate-950 text-cyan-100"}`}><MapPin className="mr-2 h-4 w-4" /> {propertyPinClickMode ? "Click map to set property pin" : "Use map click as property pin"}</Button></div>

          </div>

          <Panel title="Facility placement" icon={<MapPin className="h-4 w-4 text-sky-300" />}>
            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-xs leading-5 text-cyan-50">
              Boundary context is confirmed. Choose a facility type, then click the map to name and place it. The right-side legend controls all facility markers with one Facilities toggle.
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
              {plannerState.facilities.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">No facilities placed yet. Add lodges, gates, camera points, pumps, ranger posts, offices, or other operational targets.</p>}
            </div>
          </Panel>

          <div className="grid grid-cols-2 gap-3"><MetricCard icon={<RadioTower className="h-4 w-4" />} label="Visible LOS links" value={plannerState.links.length.toString()} detail="Clear links only" /><MetricCard icon={<Activity className="h-4 w-4" />} label="Live distance" value={`${totals.liveDistanceKm} km`} detail={`${totals.totalDistanceKm} km total`} /><MetricCard icon={<Zap className="h-4 w-4" />} label="Weakest margin" value={`${totals.weakestFadeMargin.toFixed(1)} dB`} detail="BER-first model" valueClass={metricClass(totals.weakestFadeMargin)} /><MetricCard icon={<CloudCog className="h-4 w-4" />} label="Monitoring" value="cnMaestro" detail="Remote visibility" /></div>
        </aside>

        <main className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-slate-950">
            <MapView className="h-[620px]" initialCenter={center} initialZoom={12} onMapReady={(map) => { mapRef.current = map; map.setMapTypeId("hybrid"); }} />
            <div className="absolute right-4 top-4 z-10 w-72 rounded-2xl border border-white/15 bg-slate-950/80 p-3 text-xs text-slate-100 shadow-2xl backdrop-blur">
              <div className="mb-2 flex items-center gap-2 font-semibold text-white"><Layers3 className="h-4 w-4 text-cyan-300" /> Map layers</div>
              <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                {(Object.keys(layerLabels) as PlannerLayerKey[]).map((key) => <button key={key} type="button" onClick={() => toggleLayer(key)} className={`flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left transition ${plannerState.layerVis[key] ? "bg-white/10 text-white" : "bg-slate-900/70 text-slate-500 opacity-60"}`}><span>{layerLabels[key]}</span><span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200">{counts[key]}</span></button>)}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setAllLayers(true)} className="h-8 border-white/15 bg-white/10 text-xs text-white hover:bg-white/20">All on</Button><Button type="button" size="sm" variant="outline" onClick={() => setAllLayers(false)} className="h-8 border-white/15 bg-slate-900 text-xs text-slate-200 hover:bg-white/10">All off</Button></div>
            </div>
            {pendingFacilityType && <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-cyan-300/40 bg-slate-950/90 px-4 py-2 text-sm text-cyan-100 shadow-xl">Click the map to place {FACILITY_TYPES[pendingFacilityType].label}. Press another facility button to change type.</div>}
            {propertyPinClickMode && <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-emerald-300/40 bg-slate-950/90 px-4 py-2 text-sm text-emerald-100 shadow-xl">Click the property centre or reserve entrance. The planner will rebuild and fit the boundary-first viewport.</div>}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title="High-site candidates" icon={<Mountain className="h-4 w-4 text-cyan-300" />}><div className="space-y-3">{plannerState.highSites.map((site) => <div key={site.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-3"><div className="font-medium text-white">{site.name}</div><div className="mt-1 text-xs text-slate-400">{site.category} · {site.elevation ?? "unknown"} m · {formatCoord(site.lat)}, {formatCoord(site.lng)}</div></div>)}</div></Panel>
            <Panel title="Backhaul candidates" icon={<Antenna className="h-4 w-4 text-amber-300" />}><div className="space-y-3">{plannerState.masts.map((mast) => <button key={mast.id} type="button" onClick={() => { setSelectedMastId(mast.id); rebuildPlan(mast.id); }} className={`w-full rounded-2xl border p-3 text-left ${mast.selected ? "border-amber-300/60 bg-amber-300/10" : "border-white/10 bg-slate-950/70"}`}><div className="font-medium text-white">{mast.closestForProvider ? "★ " : ""}{mast.name}</div><div className="mt-1 text-xs text-slate-400">{mast.provider.toUpperCase()} · {mast.distFromNearestRelay.toFixed(1)} km from relay · {mast.distFromCentre.toFixed(1)} km from centre</div></button>)}</div></Panel>
            <Panel title="Saved plans" icon={<ShieldCheck className="h-4 w-4 text-emerald-300" />}><div className="space-y-3">{(savedPlans.data ?? []).map((plan) => <button key={plan.id} type="button" onClick={() => setLastSavedId(plan.id)} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-left hover:border-cyan-300/50"><div className="font-medium text-white">{plan.planName}</div><div className="mt-1 text-xs text-slate-400">{plan.propertyName} · {plan.status}</div></button>)}{!savedPlans.data?.length && <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">No saved link plans yet. Save the current field-validation draft to start the operational record.</p>}</div></Panel>
          </div>

          <Panel title="LOS-only link budget" icon={<CheckCircle2 className="h-4 w-4 text-emerald-300" />}><div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="text-xs uppercase tracking-[0.18em] text-slate-400"><tr><th className="py-3">Type</th><th>Path</th><th>Distance</th><th>Bearing</th><th>RSL</th><th>Fade margin</th><th>Fresnel</th><th>Payload</th><th>Status</th></tr></thead><tbody className="divide-y divide-white/10">{plannerState.links.map((link) => { const budget = budgets.get(link.id)!; return <tr key={link.id}><td className="py-3 text-cyan-200">{link.type.toUpperCase()}</td><td>{link.fromName} → {link.toName}</td><td>{link.distKm} km</td><td>{budget.bearingDeg}°</td><td>{budget.rslDbm} dBm</td><td className={metricClass(budget.fadeMarginDb)}>{budget.fadeMarginDb} dB</td><td>{budget.fresnelM} m</td><td>{budget.throughputMbps} Mbps</td><td><button type="button" onClick={() => toggleLinkLive(link.id)} className="rounded-full bg-emerald-400/10 px-2 py-1 text-xs text-emerald-200">Clear LOS · {link.live ? "live" : "planned"}</button></td></tr>; })}</tbody></table></div><details className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-6 text-cyan-50"><summary className="cursor-pointer font-semibold text-white">Why this route was chosen</summary><p className="mt-3 text-cyan-50/90">{routeDecisionExplanation}</p></details></Panel>
          <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5 text-sm leading-6 text-emerald-50"><strong className="text-white">Recommendation:</strong> {plannerState.recommendationSummary}</div>
        </main>
      </section>
    </div>
  );
}

function MetricCard({ icon, label, value, detail, valueClass = "text-white" }: { icon: ReactNode; label: string; value: string; detail: string; valueClass?: string }) { return <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"><div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">{icon}{label}</div><div className={`mt-3 text-2xl font-semibold ${valueClass}`}>{value}</div><div className="mt-1 text-xs text-slate-500">{detail}</div></div>; }
function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) { return <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">{icon}{title}</div>{children}</section>; }
