import ora from 'ora';
import chalk from 'chalk';

/**
 * Geocoding queue for processing facility addresses
 * Supports multiple providers: Nominatim (free), Google, Mapbox
 */
export class GeocodingQueue {
  constructor(pool, options = {}) {
    this.pool = pool;
    this.provider = options.provider || process.env.GEOCODER_PROVIDER || 'nominatim';
    this.apiKey = options.apiKey || process.env.GEOCODER_API_KEY;
    this.rateLimitMs = options.rateLimitMs || 1000; // 1 request per second for Nominatim
    this.lastRequest = 0;
  }

  /**
   * Get all ungeocoded facilities
   */
  async getUngeocoded(limit = 1000) {
    const result = await this.pool.query(
      `SELECT id, name, address, city, state, zip
       FROM facilities
       WHERE location IS NULL 
         AND address IS NOT NULL
         AND city IS NOT NULL
         AND state IS NOT NULL
       ORDER BY id
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /**
   * Geocode a single address
   */
  async geocode(address, city, state, zip) {
    const fullAddress = `${address}, ${city}, ${state} ${zip || ''}, USA`;
    
    switch (this.provider) {
      case 'nominatim':
        return this.geocodeNominatim(fullAddress);
      case 'google':
        return this.geocodeGoogle(fullAddress);
      case 'mapbox':
        return this.geocodeMapbox(fullAddress);
      default:
        throw new Error(`Unknown geocoder provider: ${this.provider}`);
    }
  }

  /**
   * Nominatim (OpenStreetMap) - Free, rate limited
   */
  async geocodeNominatim(address) {
    // Rate limiting
    const now = Date.now();
    const wait = this.lastRequest + this.rateLimitMs - now;
    if (wait > 0) {
      await sleep(wait);
    }
    this.lastRequest = Date.now();

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Railhub/1.0 (railhub@example.com)'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          confidence: 'medium',
          source: 'nominatim'
        };
      }
      
      return null;
    } catch (error) {
      console.warn(chalk.yellow(`Geocoding failed for "${address}": ${error.message}`));
      return null;
    }
  }

  /**
   * Google Geocoding API - Requires API key
   */
  async geocodeGoogle(address) {
    if (!this.apiKey) {
      throw new Error('Google Geocoding requires API key');
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          confidence: this.mapGoogleConfidence(result.geometry.location_type),
          source: 'google'
        };
      }
      
      return null;
    } catch (error) {
      console.warn(chalk.yellow(`Geocoding failed for "${address}": ${error.message}`));
      return null;
    }
  }

  /**
   * Mapbox Geocoding API - Requires API key
   */
  async geocodeMapbox(address) {
    if (!this.apiKey) {
      throw new Error('Mapbox Geocoding requires API key');
    }

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${this.apiKey}&limit=1`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        return {
          lat: feature.center[1],
          lng: feature.center[0],
          confidence: feature.relevance > 0.9 ? 'high' : feature.relevance > 0.7 ? 'medium' : 'low',
          source: 'mapbox'
        };
      }
      
      return null;
    } catch (error) {
      console.warn(chalk.yellow(`Geocoding failed for "${address}": ${error.message}`));
      return null;
    }
  }

  mapGoogleConfidence(locationType) {
    switch (locationType) {
      case 'ROOFTOP': return 'high';
      case 'RANGE_INTERPOLATED': return 'medium';
      case 'GEOMETRIC_CENTER': return 'medium';
      case 'APPROXIMATE': return 'low';
      default: return 'low';
    }
  }

  /**
   * Save geocoded location to database
   */
  async saveLocation(facilityId, lat, lng, confidence, source) {
    await this.pool.query(
      `UPDATE facilities 
       SET latitude = $1, 
           longitude = $2, 
           location = ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
           geocoded_at = NOW(),
           geocoding_confidence = $3
       WHERE id = $4`,
      [lat, lng, confidence, facilityId]
    );
  }

  /**
   * Process all ungeocoded facilities
   */
  async processAll(limit = 1000) {
    const facilities = await this.getUngeocoded(limit);
    
    if (facilities.length === 0) {
      console.log(chalk.green('No facilities need geocoding'));
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    console.log(chalk.blue(`Geocoding ${facilities.length} facilities using ${this.provider}...\n`));
    
    const spinner = ora('Starting...').start();
    let succeeded = 0;
    let failed = 0;
    
    for (let i = 0; i < facilities.length; i++) {
      const f = facilities[i];
      
      spinner.text = `Geocoding ${i + 1}/${facilities.length}: ${f.name.substring(0, 40)}...`;
      
      try {
        const result = await this.geocode(f.address, f.city, f.state, f.zip);
        
        if (result) {
          await this.saveLocation(f.id, result.lat, result.lng, result.confidence, result.source);
          succeeded++;
        } else {
          failed++;
        }
      } catch (error) {
        console.warn(chalk.yellow(`\nError geocoding ${f.name}: ${error.message}`));
        failed++;
      }
    }
    
    spinner.succeed(`Complete: ${succeeded} succeeded, ${failed} failed`);
    
    return { processed: facilities.length, succeeded, failed };
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
