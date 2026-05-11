import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Activity, RadioTower, Radar, Route, ShieldCheck, SignalHigh } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const ANALYSIS_STEP_DURATION_MS = 900;

const ANALYSIS_STEPS = [
  {
    label: "Querying 28East Fibre",
    detail: "Checking likely terrestrial handoff paths near the submitted property pin.",
    icon: Route,
  },
  {
    label: "Fetching CloudRF Terrain",
    detail: "Preparing a terrain-aware line-of-sight context for ridges, valleys, and operational zones.",
    icon: Radar,
  },
  {
    label: "Modeling Signal Propagation",
    detail: "Comparing candidate tower, microwave, and infrastructure discovery points.",
    icon: RadioTower,
  },
  {
    label: "Calculating Resilience Score",
    detail: "Weighting backup paths, load-shedding risk, sector needs, and known failure modes.",
    icon: ShieldCheck,
  },
];

export function getAnalysisStepForElapsed(elapsedMs: number) {
  return Math.min(ANALYSIS_STEPS.length - 1, Math.max(0, Math.floor(elapsedMs / ANALYSIS_STEP_DURATION_MS)));
}

export default function AnalyzingScreen() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const auditId = params.id;
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const routeToReport = useMemo(() => `/audit/${auditId || ""}`, [auditId]);
  const activeStep = ANALYSIS_STEPS[activeStepIndex];
  const progressWidth = `${((activeStepIndex + 1) / ANALYSIS_STEPS.length) * 100}%`;

  useEffect(() => {
    const startedAt = Date.now();
    const stepTimer = window.setInterval(() => {
      setActiveStepIndex(getAnalysisStepForElapsed(Date.now() - startedAt));
    }, 180);

    return () => window.clearInterval(stepTimer);
  }, []);

  useEffect(() => {
    if (!auditId) return;

    const timer = window.setTimeout(() => {
      setLocation(routeToReport);
    }, 3800);

    return () => window.clearTimeout(timer);
  }, [auditId, routeToReport, setLocation]);

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.16),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.16),transparent_28%),linear-gradient(135deg,rgba(255,230,0,0.06),transparent_42%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:42px_42px] opacity-40" />

      <section className="container relative flex min-h-screen max-w-6xl items-center py-12">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-7">
            <div className="inline-flex items-center rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent shadow-[0_0_24px_rgba(34,197,94,0.18)]">
              <SignalHigh className="mr-2 h-4 w-4" />
              Infrastructure Intelligence Engine Active
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.36em] text-muted-foreground">Audit #{auditId}</p>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-6xl">
                Analyzing Infrastructure
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                CTTX is converting your location pins, operational zones, known issues, and infrastructure notes into a preliminary connectivity intelligence report. The next screen will show actionable recommendations for the reserve manager.
              </p>
            </div>

            <Card className="border-accent/30 bg-card/80 shadow-2xl shadow-accent/5 backdrop-blur">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-semibold text-foreground">{activeStep.label}</span>
                  <span className="text-accent">Opening in a few seconds</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{activeStep.detail}</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-accent via-[#FFE600] to-[#3B82F6] transition-all duration-500"
                    style={{ width: progressWidth }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-[520px]">
            <div className="absolute inset-6 rounded-full border border-accent/25" />
            <div className="absolute inset-16 animate-spin rounded-full border border-dashed border-[#3B82F6]/45 [animation-duration:9s]" />
            <div className="absolute inset-28 animate-spin rounded-full border border-dashed border-accent/55 [animation-duration:6s] [animation-direction:reverse]" />
            <div className="absolute left-1/2 top-1/2 flex h-40 w-40 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-accent/50 bg-card/90 shadow-[0_0_48px_rgba(34,197,94,0.24)]">
              <Activity className="h-16 w-16 animate-pulse text-accent" />
            </div>
            <div className="absolute left-[17%] top-[20%] h-3 w-3 rounded-full bg-[#FFE600] shadow-[0_0_18px_rgba(255,230,0,0.85)]" />
            <div className="absolute right-[18%] top-[34%] h-3 w-3 rounded-full bg-accent shadow-[0_0_18px_rgba(34,197,94,0.85)]" />
            <div className="absolute bottom-[22%] left-[28%] h-3 w-3 rounded-full bg-[#3B82F6] shadow-[0_0_18px_rgba(59,130,246,0.85)]" />
            <div className="absolute bottom-[18%] right-[28%] h-3 w-3 rounded-full bg-accent shadow-[0_0_18px_rgba(34,197,94,0.85)]" />
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 grid w-[calc(100%-2rem)] max-w-6xl -translate-x-1/2 gap-3 md:grid-cols-4">
          {ANALYSIS_STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card
                key={step.label}
                className={`bg-card/85 backdrop-blur transition-all duration-300 ${
                  index === activeStepIndex ? "border-accent/70 shadow-lg shadow-accent/10" : "border-border/80"
                }`}
              >
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <Icon className={`h-5 w-5 ${index === activeStepIndex ? "text-accent" : "text-muted-foreground"}`} />
                    <span className={`text-xs font-semibold ${index === activeStepIndex ? "text-accent" : "text-muted-foreground"}`}>0{index + 1}</span>
                  </div>
                  <h2 className="text-sm font-bold">{step.label}</h2>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{step.detail}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </main>
  );
}
