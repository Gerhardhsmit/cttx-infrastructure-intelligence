import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  createAudit: vi.fn(async () => ({
    id: 88001,
    clientName: "Kwandwe Private Game Reserve",
    sector: "Game Reserve",
    status: "Published",
  })),
  createObservation: vi.fn(async (input) => ({ id: Math.floor(Math.random() * 1000), ...input })),
}));

vi.mock("./db", () => dbMocks);

import { seedKwandweDemo } from "./seed-kwandwe";

describe("seedKwandweDemo", () => {
  beforeEach(() => {
    dbMocks.createAudit.mockClear();
    dbMocks.createObservation.mockClear();
  });

  it("creates tower, fibre, and signal sample field observations for the Kwandwe demo audit", async () => {
    const audit = await seedKwandweDemo();

    expect(audit?.id).toBe(88001);
    expect(dbMocks.createObservation).toHaveBeenCalledTimes(3);
    expect(dbMocks.createObservation).toHaveBeenCalledWith(expect.objectContaining({
      auditId: 88001,
      type: "Tower Sighting",
      description: expect.stringContaining("Vodacom tower north"),
      signalReadings: { rsrp: -92, rsrq: -11, sinr: 8 },
    }));
    expect(dbMocks.createObservation).toHaveBeenCalledWith(expect.objectContaining({
      auditId: 88001,
      type: "Fibre Sighting",
      description: expect.stringContaining("TFA fibre route south"),
    }));
    expect(dbMocks.createObservation).toHaveBeenCalledWith(expect.objectContaining({
      auditId: 88001,
      type: "Signal Observation",
      description: expect.stringContaining("Main lodge valley shadow"),
      signalReadings: { rsrp: -108, rsrq: -15, sinr: 2 },
    }));
  });
});
