const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { addLoyaltyPoints, createNotification } = require('../utils/crm');

// GET /api/reviews/product/:productId — public
router.get('/product/:productId', async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);
        const { rows } = await db.query(`
            SELECT pr.id, pr.rating, pr.title, pr.body, pr.is_verified_buyer, pr.created_at,
                   u.name as user_name
            FROM product_reviews pr
            JOIN users u ON u.id = pr.user_id
            WHERE pr.product_id = $1 AND pr.is_approved = 1
            ORDER BY pr.is_verified_buyer DESC, pr.created_at DESC
            LIMIT 50
        `, [productId]);

        const { rows: dist } = await db.query(`
            SELECT rating, COUNT(*) as count
            FROM product_reviews
            WHERE product_id = $1 AND is_approved = 1
            GROUP BY rating ORDER BY rating DESC
        `, [productId]);

        const { rows: stats } = await db.query(`
            SELECT ROUND(AVG(rating)::numeric, 1) as avg_rating, COUNT(*) as total
            FROM product_reviews
            WHERE product_id = $1 AND is_approved = 1
        `, [productId]);

        res.json({ reviews: rows, distribution: dist, stats: stats[0] });
    } catch (err) {
        console.error('Reviews fetch error:', err.message);
        res.status(500).json({ message: 'Failed to fetch reviews' });
    }
});

// GET /api/reviews/can-review/:productId
router.get('/can-review/:productId', verifyToken, async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);

        const { rows: existing } = await db.query(
            'SELECT id FROM product_reviews WHERE user_id = $1 AND product_id = $2',
            [req.user.id, productId]
        );
        if (existing.length) return res.json({ can: false, reason: 'already_reviewed' });

        const { rows: ordered } = await db.query(`
            SELECT o.id FROM orders o
            JOIN order_items oi ON oi.order_id = o.id
            WHERE o.user_id = $1 AND oi.product_id = $2
            LIMIT 1
        `, [req.user.id, productId]);

        res.json({ can: true, is_verified_buyer: ordered.length > 0 });
    } catch (err) {
        res.status(500).json({ message: 'Failed to check review eligibility' });
    }
});

// POST /api/reviews
router.post('/', verifyToken, async (req, res) => {
    try {
        const { product_id, rating, title, body } = req.body;
        if (!product_id || !rating) return res.status(400).json({ message: 'product_id and rating required' });
        const r = parseInt(rating);
        if (r < 1 || r > 5) return res.status(400).json({ message: 'Rating must be 1-5' });

        const { rows: existing } = await db.query(
            'SELECT id FROM product_reviews WHERE user_id = $1 AND product_id = $2',
            [req.user.id, product_id]
        );
        if (existing.length) return res.status(400).json({ message: 'You have already reviewed this product' });

        const { rows: ordered } = await db.query(`
            SELECT o.id FROM orders o
            JOIN order_items oi ON oi.order_id = o.id
            WHERE o.user_id = $1 AND oi.product_id = $2
            LIMIT 1
        `, [req.user.id, product_id]);
        const isVerified = ordered.length > 0;

        const { rows } = await db.query(`
            INSERT INTO product_reviews (product_id, user_id, rating, title, body, is_verified_buyer, is_approved)
            VALUES ($1,$2,$3,$4,$5,$6,1) RETURNING *
        `, [product_id, req.user.id, r, title?.trim() || null, body?.trim() || null, isVerified ? 1 : 0]);

        // Recalculate product rating
        await db.query(`
            UPDATE products SET
                rating  = (SELECT ROUND(AVG(rating)::numeric,1) FROM product_reviews WHERE product_id=$1 AND is_approved=1),
                reviews = (SELECT COUNT(*) FROM product_reviews WHERE product_id=$1 AND is_approved=1)
            WHERE id = $1
        `, [product_id]);

        // Reward loyalty points
        await addLoyaltyPoints(req.user.id, 50, 'review_earn', rows[0].id, 'Review submitted');
        await createNotification(
            req.user.id, 'points_earned',
            '50 points earned!',
            'Thank you for your review. We\'ve added 50 loyalty points to your account.',
            '/profile?tab=loyalty'
        );

        res.status(201).json({ message: 'Review submitted', review: rows[0] });
    } catch (err) {
        console.error('Review create error:', err.message);
        res.status(500).json({ message: 'Failed to submit review' });
    }
});

// ── Admin routes ──────────────────────────────────────────────────────────────
const adminGuard = [verifyToken, requireAdmin];

// GET /api/reviews/admin/all
router.get('/admin/all', adminGuard, async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT pr.*, u.name as user_name, p.name as product_name
            FROM product_reviews pr
            JOIN users u ON u.id = pr.user_id
            JOIN products p ON p.id = pr.product_id
            ORDER BY pr.created_at DESC
            LIMIT 200
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch reviews' });
    }
});

// PUT /api/reviews/admin/:id — approve/reject
router.put('/admin/:id', adminGuard, async (req, res) => {
    try {
        const { is_approved } = req.body;
        const val = is_approved ? 1 : 0;
        const { rows } = await db.query(
            'UPDATE product_reviews SET is_approved=$1 WHERE id=$2 RETURNING *',
            [val, parseInt(req.params.id)]
        );
        if (!rows.length) return res.status(404).json({ message: 'Review not found' });

        // Recalculate product rating
        await db.query(`
            UPDATE products SET
                rating  = (SELECT COALESCE(ROUND(AVG(rating)::numeric,1),0) FROM product_reviews WHERE product_id=$1 AND is_approved=1),
                reviews = (SELECT COUNT(*) FROM product_reviews WHERE product_id=$1 AND is_approved=1)
            WHERE id = $1
        `, [rows[0].product_id]);

        res.json({ message: `Review ${val ? 'approved' : 'rejected'}`, review: rows[0] });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update review' });
    }
});

// DELETE /api/reviews/admin/:id
router.delete('/admin/:id', adminGuard, async (req, res) => {
    try {
        const { rows } = await db.query(
            'DELETE FROM product_reviews WHERE id=$1 RETURNING product_id',
            [parseInt(req.params.id)]
        );
        if (!rows.length) return res.status(404).json({ message: 'Review not found' });
        await db.query(`
            UPDATE products SET
                rating  = COALESCE((SELECT ROUND(AVG(rating)::numeric,1) FROM product_reviews WHERE product_id=$1 AND is_approved=1), 0),
                reviews = (SELECT COUNT(*) FROM product_reviews WHERE product_id=$1 AND is_approved=1)
            WHERE id = $1
        `, [rows[0].product_id]);
        res.json({ message: 'Review deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete review' });
    }
});

module.exports = router;
