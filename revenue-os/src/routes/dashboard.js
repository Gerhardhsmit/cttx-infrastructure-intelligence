import { Router } from 'express';

export function dashboardRoutes(orchestrator) {
  const router = Router();

  // Full dashboard summary
  router.get('/summary', async (req, res) => {
    const summary = await orchestrator.getDashboard();
    res.json(summary);
  });

  // Sales coach insights
  router.get('/coach', async (req, res) => {
    const insights = await orchestrator.getCoachInsights();
    res.json(insights);
  });

  // Core KPI: Qualified leads per 1000 speed tests
  router.get('/kpi', (req, res) => {
    res.json(orchestrator.getConversionKPI());
  });

  return router;
}
