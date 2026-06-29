# Claude Code Tasks — CTTX Revenue OS

Paste these into Claude Code / Claude Desktop for efficient code execution.

## Context for Claude Code

You are working on the CTTX AI Revenue Operating System. This is a 7-agent sales pipeline + growth engine for a Vodacom Business reseller in South Africa.

**North Star Metric:** Client quote requests per week.

**Repo:** https://github.com/Gerhardhsmit/cttx-infrastructure-intelligence
**Path:** /revenue-os/ (or separate repo if preferred)
**Stack:** Node.js, Express, OpenAI API, Notion API
**Deploy target:** Cloudflare Workers or Railway (NOT Netlify)

---

## Task 1: Push Revenue OS to GitHub

```
Clone the repo, create a /revenue-os directory, add all source files, commit and push.
Ensure .env is in .gitignore.
```

## Task 2: Deploy to Railway/Cloudflare

```
Deploy the Revenue OS server. It needs:
- Node.js 18+ runtime
- Environment variables (OPENAI_API_KEY, NOTION_API_KEY, etc)
- Public URL for the webhook endpoint
- Return the deployed URL so CRUISER can be configured to send speed tests to it.
```

## Task 3: Wire CRUISER Webhook

```
In the cruiser-sa Cloudflare Pages project, add the webhook call after speed test completes.
Use the cruiser-integration.js file as reference.
The webhook URL is: [DEPLOYED_URL]/api/webhook/cruiser
Also add telemetry events for: visitor, test_started, test_completed, share, referral.
Do NOT change CRUISER's appearance or core function.
```

## Task 4: Build Dashboard UI

```
Build a simple HTML dashboard that calls the API endpoints and displays:
- Quote requests this week (north star)
- Today's leads count
- Hot leads count
- Quotes outstanding
- Average response time
- Close rate
- Revenue pipeline
- Top region
- Top competitor
- Conversion funnel visualisation
- Core KPI: qualified per 1000 tests

Use Tailwind CSS. Dark theme. Clean. No frameworks needed — vanilla JS + fetch.
Deploy as static page alongside the API.
```

## Task 5: Notion Database Setup

```
Using the Notion API, create a sales pipeline database with properties:
- Company (title)
- Contact (text)
- Role (text)
- Phone (phone)
- Email (email)
- Location (text)
- Lead Source (select: CRUISER, Apollo, LinkedIn, Referral, Website)
- Stage (select: New, Qualified, Discovery, Challenged, Quote Prepared, Won, Lost)
- Score (number)
- Tier (select: Hot, Warm, Nurture, Cold)
- Pain Score (number)
- Deal Value (number)
- Next Action (text)
- Follow-up Date (date)
- Current Provider (text)
- Current Spend (text)
- Notes (text)
- Speed Test Download (number)
- Speed Test Upload (number)

Create views: Pipeline Board, Hot Leads, Follow-up Today, Won Deals, Lost Deals.
```

## Task 6: Add Lead Capture to CRUISER

```
After speed test completes and results are shown, add a subtle opt-in:
"Want to see what's available in your area? Leave your number."
- Single input field (phone or email)
- Small, non-intrusive, appears below results
- Only shows if download < 50Mbps
- Sends to Revenue OS webhook with contact info attached
Do NOT change the speed test UI or flow. This is additive only.
```

## Rules for Claude Code

1. Never change CRUISER's appearance or core speed test function
2. All code changes must be additive
3. Use gerhardcttx@gmail.com or gerhard@cttx.co.za — never gh.smit.GS@gmail.com
4. Deploy to Cloudflare or Railway — never Netlify
5. Keep the north star metric visible: quote requests per week
6. South African context always — no American terminology
7. Test before deploying
8. Commit with clear messages
