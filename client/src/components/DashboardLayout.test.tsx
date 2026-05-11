import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import DashboardLayout from "./DashboardLayout";

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({
    loading: false,
    user: { name: "CTTX Owner", email: "owner@cttx.example", role: "admin" },
    logout: vi.fn(),
  }),
}));

vi.mock("@/hooks/useMobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/admin", vi.fn()],
}));

describe("DashboardLayout", () => {
  it("renders the CTTX admin sidebar, user identity, and wrapped dashboard content", () => {
    const html = renderToStaticMarkup(
      <DashboardLayout>
        <section>Admin audit management content</section>
      </DashboardLayout>,
    );

    expect(html).toContain("CTTX Console");
    expect(html).toContain("Intelligence Home");
    expect(html).toContain("Admin Audits");
    expect(html).toContain("CTTX Owner");
    expect(html).toContain("owner@cttx.example");
    expect(html).toContain("Admin audit management content");
  });
});
