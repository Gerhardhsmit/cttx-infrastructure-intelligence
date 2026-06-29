# CTTX AI Revenue Operating System

7-agent sales pipeline + continuous growth engine for Vodacom Business reseller initiative.

## Architecture

```
CRUISER Speed Test → 30 sec → Lead Scored → Salesperson Notified → Human Calls → Sale
```

### Agents
1. **Lead Qualification** — MEDDICC scoring (0-100), tier assignment
2. **Discovery** — SPICED methodology, uncovers business pain
3. **Challenger** — Teaches using prospect's own speed test data
4. **Quote Preparation** — Assembles everything for manual quote
5. **Follow-up Machine** — Automated 6-touch sequence over 25 days
6. **Sales Coach** — Analyses wins/losses, finds patterns
7. **Management Dashboard** — Real-time pipeline metrics

### Growth Engine
- A/B testing framework with statistical significance
- Viral coefficient tracking
- Conversion funnel analytics
- SEO health monitoring
- AI discoverability scoring
- Continuous learning loop

### North Star Metric
**Client quote requests per week.**

Everything in this system optimises toward increasing the number of clients requesting CTTX to quote them each week. Secondary KPI: qualified leads per 1,000 completed speed tests.

## Quick Start

```bash
cd cttx-revenue-os
npm install
cp .env.example .env  # Edit with your keys
npm run dev
```

## API Endpoints

### Webhooks
- `POST /api/webhook/cruiser` — CRUISER speed test intake
- `POST /api/webhook/manual` — Manual lead entry

### Pipeline
- `GET /api/pipeline/leads` — All leads (filter: ?stage=&minScore=&source=)
- `GET /api/pipeline/leads/:id` — Single lead
- `GET /api/pipeline/leads/:id/discovery-questions` — Get contextual questions
- `POST /api/pipeline/leads/:id/discover` — Submit discovery answers
- `POST /api/pipeline/leads/:id/challenge` — Run challenger education
- `POST /api/pipeline/leads/:id/prepare-quote` — Generate quote pack
- `POST /api/pipeline/leads/:id/outcome` — Record win/loss
- `POST /api/pipeline/follow-ups/process` — Process scheduled follow-ups
- `GET /api/pipeline/kpi` — Core KPI

### Dashboard
- `GET /api/dashboard/summary` — Full dashboard
- `GET /api/dashboard/coach` — Sales coach insights
- `GET /api/dashboard/kpi` — Core KPI

### Growth Engine
- `GET /api/growth/status` — Executive growth dashboard
- `POST /api/growth/event` — Record telemetry event
- `GET /api/growth/funnel` — Conversion funnel
- `GET /api/growth/viral` — Viral coefficient
- `POST /api/growth/experiments` — Create A/B test
- `GET /api/growth/experiments` — List experiments
- `POST /api/growth/experiments/:id/event` — Record experiment event

## CRUISER Integration

Add `cruiser-integration.js` to CRUISER frontend. After speed test completes, it sends results to the Revenue OS webhook. Lead is scored in <30 seconds, salesperson notified immediately for hot leads.

## Deployment

Deploy to Cloudflare Workers, Railway, or any Node.js host. NOT Netlify (credits exhausted).

## Claude Code Tasks

For ongoing development, use Claude Code for:
- Bug fixes and feature additions
- New agent capabilities
- Dashboard UI build
- CRUISER webhook integration
- Deployment automation

Keep strategy, Notion setup, and Apollo config with Manus/Hippo.
