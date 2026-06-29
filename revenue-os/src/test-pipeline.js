import { config } from 'dotenv';
config();

import { PipelineOrchestrator } from './orchestrator.js';

const orchestrator = new PipelineOrchestrator();

async function testFullPipeline() {
  console.log('\\n=== CTTX Revenue OS - Pipeline Test ===\\n');

  // Simulate a CRUISER speed test result
  console.log('1. Simulating CRUISER speed test...');
  const lead = await orchestrator.processSpeedTest({
    speedTest: {
      download: 8.2,
      upload: 1.4,
      latency: 67,
      jitter: 23,
      isp: 'Rain',
      location: 'Pretoria East',
      timestamp: new Date().toISOString()
    },
    contactName: 'Test User',
    phone: '+27821234567',
    email: 'test@example.co.za',
    companyName: 'Test Farm Operations',
    customerType: 'business',
    currentSpend: 'R2300'
  });

  console.log(`   Lead ID: ${lead.id}`);
  console.log(`   Score: ${lead.score}/100`);
  console.log(`   Tier: ${lead.tier}`);
  console.log(`   Next Action: ${lead.qualification?.nextAction}`);

  // Run discovery
  console.log('\\n2. Running Discovery (SPICED)...');
  const discovery = await orchestrator.runDiscovery(lead.id, {
    trigger: 'Teams calls keep dropping during client meetings',
    type: 'business',
    users: '12 staff',
    calls: 'Yes, at least 3 times per week',
    cctv: 'Yes, 6 cameras, footage is choppy',
    cost: 'We estimate R15,000/month in lost productivity',
    tried: 'Called Rain twice, they say coverage is fine'
  });
  console.log(`   Pain Score: ${discovery.discovery.painScore}/10`);
  console.log(`   Ready for Challenger: ${discovery.discovery.readyForChallenger}`);

  // Run challenger
  console.log('\\n3. Running Challenger Agent...');
  const challenge = await orchestrator.runChallenger(lead.id);
  console.log(`   Headline: ${challenge.challenge.headline}`);
  console.log(`   Speed Gap: ${challenge.challenge.speedGapPercent}%`);

  // Prepare quote
  console.log('\\n4. Preparing Quote Pack...');
  const quote = await orchestrator.prepareQuote(lead.id);
  console.log(`   Recommended: ${quote.quotePack.recommendation?.package || 'See pack'}`);
  console.log(`   Status: ${quote.quotePack.status}`);

  // Dashboard
  console.log('\\n5. Dashboard Summary...');
  const dashboard = await orchestrator.getDashboard();
  console.log(`   Today's Leads: ${dashboard.todaysLeads}`);
  console.log(`   Hot Leads: ${dashboard.hotLeads}`);
  console.log(`   Core KPI (qualified/1000): ${dashboard.coreKPI.qualifiedPer1000}`);

  console.log('\\n=== Pipeline Test Complete ===\\n');
}

testFullPipeline().catch(console.error);
