/* @vitest-environment jsdom */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAudit, deleteAudit, getAuditById } from "../../../server/db";
import AuditDashboard from "./AuditDashboard";

const mocks = vi.hoisted(() => ({
  audit: undefined as any,
  createLeadMutateAsync: vi.fn(),
}));

vi.mock("wouter", () => ({
  useParams: () => ({ id: mocks.audit?.id?.toString() ?? "0" }),
  useLocation: () => [mocks.audit?.id ? `/audit/${mocks.audit.id}` : "/audit/0", vi.fn()],
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/components/InfrastructureMap", async () => {
  const actual = await vi.importActual<typeof import("@/components/InfrastructureMap")>("@/components/InfrastructureMap");
  return {
    ...actual,
    default: () => <div data-testid="infrastructure-map">Infrastructure map stub</div>,
  };
});

vi.mock("@/lib/trpc", () => ({
  trpc: {
    audits: {
      getById: {
        useQuery: () => ({ data: mocks.audit, isLoading: false }),
      },
    },
    observations: {
      listByAuditId: {
        useQuery: () => ({ data: [], isLoading: false }),
      },
    },
    operationalCriticalLocations: {
      listByAuditId: {
        useQuery: () => ({ data: [], isLoading: false }),
      },
    },
    operationalPainPoints: {
      listByAuditId: {
        useQuery: () => ({ data: [], isLoading: false }),
      },
    },
    infrastructureAssets: {
      listNearby: {
        useQuery: () => ({ data: [], isLoading: false }),
      },
    },
    leads: {
      create: {
        useMutation: () => ({ mutateAsync: mocks.createLeadMutateAsync, isPending: false }),
      },
    },
  },
}));

describe("AuditDashboard persisted TCI profile rendering", () => {
  afterEach(async () => {
    if (mocks.audit?.id) {
      await deleteAudit(mocks.audit.id);
    }
    mocks.audit = undefined;
    mocks.createLeadMutateAsync.mockReset();
  });

  it("renders dashboard TCI geometry from a real post-fix create/get audit fetch", async () => {
    if (!process.env.DATABASE_URL) {
      return;
    }

    const persistedSamples = [
      { distancePercent: 0, elevationPercent: 25, source: "site" },
      { distancePercent: 25, elevationPercent: 38, source: "valley" },
      { distancePercent: 50, elevationPercent: 63, source: "distribution" },
      { distancePercent: 75, elevationPercent: 82, source: "ridge" },
      { distancePercent: 100, elevationPercent: 45, source: "egress" },
    ];
    const persistedZones = [
      {
        key: "liveRidge",
        label: "Live fetched ridge obstruction",
        severity: "High",
        startPercent: 62,
        endPercent: 84,
        elevationPercent: 82,
        evidence: "Persisted TCI geometry was fetched after the schema fix.",
      },
    ];

    const created = await createAudit({
      clientName: `Dashboard Persistence Regression ${Date.now()}`,
      sector: "Game Reserve",
      latitude: "-33.18420000",
      longitude: "26.56980000",
      propertySizeHa: 22000,
      operationalZones: ["Main lodge", "Ridge relay"],
      currentConnectivity: "Microwave, LTE, Starlink",
      knownProblems: ["Ridge obstruction", "Weak valley signal"],
      infrastructureNotes: "Integration fixture for rendered TCI profile geometry.",
      cisScore: 74,
      tciScore: 71,
      resilienceScore: 83,
      cisSubMetrics: [
        { key: "fibreProximity", label: "Fibre Proximity", value: 76, evidence: "Persisted fixture" },
        { key: "signalQuality", label: "Signal Quality", value: 68, evidence: "Persisted fixture" },
        { key: "backhaulType", label: "Backhaul Type", value: 81, evidence: "Persisted fixture" },
      ],
      tciObstructionZones: persistedZones,
      tciProfileSamples: persistedSamples,
      primaryArchitecture: "Microwave relay with managed lodge distribution",
      backupArchitecture: "Starlink failover",
      engineeringNotes: "Persisted geometry should drive the rendered dashboard profile path.",
      status: "Draft",
    } as any);

    expect(created?.id).toBeTypeOf("number");

    const fetched = await getAuditById(created!.id);
    expect(fetched?.tciProfileSamples).toEqual(persistedSamples);
    expect(fetched?.tciObstructionZones).toEqual(persistedZones);

    mocks.audit = fetched;
    const html = renderToStaticMarkup(<AuditDashboard />);

    expect(html).toContain('data-profile-path="0% 75%, 25% 62%, 50% 37%, 75% 18%, 100% 55%"');
    expect(html).toContain('data-profile-sample-count="5"');
    expect(html).toContain('data-start-percent="62"');
    expect(html).toContain('data-end-percent="84"');
    expect(html).toContain('data-elevation-percent="82"');
    expect(html).toContain("Live fetched ridge obstruction High obstruction zone");
  });
});
