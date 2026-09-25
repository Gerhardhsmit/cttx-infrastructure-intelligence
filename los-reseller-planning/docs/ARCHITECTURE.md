# LOS Reseller Planning Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      LOS Analyzer API                       │
│                  (Node.js + Express)                        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Core Analysis Engine                       │
│                   (losAnalysis.js)                          │
│                                                             │
│  • Distance calculations (Haversine)                       │
│  • Bearing and elevation computation                       │
│  • Fresnel zone estimation                                 │
│  • LOS feasibility scoring                                 │
│  • Hub identification                                      │
│  • Multi-hop path finding                                  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Data Services Layer                        │
│                  (database.js)                              │
│                                                             │
│  • Tower CRUD operations                                   │
│  • Equipment inventory management                          │
│  • LOS link storage and retrieval                          │
│  • Spatial queries                                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   SQLite Database                           │
│                  (vodacom.db)                               │
│                                                             │
│  Tables:                                                   │
│  • towers (14,439 sites)                                   │
│  • equipment (multi-per tower)                             │
│  • los_links (pre-computed feasibility)                    │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. REST API Layer (`src/index.js`)

**Responsibilities:**
- HTTP request handling
- Route definition
- Response formatting
- Error handling

**Key Endpoints:**
- `GET /api/towers` - List/search towers
- `POST /api/los/analyze` - Real-time LOS analysis
- `POST /api/los/hubs` - Hub identification
- `POST /api/los/path` - Multi-hop pathfinding

### 2. LOS Analysis Engine (`src/core/losAnalysis.js`)

**Core Algorithms:**

#### Distance Calculation
```
d = arccos(sin(lat1) × sin(lat2) + cos(lat1) × cos(lat2) × cos(Δlon)) × R
```
- Uses Haversine formula via turf.js
- Returns distance in kilometers

#### Bearing Calculation
```
θ = atan2(sin(Δlon) × cos(lat2), cos(lat1) × sin(lat2) - sin(lat1) × cos(lat2) × cos(Δlon))
```
- Returns compass bearing 0-360°

#### Feasibility Scoring
```
Score = (DistanceScore × 0.5) + (LevelScore × 0.3) + (ElevationScore × 0.2)
```
- Distance Score: 100% at 0km → 0% at 50km
- Level Score: Based on service tier compatibility (0-100)
- Elevation Score: Based on antenna angle suitability (0-100)

#### Fresnel Zone
```
R = √(3000 × D / (2 × f))
```
- D = distance (km)
- f = frequency (GHz)
- R = radius (meters)

### 3. Data Layer (`src/services/database.js`)

**Features:**
- SQLite connection management
- Schema initialization
- CRUD operations for all entities
- Spatial index optimization
- Transaction support

**Tables:**

#### towers
- Primary entity for BTS sites
- Indexed by siteId and location
- 14,439 records imported from KML

#### equipment
- Multi-valued relationship (towers:equipment = 1:N)
- Equipment types: Microwave, Fiber, BTS, etc.
- Includes frequency, capacity, fiber connectivity

#### los_links
- Pre-computed feasibility matrix
- Many-to-many relationship (towers)
- Scores, distance, bearing stored for quick lookup

### 4. Utilities (`src/utils/`)

#### kmlParser.js
- Parses KMZ (compressed KML) files
- Extracts placemark data
- Converts to tower records
- Supports GeoJSON export

## Data Flow

### Import Phase
```
KMZ File
   │
   ▼
KML Parser
   │
   ├─► Extract placemarks
   ├─► Parse coordinates
   └─► Map fields
         │
         ▼
    Tower Objects
         │
         ▼
    Database Service
         │
         ├─► Schema init
         └─► Insert records
               │
               ▼
          SQLite DB
```

### Query Phase
```
API Request
   │
   ▼
Express Route Handler
   │
   ├─► Validate parameters
   └─► Call Database/Analyzer
         │
         ├─► LOSAnalyzer
         │    ├─► Get towers
         │    └─► Calculate metrics
         │
         └─► Database Service
              ├─► Query towers
              └─► Fetch equipment
                   │
                   ▼
              Response Object
                   │
                   ▼
              JSON Response
```

## Performance Considerations

### Query Optimization

1. **Spatial Indexing**
   - Latitude/longitude indexed for fast location-based queries
   - Box search for nearby towers (O(log n))

2. **Pre-computed Links**
   - LOS links pre-calculated offline
   - Indexed by (fromTower, toTower) pair
   - Instant link retrieval vs real-time calculation

3. **Pagination**
   - All list endpoints support limit/offset
   - Prevents memory exhaustion
   - Reduces response time for large datasets

4. **Caching Strategy**
   - Analyzer loads all towers once at startup
   - Hub calculations cached (recompute on data update)
   - Path results cached by (source, destination) pair

### Scalability Limits

**Current Implementation:**
- ~14,500 towers
- ~150,000 LOS links (10-15 per tower avg)
- Single-node SQLite database
- ~100MB database size

**Scaling to 50,000+ towers:**
1. Switch to PostgreSQL with PostGIS
2. Implement distributed caching (Redis)
3. Offload LOS computation to background workers
4. Add API gateway with rate limiting

## Security Considerations

1. **No Authentication** (Development only)
   - Production: Add API key or OAuth2
   - Implement request signing

2. **Input Validation**
   - Validate all parameters
   - Sanitize strings to prevent injection
   - Rate limit by IP/API key

3. **Data Protection**
   - Consider data classification (R1 = Red/Restricted)
   - Implement role-based access control
   - Audit logging for sensitive operations

4. **API Security**
   - HTTPS required in production
   - CORS whitelist
   - Request size limits

## Deployment Architecture

### Development
```
Local Machine
    │
    ├─► Node.js App
    │    └─► SQLite DB (local)
    │
    └─► npm scripts for import/analysis
```

### Production (Recommended)
```
Load Balancer (HTTPS)
    │
    ├─► App Server 1 (Node.js)
    │    ├─► Cache (Redis)
    │    └─► Connection Pool
    │
    ├─► App Server 2 (Node.js)
    │    └─► Connection Pool
    │
    └─► PostgreSQL Server
         └─► PostGIS Extension
         └─► Backup/Replication
```

## Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Runtime | Node.js 18+ | JavaScript ecosystem, async support |
| Framework | Express.js | Lightweight, flexible routing |
| Database | SQLite (dev) / PostgreSQL (prod) | Spatial queries, relational data |
| Spatial | turf.js | Haversine, bearing calculations |
| Parsing | xml2js | KML/KMZ parsing |
| Testing | Node test runner | Built-in, no dependencies |

## Key Design Decisions

### 1. Feasibility Scoring
- Weighted combination of factors allows fine-tuning
- Weights can be adjusted per use case (e.g., 60/20/20 for distance-critical)
- Score range (0-100) is intuitive for operators

### 2. Pre-computed Links
- Trade-off: Storage vs compute time
- 150k links ≈ 5MB in database
- Eliminates O(n²) real-time calculations
- Can update links on schedule (nightly)

### 3. Multi-hop Pathfinding
- Greedy algorithm (nearest neighbor toward destination)
- Not guaranteed optimal, but fast (O(n log n))
- Can be replaced with Dijkstra for optimal paths
- Respects hop limits to prevent loops

### 4. Service Level Classification
- Simple (GOLD/SILVER/BRONZE) allows easy scoring
- Extensions: Add capacity tier, equipment tier
- Could be weighted differently for different regions

## Testing Strategy

### Unit Tests
- LOS calculation algorithms
- Scoring functions
- Distance/bearing math

### Integration Tests
- Database CRUD operations
- API endpoint responses
- Full request/response cycle

### Performance Tests
- Import 14k+ towers
- Query response time at scale
- Concurrent path calculations

### Regression Tests
- Known LOS paths should maintain scores
- Database migrations don't corrupt data
- API backwards compatibility

## Future Enhancements

### Near-term (v0.2)
- [ ] Terrain data integration (DEM)
- [ ] Real antenna pattern support
- [ ] Interference analysis
- [ ] GeoJSON export/import
- [ ] Web UI for visualization

### Medium-term (v0.3)
- [ ] Weather impact modeling
- [ ] Fiber route optimization
- [ ] Capacity planning module
- [ ] Cost estimation
- [ ] Multi-tenant support

### Long-term (v1.0)
- [ ] Machine learning path prediction
- [ ] Real-time network optimization
- [ ] IoT sensor integration
- [ ] Blockchain verification
- [ ] AR site visualization

## Monitoring & Observability

### Metrics to Track
- API response times (p50, p95, p99)
- Database query performance
- Cache hit rate
- Error rates by endpoint
- Tower/equipment count trends

### Logging
- Structured logs (JSON)
- Request IDs for tracing
- Debug mode for development

### Alerting
- Analyzer initialization failures
- Database connection pool exhaustion
- API error rate thresholds
- Long-running queries (>1s)
