// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PLANNER_LAYER_VISIBILITY, FACILITY_TYPES, PLANNER_FACILITY_OPTIONS, type PlannerState } from "@/lib/plannerTypes";
import { buildRouteDecisionExplanation, createContinuousPlannerState, createFacilityFromMapClick, fitPlannerMapToState, getBoundaryFirstViewportPoints, serializePlannerTopology } from "./LinkPlanner";

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
      { id: "uplink-1", fromId: "mast-selected", toId: "inside-1", fromName: "Selected Vodacom", toName: "Inside ridge", type: "uplink", live: false, distKm: 6, path: [{ lat: -33.18, lng: 26.25 }, { lat: -33.15, lng: 26.15 }], justification: "clear LOS", viable: true },
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

  it("builds Steps 1–4 as one continuous state with boundary, high sites, provider masts, and LOS backbone links", () => {
    const state = createContinuousPlannerState("Continuous reserve", { lat: -33.482, lng: 26.633 });

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
    expect(explanation).toContain("nearest-neighbour backbone");
    expect(explanation).toContain("15 km viable-link threshold");
    expect(explanation).toContain("field survey");
  });

  it("serializes a report-ready topology snapshot with threshold risk, link budget, and facilities", () => {
    const state = makePlannerState();
    const explanation = buildRouteDecisionExplanation(state, 5);
    const topology = serializePlannerTopology({
      planName: "Boundary-first report plan",
      plannerState: state,
      budgets: new Map(),
      viableLinkThresholdKm: 5,
      routeDecisionExplanation: explanation,
      totalDistanceKm: 6,
      liveDistanceKm: 0,
      weakestFadeMarginDb: 22.4,
    });

    expect(topology.planName).toBe("Boundary-first report plan");
    expect(topology.linkCount).toBe(1);
    expect(topology.uplinkCount).toBe(1);
    expect(topology.backboneCount).toBe(0);
    expect(topology.overThresholdCount).toBe(1);
    expect(topology.weakestFadeMarginDb).toBe(22.4);
    expect(topology.routeDecisionExplanation).toContain("5 km viable-link threshold");
    expect(topology.links[0]).toMatchObject({ type: "uplink", fromName: "Selected Vodacom", toName: "Inside ridge", distKm: 6 });
    expect(topology.links[0].fadeMarginDb).toEqual(expect.any(Number));
    expect(topology.facilities).toEqual([{ name: "Main lodge", type: "lodge", lat: -33.16, lng: 26.16 }]);
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
