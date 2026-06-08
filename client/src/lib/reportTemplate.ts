export const CTTX_CONFIDENTIAL_DESIGNATION = "CONFIDENTIAL ENGINEERING AUDIT";

export type ReportTemplateSectionId =
  | "header"
  | "executive-summary"
  | "infrastructure-map"
  | "operational-analysis"
  | "architecture-plan"
  | "reserve-manager-recommendations"
  | "cttx-follow-up-workflow"
  | "decision-pack"
  | "link-planner-topology"
  | "engineering-brief";

export type ReportTemplateSection = {
  id: ReportTemplateSectionId;
  title: string;
  purpose: string;
  pdfRole: "cover" | "summary" | "map" | "analysis" | "plan" | "workflow" | "appendix";
};

export const CTTX_PDF_REPORT_TEMPLATE = {
  brandName: "CTTX Infrastructure Intelligence",
  designation: CTTX_CONFIDENTIAL_DESIGNATION,
  intendedOutput: "pdf-ready-report-pack",
  sections: [
    {
      id: "header",
      title: "Report Header",
      purpose: "Identify the client, audit, lead recipient, budget context, generation timestamp, and preliminary validation status.",
      pdfRole: "cover",
    },
    {
      id: "executive-summary",
      title: "Executive Summary",
      purpose: "Explain in plain language what the reserve manager receives and which engineering decision should happen next.",
      pdfRole: "summary",
    },
    {
      id: "infrastructure-map",
      title: "Infrastructure Map",
      purpose: "Summarize the property pin and coordinate-backed infrastructure or operational points for engineering review.",
      pdfRole: "map",
    },
    {
      id: "operational-analysis",
      title: "Operational Analysis",
      purpose: "Connect property context, known problems, connectivity score, terrain complexity, and resilience score to operational implications.",
      pdfRole: "analysis",
    },
    {
      id: "architecture-plan",
      title: "Architecture Plan",
      purpose: "Present the primary and backup architecture recommendations that should be validated by CTTX engineering.",
      pdfRole: "plan",
    },
    {
      id: "reserve-manager-recommendations",
      title: "Reserve Manager Recommendations",
      purpose: "Translate the audit result into practical next actions for the property or reserve manager.",
      pdfRole: "plan",
    },
    {
      id: "cttx-follow-up-workflow",
      title: "CTTX Follow-up Workflow",
      purpose: "Explain what CTTX reviews, whether CTTX contacts the client, and what the next engineering step looks like.",
      pdfRole: "workflow",
    },
    {
      id: "decision-pack",
      title: "Decision Pack to Prepare",
      purpose: "List the supporting information the client should prepare before the engineering discovery call.",
      pdfRole: "appendix",
    },
    {
      id: "link-planner-topology",
      title: "Link Planner Topology & ROI",
      purpose: "Present the saved Link Planner topology including high sites, carrier masts, backbone/distribution links, LOS status, and route-decision rationale for engineering validation.",
      pdfRole: "plan",
    },
    {
      id: "engineering-brief",
      title: "Engineering Brief",
      purpose: "Preserve engineering notes and infrastructure context for validation, proposal scoping, or field-survey planning.",
      pdfRole: "appendix",
    },
  ] satisfies ReportTemplateSection[],
};

export function getReportTemplateSectionTitle(sectionId: ReportTemplateSectionId) {
  return CTTX_PDF_REPORT_TEMPLATE.sections.find((section) => section.id === sectionId)?.title ?? sectionId;
}
