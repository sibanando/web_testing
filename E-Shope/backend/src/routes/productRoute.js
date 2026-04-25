const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/products/categories/list  — unique categories (must be before /:id)
router.get('/categories/list', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT DISTINCT category FROM products ORDER BY category');
        res.json(rows.map(r => r.category));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/products  — list all or filter by category/search
router.get('/', async (req, res) => {
    try {
        const { category, search, limit } = req.query;
        let query = 'SELECT * FROM products WHERE 1=1';
        const params = [];

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

        if (limit) {
            params.push(parseInt(limit));
            query += ` LIMIT $${params.length}`;
        }

        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Get products error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/products/:id  — single product
router.get('/:id', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
        if (!rows[0]) return res.status(404).json({ message: 'Product not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/products  — create product
router.post('/', async (req, res) => {
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
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Create product error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
