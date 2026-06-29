import { Router } from 'express';

export function pipelineRoutes(orchestrator) {
  const router = Router();

  // Get all leads
  router.get('/leads', (req, res) => {
    const leads = orchestrator.store.getAllLeads();
    const { stage, minScore, source } = req.query;
    let filtered = leads;
    if (stage) filtered = filtered.filter(l => l.stage === stage);
    if (minScore) filtered = filtered.filter(l => l.score >= parseInt(minScore));
    if (source) filtered = filtered.filter(l => l.source === source);
    res.json({ count: filtered.length, leads: filtered });
  });

  // Get single lead
  router.get('/leads/:id', (req, res) => {
    const lead = orchestrator.store.getLead(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json(lead);
  });

  // Run discovery on a lead
  router.post('/leads/:id/discover', async (req, res) => {
    try {
      const result = await orchestrator.runDiscovery(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Get discovery questions for a lead
  router.get('/leads/:id/discovery-questions', (req, res) => {
    const lead = orchestrator.store.getLead(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    const questions = orchestrator.agents.discovery.getQuestions(lead);
    res.json({ leadId: lead.id, questions });
  });

  // Run challenger education
  router.post('/leads/:id/challenge', async (req, res) => {
    try {
      const result = await orchestrator.runChallenger(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Prepare quote pack
  router.post('/leads/:id/prepare-quote', async (req, res) => {
    try {
      const result = await orchestrator.prepareQuote(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Get follow-up status
  router.get('/leads/:id/follow-up', (req, res) => {
    const lead = orchestrator.store.getLead(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    const next = orchestrator.agents.followUp.getNextAction(lead);
    res.json(next);
  });

  // Record deal outcome (won/lost)
  router.post('/leads/:id/outcome', async (req, res) => {
    try {
      const { won, value, reason, notes } = req.body;
      const result = await orchestrator.recordOutcome(req.params.id, { won, value, reason, notes });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Process scheduled follow-ups (call via cron)
  router.post('/follow-ups/process', async (req, res) => {
    const result = await orchestrator.agents.followUp.processScheduledFollowUps();
    res.json(result);
  });

  // Core KPI
  router.get('/kpi', (req, res) => {
    res.json(orchestrator.getConversionKPI());
  });

  return router;
}
