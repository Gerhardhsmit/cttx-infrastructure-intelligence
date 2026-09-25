# Hybrid Wireless Connectivity Proposal

**Prepared for:** Elephant Barefoot Lodge (Pty) Ltd  
**Date:** 25 September 2026  
**Prepared by:** Gerhard Smit, CTTX Services (Pty) Ltd  
**Proposal ID:** EBL-2026-09-001

---

## 1. Executive Summary

Elephant Barefoot Lodge requires reliable, redundant connectivity to support guest WiFi, operational systems, and security infrastructure. The proposed hybrid solution combines Varrucom wireless connectivity with a secondary failover path, delivering carrier-grade reliability without waiting for fiber infrastructure deployment.

This proposal delivers:
- **Hybrid Architecture:** Primary Varrucom wireless + secondary failover link
- **Uncontended Bandwidth:** Dedicated backhaul, not shared with residential users
- **Rapid Deployment:** No trenching required; 10-14 business day installation
- **Managed Service:** 24/7 monitoring and proactive support from CTTX

---

## 2. Current Challenge

Elephant Barefoot Lodge operates in a remote location requiring robust connectivity for:
- **Guest Experience:** Reliable WiFi for lodge guests across multiple areas
- **Operations:** POS systems, booking systems, and administrative functions
- **Security:** CCTV backhaul for security camera networks across the property
- **Resilience:** Backup connectivity to ensure business continuity

**Current Situation:** [*To be completed from client network design and Link Planner output*]
- Existing connectivity: [*Extract from client information*]
- Coverage analysis: [*Extract from Link Planner output*]
- Geographic constraints: [*Extract from KMZ file*]

---

## 3. The CTTX Hybrid Solution

### 3.1 Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│           Elephant Barefoot Lodge                   │
│  ┌──────────────┐    ┌──────────────┐              │
│  │  Guest WiFi  │    │  Operations  │              │
│  │  CCTV/Sec    │    │  POS/Admin   │              │
│  └──────────────┘    └──────────────┘              │
│         │                    │                      │
│         └────────┬───────────┘                      │
│                  │                                  │
│         ┌────────▼────────┐                         │
│         │  Dual Modem     │                         │
│         │  Load Balancer  │                         │
│         └────────┬────────┘                         │
│                  │                                  │
│    ┌─────────────┴──────────────┐                   │
│    │                            │                   │
│    ▼                            ▼                   │
│  Varrucom               [Secondary Failover]       │
│  Wireless Link          [To be configured]         │
│  (Primary)              (Backup/Redundancy)        │
│    │                            │                   │
│    └─────────────┬──────────────┘                   │
│                  │                                  │
│                  ▼                                  │
│         CTTX Network Operations                     │
│         (Monitoring & Support)                      │
└─────────────────────────────────────────────────────┘
```

### 3.2 Technical Specifications

**Primary Link: Varrucom Wireless**
- **Coverage Analysis:** [*Extract from Link Planner output*]
- **Line-of-Sight:** [*Extract from KMZ file and site survey data*]
- **Frequency Band:** [*To be determined from Varrucom specs*]
- **Uplink Speed:** [*To be confirmed*] Mbps
- **Downlink Speed:** [*To be confirmed*] Mbps
- **Latency:** [*Typical: <30ms*]

**Secondary Link (Failover):** [*Architecture to be finalized based on available options*]
- Option A: LTE Backup (e.g., Vodacom/MTN Business LTE)
- Option B: VSAT with automatic failover
- Option C: Dual Varrucom dishes for redundancy

**Load Balancer & Management**
- Dual-modem gateway device
- Automatic failover in <2 seconds
- QoS prioritization (security > operations > guest WiFi)
- Unified management dashboard

---

## 4. Implementation Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| **1. Survey** | 3-5 days | Site visit, RF assessment, LOS verification |
| **2. Design Finalization** | 3-5 days | Link budget calculation, equipment sizing |
| **3. Equipment Procurement** | 5-7 days | Order specialized equipment from Varrucom |
| **4. Installation** | 1-2 days | On-site equipment installation and configuration |
| **5. Testing & Handover** | 1 day | Load testing, failover testing, client training |
| **Total Timeline** | ~14-21 days | From survey approval to service live |

---

## 5. Investment Structure

All pricing excludes VAT. 24-month minimum term applies.

### 5.1 One-Time Setup Costs

| Item | Cost |
|------|------|
| Site Survey (RF assessment, LOS verification) | R 3,500* |
| Equipment & Installation (hybrid gateway, modems, cabling) | R [*TBD - based on configuration*] |
| Integration Testing & Commissioning | R 2,000 |
| **TOTAL SETUP** | **R [TBD]** |

*Site survey fee is 50% credited against first three months of service if contract is signed.

### 5.2 Monthly Service Costs

| Component | Tier | Speed | Monthly Cost |
|-----------|------|-------|--------------|
| **Varrucom Primary** | Standard | [*TBD*] | R [*TBD*] |
| **Secondary Failover** | Backup | [*TBD*] | R [*TBD*] |
| **Managed Service** | Pro | 24/7 support | R 1,500 |
| **TOTAL MONTHLY** | | | **R [TBD]** |

### 5.3 Example Configurations

**Configuration A: Small Lodge (20-30 guests)**
- Varrucom 20 Mbps/20 Mbps primary
- LTE backup
- One dual-modem gateway
- Monthly: R [*TBD*]

**Configuration B: Medium Lodge (50-70 guests)**
- Varrucom 50 Mbps/50 Mbps primary
- LTE or secondary Varrucom backup
- Dual gateway for redundancy
- Monthly: R [*TBD*]

**Configuration C: Large Resort (100+ guests + CCTV)**
- Varrucom 100 Mbps/100 Mbps primary
- Dual backup (VSAT + LTE)
- Redundant gateways + failover controller
- Monthly: R [*TBD*]

---

## 6. Key Benefits

### Reliability
- **99.5% Uptime SLA:** Managed service with proactive monitoring
- **Automatic Failover:** Seamless backup activation (<2 seconds)
- **Redundancy:** Multiple connectivity paths prevent single point of failure

### Performance
- **Uncontended Bandwidth:** Dedicated backhaul—you get what you pay for, 24/7
- **Consistent Speeds:** No contention with residential users
- **QoS Management:** Critical systems (security) prioritized over guest WiFi

### Deployment
- **No Trenching:** Wireless solution = rapid deployment
- **Minimal Disruption:** Rooftop equipment, hidden cabling
- **Scalability:** Easy to add capacity or redundancy later

### Support
- **CTTX Managed Service:** Proactive monitoring, maintenance, and support
- **24/7 Responsiveness:** Emergency support number provided
- **Technical Training:** Staff training on failover and basic troubleshooting

---

## 7. RF Coverage Analysis

[*This section to be populated from Link Planner output*]

**Propagation Model:** [*Extract from Link Planner*]
- Terrain elevation profile (from KMZ file)
- Predicted signal strength at installation site
- Expected Fade Margin (FM)
- Recommended antenna gain and height

**Site-Specific Factors:**
- Distance to Varrucom transmitter: [*TBD*]
- Line-of-sight obstruction analysis: [*TBD*]
- RF noise floor assessment: [*TBD*]

---

## 8. Next Steps

### Immediate Actions (Client)
1. **Approve Survey:** Reply to this email confirming:
   - Preferred hybrid configuration (A, B, or C)
   - Best dates for site survey visit
   - Primary decision-maker contact for installation day

2. **Provide Access:** Confirm roof/tower access for survey and installation

3. **Review Timeline:** Confirm deployment window aligns with business schedule

### CTTX Actions
1. **Schedule Survey:** Coordinate RF assessment with client
2. **Link Budget Analysis:** Finalize technical specs from survey data
3. **Equipment Procurement:** Order Varrucom and backup components
4. **Final Quotation:** Provide detailed cost breakdown once specs confirmed

### Timeline to Service Go-Live
- Survey approved: [Day 0]
- Survey completed: [Day 3-5]
- Final quotation & equipment order: [Day 5-7]
- Equipment arrival: [Day 12-14]
- Installation & testing: [Day 14-21]
- **Service Live:** [Day 21]

---

## 9. Terms & Conditions

- **Contract Term:** 24 months minimum
- **Service Level:** 99.5% uptime SLA with managed service
- **Payment Terms:** Monthly in advance (1st of each month)
- **Early Termination:** Pro-rata equipment recovery fee applies
- **Support Response:** Critical (security) within 4 hours; Standard within 24 hours
- **Annual Price Review:** CPI adjustment + inflation (max 8% per annum)

---

## 10. Contact & Acceptance

To proceed with this proposal, please:

1. **Approve the survey** and confirm configuration preference
2. **Sign the acceptance** below
3. **Return by:** [*Date 7 days from proposal date*]

Once received, CTTX will schedule your site survey within 5 business days.

---

**Proposal Acceptance**

```
Client Signature: ___________________________    Date: __________

Print Name: ________________________________

Title: ______________________________________

Company: ____________________________________
```

---

**CTTX Services Contact**

📞 **Gerhard Smit** (Owner)  
📱 084 550 3281  
✉️ gerhard@cttx.co.za  
🌐 cttx.co.za

**Proposal prepared on:** 25 September 2026  
**Proposal valid until:** 25 October 2026  
**Proposal ID:** EBL-2026-09-001
