import { describe, expect, it } from "vitest";
import { buildGisAutoScan, buildIncidentRelayResult } from "./gisAutoScan";

describe("Auto Property Intelligence Engine GIS model", () => {
  it("builds boundary, terrain peaks, provider priority masts, classified LOS paths, and a best candidate summary", () => {
    const scan = buildGisAutoScan({ lat: -33.1842, lng: 26.5698 });

    expect(scan).not.toBeNull();
    expect(scan?.propertyBoundary.source).toBe("osm-nominatim");
    expect(scan?.propertyBoundary.polygon.length).toBeGreaterThanOrEqual(6);
    expect(scan?.potentialHighSites).toHaveLength(10);
    expect(scan?.potentialHighSites[0]).toMatchObject({ label: "Lodge High Ground Crest", source: "open-meteo-elevation" });
    expect(scan?.providerScanRadiusKm).toBe(20);
    expect(scan?.providerMasts).toHaveLength(8);
    expect(scan?.priorityMasts).toHaveLength(8);

    const providers = new Set(scan?.priorityMasts.map((mast) => mast.provider));
    expect(providers).toEqual(new Set(["Vodacom", "MTN", "Cell C", "Telkom"]));
    expect(scan?.priorityMasts.filter((mast) => mast.provider === "Vodacom").map((mast) => mast.priorityRank)).toEqual([1, 2]);

    expect(scan?.losCandidates.length).toBe((scan?.potentialHighSites.length ?? 0) * (scan?.priorityMasts.length ?? 0));
    const totalClassified = (scan?.losSummary.green ?? 0) + (scan?.losSummary.yellow ?? 0) + (scan?.losSummary.red ?? 0);
    expect(totalClassified).toBe(scan?.losCandidates.length);
    expect(scan?.losSummary.bestCandidate?.peakLabel).toMatch(/High Ground|Lookout|High Site|Ridge|Backbone/);
  });

  it("models Day-2 incident coordinates against commissioned live relay high sites", () => {
    const scan = buildGisAutoScan({ lat: -33.1842, lng: 26.5698 });
    const result = buildIncidentRelayResult({ lat: -33.191, lng: 26.588 }, scan?.potentialHighSites.slice(0, 2) ?? []);

    expect(result).not.toBeNull();
    expect(result?.relay.label).toMatch(/High Ground|Lookout|High Site|Ridge|Backbone/);
    expect(result?.distanceKm).toBeGreaterThan(0);
    expect(result?.azimuthDeg).toBeGreaterThanOrEqual(0);
    expect(["Good", "Marginal", "Poor"]).toContain(result?.linkQuality);
    expect(typeof result?.emergencyCommsFeasible).toBe("boolean");
  });
});
