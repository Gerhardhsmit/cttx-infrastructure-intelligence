import type { InsertInfrastructureAsset } from "../drizzle/schema";

export const VERIFIED_INVENTORY_SOURCE = process.env.CTTX_VERIFIED_INVENTORY_SOURCE ?? "Admin-supplied verified CTTX inventory snapshot";

export type VerifiedInventoryRawRecord = {
  externalRef?: string | number | null;
  sourceRef?: string | number | null;
  id?: string | number | null;
  label?: string | null;
  name?: string | null;
  assetType?: string | null;
  type?: string | null;
  provider?: string | null;
  latitude?: string | number | null;
  lat?: string | number | null;
  longitude?: string | number | null;
  lng?: string | number | null;
  lon?: string | number | null;
  endLatitude?: string | number | null;
  endLat?: string | number | null;
  endLongitude?: string | number | null;
  endLng?: string | number | null;
  endLon?: string | number | null;
  description?: string | null;
  confidence?: string | number | null;
  verificationStatus?: string | null;
  region?: string | null;
  active?: boolean | number | string | null;
};

export type InventoryImportError = { index: number; reason: string; record?: VerifiedInventoryRawRecord };
export type InventoryImportResult = { imported: number; skipped: number; errors: InventoryImportError[]; assets: InsertInfrastructureAsset[] };

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normaliseAssetType(value: unknown): InsertInfrastructureAsset["assetType"] | null {
  const text = String(value ?? "").toLowerCase();
  if (/tower|mast|high|relay|repeater|site/.test(text)) return "Tower";
  if (/fibre|fiber|route|line|backbone/.test(text)) return "Fibre Route";
  if (/pop|point of presence|handoff|exchange/.test(text)) return "PoP";
  return null;
}

function normaliseVerificationStatus(value: unknown): InsertInfrastructureAsset["verificationStatus"] {
  const text = String(value ?? "").toLowerCase();
  if (/field/.test(text)) return "Field Verified";
  if (/known|verified|existing|confirmed/.test(text)) return "Known";
  return "Candidate";
}

function activeFlag(value: unknown) {
  if (value === false || value === 0) return 0;
  if (typeof value === "string" && /^(false|0|inactive|retired)$/i.test(value.trim())) return 0;
  return 1;
}

export function normaliseVerifiedInventoryRecord(record: VerifiedInventoryRawRecord, index = 0): { asset?: InsertInfrastructureAsset; error?: InventoryImportError } {
  const latitude = toNumber(record.latitude ?? record.lat);
  const longitude = toNumber(record.longitude ?? record.lng ?? record.lon);
  const assetType = normaliseAssetType(record.assetType ?? record.type);
  if (!assetType) return { error: { index, reason: "Unsupported asset type; expected tower, fibre route, or PoP", record } };
  if (latitude === null || longitude === null) return { error: { index, reason: "Missing valid latitude/longitude", record } };
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return { error: { index, reason: "Coordinates outside valid latitude/longitude bounds", record } };

  const provider = String(record.provider ?? "CTTX verified inventory").trim() || "CTTX verified inventory";
  const externalRef = String(record.externalRef ?? record.sourceRef ?? record.id ?? `${provider}:${assetType}:${latitude.toFixed(5)}:${longitude.toFixed(5)}`).trim();
  const confidence = Math.max(0, Math.min(100, Math.round(toNumber(record.confidence) ?? 90)));
  const endLatitude = toNumber(record.endLatitude ?? record.endLat);
  const endLongitude = toNumber(record.endLongitude ?? record.endLng ?? record.endLon);

  return {
    asset: {
      externalRef,
      label: String(record.label ?? record.name ?? `${provider} ${assetType}`).trim().slice(0, 255),
      assetType,
      provider,
      latitude: latitude.toFixed(8) as any,
      longitude: longitude.toFixed(8) as any,
      endLatitude: endLatitude === null ? undefined : endLatitude.toFixed(8) as any,
      endLongitude: endLongitude === null ? undefined : endLongitude.toFixed(8) as any,
      description: record.description ?? undefined,
      confidence,
      verificationStatus: normaliseVerificationStatus(record.verificationStatus),
      region: record.region ?? undefined,
      source: VERIFIED_INVENTORY_SOURCE,
      active: activeFlag(record.active),
    },
  };
}

export function normaliseVerifiedInventory(records: VerifiedInventoryRawRecord[]): InventoryImportResult {
  const seen = new Set<string>();
  const assets: InsertInfrastructureAsset[] = [];
  const errors: InventoryImportError[] = [];
  let skipped = 0;

  records.forEach((record, index) => {
    const { asset, error } = normaliseVerifiedInventoryRecord(record, index);
    if (error || !asset) {
      errors.push(error ?? { index, reason: "Record could not be normalised", record });
      return;
    }
    const key = `${asset.externalRef}|${asset.provider}|${asset.assetType}|${asset.latitude}|${asset.longitude}`.toLowerCase();
    if (seen.has(key)) {
      skipped += 1;
      return;
    }
    seen.add(key);
    assets.push(asset);
  });

  return { imported: assets.length, skipped, errors, assets };
}
