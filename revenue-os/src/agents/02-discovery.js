import { askAgent } from '../ai.js';

const SYSTEM_PROMPT = `You are the Discovery Agent for CTTX Services, a Vodacom Business reseller.

You use SPICED methodology to uncover real business pain — not just collect contact details.

SPICED:
S - Situation: What is their current setup?
P - Pain: What problems does bad connectivity cause?
I - Impact: What is the business cost of this pain?
C - Critical Event: What triggered them to look now?
E - Decision: Who decides and what's the process?
D - Decision Criteria: What matters most to them?

Your discovery questions (adapt based on context):
- "What made you test your speed today?"
- "Is this affecting work or just home use?"
- "Is this your home or business connection?"
- "How many people rely on this connection?"
- "Are Teams/Zoom calls dropping?"
- "Are CCTV cameras affected?"
- "Is this costing your business money?"
- "Have you tried to fix this before?"
- "What would reliable connectivity change for your operation?"

Based on the lead's speed test data and their responses, produce a discovery summary.

Respond in JSON:
{
  "situation": "current connectivity setup summary",
  "pain": "identified pain points",
  "impact": "business/financial impact of the pain",
  "criticalEvent": "what triggered them to act now",
  "decisionProcess": "who decides, timeline",
  "decisionCriteria": "what matters most",
  "painScore": number (1-10),
  "companyName": "if discovered",
  "employeeCount": "if discovered",
  "currentProvider": "if discovered",
  "currentSpend": "if discovered",
  "affectedSystems": ["list of affected systems - CCTV, VoIP, SCADA, etc"],
  "suggestedNextQuestions": ["follow-up questions if needed"],
  "readyForChallenger": boolean
}`;

export class DiscoveryAgent {
  constructor(store) {
    this.store = store;
  }

  async process(lead, responses) {
    const context = {
      speedTest: lead.speedTest,
      qualification: lead.qualification,
      responses: responses // answers to discovery questions
    };

    const result = await askAgent(SYSTEM_PROMPT, context, { json: true });

    return {
      ...result,
      discoveredAt: new Date().toISOString()
    };
  }

  // Generate contextual discovery questions based on speed test
  getQuestions(lead) {
    const speed = lead.speedTest?.download || 0;
    const questions = [
      { id: 'trigger', text: 'What made you test your speed today?' },
      { id: 'type', text: 'Is this your home or business connection?' },
      { id: 'users', text: 'How many people rely on this connection daily?' }
    ];

    if (speed < 10) {
      questions.push({ id: 'calls', text: 'Are video calls dropping or freezing?' });
      questions.push({ id: 'cctv', text: 'Do you have cameras that struggle to stream?' });
    }
    if (speed < 25) {
      questions.push({ id: 'cost', text: 'Is this connectivity issue costing your business money?' });
      questions.push({ id: 'tried', text: 'Have you tried to fix this before? What happened?' });
    }
    questions.push({ id: 'change', text: 'What would reliable, fast connectivity change for your operation?' });

    return questions;
  }
}
