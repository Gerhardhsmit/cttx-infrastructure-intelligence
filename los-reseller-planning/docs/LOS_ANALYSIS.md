# LOS (Line-of-Sight) Analysis Guide

## Overview

The LOS Analysis engine evaluates the feasibility of establishing wireless links between Vodacom tower sites. It uses distance, bearing, elevation angles, and service level compatibility to calculate link viability scores.

## Core Concepts

### 1. Distance Calculation
- **Method**: Great circle distance (Haversine formula)
- **Units**: Kilometers
- **Maximum Viable Distance**: 50 km (configurable)
- **Why it matters**: Longer links require higher antenna gains and experience more path loss

### 2. Service Level Compatibility
Tower sites are classified by service level:
- **GOLD**: Premium infrastructure, full redundancy, high capacity
- **SILVER**: Standard infrastructure, moderate capacity
- **BRONZE**: Basic infrastructure, limited capacity

Links between towers of similar/higher service levels are prioritized.

### 3. Elevation Angle
- **Calculation**: Angle between two towers' antenna patterns
- **Positive angle**: Receiver is upward from transmitter
- **Negative angle**: Receiver is downward
- **Practical range**: -5° to +15° for typical microwave links
- **Impact**: Steep angles reduce link quality and require more power

### 4. Fresnel Zone
- **Definition**: Ellipsoidal zone around the direct line-of-sight path
- **Clearance**: Minimum 60% first Fresnel zone clearance required for acceptable performance
- **Formula**: R = √(3000 × D / (2 × f))
  - D = distance in km
  - f = frequency in GHz
  - R = radius in meters

### 5. Bearing
- **Range**: 0-360 degrees (North = 0°/360°)
- **Purpose**: Navigation reference and diversity assessment
- **Antenna orientation**: Link operational only if both ends have appropriate antenna pattern

## Feasibility Scoring

The LOS Analyzer produces a **Feasibility Score (0-100)** based on three weighted factors:

```
Score = (Distance Score × 0.5) + (Level Score × 0.3) + (Elevation Score × 0.2)
```

### Distance Score (50% weight)
- 100% at 0 km
- 0% at 50 km
- Linear decay: `score = 100 × (1 - distance / 50)`

### Level Score (30% weight)
- GOLD-to-Gold: 100 points (33.3% weight)
- GOLD-to-Silver: 66.6 points
- GOLD-to-Bronze: 33.3 points
- Silver-to-Silver: 66.6 points
- Silver-to-Bronze: 33.3 points
- Bronze-to-Bronze: 33.3 points

### Elevation Score (20% weight)
- Optimum at 0° elevation
- Penalty: 5 points per degree absolute deviation
- `score = 100 - |elevation_angle| × 5`

## Link Feasibility Rules

A link is considered **Feasible** if:
1. **Distance**: ≤ 50 km
2. **Score**: ≥ 50/100
3. **Elevation**: Ideally between -5° and +15°
4. **Fresnel clearance**: ≥ 60% first Fresnel zone (estimated)

## API Endpoints

### 1. Analyze Single Link
```
POST /api/los/analyze
{
  "tower1Id": "LIM_18801",
  "tower2Id": "KZN_15381"
}

Response:
{
  "analysis": {
    "feasible": true,
    "score": 85,
    "distance": 12.4,
    "bearing": 240.5,
    "elevationAngle": 2.3,
    "freshnelRadius": 45
  },
  "equipment": {
    "tower1": [...],
    "tower2": [...]
  }
}
```

### 2. Find Network Hubs
```
POST /api/los/hubs
{
  "minLinks": 3,
  "minScore": 50
}

Response:
{
  "hubs": [
    {
      "tower": { ... },
      "linkCount": 12,
      "avgScore": 72,
      "bestLinks": [ ... ]
    }
  ],
  "count": 5
}
```

### 3. Find Optimal Path
```
POST /api/los/path
{
  "fromSiteId": "LIM_18801",
  "toSiteId": "SGC_39061",
  "maxHops": 5
}

Response:
{
  "hops": [ tower1, tower2, tower3 ],
  "links": [
    { "distance": 12.4, "score": 85 },
    { "distance": 18.2, "score": 72 }
  ],
  "distance": 30.6,
  "avgScore": 78.5
}
```

## Planning Considerations

### For Resellers

**High-Score Links (80+)**
- Direct point-to-point backhaul
- Premium service offerings
- Lower latency, high reliability

**Medium-Score Links (50-79)**
- May require additional equipment
- Acceptable for secondary paths
- Good for diversity/redundancy

**Low-Score Links (<50)**
- Not recommended for production use
- May only work with specialized equipment
- Consider alternative paths

### Network Topology

**Hub-and-Spoke**: Deploy aggregation equipment at hub sites with multiple high-score outbound links

**Mesh Networks**: Use medium-score links to create redundant paths

**Daisy-Chain**: Use multi-hop paths with consistent bearing for linear coverage

## Limitations & Disclaimers

⚠️ **This analysis assumes:**
- No terrain obstruction (ideal line-of-sight)
- Standard atmospheric conditions
- Omnidirectional or broad-pattern antennas
- No physical line-of-sight obstructions

⚠️ **Real-world LOS links require:**
- Field surveys with terrain data (DEM/LiDAR)
- RF path analysis with actual antenna patterns
- Weather impact assessment
- Interference analysis from other systems
- Physical site visits and clearance surveys

## Future Enhancements

- [ ] DEM-based terrain obstruction detection
- [ ] Real antenna pattern modeling
- [ ] Interference prediction
- [ ] Rain fade and atmospheric effects
- [ ] Fiber route optimization
- [ ] Equipment cost optimization
- [ ] Capacity planning integration
