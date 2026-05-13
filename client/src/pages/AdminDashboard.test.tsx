// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminDashboard from "./AdminDashboard";

const mocks = vi.hoisted(() => ({
  setLocation: vi.fn(),
  updateAuditMutateAsync: vi.fn(),
  deleteAuditMutateAsync: vi.fn(),
  importVerifiedInventoryMutateAsync: vi.fn(),
  importFromConfiguredSourceMutateAsync: vi.fn(),
  sourceStatus: {
    configured: true,
    sourceName: "Existing CTTX verified inventory database",
    endpointHost: "inventory.cttx.example",
    authMode: "server-token",
    credentialPolicy: "Credentials are read only from server-side environment secrets and are never rendered, stored, or accepted in the browser.",
    requiredSecrets: ["CTTX_VERIFIED_INVENTORY_SOURCE_URL", "CTTX_VERIFIED_INVENTORY_SOURCE_TOKEN", "CTTX_VERIFIED_INVENTORY_SOURCE"],
  },
  invalidateAuditList: vi.fn(),
  currentUser: { role: "admin", name: "CTTX Owner" } as { role: string; name: string } | null,
  confirmDelete: vi.fn(),
  audits: [
    {
      id: 91001,
      clientName: "Kwandwe Private Game Reserve",
      sector: "Game Reserve",
      cisScore: 78,
      tciScore: 65,
      resilienceScore: 82,
      status: "Published",
    },
  ],
  observations: [
    {
      id: 301,
      auditId: 91001,
      type: "Tower Sighting",
      latitude: "-33.14500000",
      longitude: "26.55800000",
      description: "Vodacom tower north of the reserve; candidate LTE failover and microwave high-site validation point.",
      signalReadings: { rsrp: -92, rsrq: -11, sinr: 8 },
    },
    {
      id: 302,
      auditId: 91001,
      type: "Fibre Sighting",
      latitude: "-33.23800000",
      longitude: "26.51400000",
      description: "TFA fibre route south of the property; candidate dark-fibre or managed handoff discovery point.",
      signalReadings: null,
    },
  ],
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: mocks.currentUser, loading: false }),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/admin", mocks.setLocation],
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ audits: { list: { invalidate: mocks.invalidateAuditList } } }),
    audits: {
      list: { useQuery: () => ({ data: mocks.audits, isLoading: false }) },
      update: { useMutation: () => ({ mutateAsync: mocks.updateAuditMutateAsync, isPending: false }) },
      delete: { useMutation: () => ({ mutateAsync: mocks.deleteAuditMutateAsync, isPending: false }) },
    },
    infrastructureAssets: {
      sourceStatus: { useQuery: () => ({ data: mocks.sourceStatus }) },
      importVerified: { useMutation: () => ({ mutateAsync: mocks.importVerifiedInventoryMutateAsync, isPending: false }) },
      importFromConfiguredSource: { useMutation: () => ({ mutateAsync: mocks.importFromConfiguredSourceMutateAsync, isPending: false }) },
    },
    observations: {
      listByAuditId: { useQuery: () => ({ data: mocks.observations, isLoading: false }) },
    },
  },
}));

describe("AdminDashboard score override and observation review", () => {
  beforeEach(() => {
    mocks.currentUser = { role: "admin", name: "CTTX Owner" };
    mocks.setLocation.mockClear();
    mocks.updateAuditMutateAsync.mockResolvedValue({ id: 91001 });
    mocks.updateAuditMutateAsync.mockClear();
    mocks.deleteAuditMutateAsync.mockClear();
    mocks.sourceStatus = {
      configured: true,
      sourceName: "Existing CTTX verified inventory database",
      endpointHost: "inventory.cttx.example",
      authMode: "server-token",
      credentialPolicy: "Credentials are read only from server-side environment secrets and are never rendered, stored, or accepted in the browser.",
      requiredSecrets: ["CTTX_VERIFIED_INVENTORY_SOURCE_URL", "CTTX_VERIFIED_INVENTORY_SOURCE_TOKEN", "CTTX_VERIFIED_INVENTORY_SOURCE"],
    };
    mocks.importVerifiedInventoryMutateAsync.mockResolvedValue({ imported: 1, skipped: 0, errors: [] });
    mocks.importVerifiedInventoryMutateAsync.mockClear();
    mocks.importFromConfiguredSourceMutateAsync.mockResolvedValue({ imported: 3, skipped: 1, errors: [] });
    mocks.importFromConfiguredSourceMutateAsync.mockClear();
    mocks.invalidateAuditList.mockResolvedValue(undefined);
    mocks.invalidateAuditList.mockClear();
    mocks.confirmDelete.mockReturnValue(true);
    vi.spyOn(window, "confirm").mockImplementation(mocks.confirmDelete);
  });

  afterEach(() => {
    cleanup();
  });

  it("lets an admin override score values and saves them through the audit update mutation", async () => {
    render(<AdminDashboard />);

    fireEvent.click(screen.getByRole("button", { name: /override scores/i }));
    fireEvent.change(screen.getByLabelText(/CIS score for Kwandwe Private Game Reserve/i), { target: { value: "83" } });
    fireEvent.change(screen.getByLabelText(/TCI score for Kwandwe Private Game Reserve/i), { target: { value: "61" } });
    fireEvent.change(screen.getByLabelText(/Resilience score for Kwandwe Private Game Reserve/i), { target: { value: "88" } });
    fireEvent.change(screen.getByLabelText(/Status for Kwandwe Private Game Reserve/i), { target: { value: "Draft" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(mocks.updateAuditMutateAsync).toHaveBeenCalledWith({
      id: 91001,
      cisScore: 83,
      tciScore: 61,
      resilienceScore: 88,
      status: "Draft",
    }));
    expect(mocks.invalidateAuditList).toHaveBeenCalled();
  });

  it("opens audit reports and deletes records only after confirmation", async () => {
    render(<AdminDashboard />);

    fireEvent.click(screen.getByRole("button", { name: /open/i }));
    expect(mocks.setLocation).toHaveBeenCalledWith("/audit/91001");

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => expect(mocks.deleteAuditMutateAsync).toHaveBeenCalledWith({ id: 91001 }));
    expect(mocks.confirmDelete).toHaveBeenCalledWith("Are you sure you want to delete this audit?");
    expect(mocks.invalidateAuditList).toHaveBeenCalled();
  });

  it("shows an access-denied state for non-admin users", () => {
    mocks.currentUser = { role: "user", name: "Reserve Manager" };

    render(<AdminDashboard />);

    expect(screen.getByText("Access Denied")).toBeTruthy();
    expect(screen.getByText(/admin privileges/i)).toBeTruthy();
  });

  it("expands field observations so the admin can review tower, fibre, coordinates, and signal readings", () => {
    render(<AdminDashboard />);

    fireEvent.click(screen.getByRole("button", { name: /review evidence/i }));

    expect(screen.getByText("Field observation review")).toBeTruthy();
    expect(screen.getByText("Tower Sighting")).toBeTruthy();
    expect(screen.getByText("Fibre Sighting")).toBeTruthy();
    expect(screen.getByText(/Vodacom tower north/i)).toBeTruthy();
    expect(screen.getByText(/-33.14500000, 26.55800000/i)).toBeTruthy();
    expect(screen.getByText("RSRP -92")).toBeTruthy();
    expect(screen.getByText("RSRQ -11")).toBeTruthy();
    expect(screen.getByText("SINR 8")).toBeTruthy();
  });

  it("imports trusted verified inventory JSON and displays import status", async () => {
    render(<AdminDashboard />);

    fireEvent.change(screen.getByLabelText(/verified inventory json/i), {
      target: {
        value: JSON.stringify([
          {
            externalRef: "cttx-tower-001",
            assetType: "Tower",
            provider: "CTTX",
            latitude: -33.145,
            longitude: 26.558,
            verificationStatus: "Field Verified",
          },
        ]),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /import pasted json snapshot/i }));

    await waitFor(() => expect(mocks.importVerifiedInventoryMutateAsync).toHaveBeenCalledWith({
      records: [
        {
          externalRef: "cttx-tower-001",
          assetType: "Tower",
          provider: "CTTX",
          latitude: -33.145,
          longitude: 26.558,
          verificationStatus: "Field Verified",
        },
      ],
    }));
    expect(await screen.findByTestId("verified-inventory-import-status")).toBeTruthy();
    expect(screen.getByText("Imported / updated")).toBeTruthy();
  });

  it("shows secure source-connection readiness without exposing credentials", () => {
    render(<AdminDashboard />);

    expect(screen.getByTestId("verified-inventory-source-status")).toBeTruthy();
    expect(screen.getByText(/Secure source connection: Configured/i)).toBeTruthy();
    expect(screen.getByText(/Endpoint host: inventory.cttx.example/i)).toBeTruthy();
    expect(screen.getByText(/server-side environment secrets/i)).toBeTruthy();
    expect(screen.queryByText(/CTTX_VERIFIED_INVENTORY_SOURCE_TOKEN=/i)).toBeFalsy();
  });

  it("imports directly from the configured server-side source connection", async () => {
    render(<AdminDashboard />);

    fireEvent.click(screen.getByRole("button", { name: /import from configured source/i }));

    await waitFor(() => expect(mocks.importFromConfiguredSourceMutateAsync).toHaveBeenCalled());
    expect(await screen.findByTestId("verified-inventory-import-status")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });
});
