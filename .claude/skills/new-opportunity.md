# Skill: New Opportunity Intake

**Purpose:** Recognize and route new CTTX opportunities, retrieve context, inspect files, and route to appropriate workflow.

**Triggered by:** Natural language like "New opportunity", "New hybrid", "Build proposal", "New PSI", etc.

**Outcome:** Opportunity classified, context loaded, files analyzed, workflow started, blockers identified.

---

## INTAKE RECOGNITION

Recognize these patterns and execute full intake:

```
New opportunity: [Customer]. Type: [Type]. [Details].
New [Type] opportunity — [Customer]. [Details]. Build [output].
Build proposal for [Customer]. [Opportunity details].
Assessment for [Customer]. [Context]. KMZ + Link Planner supplied.
[Customer] hybrid — Varrucom connection. Proposal needed.
```

**Natural language is sufficient.** No special syntax required.

---

## INTAKE WORKFLOW

### Step 1: Parse & Recognize

Extract from user input:
- **Customer Name** (exact legal entity)
- **Opportunity Type** (Assessment / Resell / Carrier / Private / Hybrid / PSI / Project)
- **Carrier/Supplier** (if mentioned)
- **Files Mentioned** (KMZ, Link Planner, designs, RF reports)
- **Objective** (Proposal, quotation, assessment, both)

**State what was recognized:**
```
CUSTOMER: [Name]
TYPE: [Hybrid/PSI/Assessment/etc.]
CARRIER: [Supplier, if mentioned]
FILES: [List provided]
OBJECTIVE: [What needs to be built]
```

### Step 2: Load Persistent Context

Load automatically from CLAUDE.md:
- ✓ CTTX core identity and mission
- ✓ Opportunity classification framework
- ✓ Critical business rules
- ✓ Supplier relationships (Varrucom, Vodacom, Cambium, Victron, Hubble)
- ✓ Strategic positioning and three business drivers
- ✓ Proposal and quotation workflow

**Confirm:** "CTTX business context loaded."

### Step 3: Retrieve Customer Context (if exists)

Check for prior engagement:
- Prospect record in `sales-engine/prospects_batch1.json` or Notion CRM
- Previous proposals in `sales-engine/customers/[customer-name]/`
- Previous assessments, projects, or interactions
- Known segment, pain points, or industry

**If found:** "Customer context retrieved: [Segment/Industry/History]"  
**If new:** "New customer (no prior engagement found)"

### Step 4: Retrieve Opportunity-Specific Context

By opportunity type, retrieve:

**HYBRID:**
- Hybrid solution templates and reference examples
- Varrucom reseller relationship context
- Failover architecture patterns
- BOM templates for hybrid solutions
- Previous hybrid proposals as reference

**PRIVATE INFRASTRUCTURE:**
- Network architecture rules (CTTX_CRITICAL_DECISIONS.md)
- High-site design principles
- Cambium equipment specs
- Victron power design standards
- Installation and engineering models
- ROI and operational value framing

**ASSESSMENT:**
- RF analysis and Link Planner integration approach
- Feasibility report templates
- KMZ and terrain analysis standards
- Site survey methodologies

**RESELL / CARRIER:**
- Supplier pricing retrieval (Varrucom, Vodacom rate cards)
- Standard markup rules (RETRIEVE, do NOT invent)
- Package templates
- Quick quotation model

**PSI:**
- Private spectrum allocation approach
- Property-wide radio network design
- Channel planning and coverage modeling
- Managed service models

**Confirm:** "Context loaded for [OPPORTUNITY TYPE] opportunity."

### Step 5: Inspect Supplied Files

**If files mentioned, analyze immediately:**

**KMZ / KML File:**
- Extract site coordinates (latitude/longitude)
- Identify key locations (main lodge, high sites, provider masts)
- Measure distances between points
- Analyze terrain elevation profile
- Note obstacles or terrain constraints
- Create brief visual summary

**State:** "KMZ analyzed. Coordinates: [LAT/LONG]. Locations: [summary]. Distances: [key measurements]."

**Link Planner File (PDF or .lp):**
- Extract RF signal strength prediction at site
- Identify fade margin calculation
- Note recommended antenna specifications (gain, type, mounting height)
- Extract link distances and propagation model
- Identify viable links and marginal paths
- Extract capacity/throughput predictions

**State:** "Link Planner output analyzed. Signal strength: [summary]. Fade margin: [value]. Recommended antenna: [specs]. Viable links: [list]."

**Network Design / Infrastructure:**
- Analyze existing topology
- Identify current pain points and constraints
- Understand requirement drivers
- Note physical site constraints (power, access, space, terrain)

**State:** "Existing infrastructure analyzed: [Current setup]. Pain points: [key issues]. Constraints: [summary]."

**RF Reports / Propagation Studies:**
- Extract coverage predictions
- Identify LOS-clear paths and multi-hop chains
- Note problematic areas
- Extract capacity data

**RF Analysis / Site Information:**
- Analyze requirements
- Extract scope of work
- Understand site access and power capabilities

**Critical:** Do NOT ask about file contents. If files are mentioned, extract the information automatically. If files would be relevant but not mentioned, ask specifically: "Do you have the Link Planner output? It would help confirm RF specs."

### Step 6: Identify Missing Information

Use MINIMUM-QUESTION Principle: Ask ONLY when:
1. Information cannot be found in existing CTTX knowledge
2. Cannot be derived from supplied files or evidence
3. Materially affects solution or price
4. Proceeding without it risks incorrect result

**Format:** MISSING → WHY IT MATTERS → QUESTION

Example:
```
MISSING: Site coordinates or distance to Varrucom transmitter
WHY IT MATTERS: Determines antenna requirements, link capacity, and RF path viability
QUESTION: Can you measure the distance from the main lodge to the nearest Varrucom tower, or provide coordinates from the KMZ file?
```

**Do NOT ask:** Questions whose answers exist in CTTX documentation, supplied files, or standard procedures.

Examples of questions to AVOID:
- "Are you a Varrucom reseller?" (Answered by CLAUDE.md)
- "What do you sell?" (Answered by CLAUDE.md)
- "What proposal template should we use?" (Determined by opportunity type)
- "How much do Varrucom radios cost?" (Retrieve from rate card, not invented)

### Step 7: Flag Blocking Issues

**Identify information that genuinely CANNOT be obtained:**

```
BLOCKING ISSUE: Varrucom pricing not located
STATUS: Retrieve Varrucom rate card from director or supplier documentation
ACTION: Cannot finalize quotation until rate card is confirmed
```

Mark as MISSING → REQUIRES DIRECTOR DECISION (see CLAUDE.md section)

### Step 8: Route to Workflow

Based on opportunity type and information gathered:

**ASSESSMENT:**
- Retrieve Link Planner or manual RF analysis approach
- Set up feasibility report structure
- Route to GIS analysis workflow
- Output: Feasibility report + preliminary proposal

**RESELL:**
- Route to quick quote workflow
- Retrieve supplier pricing (must exist)
- Apply markup rules (must exist or request from director)
- Output: Quotation only

**CARRIER:**
- Retrieve supplier (Varrucom/Vodacom) pricing
- Retrieve recurring margin rules
- Create monthly service quotation
- Output: Quotation (2-3 pages)

**HYBRID:**
- Analyze customer requirement
- Design private infrastructure (topology, high sites, distribution)
- Identify carrier/upstream connectivity component
- Build integrated BOM (private + carrier)
- Create hybrid proposal + pricing
- Output: Proposal (7-10 pages) + Quotation (5-8 pages)

**PRIVATE INFRASTRUCTURE:**
- Run RF analysis (Link Planner or manual)
- Design backbone, distribution, access layers
- Identify high sites, link routes, LOS paths
- Build equipment BOM
- Model availability/redundancy
- Create business case (ROI, avoided loss, operational value)
- Output: Proposal (10-15 pages) + Quotation (8-10 pages) + Technical appendix

**PSI:**
- Determine frequency allocation
- Design property-wide radio network
- Create channel plan and coverage model
- Build equipment BOM and installation plan
- Design managed service model
- Output: Proposal (12-15 pages) + Quotation (10-12 pages)

**PROJECT:**
- Create project structure in Notion
- Assign to project team/delivery
- Set milestones and timeline
- Output: Project plan + handover brief

### Step 9: Start Proposal/Quotation Generation

**For known opportunity types with sufficient data:**
- Begin immediately: "Building [Customer] [Type] proposal..."
- Retrieve customer and technical data
- Populate proposal and quotation templates
- Proceed toward completion

**For opportunities with data gaps:**
- State explicitly what's needed
- Ask focused questions
- Indicate next step: "Once I have [info], I can finalize the technical specs and quotation"

**For opportunities blocked on commercial rules:**
- Mark pricing sections [AWAITING COMMERCIAL RULES]
- Document what is needed (e.g., "REQUIRES VARRUCOM RATE CARD")
- Proceed with technical/proposal content
- State: "Setup complete. Quotation requires director authorization of commercial rules and pricing."

### Step 10: File the Opportunity

Create or update directory structure:

```
sales-engine/customers/[customer-legal-name]/
├── CUSTOMER_INFO.json         ← Profile
├── PROPOSAL.md                ← Proposal document (or assessment)
├── QUOTATION.md               ← Quotation (if applicable)
├── FILES/                     ← Technical inputs
│   ├── link-planner.pdf       (if provided)
│   ├── site-design.pdf        (if provided)
│   ├── kml-mapping.kml        (if provided)
│   └── [other evidence]
└── README.md                  ← Project notes and status
```

Store in Notion CRM:
- Create/update opportunity record
- Fields: Customer, Type, Industry/Segment, Supplier, Status, Architecture, BOM outline, Next step, Date

---

## PROTOCOL SUMMARY

```
OPPORTUNITY RECOGNIZED
    ↓
PARSE CUSTOMER & DETAILS
    ↓
LOAD PERSISTENT CONTEXT (CLAUDE.md)
    ↓
RETRIEVE CUSTOMER CONTEXT (if exists)
    ↓
RETRIEVE OPPORTUNITY CONTEXT (by type)
    ↓
INSPECT SUPPLIED FILES (extract all data)
    ↓
IDENTIFY MISSING INFO (apply minimum-question principle)
    ↓
FLAG BLOCKING ISSUES (if pricing/rules missing)
    ↓
ROUTE TO WORKFLOW (by opportunity type)
    ↓
START PROPOSAL/QUOTATION GENERATION
    ↓
FILE OPPORTUNITY (directory + Notion)
    ↓
IDENTIFY REUSABLE INTELLIGENCE
```

---

## SUCCESS CRITERIA

✓ Customer recognizes their opportunity  
✓ File data extracted and used automatically  
✓ Only genuinely missing questions asked  
✓ Proposal/quotation generation starts within 2-3 turns  
✓ Opportunity filed for future reference  
✓ Reusable intelligence captured  
✓ No basic questions re-asked (those answers exist in system)  

---

**END SKILL**
