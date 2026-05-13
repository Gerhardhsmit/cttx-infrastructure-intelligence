import { describe, expect, it } from "vitest";
import { calculatePreliminaryAuditIntelligence } from "./scoring";

describe("calculatePreliminaryAuditIntelligence", () => {
  it("returns non-zero preliminary intelligence when meaningful site and pin data is supplied", () => {
    const result = calculatePreliminaryAuditIntelligence({
      sector: "Game Reserve",
      latitude: -33.1842,
      longitude: 26.5698,
      propertySizeHa: 22000,
      operationalZones: ["Main lodge", "Gates", "Security control room"],
      currentConnectivity: "WISP, LTE and Starlink backup",
      knownProblems: ["Poor LTE", "Load-shedding failures"],
      infrastructureNotes: "Possible fibre handoff south of the property and tower on ridge.",
      infrastructurePoints: [
        { label: "Main lodge", category: "Operational zone", latitude: -33.18, longitude: 26.57 },
        { label: "Candidate backhaul handoff", category: "Potential handoff site", latitude: -33.16, longitude: 26.61 },
      ],
    });

    expect(result.cisScore).toBeGreaterThan(0);
    expect(result.tciScore).toBeGreaterThan(0);
    expect(result.resilienceScore).toBeGreaterThan(0);
    expect(result.engineeringNotes).toContain("coordinate-backed infrastructure");
    expect(result.primaryArchitecture).not.toContain("zero");
    expect(result.executiveSummary).toContain("CTTX should now validate");
    expect(result.reserveManagerRecommendations.length).toBeGreaterThanOrEqual(4);
    expect(result.reserveManagerRecommendations.join(" ")).toContain("discovery call");
    expect(result.followUpWorkflow.join(" ")).toContain("submitted email");
    expect(result.contactAction).toContain("Next action");
    expect(result.cisSubMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "fibreProximity", label: "Fibre Proximity" }),
        expect.objectContaining({ key: "signalQuality", label: "Signal Quality" }),
        expect.objectContaining({ key: "backhaulType", label: "Backhaul Type" }),
      ]),
    );
    expect(result.cisSubMetrics.every((metric) => metric.value >= 0 && metric.value <= 100)).toBe(true);
    expect(result.tciObstructionZones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "ridgeObstruction", label: "Ridge obstruction", severity: expect.stringMatching(/Medium|High/) }),
      ]),
    );
    expect(result.tciObstructionZones[0]).toEqual(
      expect.objectContaining({
        startPercent: expect.any(Number),
        endPercent: expect.any(Number),
        elevationPercent: expect.any(Number),
        evidence: expect.any(String),
      }),
    );
    expect(result.tciProfileSamples).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ distancePercent: 0, source: "site" }),
        expect.objectContaining({ distancePercent: 68, source: "ridge" }),
        expect.objectContaining({ distancePercent: 100, source: "egress" }),
      ]),
    );
    expect(result.tciProfileSamples.every((sample) => sample.distancePercent >= 0 && sample.distancePercent <= 100 && sample.elevationPercent >= 0 && sample.elevationPercent <= 100)).toBe(true);
    const ridgeSample = result.tciProfileSamples.find((sample) => sample.source === "ridge");
    const ridgeZone = result.tciObstructionZones.find((zone) => zone.key === "ridgeObstruction");
    expect(ridgeSample?.elevationPercent).toBe(ridgeZone?.elevationPercent);
  });

  it("explains missing-data limitations instead of pretending an estimate is final", () => {
    const result = calculatePreliminaryAuditIntelligence({
      sector: "Farm",
      operationalZones: [],
      knownProblems: [],
    });

    expect(result.cisScore).toBeGreaterThan(0);
    expect(result.engineeringNotes).toContain("estimate");
    expect(result.engineeringNotes).toContain("property pin");
    expect(result.engineeringNotes).toContain("infrastructure or operational-zone pins");
    expect(result.executiveSummary).toContain("early readiness view");
    expect(result.reserveManagerRecommendations.join(" ")).toContain("Add pins");
    expect(result.followUpWorkflow.join(" ")).toContain("CTTX should contact");
    expect(result.contactAction).toContain("property pin");
    expect(result.cisSubMetrics).toHaveLength(3);
    expect(result.tciObstructionZones).toEqual([]);
    expect(result.tciProfileSamples).toHaveLength(5);
    expect(result.tciProfileSamples.map((sample) => sample.source)).toEqual(["site", "valley", "distribution", "ridge", "egress"]);
  });
});
