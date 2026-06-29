import { randomUUID } from 'crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';

const DATA_DIR = './data';

export class DataStore {
  constructor() {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    this.leads = this._load('leads') || {};
    this.telemetry = this._load('telemetry') || [];
    this.experiments = this._load('experiments') || [];
    this.outcomes = this._load('outcomes') || [];
  }

  // === LEADS ===
  createLead(data) {
    const id = `lead_${randomUUID().slice(0, 8)}`;
    const lead = { id, ...data };
    this.leads[id] = lead;
    this._save('leads', this.leads);
    return lead;
  }

  getLead(id) { return this.leads[id] || null; }

  updateLead(lead) {
    this.leads[lead.id] = lead;
    this._save('leads', this.leads);
  }

  getAllLeads() { return Object.values(this.leads); }

  getLeadsByStage(stage) {
    return Object.values(this.leads).filter(l => l.stage === stage);
  }

  getLeadsByMinScore(minScore) {
    return Object.values(this.leads).filter(l => l.score >= minScore);
  }

  getLeadsBySource(source) {
    return Object.values(this.leads).filter(l => l.source === source);
  }

  getLeadsCreatedAfter(date) {
    return Object.values(this.leads).filter(l => new Date(l.createdAt) >= new Date(date));
  }

  // === TELEMETRY ===
  recordTelemetry(event, data) {
    const entry = { event, data, timestamp: new Date().toISOString() };
    this.telemetry.push(entry);
    this._save('telemetry', this.telemetry);
    return entry;
  }

  getTelemetryCount(event) {
    return this.telemetry.filter(t => t.event === event).length;
  }

  getTelemetryByEvent(event, since) {
    return this.telemetry.filter(t => {
      if (t.event !== event) return false;
      if (since && new Date(t.timestamp) < new Date(since)) return false;
      return true;
    });
  }

  // === EXPERIMENTS (A/B Testing) ===
  createExperiment(experiment) {
    const id = `exp_${randomUUID().slice(0, 8)}`;
    const exp = { id, status: 'running', createdAt: new Date().toISOString(), ...experiment };
    this.experiments.push(exp);
    this._save('experiments', this.experiments);
    return exp;
  }

  getActiveExperiments() {
    return this.experiments.filter(e => e.status === 'running');
  }

  updateExperiment(id, updates) {
    const idx = this.experiments.findIndex(e => e.id === id);
    if (idx >= 0) {
      this.experiments[idx] = { ...this.experiments[idx], ...updates };
      this._save('experiments', this.experiments);
    }
  }

  // === OUTCOMES (for Sales Coach) ===
  recordOutcome(outcome) {
    this.outcomes.push({ ...outcome, recordedAt: new Date().toISOString() });
    this._save('outcomes', this.outcomes);
  }

  getOutcomes(filter = {}) {
    let results = [...this.outcomes];
    if (filter.won !== undefined) results = results.filter(o => o.won === filter.won);
    if (filter.since) results = results.filter(o => new Date(o.recordedAt) >= new Date(filter.since));
    return results;
  }

  // === PERSISTENCE ===
  _save(name, data) {
    try {
      writeFileSync(`${DATA_DIR}/${name}.json`, JSON.stringify(data, null, 2));
    } catch (e) { /* silent fail for now */ }
  }

  _load(name) {
    try {
      if (existsSync(`${DATA_DIR}/${name}.json`)) {
        return JSON.parse(readFileSync(`${DATA_DIR}/${name}.json`, 'utf-8'));
      }
    } catch (e) { /* silent fail */ }
    return null;
  }
}
