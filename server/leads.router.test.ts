import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  createLead: vi.fn(async (input) => ({
    id: 321,
    auditId: input.auditId,
    email: input.email,
    company: input.company,
    budget: input.budget,
    createdAt: new Date("2026-05-09T00:00:00.000Z"),
  })),
  updateAudit: vi.fn(async (id, input) => ({ id, ...input })),
}));

const notificationMocks = vi.hoisted(() => ({
  notifyOwner: vi.fn(async () => true),
}));

vi.mock("./db", () => ({
  createAudit: vi.fn(),
  getAuditById: vi.fn(),
  listAudits: vi.fn(async () => []),
  updateAudit: dbMocks.updateAudit,
  deleteAudit: vi.fn(),
  createObservation: vi.fn(),
  listObservationsByAuditId: vi.fn(async () => []),
  updateObservation: vi.fn(),
  createLead: dbMocks.createLead,
}));

vi.mock("./seed-kwandwe", () => ({
  seedKwandweDemo: vi.fn(),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: notificationMocks.notifyOwner,
}));

describe("leads.create report request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores the lead, publishes the audit contact snapshot, and notifies CTTX with follow-up guidance", async () => {
    const { appRouter } = await import("./routers");
    const ctx = {
      user: undefined,
      req: { protocol: "https", headers: {} },
      res: { clearCookie: vi.fn() },
    } as unknown as TrpcContext;

    const caller = appRouter.createCaller(ctx);
    const lead = await caller.leads.create({
      auditId: 90001,
      email: "ops@kwandwe.example",
      company: "Kwandwe Operations",
      budget: "R250k-R500k",
    });

    expect(lead.id).toBe(321);
    expect(dbMocks.createLead).toHaveBeenCalledWith({
      auditId: 90001,
      email: "ops@kwandwe.example",
      company: "Kwandwe Operations",
      budget: "R250k-R500k",
    });
    expect(dbMocks.updateAudit).toHaveBeenCalledWith(90001, {
      leadEmail: "ops@kwandwe.example",
      leadCompany: "Kwandwe Operations",
      leadBudget: "R250k-R500k",
      status: "Published",
    });
    expect(notificationMocks.notifyOwner).toHaveBeenCalledWith(expect.objectContaining({
      title: "CTTX follow-up requested: Kwandwe Operations",
      content: expect.stringContaining("Recommended operator action"),
    }));
  });
});
