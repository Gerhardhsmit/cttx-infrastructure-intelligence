/** @vitest-environment jsdom */
import React, { useEffect } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FieldEngineer, { buildEvidenceUploadInput, buildObservationPayload, buildScoreOverrideDescription } from "./FieldEngineer";

const mocks = vi.hoisted(() => ({
  currentUser: { id: 7, name: "Field Ranger", role: "user" } as null | { id: number; name: string; role: string },
  params: { id: "91001" } as { id?: string },
  setLocation: vi.fn(),
  mapClick: undefined as undefined | ((event: { latLng: { lat: () => number; lng: () => number } }) => void),
  createObservationMutateAsync: vi.fn(),
  uploadEvidenceMutateAsync: vi.fn(),
  updateAuditMutateAsync: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  invalidateObservations: vi.fn(),
  invalidateAudit: vi.fn(),
  audit: {
    id: 91001,
    clientName: "Kwandwe Private Game Reserve",
    sector: "Game Reserve",
    latitude: "-33.14500000",
    longitude: "26.55800000",
    cisScore: 78,
    tciScore: 65,
    resilienceScore: 82,
  },
  observations: [
    {
      id: 301,
      auditId: 91001,
      type: "Tower Sighting",
      latitude: "-33.14500000",
      longitude: "26.55800000",
      description: "Vodacom tower north of the reserve.",
      photoUrl: null,
      signalReadings: { rsrp: -92, rsrq: -11, sinr: 8 },
    },
  ],
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: mocks.currentUser, loading: false }),
}));

vi.mock("@/const", () => ({
  getLoginUrl: () => "https://auth.example.test/app-auth",
}));

vi.mock("wouter", () => ({
  useParams: () => mocks.params,
  useLocation: () => ["/field/91001", mocks.setLocation],
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

vi.mock("@/components/Map", () => ({
  MapView: (props: { onMapReady?: (map: { setMapTypeId: (type: string) => void; addListener: (eventName: string, callback: typeof mocks.mapClick) => void }) => void }) => {
    useEffect(() => {
      props.onMapReady?.({
        setMapTypeId: vi.fn(),
        addListener: (_eventName, callback) => {
          mocks.mapClick = callback;
        },
      });
    }, []);

    return <button type="button" onClick={() => mocks.mapClick?.({ latLng: { lat: () => -33.222222, lng: () => 26.444444 } })}>Mock map capture</button>;
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      observations: { listByAuditId: { invalidate: mocks.invalidateObservations } },
      audits: { getById: { invalidate: mocks.invalidateAudit } },
    }),
    audits: {
      getById: { useQuery: () => ({ data: mocks.audit, isLoading: false }) },
      update: { useMutation: (options?: { onSuccess?: () => Promise<void> | void }) => ({ mutateAsync: async (input: unknown) => { const result = await mocks.updateAuditMutateAsync(input); await options?.onSuccess?.(); return result; }, isPending: false }) },
    },
    observations: {
      listByAuditId: { useQuery: () => ({ data: mocks.observations, isLoading: false }) },
      create: { useMutation: (options?: { onSuccess?: () => Promise<void> | void; onError?: (error: Error) => void }) => ({ mutateAsync: async (input: unknown) => { try { const result = await mocks.createObservationMutateAsync(input); await options?.onSuccess?.(); return result; } catch (error) { options?.onError?.(error as Error); throw error; } }, isPending: false }) },
      uploadEvidence: { useMutation: () => ({ mutateAsync: mocks.uploadEvidenceMutateAsync, isPending: false }) },
    },
  },
}));

describe("FieldEngineer helpers", () => {
  it("builds signal observation payloads with numeric coordinates and readings", () => {
    expect(buildObservationPayload(91001, {
      type: "Signal Observation",
      latitude: "-33.100000",
      longitude: "26.200000",
      description: "Main lodge LTE sweep",
      photoUrl: "",
      rsrp: "-91",
      rsrq: "-12",
      sinr: "7",
      scoreKey: "cisScore",
      scoreValue: "",
    })).toEqual({
      auditId: 91001,
      type: "Signal Observation",
      latitude: -33.1,
      longitude: 26.2,
      description: "Main lodge LTE sweep",
      photoUrl: undefined,
      signalReadings: { rsrp: -91, rsrq: -12, sinr: 7 },
    });
  });

  it("formats field engineer score override notes for the audit trail", () => {
    expect(buildScoreOverrideDescription("tciScore", "71", "New ridge obstruction confirmed.")).toContain("Terrain Complexity Index → 71");
    expect(buildScoreOverrideDescription("tciScore", "71", "New ridge obstruction confirmed.")).toContain("New ridge obstruction confirmed.");
  });

  it("builds native evidence upload inputs with the selected file metadata", () => {
    expect(buildEvidenceUploadInput(91001, { name: "tower ridge.png", type: "image/png" }, "data:image/png;base64,abc123")).toEqual({
      auditId: 91001,
      fileName: "tower ridge.png",
      mimeType: "image/png",
      base64Data: "data:image/png;base64,abc123",
    });
  });
});

describe("FieldEngineer mode", () => {
  beforeEach(() => {
    mocks.currentUser = { id: 7, name: "Field Ranger", role: "user" };
    mocks.params = { id: "91001" };
    mocks.mapClick = undefined;
    mocks.createObservationMutateAsync.mockResolvedValue({ id: 999 });
    mocks.uploadEvidenceMutateAsync.mockResolvedValue({ key: "field-evidence/audit-91001/tower.png", url: "/manus-storage/field-evidence/audit-91001/tower.png" });
    mocks.updateAuditMutateAsync.mockResolvedValue({ id: 91001 });
    mocks.invalidateObservations.mockResolvedValue(undefined);
    mocks.invalidateAudit.mockResolvedValue(undefined);
    mocks.createObservationMutateAsync.mockClear();
    mocks.uploadEvidenceMutateAsync.mockClear();
    mocks.updateAuditMutateAsync.mockClear();
    mocks.toastSuccess.mockClear();
    mocks.toastError.mockClear();
  });

  afterEach(() => cleanup());

  it("requires authentication before allowing field capture", () => {
    mocks.currentUser = null;

    render(<FieldEngineer />);

    expect(screen.getByText("Field Engineer Login Required")).toBeTruthy();
    expect(screen.getByRole("link", { name: /sign in to field mode/i }).getAttribute("href")).toBe("https://auth.example.test/app-auth");
  });

  it("captures a GPS point from the map and syncs a signal observation to the database", async () => {
    render(<FieldEngineer />);

    fireEvent.click(screen.getByRole("button", { name: /mock map capture/i }));
    fireEvent.change(screen.getByPlaceholderText(/field notes/i), { target: { value: "Gatehouse LTE scan" } });
    fireEvent.change(screen.getByPlaceholderText("-92"), { target: { value: "-88" } });
    fireEvent.change(screen.getByPlaceholderText("-11"), { target: { value: "-10" } });
    fireEvent.change(screen.getByPlaceholderText("8"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: /capture signal/i }));

    await waitFor(() => expect(mocks.createObservationMutateAsync).toHaveBeenCalledWith({
      auditId: 91001,
      type: "Signal Observation",
      latitude: -33.222222,
      longitude: 26.444444,
      description: "Gatehouse LTE scan",
      photoUrl: undefined,
      signalReadings: { rsrp: -88, rsrq: -10, sinr: 12 },
    }));
    expect(mocks.invalidateObservations).toHaveBeenCalledWith({ auditId: 91001 });
  });

  it("uploads a native evidence photo before tagging infrastructure", async () => {
    render(<FieldEngineer />);

    fireEvent.click(screen.getByRole("button", { name: /mock map capture/i }));
    fireEvent.click(screen.getByRole("button", { name: /^tower$/i }));
    fireEvent.change(screen.getByPlaceholderText(/field notes/i), { target: { value: "Fresh tower photo from north ridge." } });
    fireEvent.change(screen.getByLabelText(/native evidence photo upload/i), { target: { files: [new File(["mock image"], "tower-ridge.png", { type: "image/png" })] } });
    fireEvent.click(screen.getByRole("button", { name: /tag infrastructure/i }));

    await waitFor(() => expect(mocks.uploadEvidenceMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      auditId: 91001,
      fileName: "tower-ridge.png",
      mimeType: "image/png",
      base64Data: expect.stringContaining("data:image/png;base64,"),
    })));
    await waitFor(() => expect(mocks.createObservationMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      auditId: 91001,
      type: "Tower Sighting",
      description: "Fresh tower photo from north ridge.",
      photoUrl: "/manus-storage/field-evidence/audit-91001/tower.png",
    })));
  });

  it("requires photo evidence or a pasted reference before tagging infrastructure", async () => {
    render(<FieldEngineer />);

    fireEvent.click(screen.getByRole("button", { name: /mock map capture/i }));
    fireEvent.click(screen.getByRole("button", { name: /^tower$/i }));
    fireEvent.change(screen.getByPlaceholderText(/field notes/i), { target: { value: "Tower sighting without evidence." } });
    fireEvent.click(screen.getByRole("button", { name: /tag infrastructure/i }));

    expect(mocks.uploadEvidenceMutateAsync).not.toHaveBeenCalled();
    expect(mocks.createObservationMutateAsync).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith("Attach an evidence photo or paste an evidence reference before tagging infrastructure.");
  });

  it("does not create an infrastructure observation when native evidence upload fails", async () => {
    mocks.uploadEvidenceMutateAsync.mockRejectedValueOnce(new Error("storage unavailable"));
    render(<FieldEngineer />);

    fireEvent.click(screen.getByRole("button", { name: /mock map capture/i }));
    fireEvent.click(screen.getByRole("button", { name: /^fibre$/i }));
    fireEvent.change(screen.getByPlaceholderText(/field notes/i), { target: { value: "Fibre cabinet photo near lodge." } });
    fireEvent.change(screen.getByLabelText(/native evidence photo upload/i), { target: { files: [new File(["mock image"], "fibre.webp", { type: "image/webp" })] } });
    fireEvent.click(screen.getByRole("button", { name: /tag infrastructure/i }));

    await waitFor(() => expect(mocks.uploadEvidenceMutateAsync).toHaveBeenCalled());
    expect(mocks.createObservationMutateAsync).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith("Evidence photo upload failed. Try again before tagging infrastructure.");
  });

  it("surfaces failed observation creation without clearing retry evidence", async () => {
    mocks.createObservationMutateAsync.mockRejectedValueOnce(new Error("Observation write failed"));
    render(<FieldEngineer />);

    fireEvent.click(screen.getByRole("button", { name: /mock map capture/i }));
    fireEvent.click(screen.getByRole("button", { name: /^tower$/i }));
    fireEvent.change(screen.getByPlaceholderText(/field notes/i), { target: { value: "Tower evidence should stay available for retry." } });
    fireEvent.change(screen.getByLabelText(/native evidence photo upload/i), { target: { files: [new File(["mock image"], "tower.png", { type: "image/png" })] } });
    fireEvent.click(screen.getByRole("button", { name: /tag infrastructure/i }));

    await waitFor(() => expect(mocks.createObservationMutateAsync).toHaveBeenCalled());
    expect(mocks.toastError).toHaveBeenCalledWith("Observation write failed");
    expect(screen.getByDisplayValue("Tower evidence should stay available for retry.")).not.toBeNull();
  });

  it("rejects unsupported native evidence file types before uploading", async () => {
    render(<FieldEngineer />);

    fireEvent.click(screen.getByRole("button", { name: /mock map capture/i }));
    fireEvent.click(screen.getByRole("button", { name: /^tower$/i }));
    fireEvent.change(screen.getByLabelText(/native evidence photo upload/i), { target: { files: [new File(["notes"], "tower.txt", { type: "text/plain" })] } });
    fireEvent.click(screen.getByRole("button", { name: /tag infrastructure/i }));

    expect(mocks.uploadEvidenceMutateAsync).not.toHaveBeenCalled();
    expect(mocks.createObservationMutateAsync).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith("Upload a JPG, PNG, or WebP evidence photo.");
  });

  it("saves score override requests and appends an audit-trail observation", async () => {
    render(<FieldEngineer />);

    fireEvent.click(screen.getByRole("button", { name: /mock map capture/i }));
    fireEvent.change(screen.getByPlaceholderText(/field notes/i), { target: { value: "Confirmed fibre handoff improves CIS." } });
    fireEvent.change(screen.getByPlaceholderText("0–100"), { target: { value: "84" } });
    fireEvent.click(screen.getByRole("button", { name: /save override with audit trail/i }));

    await waitFor(() => expect(mocks.updateAuditMutateAsync).toHaveBeenCalledWith({ id: 91001, cisScore: 84 }));
    await waitFor(() => expect(mocks.createObservationMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      auditId: 91001,
      type: "Photo Note",
      latitude: -33.222222,
      longitude: 26.444444,
      description: expect.stringContaining("Connectivity Intelligence Score → 84"),
    })));
  });
});
