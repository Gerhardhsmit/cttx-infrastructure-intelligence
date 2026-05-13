import { describe, expect, it, vi } from "vitest";

vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn() }));
vi.mock("./inventorySourceConfig", () => ({ fetchVerifiedInventoryRecordsFromSource: vi.fn(), getVerifiedInventorySourceStatus: vi.fn(() => ({ configured: false })) }));
vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    listLinkPlans: vi.fn(async () => []),
    getLinkPlanById: vi.fn(async (id: number) => id === 42 ? { id, ownerUserId: 7, planName: "Existing", propertyName: "Reserve", status: "Draft" } : null),
    createLinkPlan: vi.fn(async (plan) => ({ id: 42, createdAt: new Date(), updatedAt: new Date(), ...plan })),
    updateLinkPlan: vi.fn(async (id, updates) => ({ id, createdAt: new Date(), updatedAt: new Date(), ...updates })),
  };
});

import { appRouter } from "./routers";
import { createLinkPlan, updateLinkPlan } from "./db";

const ctx = { user: { id: 7, role: "admin", openId: "owner", name: "Owner" }, req: {}, res: { clearCookie: vi.fn() } };

describe("link planner router", () => {
  it("persists LOS-only link plans with CTTX engineering assumptions", async () => {
    const caller = appRouter.createCaller(ctx as never);
    const result = await caller.linkPlans.create({
      planName: "Reserve LOS draft",
      propertyName: "Eastern Ridge Reserve",
      centerLatitude: -33.48,
      centerLongitude: 26.63,
      propertyAreaHa: 1200,
      selectedMastId: "mast-1",
      boundary: [{ lat: -33.48, lng: 26.63 }],
      highSites: [{ id: "high-site-1", name: "CTTX North Ridge 1" }],
      providerMasts: [{ id: "mast-1", provider: "Vodacom" }],
      links: [{ id: "link-1", losStatus: "clear", targetBer: "≤ 10⁻⁶" }],
      assumptions: { losPolicy: "Only links classified as clear LOS are rendered." },
      recommendationSummary: "Use Cambium Networks with cnMaestro, Victron Energy, and Hubble Lithium.",
      totalDistanceKm: 18.24,
      liveDistanceKm: 10.1,
      status: "Ready for Field Validation",
    });
    expect(result.id).toBe(42);
    expect(createLinkPlan).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: 7, propertyName: "Eastern Ridge Reserve", status: "Ready for Field Validation", selectedMastId: "mast-1" }));
  });

  it("allows the plan owner to update an existing plan", async () => {
    const caller = appRouter.createCaller({ ...ctx, user: { ...ctx.user, role: "user" } } as never);
    await caller.linkPlans.update({ id: 42, planName: "Updated draft", propertyName: "Reserve", links: [{ id: "link-1", losStatus: "clear" }], status: "Draft" });
    expect(updateLinkPlan).toHaveBeenCalledWith(42, expect.objectContaining({ planName: "Updated draft" }));
  });

  it("accepts the shared PlannerState contract with decimal hectare estimates and facilities", async () => {
    const caller = appRouter.createCaller(ctx as never);
    await caller.linkPlans.create({
      planName: "Shared-contract topology",
      propertyName: "Kwandwe Ridge Trial Property",
      centerLatitude: -33.482,
      centerLongitude: 26.633,
      propertyAreaHa: 1262.4,
      selectedMastId: "mast-vodacom-1",
      boundary: [{ lat: -33.49, lng: 26.61 }, { lat: -33.46, lng: 26.65 }, { lat: -33.5, lng: 26.68 }],
      highSites: [{ id: "ridge-1", category: "inside", distToCentre: 1.4, source: "open-meteo-elevation" }],
      providerMasts: [{ id: "mast-vodacom-1", provider: "vodacom", distFromNearestRelay: 8.6, closestForProvider: true }],
      links: [{ id: "uplink-1", type: "uplink", role: "uplink", losStatus: "clear", distKm: 8.6, targetBer: "≤ 10⁻⁶ before handover" }],
      assumptions: {
        plannerState: { facilities: [{ id: "facility-1", type: "lodge", name: "Main Lodge", lat: -33.48, lng: 26.64 }], layerVis: { remote: false, unknown: false } },
        topologyPolicy: "One uplink plus nearest-neighbour backbone only; no all-to-all spider web.",
      },
      recommendationSummary: "Shared contract preserves Cambium Networks, cnMaestro, Victron Energy, and Hubble Lithium decisions.",
      totalDistanceKm: 8.6,
      liveDistanceKm: 0,
      status: "Ready for Field Validation",
    });
    expect(createLinkPlan).toHaveBeenCalledWith(expect.objectContaining({ propertyAreaHa: 1262.4, selectedMastId: "mast-vodacom-1" }));
  });
});
