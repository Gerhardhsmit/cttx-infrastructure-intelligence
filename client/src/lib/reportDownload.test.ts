import { describe, expect, it } from "vitest";
import { buildGeneratedReportFileName, buildGeneratedReportMarkdown } from "./reportDownload";

const guidance = {
  hasPropertyPin: true,
  discoveryGaps: [],
  reportSummary: "Kwandwe has enough captured context for a first-pass connectivity pathway.",
  recommendationTone: "Engineering validation recommended before procurement.",
  reserveManagerRecommendations: [
    "Validate the preferred backhaul path with CTTX engineering.",
    "Confirm priority zones for lodge, gate, and anti-poaching operations.",
  ],
  cttxFollowUpSteps: [
    "CTTX reviews the submitted audit and mapped infrastructure points.",
    "CTTX contacts the submitted email to schedule discovery.",
  ],
  decisionPackItems: [
    "Current provider names and monthly costs.",
    "Operational zones that need resilient connectivity first.",
  ],
};

describe("generated report download pack", () => {
  it("builds a safe filename for the requested audit report", () => {
    expect(buildGeneratedReportFileName("Kwandwe Private Game Reserve", 90001)).toBe("kwandwe-private-game-reserve-audit-90001-cttx-report.md");
  });

  it("includes reserve-manager recommendations, CTTX follow-up steps, and mapped infrastructure in the downloadable report", () => {
    const markdown = buildGeneratedReportMarkdown({
      audit: {
        id: 90001,
        clientName: "Kwandwe Private Game Reserve",
        sector: "Game Reserve",
        propertySizeHa: 22000,
        latitude: "-33.1842",
        longitude: "26.5698",
        currentConnectivity: "Existing LTE and intermittent Wi-Fi",
        knownProblems: ["No signal in valleys", "Load-shedding interruptions"],
        cisScore: 72,
        tciScore: 68,
        resilienceScore: 62,
        primaryArchitecture: "Fibre handoff with managed microwave distribution.",
        backupArchitecture: "Satellite failover for core operations.",
        engineeringNotes: "Preliminary engineering notes.",
      },
      observations: [
        {
          type: "Fibre Sighting",
          latitude: "-33.170000",
          longitude: "26.580000",
          description: "Candidate backhaul handoff",
        },
      ],
      guidance,
      lead: {
        email: "ops@kwandwe.example",
        company: "Kwandwe Operations",
        budget: "R250k-R500k",
        generatedAt: "2026-05-09T12:00:00.000Z",
      },
    });

    expect(markdown).toContain("CTTX Reserve Connectivity Intelligence Report");
    expect(markdown).toContain("CONFIDENTIAL ENGINEERING AUDIT");
    expect(markdown).toContain("## 0. Report Header");
    expect(markdown).toContain("## 1. Executive Summary");
    expect(markdown).toContain("## 2. Infrastructure Map");
    expect(markdown).toContain("## 3. Operational Analysis");
    expect(markdown).toContain("## 4. Architecture Plan");
    expect(markdown).toContain("## 8. Engineering Brief");
    expect(markdown).toContain("| Prepared for | Kwandwe Operations (ops@kwandwe.example) |");
    expect(markdown).toContain("| Report status | Preliminary desktop intelligence pack; field validation still required |");
    expect(markdown).toContain("Candidate backhaul handoff");
    expect(markdown).toContain("Validate the preferred backhaul path");
    expect(markdown).toContain("CTTX contacts the submitted email");
    expect(markdown).toContain("Current provider names and monthly costs");
  });
});
