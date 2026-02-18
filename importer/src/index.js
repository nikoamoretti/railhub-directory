import pg from 'pg';
import dotenv from 'dotenv';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { parseExcelFile } from './parsers/excelParser.js';
import { GeocodingQueue } from './geocoder/queue.js';

dotenv.config();

const { Pool } = pg;
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'railhub',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

// Map Excel filenames to category slugs
const FILE_TO_CATEGORY = {
  'US_Bulk_Transfer_Terminals_Database.xlsx': 'bulk-transfer-terminals',
  'US_Intermodal_Ramps_Terminals_Database.xlsx': 'intermodal-ramps',
  'team_tracks_database.xlsx': 'team-tracks',
  'private_sidings_for_lease.xlsx': 'private-sidings',
  'private_sidings_for_lease_EXPANDED.xlsx': 'private-sidings',
  'rail_served_warehousing.xlsx': 'rail-served-warehousing',
  'rail_served_warehousing_EXPANDED.xlsx': 'rail-served-warehousing',
  
  'US_Railcar_Manufacturing_Rebuilding_Database.xlsx': 'railcar-manufacturing',
  'US_Railcar_Repair_Shops_Database.xlsx': 'railcar-repair-shops',
  'US_Railcar_Tank_Wash_Cleaning_Stations_Database.xlsx': 'tank-wash-stations',
  'railcar_leasing_companies.xlsx': 'railcar-leasing',
  'railcar_leasing_companies_EXPANDED.xlsx': 'railcar-leasing',
  'specialty_car_builders.xlsx': 'specialty-car-builders',
  'specialty_car_builders_EXPANDED.xlsx': 'specialty-car-builders',
  'railcar_lining_coating.xlsx': 'railcar-lining-coating',
  'railcar_lining_coating_EXPANDED.xlsx': 'railcar-lining-coating',
  'railcar_inspection_services.xlsx': 'railcar-inspection',
  'railcar_brokers.xlsx': 'railcar-brokers',
  'railcar_management_companies.xlsx': 'railcar-management',
  'railcar_tracking_platforms.xlsx': 'railcar-tracking',
  
  'transloading_operators.xlsx': 'transloading',
  'rail_brokers_intermediaries.xlsx': 'rail-brokers',
  'freight_forwarders_rail.xlsx': 'freight-forwarders',
  'customs_brokers.xlsx': 'customs-brokers',
  'customs_brokers_EXPANDED.xlsx': 'customs-brokers',
  'drayage_providers.xlsx': 'drayage-providers',
  'chassis_providers.xlsx': 'chassis-providers',
  'fumigation_facilities.xlsx': 'fumigation-facilities',
  'scale_weigh_stations.xlsx': 'scale-weigh-stations',
  'scale_weigh_stations_EXPANDED.xlsx': 'scale-weigh-stations',
  
  'tms_platforms_rail.xlsx': 'tms-platforms',
  'tms_platforms_rail_EXPANDED.xlsx': 'tms-platforms',
  'yard_management_systems.xlsx': 'yard-management',
  'fleet_management_tools.xlsx': 'fleet-management',
  'load_planning_software.xlsx': 'load-planning',
  'demurrage_management_software.xlsx': 'demurrage-software',
  'edi_providers_rail.xlsx': 'edi-providers',
  'car_hire_per_diem_management.xlsx': 'car-hire-management',
  'aei_tag_readers_hardware.xlsx': 'aei-tag-readers',
  
  'locomotive_leasing.xlsx': 'locomotive-leasing',
  'locomotive_leasing_EXPANDED.xlsx': 'locomotive-leasing',
  'locomotive_shops.xlsx': 'locomotive-shops',
  'mobile_repair_services.xlsx': 'mobile-repair',
  'parts_component_suppliers.xlsx': 'parts-suppliers',
  'rail_engineering_track_construction.xlsx': 'track-construction',
  'signal_communications_contractors.xlsx': 'signal-contractors',
  'demurrage_consulting.xlsx': 'demurrage-consulting',
  
  'shortline_regional_railroads.xlsx': 'shortline-railroads',
  'switching_terminal_railroads.xlsx': 'switching-railroads',
};

async function getCategoryId(client, slug) {
  const result = await client.query('SELECT id FROM categories WHERE slug = $1', [slug]);
  if (result.rows.length === 0) {
    throw new Error(`Category not found: ${slug}`);
  }
  return result.rows[0].id;
}

async function importFile(filePath, categorySlug, options = {}) {
  const spinner = ora(`Importing ${basename(filePath)}...`).start();
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const categoryId = await getCategoryId(client, categorySlug);
    const records = parseExcelFile(filePath);
    
    let imported = 0;
    let skipped = 0;
    
    for (const record of records) {
      // Skip if missing required fields
      if (!record.name || !record.state) {
        skipped++;
        continue;
      }
      
      // Check for duplicates (by name + city + state)
      const existing = await client.query(
        `SELECT id FROM facilities 
         WHERE name = $1 AND city = $2 AND state = $3 AND category_id = $4`,
        [record.name, record.city, record.state, categoryId]
      );
      
      if (existing.rows.length > 0 && !options.force) {
        skipped++;
        continue;
      }
      
      // Build attributes JSON
      const attributes = {};
      if (record.commodities) attributes.commodities = record.commodities;
      if (record.railroads) attributes.railroads = record.railroads;
      if (record.description) attributes.description = record.description;
      if (record.type) attributes.type = record.type;
      if (record.hours) attributes.hours = record.hours;
      if (record.operator) attributes.operator = record.operator;
      if (record.fleetSize) attributes.fleet_size = record.fleetSize;
      if (record.ownership) attributes.ownership = record.ownership;
      
      // Copy any remaining fields to attributes
      for (const [key, value] of Object.entries(record)) {
        if (!['name', 'address', 'city', 'state', 'zip', 'phone', 'email', 'website'].includes(key) && value) {
          attributes[key] = value;
        }
      }
      
      // Insert facility
      const result = await client.query(
        `INSERT INTO facilities (
          name, category_id, address, city, state, zip,
          phone, email, website, attributes, source, source_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id`,
        [
          record.name,
          categoryId,
          record.address || null,
          record.city || null,
          record.state || null,
          record.zip || null,
          record.phone || null,
          record.email || null,
          record.website || null,
          JSON.stringify(attributes),
          'excel_import',
          `${basename(filePath)}:${imported + skipped}`
        ]
      );
      
      imported++;
      
      if (imported % 100 === 0) {
        spinner.text = `Importing ${basename(filePath)}... (${imported}/${records.length})`;
      }
    }
    
    await client.query('COMMIT');
    spinner.succeed(`Imported ${imported} records, skipped ${skipped} duplicates`);
    
    return { imported, skipped };
    
  } catch (error) {
    await client.query('ROLLBACK');
    spinner.fail(`Failed to import ${basename(filePath)}: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

async function importAll(dataDir, options = {}) {
  console.log(chalk.blue.bold('\n🚂 Railhub Data Importer\n'));
  
  const files = readdirSync(dataDir)
    .filter(f => f.endsWith('.xlsx') && !f.startsWith('~'))
    .filter(f => FILE_TO_CATEGORY[f]);
  
  console.log(chalk.gray(`Found ${files.length} Excel files to import\n`));
  
  let totalImported = 0;
  let totalSkipped = 0;
  
  for (const file of files) {
    const filePath = join(dataDir, file);
    const categorySlug = FILE_TO_CATEGORY[file];
    
    try {
      const result = await importFile(filePath, categorySlug, options);
      totalImported += result.imported;
      totalSkipped += result.skipped;
    } catch (error) {
      console.error(chalk.red(`\nFailed to import ${file}:`), error.message);
    }
  }
  
  console.log(chalk.green.bold(`\n✓ Import complete: ${totalImported} imported, ${totalSkipped} skipped`));
  
  // Optionally trigger geocoding
  if (options.geocode) {
    console.log(chalk.blue('\n🌍 Starting geocoding...\n'));
    const geocoder = new GeocodingQueue(pool);
    await geocoder.processAll();
  }
}

async function importCommtrex(facilitiesFile, storageFile, options = {}) {
  console.log(chalk.blue.bold('\n🚂 Importing Commtrex Data\n'));
  
  const spinner = ora('Loading facilities...').start();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Import transloading facilities from CSV
    if (facilitiesFile && existsSync(facilitiesFile)) {
      const { parseCommtrexFacilities } = await import('./parsers/commtrexParser.js');
      const facilities = await parseCommtrexFacilities(facilitiesFile);
      
      spinner.text = `Importing ${facilities.length} transloading facilities...`;
      
      const categoryId = await getCategoryId(client, 'transloading');
      let imported = 0;
      let skipped = 0;
      
      for (const f of facilities) {
        // Skip duplicates
        const existing = await client.query(
          `SELECT id FROM facilities 
           WHERE name = $1 AND city = $2 AND state = $3 AND source = 'commtrex'`,
          [f.name, f.city, f.state]
        );
        
        if (existing.rows.length > 0 && !options.force) {
          skipped++;
          continue;
        }
        
        await client.query(
          `INSERT INTO facilities (
            name, category_id, address, city, state, zip,
            phone, email, website, attributes, source, source_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            f.name,
            categoryId,
            f.address || null,
            f.city || null,
            f.state || null,
            f.zip || null,
            f.phone || null,
            f.email || null,
            f.website || null,
            JSON.stringify(f.attributes || {}),
            'commtrex',
            f.sourceId || null
          ]
        );
        
        imported++;
        if (imported % 1000 === 0) {
          spinner.text = `Importing ${facilities.length} transloading facilities... (${imported})`;
        }
      }
      
      spinner.succeed(`Imported ${imported} transloading facilities, skipped ${skipped} duplicates`);
    }
    
    // Import railcar storage facilities from CSV
    if (storageFile && existsSync(storageFile)) {
      const { parseCommtrexStorage } = await import('./parsers/commtrexParser.js');
      const facilities = await parseCommtrexStorage(storageFile);
      
      spinner.start(`Importing ${facilities.length} railcar storage facilities...`);
      
      // Get or create category for railcar storage
      let categoryResult = await client.query(
        "SELECT id FROM categories WHERE slug = 'railcar-storage'"
      );
      
      let categoryId;
      if (categoryResult.rows.length === 0) {
        // Create category
        const insert = await client.query(
          `INSERT INTO categories (slug, name, description) 
           VALUES ('railcar-storage', 'Railcar Storage', 'Railcar storage facilities')
           RETURNING id`
        );
        categoryId = insert.rows[0].id;
      } else {
        categoryId = categoryResult.rows[0].id;
      }
      
      let imported = 0;
      let skipped = 0;
      
      for (const f of facilities) {
        const existing = await client.query(
          `SELECT id FROM facilities 
           WHERE name = $1 AND city = $2 AND state = $3 AND source = 'commtrex'`,
          [f.name, f.city, f.state]
        );
        
        if (existing.rows.length > 0 && !options.force) {
          skipped++;
          continue;
        }
        
        await client.query(
          `INSERT INTO facilities (
            name, category_id, address, city, state, zip,
            phone, email, website, attributes, source, source_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            f.name,
            categoryId,
            f.address || null,
            f.city || null,
            f.state || null,
            f.zip || null,
            f.phone || null,
            f.email || null,
            f.website || null,
            JSON.stringify(f.attributes || {}),
            'commtrex',
            f.sourceId || null
          ]
        );
        
        imported++;
        if (imported % 100 === 0) {
          spinner.text = `Importing ${facilities.length} railcar storage facilities... (${imported})`;
        }
      }
      
      spinner.succeed(`Imported ${imported} storage facilities, skipped ${skipped} duplicates`);
    }
    
    await client.query('COMMIT');
    console.log(chalk.green.bold('\n✓ Commtrex import complete'));
    
  } catch (error) {
    await client.query('ROLLBACK');
    spinner.fail(`Failed: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

// CLI
const program = new Command();

program
  .name('railhub-importer')
  .description('Import rail facility data into PostgreSQL')
  .version('1.0.0');

program
  .command('excel')
  .description('Import Excel files from data directory')
  .option('-d, --data-dir <path>', 'Data directory', '/Users/nico-yardlogix/Downloads/Kimi_Agent_Railcar Leasing Ads Sites')
  .option('-g, --geocode', 'Run geocoding after import', false)
  .option('-f, --force', 'Force re-import (skip duplicate check)', false)
  .action(async (options) => {
    await importAll(options.dataDir, { geocode: options.geocode, force: options.force });
    await pool.end();
  });

program
  .command('commtrex')
  .description('Import Commtrex CSV files')
  .option('-f, --facilities <path>', 'Facilities CSV', '/Users/nico-yardlogix/commtrex/commtrex_facilities.csv')
  .option('-s, --storage <path>', 'Storage CSV', '/Users/nico-yardlogix/commtrex/commtrex_railcar_storage.csv')
  .option('--force', 'Force re-import', false)
  .action(async (options) => {
    await importCommtrex(options.facilities, options.storage, { force: options.force });
    await pool.end();
  });

program
  .command('geocode')
  .description('Run geocoding on ungeocoded facilities')
  .option('-l, --limit <n>', 'Limit number of facilities', '1000')
  .action(async (options) => {
    console.log(chalk.blue.bold('\n🌍 Geocoding Facilities\n'));
    const geocoder = new GeocodingQueue(pool);
    await geocoder.processAll(parseInt(options.limit));
    await pool.end();
  });

program.parse();
