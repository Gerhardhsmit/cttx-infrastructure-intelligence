# Data Import Guide

## Overview

The LOS Reseller Planning tool ingests geospatial data from Vodacom's infrastructure in multiple stages:

1. **Tower Site Data** - BTS locations, IDs, service levels
2. **Equipment Inventory** - Types, specs, fiber connectivity
3. **LOS Links** - Pre-computed feasibility between sites

## Data Sources

### Tower Site Data (Primary)
- **Format**: KMZ (Keyhole Markup Language, compressed KML)
- **Source**: `data/raw/BTS_Site_Location_Report.csv.kmz`
- **Records**: 14,439 Vodacom BTS sites
- **Fields**:
  - `ATOLL_NAME` - Site name
  - `LATITUDE` - Geographic latitude
  - `LONGITUDE` - Geographic longitude
  - `ATOLL_SITE_ID` - Unique site identifier
  - `SERVICE_LEVEL` - BRONZE/SILVER/GOLD tier
  - `BS_NUMBER` - Base station number

### Equipment Data (Secondary)
- **Format**: CSV or KML with extended attributes
- **Fields**:
  - `TOWER_SITE_ID` - Link to tower record
  - `EQUIPMENT_TYPE` - Microwave, Fiber, etc.
  - `DESCRIPTION` - Equipment details
  - `FREQUENCY` - Operating frequency
  - `CAPACITY` - Bandwidth or capacity rating
  - `FIBER_CONNECTED` - Boolean fiber availability

## Setup Instructions

### 1. Install Dependencies

```bash
cd los-reseller-planning
npm install
```

### 2. Copy Configuration

```bash
cp .env.example .env
# Edit .env if needed
```

### 3. Prepare Data Files

Place KMZ files in the `data/raw/` directory:

```
los-reseller-planning/
├── data/
│   └── raw/
│       └── BTS_Site_Location_Report.csv.kmz
```

### 4. Import Tower Data

```bash
npm run import:towers

# Or with custom file:
npm run import:towers /path/to/custom/data.kmz
```

**Expected Output:**
```
Starting tower data import...

✓ Database initialized
Parsing KML file...
✓ Parsed 14439 tower records

Inserting towers into database...
  1000/14439 processed...
  2000/14439 processed...
  ...
✓ Import complete:
  Inserted: 14439
  Skipped: 0

Database Statistics:
  Total Towers: 14439
  Total Equipment: 0
  Feasible LOS Links: 0

✓ Database connection closed
```

## Data Format Reference

### KML Tower Record Example

```xml
<Placemark>
  <name>105_Schoeman_Str</name>
  <ExtendedData>
    <SchemaData schemaUrl="#S_BTS_Site_Location_Report_SDDSSI">
      <SimpleData name="ATOLL_NAME">105_Schoeman_Str</SimpleData>
      <SimpleData name="LATITUDE">-23.9009</SimpleData>
      <SimpleData name="LONGITUDE">29.4514</SimpleData>
      <SimpleData name="ATOLL_SITE_ID">LIM_18801</SimpleData>
      <SimpleData name="SERVICE_LEVEL">BRONZE</SimpleData>
      <SimpleData name="BS_NUMBER">11109</SimpleData>
    </SchemaData>
  </ExtendedData>
  <Point>
    <coordinates>29.45141300000001,-23.900862,0</coordinates>
  </Point>
</Placemark>
```

### CSV Equipment Format

```csv
tower_site_id,equipment_type,description,quantity,manufacturer,model,frequency,capacity,fiber_connected
LIM_18801,"Microwave Link","28 GHz Point-to-Point",2,"Ericsson","Mini-Link","28 GHz","10 Gbps",true
LIM_18801,"Fiber Terminator","Single Mode Fiber",4,"Corning","SM OS2","1550nm","100 Gbps",true
```

## Database Schema

### towers
```sql
CREATE TABLE towers (
  id INTEGER PRIMARY KEY,
  siteId TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  serviceLevel TEXT,
  bsNumber INTEGER,
  siteAtoll TEXT,
  mastHeight INTEGER DEFAULT 30,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### equipment
```sql
CREATE TABLE equipment (
  id INTEGER PRIMARY KEY,
  towerSiteId TEXT NOT NULL,
  equipmentType TEXT,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  manufacturer TEXT,
  model TEXT,
  frequency TEXT,
  capacity TEXT,
  fiberConnected BOOLEAN DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (towerSiteId) REFERENCES towers(siteId)
);
```

### los_links
```sql
CREATE TABLE los_links (
  id INTEGER PRIMARY KEY,
  fromTower TEXT NOT NULL,
  toTower TEXT NOT NULL,
  distance REAL,
  bearing REAL,
  elevationAngle REAL,
  freshnelRadius REAL,
  score INTEGER,
  feasible BOOLEAN,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fromTower) REFERENCES towers(siteId),
  FOREIGN KEY (toTower) REFERENCES towers(siteId)
);
```

## Advanced Operations

### Query Tower by Location

```bash
node -e "
import { initDatabase, getTowersByLocation } from './src/services/database.js';
await initDatabase();
const towers = await getTowersByLocation(-25.5, 28.5, 50); // 50km radius
console.log(towers);
"
```

### Bulk Import Equipment

Create `scripts/importEquipment.js`:

```javascript
import { initDatabase, insertEquipment, closeDatabase } from '../src/services/database.js';
import csv from 'csv-parse';
import fs from 'fs';

async function importEquipment(csvPath) {
  await initDatabase();
  const parser = fs.createReadStream(csvPath).pipe(csv());
  
  for await (const record of parser) {
    await insertEquipment(record);
  }
  
  await closeDatabase();
}

importEquipment(process.argv[2]);
```

Run:
```bash
npm run import:equipment equipment_data.csv
```

### Pre-compute LOS Links

Create `scripts/computeLOS.js` to pre-calculate all links:

```javascript
import { initDatabase, getAllTowers, insertLOSLink, closeDatabase } from '../src/services/database.js';
import { createLOSAnalyzer } from '../src/core/losAnalysis.js';

async function computeAllLinks() {
  await initDatabase();
  const towers = await getAllTowers();
  const analyzer = createLOSAnalyzer(towers);

  console.log(`Computing LOS links for ${towers.length} towers...`);
  
  let count = 0;
  for (const tower of towers) {
    const links = analyzer.findLOSLinks(tower, 50);
    for (const link of links) {
      await insertLOSLink({
        from: tower.siteId,
        to: link.details.tower2.siteId,
        distance: link.distance,
        bearing: link.bearing,
        elevationAngle: link.elevationAngle,
        freshnelRadius: link.freshnelRadius,
        score: link.score,
        feasible: link.feasible
      });
      count++;
    }
    
    if (towers.indexOf(tower) % 100 === 0) {
      console.log(`${towers.indexOf(tower)}/${towers.length} processed, ${count} links found...`);
    }
  }
  
  console.log(`Total LOS links computed: ${count}`);
  await closeDatabase();
}

computeAllLinks();
```

Run:
```bash
npm run compute:los
```

## Data Validation

### Check Data Integrity

```javascript
import { initDatabase, getStats, getAllTowers, closeDatabase } from './src/services/database.js';

await initDatabase();

const stats = await getStats();
console.log('Stats:', stats);

const towers = await getAllTowers();
const issues = [];

// Check for missing coordinates
towers.forEach(t => {
  if (!t.latitude || !t.longitude) {
    issues.push(`Tower ${t.siteId} missing coordinates`);
  }
  if (!t.serviceLevel) {
    issues.push(`Tower ${t.siteId} missing service level`);
  }
});

console.log(`Found ${issues.length} issues:`);
issues.slice(0, 10).forEach(i => console.log(`  - ${i}`));

await closeDatabase();
```

## Performance Tips

1. **Indexing**: Queries automatically use indexed columns (siteId, location)
2. **Pagination**: Always use limit/offset for large result sets
3. **Pre-computation**: Calculate LOS links offline, not per-request
4. **Caching**: Cache hub calculations and path results for 1-2 hours
5. **Batching**: Import 1000s of records in transactions

## Troubleshooting

### Import Fails - "Database locked"
- Ensure no other processes are accessing the database
- Check `data/vodacom.db-journal` doesn't exist
- Delete both and retry

### Memory Issues with Large Imports
- Increase Node.js heap: `node --max-old-space-size=4096 scripts/importTowers.js`
- Process in smaller batches
- Stream KML parsing instead of loading entire file

### Missing Coordinates
- Verify KML structure and field names
- Check for null/zero values
- Manually inspect KML file with text editor

## Next Steps

1. Start API server: `npm run dev`
2. Verify with: `curl http://localhost:3000/api/stats`
3. Explore endpoints from [API.md](./API.md)
4. Build custom analysis on top of imported data
