import { describe, expect, it } from "vitest";
import { normaliseVerifiedInventory, normaliseVerifiedInventoryRecord, VERIFIED_INVENTORY_SOURCE } from "./inventoryImport";

describe("verified inventory import normalisation", () => {
  it("normalises trusted tower, fibre route, and PoP inventory records into infrastructure assets", () => {
    const result = normaliseVerifiedInventory([
      { externalRef: "tower-001", label: "Reserve High Site", type: "mast", provider: "CTTX", lat: -33.145, lng: 26.558, verificationStatus: "field verified", confidence: 96 },
      { externalRef: "fibre-001", name: "South fibre route", assetType: "fibre backbone", provider: "TFA", latitude: -33.2, longitude: 26.5, endLatitude: -33.21, endLongitude: 26.6 },
      { externalRef: "pop-001", assetType: "PoP handoff", provider: "Openserve", latitude: -33.1, longitude: 26.4, active: "inactive" },
    ]);

    expect(result.imported).toBe(3);
    expect(result.skipped).toBe(0);
    expect(result.errors).toEqual([]);
    expect(result.assets.map((asset) => asset.assetType)).toEqual(["Tower", "Fibre Route", "PoP"]);
    expect(result.assets[0]).toMatchObject({
      externalRef: "tower-001",
      label: "Reserve High Site",
      provider: "CTTX",
      latitude: "-33.14500000",
      longitude: "26.55800000",
      confidence: 96,
      verificationStatus: "Field Verified",
      source: VERIFIED_INVENTORY_SOURCE,
      active: 1,
    });
    expect(result.assets[2].active).toBe(0);
  });

  it("deduplicates repeated source records before database import", () => {
    const duplicate = { externalRef: "tower-dup", assetType: "Tower", provider: "CTTX", latitude: -33.145, longitude: 26.558 };

    const result = normaliseVerifiedInventory([duplicate, duplicate]);

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it("returns explicit validation errors for unsupported records and invalid coordinates", () => {
    const unsupported = normaliseVerifiedInventoryRecord({ externalRef: "solar-001", assetType: "Solar", latitude: -33.1, longitude: 26.5 }, 4);
    const outOfBounds = normaliseVerifiedInventoryRecord({ externalRef: "tower-bad", assetType: "Tower", latitude: -133.1, longitude: 26.5 }, 5);

    expect(unsupported.error).toMatchObject({ index: 4, reason: "Unsupported asset type; expected tower, fibre route, or PoP" });
    expect(outOfBounds.error).toMatchObject({ index: 5, reason: "Coordinates outside valid latitude/longitude bounds" });
  });
});
