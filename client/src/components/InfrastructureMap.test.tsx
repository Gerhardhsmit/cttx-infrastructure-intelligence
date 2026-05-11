import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import InfrastructureMap, { buildInfrastructureMapModel, buildLosCandidateSummaryRows } from "./InfrastructureMap";
import { getMapUnavailableCopy, loadMapScript, shouldReplaceExistingMapScript } from "./Map";
import { buildGisAutoScan, calculateDistanceKm, formatBearing, GIS_PROVIDER_STYLES } from "@/lib/gisAutoScan";
import { buildLosTerrainProfile, buildPrecisionPlanningPin, parseCoordinateInput } from "@/lib/wirelessPlanning";

type FakeScript = {
  dataset: Record<string, string>;
  src?: string;
  async?: boolean;
  crossOrigin?: string;
  onload?: () => void;
  onerror?: () => void;
  removed?: boolean;
  addEventListener: (event: string, handler: () => void) => void;
  remove: () => void;
};

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;

function installFakeMapsDom() {
  const scripts: FakeScript[] = [];

  const documentStub = {
    head: {
      appendChild: (script: FakeScript) => {
        scripts.push(script);
        return script;
      },
    },
    createElement: () => {
      const listeners: Record<string, Array<() => void>> = {};
      const script: FakeScript = {
        dataset: {},
        addEventListener: (event, handler) => {
          listeners[event] = [...(listeners[event] ?? []), handler];
        },
        remove: () => {
          script.removed = true;
        },
      };
      return script;
    },
    querySelector: () => scripts.find((script) => script.dataset.cttxGoogleMaps === "true" && !script.removed) ?? null,
  };

  Object.defineProperty(globalThis, "document", { value: documentStub, configurable: true });
  Object.defineProperty(globalThis, "window", { value: { google: undefined }, configurable: true });

  return scripts;
}

afterEach(() => {
  Object.defineProperty(globalThis, "window", { value: originalWindow, configurable: true });
  Object.defineProperty(globalThis, "document", { value: originalDocument, configurable: true });
});

describe("InfrastructureMap", () => {
  it("classifies property, fibre, tower, and operational discovery points for map overlays", () => {
    const model = buildInfrastructureMapModel(
      {
        clientName: "Kwandwe Private Game Reserve",
        location: "Great Fish River valley",
        latitude: "-33.123456",
        longitude: "26.654321",
      },
      [
        { id: 1, type: "Fibre handoff", latitude: "-33.120000", longitude: "26.650000" },
        { id: 2, type: "Vodacom tower", latitude: -33.110000, longitude: 26.660000, description: "Clear ridge line" },
        { id: 3, type: "Main gate", latitude: "-33.130000", longitude: "26.640000" },
        { id: 5, type: "Signal Observation", latitude: "-33.140000", longitude: "26.670000", description: "RSRP reading near lodge" },
        { id: 4, type: "Incomplete point", latitude: null, longitude: "26.620000" },
      ],
      [
        { id: 10, label: "CTTX Grahamstown PoP", assetType: "PoP", latitude: "-33.180000", longitude: "26.530000", confidence: 84, verificationStatus: "Known", distanceKm: 7.5 },
        { id: 11, label: "TFA South Fibre Route", assetType: "Fibre Route", latitude: "-33.238000", longitude: "26.514000", endLatitude: "-33.250000", endLongitude: "26.600000", confidence: 72, verificationStatus: "Candidate" },
      ],
    );

    expect(model.center).toEqual({ lat: -33.123456, lng: 26.654321 });
    expect(model.mappedPointCount).toBe(16);
    expect(model.preloadedAssetCount).toBe(2);
    expect(model.counts.property).toBe(1);
    expect(model.counts.fibre).toBe(2);
    expect(model.counts.pop).toBe(1);
    expect(model.counts.tower).toBe(9);
    expect(model.counts.signal).toBe(1);
    expect(model.counts.security).toBe(1);
    expect(model.counts.operational).toBe(1);
    expect(model.precisionPins.find((pin) => pin.id === "ridge-crest-candidate")).toMatchObject({ label: "Ridge crest planning pin" });
    expect(model.losProfile?.samples.length).toBeGreaterThan(10);
    expect(model.losProfile?.fresnelZonePercent).toBe(60);
    expect(model.gisScan?.providerMasts).toHaveLength(8);
    expect(model.gisScan?.fibreRoutes).toHaveLength(2);
    expect(model.gisScan?.terrainContours).toHaveLength(3);
    expect(model.gisScan?.eskomCorridors).toHaveLength(2);
    expect(model.reserveTopology).toEqual({ hubCount: 8, spokeCount: 1, driverTaggedPointCount: 0, topologyLinkCount: 1 });
    expect(model.points.filter((point) => point.source === "gis-scan" && point.category === "tower" && point.topologyRole === "hub")).toHaveLength(8);
    expect(model.points.find((point) => point.id === "property")).toMatchObject({ topologyRole: "spoke" });
    expect(model.links).toHaveLength(1);
    expect(model.links.every((link) => link.obstructed === false)).toBe(true);
  });

  it("excludes obstructed non-LOS field links from the Batch 3 LOS-only topology", () => {
    const model = buildInfrastructureMapModel(
      {
        clientName: "Kwandwe Private Game Reserve",
        latitude: "-33.123456",
        longitude: "26.654321",
        tciScore: 65,
        tciProfileSamples: [
          { distancePercent: 25, elevationPercent: 45 },
          { distancePercent: 55, elevationPercent: 78, obstruction: true, label: "Ridge obstruction" },
        ],
      },
      [{ id: 2, type: "Vodacom tower", latitude: -33.110000, longitude: 26.660000, description: "Potential no LoS over ridge" }],
    );

    expect(model.terrainProfile.verticalExaggeration).toBe(1.5);
    expect(model.terrainProfile.obstructionCount).toBe(1);
    expect(model.links.find((link) => link.targetLabel === "Vodacom tower")).toBeUndefined();
    expect(model.links.every((link) => link.obstructed === false)).toBe(true);
  });


  it("models reserve-site hub-and-spoke topology and business-driver styling from operational locations", () => {
    const model = buildInfrastructureMapModel(
      { clientName: "Reserve topology audit", latitude: "-33.123456", longitude: "26.654321" },
      [],
      [],
      [
        { id: 1, name: "North Ridge High Site", locationType: "High site", latitude: "-33.113456", longitude: "26.664321", reserveSiteType: "high_site", topologyRole: "hub", businessDrivers: ["threats", "operations"], connectivityRequirement: "Microwave hub for cameras and ranger radio" },
        { id: 2, name: "Main Lodge", locationType: "Lodge", latitude: "-33.133456", longitude: "26.644321", reserveSiteType: "lodge", topologyRole: "spoke", businessDrivers: ["hospitality", "operations"], businessImpact: "Guest Wi-Fi and payments" },
        { id: 3, name: "Western Gate", locationType: "Gate", latitude: "-33.143456", longitude: "26.634321", reserveSiteType: "gate", topologyRole: "spoke", businessDrivers: ["threats"], businessImpact: "Access control and CCTV" },
      ],
    );

    expect(model.reserveTopology).toEqual({ hubCount: 9, spokeCount: 3, driverTaggedPointCount: 3, topologyLinkCount: 1 });
    expect(model.points.find((point) => point.label === "North Ridge High Site")).toMatchObject({ reserveSiteLabel: "High site / repeater hub", topologyRole: "hub", businessDrivers: ["threats", "operations"], category: "tower" });
    expect(model.points.find((point) => point.label === "Main Lodge")).toMatchObject({ reserveSiteLabel: "Lodge / guest area", topologyRole: "spoke", category: "operational" });
    expect(model.links).toHaveLength(1);
    expect(model.links.every((link) => link.role === "uplink" || link.role === "backbone")).toBe(true);
    expect(model.minimumHighSitePlan?.recommendedHighSiteCount).toBeGreaterThanOrEqual(1);
  });

  it("opens with preloaded infrastructure assets even when no field observations exist", () => {
    const model = buildInfrastructureMapModel(
      { clientName: "New Reserve", latitude: "-33.200000", longitude: "26.500000" },
      [],
      [
        { id: 20, label: "MTN Ridge Tower", assetType: "Tower", latitude: "-33.190000", longitude: "26.520000", verificationStatus: "Known", confidence: 88, distanceKm: 2.3 },
        { id: 21, label: "CTTX Regional PoP", assetType: "PoP", latitude: "-33.210000", longitude: "26.490000", verificationStatus: "Field Verified", confidence: 96, distanceKm: 1.4 },
      ],
    );

    expect(model.mappedPointCount).toBe(12);
    expect(model.preloadedAssetCount).toBe(2);
    expect(model.counts.tower).toBe(9);
    expect(model.counts.pop).toBe(1);
    expect(model.gisScan?.nearestMasts.map((mast) => mast.provider)).toEqual(["Vodacom", "MTN", "Cell C", "Telkom"]);
    expect(model.reserveTopology).toMatchObject({ hubCount: 8, spokeCount: 1, topologyLinkCount: 0 });
    expect(model.links).toHaveLength(0);
    expect(model.precisionPins.every((pin) => pin.elevationAslMeters > 0)).toBe(true);
  });

  it("builds deterministic GIS auto-scan layers with provider colours, fibre routes, terrain contours, Eskom corridors, distances, and bearings", () => {
    const scan = buildGisAutoScan({ lat: -33.123456, lng: 26.654321 });

    expect(scan).not.toBeNull();
    expect(scan?.providerMasts).toHaveLength(8);
    expect(scan?.providerScanRadiusKm).toBe(20);
    expect(scan?.potentialHighSites).toHaveLength(10);
    expect(scan?.fibreRoutes).toHaveLength(2);
    expect(scan?.terrainContours).toHaveLength(3);
    expect(scan?.eskomCorridors).toHaveLength(2);
    expect(scan?.providerMasts.filter((mast) => mast.priorityRank === 1).map((mast) => [mast.provider, mast.color])).toEqual([
      ["Vodacom", GIS_PROVIDER_STYLES.Vodacom.color],
      ["MTN", GIS_PROVIDER_STYLES.MTN.color],
      ["Cell C", GIS_PROVIDER_STYLES["Cell C"].color],
      ["Telkom", GIS_PROVIDER_STYLES.Telkom.color],
    ]);
    expect(scan?.nearestMasts).toHaveLength(4);
    expect(scan?.nearestMasts.every((mast) => mast.distanceKm > 0 && mast.bearingDeg >= 0 && mast.bearingDeg < 360)).toBe(true);
    expect(scan?.nearestMasts.map((mast) => mast.bearing)).toEqual(scan?.nearestMasts.map((mast) => formatBearing(mast.bearingDeg)));
    expect(calculateDistanceKm(scan!.property, scan!.providerMasts[0])).toBeGreaterThan(5);
  });

  it("parses decimal and DMS coordinate inputs for exact technician pin placement", () => {
    expect(parseCoordinateInput("-33.123456")).toBe(-33.123456);
    expect(parseCoordinateInput("33° 7' 24.44\" S")).toBeCloseTo(-33.123456, 5);
    expect(parseCoordinateInput("26 39 15.56 E")).toBeCloseTo(26.654322, 5);
    expect(parseCoordinateInput("not a coordinate")).toBeNull();
  });

  it("builds LOS terrain profiles with Fresnel-zone clearance and green/yellow/red status colours", () => {
    const start = buildPrecisionPlanningPin({ id: "property", label: "Lodge rooftop", role: "property", lat: -33.123456, lng: 26.654321, color: "#FFE600", antennaHeightMeters: 8 });
    const end = buildPrecisionPlanningPin({ id: "tower", label: "Vodacom ridge mast", role: "tower", lat: -33.091, lng: 26.701, color: GIS_PROVIDER_STYLES.Vodacom.color, antennaHeightMeters: 35 });
    const profile = buildLosTerrainProfile(start, end, { sampleCount: 31 });

    expect(profile.distanceKm).toBeGreaterThan(5);
    expect(profile.bearingDeg).toBeGreaterThanOrEqual(0);
    expect(profile.samples).toHaveLength(31);
    expect(profile.samples.some((sample) => sample.fresnelRadiusMeters > 0)).toBe(true);
    expect(profile.samples.every((sample) => typeof sample.clearanceMeters === "number")).toBe(true);
    expect(["clear", "marginal", "blocked"]).toContain(profile.status);
    expect(["#22C55E", "#F59E0B", "#EF4444"]).toContain(profile.statusColor);
  });

  it("builds all auto-scanned mast LOS summary rows from the same Fresnel classification logic", () => {
    const model = buildInfrastructureMapModel({ clientName: "Malabar Private Game Reserve", latitude: "-33.123456", longitude: "26.654321" });
    const rows = buildLosCandidateSummaryRows(model.gisScan, model.precisionPins);

    expect(rows).toHaveLength(23);
    expect(rows.some((row) => /High Ground|High Site|Backbone|Ridge|Lookout|Crest/.test(row.mastName))).toBe(true);
    expect(rows.every((row) => row.mastName.includes(" to "))).toBe(true);
    expect(rows.every((row) => row.distanceKm > 0 && row.bearingDeg >= 0 && row.bearingDeg < 360)).toBe(true);
    expect(rows.every((row) => ["CLEAR", "MARGINAL", "BLOCKED"].includes(row.losStatus))).toBe(true);
    expect(rows.every((row) => typeof row.fresnelClearanceMeters === "number")).toBe(true);
  });

  it("renders reserve-manager map summary copy, layer controls, coordinate-backed point list, precision pins, and LOS profile", () => {
    const html = renderToStaticMarkup(
      <InfrastructureMap
        audit={{
          clientName: "Kwandwe Private Game Reserve",
          location: "Great Fish River valley",
          latitude: "-33.123456",
          longitude: "26.654321",
          tciScore: 65,
          tciProfileSamples: [{ distancePercent: 50, elevationPercent: 70, obstruction: true }],
        }}
        observations={[
          { id: 1, type: "Fibre handoff", latitude: "-33.120000", longitude: "26.650000" },
          { id: 2, type: "Vodacom tower", latitude: "-33.110000", longitude: "26.660000", description: "Obstructed by ridge" },
          { id: 3, type: "Signal Observation", latitude: "-33.130000", longitude: "26.640000", description: "RSRP -89 dBm" },
        ]}
        infrastructureAssets={[
          { id: 10, label: "CTTX Grahamstown PoP", assetType: "PoP", latitude: "-33.180000", longitude: "26.530000", verificationStatus: "Known", confidence: 84, distanceKm: 7.5 },
        ]}
        operationalCriticalLocations={[
          { id: 1, name: "North Ridge High Site", locationType: "High site", latitude: "-33.113456", longitude: "26.664321", reserveSiteType: "high_site", topologyRole: "hub", businessDrivers: ["threats", "operations"] },
          { id: 2, name: "Main Lodge", locationType: "Lodge", latitude: "-33.133456", longitude: "26.644321", reserveSiteType: "lodge", topologyRole: "spoke", businessDrivers: ["hospitality"] },
        ]}
      />,
    );

    expect(html).toContain("Infrastructure Map Visualization");
    expect(html).toContain("Google hybrid satellite map");
    expect(html).toContain("dark tactical overlay");
    expect(html).toContain("preloaded CTTX infrastructure assets");
    expect(html).toContain("LOS-only backhaul, backbone, and distribution overlays");
    expect(html).toContain("Minimum high sites");
    expect(html).toContain("LOS-only architecture");
    expect(html).toContain("Precision draggable pins");
    expect(html).toContain("Elevation");
    expect(html).toContain("m ASL");
    expect(html).toContain("LOS terrain profile and Fresnel planner");
    expect(html).toContain("60% Fresnel zone");
    expect(html).toContain("LOS elevation cross-section");
    expect(html).toContain("LOS status summary for auto-scanned masts");
    expect(html).toContain("Mast Name");
    expect(html).toContain("Fresnel Clearance (m)");
    expect(html).toContain("LOS Status");
    expect(html).toContain("Mapped points");
    expect(html).toContain("Map legend");
    expect(html).toContain("Infrastructure Summary");
    expect(html).toContain("Auto-scan:");
    expect(html).toContain("Reserve topology:");
    expect(html).toContain("Reserve high-site topology");
    expect(html).toContain("High-site hub-and-spoke topology");
    expect(html).toContain("Hub candidates");
    expect(html).toContain("Driver-tagged sites");
    expect(html).toContain("Map layer toggle controls");
    expect(html).toContain("aria-expanded=\"false\"");
    expect(html).toContain("aria-controls=\"infrastructure-map-layer-panel\"");
    expect(html).toContain("Layers");
    expect(html).not.toContain("id=\"infrastructure-map-layer-panel\"");
    expect(html).toContain("Obstructed LoS");
    expect(html).toContain("Kwandwe Private Game Reserve");
    expect(html).toContain("Fibre / route");
    expect(html).toContain("PoP / exchange");
    expect(html).toContain("Known · confidence 84% · 7.5 km away");
    expect(html).toContain("Vodacom");
    expect(html).toContain("MTN");
    expect(html).toContain("Cell C");
    expect(html).toContain("Telkom");
    expect(html).toContain("Tower / mast");
    expect(html).toContain("-33.123456, 26.654321");
  });

  it("keeps a planning fallback available when the Google Maps script cannot load", () => {
    expect(getMapUnavailableCopy("Google Maps script failed to load")).toBe(
      "Google Maps script failed to load. The coordinate list and infrastructure summary below remain available for planning.",
    );
  });

  it("replaces failed or stale Google Maps scripts before retrying instead of attaching to dead elements", () => {
    expect(shouldReplaceExistingMapScript("failed", false)).toBe(true);
    expect(shouldReplaceExistingMapScript("loaded", false)).toBe(true);
    expect(shouldReplaceExistingMapScript("loading", false)).toBe(false);
    expect(shouldReplaceExistingMapScript("loaded", true)).toBe(false);
  });

  it("creates a fresh Google Maps script after an initial load failure", async () => {
    const scripts = installFakeMapsDom();

    const firstAttempt = loadMapScript();
    expect(scripts).toHaveLength(1);
    scripts[0].onerror?.();
    await expect(firstAttempt).rejects.toThrow("Google Maps script failed to load");
    expect(scripts[0].removed).toBe(true);

    const secondAttempt = loadMapScript();
    expect(scripts).toHaveLength(2);
    expect(scripts[1]).not.toBe(scripts[0]);
    scripts[1].onerror?.();
    await expect(secondAttempt).rejects.toThrow("Google Maps script failed to load");
  });
});
