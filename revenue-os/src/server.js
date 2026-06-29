import express from 'express';
import { config } from 'dotenv';
import { PipelineOrchestrator } from './orchestrator.js';
import { GrowthEngine } from './growth/engine.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { webhookRoutes } from './routes/webhooks.js';
import { pipelineRoutes } from './routes/pipeline.js';
import { growthRoutes } from './routes/growth.js';

config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Core systems
const orchestrator = new PipelineOrchestrator();
const growthEngine = new GrowthEngine();

// Routes
app.use('/api/webhook', webhookRoutes(orchestrator));
app.use('/api/pipeline', pipelineRoutes(orchestrator));
app.use('/api/dashboard', dashboardRoutes(orchestrator));
app.use('/api/growth', growthRoutes(growthEngine));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'live', agents: 7, version: '1.0.0' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\\n=== CTTX AI Revenue Operating System ===`);
  console.log(`Port: ${PORT}`);
  console.log(`Webhook: POST /api/webhook/cruiser`);
  console.log(`Dashboard: GET /api/dashboard/summary`);
  console.log(`Growth: GET /api/growth/status`);
  console.log(`=========================================\\n`);
});

export { app, orchestrator, growthEngine };
