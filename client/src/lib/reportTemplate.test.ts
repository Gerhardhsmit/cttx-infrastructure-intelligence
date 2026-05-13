import { describe, expect, it } from "vitest";
import { CTTX_CONFIDENTIAL_DESIGNATION, CTTX_PDF_REPORT_TEMPLATE, getReportTemplateSectionTitle } from "./reportTemplate";

describe("CTTX PDF report template configuration", () => {
  it("defines the branded confidential PDF-oriented report structure independently of Markdown export", () => {
    expect(CTTX_PDF_REPORT_TEMPLATE.brandName).toBe("CTTX Infrastructure Intelligence");
    expect(CTTX_PDF_REPORT_TEMPLATE.designation).toBe(CTTX_CONFIDENTIAL_DESIGNATION);
    expect(CTTX_PDF_REPORT_TEMPLATE.intendedOutput).toBe("pdf-ready-report-pack");

    const sectionTitles = CTTX_PDF_REPORT_TEMPLATE.sections.map((section) => section.title);
    expect(sectionTitles).toEqual(
      expect.arrayContaining([
        "Report Header",
        "Executive Summary",
        "Infrastructure Map",
        "Operational Analysis",
        "Architecture Plan",
        "Engineering Brief",
      ]),
    );
  });

  it("resolves shared section titles used by generated report outputs", () => {
    expect(getReportTemplateSectionTitle("header")).toBe("Report Header");
    expect(getReportTemplateSectionTitle("engineering-brief")).toBe("Engineering Brief");
  });
});
