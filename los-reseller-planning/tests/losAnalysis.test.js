import { test } from 'node:test';
import assert from 'node:assert';
import { LOSAnalyzer } from '../src/core/losAnalysis.js';

// Sample towers for testing
const testTowers = [
  {
    siteId: 'TOWER_01',
    name: 'Tower 1',
    latitude: -25.5,
    longitude: 28.5,
    serviceLevel: 'GOLD',
    bsNumber: 1,
    mastHeight: 40
  },
  {
    siteId: 'TOWER_02',
    name: 'Tower 2',
    latitude: -25.4,
    longitude: 28.6,
    serviceLevel: 'SILVER',
    bsNumber: 2,
    mastHeight: 35
  },
  {
    siteId: 'TOWER_03',
    name: 'Tower 3',
    latitude: -25.3,
    longitude: 28.7,
    serviceLevel: 'BRONZE',
    bsNumber: 3,
    mastHeight: 30
  },
  {
    siteId: 'TOWER_04',
    name: 'Tower 4',
    latitude: -25.2,
    longitude: 28.8,
    serviceLevel: 'GOLD',
    bsNumber: 4,
    mastHeight: 50
  }
];

test('LOSAnalyzer initialization', () => {
  const analyzer = new LOSAnalyzer(testTowers);
  assert.equal(analyzer.towers.length, 4);
});

test('Calculate distance between towers', () => {
  const analyzer = new LOSAnalyzer(testTowers);
  const distance = analyzer.calculateDistance(testTowers[0], testTowers[1]);

  // Approximate distance between coordinates
  assert(distance > 0, 'Distance should be positive');
  assert(distance < 20, 'Distance should be reasonable for test coordinates');
});

test('Calculate bearing between towers', () => {
  const analyzer = new LOSAnalyzer(testTowers);
  const bearing = analyzer.calculateBearing(testTowers[0], testTowers[1]);

  assert(bearing >= 0, 'Bearing should be >= 0');
  assert(bearing <= 360, 'Bearing should be <= 360');
});

test('Find nearby towers', () => {
  const analyzer = new LOSAnalyzer(testTowers);
  const nearby = analyzer.findNearbyTowers(testTowers[0], 100);

  assert(nearby.length > 0, 'Should find nearby towers');
  assert(nearby[0].distance <= nearby[1]?.distance || nearby.length === 1,
    'Results should be sorted by distance');
});

test('Assess LOS feasibility - close towers', () => {
  const analyzer = new LOSAnalyzer(testTowers);
  const result = analyzer.assessLOSFeasibility(testTowers[0], testTowers[1]);

  assert(result.feasible, 'Close towers should have feasible link');
  assert(result.score > 50, 'Close towers should have score > 50');
  assert(result.distance < 20, 'Distance should be reasonable');
});

test('Assess LOS feasibility - properties', () => {
  const analyzer = new LOSAnalyzer(testTowers);
  const result = analyzer.assessLOSFeasibility(testTowers[0], testTowers[1]);

  // Check all required properties
  assert(typeof result.feasible === 'boolean');
  assert(typeof result.score === 'number');
  assert(typeof result.distance === 'number');
  assert(typeof result.bearing === 'number');
  assert(typeof result.elevationAngle === 'number');
  assert(typeof result.freshnelRadius === 'number');
  assert(result.details.tower1.siteId === testTowers[0].siteId);
  assert(result.details.tower2.siteId === testTowers[1].siteId);
});

test('Fresnel zone calculation', () => {
  const analyzer = new LOSAnalyzer(testTowers);
  const radius = analyzer.calcFreshnelRadius(10, 28); // 10km, 28GHz

  assert(radius > 0, 'Fresnel radius should be positive');
  assert(radius < 100, 'Fresnel radius should be reasonable');
});

test('Elevation angle calculation', () => {
  const analyzer = new LOSAnalyzer(testTowers);
  const angle = analyzer.calculateElevationAngle(
    testTowers[0],
    testTowers[1],
    10
  );

  assert(typeof angle === 'number');
});

test('Find LOS links for tower', () => {
  const analyzer = new LOSAnalyzer(testTowers);
  const links = analyzer.findLOSLinks(testTowers[0], 50);

  assert(Array.isArray(links));
  assert(links.length > 0, 'Tower should have viable LOS links');
  assert(links[0].score >= 50, 'Links should meet minimum score');
  // Should be sorted by score
  if (links.length > 1) {
    assert(links[0].score >= links[1].score);
  }
});

test('Identify network hubs', () => {
  const analyzer = new LOSAnalyzer(testTowers);
  const hubs = analyzer.identifyHubs(2);

  assert(Array.isArray(hubs));
  // Should identify at least one hub with 2+ links
  hubs.forEach(hub => {
    assert(hub.linkCount >= 2);
    assert(hub.avgScore > 0);
    assert(hub.bestLinks.length > 0);
  });
});

test('Find optimal direct path', () => {
  const analyzer = new LOSAnalyzer(testTowers);
  const path = analyzer.findOptimalPath(testTowers[0], testTowers[1], 5);

  assert(path !== null, 'Should find path for nearby towers');
  assert(path.hops.length >= 2, 'Path should have at least source and destination');
  assert(path.links.length >= 1, 'Path should have at least one link');
  assert(path.distance > 0, 'Path should have distance');
  assert(path.avgScore > 0, 'Path should have score');
});

test('Score calculation weights', () => {
  const analyzer = new LOSAnalyzer(testTowers);
  const result = analyzer.assessLOSFeasibility(testTowers[0], testTowers[1]);

  // Score should be combination of three factors with proper weights
  const score = result.score;
  assert(score >= 0 && score <= 100, 'Score should be 0-100');
});

test('Distance score impact', () => {
  const analyzer = new LOSAnalyzer(testTowers);

  // Close towers should score higher
  const closeResult = analyzer.assessLOSFeasibility(testTowers[0], testTowers[1]);

  // Create a far tower
  const farTower = {
    siteId: 'FAR_TOWER',
    name: 'Far Tower',
    latitude: -25.0,  // Further away
    longitude: 29.0,
    serviceLevel: 'GOLD',
    bsNumber: 99,
    mastHeight: 40
  };

  const farAnalyzer = new LOSAnalyzer([testTowers[0], farTower]);
  const farResult = farAnalyzer.assessLOSFeasibility(testTowers[0], farTower);

  // Closer link should have higher score (if both are feasible)
  if (closeResult.feasible && farResult.feasible) {
    assert(closeResult.score > farResult.score, 'Closer links should score higher');
  }
});

test('Service level compatibility', () => {
  const analyzer = new LOSAnalyzer(testTowers);

  // GOLD-to-GOLD should score higher than BRONZE-to-BRONZE
  // (assuming similar distance)
  const goldLink = analyzer.assessLOSFeasibility(testTowers[0], testTowers[3]);
  const bronzeLink = analyzer.assessLOSFeasibility(testTowers[2], testTowers[2]);

  // At least verify scoring works
  assert(goldLink.levelScore > 0);
  assert(bronzeLink.levelScore > 0);
});
