const express = require('express');
const router = express.Router();
const db = require('../config/db');

// POST /api/orders  — create order with items (transactional)
router.post('/', async (req, res) => {
    const client = await db.connect();
    try {
        const { userId, total, items, address, phone, paymentMethod, transactionId } = req.body;
        if (!total || !items || !items.length) {
            return res.status(400).json({ message: 'Total and items are required' });
        }

        await client.query('BEGIN');

        const { rows } = await client.query(
            `INSERT INTO orders (user_id, total, status, address, phone, payment_method, transaction_id)
             VALUES ($1, $2, 'Paid', $3, $4, $5, $6) RETURNING *`,
            [userId || null, total, address || '', phone || '', paymentMethod || 'UPI', transactionId || '']
        );
        const order = rows[0];

        for (const item of items) {
            await client.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
                [order.id, item.id, item.quantity, parseFloat(item.price)]
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

// GET /api/orders/user/:userId  — user order history
router.get('/user/:userId', async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT o.*,
                STRING_AGG(p.name || ' x' || oi.quantity, ', ') as items_summary
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = $1
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `, [req.params.userId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
