import * as turf from 'turf';

// Constants for LOS analysis
const EARTH_RADIUS_M = 6371000; // meters
const CURVATURE_FACTOR = 1.33; // K-factor for Earth curvature effect
const MAX_DISTANCE_KM = 50; // Maximum viable LOS distance for wireless

export class LOSAnalyzer {
  constructor(towers) {
    this.towers = towers;
    this.cache = new Map();
  }

  /**
   * Calculate great circle distance between two towers in kilometers
   */
  calculateDistance(tower1, tower2) {
    const from = turf.point([tower1.longitude, tower1.latitude]);
    const to = turf.point([tower2.longitude, tower2.latitude]);
    return turf.distance(from, to, { units: 'kilometers' });
  }

  /**
   * Calculate bearing from tower1 to tower2 in degrees (0-360)
   */
  calculateBearing(tower1, tower2) {
    return turf.bearing(
      [tower1.longitude, tower1.latitude],
      [tower2.longitude, tower2.latitude]
    );
  }

  /**
   * Find towers within range of a given tower
   */
  findNearbyTowers(tower, maxDistanceKm = MAX_DISTANCE_KM) {
    return this.towers
      .filter(t => t.siteId !== tower.siteId)
      .map(t => ({
        tower: t,
        distance: this.calculateDistance(tower, t),
        bearing: this.calculateBearing(tower, t)
      }))
      .filter(item => item.distance <= maxDistanceKm)
      .sort((a, b) => a.distance - b.distance);
  }

  /**
   * Estimate fresnel zone clearance requirement
   * Fresnel radius in meters at midpoint
   */
  calcFreshnelRadius(distance, frequency = 28) {
    // For typical microwave (28 GHz) to millimeter wave frequencies
    // Distance in km, frequency in GHz
    const distanceKm = Math.max(0.1, distance);
    return Math.sqrt(
      (3000 * distanceKm) / (2 * frequency)
    );
  }

  /**
   * Estimate line-of-sight elevation angle
   * Positive = upward angle, Negative = downward angle
   */
  calculateElevationAngle(tower1, tower2, distance) {
    // Simplified model - assumes same antenna height
    // In reality, would use DEM data for terrain
    const heightDiff = (tower2.mastHeight || 30) - (tower1.mastHeight || 30);
    const angleRad = Math.atan(heightDiff / (distance * 1000));
    return (angleRad * 180) / Math.PI;
  }

  /**
   * Check LOS feasibility between two towers
   * Returns feasibility score (0-100) and detailed report
   */
  assessLOSFeasibility(tower1, tower2) {
    const distance = this.calculateDistance(tower1, tower2);

    if (distance > MAX_DISTANCE_KM) {
      return {
        feasible: false,
        score: 0,
        distance,
        reason: `Distance ${distance.toFixed(1)}km exceeds max ${MAX_DISTANCE_KM}km`,
        details: {}
      };
    }

    // Distance score (closer is better, 100% at 0km, 0% at max)
    const distanceScore = 100 * (1 - distance / MAX_DISTANCE_KM);

    // Service level compatibility
    const levelPriority = { 'GOLD': 3, 'SILVER': 2, 'BRONZE': 1 };
    const level1 = levelPriority[tower1.serviceLevel] || 1;
    const level2 = levelPriority[tower2.serviceLevel] || 1;
    const levelScore = Math.min(level1, level2) * 33.3; // 0-100

    // Bearing diversity (prefer different directions to reduce interference)
    const elevationAngle = this.calculateElevationAngle(tower1, tower2, distance);
    const elevationScore = Math.max(0, 100 - Math.abs(elevationAngle) * 5);

    const score = (distanceScore * 0.5 + levelScore * 0.3 + elevationScore * 0.2);

    return {
      feasible: score > 50,
      score: Math.round(score),
      distance,
      distanceScore: Math.round(distanceScore),
      levelScore: Math.round(levelScore),
      elevationScore: Math.round(elevationScore),
      bearing: this.calculateBearing(tower1, tower2),
      elevationAngle: Math.round(elevationAngle * 10) / 10,
      freshnelRadius: Math.round(this.calcFreshnelRadius(distance)),
      details: {
        tower1: {
          siteId: tower1.siteId,
          name: tower1.name,
          level: tower1.serviceLevel
        },
        tower2: {
          siteId: tower2.siteId,
          name: tower2.name,
          level: tower2.serviceLevel
        }
      }
    };
  }

  /**
   * Find all viable LOS links for a tower
   */
  findLOSLinks(tower, minScore = 50) {
    const nearby = this.findNearbyTowers(tower);
    return nearby
      .map(item => this.assessLOSFeasibility(tower, item.tower))
      .filter(link => link.score >= minScore)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Identify network hubs - towers with most viable LOS connections
   */
  identifyHubs(minLinksRequired = 3) {
    const hubCandidates = [];

    for (const tower of this.towers) {
      const links = this.findLOSLinks(tower, 50);
      if (links.length >= minLinksRequired) {
        hubCandidates.push({
          tower,
          linkCount: links.length,
          avgScore: Math.round(
            links.reduce((sum, l) => sum + l.score, 0) / links.length
          ),
          bestLinks: links.slice(0, 5)
        });
      }
    }

    return hubCandidates.sort((a, b) => b.linkCount - a.linkCount);
  }

  /**
   * Find optimal path between two towers (multi-hop)
   * Uses simple greedy algorithm - nearest tower that improves path
   */
  findOptimalPath(sourceTower, destTower, maxHops = 5) {
    if (this.calculateDistance(sourceTower, destTower) <= MAX_DISTANCE_KM) {
      return {
        hops: [sourceTower, destTower],
        links: [this.assessLOSFeasibility(sourceTower, destTower)],
        distance: this.calculateDistance(sourceTower, destTower),
        avgScore: this.assessLOSFeasibility(sourceTower, destTower).score
      };
    }

    // Multi-hop path finding
    const path = [sourceTower];
    const visited = new Set([sourceTower.siteId]);
    let current = sourceTower;

    for (let hop = 0; hop < maxHops; hop++) {
      const nearby = this.findNearbyTowers(current, MAX_DISTANCE_KM)
        .filter(item => !visited.has(item.tower.siteId));

      if (nearby.length === 0) break;

      // Find tower that gets us closer to destination
      const best = nearby.reduce((best, item) => {
        const distToDest = this.calculateDistance(item.tower, destTower);
        const score = this.assessLOSFeasibility(current, item.tower).score;
        return distToDest < best.distToDest ? item : best;
      });

      path.push(best.tower);
      visited.add(best.tower.siteId);
      current = best.tower;

      if (this.calculateDistance(current, destTower) <= MAX_DISTANCE_KM) {
        path.push(destTower);
        break;
      }
    }

    if (path[path.length - 1].siteId !== destTower.siteId) {
      return null; // Path not found
    }

    // Calculate total path metrics
    const links = [];
    let totalDistance = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const link = this.assessLOSFeasibility(path[i], path[i + 1]);
      links.push(link);
      totalDistance += link.distance;
    }

    const avgScore = Math.round(
      links.reduce((sum, l) => sum + l.score, 0) / links.length
    );

    return { hops: path, links, distance: totalDistance, avgScore };
  }
}

export function createLOSAnalyzer(towers) {
  return new LOSAnalyzer(towers);
}
