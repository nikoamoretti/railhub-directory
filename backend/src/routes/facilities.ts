import { Router } from 'express';
import { pool } from '../db.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const facilityQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  state: z.string().length(2).optional(),
  city: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(1).max(500).default(50),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

const paramsSchema = z.object({
  id: z.coerce.number().positive(),
});

/**
 * GET /api/facilities
 * List facilities with filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const query = facilityQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;
    
    let sql = `
      SELECT 
        f.id, f.name, f.address, f.city, f.state, f.zip,
        f.phone, f.email, f.website, f.latitude, f.longitude,
        f.attributes, f.created_at,
        c.id as category_id, c.name as category_name, c.slug as category_slug
      FROM facilities f
      JOIN categories c ON f.category_id = c.id
      WHERE f.is_active = true
    `;
    
    const params: (string | number)[] = [];
    let paramIndex = 1;
    
    // Full-text search
    if (query.q) {
      sql += ` AND f.search_vector @@ plainto_tsquery('english', $${paramIndex})`;
      params.push(query.q);
      paramIndex++;
    }
    
    // Category filter
    if (query.category) {
      sql += ` AND c.slug = $${paramIndex}`;
      params.push(query.category);
      paramIndex++;
    }
    
    // State filter
    if (query.state) {
      sql += ` AND f.state = $${paramIndex}`;
      params.push(query.state.toUpperCase());
      paramIndex++;
    }
    
    // City filter (fuzzy match)
    if (query.city) {
      sql += ` AND f.city ILIKE $${paramIndex}`;
      params.push(`%${query.city}%`);
      paramIndex++;
    }
    
    // Geospatial filter
    if (query.lat && query.lng) {
      sql += ` AND f.location IS NOT NULL AND ST_DWithin(
        f.location::geometry,
        ST_SetSRID(ST_MakePoint($${paramIndex + 1}, $${paramIndex}), 4326)::geometry,
        $${paramIndex + 2} * 1609.344
      )`;
      params.push(query.lat, query.lng, query.radius);
      paramIndex += 3;
      
      // Order by distance
      sql += ` ORDER BY ST_Distance(
        f.location::geometry,
        ST_SetSRID(ST_MakePoint($${paramIndex - 2}, $${paramIndex - 3}), 4326)::geometry
      )`;
    } else if (query.q) {
      // Order by search relevance
      sql += ` ORDER BY ts_rank(f.search_vector, plainto_tsquery('english', $1)) DESC`;
    } else {
      sql += ` ORDER BY f.name ASC`;
    }
    
    // Pagination
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(query.limit, offset);
    
    // Execute query
    const result = await pool.query(sql, params);
    
    // Get total count for pagination
    let countSql = `
      SELECT COUNT(*) FROM facilities f
      JOIN categories c ON f.category_id = c.id
      WHERE f.is_active = true
    `;
    const countParams: (string | number)[] = [];
    let countIndex = 1;
    
    if (query.q) {
      countSql += ` AND f.search_vector @@ plainto_tsquery('english', $${countIndex})`;
      countParams.push(query.q);
      countIndex++;
    }
    if (query.category) {
      countSql += ` AND c.slug = $${countIndex}`;
      countParams.push(query.category);
      countIndex++;
    }
    if (query.state) {
      countSql += ` AND f.state = $${countIndex}`;
      countParams.push(query.state.toUpperCase());
      countIndex++;
    }
    if (query.city) {
      countSql += ` AND f.city ILIKE $${countIndex}`;
      countParams.push(`%${query.city}%`);
      countIndex++;
    }
    if (query.lat && query.lng) {
      countSql += ` AND f.location IS NOT NULL AND ST_DWithin(
        f.location::geometry,
        ST_SetSRID(ST_MakePoint($${countIndex + 1}, $${countIndex}), 4326)::geometry,
        $${countIndex + 2} * 1609.344
      )`;
      countParams.push(query.lat, query.lng, query.radius);
    }
    
    const countResult = await pool.query(countSql, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      data: result.rows,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    } else {
      console.error('Error fetching facilities:', error);
      res.status(500).json({ error: 'Failed to fetch facilities' });
    }
  }
});

/**
 * GET /api/facilities/:id
 * Get a single facility by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = paramsSchema.parse(req.params);
    
    const result = await pool.query(`
      SELECT 
        f.*,
        c.name as category_name, c.slug as category_slug
      FROM facilities f
      JOIN categories c ON f.category_id = c.id
      WHERE f.id = $1 AND f.is_active = true
    `, [id]);
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Facility not found' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid ID' });
    } else {
      console.error('Error fetching facility:', error);
      res.status(500).json({ error: 'Failed to fetch facility' });
    }
  }
});

/**
 * GET /api/facilities/nearby
 * Get facilities near a point
 */
router.get('/nearby', async (req, res) => {
  try {
    const schema = z.object({
      lat: z.coerce.number().min(-90).max(90),
      lng: z.coerce.number().min(-180).max(180),
      radius: z.coerce.number().min(1).max(500).default(50),
      limit: z.coerce.number().min(1).max(100).default(20),
    });
    
    const query = schema.parse(req.query);
    
    const result = await pool.query(`
      SELECT 
        f.id, f.name, f.address, f.city, f.state, f.zip,
        f.phone, f.website, f.latitude, f.longitude,
        c.name as category_name, c.slug as category_slug,
        ST_Distance(
          f.location::geometry,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geometry
        ) / 1609.344 as distance_miles
      FROM facilities f
      JOIN categories c ON f.category_id = c.id
      WHERE f.is_active = true
        AND f.location IS NOT NULL
        AND ST_DWithin(
          f.location::geometry,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geometry,
          $3 * 1609.344
        )
      ORDER BY distance_miles
      LIMIT $4
    `, [query.lat, query.lng, query.radius, query.limit]);
    
    res.json({
      data: result.rows,
      center: { lat: query.lat, lng: query.lng },
      radius: query.radius,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    } else {
      console.error('Error fetching nearby facilities:', error);
      res.status(500).json({ error: 'Failed to fetch nearby facilities' });
    }
  }
});

export { router as facilityRoutes };
