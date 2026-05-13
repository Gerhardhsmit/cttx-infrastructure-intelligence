/*
 * CTTX Link Planner command-board philosophy:
 * Swiss operational typography, dark navy infrastructure intelligence, precise semantic colours,
 * fixed planning surfaces, and restrained engineering language. This route coordinates the full
 * planning sequence without step gates: boundary confirmation, parallel property evidence,
 * high-site backbone construction, facility distribution, uplink rendering, and map display.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import "@/styles/link-planner.css";
import PlannerLegend from "@/components/PlannerLegend";
import PlannerMap, { LayerKey, LayerState } from "@/components/PlannerMap";
import PlannerSidebar from "@/components/PlannerSidebar";
import {
  BackboneLink,
  BoundarySelection,
  CARRIER_MAST_HEIGHT_M,
  CARRIER_MAST_HEIGHT_OPTIONS,
  FACILITY_HEIGHT_OPTIONS,
  FACILITY_TYPES,
  HIGH_SITE_ANTENNA_HEIGHT_M,
  HIGH_SITE_MAST_HEIGHT_OPTIONS,
  MANUAL_LINK_HEIGHT_OPTIONS,
  Facility,
  FacilityTypeKey,
  HighSite,
  LatLng,
  Mast,
  ManualFacilityLink,
  ManualPointLink,
  Relay,
  RidgeCandidate,
  RoadFeature,
  buildLosTopology,
  calculateManualFacilityLink,
  calculateManualPointLink,
  facilityKey,
  formatKm,
  highSiteKey,
  findFacilities,
  findHighSites,
  findMasts,
  findRidgeCandidates,
  makeManualHighSite,
  makeRelay,
  rebaseMastsToRelay,
  mastKey,
  mastProviderLabel,
} from "@/lib/linkPlanner";
import { buildGisAutoScanWithApis } from "@/lib/gisAutoScan";
import {
  DEFAULT_CARRIER_MAST_HEIGHT_M as LEGACY_DEFAULT_CARRIER_MAST_HEIGHT_M,
  DEFAULT_HIGH_SITE_ANTENNA_HEIGHT_M as LEGACY_DEFAULT_HIGH_SITE_ANTENNA_HEIGHT_M,
  buildPlannerStateFromGisScan,
  type Facility as LegacyFacility,
  type FacilityType as LegacyFacilityType,
  type NetworkLink as LegacyNetworkLink,
  type PlannerCoordinate,
  type PlannerState as LegacyPlannerState,
} from "@/lib/plannerTypes";

export function getBoundaryFirstViewportPoints(state: LegacyPlannerState): { boundary: PlannerCoordinate[] | null; context: PlannerCoordinate[] } {
  const context: PlannerCoordinate[] = [];
  if (state.boundaryPolygon?.length) context.push(...state.boundaryPolygon);
  state.highSites.forEach(site => {
    if (state.layerVis[site.category]) context.push({ lat: site.lat, lng: site.lng });
  });
  state.masts.forEach(mast => {
    if (!mast.hiddenByDefault && state.layerVis[mast.provider]) context.push({ lat: mast.lat, lng: mast.lng });
  });
  if (state.layerVis.facilities) {
    state.facilities.forEach(facility => context.push({ lat: facility.lat, lng: facility.lng }));
  }
  return { boundary: state.boundaryPolygon, context };
}

export function fitPlannerMapToState(map: google.maps.Map | null | undefined, state: LegacyPlannerState, padding = 72): boolean {
  if (!map || typeof window === "undefined" || !window.google?.maps?.LatLngBounds) return false;
  const points = getBoundaryFirstViewportPoints(state).context;
  if (!points.length) return false;
  const bounds = new window.google.maps.LatLngBounds();
  points.forEach(point => bounds.extend(point));
  map.fitBounds(bounds, padding);
  return true;
}

export function createFacilityFromMapClick(input: {
  type: LegacyFacilityType;
  name: string;
  coordinate: PlannerCoordinate;
  existingCount: number;
  timestamp?: number;
}): LegacyFacility {
  const timestamp = input.timestamp ?? Date.now();
  const name = input.name.trim() || `${input.type} ${input.existingCount + 1}`;
  return {
    id: `facility-${timestamp}-${input.existingCount + 1}`,
    type: input.type,
    name,
    lat: Number(input.coordinate.lat.toFixed(6)),
    lng: Number(input.coordinate.lng.toFixed(6)),
  };
}

export function recalculatePlannerLinks(state: LegacyPlannerState): LegacyPlannerState {
  const highSites = new Map(state.highSites.map(site => [site.id, site]));
  const masts = new Map(state.masts.map(mast => [mast.id, mast]));
  const facilities = new Map(state.facilities.map(facility => [facility.id, facility]));
  const links: LegacyNetworkLink[] = state.links.map(link => {
    const fromHigh = highSites.get(link.fromId);
    const toHigh = highSites.get(link.toId);
    const fromMast = masts.get(link.fromId);
    const toMast = masts.get(link.toId);
    const fromFacility = facilities.get(link.fromId);
    const toFacility = facilities.get(link.toId);
    const highHeight = fromHigh?.antennaHeightM ?? toHigh?.antennaHeightM ?? LEGACY_DEFAULT_HIGH_SITE_ANTENNA_HEIGHT_M;
    const carrierHeight = fromMast?.antennaHeightM ?? toMast?.antennaHeightM ?? LEGACY_DEFAULT_CARRIER_MAST_HEIGHT_M;
    const facilityHeight = (fromFacility || toFacility) ? 5 : 0;
    const hasCustomHeight = highHeight !== LEGACY_DEFAULT_HIGH_SITE_ANTENNA_HEIGHT_M || carrierHeight !== LEGACY_DEFAULT_CARRIER_MAST_HEIGHT_M || facilityHeight > 5;
    if (!hasCustomHeight || !link.elevationProfile?.length || typeof link.terrainMarginMeters !== "number") return link;
    const extraHeight = Math.max(0, highHeight - LEGACY_DEFAULT_HIGH_SITE_ANTENNA_HEIGHT_M) + Math.max(0, carrierHeight - LEGACY_DEFAULT_CARRIER_MAST_HEIGHT_M) + Math.max(0, facilityHeight - 5);
    const terrainMarginMeters = Number(Math.min(120, Math.max(-80, link.terrainMarginMeters + extraHeight * 0.5)).toFixed(1));
    const losStatus: LegacyNetworkLink["losStatus"] = terrainMarginMeters >= 8 ? "confirmed" : terrainMarginMeters >= 0 ? "marginal" : "blocked";
    return {
      ...link,
      terrainMarginMeters,
      losStatus,
      viable: terrainMarginMeters >= 0,
    };
  });
  return { ...state, links };
}

export function buildRouteDecisionExplanation(state: LegacyPlannerState, thresholdKm: number): string {
  const selectedMast = state.selectedMastIndex === null ? null : state.masts[state.selectedMastIndex] ?? state.masts.find(mast => mast.selected) ?? null;
  const uplink = state.links.find(link => link.type === "uplink");
  const relayName = uplink?.fromName === selectedMast?.name ? uplink?.toName : uplink?.fromName ?? state.highSites.find(site => site.category === "inside")?.name ?? "the selected high point";
  const mastName = selectedMast?.name ?? uplink?.toName ?? "the selected carrier mast";
  return `${mastName} is prioritised because it is the closest selected provider structure with a viable path to ${relayName}. ${relayName} remains the relay terminus because the topology keeps facilities on one confirmed distribution path before extending the high-site backbone. The route policy uses one carrier uplink, a minimal high-site backbone, and one facility link per operating point to reduce tower count while preserving redundancy. Every candidate span is checked with a 20-point Open-Meteo elevation profile and compared with the ${thresholdKm} km field-validation threshold. Any marginal or blocked segment should be confirmed by field survey before procurement or mast installation.`;
}

export async function createContinuousPlannerState(propertyName: string, propertyCentre: PlannerCoordinate): Promise<LegacyPlannerState> {
  const scan = await buildGisAutoScanWithApis(propertyCentre, { propertyName });
  if (!scan) throw new Error("Unable to create a GIS auto-scan from the supplied planning centre.");
  return recalculatePlannerLinks(buildPlannerStateFromGisScan({ propertyName, scan }));
}

const INITIAL_LAYERS: LayerState = {
  boundary: { enabled: true, opacity: 0.95 },
  insideHighSites: { enabled: true, opacity: 1 },
  nearbyHighSites: { enabled: true, opacity: 0.72 },
  remoteHighSites: { enabled: false, opacity: 0.34 },
  masts: { enabled: true, opacity: 0.95 },
  unknownMasts: { enabled: true, opacity: 0.42 },
  backbone: { enabled: true, opacity: 1 },
  facilities: { enabled: true, opacity: 0.92 },
  roads: { enabled: true, opacity: 0.52 },
};

export default function LinkPlanner() {
  const [boundary, setBoundary] = useState<BoundarySelection | null>(null);
  const [highSites, setHighSites] = useState<HighSite[]>([]);
  const [masts, setMasts] = useState<Mast[]>([]);
  const [selectedMast, setSelectedMast] = useState<Mast | null>(null);
  const [selectedHighSite, setSelectedHighSite] = useState<HighSite | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [highSiteMastHeights, setHighSiteMastHeights] = useState<Record<string, number>>({});
  const [highSiteLabels, setHighSiteLabels] = useState<Record<string, string>>({});
  const [carrierMastHeights, setCarrierMastHeights] = useState<Record<string, number>>({});
  const [facilityHeights, setFacilityHeights] = useState<Record<string, number>>({});
  const [recalculatingSite, setRecalculatingSite] = useState(false);
  const [recalculatingMast, setRecalculatingMast] = useState(false);
  const [recalculatingFacility, setRecalculatingFacility] = useState(false);
  const rebuildRunIdRef = useRef(0);
  const [links, setLinks] = useState<BackboneLink[]>([]);
  const [losRedrawVersion, setLosRedrawVersion] = useState(0);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [roads, setRoads] = useState<RoadFeature[]>([]);
  const [layers, setLayers] = useState<LayerState>(INITIAL_LAYERS);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Select a boundary to begin terrain-led infrastructure planning.");
  const [error, setError] = useState<string | null>(null);
  const [manualHighSiteMode, setManualHighSiteMode] = useState(false);
  const [facilityMode, setFacilityMode] = useState<FacilityTypeKey | null>(null);
  const [relays, setRelays] = useState<Relay[]>([]);
  const [relayPlacementMode, setRelayPlacementMode] = useState(false);
  const [relayHeightPending, setRelayHeightPending] = useState<LatLng | null>(null);
  const [manualLinkMode, setManualLinkMode] = useState(false);
  const [manualLinkDraftA, setManualLinkDraftA] = useState<LatLng | null>(null);
  const [manualLinks, setManualLinks] = useState<ManualPointLink[]>([]);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(true);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(true);
  const [flyToTarget, setFlyToTarget] = useState<(LatLng & { id: string; label?: string }) | null>(null);
  const [ridgeCandidates, setRidgeCandidates] = useState<RidgeCandidate[]>([]);
  const [linkLabels, setLinkLabels] = useState<Record<string, string>>({});
  const [manualFacilityLinks, setManualFacilityLinks] = useState<ManualFacilityLink[]>([]);
  const [linkLabelPopup, setLinkLabelPopup] = useState<{ linkKey: string; position: LatLng; currentLabel: string } | null>(null);

  const onLayerChange = useCallback((key: LayerKey, patch: Partial<LayerState[LayerKey]>) => {
    setLayers(current => ({ ...current, [key]: { ...current[key], ...patch } }));
  }, [boundary]);

  const rebuildNetwork = useCallback(async (sites: HighSite[], operatingPoints: Facility[], carrierMasts: Mast[], mastHeights: Record<string, number> = {}, carrierHeights: Record<string, number> = {}, pointFacilityHeights: Record<string, number> = {}) => {
    const runId = rebuildRunIdRef.current + 1;
    rebuildRunIdRef.current = runId;
    setStatus("Calculating Open-Meteo terrain profiles and LOS-verified topology…");
    const nextLinks = await buildLosTopology(sites, operatingPoints, carrierMasts, { highSiteMastHeights: mastHeights, carrierMastHeights: carrierHeights, carrierMastHeight: CARRIER_MAST_HEIGHT_M, facilityHeights: pointFacilityHeights, boundaryPolygon: boundary?.polygon ?? null });
    if (runId === rebuildRunIdRef.current) {
      // Always replace the array and advance a redraw token. This makes height-button
      // recalculation visually obvious on the map even when the topology keeps the
      // same endpoints but changes LOS status, stroke style, or clearance label.
      setLinks(nextLinks.map(link => ({ ...link })));
      setLosRedrawVersion(version => version + 1);
    }
    return nextLinks;
  }, []);

  const onBoundaryPreview = useCallback((nextBoundary: BoundarySelection) => {
    setBoundary(nextBoundary);
    setStatus(nextBoundary.polygon.length >= 3 ? "Boundary polygon drawn. Confirm to load terrain, facility, and carrier evidence." : "Boundary centre selected. Confirm to run centre-based planning evidence.");
    setError(null);
  }, []);

  const onConfirmBoundary = useCallback(async () => {
    if (!boundary) return;
    setLoading(true);
    setError(null);
    setStatus("Auto-detecting facilities, high sites, and carrier masts in parallel…");
    setHighSites([]);
    setMasts([]);
    setSelectedMast(null);
    setSelectedHighSite(null);
    setSelectedFacility(null);
    setHighSiteMastHeights({});
    setHighSiteLabels({});
    setLosRedrawVersion(version => version + 1);
    setCarrierMastHeights({});
    setFacilityHeights({});
    setLinks([]);
    setFacilities([]);
    setRoads([]);
    setManualLinks([]);
    setManualLinkDraftA(null);
    setRidgeCandidates([]);
    setLinkLabels({});
    setLinkLabelPopup(null);

    const [facilityResult, siteResult, mastResult, ridgeResult] = await Promise.allSettled([
      findFacilities(boundary.polygon, boundary.centre),
      findHighSites(boundary.polygon, boundary.centre),
      findMasts(boundary.centre, boundary.polygon, [], message => setStatus(message)),
      findRidgeCandidates(boundary.polygon, boundary.centre),
    ]);

    const nextFacilityEvidence = facilityResult.status === "fulfilled" ? facilityResult.value : { facilities: [], roads: [] };
    const nextFacilities = nextFacilityEvidence.facilities;
    const nextRoads = nextFacilityEvidence.roads;
    const nextHighSites = siteResult.status === "fulfilled" ? siteResult.value : [];
    const insideSites = nextHighSites.filter(site => site.category === "inside");
    const rawMasts = mastResult.status === "fulfilled" ? mastResult.value : [];
    const nextMasts = rebaseMastsToRelay(rawMasts, boundary.centre, insideSites);
    const nextRidgeCandidates = ridgeResult.status === "fulfilled" ? ridgeResult.value : [];
    const firstSelected =
      nextMasts.find(mast => mast.isClosestForProvider && mast.provider !== "unknown" && mast.visible) ||
      nextMasts.find(mast => mast.provider !== "unknown") ||
      nextMasts[0] ||
      null;

    setHighSites(nextHighSites);
    setHighSiteLabels(Object.fromEntries(nextHighSites.map((site, index) => [highSiteKey(site), `HP-${index + 1}`])));
    setFacilities(nextFacilities);
    setRoads(nextRoads);
    setMasts(nextMasts);
    setRidgeCandidates(nextRidgeCandidates);
    setSelectedMast(firstSelected);
    const nextLinks = await rebuildNetwork(nextHighSites, nextFacilities, nextMasts, {}, {}, {});

    const failures = [
      facilityResult.status === "rejected" ? "facility and road detection" : null,
      siteResult.status === "rejected" ? "terrain candidate loading" : null,
      mastResult.status === "rejected" ? "carrier mast discovery" : null,
    ].filter(Boolean);

    if (failures.length) {
      setError(`Partial evidence loaded. Check ${failures.join(" and ")}. Manual relay and facility placement remain available.`);
    }

    const knownMasts = nextMasts.filter(mast => mast.provider !== "unknown").length;
    const backboneCount = nextLinks.filter(link => link.type === "backbone" || link.type === "outofrange").length;
    const distributionCount = nextLinks.filter(link => link.type === "distribution" || link.type === "relay").length;
    const uplinkCount = nextLinks.filter(link => link.type === "uplink").length;
    const confirmedCount = nextLinks.filter(link => link.losStatus === "confirmed").length;
    const marginalCount = nextLinks.filter(link => link.losStatus === "marginal").length;
    const blockedCount = nextLinks.filter(link => link.losStatus === "blocked").length;
    setStatus(
      `Planning evidence loaded: ${nextHighSites.length} high-site candidates, ${nextRidgeCandidates.length} ridge/boundary candidates, ${nextFacilities.length} detected facilities, ${nextRoads.length} roads, ${knownMasts} classified carrier masts, ${backboneCount} backbone spans, ${distributionCount} facility spans, ${uplinkCount} carrier uplinks. LOS: ${confirmedCount} confirmed, ${marginalCount} marginal, ${blockedCount} blocked diagnostics.`,
    );
    setLoading(false);
  }, [boundary, rebuildNetwork]);

  const handleMastSelect = useCallback((mast: Mast) => {
    setSelectedMast(mast);
    setStatus(`${mastProviderLabel(mast.provider)} structure selected. Choose a carrier mast height to recalculate every connected uplink without removing existing LOS lines.`);
  }, []);

  const handleHighSiteSelect = useCallback((site: HighSite) => {
    setSelectedHighSite(site);
    const key = highSiteKey(site);
    setHighSiteMastHeights(current => current[key] ? current : { ...current, [key]: HIGH_SITE_ANTENNA_HEIGHT_M });
    setStatus(`${site.name} selected. Height changes instantly recalculate connected uplink, backbone, and distribution LOS spans.`);
  }, []);

  const handleFacilitySelect = useCallback((facility: Facility) => {
    setSelectedFacility(facility);
    const key = facilityKey(facility);
    setFacilityHeights(current => key in current ? current : { ...current, [key]: 0 });
    setStatus(`${facility.name} selected. Height changes instantly recalculate all connected facility LOS spans.`);
  }, []);

  const handleRelayPlace = useCallback((point: LatLng) => {
    if (!boundary) {
      setStatus("Select a boundary before placing a relay.");
      return;
    }
    setRelayHeightPending(point);
  }, [boundary]);

  const handleManualHighSite = useCallback((point: LatLng) => {
    if (!boundary) {
      setStatus("Select a boundary before placing a manual relay candidate.");
      return;
    }
    const nextSite = makeManualHighSite(point, boundary.polygon, boundary.centre, highSites.filter(site => site.source === "manual").length + 1);
    const nextSites = [...highSites, nextSite];
    setHighSites(nextSites);
    void rebuildNetwork(nextSites, facilities, masts, highSiteMastHeights, carrierMastHeights, facilityHeights).then(nextLinks => {
      setStatus(`Manual relay candidate placed. LOS topology now has ${nextLinks.length} evaluated link spans.`);
    }).catch(() => {
      setStatus("Manual relay candidate placed, but LOS topology refresh could not complete. Try confirming the boundary again.");
    });
  }, [boundary, carrierMastHeights, facilities, facilityHeights, highSites, highSiteMastHeights, masts, rebuildNetwork]);

  const handleFacilityPlace = useCallback((point: LatLng) => {
    if (!facilityMode) return;
    const nextFacility = (() => {
      const countForType = facilities.filter(facility => facility.type === facilityMode).length + 1;
      const type = FACILITY_TYPES[facilityMode];
      return {
        id: `${facilityMode}-${Date.now()}`,
        lat: point.lat,
        lng: point.lng,
        type: facilityMode,
        name: `${type.label} ${countForType}`,
        source: "manual" as const,
      };
    })();
    const nextFacilities = [...facilities, nextFacility];
    setFacilities(nextFacilities);
    void rebuildNetwork(highSites, nextFacilities, masts, highSiteMastHeights, carrierMastHeights, facilityHeights).then(() => {
      setStatus(`${FACILITY_TYPES[facilityMode].label} placed and checked against LOS high-site candidates.`);
    }).catch(() => {
      setStatus(`${FACILITY_TYPES[facilityMode].label} placed, but LOS topology refresh could not complete. Try confirming the boundary again.`);
    });
  }, [carrierMastHeights, facilities, facilityHeights, facilityMode, highSites, highSiteMastHeights, masts, rebuildNetwork]);


  const selectedHighSiteKey = selectedHighSite ? highSiteKey(selectedHighSite) : "";
  const selectedMastHeight = selectedHighSite ? highSiteMastHeights[selectedHighSiteKey] ?? HIGH_SITE_ANTENNA_HEIGHT_M : HIGH_SITE_ANTENNA_HEIGHT_M;
  const selectedCarrierMastKey = selectedMast ? mastKey(selectedMast) : "";
  const selectedCarrierMastHeight = selectedMast ? carrierMastHeights[selectedCarrierMastKey] ?? CARRIER_MAST_HEIGHT_M : CARRIER_MAST_HEIGHT_M;
  const selectedFacilityKey = selectedFacility ? facilityKey(selectedFacility) : "";
  const selectedFacilityHeight = selectedFacility ? facilityHeights[selectedFacilityKey] ?? 0 : 0;

  const selectedMastReachability = useMemo(() => {
    if (!selectedMast) return [] as BackboneLink[];
    const matches = (point: LatLng & { name?: string }) => point.lat === selectedMast.lat && point.lng === selectedMast.lng;
    return links.filter(link => link.type === "uplink" && (matches(link.from) || matches(link.to)));
  }, [links, selectedMast]);

  const selectedHighSiteReachability = useMemo(() => {
    if (!selectedHighSite) return { highSites: [] as BackboneLink[], masts: [] as BackboneLink[], clusters: [] as BackboneLink[] };
    const matches = (point: LatLng & { name?: string }) => point.lat === selectedHighSite.lat && point.lng === selectedHighSite.lng && (!point.name || point.name === selectedHighSite.name);
    const connected = links.filter(link => matches(link.from) || matches(link.to));
    return {
      highSites: connected.filter(link => link.type === "backbone"),
      masts: connected.filter(link => link.type === "uplink"),
      clusters: connected.filter(link => link.type === "distribution" || link.type === "relay"),
    };
  }, [links, selectedHighSite]);

  const highSitePeerName = useCallback((link: BackboneLink) => {
    if (!selectedHighSite) return link.label || "Topology span";
    const fromSelected = link.from.lat === selectedHighSite.lat && link.from.lng === selectedHighSite.lng;
    const peer = fromSelected ? link.to : link.from;
    return peer.name || link.label || "Topology span";
  }, [selectedHighSite]);

  const updateSelectedMastHeight = useCallback(async (height: number) => {
    if (!selectedHighSite) return;
    const key = highSiteKey(selectedHighSite);
    const nextHeights = { ...highSiteMastHeights, [key]: height };
    const selectedKey = key;
    setHighSiteMastHeights(nextHeights);
    setLinks(current => current.map(link =>
      (link.from.lat === selectedHighSite.lat && link.from.lng === selectedHighSite.lng) ||
      (link.to.lat === selectedHighSite.lat && link.to.lng === selectedHighSite.lng)
        ? { ...link, label: `${link.label || 'LOS span'} · recalculating at ${height}m`, recalculating: true }
        : link
    ));
    setLosRedrawVersion(version => version + 1);
    setRecalculatingSite(true);
    try {
      const nextLinks = await rebuildNetwork(highSites, facilities, masts, nextHeights, carrierMastHeights, facilityHeights);
      const affected = nextLinks.filter(link => (link.from.lat === selectedHighSite.lat && link.from.lng === selectedHighSite.lng) || (link.to.lat === selectedHighSite.lat && link.to.lng === selectedHighSite.lng));
      const confirmed = affected.filter(link => link.losStatus === "confirmed").length;
      const marginal = affected.filter(link => link.losStatus === "marginal").length;
      const blocked = affected.filter(link => link.losStatus === "blocked").length;
      setLosRedrawVersion(version => version + 1);
      const label = highSiteLabels[selectedKey] || selectedHighSite.name;
      setStatus(`${label} instantly recalculated at ${height}m: ${confirmed} confirmed, ${marginal} marginal, ${blocked} blocked connected LOS spans.`);
    } catch {
      setStatus(`${selectedHighSite.name} height changed to ${height}m, but instant LOS refresh could not complete. Existing links remain visible.`);
    } finally {
      setRecalculatingSite(false);
    }
  }, [carrierMastHeights, facilities, facilityHeights, highSiteLabels, highSiteMastHeights, highSites, masts, rebuildNetwork, selectedHighSite]);

  const handleCarrierMastHeightChange = useCallback(async (height: number) => {
    if (!selectedMast) return;
    const key = mastKey(selectedMast);
    const nextCarrierHeights = { ...carrierMastHeights, [key]: height };
    setCarrierMastHeights(nextCarrierHeights);
    setRecalculatingMast(true);
    try {
      const nextLinks = await rebuildNetwork(highSites, facilities, masts, highSiteMastHeights, nextCarrierHeights, facilityHeights);
      const affected = nextLinks.filter(link => link.type === "uplink" && ((link.from.lat === selectedMast.lat && link.from.lng === selectedMast.lng) || (link.to.lat === selectedMast.lat && link.to.lng === selectedMast.lng)));
      const confirmed = affected.filter(link => link.losStatus === "confirmed").length;
      const marginal = affected.filter(link => link.losStatus === "marginal").length;
      const blocked = affected.filter(link => link.losStatus === "blocked").length;
      setStatus(`${mastProviderLabel(selectedMast.provider)} mast recalculated at ${height}m: ${confirmed} confirmed, ${marginal} marginal, ${blocked} blocked connected uplinks.`);
    } catch {
      setStatus(`${mastProviderLabel(selectedMast.provider)} mast-height recalculation could not complete. Existing LOS links remain visible; try again after the current request settles.`);
    } finally {
      setRecalculatingMast(false);
    }
  }, [carrierMastHeights, facilities, facilityHeights, highSiteMastHeights, highSites, masts, rebuildNetwork, selectedMast]);

  const handleFacilityHeightChange = useCallback(async (height: number) => {
    if (!selectedFacility) return;
    const key = facilityKey(selectedFacility);
    const nextFacilityHeights = { ...facilityHeights, [key]: height };
    setFacilityHeights(nextFacilityHeights);
    setRecalculatingFacility(true);
    try {
      const nextLinks = await rebuildNetwork(highSites, facilities, masts, highSiteMastHeights, carrierMastHeights, nextFacilityHeights);
      const affected = nextLinks.filter(link =>
        (link.type === "distribution" || link.type === "relay") &&
        (((link.from as { facilities?: Facility[] }).facilities || []).some(facility => facility.id === selectedFacility.id) ||
         ((link.to as { facilities?: Facility[] }).facilities || []).some(facility => facility.id === selectedFacility.id) ||
         (link.from.lat === selectedFacility.lat && link.from.lng === selectedFacility.lng) ||
         (link.to.lat === selectedFacility.lat && link.to.lng === selectedFacility.lng))
      );
      const confirmed = affected.filter(link => link.losStatus === "confirmed").length;
      const marginal = affected.filter(link => link.losStatus === "marginal").length;
      const blocked = affected.filter(link => link.losStatus === "blocked").length;
      setStatus(`${selectedFacility.name} instantly recalculated at ${height}m: ${confirmed} confirmed, ${marginal} marginal, ${blocked} blocked connected facility spans.`);
    } catch {
      setStatus(`${selectedFacility.name} height changed to ${height}m, but instant LOS refresh could not complete. Existing links remain visible.`);
    } finally {
      setRecalculatingFacility(false);
    }
  }, [carrierMastHeights, facilities, facilityHeights, highSiteMastHeights, highSites, masts, rebuildNetwork, selectedFacility]);

  const handleConfirmRelayHeight = useCallback((height: number) => {
    if (!relayHeightPending || !boundary) return;
    const nextRelay = makeRelay(relayHeightPending, height, relays.length + 1);
    const nextRelays = [...relays, nextRelay];
    setRelays(nextRelays);
    setRelayHeightPending(null);
    setStatus(`Relay placed at ${height}m height. Recalculating LOS topology…`);
    // Rebuild network with relays treated as high sites for LOS purposes
    void rebuildNetwork(
      [...highSites, ...nextRelays.map(r => ({ ...r, elevation: null, inside: true, distToCentre: 0, category: "inside" as const }))],
      facilities,
      masts,
      highSiteMastHeights,
      carrierMastHeights,
      facilityHeights
    ).then(nextLinks => {
      setStatus(`Relay placed at ${height}m. LOS topology now has ${nextLinks.length} evaluated link spans.`);
    }).catch(() => {
      setStatus("Relay placed, but LOS topology refresh could not complete.");
    });
  }, [relayHeightPending, relays, boundary, highSites, facilities, masts, highSiteMastHeights, carrierMastHeights, facilityHeights, rebuildNetwork]);


  const recalculateManualLink = useCallback(async (link: ManualPointLink) => {
    setManualLinks(current => current.map(item => item.id === link.id ? { ...item, calculating: true } : item));
    const next = await calculateManualPointLink(link);
    setManualLinks(current => current.map(item => item.id === link.id ? next : item));
    return next;
  }, []);

  const handleManualLinkMapClick = useCallback((point: LatLng) => {
    if (!manualLinkMode) return;
    if (!manualLinkDraftA) {
      setManualLinkDraftA(point);
      setStatus("Manual link Point A placed. Click Point B anywhere on the map to calculate LOS.");
      return;
    }
    const id = `manual-link-${Date.now()}`;
    const nextLink: ManualPointLink = {
      id,
      pointA: { ...manualLinkDraftA, label: "A", height: 18 },
      pointB: { ...point, label: "B", height: 18 },
      distKm: 0,
      losStatus: "unknown",
      worstClearance: 0,
      calculating: true,
    };
    setManualLinks(current => [...current, nextLink]);
    setManualLinkDraftA(null);
    setStatus("Manual point-to-point link placed. Fetching terrain profile and calculating LOS…");
    void calculateManualPointLink(nextLink).then(calculated => {
      setManualLinks(current => current.map(item => item.id === id ? calculated : item));
      setStatus(`Manual link ${calculated.pointA.height}m → ${calculated.pointB.height}m: ${calculated.losStatus} LOS, ${calculated.worstClearance.toFixed(1)}m clearance over ${formatKm(calculated.distKm)}.`);
    });
  }, [manualLinkDraftA, manualLinkMode]);

  const handleManualLinkHeightChange = useCallback((linkId: string, endpoint: "A" | "B", height: number) => {
    let target: ManualPointLink | null = null;
    setManualLinks(current => current.map(link => {
      if (link.id !== linkId) return link;
      target = {
        ...link,
        pointA: endpoint === "A" ? { ...link.pointA, height } : link.pointA,
        pointB: endpoint === "B" ? { ...link.pointB, height } : link.pointB,
        calculating: true,
      };
      return target;
    }));
    if (target) {
      void calculateManualPointLink(target).then(calculated => {
        setManualLinks(current => current.map(item => item.id === linkId ? calculated : item));
        setStatus(`Manual link recalculated: ${calculated.losStatus} LOS, ${calculated.worstClearance.toFixed(1)}m clearance.`);
      });
    }
  }, []);

  const handleManualLinkEndpointMove = useCallback((linkId: string, endpoint: "A" | "B", point: LatLng) => {
    let target: ManualPointLink | null = null;
    setManualLinks(current => current.map(link => {
      if (link.id !== linkId) return link;
      target = {
        ...link,
        pointA: endpoint === "A" ? { ...link.pointA, lat: point.lat, lng: point.lng } : link.pointA,
        pointB: endpoint === "B" ? { ...link.pointB, lat: point.lat, lng: point.lng } : link.pointB,
        calculating: true,
      };
      return target;
    }));
    if (target) {
      void calculateManualPointLink(target).then(calculated => {
        setManualLinks(current => current.map(item => item.id === linkId ? calculated : item));
        setStatus(`Manual link moved and recalculated: ${calculated.losStatus} LOS, ${calculated.worstClearance.toFixed(1)}m clearance.`);
      });
    }
  }, []);

  const handleManualLinkDelete = useCallback((linkId: string) => {
    setManualLinks(current => current.filter(link => link.id !== linkId));
    setStatus("Manual point-to-point link deleted.");
  }, []);

  const appStats = useMemo(() => ({
    insideSites: highSites.filter(site => site.category === "inside").length,
    knownMasts: masts.filter(mast => mast.provider !== "unknown").length,
    facilities: facilities.length,
    warnings: links.filter(link => link.losStatus === "blocked" || link.losStatus === "marginal").length,
  }), [facilities.length, highSites, links, masts]);

  const handleFacilityFocus = useCallback((facility: Facility) => {
    setFlyToTarget({ lat: facility.lat, lng: facility.lng, id: `${facility.id}-${Date.now()}`, label: facility.name });
    setStatus(`Flying map to ${facility.name} for visual inspection.`);
  }, []);

  const handleHighSiteLabelChange = useCallback((site: HighSite, label: string) => {
    const key = highSiteKey(site);
    const clean = label.trim() || `HP-${Math.max(1, highSites.findIndex(item => highSiteKey(item) === key) + 1)}`;
    setHighSiteLabels(current => ({ ...current, [key]: clean }));
    if (selectedHighSite && highSiteKey(selectedHighSite) === key) {
      setSelectedHighSite({ ...selectedHighSite, name: clean });
    }
    setLosRedrawVersion(version => version + 1);
    setStatus(`High point renamed to ${clean}. Existing LOS spans remain connected and visible.`);
  }, [highSites, selectedHighSite]);

  const handleFacilityPlaceWithName = useCallback((point: LatLng, name: string, type: keyof typeof FACILITY_TYPES) => {
    const nextFacility: Facility = {
      id: `manual-${type}-${Date.now()}`,
      lat: point.lat,
      lng: point.lng,
      type,
      name: name.trim() || `${FACILITY_TYPES[type].label} ${facilities.filter(f => f.type === type).length + 1}`,
      source: "manual" as const,
    };
    const nextFacilities = [...facilities, nextFacility];
    setFacilities(nextFacilities);

    // Auto-connect to nearest inside high point with a draggable link
    const insideSites = highSites.filter(s => s.category === "inside" || s.category === "nearby");
    const nearestSite = insideSites.length > 0
      ? insideSites.reduce((best, site) => {
          const d = Math.hypot(site.lat - point.lat, site.lng - point.lng);
          const bd = Math.hypot(best.lat - point.lat, best.lng - point.lng);
          return d < bd ? site : best;
        })
      : highSites.length > 0
        ? highSites.reduce((best, site) => {
            const d = Math.hypot(site.lat - point.lat, site.lng - point.lng);
            const bd = Math.hypot(best.lat - point.lat, best.lng - point.lng);
            return d < bd ? site : best;
          })
        : null;

    if (highSites.length > 0) {
      const linkId = `mfl-${nextFacility.id}`;
      const draftFacility = { lat: nextFacility.lat, lng: nextFacility.lng, name: nextFacility.name };
      const draft: ManualFacilityLink = {
        id: linkId,
        facilityId: nextFacility.id,
        facility: draftFacility,
        highSite: { lat: highSites[0].lat, lng: highSites[0].lng, name: highSites[0].name },
        distKm: 0,
        losStatus: "unknown",
        worstClearance: 0,
        calculating: true,
      };
      setManualFacilityLinks(current => [...current, draft]);
      setStatus(`"${nextFacility.name}" placed. Scanning LOS to all high points…`);

      // Calculate LOS to all high points and find the shortest-distance one with confirmed LOS
      const losPromises = highSites.map(site =>
        calculateManualFacilityLink({
          id: linkId,
          facilityId: nextFacility.id,
          facility: draftFacility,
          highSite: { lat: site.lat, lng: site.lng, name: site.name },
        })
      );

      void Promise.all(losPromises).then(results => {
        // Find the shortest-distance high point with confirmed LOS
        const confirmedResults = results.filter(r => r.losStatus === "confirmed");
        const bestResult = confirmedResults.length > 0
          ? confirmedResults.reduce((best, current) => current.distKm < best.distKm ? current : best)
          : results.reduce((best, current) => current.distKm < best.distKm ? current : best);

        setManualFacilityLinks(current => current.map(l => l.id === linkId ? bestResult : l));
        const statusMsg = confirmedResults.length > 0
          ? `"${nextFacility.name}" → ${bestResult.highSite.name}: CONFIRMED LOS · ${bestResult.worstClearance.toFixed(0)}m clearance`
          : `"${nextFacility.name}" → ${bestResult.highSite.name}: ${bestResult.losStatus.toUpperCase()} LOS · ${bestResult.worstClearance.toFixed(0)}m clearance (no confirmed LOS available)`;
        setStatus(statusMsg);
      }).catch(() => {
        setManualFacilityLinks(current => current.map(l => l.id === linkId ? { ...l, losStatus: "blocked" as const, calculating: false } : l));
        setStatus(`"${nextFacility.name}" placed, but LOS calculation failed.`);
      });
    } else {
      setStatus(`"${nextFacility.name}" placed. No high points available yet — run intelligence scan first.`);
    }

    void rebuildNetwork(highSites, nextFacilities, masts, highSiteMastHeights, carrierMastHeights, facilityHeights);
  }, [carrierMastHeights, facilities, facilityHeights, highSites, highSiteMastHeights, masts, rebuildNetwork]);

  const handleFacilityDelete = useCallback((facilityId: string) => {
    const target = facilities.find(f => f.id === facilityId);
    const nextFacilities = facilities.filter(f => f.id !== facilityId);
    setFacilities(nextFacilities);
    setManualFacilityLinks(current => current.filter(l => l.facilityId !== facilityId));
    setStatus(target ? `Facility "${target.name}" deleted.` : "Facility deleted.");
    void rebuildNetwork(highSites, nextFacilities, masts, highSiteMastHeights, carrierMastHeights, facilityHeights);
  }, [carrierMastHeights, facilities, facilityHeights, highSites, highSiteMastHeights, masts, rebuildNetwork]);

  const handleFacilityRename = useCallback((facilityId: string, name: string) => {
    const trimmed = name.trim();
    setFacilities(current => current.map(f => f.id === facilityId ? { ...f, name: trimmed || f.name } : f));
    // Also update the name in any manual facility link
    setManualFacilityLinks(current => current.map(l =>
      l.facilityId === facilityId ? { ...l, facility: { ...l.facility, name: trimmed || l.facility.name } } : l
    ));
    setLosRedrawVersion(v => v + 1);
    setStatus(`Facility renamed to "${trimmed}".`);
  }, []);

  const handleHighSiteRename = useCallback((site: HighSite, newName: string) => {
    const trimmed = newName.trim();
    setHighSites(current => current.map(s =>
      s.lat === site.lat && s.lng === site.lng ? { ...s, name: trimmed || s.name } : s
    ));
    setManualFacilityLinks(current => current.map(l =>
      l.highSite.lat === site.lat && l.highSite.lng === site.lng
        ? { ...l, highSite: { ...l.highSite, name: trimmed || l.highSite.name } }
        : l
    ));
    setLosRedrawVersion(v => v + 1);
    setStatus(`High point renamed to "${trimmed}".`);
  }, []);

  const handleMastRename = useCallback((mast: Mast, newName: string) => {
    const trimmed = newName.trim();
    setMasts(current => current.map(m =>
      m.lat === mast.lat && m.lng === mast.lng ? { ...m, name: trimmed || m.name } : m
    ));
    setLosRedrawVersion(v => v + 1);
    setStatus(`Mast renamed to "${trimmed}".`);
  }, []);

  const handleManualFacilityLinkReassign = useCallback((linkId: string, newHighSite: LatLng & { name: string }) => {
    setManualFacilityLinks(current => current.map(l => {
      if (l.id !== linkId) return l;
      const updated = { ...l, highSite: newHighSite, calculating: true, losStatus: "unknown" as const };
      void calculateManualFacilityLink({ id: l.id, facilityId: l.facilityId, facility: l.facility, highSite: newHighSite }).then(result => {
        setManualFacilityLinks(prev => prev.map(pl => pl.id === linkId ? result : pl));
        setStatus(`Reassigned to ${newHighSite.name}: ${result.losStatus.toUpperCase()} LOS · ${result.worstClearance.toFixed(0)}m clearance`);
      }).catch(() => {
        setManualFacilityLinks(prev => prev.map(pl => pl.id === linkId ? { ...pl, losStatus: "blocked" as const, calculating: false } : pl));
      });
      return updated;
    }));
  }, []);

  const handleLinkRightClick = useCallback((linkKey: string, position: LatLng, currentLabel: string) => {
    setLinkLabelPopup({ linkKey, position, currentLabel });
  }, []);

  const handleLinkLabelSave = useCallback((linkKey: string, label: string) => {
    setLinkLabels(current => ({ ...current, [linkKey]: label.trim() }));
    setLinkLabelPopup(null);
    setLosRedrawVersion(version => version + 1);
  }, []);

  const handleLinkLabelPopupClose = useCallback(() => {
    setLinkLabelPopup(null);
  }, []);

  return (
    <main className={`link-planner-page ${leftPanelCollapsed ? "left-collapsed" : ""} ${rightPanelCollapsed ? "right-collapsed" : ""}`}>
      <PlannerMap
        boundary={boundary}
        highSites={highSites}
        masts={masts}
        selectedMast={selectedMast}
        selectedHighSite={selectedHighSite}
        carrierMastHeights={carrierMastHeights}
        highSiteLabels={highSiteLabels}
        losRedrawVersion={losRedrawVersion}
        facilityHeights={facilityHeights}
        selectedFacility={selectedFacility}
        links={links}
        linkLabels={linkLabels}
        facilities={facilities}
        roads={roads}
        ridgeCandidates={ridgeCandidates}
        layers={layers}
        manualHighSiteMode={manualHighSiteMode}
        facilityMode={facilityMode}
        relayPlacementMode={relayPlacementMode}
        manualLinkMode={manualLinkMode}
        manualLinkDraftA={manualLinkDraftA}
        manualLinks={manualLinks}
        onManualLinkMapClick={handleManualLinkMapClick}
        onManualLinkEndpointMove={handleManualLinkEndpointMove}
        onManualHighSite={handleManualHighSite}
        onRelayPlace={handleRelayPlace}
        onFacilityPlace={handleFacilityPlace}
        onFacilityPlaceWithName={handleFacilityPlaceWithName}
        onFacilityDelete={handleFacilityDelete}
        onFacilityRename={handleFacilityRename}
        onHighSiteRename={handleHighSiteRename}
        onMastRename={handleMastRename}
        manualFacilityLinks={manualFacilityLinks}
        onManualFacilityLinkReassign={handleManualFacilityLinkReassign}
        onMastSelect={handleMastSelect}
        onHighSiteSelect={handleHighSiteSelect}
        onFacilitySelect={handleFacilitySelect}
        onLinkRightClick={handleLinkRightClick}
        onLinkLabelSave={handleLinkLabelSave}
        onLinkLabelPopupClose={handleLinkLabelPopupClose}
        linkLabelPopup={linkLabelPopup}
        flyToTarget={flyToTarget}
        sidePanelState={{ leftCollapsed: leftPanelCollapsed, rightCollapsed: rightPanelCollapsed }}
      />
      <PlannerSidebar
        boundary={boundary}
        highSites={highSites}
        masts={masts}
        selectedMast={selectedMast}
        links={links}
        facilities={facilities}
        loading={loading}
        status={status}
        error={error}
        relayHeightPending={relayHeightPending}
        onConfirmRelayHeight={handleConfirmRelayHeight}
        manualHighSiteMode={manualHighSiteMode}
        facilityMode={facilityMode}
        relays={relays}
        manualLinks={manualLinks}
        manualLinkMode={manualLinkMode}
        pendingManualLinkPoint={manualLinkDraftA}
        relayPlacementMode={relayPlacementMode}
        onRelayModeToggle={() => {
          setRelayPlacementMode(current => !current);
          setRelayHeightPending(null);
          setManualLinkMode(false);
          setManualLinkDraftA(null);
        }}
        onManualLinkModeToggle={() => {
          setManualLinkMode(current => !current);
          setManualLinkDraftA(null);
          setRelayPlacementMode(false);
          setManualHighSiteMode(false);
          setFacilityMode(null);
        }}
        onManualLinkHeightChange={handleManualLinkHeightChange}
        onManualLinkDelete={handleManualLinkDelete}
        onBoundaryPreview={onBoundaryPreview}
        onConfirmBoundary={onConfirmBoundary}
        onManualModeToggle={() => {
          setManualHighSiteMode(current => !current);
          setFacilityMode(null);
        }}
        onFacilityModeChange={type => {
          setFacilityMode(type);
          setManualHighSiteMode(false);
        }}
        onMastSelect={handleMastSelect}
        collapsed={leftPanelCollapsed}
        onToggleCollapsed={() => setLeftPanelCollapsed(current => !current)}
        onFacilityFocus={handleFacilityFocus}
        highSiteLabels={highSiteLabels}
        onHighSiteLabelChange={handleHighSiteLabelChange}
      />
      <PlannerLegend layers={layers} onLayerChange={onLayerChange} highSites={highSites} masts={masts} links={links} facilities={facilities} roads={roads} ridgeCandidates={ridgeCandidates} collapsed={rightPanelCollapsed} onToggleCollapsed={() => setRightPanelCollapsed(current => !current)} />

      {selectedHighSite ? (
        <section className="high-site-mast-panel" aria-label="Selected high-site mast-height controls">
          <div className="mast-panel-kicker">High-point mast intelligence</div>
          <div className="mast-panel-title-row">
            <input
              className="high-site-label-input"
              value={highSiteLabels[highSiteKey(selectedHighSite)] || selectedHighSite.name}
              aria-label="Editable high-point label"
              onChange={event => handleHighSiteLabelChange(selectedHighSite, event.target.value)}
            />
            <button type="button" onClick={() => setSelectedHighSite(null)} aria-label="Close high-site panel">×</button>
          </div>
          <div className="mast-panel-metrics">
            <span><strong>{selectedHighSite.elevation ? Math.round(selectedHighSite.elevation) : "—"}m</strong> terrain</span>
            <span><strong>{selectedMastHeight}m</strong> high-site mast</span>
            <span><strong>{CARRIER_MAST_HEIGHT_M}m</strong> default carrier tower</span>
          </div>
          <div className="mast-height-options" role="radiogroup" aria-label="High-site mast height options">
            {HIGH_SITE_MAST_HEIGHT_OPTIONS.map(height => (
              <button
                key={height}
                type="button"
                className={height === selectedMastHeight ? "active" : ""}
                onClick={() => updateSelectedMastHeight(height)}
                aria-pressed={height === selectedMastHeight}
              >
                {height}m
              </button>
            ))}
          </div>
          {recalculatingSite ? <div className="mast-auto-recalc-status">Recalculating terrain profiles instantly…</div> : <div className="mast-auto-recalc-status">Height buttons recalculate all connected LOS spans immediately.</div>}
          <div className="mast-reachability-grid">
            {[
              ["Carrier masts reachable", selectedHighSiteReachability.masts],
              ["Facility clusters served", selectedHighSiteReachability.clusters],
              ["High points visible", selectedHighSiteReachability.highSites],
            ].map(([title, rows]) => (
              <div className="mast-reachability-group" key={title as string}>
                <h3>{title as string}</h3>
                {(rows as BackboneLink[]).length ? (rows as BackboneLink[]).slice(0, 6).map(link => (
                  <div className={`reachability-row ${link.losStatus || "unknown"}`} key={`${link.type}-${link.from.lat}-${link.to.lat}-${link.distKm}`}>
                    <span>{highSitePeerName(link)}</span>
                    <strong>{link.losStatus || "unknown"}</strong>
                    <small>{formatKm(link.distKm)} · {typeof link.worstClearance === "number" && Number.isFinite(link.worstClearance) ? `${link.worstClearance.toFixed(1)}m clearance` : "clearance pending"}</small>
                  </div>
                )) : <p>No connected LOS spans currently selected in the topology.</p>}
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {selectedFacility ? (
        <section className={`high-site-mast-panel facility-height-panel ${selectedHighSite || selectedMast ? "stacked" : ""}`} aria-label="Selected facility antenna-height controls">
          <div className="mast-panel-kicker">Facility antenna intelligence</div>
          <div className="mast-panel-title-row">
            <h2>{selectedFacility.name}</h2>
            <button type="button" onClick={() => setSelectedFacility(null)} aria-label="Close facility panel">×</button>
          </div>
          <p className="mast-panel-note">{FACILITY_TYPES[selectedFacility.type].label} operating point</p>
          <div className="mast-panel-metrics">
            <span><strong>{selectedFacilityHeight}m</strong> facility antenna</span>
            <span><strong>{selectedFacility.lat.toFixed(5)}</strong> lat</span>
            <span><strong>{selectedFacility.lng.toFixed(5)}</strong> lng</span>
          </div>
          <div className="mast-height-options facility-height-options" role="radiogroup" aria-label="Facility antenna height options">
            {FACILITY_HEIGHT_OPTIONS.map(height => (
              <button
                key={height}
                type="button"
                className={height === selectedFacilityHeight ? "active" : ""}
                onClick={() => handleFacilityHeightChange(height)}
                aria-pressed={height === selectedFacilityHeight}
                disabled={recalculatingFacility || loading}
              >
                {height}m
              </button>
            ))}
          </div>
          {recalculatingFacility ? <div className="mast-auto-recalc-status">Recalculating facility LOS spans instantly…</div> : <div className="mast-auto-recalc-status">Antenna buttons recalculate connected facility links immediately.</div>}
        </section>
      ) : null}
      {selectedMast ? (
        <section className={`high-site-mast-panel carrier-mast-panel ${selectedHighSite || selectedFacility ? "stacked" : ""}`} aria-label="Selected carrier mast height controls">
          <div className="mast-panel-kicker">Carrier mast height intelligence</div>
          <div className="mast-panel-title-row">
            <h2>{mastProviderLabel(selectedMast.provider)} mast</h2>
            <button type="button" onClick={() => setSelectedMast(null)} aria-label="Close carrier mast panel">×</button>
          </div>
          <p className="mast-panel-note">{selectedMast.name || "Carrier structure"}</p>
          <div className="mast-panel-metrics">
            <span><strong>{selectedCarrierMastHeight}m</strong> carrier mast</span>
            <span><strong>{selectedMastReachability.length}</strong> connected uplinks</span>
          </div>
          <div className="mast-height-options carrier-height-options" role="radiogroup" aria-label="Carrier mast height options">
            {CARRIER_MAST_HEIGHT_OPTIONS.map(height => (
              <button
                key={height}
                type="button"
                className={height === selectedCarrierMastHeight ? "active" : ""}
                onClick={() => handleCarrierMastHeightChange(height)}
                aria-pressed={height === selectedCarrierMastHeight}
                disabled={recalculatingMast || loading}
              >
                {height}m
              </button>
            ))}
          </div>
          {recalculatingMast ? <div className="mast-auto-recalc-status">Recalculating connected uplinks instantly…</div> : <div className="mast-auto-recalc-status">Tower buttons recalculate connected uplinks immediately.</div>}
          <div className="mast-reachability-grid">
            <div className="mast-reachability-group">
              <h3>Connected LOS uplinks</h3>
              {selectedMastReachability.length ? selectedMastReachability.slice(0, 8).map(link => (
                <div className={`reachability-row ${link.losStatus || "unknown"}`} key={`mast-${link.from.lat}-${link.to.lat}-${link.distKm}`}>
                  <span>{link.from.name || link.to.name || "High-site uplink"}</span>
                  <strong>{link.losStatus || "unknown"}</strong>
                  <small>{formatKm(link.distKm)} · {typeof link.worstClearance === "number" && Number.isFinite(link.worstClearance) ? `${link.worstClearance.toFixed(1)}m clearance` : "clearance pending"}</small>
                </div>
              )) : <p>No connected uplinks are currently selected in the topology. Recalculate after changing height to test this mast.</p>}
            </div>
          </div>
        </section>
      ) : null}
      <div className="planner-topbar" aria-label="Infrastructure planning summary">
        <strong>CTTX Infrastructure Intelligence — Link Planner</strong>
        <span>{appStats.insideSites} core candidates</span>
        <span>{appStats.facilities} operating points</span>
        <span>{appStats.knownMasts} classified carriers</span>
        <span>{appStats.warnings} LOS warnings</span>
      </div>
    </main>
  );
}
