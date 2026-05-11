from pathlib import Path
root = Path('/home/ubuntu/cttx-infrastructure-intelligence')

def p(rel): return root / rel

def read(rel): return p(rel).read_text()
def write(rel, text): p(rel).write_text(text)
def rep(text, old, new, label):
    if old not in text:
        raise RuntimeError(f'missing snippet: {label}')
    return text.replace(old, new, 1)

# Schema expansion.
schema = read('drizzle/schema.ts')
schema = schema.replace('  infrastructureNotes: text("infrastructureNotes"),\n  cisScore: int("cisScore").default(0),', '  infrastructureNotes: text("infrastructureNotes"),\n  operationalFrustrationScore: int("operationalFrustrationScore"),\n  cisScore: int("cisScore").default(0),')
schema = schema.replace('locationType: mysqlEnum("locationType", ["Lodge", "Gate", "Security Post", "Control Room", "Staff Village", "Workshop", "Water/Pump Site", "CCTV/Sensor Zone", "Fence Line", "Anti-Poaching Point", "Other"]).notNull(),', 'locationType: mysqlEnum("locationType", ["Lodge", "Ranger Station", "Gate", "Security Post", "Control Room", "Staff Village", "Workshop", "Water/Pump Site", "CCTV/Sensor Zone", "Camera Site", "Fence Line", "Anti-Poaching Point", "Solar System", "Fuel Depot", "Hunting Camp", "Airstrip", "River Crossing", "Repeater Point", "Other"]).notNull(),')
schema = schema.replace('priority: mysqlEnum("priority", ["Critical", "High", "Medium", "Low"]).default("High").notNull(),', 'priority: mysqlEnum("priority", ["Critical", "Important", "Nice-to-Have", "High", "Medium", "Low"]).default("Important").notNull(),')
schema = schema.replace('category: mysqlEnum("category", ["Coverage Gap", "Unstable Link", "Security Blind Spot", "Power Dependency", "Operational Delay", "Guest Experience", "Other"]).notNull(),', 'category: mysqlEnum("category", ["Coverage Gap", "Unstable Link", "Security Blind Spot", "Power Dependency", "Operational Delay", "Guest Experience", "Camera Outage", "Communication Delay", "Payment Failure", "Staff Disconnection", "Response Delay", "Radio Unreliability", "Remote Visibility Gap", "Other"]).notNull(),')
schema = schema.replace('severity: mysqlEnum("severity", ["Critical", "High", "Medium", "Low"]).default("High").notNull(),', 'severity: mysqlEnum("severity", ["Critical", "Important", "Nice-to-Have", "High", "Medium", "Low"]).default("Important").notNull(),')
write('drizzle/schema.ts', schema)

# Verified inventory normaliser.
write('server/inventoryImport.ts', r'''import type { InsertInfrastructureAsset } from "../drizzle/schema";

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
''')

# DB helper.
db = read('server/db.ts')
db = db.replace('export type InfrastructureAssetWithDistance = InfrastructureAsset & { distanceKm: number };', 'export type InfrastructureAssetWithDistance = InfrastructureAsset & { distanceKm: number };\nexport type VerifiedInventoryImportDbResult = { imported: number; skipped: number; errors: Array<{ index: number; reason: string }>; };')
db = rep(db, '// Operational critical location and pain-point queries', '''export async function importVerifiedInfrastructureAssets(assets: InsertInfrastructureAsset[], preflight: { skipped?: number; errors?: Array<{ index: number; reason: string }> } = {}): Promise<VerifiedInventoryImportDbResult> {
  const db = await getDb();
  if (!db) return { imported: 0, skipped: assets.length + (preflight.skipped ?? 0), errors: [{ index: -1, reason: "Database not available" }, ...(preflight.errors ?? [])] };
  let imported = 0;
  const errors = [...(preflight.errors ?? [])];

  for (const [index, asset] of assets.entries()) {
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

// Operational critical location and pain-point queries''', 'db import helper')
write('server/db.ts', db)

# Router.
router = read('server/routers.ts')
router = router.replace('import { publicProcedure, router, protectedProcedure } from "./_core/trpc";', 'import { adminProcedure, publicProcedure, router, protectedProcedure } from "./_core/trpc";')
router = router.replace('createOperationalPainPoints, listOperationalPainPointsByAuditId } from "./db";', 'createOperationalPainPoints, listOperationalPainPointsByAuditId, importVerifiedInfrastructureAssets } from "./db";')
router = router.replace('import { storagePut } from "./storage";', 'import { storagePut } from "./storage";\nimport { normaliseVerifiedInventory, type VerifiedInventoryRawRecord } from "./inventoryImport";')
router = router.replace('"anti_poaching_point",\n  "backhaul_handoff",', '"anti_poaching_point",\n  "ranger_station",\n  "camera_site",\n  "solar_system",\n  "fuel_depot",\n  "hunting_camp",\n  "airstrip",\n  "river_crossing",\n  "repeater_point",\n  "backhaul_handoff",')
router = router.replace('locationType: z.enum(["Lodge", "Gate", "Security Post", "Control Room", "Staff Village", "Workshop", "Water/Pump Site", "CCTV/Sensor Zone", "Fence Line", "Anti-Poaching Point", "Other"]),', 'locationType: z.enum(["Lodge", "Ranger Station", "Gate", "Security Post", "Control Room", "Staff Village", "Workshop", "Water/Pump Site", "CCTV/Sensor Zone", "Camera Site", "Fence Line", "Anti-Poaching Point", "Solar System", "Fuel Depot", "Hunting Camp", "Airstrip", "River Crossing", "Repeater Point", "Other"]),')
router = router.replace('priority: z.enum(["Critical", "High", "Medium", "Low"]).default("High"),', 'priority: z.enum(["Critical", "Important", "Nice-to-Have", "High", "Medium", "Low"]).default("Important"),')
router = router.replace('category: z.enum(["Coverage Gap", "Unstable Link", "Security Blind Spot", "Power Dependency", "Operational Delay", "Guest Experience", "Other"]),', 'category: z.enum(["Coverage Gap", "Unstable Link", "Security Blind Spot", "Power Dependency", "Operational Delay", "Guest Experience", "Camera Outage", "Communication Delay", "Payment Failure", "Staff Disconnection", "Response Delay", "Radio Unreliability", "Remote Visibility Gap", "Other"]),')
router = router.replace('severity: z.enum(["Critical", "High", "Medium", "Low"]).default("High"),', 'severity: z.enum(["Critical", "Important", "Nice-to-Have", "High", "Medium", "Low"]).default("Important"),')
router = router.replace('infrastructureNotes: z.string().optional(),\n        infrastructurePoints:', 'infrastructureNotes: z.string().optional(),\n        operationalFrustrationScore: z.number().min(1).max(10).optional(),\n        infrastructurePoints:')
router = router.replace('infrastructureNotes: combinedInfrastructureNotes || input.infrastructureNotes,\n          cisScore: preliminary.cisScore,', 'infrastructureNotes: combinedInfrastructureNotes || input.infrastructureNotes,\n          operationalFrustrationScore: input.operationalFrustrationScore,\n          cisScore: preliminary.cisScore,')
old = '''    listNearby: publicProcedure
      .input(z.object({
        latitude: z.number(),
        longitude: z.number(),
        radiusKm: z.number().min(1).max(250).optional(),
        limit: z.number().min(1).max(100).optional(),
      }))
      .query(async ({ input }) => {
        return await listInfrastructureAssetsNearby(input.latitude, input.longitude, input.radiusKm ?? 80, input.limit ?? 25);
      }),
  }),'''
new = '''    listNearby: publicProcedure
      .input(z.object({
        latitude: z.number(),
        longitude: z.number(),
        radiusKm: z.number().min(1).max(250).optional(),
        limit: z.number().min(1).max(100).optional(),
      }))
      .query(async ({ input }) => {
        return await listInfrastructureAssetsNearby(input.latitude, input.longitude, input.radiusKm ?? 80, input.limit ?? 25);
      }),
    importVerified: adminProcedure
      .input(z.object({
        records: z.array(z.record(z.string(), z.unknown())).min(1).max(500),
      }))
      .mutation(async ({ input }) => {
        const normalised = normaliseVerifiedInventory(input.records as VerifiedInventoryRawRecord[]);
        return await importVerifiedInfrastructureAssets(normalised.assets, { skipped: normalised.skipped, errors: normalised.errors.map(({ index, reason }) => ({ index, reason })) });
      }),
  }),'''
router = rep(router, old, new, 'infrastructure route')
write('server/routers.ts', router)

# Audit form options plus strategic score/future fields.
form = read('client/src/pages/AuditForm.tsx')
form = form.replace('''const KNOWN_PROBLEMS = [
  "No signal areas",
  "Poor LTE",
  "Unreliable WISP",
  "No redundancy",
  "Load-shedding failures",
  "Weak CCTV backhaul",
];''', '''const KNOWN_PROBLEMS = [
  "No signal areas",
  "Poor LTE",
  "Unreliable WISP",
  "No redundancy",
  "Load-shedding failures",
  "Weak CCTV backhaul",
  "Camera outages",
  "Ranger communication delays",
  "Payment failures",
  "Staff disconnection",
  "Radio unreliability",
  "Remote visibility gaps",
  "Delayed incident response",
  "Security blind spots",
];''')
form = form.replace('  "Power or pump site",\n  "Other infrastructure point",', '  "Power or pump site",\n  "LTE router / CPE",\n  "Starlink terminal",\n  "Solar or battery system",\n  "Generator or power system",\n  "Radio mast / repeater",\n  "Camera or analytics equipment",\n  "Network cabinet / switch",\n  "Other infrastructure point",')
form = form.replace('const OPERATIONAL_LOCATION_TYPES = [\n  "Lodge",\n  "Gate",', 'const OPERATIONAL_LOCATION_TYPES = [\n  "Lodge",\n  "Ranger Station",\n  "Gate",')
form = form.replace('  "CCTV/Sensor Zone",\n  "Fence Line",\n  "Anti-Poaching Point",\n  "Other",', '  "CCTV/Sensor Zone",\n  "Camera Site",\n  "Fence Line",\n  "Anti-Poaching Point",\n  "Solar System",\n  "Fuel Depot",\n  "Hunting Camp",\n  "Airstrip",\n  "River Crossing",\n  "Repeater Point",\n  "Other",')
form = form.replace('const PRIORITY_LEVELS = ["Critical", "High", "Medium", "Low"];\nconst PAIN_POINT_CATEGORIES = ["Coverage Gap", "Unstable Link", "Security Blind Spot", "Power Dependency", "Operational Delay", "Guest Experience", "Other"];', 'const PRIORITY_LEVELS = ["Critical", "Important", "Nice-to-Have", "High", "Medium", "Low"];\nconst PAIN_POINT_CATEGORIES = ["Coverage Gap", "Unstable Link", "Security Blind Spot", "Power Dependency", "Operational Delay", "Guest Experience", "Camera Outage", "Communication Delay", "Payment Failure", "Staff Disconnection", "Response Delay", "Radio Unreliability", "Remote Visibility Gap", "Other"];')
form = form.replace('infrastructureNotes: "",\n    infrastructurePoints:', 'infrastructureNotes: "",\n    operationalFrustrationScore: "7",\n    futureGrowthPlans: "",\n    infrastructurePoints:')
form = form.replace('infrastructureNotes: formData.infrastructureNotes,\n        infrastructurePoints: buildInfrastructurePayload(),', 'infrastructureNotes: [formData.infrastructureNotes, formData.futureGrowthPlans ? `Future growth and expansion context: ${formData.futureGrowthPlans}` : ""].filter(Boolean).join("\\n\\n"),\n        operationalFrustrationScore: formData.operationalFrustrationScore ? Number(formData.operationalFrustrationScore) : undefined,\n        infrastructurePoints: buildInfrastructurePayload(),')
form = form.replace('Add report-ready points such as lodges, gates, security posts, pumps, workshops, CCTV zones, and anti-poaching lookouts.', 'Add report-ready points such as lodges, ranger stations, gates, fence lines, cameras, anti-poaching zones, workshops, water pumps, solar systems, staff housing, fuel depots, hunting camps, airstrips, river crossings, and repeater points.')
form = form.replace('Capture each operational pain point with severity, affected location, evidence context, and business impact for the CTTX report.', 'Capture the operational problems caused by poor connectivity, including camera outages, communication delays, LTE instability, payment failures, staff disconnection, response delays, guest-experience risks, radio unreliability, remote visibility gaps, and security blind spots.')
form = form.replace('placeholder="Connectivity requirement, e.g. CCTV backhaul, VoIP, payment systems, ranger comms, guest WiFi..."', 'placeholder="Connectivity requirement and current issues, e.g. CCTV backhaul, VoIP, payment systems, ranger comms, guest WiFi, drone operations, wildlife tracking, telemetry, smart gates..."')
form = form.replace('''                  {formData.operationalPainPoints.map((point) => (''', '''                  <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
                    <Label>Operational connectivity-frustration score: {formData.operationalFrustrationScore || "—"}/10</Label>
                    <input
                      aria-label="Operational connectivity-frustration score"
                      type="range"
                      min={1}
                      max={10}
                      value={formData.operationalFrustrationScore}
                      onChange={(event) => setFormData((prev) => ({ ...prev, operationalFrustrationScore: event.target.value }))}
                      className="mt-3 w-full accent-yellow-300"
                    />
                    <p className="mt-2 text-sm text-muted-foreground">Use this benchmark to express how strongly connectivity gaps affect security response, guest operations, staff coordination, monitoring, telemetry, and future planning.</p>
                  </div>

                  {formData.operationalPainPoints.map((point) => (''', 1)
form = form.replace('''                </div>
              )}''', '''                  <div className="rounded-xl border border-border bg-background/50 p-4">
                    <Label>Expansion and future-planning context</Label>
                    <Textarea
                      aria-label="Expansion and future-planning context"
                      placeholder="New lodges, roads, tourism expansion, cameras, patrol routes, solar plants, drone/AI analytics, IoT sensors, wildlife tracking, cloud applications, or infrastructure growth plans..."
                      value={formData.futureGrowthPlans}
                      onChange={(event) => setFormData((prev) => ({ ...prev, futureGrowthPlans: event.target.value }))}
                      className="mt-2 min-h-24 bg-input/40"
                    />
                  </div>
                </div>
              )}''', 1)
write('client/src/pages/AuditForm.tsx', form)

# Admin controls.
admin = read('client/src/pages/AdminDashboard.tsx')
admin = admin.replace('import { Loader2, Edit2, Trash2, ClipboardList, Save, X } from "lucide-react";', 'import { Loader2, Edit2, Trash2, ClipboardList, Save, X, UploadCloud } from "lucide-react";')
admin = admin.replace('  const deleteAudit = trpc.audits.delete.useMutation();\n  const updateAudit = trpc.audits.update.useMutation();', '  const deleteAudit = trpc.audits.delete.useMutation();\n  const updateAudit = trpc.audits.update.useMutation();\n  const importVerifiedInventory = trpc.infrastructureAssets.importVerified.useMutation();')
admin = admin.replace('  const [scoreDrafts, setScoreDrafts] = useState<Record<number, ScoreDraft>>({});', '  const [scoreDrafts, setScoreDrafts] = useState<Record<number, ScoreDraft>>({});\n  const [inventoryJson, setInventoryJson] = useState("");\n  const [lastImportStatus, setLastImportStatus] = useState<{ imported: number; skipped: number; errors: Array<{ index: number; reason: string }> } | null>(null);')
admin = admin.replace('  const handleSaveScores = async (audit: AuditRow) => {', '''  const handleVerifiedInventoryImport = async () => {
    try {
      const parsed = JSON.parse(inventoryJson);
      const records = Array.isArray(parsed) ? parsed : parsed.records;
      if (!Array.isArray(records)) {
        toast.error("Paste a JSON array or an object with a records array.");
        return;
      }
      const result = await importVerifiedInventory.mutateAsync({ records });
      setLastImportStatus(result);
      toast.success(`Verified inventory import completed: ${result.imported} imported, ${result.skipped} skipped, ${result.errors.length} errors`);
    } catch (error) {
      const message = error instanceof SyntaxError ? "Inventory JSON is not valid." : "Verified inventory import failed.";
      toast.error(message);
      setLastImportStatus({ imported: 0, skipped: 0, errors: [{ index: -1, reason: message }] });
    }
  };

  const handleSaveScores = async (audit: AuditRow) => {''')
import_card = r'''
        <Card className="mb-8 border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UploadCloud className="h-5 w-5 text-accent" /> Verified CTTX inventory import</CardTitle>
            <CardDescription>Paste a trusted JSON export from the existing CTTX inventory database. Credentials remain outside the browser; this control normalises verified towers, fibre routes, and PoPs into persistent infrastructure assets with validation and deduplication.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              aria-label="Verified inventory JSON"
              value={inventoryJson}
              onChange={(event) => setInventoryJson(event.target.value)}
              placeholder='[{"externalRef":"cttx-tower-001","assetType":"Tower","provider":"CTTX","latitude":-33.1,"longitude":26.6,"verificationStatus":"Field Verified"}]'
              className="min-h-32 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={handleVerifiedInventoryImport} disabled={importVerifiedInventory.isPending || !inventoryJson.trim()} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                {importVerifiedInventory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                Import verified inventory
              </Button>
              <span className="text-xs text-muted-foreground">Source mapping supports tower/mast/high-site, fibre route, and PoP/handoff records.</span>
            </div>
            {lastImportStatus ? (
              <div className="grid gap-3 rounded-lg border border-border bg-background/70 p-3 text-sm md:grid-cols-3" data-testid="verified-inventory-import-status">
                <div><span className="block text-xs text-muted-foreground">Imported / updated</span><strong className="text-accent">{lastImportStatus.imported}</strong></div>
                <div><span className="block text-xs text-muted-foreground">Skipped duplicates</span><strong>{lastImportStatus.skipped}</strong></div>
                <div><span className="block text-xs text-muted-foreground">Errors</span><strong className={lastImportStatus.errors.length ? "text-destructive" : "text-accent"}>{lastImportStatus.errors.length}</strong></div>
                {lastImportStatus.errors.length > 0 ? <p className="md:col-span-3 text-xs text-destructive">{lastImportStatus.errors.slice(0, 3).map((error) => `#${error.index}: ${error.reason}`).join(" · ")}</p> : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
'''
admin = rep(admin, '        <Card className="bg-card border-border">', import_card + '\n        <Card className="bg-card border-border">', 'admin card')
write('client/src/pages/AdminDashboard.tsx', admin)

# Report guidance and export language.
guidance = read('client/src/lib/reportGuidance.ts')
guidance = guidance.replace('currentConnectivity?: string | null;\n  infrastructureNotes?: string | null;', 'currentConnectivity?: string | null;\n  infrastructureNotes?: string | null;\n  operationalFrustrationScore?: number | null;')
guidance = guidance.replace('This report gives ${input.clientName} a first-pass connectivity pathway. CTTX can now use the captured property location, ${mappedObservationCount} mapped point${mappedObservationCount === 1 ? "" : "s"}, site context, and known problems to validate where connectivity can enter the property and which operational zones should be prioritised.', 'This CTTX Reserve Connectivity Intelligence Report gives ${input.clientName} a first-pass operating-risk and connectivity pathway. CTTX can now use the captured property location, ${mappedObservationCount} mapped point${mappedObservationCount === 1 ? "" : "s"}, terrain and infrastructure context, known problems, and business outcomes to validate where connectivity can enter the property, which critical zones should be prioritised, and where LTE, microwave relay, power-resilience, and future-growth opportunities need engineering review.')
guidance = guidance.replace('Ask CTTX to validate the preferred backhaul path first: tower or fibre handoff, line-of-sight, access permissions, and commercial availability.', 'Ask CTTX to validate the preferred backhaul path first: tower, fibre handoff, LTE opportunity, microwave relay path, line-of-sight, access permissions, terrain constraints, and commercial availability.')
guidance = guidance.replace('Use the mapped pins to rank coverage priorities for the first design phase, starting with revenue, safety, and operations-critical zones.', 'Use the mapped pins to rank critical zones for the first design phase, starting with live surveillance, reserve-wide communication, lodge connectivity, remote monitoring, staff coordination, IoT sensors, smart gates, VoIP, telemetry, wildlife tracking, and cloud applications.')
guidance = guidance.replace('Nominate a site contact who can approve gate access, identify equipment rooms, escort field teams, and confirm operational constraints on the property.', 'Nominate a site contact who can approve gate access, identify equipment rooms, escort field teams, confirm current issues, and explain future expansion plans such as new lodges, roads, patrol routes, solar plants, cameras, drones, or additional tourism infrastructure.')
guidance = guidance.replace('Current provider names, package details, monthly spend, and invoices if available.', 'Current provider names, package details, monthly spend, invoices, router/CPE inventory, Starlink terminals, radio masts, fibre handoffs, cameras, repeaters, power systems, and network equipment if available.')
write('client/src/lib/reportGuidance.ts', guidance)

report = read('client/src/lib/reportDownload.ts')
report = report.replace('infrastructureNotes?: string | null;\n  cisScore?: number | null;', 'infrastructureNotes?: string | null;\n  operationalFrustrationScore?: number | null;\n  cisScore?: number | null;')
report = report.replace('CTTX Infrastructure Intelligence Report', 'CTTX Reserve Connectivity Intelligence Report')
report = report.replace('    <p><strong>Known operating problems:</strong></p>${htmlList(knownProblems)}', '    <p><strong>Known operating problems:</strong></p>${htmlList(knownProblems)}\n    <p><strong>Operational connectivity-frustration score:</strong> ${escapeHtml(audit.operationalFrustrationScore ? `${audit.operationalFrustrationScore}/10` : "Not captured")}</p>\n    <p><strong>Strategic intelligence focus:</strong> This section links security and threat response, operations effectiveness, hospitality connectivity, terrain observations, LTE opportunities, microwave relay opportunities, risk areas, and future-growth cues into a practical planning brief.</p>')
report = report.replace('| Load-shedding resilience | ${audit.resilienceScore ?? 0}% |', '| Load-shedding resilience | ${audit.resilienceScore ?? 0}% |\n| Operational connectivity-frustration score | ${audit.operationalFrustrationScore ? `${audit.operationalFrustrationScore}/10` : "Not captured"} |')
write('client/src/lib/reportDownload.ts', report)

print('remaining backlog script applied')
