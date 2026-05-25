import React, { useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, Layers, MapPin, Mountain, RadioTower, Route, Ruler, SignalHigh, Zap } from "lucide-react";
import { buildGisAutoScan, GIS_PROVIDER_STYLES } from "@/lib/gisAutoScan";
import { buildDefaultLosProfile, buildLosTerrainProfile, buildPrecisionPlanningPin, buildRidgeCrestCandidate, formatCoordinate, parseCoordinateInput, type LosTerrainProfile, type PrecisionPlanningPin } from "@/lib/wirelessPlanning";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapView } from "@/components/Map";
import { BUSINESS_DRIVER_BY_ID, RESERVE_SITE_TYPE_BY_ID, type BusinessDriverId, type ReserveSiteTypeId } from "@shared/reserveFramework";

type CoordinateValue = number | string | null | undefined;

type ObservationLike = {
  id?: number | string;
  type?: string | null;
  description?: string | null;
  latitude?: CoordinateValue;
  longitude?: CoordinateValue;
};

type OperationalCriticalLocationLike = {
  id?: number | string;
  name?: string | null;
  locationType?: string | null;
  priority?: string | null;
  latitude?: CoordinateValue;
  longitude?: CoordinateValue;
  connectivityRequirement?: string | null;
  businessImpact?: string | null;
  notes?: string | null;
  reserveSiteType?: string | null;
  topologyRole?: string | null;
  businessDrivers?: unknown;
};

type InfrastructureAssetLike = {
  id?: number | string;
  label?: string | null;
  assetType?: "Tower" | "Fibre Route" | "PoP" | string | null;
  provider?: string | null;
  latitude?: CoordinateValue;
  longitude?: CoordinateValue;
  endLatitude?: CoordinateValue;
  endLongitude?: CoordinateValue;
  description?: string | null;
  confidence?: number | null;
  verificationStatus?: "Known" | "Candidate" | "Field Verified" | string | null;
  distanceKm?: number | null;
};

type TciSample = {
  distancePercent: number;
  elevationPercent: number;
  obstruction?: boolean;
  label?: string;
};

type InfrastructureMapProps = {
  audit: {
    latitude?: CoordinateValue;
    longitude?: CoordinateValue;
    location?: string | null;
    clientName?: string | null;
    tciScore?: number | null;
    tciProfileSamples?: unknown;
  };
  observations?: ObservationLike[];
  infrastructureAssets?: InfrastructureAssetLike[];
  operationalCriticalLocations?: OperationalCriticalLocationLike[];
};

export type InfrastructureMapPoint = {
  id: string;
  label: string;
  category: "property" | "tower" | "fibre" | "pop" | "signal" | "security" | "operational";
  lat: number;
  lng: number;
  description: string;
  source?: "audit" | "observation" | "asset" | "gis-scan";
  provider?: string | null;
  verificationStatus?: string | null;
  confidence?: number | null;
  distanceKm?: number | null;
  bearingDeg?: number | null;
  providerColor?: string | null;
  endLat?: number | null;
  endLng?: number | null;
  reserveSiteType?: ReserveSiteTypeId | null;
  reserveSiteLabel?: string | null;
  topologyRole?: string | null;
  businessDrivers?: BusinessDriverId[];
};

export type InfrastructureMapLink = {
  id: string;
  sourceId: string;
  sourceLabel: string;
  targetId: string;
  targetLabel: string;
  category: InfrastructureMapPoint["category"];
  obstructed: boolean;
  role?: "uplink" | "backhaul" | "backbone" | "distribution";
  justification?: string;
};

type PinOverride = {
  lat: number;
  lng: number;
};

export type InfrastructureLayerKey = "fibre" | "towers" | "pops" | "terrain" | "signal" | "eskom";

type EnabledLayers = Record<InfrastructureLayerKey, boolean>;

const defaultLayers: EnabledLayers = {
  fibre: true,
  towers: true,
  pops: true,
  terrain: true,
  signal: true,
  eskom: true,
};

function parseCoordinate(value: CoordinateValue) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function classifyObservation(type: string | null | undefined): InfrastructureMapPoint["category"] {
  const normalized = (type || "").toLowerCase();
  if (normalized.includes("tower") || normalized.includes("mast")) return "tower";
  if (normalized.includes("fibre") || normalized.includes("fiber") || normalized.includes("handoff")) return "fibre";
  if (normalized.includes("signal") || normalized.includes("rsrp") || normalized.includes("rsrq")) return "signal";
  if (normalized.includes("gate") || normalized.includes("cctv") || normalized.includes("security") || normalized.includes("anti")) return "security";
  return "operational";
}

function pointLayer(point: InfrastructureMapPoint): InfrastructureLayerKey | "property" | "operational" {
  if (point.category === "fibre") return "fibre";
  if (point.category === "tower") return "towers";
  if (point.category === "pop") return "pops";
  if (point.category === "signal") return "signal";
  if (point.category === "property") return "property";
  return "operational";
}

function hasObstruction(point: InfrastructureMapPoint, tciSamples: TciSample[] = []) {
  const text = `${point.label} ${point.description}`.toLowerCase();
  return text.includes("obstruct") || text.includes("blocked") || text.includes("no los") || tciSamples.some((sample) => sample.obstruction);
}

function coerceBusinessDrivers(value: unknown): BusinessDriverId[] {
  if (!Array.isArray(value)) return [];
  return value.filter((driver): driver is BusinessDriverId => typeof driver === "string" && driver in BUSINESS_DRIVER_BY_ID);
}

function coerceReserveSiteType(value: string | null | undefined): ReserveSiteTypeId | null {
  return value && value in RESERVE_SITE_TYPE_BY_ID ? value as ReserveSiteTypeId : null;
}

function classifyOperationalLocation(location: OperationalCriticalLocationLike): InfrastructureMapPoint["category"] {
  const text = `${location.locationType || ""} ${location.reserveSiteType || ""} ${location.name || ""}`.toLowerCase();
  if (text.includes("anti") || text.includes("security") || text.includes("gate") || text.includes("cctv") || text.includes("sensor") || text.includes("fence")) return "security";
  if (text.includes("high_site") || text.includes("tower") || text.includes("mast") || text.includes("repeater")) return "tower";
  if (text.includes("backhaul") || text.includes("handoff")) return "fibre";
  return "operational";
}

export function buildInfrastructureMapModel(audit: InfrastructureMapProps["audit"], observations: ObservationLike[] = [], infrastructureAssets: InfrastructureAssetLike[] = [], operationalCriticalLocations: OperationalCriticalLocationLike[] = []) {
  const auditLat = parseCoordinate(audit.latitude);
  const auditLng = parseCoordinate(audit.longitude);
  const center = auditLat !== null && auditLng !== null ? { lat: auditLat, lng: auditLng } : { lat: -33.3106, lng: 26.5708 };
  const gisScan = auditLat !== null && auditLng !== null ? buildGisAutoScan({ lat: auditLat, lng: auditLng }) : null;
  const points: InfrastructureMapPoint[] = [];
  const tciSamples: TciSample[] = Array.isArray(audit.tciProfileSamples)
    ? audit.tciProfileSamples.filter((sample): sample is TciSample => typeof sample === "object" && sample !== null && "distancePercent" in sample && "elevationPercent" in sample)
    : [];

  if (auditLat !== null && auditLng !== null) {
    points.push({
      id: "property",
      label: audit.clientName || "Property pin",
      category: "property",
      lat: auditLat,
      lng: auditLng,
      description: audit.location || "Primary submitted property location",
      source: "audit",
      topologyRole: "spoke",
    });
  }

  gisScan?.providerMasts.forEach((mast) => {
    points.push({
      id: mast.id,
      label: mast.label,
      category: "tower",
      lat: mast.lat,
      lng: mast.lng,
      description: `${mast.provider} colour-coded auto-scan mast · ${mast.distanceKm.toFixed(1)} km ${mast.bearingDeg.toFixed(0)}° from property`,
      source: "gis-scan",
      provider: mast.provider,
      verificationStatus: "Auto Scan",
      confidence: mast.confidence,
      distanceKm: mast.distanceKm,
      bearingDeg: mast.bearingDeg,
      providerColor: mast.color,
      topologyRole: "hub",
    });
  });

  infrastructureAssets.forEach((asset, index) => {
    const lat = parseCoordinate(asset.latitude);
    const lng = parseCoordinate(asset.longitude);
    if (lat === null || lng === null) return;
    const endLat = parseCoordinate(asset.endLatitude);
    const endLng = parseCoordinate(asset.endLongitude);
    const normalizedType = (asset.assetType || "").toLowerCase();
    const category = normalizedType.includes("tower") ? "tower" : normalizedType.includes("pop") ? "pop" : "fibre";
    const provider = asset.provider ? `${asset.provider} · ` : "";
    points.push({
      id: `asset-${asset.id || index}`,
      label: asset.label || `${asset.assetType || "Infrastructure asset"} ${index + 1}`,
      category,
      lat,
      lng,
      description: `${provider}${asset.description || "Preloaded infrastructure asset"}`,
      source: "asset",
      provider: asset.provider,
      verificationStatus: asset.verificationStatus || "Candidate",
      confidence: asset.confidence ?? null,
      distanceKm: asset.distanceKm ?? null,
      endLat,
      endLng,
    });
  });

  observations.forEach((observation, index) => {
    const lat = parseCoordinate(observation.latitude);
    const lng = parseCoordinate(observation.longitude);
    if (lat === null || lng === null) return;

    const label = observation.type || `Infrastructure point ${index + 1}`;
    points.push({
      id: String(observation.id || `${label}-${index}`),
      label,
      category: classifyObservation(observation.type),
      lat,
      lng,
      description: observation.description || "Captured infrastructure discovery point",
      source: "observation",
    });
  });

  operationalCriticalLocations.forEach((location, index) => {
    const lat = parseCoordinate(location.latitude);
    const lng = parseCoordinate(location.longitude);
    if (lat === null || lng === null) return;
    const reserveSiteType = coerceReserveSiteType(location.reserveSiteType);
    const reserveSite = reserveSiteType ? RESERVE_SITE_TYPE_BY_ID[reserveSiteType] : null;
    const businessDrivers = coerceBusinessDrivers(location.businessDrivers);
    const driverLabels = businessDrivers.map((driver) => BUSINESS_DRIVER_BY_ID[driver].label).join(" + ");
    const topologyRole = location.topologyRole || reserveSite?.topologyRole || null;
    points.push({
      id: `operational-location-${location.id || index}`,
      label: location.name || `Reserve location ${index + 1}`,
      category: classifyOperationalLocation(location),
      lat,
      lng,
      description: [
        location.priority ? `${location.priority} priority` : null,
        reserveSite?.label,
        topologyRole ? `${topologyRole} topology role` : null,
        driverLabels ? `Drivers: ${driverLabels}` : null,
        location.connectivityRequirement,
        location.businessImpact,
      ].filter(Boolean).join(" · ") || "Structured reserve operating location",
      source: "observation",
      reserveSiteType,
      reserveSiteLabel: reserveSite?.label || null,
      topologyRole,
      businessDrivers,
      providerColor: businessDrivers[0] ? BUSINESS_DRIVER_BY_ID[businessDrivers[0]].color : reserveSite ? "#A3E635" : null,
    });
  });

  const propertyForRidge = points.find((point) => point.category === "property");
  if (propertyForRidge) {
    const ridgePin = buildRidgeCrestCandidate(propertyForRidge);
    points.push({
      id: ridgePin.id,
      label: ridgePin.label,
      category: "operational",
      lat: ridgePin.lat,
      lng: ridgePin.lng,
      description: "Draggable ridge-crest candidate for pre-site wireless link planning",
      source: "gis-scan",
      providerColor: ridgePin.color,
      verificationStatus: "Planning Candidate",
      confidence: 82,
    });
  }

  const counts = points.reduce(
    (acc, point) => {
      acc[point.category] += 1;
      return acc;
    },
    { property: 0, tower: 0, fibre: 0, pop: 0, signal: 0, security: 0, operational: 0 },
  );

  const topologyHubs = points.filter((point) => point.topologyRole === "hub" || point.reserveSiteType === "high_site" || /hub|high site|repeater/i.test(`${point.label} ${point.description}`));
  const topologySpokes = points.filter((point) => point.topologyRole && point.topologyRole !== "hub");
  const clearSegmentLinks: InfrastructureMapLink[] = (gisScan?.minimumHighSitePlan.clearSegments ?? []).map((segment) => ({
    id: segment.id,
    sourceId: segment.sourceId,
    sourceLabel: segment.sourceLabel,
    targetId: segment.targetId,
    targetLabel: segment.targetLabel,
    category: segment.role === "distribution" ? "operational" : "tower",
    obstructed: false,
    role: segment.role,
    justification: segment.justification,
  }));
  const links = clearSegmentLinks;

  const precisionPins: PrecisionPlanningPin[] = points.map((point) => buildPrecisionPlanningPin({
    id: point.id,
    label: point.label,
    role: point.category === "tower" || point.category === "pop" || point.category === "fibre" || point.category === "signal" || point.category === "property" ? point.category : "operational",
    lat: point.lat,
    lng: point.lng,
    color: point.providerColor || categoryStyles[point.category].color,
    source: point.source || null,
  }));

  const losProfile = buildDefaultLosProfile(precisionPins);

  const terrainProfile = {
    sampleCount: tciSamples.length,
    obstructionCount: tciSamples.filter((sample) => sample.obstruction).length,
    verticalExaggeration: 1.5,
    tciScore: audit.tciScore ?? null,
  };

  const preloadedAssetCount = points.filter((point) => point.source === "asset").length;
  const reserveTopology = {
    hubCount: topologyHubs.length,
    spokeCount: topologySpokes.length,
    driverTaggedPointCount: points.filter((point) => point.businessDrivers?.length).length,
    topologyLinkCount: links.length,
  };

  return { center, points, counts, links, terrainProfile, mappedPointCount: points.length, preloadedAssetCount, gisScan, precisionPins, losProfile, reserveTopology, minimumHighSitePlan: gisScan?.minimumHighSitePlan ?? null };
}

const categoryStyles: Record<InfrastructureMapPoint["category"], { label: string; color: string; className: string }> = {
  property: { label: "Property", color: "#FFE600", className: "text-[#FFE600]" },
  tower: { label: "Tower / mast", color: "#94A3B8", className: "text-slate-300" },
  fibre: { label: "Fibre / route", color: "#3B82F6", className: "text-blue-400" },
  pop: { label: "PoP / exchange", color: "#A855F7", className: "text-purple-300" },
  signal: { label: "Signal heatmap", color: "#22C55E", className: "text-accent" },
  security: { label: "Security zone", color: "#22C55E", className: "text-accent" },
  operational: { label: "Operational node", color: "#F59E0B", className: "text-yellow-500" },
};

const layerLabels: Record<InfrastructureLayerKey, string> = {
  fibre: "Fibre",
  towers: "Towers",
  pops: "PoPs",
  terrain: "Terrain",
  signal: "Signal Heatmap",
  eskom: "Eskom Corridors",
};

function isPointVisible(point: InfrastructureMapPoint, enabledLayers: EnabledLayers) {
  const layer = pointLayer(point);
  if (layer === "property" || layer === "operational") return true;
  return enabledLayers[layer];
}

function isLinkVisible(link: InfrastructureMapLink, enabledLayers: EnabledLayers) {
  if (link.category === "fibre") return enabledLayers.fibre;
  if (link.category === "tower") return enabledLayers.towers;
  if (link.category === "pop") return enabledLayers.pops;
  if (link.category === "signal") return enabledLayers.signal;
  return true;
}

type LosCandidateSummaryRow = {
  mastId: string;
  mastName: string;
  distanceKm: number;
  bearingLabel: string;
  bearingDeg: number;
  losStatus: Uppercase<LosTerrainProfile["status"]>;
  statusColor: string;
  fresnelClearanceMeters: number;
};

function formatLosStatus(status: LosTerrainProfile["status"]): LosCandidateSummaryRow["losStatus"] {
  return status.toUpperCase() as LosCandidateSummaryRow["losStatus"];
}

export function buildLosCandidateSummaryRows(gisScan: ReturnType<typeof buildGisAutoScan>, precisionPins: PrecisionPlanningPin[]): LosCandidateSummaryRow[] {
  const propertyPin = precisionPins.find((pin) => pin.role === "property");
  if (!gisScan || !propertyPin) return [];
  return gisScan.clearLosCandidates.map((candidate) => {
    const mast = gisScan.providerMasts.find((item) => item.id === candidate.mastId);
    if (!mast) return null;
    const mastPin = buildPrecisionPlanningPin({
      id: mast.id,
      label: mast.label,
      role: "tower",
      lat: mast.lat,
      lng: mast.lng,
      color: mast.color,
      antennaHeightMeters: 35,
    });
    const profile = buildLosTerrainProfile(propertyPin, mastPin);
    return {
      mastId: mast.id,
      mastName: `${candidate.peakLabel} to ${mast.label}`,
      distanceKm: profile.distanceKm,
      bearingLabel: profile.bearing,
      bearingDeg: profile.bearingDeg,
      losStatus: formatLosStatus(profile.status),
      statusColor: profile.statusColor,
      fresnelClearanceMeters: profile.minClearanceMeters,
    };
  }).filter((row): row is LosCandidateSummaryRow => Boolean(row));
}

export default function InfrastructureMap({ audit, observations = [], infrastructureAssets = [], operationalCriticalLocations = [] }: InfrastructureMapProps) {
  const model = useMemo(() => buildInfrastructureMapModel(audit, observations, infrastructureAssets, operationalCriticalLocations), [audit, observations, infrastructureAssets, operationalCriticalLocations]);
  const [enabledLayers, setEnabledLayers] = useState<EnabledLayers>(defaultLayers);
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(false);
  const [pinOverrides, setPinOverrides] = useState<Record<string, PinOverride>>({});
  const [coordinateDrafts, setCoordinateDrafts] = useState<Record<string, { lat?: string; lng?: string }>>({});
  const mapRef = useRef<any>(null); // maplibregl.Map
  const [mapReady, setMapReady] = useState(false);
  const overlaysRef = useRef<Array<{ remove(): void }>>([]);

  const precisionPins = useMemo(() => model.precisionPins.map((pin) => {
    const override = pinOverrides[pin.id];
    return override ? buildPrecisionPlanningPin({ ...pin, ...override, elevationAslMeters: null }) : pin;
  }), [model.precisionPins, pinOverrides]);
  const planningPoints = useMemo(() => model.points.map((point) => {
    const override = pinOverrides[point.id];
    return override ? { ...point, ...override } : point;
  }), [model.points, pinOverrides]);
  const losProfile = useMemo(() => buildDefaultLosProfile(precisionPins), [precisionPins]);
  const losCandidateRows = useMemo(() => buildLosCandidateSummaryRows(model.gisScan, precisionPins), [model.gisScan, precisionPins]);

  const visiblePoints = useMemo(() => planningPoints.filter((point) => isPointVisible(point, enabledLayers)), [enabledLayers, planningPoints]);
  const visibleLinks = useMemo(() => model.links.filter((link) => isLinkVisible(link, enabledLayers)), [enabledLayers, model.links]);

  const updatePinCoordinateDraft = (pinId: string, axis: "lat" | "lng", value: string) => {
    setCoordinateDrafts((current) => ({ ...current, [pinId]: { ...current[pinId], [axis]: value } }));
    const parsed = parseCoordinateInput(value);
    if (parsed === null) return;
    setPinOverrides((current) => ({ ...current, [pinId]: { ...current[pinId], [axis]: parsed } }));
  };

  const getPinCoordinateDraft = (pin: PrecisionPlanningPin, axis: "lat" | "lng") => coordinateDrafts[pin.id]?.[axis] ?? formatCoordinate(pin[axis]);

  const makeCircleCoords = (lat: number, lng: number, radiusM: number, steps = 48) =>
    Array.from({ length: steps + 1 }, (_, i) => {
      const angle = (i / steps) * 2 * Math.PI;
      const latOff = (radiusM / 111320) * Math.cos(angle);
      const lngOff = (radiusM / (111320 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
      return [lng + lngOff, lat + latOff];
    });

  const renderMapOverlays = (map: any) => {
    const ml = window.maplibregl;
    if (!ml) return;
    overlaysRef.current.forEach((o) => o.remove());
    overlaysRef.current = [];
    map.jumpTo({ center: [model.center.lng, model.center.lat], zoom: model.points.length > 1 ? 18 : 17 });

    const lineFeatures: any[] = [];
    const circleFeatures: any[] = [];

    // Draggable point markers
    visiblePoints.forEach((point) => {
      const color = point.providerColor || categoryStyles[point.category].color;
      const size = point.category === "property" ? 20 : 16;
      const el = document.createElement("div");
      el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #020617;cursor:grab;box-shadow:0 1px 3px rgba(0,0,0,.5);`;
      el.title = `${point.label}: ${point.description}`;
      const marker = new ml.Marker({ element: el, draggable: true })
        .setLngLat([point.lng, point.lat])
        .addTo(map);
      marker.on("dragend", () => {
        const lngLat = marker.getLngLat();
        const lat = Number(lngLat.lat.toFixed(6));
        const lng = Number(lngLat.lng.toFixed(6));
        setPinOverrides((current) => ({ ...current, [point.id]: { lat, lng } }));
        setCoordinateDrafts((current) => ({ ...current, [point.id]: { lat: formatCoordinate(lat), lng: formatCoordinate(lng) } }));
      });
      overlaysRef.current.push(marker);

      if (point.businessDrivers?.length) {
        const driverColor = BUSINESS_DRIVER_BY_ID[point.businessDrivers[0]].color;
        const r = point.topologyRole === "hub" ? 650 : 420;
        circleFeatures.push({ type: "Feature", geometry: { type: "Polygon", coordinates: [makeCircleCoords(point.lat, point.lng, r)] }, properties: { color: driverColor, fillOpacity: 0.12, lineWidth: 2, lineOpacity: 0.45 } });
      }
      if (point.category === "signal" && enabledLayers.signal) {
        circleFeatures.push({ type: "Feature", geometry: { type: "Polygon", coordinates: [makeCircleCoords(point.lat, point.lng, 900)] }, properties: { color: "#22C55E", fillOpacity: 0.16, lineWidth: 1, lineOpacity: 0.35 } });
      }
    });

    const property = planningPoints.find((point) => point.category === "property");
    if (property) {
      // Links
      visibleLinks.forEach((link) => {
        const src = planningPoints.find((c) => c.id === link.sourceId) || property;
        const tgt = planningPoints.find((c) => c.id === link.targetId);
        if (!tgt || !src) return;
        lineFeatures.push({ type: "Feature", geometry: { type: "LineString", coordinates: [[src.lng, src.lat], [tgt.lng, tgt.lat]] }, properties: { color: "#C6FF00", width: link.role === "backhaul" ? 5 : link.role === "backbone" ? 4 : 3, opacity: 0.96 } });
      });

      // LOS profile line
      if (losProfile) {
        const start = precisionPins.find((pin) => pin.id === losProfile.startPinId);
        const end = precisionPins.find((pin) => pin.id === losProfile.endPinId);
        if (start && end) lineFeatures.push({ type: "Feature", geometry: { type: "LineString", coordinates: [[start.lng, start.lat], [end.lng, end.lat]] }, properties: { color: losProfile.statusColor, width: 5, opacity: 0.95 } });
      }

      // Fibre routes
      if (enabledLayers.fibre && model.gisScan) {
        model.gisScan.fibreRoutes.forEach((route: any) => {
          lineFeatures.push({ type: "Feature", geometry: { type: "LineString", coordinates: route.path.map((p: any) => [p.lng, p.lat]) }, properties: { color: route.color, width: 4, opacity: 0.9 } });
        });
      }

      // Eskom corridors
      if (enabledLayers.eskom && model.gisScan) {
        model.gisScan.eskomCorridors.forEach((corridor: any) => {
          lineFeatures.push({ type: "Feature", geometry: { type: "LineString", coordinates: corridor.path.map((p: any) => [p.lng, p.lat]) }, properties: { color: corridor.color, width: 5, opacity: 0.82 } });
        });
      }

      // Terrain circles
      if (enabledLayers.terrain) {
        circleFeatures.push({ type: "Feature", geometry: { type: "Polygon", coordinates: [makeCircleCoords(property.lat, property.lng, 3000)] }, properties: { color: "#22C55E", fillOpacity: 0.08, lineWidth: 1, lineOpacity: 0.45 } });
        model.gisScan?.terrainContours.forEach((contour: any) => {
          circleFeatures.push({ type: "Feature", geometry: { type: "Polygon", coordinates: [makeCircleCoords(property.lat, property.lng, contour.radiusKm * 1000)] }, properties: { color: contour.color, fillOpacity: 0.025, lineWidth: 1, lineOpacity: 0.7 } });
        });
      }
    }

    if (map.getSource("infra-lines")) (map.getSource("infra-lines") as any).setData({ type: "FeatureCollection", features: lineFeatures });
    if (map.getSource("infra-circles")) (map.getSource("infra-circles") as any).setData({ type: "FeatureCollection", features: circleFeatures });
  };

  const handleMapReady = (map: any) => {
    mapRef.current = map;
    map.addSource("infra-circles", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({ id: "infra-circles-fill", type: "fill", source: "infra-circles", paint: { "fill-color": ["get", "color"], "fill-opacity": ["get", "fillOpacity"] } });
    map.addLayer({ id: "infra-circles-line", type: "line", source: "infra-circles", paint: { "line-color": ["get", "color"], "line-width": ["get", "lineWidth"], "line-opacity": ["get", "lineOpacity"] } });
    map.addSource("infra-lines", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({ id: "infra-lines-line", type: "line", source: "infra-lines", paint: { "line-color": ["get", "color"], "line-width": ["get", "width"], "line-opacity": ["get", "opacity"] } });
    setMapReady(true);
  };

  useEffect(() => {
    if (mapRef.current && mapReady) renderMapOverlays(mapRef.current);
  }, [enabledLayers, visiblePoints, visibleLinks, losProfile, mapReady]);

  const selectedPins = precisionPins.slice(0, 8);
  const profileHeight = 150;
  const profileWidth = 640;
  const profileSamples = losProfile?.samples ?? [];
  const minAsl = profileSamples.length ? Math.min(...profileSamples.map((sample) => sample.terrainAslMeters), ...profileSamples.map((sample) => sample.fresnelRequiredAslMeters)) - 20 : 0;
  const maxAsl = profileSamples.length ? Math.max(...profileSamples.map((sample) => sample.signalAslMeters), ...profileSamples.map((sample) => sample.terrainAslMeters)) + 20 : 1;
  const scaleY = (value: number) => profileHeight - ((value - minAsl) / Math.max(1, maxAsl - minAsl)) * profileHeight;
  const terrainPath = profileSamples.map((sample, index) => `${index === 0 ? "M" : "L"} ${(sample.distancePercent / 100) * profileWidth} ${scaleY(sample.terrainAslMeters)}`).join(" ");
  const signalPath = profileSamples.map((sample, index) => `${index === 0 ? "M" : "L"} ${(sample.distancePercent / 100) * profileWidth} ${scaleY(sample.signalAslMeters)}`).join(" ");
  const fresnelPath = profileSamples.map((sample, index) => `${index === 0 ? "M" : "L"} ${(sample.distancePercent / 100) * profileWidth} ${scaleY(sample.fresnelRequiredAslMeters)}`).join(" ");

  return (
    <Card className="mb-8 overflow-hidden border-border bg-card">
      <CardHeader>
        <div className="flex items-center gap-2 text-accent">
          <MapPin className="h-5 w-5" />
          <CardTitle>Infrastructure Map Visualization</CardTitle>
        </div>
        <CardDescription>
          Google hybrid satellite map with a dark tactical overlay, preloaded CTTX infrastructure assets, submitted GPS pins, layer toggles, signal circles, and LOS-only backhaul, backbone, and distribution overlays.
        </CardDescription>
      </CardHeader>
      {model.minimumHighSitePlan && (
        <CardContent className="border-b border-border pb-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-accent/30 bg-accent/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-accent">Minimum high sites</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{model.minimumHighSitePlan.recommendedHighSiteCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Coverage {model.minimumHighSitePlan.coverageHighSiteCount} · redundancy {model.minimumHighSitePlan.redundancyHighSiteCount}</p>
            </div>
            <div className="rounded-xl border border-lime-400/30 bg-lime-400/10 p-4 md:col-span-2">
              <p className="text-xs uppercase tracking-[0.18em] text-lime-300">LOS-only architecture</p>
              <p className="mt-2 text-sm text-muted-foreground">Only confirmed clear LOS backhaul, backbone, and facility-distribution segments are drawn. Blocked, marginal, red, yellow, grey, and non-LOS planning candidates are intentionally removed from this map view.</p>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {model.minimumHighSitePlan.costJustification.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
          </div>
        </CardContent>
      )}
      <CardContent className="space-y-4">
        <div className="relative overflow-hidden rounded-xl border border-border bg-background/40">
          <MapView className="h-[460px] w-full" initialCenter={model.center} initialZoom={18} onMapReady={handleMapReady} />
          <div className="pointer-events-none absolute inset-0 bg-slate-950/40 mix-blend-multiply" aria-hidden="true" />
          <div className="absolute left-3 top-3 z-20 max-w-[min(18rem,calc(100%-1.5rem))] rounded-lg border border-accent/30 bg-slate-950/75 p-2 shadow-2xl backdrop-blur-md" aria-label="Map layer toggle controls">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-accent/40 bg-slate-950/80 text-accent hover:bg-accent hover:text-accent-foreground"
              onClick={() => setIsLayerPanelOpen((open) => !open)}
              aria-expanded={isLayerPanelOpen}
              aria-controls="infrastructure-map-layer-panel"
            >
              <Layers className="mr-2 h-4 w-4" />
              Layers
            </Button>
            {isLayerPanelOpen && (
              <div id="infrastructure-map-layer-panel" className="mt-2 space-y-2 rounded-md border border-white/10 bg-slate-950/65 p-2">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-accent">Map layers</p>
                <div className="grid gap-1.5">
                  {(Object.keys(layerLabels) as InfrastructureLayerKey[]).map((layer) => (
                    <Button
                      key={layer}
                      type="button"
                      size="sm"
                      variant={enabledLayers[layer] ? "default" : "outline"}
                      className={enabledLayers[layer] ? "justify-start bg-accent text-accent-foreground hover:bg-accent/90" : "justify-start border-white/15 bg-slate-900/70 text-slate-200 hover:bg-slate-800"}
                      onClick={() => setEnabledLayers((current) => ({ ...current, [layer]: !current[layer] }))}
                      aria-pressed={enabledLayers[layer]}
                    >
                      <Layers className="mr-2 h-4 w-4" />
                      {layerLabels[layer]}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="pointer-events-none absolute right-3 top-3 max-w-[280px] rounded-lg border border-border bg-background/90 p-3 shadow-lg backdrop-blur" aria-label="Map surface legend">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Map legend</p>
            <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              {Object.entries(categoryStyles).map(([key, style]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: style.color }} />
                  <span>{style.label}</span>
                </div>
              ))}
              {Object.entries(GIS_PROVIDER_STYLES).map(([provider, style]) => (
                <div key={provider} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: style.color }} />
                  <span>{provider} mast</span>
                </div>
              ))}
              <div className="flex items-center gap-2 text-accent"><span className="h-px w-5 border-t border-dashed border-accent" /> Dashed LoS candidate</div>
              <div className="flex items-center gap-2 text-red-400"><span className="h-px w-5 border-t-2 border-red-500" /> Obstructed LoS</div>
              <div className="flex items-center gap-2 text-purple-300"><span className="h-2.5 w-2.5 rounded-full bg-purple-400" /> Preloaded CTTX asset</div>
              <div className="flex items-center gap-2 text-orange-300"><span className="h-px w-5 border-t-2 border-dashed border-orange-400" /> Eskom corridor</div>
              <div className="flex items-center gap-2 text-yellow-300"><Crosshair className="h-3.5 w-3.5" /> Draggable precision pin</div>
              <div className="flex items-center gap-2 text-lime-300"><span className="h-px w-5 border-t-2 border-dotted border-lime-300" /> High-site hub-and-spoke topology</div>
            </div>
            <div className="mt-3 rounded border border-accent/30 bg-accent/10 p-2 text-xs text-muted-foreground">
              <span className="font-semibold text-accent">Auto-scan:</span> {model.gisScan ? `${model.gisScan.providerMasts.length} provider masts, ${model.gisScan.fibreRoutes.length} fibre route(s), ${model.gisScan.terrainContours.length} contours, ${model.gisScan.eskomCorridors.length} Eskom corridor(s) · street-level draggable pins` : "Enter property coordinates to scan infrastructure."}
            </div>
            <div className="mt-2 rounded border border-lime-300/30 bg-lime-300/10 p-2 text-xs text-muted-foreground">
              <span className="font-semibold text-lime-300">Reserve topology:</span> {model.reserveTopology.hubCount} hub(s), {model.reserveTopology.spokeCount} spoke(s), {model.reserveTopology.driverTaggedPointCount} driver-tagged site(s), {model.reserveTopology.topologyLinkCount} topology link(s).
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-3 right-3 max-w-[280px] rounded-lg border border-blue-400/30 bg-slate-950/90 p-3 text-xs text-slate-300 shadow-lg backdrop-blur" aria-label="Terrain intelligence overlay">
            <div className="flex items-center gap-2 text-blue-300"><Mountain className="h-4 w-4" /><span className="font-semibold">Terrain layer, 1.5x profile</span></div>
            <p className="mt-1">TCI {model.terrainProfile.tciScore ?? "pending"} · {model.terrainProfile.sampleCount} profile samples · {model.terrainProfile.obstructionCount} obstruction zone(s) · {model.gisScan?.terrainContours.length ?? 0} auto contours</p>
          </div>
        </div>

        <div className="rounded-xl border border-lime-300/30 bg-lime-300/10 p-4" aria-label="Reserve high-site topology summary">
          <div className="flex items-center gap-2 text-lime-300">
            <RadioTower className="h-5 w-5" />
            <h3 className="text-base font-semibold text-foreground">Reserve high-site topology</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Structured reserve locations with site types and business-driver tags are rendered as driver-coloured operational pins. High sites act as hub candidates, while lodges, gates, security posts, pumps, and observation points are treated as spokes for first-pass star-topology planning.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-border bg-background/70 p-3"><p className="text-xs text-muted-foreground">Hub candidates</p><p className="text-2xl font-bold text-foreground">{model.reserveTopology.hubCount}</p></div>
            <div className="rounded-lg border border-border bg-background/70 p-3"><p className="text-xs text-muted-foreground">Spoke sites</p><p className="text-2xl font-bold text-foreground">{model.reserveTopology.spokeCount}</p></div>
            <div className="rounded-lg border border-border bg-background/70 p-3"><p className="text-xs text-muted-foreground">Driver-tagged sites</p><p className="text-2xl font-bold text-foreground">{model.reserveTopology.driverTaggedPointCount}</p></div>
            <div className="rounded-lg border border-border bg-background/70 p-3"><p className="text-xs text-muted-foreground">Topology links</p><p className="text-2xl font-bold text-foreground">{model.reserveTopology.topologyLinkCount}</p></div>
          </div>
        </div>

        <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-4" aria-label="Precision draggable pin readout">
          <div className="flex items-center gap-2 text-yellow-300">
            <Crosshair className="h-5 w-5" />
            <h3 className="text-base font-semibold text-foreground">Precision draggable pins</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            All planning pins open at street-level hybrid zoom and can be dragged to an exact ridge crest, rooftop, mast base, gate, or lodge endpoint. The live readout below updates latitude, longitude, and estimated elevation ASL after each drag.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {selectedPins.map((pin) => (
              <div key={pin.id} className="rounded-lg border border-border bg-background/70 p-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: pin.color }} />
                  <p className="truncate text-sm font-semibold text-foreground">{pin.label}</p>
                </div>
                <p className="mt-2 font-mono text-xs text-muted-foreground">{formatCoordinate(pin.lat)}, {formatCoordinate(pin.lng)}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Latitude
                    <input
                      className="mt-1 w-full rounded border border-border bg-slate-950/60 px-2 py-1 font-mono text-xs text-foreground outline-none focus:border-accent"
                      value={getPinCoordinateDraft(pin, "lat")}
                      onChange={(event) => updatePinCoordinateDraft(pin.id, "lat", event.target.value)}
                      aria-label={`${pin.label} latitude coordinate`}
                    />
                  </label>
                  <label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Longitude
                    <input
                      className="mt-1 w-full rounded border border-border bg-slate-950/60 px-2 py-1 font-mono text-xs text-foreground outline-none focus:border-accent"
                      value={getPinCoordinateDraft(pin, "lng")}
                      onChange={(event) => updatePinCoordinateDraft(pin.id, "lng", event.target.value)}
                      aria-label={`${pin.label} longitude coordinate`}
                    />
                  </label>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Elevation <span className="font-semibold text-foreground">{pin.elevationAslMeters} m ASL</span> · antenna {pin.antennaHeightMeters} m</p>
              </div>
            ))}
          </div>
        </div>

        {losProfile ? (
          <div className="rounded-xl border border-border bg-background/50 p-4" aria-label="LOS terrain profile planner">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-accent">
                  <Ruler className="h-5 w-5" />
                  <h3 className="text-base font-semibold text-foreground">LOS terrain profile and Fresnel planner</h3>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Default check: {losProfile.startLabel} to {losProfile.endLabel}. Drag either pin and the terrain cross-section, Fresnel clearance, and map link colour recalculate for desk-based link planning before the site visit.
                </p>
              </div>
              <div className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]" style={{ backgroundColor: `${losProfile.statusColor}22`, color: losProfile.statusColor }}>
                {losProfile.status} LOS
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Link distance</p><p className="text-lg font-bold text-foreground">{losProfile.distanceKm.toFixed(2)} km</p></div>
              <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Bearing</p><p className="text-lg font-bold text-foreground">{losProfile.bearing} · {losProfile.bearingDeg.toFixed(0)}°</p></div>
              <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Minimum Fresnel clearance</p><p className="text-lg font-bold text-foreground">{losProfile.minClearanceMeters.toFixed(1)} m</p></div>
              <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Highest obstruction</p><p className="text-lg font-bold text-foreground">{losProfile.highestObstructionMeters.toFixed(1)} m</p></div>
            </div>
            <div className="mt-4 overflow-hidden rounded-lg border border-border bg-slate-950 p-3">
              <svg viewBox={`0 0 ${profileWidth} ${profileHeight}`} role="img" aria-label="LOS elevation cross-section with terrain, signal path, and Fresnel clearance" className="h-48 w-full">
                <path d={`${terrainPath} L ${profileWidth} ${profileHeight} L 0 ${profileHeight} Z`} fill="#334155" opacity="0.8" />
                <path d={terrainPath} fill="none" stroke="#A3E635" strokeWidth="3" />
                <path d={fresnelPath} fill="none" stroke="#F59E0B" strokeDasharray="8 6" strokeWidth="2" />
                <path d={signalPath} fill="none" stroke={losProfile.statusColor} strokeWidth="3" />
                {profileSamples.filter((sample) => sample.obstruction).map((sample) => (
                  <circle key={sample.index} cx={(sample.distancePercent / 100) * profileWidth} cy={scaleY(sample.terrainAslMeters)} r="5" fill="#EF4444" />
                ))}
              </svg>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="text-lime-300">Terrain profile</span>
                <span style={{ color: losProfile.statusColor }}>Signal path</span>
                <span className="text-yellow-400">60% Fresnel zone at {losProfile.frequencyGhz} GHz</span>
                <span className="text-red-400">Obstruction marker</span>
              </div>
            </div>
            {losCandidateRows.length ? (
              <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card" aria-label="LOS status summary table">
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">LOS status summary for auto-scanned masts</p>
                  <p className="text-xs text-muted-foreground">All provider mast candidates are checked from the property/planning pin with the same Fresnel clearance classification used by the terrain profile.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-background/70 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Mast Name</th>
                        <th className="px-3 py-2 font-semibold">Distance</th>
                        <th className="px-3 py-2 font-semibold">Bearing</th>
                        <th className="px-3 py-2 font-semibold">LOS Status</th>
                        <th className="px-3 py-2 font-semibold">Fresnel Clearance (m)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {losCandidateRows.map((row) => (
                        <tr key={row.mastId}>
                          <td className="px-3 py-2 font-medium text-foreground">{row.mastName}</td>
                          <td className="px-3 py-2 text-muted-foreground">{row.distanceKm.toFixed(2)} km</td>
                          <td className="px-3 py-2 text-muted-foreground">{row.bearingLabel} · {row.bearingDeg.toFixed(0)}°</td>
                          <td className="px-3 py-2 font-semibold" style={{ color: row.statusColor }}>{row.losStatus}</td>
                          <td className="px-3 py-2 font-mono text-muted-foreground">{row.fresnelClearanceMeters.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {model.gisScan ? (
          <div className="rounded-xl border border-accent/30 bg-accent/10 p-4" aria-label="Infrastructure Summary panel">
            <div className="flex items-center gap-2 text-accent">
              <RadioTower className="h-5 w-5" />
              <h3 className="text-base font-semibold text-foreground">Infrastructure Summary</h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Instant coordinate-driven scan showing the nearest provider mast per network, with distance and bearing for first-pass field validation.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {model.gisScan.nearestMasts.map((mast) => (
                <div key={mast.provider} className="rounded-lg border border-border bg-background/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: mast.color }} />
                      <p className="text-sm font-semibold text-foreground">{mast.provider}</p>
                    </div>
                    <span className="rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{mast.confidence}%</span>
                  </div>
                  <p className="mt-2 font-mono text-lg font-bold text-foreground">{mast.distanceKm.toFixed(2)} km</p>
                  <p className="text-xs text-muted-foreground">Bearing {mast.bearing} · {mast.bearingDeg.toFixed(0)}° · {mast.source === "provider-scan" ? "auto-scan" : "asset register"}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-7">
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Mapped points</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{model.mappedPointCount}</p>
          </div>
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center gap-2 text-blue-400"><Route className="h-4 w-4" /><span className="text-sm font-semibold">Fibre</span></div>
            <p className="mt-1 text-sm text-muted-foreground">{model.counts.fibre} candidate handoff point(s)</p>
          </div>
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center gap-2 text-slate-300"><RadioTower className="h-4 w-4" /><span className="text-sm font-semibold">Towers</span></div>
            <p className="mt-1 text-sm text-muted-foreground">{model.counts.tower} tower or mast point(s)</p>
          </div>
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center gap-2 text-purple-300"><Layers className="h-4 w-4" /><span className="text-sm font-semibold">PoPs</span></div>
            <p className="mt-1 text-sm text-muted-foreground">{model.counts.pop} point-of-presence asset(s)</p>
          </div>
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center gap-2 text-accent"><SignalHigh className="h-4 w-4" /><span className="text-sm font-semibold">Signal</span></div>
            <p className="mt-1 text-sm text-muted-foreground">{model.counts.signal} signal reading(s)</p>
          </div>
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center gap-2 text-red-400"><Route className="h-4 w-4" /><span className="text-sm font-semibold">LoS</span></div>
            <p className="mt-1 text-sm text-muted-foreground">{model.links.length} candidate link(s), {model.links.filter((link) => link.obstructed).length} obstructed</p>
          </div>
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex items-center gap-2 text-orange-300"><Zap className="h-4 w-4" /><span className="text-sm font-semibold">Eskom</span></div>
            <p className="mt-1 text-sm text-muted-foreground">{model.gisScan?.eskomCorridors.length ?? 0} corridor overlay(s)</p>
          </div>
        </div>

        {model.points.length > 0 ? (
          <div className="grid gap-2 md:grid-cols-2">
            {model.points.map((point) => (
              <div key={point.id} className="rounded-lg border border-border bg-background/40 p-3">
                <p className={`text-sm font-semibold ${categoryStyles[point.category].className}`}>{categoryStyles[point.category].label}</p>
                <p className="mt-1 text-sm text-foreground">{point.label}</p>
                {point.source === "asset" || point.source === "gis-scan" ? (
                  <p className="mt-1 text-xs text-muted-foreground">{point.verificationStatus || "Candidate"} · confidence {point.confidence ?? "n/a"}%{typeof point.distanceKm === "number" ? ` · ${point.distanceKm.toFixed(1)} km away` : ""}{typeof point.bearingDeg === "number" ? ` · bearing ${point.bearingDeg.toFixed(0)}°` : ""}</p>
                ) : null}
                <p className="mt-1 font-mono text-xs text-muted-foreground">{point.lat.toFixed(6)}, {point.lng.toFixed(6)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-muted-foreground">
            Add a property pin or infrastructure discovery points to render a precise map overlay for the reserve manager.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
