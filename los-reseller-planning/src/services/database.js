import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../data/vodacom.db');

let db;

export function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
      } else {
        createTables();
        resolve();
      }
    });
  });
}

function createTables() {
  db.serialize(() => {
    // Towers table
    db.run(`
      CREATE TABLE IF NOT EXISTS towers (
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
      )
    `);

    // Equipment table
    db.run(`
      CREATE TABLE IF NOT EXISTS equipment (
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
      )
    `);

    // LOS Links table
    db.run(`
      CREATE TABLE IF NOT EXISTS los_links (
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
      )
    `);

    // Create indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_towers_siteId ON towers(siteId)');
    db.run('CREATE INDEX IF NOT EXISTS idx_towers_location ON towers(latitude, longitude)');
    db.run('CREATE INDEX IF NOT EXISTS idx_equipment_tower ON equipment(towerSiteId)');
    db.run('CREATE INDEX IF NOT EXISTS idx_los_links ON los_links(fromTower, toTower)');
  });
}

export function insertTower(tower) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT OR IGNORE INTO towers
      (siteId, name, latitude, longitude, serviceLevel, bsNumber, siteAtoll)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(
      sql,
      [
        tower.siteId,
        tower.name,
        tower.latitude,
        tower.longitude,
        tower.serviceLevel,
        tower.bsNumber,
        tower.siteAtoll
      ],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

export function insertEquipment(equipment) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO equipment
      (towerSiteId, equipmentType, description, quantity, manufacturer, model,
       frequency, capacity, fiberConnected)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(
      sql,
      [
        equipment.towerSiteId,
        equipment.equipmentType,
        equipment.description,
        equipment.quantity || 1,
        equipment.manufacturer,
        equipment.model,
        equipment.frequency,
        equipment.capacity,
        equipment.fiberConnected ? 1 : 0
      ],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

export function insertLOSLink(link) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT OR REPLACE INTO los_links
      (fromTower, toTower, distance, bearing, elevationAngle, freshnelRadius, score, feasible)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(
      sql,
      [
        link.from,
        link.to,
        link.distance,
        link.bearing,
        link.elevationAngle,
        link.freshnelRadius,
        link.score,
        link.feasible ? 1 : 0
      ],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

export function getTower(siteId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM towers WHERE siteId = ?', [siteId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function getAllTowers() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM towers ORDER BY name', (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

export function getTowersByLocation(lat, lon, radiusKm = 50) {
  return new Promise((resolve, reject) => {
    // Simple box search (not perfect, but efficient)
    const latDelta = radiusKm / 111.2; // ~111.2 km per degree latitude
    const lonDelta = radiusKm / (111.2 * Math.cos(lat * Math.PI / 180));

    const sql = `
      SELECT * FROM towers
      WHERE latitude BETWEEN ? AND ?
      AND longitude BETWEEN ? AND ?
      ORDER BY name
    `;
    db.all(
      sql,
      [lat - latDelta, lat + latDelta, lon - lonDelta, lon + lonDelta],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

export function getEquipmentForTower(siteId) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM equipment WHERE towerSiteId = ?', [siteId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

export function getLOSLinksFrom(siteId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM los_links WHERE fromTower = ? ORDER BY score DESC',
      [siteId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

export function getStats() {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT
        (SELECT COUNT(*) FROM towers) as towerCount,
        (SELECT COUNT(*) FROM equipment) as equipmentCount,
        (SELECT COUNT(*) FROM los_links WHERE feasible = 1) as feasibleLOSCount
      `,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows?.[0] || {});
      }
    );
  });
}

export function closeDatabase() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
