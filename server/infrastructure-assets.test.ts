import { describe, expect, it, vi } from "vitest";

const sampleAssets = [
  { id: 1, externalRef: "near-tower", label: "Near Vodacom High Site", assetType: "Tower", latitude: "-33.14500000", longitude: "26.55800000", active: 1 },
  { id: 2, externalRef: "far-pop", label: "Far Away PoP", assetType: "PoP", latitude: "-31.00000000", longitude: "24.00000000", active: 1 },
];

const dbMock = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(async () => sampleAssets),
    })),
  })),
};

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: vi.fn(() => dbMock),
}));

describe("infrastructure asset nearby queries", () => {
  it("calculates distance and keeps only assets within the requested radius", async () => {
    process.env.DATABASE_URL = "mysql://example";
    const db = await import("./db");

    const assets = await db.listInfrastructureAssetsNearby(-33.2, 26.5, 20, 10);

    expect(assets).toHaveLength(1);
    expect(assets[0]).toMatchObject({ label: "Near Vodacom High Site", distanceKm: expect.any(Number) });
    expect(assets[0].distanceKm).toBeLessThan(20);
    expect(db.calculateDistanceKm(-33.2, 26.5, -33.145, 26.558)).toBeGreaterThan(0);
  });
});
