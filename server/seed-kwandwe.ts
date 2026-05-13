import { createAudit, createObservation } from "./db";

export async function seedKwandweDemo() {
  const kwandwe = await createAudit({
    clientName: "Kwandwe Private Game Reserve",
    sector: "Game Reserve",
    latitude: "-33.2" as any,
    longitude: "26.5" as any,
    propertySizeHa: 22000,
    operationalZones: JSON.stringify([
      "Main lodge",
      "Secondary lodges",
      "Gates",
      "Staff village",
      "Anti-poaching observation points",
      "CCTV / sensor zones",
    ]) as any,
    currentConnectivity: "Unreliable WISP from local provider, poor coverage in remote areas",
    knownProblems: JSON.stringify([
      "No signal areas",
      "Poor LTE",
      "Unreliable WISP",
      "No redundancy",
      "Load-shedding failures",
      "Weak CCTV backhaul",
    ]) as any,
    infrastructureNotes:
      "Fibre route 5km south (TFA), Vodacom tower 10km north, possible dark fibre handoff opportunity. Terrain is challenging with multiple ridges and valleys. Microwave link to main lodge is viable. Starlink backup recommended for resilience.",
    cisScore: 78,
    tciScore: 65,
    resilienceScore: 82,
    primaryArchitecture: "Microwave + Starlink + Private LTE",
    backupArchitecture: "Dual Starlink terminals with automatic failover",
    engineeringNotes: `
CONNECTIVITY INTELLIGENCE SCORE (78/100):
- Fibre proximity: 5km south (TFA dark fibre potential)
- LTE feasibility: 10km north (Vodacom tower, line-of-sight possible)
- Microwave viability: High (clear line-of-sight to main lodge)
- Satellite backup: Starlink available

TERRAIN COMPLEXITY INDEX (65/100):
- Elevation range: 800-1200m
- Obstruction zones: Multiple ridges between main lodge and tower
- Line-of-sight: Achievable with 30m mast at main lodge
- Microwave path: Clear to secondary ridge

RESILIENCE SCORE (82/100):
- Stage 4 load-shedding: 4-6 hours uptime with Starlink backup
- Stage 6 load-shedding: 2-3 hours uptime (requires solar backup)
- Redundancy: Primary (Microwave) + Secondary (Starlink) + Tertiary (LTE)
- Power backup: 48kWh battery system recommended

RECOMMENDED ARCHITECTURE:
1. Primary: 10Mbps Microwave link to TFA exchange (5km)
2. Secondary: Starlink Enterprise (50Mbps backup)
3. Tertiary: LTE failover (10Mbps from Vodacom)
4. Power: 48kWh battery + 10kW solar array

IMPLEMENTATION TIMELINE:
- Week 1-2: Site survey and microwave path validation
- Week 3-4: Fibre dark fibre negotiation with TFA
- Week 5-6: Equipment procurement and installation
- Week 7: Testing and optimization

ESTIMATED CAPEX: R450,000 - R650,000
ESTIMATED OPEX: R15,000 - R22,000/month
    `,
    status: "Published",
  });

  if (!kwandwe) {
    return kwandwe;
  }

  await Promise.all([
    createObservation({
      auditId: kwandwe.id,
      type: "Tower Sighting",
      latitude: "-33.14500000" as any,
      longitude: "26.55800000" as any,
      description: "Vodacom tower north of the reserve; candidate LTE failover and microwave high-site validation point.",
      signalReadings: { rsrp: -92, rsrq: -11, sinr: 8 } as any,
    }),
    createObservation({
      auditId: kwandwe.id,
      type: "Fibre Sighting",
      latitude: "-33.23800000" as any,
      longitude: "26.51400000" as any,
      description: "TFA fibre route south of the property; candidate dark-fibre or managed handoff discovery point.",
    }),
    createObservation({
      auditId: kwandwe.id,
      type: "Signal Observation",
      latitude: "-33.20350000" as any,
      longitude: "26.49250000" as any,
      description: "Main lodge valley shadow measurement; confirms weak LTE and obstruction-sensitive backhaul planning requirement.",
      signalReadings: { rsrp: -108, rsrq: -15, sinr: 2 } as any,
    }),
  ]);

  return kwandwe;
}
