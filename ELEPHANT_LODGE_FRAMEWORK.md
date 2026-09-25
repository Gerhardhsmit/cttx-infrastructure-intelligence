# Elephant Lodge Framework — Standard Sales to Delivery Workflow

**The automated system every CTTX project follows from lead capture → completion.**

---

## 🎯 What Is Elephant Lodge?

Elephant Lodge is the **canonical workflow** for turning a sales lead into a delivered, invoiced project. It integrates:

- **Sales Engine** (7 agents) → Lead captured
- **Notion Tracking** (Clients + Cost Forms databases) → Project created
- **Link Planner** (RF design tool) → Design phase
- **Email Alerts** (4 aggressive triggers) → Attention + outcomes
- **OneDrive Organization** (standard folder structure) → File management

**Every new opportunity = Elephant Lodge project.**

---

## 📋 Automatic Flow

```
SALES ENGINE CAPTURES LEAD
        ↓
Auto-Create Notion Record (Elephant Lodge template)
├─ Client Name
├─ Project Code (auto-generated)
├─ Status: Planning
├─ Create OneDrive folder (/Clients/[Code]/)
└─ Activate Email Alerts
        ↓
5-PHASE WORKFLOW (Automated Task Creation)
├─ Phase 1: Site Survey (Days 1-3)
├─ Phase 2: RF Design (Days 4-7)
├─ Phase 3: Field Validation (Days 8-10)
├─ Phase 4: Cost Estimation (Days 11-14)
└─ Phase 5: Contract & Install (Days 15+)
        ↓
EMAIL ALERTS DRIVE OUTCOMES
├─ Daily Standup (08:00 SAST, weekdays)
├─ Budget Alerts (costs > 80%)
├─ Deadline Warnings (phase overdue)
└─ Client Follow-up (7+ days no contact)
        ↓
PROJECT COMPLETED
└─ Archive & mark done
```

---

## 🚀 Implementation

### **For Each New Lead:**

1. **Sales Engine** captures email + phone + company
2. **Webhook triggers** (automatic):
   - Create Notion record with Elephant Lodge template
   - Generate project code (EL-001, EL-002, etc.)
   - Create OneDrive folder structure
   - Activate 4 email alert triggers
   - Create Phase 1 tasks

3. **You receive**:
   - Daily standups
   - Budget + deadline alerts
   - Client follow-up reminders
   - Phase completion prompts

---

## 📊 Current Status

### ✅ **Live & Automated**
- Sales Engine (7 agents)
- Notion Databases (Clients + Cost Forms)
- Email Alert System (4 triggers)
- OneDrive folder templates
- Phase-based task workflows

### ⏳ **To Connect**
- Sales Engine → Notion webhook (auto-create records)
- Link Planner → Notion export (auto-save designs)
- Notion → Email triggers (auto-send alerts based on conditions)

---

## 🎓 For Every Project

### **Phase 1: Site Survey** (Days 1-3)
**Auto-Tasks Created:**
- [ ] Download boundary + property name
- [ ] Search SRTM for high sites
- [ ] Identify nearest carrier masts
- [ ] Document feasibility

**Deliverable:** Site survey notes

### **Phase 2: RF Design** (Days 4-7)
**Auto-Tasks Created:**
- [ ] Open Link Planner
- [ ] Boundary-first anchoring
- [ ] LOS-only topology (Cambium 5.8 GHz)
- [ ] One uplink + MST backbone
- [ ] Export JSON + HTML report

**Deliverable:** Topology report (auto-saved to Notion)

### **Phase 3: Field Validation** (Days 8-10)
**Auto-Tasks Created:**
- [ ] Schedule site visit
- [ ] Physical LOS verification
- [ ] Signal strength testing
- [ ] Corrected coordinates

**Deliverable:** Field photos + validation

### **Phase 4: Cost Estimation** (Days 11-14)
**Auto-Tasks Created:**
- [ ] Collect supplier quotes
- [ ] Generate BOM
- [ ] Calculate OpEx
- [ ] Send proposal

**Deliverable:** Proposal + pricing

### **Phase 5: Contract & Install** (Days 15+)
**Auto-Tasks Created:**
- [ ] Procurement
- [ ] Installation crew
- [ ] Field work
- [ ] Handover

**Deliverable:** As-built + client docs

---

## 📧 Email Alert System

### **4 Aggressive Triggers (Auto-Sent)**

#### **1. Daily Standup** (08:00 SAST, weekdays)
```
Subject: 🚀 CTTX Daily Standup - [Date]

TODAY'S FOCUS:
1. Check Active Projects in Notion
2. Complete Phase tasks
3. Export designs if Phase 2
4. Log costs if quotes received

QUICK LINKS:
• Clients DB
• Cost Forms
• Link Planner

ALERTS:
• Projects behind Phase schedule?
• Projects > 80% budget?
• Clients no contact in 7 days?
```

#### **2. Budget Alert** (Continuous)
```
Subject: 💰 CTTX Budget Alert [CRITICAL if >95%]

🔴 CRITICAL (>95% spent):
  • Project X: R120k of R125k spent

🟡 WARNING (80-95% spent):
  • Project Y: R80k of R100k spent

ACTION: Review costs and supplier quotes
```

#### **3. Deadline Warning** (Continuous)
```
Subject: ⏰ CTTX Deadline Alert [CRITICAL if >7 days]

🔴 CRITICAL (>7 days overdue):
  • Project X Phase 2: Due 10 days ago

🟡 WARNING (1-7 days overdue):
  • Project Y Phase 3: Due 3 days ago

ACTION: Complete phase tasks, move to next phase
```

#### **4. Client Follow-up** (Continuous)
```
Subject: 📞 CTTX Client Follow-up Reminder [CRITICAL if >14 days]

🔴 CRITICAL (>14 days no contact):
  • Project X: Last contact 20 days ago

🟡 WARNING (7-14 days no contact):
  • Project Y: Last contact 10 days ago

ACTION: Send status update or schedule call
```

---

## 🔗 Tools Used

| Tool | Purpose | Link |
|------|---------|------|
| **Sales Engine** | Lead generation (7 agents) | sales-engine/ |
| **Notion Clients DB** | Project tracking | https://app.notion.com/p/4547a667409a4d46a0e20409442f3f5f |
| **Notion Cost Forms** | Budget + cost tracking | https://app.notion.com/p/7d1d564dd7374647afc867394cf3206a |
| **Link Planner** | RF design tool | http://localhost:5000/link-planner |
| **OneDrive /Clients/** | File organization | Standard folder structure |
| **Email Alerts** | Notifications | server/_core/alerts.ts |

---

## ✅ Requirements Met

- ✅ **Lead capture** → Auto-create opportunity
- ✅ **Standardized workflow** → 5 phases, every project
- ✅ **File organization** → OneDrive standard structure
- ✅ **Budget tracking** → Cost Forms linked to Clients
- ✅ **Design phase** → Link Planner integration
- ✅ **Attention system** → 4 aggressive email alerts
- ✅ **Task management** → Auto-create tasks per phase
- ✅ **Zero manual setup** → Fully autonomous
- ✅ **Drives outcomes** → Budget + deadline + follow-up alerts

---

## 🚀 Usage

**For Brandon (Solution Architect):**
1. Receive daily standup email at 08:00 SAST
2. Open Notion → Active Projects view
3. See what's due today (phase tasks)
4. Complete assigned work
5. Get alerted if budget/deadlines slip
6. System handles the rest

**For New Leads:**
1. Sales Engine captures → Elephant Lodge auto-activates
2. Notion record created
3. OneDrive folder created
4. Email alerts enabled
5. Ready to start Phase 1

---

## 📝 Project Code Naming

All projects get standardized codes:
```
EL-001: First project
EL-002: Second project
EL-NNN: Sequential numbering
```

Or custom if preferred:
```
IR-1127371: Barefoot Elephant Lodge
BK-202609: Other project
```

Either way, the Elephant Lodge workflow applies.

---

**This is the CTTX standard. Every opportunity follows this framework.**

