import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, decimal, float, uniqueIndex } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// CTTX Site Audit table
export const audits = mysqlTable("audits", {
  id: int("id").autoincrement().primaryKey(),
  clientName: varchar("clientName", { length: 255 }).notNull(),
  sector: mysqlEnum("sector", ["Game Reserve", "Farm", "Mining", "Renewable Energy", "Logistics", "Other"]).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  propertySizeHa: int("propertySizeHa"),
  operationalZones: json("operationalZones"), // Array of zone names
  currentConnectivity: text("currentConnectivity"),
  knownProblems: json("knownProblems"), // Array of problem descriptions
  infrastructureNotes: text("infrastructureNotes"),
  operationalFrustrationScore: int("operationalFrustrationScore"),
  applicationProfile: json("applicationProfile"), // Array of application profile requirements captured during intake
  cisScore: int("cisScore").default(0), // Connectivity Intelligence Score (0-100)
  tciScore: int("tciScore").default(0), // Terrain Complexity Index (0-100)
  resilienceScore: int("resilienceScore").default(0), // Legacy availability/resilience score retained for admin compatibility
  projectedUptimePercent: decimal("projectedUptimePercent", { precision: 5, scale: 2 }), // Projected uptime percentage
  uptimeModel: json("uptimeModel"), // Component availability model with weakest component and biggest-impact upgrade
  cisSubMetrics: json("cisSubMetrics"), // Model-backed CIS sub-metric details
  tciObstructionZones: json("tciObstructionZones"), // Structured terrain obstruction-zone overlays
  tciProfileSamples: json("tciProfileSamples"), // Model-backed terrain cross-section profile samples
  targetBer: varchar("targetBer", { length: 32 }),
  payloadThroughputMbps: int("payloadThroughputMbps"),
  linkQuality: text("linkQuality"),
  productStack: json("productStack"),
  remoteMonitoringFlag: text("remoteMonitoringFlag"),
  primaryArchitecture: text("primaryArchitecture"),
  backupArchitecture: text("backupArchitecture"),
  engineeringNotes: text("engineeringNotes"),
  status: mysqlEnum("status", ["Draft", "Published"]).default("Draft").notNull(),
  leadEmail: varchar("leadEmail", { length: 320 }),
  leadCompany: varchar("leadCompany", { length: 255 }),
  leadBudget: varchar("leadBudget", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Audit = typeof audits.$inferSelect;
export type InsertAudit = typeof audits.$inferInsert;

// Structured operational critical locations captured during intake for map-ready and report-ready intelligence
export const operationalCriticalLocations = mysqlTable("operationalCriticalLocations", {
  id: int("id").autoincrement().primaryKey(),
  auditId: int("auditId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  locationType: mysqlEnum("locationType", ["Lodge", "Ranger Station", "Gate", "Security Post", "Control Room", "Staff Village", "Workshop", "Water/Pump Site", "CCTV/Sensor Zone", "Camera Site", "Fence Line", "Anti-Poaching Point", "Solar System", "Fuel Depot", "Hunting Camp", "Airstrip", "River Crossing", "Repeater Point", "Other"]).notNull(),
  priority: mysqlEnum("priority", ["Critical", "Important", "Nice-to-Have", "High", "Medium", "Low"]).default("Important").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  connectivityRequirement: text("connectivityRequirement"),
  businessImpact: text("businessImpact"),
  photoUrl: text("photoUrl"),
  notes: text("notes"),
  reserveSiteType: varchar("reserveSiteType", { length: 64 }),
  topologyRole: text("topologyRole"),
  businessDrivers: json("businessDrivers"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OperationalCriticalLocation = typeof operationalCriticalLocations.$inferSelect;
export type InsertOperationalCriticalLocation = typeof operationalCriticalLocations.$inferInsert;

// Structured operational pain points linked to business impact and affected operational locations
export const operationalPainPoints = mysqlTable("operationalPainPoints", {
  id: int("id").autoincrement().primaryKey(),
  auditId: int("auditId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  category: mysqlEnum("category", ["Coverage Gap", "Unstable Link", "Security Blind Spot", "Power Dependency", "Operational Delay", "Guest Experience", "Camera Outage", "Communication Delay", "Payment Failure", "Staff Disconnection", "Response Delay", "Radio Unreliability", "Remote Visibility Gap", "Other"]).notNull(),
  severity: mysqlEnum("severity", ["Critical", "Important", "Nice-to-Have", "High", "Medium", "Low"]).default("Important").notNull(),
  affectedLocation: varchar("affectedLocation", { length: 255 }),
  description: text("description"),
  businessImpact: text("businessImpact"),
  businessDrivers: json("businessDrivers"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OperationalPainPoint = typeof operationalPainPoints.$inferSelect;
export type InsertOperationalPainPoint = typeof operationalPainPoints.$inferInsert;


// Persistent infrastructure assets table for preloaded CTTX intelligence layers
export const infrastructureAssets = mysqlTable("infrastructureAssets", {
  id: int("id").autoincrement().primaryKey(),
  externalRef: varchar("externalRef", { length: 128 }).notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  assetType: mysqlEnum("assetType", ["Tower", "Fibre Route", "PoP"]).notNull(),
  provider: varchar("provider", { length: 255 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  endLatitude: decimal("endLatitude", { precision: 10, scale: 8 }),
  endLongitude: decimal("endLongitude", { precision: 11, scale: 8 }),
  description: text("description"),
  confidence: int("confidence").default(60).notNull(),
  verificationStatus: mysqlEnum("verificationStatus", ["Known", "Candidate", "Field Verified"]).default("Candidate").notNull(),
  region: varchar("region", { length: 255 }),
  source: varchar("source", { length: 255 }).default("CTTX infrastructure intelligence").notNull(),
  active: int("active").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  externalRefIdx: uniqueIndex("infrastructureAssets_externalRef_unique").on(table.externalRef),
}));

export type InfrastructureAsset = typeof infrastructureAssets.$inferSelect;
export type InsertInfrastructureAsset = typeof infrastructureAssets.$inferInsert;

// Field Observations table
export const fieldObservations = mysqlTable("fieldObservations", {
  id: int("id").autoincrement().primaryKey(),
  auditId: int("auditId").notNull(),
  type: mysqlEnum("type", ["Tower Sighting", "Fibre Sighting", "Signal Observation", "Photo Note"]).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  description: text("description"),
  photoUrl: text("photoUrl"),
  signalReadings: json("signalReadings"), // {rsrp, rsrq, sinr}
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FieldObservation = typeof fieldObservations.$inferSelect;
export type InsertFieldObservation = typeof fieldObservations.$inferInsert;

// Lead Submissions table
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  auditId: int("auditId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  company: varchar("company", { length: 255 }).notNull(),
  budget: varchar("budget", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// Native Link Planner saved plans. JSON fields preserve the generated topology while scalar fields keep plan lists fast and readable.
export const linkPlans = mysqlTable("linkPlans", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("ownerUserId"),
  planName: varchar("planName", { length: 255 }).notNull(),
  propertyName: varchar("propertyName", { length: 255 }).notNull(),
  centerLatitude: decimal("centerLatitude", { precision: 10, scale: 8 }),
  centerLongitude: decimal("centerLongitude", { precision: 11, scale: 8 }),
  propertyAreaHa: int("propertyAreaHa"),
  selectedMastId: varchar("selectedMastId", { length: 128 }),
  boundary: json("boundary"),
  highSites: json("highSites"),
  providerMasts: json("providerMasts"),
  links: json("links"),
  assumptions: json("assumptions"),
  recommendationSummary: text("recommendationSummary"),
  totalDistanceKm: decimal("totalDistanceKm", { precision: 8, scale: 2 }),
  liveDistanceKm: decimal("liveDistanceKm", { precision: 8, scale: 2 }),
  status: mysqlEnum("status", ["Draft", "Ready for Field Validation"]).default("Draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LinkPlan = typeof linkPlans.$inferSelect;
export type InsertLinkPlan = typeof linkPlans.$inferInsert;

// CTTX Persistent Outbound Communication Queue
export const outboundMessages = mysqlTable("outboundMessages", {
  id: int("id").autoincrement().primaryKey(),
  messageId: varchar("messageId", { length: 64 }).notNull().unique(),
  prospectId: varchar("prospectId", { length: 255 }), // Reference to prospect in prospect register
  accountId: varchar("accountId", { length: 255 }), // Reference to existing customer/account
  pipelineId: varchar("pipelineId", { length: 255 }), // Reference to CRM pipeline record
  messageType: varchar("messageType", { length: 64 }).notNull(), // ASSESSMENT_INITIAL, FOLLOW_UP, PROPOSAL_FOLLOW_UP, etc.
  campaignName: varchar("campaignName", { length: 255 }), // e.g., "Assessment Outreach — Reserves Batch 1"
  recipient: varchar("recipient", { length: 320 }).notNull(), // Email address
  recipientName: varchar("recipientName", { length: 255 }), // Display name
  subject: varchar("subject", { length: 255 }).notNull(),
  body: text("body"), // HTML or plain text
  bodyType: mysqlEnum("bodyType", ["html", "text"]).default("html"),
  attachments: json("attachments"), // Array of {filename, url/path}
  status: mysqlEnum("status", [
    "DRAFT", "READY", "APPROVED", "QUEUED", "SENDING", "SENT", "VERIFIED",
    "FOLLOW_UP_DUE", "RESPONDED", "CLOSED",
    "RETRY", "BLOCKED", "FAILED", "DEAD_LETTER"
  ]).default("DRAFT").notNull(),
  approvedBy: varchar("approvedBy", { length: 255 }), // User/system that approved sending
  approvedAt: timestamp("approvedAt"),
  transport: varchar("transport", { length: 64 }), // OUTLOOK, RESEND, GMAIL, etc.
  providerMessageId: varchar("providerMessageId", { length: 512 }), // ID returned by provider (Outlook messageId, etc.)
  attemptCount: int("attemptCount").default(0),
  lastAttemptAt: timestamp("lastAttemptAt"),
  lastError: text("lastError"), // Last error message if any
  nextRetryAt: timestamp("nextRetryAt"),
  sentAt: timestamp("sentAt"), // When delivery was confirmed by transport
  verifiedAt: timestamp("verifiedAt"), // When delivery was verified (e.g., in Sent Items)
  verificationMethod: varchar("verificationMethod", { length: 64 }), // HOW_VERIFIED (outlook_sent_items, etc.)
  followUpDueAt: timestamp("followUpDueAt"), // When follow-up action is due
  source: varchar("source", { length: 255 }).default("assessment_engine"), // Origin: assessment_engine, sales_engine, manual, etc.
  metadata: json("metadata"), // Additional metadata (template params, context, etc.)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OutboundMessage = typeof outboundMessages.$inferSelect;
export type InsertOutboundMessage = typeof outboundMessages.$inferInsert;

// Outbound Message Attempts (retry tracking)
export const outboundMessageAttempts = mysqlTable("outboundMessageAttempts", {
  id: int("id").autoincrement().primaryKey(),
  messageId: int("messageId").notNull(), // Foreign key to outboundMessages.id
  attemptNumber: int("attemptNumber").notNull(),
  status: varchar("status", { length: 64 }).notNull(), // SENDING, SENT, FAILED, RETRYING
  transport: varchar("transport", { length: 64 }).notNull(),
  providerResponse: json("providerResponse"), // Full response from provider
  error: text("error"), // Error message if failed
  errorCode: varchar("errorCode", { length: 64 }), // Classification: TRANSIENT, PERMANENT, HUMAN_REQUIRED
  nextRetryAt: timestamp("nextRetryAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OutboundMessageAttempt = typeof outboundMessageAttempts.$inferSelect;
export type InsertOutboundMessageAttempt = typeof outboundMessageAttempts.$inferInsert;

// Outbound Receipts (proof of delivery)
export const outboundReceipts = mysqlTable("outboundReceipts", {
  id: int("id").autoincrement().primaryKey(),
  messageId: int("messageId").notNull(), // Foreign key to outboundMessages.id
  recipient: varchar("recipient", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  transport: varchar("transport", { length: 64 }).notNull(),
  providerMessageId: varchar("providerMessageId", { length: 512 }),
  sentTimestamp: timestamp("sentTimestamp"),
  verifiedTimestamp: timestamp("verifiedTimestamp"),
  verificationMethod: varchar("verificationMethod", { length: 64 }), // outlook_sent_items, resend_api, etc.
  verification: json("verification"), // Full verification data
  pipelineUpdatedAt: timestamp("pipelineUpdatedAt"), // When pipeline was updated
  followUpCreatedAt: timestamp("followUpCreatedAt"), // When follow-up was scheduled
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OutboundReceipt = typeof outboundReceipts.$inferSelect;
export type InsertOutboundReceipt = typeof outboundReceipts.$inferInsert;

// Dead Letter Queue (permanently failed messages)
export const deadLetterMessages = mysqlTable("deadLetterMessages", {
  id: int("id").autoincrement().primaryKey(),
  messageId: int("messageId"), // Reference to outboundMessages.id if applicable
  originalMessageId: varchar("originalMessageId", { length: 64 }),
  prospectId: varchar("prospectId", { length: 255 }),
  recipient: varchar("recipient", { length: 320 }),
  subject: varchar("subject", { length: 255 }),
  failureReason: text("failureReason"),
  failureClassification: varchar("failureClassification", { length: 64 }), // PERMANENT, HUMAN_REQUIRED, UNKNOWN
  attemptCount: int("attemptCount"),
  lastError: text("lastError"),
  recommendedAction: text("recommendedAction"), // What Gerhard should do
  resolvedBy: varchar("resolvedBy", { length: 255 }), // Who resolved it
  resolvedAt: timestamp("resolvedAt"),
  resolution: varchar("resolution", { length: 255 }), // MANUAL_SEND, SKIP, RETRY, INVALID_DATA, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DeadLetterMessage = typeof deadLetterMessages.$inferSelect;
export type InsertDeadLetterMessage = typeof deadLetterMessages.$inferInsert;
