import path from 'path';
import { fileURLToPath } from 'url';
import { parseKML } from '../src/utils/kmlParser.js';
import { initDatabase, insertTower, getStats, closeDatabase } from '../src/services/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function importTowers() {
  console.log('Starting tower data import...\n');

  try {
    // Initialize database
    await initDatabase();
    console.log('✓ Database initialized');

    // Define KML file path - user can provide via argument or use default
    const kmzPath = process.argv[2] || path.join(
      __dirname,
      '../data/raw/BTS_Site_Location_Report.kmz'
    );

    console.log(`Importing from: ${kmzPath}\n`);

    // Parse KML file
    console.log('Parsing KML file...');
    const towers = await parseKML(kmzPath);
    console.log(`✓ Parsed ${towers.length} tower records\n`);

    // Insert towers into database
    console.log('Inserting towers into database...');
    let inserted = 0;
    let skipped = 0;

    for (let i = 0; i < towers.length; i++) {
      try {
        await insertTower(towers[i]);
        inserted++;
      } catch (err) {
        skipped++;
      }

      // Progress indicator
      if ((i + 1) % 1000 === 0) {
        console.log(`  ${i + 1}/${towers.length} processed...`);
      }
    }

    console.log(`\n✓ Import complete:`);
    console.log(`  Inserted: ${inserted}`);
    console.log(`  Skipped: ${skipped}\n`);

    // Show stats
    const stats = await getStats();
    console.log('Database Statistics:');
    console.log(`  Total Towers: ${stats.towerCount}`);
    console.log(`  Total Equipment: ${stats.equipmentCount}`);
    console.log(`  Feasible LOS Links: ${stats.feasibleLOSCount}`);

    await closeDatabase();
    console.log('\n✓ Database connection closed');

  } catch (error) {
    console.error('Error during import:', error);
    process.exit(1);
  }
}

importTowers();
