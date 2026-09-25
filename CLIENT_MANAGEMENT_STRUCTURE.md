# CTTX Client Management Structure

**Last Updated:** 2026-09-25  
**Owner:** Brandon Devine  
**Status:** Active Implementation

## Overview

This document defines the single source of truth for client project organization across Notion (project management) and OneDrive (file storage).

---

## 1. OneDrive Folder Structure

### Root: `/Clients/`

```
OneDrive/Clients/
├── [CLIENT_NAME] ([PROJECT_CODE])/
│   ├── 📋 Cost Forms/
│   │   ├── Supplier_Name_Invoice_Date.pdf
│   │   ├── Equipment_Quote_Date.pdf
│   │   └── [Cost tracking spreadsheet]
│   │
│   ├── 📐 Technical Design/
│   │   ├── Site_Survey_Photos/
│   │   ├── RF_Profile_Analysis/
│   │   ├── LOS_Fresnel_Clearance/
│   │   ├── Topology_Design_[VERSION].json
│   │   └── Equipment_Specifications/
│   │
│   ├── 📊 Project Plan/
│   │   ├── Scope_of_Work.pdf
│   │   ├── Timeline_Gantt.xlsx
│   │   ├── Budget_Breakdown.xlsx
│   │   └── Risk_Register.md
│   │
│   ├── 📧 Communications/
│   │   ├── Client_Correspondence/
│   │   ├── Supplier_Quotes/
│   │   └── Meeting_Notes/
│   │
│   ├── ✅ Deliverables/
│   │   ├── Link_Planner_Report_[DATE].html
│   │   ├── Final_Design_Drawings/
│   │   └── Installation_Manual/
│   │
│   └── 📋 Project_Index.md
        (Links back to Notion record)

```

### Naming Convention
- **Cost Forms:** `[Supplier]_[DocumentType]_[YYYYMM].pdf`
  - Example: `Vodacom_TowerQuote_202609.pdf`
  - Example: `CambiumNetworks_Equipment_Invoice_202609.pdf`

- **Projects:** `[ClientName]_([ProjectCode])`
  - Example: `Elephant Lodge (IR-1127371)`

---

## 2. Notion Database Structure

### Main Table: **Clients**

#### Fields:
- **Client Name** (Title) — Full legal name
- **Project Code** (Text) — Unique identifier (e.g., IR-1127371)
- **Status** (Select) — Planning / Active / Paused / Completed / On Hold
- **Location** (Text) — Primary location (e.g., Olifantkop)
- **Target Carrier** (Text) — e.g., Vodacom, MTN, Other
- **Carrier Tower Details** (Text) — Tower ID, coordinates, specifics
- **Lead Contact** (Person) — Primary client contact
- **Contract Value** (Number) — Total project budget (ZAR)
- **Start Date** (Date) — Project kickoff
- **Target Completion** (Date) — Expected delivery date
- **OneDrive Folder Link** (URL) — Direct link to `/Clients/[ProjectName]/`
- **Notion Dashboard** (Rollup) — Link to this project's dashboard
- **Related Costs** (Relation) → Cost Forms database
- **Related Sites** (Relation) → Sites database (if tracking multiple sites)

#### Views:
- **Active Projects** — Filter: Status = "Active" | Sort: Target Completion (nearest)
- **By Status** — Grouped by Status field
- **Budget Overview** — Showing Contract Value, related costs totaled
- **Map View** (if location data available)

---

### Related Table: **Cost Forms**

#### Fields:
- **Cost ID** (Title) — Auto: `[CLIENT_CODE]-COST-[#]`
  - Example: `IR-1127371-COST-001`
- **Linked Client** (Relation) → Clients table
- **Supplier Name** (Text) — Who issued the cost
- **Cost Type** (Select) — Equipment / Labor / Consulting / Shipping / Other
- **Amount (ZAR)** (Number) — Cost in South African Rand
- **Document Date** (Date) — When the cost was issued
- **Status** (Select) — Quoted / Approved / Invoiced / Paid
- **File Link** (URL) — Direct link to PDF in OneDrive
- **Notes** (Text) — Additional context
- **Added By** (Person) — Who logged this cost
- **Date Logged** (Created Date) — Auto-timestamp

#### Views:
- **By Project** — Relation to Clients, grouped by Status
- **Pending Payment** — Filter: Status = "Invoiced", not "Paid"
- **Budget vs Actual** — Compare linked client's Contract Value to sum of costs

---

### Reference Table: **Sites** (Optional - for multi-site projects)

#### Fields:
- **Site Name** (Title) — e.g., "Olifantkop Relay"
- **Location** (Geo) — Coordinates
- **Linked Client** (Relation) → Clients
- **Site Type** (Select) — High Site / Distribution / Access / Carrier Uplink
- **Height (m)** (Number) — Antenna height
- **Nearest Carrier Tower** (Text) — Tower identifier
- **Distance to Carrier (m)** (Number) — e.g., 100 for "100m to Vodacom"
- **LOS/Fresnel Status** (Select) — Clear / Marginal / Blocked
- **Technical Drawing** (URL) — Link to design file

---

## 3. Data Flow & Workflows

### Adding a New Client Project

1. **Create Notion Record** (Clients table)
   - Fill in Client Name, Project Code, Location, Target Carrier
   - Link to OneDrive folder (after creating it)

2. **Create OneDrive Folder Structure**
   ```bash
   # Navigate to OneDrive/Clients/
   mkdir "[Client Name] ([Project Code])"
   mkdir "[Client Name] ([Project Code])"/Cost\ Forms
   mkdir "[Client Name] ([Project Code])"/Technical\ Design
   mkdir "[Client Name] ([Project Code])"/Project\ Plan
   mkdir "[Client Name] ([Project Code])"/Communications
   mkdir "[Client Name] ([Project Code])"/Deliverables
   ```

3. **Add to Notion** — Update "OneDrive Folder Link" field

4. **Copy Project Index Template** to OneDrive
   ```markdown
   # [Client Name] - Project [Code]
   - **Notion Record:** [Link to Notion]
   - **Status:** [From Notion]
   - **Location:** [City/Site]
   - **Carrier/Tower:** [Details]
   - **Budget:** R[Amount]
   - **Target Completion:** [Date]
   ```

### Adding Cost Forms

1. **Save File to OneDrive** → `/[Project Folder]/Cost Forms/`
   - Use naming: `[Supplier]_[Type]_[YYYYMM].pdf`

2. **Create Notion Record** (Cost Forms table)
   - Link to Client
   - Enter Supplier, Amount, Type, Status
   - Paste URL to OneDrive file

3. **Update Client Record** — Total costs auto-calculate via rollup

### Project Completion Workflow

1. Export all cost forms (reconcile invoices)
2. Update Status → "Completed" in Notion
3. Archive active communications (keep in OneDrive for 12 months)
4. Generate final project summary
5. Update "Target Completion" if dates shifted

---

## 4. Quick Reference: Current Projects

### Elephant Lodge (IR-1127371)
- **Location:** Olifantkop → Vodacom Tower (100m)
- **Status:** [To be set in Notion]
- **OneDrive:** `/Clients/Elephant Lodge (IR-1127371)/`
- **Notion:** [Create record following "Adding a New Client" workflow above]

---

## 5. Best Practices

✅ **Do:**
- Update Notion status weekly
- Save cost PDFs immediately (don't batch)
- Use consistent file naming
- Link everything back to Notion
- Archive completed projects (mark "Completed" in Notion)

❌ **Don't:**
- Store files on Desktop permanently
- Upload PDFs to Notion directly (use OneDrive link instead)
- Forget to update "Status" field
- Mix client projects in random folders
- Edit files outside OneDrive sync folder

---

## 6. Access & Permissions

| Role | Notion | OneDrive |
|------|--------|----------|
| Brandon (Owner) | Full access | Full access |
| Team Members | Read/Comment | Read (cost view only) |
| Clients | View-only link | None (via email) |

---

## 7. Integration with Link Planner

When exporting a topology from CTTX Link Planner:

1. Export JSON → `/[Project]/Technical Design/Topology_Design_v[VERSION].json`
2. Export HTML Report → `/[Project]/Deliverables/Link_Planner_Report_[DATE].html`
3. Add export date + version to Notion "Related Files" field

---

**Questions?** Contact: Brandon Devine (gerhardcttx@gmail.com)
