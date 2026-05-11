import { describe, expect, it } from "vitest";
import { buildAuditReportGuidance } from "./reportGuidance";

describe("buildAuditReportGuidance", () => {
  it("produces the client-facing report sections a reserve manager needs after a representative audit", () => {
    const guidance = buildAuditReportGuidance({
      clientName: "Kwandwe Private Game Reserve",
      cisScore: 72,
      resilienceScore: 62,
      latitude: "-33.184200",
      longitude: "26.569800",
      currentConnectivity: "Existing LTE and intermittent Wi-Fi",
      infrastructureNotes: "Potential high-site handoff should be validated by CTTX engineering.",
      knownProblems: ["No signal in some areas", "Load-shedding interruptions"],
      mappedObservationCount: 2,
    });

    expect(guidance.recommendationTone).toBe("Good initial potential, pending engineering validation");
    expect(guidance.reportSummary).toContain("first-pass connectivity pathway");
    expect(guidance.reportSummary).toContain("2 mapped points");
    expect(guidance.reserveManagerRecommendations.join("\n")).toContain("validate the preferred backhaul path");
    expect(guidance.reserveManagerRecommendations.join("\n")).toContain("power resilience");
    expect(guidance.cttxFollowUpSteps).toEqual([
      "CTTX reviews the submitted audit, mapped pins, connectivity notes, problems, and budget context.",
      "CTTX contacts the submitted email to schedule a discovery call and confirm whether the next step is desktop validation, field survey, or proposal scoping.",
      "The engineering review validates backhaul availability, line-of-sight, coverage zones, power resilience, installation access, and commercial feasibility before issuing a final recommendation.",
    ]);
    expect(guidance.decisionPackItems.join("\n")).toContain("Current provider names");
    expect(guidance.decisionPackItems.join("\n")).toContain("Gate access rules");
  });

  it("identifies confidence gaps when a report is missing pins and connectivity context", () => {
    const guidance = buildAuditReportGuidance({
      clientName: "Example Reserve",
      cisScore: 0,
      resilienceScore: 0,
      latitude: null,
      longitude: null,
      currentConnectivity: "",
      infrastructureNotes: "",
      knownProblems: [],
      mappedObservationCount: 0,
    });

    expect(guidance.hasPropertyPin).toBe(false);
    expect(guidance.reportSummary).toContain("missing a property pin");
    expect(guidance.discoveryGaps).toEqual([
      "confirmed property pin",
      "infrastructure and operational-zone pins",
      "current provider, speeds, outages, and monthly spend",
      "nearby tower, fibre, high-site, or handoff notes",
    ]);
    expect(guidance.reserveManagerRecommendations.join("\n")).toContain("nearest towers");
  });
});
