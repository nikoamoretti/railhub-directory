import { createReadStream } from 'fs';
import { parse } from 'csv-parse';

/**
 * Parse Commtrex facilities CSV
 */
export async function parseCommtrexFacilities(filePath) {
  return new Promise((resolve, reject) => {
    const records = [];
    
    createReadStream(filePath)
      .pipe(parse({
        columns: true,
        skip_empty_lines: true,
        trim: true
      }))
      .on('data', (row) => {
        const record = {
          name: row['Facility Name'] || row['Name'] || row.name,
          address: row['Address'] || row.address,
          city: row['City'] || row.city,
          state: normalizeState(row['State'] || row.state),
          zip: row['Zip'] || row['Postal Code'] || row.zip,
          phone: row['Phone'] || row.phone,
          email: row['Email'] || row.email,
          website: normalizeWebsite(row['Website'] || row.website),
          sourceId: row['ID'] || row.id || null,
          attributes: {
            commodities: parseList(row['Commodities'] || row.commodities),
            railroads: parseList(row['Railroads'] || row.railroads || row['Railroad']),
            description: row['Description'] || row.description,
            services: parseList(row['Services'] || row.services),
            terminal_type: row['Terminal Type'] || row.terminal_type,
            storage_capacity: row['Storage Capacity'] || row.storage_capacity,
            equipment: parseList(row['Equipment'] || row.equipment),
          }
        };
        
        if (record.name) {
          records.push(record);
        }
      })
      .on('end', () => resolve(records))
      .on('error', reject);
  });
}

/**
 * Parse Commtrex railcar storage CSV
 */
export async function parseCommtrexStorage(filePath) {
  return new Promise((resolve, reject) => {
    const records = [];
    
    createReadStream(filePath)
      .pipe(parse({
        columns: true,
        skip_empty_lines: true,
        trim: true
      }))
      .on('data', (row) => {
        const record = {
          name: row['Facility Name'] || row['Name'] || row.name,
          address: row['Address'] || row.address,
          city: row['City'] || row.city,
          state: normalizeState(row['State'] || row.state),
          zip: row['Zip'] || row['Postal Code'] || row.zip,
          phone: row['Phone'] || row.phone,
          email: row['Email'] || row.email,
          website: normalizeWebsite(row['Website'] || row.website),
          sourceId: row['ID'] || row.id || null,
          attributes: {
            storage_type: row['Storage Type'] || row.storage_type,
            capacity: row['Capacity'] || row.capacity,
            railroads: parseList(row['Railroads'] || row.railroads),
            services: parseList(row['Services'] || row.services),
            description: row['Description'] || row.description,
            security: row['Security'] || row.security,
            track_type: row['Track Type'] || row.track_type,
          }
        };
        
        if (record.name) {
          records.push(record);
        }
      })
      .on('end', () => resolve(records))
      .on('error', reject);
  });
}

/**
 * Normalize state to 2-letter code
 */
function normalizeState(state) {
  if (!state) return null;
  
  const s = String(state).trim().toUpperCase();
  
  // Already a 2-letter code
  if (/^[A-Z]{2}$/.test(s)) return s;
  
  // Map full state names to codes
  const stateMap = {
    'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR',
    'CALIFORNIA': 'CA', 'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE',
    'FLORIDA': 'FL', 'GEORGIA': 'GA', 'HAWAII': 'HI', 'IDAHO': 'ID',
    'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA', 'KANSAS': 'KS',
    'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
    'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS',
    'MISSOURI': 'MO', 'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV',
    'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ', 'NEW MEXICO': 'NM', 'NEW YORK': 'NY',
    'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH', 'OKLAHOMA': 'OK',
    'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
    'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT',
    'VERMONT': 'VT', 'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV',
    'WISCONSIN': 'WI', 'WYOMING': 'WY', 'WASHINGTON DC': 'DC', 'DISTRICT OF COLUMBIA': 'DC',
  };
  
  return stateMap[s] || s.substring(0, 2);
}

/**
 * Normalize website URL
 */
function normalizeWebsite(url) {
  if (!url) return null;
  let website = String(url).trim();
  if (website && !website.startsWith('http')) {
    website = 'https://' + website;
  }
  return website;
}

/**
 * Parse comma-separated list into array
 */
function parseList(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  
  return String(value)
    .split(/[,;]/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}
