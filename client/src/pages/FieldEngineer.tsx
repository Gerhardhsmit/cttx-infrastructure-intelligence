import React, { useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { MapPin, Radio, Send, TowerControl, Cable, Camera, SlidersHorizontal, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { MapView } from "@/components/Map";

type ObservationType = "Tower Sighting" | "Fibre Sighting" | "Signal Observation" | "Photo Note";
type ScoreKey = "cisScore" | "tciScore" | "resilienceScore";

type EvidenceFileLike = Pick<File, "name" | "type">;

type CaptureDraft = {
  type: ObservationType;
  latitude: string;
  longitude: string;
  description: string;
  photoUrl: string;
  rsrp: string;
  rsrq: string;
  sinr: string;
  scoreKey: ScoreKey;
  scoreValue: string;
};

const emptyDraft: CaptureDraft = {
  type: "Signal Observation",
  latitude: "",
  longitude: "",
  description: "",
  photoUrl: "",
  rsrp: "",
  rsrq: "",
  sinr: "",
  scoreKey: "cisScore",
  scoreValue: "",
};

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function buildObservationPayload(auditId: number, draft: CaptureDraft) {
  const latitude = parseOptionalNumber(draft.latitude);
  const longitude = parseOptionalNumber(draft.longitude);
  const rsrp = parseOptionalNumber(draft.rsrp);
  const rsrq = parseOptionalNumber(draft.rsrq);
  const sinr = parseOptionalNumber(draft.sinr);

  return {
    auditId,
    type: draft.type,
    latitude,
    longitude,
    description: draft.description.trim() || undefined,
    photoUrl: draft.photoUrl.trim() || undefined,
    signalReadings: draft.type === "Signal Observation" ? { rsrp, rsrq, sinr } : undefined,
  };
}

export function buildScoreOverrideDescription(scoreKey: ScoreKey, scoreValue: string, reason: string) {
  const label = scoreKey === "cisScore" ? "Connectivity Intelligence Score" : scoreKey === "tciScore" ? "Terrain Complexity Index" : "Resilience Score";
  return `Field engineer score override request: ${label} → ${scoreValue}. Rationale: ${reason.trim() || "No field rationale supplied."}`;
}

export function buildEvidenceUploadInput(auditId: number, file: EvidenceFileLike, base64Data: string) {
  return {
    auditId,
    fileName: file.name,
    mimeType: file.type as "image/jpeg" | "image/png" | "image/webp",
    base64Data,
  };
}

export function readEvidenceFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read evidence photo"));
    reader.readAsDataURL(file);
  });
}

export default function FieldEngineer() {
  const params = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const auditId = Number(params.id);
  const hasValidAuditId = Number.isInteger(auditId) && auditId > 0;
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const [draft, setDraft] = useState<CaptureDraft>(emptyDraft);
  const [selectedQuickAction, setSelectedQuickAction] = useState<ObservationType>("Signal Observation");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [isPreparingUpload, setIsPreparingUpload] = useState(false);

  const auditQuery = trpc.audits.getById.useQuery({ id: auditId }, { enabled: hasValidAuditId });
  const observationsQuery = trpc.observations.listByAuditId.useQuery({ auditId }, { enabled: hasValidAuditId });
  const uploadEvidence = trpc.observations.uploadEvidence.useMutation({
    onError: (error) => toast.error(error.message),
  });
  const createObservation = trpc.observations.create.useMutation({
    onSuccess: async () => {
      await utils.observations.listByAuditId.invalidate({ auditId });
      toast.success("Observation synced to the audit record");
    },
    onError: (error) => toast.error(error.message),
  });
  const updateAudit = trpc.audits.update.useMutation({
    onSuccess: async () => {
      await utils.audits.getById.invalidate({ id: auditId });
      await utils.observations.listByAuditId.invalidate({ auditId });
      toast.success("Score override saved with an audit-trail note");
    },
    onError: (error) => toast.error(error.message),
  });

  const audit = auditQuery.data;
  const center = useMemo(() => ({
    lat: Number(audit?.latitude ?? draft.latitude ?? -33.65),
    lng: Number(audit?.longitude ?? draft.longitude ?? 25.78),
  }), [audit?.latitude, audit?.longitude, draft.latitude, draft.longitude]);

  if (loading) {
    return <div className="min-h-screen bg-black p-6 text-white">Loading field engineer session…</div>;
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        <Card className="mx-auto mt-20 max-w-xl border-white/10 bg-zinc-950 text-white">
          <CardHeader>
            <CardTitle>Field Engineer Login Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-zinc-300">
            <p>Signal capture, infrastructure tagging, and score override notes are protected so every field change is attributable.</p>
            <Button asChild className="bg-yellow-400 text-black hover:bg-yellow-300"><a href={getLoginUrl()}>Sign in to field mode</a></Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!hasValidAuditId) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        <Card className="mx-auto mt-20 max-w-xl border-white/10 bg-zinc-950 text-white">
          <CardHeader><CardTitle>Select an audit from the admin dashboard</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-zinc-300">
            <p>Field Engineer Mode opens against a specific audit so captured coordinates, signal readings, and override notes sync to the correct report.</p>
            <Button onClick={() => navigate("/admin")} className="bg-yellow-400 text-black hover:bg-yellow-300">Open admin dashboard</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const uploadSelectedEvidence = async () => {
    if (!evidenceFile) return draft.photoUrl.trim() || undefined;
    if (!["image/jpeg", "image/png", "image/webp"].includes(evidenceFile.type)) {
      toast.error("Upload a JPG, PNG, or WebP evidence photo.");
      return undefined;
    }
    setIsPreparingUpload(true);
    try {
      const base64Data = await readEvidenceFileAsDataUrl(evidenceFile);
      const uploaded = await uploadEvidence.mutateAsync(buildEvidenceUploadInput(auditId, evidenceFile, base64Data));
      toast.success("Evidence photo uploaded to the audit record");
      return uploaded.url;
    } catch {
      toast.error("Evidence photo upload failed. Try again before tagging infrastructure.");
      return undefined;
    } finally {
      setIsPreparingUpload(false);
    }
  };

  const syncObservation = async (typeOverride?: ObservationType) => {
    const nextDraft = { ...draft, type: typeOverride ?? draft.type };
    const payload = buildObservationPayload(auditId, nextDraft);
    if (payload.latitude === undefined || payload.longitude === undefined) {
      toast.error("Capture or enter GPS coordinates before syncing.");
      return;
    }
    await createObservation.mutateAsync(payload);
    setDraft({ ...emptyDraft, latitude: nextDraft.latitude, longitude: nextDraft.longitude, type: nextDraft.type });
  };

  const tagInfrastructure = async () => {
    const type = selectedQuickAction === "Signal Observation" ? "Tower Sighting" : selectedQuickAction;
    if (!evidenceFile && !draft.photoUrl.trim()) {
      toast.error("Attach an evidence photo or paste an evidence reference before tagging infrastructure.");
      return;
    }
    const photoUrl = await uploadSelectedEvidence();
    if (evidenceFile && !photoUrl) return;
    const nextDraft = { ...draft, type, photoUrl: photoUrl ?? draft.photoUrl };
    const payload = buildObservationPayload(auditId, nextDraft);
    if (payload.latitude === undefined || payload.longitude === undefined) {
      toast.error("Capture or enter GPS coordinates before tagging infrastructure.");
      return;
    }
    try {
      await createObservation.mutateAsync(payload);
      setEvidenceFile(null);
      setDraft({ ...emptyDraft, latitude: nextDraft.latitude, longitude: nextDraft.longitude, type });
    } catch {
      // The mutation's onError handler surfaces the server message; keep the draft intact for retry.
    }
  };

  const saveScoreOverride = async () => {
    if (!audit) return;
    const score = parseOptionalNumber(draft.scoreValue);
    if (score === undefined || score < 0 || score > 100) {
      toast.error("Score override must be between 0 and 100.");
      return;
    }
    const description = buildScoreOverrideDescription(draft.scoreKey, draft.scoreValue, draft.description);
    await updateAudit.mutateAsync({ id: auditId, [draft.scoreKey]: score });
    await createObservation.mutateAsync({
      auditId,
      type: "Photo Note",
      latitude: parseOptionalNumber(draft.latitude),
      longitude: parseOptionalNumber(draft.longitude),
      description,
      photoUrl: draft.photoUrl.trim() || undefined,
    });
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 bg-zinc-950/90 px-4 py-3 backdrop-blur md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Button variant="ghost" size="sm" className="mb-2 text-zinc-300 hover:text-white" onClick={() => navigate(audit ? `/audit/${audit.id}` : "/admin")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to report
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Field Engineer Mode</h1>
            <p className="text-sm text-zinc-400">{auditQuery.isLoading ? "Loading audit…" : audit ? `${audit.clientName} · ${audit.sector}` : "Audit unavailable"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-yellow-400 text-black">Authenticated: {user.name || "Field user"}</Badge>
            <Badge variant="outline" className="border-white/20 text-zinc-200">Real-time DB sync</Badge>
          </div>
        </div>
      </header>

      <section className="grid min-h-[calc(100vh-88px)] grid-cols-1 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="relative min-h-[420px] border-b border-white/10 lg:border-b-0 lg:border-r">
          <MapView
            className="h-full min-h-[420px]"
            initialCenter={center}
            initialZoom={13}
            onMapReady={(map) => {
              map.setMapTypeId("hybrid");
              map.addListener("click", (event: google.maps.MapMouseEvent) => {
                const lat = event.latLng?.lat();
                const lng = event.latLng?.lng();
                if (typeof lat === "number" && typeof lng === "number") {
                  setDraft((current) => ({ ...current, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));
                  toast.success("GPS point captured from map");
                }
              });
            }}
          />
          <div className="absolute left-4 top-4 max-w-sm rounded-2xl border border-white/10 bg-black/75 p-4 shadow-2xl backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-yellow-300">Crosshair capture</p>
            <p className="mt-1 text-sm text-zinc-200">Tap the map to pin the latest tower, fibre, signal, or photo-note coordinate.</p>
            <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs text-zinc-300">
              <span>LAT {draft.latitude || "—"}</span>
              <span>LNG {draft.longitude || "—"}</span>
            </div>
          </div>
        </div>

        <aside className="space-y-4 overflow-y-auto bg-zinc-950 p-4 md:p-6">
          <Card className="border-white/10 bg-black text-white">
            <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-yellow-300" /> Capture panel</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Latitude</Label><Input value={draft.latitude} onChange={(event) => setDraft({ ...draft, latitude: event.target.value })} className="bg-zinc-900" /></div>
                <div><Label>Longitude</Label><Input value={draft.longitude} onChange={(event) => setDraft({ ...draft, longitude: event.target.value })} className="bg-zinc-900" /></div>
              </div>
              <div><Label>Observation type</Label><Select value={draft.type} onValueChange={(value: ObservationType) => setDraft({ ...draft, type: value })}><SelectTrigger className="bg-zinc-900"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Signal Observation">Signal Observation</SelectItem><SelectItem value="Tower Sighting">Tower Sighting</SelectItem><SelectItem value="Fibre Sighting">Fibre Sighting</SelectItem><SelectItem value="Photo Note">Photo Note</SelectItem></SelectContent></Select></div>
              <Textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Field notes, visual line-of-sight, access constraints, or contact details…" className="min-h-24 bg-zinc-900" />
              <div><Label>Photo URL or uploaded evidence reference</Label><Input value={draft.photoUrl} onChange={(event) => setDraft({ ...draft, photoUrl: event.target.value })} placeholder="/manus-storage/... or evidence link" className="bg-zinc-900" /></div>
              <div className="space-y-2">
                <Label htmlFor="field-evidence-photo">Native evidence photo upload</Label>
                <Input id="field-evidence-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)} className="cursor-pointer bg-zinc-900 file:mr-3 file:rounded-md file:border-0 file:bg-yellow-400 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-black" />
                <p className="text-xs text-zinc-500">{evidenceFile ? `Selected: ${evidenceFile.name}` : "Attach a tower, fibre, or site photo; the upload is stored server-side and linked to the observation."}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>RSRP</Label><Input value={draft.rsrp} onChange={(event) => setDraft({ ...draft, rsrp: event.target.value })} placeholder="-92" className="bg-zinc-900" /></div>
                <div><Label>RSRQ</Label><Input value={draft.rsrq} onChange={(event) => setDraft({ ...draft, rsrq: event.target.value })} placeholder="-11" className="bg-zinc-900" /></div>
                <div><Label>SINR</Label><Input value={draft.sinr} onChange={(event) => setDraft({ ...draft, sinr: event.target.value })} placeholder="8" className="bg-zinc-900" /></div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button onClick={() => syncObservation("Signal Observation")} disabled={createObservation.isPending} className="bg-yellow-400 text-black hover:bg-yellow-300"><Radio className="mr-2 h-4 w-4" /> Capture Signal</Button>
                <Button onClick={() => syncObservation()} disabled={createObservation.isPending} variant="outline" className="border-white/15 bg-zinc-900 text-white hover:bg-zinc-800"><Send className="mr-2 h-4 w-4" /> Sync observation</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-black text-white">
            <CardHeader><CardTitle>Quick infrastructure tags</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {[
                  ["Tower Sighting", TowerControl],
                  ["Fibre Sighting", Cable],
                  ["Photo Note", Camera],
                ].map(([type, Icon]) => (
                  <Button key={String(type)} variant={selectedQuickAction === type ? "default" : "outline"} className={selectedQuickAction === type ? "bg-yellow-400 text-black hover:bg-yellow-300" : "border-white/15 bg-zinc-900 text-white hover:bg-zinc-800"} onClick={() => { setSelectedQuickAction(type as ObservationType); setDraft({ ...draft, type: type as ObservationType }); }}>
                    <Icon className="mr-2 h-4 w-4" /> {String(type).replace(" Sighting", "")}
                  </Button>
                ))}
              </div>
              <Button onClick={tagInfrastructure} disabled={createObservation.isPending || uploadEvidence.isPending || isPreparingUpload} className="w-full bg-yellow-400 text-black hover:bg-yellow-300">
                <Camera className="mr-2 h-4 w-4" /> {uploadEvidence.isPending || isPreparingUpload ? "Uploading evidence…" : "Tag Infrastructure"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-black text-white">
            <CardHeader><CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-yellow-300" /> Score override request</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={draft.scoreKey} onValueChange={(value: ScoreKey) => setDraft({ ...draft, scoreKey: value })}><SelectTrigger className="bg-zinc-900"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cisScore">CIS</SelectItem><SelectItem value="tciScore">TCI</SelectItem><SelectItem value="resilienceScore">Resilience</SelectItem></SelectContent></Select>
              <Input value={draft.scoreValue} onChange={(event) => setDraft({ ...draft, scoreValue: event.target.value })} placeholder="0–100" className="bg-zinc-900" />
              <Button onClick={saveScoreOverride} disabled={updateAudit.isPending || createObservation.isPending} variant="outline" className="w-full border-yellow-300/50 bg-zinc-900 text-yellow-200 hover:bg-yellow-400 hover:text-black">Save override with audit trail</Button>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-black text-white">
            <CardHeader><CardTitle className="flex items-center gap-2"><Radio className="h-5 w-5 text-yellow-300" /> Synced observations</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {observationsQuery.isLoading ? <p className="text-sm text-zinc-400">Loading observations…</p> : null}
              {(observationsQuery.data ?? []).length === 0 && !observationsQuery.isLoading ? <p className="text-sm text-zinc-400">No field observations synced yet.</p> : null}
              {(observationsQuery.data ?? []).map((observation) => (
                <article key={observation.id} className="rounded-xl border border-white/10 bg-zinc-900 p-3">
                  <div className="mb-1 flex items-center justify-between gap-2"><Badge variant="outline" className="border-white/20 text-zinc-200">{observation.type}</Badge><span className="font-mono text-xs text-zinc-500">#{observation.id}</span></div>
                  <p className="text-sm text-zinc-300">{observation.description || "No description supplied."}</p>
                  <p className="mt-2 font-mono text-xs text-zinc-500">{observation.latitude ?? "—"}, {observation.longitude ?? "—"}</p>
                  {observation.photoUrl ? <a href={observation.photoUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-semibold text-yellow-300 underline">View evidence photo</a> : null}
                </article>
              ))}
            </CardContent>
          </Card>
        </aside>
      </section>
    </main>
  );
}
