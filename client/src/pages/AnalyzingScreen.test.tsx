import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import AnalyzingScreen, { ANALYSIS_STEP_DURATION_MS, getAnalysisStepForElapsed } from "./AnalyzingScreen";

vi.mock("wouter", () => ({
  useParams: () => ({ id: "90001" }),
  useLocation: () => ["/audit/analyzing/90001", vi.fn()],
}));

describe("AnalyzingScreen", () => {
  it("advances active analysis steps over time for dynamic progress copy", () => {
    expect(getAnalysisStepForElapsed(0)).toBe(0);
    expect(getAnalysisStepForElapsed(ANALYSIS_STEP_DURATION_MS)).toBe(1);
    expect(getAnalysisStepForElapsed(ANALYSIS_STEP_DURATION_MS * 2)).toBe(2);
    expect(getAnalysisStepForElapsed(ANALYSIS_STEP_DURATION_MS * 3)).toBe(3);
    expect(getAnalysisStepForElapsed(ANALYSIS_STEP_DURATION_MS * 9)).toBe(3);
  });

  it("renders the tactical infrastructure analysis sequence before the report route opens", () => {
    const html = renderToStaticMarkup(<AnalyzingScreen />);

    expect(html).toContain("Analyzing Infrastructure");
    expect(html).toContain("Audit #90001");
    expect(html).toContain("Querying 28East Fibre");
    expect(html).toContain("Fetching CloudRF Terrain");
    expect(html).toContain("Modeling Signal Propagation");
    expect(html).toContain("Calculating Resilience Score");
    expect(html).toContain("Opening in a few seconds");
    expect(html).toContain("actionable recommendations for the reserve manager");
  });
});
