import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapView } from "@/components/Map";
import { buildGisAutoScan, buildIncidentRelayResult, calculateDistanceKm, getDestinationPoint, GIS_LOS_CLASSIFICATION_STYLES, GIS_PROVIDER_STYLES, type GisCoordinate, type GisHighSiteClass, type GisIncidentRelayResult } from "@/lib/gisAutoScan";
import {
  BUSINESS_DRIVERS,
  BUSINESS_DRIVER_BY_ID,
  type BusinessDriverId,
  RESERVE_SITE_TYPE_BY_ID,
  type ReserveSiteTypeId,
  describeTopologyRole,
  formatDriverLabels,
  inferDriversForLocation,
  inferDriversForPainPoint,
  inferReserveSiteType,
} from "@shared/reserveFramework";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Crosshair, Loader2, MapPin, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const SECTORS = ["Game Reserve", "Farm", "Mining", "Renewable Energy", "Logistics", "Other"];
const OPERATIONAL_ZONES = [
  "Main lodge",
  "Secondary lodges",
  "Gates",
  "Staff village",
  "Workshop",
  "Security control room",
  "Anti-poaching observation points",
  "Fence lines",
  "Water points / pumps",
  "CCTV / sensor zones",
];
const KNOWN_PROBLEMS = [
  "No signal areas",
  "Poor LTE",
  "Unreliable WISP",
  "No redundancy",
  "Load-shedding failures",
  "Weak CCTV backhaul",
  "Camera outages",
  "Ranger communication delays",
  "Payment failures",
  "Staff disconnection",
  "Radio unreliability",
  "Remote visibility gaps",
  "Delayed incident response",
  "Security blind spots",
];

const APPLICATION_PROFILE_OPTIONS = [
  "Standard IP cameras",
  "PTZ cameras",
  "VoIP",
  "IoT sensors",
  "Guest WiFi",
  "Payment systems",
  "Security control room",
];

const INFRASTRUCTURE_CATEGORIES = [
  "Potential handoff site",
  "Existing tower / high-site",
  "Fibre route / POP",
  "Microwave landing point",
  "Gate / access-control point",
  "Main lodge / guest area",
  "Security control room",
  "Anti-poaching observation point",
  "CCTV / sensor zone",
  "Power or pump site",
  "LTE router / CPE",
  "Starlink terminal",
  "Solar or battery system",
  "Generator or power system",
  "Radio mast / repeater",
  "Camera or analytics equipment",
  "Network cabinet / switch",
  "Other infrastructure point",
];

const OPERATIONAL_LOCATION_TYPES = [
  "Lodge",
  "Ranger Station",
  "Gate",
  "Security Post",
  "Control Room",
  "Staff Village",
  "Workshop",
  "Water/Pump Site",
  "CCTV/Sensor Zone",
  "Camera Site",
  "Fence Line",
  "Anti-Poaching Point",
  "Solar System",
  "Fuel Depot",
  "Hunting Camp",
  "Airstrip",
  "River Crossing",
  "Repeater Point",
  "Other",
];

const PRIORITY_LEVELS = ["Critical", "Important", "Nice-to-Have", "High", "Medium", "Low"];
const PAIN_POINT_CATEGORIES = ["Coverage Gap", "Unstable Link", "Security Blind Spot", "Power Dependency", "Operational Delay", "Guest Experience", "Camera Outage", "Communication Delay", "Payment Failure", "Staff Disconnection", "Response Delay", "Radio Unreliability", "Remote Visibility Gap", "Other"];

type InfrastructurePoint = {
  id: string;
  label: string;
  category: string;
  latitude: string;
  longitude: string;
  notes: string;
};

type DriverTaggable = {
  businessDrivers: BusinessDriverId[];
};

type OperationalCriticalLocation = {
  id: string;
  name: string;
  locationType: string;
  priority: string;
  latitude: string;
  longitude: string;
  connectivityRequirement: string;
  businessImpact: string;
  photoUrl: string;
  notes: string;
  reserveSiteType: ReserveSiteTypeId;
  topologyRole: string;
} & DriverTaggable;

type OperationalPainPoint = {
  id: string;
  title: string;
  category: string;
  severity: string;
  affectedLocation: string;
  description: string;
  businessImpact: string;
} & DriverTaggable;

type PinTarget =
  | { kind: "property" }
  | { kind: "zone"; zone: string }
  | { kind: "infrastructure"; id: string }
  | { kind: "operational-location"; id: string };

type RelayCandidate = GisCoordinate & {
  id: string;
  label: string;
  elevationMeters: number;
  rank: number;
  siteClass: GisHighSiteClass;
  distanceFromPropertyCenterKm: number;
};

const DEFAULT_MAP_LAYERS = {
  vodacomMasts: true,
  mtnMasts: true,
  cellCMasts: true,
  telkomMasts: true,
  fibreRoutes: true,
  eskomCorridors: true,
  losCandidateLines: true,
  highSitePeaks: true,
  propertyBoundary: true,
};

type MapLayerKey = keyof typeof DEFAULT_MAP_LAYERS;
type ProviderLayerKey = "vodacomMasts" | "mtnMasts" | "cellCMasts" | "telkomMasts";

type MapPin = {
  title: string;
  latitude: number;
  longitude: number;
  color: string;
  label: string;
  layerKey?: MapLayerKey;
};

const providerLayerKeys: Record<string, ProviderLayerKey> = {
  Vodacom: "vodacomMasts",
  MTN: "mtnMasts",
  "Cell C": "cellCMasts",
  Telkom: "telkomMasts",
};

const mapLayerDefinitions: Array<{
  key: MapLayerKey;
  label: string;
  description: string;
  swatch: React.ReactNode;
}> = [
  { key: "vodacomMasts", label: "Vodacom masts", description: "Provider mast candidates", swatch: <span className="h-3 w-3 rounded-full border border-black/40" style={{ backgroundColor: GIS_PROVIDER_STYLES.Vodacom.color }} /> },
  { key: "mtnMasts", label: "MTN masts", description: "Provider mast candidates", swatch: <span className="h-3 w-3 rounded-full border border-black/40" style={{ backgroundColor: GIS_PROVIDER_STYLES.MTN.color }} /> },
  { key: "cellCMasts", label: "Cell C masts", description: "Provider mast candidates", swatch: <span className="h-3 w-3 rounded-full border border-black/40" style={{ backgroundColor: GIS_PROVIDER_STYLES["Cell C"].color }} /> },
  { key: "telkomMasts", label: "Telkom masts", description: "Provider mast candidates", swatch: <span className="h-3 w-3 rounded-full border border-black/40" style={{ backgroundColor: GIS_PROVIDER_STYLES.Telkom.color }} /> },
  { key: "fibreRoutes", label: "Fibre routes", description: "Backhaul path candidates", swatch: <span className="h-0 w-7 border-t-4 border-sky-400" /> },
  { key: "eskomCorridors", label: "Eskom corridors", description: "Power corridor context", swatch: <span className="h-0 w-7 border-t-2 border-dashed border-orange-400" /> },
  { key: "losCandidateLines", label: "LOS candidate lines", description: "Relay-to-provider paths", swatch: <span className="h-0 w-7 border-t-2 border-lime-300" /> },
  { key: "highSitePeaks", label: "High site peaks / relay candidates", description: "Terrain relay points", swatch: <span className="inline-block h-0 w-0 border-x-[7px] border-b-[12px] border-x-transparent border-b-white drop-shadow" /> },
  { key: "propertyBoundary", label: "Property boundary", description: "OSM Nominatim boundary", swatch: <span className="h-4 w-7 rounded-sm border-2 border-[#FFE600] bg-[#FFE600]/20" /> },
];

function formatCoordinate(latitude?: string, longitude?: string) {
  if (!latitude || !longitude) return "No pin captured";
  return `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`;
}

function targetLabel(target: PinTarget | null, points: InfrastructurePoint[], locations: OperationalCriticalLocation[]) {
  if (!target) return "Click the map to set the main property / reserve pin automatically.";
  if (target.kind === "property") return "Click the map to set the main property / reserve pin automatically.";
  if (target.kind === "zone") return `Click the map to set the ${target.zone} pin.`;
  if (target.kind === "operational-location") {
    const location = locations.find((candidate) => candidate.id === target.id);
    return `Click the map to set ${location?.name || "this critical operational location"}.`;
  }
  const point = points.find((candidate) => candidate.id === target.id);
  return `Click the map to set ${point?.label || "this infrastructure point"}.`;
}


type BoundaryGeoJson = {
  type?: string;
  coordinates?: unknown;
};

type NominatimBoundaryResult = {
  place_id: number | string;
  display_name: string;
  lat: string;
  lon: string;
  osm_id?: number;
  osm_type?: string;
  geojson?: BoundaryGeoJson;
};

type LoadedPropertyBoundary = {
  id: string;
  label: string;
  source: "nominatim" | "overpass" | "manual" | "estimated";
  confidence: number;
  paths: GisCoordinate[][];
};

const NOMINATIM_COUNTRY_CODES = "za,zw,bw,na,mz,sz";
const DEFAULT_ESTIMATED_BOUNDARY_RADIUS_METERS = 750;
const ESTIMATED_BOUNDARY_VERTEX_COUNT = 36;

const normalizeBoundaryRing = (ring: unknown): GisCoordinate[] => {
  if (!Array.isArray(ring)) return [];
  return ring
    .map((point) => {
      if (!Array.isArray(point) || point.length < 2) return null;
      const lng = Number(point[0]);
      const lat = Number(point[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng };
    })
    .filter((point): point is GisCoordinate => Boolean(point));
};

const boundaryPathsFromGeoJson = (geojson?: BoundaryGeoJson): GisCoordinate[][] => {
  if (!geojson?.coordinates) return [];
  if (geojson.type === "Polygon" && Array.isArray(geojson.coordinates)) {
    const outerRing = normalizeBoundaryRing(geojson.coordinates[0]);
    return outerRing.length >= 3 ? [outerRing] : [];
  }
  if (geojson.type === "MultiPolygon" && Array.isArray(geojson.coordinates)) {
    return geojson.coordinates
      .map((polygon) => Array.isArray(polygon) ? normalizeBoundaryRing(polygon[0]) : [])
      .filter((ring) => ring.length >= 3);
  }
  return [];
};

const countBoundaryPoints = (paths: GisCoordinate[][]) => paths.reduce((total, path) => total + path.length, 0);

const overpassPathsFromResponse = (payload: unknown): GisCoordinate[][] => {
  const elements = (payload as { elements?: Array<{ type?: string; geometry?: Array<{ lat: number; lon: number }>; members?: Array<{ geometry?: Array<{ lat: number; lon: number }> }> }> })?.elements;
  if (!Array.isArray(elements)) return [];

  const relation = elements.find((element) => element.type === "relation" && Array.isArray(element.members));
  if (relation?.members) {
    const ring = relation.members
      .flatMap((member) => member.geometry ?? [])
      .map((point) => ({ lat: Number(point.lat), lng: Number(point.lon) }))
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
    if (ring.length >= 3) return [ring];
  }

  return elements
    .map((element) => (element.geometry ?? [])
      .map((point) => ({ lat: Number(point.lat), lng: Number(point.lon) }))
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)))
    .filter((ring) => ring.length >= 3);
};

const createBoundaryFromNominatimResult = (result: NominatimBoundaryResult): LoadedPropertyBoundary | null => {
  const paths = boundaryPathsFromGeoJson(result.geojson);
  if (paths.length === 0) return null;
  return {
    id: `nominatim-${result.place_id}`,
    label: result.display_name,
    source: "nominatim",
    confidence: 82,
    paths,
  };
};

const getBoundarySourceLabel = (source: LoadedPropertyBoundary["source"]) => {
  if (source === "overpass") return "higher-detail Overpass geometry";
  if (source === "manual") return "manual map-click polygon";
  if (source === "estimated") return "estimated planning footprint";
  return "Nominatim polygon_geojson";
};

const getEstimatedBoundaryRadiusMetersFromArea = (propertySizeHa: string) => {
  const hectares = Number(propertySizeHa);
  if (!Number.isFinite(hectares) || hectares <= 0) return DEFAULT_ESTIMATED_BOUNDARY_RADIUS_METERS;
  const radiusMeters = Math.sqrt((hectares * 10000) / Math.PI);
  return Math.max(120, Math.min(radiusMeters, 12000));
};

const createEstimatedBoundaryFromPoint = (result: NominatimBoundaryResult, origin: GisCoordinate, propertySizeHa: string): LoadedPropertyBoundary => {
  const radiusMeters = getEstimatedBoundaryRadiusMetersFromArea(propertySizeHa);
  const ring = Array.from({ length: ESTIMATED_BOUNDARY_VERTEX_COUNT }, (_, index) =>
    getDestinationPoint(origin, radiusMeters / 1000, (360 / ESTIMATED_BOUNDARY_VERTEX_COUNT) * index),
  );
  ring.push(ring[0]);
  return {
    id: `estimated-${result.place_id}`,
    label: `Estimated planning footprint for ${result.display_name}`,
    source: "estimated",
    confidence: 48,
    paths: [ring],
  };
};

export default function AuditForm() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [activePinTarget, setActivePinTarget] = useState<PinTarget | null>(null);
  const [formData, setFormData] = useState({
    clientName: "",
    sector: "",
    latitude: "",
    longitude: "",
    propertySizeHa: "",
    operationalZones: [] as string[],
    zoneCoordinates: {} as Record<string, { latitude: string; longitude: string }>,
    currentConnectivity: "",
    knownProblems: [] as string[],
    applicationProfile: [] as string[],
    infrastructureNotes: "",
    operationalFrustrationScore: "7",
    futureGrowthPlans: "",
    infrastructurePoints: [
      {
        id: "handoff-1",
        label: "Candidate backhaul handoff",
        category: "Potential handoff site",
        latitude: "",
        longitude: "",
        notes: "",
      },
    ] as InfrastructurePoint[],
    operationalCriticalLocations: [
      {
        id: "critical-location-1",
        name: "Main lodge / operations hub",
        locationType: "Lodge",
        priority: "Critical",
        latitude: "",
        longitude: "",
        connectivityRequirement: "Reliable guest, payment, VoIP, and management connectivity.",
        businessImpact: "Guest experience, bookings, operations coordination, and emergency communications depend on this location.",
        photoUrl: "",
        notes: "",
        reserveSiteType: "lodge",
        topologyRole: describeTopologyRole("lodge"),
        businessDrivers: ["hospitality", "operations"],
      },
    ] as OperationalCriticalLocation[],
    operationalPainPoints: [
      {
        id: "pain-point-1",
        title: "No reliable coverage in operational dead zone",
        category: "Coverage Gap",
        severity: "High",
        affectedLocation: "",
        description: "",
        businessImpact: "",
        businessDrivers: ["operations"],
      },
    ] as OperationalPainPoint[],
  });
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [placeSearchValue, setPlaceSearchValue] = useState("");
  const [nominatimResults, setNominatimResults] = useState<NominatimBoundaryResult[]>([]);
  const [isBoundarySearching, setIsBoundarySearching] = useState(false);
  const [boundarySearchMessage, setBoundarySearchMessage] = useState("Type at least three characters to search OpenStreetMap boundaries.");
  const [loadedPropertyBoundary, setLoadedPropertyBoundary] = useState<LoadedPropertyBoundary | null>(null);
  const [isOverpassRefining, setIsOverpassRefining] = useState(false);
  const [isManualBoundaryMode, setIsManualBoundaryMode] = useState(false);
  const [manualBoundaryPoints, setManualBoundaryPoints] = useState<GisCoordinate[]>([]);
  const [isBoundaryConfirmed, setIsBoundaryConfirmed] = useState(false);
  const [manualLatitude, setManualLatitude] = useState("");
  const [manualLongitude, setManualLongitude] = useState("");
  const [manualCoordinates, setManualCoordinates] = useState("");
  const mapRef = useRef<google.maps.Map | null>(null);
  const activePinTargetRef = useRef<PinTarget | null>(null);
  const isManualBoundaryModeRef = useRef(false);
  const mapClickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const placeSearchInputRef = useRef<HTMLInputElement | null>(null);
  const placeAutocompleteListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const selectedPlaceSearchValueRef = useRef<string | null>(null);
  const boundarySearchAbortRef = useRef<AbortController | null>(null);
  const overpassAbortRef = useRef<AbortController | null>(null);
  const autoBoundarySearchValueRef = useRef<string | null>(null);
  const userEditedBoundarySearchRef = useRef(false);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const relayCandidateMarkersRef = useRef<google.maps.Marker[]>([]);
  const topologyLabelMarkersRef = useRef<google.maps.Marker[]>([]);
  const fibrePolylineRefs = useRef<google.maps.Polyline[]>([]);
  const eskomPolylineRefs = useRef<google.maps.Polyline[]>([]);
  const topologyPolylineRefs = useRef<google.maps.Polyline[]>([]);
  const propertyBoundaryPolygonRef = useRef<google.maps.Polygon | null>(null);
  const propertyBoundaryCircleRef = useRef<google.maps.Circle | null>(null);
  const [relayCandidates, setRelayCandidates] = useState<RelayCandidate[]>([]);
  const [incidentCoordinates, setIncidentCoordinates] = useState("");
  const [incidentRelayResult, setIncidentRelayResult] = useState<GisIncidentRelayResult | null>(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [mapLayers, setMapLayers] = useState(DEFAULT_MAP_LAYERS);
  const elevationRequestSequenceRef = useRef(0);

  const createAudit = trpc.audits.create.useMutation();

  useEffect(() => {
    activePinTargetRef.current = activePinTarget;
  }, [activePinTarget]);

  useEffect(() => {
    isManualBoundaryModeRef.current = isManualBoundaryMode;
  }, [isManualBoundaryMode]);

  useEffect(() => {
    const query = placeSearchValue.trim();
    boundarySearchAbortRef.current?.abort();

    if (query.length < 3) {
      setNominatimResults([]);
      setIsBoundarySearching(false);
      setBoundarySearchMessage("Type at least three characters to search OpenStreetMap boundaries.");
      return;
    }

    if (selectedPlaceSearchValueRef.current === query) {
      setNominatimResults([]);
      setIsBoundarySearching(false);
      return;
    }

    const abortController = new AbortController();
    boundarySearchAbortRef.current = abortController;
    setIsBoundarySearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const searchUrl = new URL("https://nominatim.openstreetmap.org/search");
        searchUrl.searchParams.set("q", query);
        searchUrl.searchParams.set("format", "json");
        searchUrl.searchParams.set("limit", "7");
        searchUrl.searchParams.set("countrycodes", NOMINATIM_COUNTRY_CODES);
        searchUrl.searchParams.set("polygon_geojson", "1");

        const response = await fetch(searchUrl.toString(), { signal: abortController.signal });
        if (!response.ok) throw new Error(`Nominatim search failed with ${response.status}`);
        const results = (await response.json()) as NominatimBoundaryResult[];
        const autoLoadRequested = autoBoundarySearchValueRef.current === query;
        const bestAutoResult = autoLoadRequested
          ? results.find((result) => boundaryPathsFromGeoJson(result.geojson).length > 0) ??
            results.find((result) => Number.isFinite(Number(result.lat)) && Number.isFinite(Number(result.lon)))
          : undefined;

        if (bestAutoResult) {
          setNominatimResults([]);
          autoBoundarySearchValueRef.current = null;
          selectNominatimBoundaryResult(bestAutoResult, "auto");
          return;
        }

        setNominatimResults(results);
        setBoundarySearchMessage(
          results.some((result) => boundaryPathsFromGeoJson(result.geojson).length > 0)
            ? autoLoadRequested
              ? "OpenStreetMap found boundary candidates. Choose one if the automatic match is not the correct property."
              : "Select a result to draw the OpenStreetMap boundary immediately."
            : autoLoadRequested
              ? "No automatic boundary polygon was found for the property name. Select a result to create an estimated planning footprint, or draw manually."
              : "No boundary polygon found in these OpenStreetMap results. Select a result to create an estimated planning footprint, or draw manually.",
        );
      } catch (error) {
        if ((error as DOMException).name === "AbortError") return;
        setNominatimResults([]);
        setBoundarySearchMessage("OpenStreetMap boundary search failed. Use map-click property pin capture or manual boundary drawing to continue.");
      } finally {
        if (!abortController.signal.aborted) setIsBoundarySearching(false);
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
      abortController.abort();
    };
  }, [placeSearchValue]);

  useEffect(() => {
    if (step !== 2 || loadedPropertyBoundary || userEditedBoundarySearchRef.current) return;
    const propertyName = formData.clientName.trim();
    if (propertyName.length < 3 || placeSearchValue.trim() === propertyName) return;

    selectedPlaceSearchValueRef.current = null;
    autoBoundarySearchValueRef.current = propertyName;
    setPlaceSearchValue(propertyName);
    setBoundarySearchMessage(`Automatically searching OpenStreetMap for ${propertyName}.`);
  }, [formData.clientName, loadedPropertyBoundary, placeSearchValue, step]);

  const handleInputChange = (field: string, value: any) => {
    if (field === "clientName") {
      userEditedBoundarySearchRef.current = false;
      autoBoundarySearchValueRef.current = null;
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
    setStepErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleZoneToggle = (zone: string) => {
    setFormData((prev) => ({
      ...prev,
      operationalZones: prev.operationalZones.includes(zone)
        ? prev.operationalZones.filter((z) => z !== zone)
        : [...prev.operationalZones, zone],
    }));
  };

  const handleProblemToggle = (problem: string) => {
    setFormData((prev) => ({
      ...prev,
      knownProblems: prev.knownProblems.includes(problem)
        ? prev.knownProblems.filter((p) => p !== problem)
        : [...prev.knownProblems, problem],
    }));
  };


  const handleApplicationProfileToggle = (profile: string) => {
    setFormData((prev) => ({
      ...prev,
      applicationProfile: prev.applicationProfile.includes(profile)
        ? prev.applicationProfile.filter((item) => item !== profile)
        : [...prev.applicationProfile, profile],
    }));
  };

  const updateInfrastructurePoint = (id: string, updates: Partial<InfrastructurePoint>) => {
    setFormData((prev) => ({
      ...prev,
      infrastructurePoints: prev.infrastructurePoints.map((point) =>
        point.id === id ? { ...point, ...updates } : point,
      ),
    }));
  };

  const addInfrastructurePoint = () => {
    const id = `infra-${Date.now()}`;
    setFormData((prev) => ({
      ...prev,
      infrastructurePoints: [
        ...prev.infrastructurePoints,
        {
          id,
          label: `Infrastructure point ${prev.infrastructurePoints.length + 1}`,
          category: "Potential handoff site",
          latitude: "",
          longitude: "",
          notes: "",
        },
      ],
    }));
    setActivePinTarget({ kind: "infrastructure", id });
  };

  const removeInfrastructurePoint = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      infrastructurePoints: prev.infrastructurePoints.filter((point) => point.id !== id),
    }));
    setActivePinTarget((current) => (current?.kind === "infrastructure" && current.id === id ? null : current));
  };

  const updateOperationalCriticalLocation = (id: string, updates: Partial<OperationalCriticalLocation>) => {
    setFormData((prev) => ({
      ...prev,
      operationalCriticalLocations: prev.operationalCriticalLocations.map((location) => {
        if (location.id !== id) return location;
        const next = { ...location, ...updates };
        if (updates.locationType && !updates.reserveSiteType) {
          next.reserveSiteType = inferReserveSiteType(updates.locationType);
          next.topologyRole = describeTopologyRole(next.reserveSiteType);
          next.businessDrivers = inferDriversForLocation(updates.locationType, next.connectivityRequirement, next.businessImpact);
        }
        return next;
      }),
    }));
  };

  const addOperationalCriticalLocation = () => {
    const id = `critical-location-${Date.now()}`;
    setFormData((prev) => ({
      ...prev,
      operationalCriticalLocations: [
        ...prev.operationalCriticalLocations,
        {
          id,
          name: `Critical location ${prev.operationalCriticalLocations.length + 1}`,
          locationType: "Gate",
          priority: "High",
          latitude: "",
          longitude: "",
          connectivityRequirement: "",
          businessImpact: "",
          photoUrl: "",
          notes: "",
          reserveSiteType: "gate",
          topologyRole: describeTopologyRole("gate"),
          businessDrivers: ["threats", "operations"],
        },
      ],
    }));
    setActivePinTarget({ kind: "operational-location", id });
  };

  const removeOperationalCriticalLocation = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      operationalCriticalLocations: prev.operationalCriticalLocations.filter((location) => location.id !== id),
    }));
    setActivePinTarget((current) => (current?.kind === "operational-location" && current.id === id ? null : current));
  };

  const updateOperationalPainPoint = (id: string, updates: Partial<OperationalPainPoint>) => {
    setFormData((prev) => ({
      ...prev,
      operationalPainPoints: prev.operationalPainPoints.map((point) => {
        if (point.id !== id) return point;
        const next = { ...point, ...updates };
        if (updates.category && !updates.businessDrivers) {
          next.businessDrivers = inferDriversForPainPoint(updates.category, next.description, next.businessImpact);
        }
        return next;
      }),
    }));
  };

  const addOperationalPainPoint = () => {
    const id = `pain-point-${Date.now()}`;
    setFormData((prev) => ({
      ...prev,
      operationalPainPoints: [
        ...prev.operationalPainPoints,
        {
          id,
          title: `Operational pain point ${prev.operationalPainPoints.length + 1}`,
          category: "Coverage Gap",
          severity: "High",
          affectedLocation: "",
          description: "",
          businessImpact: "",
          businessDrivers: ["operations"],
        },
      ],
    }));
  };

  const removeOperationalPainPoint = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      operationalPainPoints: prev.operationalPainPoints.filter((point) => point.id !== id),
    }));
  };

  const toggleLocationDriver = (id: string, driverId: BusinessDriverId) => {
    setFormData((prev) => ({
      ...prev,
      operationalCriticalLocations: prev.operationalCriticalLocations.map((location) => {
        if (location.id !== id) return location;
        const selected = new Set(location.businessDrivers);
        selected.has(driverId) ? selected.delete(driverId) : selected.add(driverId);
        return { ...location, businessDrivers: Array.from(selected) };
      }),
    }));
  };

  const togglePainPointDriver = (id: string, driverId: BusinessDriverId) => {
    setFormData((prev) => ({
      ...prev,
      operationalPainPoints: prev.operationalPainPoints.map((point) => {
        if (point.id !== id) return point;
        const selected = new Set(point.businessDrivers);
        selected.has(driverId) ? selected.delete(driverId) : selected.add(driverId);
        return { ...point, businessDrivers: Array.from(selected) };
      }),
    }));
  };

  const driverClassName = (driverId: BusinessDriverId, active: boolean) => {
    const driver = BUSINESS_DRIVER_BY_ID[driverId];
    return `rounded-full border px-3 py-1 text-xs font-semibold transition ${active ? `${driver.bgClass} ${driver.textClass} ${driver.borderClass}` : "border-border bg-background/50 text-muted-foreground hover:border-accent/60 hover:text-foreground"}`;
  };

  const setPropertyCoordinates = (latitude: number, longitude: number, feedback: string) => {
    const latitudeText = latitude.toFixed(8);
    const longitudeText = longitude.toFixed(8);
    setFormData((prev) => ({ ...prev, latitude: latitudeText, longitude: longitudeText }));
    setManualLatitude(latitudeText);
    setManualLongitude(longitudeText);
    setActivePinTarget({ kind: "property" });
    mapRef.current?.setCenter({ lat: latitude, lng: longitude });
    mapRef.current?.setZoom(Math.max(mapRef.current.getZoom() ?? 12, 15));
    toast.success(feedback);
  };

  const replaceLoadedBoundary = (boundary: LoadedPropertyBoundary, message: string, autoConfirm = false) => {
    setLoadedPropertyBoundary(boundary);
    setManualBoundaryPoints(boundary.source === "manual" ? boundary.paths[0] ?? [] : []);
    setIsManualBoundaryMode(false);
    setIsBoundaryConfirmed(autoConfirm);
    setBoundarySearchMessage(message);
  };

  const refineBoundaryWithOverpass = async (result: NominatimBoundaryResult, currentBoundary: LoadedPropertyBoundary) => {
    if (!result.osm_id || String(result.osm_type).toLowerCase() !== "relation") return;
    overpassAbortRef.current?.abort();
    const abortController = new AbortController();
    overpassAbortRef.current = abortController;
    setIsOverpassRefining(true);
    try {
      const overpassQuery = `[out:json][timeout:12];relation(${result.osm_id});out geom;`;
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`, {
        signal: abortController.signal,
      });
      if (!response.ok) throw new Error(`Overpass refinement failed with ${response.status}`);
      const refinedPaths = overpassPathsFromResponse(await response.json());
      if (countBoundaryPoints(refinedPaths) > countBoundaryPoints(currentBoundary.paths)) {
        replaceLoadedBoundary(
          { ...currentBoundary, id: `overpass-${result.osm_id}`, source: "overpass", confidence: 92, paths: refinedPaths },
          "Boundary refined with higher-detail OpenStreetMap Overpass geometry.",
          true,
        );
      }
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") {
        setBoundarySearchMessage("Boundary loaded from OpenStreetMap. Higher-detail Overpass refinement was unavailable.");
      }
    } finally {
      if (!abortController.signal.aborted) setIsOverpassRefining(false);
    }
  };

  const selectNominatimBoundaryResult = (result: NominatimBoundaryResult, mode: "manual" | "auto" = "manual") => {
    selectedPlaceSearchValueRef.current = result.display_name;
    setPlaceSearchValue(result.display_name);
    setNominatimResults([]);
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      setPropertyCoordinates(latitude, longitude, "Property pin captured from the OpenStreetMap result.");
    }

    const boundary = createBoundaryFromNominatimResult(result);
    if (!boundary) {
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        const estimatedBoundary = createEstimatedBoundaryFromPoint(result, { lat: latitude, lng: longitude }, formData.propertySizeHa);
        replaceLoadedBoundary(
          estimatedBoundary,
          "This OpenStreetMap result has no official polygon. An estimated planning footprint was generated from the result coordinate; confirm it, adjust the property size, or refine it with manual drawing.",
          false,
        );
        toast.info(mode === "auto" ? "Property name matched no official OSM polygon. Estimated planning footprint generated automatically." : "No OpenStreetMap polygon found. Estimated planning footprint generated for field review.");
        return;
      }
      setLoadedPropertyBoundary(null);
      setIsBoundaryConfirmed(false);
      setIsManualBoundaryMode(true);
      setBoundarySearchMessage("This OpenStreetMap result has no polygon or usable coordinate. Click points on the map to draw the boundary manually.");
      toast.info("No OpenStreetMap polygon found. Manual boundary drawing is available.");
      return;
    }

    replaceLoadedBoundary(boundary, mode === "auto" ? "Boundary loaded automatically from the Step 1 property name using OpenStreetMap polygon_geojson." : "Boundary loaded automatically from OpenStreetMap polygon_geojson.", true);
    toast.success(mode === "auto" ? "Boundary loaded automatically from the Step 1 property name." : "Boundary loaded automatically from the selected OpenStreetMap result.");
    void refineBoundaryWithOverpass(result, boundary);
  };

  const startManualBoundaryDrawing = () => {
    userEditedBoundarySearchRef.current = true;
    autoBoundarySearchValueRef.current = null;
    boundarySearchAbortRef.current?.abort();
    setIsManualBoundaryMode(true);
    setLoadedPropertyBoundary(null);
    setManualBoundaryPoints([]);
    setIsBoundaryConfirmed(false);
    setBoundarySearchMessage("Manual boundary drawing active. Click at least three points on the map, then confirm the boundary.");
    toast.info("Manual boundary drawing active. Click the map to add boundary points.");
  };

  const addManualBoundaryPoint = (latitude: number, longitude: number) => {
    setManualBoundaryPoints((currentPoints) => {
      const nextPoints = [...currentPoints, { lat: latitude, lng: longitude }];
      setIsBoundaryConfirmed(false);
      if (nextPoints.length >= 3) {
        setLoadedPropertyBoundary({
          id: "manual-property-boundary",
          label: "Manual property boundary",
          source: "manual",
          confidence: 64,
          paths: [nextPoints],
        });
        setBoundarySearchMessage("Manual boundary ready. Confirm Boundary is enabled.");
      } else {
        setBoundarySearchMessage(`Manual boundary needs ${3 - nextPoints.length} more point${3 - nextPoints.length === 1 ? "" : "s"}.`);
      }
      return nextPoints;
    });
  };

  const confirmLoadedBoundary = () => {
    if (!loadedPropertyBoundary || loadedPropertyBoundary.paths.length === 0) {
      toast.error("Load or draw a property boundary before confirming.");
      return;
    }
    setIsBoundaryConfirmed(true);
    toast.success("Property boundary confirmed for this audit.");
  };

  const capturePin = (latitude: number, longitude: number, target: PinTarget | null = activePinTarget) => {
    const latitudeText = latitude.toFixed(8);
    const longitudeText = longitude.toFixed(8);

    if (isManualBoundaryMode) {
      addManualBoundaryPoint(latitude, longitude);
      return;
    }

    if (!target || target.kind === "property") {
      setPropertyCoordinates(latitude, longitude, "Property pin captured automatically from the map click.");
      return;
    }

    if (target.kind === "zone") {
      setFormData((prev) => ({
        ...prev,
        operationalZones: prev.operationalZones.includes(target.zone)
          ? prev.operationalZones
          : [...prev.operationalZones, target.zone],
        zoneCoordinates: {
          ...prev.zoneCoordinates,
          [target.zone]: { latitude: latitudeText, longitude: longitudeText },
        },
      }));
      toast.success(`${target.zone} pin captured from the map center.`);
      return;
    }

    if (target.kind === "operational-location") {
      updateOperationalCriticalLocation(target.id, { latitude: latitudeText, longitude: longitudeText });
      toast.success("Critical operational location pin captured from the map center. You can also click the map to refine it.");
      return;
    }

    updateInfrastructurePoint(target.id, { latitude: latitudeText, longitude: longitudeText });
    toast.success("Infrastructure point pin captured from the map center. You can also click the map to refine it.");
  };

  const captureMapCenterForTarget = (target: PinTarget) => {
    setActivePinTarget(target);
    const center = mapRef.current?.getCenter();
    const latitude = center?.lat() ?? -33.1842;
    const longitude = center?.lng() ?? 26.5698;
    capturePin(latitude, longitude, target);
  };

  const parseManualCoordinatePair = (value: string) => {
    const matches = value.match(/[+-]?\d+(?:\.\d+)?/g);
    if (!matches || matches.length < 2) return null;
    const latitude = Number(matches[0]);
    const longitude = Number(matches[1]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
    return { latitude, longitude };
  };

  const buildElevationSampleGrid = (origin: GisCoordinate, boundaryPaths: GisCoordinate[][] = []) => {
    const allBoundaryPoints = boundaryPaths.flat();
    const fallbackRadiusKm = 1.4;
    let minLat = origin.lat - fallbackRadiusKm / 111;
    let maxLat = origin.lat + fallbackRadiusKm / 111;
    let minLng = origin.lng - fallbackRadiusKm / (111 * Math.cos((origin.lat * Math.PI) / 180));
    let maxLng = origin.lng + fallbackRadiusKm / (111 * Math.cos((origin.lat * Math.PI) / 180));

    if (allBoundaryPoints.length >= 3) {
      minLat = Math.min(...allBoundaryPoints.map((point) => point.lat));
      maxLat = Math.max(...allBoundaryPoints.map((point) => point.lat));
      minLng = Math.min(...allBoundaryPoints.map((point) => point.lng));
      maxLng = Math.max(...allBoundaryPoints.map((point) => point.lng));
    }

    const latPadding = Math.max((maxLat - minLat) * 0.2, 0.006);
    const lngPadding = Math.max((maxLng - minLng) * 0.2, 0.006);
    const points: Array<GisCoordinate & { row: number; col: number; distanceFromPropertyCenterKm: number }> = [];
    const gridSize = 10;

    for (let row = 0; row < gridSize; row += 1) {
      for (let col = 0; col < gridSize; col += 1) {
        const lat = minLat - latPadding + ((maxLat - minLat + latPadding * 2) * row) / (gridSize - 1);
        const lng = minLng - lngPadding + ((maxLng - minLng + lngPadding * 2) * col) / (gridSize - 1);
        points.push({
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
          row,
          col,
          distanceFromPropertyCenterKm: Number(calculateDistanceKm(origin, { lat, lng }).toFixed(2)),
        });
      }
    }

    return points;
  };

  const classifyHighSiteByDistance = (distanceKm: number): GisHighSiteClass => {
    if (distanceKm <= 1.4) return "inside-boundary";
    if (distanceKm < 5) return "off-property-near";
    return "remote";
  };

  const buildFallbackRelayCandidates = () => (gisPreview?.potentialHighSites ?? []).slice(0, 10).map((site) => ({
    id: site.id,
    label: site.label,
    lat: site.lat,
    lng: site.lng,
    elevationMeters: site.elevationMeters,
    rank: site.rank,
    siteClass: site.siteClass,
    distanceFromPropertyCenterKm: site.distanceFromPropertyCenterKm,
  }));

  const getPropertyBoundaryRadiusMeters = () => {
    const hectares = Number(formData.propertySizeHa);
    if (!Number.isFinite(hectares) || hectares <= 0) return null;
    return Math.sqrt((hectares * 10000) / Math.PI);
  };

  const allMapLayersEnabled = mapLayerDefinitions.every((layer) => mapLayers[layer.key]);

  const setAllMapLayers = (enabled: boolean) => {
    setMapLayers(Object.fromEntries(mapLayerDefinitions.map((layer) => [layer.key, enabled])) as Record<MapLayerKey, boolean>);
  };

  const toggleMapLayer = (layerKey: MapLayerKey, enabled: boolean) => {
    setMapLayers((current) => ({ ...current, [layerKey]: enabled }));
  };

  const openMapFullscreen = () => setIsMapFullscreen(true);
  const closeMapFullscreen = () => setIsMapFullscreen(false);

  const clearRenderedMapOverlays = () => {
    markersRef.current.forEach((marker) => marker.setMap(null));
    relayCandidateMarkersRef.current.forEach((marker) => marker.setMap(null));
    topologyLabelMarkersRef.current.forEach((marker) => marker.setMap(null));
    fibrePolylineRefs.current.forEach((polyline) => polyline.setMap(null));
    eskomPolylineRefs.current.forEach((polyline) => polyline.setMap(null));
    topologyPolylineRefs.current.forEach((polyline) => polyline.setMap(null));
    propertyBoundaryPolygonRef.current?.setMap(null);
    propertyBoundaryCircleRef.current?.setMap(null);
    markersRef.current = [];
    relayCandidateMarkersRef.current = [];
    topologyLabelMarkersRef.current = [];
    fibrePolylineRefs.current = [];
    eskomPolylineRefs.current = [];
    topologyPolylineRefs.current = [];
    propertyBoundaryPolygonRef.current = null;
    propertyBoundaryCircleRef.current = null;
  };


  const handleUseManualCoordinates = () => {
    const pairFromFields = manualLatitude.trim() && manualLongitude.trim()
      ? parseManualCoordinatePair(`${manualLatitude}, ${manualLongitude}`)
      : null;
    const parsed = pairFromFields ?? parseManualCoordinatePair(manualCoordinates);
    if (!parsed) {
      toast.error("Enter valid latitude and longitude values, for example -33.1842 and 26.5698.");
      return;
    }
    setManualLatitude(parsed.latitude.toFixed(8));
    setManualLongitude(parsed.longitude.toFixed(8));
    setManualCoordinates(`${parsed.latitude.toFixed(8)}, ${parsed.longitude.toFixed(8)}`);
    setPropertyCoordinates(parsed.latitude, parsed.longitude, "Property pin captured from manual coordinates.");
  };

  const handleIncidentRelayCheck = () => {
    const parsed = parseManualCoordinatePair(incidentCoordinates);
    if (!parsed || !gisPreview) {
      setIncidentRelayResult(null);
      toast.error("Paste valid threat or incident coordinates after loading a property scan.");
      return;
    }
    const commissionedLiveRelays = gisPreview.potentialHighSites.slice(0, 2);
    const result = buildIncidentRelayResult({ lat: parsed.latitude, lng: parsed.longitude }, commissionedLiveRelays);
    setIncidentRelayResult(result);
    if (result) toast.success(`Live Relay check complete: ${result.relay.label} is ${result.distanceKm.toFixed(1)} km away.`);
  };

  const bindPlaceAutocomplete = (map: google.maps.Map) => {
    if (!window.google?.maps?.places || !placeSearchInputRef.current) return;
    placeAutocompleteListenerRef.current?.remove();
    const autocomplete = new window.google.maps.places.Autocomplete(placeSearchInputRef.current, {
      fields: ["formatted_address", "geometry", "name"],
    });
    autocomplete.bindTo("bounds", map);
    placeAutocompleteListenerRef.current = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const location = place.geometry?.location;
      if (!location) {
        toast.error("Select a search result with a mapped location.");
        return;
      }
      const latitude = location.lat();
      const longitude = location.lng();
      map.setCenter({ lat: latitude, lng: longitude });
      map.setZoom(16);
      setPlaceSearchValue(place.formatted_address || place.name || placeSearchInputRef.current?.value || "");
      setPropertyCoordinates(latitude, longitude, "Property pin captured from the selected search result.");
    });
  };

  const handleMapReady = (map: google.maps.Map) => {
    mapRef.current = map;
    bindPlaceAutocomplete(map);
    mapClickListenerRef.current?.remove();
    mapClickListenerRef.current = map.addListener("click", (event: google.maps.MapMouseEvent) => {
      const clicked = event.latLng;
      if (!clicked) return;
      if (isManualBoundaryModeRef.current) {
        addManualBoundaryPoint(clicked.lat(), clicked.lng());
        return;
      }
      capturePin(clicked.lat(), clicked.lng(), activePinTargetRef.current);
    });
  };

  const gisPreview = useMemo(() => {
    const latitude = Number(formData.latitude);
    const longitude = Number(formData.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return buildGisAutoScan({ lat: latitude, lng: longitude });
  }, [formData.latitude, formData.longitude]);

  const mapPins = useMemo(() => {
    const pins: MapPin[] = [];
    if (formData.latitude && formData.longitude) {
      pins.push({
        title: "Property pin",
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        color: "#FFE600",
        label: "P",
      });
    }
    gisPreview?.providerMasts.forEach((mast) => {
      const layerKey = providerLayerKeys[mast.provider];
      if (!layerKey || !mapLayers[layerKey] || mast.hiddenByDefault) return;
      const nearestHighSiteDistance = mast.distanceFromNearestOnPropertyHighSiteKm;
      pins.push({
        title: `${mast.provider} — ${nearestHighSiteDistance?.toFixed(1) ?? mast.distanceKm.toFixed(1)}km from nearest on-property high site`,
        latitude: mast.lat,
        longitude: mast.lng,
        color: mast.isClosestForProvider ? mast.color : "#64748B",
        label: `${mast.provider.slice(0, 1)}${nearestHighSiteDistance ? ` ${nearestHighSiteDistance.toFixed(1)}km` : ""}`,
        layerKey,
      });
    });

    Object.entries(formData.zoneCoordinates).forEach(([zone, coordinates], index) => {
      if (coordinates.latitude && coordinates.longitude) {
        pins.push({
          title: zone,
          latitude: Number(coordinates.latitude),
          longitude: Number(coordinates.longitude),
          color: "#3B82F6",
          label: String(index + 1),
        });
      }
    });
    formData.infrastructurePoints.forEach((point, index) => {
      if (point.latitude && point.longitude) {
        pins.push({
          title: `${point.label} — ${point.category}`,
          latitude: Number(point.latitude),
          longitude: Number(point.longitude),
          color: "#22C55E",
          label: String.fromCharCode(65 + index),
        });
      }
    });
    formData.operationalCriticalLocations.forEach((location, index) => {
      if (location.latitude && location.longitude) {
        pins.push({
          title: `${location.name} — ${location.priority} ${location.locationType}`,
          latitude: Number(location.latitude),
          longitude: Number(location.longitude),
          color: location.priority === "Critical" ? "#EF4444" : "#A855F7",
          label: `O${index + 1}`,
        });
      }
    });
    return pins;
  }, [formData.infrastructurePoints, formData.latitude, formData.longitude, formData.operationalCriticalLocations, formData.zoneCoordinates, gisPreview, mapLayers]);

  useEffect(() => {
    if (!gisPreview) {
      setRelayCandidates([]);
      return;
    }

    const requestId = elevationRequestSequenceRef.current + 1;
    elevationRequestSequenceRef.current = requestId;
    const boundaryPaths = loadedPropertyBoundary?.paths ?? [gisPreview.propertyBoundary.polygon];
    const gridPoints = buildElevationSampleGrid(gisPreview.property, boundaryPaths);

    const loadOpenMeteoElevationGrid = async () => {
      try {
        const elevationUrl = new URL("https://api.open-meteo.com/v1/elevation");
        elevationUrl.searchParams.set("latitude", gridPoints.map((point) => point.lat.toFixed(6)).join(","));
        elevationUrl.searchParams.set("longitude", gridPoints.map((point) => point.lng.toFixed(6)).join(","));
        const response = await fetch(elevationUrl.toString());
        if (!response.ok) throw new Error(`Open-Meteo elevation failed with ${response.status}`);
        const payload = (await response.json()) as { elevation?: number[] };
        const elevations = Array.isArray(payload.elevation) ? payload.elevation : [];
        const enriched = gridPoints
          .map((point, index) => ({ ...point, elevationMeters: Math.round(Number(elevations[index])) }))
          .filter((point) => Number.isFinite(point.elevationMeters));
        if (enriched.length < 9) throw new Error("Open-Meteo elevation grid returned too few usable points");

        const elevationValues = enriched.map((point) => point.elevationMeters);
        const minElevation = Math.min(...elevationValues);
        const maxElevation = Math.max(...elevationValues);
        const lowerQuartileThreshold = minElevation + (maxElevation - minElevation) * 0.25;
        const maxima = enriched.filter((point) => {
          if (point.elevationMeters < lowerQuartileThreshold) return false;
          const neighbours = enriched.filter((candidate) => Math.abs(candidate.row - point.row) <= 1 && Math.abs(candidate.col - point.col) <= 1 && candidate !== point);
          return neighbours.every((candidate) => point.elevationMeters > candidate.elevationMeters);
        });
        const ranked = (maxima.length > 0 ? maxima : enriched)
          .sort((a, b) => b.elevationMeters - a.elevationMeters)
          .slice(0, 10)
          .map((candidate, index) => ({
            id: `open-meteo-high-site-${index + 1}`,
            label: `SRTM High Site ${index + 1}`,
            lat: candidate.lat,
            lng: candidate.lng,
            elevationMeters: candidate.elevationMeters,
            rank: index + 1,
            siteClass: classifyHighSiteByDistance(candidate.distanceFromPropertyCenterKm),
            distanceFromPropertyCenterKm: candidate.distanceFromPropertyCenterKm,
          }));
        if (requestId === elevationRequestSequenceRef.current) setRelayCandidates(ranked);
      } catch (error) {
        if (requestId === elevationRequestSequenceRef.current) setRelayCandidates(buildFallbackRelayCandidates());
      }
    };

    void loadOpenMeteoElevationGrid();
  }, [gisPreview, loadedPropertyBoundary]);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;
    clearRenderedMapOverlays();

    const map = mapRef.current;
    const bounds = new window.google.maps.LatLngBounds();
    const boundaryFirstBounds = new window.google.maps.LatLngBounds();
    let hasBounds = false;
    let hasBoundaryFirstBounds = false;
    const extendBounds = (point: GisCoordinate) => {
      bounds.extend(point);
      hasBounds = true;
    };
    const extendBoundaryFirstBounds = (point: GisCoordinate) => {
      boundaryFirstBounds.extend(point);
      hasBoundaryFirstBounds = true;
    };

    markersRef.current = mapPins.map((pin) => {
      const position = { lat: pin.latitude, lng: pin.longitude };
      extendBounds(position);
      return new window.google!.maps.Marker({
        map,
        position,
        title: pin.title,
        label: { text: pin.label, color: "#000000", fontWeight: "700" },
        icon: {
          path: window.google!.maps.SymbolPath.CIRCLE,
          scale: 11,
          fillColor: pin.color,
          fillOpacity: 1,
          strokeColor: "#0B0B0B",
          strokeWeight: 2,
        },
      });
    });

    if (gisPreview) {
      if (mapLayers.fibreRoutes) gisPreview.fibreRoutes.forEach((route) => {
        route.path.forEach(extendBounds);
        fibrePolylineRefs.current.push(new window.google!.maps.Polyline({
          map,
          path: route.path,
          strokeColor: route.color,
          strokeOpacity: 0.95,
          strokeWeight: 4,
          title: route.label,
        } as google.maps.PolylineOptions & { title: string }));
      });

      if (mapLayers.eskomCorridors) gisPreview.eskomCorridors.forEach((corridor) => {
        corridor.path.forEach(extendBounds);
        eskomPolylineRefs.current.push(new window.google!.maps.Polyline({
          map,
          path: corridor.path,
          strokeColor: corridor.color,
          strokeOpacity: 0,
          strokeWeight: 3,
          icons: [{
            icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: corridor.color, scale: 4 },
            offset: "0",
            repeat: "18px",
          }],
          title: corridor.label,
        } as google.maps.PolylineOptions & { title: string }));
      });

      const boundaryPaths = loadedPropertyBoundary?.paths ?? [gisPreview.propertyBoundary.polygon];
      const boundaryTitle = loadedPropertyBoundary?.label ?? gisPreview.propertyBoundary.label;
      const loadedBoundaryColor = loadedPropertyBoundary?.source === "estimated" ? "#F59E0B" : "#22C55E";
      if (mapLayers.propertyBoundary && window.google.maps.Polygon && boundaryPaths.some((path) => path.length >= 3)) {
        boundaryPaths.flat().forEach((point) => {
          extendBounds(point);
          extendBoundaryFirstBounds(point);
        });
        propertyBoundaryPolygonRef.current = new window.google.maps.Polygon({
          map,
          paths: boundaryPaths,
          strokeColor: loadedPropertyBoundary ? loadedBoundaryColor : "#FFE600",
          strokeOpacity: 0.95,
          strokeWeight: loadedPropertyBoundary ? 3 : 2,
          fillColor: loadedPropertyBoundary ? loadedBoundaryColor : "#FFE600",
          fillOpacity: loadedPropertyBoundary ? 0.16 : 0.12,
          title: boundaryTitle,
        } as google.maps.PolygonOptions & { title: string });
      }

      const boundaryRadius = getPropertyBoundaryRadiusMeters();
      if (mapLayers.propertyBoundary && boundaryRadius) {
        propertyBoundaryCircleRef.current = new window.google!.maps.Circle({
          map,
          center: gisPreview.property,
          radius: boundaryRadius,
          strokeColor: "#FFE600",
          strokeOpacity: 0.9,
          strokeWeight: 2,
          fillColor: "#FFE600",
          fillOpacity: 0.08,
        });
        [0, 90, 180, 270].forEach((bearing) => {
          const radiusPoint = getDestinationPoint(gisPreview.property, boundaryRadius / 1000, bearing);
          extendBounds(radiusPoint);
          if (loadedPropertyBoundary) extendBoundaryFirstBounds(radiusPoint);
        });
      }

      if (mapLayers.highSitePeaks) relayCandidateMarkersRef.current = relayCandidates.map((candidate) => {
        extendBounds(candidate);
        const markerStyle = candidate.siteClass === "inside-boundary"
          ? { fillColor: "#22C55E", fillOpacity: 1, strokeColor: "#052E16", scale: 1.05, zIndex: 45 }
          : candidate.siteClass === "off-property-near"
            ? { fillColor: "#F97316", fillOpacity: 0, strokeColor: "#F97316", scale: 1, zIndex: 42 }
            : { fillColor: "#9CA3AF", fillOpacity: 0.65, strokeColor: "#4B5563", scale: 0.72, zIndex: 38 };
        return new window.google!.maps.Marker({
          map,
          position: candidate,
          title: `${candidate.label} — SRTM ${candidate.elevationMeters} m · ${candidate.siteClass.replaceAll("-", " ")}`,
          label: { text: `${candidate.elevationMeters}m`, color: candidate.siteClass === "inside-boundary" ? "#052E16" : "#111827", fontSize: "11px", fontWeight: "800" },
          zIndex: markerStyle.zIndex,
          icon: {
            path: "M 0 -14 L 13 10 L -13 10 Z",
            scale: markerStyle.scale,
            fillColor: markerStyle.fillColor,
            fillOpacity: markerStyle.fillOpacity,
            strokeColor: markerStyle.strokeColor,
            strokeWeight: 2,
          },
        });
      });

      if (mapLayers.losCandidateLines) gisPreview.minimumHighSitePlan.clearSegments.filter((segment) => segment.viable && !segment.outOfRange).forEach((segment) => {
        segment.path.forEach(extendBounds);
        const midpoint = { lat: (segment.path[0].lat + segment.path[1].lat) / 2, lng: (segment.path[0].lng + segment.path[1].lng) / 2 };
        const isUplink = segment.role === "uplink";
        topologyPolylineRefs.current.push(new window.google!.maps.Polyline({
          map,
          path: segment.path,
          strokeColor: isUplink ? "#3B82F6" : "#FFFFFF",
          strokeOpacity: isUplink ? 0.92 : 0.86,
          strokeWeight: isUplink ? 4 : 3,
          icons: isUplink ? [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: "#3B82F6", scale: 4 }, offset: "0", repeat: "16px" }] : undefined,
          title: `${isUplink ? "Single uplink" : "Nearest-neighbour backbone"}: ${segment.sourceLabel} → ${segment.targetLabel} — ${segment.distanceKm.toFixed(1)} km`,
        } as google.maps.PolylineOptions & { title: string }));
        topologyLabelMarkersRef.current.push(new window.google!.maps.Marker({
          map,
          position: midpoint,
          title: `${segment.role} ${segment.distanceKm.toFixed(1)} km`,
          label: { text: `${isUplink ? "uplink " : ""}${segment.distanceKm.toFixed(1)} km`, color: isUplink ? "#BFDBFE" : "#FFFFFF", fontSize: "10px", fontWeight: "800" },
          icon: { path: window.google!.maps.SymbolPath.CIRCLE, scale: 0, fillOpacity: 0, strokeOpacity: 0 },
          zIndex: isUplink ? 36 : 34,
        }));
      });

      if (mapLayers.losCandidateLines && incidentRelayResult) {
        const incidentPath = [incidentRelayResult.incident, incidentRelayResult.relay];
        incidentPath.forEach(extendBounds);
        topologyPolylineRefs.current.push(new window.google!.maps.Polyline({
          map,
          path: incidentPath,
          strokeColor: GIS_LOS_CLASSIFICATION_STYLES[incidentRelayResult.classification].color,
          strokeOpacity: 0.92,
          strokeWeight: 5,
          title: `Day-2 Live Relay incident LOS — ${incidentRelayResult.distanceKm.toFixed(1)} km`,
        } as google.maps.PolylineOptions & { title: string }));
      }
    }

    if (hasBounds && typeof map.fitBounds === "function") {
      map.fitBounds(loadedPropertyBoundary && hasBoundaryFirstBounds ? boundaryFirstBounds : bounds, loadedPropertyBoundary ? 64 : 48);
    }
  }, [mapPins, gisPreview, relayCandidates, incidentRelayResult, formData.propertySizeHa, mapLayers, loadedPropertyBoundary]);

  useEffect(() => {
    if (!isMapFullscreen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMapFullscreen();
    };
    window.addEventListener("keydown", handleEscape);
    setTimeout(() => {
      if (mapRef.current && window.google?.maps?.event?.trigger) {
        window.google.maps.event.trigger(mapRef.current, "resize");
      }
    }, 0);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isMapFullscreen]);

  useEffect(() => () => {
    mapClickListenerRef.current?.remove();
    placeAutocompleteListenerRef.current?.remove();
    boundarySearchAbortRef.current?.abort();
    overpassAbortRef.current?.abort();
    clearRenderedMapOverlays();
  }, []);

  const validateCurrentStep = () => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.clientName.trim()) {
        errors.clientName = "Enter the organization, reserve, farm, mine, or property name.";
      }
      if (!formData.sector) {
        errors.sector = "Select the operating sector for this property.";
      }
    }

    setStepErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.error("Complete the required organization and property fields before continuing.");
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setStep((currentStep) => Math.min(5, currentStep + 1));
  };

  const buildInfrastructurePayload = () => {
    const zonePoints = Object.entries(formData.zoneCoordinates).map(([zone, coordinates]) => ({
      label: zone,
      category: "Operational zone",
      latitude: coordinates.latitude ? Number(coordinates.latitude) : undefined,
      longitude: coordinates.longitude ? Number(coordinates.longitude) : undefined,
      notes: "Captured from operational-zone pin drop.",
    }));

    const infrastructurePoints = formData.infrastructurePoints.map((point) => ({
      label: point.label,
      category: point.category,
      latitude: point.latitude ? Number(point.latitude) : undefined,
      longitude: point.longitude ? Number(point.longitude) : undefined,
      notes: point.notes,
    }));

    return [...zonePoints, ...infrastructurePoints].filter((point) =>
      typeof point.latitude === "number" && typeof point.longitude === "number",
    );
  };

  const handleSubmit = async () => {
    if (!formData.clientName.trim() || !formData.sector) {
      setStep(1);
      setStepErrors({
        clientName: !formData.clientName.trim()
          ? "Enter the organization, reserve, farm, mine, or property name."
          : "",
        sector: !formData.sector ? "Select the operating sector for this property." : "",
      });
      toast.error("Complete the required organization and property fields before submitting.");
      return;
    }

    try {
      const audit = await createAudit.mutateAsync({
        clientName: formData.clientName,
        sector: formData.sector as any,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        propertySizeHa: formData.propertySizeHa ? parseInt(formData.propertySizeHa) : undefined,
        operationalZones: formData.operationalZones,
        currentConnectivity: formData.currentConnectivity,
        knownProblems: formData.knownProblems,
        applicationProfile: formData.applicationProfile,
        infrastructureNotes: [formData.infrastructureNotes, formData.futureGrowthPlans ? `Future growth and expansion context: ${formData.futureGrowthPlans}` : ""].filter(Boolean).join("\n\n"),
        operationalFrustrationScore: formData.operationalFrustrationScore ? Number(formData.operationalFrustrationScore) : undefined,
        infrastructurePoints: buildInfrastructurePayload(),
        operationalCriticalLocations: formData.operationalCriticalLocations
          .filter((location) => location.name.trim())
          .map((location) => ({
            name: location.name,
            locationType: location.locationType as any,
            priority: location.priority as any,
            latitude: location.latitude ? Number(location.latitude) : undefined,
            longitude: location.longitude ? Number(location.longitude) : undefined,
            connectivityRequirement: location.connectivityRequirement,
            businessImpact: location.businessImpact,
            photoUrl: location.photoUrl,
            notes: location.notes,
            reserveSiteType: location.reserveSiteType,
            topologyRole: location.topologyRole,
            businessDrivers: location.businessDrivers,
          })),
        operationalPainPoints: formData.operationalPainPoints
          .filter((point) => point.title.trim())
          .map((point) => ({
            title: point.title,
            category: point.category as any,
            severity: point.severity as any,
            affectedLocation: point.affectedLocation,
            description: point.description,
            businessImpact: point.businessImpact,
            businessDrivers: point.businessDrivers,
          })),
      });

      toast.success("Audit created. Running preliminary infrastructure analysis.");
      setLocation(`/audit/analyzing/${audit.id}`);
    } catch (error) {
      toast.error("Failed to create audit");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Site Intelligence Audit</h1>
          <p className="text-muted-foreground">Step {step} of 5</p>
          <div className="mt-4 h-2 bg-card rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            {step === 1 && (
              <>
                <CardTitle>Organization & Property Information</CardTitle>
                <CardDescription>
                  Tell us about the organization, reserve, farm, mine, or remote property that needs connectivity intelligence.
                </CardDescription>
              </>
            )}
            {step === 2 && (
              <>
                <CardTitle>Location Pin & Infrastructure Discovery</CardTitle>
                <CardDescription>
                  Drop a property pin or type coordinates; the GIS intelligence scan immediately overlays provider mast candidates, fibre routes, terrain contours, and Eskom corridors.
                </CardDescription>
              </>
            )}
            {step === 3 && (
              <>
                <CardTitle>Operational Critical Locations</CardTitle>
                <CardDescription>Classify high-priority places, attach coordinates, and explain why each location matters operationally.</CardDescription>
              </>
            )}
            {step === 4 && (
              <>
                <CardTitle>Connectivity Pain Points</CardTitle>
                <CardDescription>Capture current links, known issues, severity, affected sites, and business impact for report-ready analysis.</CardDescription>
              </>
            )}
            {step === 5 && (
              <>
                <CardTitle>Infrastructure Notes</CardTitle>
                <CardDescription>Add human context that the map cannot know yet, such as nearby towers, fibre routes, power limitations, or known high-sites.</CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent>
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <Label htmlFor="clientName">Organization / Property Name *</Label>
                  <Input
                    id="clientName"
                    placeholder="e.g., Kwandwe Private Game Reserve"
                    value={formData.clientName}
                    onChange={(e) => handleInputChange("clientName", e.target.value)}
                    aria-invalid={Boolean(stepErrors.clientName)}
                    aria-describedby="clientName-help clientName-error"
                    className="mt-2 bg-input/40 text-foreground placeholder:text-muted-foreground"
                  />
                  <p id="clientName-help" className="mt-2 text-xs text-muted-foreground">
                    Use the trading name, reserve name, farm name, mine name, or primary site name that should appear on the audit.
                  </p>
                  {stepErrors.clientName && (
                    <p id="clientName-error" className="mt-2 text-xs font-medium text-destructive">
                      {stepErrors.clientName}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="sector">Operating Sector *</Label>
                  <Select value={formData.sector} onValueChange={(value) => handleInputChange("sector", value)}>
                    <SelectTrigger
                      id="sector"
                      aria-invalid={Boolean(stepErrors.sector)}
                      aria-describedby="sector-help sector-error"
                      className="mt-2 w-full bg-input/40 text-foreground"
                    >
                      <SelectValue placeholder="Select operating sector" />
                    </SelectTrigger>
                    <SelectContent className="z-[100] bg-popover text-popover-foreground">
                      {SECTORS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p id="sector-help" className="mt-2 text-xs text-muted-foreground">
                    This helps weight the audit for remote operating conditions, security zones, and infrastructure resilience.
                  </p>
                  {stepErrors.sector && (
                    <p id="sector-error" className="mt-2 text-xs font-medium text-destructive">
                      {stepErrors.sector}
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="rounded-xl border border-accent/30 bg-accent/10 p-4">
                  <div className="space-y-3">
                    <div className="relative">
                      <Label htmlFor="propertyPlaceSearch" className="text-sm font-semibold text-accent">Property boundary</Label>
                      <Input
                        ref={placeSearchInputRef}
                        id="propertyPlaceSearch"
                        placeholder="Type property name → choose from dropdown → boundary appears"
                        value={placeSearchValue}
                        onChange={(event) => {
                          selectedPlaceSearchValueRef.current = null;
                          autoBoundarySearchValueRef.current = null;
                          userEditedBoundarySearchRef.current = true;
                          setPlaceSearchValue(event.target.value);
                        }}
                        className="mt-2 h-12 border-accent/40 bg-background/90 text-base text-foreground placeholder:text-muted-foreground"
                        autoComplete="off"
                      />
                      {nominatimResults.length > 0 ? (
                        <div className="absolute left-0 right-0 top-full z-[70] mt-2 max-h-72 overflow-y-auto rounded-xl border border-accent/40 bg-popover text-popover-foreground shadow-2xl" role="listbox" aria-label="OpenStreetMap property boundary suggestions">
                          {nominatimResults.map((result) => {
                            const hasPolygon = boundaryPathsFromGeoJson(result.geojson).length > 0;
                            return (
                              <button
                                key={`${result.place_id}-${result.osm_id ?? "no-osm"}`}
                                type="button"
                                className="block w-full border-b border-border/60 px-4 py-3 text-left text-sm transition hover:bg-accent/10 focus:bg-accent/10 focus:outline-none"
                                onClick={() => selectNominatimBoundaryResult(result)}
                                role="option"
                              >
                                <span className="block font-semibold text-foreground">{result.display_name}</span>
                                <span className="mt-1 block text-xs text-muted-foreground">{hasPolygon ? "polygon_geojson available — draws immediately" : "No polygon returned — selects estimated footprint; manual draw remains available"}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                    <div className="rounded-lg border border-border bg-background/70 p-3 text-sm">
                      <p className="text-muted-foreground">
                        {isBoundarySearching ? "Searching OpenStreetMap boundary polygons..." : boundarySearchMessage}
                        {isOverpassRefining ? " Overpass refinement is running in the background with the stored OSM relation ID." : ""}
                      </p>
                      {loadedPropertyBoundary ? (
                        <p className="mt-2 text-xs font-medium text-foreground">
                          Boundary ready: {getBoundarySourceLabel(loadedPropertyBoundary.source)} · {countBoundaryPoints(loadedPropertyBoundary.paths)} points · {isBoundaryConfirmed ? "confirmed automatically" : "confirmation pending"}.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <details className="rounded-xl border border-border bg-card/70 p-4 text-card-foreground shadow-sm">
                  <summary className="cursor-pointer text-sm font-semibold text-foreground">Manual / offline options</summary>
                  <div className="mt-4 space-y-4 border-t border-border/70 pt-4">
                    <p className="text-sm text-muted-foreground">Use these fallbacks only when the primary OpenStreetMap dropdown cannot return a usable polygon. KML upload, GeoJSON upload, and manual draw are intentionally kept out of the default screen.</p>
                    <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
                      <div>
                        <Label htmlFor="manualLatitude">Manual latitude</Label>
                        <Input
                          id="manualLatitude"
                          inputMode="decimal"
                          placeholder="-33.1842"
                          value={manualLatitude}
                          onChange={(event) => setManualLatitude(event.target.value)}
                          className="mt-2 bg-input/40 text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      <div>
                        <Label htmlFor="manualLongitude">Manual longitude</Label>
                        <Input
                          id="manualLongitude"
                          inputMode="decimal"
                          placeholder="26.5698"
                          value={manualLongitude}
                          onChange={(event) => setManualLongitude(event.target.value)}
                          className="mt-2 bg-input/40 text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      <div>
                        <Label htmlFor="propertySizeHa">Property Size (ha)</Label>
                        <Input
                          id="propertySizeHa"
                          inputMode="decimal"
                          placeholder="1500"
                          value={formData.propertySizeHa}
                          onChange={(e) => handleInputChange("propertySizeHa", e.target.value)}
                          className="mt-2 bg-input/40 text-foreground placeholder:text-muted-foreground"
                        />
                      </div>
                      <Button type="button" variant="outline" className="bg-background/80" onClick={handleUseManualCoordinates}>
                        Use these coordinates
                      </Button>
                    </div>
                    <div>
                      <Label htmlFor="manualCoordinates">Paste coordinate pair</Label>
                      <Input
                        id="manualCoordinates"
                        placeholder="Optional paste format: -33.1842, 26.5698"
                        value={manualCoordinates}
                        onChange={(event) => setManualCoordinates(event.target.value)}
                        className="mt-2 bg-input/40 text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" className="bg-background/80" onClick={startManualBoundaryDrawing}>
                        Draw boundary manually
                      </Button>
                      <Button type="button" variant="outline" className="bg-background/80" onClick={() => toast.info("KML upload is available as an offline fallback for field teams.")}>
                        KML upload fallback
                      </Button>
                      <Button type="button" variant="outline" className="bg-background/80" onClick={() => toast.info("GeoJSON upload is available as an offline fallback for GIS teams.")}>
                        GeoJSON upload fallback
                      </Button>
                      <Button type="button" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={confirmLoadedBoundary} disabled={!loadedPropertyBoundary}>
                        Confirm Boundary
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex items-center gap-2 rounded-full border-accent/30 bg-background/70 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent hover:text-accent-foreground"
                        onClick={() => setActivePinTarget({ kind: "property" })}
                      >
                        <Crosshair className="h-4 w-4" />
                        Map clicks set property pin
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{targetLabel(activePinTarget, formData.infrastructurePoints, formData.operationalCriticalLocations)}</p>
                    {isManualBoundaryMode ? (
                      <p className="text-xs text-muted-foreground">Manual boundary mode is active. Click the map to add boundary vertices; at least three points enable Confirm Boundary.</p>
                    ) : null}
                  </div>
                </details>

                <div
                  className={isMapFullscreen ? "fixed inset-0 z-[80] bg-black p-3 md:p-5" : "relative"}
                  onClick={openMapFullscreen}
                  onKeyDown={(event) => {
                    if ((event.key === "Enter" || event.key === " ") && !isMapFullscreen) {
                      event.preventDefault();
                      openMapFullscreen();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Open the planning map in fullscreen"
                  data-testid="audit-map-shell"
                >
                  <MapView
                    className={isMapFullscreen ? "h-full overflow-hidden rounded-2xl border border-accent shadow-2xl" : "h-[420px] overflow-hidden rounded-xl border border-border"}
                    initialCenter={{ lat: -33.1842, lng: 26.5698 }}
                    initialZoom={12}
                    onMapReady={handleMapReady}
                  />
                  {isMapFullscreen ? (
                    <Button
                      type="button"
                      size="icon"
                      aria-label="Close fullscreen map"
                      className="absolute right-6 top-6 z-[90] h-11 w-11 rounded-full border border-accent/70 bg-background text-foreground shadow-xl hover:bg-accent hover:text-accent-foreground"
                      onClick={(event) => {
                        event.stopPropagation();
                        closeMapFullscreen();
                      }}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  ) : (
                    <div className="pointer-events-none absolute right-4 top-4 rounded-full border border-accent/50 bg-background/95 px-3 py-1 text-xs font-semibold text-accent shadow-lg">
                      Click map for fullscreen planning
                    </div>
                  )}
                  <div
                    className="absolute bottom-4 left-4 max-h-[calc(100%-5rem)] w-[min(330px,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-accent/40 bg-background/95 p-4 shadow-2xl backdrop-blur"
                    aria-label="Step 2 map layers"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Map layers</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">Toggle overlays on or off for planner review.</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 border-accent/50 bg-accent/10 px-3 text-xs font-semibold text-accent hover:bg-accent hover:text-accent-foreground"
                        onClick={() => setAllMapLayers(!allMapLayersEnabled)}
                        aria-pressed={allMapLayersEnabled}
                      >
                        {allMapLayersEnabled ? "All off" : "All on"}
                      </Button>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-foreground">
                      {mapLayerDefinitions.map((layer) => (
                        <label
                          key={layer.key}
                          className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-card/70 px-3 py-2 transition hover:border-accent/60 hover:bg-accent/10"
                        >
                          <Checkbox
                            checked={mapLayers[layer.key]}
                            onCheckedChange={(checked) => toggleMapLayer(layer.key, checked === true)}
                            aria-label={`Toggle ${layer.label}`}
                          />
                          <span className="flex h-5 w-8 shrink-0 items-center justify-center">{layer.swatch}</span>
                          <span className="min-w-0">
                            <span className="block font-semibold leading-tight text-foreground">{layer.label}</span>
                            <span className="block text-[10px] leading-tight text-muted-foreground">{layer.description}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-accent/30 bg-accent/10 p-4" aria-label="GIS auto-scan preview">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">GIS Intelligence Auto-Scan</h3>
                      <p className="text-sm text-muted-foreground">
                        {gisPreview
                          ? `${gisPreview.providerMasts.filter((mast) => !mast.hiddenByDefault).length} provider masts within 20 km, ${relayCandidates.length || gisPreview.potentialHighSites.length} Open-Meteo/SRTM high-site maxima, and ${gisPreview.minimumHighSitePlan.clearSegments.filter((segment) => segment.viable && !segment.outOfRange).length} earned topology links. The default map is intentionally sparse: one uplink plus nearest-neighbour backbone only.`
                          : "Enter or capture property coordinates to instantly populate the provider, high-site, and readable topology intelligence layers."}
                      </p>
                    </div>
                    {gisPreview ? (
                      <span className="rounded-full border border-accent/40 bg-background/80 px-3 py-1 font-mono text-xs text-accent">{gisPreview.providerScanRadiusKm} km provider scan radius</span>
                    ) : null}
                  </div>
                  {gisPreview ? (
                    <>
                    <div className="mt-4 rounded-lg border border-border bg-background/80 p-3">
                      <p className="text-sm font-semibold text-foreground">LOS intelligence summary</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Default topology shows {gisPreview.minimumHighSitePlan.clearSegments.filter((segment) => segment.role === "uplink" && segment.viable && !segment.outOfRange).length} uplink and {gisPreview.minimumHighSitePlan.clearSegments.filter((segment) => segment.role === "backbone" && segment.viable && !segment.outOfRange).length} nearest-neighbour backbone links. Links above 15 km are flagged out of range and withheld from viable display.
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">Boundary source: {loadedPropertyBoundary ? getBoundarySourceLabel(loadedPropertyBoundary.source) : "OSM Nominatim candidate"} · high-site source: Open-Meteo elevation API over a 10×10 SRTM grid, with OSM named peaks supplementary only · provider source: OSM Overpass communication mast scan.</p>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-5">
                      {(relayCandidates.length ? relayCandidates : gisPreview.potentialHighSites).slice(0, 10).map((peak) => (
                        <div key={peak.id} className="rounded-lg border border-border bg-background/70 p-3">
                          <p className="text-sm font-semibold text-foreground">{peak.label}</p>
                          <p className="mt-2 font-mono text-base font-bold text-foreground">{peak.elevationMeters} m SRTM</p>
                          <p className="text-xs text-muted-foreground">{peak.siteClass.replaceAll("-", " ")} · {peak.lat.toFixed(6)}, {peak.lng.toFixed(6)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-4">
                      {gisPreview.nearestMasts.map((mast) => (
                        <div key={mast.provider} className="rounded-lg border border-border bg-background/70 p-3">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: GIS_PROVIDER_STYLES[mast.provider].color }} />
                            <p className="text-sm font-semibold text-foreground">{mast.provider}</p>
                          </div>
                          <p className="mt-2 font-mono text-base font-bold text-foreground">{mast.distanceKm.toFixed(2)} km from property</p>
                          <p className="text-xs text-muted-foreground">Closest provider mast highlighted on map · bearing {mast.bearing} · {mast.bearingDeg.toFixed(0)}° · confidence {mast.confidence}%</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-xl border border-orange-400/30 bg-orange-400/10 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-end">
                        <div className="flex-1">
                          <Label htmlFor="incidentCoordinates">Day-2 threat / incident GPS coordinate</Label>
                          <Input id="incidentCoordinates" placeholder="e.g., -33.1910, 26.5880" value={incidentCoordinates} onChange={(event) => setIncidentCoordinates(event.target.value)} className="mt-2 bg-input/40" />
                        </div>
                        <Button type="button" variant="outline" className="bg-background/80" onClick={handleIncidentRelayCheck}>Check Live Relay LOS</Button>
                      </div>
                      {incidentRelayResult ? (
                        <p className="mt-3 text-sm text-muted-foreground">Nearest Live Relay: <span className="font-semibold text-foreground">{incidentRelayResult.relay.label}</span> · distance {incidentRelayResult.distanceKm.toFixed(2)} km · azimuth {incidentRelayResult.azimuthLabel} {incidentRelayResult.azimuthDeg.toFixed(0)}° · link quality {incidentRelayResult.linkQuality} · emergency comms {incidentRelayResult.emergencyCommsFeasible ? "feasible" : "not recommended without relay upgrade"}.</p>
                      ) : (
                        <p className="mt-3 text-xs text-muted-foreground">Commissioned high sites become Live Relays in Day-2 operations; this planner check models the nearest commissioned peak for threat-response communications.</p>
                      )}
                    </div>
                    </>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">Infrastructure discovery pins</h3>
                      <p className="text-sm text-muted-foreground">Add pins for where connectivity could land, be repeated, or enter the property.</p>
                    </div>
                    <Button type="button" variant="outline" onClick={addInfrastructurePoint}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add point
                    </Button>
                  </div>

                  {formData.infrastructurePoints.map((point) => (
                    <div key={point.id} className="rounded-xl border border-border bg-background/50 p-4">
                      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                        <div>
                          <Label htmlFor={`${point.id}-label`}>Point label</Label>
                          <Input
                            id={`${point.id}-label`}
                            value={point.label}
                            onChange={(e) => updateInfrastructurePoint(point.id, { label: e.target.value })}
                            className="mt-2 bg-input/40"
                          />
                        </div>
                        <div>
                          <Label>Point type</Label>
                          <Select value={point.category} onValueChange={(value) => updateInfrastructurePoint(point.id, { category: value })}>
                            <SelectTrigger className="mt-2 w-full bg-input/40 text-foreground">
                              <SelectValue placeholder="Select point type" />
                            </SelectTrigger>
                            <SelectContent className="z-[100] bg-popover text-popover-foreground">
                              {INFRASTRUCTURE_CATEGORIES.map((category) => (
                                <SelectItem key={category} value={category}>{category}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" onClick={() => captureMapCenterForTarget({ kind: "infrastructure", id: point.id })}>
                            <MapPin className="mr-2 h-4 w-4" />
                            Pin
                          </Button>
                          <Button type="button" variant="outline" onClick={() => removeInfrastructurePoint(point.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">Coordinates: {formatCoordinate(point.latitude, point.longitude)}</p>
                      <Textarea
                        placeholder="Notes, e.g. line-of-sight to ridge, known fibre route, tower owner, power availability..."
                        value={point.notes}
                        onChange={(e) => updateInfrastructurePoint(point.id, { notes: e.target.value })}
                        className="mt-3 min-h-20 bg-input/40"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="rounded-xl border border-accent/30 bg-accent/10 p-4">
                  <p className="text-sm font-semibold text-accent">Operational zones</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Select the broad zones that matter, then capture structured critical locations for the specific places the report must prioritize.
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {OPERATIONAL_ZONES.map((zone) => {
                      const coordinates = formData.zoneCoordinates[zone];
                      return (
                        <div key={zone} className="rounded-lg border border-border bg-background/40 p-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={zone}
                                checked={formData.operationalZones.includes(zone)}
                                onCheckedChange={() => handleZoneToggle(zone)}
                              />
                              <Label htmlFor={zone} className="cursor-pointer text-sm">
                                {zone}
                              </Label>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={() => captureMapCenterForTarget({ kind: "zone", zone })}>
                              <MapPin className="mr-2 h-4 w-4" />
                              Pin
                            </Button>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {coordinates ? `Pin: ${formatCoordinate(coordinates.latitude, coordinates.longitude)}` : "Optional coordinate pin not set."}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">Critical operational locations</h3>
                      <p className="text-sm text-muted-foreground">
                        Add report-ready points such as lodges, ranger stations, gates, fence lines, cameras, anti-poaching zones, workshops, water pumps, solar systems, staff housing, fuel depots, hunting camps, airstrips, river crossings, and repeater points.
                      </p>
                    </div>
                    <Button type="button" variant="outline" onClick={addOperationalCriticalLocation}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add location
                    </Button>
                  </div>

                  {formData.operationalCriticalLocations.map((location) => (
                    <div key={location.id} className="rounded-xl border border-border bg-background/50 p-4">
                      <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-end">
                        <div>
                          <Label htmlFor={`${location.id}-name`}>Location name</Label>
                          <Input
                            id={`${location.id}-name`}
                            value={location.name}
                            onChange={(e) => updateOperationalCriticalLocation(location.id, { name: e.target.value })}
                            className="mt-2 bg-input/40"
                          />
                        </div>
                        <div>
                          <Label>Location type</Label>
                          <Select value={location.locationType} onValueChange={(value) => updateOperationalCriticalLocation(location.id, { locationType: value })}>
                            <SelectTrigger className="mt-2 w-full bg-input/40 text-foreground">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent className="z-[100] bg-popover text-popover-foreground">
                              {OPERATIONAL_LOCATION_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Priority</Label>
                          <Select value={location.priority} onValueChange={(value) => updateOperationalCriticalLocation(location.id, { priority: value })}>
                            <SelectTrigger className="mt-2 w-full bg-input/40 text-foreground">
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent className="z-[100] bg-popover text-popover-foreground">
                              {PRIORITY_LEVELS.map((priority) => (
                                <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" onClick={() => captureMapCenterForTarget({ kind: "operational-location", id: location.id })}>
                            <MapPin className="mr-2 h-4 w-4" />
                            Pin
                          </Button>
                          <Button type="button" variant="outline" onClick={() => removeOperationalCriticalLocation(location.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 rounded-lg border border-border/70 bg-card/40 p-3">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Business-driver tags</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {RESERVE_SITE_TYPE_BY_ID[location.reserveSiteType]?.label ?? "Reserve site"} · {location.topologyRole} · Coordinates: {formatCoordinate(location.latitude, location.longitude)}
                            </p>
                          </div>
                          <p className="text-xs font-medium text-accent">{formatDriverLabels(location.businessDrivers)}</p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2" aria-label={`${location.name} business driver tags`}>
                          {BUSINESS_DRIVERS.map((driver) => {
                            const active = location.businessDrivers.includes(driver.id);
                            return (
                              <button
                                key={driver.id}
                                type="button"
                                className={driverClassName(driver.id, active)}
                                aria-pressed={active}
                                onClick={() => toggleLocationDriver(location.id, driver.id)}
                              >
                                {driver.shortLabel}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <Textarea
                          aria-label={`${location.name} connectivity requirement`}
                          placeholder="Connectivity requirement and current issues, e.g. CCTV backhaul, VoIP, payment systems, ranger comms, guest WiFi, drone operations, wildlife tracking, telemetry, smart gates..."
                          value={location.connectivityRequirement}
                          onChange={(e) => updateOperationalCriticalLocation(location.id, { connectivityRequirement: e.target.value })}
                          className="min-h-24 bg-input/40"
                        />
                        <Textarea
                          aria-label={`${location.name} business impact`}
                          placeholder="Business impact, e.g. guest safety, gate access delays, poaching response risk, pump telemetry loss..."
                          value={location.businessImpact}
                          onChange={(e) => updateOperationalCriticalLocation(location.id, { businessImpact: e.target.value })}
                          className="min-h-24 bg-input/40"
                        />
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1.4fr]">
                        <div>
                          <Label htmlFor={`${location.id}-photo-url`}>Photo or evidence reference</Label>
                          <Input
                            id={`${location.id}-photo-url`}
                            placeholder="/manus-storage/... or evidence link"
                            value={location.photoUrl}
                            onChange={(e) => updateOperationalCriticalLocation(location.id, { photoUrl: e.target.value })}
                            className="mt-2 bg-input/40"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`${location.id}-notes`}>Operational notes</Label>
                          <Textarea
                            id={`${location.id}-notes`}
                            placeholder="Optional notes, evidence context, seasonal constraints, or field engineer comments..."
                            value={location.notes}
                            onChange={(e) => updateOperationalCriticalLocation(location.id, { notes: e.target.value })}
                            className="mt-2 min-h-20 bg-input/40"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="currentConnectivity">Current Connectivity Method</Label>
                  <Textarea
                    id="currentConnectivity"
                    placeholder="e.g., WISP, LTE, Starlink, microwave, fibre handoff, or no known infrastructure yet..."
                    value={formData.currentConnectivity}
                    onChange={(e) => handleInputChange("currentConnectivity", e.target.value)}
                    className="mt-2 bg-input/40"
                  />
                </div>
                <div>
                  <Label>Known Problems</Label>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    {KNOWN_PROBLEMS.map((problem) => (
                      <div key={problem} className="flex items-center space-x-2 rounded-lg border border-border bg-background/40 p-3">
                        <Checkbox
                          id={problem}
                          checked={formData.knownProblems.includes(problem)}
                          onCheckedChange={() => handleProblemToggle(problem)}
                        />
                        <Label htmlFor={problem} className="cursor-pointer text-sm">
                          {problem}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
                  <Label>Application Profile</Label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Select the services CTTX must protect when sizing BER, payload throughput, uplink symmetry, power autonomy, monitoring, and managed product stack.
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {APPLICATION_PROFILE_OPTIONS.map((profile) => (
                      <div key={profile} className="flex items-center space-x-2 rounded-lg border border-border bg-background/40 p-3">
                        <Checkbox
                          id={`application-${profile}`}
                          checked={formData.applicationProfile.includes(profile)}
                          onCheckedChange={() => handleApplicationProfileToggle(profile)}
                        />
                        <Label htmlFor={`application-${profile}`} className="cursor-pointer text-sm">
                          {profile}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {formData.applicationProfile.includes("PTZ cameras") && (
                    <p className="mt-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-100">
                      PTZ cameras trigger a symmetric-link requirement note: CTTX should size uplink and control latency, not only headline download speed.
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">Structured pain points</h3>
                      <p className="text-sm text-muted-foreground">
                        Capture the operational problems caused by poor connectivity, including camera outages, communication delays, LTE instability, payment failures, staff disconnection, response delays, guest-experience risks, radio unreliability, remote visibility gaps, and security blind spots.
                      </p>
                    </div>
                    <Button type="button" variant="outline" onClick={addOperationalPainPoint}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add pain point
                    </Button>
                  </div>

                  <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
                    <Label>Operational connectivity-frustration score: {formData.operationalFrustrationScore || "—"}/10</Label>
                    <input
                      aria-label="Operational connectivity-frustration score"
                      type="range"
                      min={1}
                      max={10}
                      value={formData.operationalFrustrationScore}
                      onChange={(event) => setFormData((prev) => ({ ...prev, operationalFrustrationScore: event.target.value }))}
                      className="mt-3 w-full accent-yellow-300"
                    />
                    <p className="mt-2 text-sm text-muted-foreground">Use this benchmark to express how strongly connectivity gaps affect security response, guest operations, staff coordination, monitoring, telemetry, and future planning.</p>
                  </div>

                  {formData.operationalPainPoints.map((point) => (
                    <div key={point.id} className="rounded-xl border border-border bg-background/50 p-4">
                      <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-end">
                        <div>
                          <Label htmlFor={`${point.id}-title`}>Pain point title</Label>
                          <Input
                            id={`${point.id}-title`}
                            value={point.title}
                            onChange={(e) => updateOperationalPainPoint(point.id, { title: e.target.value })}
                            className="mt-2 bg-input/40"
                          />
                        </div>
                        <div>
                          <Label>Category</Label>
                          <Select value={point.category} onValueChange={(value) => updateOperationalPainPoint(point.id, { category: value })}>
                            <SelectTrigger className="mt-2 w-full bg-input/40 text-foreground">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent className="z-[100] bg-popover text-popover-foreground">
                              {PAIN_POINT_CATEGORIES.map((category) => (
                                <SelectItem key={category} value={category}>{category}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Severity</Label>
                          <Select value={point.severity} onValueChange={(value) => updateOperationalPainPoint(point.id, { severity: value })}>
                            <SelectTrigger className="mt-2 w-full bg-input/40 text-foreground">
                              <SelectValue placeholder="Select severity" />
                            </SelectTrigger>
                            <SelectContent className="z-[100] bg-popover text-popover-foreground">
                              {PRIORITY_LEVELS.map((severity) => (
                                <SelectItem key={severity} value={severity}>{severity}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button type="button" variant="outline" onClick={() => removeOperationalPainPoint(point.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <Input
                          aria-label={`${point.title} affected location`}
                          placeholder="Affected location, e.g. north gate or pump station"
                          value={point.affectedLocation}
                          onChange={(e) => updateOperationalPainPoint(point.id, { affectedLocation: e.target.value })}
                          className="bg-input/40"
                        />
                        <Textarea
                          aria-label={`${point.title} description`}
                          placeholder="Describe the failure mode, evidence, frequency, or field observation..."
                          value={point.description}
                          onChange={(e) => updateOperationalPainPoint(point.id, { description: e.target.value })}
                          className="min-h-24 bg-input/40 md:col-span-1"
                        />
                        <Textarea
                          aria-label={`${point.title} business impact`}
                          placeholder="Business impact, e.g. delayed anti-poaching response, guest check-in failures, CCTV blind spot..."
                          value={point.businessImpact}
                          onChange={(e) => updateOperationalPainPoint(point.id, { businessImpact: e.target.value })}
                          className="min-h-24 bg-input/40 md:col-span-1"
                        />
                      </div>
                      <div className="mt-3 rounded-lg border border-border/70 bg-card/40 p-3">
                        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Business-driver tags</p>
                          <p className="text-xs font-medium text-accent">{formatDriverLabels(point.businessDrivers)}</p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2" aria-label={`${point.title} business driver tags`}>
                          {BUSINESS_DRIVERS.map((driver) => {
                            const active = point.businessDrivers.includes(driver.id);
                            return (
                              <button
                                key={driver.id}
                                type="button"
                                className={driverClassName(driver.id, active)}
                                aria-pressed={active}
                                onClick={() => togglePainPointDriver(point.id, driver.id)}
                              >
                                {driver.shortLabel}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 5 && (
              <div>
                <Label htmlFor="infrastructureNotes">Infrastructure Notes</Label>
                <Textarea
                  id="infrastructureNotes"
                  placeholder="e.g., Fibre route 5km south, Vodacom tower 10km north, ridge has line-of-sight to lodge, pump site has solar but no backup battery..."
                  value={formData.infrastructureNotes}
                  onChange={(e) => handleInputChange("infrastructureNotes", e.target.value)}
                  className="mt-2 h-32 bg-input/40"
                />
                <p className="mt-3 text-sm text-muted-foreground">
                  The report will now treat pins, operating sector, property size, known problems, and notes as first-pass intelligence inputs rather than returning a zero-only placeholder.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4 mt-8">
          <Button
            variant="outline"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
          >
            Previous
          </Button>
          <Button
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
            onClick={() => {
              if (step < 5) {
                handleNext();
              } else {
                handleSubmit();
              }
            }}
            disabled={createAudit.isPending}
          >
            {createAudit.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {step === 5 ? "Generate Preliminary Intelligence" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
