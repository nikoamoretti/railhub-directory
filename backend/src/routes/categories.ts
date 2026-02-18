import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

/**
 * GET /api/categories
 * List all categories
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id, c.slug, c.name, c.description, c.display_order,
        COUNT(f.id) as facility_count
      FROM categories c
      LEFT JOIN facilities f ON f.category_id = c.id AND f.is_active = true
      WHERE c.is_active = true
      GROUP BY c.id
      ORDER BY c.display_order ASC, c.name ASC
    `);
    
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * GET /api/categories/:slug
 * Get a category by slug with its facilities
 */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Get category
    const categoryResult = await pool.query(`
      SELECT * FROM categories WHERE slug = $1 AND is_active = true
    `, [slug]);
    
    if (categoryResult.rows.length === 0) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    
    const category = categoryResult.rows[0];
    
    // Get facilities in this category (paginated)
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    
    const facilitiesResult = await pool.query(`
      SELECT 
        f.id, f.name, f.address, f.city, f.state, f.zip,
        f.phone, f.email, f.website, f.latitude, f.longitude,
        f.attributes
      FROM facilities f
      WHERE f.category_id = $1 AND f.is_active = true
      ORDER BY f.name ASC
      LIMIT $2 OFFSET $3
    `, [category.id, limit, offset]);
    
    // Get count
    const countResult = await pool.query(`
      SELECT COUNT(*) FROM facilities WHERE category_id = $1 AND is_active = true
    `, [category.id]);
    
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      category,
      facilities: facilitiesResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

/**
 * GET /api/categories/:slug/stats
 * Get statistics for a category
 */
router.get('/:slug/stats', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Get category
    const categoryResult = await pool.query(`
      SELECT id, name, slug FROM categories WHERE slug = $1 AND is_active = true
    `, [slug]);
    
    if (categoryResult.rows.length === 0) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    
    const category = categoryResult.rows[0];
    
    // Get state distribution
    const statesResult = await pool.query(`
      SELECT state, COUNT(*) as count
      FROM facilities
      WHERE category_id = $1 AND is_active = true
      GROUP BY state
      ORDER BY count DESC
    `, [category.id]);
    
    // Get city distribution (top 20)
    const citiesResult = await pool.query(`
      SELECT city, state, COUNT(*) as count
      FROM facilities
      WHERE category_id = $1 AND is_active = true AND city IS NOT NULL
      GROUP BY city, state
      ORDER BY count DESC
      LIMIT 20
    `, [category.id]);
    
    // Total count
    const countResult = await pool.query(`
      SELECT COUNT(*) as total FROM facilities WHERE category_id = $1 AND is_active = true
    `, [category.id]);
    
    res.json({
      category,
      total: parseInt(countResult.rows[0].total),
      byState: statesResult.rows,
      topCities: citiesResult.rows,
    });
  } catch (error) {
    console.error('Error fetching category stats:', error);
    res.status(500).json({ error: 'Failed to fetch category stats' });
  }
});

export { router as categoryRoutes };
