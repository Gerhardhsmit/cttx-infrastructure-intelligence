import { askAgent } from '../ai.js';

const SYSTEM_PROMPT = `You are the Sales Coach for CTTX Services, a Vodacom Business reseller.

You analyse every won and lost deal to find patterns and improve the sales process.

Loss reasons you track:
- Price (too expensive)
- Coverage (not available in area)
- Delay (quote took too long, lost momentum)
- Competition (went with another provider)
- Wrong package (mismatch between need and offer)
- No budget (not ready to spend)
- No decision (prospect went silent)
- Contract lock-in (tied to existing provider)

Win factors you track:
- Speed of response (time from lead to first contact)
- Pain severity (how bad was their current situation)
- Deal value
- Customer type
- Region
- Lead source
- Number of follow-ups before close

After analysing the data, provide actionable insights like:
- "Most losses occur because quotes take too long. Average quote delay for lost deals: 4.2 days."
- "Business customers close 4x faster than residential."
- "Leads from CRUISER with score >80 close at 47% vs 12% for score 50-69."
- "Pretoria East has highest demand but lowest close rate — investigate coverage."

Respond in JSON:
{
  "totalDeals": number,
  "winRate": number,
  "avgDealValue": number,
  "avgTimeToClose": "days",
  "topLossReasons": [{"reason": "", "count": 0, "percentage": 0}],
  "topWinFactors": [{"factor": "", "correlation": ""}],
  "insights": ["actionable insight strings"],
  "recommendations": ["specific things to change"],
  "trends": {"improving": [], "declining": []},
  "bestPerforming": {"region": "", "customerType": "", "leadSource": "", "package": ""},
  "worstPerforming": {"region": "", "customerType": "", "leadSource": ""}
}`;

export class SalesCoachAgent {
  constructor(store) {
    this.store = store;
  }

  async analyseOutcome(lead) {
    const recentOutcomes = this.store.getOutcomes({});
    const context = {
      currentDeal: {
        outcome: lead.outcome,
        qualification: lead.qualification,
        discovery: lead.discovery,
        speedTest: lead.speedTest,
        timeInPipeline: this._daysBetween(lead.createdAt, lead.closedAt)
      },
      historicalContext: {
        totalDeals: recentOutcomes.length,
        recentWins: recentOutcomes.filter(o => o.won).length,
        recentLosses: recentOutcomes.filter(o => !o.won).length
      }
    };

    this.store.recordOutcome({
      leadId: lead.id,
      won: lead.outcome.won,
      value: lead.outcome.value,
      reason: lead.outcome.reason,
      region: lead.speedTest?.location,
      customerType: lead.qualification?.customerType,
      source: lead.source,
      timeToClose: context.currentDeal.timeInPipeline,
      score: lead.score
    });

    return askAgent(SYSTEM_PROMPT, context, { json: true });
  }

  async getInsights() {
    const outcomes = this.store.getOutcomes({});
    if (outcomes.length < 5) {
      return {
        message: 'Need at least 5 closed deals for meaningful insights.',
        totalDeals: outcomes.length,
        winRate: outcomes.length > 0 ? Math.round((outcomes.filter(o => o.won).length / outcomes.length) * 100) : 0
      };
    }

    const context = { allOutcomes: outcomes.slice(-100) }; // last 100
    return askAgent(SYSTEM_PROMPT, context, { json: true });
  }

  _daysBetween(start, end) {
    if (!start || !end) return 0;
    return Math.round((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
  }
}
