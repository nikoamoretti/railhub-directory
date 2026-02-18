import xlsx from 'xlsx';
import { createReadStream } from 'fs';
import csv from 'csv-parser';

/**
 * Parse Excel file and return normalized records
 */
export function parseExcelFile(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON with header row
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  if (data.length < 2) {
    return []; // No data rows
  }
  
  // First row is headers
  const headers = data[0].map(h => normalizeHeader(String(h)));
  const records = [];
  
  // Process data rows
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    const record = {};
    
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const value = row[j];
      
      if (value !== undefined && value !== null && value !== '') {
        record[header] = String(value).trim();
      }
    }
    
    // Normalize the record structure
    const normalized = normalizeRecord(record);
    if (normalized.name) {
      records.push(normalized);
    }
  }
  
  return records;
}

/**
 * Normalize header names to standard field names
 */
function normalizeHeader(header) {
  const lower = header.toLowerCase().trim();
  
  // Name fields
  if (/facility|company|operator/i.test(lower)) return 'name';
  
  // Address fields
  if (/^address$/i.test(lower)) return 'address';
  if (/city/i.test(lower)) return 'city';
  if (/state/i.test(lower)) return 'state';
  if (/zip|postal/i.test(lower)) return 'zip';
  if (/country/i.test(lower)) return 'country';
  
  // Contact fields
  if (/phone|tel|contact/i.test(lower)) return 'phone';
  if (/email|e-mail/i.test(lower)) return 'email';
  if (/website|web|url|site/i.test(lower)) return 'website';
  
  // Commodities
  if (/commodit/i.test(lower)) return 'commodities';
  
  // Railroads
  if (/railroad|served by/i.test(lower)) return 'railroads';
  
  // Type/description
  if (/type/i.test(lower)) return 'type';
  if (/description|desc/i.test(lower)) return 'description';
  if (/hours/i.test(lower)) return 'hours';
  if (/operator/i.test(lower) && lower.includes('operator')) return 'operator';
  
  // Fleet/company details
  if (/fleet/i.test(lower)) return 'fleetSize';
  if (/ownership/i.test(lower)) return 'ownership';
  
  // Keep original if no match
  return header.toLowerCase().replace(/\s+/g, '_');
}

/**
 * Normalize a record to standard structure
 */
function normalizeRecord(record) {
  const normalized = {
    name: record.name || record.facility_name || record.company_name,
    address: record.address,
    city: record.city,
    state: normalizeState(record.state),
    zip: record.zip,
    phone: record.phone,
    email: record.email,
    website: normalizeWebsite(record.website),
    commodities: parseList(record.commodities),
    railroads: parseList(record.railroads),
    description: record.description,
    type: record.type,
    hours: record.hours,
    operator: record.operator,
    fleetSize: record.fleetSize,
    ownership: record.ownership,
  };
  
  // Keep any additional fields
  for (const [key, value] of Object.entries(record)) {
    if (!(key in normalized) && value) {
      normalized[key] = value;
    }
  }
  
  return normalized;
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
