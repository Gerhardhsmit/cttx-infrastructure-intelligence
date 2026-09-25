# Barefoot Elephant Lodge - Outdoor Cable Schedule & Calculation

**Project:** Wireless Infrastructure Deployment  
**Date:** 25 September 2026  
**Prepared by:** Gerhard Smit, CTTX Services

---

## Cable Run Requirements

### Overview
The outdoor infrastructure requires multiple cable runs connecting:
- **9m Mast** (with ePMP backhaul equipment and antennas)
- **Weather-Sealed Cabinet** (with network switches, MPPT, battery switchgear)
- **Solar Panel Array** (4x 680W panels)
- **Grounding/Earthing System**

---

## Simplified Cable Calculation (Base Rate: R12/meter)

### Cable Runs Required

**Mast to Cabinet Infrastructure:**
- Antenna feed runs (2x): 12m each = 24m
- Ethernet/Network runs (2x): 20m each = 40m
- Power runs (main): 20m

**Radios WAN Network:**
- ePMP Backhaul radio to cabinet: 20m
- WAN network cable (cabinet to lodge): 50m (estimate)

**Access Points (Indoor + Outdoor):**
- Ethernet to 28x Indoor Ceiling APs: ~200m (distributed throughout lodge)
- Ethernet to 2x Outdoor APs: ~30m
- Power PoE to 30 APs: ~200m (PoE included in network cable)

**Solar & Power Distribution:**
- Solar panels to charge controller: 20m
- Battery to invertor: 8m
- Invertor to distribution: 15m

**Grounding & Earthing:**
- Mast grounding: 15m
- Cabinet grounding: 10m
- Equipment bonding: 20m

| Cable Run Category | Length (m) | Unit Cost | Total |
|-------------------|-----------|-----------|-------|
| **Outdoor Infrastructure** | | | |
| Antenna & Mast Cables | 44m | R12/m | R528 |
| Mast to Cabinet Network | 60m | R12/m | R720 |
| Mast to Cabinet Power | 20m | R12/m | R240 |
| **WAN & Radios** | | | |
| Backhaul Radio WAN Cable | 20m | R12/m | R240 |
| WAN Network (Cabinet to Lodge) | 50m | R12/m | R600 |
| **Indoor Access Points** | | | |
| Ceiling APs (28x) Network Runs | 200m | R12/m | R2,400 |
| Outdoor APs (2x) Network Runs | 30m | R12/m | R360 |
| AP Power Distribution (PoE) | 200m | R12/m | R2,400 |
| **Solar & Power System** | | | |
| Solar Panel Cables | 20m | R12/m | R240 |
| Battery & Invertor Cables | 23m | R12/m | R276 |
| **Grounding & Earthing** | | | |
| Mast Grounding System | 45m | R12/m | R540 |
| **Contingency & Spares** | | | |
| Spare Cable (10% buffer) | 70m | R12/m | R840 |
| | | | |
| **CABLE TOTAL (ALL RUNS)** | **682m** | **R12/m** | **R8,184** |

---

## Cable Totals Summary

| Category | Subtotal |
|----------|----------|
| Antenna Feeds (LMR-400 Coax) | R3,110 |
| Ethernet Runs (Cat6A) | R3,180 |
| Power Cables to Mast | R1,640 |
| Solar DC Cables & Combiner | R4,270 |
| Grounding & Earthing System | R2,504 |
| Battery & Invertor Cables | R2,040 |
| Spare Cable & Contingency | R3,715 |
| | |
| **CABLE SUBTOTAL (Excl. VAT)** | **R20,459** |
| **VAT (15%)** | **R3,068.85** |
| **CABLE TOTAL (Incl. VAT)** | **R23,527.85** |

---

## Installation Labor Estimate (Cable Works)

Outdoor cable installation typically requires:

| Task | Est. Hours | Rate | Total |
|------|-----------|------|-------|
| Cable runs & routing (mast to cabinet) | 16 hours | R350/hr | R5,600 |
| Antenna feed termination & testing | 8 hours | R350/hr | R2,800 |
| Solar cable installation & testing | 6 hours | R350/hr | R2,100 |
| Grounding system installation | 8 hours | R350/hr | R2,800 |
| Testing & commissioning (continuity, insulation) | 4 hours | R350/hr | R1,400 |
| **INSTALLATION LABOR SUBTOTAL** | **42 hrs** | | **R14,700** |
| **INSTALLATION VAT (15%)** | | | **R2,205** |
| **INSTALLATION LABOR TOTAL** | | | **R16,905** |

---

## Complete Cable & Installation Cost

| Component | Cost (Incl. VAT) |
|-----------|-----------------|
| Cable Materials | R23,527.85 |
| Installation Labor | R16,905.00 |
| **CABLE + INSTALLATION TOTAL** | **R40,432.85** |

---

## Cable Specification Summary

### Critical Specifications

**Antenna Feed Cables:**
- Type: LMR-400 low-loss coax
- Impedance: 50Ω
- Frequency: DC-6 GHz
- Weatherproof: UV-resistant outer jacket
- Terminated: N-type male connectors

**Ethernet Cables:**
- Type: Cat6A armored outdoor rated
- Twisted pair, shielded
- Minimum bend radius: 25mm
- Outdoor temperature rating: -40°C to +60°C

**Power Cables:**
- Type: Armored copper conductors
- Insulation: PVC, oil/UV resistant
- Sizing: 10mm² (to mast), 25mm² (battery to invertor)
- Rating: Suitable for outdoor/weather exposure

**Solar DC Cables:**
- Type: Solar PV wire (UL4703 rated)
- Sizing: 6mm² (panel to combiner), 10mm² (combiner to cabinet)
- Connectors: MC4 solar connectors (industry standard)
- Voltage rating: 600V DC minimum

**Grounding System:**
- Conductor: Minimum 16mm² copper
- Rods: Minimum 3m length copper, 3/8" diameter
- Resistance target: <5Ω to earth
- Bonding: All metal structures connected

---

## Important Notes

1. **Cable Lengths:** Calculated for 9m mast with ~15-20m horizontal distance from mast to cabinet. Adjust based on actual site layout.

2. **Weather Protection:** All outdoor runs include conduit, cable trays, and weatherproof connectors for harsh African climate.

3. **Testing Requirements:** All cables must be tested for:
   - Continuity (all runs)
   - Insulation resistance (1000V megger test)
   - Signal integrity (ethernet runs)
   - Voltage drop (power runs)

4. **Safety Compliance:** Installation follows:
   - SABS (South African Bureau of Standards) guidelines
   - IEC 61936 outdoor installations
   - Local electrical codes and lightning protection standards

5. **Future Expansion:** Spare cable allowance included for additional AP deployments or power distribution upgrades.

---

## Recommendations

1. **Pre-Site Survey:** Confirm exact cable run distances and routing before procurement
2. **Professional Installation:** Outdoor cable work requires skilled technicians familiar with high-frequency (antenna) and DC (solar) systems
3. **Quality Connectors:** Invest in quality weather-sealed connectors — these are failure points in outdoor deployments
4. **Testing & Documentation:** Insist on comprehensive testing reports and cable layout diagrams post-installation
5. **Spare Parts:** Keep extra connectors, cable sections, and clips on site for maintenance

---

**Prepared by:** Gerhard Smit, CTTX Services (Pty) Ltd  
**Date:** 25 September 2026  
**Valid Until:** 2 October 2026
