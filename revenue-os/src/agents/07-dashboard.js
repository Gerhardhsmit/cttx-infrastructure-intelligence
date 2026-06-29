export class DashboardAgent {
  constructor(store) {
    this.store = store;
  }

  async getSummary() {
    const allLeads = this.store.getAllLeads();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayLeads = allLeads.filter(l => new Date(l.createdAt) >= today);
    const hotLeads = allLeads.filter(l => l.score >= 85 && l.stage !== 'won' && l.stage !== 'lost');
    const warmLeads = allLeads.filter(l => l.score >= 70 && l.score < 85 && l.stage !== 'won' && l.stage !== 'lost');
    const quotesOutstanding = allLeads.filter(l => l.stage === 'quote_prepared');
    const wonDeals = allLeads.filter(l => l.stage === 'won');
    const lostDeals = allLeads.filter(l => l.stage === 'lost');
    const activeLeads = allLeads.filter(l => l.stage !== 'won' && l.stage !== 'lost');

    // Pipeline value
    const pipelineValue = activeLeads.reduce((sum, l) => {
      const val = parseFloat(l.qualification?.estimatedDealValue?.replace(/[^0-9.]/g, '') || 0);
      return sum + val;
    }, 0);

    // Won revenue
    const wonRevenue = wonDeals.reduce((sum, l) => sum + (l.outcome?.value || 0), 0);

    // Close rate
    const closedDeals = wonDeals.length + lostDeals.length;
    const closeRate = closedDeals > 0 ? Math.round((wonDeals.length / closedDeals) * 100) : 0;

    // Average response time (time from lead creation to first follow-up sent)
    const responseTimes = allLeads
      .filter(l => l.followUpSchedule?.some(s => s.status === 'sent'))
      .map(l => {
        const firstSent = l.followUpSchedule.find(s => s.status === 'sent');
        if (!firstSent?.sentAt) return null;
        return (new Date(firstSent.sentAt) - new Date(l.createdAt)) / (1000 * 60); // minutes
      })
      .filter(Boolean);
    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

    // Regional breakdown
    const regions = {};
    allLeads.forEach(l => {
      const loc = l.speedTest?.location || 'Unknown';
      if (!regions[loc]) regions[loc] = { total: 0, hot: 0, won: 0 };
      regions[loc].total++;
      if (l.score >= 85) regions[loc].hot++;
      if (l.stage === 'won') regions[loc].won++;
    });

    // Most requested (by score tier)
    const packages = {};
    allLeads.forEach(l => {
      const pkg = l.quotePack?.recommendation?.package;
      if (pkg) packages[pkg] = (packages[pkg] || 0) + 1;
    });

    // Competitor tracking
    const competitors = {};
    allLeads.forEach(l => {
      const isp = l.speedTest?.isp || l.discovery?.currentProvider;
      if (isp) competitors[isp] = (competitors[isp] || 0) + 1;
    });

    // Core KPI: Qualified leads per 1000 speed tests
    const totalTests = this.store.getTelemetryCount('speed_test_to_score');
    const qualifiedCount = allLeads.filter(l => l.score >= 70).length;
    const qualifiedPer1000 = totalTests > 0 ? Math.round((qualifiedCount / totalTests) * 1000) : 0;

    return {
      // Header metrics
      todaysLeads: todayLeads.length,
      hotLeads: hotLeads.length,
      warmLeads: warmLeads.length,
      quotesOutstanding: quotesOutstanding.length,
      avgResponseTime: `${avgResponseTime} minutes`,
      closeRate: `${closeRate}%`,
      revenuePipeline: `R${(pipelineValue / 1000000).toFixed(1)} million`,
      wonRevenue: `R${wonRevenue.toLocaleString()}`,

      // Core KPI
      coreKPI: {
        totalSpeedTests: totalTests,
        qualifiedLeads: qualifiedCount,
        qualifiedPer1000: qualifiedPer1000
      },

      // Breakdowns
      mostRequestedPackage: Object.entries(packages).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A',
      topRegion: Object.entries(regions).sort((a, b) => b[1].total - a[1].total)[0]?.[0] || 'N/A',
      worstRegion: Object.entries(regions).sort((a, b) => a[1].won - b[1].won)[0]?.[0] || 'N/A',
      topCompetitor: Object.entries(competitors).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A',

      // Pipeline breakdown
      pipeline: {
        new: allLeads.filter(l => l.stage === 'new').length,
        qualified: allLeads.filter(l => l.stage === 'qualified').length,
        discovered: allLeads.filter(l => l.stage === 'discovered').length,
        challenged: allLeads.filter(l => l.stage === 'challenged').length,
        quotePrepared: quotesOutstanding.length,
        won: wonDeals.length,
        lost: lostDeals.length
      },

      // Regional detail
      regions: Object.entries(regions)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10)
        .map(([name, data]) => ({ name, ...data })),

      // Competitor detail
      competitors: Object.entries(competitors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count })),

      generatedAt: new Date().toISOString()
    };
  }
}
