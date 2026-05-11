import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { createAudit, getAuditById, listAudits, updateAudit, deleteAudit, createObservation, listObservationsByAuditId, updateObservation, createLead, listInfrastructureAssetsNearby, createOperationalCriticalLocations, listOperationalCriticalLocationsByAuditId, createOperationalPainPoints, listOperationalPainPointsByAuditId, importVerifiedInfrastructureAssets, createLinkPlan, updateLinkPlan, getLinkPlanById, listLinkPlans } from "./db";
import { TRPCError } from "@trpc/server";
import { seedKwandweDemo } from "./seed-kwandwe";
import { calculatePreliminaryAuditIntelligence } from "./scoring";
import { notifyOwner } from "./_core/notification";
import { storagePut } from "./storage";
import { normaliseVerifiedInventory, type VerifiedInventoryRawRecord } from "./inventoryImport";
import { fetchVerifiedInventoryRecordsFromSource, getVerifiedInventorySourceStatus } from "./inventorySourceConfig";

export const infrastructurePointSchema = z.object({
  label: z.string().min(1),
  category: z.string().min(1),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  notes: z.string().optional(),
});

const businessDriverSchema = z.enum(["threats", "hospitality", "operations"]);

const linkPlannerCoordinateSchema = z.object({ lat: z.number(), lng: z.number() });
const linkPlannerPlanPayloadSchema = z.object({
  planName: z.string().min(1).max(255),
  propertyName: z.string().min(1).max(255),
  centerLatitude: z.number().optional(),
  centerLongitude: z.number().optional(),
  propertyAreaHa: z.number().positive().optional(),
  selectedMastId: z.string().optional(),
  boundary: z.array(linkPlannerCoordinateSchema).optional(),
  highSites: z.array(z.record(z.string(), z.unknown())).optional(),
  providerMasts: z.array(z.record(z.string(), z.unknown())).optional(),
  links: z.array(z.record(z.string(), z.unknown())).optional(),
  assumptions: z.record(z.string(), z.unknown()).optional(),
  recommendationSummary: z.string().optional(),
  totalDistanceKm: z.number().optional(),
  liveDistanceKm: z.number().optional(),
  status: z.enum(["Draft", "Ready for Field Validation"]).default("Draft"),
});
const reserveSiteTypeSchema = z.enum([
  "high_site",
  "lodge",
  "gate",
  "security_post",
  "control_room",
  "staff_village",
  "workshop",
  "pump_site",
  "sensor_zone",
  "fence_line",
  "anti_poaching_point",
  "ranger_station",
  "camera_site",
  "solar_system",
  "fuel_depot",
  "hunting_camp",
  "airstrip",
  "river_crossing",
  "repeater_point",
  "backhaul_handoff",
]);

export const operationalCriticalLocationSchema = z.object({
  name: z.string().min(1),
  locationType: z.enum(["Lodge", "Ranger Station", "Gate", "Security Post", "Control Room", "Staff Village", "Workshop", "Water/Pump Site", "CCTV/Sensor Zone", "Camera Site", "Fence Line", "Anti-Poaching Point", "Solar System", "Fuel Depot", "Hunting Camp", "Airstrip", "River Crossing", "Repeater Point", "Other"]),
  priority: z.enum(["Critical", "Important", "Nice-to-Have", "High", "Medium", "Low"]).default("Important"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  connectivityRequirement: z.string().optional(),
  businessImpact: z.string().optional(),
  photoUrl: z.string().optional(),
  notes: z.string().optional(),
  reserveSiteType: reserveSiteTypeSchema.optional(),
  topologyRole: z.string().optional(),
  businessDrivers: z.array(businessDriverSchema).optional(),
});

export const operationalPainPointSchema = z.object({
  title: z.string().min(1),
  category: z.enum(["Coverage Gap", "Unstable Link", "Security Blind Spot", "Power Dependency", "Operational Delay", "Guest Experience", "Camera Outage", "Communication Delay", "Payment Failure", "Staff Disconnection", "Response Delay", "Radio Unreliability", "Remote Visibility Gap", "Other"]),
  severity: z.enum(["Critical", "Important", "Nice-to-Have", "High", "Medium", "Low"]).default("Important"),
  affectedLocation: z.string().optional(),
  description: z.string().optional(),
  businessImpact: z.string().optional(),
  businessDrivers: z.array(businessDriverSchema).optional(),
});

function mapInfrastructurePointToObservationType(category: string) {
  if (/tower|high-site|microwave/i.test(category)) return "Tower Sighting" as const;
  if (/fibre|fiber|handoff|pop/i.test(category)) return "Fibre Sighting" as const;
  if (/signal|lte|coverage/i.test(category)) return "Signal Observation" as const;
  return "Photo Note" as const;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Audit routers
  audits: router({
    create: publicProcedure
      .input(z.object({
        clientName: z.string(),
        sector: z.enum(["Game Reserve", "Farm", "Mining", "Renewable Energy", "Logistics", "Other"]),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        propertySizeHa: z.number().optional(),
        operationalZones: z.array(z.string()).optional(),
        currentConnectivity: z.string().optional(),
        knownProblems: z.array(z.string()).optional(),
        infrastructureNotes: z.string().optional(),
        operationalFrustrationScore: z.number().min(1).max(10).optional(),
        applicationProfile: z.array(z.string()).optional(),
        infrastructurePoints: z.array(infrastructurePointSchema).optional(),
        operationalCriticalLocations: z.array(operationalCriticalLocationSchema).optional(),
        operationalPainPoints: z.array(operationalPainPointSchema).optional(),
      }))
      .mutation(async ({ input }) => {
        const preliminary = calculatePreliminaryAuditIntelligence(input);
        const infrastructurePointSummary = (input.infrastructurePoints ?? [])
          .filter((point) => typeof point.latitude === "number" && typeof point.longitude === "number")
          .map((point) => `${point.label} (${point.category}): ${point.latitude?.toFixed(6)}, ${point.longitude?.toFixed(6)}${point.notes ? ` — ${point.notes}` : ""}`)
          .join("\n");
        const combinedInfrastructureNotes = [
          input.infrastructureNotes,
          infrastructurePointSummary ? `Mapped infrastructure and operational-zone pins:\n${infrastructurePointSummary}` : undefined,
        ].filter(Boolean).join("\n\n");

        const audit = await createAudit({
          clientName: input.clientName,
          sector: input.sector,
          latitude: typeof input.latitude === "number" ? input.latitude.toString() as any : undefined,
          longitude: typeof input.longitude === "number" ? input.longitude.toString() as any : undefined,
          propertySizeHa: input.propertySizeHa,
          operationalZones: input.operationalZones as any,
          currentConnectivity: input.currentConnectivity,
          knownProblems: input.knownProblems as any,
          infrastructureNotes: combinedInfrastructureNotes || input.infrastructureNotes,
          operationalFrustrationScore: input.operationalFrustrationScore,
          applicationProfile: preliminary.applicationProfile as any,
          cisScore: preliminary.cisScore,
          tciScore: preliminary.tciScore,
          resilienceScore: preliminary.resilienceScore,
          projectedUptimePercent: preliminary.projectedUptimePercent.toString() as any,
          uptimeModel: preliminary.uptimeModel as any,
          targetBer: preliminary.targetBer,
          payloadThroughputMbps: preliminary.payloadThroughputMbps,
          linkQuality: preliminary.linkQuality,
          productStack: preliminary.productStack as any,
          remoteMonitoringFlag: preliminary.remoteMonitoringFlag,
          cisSubMetrics: preliminary.cisSubMetrics as any,
          tciObstructionZones: preliminary.tciObstructionZones as any,
          tciProfileSamples: preliminary.tciProfileSamples as any,
          primaryArchitecture: preliminary.primaryArchitecture,
          backupArchitecture: preliminary.backupArchitecture,
          engineeringNotes: preliminary.engineeringNotes,
          status: "Draft",
        });
        if (!audit) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create audit" });

        const observationInputs = (input.infrastructurePoints ?? []).filter(
          (point) => typeof point.latitude === "number" && typeof point.longitude === "number",
        );
        await Promise.all(observationInputs.map((point) => createObservation({
          auditId: audit.id,
          type: mapInfrastructurePointToObservationType(point.category),
          latitude: point.latitude!.toString() as any,
          longitude: point.longitude!.toString() as any,
          description: `${point.label} — ${point.category}${point.notes ? `: ${point.notes}` : ""}`,
        })));

        await createOperationalCriticalLocations((input.operationalCriticalLocations ?? []).map((location) => ({
          auditId: audit.id,
          name: location.name,
          locationType: location.locationType,
          priority: location.priority,
          latitude: typeof location.latitude === "number" ? location.latitude.toString() as any : undefined,
          longitude: typeof location.longitude === "number" ? location.longitude.toString() as any : undefined,
          connectivityRequirement: location.connectivityRequirement,
          businessImpact: location.businessImpact,
          photoUrl: location.photoUrl,
          notes: location.notes,
          reserveSiteType: location.reserveSiteType,
          topologyRole: location.topologyRole,
          businessDrivers: location.businessDrivers as any,
        })));

        await createOperationalPainPoints((input.operationalPainPoints ?? []).map((point) => ({
          auditId: audit.id,
          title: point.title,
          category: point.category,
          severity: point.severity,
          affectedLocation: point.affectedLocation,
          description: point.description,
          businessImpact: point.businessImpact,
          businessDrivers: point.businessDrivers as any,
        })));

        return audit;
      }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const audit = await getAuditById(input.id);
        if (!audit) throw new TRPCError({ code: "NOT_FOUND", message: "Audit not found" });
        return audit;
      }),
    list: publicProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => {
        return await listAudits(input.limit || 50);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        cisScore: z.number().optional(),
        tciScore: z.number().optional(),
        resilienceScore: z.number().optional(),
        applicationProfile: z.array(z.string()).optional(),
        projectedUptimePercent: z.number().optional(),
        uptimeModel: z.any().optional(),
        targetBer: z.string().optional(),
        payloadThroughputMbps: z.number().optional(),
        linkQuality: z.string().optional(),
        productStack: z.any().optional(),
        remoteMonitoringFlag: z.string().optional(),
        cisSubMetrics: z.array(z.object({
          key: z.string(),
          label: z.string(),
          value: z.number(),
          evidence: z.string(),
        })).optional(),
        tciObstructionZones: z.array(z.object({
          key: z.string(),
          label: z.string(),
          severity: z.enum(["Monitor", "Medium", "High"]),
          startPercent: z.number(),
          endPercent: z.number(),
          elevationPercent: z.number(),
          evidence: z.string(),
        })).optional(),
        tciProfileSamples: z.array(z.object({
          distancePercent: z.number(),
          elevationPercent: z.number(),
          source: z.enum(["site", "valley", "ridge", "distribution", "egress"]),
        })).optional(),
        primaryArchitecture: z.string().optional(),
        backupArchitecture: z.string().optional(),
        engineeringNotes: z.string().optional(),
        status: z.enum(["Draft", "Published"]).optional(),
        leadEmail: z.string().optional(),
        leadCompany: z.string().optional(),
        leadBudget: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can update audits" });
        const audit = await updateAudit(input.id, {
          cisScore: input.cisScore,
          tciScore: input.tciScore,
          resilienceScore: input.resilienceScore,
          applicationProfile: input.applicationProfile as any,
          projectedUptimePercent: typeof input.projectedUptimePercent === "number" ? input.projectedUptimePercent.toString() as any : undefined,
          uptimeModel: input.uptimeModel as any,
          targetBer: input.targetBer,
          payloadThroughputMbps: input.payloadThroughputMbps,
          linkQuality: input.linkQuality,
          productStack: input.productStack as any,
          remoteMonitoringFlag: input.remoteMonitoringFlag,
          cisSubMetrics: input.cisSubMetrics as any,
          tciObstructionZones: input.tciObstructionZones as any,
          tciProfileSamples: input.tciProfileSamples as any,
          primaryArchitecture: input.primaryArchitecture,
          backupArchitecture: input.backupArchitecture,
          engineeringNotes: input.engineeringNotes,
          status: input.status as any,
          leadEmail: input.leadEmail,
          leadCompany: input.leadCompany,
          leadBudget: input.leadBudget,
        });
        if (!audit) throw new TRPCError({ code: "NOT_FOUND", message: "Audit not found" });
        return audit;
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can delete audits" });
        const success = await deleteAudit(input.id);
        if (!success) throw new TRPCError({ code: "NOT_FOUND", message: "Audit not found" });
        return { success: true };
      }),
  }),


  // Operational critical location and pain-point routers
  operationalCriticalLocations: router({
    listByAuditId: publicProcedure
      .input(z.object({ auditId: z.number() }))
      .query(async ({ input }) => {
        return await listOperationalCriticalLocationsByAuditId(input.auditId);
      }),
  }),

  operationalPainPoints: router({
    listByAuditId: publicProcedure
      .input(z.object({ auditId: z.number() }))
      .query(async ({ input }) => {
        return await listOperationalPainPointsByAuditId(input.auditId);
      }),
  }),

  // Persistent infrastructure asset routers
  infrastructureAssets: router({
    listNearby: publicProcedure
      .input(z.object({
        latitude: z.number(),
        longitude: z.number(),
        radiusKm: z.number().min(1).max(250).optional(),
        limit: z.number().min(1).max(100).optional(),
      }))
      .query(async ({ input }) => {
        return await listInfrastructureAssetsNearby(input.latitude, input.longitude, input.radiusKm ?? 80, input.limit ?? 25);
      }),
    sourceStatus: adminProcedure.query(() => getVerifiedInventorySourceStatus()),
    importVerified: adminProcedure
      .input(z.object({
        records: z.array(z.record(z.string(), z.unknown())).min(1).max(500),
      }))
      .mutation(async ({ input }) => {
        const normalised = normaliseVerifiedInventory(input.records as VerifiedInventoryRawRecord[]);
        return await importVerifiedInfrastructureAssets(normalised.assets, { skipped: normalised.skipped, errors: normalised.errors.map(({ index, reason }) => ({ index, reason })) });
      }),
    importFromConfiguredSource: adminProcedure.mutation(async () => {
      const records = await fetchVerifiedInventoryRecordsFromSource();
      const normalised = normaliseVerifiedInventory(records);
      return await importVerifiedInfrastructureAssets(normalised.assets, { skipped: normalised.skipped, errors: normalised.errors.map(({ index, reason }) => ({ index, reason })) });
    }),
  }),

  // Link Planner routers
  linkPlans: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).optional() }).optional())
      .query(async ({ input }) => {
        return await listLinkPlans(input?.limit ?? 25);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const plan = await getLinkPlanById(input.id);
        if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Link plan not found" });
        return plan;
      }),
    create: protectedProcedure
      .input(linkPlannerPlanPayloadSchema)
      .mutation(async ({ input, ctx }) => {
        const plan = await createLinkPlan({
          ownerUserId: ctx.user?.id,
          planName: input.planName,
          propertyName: input.propertyName,
          centerLatitude: typeof input.centerLatitude === "number" ? input.centerLatitude.toString() as any : undefined,
          centerLongitude: typeof input.centerLongitude === "number" ? input.centerLongitude.toString() as any : undefined,
          propertyAreaHa: input.propertyAreaHa,
          selectedMastId: input.selectedMastId,
          boundary: input.boundary as any,
          highSites: input.highSites as any,
          providerMasts: input.providerMasts as any,
          links: input.links as any,
          assumptions: input.assumptions as any,
          recommendationSummary: input.recommendationSummary,
          totalDistanceKm: typeof input.totalDistanceKm === "number" ? input.totalDistanceKm.toFixed(2) as any : undefined,
          liveDistanceKm: typeof input.liveDistanceKm === "number" ? input.liveDistanceKm.toFixed(2) as any : undefined,
          status: input.status as any,
        });
        if (!plan) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create link plan" });
        return plan;
      }),
    update: protectedProcedure
      .input(linkPlannerPlanPayloadSchema.extend({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const existing = await getLinkPlanById(input.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Link plan not found" });
        if (existing.ownerUserId && ctx.user?.role !== "admin" && existing.ownerUserId !== ctx.user?.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only the owner or an admin can update this link plan" });
        }
        const plan = await updateLinkPlan(input.id, {
          ownerUserId: existing.ownerUserId ?? ctx.user?.id,
          planName: input.planName,
          propertyName: input.propertyName,
          centerLatitude: typeof input.centerLatitude === "number" ? input.centerLatitude.toString() as any : undefined,
          centerLongitude: typeof input.centerLongitude === "number" ? input.centerLongitude.toString() as any : undefined,
          propertyAreaHa: input.propertyAreaHa,
          selectedMastId: input.selectedMastId,
          boundary: input.boundary as any,
          highSites: input.highSites as any,
          providerMasts: input.providerMasts as any,
          links: input.links as any,
          assumptions: input.assumptions as any,
          recommendationSummary: input.recommendationSummary,
          totalDistanceKm: typeof input.totalDistanceKm === "number" ? input.totalDistanceKm.toFixed(2) as any : undefined,
          liveDistanceKm: typeof input.liveDistanceKm === "number" ? input.liveDistanceKm.toFixed(2) as any : undefined,
          status: input.status as any,
        });
        if (!plan) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update link plan" });
        return plan;
      }),
  }),

  // Field Observations routers
  observations: router({
    uploadEvidence: protectedProcedure
      .input(z.object({
        auditId: z.number(),
        fileName: z.string().min(1),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        base64Data: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const extension = input.mimeType === "image/png" ? "png" : input.mimeType === "image/webp" ? "webp" : "jpg";
        const baseFileName = input.fileName.replace(/\.[^.]+$/, "");
        const safeFileName = baseFileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 96) || "field-evidence";
        const buffer = Buffer.from(input.base64Data.replace(/^data:[^;]+;base64,/, ""), "base64");
        if (!buffer.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Evidence photo was empty" });
        if (buffer.length > 8 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Evidence photo must be smaller than 8MB" });
        const uploaded = await storagePut(`field-evidence/audit-${input.auditId}/${Date.now()}-${safeFileName}.${extension}`, buffer, input.mimeType);
        return uploaded;
      }),
    create: protectedProcedure
      .input(z.object({
        auditId: z.number(),
        type: z.enum(["Tower Sighting", "Fibre Sighting", "Signal Observation", "Photo Note"]),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        description: z.string().optional(),
        photoUrl: z.string().optional(),
        signalReadings: z.object({ rsrp: z.number().optional(), rsrq: z.number().optional(), sinr: z.number().optional() }).optional(),
      }))
      .mutation(async ({ input }) => {
        const observation = await createObservation({
          auditId: input.auditId,
          type: input.type,
          latitude: typeof input.latitude === "number" ? input.latitude.toString() as any : undefined,
          longitude: typeof input.longitude === "number" ? input.longitude.toString() as any : undefined,
          description: input.description,
          photoUrl: input.photoUrl,
          signalReadings: input.signalReadings as any,
        });
        if (!observation) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create observation" });
        return observation;
      }),
    listByAuditId: publicProcedure
      .input(z.object({ auditId: z.number() }))
      .query(async ({ input }) => {
        return await listObservationsByAuditId(input.auditId);
      }),
  }),

  // Lead routers
  leads: router({
    create: publicProcedure
      .input(z.object({
        auditId: z.number(),
        email: z.string().email(),
        company: z.string().min(1, "Company name is required"),
        budget: z.string().min(1, "Budget is required"),
      }))
      .mutation(async ({ input }) => {
        const lead = await createLead({
          auditId: input.auditId,
          email: input.email,
          company: input.company,
          budget: input.budget,
        });
        if (!lead) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create lead" });

        await updateAudit(input.auditId, {
          leadEmail: input.email,
          leadCompany: input.company,
          leadBudget: input.budget,
          status: "Published",
        });

        try {
          await notifyOwner({
            title: `CTTX follow-up requested: ${input.company}`,
            content: [
              `A reserve manager requested contact from audit #${input.auditId}.`,
              `Company / property: ${input.company}`,
              `Email: ${input.email}`,
              `Budget context: ${input.budget}`,
              "Recommended operator action: review the audit report, confirm the captured pins and connectivity context, then schedule an engineering discovery call.",
            ].join("\n"),
          });
        } catch (error) {
          console.warn("[Lead notification] Follow-up notification could not be sent", error);
        }

        return lead;
      }),
  }),

  // Demo seed
  demo: router({
    seedKwandwe: publicProcedure.mutation(async () => {
      try {
        const existing = await listAudits(100);
        if (existing.some((a) => a.clientName === "Kwandwe Private Game Reserve")) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Kwandwe demo already exists" });
        }
        const kwandwe = await seedKwandweDemo();
        return kwandwe;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to seed demo" });
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
