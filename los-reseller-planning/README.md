# LOS (Line-of-Sight) Reseller Planning Tool

Vodacom infrastructure intelligence platform for identifying and planning LOS connectivity opportunities for resellers using tower site equipment data.

## Overview

This tool integrates Vodacom BTS (Base Transceiver Station) site data with equipment, fiber, and capacity information to enable resellers to:
- Identify viable LOS links between tower sites
- Plan last-mile connectivity solutions
- Optimize network coverage
- Assess capacity and backhaul requirements

## Data Sources

### Tower Site Data
- **Spatial**: 14,439 Vodacom BTS tower locations across South Africa
- **Fields**: Site name, coordinates, site ID, service level, base station number
- **Source**: BTS_Site_Location_Report.csv.kmz

### Equipment & Capacity Data
- Equipment types on masts (R1 classification - red markers)
- Fiber connectivity information
- Capacity metrics

## Project Structure

```
los-reseller-planning/
├── data/
│   ├── raw/              # KMZ/KML raw files
│   ├── processed/        # Converted GeoJSON, CSV
│   └── schemas/          # Data validation schemas
├── src/
│   ├── core/             # LOS calculation engine
│   ├── api/              # REST API endpoints
│   ├── services/         # Business logic
│   └── utils/            # Helpers
├── scripts/              # Data import, processing
├── tests/                # Unit and integration tests
└── docs/                 # Architecture, API docs
```

## Quick Start

```bash
# Install dependencies
npm install

# Import tower data
npm run import:towers

# Start development server
npm run dev
```

## Features (Planned)

- [x] Tower location data import
- [ ] LOS visibility analysis
- [ ] Link feasibility scoring
- [ ] Fiber route mapping
- [ ] Capacity planning
- [ ] RESTful API
- [ ] Interactive map viewer
- [ ] Export reports
