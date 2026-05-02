const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// GET /api/wishlist
router.get('/', verifyToken, async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT w.product_id, w.created_at,
                   p.id, p.name, p.price, p.discount, p.images, p.rating, p.reviews, p.stock, p.category
            FROM wishlists w
            JOIN products p ON p.id = w.product_id
            WHERE w.user_id = $1
            ORDER BY w.created_at DESC
        `, [req.user.id]);
        res.json(rows);
    } catch (err) {
        console.error('Wishlist fetch error:', err.message);
        res.status(500).json({ message: 'Failed to fetch wishlist' });
    }
});

// GET /api/wishlist/ids — product IDs only (for quick lookup)
router.get('/ids', verifyToken, async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT product_id FROM wishlists WHERE user_id = $1',
            [req.user.id]
        );
        res.json(rows.map(r => r.product_id));
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch wishlist ids' });
    }
});

// POST /api/wishlist/:productId
router.post('/:productId', verifyToken, async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);
        if (!productId) return res.status(400).json({ message: 'Invalid product id' });

        const { rows } = await db.query('SELECT id FROM products WHERE id = $1', [productId]);
        if (!rows.length) return res.status(404).json({ message: 'Product not found' });

        await db.query(
            'INSERT INTO wishlists (user_id, product_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
            [req.user.id, productId]
        );
        res.json({ message: 'Added to wishlist' });
    } catch (err) {
        console.error('Wishlist add error:', err.message);
        res.status(500).json({ message: 'Failed to add to wishlist' });
    }
});

// DELETE /api/wishlist/:productId
router.delete('/:productId', verifyToken, async (req, res) => {
    try {
        await db.query(
            'DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2',
            [req.user.id, parseInt(req.params.productId)]
        );
        res.json({ message: 'Removed from wishlist' });
    } catch (err) {
        console.error('Wishlist remove error:', err.message);
        res.status(500).json({ message: 'Failed to remove from wishlist' });
    }
});

module.exports = router;
