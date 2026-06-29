import { LeadQualificationAgent } from './agents/01-lead-qualification.js';
import { DiscoveryAgent } from './agents/02-discovery.js';
import { ChallengerAgent } from './agents/03-challenger.js';
import { QuotePreparationAgent } from './agents/04-quote-preparation.js';
import { FollowUpAgent } from './agents/05-follow-up.js';
import { SalesCoachAgent } from './agents/06-sales-coach.js';
import { DashboardAgent } from './agents/07-dashboard.js';
import { DataStore } from './store.js';
import { notify } from './notifications.js';

export class PipelineOrchestrator {
  constructor() {
    this.store = new DataStore();
    this.agents = {
      qualification: new LeadQualificationAgent(this.store),
      discovery: new DiscoveryAgent(this.store),
      challenger: new ChallengerAgent(this.store),
      quotePrep: new QuotePreparationAgent(this.store),
      followUp: new FollowUpAgent(this.store),
      salesCoach: new SalesCoachAgent(this.store),
      dashboard: new DashboardAgent(this.store)
    };
  }

  // === CORE FLOW: Speed Test → 30s → Scored → Notified → Human Calls ===
  async processSpeedTest(speedTestData) {
    const startTime = Date.now();

    // 1. Create lead record
    const lead = this.store.createLead({
      source: 'cruiser',
      speedTest: speedTestData,
      createdAt: new Date().toISOString(),
      stage: 'new'
    });

    // 2. Lead Qualification Agent scores immediately
    const qualification = await this.agents.qualification.score(lead);
    lead.qualification = qualification;
    lead.score = qualification.score;
    lead.tier = qualification.tier;
    lead.stage = 'qualified';

    // 3. If hot lead (score >= 70), notify salesperson immediately
    if (qualification.score >= 70) {
      await notify({
        type: 'hot_lead',
        lead,
        message: `HOT LEAD (${qualification.score}/100): ${lead.speedTest.location || 'Unknown'} - ${qualification.tier} - Download: ${lead.speedTest.download}Mbps`,
        channel: 'whatsapp' // or email
      });
    }

    // 4. Record telemetry
    const processingTime = Date.now() - startTime;
    this.store.recordTelemetry('speed_test_to_score', processingTime);
    this.store.recordTelemetry('lead_created', { leadId: lead.id, score: qualification.score });

    // 5. Schedule discovery follow-up
    if (qualification.score >= 50) {
      this.agents.followUp.scheduleInitial(lead);
    }

    this.store.updateLead(lead);
    return lead;
  }

  // === DISCOVERY: SPICED methodology ===
  async runDiscovery(leadId, responses) {
    const lead = this.store.getLead(leadId);
    if (!lead) throw new Error('Lead not found');

    const discovery = await this.agents.discovery.process(lead, responses);
    lead.discovery = discovery;
    lead.stage = 'discovered';
    lead.painScore = discovery.painScore;

    // If pain is high, escalate to challenger
    if (discovery.painScore >= 7) {
      lead.stage = 'challenger_ready';
    }

    this.store.updateLead(lead);
    return { lead, discovery };
  }

  // === CHALLENGER: Teach using their own data ===
  async runChallenger(leadId) {
    const lead = this.store.getLead(leadId);
    if (!lead) throw new Error('Lead not found');

    const challenge = await this.agents.challenger.educate(lead);
    lead.challenger = challenge;
    lead.stage = 'challenged';

    this.store.updateLead(lead);
    return { lead, challenge };
  }

  // === QUOTE PREP: Assemble everything for manual quote ===
  async prepareQuote(leadId) {
    const lead = this.store.getLead(leadId);
    if (!lead) throw new Error('Lead not found');

    const quotePack = await this.agents.quotePrep.assemble(lead);
    lead.quotePack = quotePack;
    lead.stage = 'quote_prepared';

    await notify({
      type: 'quote_ready',
      lead,
      message: `Quote pack ready for ${lead.discovery?.companyName || lead.id}: ${quotePack.recommendedPackage}`,
      channel: 'email'
    });

    this.store.updateLead(lead);
    return { lead, quotePack };
  }

  // === FOLLOW-UP: Automated multi-touch sequence ===
  async triggerFollowUp(leadId) {
    const lead = this.store.getLead(leadId);
    if (!lead) throw new Error('Lead not found');
    return this.agents.followUp.getNextAction(lead);
  }

  // === OUTCOME: Record win/loss for Sales Coach ===
  async recordOutcome(leadId, outcome) {
    const lead = this.store.getLead(leadId);
    if (!lead) throw new Error('Lead not found');

    lead.outcome = outcome;
    lead.stage = outcome.won ? 'won' : 'lost';
    lead.closedAt = new Date().toISOString();

    // Sales Coach analyses
    const analysis = await this.agents.salesCoach.analyseOutcome(lead);
    lead.coachAnalysis = analysis;

    this.store.updateLead(lead);
    this.store.recordTelemetry('deal_closed', { leadId, won: outcome.won, value: outcome.value, reason: outcome.reason });

    return { lead, analysis };
  }

  // === DASHBOARD ===
  async getDashboard() {
    return this.agents.dashboard.getSummary();
  }

  async getCoachInsights() {
    return this.agents.salesCoach.getInsights();
  }

  // === KPI: Qualified leads per 1000 speed tests ===
  getConversionKPI() {
    const totalTests = this.store.getTelemetryCount('speed_test_to_score');
    const qualifiedLeads = this.store.getLeadsByMinScore(70).length;
    const per1000 = totalTests > 0 ? Math.round((qualifiedLeads / totalTests) * 1000) : 0;
    return { totalTests, qualifiedLeads, qualifiedPer1000: per1000 };
  }
}
