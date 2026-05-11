import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const indexCss = readFileSync(new URL("./index.css", import.meta.url), "utf8");

describe("global typography system", () => {
  it("loads Inter Tight headings, Inter body text, and Roboto Mono data fonts", () => {
    expect(indexHtml).toContain("family=Inter:wght@400;500;600;700;800");
    expect(indexHtml).toContain("family=Inter+Tight:wght@500;600;700;800");
    expect(indexHtml).toContain("family=Roboto+Mono:wght@400;500;600;700");
  });

  it("binds body, heading, and mono font tokens in the global stylesheet", () => {
    expect(indexCss).toContain('--font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;');
    expect(indexCss).toContain('--font-heading: "Inter Tight", "Inter", ui-sans-serif, system-ui, sans-serif;');
    expect(indexCss).toContain('--font-mono: "Roboto Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;');
    expect(indexCss).toContain("@apply bg-background text-foreground font-sans;");
    expect(indexCss).toContain("font-family: var(--font-heading);");
  });
});
