import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Download, MapPin, ClipboardCheck, PhoneCall, CheckCircle2, AlertTriangle, FileText, Printer, ShieldAlert, Target } from "lucide-react";
import { toast } from "sonner";
import { buildAuditReportGuidance } from "@/lib/reportGuidance";
import InfrastructureMap, { buildInfrastructureMapModel } from "@/components/InfrastructureMap";
import { buildGeneratedReportFileName, buildGeneratedReportHtml, buildGeneratedReportHtmlFileName, buildGeneratedReportMarkdown, type LeadReportConfirmation } from "@/lib/reportDownload";
import { BUSINESS_DRIVERS, BUSINESS_DRIVER_BY_ID, RESERVE_SITE_TYPE_BY_ID, type BusinessDriverId } from "@shared/reserveFramework";

export default function AuditDashboard() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadData, setLeadData] = useState({ email: "", company: "", budget: "" });
  const [reportConfirmation, setReportConfirmation] = useState<LeadReportConfirmation | null>(null);

  const auditId = parseInt(id || "0");
  const { data: audit, isLoading } = trpc.audits.getById.useQuery({ id: auditId });
  const { data: observations = [] } = trpc.observations.listByAuditId.useQuery({ auditId }, { enabled: Boolean(id) });
  const { data: operationalCriticalLocations = [] } = trpc.operationalCriticalLocations.listByAuditId.useQuery({ auditId }, { enabled: Boolean(id) });
  const { data: operationalPainPoints = [] } = trpc.operationalPainPoints.listByAuditId.useQuery({ auditId }, { enabled: Boolean(id) });
  const propertyLatitude = audit?.latitude ? Number(audit.latitude) : null;
  const propertyLongitude = audit?.longitude ? Number(audit.longitude) : null;
  const { data: infrastructureAssets = [] } = trpc.infrastructureAssets.listNearby.useQuery(
    { latitude: propertyLatitude ?? 0, longitude: propertyLongitude ?? 0, radiusKm: 80, limit: 25 },
    { enabled: Number.isFinite(propertyLatitude) && Number.isFinite(propertyLongitude) },
  );
  const createLead = trpc.leads.create.useMutation();

  const handleLeadSubmit = async () => {
    if (!leadData.email || !leadData.company || !leadData.budget) {
      toast.error("Please fill in all three required fields: email, company name, and budget");
      return;
    }

    try {
      await createLead.mutateAsync({
        auditId: parseInt(id!),
        email: leadData.email,
        company: leadData.company,
        budget: leadData.budget,
      });

      setReportConfirmation({
        email: leadData.email,
        company: leadData.company,
        budget: leadData.budget,
        generatedAt: new Date().toISOString(),
      });
      toast.success("Report pack generated. CTTX has been notified to review this audit and contact you for the next engineering step.");
      setShowLeadForm(false);
      setLeadData({ email: "", company: "", budget: "" });
    } catch (error) {
      toast.error("Failed to submit lead");
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Audit Not Found</h1>
          <Button onClick={() => setLocation("/")} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  const getCISColor = (score: number) => {
    if (score < 40) return "text-red-500";
    if (score < 70) return "text-yellow-500";
    return "text-accent";
  };

  const getTCILabel = (score: number) => {
    if (score < 30) return "Low Complexity";
    if (score < 70) return "Medium Complexity";
    return "High Complexity";
  };

  const getResilienceLabel = (score: number) => {
    if (score < 40) return "Poor";
    if (score < 70) return "Moderate";
    return "Good";
  };

  const projectedUptime = audit.projectedUptimePercent ? Number(audit.projectedUptimePercent) : audit.resilienceScore || 0;
  const uptimeModel = audit.uptimeModel && typeof audit.uptimeModel === "object" ? audit.uptimeModel as { weakestComponent?: string; biggestImpactUpgrade?: string; componentScores?: Array<{ component: string; contributionPercent: number; evidence: string }> } : null;
  const applicationProfile = Array.isArray(audit.applicationProfile) ? audit.applicationProfile.filter((item): item is string => typeof item === "string") : [];
  const productStack = Array.isArray(audit.productStack) ? audit.productStack.filter((item): item is { vendor: string; role: string; recommendation: string; remotelyManaged: boolean } => Boolean(item && typeof item === "object" && "vendor" in item)) : [];
  const scoreProfile = {
    cis: audit.cisScore || 0,
    tci: audit.tciScore || 0,
    resilience: projectedUptime,
  };
  const infrastructureMapModel = buildInfrastructureMapModel(audit, observations, infrastructureAssets, operationalCriticalLocations);
  const mappedObservationCount = infrastructureMapModel.mappedPointCount;
  const coerceBusinessDrivers = (value: unknown): BusinessDriverId[] => {
    if (!Array.isArray(value)) return [];
    return value.filter((driver): driver is BusinessDriverId => BUSINESS_DRIVERS.some((candidate) => candidate.id === driver));
  };
  const businessDriverCounts = BUSINESS_DRIVERS.map((driver) => {
    const locationMatches = operationalCriticalLocations.filter((location) => coerceBusinessDrivers(location.businessDrivers).includes(driver.id));
    const painPointMatches = operationalPainPoints.filter((point) => coerceBusinessDrivers(point.businessDrivers).includes(driver.id));
    return {
      driver,
      locationCount: locationMatches.length,
      painPointCount: painPointMatches.length,
      total: locationMatches.length + painPointMatches.length,
    };
  });
  const driverBadgeClassName = (driverId: BusinessDriverId) => {
    const driver = BUSINESS_DRIVER_BY_ID[driverId];
    return `${driver.bgClass} ${driver.textClass} ${driver.borderClass}`;
  };
  const isCisMetric = (metric: unknown): metric is { label: string; value: number; evidence: string } => {
    if (!metric || typeof metric !== "object") return false;
    const candidate = metric as Record<string, unknown>;
    return typeof candidate.label === "string" && typeof candidate.value === "number" && typeof candidate.evidence === "string";
  };
  const isTciZone = (zone: unknown): zone is { label: string; severity: string; startPercent: number; endPercent: number; elevationPercent: number; evidence: string } => {
    if (!zone || typeof zone !== "object") return false;
    const candidate = zone as Record<string, unknown>;
    return typeof candidate.label === "string" && typeof candidate.severity === "string" && typeof candidate.startPercent === "number" && typeof candidate.endPercent === "number" && typeof candidate.elevationPercent === "number" && typeof candidate.evidence === "string";
  };
  const isTciProfileSample = (sample: unknown): sample is { distancePercent: number; elevationPercent: number; source: string } => {
    if (!sample || typeof sample !== "object") return false;
    const candidate = sample as Record<string, unknown>;
    return typeof candidate.distancePercent === "number" && typeof candidate.elevationPercent === "number" && typeof candidate.source === "string";
  };
  const cisBreakdown = Array.isArray(audit.cisSubMetrics) ? audit.cisSubMetrics.filter(isCisMetric) : [];
  const obstructionZones = Array.isArray(audit.tciObstructionZones) ? audit.tciObstructionZones.filter(isTciZone) : [];
  const storedProfileSamples = Array.isArray(audit.tciProfileSamples) ? audit.tciProfileSamples.filter(isTciProfileSample) : [];
  const profilePoints = (storedProfileSamples.length >= 2
    ? storedProfileSamples
    : [
        { distancePercent: 0, elevationPercent: 22, source: "site" },
        { distancePercent: 18, elevationPercent: 34, source: "valley" },
        { distancePercent: 42, elevationPercent: Math.max(38, Math.min(74, scoreProfile.tci)), source: "distribution" },
        { distancePercent: 68, elevationPercent: 52, source: "ridge" },
        { distancePercent: 100, elevationPercent: 30, source: "egress" },
      ]).sort((a, b) => a.distancePercent - b.distancePercent);
  const profilePath = profilePoints.map((point) => `${point.distancePercent}% ${100 - point.elevationPercent}%`).join(", ");
  const reportGuidance = buildAuditReportGuidance({
    clientName: audit.clientName,
    cisScore: audit.cisScore,
    resilienceScore: audit.resilienceScore,
    latitude: audit.latitude,
    longitude: audit.longitude,
    currentConnectivity: audit.currentConnectivity,
    infrastructureNotes: audit.infrastructureNotes,
    knownProblems: audit.knownProblems,
    mappedObservationCount,
  });
  const {
    discoveryGaps,
    reportSummary,
    recommendationTone,
    reserveManagerRecommendations,
    cttxFollowUpSteps,
    decisionPackItems,
  } = reportGuidance;
  const generatedReportMarkdown = reportConfirmation
    ? buildGeneratedReportMarkdown({
        audit,
        observations,
        operationalCriticalLocations,
        operationalPainPoints,
        guidance: reportGuidance,
        lead: reportConfirmation,
      })
    : "";
  const generatedReportHref = reportConfirmation
    ? `data:text/markdown;charset=utf-8,${encodeURIComponent(generatedReportMarkdown)}`
    : "#";
  const generatedReportHtml = reportConfirmation
    ? buildGeneratedReportHtml({
        audit,
        observations,
        operationalCriticalLocations,
        operationalPainPoints,
        guidance: reportGuidance,
        lead: reportConfirmation,
      })
    : "";
  const generatedReportHtmlHref = reportConfirmation
    ? `data:text/html;charset=utf-8,${encodeURIComponent(generatedReportHtml)}`
    : "#";
  const generatedReportFileName = buildGeneratedReportFileName(audit.clientName, audit.id);
  const generatedReportHtmlFileName = buildGeneratedReportHtmlFileName(audit.clientName, audit.id);

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-4xl">
        <div className="mb-8">
          <Button variant="outline" onClick={() => setLocation("/")} className="mb-4">
            ← Back to Home
          </Button>
          <h1 className="text-3xl font-bold mb-2">{audit.clientName}</h1>
          <p className="text-muted-foreground">
            {audit.sector} • {audit.propertySizeHa ? `${audit.propertySizeHa} ha` : "Size not specified"}
          </p>
        </div>

        <Card className="bg-accent/10 border-accent/40 mb-8">
          <CardHeader>
            <CardTitle>Preliminary Infrastructure Intelligence</CardTitle>
            <CardDescription>
              These scores are early estimates generated from the property pin, infrastructure discovery pins, operating sector, site size, connectivity context, and known problems. They are designed to guide the first conversation, not replace a field-engineered RF survey.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid lg:grid-cols-[1.4fr_0.9fr] gap-6 mb-8">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center gap-2 text-accent">
                <ClipboardCheck className="h-5 w-5" />
                <CardTitle>What the Reserve Manager Receives</CardTitle>
              </div>
              <CardDescription>{recommendationTone}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">{reportSummary}</p>
              <div className="rounded-lg border border-accent/30 bg-accent/10 p-4">
                <p className="text-sm font-semibold text-accent">Recommended next decision</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Request a CTTX engineering discovery call. The purpose of that call is to confirm the practical connection path, agree the priority zones, and decide whether a desktop study, field survey, or proposal is the correct next step.
                </p>
              </div>
              {discoveryGaps.length > 0 && (
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-yellow-500" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-400">Information that will improve confidence</p>
                      <p className="mt-1 text-sm text-muted-foreground">Add or confirm: {discoveryGaps.join(", ")}.</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center gap-2 text-accent">
                <PhoneCall className="h-5 w-5" />
                <CardTitle>Who Contacts Whom?</CardTitle>
              </div>
              <CardDescription>Clear follow-up ownership after submission</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {cttxFollowUpSteps.map((step, index) => (
                <div key={step} className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent">{index + 1}</div>
                  <p>{step}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border mb-8">
          <CardHeader>
            <CardTitle>Reserve Manager Recommendations</CardTitle>
            <CardDescription>
              These are the practical actions to take before CTTX turns this preliminary intelligence into an engineering recommendation.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            {reserveManagerRecommendations.map((recommendation) => (
              <div key={recommendation} className="flex gap-3 rounded-lg border border-border bg-background/40 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <p className="text-sm text-muted-foreground">{recommendation}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Scores Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* CIS Score */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm">Connectivity Intelligence Score</CardTitle>
              <CardDescription>Overall connectivity potential</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div className={`text-5xl font-bold ${getCISColor(audit.cisScore || 0)}`}>
                  {audit.cisScore || 0}
                </div>
                <div className="text-muted-foreground text-sm mb-2">/100</div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Preliminary estimate — field survey required before accuracy confirmed</p>
              <div className="mt-4 h-2 bg-card rounded-full overflow-hidden">
                <div
                  className={`h-full ${audit.cisScore! < 40 ? "bg-red-500" : audit.cisScore! < 70 ? "bg-yellow-500" : "bg-accent"}`}
                  style={{ width: `${audit.cisScore || 0}%` }}
                />
              </div>
              <div className="mt-5 space-y-3" aria-label="CIS sub-metric breakdown">
                {cisBreakdown.length === 0 && (
                  <p className="text-xs text-muted-foreground">CIS sub-metrics are unavailable for this legacy audit until the scoring model is refreshed.</p>
                )}
                {cisBreakdown.map((metric) => (
                  <div key={metric.label}>
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{metric.label}</span>
                      <span className="font-mono text-accent">{metric.value}/100</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-background">
                      <div className="h-full rounded-full bg-primary-blue" style={{ width: `${metric.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* TCI Score */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm">Terrain Complexity Index</CardTitle>
              <CardDescription>Terrain challenge level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div className="text-5xl font-bold text-primary-blue">{audit.tciScore || 0}</div>
                <div className="text-muted-foreground text-sm mb-2">/100</div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Preliminary estimate — field survey required before accuracy confirmed</p>
              <div className="mt-4 text-sm font-medium">{getTCILabel(audit.tciScore || 0)}</div>
              <div className="mt-5" aria-label="TCI elevation profile obstruction overlay">
                <div className="relative h-28 overflow-hidden rounded-xl border border-border bg-background/60" data-testid="tci-profile-overlay">
                  <div className="absolute inset-x-0 bottom-0 h-10 bg-primary-blue/10" />
                  <div
                    className="absolute inset-3 rounded-lg bg-primary-blue/20"
                    style={{ clipPath: `polygon(0% 100%, ${profilePath}, 100% 100%)` }}
                    data-profile-path={profilePath}
                    data-profile-sample-count={profilePoints.length}
                    aria-hidden="true"
                  />
                  {obstructionZones.map((zone) => (
                    <div
                      key={zone.label}
                      className="absolute top-3 bottom-3 rounded-md border border-red-500/70 bg-red-500/25 shadow-[0_0_18px_rgba(239,68,68,0.28)]"
                      style={{ left: `${zone.startPercent}%`, width: `${Math.max(4, zone.endPercent - zone.startPercent)}%`, bottom: `${Math.max(8, Math.min(76, zone.elevationPercent - 12))}%`, height: `${Math.max(18, Math.min(70, zone.elevationPercent))}%` }}
                      data-start-percent={zone.startPercent}
                      data-end-percent={zone.endPercent}
                      data-elevation-percent={zone.elevationPercent}
                      aria-label={`${zone.label} ${zone.severity} obstruction zone`}
                      title={`${zone.label}: ${zone.evidence}`}
                    >
                      <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {zone.severity}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-2" aria-label="TCI obstruction zone highlights">
                  {obstructionZones.length === 0 && (
                    <p className="text-xs text-muted-foreground">No structured obstruction zone has been flagged for this audit yet.</p>
                  )}
                  {obstructionZones.map((zone) => (
                    <div key={zone.label} className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-muted-foreground">{zone.label}</span>
                        <span className="font-mono text-red-400">{zone.severity}</span>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">{zone.evidence}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Projected Uptime */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm">Projected Uptime Model</CardTitle>
              <CardDescription>Power, hardware, mast, monitoring, and redundancy inputs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div className="text-5xl font-bold text-primary-blue">{projectedUptime.toFixed(2)}%</div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Preliminary estimate — field survey required before accuracy confirmed</p>
              <div className="mt-4 text-sm">{getResilienceLabel(projectedUptime)} projected availability</div>
              <div className="mt-4 rounded-lg border border-border bg-background/40 p-3 text-xs text-muted-foreground">
                <p><strong className="text-foreground">Weakest component:</strong> {uptimeModel?.weakestComponent || "Requires CTTX validation"}</p>
                <p className="mt-2"><strong className="text-foreground">Biggest-impact upgrade:</strong> {uptimeModel?.biggestImpactUpgrade || "Confirm monitored power, mast, radio, and failover design during discovery."}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <InfrastructureMap audit={audit} observations={observations} infrastructureAssets={infrastructureAssets} operationalCriticalLocations={operationalCriticalLocations} />

        <Card className="bg-card border-border mb-8">
          <CardHeader>
            <CardTitle>Three Business Driver Framework</CardTitle>
            <CardDescription>
              Operational intelligence is grouped into the CTTX executive drivers for wildlife-threat response, guest experience, and daily operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {businessDriverCounts.map(({ driver, locationCount, painPointCount, total }) => (
              <div key={driver.id} className={`rounded-xl border p-4 ${driverBadgeClassName(driver.id)}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">{driver.shortLabel}</p>
                <p className="mt-2 text-lg font-bold">{driver.label}</p>
                <p className="mt-2 text-sm opacity-85">{total} linked item{total === 1 ? "" : "s"}: {locationCount} location{locationCount === 1 ? "" : "s"}, {painPointCount} pain point{painPointCount === 1 ? "" : "s"}.</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center gap-2 text-accent">
                <Target className="h-5 w-5" />
                <CardTitle>Operational Critical Locations</CardTitle>
              </div>
              <CardDescription>
                Priority operating points captured for the reserve connectivity plan, mapped into CTTX engineering and executive-report context.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {operationalCriticalLocations.length === 0 && (
                <p className="rounded-lg border border-border bg-background/40 p-4 text-sm text-muted-foreground">
                  No structured critical locations were captured for this audit yet.
                </p>
              )}
              {operationalCriticalLocations.map((location) => (
                <div key={location.id} className="rounded-lg border border-border bg-background/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{location.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-accent">{location.priority} priority · {location.locationType}</p>
                    </div>
                    {location.latitude && location.longitude && (
                      <p className="whitespace-nowrap font-mono text-xs text-accent">
                        {Number(location.latitude).toFixed(5)}, {Number(location.longitude).toFixed(5)}
                      </p>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {coerceBusinessDrivers(location.businessDrivers).map((driverId) => (
                      <span key={driverId} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${driverBadgeClassName(driverId)}`}>{BUSINESS_DRIVER_BY_ID[driverId].shortLabel}</span>
                    ))}
                  </div>
                  {location.reserveSiteType && <p className="mt-3 text-xs text-muted-foreground"><strong>Reserve site role:</strong> {RESERVE_SITE_TYPE_BY_ID[location.reserveSiteType as keyof typeof RESERVE_SITE_TYPE_BY_ID]?.label ?? location.reserveSiteType}</p>}
                  {location.topologyRole && <p className="mt-1 text-xs text-muted-foreground"><strong>Topology role:</strong> {location.topologyRole}</p>}
                  {location.connectivityRequirement && <p className="mt-3 text-sm text-muted-foreground"><strong>Requirement:</strong> {location.connectivityRequirement}</p>}
                  {location.businessImpact && <p className="mt-2 text-sm text-muted-foreground"><strong>Business impact:</strong> {location.businessImpact}</p>}
                  {location.notes && <p className="mt-2 text-xs text-muted-foreground">{location.notes}</p>}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center gap-2 text-accent">
                <ShieldAlert className="h-5 w-5" />
                <CardTitle>Operational Pain Points</CardTitle>
              </div>
              <CardDescription>
                Structured pain points tied to business impact, affected locations, and the follow-up workflow for CTTX operations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {operationalPainPoints.length === 0 && (
                <p className="rounded-lg border border-border bg-background/40 p-4 text-sm text-muted-foreground">
                  No structured operational pain points were captured for this audit yet.
                </p>
              )}
              {operationalPainPoints.map((point) => (
                <div key={point.id} className="rounded-lg border border-border bg-background/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{point.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-accent">{point.severity} severity · {point.category}</p>
                    </div>
                    {point.affectedLocation && <p className="text-xs text-muted-foreground">Affects {point.affectedLocation}</p>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {coerceBusinessDrivers(point.businessDrivers).map((driverId) => (
                      <span key={driverId} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${driverBadgeClassName(driverId)}`}>{BUSINESS_DRIVER_BY_ID[driverId].shortLabel}</span>
                    ))}
                    {coerceBusinessDrivers(point.businessDrivers).length === 0 && <span className="text-xs text-muted-foreground">No driver tag captured.</span>}
                  </div>
                  {point.description && <p className="mt-3 text-sm text-muted-foreground">{point.description}</p>}
                  {point.businessImpact && <p className="mt-2 text-sm text-muted-foreground"><strong>Business impact:</strong> {point.businessImpact}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Architecture Recommendations */}
        {(audit.primaryArchitecture || audit.backupArchitecture) && (
          <Card className="bg-card border-border mb-8">
            <CardHeader>
              <CardTitle>Recommended Architecture</CardTitle>
              <CardDescription>CTTX designs toward minimum error rate and managed payload quality, not headline maximum transmission speed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {applicationProfile.length > 0 && (
                <div>
                  <h4 className="font-semibold text-accent mb-2">Application Profile</h4>
                  <div className="flex flex-wrap gap-2">
                    {applicationProfile.map((profile) => <span key={profile} className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent">{profile}</span>)}
                  </div>
                  {applicationProfile.includes("PTZ cameras") && <p className="mt-2 text-sm text-yellow-300">PTZ cameras trigger a symmetric link requirement for uplink video and control traffic.</p>}
                </div>
              )}
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-border bg-background/40 p-4"><p className="text-xs text-muted-foreground">Target BER</p><p className="mt-1 font-mono text-lg text-accent">{audit.targetBer || "< 10^-6"}</p></div>
                <div className="rounded-lg border border-border bg-background/40 p-4"><p className="text-xs text-muted-foreground">Actual payload throughput</p><p className="mt-1 font-mono text-lg text-accent">{audit.payloadThroughputMbps || "TBD"} Mbps</p></div>
                <div className="rounded-lg border border-border bg-background/40 p-4"><p className="text-xs text-muted-foreground">Link quality</p><p className="mt-1 text-sm text-muted-foreground">{audit.linkQuality || "Pending CTTX validation"}</p></div>
              </div>
              {audit.primaryArchitecture && (
                <div>
                  <h4 className="font-semibold text-accent mb-2">Primary Architecture</h4>
                  <p className="text-muted-foreground">{audit.primaryArchitecture}</p>
                </div>
              )}
              {audit.backupArchitecture && (
                <div>
                  <h4 className="font-semibold text-accent mb-2">Backup Architecture</h4>
                  <p className="text-muted-foreground">{audit.backupArchitecture}</p>
                </div>
              )}
              {productStack.length > 0 && (
                <div>
                  <h4 className="font-semibold text-accent mb-2">Managed Product Stack</h4>
                  <div className="grid gap-3 md:grid-cols-3">
                    {productStack.map((item) => (
                      <div key={item.vendor} className="rounded-lg border border-border bg-background/40 p-4">
                        <p className="font-semibold text-foreground">{item.vendor}</p>
                        <p className="mt-1 text-xs uppercase tracking-wide text-accent">{item.role}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{item.recommendation}</p>
                        <p className={item.remotelyManaged ? "mt-2 text-xs text-lime-300" : "mt-2 text-xs text-red-300"}>{item.remotelyManaged ? "Remote monitoring supported" : "Remote monitoring must be validated"}</p>
                      </div>
                    ))}
                  </div>
                  {audit.remoteMonitoringFlag && <p className="mt-3 text-sm text-muted-foreground">{audit.remoteMonitoringFlag}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {observations.length > 0 && (
          <Card className="bg-card border-border mb-8">
            <CardHeader>
              <CardTitle>Mapped Infrastructure Discovery</CardTitle>
              <CardDescription>
                Candidate handoff sites, towers, fibre points, lodges, gates, pumps, CCTV zones, and operational nodes captured during the intake.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {observations.map((observation) => (
                <div key={observation.id} className="rounded-lg border border-border bg-background/40 p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-1 h-4 w-4 text-accent" />
                    <div>
                      <p className="font-medium">{observation.type}</p>
                      <p className="text-sm text-muted-foreground">{observation.description || "Captured infrastructure point"}</p>
                      {observation.latitude && observation.longitude && (
                        <p className="mt-2 font-mono text-xs text-accent">
                          {Number(observation.latitude).toFixed(6)}, {Number(observation.longitude).toFixed(6)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Engineering Notes */}
        {audit.engineeringNotes && (
          <Card className="bg-card border-border mb-8">
            <CardHeader>
              <CardTitle>Engineering Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{audit.engineeringNotes}</p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-card border-border mb-8">
          <CardHeader>
            <CardTitle>Prepare for the CTTX Discovery Call</CardTitle>
            <CardDescription>
              The report should help the reserve manager arrive at the next conversation with the information CTTX needs to make a useful recommendation.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            {decisionPackItems.map((item) => (
              <div key={item} className="rounded-lg border border-border bg-background/40 p-4 text-sm text-muted-foreground">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        {reportConfirmation && (
          <Card className="bg-accent/10 border-accent/50 mb-8">
            <CardHeader>
              <div className="flex items-center gap-2 text-accent">
                <FileText className="h-5 w-5" />
                <CardTitle>Report Request Received</CardTitle>
              </div>
              <CardDescription>
                A downloadable CTTX report pack has been generated for {reportConfirmation.company}. CTTX will review the audit context and contact {reportConfirmation.email} for the next engineering step.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <a href={generatedReportHref} download={generatedReportFileName}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Report Pack
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={generatedReportHtmlHref} download={generatedReportHtmlFileName}>
                  <FileText className="w-4 h-4 mr-2" />
                  PDF-ready HTML
                </a>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (typeof window !== "undefined") window.print();
                }}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print / Save as PDF
              </Button>
              <p className="sm:col-span-3 text-xs text-muted-foreground">
                The downloadable pack mirrors the executive summary, scores, mapped infrastructure points, operational critical locations, pain points, recommendations, and CTTX follow-up workflow shown on this page. The PDF-ready HTML export can be opened and saved as a formatted PDF by the reserve manager or CTTX operations team.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-card border-border border-accent/50">
          <CardContent className="pt-6">
            <Button
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold w-full"
              onClick={() => {
                if (typeof window !== "undefined") window.print();
              }}
            >
              <Printer className="w-4 h-4 mr-2" />
              Download Preliminary Report (PDF)
            </Button>
          </CardContent>
        </Card>

        {/* Lead Capture */}
        {!showLeadForm ? (
          <Card className="bg-card border-border border-accent/50">
            <CardHeader>
              <CardTitle>Request CTTX Follow-up</CardTitle>
              <CardDescription>
                Send your contact details so CTTX can review this audit, confirm the mapped infrastructure context, and advise whether the next step is a desktop validation, field survey, or proposal scoping call.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold w-full"
                onClick={() => setShowLeadForm(true)}
              >
                <Download className="w-4 h-4 mr-2" />
                Request Follow-up and Report
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card border-border border-accent/50">
            <CardHeader>
              <CardTitle>Complete Your Information</CardTitle>
              <CardDescription>CTTX will use this to contact you about the audit and next engineering step.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={leadData.email}
                  onChange={(e) => setLeadData((prev) => ({ ...prev, email: e.target.value }))}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="company">Company Name *</Label>
                <Input
                  id="company"
                  placeholder="Your Organization"
                  value={leadData.company}
                  onChange={(e) => setLeadData((prev) => ({ ...prev, company: e.target.value }))}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="budget">Estimated Monthly Connectivity Budget *</Label>
                <Input
                  id="budget"
                  placeholder="e.g., R50,000 - R100,000"
                  value={leadData.budget}
                  onChange={(e) => setLeadData((prev) => ({ ...prev, budget: e.target.value }))}
                  className="mt-2"
                />
              </div>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowLeadForm(false)}
                  disabled={createLead.isPending}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                  onClick={handleLeadSubmit}
                  disabled={createLead.isPending}
                >
                  {createLead.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {createLead.isPending ? "Sending Follow-up Request..." : "Send Follow-up Request"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
