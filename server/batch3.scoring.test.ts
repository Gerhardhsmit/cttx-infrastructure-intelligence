import { describe, expect, it } from "vitest";
import { calculatePreliminaryAuditIntelligence } from "./scoring";

describe("Batch 3 preliminary architecture model", () => {
  it("returns uptime, BER, throughput, application profile, and managed product-stack outputs", () => {
    const result = calculatePreliminaryAuditIntelligence({
      sector: "Game Reserve",
      latitude: -33.3106,
      longitude: 26.5708,
      propertySizeHa: 12000,
      operationalZones: ["Main lodge", "Security control room", "CCTV / sensor zones", "Gates"],
      currentConnectivity: "Existing microwave backhaul with Starlink backup",
      knownProblems: ["Load-shedding failures", "Weak CCTV backhaul"],
      infrastructureNotes: "Candidate fibre handoff and high-site ridge visible from the lodge.",
      applicationProfile: ["PTZ cameras", "VoIP", "Payment systems", "Security control room"],
      infrastructurePoints: [
        { label: "North ridge", category: "Existing tower / high-site", latitude: -33.3, longitude: 26.58 },
        { label: "Main lodge", category: "Lodge", latitude: -33.31, longitude: 26.57 },
      ],
    });

    expect(result.projectedUptimePercent).toBeGreaterThan(80);
    expect(result.uptimeModel.weakestComponent).toBeTruthy();
    expect(result.targetBer).toBe("< 10^-6");
    expect(result.payloadThroughputMbps).toBeGreaterThan(0);
    expect(result.linkQuality).toMatch(/symmetric PTZ uplink requirement/);
    expect(result.engineeringNotes).toMatch(/minimum error rate/);
    expect(result.applicationProfile).toContain("PTZ cameras");
    expect(result.productStack.map((item) => item.vendor)).toEqual(["Cambium Networks", "Victron Energy", "Hubble Lithium"]);
  });
});
