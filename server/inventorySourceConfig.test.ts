import { describe, expect, it, vi } from "vitest";
import { fetchVerifiedInventoryRecordsFromSource, getVerifiedInventorySourceStatus } from "./inventorySourceConfig";

describe("verified inventory source connection", () => {
  it("reports configured server-side connection metadata without exposing token values", () => {
    const status = getVerifiedInventorySourceStatus({
      CTTX_VERIFIED_INVENTORY_SOURCE_URL: "https://inventory.cttx.example/export/verified-assets",
      CTTX_VERIFIED_INVENTORY_SOURCE_TOKEN: "secret-token-value",
      CTTX_VERIFIED_INVENTORY_SOURCE: "Existing CTTX verified inventory database",
    } as NodeJS.ProcessEnv);

    expect(status).toMatchObject({
      configured: true,
      sourceName: "Existing CTTX verified inventory database",
      endpointHost: "inventory.cttx.example",
      authMode: "server-token",
    });
    expect(JSON.stringify(status)).not.toContain("secret-token-value");
  });

  it("marks the source unconfigured when required server secrets are absent", () => {
    const status = getVerifiedInventorySourceStatus({} as NodeJS.ProcessEnv);

    expect(status.configured).toBe(false);
    expect(status.endpointHost).toBeNull();
    expect(status.requiredSecrets).toContain("CTTX_VERIFIED_INVENTORY_SOURCE_URL");
    expect(status.requiredSecrets).toContain("CTTX_VERIFIED_INVENTORY_SOURCE_TOKEN");
  });

  it("fetches verified inventory records from a configured source using bearer auth", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ records: [{ externalRef: "cttx-pop-001", assetType: "PoP", provider: "CTTX", latitude: -33.1, longitude: 26.6 }] }),
    });

    const records = await fetchVerifiedInventoryRecordsFromSource({
      CTTX_VERIFIED_INVENTORY_SOURCE_URL: "https://inventory.cttx.example/export/verified-assets",
      CTTX_VERIFIED_INVENTORY_SOURCE_TOKEN: "secret-token-value",
    } as NodeJS.ProcessEnv, fetchImpl as unknown as typeof fetch);

    expect(records).toHaveLength(1);
    expect(records[0].externalRef).toBe("cttx-pop-001");
    expect(fetchImpl).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({
      method: "GET",
      headers: expect.objectContaining({ Authorization: "Bearer secret-token-value" }),
    }));
  });

  it("blocks direct imports until the source URL and token are configured", async () => {
    await expect(fetchVerifiedInventoryRecordsFromSource({} as NodeJS.ProcessEnv)).rejects.toThrow(/not configured/i);
  });
});
