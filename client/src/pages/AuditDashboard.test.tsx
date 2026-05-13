/* @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import AuditDashboard from "./AuditDashboard";

const mocks = vi.hoisted(() => ({
  createLeadMutateAsync: vi.fn(),
  leadMutationIsPending: false,
  audit: {
    id: 90001,
    clientName: "Kwandwe Private Game Reserve",
    sector: "Game Reserve",
    latitude: "-33.184200",
    longitude: "26.569800",
    propertySizeHa: 22000,
    operationalZones: ["Main lodge", "Gate"],
    currentConnectivity: "Existing LTE and intermittent Wi-Fi",
    knownProblems: ["No signal in some areas", "Load-shedding interruptions"],
    infrastructureNotes: "Potential high-site handoff should be validated by CTTX engineering.",
    cisScore: 72,
    tciScore: 68,
    resilienceScore: 62,
    cisSubMetrics: [
      { key: "fibreProximity", label: "Fibre Proximity", value: 82, evidence: "Fibre handoff evidence captured in intake data." },
      { key: "signalQuality", label: "Signal Quality", value: 66, evidence: "Known signal-risk problems reduce the preliminary quality estimate." },
      { key: "backhaulType", label: "Backhaul Type", value: 74, evidence: "Recognised backhaul options were identified in the submitted connectivity notes." },
    ],
    tciObstructionZones: [
      { key: "valleyShadow", label: "Valley shadow", severity: "Medium", startPercent: 18, endPercent: 47, elevationPercent: 49, evidence: "No-signal evidence appears in the submitted site context." },
      { key: "ridgeObstruction", label: "Ridge obstruction", severity: "High", startPercent: 45, endPercent: 80, elevationPercent: 72, evidence: "Ridge or high-site evidence appears in the submitted site context." },
    ],
    tciProfileSamples: [
      { distancePercent: 0, elevationPercent: 28, source: "site" },
      { distancePercent: 18, elevationPercent: 24, source: "valley" },
      { distancePercent: 42, elevationPercent: 56, source: "distribution" },
      { distancePercent: 68, elevationPercent: 72, source: "ridge" },
      { distancePercent: 100, elevationPercent: 42, source: "egress" },
    ],
    primaryArchitecture: "Fibre or dark-fibre handoff into a managed point-of-presence, extended across the property with licensed microwave or private LTE sectors.",
    backupArchitecture: "Add Starlink or another independent satellite failover path for outage resilience while terrestrial infrastructure is being confirmed.",
    engineeringNotes: "Preliminary infrastructure intelligence generated from intake data.",
    status: "Draft",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  operationalCriticalLocations: [
    {
      id: 11,
      auditId: 90001,
      name: "Eastern anti-poaching high site",
      locationType: "Anti-Poaching Point",
      priority: "Critical",
      latitude: "-33.201000",
      longitude: "26.601000",
      connectivityRequirement: "Always-on radio and sensor backhaul",
      businessImpact: "Supports rapid wildlife-threat response",
      notes: "Line-of-sight should be confirmed by CTTX engineering.",
      reserveSiteType: "anti_poaching_point",
      topologyRole: "Repeater / sensor aggregation node",
      businessDrivers: ["threats", "operations"],
    },
  ],
  operationalPainPoints: [
    {
      id: 21,
      auditId: 90001,
      title: "Guest lodge Wi-Fi drops during peak occupancy",
      category: "Guest Experience",
      severity: "High",
      affectedLocation: "Main lodge",
      description: "Guest connectivity degrades in the evening.",
      businessImpact: "Impacts hospitality reviews and staff escalation workload.",
      businessDrivers: ["hospitality", "operations"],
    },
  ],
  observations: [
    {
      id: 1,
      auditId: 90001,
      type: "fibre_sighting",
      latitude: "-33.184200",
      longitude: "26.569800",
      description: "Candidate backhaul handoff — Potential handoff site",
      photoUrl: null,
      signalReadings: null,
      createdAt: Date.now(),
    },
    {
      id: 2,
      auditId: 90001,
      type: "photo_note",
      latitude: "-33.184200",
      longitude: "26.569800",
      description: "Main lodge — Operational zone: Captured from operational-zone pin drop.",
      photoUrl: null,
      signalReadings: null,
      createdAt: Date.now(),
    },
  ],
}));

vi.mock("wouter", () => ({
  useParams: () => ({ id: "90001" }),
  useLocation: () => ["/audit/90001", vi.fn()],
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
        useQuery: () => ({ data: mocks.observations, isLoading: false }),
      },
    },
    operationalCriticalLocations: {
      listByAuditId: {
        useQuery: () => ({ data: mocks.operationalCriticalLocations, isLoading: false }),
      },
    },
    operationalPainPoints: {
      listByAuditId: {
        useQuery: () => ({ data: mocks.operationalPainPoints, isLoading: false }),
      },
    },
    infrastructureAssets: {
      listNearby: {
        useQuery: () => ({ data: [], isLoading: false }),
      },
    },
    leads: {
      create: {
        useMutation: () => ({ mutateAsync: mocks.createLeadMutateAsync, isPending: mocks.leadMutationIsPending }),
      },
    },
  },
}));

describe("AuditDashboard report output", () => {
  beforeEach(() => {
    mocks.leadMutationIsPending = false;
    mocks.createLeadMutateAsync.mockResolvedValue({ id: 501 });
    vi.spyOn(window, "print").mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    mocks.createLeadMutateAsync.mockReset();
  });

  it("renders the reserve-manager summary, recommendations, follow-up workflow, and contact/action guidance", () => {
    const html = renderToStaticMarkup(<AuditDashboard />);

    expect(html).toContain("CIS sub-metric breakdown");
    expect(html).toContain("Fibre Proximity");
    expect(html).toContain("Signal Quality");
    expect(html).toContain("Backhaul Type");
    expect(html).toContain("TCI elevation profile obstruction overlay");
    expect(html).toContain("TCI obstruction zone highlights");
    expect(html).toContain("Valley shadow Medium obstruction zone");
    expect(html).toContain("Ridge obstruction High obstruction zone");
    expect(html).toContain("No-signal evidence appears in the submitted site context");
    expect(html).toContain('data-profile-path="0% 72%, 18% 76%, 42% 44%, 68% 28%, 100% 58%"');
    expect(html).toContain('data-profile-sample-count="5"');
    expect(html).toContain('data-start-percent="45"');
    expect(html).toContain('data-end-percent="80"');
    expect(html).toContain('data-elevation-percent="72"');
    expect(html).toContain("What the Reserve Manager Receives");
    expect(html).toContain("first-pass connectivity pathway");
    expect(html).toContain("13 mapped points");
    expect(html).not.toContain("2 mapped points");
    expect(html).toContain("Recommended next decision");
    expect(html).toContain("Reserve Manager Recommendations");
    expect(html).toContain("validate the preferred backhaul path");
    expect(html).toContain("Who Contacts Whom?");
    expect(html).toContain("CTTX contacts the submitted email");
    expect(html).toContain("Prepare for the CTTX Discovery Call");
    expect(html).toContain("Current provider names");
    expect(html).toContain("Request CTTX Follow-up");
    expect(html).toContain("Three Business Driver Framework");
    expect(html).toContain("Threats");
    expect(html).toContain("Hospitality");
    expect(html).toContain("Operations");
    expect(html).toContain("Eastern anti-poaching high site");
    expect(html).toContain("Anti-poaching observation point");
    expect(html).toContain("Repeater / sensor aggregation node");
    expect(html).toContain("Guest lodge Wi-Fi drops during peak occupancy");
  });

  it("renders preliminary estimate labels beneath all three score displays", () => {
    render(<AuditDashboard />);

    expect(screen.getAllByText("Preliminary estimate — field survey required before accuracy confirmed")).toHaveLength(3);
  });

  it("renders an accent-styled preliminary PDF button above the follow-up CTA and calls print", () => {
    render(<AuditDashboard />);

    const preliminaryPdfButton = screen.getByRole("button", { name: /download preliminary report \(pdf\)/i });
    expect(preliminaryPdfButton.className).toContain("bg-accent");
    expect(preliminaryPdfButton.className).toContain("hover:bg-accent/90");
    expect(preliminaryPdfButton.className).toContain("text-accent-foreground");
    expect(preliminaryPdfButton.className).toContain("font-bold");

    fireEvent.click(preliminaryPdfButton);
    expect(window.print).toHaveBeenCalledOnce();

    const followUpButton = screen.getByRole("button", { name: /request follow-up and report/i });
    expect(followUpButton.className).toContain("bg-accent");
    expect(followUpButton.className).toContain("hover:bg-accent/90");
    expect(followUpButton.className).toContain("text-accent-foreground");
    expect(followUpButton.className).toContain("font-bold");
  });

  it("submits the lead gate and renders the generated report confirmation with download and print actions", async () => {
    render(<AuditDashboard />);

    fireEvent.click(screen.getByRole("button", { name: /request follow-up and report/i }));
    expect(screen.queryByRole("link", { name: /download report pack/i })).toBeNull();
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "manager@kwandwe.example" } });
    fireEvent.change(screen.getByLabelText(/company name/i), { target: { value: "Kwandwe Operations" } });
    fireEvent.change(screen.getByLabelText(/estimated monthly connectivity budget/i), { target: { value: "R50,000 - R100,000" } });
    fireEvent.click(screen.getByRole("button", { name: /send follow-up request/i }));

    await waitFor(() => {
      expect(mocks.createLeadMutateAsync).toHaveBeenCalledWith({
        auditId: 90001,
        email: "manager@kwandwe.example",
        company: "Kwandwe Operations",
        budget: "R50,000 - R100,000",
      });
    });

    expect(await screen.findByText("Report Request Received")).toBeTruthy();
    expect(screen.getByText(/downloadable CTTX report pack has been generated for Kwandwe Operations/i)).toBeTruthy();
    expect(screen.getByText(/contact manager@kwandwe\.example/i)).toBeTruthy();

    const downloadLink = screen.getByRole("link", { name: /download report pack/i });
    expect(downloadLink.getAttribute("download")).toBe("kwandwe-private-game-reserve-audit-90001-cttx-report.md");
    expect(downloadLink.getAttribute("href")).toContain("data:text/markdown;charset=utf-8");
    expect(downloadLink.getAttribute("href")).toContain("CTTX%20Reserve%20Connectivity%20Intelligence%20Report");
    expect(downloadLink.getAttribute("href")).toContain("Three%20business%20driver%20framework");
    expect(downloadLink.getAttribute("href")).toContain("Threats");
    expect(downloadLink.getAttribute("href")).toContain("Eastern%20anti-poaching%20high%20site");

    const pdfReadyLink = screen.getByRole("link", { name: /pdf-ready html/i });
    expect(pdfReadyLink.getAttribute("download")).toBe("kwandwe-private-game-reserve-audit-90001-cttx-pdf-ready-report.html");
    expect(pdfReadyLink.getAttribute("href")).toContain("data:text/html;charset=utf-8");
    expect(pdfReadyLink.getAttribute("href")).toContain("PDF-ready%20report");
    expect(pdfReadyLink.getAttribute("href")).toContain("Three%20business%20driver%20framework");
    expect(pdfReadyLink.getAttribute("href")).toContain("Hospitality");

    const printButton = screen.getByRole("button", { name: /print \/ save as pdf/i });
    fireEvent.click(printButton);
    expect(window.print).toHaveBeenCalledOnce();
  });

  it("keeps the lead gate disabled with loading copy while lead submission is pending", () => {
    mocks.leadMutationIsPending = true;

    render(<AuditDashboard />);

    fireEvent.click(screen.getByRole("button", { name: /request follow-up and report/i }));

    const submitButton = screen.getByRole("button", { name: /sending follow-up request/i }) as HTMLButtonElement;
    const cancelButton = screen.getByRole("button", { name: /cancel/i }) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);
    expect(cancelButton.disabled).toBe(true);
    expect(screen.queryByText("Report Request Received")).toBeNull();
    expect(screen.queryByRole("link", { name: /download report pack/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /pdf-ready html/i })).toBeNull();
  });

  it("surfaces lead submission failures without rendering a false report confirmation", async () => {
    mocks.createLeadMutateAsync.mockRejectedValueOnce(new Error("Lead service unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(<AuditDashboard />);

    fireEvent.click(screen.getByRole("button", { name: /request follow-up and report/i }));
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "manager@kwandwe.example" } });
    fireEvent.change(screen.getByLabelText(/company name/i), { target: { value: "Kwandwe Operations" } });
    fireEvent.change(screen.getByLabelText(/estimated monthly connectivity budget/i), { target: { value: "R50,000 - R100,000" } });
    fireEvent.click(screen.getByRole("button", { name: /send follow-up request/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to submit lead");
    });

    expect(consoleError).toHaveBeenCalled();
    expect(screen.queryByText("Report Request Received")).toBeNull();
    expect(screen.queryByRole("link", { name: /download report pack/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /pdf-ready html/i })).toBeNull();
    expect(screen.getByRole("button", { name: /send follow-up request/i })).toBeTruthy();
  });
});
