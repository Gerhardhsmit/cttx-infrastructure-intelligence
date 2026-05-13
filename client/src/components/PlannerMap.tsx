/*
 * CTTX Link Planner command-board philosophy:
 * Swiss operational typography, dark navy infrastructure intelligence, precise semantic colours,
 * fixed planning surfaces, and restrained engineering language. This map keeps satellite terrain
 * as the primary evidence surface while overlays behave like engineered planning annotations.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { MapView } from "@/components/Map";
import {
  BackboneLink,
  BoundarySelection,
  CARRIER_MAST_HEIGHT_M,
  FACILITY_TYPES,
  Facility,
  HighSite,
  LINK_STYLES,
  LOS_LINK_STYLES,
  LatLng,
  ManualFacilityLink,
  ManualPointLink,
  Mast,
  PROVIDER_COLOURS,
  RidgeCandidate,
  RoadFeature,
  formatKm,
  facilityKey,
  isValidLatLng,
  mastKey,
  highSiteKey,
  mastProviderLabel,
} from "@/lib/linkPlanner";

export type LayerKey =
  | "boundary"
  | "insideHighSites"
  | "nearbyHighSites"
  | "remoteHighSites"
  | "masts"
  | "unknownMasts"
  | "backbone"
  | "facilities"
  | "roads";

export type LayerState = Record<LayerKey, { enabled: boolean; opacity: number }>;

type LinkLabelPopup = { linkKey: string; position: LatLng; currentLabel: string };
type FacilityPlacementPopup = { position: LatLng; pixelPosition: { x: number; y: number } };
type FacilityContextMenu = { facility: Facility; pixelPosition: { x: number; y: number } };

type PlannerMapProps = {
  boundary: BoundarySelection | null;
  highSites: HighSite[];
  masts: Mast[];
  selectedMast: Mast | null;
  selectedHighSite: HighSite | null;
  selectedFacility: Facility | null;
  carrierMastHeights: Record<string, number>;
  highSiteLabels: Record<string, string>;
  linkLabels: Record<string, string>;
  losRedrawVersion: number;
  facilityHeights: Record<string, number>;
  links: BackboneLink[];
  facilities: Facility[];
  roads: RoadFeature[];
  ridgeCandidates: RidgeCandidate[];
  layers: LayerState;
  linkLabelPopup: LinkLabelPopup | null;
  manualHighSiteMode: boolean;
  facilityMode: keyof typeof FACILITY_TYPES | null;
  relayPlacementMode: boolean;
  manualLinkMode: boolean;
  manualLinkDraftA: LatLng | null;
  manualLinks: ManualPointLink[];
  onManualLinkMapClick: (point: LatLng) => void;
  onManualLinkEndpointMove: (linkId: string, endpoint: "A" | "B", point: LatLng) => void;
  onRelayPlace: (point: LatLng) => void;
  onManualHighSite: (point: LatLng) => void;
  onFacilityPlace: (point: LatLng) => void;
  onFacilityPlaceWithName: (point: LatLng, name: string, type: keyof typeof FACILITY_TYPES) => void;
  onFacilityDelete: (facilityId: string) => void;
  onFacilityRename: (facilityId: string, name: string) => void;
  onHighSiteRename: (site: HighSite, newName: string) => void;
  onMastRename: (mast: Mast, newName: string) => void;
  manualFacilityLinks: ManualFacilityLink[];
  onManualFacilityLinkReassign: (linkId: string, newHighSite: LatLng & { name: string }) => void;
  onMastSelect: (mast: Mast) => void;
  onHighSiteSelect: (site: HighSite) => void;
  onFacilitySelect: (facility: Facility) => void;
  onLinkRightClick: (linkKey: string, position: LatLng, currentLabel: string) => void;
  onLinkLabelSave: (linkKey: string, label: string) => void;
  onLinkLabelPopupClose: () => void;
  flyToTarget: (LatLng & { id: string; label?: string }) | null;
  sidePanelState: { leftCollapsed: boolean; rightCollapsed: boolean };
};

type OverlayHandle = google.maps.Polygon | google.maps.Polyline | google.maps.marker.AdvancedMarkerElement;

type FacilityMarkerCluster = LatLng & {
  id: string;
  facilities: Facility[];
  type: keyof typeof FACILITY_TYPES;
};

const SOUTH_AFRICA_CENTRE = { lat: -29.2, lng: 24.7 };

const FACILITY_DOT_COLOURS: Record<keyof typeof FACILITY_TYPES, string> = {
  relay: "#22c55e",
  lodge: "#f59e0b",
  gate: "#38bdf8",
  camera: "#a78bfa",
  ranger: "#84cc16",
  pump: "#06b6d4",
  staff: "#f97316",
  office: "#eab308",
  other: "#94a3b8",
};

function clearOverlay(overlay: OverlayHandle) {
  if ("setMap" in overlay) overlay.setMap(null);
}

function createMarkerElement(className: string, inner: string, accent: string, opacity = 1) {
  const el = document.createElement("div");
  el.className = className;
  el.style.setProperty("--marker-accent", accent);
  el.style.opacity = String(opacity);
  el.innerHTML = inner;
  return el;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char] || char));
}

function displayFacilityName(facility: Facility) {
  const raw = facility.name?.trim();
  if (raw && !/^Facility\s+\d+$/i.test(raw) && !/^Lodge\s+\d+$/i.test(raw) && !/^Staff Quarters\s+\d+$/i.test(raw)) return raw;
  return FACILITY_TYPES[facility.type]?.label || "Operating point";
}

function facilityClusterRadiusKm(zoom: number) {
  if (zoom <= 10) return 1.4;
  if (zoom === 11) return 0.9;
  if (zoom === 12) return 0.48;
  if (zoom === 13) return 0.24;
  return 0;
}

function clusterMapFacilities(facilities: Facility[], zoom: number): FacilityMarkerCluster[] {
  const valid = facilities.filter(isValidLatLng);
  const radiusKm = facilityClusterRadiusKm(zoom);
  if (radiusKm <= 0) {
    return valid.map(facility => ({ id: facility.id, lat: facility.lat, lng: facility.lng, type: facility.type, facilities: [facility] }));
  }

  const remaining = new Set(valid.map(facility => facility.id));
  const clusters: FacilityMarkerCluster[] = [];
  valid.forEach(seed => {
    if (!remaining.has(seed.id)) return;
    const members: Facility[] = [];
    valid.forEach(candidate => {
      if (!remaining.has(candidate.id)) return;
      const km = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(seed.lat, seed.lng),
        new google.maps.LatLng(candidate.lat, candidate.lng),
      ) / 1000;
      if (km <= radiusKm) members.push(candidate);
    });
    members.forEach(member => remaining.delete(member.id));
    const lat = members.reduce((sum, member) => sum + member.lat, 0) / members.length;
    const lng = members.reduce((sum, member) => sum + member.lng, 0) / members.length;
    const typeCounts = members.reduce((counts, member) => {
      counts[member.type] = (counts[member.type] || 0) + 1;
      return counts;
    }, {} as Partial<Record<keyof typeof FACILITY_TYPES, number>>);
    const type = (Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "other") as keyof typeof FACILITY_TYPES;
    clusters.push({ id: `facility-map-cluster-${clusters.length + 1}`, lat, lng, type, facilities: members });
  });
  return clusters.filter(isValidLatLng);
}

function midpoint(a: LatLng, b: LatLng): LatLng {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

function hasValidLinkPath(link: BackboneLink) {
  return isValidLatLng(link.from) && isValidLatLng(link.to) && isValidLatLng(midpoint(link.from, link.to));
}

function makeLinePatternIcons(color: string, googleRef: typeof google, opacity: number, weight: number, dotted = false) {
  return [
    {
      icon: dotted
        ? {
            path: googleRef.maps.SymbolPath.CIRCLE,
            fillColor: color,
            fillOpacity: Math.max(0.72, opacity),
            strokeOpacity: 0,
            scale: Math.max(2.4, weight * 0.9),
          }
        : {
            path: "M 0,-1 0,1",
            strokeOpacity: Math.max(0.72, opacity),
            strokeColor: color,
            strokeWeight: weight,
            scale: 3.8,
          },
      offset: "0",
      repeat: dotted ? "13px" : "18px",
    } as google.maps.IconSequence,
  ];
}

function linkZIndex(type: BackboneLink["type"]) {
  if (type === "backbone") return 90;
  if (type === "uplink") return 82;
  if (type === "distribution") return 74;
  if (type === "relay") return 70;
  return 68;
}

function providerLabel(provider: Mast["provider"]) {
  return mastProviderLabel(provider).toUpperCase();
}

function highSiteDisplayLabel(site: HighSite, labels: Record<string, string>): string {
  return labels[highSiteKey(site)] || site.name || "High point";
}

function simpleDistanceKm(a: LatLng, b: LatLng) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

function samePoint(a: LatLng, b: LatLng) {
  return Math.abs(a.lat - b.lat) < 0.000001 && Math.abs(a.lng - b.lng) < 0.000001;
}

function mastHoverDetails(mast: Mast, highSites: HighSite[], links: BackboneLink[]) {
  const mastLinks = links
    .filter(link => link.type === "uplink" && (samePoint(link.from, mast) || samePoint(link.to, mast)))
    .sort((a, b) => a.distKm - b.distKm);
  const linked = mastLinks[0];
  if (linked) {
    return {
      distance: formatKm(linked.distKm),
      los: linked.losStatus ? linked.losStatus.toUpperCase() : "LOS pending",
    };
  }
  const nearest = highSites.filter(isValidLatLng).sort((a, b) => simpleDistanceKm(a, mast) - simpleDistanceKm(b, mast))[0];
  return {
    distance: nearest ? formatKm(simpleDistanceKm(nearest, mast)) : "—",
    los: "LOS pending",
  };
}

export default function PlannerMap({
  boundary,
  highSites,
  masts,
  selectedMast,
  selectedFacility,
  carrierMastHeights,
  highSiteLabels = {},
  linkLabels = {},
  losRedrawVersion = 0,
  facilityHeights,
  links,
  facilities,
  roads,
  ridgeCandidates = [],
  layers,
  linkLabelPopup,
  manualHighSiteMode,
  facilityMode,
  relayPlacementMode,
  manualLinkMode,
  manualLinkDraftA,
  manualLinks,
  onManualLinkMapClick,
  onManualLinkEndpointMove,
  onManualHighSite,
  onFacilityPlace,
  onFacilityPlaceWithName,
  onFacilityDelete,
  onFacilityRename,
  onHighSiteRename,
  onMastRename,
  manualFacilityLinks = [],
  onManualFacilityLinkReassign,
  onRelayPlace,
  onMastSelect,
  selectedHighSite,
  onHighSiteSelect,
  onFacilitySelect,
  onLinkRightClick,
  onLinkLabelSave,
  onLinkLabelPopupClose,
  flyToTarget,
  sidePanelState,
}: PlannerMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<OverlayHandle[]>([]);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const zoomListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const lastFitKeyRef = useRef<string>("");
  const [ready, setReady] = useState(false);
  const [zoomBucket, setZoomBucket] = useState(6);
  const [popupDraftLabel, setPopupDraftLabel] = useState("");
  const [facilityPopup, setFacilityPopup] = useState<FacilityPlacementPopup | null>(null);
  const [facilityPopupName, setFacilityPopupName] = useState("");
  const [facilityPopupType, setFacilityPopupType] = useState<keyof typeof FACILITY_TYPES>("other");
  const [facilityContextMenu, setFacilityContextMenu] = useState<FacilityContextMenu | null>(null);
  const [facilityRenameValue, setFacilityRenameValue] = useState("");
  const [facilityRenameMode, setFacilityRenameMode] = useState(false);

  // Sync popup draft label when popup opens
  useEffect(() => {
    if (linkLabelPopup) setPopupDraftLabel(linkLabelPopup.currentLabel);
  }, [linkLabelPopup]);

  const activePlacementLabel = useMemo(() => {
    if (manualLinkMode) return manualLinkDraftA ? "Point A placed. Click anywhere to place Point B and calculate LOS" : "Draw Link mode: click anywhere to place Point A";
    if (manualHighSiteMode) return "Click terrain to place a manual relay candidate";
    if (facilityMode) return `Click terrain to place ${FACILITY_TYPES[facilityMode].label}`;
    return null;
  }, [facilityMode, manualHighSiteMode, manualLinkDraftA, manualLinkMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !boundary?.polygon.length) return;
    const fitKey = `${boundary.id}-${highSites.length}-${masts.length}-${links.length}-${facilities.length}-${sidePanelState.leftCollapsed}-${sidePanelState.rightCollapsed}`;
    if (lastFitKeyRef.current === fitKey) return;
    lastFitKeyRef.current = fitKey;
    const bounds = new google.maps.LatLngBounds();
    boundary.polygon.filter(isValidLatLng).forEach(point => bounds.extend(point));
    highSites.filter(isValidLatLng).slice(0, 12).forEach(point => bounds.extend(point));
    links.filter(hasValidLinkPath).forEach(link => {
      bounds.extend(link.from);
      bounds.extend(link.to);
    });
    masts
      .filter(isValidLatLng)
      .filter(mast => mast.provider !== "unknown" || mast.isClosestForProvider)
      .slice(0, 24)
      .forEach(point => bounds.extend(point));
    map.fitBounds(bounds, {
      top: 80,
      right: sidePanelState.rightCollapsed ? 66 : 340,
      bottom: 80,
      left: sidePanelState.leftCollapsed ? 72 : 390,
    } as google.maps.Padding);
  }, [boundary, facilities.length, highSites, links, masts, ready, sidePanelState.leftCollapsed, sidePanelState.rightCollapsed]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !flyToTarget || !isValidLatLng(flyToTarget)) return;
    map.panTo({ lat: flyToTarget.lat, lng: flyToTarget.lng });
    const currentZoom = map.getZoom() || 6;
    window.setTimeout(() => map.setZoom(Math.max(currentZoom, 17)), 160);
  }, [flyToTarget, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    overlaysRef.current.forEach(clearOverlay);
    overlaysRef.current = [];
    const googleRef = window.google;
    if (!googleRef) return;

    const boundaryPath = boundary?.polygon.filter(isValidLatLng) ?? [];
    if (boundaryPath.length >= 3 && layers.boundary.enabled) {
      const boundaryPoly = new googleRef.maps.Polygon({
        map,
        paths: boundaryPath,
        strokeColor: "#67e8f9",
        strokeOpacity: layers.boundary.opacity,
        strokeWeight: 2,
        fillColor: "#0891b2",
        fillOpacity: layers.boundary.opacity * 0.12,
        clickable: false,
        zIndex: 20,
      });
      overlaysRef.current.push(boundaryPoly);
    }

    if (layers.roads.enabled && layers.roads.opacity > 0) {
      roads.forEach(road => {
        const roadPath = road.path.filter(isValidLatLng);
        if (roadPath.length < 2) return;
        const polyline = new googleRef.maps.Polyline({
          map,
          path: roadPath,
          strokeColor: "#f8fafc",
          strokeOpacity: layers.roads.opacity * 0.62,
          strokeWeight: road.type === "track" || road.type === "service" ? 1.5 : 2.5,
          clickable: false,
          zIndex: 30,
        });
        overlaysRef.current.push(polyline);
      });
    }

    links.forEach(link => {
      if (!hasValidLinkPath(link)) return;
      const losStyle = link.losStatus ? LOS_LINK_STYLES[link.losStatus] : null;
      const isUplink = link.type === "uplink";
      const isDistribution = link.type === "distribution" || link.type === "relay";
      const baseStyle = LINK_STYLES[link.live ? "live" : link.type];
      // Uplinks: cyan dashed. Backbone: thick solid. Distribution: thin solid.
      const style = isUplink
        ? { ...baseStyle, color: "#06b6d4", dashed: true, strokeWeight: 3 }
        : isDistribution
          ? { ...(losStyle || baseStyle), strokeWeight: 2 }
          : (losStyle || baseStyle);
      const lineOpacity = layers.backbone.enabled ? Math.max(layers.backbone.opacity, isDistribution ? 0.5 : 0.2) : 0;
      if (lineOpacity <= 0) return;
      const dashed = Boolean(style.dashed);
      const dotted = Boolean("dotted" in style && style.dotted);
      const patterned = dashed || dotted;
      const weight = link.type === "backbone" ? Math.max(5, style.strokeWeight) : isUplink ? 3.5 : link.type === "distribution" ? 2 : style.strokeWeight;
      // Unique key for this link (from+to positions)
      const linkKey = `${link.from.lat.toFixed(6)},${link.from.lng.toFixed(6)}-${link.to.lat.toFixed(6)},${link.to.lng.toFixed(6)}`;
      const polyline = new googleRef.maps.Polyline({
        map,
        path: [link.from, link.to],
        strokeColor: style.color,
        strokeOpacity: patterned ? (dotted ? 0 : lineOpacity * 0.16) : lineOpacity,
        strokeWeight: weight,
        icons: patterned ? makeLinePatternIcons(style.color, googleRef, lineOpacity, Math.max(2.2, weight), dotted).map(icon => ({ ...icon, fixedRotation: true })) : undefined,
        clickable: true,
        zIndex: linkZIndex(link.type),
      });
      // Right-click on polyline opens label editor
      polyline.addListener("rightclick", (event: google.maps.PolyMouseEvent) => {
        const lat = event?.latLng?.lat();
        const lng = event?.latLng?.lng();
        if (lat == null || lng == null) return;
        const currentLabel = linkLabels[linkKey] || link.label || "";
        onLinkRightClick(linkKey, { lat, lng }, currentLabel);
      });
      overlaysRef.current.push(polyline);

      {
        // MINIMAL LABELS: Only show labels on backbone and uplink links by default.
        // Distribution links are thin and clean — labels only shown if user has custom-labelled them.
        const isDistribution = link.type === "distribution" || link.type === "relay";
        const customLabel = linkLabels[linkKey];
        const showLabel = !isDistribution || Boolean(customLabel);

        if (showLabel) {
          const role = link.type === "uplink" ? "Uplink" : link.type === "backbone" ? "Backbone" : link.type === "relay" ? "Relay" : "Distribution";
          const losCopy = losStyle ? ` · ${losStyle.label.replace("LOS ", "")}` : "";
          const warning = link.losStatus === "marginal" || link.losStatus === "blocked" ? "⚠ " : "";
          const clearance = typeof link.worstClearance === "number" && Number.isFinite(link.worstClearance) ? ` · ${link.worstClearance.toFixed(0)}m clr` : "";
          const displayText = customLabel
            ? `${warning}${escapeHtml(customLabel)} · ${formatKm(link.distKm)}${losCopy}${clearance}`
            : `${warning}${role} · ${formatKm(link.distKm)}${losCopy}${clearance}`;
          const label = createMarkerElement(
            `planner-link-label ${link.type} ${link.losStatus || "unknown"}${customLabel ? " custom-label" : ""}`,
            `<span>${displayText}</span>`,
            style.color,
            Math.min(lineOpacity, 0.95),
          );
          const labelPosition = midpoint(link.from, link.to);
          if (!isValidLatLng(labelPosition)) return;
          const marker = new googleRef.maps.marker.AdvancedMarkerElement({
            map,
            position: labelPosition,
            content: label,
            title: `${customLabel || link.label || link.type} ${formatKm(link.distKm)} · right-click to rename`,
            zIndex: linkZIndex(link.type) + 1,
          });
          overlaysRef.current.push(marker);
        }
      }
    });

    // Ridge / boundary high-ground candidates
    ridgeCandidates.forEach(candidate => {
      if (!isValidLatLng(candidate)) return;
      const el = createMarkerElement(
        "planner-marker terrain-beacon ridge-candidate",
        `<span class="beacon-pin"></span><span class="beacon-label"><strong>${escapeHtml(candidate.name)}</strong><small>${candidate.elevation ? `${Math.round(candidate.elevation)}m` : "elev?"} · +${candidate.localRelief}m relief</small></span>`,
        "#f97316",
        0.92,
      );
      const marker = new googleRef.maps.marker.AdvancedMarkerElement({
        map,
        position: candidate,
        content: el,
        title: `${candidate.name} · ${candidate.elevation ? `${Math.round(candidate.elevation)}m elev` : ""} · +${candidate.localRelief}m local relief · boundary edge ${candidate.distToBoundaryKm}km`,
        zIndex: 96,
      });
      overlaysRef.current.push(marker);
    });



    manualLinks.forEach(link => {
      if (!isValidLatLng(link.pointA) || !isValidLatLng(link.pointB)) return;
      const style = LOS_LINK_STYLES[link.losStatus || "unknown"];
      const line = new googleRef.maps.Polyline({
        map,
        path: [link.pointA, link.pointB],
        strokeColor: style.color,
        strokeOpacity: link.calculating ? 0.45 : 0.92,
        strokeWeight: 4,
        clickable: false,
        zIndex: 130,
      });
      overlaysRef.current.push(line);
      const labelPosition = midpoint(link.pointA, link.pointB);
      const clearance = Number.isFinite(link.worstClearance) ? `${link.worstClearance.toFixed(1)}m clr` : "clearance pending";
      const label = createMarkerElement(
        `manual-link-label ${link.losStatus || "unknown"}`,
        `<span>${link.calculating ? "Calculating" : `${formatKm(link.distKm)} · ${escapeHtml(link.losStatus)} · ${clearance}`}</span>`,
        style.color,
        0.96,
      );
      overlaysRef.current.push(new googleRef.maps.marker.AdvancedMarkerElement({ map, position: labelPosition, content: label, title: "Manual point-to-point LOS", zIndex: 141 }));
      ([link.pointA, link.pointB] as const).forEach(endpoint => {
        const el = createMarkerElement(
          `manual-link-endpoint ${endpoint.label}`,
          `<span>${endpoint.label}</span><small>${endpoint.height}m</small>`,
          endpoint.label === "A" ? "#38bdf8" : "#f59e0b",
          1,
        );
        const marker = new googleRef.maps.marker.AdvancedMarkerElement({
          map,
          position: endpoint,
          content: el,
          title: `Point ${endpoint.label} · drag to recalculate · ${endpoint.height}m`,
          zIndex: 150,
          gmpDraggable: true,
        });
        marker.addListener("dragend", (event: any) => {
          const latLng = event?.latLng;
          if (!latLng) return;
          onManualLinkEndpointMove(link.id, endpoint.label, { lat: latLng.lat(), lng: latLng.lng() });
        });
        overlaysRef.current.push(marker);
      });
    });

    if (manualLinkDraftA && isValidLatLng(manualLinkDraftA)) {
      const el = createMarkerElement("manual-link-endpoint draft A", "<span>A</span><small>18m</small>", "#38bdf8", 1);
      overlaysRef.current.push(new googleRef.maps.marker.AdvancedMarkerElement({ map, position: manualLinkDraftA, content: el, title: "Manual link Point A", zIndex: 151 }));
    }

    highSites.forEach(site => {
      if (!isValidLatLng(site)) return;
      const layerKey = site.category === "inside" ? "insideHighSites" : site.category === "nearby" ? "nearbyHighSites" : "remoteHighSites";
      const layer = layers[layerKey];
      if (!layer.enabled || layer.opacity <= 0) return;
      const accent = site.category === "inside" ? "#22c55e" : site.category === "nearby" ? "#38bdf8" : "#64748b";
      const heightSetting = selectedHighSite && selectedHighSite.name === site.name && selectedHighSite.lat === site.lat && selectedHighSite.lng === site.lng ? undefined : undefined;
      const elev = site.elevation ? `${Math.round(site.elevation)}m` : site.source === "manual" ? "relay" : "terrain";
      const selected = Boolean(selectedHighSite && selectedHighSite.name === site.name && selectedHighSite.lat === site.lat && selectedHighSite.lng === site.lng);
      const el = createMarkerElement(
        `planner-marker terrain-beacon ${site.category} ${selected ? "selected" : ""}`,
        `<span class="beacon-pin"></span><span class="beacon-label"><strong>${escapeHtml(highSiteDisplayLabel(site, highSiteLabels))}</strong><small>${elev} terrain · click height</small></span>`,
        accent,
        layer.opacity,
      );
      const marker = new googleRef.maps.marker.AdvancedMarkerElement({ map, position: site, content: el, title: `${site.name} · click to adjust mast height`, zIndex: selected ? 125 : 100 });
      marker.addListener("click", () => onHighSiteSelect(site));
      el.addEventListener("contextmenu", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const newName = prompt(`Rename "${site.name}" to:`, site.name);
        if (newName && newName.trim()) onHighSiteRename(site, newName);
      });
      overlaysRef.current.push(marker);
    });

    masts.forEach(mast => {
      if (!isValidLatLng(mast)) return;
      const layerKey = mast.provider === "unknown" ? "unknownMasts" : "masts";
      const layer = layers[layerKey];
      if (!layer.enabled || layer.opacity <= 0) return;
      const accent = mast.isClosestForProvider ? "#eab308" : PROVIDER_COLOURS[mast.provider];
      const selected = selectedMast && selectedMast.lat === mast.lat && selectedMast.lng === mast.lng;
      const details = mastHoverDetails(mast, highSites, links);
      const provider = providerLabel(mast.provider);
      const safeName = escapeHtml(mast.name || mastProviderLabel(mast.provider));
      const el = createMarkerElement(
        `planner-marker mast-dot-marker ${mast.provider} ${mast.isClosestForProvider ? "closest" : ""} ${selected ? "selected" : ""}`,
        `<span class="mast-dot-core"></span><span class="mast-tooltip"><strong>${escapeHtml(provider)}</strong><small>${safeName}</small><small>${escapeHtml(details.distance)} to nearest high site</small><small>${carrierMastHeights[mastKey(mast)] ?? CARRIER_MAST_HEIGHT_M}m tower setting · ${escapeHtml(details.los)}</small></span>`,
        accent,
        mast.visible || mast.provider !== "unknown" ? Math.min(layer.opacity, 0.82) : Math.min(layer.opacity * 0.42, 0.5),
      );
      const marker = new googleRef.maps.marker.AdvancedMarkerElement({ map, position: mast, content: el, title: `${mastProviderLabel(mast.provider)} · ${details.distance} · ${carrierMastHeights[mastKey(mast)] ?? CARRIER_MAST_HEIGHT_M}m tower · ${details.los}`, zIndex: selected ? 116 : mast.provider === "unknown" ? 86 : 104 });
      marker.addListener("click", () => onMastSelect(mast));
      el.addEventListener("contextmenu", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const newName = prompt(`Rename "${mast.name || mastProviderLabel(mast.provider)}" to:`, mast.name || mastProviderLabel(mast.provider));
        if (newName && newName.trim()) onMastRename(mast, newName);
      });
      overlaysRef.current.push(marker);
    });

    const facilityLayer = layers.facilities;
    if (facilityLayer.enabled && facilityLayer.opacity > 0) {
      clusterMapFacilities(facilities, zoomBucket).forEach(cluster => {
        if (!isValidLatLng(cluster)) return;
        const type = FACILITY_TYPES[cluster.type];
        const accent = FACILITY_DOT_COLOURS[cluster.type] || FACILITY_DOT_COLOURS.other;
        const firstNamed = cluster.facilities.find(facility => displayFacilityName(facility) !== FACILITY_TYPES[facility.type].label);
        const label = cluster.facilities.length > 1
          ? `${cluster.facilities.length} nearby operating points`
          : displayFacilityName(cluster.facilities[0]);
        const representativeFacility = cluster.facilities[0];
        const isManual = representativeFacility?.source === "manual";
        const selected = Boolean(selectedFacility && cluster.facilities.some(facility => facility.id === selectedFacility.id));
        const representativeHeight = representativeFacility ? facilityHeights[facilityKey(representativeFacility)] ?? 0 : 0;
        const detail = cluster.facilities.length > 1
          ? `${firstNamed ? displayFacilityName(firstNamed) : type.label} and ${cluster.facilities.length - 1} more · click height`
          : `${type.label} · ${representativeHeight}m antenna setting`;
        const manualBadge = isManual && cluster.facilities.length === 1 ? `<span class="manual-badge">M</span>` : "";
        const el = createMarkerElement(
          `planner-marker facility-dot-marker ${cluster.facilities.length > 1 ? "clustered" : "single"} ${isManual ? "manual" : ""} ${selected ? "selected" : ""}`,
          `<span class="facility-dot-core">${manualBadge}${cluster.facilities.length > 1 ? `<b>${cluster.facilities.length}</b>` : ""}</span><span class="facility-tooltip"><strong>${escapeHtml(label)}</strong><small>${escapeHtml(detail)}</small></span>`,
          accent,
          Math.min(facilityLayer.opacity, 0.82),
        );
        const marker = new googleRef.maps.marker.AdvancedMarkerElement({
          map,
          position: cluster,
          content: el,
          title: `${label} · click to adjust antenna height${isManual ? " · right-click to rename/delete" : ""}`,
          zIndex: selected ? 92 : cluster.facilities.length > 1 ? 72 : 62,
        });
        marker.addListener("click", () => {
          const facility = cluster.facilities[0];
          if (facility) onFacilitySelect(facility);
        });
        // Right-click on manual facility opens context menu
        if (isManual && cluster.facilities.length === 1) {
          el.addEventListener("contextmenu", (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setFacilityContextMenu({ facility: cluster.facilities[0], pixelPosition: { x: e.clientX, y: e.clientY } });
            setFacilityRenameValue(cluster.facilities[0].name);
            setFacilityRenameMode(false);
          });
        }
        overlaysRef.current.push(marker);
      });
    }

    // Manual facility links — draggable high-site endpoint
    manualFacilityLinks.forEach(link => {
      if (!isValidLatLng(link.facility) || !isValidLatLng(link.highSite)) return;
      const losStyle = LOS_LINK_STYLES[link.losStatus || "unknown"];
      const lineOpacity = link.calculating ? 0.45 : 0.9;
      const line = new googleRef.maps.Polyline({
        map,
        path: [link.facility, link.highSite],
        strokeColor: losStyle.color,
        strokeOpacity: 0,
        strokeWeight: 3,
        icons: [{
          icon: { path: "M 0,-1 0,1", strokeOpacity: lineOpacity, strokeColor: losStyle.color, strokeWeight: 3, scale: 3.8 },
          offset: "0",
          repeat: "18px",
          fixedRotation: true,
        }],
        clickable: false,
        zIndex: 128,
      });
      overlaysRef.current.push(line);

      // Label at midpoint
      const mid = midpoint(link.facility, link.highSite);
      if (isValidLatLng(mid)) {
        const clearance = Number.isFinite(link.worstClearance) ? `${link.worstClearance.toFixed(0)}m clr` : "";
        const statusText = link.calculating ? "Calculating…" : `${link.losStatus.toUpperCase()} · ${formatKm(link.distKm)}${clearance ? ` · ${clearance}` : ""}`;
        const labelEl = createMarkerElement(
          `manual-link-label ${link.losStatus || "unknown"}`,
          `<span>${escapeHtml(link.facility.name)} → ${escapeHtml(link.highSite.name)}<br/><small>${statusText}</small></span>`,
          losStyle.color,
          0.95,
        );
        overlaysRef.current.push(new googleRef.maps.marker.AdvancedMarkerElement({ map, position: mid, content: labelEl, title: "Manual facility link", zIndex: 139 }));
      }

      // Draggable high-site endpoint
      const hsEl = createMarkerElement(
        "manual-facility-hs-endpoint",
        `<span>${escapeHtml(link.highSite.name)}</span><small>drag to reassign</small>`,
        losStyle.color,
        1,
      );
      const hsMarker = new googleRef.maps.marker.AdvancedMarkerElement({
        map,
        position: link.highSite,
        content: hsEl,
        title: `${link.highSite.name} · drag to reassign to another high point`,
        zIndex: 148,
        gmpDraggable: true,
      });
      hsMarker.addListener("dragend", (event: any) => {
        const latLng = event?.latLng;
        if (!latLng) return;
        const draggedPos = { lat: latLng.lat(), lng: latLng.lng() };
        // Snap to nearest high site within 500m
        const nearest = highSites
          .filter(isValidLatLng)
          .map(site => ({ site, d: Math.hypot(site.lat - draggedPos.lat, site.lng - draggedPos.lng) }))
          .sort((a, b) => a.d - b.d)[0];
        const snapTarget = nearest && nearest.d < 0.005 ? nearest.site : null;
        const newHighSite = snapTarget
          ? { lat: snapTarget.lat, lng: snapTarget.lng, name: snapTarget.name }
          : { lat: draggedPos.lat, lng: draggedPos.lng, name: link.highSite.name };
        onManualFacilityLinkReassign(link.id, newHighSite);
      });
      overlaysRef.current.push(hsMarker);
    });

    return () => {
      overlaysRef.current.forEach(clearOverlay);
      overlaysRef.current = [];
    };
  }, [boundary, carrierMastHeights, facilities, facilityHeights, highSites, layers, linkLabels, links, manualFacilityLinks, manualLinkDraftA, manualLinks, masts, onFacilitySelect, onHighSiteSelect, onLinkRightClick, onManualFacilityLinkReassign, onManualLinkEndpointMove, onMastSelect, ready, ridgeCandidates, roads, selectedFacility, selectedHighSite, selectedMast, zoomBucket]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    zoomListenerRef.current?.remove();
    const syncZoom = () => setZoomBucket(Math.round(map.getZoom() || 6));
    syncZoom();
    zoomListenerRef.current = map.addListener("zoom_changed", syncZoom);
    return () => zoomListenerRef.current?.remove();
  }, [ready]);

  const rightClickListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    clickListenerRef.current?.remove();
    if (!manualHighSiteMode && !facilityMode && !relayPlacementMode && !manualLinkMode) return;
    clickListenerRef.current = map.addListener("click", (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      const point = { lat: event.latLng.lat(), lng: event.latLng.lng() };
      if (manualLinkMode) { onManualLinkMapClick(point); return; }
      if (manualHighSiteMode) onManualHighSite(point);
      if (facilityMode) onFacilityPlace(point);
      if (relayPlacementMode) onRelayPlace(point);
    });
    return () => clickListenerRef.current?.remove();
  }, [facilityMode, manualHighSiteMode, manualLinkMode, onFacilityPlace, onManualHighSite, onManualLinkMapClick, onRelayPlace, ready, relayPlacementMode]);

  // Double-click on map = open inline facility placement popup
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    rightClickListenerRef.current?.remove();
    rightClickListenerRef.current = map.addListener("rightclick", (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      // Don't open popup if a placement mode is already active
      if (manualHighSiteMode || relayPlacementMode || manualLinkMode) return;
      event.stop?.();
      const point = { lat: event.latLng.lat(), lng: event.latLng.lng() };
      // Convert lat/lng to pixel position on screen
      const overlay = new google.maps.OverlayView();
      overlay.setMap(map);
      overlay.draw = () => {};
      overlay.onAdd = () => {
        const projection = overlay.getProjection();
        if (projection) {
          const pixel = projection.fromLatLngToContainerPixel(event.latLng!);
          if (pixel) {
            setFacilityPopup({ position: point, pixelPosition: { x: pixel.x, y: pixel.y } });
            setFacilityPopupName("");
            setFacilityPopupType("other");
          }
        }
        overlay.setMap(null);
      };
    });
    return () => rightClickListenerRef.current?.remove();
  }, [ready, manualHighSiteMode, relayPlacementMode, manualLinkMode]);

  return (
    <div className="planner-map-shell">
      <MapView
        className="planner-map-canvas"
        initialCenter={SOUTH_AFRICA_CENTRE}
        initialZoom={6}
        onMapReady={map => {
          mapRef.current = map;
          map.setMapTypeId("hybrid");
          map.setOptions({
            backgroundColor: "#020617",
            clickableIcons: false,
            disableDefaultUI: false,
            fullscreenControl: false,
            mapTypeControl: false,
            streetViewControl: false,
            zoomControl: true,
          });
          setReady(true);
        }}
      />
      <div className="map-vignette" />
      <div className="map-coordinate-rule top" />
      <div className="map-coordinate-rule bottom" />
      {!ready ? <div className="map-status-card">Initialising satellite terrain surface…</div> : null}
      {activePlacementLabel ? <div className="map-placement-card">{activePlacementLabel}</div> : null}
      <div className="map-attribution-note">Hybrid satellite terrain | public elevation and OpenStreetMap evidence</div>
      {/* Double-click facility placement popup */}
      {facilityPopup ? (
        <div
          className="facility-placement-popup"
          style={{ left: facilityPopup.pixelPosition.x, top: facilityPopup.pixelPosition.y }}
          role="dialog"
          aria-label="Place facility"
        >
          <div className="facility-placement-popup-inner">
            <div className="facility-placement-popup-header">
              <span>ADD FACILITY</span>
              <button type="button" onClick={() => setFacilityPopup(null)} aria-label="Cancel">×</button>
            </div>
            <input
              className="facility-placement-popup-input"
              type="text"
              value={facilityPopupName}
              placeholder="Name (e.g. Staff House 3)…"
              autoFocus
              onChange={e => setFacilityPopupName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  onFacilityPlaceWithName(facilityPopup.position, facilityPopupName, facilityPopupType);
                  setFacilityPopup(null);
                }
                if (e.key === "Escape") setFacilityPopup(null);
              }}
            />
            <select
              className="facility-placement-popup-type"
              value={facilityPopupType}
              onChange={e => setFacilityPopupType(e.target.value as keyof typeof FACILITY_TYPES)}
            >
              {(Object.keys(FACILITY_TYPES) as (keyof typeof FACILITY_TYPES)[]).filter(k => k !== "relay").map(key => (
                <option key={key} value={key}>{FACILITY_TYPES[key].label}</option>
              ))}
            </select>
            <button
              type="button"
              className="facility-placement-popup-save"
              onClick={() => {
                onFacilityPlaceWithName(facilityPopup.position, facilityPopupName, facilityPopupType);
                setFacilityPopup(null);
              }}
            >
              Save (5m height)
            </button>
          </div>
        </div>
      ) : null}

      {/* Right-click context menu for manual facilities */}
      {facilityContextMenu ? (
        <div
          className="facility-context-menu"
          style={{ left: facilityContextMenu.pixelPosition.x, top: facilityContextMenu.pixelPosition.y }}
          role="menu"
          aria-label="Facility actions"
        >
          {facilityRenameMode ? (
            <div className="facility-context-rename">
              <input
                type="text"
                value={facilityRenameValue}
                autoFocus
                onChange={e => setFacilityRenameValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    onFacilityRename(facilityContextMenu.facility.id, facilityRenameValue);
                    setFacilityContextMenu(null);
                  }
                  if (e.key === "Escape") setFacilityContextMenu(null);
                }}
              />
              <button type="button" onClick={() => { onFacilityRename(facilityContextMenu.facility.id, facilityRenameValue); setFacilityContextMenu(null); }}>Save</button>
            </div>
          ) : (
            <>
              <button type="button" className="context-item" onClick={() => setFacilityRenameMode(true)}>
                Rename “{facilityContextMenu.facility.name}”
              </button>
              <button type="button" className="context-item destructive" onClick={() => { onFacilityDelete(facilityContextMenu.facility.id); setFacilityContextMenu(null); }}>
                Delete facility
              </button>
              <button type="button" className="context-item" onClick={() => setFacilityContextMenu(null)}>
                Cancel
              </button>
            </>
          )}
        </div>
      ) : null}

      {linkLabelPopup ? (
        <div className="link-label-popup" role="dialog" aria-label="Rename link">
          <div className="link-label-popup-inner">
            <div className="link-label-popup-header">
              <span className="link-label-popup-kicker">RENAME LINK</span>
              <button type="button" className="link-label-popup-close" onClick={onLinkLabelPopupClose} aria-label="Close">×</button>
            </div>
            <input
              className="link-label-popup-input"
              type="text"
              value={popupDraftLabel}
              placeholder="Enter custom link label…"
              autoFocus
              onChange={event => setPopupDraftLabel(event.target.value)}
              onKeyDown={event => {
                if (event.key === "Enter") onLinkLabelSave(linkLabelPopup.linkKey, popupDraftLabel);
                if (event.key === "Escape") onLinkLabelPopupClose();
              }}
            />
            <div className="link-label-popup-actions">
              <button type="button" className="link-label-popup-clear" onClick={() => { setPopupDraftLabel(""); onLinkLabelSave(linkLabelPopup.linkKey, ""); }}>Clear label</button>
              <button type="button" className="link-label-popup-save" onClick={() => onLinkLabelSave(linkLabelPopup.linkKey, popupDraftLabel)}>Save</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
