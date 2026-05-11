/* @vitest-environment jsdom */
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import Home from "./Home";

const mocks = vi.hoisted(() => ({
  setLocation: vi.fn(),
  isAuthenticated: false,
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/", mocks.setLocation],
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: mocks.isAuthenticated }),
}));

vi.mock("@/const", () => ({
  getLoginUrl: () => "/login?returnPath=%2F",
}));

describe("Home workflow and responsive validation", () => {
  afterEach(() => {
    cleanup();
    mocks.setLocation.mockReset();
    mocks.isAuthenticated = false;
  });

  it("routes reserve managers into the first audit step from both public CTAs", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: /start site audit/i }));
    fireEvent.click(screen.getByRole("button", { name: /start your first audit/i }));

    expect(mocks.setLocation).toHaveBeenNthCalledWith(1, "/audit/new");
    expect(mocks.setLocation).toHaveBeenNthCalledWith(2, "/audit/new");
    expect(screen.getByRole("link", { name: /sign in/i }).getAttribute("href")).toBe("/login?returnPath=%2F");
  });

  it("shows the authenticated operational handoff into the admin dashboard", () => {
    mocks.isAuthenticated = true;

    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: /admin dashboard/i }));

    expect(mocks.setLocation).toHaveBeenCalledWith("/admin");
    expect(screen.queryByRole("link", { name: /sign in/i })).toBeNull();
  });

  it("keeps mobile, tablet, and desktop responsive layout classes on the public entry page", () => {
    const html = renderToStaticMarkup(<Home />);

    expect(html).toContain("min-h-screen");
    expect(html).toContain("py-20 md:py-32");
    expect(html).toContain("text-4xl md:text-6xl");
    expect(html).toContain("flex-col sm:flex-row");
    expect(html).toContain("grid md:grid-cols-3");
    expect(html).toContain("container max-w-2xl");
  });
});
