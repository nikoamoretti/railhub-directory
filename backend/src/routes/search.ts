import { Router } from 'express';
import { pool } from '../db.js';
import { z } from 'zod';

const router = Router();

/**
 * GET /api/search/suggest
 * Autocomplete suggestions for search
 */
router.get('/suggest', async (req, res) => {
  try {
    const schema = z.object({
      q: z.string().min(1).max(100),
      limit: z.coerce.number().min(1).max(20).default(10),
    });
    
    const query = schema.parse(req.query);
    
    // Search for matching facility names using trigram similarity
    const result = await pool.query(`
      SELECT DISTINCT name, city, state, category_id,
        similarity(name, $1) as sml
      FROM facilities
      WHERE name % $1
        AND is_active = true
      ORDER BY sml DESC, name ASC
      LIMIT $2
    `, [query.q, query.limit]);
    
    // Get category names for the results
    const categoryIds = [...new Set(result.rows.map(r => r.category_id))];
    const categoriesResult = categoryIds.length > 0 
      ? await pool.query(`SELECT id, name, slug FROM categories WHERE id = ANY($1)`, [categoryIds])
      : { rows: [] };
    
    const categoryMap = new Map(categoriesResult.rows.map(c => [c.id, c]));
    
    const suggestions = result.rows.map(r => ({
      name: r.name,
      location: r.city && r.state ? `${r.city}, ${r.state}` : undefined,
      category: categoryMap.get(r.category_id)?.name,
      categorySlug: categoryMap.get(r.category_id)?.slug,
    }));
    
    res.json({ data: suggestions });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid query', details: error.errors });
    } else {
      console.error('Error fetching suggestions:', error);
      res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
  }
});

/**
 * GET /api/search/states
 * List all states with facility counts
 */
router.get('/states', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT state, COUNT(*) as count
      FROM facilities
      WHERE is_active = true AND state IS NOT NULL
      GROUP BY state
      ORDER BY count DESC
    `);
    
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({ error: 'Failed to fetch states' });
  }
});

/**
 * GET /api/search/cities
 * List cities in a state
 */
router.get('/cities', async (req, res) => {
  try {
    const schema = z.object({
      state: z.string().length(2),
      limit: z.coerce.number().min(1).max(100).default(50),
    });
    
    const query = schema.parse(req.query);
    
    const result = await pool.query(`
      SELECT city, COUNT(*) as count
      FROM facilities
      WHERE is_active = true AND state = $1 AND city IS NOT NULL
      GROUP BY city
      ORDER BY count DESC
      LIMIT $2
    `, [query.state.toUpperCase(), query.limit]);
    
    res.json({ data: result.rows });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid query', details: error.errors });
    } else {
      console.error('Error fetching cities:', error);
      res.status(500).json({ error: 'Failed to fetch cities' });
    }
  }
});

/**
 * POST /api/search/log
 * Log a search query (for analytics)
 */
router.post('/log', async (req, res) => {
  try {
    const schema = z.object({
      query: z.string().optional(),
      filters: z.record(z.any()).optional(),
      resultsCount: z.number().optional(),
    });
    
    const body = schema.parse(req.body);
    
    await pool.query(`
      INSERT INTO search_logs (query, filters, results_count, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      body.query || null,
      body.filters ? JSON.stringify(body.filters) : null,
      body.resultsCount || null,
      req.ip,
      req.headers['user-agent'] || null,
    ]);
    
    res.json({ success: true });
  } catch (error) {
    // Don't fail the request if logging fails
    console.error('Error logging search:', error);
    res.json({ success: false });
  }
});

export { router as searchRoutes };
