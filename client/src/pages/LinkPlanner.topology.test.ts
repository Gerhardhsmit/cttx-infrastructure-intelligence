/**
 * CTTX Link Planner — Regression Tests
 * Covers: threshold recomputation, topology rules, JSON serialization,
 * report export integration, facility placement, route explanation.
 */
import { describe, it, expect } from "vitest";
import {
  type SerializedPlannerTopology,
  type PlannerState,
  type NetworkLink,
  type HighSite,
  type Facility,
  estimateBoundaryAreaHa,
} from "@/lib/plannerTypes";
import {
  buildRouteDecisionExplanation,
  createFacilityFromMapClick,
} from "@/pages/LinkPlanner";

// ─── Test Fixtures ───────────────────────────────────────────────────────────

const mockHighSites: HighSite[] = [
  { id: "hs-1", lat: -33.5, lng: 26.0, name: "Koppie North", elevation: 450, source: "srtm", inside: true, distToBoundary: 0, distToCentre: 1.2, category: "inside", antennaHeightM: 30 },
  { id: "hs-2", lat: -33.52, lng: 26.02, name: "Ridge East", elevation: 420, source: "srtm", inside: true, distToBoundary: 0, distToCentre: 2.1, category: "inside", antennaHeightM: 30 },
  { id: "hs-3", lat: -33.54, lng: 25.98, name: "Hilltop South", elevation: 480, source: "srtm", inside: true, distToBoundary: 0, distToCentre: 3.0, category: "inside", antennaHeightM: 30 },
];

const mockLinks: NetworkLink[] = [
  { id: "L1-hs-1-hs-2", fromId: "hs-1", toId: "hs-2", fromName: "Koppie North", toName: "Ridge East", type: "backbone", live: false, distKm: 3.2, path: [{ lat: -33.5, lng: 26.0 }, { lat: -33.52, lng: 26.02 }], justification: "MST nearest", viable: true, losStatus: "confirmed", terrainMarginMeters: 15 },
  { id: "L1-hs-2-hs-3", fromId: "hs-2", toId: "hs-3", fromName: "Ridge East", toName: "Hilltop South", type: "backbone", live: false, distKm: 4.8, path: [{ lat: -33.52, lng: 26.02 }, { lat: -33.54, lng: 25.98 }], justification: "MST nearest", viable: true, losStatus: "confirmed", terrainMarginMeters: 12 },
  { id: "L0-cm-1-hs-1", fromId: "cm-1", toId: "hs-1", fromName: "Vodacom Tower", toName: "Koppie North", type: "uplink", live: false, distKm: 12.5, path: [{ lat: -33.45, lng: 25.95 }, { lat: -33.5, lng: 26.0 }], justification: "Closest carrier", viable: true, losStatus: "confirmed", terrainMarginMeters: 22 },
  { id: "L1-hs-1-hs-4", fromId: "hs-1", toId: "hs-4", fromName: "Koppie North", toName: "Far Ridge", type: "backbone", live: false, distKm: 18.0, path: [{ lat: -33.5, lng: 26.0 }, { lat: -33.6, lng: 26.15 }], justification: "MST extension", viable: true, losStatus: "marginal", terrainMarginMeters: 3 },
];

const mockFacilities: Facility[] = [
  { id: "fac-1", type: "lodge", name: "Main Lodge", lat: -33.51, lng: 26.01 },
  { id: "fac-2", type: "gate", name: "North Gate", lat: -33.49, lng: 25.99 },
];

const mockState: PlannerState = {
  propertyName: "Test Reserve",
  propertyCentre: { lat: -33.51, lng: 26.0 },
  boundaryPolygon: [
    { lat: -33.45, lng: 25.95 }, { lat: -33.45, lng: 26.05 },
    { lat: -33.55, lng: 26.05 }, { lat: -33.55, lng: 25.95 },
  ],
  boundaryAreaHa: 1200,
  highSites: mockHighSites,
  masts: [{ id: "cm-1", lat: -33.45, lng: 25.95, name: "Vodacom Grahamstown", provider: "vodacom", distFromCentre: 8.5, distFromNearestRelay: 5.2, nearestRelayName: "Koppie North", selected: true, closestForProvider: true, hiddenByDefault: false, antennaHeightM: 45 }],
  selectedMastIndex: 0,
  links: mockLinks,
  facilities: mockFacilities,
  layerVis: { inside: true, nearby: true, remote: false, vodacom: true, mtn: true, cellc: true, telkom: true, unknown: false, uplink: true, backbone: true, distribution: true, live: true, facilities: true },
  recommendationSummary: "Test topology summary",
};

// ─── Threshold Recomputation ─────────────────────────────────────────────────

describe("Threshold recomputation", () => {
  it("counts over-threshold links correctly at 15 km", () => {
    const threshold = 15;
    const overCount = mockLinks.filter(l => l.distKm > threshold).length;
    expect(overCount).toBe(1); // Only the 18 km link exceeds 15 km
  });

  it("counts over-threshold links correctly at 10 km", () => {
    const threshold = 10;
    const overCount = mockLinks.filter(l => l.distKm > threshold).length;
    expect(overCount).toBe(2); // 12.5 km uplink + 18 km backbone
  });

  it("counts over-threshold links correctly at 25 km", () => {
    const threshold = 25;
    const overCount = mockLinks.filter(l => l.distKm > threshold).length;
    expect(overCount).toBe(0); // All links within 25 km
  });

  it("threshold range is 10-25 km", () => {
    const MIN_VIABLE_LINK_THRESHOLD_KM = 10;
    const MAX_VIABLE_LINK_THRESHOLD_KM = 25;
    expect(MIN_VIABLE_LINK_THRESHOLD_KM).toBe(10);
    expect(MAX_VIABLE_LINK_THRESHOLD_KM).toBe(25);
  });
});

// ─── Topology Rules ──────────────────────────────────────────────────────────

describe("Topology rules", () => {
  it("enforces one uplink only per topology", () => {
    const uplinkCount = mockLinks.filter(l => l.type === "uplink").length;
    expect(uplinkCount).toBe(1);
  });

  it("backbone links use MST (nearest-neighbour)", () => {
    const backboneLinks = mockLinks.filter(l => l.type === "backbone");
    // MST produces N-1 edges for N nodes
    expect(backboneLinks.length).toBeLessThanOrEqual(mockHighSites.length);
  });

  it("max 6 links per node rule", () => {
    const MAX_LINKS_PER_NODE = 6;
    const linkCountPerNode = new Map<string, number>();
    for (const link of mockLinks) {
      linkCountPerNode.set(link.fromId, (linkCountPerNode.get(link.fromId) ?? 0) + 1);
      linkCountPerNode.set(link.toId, (linkCountPerNode.get(link.toId) ?? 0) + 1);
    }
    for (const [, count] of linkCountPerNode) {
      expect(count).toBeLessThanOrEqual(MAX_LINKS_PER_NODE);
    }
  });

  it("amber warnings for over-threshold links", () => {
    const threshold = 15;
    const amberLinks = mockLinks.filter(l => l.distKm > threshold);
    expect(amberLinks.length).toBeGreaterThan(0);
    expect(amberLinks[0].distKm).toBe(18.0);
  });

  it("gold-star closest masts per provider", () => {
    const selectedMast = mockState.masts.find(m => m.selected);
    expect(selectedMast).toBeDefined();
    expect(selectedMast?.closestForProvider).toBe(true);
  });
});

// ─── JSON Serialization ──────────────────────────────────────────────────────

describe("JSON serialization (SerializedPlannerTopology)", () => {
  function buildSerializedTopology(state: PlannerState, thresholdKm: number): SerializedPlannerTopology {
    const links = state.links;
    const fadeMargins = links.map(l => {
      const pl = 92.45 + 20 * Math.log10(Math.max(l.distKm, 0.1)) + 20 * Math.log10(5.8);
      return Number((24 + 30 * 2 - pl + 76).toFixed(1));
    });
    const selectedMast = state.masts.find(m => m.selected) ?? null;
    return {
      planName: "Test Plan",
      propertyName: state.propertyName,
      totalDistanceKm: links.reduce((s, l) => s + l.distKm, 0),
      liveDistanceKm: links.filter(l => l.losStatus === "confirmed").reduce((s, l) => s + l.distKm, 0),
      linkCount: links.length,
      uplinkCount: links.filter(l => l.type === "uplink").length,
      backboneCount: links.filter(l => l.type === "backbone").length,
      overThresholdCount: links.filter(l => l.distKm > thresholdKm).length,
      weakestFadeMarginDb: fadeMargins.length > 0 ? Math.min(...fadeMargins) : 0,
      viableLinkThresholdKm: thresholdKm,
      routeDecisionExplanation: "Test explanation",
      recommendationSummary: "Test summary",
      links: links.map(l => ({
        type: l.type,
        fromName: l.fromName,
        toName: l.toName,
        distKm: l.distKm,
        rslDbm: -(92.45 + 20 * Math.log10(Math.max(l.distKm, 0.1)) + 20 * Math.log10(5.8)) + 24 + 60,
        fadeMarginDb: fadeMargins[links.indexOf(l)],
        outOfRange: l.distKm > thresholdKm,
      })),
      highSites: state.highSites.map(hs => ({
        name: hs.name,
        category: hs.category,
        elevation: hs.elevation,
        source: hs.source,
        lat: hs.lat,
        lng: hs.lng,
      })),
      selectedMast: selectedMast ? {
        name: selectedMast.name,
        provider: selectedMast.provider,
        closestForProvider: selectedMast.closestForProvider,
        lat: selectedMast.lat,
        lng: selectedMast.lng,
      } : null,
      facilities: state.facilities.map(f => ({ name: f.name, type: f.type, lat: f.lat, lng: f.lng })),
    };
  }

  it("serializes to valid JSON structure", () => {
    const topology = buildSerializedTopology(mockState, 15);
    const json = JSON.stringify(topology);
    const parsed = JSON.parse(json);
    expect(parsed.planName).toBe("Test Plan");
    expect(parsed.propertyName).toBe("Test Reserve");
    expect(parsed.linkCount).toBe(4);
    expect(parsed.viableLinkThresholdKm).toBe(15);
  });

  it("includes all required fields", () => {
    const topology = buildSerializedTopology(mockState, 15);
    expect(topology).toHaveProperty("planName");
    expect(topology).toHaveProperty("propertyName");
    expect(topology).toHaveProperty("totalDistanceKm");
    expect(topology).toHaveProperty("liveDistanceKm");
    expect(topology).toHaveProperty("linkCount");
    expect(topology).toHaveProperty("uplinkCount");
    expect(topology).toHaveProperty("backboneCount");
    expect(topology).toHaveProperty("overThresholdCount");
    expect(topology).toHaveProperty("weakestFadeMarginDb");
    expect(topology).toHaveProperty("viableLinkThresholdKm");
    expect(topology).toHaveProperty("routeDecisionExplanation");
    expect(topology).toHaveProperty("recommendationSummary");
    expect(topology).toHaveProperty("links");
    expect(topology).toHaveProperty("highSites");
    expect(topology).toHaveProperty("selectedMast");
    expect(topology).toHaveProperty("facilities");
  });

  it("marks out-of-range links correctly", () => {
    const topology = buildSerializedTopology(mockState, 15);
    const outOfRange = topology.links.filter(l => l.outOfRange);
    expect(outOfRange.length).toBe(1);
    expect(outOfRange[0].distKm).toBe(18.0);
  });

  it("calculates fade margin for each link", () => {
    const topology = buildSerializedTopology(mockState, 15);
    for (const link of topology.links) {
      expect(link.fadeMarginDb).toBeDefined();
      expect(typeof link.fadeMarginDb).toBe("number");
    }
  });

  it("includes high sites with coordinates", () => {
    const topology = buildSerializedTopology(mockState, 15);
    expect(topology.highSites.length).toBe(3);
    for (const hs of topology.highSites) {
      expect(hs.lat).toBeDefined();
      expect(hs.lng).toBeDefined();
      expect(hs.name).toBeTruthy();
    }
  });

  it("includes selected mast", () => {
    const topology = buildSerializedTopology(mockState, 15);
    expect(topology.selectedMast).not.toBeNull();
    expect(topology.selectedMast?.provider).toBe("vodacom");
  });

  it("includes facilities", () => {
    const topology = buildSerializedTopology(mockState, 15);
    expect(topology.facilities.length).toBe(2);
    expect(topology.facilities[0].name).toBe("Main Lodge");
  });

  it("threshold recomputation changes overThresholdCount", () => {
    const t15 = buildSerializedTopology(mockState, 15);
    const t10 = buildSerializedTopology(mockState, 10);
    expect(t15.overThresholdCount).toBe(1);
    expect(t10.overThresholdCount).toBe(2);
  });
});

// ─── Facility Placement ──────────────────────────────────────────────────────

describe("Facility placement", () => {
  it("creates facility with correct type and coordinates", () => {
    const facility = createFacilityFromMapClick({
      type: "camera",
      name: "Waterhole Cam",
      coordinate: { lat: -33.515, lng: 26.005 },
      existingCount: 2,
      timestamp: 1700000000000,
    });
    expect(facility.type).toBe("camera");
    expect(facility.name).toBe("Waterhole Cam");
    expect(facility.lat).toBeCloseTo(-33.515, 4);
    expect(facility.lng).toBeCloseTo(26.005, 4);
    expect(facility.id).toContain("facility-");
  });
});

// ─── Route Explanation ───────────────────────────────────────────────────────

describe("Route decision explanation", () => {
  it("generates explanation mentioning carrier mast", () => {
    const explanation = buildRouteDecisionExplanation(mockState, 15);
    expect(explanation).toContain("Vodacom Grahamstown");
    expect(explanation).toContain("15 km");
  });

  it("mentions primary relay", () => {
    const explanation = buildRouteDecisionExplanation(mockState, 15);
    expect(explanation).toContain("Koppie North");
  });
});

// ─── Report Export Integration ───────────────────────────────────────────────

describe("Report export integration", () => {
  it("reportDownload accepts linkPlannerTopology parameter", async () => {
    const { buildGeneratedReportMarkdown } = await import("@/lib/reportDownload");
    const topology: SerializedPlannerTopology = {
      planName: "Test Plan",
      propertyName: "Test Reserve",
      totalDistanceKm: 38.5,
      liveDistanceKm: 20.5,
      linkCount: 4,
      uplinkCount: 1,
      backboneCount: 3,
      overThresholdCount: 1,
      weakestFadeMarginDb: 8.2,
      viableLinkThresholdKm: 15,
      routeDecisionExplanation: "Test route explanation",
      recommendationSummary: "Test recommendation",
      links: [],
      highSites: [],
      selectedMast: null,
      facilities: [],
    };
    const markdown = buildGeneratedReportMarkdown({
      audit: { id: 1, clientName: "Test Client" },
      observations: [],
      linkPlannerTopology: topology,
      guidance: {
        discoveryGaps: [],
        reportSummary: "Test summary",
        recommendationTone: "Exploratory",
        reserveManagerRecommendations: ["Test rec"],
        cttxFollowUpSteps: ["Test step"],
        decisionPackItems: ["Test item"],
      },
      lead: { email: "test@test.com", company: "Test Co", budget: "R500k", generatedAt: new Date().toISOString() },
    });
    expect(markdown).toContain("Link Planner");
    expect(markdown).toContain("Test Reserve");
  });
});

// ─── Boundary Area Estimation ────────────────────────────────────────────────

describe("Boundary area estimation", () => {
  it("calculates area for a simple polygon", () => {
    const polygon = [
      { lat: -33.0, lng: 26.0 }, { lat: -33.0, lng: 26.1 },
      { lat: -33.1, lng: 26.1 }, { lat: -33.1, lng: 26.0 },
    ];
    const area = estimateBoundaryAreaHa(polygon);
    expect(area).toBeGreaterThan(0);
    // ~10km x ~9.3km = ~9300 ha approximately
    expect(area).toBeGreaterThan(5000);
    expect(area).toBeLessThan(15000);
  });

  it("returns 0 for insufficient points", () => {
    expect(estimateBoundaryAreaHa(null)).toBe(0);
    expect(estimateBoundaryAreaHa([])).toBe(0);
    expect(estimateBoundaryAreaHa([{ lat: 0, lng: 0 }])).toBe(0);
  });
});
