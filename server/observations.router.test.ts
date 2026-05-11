import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const storageMocks = vi.hoisted(() => ({
  storagePut: vi.fn(async (key: string) => ({ key, url: `/manus-storage/${key}` })),
}));

vi.mock("./storage", () => ({
  storagePut: storageMocks.storagePut,
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
}));

vi.mock("./seed-kwandwe", () => ({
  seedKwandweDemo: vi.fn(),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(async () => true),
}));

function createProtectedContext() {
  return {
    user: { id: 7, name: "Field Ranger", role: "user" },
    req: { protocol: "https", headers: {} },
    res: { clearCookie: vi.fn() },
  } as unknown as TrpcContext;
}

describe("observations.uploadEvidence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores uploaded image bytes through server storage and returns a storage URL", async () => {
    const dateNow = vi.spyOn(Date, "now").mockReturnValue(1_765_000_000_000);
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(createProtectedContext());

    const result = await caller.observations.uploadEvidence({
      auditId: 91001,
      fileName: "tower ridge 1.png",
      mimeType: "image/png",
      base64Data: "data:image/png;base64,aW1hZ2UtYnl0ZXM=",
    });

    expect(result.url).toBe("/manus-storage/field-evidence/audit-91001/1765000000000-tower-ridge-1.png");
    expect(storageMocks.storagePut).toHaveBeenCalledWith(
      "field-evidence/audit-91001/1765000000000-tower-ridge-1.png",
      expect.any(Buffer),
      "image/png",
    );
    const storedBuffer = storageMocks.storagePut.mock.calls[0][1] as Buffer;
    expect(storedBuffer.toString("utf8")).toBe("image-bytes");
    dateNow.mockRestore();
  });

  it("rejects empty evidence payloads before writing to storage", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(createProtectedContext());

    await expect(caller.observations.uploadEvidence({
      auditId: 91001,
      fileName: "empty.jpg",
      mimeType: "image/jpeg",
      base64Data: "data:image/jpeg;base64,",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(storageMocks.storagePut).not.toHaveBeenCalled();
  });
});
