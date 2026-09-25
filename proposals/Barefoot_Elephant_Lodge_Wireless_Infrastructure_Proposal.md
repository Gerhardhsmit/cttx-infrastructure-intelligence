# Barefoot Elephant Lodge - Wireless Infrastructure Proposal

**Quote Reference:** DUX00455421 v2  
**Prepared for:** Barefoot Elephant Lodge  
**Client Contact:** (From IR-1127371)  
**Date Prepared:** 25 September 2026  
**Prepared by:** Gerhard Smit, CTTX Services (Pty) Ltd  
**Valid Until:** 2 October 2026

---

## Executive Summary

This proposal outlines a comprehensive wireless infrastructure upgrade for Barefoot Elephant Lodge, designed to deliver enterprise-grade connectivity throughout the property. The solution combines industry-leading point-to-point and point-to-multipoint wireless technology with reliable local network infrastructure, enabling seamless guest connectivity, operational efficiency, and future scalability.

**Equipment Investment (Incl. VAT):** R161,326.60  
**Infrastructure Investment (Incl. VAT):**
- Mast (9m + Plinth): R44,505.00
- Cabinet (w/ MPPT & Li Battery Switchgear): R32,970.50
- Solar Panels (Canadian 680W x4): R10,120.00
- Invertor (Grid/Solar): R2,472.50
- **Infrastructure Subtotal:** R90,068.00  

**Total Equipment + Infrastructure (Incl. VAT):** R251,394.60  
**Still Pending:** Mounting Brackets & Hardware — Quote TBD  
**Grand Total (Incl. All):** R251,394.60 + TBD  
*(Cost Saving: R20,730 excluded for surge suppressors — using proper earthing instead)*  
**Currency:** South African Rand  
**Delivery:** Stock available; selected items ETA mid-November 2026

---

## 1. The Challenge

Barefoot Elephant Lodge requires reliable, high-performance wireless connectivity across a distributed property to support:
- Guest Wi-Fi services and experience expectations
- Operational networks (POS, reservations, management systems)
- Security and surveillance infrastructure
- Staff communication and coordination
- Future expansion and service enhancements

Traditional connectivity solutions (terrestrial fibre, standard LTE) may not be viable due to geographic isolation or infrastructure constraints at the lodge's location.

---

## 2. Proposed Solution

The CTTX infrastructure solution leverages a hybrid wireless network architecture combining:

### 2.1 Point-to-Point Backhaul (Primary Connectivity)
**Equipment:** ePMP 4500L 5GHz Access Points + ePMP Force 4525L Subscriber Modules

- **Dedicated Microwave Link:** High-capacity wireless backhaul between your primary base station and the lodge
- **Uncontended Bandwidth:** Dedicated spectrum allocation ensuring consistent performance
- **Weather-Resilient:** 5GHz technology optimized for African climate conditions
- **Low-Latency:** Ideal for real-time applications (POS, VoIP, video conferencing)

### 2.2 Local Wireless Distribution
**Equipment:** DuxNet Wi-Fi 6 Infrastructure

- **28x DuxNet Ceiling APs:** Optimal coverage across indoor lodge spaces with 1Gb WAN/LAN capability
- **2x DuxNet Outdoor APs:** Extended coverage for outdoor areas, entertainment spaces, and future expansion
- **Seamless Roaming:** Guest devices automatically switch between APs without disconnection

### 2.3 Network Core & Protection
**Equipment:** DuxNet Managed Switches + Proper Earthing

- **4x DuxNet 8-Port Gigabit PoE+ L2 Cloud Switches:** Intelligent network switching with cloud management
- **Grounding & Earthing:** Comprehensive earthing system protecting all outdoor and indoor network nodes

### 2.4 Outdoor Infrastructure & Power
**Equipment:** Mast, Cabinet, Solar Power, Mounting Brackets

- **Outdoor Mast:** Steel communication tower for elevated antenna placement and line-of-sight optimization
- **Outdoor Equipment Cabinet:** Weather-sealed enclosure for backhaul equipment, switches, and power conditioning
- **Solar Power System:** Renewable energy solution with battery backup for reliable off-grid operation
- **Radio Brackets & Mounts:** Heavy-duty mounting hardware for antennas, APs, and equipment installation

---

## 3. Technical Architecture

```
                          OUTDOOR INFRASTRUCTURE
                   ┌──────────────────────────────┐
                   │   Steel Mast Tower           │
                   │ ┌─ ePMP 4500L APs (x2)      │
                   │ ├─ Radio Brackets            │
                   │ └─ Sector Antennas (2x)      │
                   └──────────────────────────────┘
                          ↓ (Microwave Link)
                   ┌──────────────────────────────┐
              ┌────┤ Weather-Sealed Cabinet       │
              │    │ • ePMP Backhaul Equipment   │
              │    │ • DuxNet Switches           │
              │    │ • Surge Suppressors         │
              │    │ • Power Conditioning        │
              │    └──────────────────────────────┘
              │           ↓
         SOLAR POWER    DuxNet L2 Cloud Switches
         SYSTEM         (x4) [Network Intelligence]
    • Panels               ↓
    • Battery Bank   Primary Distribution
    • Charge Ctrl    DuxNet Wi-Fi 6 Ceiling APs (x28)
    • Inverter       Secondary Distribution
                     DuxNet Outdoor APs (x2)
                            ↓
                     Guest & Operational Networks
```

### Key Technical Specifications

| Component | Model | Qty | Specification |
|-----------|-------|-----|----------------|
| **Backhaul Terminal** | ePMP 4500L 5GHz AP | 2 | 2x2 MIMO, AC PoE, 17dBi antenna |
| **Backhaul SM** | ePMP Force 4525L | 28 | 5GHz, 25dBi antenna, AC PoE (ETA Mid-Nov) |
| **Indoor Access Points** | DuxNet WI-FI 6 Ceiling AP | 28 | 1Gb WAN/LAN, L3 capable |
| **Outdoor Access Points** | DuxNet Outdoor Dual-Band WI-FI 6 | 2 | 1Gb LAN, weather-resistant |
| **Network Switches** | DuxNet 8-Port PoE+ L2 Cloud | 4 | Gigabit, 2x SFP uplinks, cloud managed |
| **Grounding & Earthing** | Comprehensive Earthing System | 1 | Protects all nodes via proper ground design |
| **Outdoor Mast** | 9m Galvanized Steel Tower with Plinth | 1 | Height: 9m, Pre-installed concrete foundation, CTTX certified |
| **Equipment Cabinet** | Weather-Sealed Outdoor Enclosure w/ MPPT & Li Battery Switchgear | 1 | Backhaul radios, switches, MPPT charge controller, Lithium battery switchgear, climate control |
| **Solar Panels** | Canadian 680W Monocrystalline | 4 | 2,720W total capacity, weather-resistant |
| **Invertor** | Grid/Solar Invertor | 1 | Seamless grid/solar switching, battery management |
| **Mounting Hardware** | Radio Brackets & Mounts | TBD | Stainless steel, vibration-dampened, UV-resistant (Quote TBD) |

---

## 4. Implementation Approach

### Phase 1: Design & Planning (Week 1)
- Site survey and RF propagation modeling
- Power budget analysis for outdoor links
- Network topology design and VLAN planning
- Equipment staging and pre-configuration

### Phase 2: Infrastructure Installation (Weeks 2-3)
- Mounting structure installation (antennas, APs, switches)
- Cabling and surge suppressor deployment
- Power distribution verification
- Initial equipment configuration

### Phase 3: Deployment & Testing (Weeks 4-5)
- ePMP backhaul link commissioning
- DuxNet AP deployment and RF optimization
- Roaming and failover testing
- Guest and operational network segregation
- Performance validation and SLA confirmation

### Phase 4: Training & Handover (Week 6)
- Staff training on network management
- Documentation handover
- Ongoing support transition

---

## 5. Pricing Summary

### Equipment & Infrastructure Costs (Excl. VAT)

| Category | Details | Qty | Unit Price | Total |
|----------|---------|-----|------------|-------|
| **Backhaul Equipment** | ePMP 4500L APs | 2 | R8,470 | R16,940 |
| | ePMP Sector Antenna 90/120 | 2 | R3,209 | R6,418 |
| | ePMP Force 4525L SMs (28 units) | 28 | R2,745 | R76,860 |
| **Local Distribution** | DuxNet Wi-Fi 6 Ceiling APs | 28 | R1,025 | R28,700 |
| | DuxNet Outdoor Dual-Band APs | 2 | R1,885 | R3,770 |
| | DuxNet Gigabit PoE+ L2 Switches | 4 | R1,899 | R7,596 |
| **Grounding & Protection** | Comprehensive Earthing System | 1 | — | Included |
| **Outdoor Infrastructure** | 9m Steel Mast with Plinth (CTTX) | 1 | R38,700 | **R38,700** |
| | Outdoor Cabinet w/ MPPT & Li Battery Switchgear | 1 | R28,670 | **R28,670** |
| | Canadian 680W Solar Panels | 4 | R2,200 | **R8,800** |
| | Grid/Solar Invertor | 1 | R2,150 | **R2,150** |
| | Mounting Brackets & Hardware | TBD | TBD | **TBD** |
| | | | | |
| **Equipment SUBTOTAL (Excl. VAT)** | | | | **R140,284.00** |
| **Equipment VAT (15%)** | | | | **R21,042.60** |
| **Equipment TOTAL (Incl. VAT)** | | | | **R161,326.60** |
| | | | | |
| **Infrastructure SUBTOTAL (Excl. VAT)** | *Mast + Cabinet + Solar Panels + Invertor + Brackets* | | | **R78,320 + TBD** |
| **Infrastructure VAT (15%)** | | | | **R11,748 + TBD** |
| **Infrastructure TOTAL (Incl. VAT)** | *Mast + Cabinet + Solar (Partial)* | | | **R90,068 + TBD** |
| | | | | |
| **EQUIPMENT + INFRASTRUCTURE (Incl. VAT)** | *(Equipment + Mast + Cabinet + Solar Panels + Invertor)* | | | **R251,394.60** |
| **GRAND TOTAL (+ Mounting Brackets)** | *(Final - Pending Brackets Quote)* | | | **R251,394.60 + TBD** |

### Additional Costs (If Required)

- **Installation & Configuration Services:** Contact Duxbury for SLA-backed installation rates
- **Delivery (Outside Gauteng):** R120 per order (for orders < R2,500 excl. VAT)
- **Travel (If Required):** R975/hour (pro rata) + R9/km mileage
- **Site Survey:** May be required to finalize design

---

## 6. Service & Support

### Our Service Offerings Include

- **Remote Configuration:** Ongoing network tuning and optimization
- **On-Site Support:** Maintenance visits and troubleshooting
- **Installation & Configuration:** End-to-end deployment
- **Service Level Agreements:** Custom SLA options available

### Post-Deployment Support

- **30-Day Warranty:** Full vendor warranty on all equipment
- **Ongoing Monitoring:** Proactive network health monitoring
- **Escalation Support:** Direct access to CTTX technical team
- **Performance Reports:** Monthly connectivity and performance analytics

---

## 7. Stock & Delivery Status

| Item | Status | Notes |
|------|--------|-------|
| ePMP 4500L APs | ✓ In Stock | Ready for immediate deployment |
| ePMP Sector Antennas | ✓ In Stock | Ready for immediate deployment |
| Gigabit Suppressors (56V) | ✓ In Stock | Ready for immediate deployment |
| **ePMP Force 4525L SMs** | ⏳ ETA Mid-Nov | Critical path item; order confirmation required |
| Gigabit Suppressors (30V) | ✓ 100+ In Stock | Ready for immediate deployment |
| DuxNet Wi-Fi 6 Ceiling APs | ✓ 40+ In Stock | Ready for immediate deployment |
| DuxNet PoE+ Switches | ✓ 20+ In Stock | Ready for immediate deployment |
| DuxNet Outdoor APs | ✓ In Stock (9) | Ready for immediate deployment |

**Note:** The ePMP Force 4525L subscriber modules (28 units) are currently out of stock with ETA mid-November 2026. We recommend placing order now to secure allocation and enable parallel preparation work.

---

## 8. Vendor & Payment Terms

### Vendor Details
**Duxbury Networking (Pty) Ltd**  
Johannesburg | Cape Town | Durban  
Tel: +27 11 351-9800 (JNB) | +27 21 423-7113 (CT)  
Web: www.duxbury.co.za

### Payment Terms
- **Account:** CTTX01 (Pastel Account No.)
- **Banking Details:**  
  Nedbank Business Central  
  Branch Code: 128405  
  Account Number: 1284 008 436

- **Exchange Rate:** 17.00 (Subject to confirmation before order placement)
- **Quote Expiry:** 2 October 2026
- **Delivery:** Free for Gauteng; R120 for outside Gauteng (if applicable)

---

## 9. Investment Justification

### Why This Infrastructure?

1. **Scalability:** 28 APs + 4 switches provide capacity for 500+ simultaneous guests
2. **Reliability:** Managed switches + redundant surge protection = enterprise uptime
3. **Performance:** Gigabit backbone eliminates bottlenecks
4. **Future-Proof:** Wi-Fi 6 + L2 cloud switching support next 5+ years of growth
5. **Managed Service:** Cloud-enabled switches allow remote monitoring and optimization

### ROI Drivers

- **Guest Satisfaction:** Premium connectivity improves reviews and booking rates
- **Operational Efficiency:** Reliable POS, reservations, and communication systems
- **Revenue Protection:** Zero downtime = uninterrupted booking and payment processing
- **Competitive Advantage:** Enterprise-grade infrastructure differentiates the lodge
- **Expansion Ready:** Foundation for future services (surveillance, IoT, analytics)

---

## 10. Next Steps

### Immediate Actions (Week of 25 Sept 2026)

1. **Review & Approval:** Confirm this proposal aligns with your infrastructure objectives
2. **Final Confirmation:** 
   - Confirm equipment quantities (especially 28x ePMP 4525L units)
   - Approve exchange rate (currently 17.00)
   - Identify any additional custom requirements
3. **Order Placement:** Submit PO to Duxbury via CTTX (Brandon Devine, prepared by)
4. **Site Preparation:** Begin physical preparation (mounting points, cable runs, power)

### Timeline

| Milestone | Target Date | Owner |
|-----------|------------|-------|
| Proposal Approval | 26-27 Sept | Barefoot Elephant Lodge |
| PO Placement | 27 Sept | CTTX / Duxbury |
| Equipment Staging | 30 Sept - 15 Nov | Duxbury |
| Site Preparation | 1-15 Oct | Barefoot + CTTX |
| Physical Installation | 15-30 Nov | CTTX + Duxbury |
| Testing & Handover | 1-14 Dec | CTTX |
| Live Deployment | 15 Dec 2026 | Barefoot Elephant Lodge |

---

## 11. Questions & Support

For technical details, clarifications, or custom requirements, please contact:

**Gerhard Smit**  
Business Owner | CTTX Services (Pty) Ltd  
📞 084 550 3281  
✉️ gerhard@cttx.co.za  
🌐 cttx.co.za

**Brandon Devine**  
Sales Representative | Duxbury Networking  
(Quote Reference: DUX00455421)

---

## Terms & Conditions

- This quote is subject to Duxbury Networking's standard terms and conditions
- Pricing subject to exchange rate fluctuations, import duties, and vendor pricing changes
- **Exchange Rate Confirmation Required:** Prices valid only for in-stock items
- Travel and installation services quoted separately at R975/hour (pro rata) + R9/km
- Standard vendor warranties apply per manufacturer
- All prices exclude VAT
- E&OE (Errors and Omissions Excepted)

---

**Document:** Barefoot Elephant Lodge Wireless Infrastructure Proposal  
**Quote Reference:** DUX00455421 v2  
**Prepared:** 25 September 2026  
**Prepared by:** Gerhard Smit, CTTX Services (Pty) Ltd  
**Valid Until:** 2 October 2026

---

*This proposal is confidential and prepared solely for Barefoot Elephant Lodge. Unauthorized copying or distribution is prohibited.*
