import { askAgent } from '../ai.js';
import { DataStore } from '../store.js';

export class GrowthEngine {
  constructor() {
    this.store = new DataStore();
  }

  // === TELEMETRY RECORDING ===
  recordEvent(event) {
    // Events: impression, visitor, test_started, test_completed, share, referral,
    // lead_submitted, quote_requested, manual_sale, conversion
    this.store.recordTelemetry(event.type, {
      ...event,
      timestamp: new Date().toISOString()
    });
  }

  // === A/B TESTING FRAMEWORK ===
  createExperiment({ name, variants, metric, minSampleSize = 100 }) {
    return this.store.createExperiment({
      name,
      variants: variants.map(v => ({ ...v, impressions: 0, conversions: 0 })),
      metric, // e.g. 'test_completed', 'share', 'lead_submitted'
      minSampleSize,
      status: 'running',
      winner: null
    });
  }

  recordExperimentEvent(experimentId, variantId, converted) {
    const experiments = this.store.experiments;
    const exp = experiments.find(e => e.id === experimentId);
    if (!exp || exp.status !== 'running') return;

    const variant = exp.variants.find(v => v.id === variantId);
    if (!variant) return;

    variant.impressions++;
    if (converted) variant.conversions++;

    // Check for statistical significance
    const allHaveMinSample = exp.variants.every(v => v.impressions >= exp.minSampleSize);
    if (allHaveMinSample) {
      const winner = this._determineWinner(exp.variants);
      if (winner) {
        exp.status = 'concluded';
        exp.winner = winner.id;
        exp.concludedAt = new Date().toISOString();
      }
    }

    this.store._save('experiments', experiments);
  }

  _determineWinner(variants) {
    // Simple significance test: >95% confidence using conversion rates
    const rates = variants.map(v => ({
      ...v,
      rate: v.impressions > 0 ? v.conversions / v.impressions : 0
    }));

    rates.sort((a, b) => b.rate - a.rate);
    const best = rates[0];
    const second = rates[1];

    if (!best || !second) return null;

    // Z-test for two proportions
    const p1 = best.rate;
    const p2 = second.rate;
    const n1 = best.impressions;
    const n2 = second.impressions;
    const pPool = (best.conversions + second.conversions) / (n1 + n2);
    const se = Math.sqrt(pPool * (1 - pPool) * (1/n1 + 1/n2));

    if (se === 0) return null;
    const z = (p1 - p2) / se;

    // z > 1.96 = 95% confidence
    return z > 1.96 ? best : null;
  }

  // === VIRAL GROWTH METRICS ===
  getViralCoefficient() {
    const shares = this.store.getTelemetryByEvent('share').length;
    const referrals = this.store.getTelemetryByEvent('referral').length;
    const tests = this.store.getTelemetryByEvent('test_completed').length;

    const shareRate = tests > 0 ? shares / tests : 0;
    const referralConversion = shares > 0 ? referrals / shares : 0;
    const viralCoefficient = shareRate * referralConversion;

    return {
      totalTests: tests,
      shares,
      referrals,
      shareRate: Math.round(shareRate * 100) + '%',
      referralConversion: Math.round(referralConversion * 100) + '%',
      viralCoefficient: viralCoefficient.toFixed(3),
      isViral: viralCoefficient > 1
    };
  }

  // === CONVERSION FUNNEL ===
  getConversionFunnel() {
    const impressions = this.store.getTelemetryByEvent('impression').length;
    const visitors = this.store.getTelemetryByEvent('visitor').length;
    const testsStarted = this.store.getTelemetryByEvent('test_started').length;
    const testsCompleted = this.store.getTelemetryByEvent('test_completed').length;
    const shares = this.store.getTelemetryByEvent('share').length;
    const leadsSubmitted = this.store.getTelemetryByEvent('lead_submitted').length;
    const quotesRequested = this.store.getTelemetryByEvent('quote_requested').length;
    const sales = this.store.getTelemetryByEvent('manual_sale').length;

    return {
      funnel: [
        { stage: 'Impressions', count: impressions, rate: '100%' },
        { stage: 'Visitors', count: visitors, rate: impressions > 0 ? Math.round(visitors/impressions*100)+'%' : '0%' },
        { stage: 'Tests Started', count: testsStarted, rate: visitors > 0 ? Math.round(testsStarted/visitors*100)+'%' : '0%' },
        { stage: 'Tests Completed', count: testsCompleted, rate: testsStarted > 0 ? Math.round(testsCompleted/testsStarted*100)+'%' : '0%' },
        { stage: 'Shares', count: shares, rate: testsCompleted > 0 ? Math.round(shares/testsCompleted*100)+'%' : '0%' },
        { stage: 'Leads Submitted', count: leadsSubmitted, rate: testsCompleted > 0 ? Math.round(leadsSubmitted/testsCompleted*100)+'%' : '0%' },
        { stage: 'Quotes Requested', count: quotesRequested, rate: leadsSubmitted > 0 ? Math.round(quotesRequested/leadsSubmitted*100)+'%' : '0%' },
        { stage: 'Sales', count: sales, rate: quotesRequested > 0 ? Math.round(sales/quotesRequested*100)+'%' : '0%' }
      ],
      coreKPI: testsCompleted > 0 ? Math.round((leadsSubmitted / testsCompleted) * 1000) : 0 // qualified per 1000
    };
  }

  // === SEO HEALTH ===
  async getSEOHealth() {
    // This would integrate with real monitoring - placeholder structure
    return {
      score: 0, // 0-100, populated by monitoring
      checks: {
        metadata: { status: 'pending', details: '' },
        schema: { status: 'pending', details: '' },
        coreWebVitals: { status: 'pending', details: '' },
        indexing: { status: 'pending', details: '' },
        internalLinks: { status: 'pending', details: '' },
        brokenLinks: { status: 'pending', details: '' },
        duplicateContent: { status: 'pending', details: '' }
      },
      lastChecked: null
    };
  }

  // === AI DISCOVERABILITY ===
  async getAIDiscoverability() {
    return {
      score: 0, // 0-100
      platforms: {
        chatgpt: { status: 'pending', mentions: 0 },
        claude: { status: 'pending', mentions: 0 },
        perplexity: { status: 'pending', mentions: 0 },
        gemini: { status: 'pending', mentions: 0 }
      },
      structuredContent: { status: 'pending' },
      semanticClarity: { status: 'pending' },
      lastChecked: null
    };
  }

  // === EXECUTIVE DASHBOARD ===
  async getStatus() {
    const viral = this.getViralCoefficient();
    const funnel = this.getConversionFunnel();
    const experiments = this.store.getActiveExperiments();
    const concludedExperiments = this.store.experiments.filter(e => e.status === 'concluded');

    return {
      coreKPI: {
        qualifiedLeadsPer1000Tests: funnel.coreKPI,
        target: 50 // target: 50 qualified leads per 1000 tests
      },
      viralMetrics: viral,
      conversionFunnel: funnel.funnel,
      experiments: {
        active: experiments.length,
        concluded: concludedExperiments.length,
        activeList: experiments.map(e => ({ id: e.id, name: e.name, metric: e.metric })),
        recentWinners: concludedExperiments.slice(-5).map(e => ({ name: e.name, winner: e.winner }))
      },
      seo: await this.getSEOHealth(),
      aiDiscoverability: await this.getAIDiscoverability(),
      optimisationLoop: {
        status: 'active',
        lastCycle: new Date().toISOString(),
        rule: 'Observe → Measure → Analyse → Hypothesise → Experiment → Validate → Deploy → Monitor'
      },
      generatedAt: new Date().toISOString()
    };
  }
}
