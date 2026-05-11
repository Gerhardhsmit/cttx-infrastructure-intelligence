import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mockState = vi.hoisted(() => ({
  storedAudit: undefined as any,
}));

vi.mock("./db", () => ({
  createAudit: vi.fn(async (input) => {
    mockState.storedAudit = {
      id: 123,
      clientName: input.clientName,
      sector: input.sector,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      propertySizeHa: input.propertySizeHa ?? null,
      operationalZones: input.operationalZones ?? null,
      currentConnectivity: input.currentConnectivity ?? null,
      knownProblems: input.knownProblems ?? null,
      infrastructureNotes: input.infrastructureNotes ?? null,
      cisScore: input.cisScore ?? 0,
      tciScore: input.tciScore ?? 0,
      resilienceScore: input.resilienceScore ?? 0,
      cisSubMetrics: input.cisSubMetrics ?? null,
      tciObstructionZones: input.tciObstructionZones ?? null,
      tciProfileSamples: input.tciProfileSamples ?? null,
      primaryArchitecture: input.primaryArchitecture ?? null,
      backupArchitecture: input.backupArchitecture ?? null,
      engineeringNotes: input.engineeringNotes ?? null,
      status: input.status,
      leadEmail: null,
      leadCompany: null,
      leadBudget: null,
      createdAt: new Date("2026-05-09T00:00:00.000Z"),
      updatedAt: new Date("2026-05-09T00:00:00.000Z"),
    };
    return mockState.storedAudit;
  }),
  getAuditById: vi.fn(async (id) => (mockState.storedAudit?.id === id ? mockState.storedAudit : null)),
  listAudits: vi.fn(async () => []),
  updateAudit: vi.fn(),
  deleteAudit: vi.fn(),
  createObservation: vi.fn(async (input) => ({ id: 456, ...input, createdAt: new Date("2026-05-09T00:00:00.000Z"), updatedAt: new Date("2026-05-09T00:00:00.000Z") })),
  listObservationsByAuditId: vi.fn(async () => []),
  updateObservation: vi.fn(),
  createOperationalCriticalLocations: vi.fn(async (locations) => locations.map((location: any, index: number) => ({ id: index + 1, ...location }))),
  listOperationalCriticalLocationsByAuditId: vi.fn(async () => []),
  createOperationalPainPoints: vi.fn(async (painPoints) => painPoints.map((point: any, index: number) => ({ id: index + 1, ...point }))),
  listOperationalPainPointsByAuditId: vi.fn(async () => []),
  createLead: vi.fn(),
}));

vi.mock("./seed-kwandwe", () => ({
  seedKwandweDemo: vi.fn(),
}));

describe("audits.create router", () => {
  it("creates a Draft audit and returns the new audit id", async () => {
    const { appRouter } = await import("./routers");
    const ctx = {
      user: undefined,
      req: { protocol: "https", headers: {} },
      res: { clearCookie: vi.fn() },
    } as unknown as TrpcContext;

    const caller = appRouter.createCaller(ctx);
    const audit = await caller.audits.create({
      clientName: "Kwandwe Private Game Reserve",
      sector: "Game Reserve",
      latitude: -33.1842,
      longitude: 26.5698,
      propertySizeHa: 22000,
      operationalZones: ["Main lodge", "Gates"],
      currentConnectivity: "WISP and LTE",
      knownProblems: ["Poor LTE", "Load-shedding failures"],
      infrastructureNotes: "Pilot audit verification record with nearby fibre and tower options.",
      infrastructurePoints: [
        {
          label: "Candidate backhaul handoff",
          category: "Potential handoff site",
          latitude: -33.17,
          longitude: 26.58,
          notes: "Possible microwave landing point",
        },
      ],
    });

    expect(audit.id).toBe(123);
    expect(audit.clientName).toBe("Kwandwe Private Game Reserve");
    expect(audit.status).toBe("Draft");
    expect(audit.operationalZones).toEqual(["Main lodge", "Gates"]);
    expect(audit.cisScore).toBeGreaterThan(0);
    expect(audit.tciScore).toBeGreaterThan(0);
    expect(audit.resilienceScore).toBeGreaterThan(0);
    expect(audit.engineeringNotes).toContain("Preliminary infrastructure intelligence");

    const db = await import("./db");
    expect(db.createObservation).toHaveBeenCalledWith(expect.objectContaining({
      auditId: 123,
      latitude: "-33.17",
      longitude: "26.58",
      description: expect.stringContaining("Candidate backhaul handoff"),
    }));
  });

  it("persists model-backed TCI profile samples through create and getById router flows", async () => {
    const { appRouter } = await import("./routers");
    const ctx = {
      user: undefined,
      req: { protocol: "https", headers: {} },
      res: { clearCookie: vi.fn() },
    } as unknown as TrpcContext;

    const caller = appRouter.createCaller(ctx);
    const created = await caller.audits.create({
      clientName: "Router TCI Profile Persistence Reserve",
      sector: "Game Reserve",
      latitude: -33.1842,
      longitude: 26.5698,
      propertySizeHa: 22000,
      operationalZones: ["Main lodge", "Ridge relay"],
      currentConnectivity: "Microwave, LTE, Starlink",
      knownProblems: ["Ridge obstruction", "Weak valley signal"],
      infrastructureNotes: "Needs model-backed terrain profile stored with the audit.",
      infrastructurePoints: [
        {
          label: "Ridge relay candidate",
          category: "Tower high-site",
          latitude: -33.16,
          longitude: 26.55,
          notes: "Candidate obstruction-aware relay point",
        },
      ],
    });

    expect(created.tciProfileSamples).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: "site" }),
      expect.objectContaining({ source: "ridge" }),
    ]));

    const db = await import("./db");
    expect(db.createAudit).toHaveBeenCalledWith(expect.objectContaining({
      tciProfileSamples: expect.arrayContaining([
        expect.objectContaining({ source: "site" }),
        expect.objectContaining({ source: "ridge" }),
      ]),
    }));

    const fetched = await caller.audits.getById({ id: created.id });
    expect(fetched.tciProfileSamples).toEqual(created.tciProfileSamples);
    expect(fetched.tciObstructionZones).toEqual(created.tciObstructionZones);
  });
});
