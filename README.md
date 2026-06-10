# CTTX Infrastructure Intelligence Platform

Professional RF network planning and infrastructure intelligence for rural/remote connectivity in Southern Africa.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite 7 + TailwindCSS 4 + Radix UI + shadcn/ui
- **Routing:** Wouter 3
- **State/API:** TanStack Query v5 + tRPC 11
- **Backend:** Express 4 + Drizzle ORM
- **Maps:** MapLibre GL 4 with Esri satellite tiles
- **Database:** MySQL/TiDB (production) — runs without database for local development

## Local Setup (No Database Required)

The app runs fully locally without MySQL. When `DATABASE_URL` is not set, the server uses an in-memory store and a dev guest user (no login required).

```bash
# 1. Clone the repository
git clone https://github.com/Gerhardhsmit/cttx-infrastructure-intelligence.git
cd cttx-infrastructure-intelligence

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev

# 4. Open in browser
# http://localhost:5000/link-planner
```

That's it. No `.env` file needed for local development.

## Link Planner

The Link Planner is the core tool at `/link-planner`. It provides:

1. **Location Search** — Search for properties by name (Nominatim geocoding)
2. **Boundary Display** — Automatic OSM boundary polygon loading
3. **High Site Detection** — SRTM 10×10 elevation grid analysis for relay candidates
4. **Carrier Tower Integration** — Overpass API for nearby cellular infrastructure
5. **Automated Topology** — MST backbone + nearest-neighbour distribution + single carrier uplink
6. **LOS/Fresnel Analysis** — 20-point Open-Meteo elevation profiles with 60% Fresnel clearance
7. **Manual Editing** — Place facilities, adjust antenna heights, add/remove links
8. **Threshold Slider** — Viable link threshold (10–25 km, default 15 km) that recomputes topology
9. **JSON Export** — Full topology serialization for downstream integration
10. **Report Export** — HTML topology report with ROI section

### Topology Rules

| Rule | Implementation |
|------|---------------|
| One uplink only | Single L0 carrier link per topology |
| Nearest-neighbour backbone | Kruskal MST algorithm on high sites |
| Max 6 links per node | Enforced in distribution link builder |
| Amber warnings | Links exceeding threshold shown with warning |
| Gold-star closest masts | Closest mast per provider highlighted |
| No spider web | MST prevents redundant cross-links |
| No auto-connect beyond 5 km outside boundary | Remote category filtering |
| SRTM 10×10 grid | Elevation grid sampling for high site detection |

### Link Type Colors

| Layer | Type | Color |
|-------|------|-------|
| L0 | Carrier Uplink | Orange `#F97316` |
| L1 | Backbone | White `#FFFFFF` |
| Relay | Relay | Purple `#A855F7` |
| L2 | Distribution | Blue `#3B82F6` |
| L3 | Access | Cyan `#22D3EE` |

### Equipment References

- **Radio:** Cambium Networks (5.8 GHz, 60% Fresnel minimum clearance)
- **Management:** cnMaestro
- **Power:** Victron Energy + Hubble Lithium

## Running Tests

```bash
npm run test
```

## Production Deployment

For production with MySQL/TiDB:

```bash
# Set environment variables
export DATABASE_URL="mysql://user:pass@host:port/database"
export VITE_OAUTH_PORTAL_URL="https://your-oauth-portal"
export VITE_APP_ID="your-app-id"

# Build and start
npm run build
npm start
```

## Project Structure

```
├── client/src/
│   ├── pages/
│   │   ├── LinkPlanner.tsx          # Main Link Planner (2000+ lines)
│   │   └── AuditDashboard.tsx       # Audit report generation
│   ├── lib/
│   │   ├── plannerTypes.ts          # Type definitions + serialization
│   │   ├── linkPlanner.ts           # Topology engine (API-backed)
│   │   ├── gisAutoScan.ts           # GIS scanning utilities
│   │   ├── reportDownload.ts        # Report generation (MD + HTML)
│   │   └── reportTemplate.ts        # Report section definitions
│   └── components/
│       └── Map.tsx                   # MapLibre GL wrapper
├── server/
│   ├── db.ts                        # Database + in-memory fallback
│   ├── routers.ts                   # tRPC API routes
│   └── _core/
│       ├── context.ts               # Auth context (dev guest bypass)
│       ├── trpc.ts                   # tRPC middleware
│       └── sdk.ts                    # OAuth SDK
├── drizzle/
│   └── schema.ts                    # Database schema (Drizzle ORM)
└── shared/
    ├── const.ts                     # Shared constants
    └── reserveFramework.ts          # Business driver framework
```

## License

Proprietary — CTTX Infrastructure Intelligence (Pty) Ltd.
