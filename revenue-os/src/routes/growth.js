import { Router } from 'express';

export function growthRoutes(growthEngine) {
  const router = Router();

  // Growth engine status (executive dashboard)
  router.get('/status', async (req, res) => {
    const status = await growthEngine.getStatus();
    res.json(status);
  });

  // Record telemetry event
  router.post('/event', (req, res) => {
    growthEngine.recordEvent(req.body);
    res.json({ success: true });
  });

  // Conversion funnel
  router.get('/funnel', (req, res) => {
    res.json(growthEngine.getConversionFunnel());
  });

  // Viral metrics
  router.get('/viral', (req, res) => {
    res.json(growthEngine.getViralCoefficient());
  });

  // A/B Testing
  router.post('/experiments', (req, res) => {
    const exp = growthEngine.createExperiment(req.body);
    res.json(exp);
  });

  router.get('/experiments', (req, res) => {
    res.json({
      active: growthEngine.store.getActiveExperiments(),
      concluded: growthEngine.store.experiments.filter(e => e.status === 'concluded')
    });
  });

  router.post('/experiments/:id/event', (req, res) => {
    const { variantId, converted } = req.body;
    growthEngine.recordExperimentEvent(req.params.id, variantId, converted);
    res.json({ success: true });
  });

  return router;
}
