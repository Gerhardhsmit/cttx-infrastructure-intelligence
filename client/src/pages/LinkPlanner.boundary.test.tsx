// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PLANNER_LAYER_VISIBILITY, FACILITY_TYPES, PLANNER_FACILITY_OPTIONS, type PlannerState } from "@/lib/plannerTypes";
import { buildRouteDecisionExplanation, createContinuousPlannerState, createFacilityFromMapClick, fitPlannerMapToState, getBoundaryFirstViewportPoints, recalculatePlannerLinks } from "./LinkPlanner";

vi.mock("@/lib/gisAutoScan", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/gisAutoScan")>();
  return {
    ...actual,
    buildGisAutoScanWithApis: vi.fn(async (origin: { lat: number; lng: number }, options?: { propertyName?: string }) => ({
      property: origin,
      propertyBoundary: {
        id: "mock-boundary",
        label: options?.propertyName ?? "Continuous reserve",
        source: "osm-nominatim",
        confidence: 88,
        centroid: origin,
        radiusKm: 1.2,
        polygon: [
          { lat: origin.lat - 0.01, lng: origin.lng - 0.01 },
          { lat: origin.lat - 0.01, lng: origin.lng + 0.01 },
          { lat: origin.lat + 0.01, lng: origin.lng + 0.01 },
          { lat: origin.lat + 0.01, lng: origin.lng - 0.01 },
        ],
      },
      potentialHighSites: [
        { id: "mock-high-1", label: "Inside ridge", lat: origin.lat + 0.001, lng: origin.lng + 0.001, elevationMeters: 410, rank: 1, source: "open-meteo-elevation", siteClass: "inside-boundary", distanceFromPropertyCenterKm: 0.2 },
        { id: "mock-high-2", label: "Nearby ridge", lat: origin.lat + 0.012, lng: origin.lng + 0.012, elevationMeters: 430, rank: 2, source: "open-meteo-elevation", siteClass: "off-property-near", distanceFromPropertyCenterKm: 1.8 },
      ],
      providerMasts: [
        { id: "mock-mast-1", provider: "Vodacom", label: "Selected Vodacom", color: "#E60000", lat: origin.lat + 0.02, lng: origin.lng + 0.02, bearingDeg: 45, distanceKm: 3, confidence: 88, source: "osm-overpass", distanceFromNearestOnPropertyHighSiteKm: 2, nearestOnPropertyHighSiteLabel: "Inside ridge", isClosestForProvider: true, hiddenByDefault: false },
      ],
      priorityMasts: [],
      fibreRoutes: [],
      terrainContours: [],
      eskomCorridors: [],
      detectedFacilities: [{ id: "mock-lodge-1", type: "lodge", label: "Main lodge", lat: origin.lat + 0.002, lng: origin.lng + 0.002, source: "osm-overpass" }],
      losCandidates: [],
      losSummary: { green: 2, yellow: 0, red: 0, bestCandidate: null },
      clearLosCandidates: [],
      minimumHighSitePlan: {
        recommendedHighSiteCount: 2,
        coverageHighSiteCount: 1,
        redundancyHighSiteCount: 1,
        costJustification: ["Mocked deterministic scan for tests"],
        clearSegments: [
          { id: "mock-uplink", sourceId: "mock-high-1", sourceLabel: "Inside ridge", targetId: "mock-mast-1", targetLabel: "Selected Vodacom", path: [{ lat: origin.lat + 0.001, lng: origin.lng + 0.001 }, { lat: origin.lat + 0.02, lng: origin.lng + 0.02 }], distanceKm: 3, role: "uplink", justification: "confirmed LOS", viable: true, losStatus: "confirmed", terrainMarginMeters: 18, elevationProfile: [400, 405, 410] },
          { id: "mock-backbone", sourceId: "mock-high-1", sourceLabel: "Inside ridge", targetId: "mock-high-2", targetLabel: "Nearby ridge", path: [{ lat: origin.lat + 0.001, lng: origin.lng + 0.001 }, { lat: origin.lat + 0.012, lng: origin.lng + 0.012 }], distanceKm: 2, role: "backbone", justification: "confirmed LOS", viable: true, losStatus: "confirmed", terrainMarginMeters: 15, elevationProfile: [400, 415, 430] },
          { id: "mock-distribution", sourceId: "mock-lodge-1", sourceLabel: "Main lodge", targetId: "mock-high-1", targetLabel: "Inside ridge", path: [{ lat: origin.lat + 0.002, lng: origin.lng + 0.002 }, { lat: origin.lat + 0.001, lng: origin.lng + 0.001 }], distanceKm: 0.3, role: "distribution", justification: "confirmed LOS", viable: true, losStatus: "confirmed", terrainMarginMeters: 12, elevationProfile: [398, 404, 410] },
        ],
        multiHopBackhaul: [],
      },
      nearestMasts: [],
      scanRadiusKm: 5,
      providerScanRadiusKm: 30,
      scanIssues: [],
    })),
  };
});

vi.mock("@/components/Map", () => ({
  MapView: () => null,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ linkPlans: { list: { invalidate: vi.fn() } } }),
    linkPlans: {
      list: { useQuery: () => ({ data: [] }) },
      create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      update: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function makePlannerState(): PlannerState {
  const boundary = [
    { lat: -33.101, lng: 26.101 },
    { lat: -33.101, lng: 26.201 },
    { lat: -33.201, lng: 26.201 },
    { lat: -33.201, lng: 26.101 },
  ];

  return {
    propertyName: "Boundary-first reserve",
    propertyCentre: { lat: -33.151, lng: 26.151 },
    boundaryPolygon: boundary,
    boundaryAreaHa: 1220.5,
    highSites: [
      { id: "inside-1", name: "Inside ridge", lat: -33.15, lng: 26.15, elevation: 410, source: "srtm", inside: true, distToBoundary: 0, distToCentre: 0.2, category: "inside" },
      { id: "nearby-1", name: "Nearby ridge", lat: -33.22, lng: 26.22, elevation: 430, source: "srtm", inside: false, distToBoundary: 1.2, distToCentre: 2.4, category: "nearby" },
      { id: "remote-1", name: "Remote mountain", lat: -34.2, lng: 27.2, elevation: 900, source: "srtm", inside: false, distToBoundary: 80, distToCentre: 90, category: "remote" },
    ],
    masts: [
      { id: "mast-selected", name: "Selected Vodacom", lat: -33.18, lng: 26.25, provider: "vodacom", distFromCentre: 7, distFromNearestRelay: 6, nearestRelayName: "Inside ridge", selected: true, closestForProvider: true, hiddenByDefault: false },
      { id: "mast-closest", name: "Closest MTN", lat: -33.19, lng: 26.24, provider: "mtn", distFromCentre: 7.5, distFromNearestRelay: 7, nearestRelayName: "Inside ridge", selected: false, closestForProvider: true, hiddenByDefault: false },
      { id: "mast-far", name: "Distant hidden mast", lat: -35.19, lng: 28.24, provider: "unknown", distFromCentre: 250, distFromNearestRelay: 245, nearestRelayName: null, selected: false, closestForProvider: false, hiddenByDefault: true },
    ],
    selectedMastIndex: 0,
    links: [
      { id: "uplink-1", fromId: "mast-selected", toId: "inside-1", fromName: "Selected Vodacom", toName: "Inside ridge", type: "uplink", live: false, distKm: 6, path: [{ lat: -33.18, lng: 26.25 }, { lat: -33.15, lng: 26.15 }], justification: "clear LOS", viable: true, losStatus: "confirmed" },
    ],
    facilities: [{ id: "lodge-1", type: "lodge", name: "Main lodge", lat: -33.16, lng: 26.16 }],
    layerVis: { ...DEFAULT_PLANNER_LAYER_VISIBILITY },
    recommendationSummary: "Boundary-first LOS plan",
  };
}

describe("LinkPlanner continuous boundary-first workflow helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("builds Steps 1–4 as one continuous state with boundary, high sites, provider masts, and LOS backbone links", async () => {
    const state = await createContinuousPlannerState("Continuous reserve", { lat: -33.482, lng: 26.633 });

    expect(state.propertyName).toBe("Continuous reserve");
    expect(state.boundaryPolygon?.length).toBeGreaterThanOrEqual(4);
    expect(state.highSites.length).toBeGreaterThan(0);
    expect(state.masts.length).toBeGreaterThan(0);
    expect(state.links.filter((link) => link.type === "uplink").length).toBeLessThanOrEqual(1);
    expect(state.links.filter((link) => link.type === "backbone").length).toBeLessThanOrEqual(6);
    expect(state.links.every((link) => link.distKm <= 15 && link.viable)).toBe(true);
  });

  it("prioritizes property boundary, nearby high sites, provider candidates, clear links, and facilities while excluding remote clutter", () => {
    const state = makePlannerState();
    const points = getBoundaryFirstViewportPoints(state);

    expect(points.boundary).toEqual(state.boundaryPolygon);
    expect(points.context).toEqual(expect.arrayContaining(state.boundaryPolygon ?? []));
    expect(points.context).toContainEqual({ lat: -33.15, lng: 26.15 });
    expect(points.context).toContainEqual({ lat: -33.22, lng: 26.22 });
    expect(points.context).toContainEqual({ lat: -33.18, lng: 26.25 });
    expect(points.context).toContainEqual({ lat: -33.19, lng: 26.24 });
    expect(points.context).toContainEqual({ lat: -33.16, lng: 26.16 });
    expect(points.context).not.toContainEqual({ lat: -34.2, lng: 27.2 });
    expect(points.context).not.toContainEqual({ lat: -35.19, lng: 28.24 });
  });

  it("recalculates endpoint-height LOS in place and keeps the connected link visible", () => {
    const state = makePlannerState();
    const marginalUplink = {
      ...state.links[0],
      id: "height-sensitive-uplink",
      fromId: "inside-1",
      toId: "mast-selected",
      fromName: "Inside ridge",
      toName: "Selected Vodacom",
      path: [{ lat: -33.15, lng: 26.15 }, { lat: -33.18, lng: 26.25 }] as [{ lat: number; lng: number }, { lat: number; lng: number }],
      elevationProfile: [100, 135, 100],
      losStatus: "marginal" as const,
      terrainMarginMeters: 2.5,
    };
    const marginalState = recalculatePlannerLinks({ ...state, links: [marginalUplink] });
    const confirmedState = recalculatePlannerLinks({
      ...marginalState,
      masts: marginalState.masts.map((mast) => (mast.id === "mast-selected" ? { ...mast, antennaHeightM: 60 } : mast)),
    });

    expect(marginalState.links).toHaveLength(1);
    expect(marginalState.links[0].losStatus).toBe("marginal");
    expect(marginalState.links[0].terrainMarginMeters).toBe(2.5);
    expect(confirmedState.links).toHaveLength(1);
    expect(confirmedState.links[0].id).toBe("height-sensitive-uplink");
    expect(confirmedState.links[0].losStatus).toBe("confirmed");
    expect(confirmedState.links[0].terrainMarginMeters).toBe(10);
  });

  it("exposes the exact nine facility-placement types required by the Link Planner handover", () => {
    expect(PLANNER_FACILITY_OPTIONS.map((option) => option.label)).toEqual([
      "Relay Candidate",
      "Lodge",
      "Gate",
      "Camera Point",
      "Ranger Post",
      "Water Pump",
      "Staff Quarters",
      "Office/HQ",
      "Other",
    ]);
    expect(PLANNER_FACILITY_OPTIONS.every((option) => option.icon.length > 0 && option.color.startsWith("#"))).toBe(true);
  });

  it("creates named map-click facilities with rounded coordinates and keeps them controlled by one facilities layer", () => {
    const facility = createFacilityFromMapClick({
      type: "camera",
      name: "  East fence camera  ",
      coordinate: { lat: -33.1234567, lng: 26.7654321 },
      existingCount: 2,
      timestamp: 12345,
    });

    expect(facility).toEqual({ id: "facility-12345-3", type: "camera", name: "East fence camera", lat: -33.123457, lng: 26.765432 });
    expect(FACILITY_TYPES[facility.type].label).toBe("Camera Point");

    const state = makePlannerState();
    const hiddenFacilitiesState = { ...state, layerVis: { ...state.layerVis, facilities: false } };
    expect(getBoundaryFirstViewportPoints(hiddenFacilitiesState).context).not.toContainEqual({ lat: -33.16, lng: 26.16 });
  });

  it("explains mast choice, relay terminus, topology policy, threshold risk, and survey implications in five sentences", () => {
    const explanation = buildRouteDecisionExplanation(makePlannerState(), 15);
    const sentences = explanation.match(/[^.!?]+[.!?]/g) ?? [];

    expect(sentences).toHaveLength(5);
    expect(explanation).toContain("Selected Vodacom");
    expect(explanation).toContain("Inside ridge");
    expect(explanation).toContain("20-point Open-Meteo elevation profile");
    expect(explanation).toContain("15 km field-validation threshold");
    expect(explanation).toContain("field survey");
  });

  it("fits Google Maps to the boundary-first context with consistent padding", () => {
    const extended: Array<{ lat: number; lng: number }> = [];
    class MockLatLngBounds {
      extend(point: { lat: number; lng: number }) {
        extended.push(point);
      }
    }

    Object.assign(window, {
      google: { maps: { LatLngBounds: MockLatLngBounds } },
    });

    const fitBounds = vi.fn();
    const didFit = fitPlannerMapToState({ fitBounds } as unknown as google.maps.Map, makePlannerState(), 72);

    expect(didFit).toBe(true);
    expect(extended).toEqual(expect.arrayContaining(makePlannerState().boundaryPolygon ?? []));
    expect(fitBounds).toHaveBeenCalledWith(expect.any(MockLatLngBounds), 72);
  });
});
