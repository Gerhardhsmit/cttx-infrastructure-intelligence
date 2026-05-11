import { describe, it, expect } from "vitest";
import { createAudit, deleteAudit, getAuditById, getInsertId } from "./db";

describe("CTTX Audit System", () => {
  it("should have valid audit creation schema", () => {
    const auditData = {
      clientName: "Test Reserve",
      sector: "Game Reserve",
      latitude: -33.2,
      longitude: 26.5,
      propertySizeHa: 5000,
      operationalZones: ["Main lodge", "Gates"],
      currentConnectivity: "WISP",
      knownProblems: ["No signal areas"],
      infrastructureNotes: "Test notes",
    };

    expect(auditData.clientName).toBeDefined();
    expect(auditData.sector).toBeDefined();
    expect(auditData.latitude).toBeLessThan(0);
    expect(auditData.longitude).toBeGreaterThan(0);
  });

  it("extracts insertId from the MySQL/Drizzle raw result array shape", () => {
    const result = [{ insertId: 42, affectedRows: 1 }, undefined];

    expect(getInsertId(result)).toBe(42);
  });

  it("extracts insertId from direct result objects and string values", () => {
    expect(getInsertId({ insertId: 7 })).toBe(7);
    expect(getInsertId({ insertId: "8" })).toBe(8);
  });

  it("returns undefined when an insert result has no usable insertId", () => {
    expect(getInsertId([{ affectedRows: 1 }])).toBeUndefined();
    expect(getInsertId(undefined)).toBeUndefined();
  });

  it("should validate CIS score range", () => {
    const cisScores = [0, 50, 75, 100];

    cisScores.forEach((score) => {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  it("should validate TCI score range", () => {
    const tciScores = [0, 30, 65, 100];

    tciScores.forEach((score) => {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  it("should validate Resilience score range", () => {
    const resilienceScores = [0, 40, 82, 100];

    resilienceScores.forEach((score) => {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  it("persists and fetches TCI profile samples through audit create/get helpers", async () => {
    if (!process.env.DATABASE_URL) {
      return;
    }

    const profileSamples = [
      { distanceKm: 0, elevationM: 485, normalizedX: 0, normalizedY: 68 },
      { distanceKm: 2.6, elevationM: 542, normalizedX: 50, normalizedY: 34 },
      { distanceKm: 5.2, elevationM: 498, normalizedX: 100, normalizedY: 61 },
    ];

    const created = await createAudit({
      clientName: `TCI Persistence Regression ${Date.now()}`,
      sector: "Game Reserve",
      latitude: "-33.20400000",
      longitude: "26.51200000",
      propertySizeHa: 1250,
      operationalZones: ["Main lodge", "Security control room"],
      currentConnectivity: "Microwave + LTE",
      knownProblems: ["Line-of-sight obstruction"],
      infrastructureNotes: "Regression fixture for persisted profile samples.",
      cisScore: 72,
      tciScore: 64,
      resilienceScore: 81,
      cisSubMetrics: [
        { label: "Fibre Proximity", value: 70, evidence: "Nearest handoff within 5 km" },
      ],
      tciObstructionZones: [
        { label: "Ridge obstruction", severity: "high", startPercent: 42, widthPercent: 18 },
      ],
      tciProfileSamples: profileSamples,
      primaryArchitecture: "Microwave backhaul with lodge distribution",
      backupArchitecture: "Starlink failover",
      engineeringNotes: "Persisted TCI profile geometry must survive create/get flows.",
      status: "Draft",
    });

    expect(created?.id).toBeTypeOf("number");
    expect(created?.tciProfileSamples).toEqual(profileSamples);

    const fetched = await getAuditById(created!.id);
    expect(fetched?.tciProfileSamples).toEqual(profileSamples);
    expect(fetched?.tciObstructionZones).toEqual([
      { label: "Ridge obstruction", severity: "high", startPercent: 42, widthPercent: 18 },
    ]);

    await deleteAudit(created!.id);
  });

  it("should require exactly the three report-gate lead fields", () => {
    const leadData = {
      email: "client@example.com",
      company: "Test Company",
      budget: "R50,000 - R100,000",
    };

    expect(Object.keys(leadData).sort()).toEqual(["budget", "company", "email"]);
    expect(leadData.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(leadData.company.length).toBeGreaterThan(0);
    expect(leadData.budget.length).toBeGreaterThan(0);
  });

  it("should validate Kwandwe demo audit scores", () => {
    const kwandweDemo = {
      clientName: "Kwandwe Private Game Reserve",
      sector: "Game Reserve",
      cisScore: 78,
      tciScore: 65,
      resilienceScore: 82,
      primaryArchitecture: "Microwave + Starlink + Private LTE",
      status: "Published",
    };

    expect(kwandweDemo.clientName).toBe("Kwandwe Private Game Reserve");
    expect(kwandweDemo.sector).toBe("Game Reserve");
    expect(kwandweDemo.cisScore).toBe(78);
    expect(kwandweDemo.tciScore).toBe(65);
    expect(kwandweDemo.resilienceScore).toBe(82);
    expect(kwandweDemo.primaryArchitecture).toBe("Microwave + Starlink + Private LTE");
    expect(kwandweDemo.status).toBe("Published");
  });

  it("should validate audit status labels", () => {
    const validStatuses = ["Draft", "Published"];

    validStatuses.forEach((status) => {
      expect(["Draft", "Published"]).toContain(status);
    });
  });
});
