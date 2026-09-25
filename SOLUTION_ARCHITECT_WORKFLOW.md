# Solution Architect Workflow — Link Planner Integration

**Bridges:** Sales Engine → Notion Opportunities → Link Planner → Deliverables

---

## 🎯 Overview

When a lead converts to an **Active Opportunity** in Notion, this workflow automatically:

1. Creates **recurring tasks** for the solution architect (you)
2. Tracks **Link Planner design** progress
3. Auto-saves **topology output** to Notion record
4. Manages **field validation** and **proposal generation**
5. Updates **delivery status** automatically

---

## 📋 Phase-Based Task Flow

### **Phase 1: Site Survey & Analysis** (Days 1-3)
**Trigger:** Status changed to "Active"

**Auto-Create Tasks:**
- [ ] Download OSM boundary + property name
- [ ] Search in Link Planner for candidate high sites (SRTM analysis)
- [ ] Identify nearest carrier masts (Vodacom/MTN/Cell C)
- [ ] Document feasibility: access, power, comms backhaul

**Deliverable:** Site survey notes + boundary map

---

### **Phase 2: RF Design (Link Planner)** (Days 4-7)
**Trigger:** Phase 1 tasks marked complete

**Auto-Create Tasks:**
- [ ] Open Link Planner with property boundary
- [ ] Place high sites on map (relay/hub candidates)
- [ ] Create LOS links (60% Fresnel clearance rule)
- [ ] Select carrier uplink + nearest-neighbour backbone
- [ ] Generate topology report (HTML + JSON export)

**Link Planner Rules (Non-Negotiable):**
- ✅ Boundary-first anchoring (fit map to property extent)
- ✅ Only clear LOS paths rendered (no spider-web, no marginal links)
- ✅ One uplink only (earned, to nearest carrier)
- ✅ Nearest-neighbour backbone (MST algorithm)
- ✅ Max 6 links per node
- ✅ Equipment: Cambium Networks 5.8 GHz radio + cnMaestro
- ✅ Power: Victron Energy + Hubble Lithium

**Output Auto-Saved to Notion:**
- Link Planner JSON (assumptions)
- Topology HTML report
- RF profile diagrams

---

### **Phase 3: Field Validation** (Days 8-10)
**Trigger:** Link Planner design complete

**Auto-Create Tasks:**
- [ ] Schedule site visit (2-3 days)
- [ ] Physical LOS validation: climb high sites, sight lines
- [ ] Test received signal strength at key facilities
- [ ] Verify power/backhaul feasibility
- [ ] Document final site coordinates + antenna heights

**Deliverable:** Field validation photos + corrected coordinates

---

### **Phase 4: Cost Estimation & Proposal** (Days 11-14)
**Trigger:** Field validation complete + costs logged in Notion

**Auto-Create Tasks:**
- [ ] Generate Bill of Materials (BOM)
- [ ] Collect supplier quotes:
  - Radio equipment (Cambium)
  - Cabling & connectors
  - Mounting hardware
  - Power system (Victron + batteries)
  - Installation labour
- [ ] Calculate OpEx: ongoing maintenance, CNO portal, power
- [ ] Generate CTTX proposal (template + figures)
- [ ] ROI section: security resilience + operational gains

**Cost Forms Linked Automatically:**
- Each supplier quote auto-linked to this opportunity
- Total BOM calculated from Cost Forms database
- Budget variance visible in Notion

**Output Auto-Saved to Notion:**
- Proposal PDF
- BOM + pricing breakdown
- ROI calculator

---

### **Phase 5: Contract & Installation** (Days 15+)
**Trigger:** Proposal approved + contract signed

**Auto-Create Tasks:**
- [ ] Procure equipment
- [ ] Schedule installation crew
- [ ] Site prep: mounting, power infrastructure
- [ ] Radio config: IP planning, cnMaestro portal
- [ ] Field installation (1-2 weeks)
- [ ] Testing & sign-off

**Deliverable:** As-built diagrams + client handover docs

---

## 🔄 Auto-Workflow Triggers

| Event | Auto-Action |
|-------|------------|
| Lead converts in Sales Engine | → Create Notion Opportunity (Status: Planning) |
| Status → "Active" in Notion | → Create Phase 1 tasks |
| Phase 1 complete | → Create Phase 2 tasks |
| Link Planner design saved | → Auto-import to Notion (JSON + HTML) |
| Cost form added to this project | → Update budget total in Notion |
| Phase 2 complete | → Create Phase 3 tasks |
| Phase 3 complete | → Create Phase 4 tasks |
| Proposal approved | → Create Phase 5 tasks |
| Status → "Completed" | → Archive recurring tasks + update OneDrive |

---

## 📊 Notion Record Structure

Each **Opportunity** in Notion has:

```
Client Name: Elephant Lodge
Project Code: IR-1127371
Status: Active → Proposal → Contract → Completed
Location: Olifantkop
Carrier: Vodacom (100m away)

┌─ Phase Tracking ─────────────────┐
│ Current Phase: Phase 2 (RF Design)│
│ Phase 1: ✅ Complete (Day 3)     │
│ Phase 2: 🔄 In Progress (Day 7)  │
│ Phase 3: ⏳ Pending (Day 10)     │
│ Phase 4: ⏳ Pending (Day 14)     │
│ Phase 5: ⏳ Pending (Day 21+)    │
└──────────────────────────────────┘

┌─ Link Planner Outputs ───────────┐
│ Topology JSON: [Link]            │
│ Report HTML: [Link]              │
│ Boundary Map: [Link]             │
│ Profile Diagrams: [Link]         │
└──────────────────────────────────┘

┌─ Cost Tracking ──────────────────┐
│ Contract Value: R250k            │
│ Costs Logged: R120k              │
│ Variance: +R130k remaining       │
│ Related Costs: [List]            │
└──────────────────────────────────┘

┌─ Files ──────────────────────────┐
│ OneDrive: /Clients/[ProjectCode]/│
│ Survey Notes: [Link]             │
│ Field Photos: [Link]             │
│ Proposal PDF: [Link]             │
│ As-Built: [Link]                 │
└──────────────────────────────────┘
```

---

## 🎯 Your (Solution Architect) Daily Workflow

### **Monday Morning — Check Notion**
1. Open **Clients → Active Projects** view
2. See current phase for each project
3. Click into your assigned tasks
4. Open Link Planner for Phase 2 designs
5. Export to Notion when done

### **Every Day — Link Planner Work**
1. Open project in Link Planner
2. Design topology (boundary-first, LOS-only rules)
3. Save + export JSON + HTML report
4. Copy output URLs → paste into Notion

### **End of Phase — Mark Complete**
1. Check off all tasks for that phase
2. Notion auto-creates next phase tasks
3. Move to next phase

### **Cost Management**
1. Supplier quote arrives → save to OneDrive
2. Log in Cost Forms → link to this project
3. Notion budget auto-updates
4. Proposal reflects real numbers

---

## 🔗 Integration with Sales Engine

**Sales Engine Agent 5 (Responder)** handles:
- ✅ Speed test lead intake
- ✅ Qualifying email response
- ✅ Schedule discovery call

**Your hand-off point:**
- When client says "yes, quote us" → log as Notion Opportunity
- Or Sales Engine Agent auto-logs it via webhook

**You focus on:**
- Design (Link Planner)
- Validation (site visits)
- Proposals (BOM + ROI)
- Delivery (installation)

---

## ⚡ Recurring Task Automation

**Using Manus/Notion Calendar:**

```
Daily (Mon-Fri 09:00 SAST):
├─ Check Notion for new tasks
├─ Review Phase 1 site surveys
├─ Update Phase 2 Link Planner progress
└─ Log daily time for invoicing

Weekly (Friday 17:00):
├─ Export all Link Planner designs
├─ Update field validation status
├─ Reconcile costs vs contract value
└─ Email Gerhard: phase status

Bi-weekly (Every other Monday):
├─ Review all proposals sent
├─ Update client communications
└─ Identify blockers
```

---

## 📈 Success Metrics

| Phase | KPI | Target |
|-------|-----|--------|
| 1: Survey | Days to complete | 3 days |
| 2: RF Design | Days in Link Planner | 4 days |
| 3: Validation | Days site work | 3 days |
| 4: Proposal | Days to send | 4 days |
| 5: Install | Months on site | 2-4 weeks |
| Overall | Days to contract signature | 14 days |

---

## 🛠️ Current Status

- ✅ **Sales Engine:** 7 agents live (Prospector, Responder, Nurturer running)
- ✅ **Link Planner:** Boundary-first design ready
- ✅ **Notion Tracking:** Clients + Cost Forms databases ready
- ✅ **OneDrive Structure:** Organized by project code
- ⏳ **Auto-Workflow:** To be connected (webhook from Sales Engine → Notion)
- ⏳ **Task Automation:** To be scheduled (Manus daily check)
- ⏳ **Link Planner Export:** To be auto-imported to Notion (manual for now)

---

## 🚀 Next Steps

1. **Wire Sales Engine → Notion** (when lead converts, auto-create Opportunity)
2. **Set up Manus scheduler** (daily task check-in at 09:00 SAST)
3. **Create Notion templates** (Phase 1-5 task lists auto-generate)
4. **Test with Elephant Lodge** (first live project)

---

**Your Role:** Design → Validation → Proposal → Delivery  
**Automation Role:** Task creation, cost tracking, status updates, file management  
**Sales Engine Role:** Lead generation → Qualification → Hand-off to you

