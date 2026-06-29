import { askAgent } from '../ai.js';
import { notify } from '../notifications.js';

// Follow-up sequence timing
const SEQUENCE = [
  { day: 1, type: 'thank_you', channel: 'whatsapp', template: 'Thanks for testing your speed with CRUISER. We noticed your connection is underperforming. Would you like to see what Vodacom Business can deliver in your area?' },
  { day: 3, type: 'coverage_update', channel: 'email', template: 'Good news — we checked coverage in your area. Here is what is available for your location.' },
  { day: 6, type: 'educational', channel: 'email', template: 'Most businesses in SA are paying for speeds they never receive. Here is how to tell if your provider is delivering what you pay for.' },
  { day: 10, type: 'price_comparison', channel: 'whatsapp', template: 'Quick comparison: you are currently getting {download}Mbps. For a similar monthly cost, Vodacom Business delivers {recommended} symmetrical with an SLA.' },
  { day: 15, type: 'reminder', channel: 'email', template: 'Still experiencing slow connectivity? The offer we discussed is still available. Happy to run through the numbers when you are ready.' },
  { day: 25, type: 'final', channel: 'whatsapp', template: 'Last check-in. If your connectivity has improved, great. If not, we are here when you are ready. No pressure — just better infrastructure when you need it.' }
];

export class FollowUpAgent {
  constructor(store) {
    this.store = store;
  }

  scheduleInitial(lead) {
    const schedule = SEQUENCE.map(step => ({
      ...step,
      leadId: lead.id,
      scheduledDate: this._addDays(new Date(), step.day).toISOString(),
      status: 'pending'
    }));

    lead.followUpSchedule = schedule;
    this.store.updateLead(lead);
    return schedule;
  }

  getNextAction(lead) {
    if (!lead.followUpSchedule) return { action: 'none', reason: 'No schedule set' };

    const now = new Date();
    const next = lead.followUpSchedule.find(s =>
      s.status === 'pending' && new Date(s.scheduledDate) <= now
    );

    if (!next) {
      const upcoming = lead.followUpSchedule.find(s => s.status === 'pending');
      return { action: 'wait', nextDate: upcoming?.scheduledDate, type: upcoming?.type };
    }

    return { action: 'send', step: next };
  }

  async processScheduledFollowUps() {
    const allLeads = this.store.getAllLeads();
    const now = new Date();
    const processed = [];

    for (const lead of allLeads) {
      if (!lead.followUpSchedule) continue;
      if (lead.stage === 'won' || lead.stage === 'lost') continue;

      for (const step of lead.followUpSchedule) {
        if (step.status !== 'pending') continue;
        if (new Date(step.scheduledDate) > now) continue;

        // Generate personalised message
        const message = await this._personalise(step, lead);

        // Send notification
        await notify({
          type: `follow_up_${step.type}`,
          lead,
          message,
          channel: step.channel
        });

        step.status = 'sent';
        step.sentAt = now.toISOString();
        processed.push({ leadId: lead.id, type: step.type });
      }

      this.store.updateLead(lead);
    }

    return { processed: processed.length, details: processed };
  }

  async _personalise(step, lead) {
    let msg = step.template;
    msg = msg.replace('{download}', lead.speedTest?.download || '?');
    msg = msg.replace('{recommended}', lead.qualification?.estimatedDealValue || '100/100');
    msg = msg.replace('{location}', lead.speedTest?.location || 'your area');
    return msg;
  }

  _addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }
}
