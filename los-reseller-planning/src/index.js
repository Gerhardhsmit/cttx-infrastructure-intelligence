import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  initDatabase,
  getAllTowers,
  getTower,
  getTowersByLocation,
  getEquipmentForTower,
  getLOSLinksFrom,
  getStats,
  closeDatabase
} from './services/database.js';
import { createLOSAnalyzer } from './core/losAnalysis.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let analyzer;

// Initialize on startup
async function startServer() {
  try {
    await initDatabase();
    const towers = await getAllTowers();
    analyzer = createLOSAnalyzer(towers);
    console.log(`✓ LOS Analyzer initialized with ${towers.length} towers`);

    app.listen(PORT, () => {
      console.log(`\n🛰️  LOS Reseller Planning API running on http://localhost:${PORT}`);
      console.log('\nAvailable endpoints:');
      console.log('  GET  /api/health');
      console.log('  GET  /api/stats');
      console.log('  GET  /api/towers');
      console.log('  GET  /api/towers/:siteId');
      console.log('  GET  /api/towers/:siteId/equipment');
      console.log('  GET  /api/towers/:siteId/los-links');
      console.log('  POST /api/los/analyze');
      console.log('  POST /api/los/hubs');
      console.log('  POST /api/los/path');
      console.log('\n');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', analyzer: analyzer ? 'ready' : 'initializing' });
});

// Database statistics
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all towers
app.get('/api/towers', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const offset = parseInt(req.query.offset) || 0;

    const allTowers = await getAllTowers();
    const towers = allTowers.slice(offset, offset + limit);

    res.json({
      data: towers,
      count: towers.length,
      total: allTowers.length,
      limit,
      offset
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get specific tower
app.get('/api/towers/:siteId', async (req, res) => {
  try {
    const tower = await getTower(req.params.siteId);
    if (!tower) {
      return res.status(404).json({ error: 'Tower not found' });
    }
    res.json(tower);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get equipment for tower
app.get('/api/towers/:siteId/equipment', async (req, res) => {
  try {
    const equipment = await getEquipmentForTower(req.params.siteId);
    res.json({ siteId: req.params.siteId, equipment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get LOS links from tower
app.get('/api/towers/:siteId/los-links', async (req, res) => {
  try {
    const links = await getLOSLinksFrom(req.params.siteId);
    res.json({ siteId: req.params.siteId, links });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Analyze LOS between two towers
app.post('/api/los/analyze', async (req, res) => {
  try {
    const { tower1Id, tower2Id } = req.body;

    if (!tower1Id || !tower2Id) {
      return res.status(400).json({ error: 'tower1Id and tower2Id required' });
    }

    if (!analyzer) {
      return res.status(503).json({ error: 'Analyzer not initialized' });
    }

    const tower1 = await getTower(tower1Id);
    const tower2 = await getTower(tower2Id);

    if (!tower1 || !tower2) {
      return res.status(404).json({ error: 'One or both towers not found' });
    }

    const analysis = analyzer.assessLOSFeasibility(tower1, tower2);
    const links = await Promise.all([
      getEquipmentForTower(tower1Id),
      getEquipmentForTower(tower2Id)
    ]);

    res.json({
      analysis,
      equipment: {
        tower1: links[0],
        tower2: links[1]
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Find network hubs
app.post('/api/los/hubs', async (req, res) => {
  try {
    const { minLinks = 3, minScore = 50 } = req.body;

    if (!analyzer) {
      return res.status(503).json({ error: 'Analyzer not initialized' });
    }

    const hubs = analyzer.identifyHubs(minLinks);
    const filtered = hubs
      .map(h => ({
        ...h,
        bestLinks: h.bestLinks.filter(l => l.score >= minScore)
      }))
      .filter(h => h.bestLinks.length > 0)
      .slice(0, 50); // Limit to top 50 hubs

    res.json({
      hubs: filtered,
      count: filtered.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Find optimal path between towers
app.post('/api/los/path', async (req, res) => {
  try {
    const { fromSiteId, toSiteId, maxHops = 5 } = req.body;

    if (!fromSiteId || !toSiteId) {
      return res.status(400).json({ error: 'fromSiteId and toSiteId required' });
    }

    if (!analyzer) {
      return res.status(503).json({ error: 'Analyzer not initialized' });
    }

    const from = await getTower(fromSiteId);
    const to = await getTower(toSiteId);

    if (!from || !to) {
      return res.status(404).json({ error: 'One or both towers not found' });
    }

    const path = analyzer.findOptimalPath(from, to, maxHops);

    if (!path) {
      return res.json({ error: 'No viable path found' });
    }

    res.json(path);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

startServer();
