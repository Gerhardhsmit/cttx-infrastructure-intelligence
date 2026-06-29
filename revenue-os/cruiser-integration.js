// === ADD THIS TO CRUISER (cruiser-sa) AFTER SPEED TEST COMPLETES ===
// This sends the speed test result to the CTTX Revenue OS within 30 seconds
// Lead is scored, salesperson is notified, human phones the customer

const REVENUE_OS_URL = 'https://your-deployment-url.com'; // Update after deploy

async function sendToRevenueOS(speedTestResult) {
  try {
    const response = await fetch(`${REVENUE_OS_URL}/api/webhook/cruiser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        download: speedTestResult.download,
        upload: speedTestResult.upload,
        latency: speedTestResult.latency,
        jitter: speedTestResult.jitter,
        isp: speedTestResult.isp || '',
        location: speedTestResult.location || '',
        ip: speedTestResult.ip || '',
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      })
    });

    const data = await response.json();
    console.log(`[CTTX] Lead scored: ${data.score}/100 (${data.tier})`);

    // Track in growth engine
    await fetch(`${REVENUE_OS_URL}/api/growth/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'test_completed', location: speedTestResult.location })
    });

    return data;
  } catch (err) {
    console.error('[CTTX] Revenue OS webhook failed:', err);
  }
}

// === GROWTH ENGINE TELEMETRY ===
// Add these calls at the appropriate points in CRUISER:

// When page loads:
// fetch(`${REVENUE_OS_URL}/api/growth/event`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({type:'visitor'}) });

// When test starts:
// fetch(`${REVENUE_OS_URL}/api/growth/event`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({type:'test_started'}) });

// When user shares:
// fetch(`${REVENUE_OS_URL}/api/growth/event`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({type:'share', channel:'whatsapp'}) });

// When referral arrives (challenge URL):
// fetch(`${REVENUE_OS_URL}/api/growth/event`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({type:'referral'}) });
