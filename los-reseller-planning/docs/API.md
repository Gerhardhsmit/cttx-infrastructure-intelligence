# LOS Reseller Planning API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
Currently no authentication required. Production deployments should implement API key or OAuth.

## Common Response Format

### Success Response
```json
{
  "data": {},
  "status": "success"
}
```

### Error Response
```json
{
  "error": "Description of error",
  "code": "ERROR_CODE"
}
```

---

## Endpoints

### 1. Health Check
**GET** `/health`

Check API availability and analyzer status.

**Response:**
```json
{
  "status": "ok",
  "analyzer": "ready"
}
```

**Status Codes:**
- `200 OK` - Healthy
- `503 Service Unavailable` - Analyzer initializing

---

### 2. Database Statistics
**GET** `/stats`

Get current database statistics and health metrics.

**Response:**
```json
{
  "towerCount": 14439,
  "equipmentCount": 28512,
  "feasibleLOSCount": 145320
}
```

---

### 3. List Towers
**GET** `/towers`

List all towers with pagination support.

**Query Parameters:**
- `limit` (number, default: 100, max: 1000) - Records per page
- `offset` (number, default: 0) - Starting record index

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "siteId": "LIM_18801",
      "name": "105_Schoeman_Str",
      "latitude": -23.9009,
      "longitude": 29.4514,
      "serviceLevel": "BRONZE",
      "bsNumber": 11109,
      "siteAtoll": "105_Schoeman_Str",
      "mastHeight": 30,
      "createdAt": "2024-09-25T10:03:00Z"
    }
  ],
  "count": 100,
  "total": 14439,
  "limit": 100,
  "offset": 0
}
```

**Examples:**
```bash
# First 50 towers
GET /towers?limit=50

# Towers 100-150
GET /towers?limit=50&offset=100
```

---

### 4. Get Tower Details
**GET** `/towers/{siteId}`

Get detailed information for a specific tower.

**Path Parameters:**
- `siteId` (string, required) - Tower site identifier

**Response:**
```json
{
  "id": 1,
  "siteId": "LIM_18801",
  "name": "105_Schoeman_Str",
  "latitude": -23.9009,
  "longitude": 29.4514,
  "serviceLevel": "BRONZE",
  "bsNumber": 11109,
  "siteAtoll": "105_Schoeman_Str",
  "mastHeight": 30,
  "createdAt": "2024-09-25T10:03:00Z"
}
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Tower not found

---

### 5. Get Tower Equipment
**GET** `/towers/{siteId}/equipment`

List all equipment installed at a tower.

**Path Parameters:**
- `siteId` (string, required) - Tower site identifier

**Response:**
```json
{
  "siteId": "LIM_18801",
  "equipment": [
    {
      "id": 1,
      "towerSiteId": "LIM_18801",
      "equipmentType": "Microwave Link",
      "description": "28 GHz Point-to-Point",
      "quantity": 2,
      "manufacturer": "Ericsson",
      "model": "Mini-Link",
      "frequency": "28 GHz",
      "capacity": "10 Gbps",
      "fiberConnected": true,
      "createdAt": "2024-09-25T10:03:00Z"
    }
  ]
}
```

---

### 6. Get Tower LOS Links
**GET** `/towers/{siteId}/los-links`

Get all pre-computed LOS links from this tower.

**Path Parameters:**
- `siteId` (string, required) - Tower site identifier

**Response:**
```json
{
  "siteId": "LIM_18801",
  "links": [
    {
      "id": 1,
      "fromTower": "LIM_18801",
      "toTower": "KZN_15381",
      "distance": 12.4,
      "bearing": 240.5,
      "elevationAngle": 2.3,
      "freshnelRadius": 45,
      "score": 85,
      "feasible": true,
      "createdAt": "2024-09-25T10:03:00Z"
    }
  ]
}
```

---

### 7. Analyze LOS Between Two Towers
**POST** `/los/analyze`

Perform real-time analysis of LOS feasibility between two specific towers.

**Request Body:**
```json
{
  "tower1Id": "LIM_18801",
  "tower2Id": "KZN_15381"
}
```

**Response:**
```json
{
  "analysis": {
    "feasible": true,
    "score": 85,
    "distance": 12.4,
    "distanceScore": 75,
    "levelScore": 33,
    "elevationScore": 95,
    "bearing": 240.5,
    "elevationAngle": 2.3,
    "freshnelRadius": 45,
    "details": {
      "tower1": {
        "siteId": "LIM_18801",
        "name": "105_Schoeman_Str",
        "level": "BRONZE"
      },
      "tower2": {
        "siteId": "KZN_15381",
        "name": "121_Wkant_Rd_Mtn",
        "level": "BRONZE"
      }
    }
  },
  "equipment": {
    "tower1": [
      {
        "id": 1,
        "equipmentType": "Microwave Link",
        "frequency": "28 GHz"
      }
    ],
    "tower2": [
      {
        "id": 2,
        "equipmentType": "Microwave Link",
        "frequency": "28 GHz"
      }
    ]
  }
}
```

**Scoring Breakdown:**
- **Distance Score** (0-100): Based on path distance. 100 = 0km, 0 = 50km
- **Level Score** (0-100): Service level compatibility. Higher levels prioritized
- **Elevation Score** (0-100): Antenna angle suitability. 100 = 0° angle
- **Final Score** = Distance (50%) + Level (30%) + Elevation (20%)

**Status Codes:**
- `200 OK` - Analysis complete
- `400 Bad Request` - Missing required fields
- `404 Not Found` - One or both towers not found
- `503 Service Unavailable` - Analyzer not initialized

---

### 8. Find Network Hubs
**POST** `/los/hubs`

Identify optimal hub locations with the most viable LOS connections.

**Request Body:**
```json
{
  "minLinks": 3,
  "minScore": 50
}
```

**Query Parameters:**
- `minLinks` (number, default: 3) - Minimum outbound links for hub qualification
- `minScore` (number, default: 50) - Minimum link feasibility score

**Response:**
```json
{
  "hubs": [
    {
      "tower": {
        "siteId": "LIM_18801",
        "name": "105_Schoeman_Str",
        "latitude": -23.9009,
        "longitude": 29.4514
      },
      "linkCount": 12,
      "avgScore": 72,
      "bestLinks": [
        {
          "feasible": true,
          "score": 85,
          "distance": 12.4,
          "bearing": 240.5
        }
      ]
    }
  ],
  "count": 5
}
```

**Use Cases:**
- Identify backhaul aggregation points
- Plan hub-and-spoke networks
- Optimize equipment investment
- Establish network redundancy

---

### 9. Find Optimal Multi-Hop Path
**POST** `/los/path`

Calculate the best multi-hop path between two towers, considering distance, feasibility scores, and intermediate hops.

**Request Body:**
```json
{
  "fromSiteId": "LIM_18801",
  "toSiteId": "SGC_39061",
  "maxHops": 5
}
```

**Query Parameters:**
- `maxHops` (number, default: 5) - Maximum intermediate towers allowed

**Response (Direct Link):**
```json
{
  "hops": [
    {
      "siteId": "LIM_18801",
      "name": "105_Schoeman_Str",
      "latitude": -23.9009,
      "longitude": 29.4514
    },
    {
      "siteId": "SGC_39061",
      "name": "12_Beech_Str_Lp",
      "latitude": -26.0689,
      "longitude": 27.9896
    }
  ],
  "links": [
    {
      "distance": 30.2,
      "bearing": 225.0,
      "score": 78,
      "feasible": true
    }
  ],
  "distance": 30.2,
  "avgScore": 78
}
```

**Response (Multi-Hop):**
```json
{
  "hops": [
    { "siteId": "LIM_18801", "name": "105_Schoeman_Str" },
    { "siteId": "RELAY_01", "name": "Relay Tower 1" },
    { "siteId": "RELAY_02", "name": "Relay Tower 2" },
    { "siteId": "SGC_39061", "name": "12_Beech_Str_Lp" }
  ],
  "links": [
    { "distance": 12.4, "score": 85 },
    { "distance": 15.8, "score": 72 },
    { "distance": 18.2, "score": 68 }
  ],
  "distance": 46.4,
  "avgScore": 75.0
}
```

**Status Codes:**
- `200 OK` - Path found
- `404 Not Found` - One or both towers not found
- `503 Service Unavailable` - Analyzer not initialized

---

## Rate Limiting

Not currently implemented. Production deployments should implement rate limiting:
- Recommended: 100 requests/minute per IP
- Burst: 10 requests/second

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Invalid request parameters |
| `NOT_FOUND` | 404 | Resource not found |
| `ANALYZER_NOT_READY` | 503 | Analyzer still initializing |
| `INTERNAL_ERROR` | 500 | Server error |

## Examples

### Example: Find shortest path between offices
```bash
curl -X POST http://localhost:3000/api/los/path \
  -H "Content-Type: application/json" \
  -d '{
    "fromSiteId": "LIM_18801",
    "toSiteId": "SGC_39061",
    "maxHops": 3
  }'
```

### Example: Find all hubs in a region
```bash
curl -X POST http://localhost:3000/api/los/hubs \
  -H "Content-Type: application/json" \
  -d '{
    "minLinks": 5,
    "minScore": 70
  }'
```

### Example: Get tower with equipment
```bash
curl http://localhost:3000/api/towers/LIM_18801
curl http://localhost:3000/api/towers/LIM_18801/equipment
```
