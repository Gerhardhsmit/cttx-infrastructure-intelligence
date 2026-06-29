import { askAgent } from '../ai.js';

const SYSTEM_PROMPT = `You are the Lead Qualification Agent for CTTX Services, a Vodacom Business reseller in South Africa.

Your ONLY job: determine if this person is worth spending time on. Score them 0-100.

You score based on:
- Customer type: Residential (low), SME (medium), Business (high), Enterprise (highest)
- Current provider and monthly spend
- Location (non-metro = higher value, metro with fibre = lower value)
- Coverage availability (underserved = higher value)
- Pain level (based on speed test results vs what they pay)
- Buying timeframe (immediate need = higher)
- Download speed vs paid speed ratio (lower ratio = more pain)

Scoring weights:
- Customer type: 0-20 points
- Pain level (speed gap): 0-25 points
- Location value: 0-15 points
- Monthly spend potential: 0-15 points
- Buying urgency: 0-15 points
- Business impact: 0-10 points

Tiers:
- 85-100: HOT LEAD - immediate callback required
- 70-84: WARM LEAD - same-day contact
- 50-69: NURTURE - add to sequence
- 30-49: COLD - monitor only
- 0-29: DISQUALIFIED - not a fit

Always respond in JSON format:
{
  "score": number,
  "tier": "hot|warm|nurture|cold|disqualified",
  "customerType": "residential|sme|business|enterprise",
  "painLevel": number (1-10),
  "reasoning": "brief explanation",
  "nextAction": "what should happen next",
  "estimatedDealValue": "monthly rand value estimate",
  "urgency": "immediate|this_week|this_month|no_rush|unknown"
}`;

export class LeadQualificationAgent {
  constructor(store) {
    this.store = store;
  }

  async score(lead) {
    const speedTest = lead.speedTest || {};

    const context = {
      download: speedTest.download || 0,
      upload: speedTest.upload || 0,
      latency: speedTest.latency || 0,
      jitter: speedTest.jitter || 0,
      isp: speedTest.isp || 'unknown',
      location: speedTest.location || 'unknown',
      ip: speedTest.ip || '',
      userAgent: speedTest.userAgent || '',
      timestamp: speedTest.timestamp || new Date().toISOString(),
      // Additional context if available
      customerType: lead.customerType || 'unknown',
      currentSpend: lead.currentSpend || 'unknown',
      companyName: lead.companyName || '',
      contactName: lead.contactName || '',
      phone: lead.phone || '',
      email: lead.email || ''
    };

    const result = await askAgent(SYSTEM_PROMPT, context, { json: true });

    return {
      score: result.score || 0,
      tier: result.tier || 'cold',
      customerType: result.customerType || 'unknown',
      painLevel: result.painLevel || 0,
      reasoning: result.reasoning || '',
      nextAction: result.nextAction || '',
      estimatedDealValue: result.estimatedDealValue || 'unknown',
      urgency: result.urgency || 'unknown',
      scoredAt: new Date().toISOString()
    };
  }
}
