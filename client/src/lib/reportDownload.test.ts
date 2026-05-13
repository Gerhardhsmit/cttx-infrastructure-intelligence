import { describe, expect, it } from "vitest";
import { buildGeneratedReportFileName, buildGeneratedReportHtml, buildGeneratedReportMarkdown } from "./reportDownload";

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

  it("includes serialized Link Planner topology in Markdown and HTML report exports", () => {
    const payload = {
      audit: {
        id: 90002,
        clientName: "Kwandwe Private Game Reserve",
        sector: "Game Reserve",
        propertySizeHa: 22000,
        latitude: "-33.1842",
        longitude: "26.5698",
        currentConnectivity: "Planner export",
        cisScore: 74,
        tciScore: 71,
        resilienceScore: 66,
        primaryArchitecture: "One earned uplink with nearest-neighbour backbone.",
        backupArchitecture: "Satellite failover for core operations.",
        engineeringNotes: "Use Link Planner export for field validation.",
        linkPlannerTopology: {
          planName: "Kwandwe backbone draft",
          propertyName: "Kwandwe Private Game Reserve",
          totalDistanceKm: 18.5,
          liveDistanceKm: 6.2,
          linkCount: 2,
          uplinkCount: 1,
          backboneCount: 1,
          overThresholdCount: 1,
          weakestFadeMarginDb: 17.4,
          viableLinkThresholdKm: 15,
          routeDecisionExplanation: "Selected mast reaches the ridge and backbone without all-to-all spider web links.",
          recommendationSummary: "Validate the ridge relay sequence before procurement.",
          links: [
            { type: "uplink" as const, fromName: "Vodacom Fort Brown", toName: "North ridge", distKm: 12.3, rslDbm: -54.2, fadeMarginDb: 21.8, outOfRange: false },
            { type: "backbone" as const, fromName: "North ridge", toName: "Main lodge", distKm: 16.2, rslDbm: -58.6, fadeMarginDb: 17.4, outOfRange: true },
          ],
          highSites: [{ name: "North ridge", category: "inside" as const, elevation: 412, source: "srtm" as const, lat: -33.17, lng: 26.55 }],
          selectedMast: { name: "Vodacom Fort Brown", provider: "vodacom" as const, closestForProvider: true, lat: -33.12, lng: 26.48 },
          facilities: [{ name: "Main lodge", type: "lodge" as const, lat: -33.18, lng: 26.57 }],
        },
      },
      observations: [],
      guidance,
      lead: {
        email: "ops@kwandwe.example",
        company: "Kwandwe Operations",
        budget: "R250k-R500k",
        generatedAt: "2026-05-09T12:00:00.000Z",
      },
    };

    const markdown = buildGeneratedReportMarkdown(payload);
    const html = buildGeneratedReportHtml(payload);

    expect(markdown).toContain("## 5. Link Planner Topology");
    expect(markdown).toContain("Kwandwe backbone draft");
    expect(markdown).toContain("| Over-threshold links | 1 |");
    expect(markdown).toContain("Vodacom Fort Brown → North ridge");
    expect(markdown).toContain("Amber warning: over threshold");
    expect(markdown).toContain("North ridge — Inside (412 m, srtm)");
    expect(markdown).toContain("Vodacom Fort Brown (Vodacom, provider closest)");
    expect(markdown).toContain("Main lodge — Lodge");
    expect(markdown).toContain("Cost of Disconnection vs Value of Connected Operations");
    expect(markdown).toContain("## 9. Engineering Brief");
    expect(html).toContain("Link Planner Topology");
    expect(html).toContain("Over 15 km threshold");
    expect(html).toContain("North ridge → Main lodge");
    expect(html).toContain("Amber warning: over threshold");
    expect(html).toContain("Cost of Disconnection vs Value of Connected Operations");
  });
});
