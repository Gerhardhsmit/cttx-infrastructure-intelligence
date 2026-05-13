import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, audits, fieldObservations, leads, InsertAudit, Audit, InsertFieldObservation, FieldObservation, InsertLead, infrastructureAssets, InfrastructureAsset, InsertInfrastructureAsset, operationalCriticalLocations, operationalPainPoints, InsertOperationalCriticalLocation, OperationalCriticalLocation, InsertOperationalPainPoint, OperationalPainPoint, linkPlans, LinkPlan, InsertLinkPlan } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export function getInsertId(result: unknown): number | undefined {
  const candidate = Array.isArray(result) ? result[0] : result;
  const insertId = (candidate as { insertId?: unknown } | undefined)?.insertId;
  if (typeof insertId === "number") return insertId;
  if (typeof insertId === "bigint") return Number(insertId);
  if (typeof insertId === "string" && insertId.trim() !== "") return Number(insertId);
  return undefined;
}


export type InfrastructureAssetWithDistance = InfrastructureAsset & { distanceKm: number };
export type VerifiedInventoryImportDbResult = { imported: number; skipped: number; errors: Array<{ index: number; reason: string }>; };

export function calculateDistanceKm(latA: number, lngA: number, latB: number, lngB: number) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(latB - latA);
  const deltaLng = toRadians(lngB - lngA);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(toRadians(latA)) * Math.cos(toRadians(latB)) * Math.sin(deltaLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseDecimalCoordinate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Audit queries
export async function createAudit(audit: InsertAudit): Promise<Audit | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(audits).values(audit);
    const id = getInsertId(result);
    if (!id) {
      throw new Error("Database did not return an insert id for the audit record");
    }
    const rows = await db.select().from(audits).where(eq(audits.id, id));
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("[Database] Failed to create audit:", error);
    throw error;
  }
}

export async function getAuditById(id: number): Promise<Audit | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db.select().from(audits).where(eq(audits.id, id));
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get audit:", error);
    throw error;
  }
}

export async function listAudits(limit = 50): Promise<Audit[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(audits).orderBy(desc(audits.createdAt)).limit(limit);
  } catch (error) {
    console.error("[Database] Failed to list audits:", error);
    throw error;
  }
}

export async function updateAudit(id: number, updates: Partial<InsertAudit>): Promise<Audit | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    await db.update(audits).set(updates).where(eq(audits.id, id));
    return getAuditById(id);
  } catch (error) {
    console.error("[Database] Failed to update audit:", error);
    throw error;
  }
}

export async function deleteAudit(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.delete(audits).where(eq(audits.id, id));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete audit:", error);
    throw error;
  }
}


// Persistent infrastructure asset queries
export async function createInfrastructureAsset(asset: InsertInfrastructureAsset): Promise<InfrastructureAsset | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(infrastructureAssets).values(asset).onDuplicateKeyUpdate({
      set: {
        label: asset.label,
        assetType: asset.assetType,
        provider: asset.provider,
        latitude: asset.latitude,
        longitude: asset.longitude,
        endLatitude: asset.endLatitude,
        endLongitude: asset.endLongitude,
        description: asset.description,
        confidence: asset.confidence,
        verificationStatus: asset.verificationStatus,
        region: asset.region,
        source: asset.source,
        active: asset.active,
      },
    });
    const id = getInsertId(result);
    const rows = id
      ? await db.select().from(infrastructureAssets).where(eq(infrastructureAssets.id, id)).limit(1)
      : await db.select().from(infrastructureAssets).where(eq(infrastructureAssets.externalRef, asset.externalRef)).limit(1);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("[Database] Failed to create infrastructure asset:", error);
    throw error;
  }
}

export async function listInfrastructureAssetsNearby(latitude: number, longitude: number, radiusKm = 80, limit = 25): Promise<InfrastructureAssetWithDistance[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db.select().from(infrastructureAssets).where(eq(infrastructureAssets.active, 1));
    return rows
      .map((asset) => {
        const lat = parseDecimalCoordinate(asset.latitude);
        const lng = parseDecimalCoordinate(asset.longitude);
        if (lat === null || lng === null) return null;
        return { ...asset, distanceKm: Number(calculateDistanceKm(latitude, longitude, lat, lng).toFixed(2)) };
      })
      .filter((asset): asset is InfrastructureAssetWithDistance => asset !== null && asset.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);
  } catch (error) {
    console.error("[Database] Failed to list nearby infrastructure assets:", error);
    throw error;
  }
}

export async function importVerifiedInfrastructureAssets(assets: InsertInfrastructureAsset[], preflight: { skipped?: number; errors?: Array<{ index: number; reason: string }> } = {}): Promise<VerifiedInventoryImportDbResult> {
  const db = await getDb();
  if (!db) return { imported: 0, skipped: assets.length + (preflight.skipped ?? 0), errors: [{ index: -1, reason: "Database not available" }, ...(preflight.errors ?? [])] };
  let imported = 0;
  const errors = [...(preflight.errors ?? [])];

  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index];
    try {
      await db.insert(infrastructureAssets).values(asset).onDuplicateKeyUpdate({
        set: {
          label: asset.label,
          assetType: asset.assetType,
          provider: asset.provider,
          latitude: asset.latitude,
          longitude: asset.longitude,
          endLatitude: asset.endLatitude,
          endLongitude: asset.endLongitude,
          description: asset.description,
          confidence: asset.confidence,
          verificationStatus: asset.verificationStatus,
          region: asset.region,
          source: asset.source,
          active: asset.active,
        },
      });
      imported += 1;
    } catch (error) {
      errors.push({ index, reason: error instanceof Error ? error.message : "Unknown database import failure" });
    }
  }

  return { imported, skipped: preflight.skipped ?? 0, errors };
}

// Operational critical location and pain-point queries
export async function createOperationalCriticalLocations(items: InsertOperationalCriticalLocation[]): Promise<OperationalCriticalLocation[]> {
  const db = await getDb();
  if (!db || items.length === 0) return [];
  try {
    await db.insert(operationalCriticalLocations).values(items);
    return await listOperationalCriticalLocationsByAuditId(Number(items[0].auditId));
  } catch (error) {
    console.error("[Database] Failed to create operational critical locations:", error);
    throw error;
  }
}

export async function listOperationalCriticalLocationsByAuditId(auditId: number): Promise<OperationalCriticalLocation[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(operationalCriticalLocations).where(eq(operationalCriticalLocations.auditId, auditId)).orderBy(desc(operationalCriticalLocations.createdAt));
  } catch (error) {
    console.error("[Database] Failed to list operational critical locations:", error);
    throw error;
  }
}

export async function createOperationalPainPoints(items: InsertOperationalPainPoint[]): Promise<OperationalPainPoint[]> {
  const db = await getDb();
  if (!db || items.length === 0) return [];
  try {
    await db.insert(operationalPainPoints).values(items);
    return await listOperationalPainPointsByAuditId(Number(items[0].auditId));
  } catch (error) {
    console.error("[Database] Failed to create operational pain points:", error);
    throw error;
  }
}

export async function listOperationalPainPointsByAuditId(auditId: number): Promise<OperationalPainPoint[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(operationalPainPoints).where(eq(operationalPainPoints.auditId, auditId)).orderBy(desc(operationalPainPoints.createdAt));
  } catch (error) {
    console.error("[Database] Failed to list operational pain points:", error);
    throw error;
  }
}

// Field Observations queries
export async function createObservation(observation: InsertFieldObservation): Promise<FieldObservation | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(fieldObservations).values(observation);
    const id = getInsertId(result);
    if (!id) {
      throw new Error("Database did not return an insert id for the field observation record");
    }
    const rows = await db.select().from(fieldObservations).where(eq(fieldObservations.id, id));
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("[Database] Failed to create observation:", error);
    throw error;
  }
}

export async function listObservationsByAuditId(auditId: number): Promise<FieldObservation[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(fieldObservations).where(eq(fieldObservations.auditId, auditId)).orderBy(desc(fieldObservations.createdAt));
  } catch (error) {
    console.error("[Database] Failed to list observations:", error);
    throw error;
  }
}

export async function updateObservation(id: number, updates: Partial<InsertFieldObservation>): Promise<FieldObservation | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    await db.update(fieldObservations).set(updates).where(eq(fieldObservations.id, id));
    const rows = await db.select().from(fieldObservations).where(eq(fieldObservations.id, id));
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("[Database] Failed to update observation:", error);
    throw error;
  }
}

// Lead queries
export async function createLead(lead: InsertLead): Promise<any> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(leads).values(lead);
    const id = getInsertId(result);
    if (!id) {
      throw new Error("Database did not return an insert id for the lead record");
    }
    const rows = await db.select().from(leads).where(eq(leads.id, id));
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("[Database] Failed to create lead:", error);
    throw error;
  }
}


// Link Planner saved-plan queries
export async function createLinkPlan(plan: InsertLinkPlan): Promise<LinkPlan | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.insert(linkPlans).values(plan);
    const id = getInsertId(result);
    if (!id) {
      throw new Error("Database did not return an insert id for the link plan record");
    }
    const rows = await db.select().from(linkPlans).where(eq(linkPlans.id, id)).limit(1);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("[Database] Failed to create link plan:", error);
    throw error;
  }
}

export async function updateLinkPlan(id: number, updates: Partial<InsertLinkPlan>): Promise<LinkPlan | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    await db.update(linkPlans).set(updates).where(eq(linkPlans.id, id));
    const rows = await db.select().from(linkPlans).where(eq(linkPlans.id, id)).limit(1);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("[Database] Failed to update link plan:", error);
    throw error;
  }
}

export async function getLinkPlanById(id: number): Promise<LinkPlan | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db.select().from(linkPlans).where(eq(linkPlans.id, id)).limit(1);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get link plan:", error);
    throw error;
  }
}

export async function listLinkPlans(limit = 25): Promise<LinkPlan[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return await db.select().from(linkPlans).orderBy(desc(linkPlans.createdAt)).limit(limit);
  } catch (error) {
    console.error("[Database] Failed to list link plans:", error);
    throw error;
  }
}
