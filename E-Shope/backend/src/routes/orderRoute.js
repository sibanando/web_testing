const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// POST /api/orders — create order with items (transactional)
router.post('/', verifyToken, async (req, res) => {
    const client = await db.connect();
    try {
        const { total, items, address, phone, paymentMethod, transactionId } = req.body;
        if (!total || !items || !items.length) {
            return res.status(400).json({ message: 'Total and items are required' });
        }

        await client.query('BEGIN');

        const { rows } = await client.query(
            `INSERT INTO orders (user_id, total, status, address, phone, payment_method, transaction_id)
             VALUES ($1, $2, 'Paid', $3, $4, $5, $6) RETURNING *`,
            [req.user.id, total, address || '', phone || '', paymentMethod || 'UPI', transactionId || '']
        );
        const order = rows[0];

        for (const item of items) {
            await client.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
                [order.id, item.id, item.quantity, parseFloat(item.price)]
            );
            // Decrement stock; clamp at 0
            await client.query(
                'UPDATE products SET stock = GREATEST(0, stock - $1) WHERE id = $2',
                [item.quantity, item.id]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({
            orderId: order.id,
            status: 'Paid',
            message: 'Order placed successfully'
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Create order error:', err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// GET /api/orders/user/:userId — user order history
// Users can only see their own orders; admins can see any
router.get('/user/:userId', verifyToken, async (req, res) => {
    try {
        const requestedId = parseInt(req.params.userId);
        if (req.user.id !== requestedId && !req.user.is_admin) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { rows } = await db.query(`
            SELECT o.*,
                STRING_AGG(p.name || ' x' || oi.quantity, ', ') as items_summary
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = $1
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `, [requestedId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
