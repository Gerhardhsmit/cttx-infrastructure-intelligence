import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  listInfrastructureAssetsNearby: vi.fn(async () => [{ id: 7, label: "CTTX PoP Grahamstown", assetType: "PoP", distanceKm: 14.2 }]),
}));

vi.mock("./db", () => ({
  createAudit: vi.fn(),
  getAuditById: vi.fn(),
  listAudits: vi.fn(async () => []),
  updateAudit: vi.fn(),
  deleteAudit: vi.fn(),
  createObservation: vi.fn(),
  listObservationsByAuditId: vi.fn(async () => []),
  updateObservation: vi.fn(),
  createLead: vi.fn(),
  listInfrastructureAssetsNearby: dbMocks.listInfrastructureAssetsNearby,
}));

vi.mock("./seed-kwandwe", () => ({ seedKwandweDemo: vi.fn() }));
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn(async () => true) }));
vi.mock("./storage", () => ({ storagePut: vi.fn() }));

function createContext(): TrpcContext {
  return { req: { headers: {}, protocol: "http", get: () => "localhost" }, res: { cookie: vi.fn(), clearCookie: vi.fn() }, user: null } as unknown as TrpcContext;
}

describe("infrastructureAssets.listNearby", () => {
  it("returns nearby persistent assets for a submitted property coordinate", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(createContext());

    const result = await caller.infrastructureAssets.listNearby({ latitude: -33.2, longitude: 26.5, radiusKm: 80, limit: 25 });

    expect(dbMocks.listInfrastructureAssetsNearby).toHaveBeenCalledWith(-33.2, 26.5, 80, 25);
    expect(result[0]).toMatchObject({ label: "CTTX PoP Grahamstown", assetType: "PoP", distanceKm: 14.2 });
  });
});
