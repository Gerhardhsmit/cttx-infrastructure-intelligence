# New Opportunity Checklist — 5 Minutes to Launch

**Use this checklist every time a new client opportunity comes in.**

---

## 🚀 When You Get a New Lead

### **STEP 1: Gather Basic Info (Right Now)**
Before doing anything, collect:
- [ ] Client name
- [ ] Project code (if you have one, or create: `[INITIALS]-[NUMBER]`, e.g., `EL-1127371`)
- [ ] Location/site name
- [ ] Which carrier tower(s) you're linking to (Vodacom, MTN, etc.)
- [ ] Approximate distance to tower (if known)
- [ ] Budget (if discussed)

**Time: 2 minutes**

---

### **STEP 2: Create OneDrive Folder**

1. Open **OneDrive** → go to **`/Clients/`**
2. Create new folder: **`[Client Name] ([Project Code])`**
   - Example: `Elephant Lodge (IR-1127371)`
3. Inside that folder, create 5 sub-folders:
   ```
   Cost Forms/
   Technical Design/
   Project Plan/
   Communications/
   Deliverables/
   ```
4. Copy the OneDrive folder URL

**Time: 1 minute**

---

### **STEP 3: Create Notion Record**

1. Open [**Clients Database**](https://app.notion.com/p/4547a667409a4d46a0e20409442f3f5f)
2. Click **+ Add** button (top right)
3. Fill in:
   - **Client Name** → [Client name]
   - **Project Code** → [Code]
   - **Status** → **"Planning"** (change to Active later)
   - **Location** → [City/Site]
   - **Target Carrier** → [Vodacom/MTN/etc]
   - **Carrier Tower Details** → [e.g., "100m to Vodacom tower, Tower ID: XYZ"]
   - **OneDrive Folder Link** → [Paste the OneDrive URL]
   - **Lead Contact** → [Your name or point person]
   - **Contract Value (ZAR)** → [Leave blank if not yet quoted]
   - **Start Date** → [Expected project kickoff]
   - **Target Completion** → [Expected delivery date]

4. Save

**Time: 2 minutes**

---

### **STEP 4: Move to "Active" (When Scope Confirmed)**

After you've confirmed:
- Scope of work ✅
- Rough budget ✅
- Timeline ✅

Go back to the Clients record and change:
- **Status** → "Active"
- **Contract Value (ZAR)** → [Finalized amount]

---

## 📋 When You Get Supplier Quotes/Invoices

1. **Save the PDF** to OneDrive:
   - Path: `/Clients/[Project]/Cost Forms/`
   - Filename: `[Supplier]_[Type]_[YYYYMM].pdf`
   - Example: `Vodacom_TowerQuote_202609.pdf`

2. **Log in Cost Forms Database** [Link](https://app.notion.com/p/7d1d564dd7374647afc867394cf3206a)
   - Click **+ Add**
   - **Linked Client** → [Select from dropdown]
   - **Supplier Name** → [e.g., Vodacom]
   - **Cost Type** → [Equipment / Labor / Consulting / Shipping / Other]
   - **Amount (ZAR)** → [Cost]
   - **Document Date** → [Date of quote]
   - **Status** → "Quoted" (change to Approved/Invoiced/Paid as it progresses)
   - **File Link** → [Paste OneDrive PDF link]
   - Save

**Result:** Cost automatically appears in the Clients record under that project ✅

---

## 🎯 Status Workflow

```
Planning
   ↓
Active (scope + budget confirmed)
   ↓
Paused (if on hold)
   ↓
Completed (project delivered)
```

For **Cost Forms**:
```
Quoted
   ↓
Approved (you approve the quote)
   ↓
Invoiced (supplier sends invoice)
   ↓
Paid (you pay the invoice)
```

---

## ✅ Quick Reference

| Trigger | What to Do |
|---------|-----------|
| New lead arrives | → STEP 1-3 above (5 min) |
| Scope + budget confirmed | → Change Status to "Active" |
| Supplier quote received | → Log in Cost Forms + save PDF |
| Quote approved | → Change Status to "Approved" |
| Invoice arrives | → Change Status to "Invoiced" |
| You pay invoice | → Change Status to "Paid" |
| Project delivered | → Change Status to "Completed" |

---

## 🔗 Direct Links (Bookmark These)

- **Clients Database:** https://app.notion.com/p/4547a667409a4d46a0e20409442f3f5f
- **Cost Forms Database:** https://app.notion.com/p/7d1d564dd7374647afc867394cf3206a
- **OneDrive /Clients folder:** [Open in OneDrive]

---

## 💡 Pro Tips

✅ **Do:**
- Update Status immediately (don't batch updates)
- Save cost PDFs **right away** (don't lose quotes)
- Link costs to the client in Notion (shows budget per project)
- Use consistent naming for OneDrive files

❌ **Don't:**
- Create random folders (use the standard structure)
- Upload PDFs to Notion (link to OneDrive instead)
- Forget to update Status (or you'll lose track)
- Mix multiple projects in one OneDrive folder

---

## 🤔 Common Questions

**Q: I got a lead but don't have all the details yet**
A: Create the Notion record with what you know. Leave blank fields empty. Fill them in as info arrives.

**Q: Should I create a folder before adding to Notion?**
A: Yes — create OneDrive folder first, then link it in Notion. Easier to copy the URL that way.

**Q: What if the project code changes?**
A: Update the "Project Code" field in Clients. Don't rename the OneDrive folder (costs less confusion).

**Q: Where do I see the total budget vs actual costs?**
A: In the **Clients** record, "Contract Value (ZAR)" shows budget. In **Cost Forms** → **By Project** view, you see all costs grouped by client.

---

**Questions?** See the full guide: [CLIENT_MANAGEMENT_STRUCTURE.md](https://github.com/Gerhardhsmit/cttx-infrastructure-intelligence/blob/main/CLIENT_MANAGEMENT_STRUCTURE.md)
