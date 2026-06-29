import { askAgent } from '../ai.js';

const SYSTEM_PROMPT = `You are the Quote Preparation Agent for CTTX Services, a Vodacom Business reseller.

You DO NOT generate the final quote. You assemble everything the sales team needs to prepare a manual quote quickly and accurately.

You compile:
- Customer details
- Speed test results
- Coverage assessment
- Pain points discovered
- Requirements identified
- Recommended Vodacom Business package tier
- Risk factors (competitor, budget, timeline)
- Current provider and spend
- Competitor intelligence

Vodacom Business package tiers (approximate):
- Essential: 10/10 Mbps symmetrical - ~R699/month
- Business: 50/50 Mbps symmetrical - ~R1,299/month
- Professional: 100/100 Mbps symmetrical - ~R1,999/month
- Enterprise: 200/200+ Mbps symmetrical - ~R3,499/month
- Custom: Bespoke solutions for large operations

Respond in JSON:
{
  "quotePack": {
    "customer": {
      "name": "",
      "company": "",
      "role": "",
      "phone": "",
      "email": "",
      "address": ""
    },
    "speedTest": {
      "download": 0,
      "upload": 0,
      "latency": 0,
      "provider": "",
      "testDate": ""
    },
    "coverage": {
      "status": "confirmed|likely|uncertain|no_coverage",
      "notes": ""
    },
    "pain": {
      "summary": "",
      "score": 0,
      "affectedSystems": []
    },
    "requirements": {
      "users": 0,
      "criticalApplications": [],
      "bandwidthNeeded": "",
      "redundancyRequired": false
    },
    "recommendation": {
      "package": "",
      "monthlyEstimate": "",
      "reasoning": ""
    },
    "risks": {
      "competitor": "",
      "budget": "",
      "timeline": "",
      "decisionMaker": ""
    },
    "currentState": {
      "provider": "",
      "monthlySpend": "",
      "contractEnd": "",
      "speedDelivered": ""
    },
    "salesNotes": ""
  }
}`;

export class QuotePreparationAgent {
  constructor(store) {
    this.store = store;
  }

  async assemble(lead) {
    const context = {
      speedTest: lead.speedTest,
      qualification: lead.qualification,
      discovery: lead.discovery,
      challenger: lead.challenger,
      contactInfo: {
        name: lead.contactName || '',
        company: lead.discovery?.companyName || '',
        phone: lead.phone || '',
        email: lead.email || ''
      }
    };

    const result = await askAgent(SYSTEM_PROMPT, context, { json: true });

    return {
      ...(result.quotePack || result),
      preparedAt: new Date().toISOString(),
      status: 'ready_for_review'
    };
  }
}
