import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, Edit2, Trash2, ClipboardList, Save, X, UploadCloud } from "lucide-react";
import { toast } from "sonner";

type AuditRow = {
  id: number;
  clientName: string;
  sector: string;
  cisScore?: number | null;
  tciScore?: number | null;
  resilienceScore?: number | null;
  status?: string | null;
};

type AuditStatus = "Draft" | "Published";

type ScoreDraft = {
  cisScore: number;
  tciScore: number;
  resilienceScore: number;
  status: AuditStatus;
};

function clampScore(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function ObservationReviewPanel({ auditId, open }: { auditId: number; open: boolean }) {
  const { data: observations, isLoading } = trpc.observations.listByAuditId.useQuery({ auditId }, { enabled: open });

  if (!open) return null;

  return (
    <tr className="border-b border-border bg-black/20">
      <td colSpan={8} className="px-4 py-4">
        <div className="rounded-lg border border-border bg-background/80 p-4" data-testid={`observation-review-${auditId}`}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Field observation review</h3>
              <p className="text-xs text-muted-foreground">
                Review captured tower, fibre, signal, and photo-note evidence before confirming engineering recommendations.
              </p>
            </div>
            <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
              {observations?.length ?? 0} records
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading observations…
            </div>
          ) : observations && observations.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {observations.map((observation: any) => (
                <article key={observation.id} className="rounded-md border border-border bg-card p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-accent">{observation.type}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">#{observation.id}</span>
                  </div>
                  <p className="mb-2 text-sm text-muted-foreground">{observation.description || "No description captured."}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {observation.latitude ?? "—"}, {observation.longitude ?? "—"}
                  </p>
                  {observation.signalReadings ? (
                    <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                      <span>RSRP {observation.signalReadings.rsrp ?? "—"}</span>
                      <span>RSRQ {observation.signalReadings.rsrq ?? "—"}</span>
                      <span>SINR {observation.signalReadings.sinr ?? "—"}</span>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No field observations have been captured for this audit yet.</p>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { data: audits, isLoading } = trpc.audits.list.useQuery({ limit: 100 });
  const deleteAudit = trpc.audits.delete.useMutation();
  const updateAudit = trpc.audits.update.useMutation();
  const { data: sourceStatus } = trpc.infrastructureAssets.sourceStatus.useQuery();
  const importVerifiedInventory = trpc.infrastructureAssets.importVerified.useMutation();
  const importFromConfiguredSource = trpc.infrastructureAssets.importFromConfiguredSource.useMutation();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [reviewAuditId, setReviewAuditId] = useState<number | null>(null);
  const [scoreDrafts, setScoreDrafts] = useState<Record<number, ScoreDraft>>({});
  const [inventoryJson, setInventoryJson] = useState("");
  const [lastImportStatus, setLastImportStatus] = useState<{ imported: number; skipped: number; errors: Array<{ index: number; reason: string }> } | null>(null);

  useEffect(() => {
    if (!audits) return;
    setScoreDrafts((current) => {
      const next = { ...current };
      audits.forEach((audit: AuditRow) => {
        if (!next[audit.id]) {
          next[audit.id] = {
            cisScore: audit.cisScore ?? 0,
            tciScore: audit.tciScore ?? 0,
            resilienceScore: audit.resilienceScore ?? 0,
            status: audit.status === "Published" ? "Published" : "Draft",
          };
        }
      });
      return next;
    });
  }, [audits]);

  const auditStats = useMemo(() => {
    const allAudits = audits ?? [];
    return {
      total: allAudits.length,
      published: allAudits.filter((a: AuditRow) => a.status === "Published").length,
      drafts: allAudits.filter((a: AuditRow) => a.status === "Draft").length,
      averageCis: allAudits.length > 0
        ? Math.round(allAudits.reduce((sum: number, a: AuditRow) => sum + (a.cisScore || 0), 0) / allAudits.length)
        : 0,
    };
  }, [audits]);

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You need admin privileges to access this page.</p>
          <Button onClick={() => setLocation("/")} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this audit?")) return;

    try {
      await deleteAudit.mutateAsync({ id });
      await utils.audits.list.invalidate();
      toast.success("Audit deleted successfully");
    } catch (error) {
      toast.error("Failed to delete audit");
    }
  };

  const updateScoreDraft = (auditId: number, field: keyof ScoreDraft, value: string) => {
    setScoreDrafts((current) => ({
      ...current,
      [auditId]: {
        ...(current[auditId] ?? { cisScore: 0, tciScore: 0, resilienceScore: 0, status: "Draft" as AuditStatus }),
        [field]: clampScore(Number(value)),
      },
    }));
  };

  const updateStatusDraft = (auditId: number, status: AuditStatus) => {
    setScoreDrafts((current) => ({
      ...current,
      [auditId]: {
        ...(current[auditId] ?? { cisScore: 0, tciScore: 0, resilienceScore: 0, status: "Draft" as AuditStatus }),
        status,
      },
    }));
  };

  const handleVerifiedInventoryImport = async () => {
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

  const handleConfiguredSourceImport = async () => {
    try {
      const result = await importFromConfiguredSource.mutateAsync();
      setLastImportStatus(result);
      toast.success(`Configured source import completed: ${result.imported} imported, ${result.skipped} skipped, ${result.errors.length} errors`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Configured source import failed.";
      toast.error(message);
      setLastImportStatus({ imported: 0, skipped: 0, errors: [{ index: -1, reason: message }] });
    }
  };

  const handleSaveScores = async (audit: AuditRow) => {
    const draft = scoreDrafts[audit.id];
    if (!draft) return;

    try {
      await updateAudit.mutateAsync({
        id: audit.id,
        cisScore: clampScore(draft.cisScore),
        tciScore: clampScore(draft.tciScore),
        resilienceScore: clampScore(draft.resilienceScore),
        status: draft.status,
      });
      await utils.audits.list.invalidate();
      setEditingId(null);
      toast.success("Score override saved for engineering review");
    } catch (error) {
      toast.error("Failed to save score override");
    }
  };

  const startScoreOverride = (audit: AuditRow) => {
    setScoreDrafts((current) => ({
      ...current,
      [audit.id]: {
        cisScore: audit.cisScore ?? 0,
        tciScore: audit.tciScore ?? 0,
        resilienceScore: audit.resilienceScore ?? 0,
        status: audit.status === "Published" ? "Published" : "Draft",
      },
    }));
    setEditingId(audit.id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage audits, score overrides, field observations, and leads from the CTTX console.</p>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
  
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
            <div className="rounded-lg border border-border bg-background/70 p-3 text-sm" data-testid="verified-inventory-source-status">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">Secure source connection: {sourceStatus?.configured ? "Configured" : "Not configured"}</p>
                  <p className="text-xs text-muted-foreground">
                    {sourceStatus?.endpointHost ? `Endpoint host: ${sourceStatus.endpointHost}` : "Add server-side source URL and token secrets before direct database import."}
                  </p>
                </div>
                <span className="rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">{sourceStatus?.authMode ?? "none"}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{sourceStatus?.credentialPolicy ?? "Credentials are kept outside the browser."}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={handleConfiguredSourceImport} disabled={importFromConfiguredSource.isPending || !sourceStatus?.configured} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                {importFromConfiguredSource.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                Import from configured source
              </Button>
              <Button type="button" onClick={handleVerifiedInventoryImport} disabled={importVerifiedInventory.isPending || !inventoryJson.trim()} variant="outline" className="gap-2">
                {importVerifiedInventory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                Import pasted JSON snapshot
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

        <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Audits</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{auditStats.total}</div></CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Published</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-accent">{auditStats.published}</div></CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-muted-foreground">{auditStats.drafts}</div></CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg CIS Score</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{auditStats.averageCis}</div></CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>All Audits</CardTitle>
            <CardDescription>Manage score overrides, review field evidence, and open audit reports.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold">Client</th>
                    <th className="text-left py-3 px-4 font-semibold">Sector</th>
                    <th className="text-left py-3 px-4 font-semibold">CIS</th>
                    <th className="text-left py-3 px-4 font-semibold">TCI</th>
                    <th className="text-left py-3 px-4 font-semibold">Resilience</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Evidence</th>
                    <th className="text-left py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {audits && audits.length > 0 ? (
                    audits.flatMap((audit: AuditRow) => {
                      const draft = scoreDrafts[audit.id] ?? {
                        cisScore: audit.cisScore ?? 0,
                        tciScore: audit.tciScore ?? 0,
                        resilienceScore: audit.resilienceScore ?? 0,
                        status: audit.status === "Published" ? "Published" : "Draft",
                      };
                      const isEditing = editingId === audit.id;
                      const isReviewOpen = reviewAuditId === audit.id;
                      return [
                        <tr key={audit.id} className="border-b border-border hover:bg-card/50 transition">
                          <td className="py-3 px-4">{audit.clientName}</td>
                          <td className="py-3 px-4 text-muted-foreground">{audit.sector}</td>
                          <td className="py-3 px-4">
                            {isEditing ? (
                              <input aria-label={`CIS score for ${audit.clientName}`} className="w-16 rounded border border-border bg-background px-2 py-1 font-mono" min={0} max={100} type="number" value={draft.cisScore} onChange={(event) => updateScoreDraft(audit.id, "cisScore", event.target.value)} />
                            ) : <span className="font-semibold text-accent">{audit.cisScore || 0}</span>}
                          </td>
                          <td className="py-3 px-4">
                            {isEditing ? (
                              <input aria-label={`TCI score for ${audit.clientName}`} className="w-16 rounded border border-border bg-background px-2 py-1 font-mono" min={0} max={100} type="number" value={draft.tciScore} onChange={(event) => updateScoreDraft(audit.id, "tciScore", event.target.value)} />
                            ) : audit.tciScore || 0}
                          </td>
                          <td className="py-3 px-4">
                            {isEditing ? (
                              <input aria-label={`Resilience score for ${audit.clientName}`} className="w-16 rounded border border-border bg-background px-2 py-1 font-mono" min={0} max={100} type="number" value={draft.resilienceScore} onChange={(event) => updateScoreDraft(audit.id, "resilienceScore", event.target.value)} />
                            ) : `${audit.resilienceScore || 0}%`}
                          </td>
                          <td className="py-3 px-4">
                            {isEditing ? (
                              <select aria-label={`Status for ${audit.clientName}`} className="rounded border border-border bg-background px-2 py-1 text-xs" value={draft.status} onChange={(event) => updateStatusDraft(audit.id, event.target.value as AuditStatus)}>
                                <option value="Draft">Draft</option>
                                <option value="Published">Published</option>
                              </select>
                            ) : (
                              <span className={`px-2 py-1 rounded text-xs font-medium ${audit.status === "Published" ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"}`}>{audit.status}</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Button size="sm" variant="outline" onClick={() => setReviewAuditId(isReviewOpen ? null : audit.id)} className="h-8 gap-2 bg-transparent">
                              <ClipboardList className="w-4 h-4" />
                              {isReviewOpen ? "Hide evidence" : "Review evidence"}
                            </Button>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-2">
                              {isEditing ? (
                                <>
                                  <Button size="sm" variant="ghost" onClick={() => handleSaveScores(audit)} disabled={updateAudit.isPending} className="h-8 gap-1 text-accent">
                                    <Save className="w-4 h-4" /> Save
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 gap-1">
                                    <X className="w-4 h-4" /> Cancel
                                  </Button>
                                </>
                              ) : (
                                <Button size="sm" variant="ghost" onClick={() => startScoreOverride(audit)} className="h-8 gap-1">
                                  <Edit2 className="w-4 h-4" /> Override scores
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => setLocation(`/audit/${audit.id}`)} className="h-8 gap-1">
                                <Edit2 className="w-4 h-4" /> Open
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(audit.id)} disabled={deleteAudit.isPending} className="h-8 gap-1 text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" /> Delete
                              </Button>
                            </div>
                          </td>
                        </tr>,
                        <ObservationReviewPanel key={`${audit.id}-observations`} auditId={audit.id} open={isReviewOpen} />,
                      ];
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">No audits yet. Start by creating one!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
