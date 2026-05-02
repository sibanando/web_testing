const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { safeGet, safeSet, safeDelPattern } = require('../config/redis');

const CACHE_TTL = 60; // seconds

function cacheKey(params) {
    return `products:list:${JSON.stringify(params)}`;
}

// GET /api/products/categories/list — unique categories (must be before /:id)
router.get('/categories/list', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT DISTINCT category FROM products ORDER BY category');
        res.json(rows.map(r => r.category));
    } catch (err) {
        console.error('Get categories error:', err.message);
        res.status(500).json({ message: 'Failed to fetch categories' });
    }
});

// GET /api/products — list all or filter by category/search with pagination
// Search uses PostgreSQL full-text search (tsvector) with ILIKE fallback for short terms
router.get('/', async (req, res) => {
    try {
        const { category, search, limit, offset } = req.query;
        const key = cacheKey({ category, search, limit, offset });

        const cached = await safeGet(key);
        if (cached) return res.json(JSON.parse(cached));

        let query;
        const params = [];

        if (search && search.trim().length >= 2) {
            // Full-text search with prefix matching for the last word + ILIKE fallback
            const tsQuery = search.trim().split(/\s+/).map(w => w + ':*').join(' & ');
            params.push(tsQuery);
            params.push(`%${search}%`);
            const ftsIdx = 1;
            const likeIdx = 2;

            query = `SELECT *, ts_rank(
                    to_tsvector('english', name || ' ' || COALESCE(description,'') || ' ' || category),
                    to_tsquery('english', $${ftsIdx})
                ) AS _rank
                FROM products
                WHERE (
                    to_tsvector('english', name || ' ' || COALESCE(description,'') || ' ' || category)
                    @@ to_tsquery('english', $${ftsIdx})
                    OR name ILIKE $${likeIdx}
                    OR category ILIKE $${likeIdx}
                )`;

            if (category && category !== 'All') {
                params.push(category);
                query += ` AND category = $${params.length}`;
            }

            query += ' ORDER BY _rank DESC, id DESC';
        } else {
            query = 'SELECT * FROM products WHERE 1=1';

            if (category && category !== 'All') {
                params.push(category);
                query += ` AND category = $${params.length}`;
            }
            if (search) {
                params.push(`%${search}%`);
                const n = params.length;
                query += ` AND (name ILIKE $${n} OR description ILIKE $${n} OR category ILIKE $${n})`;
            }

            query += ' ORDER BY id DESC';
        }

        if (limit) {
            params.push(parseInt(limit));
            query += ` LIMIT $${params.length}`;
        }
        if (offset) {
            params.push(parseInt(offset));
            query += ` OFFSET $${params.length}`;
        }

        const { rows } = await db.query(query, params);

        // Strip internal rank column before caching/responding
        const result = rows.map(({ _rank, ...rest }) => rest);

        await safeSet(key, JSON.stringify(result), CACHE_TTL);
        res.json(result);
    } catch (err) {
        console.error('Get products error:', err.message);
        res.status(500).json({ message: 'Failed to fetch products' });
    }
});

// GET /api/products/:id — single product
router.get('/:id', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
        if (!rows[0]) return res.status(404).json({ message: 'Product not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error('Get product error:', err.message);
        res.status(500).json({ message: 'Failed to fetch product' });
    }
});

// POST /api/products — admin-only product creation
router.post('/', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { name, price, description, category, images, discount, stock } = req.body;
        if (!name || !price) return res.status(400).json({ message: 'Name and price required' });

        const { rows } = await db.query(
            `INSERT INTO products (name, price, description, category, images, discount, stock)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [
                name, parseFloat(price), description || '',
                category || 'General',
                typeof images === 'string' ? images : JSON.stringify(images || []),
                discount || 0, stock || 100
            ]
        );

        // Invalidate product listing cache
        await safeDelPattern('products:list:*');

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Create product error:', err.message);
        res.status(500).json({ message: 'Failed to create product' });
    }
});

module.exports = router;
