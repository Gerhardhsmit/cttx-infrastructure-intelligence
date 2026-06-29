import { Router } from 'express';

export function webhookRoutes(orchestrator) {
  const router = Router();

  // CRUISER speed test webhook
  // Speed Test Finished → 30 seconds → Lead scored → Salesperson notified → Human phones
  router.post('/cruiser', async (req, res) => {
    try {
      const { download, upload, latency, jitter, isp, location, ip, userAgent, timestamp,
              contactName, phone, email, companyName, customerType, currentSpend } = req.body;

      const lead = await orchestrator.processSpeedTest({
        speedTest: {
          download: download || 0,
          upload: upload || 0,
          latency: latency || 0,
          jitter: jitter || 0,
          isp: isp || '',
          location: location || '',
          ip: ip || '',
          userAgent: userAgent || '',
          timestamp: timestamp || new Date().toISOString()
        },
        // Optional contact info if captured
        contactName: contactName || '',
        phone: phone || '',
        email: email || '',
        companyName: companyName || '',
        customerType: customerType || '',
        currentSpend: currentSpend || ''
      });

      res.json({
        success: true,
        leadId: lead.id,
        score: lead.score,
        tier: lead.tier,
        nextAction: lead.qualification?.nextAction
      });
    } catch (err) {
      console.error('[Webhook Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Manual lead entry (from web form, phone call, etc)
  router.post('/manual', async (req, res) => {
    try {
      const lead = await orchestrator.processSpeedTest(req.body);
      res.json({ success: true, leadId: lead.id, score: lead.score, tier: lead.tier });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
