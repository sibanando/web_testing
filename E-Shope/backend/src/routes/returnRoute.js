const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// POST /api/returns — user submits return request
router.post('/', verifyToken, async (req, res) => {
    try {
        const { order_id, reason } = req.body;
        if (!order_id || !reason?.trim()) {
            return res.status(400).json({ message: 'order_id and reason are required' });
        }

        const { rows: [order] } = await db.query('SELECT * FROM orders WHERE id = $1', [order_id]);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        if (order.user_id !== req.user.id && !req.user.is_admin) {
            return res.status(403).json({ message: 'Access denied' });
        }
        if (order.status !== 'Delivered') {
            return res.status(400).json({ message: 'Only delivered orders can be returned' });
        }

        const { rows: existing } = await db.query(
            'SELECT id FROM return_requests WHERE order_id = $1', [order_id]
        );
        if (existing.length) {
            return res.status(409).json({ message: 'A return request already exists for this order' });
        }

        const { rows: [req_] } = await db.query(
            `INSERT INTO return_requests (order_id, user_id, reason, refund_amount)
             VALUES ($1,$2,$3,$4) RETURNING *`,
            [order_id, req.user.id, reason.trim(), order.total]
        );

        await db.query("UPDATE orders SET status = 'Return Requested' WHERE id = $1", [order_id]);

        res.status(201).json({ message: 'Return request submitted', return: req_ });
    } catch (err) {
        console.error('Create return error:', err.message);
        res.status(500).json({ message: 'Failed to submit return request' });
    }
});

// GET /api/returns/user — logged-in user's return requests
router.get('/user', verifyToken, async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT r.*,
                o.total AS order_total, o.payment_method, o.created_at AS order_date,
                STRING_AGG(p.name || ' x' || oi.quantity, ', ') AS items
            FROM return_requests r
            JOIN orders o ON o.id = r.order_id
            LEFT JOIN order_items oi ON oi.order_id = o.id
            LEFT JOIN products p ON p.id = oi.product_id
            WHERE r.user_id = $1
            GROUP BY r.id, o.total, o.payment_method, o.created_at
            ORDER BY r.created_at DESC
        `, [req.user.id]);
        res.json(rows);
    } catch (err) {
        console.error('Get user returns error:', err.message);
        res.status(500).json({ message: 'Failed to fetch return requests' });
    }
});

// GET /api/returns — admin: all return requests
router.get('/', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT r.*,
                u.name AS user_name, u.email AS user_email,
                o.total AS order_total, o.payment_method, o.created_at AS order_date,
                STRING_AGG(p.name || ' x' || oi.quantity, ', ') AS items
            FROM return_requests r
            JOIN users u ON u.id = r.user_id
            JOIN orders o ON o.id = r.order_id
            LEFT JOIN order_items oi ON oi.order_id = o.id
            LEFT JOIN products p ON p.id = oi.product_id
            GROUP BY r.id, u.name, u.email, o.total, o.payment_method, o.created_at
            ORDER BY r.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error('Get all returns error:', err.message);
        res.status(500).json({ message: 'Failed to fetch return requests' });
    }
});

// PATCH /api/returns/:id — admin approves or rejects
router.patch('/:id', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { status, admin_note, refund_amount } = req.body;
        const valid = ['approved', 'rejected', 'refund_processed'];
        if (!valid.includes(status)) {
            return res.status(400).json({ message: 'status must be: approved | rejected | refund_processed' });
        }

        const { rows: [rr] } = await db.query(
            'SELECT * FROM return_requests WHERE id = $1', [req.params.id]
        );
        if (!rr) return res.status(404).json({ message: 'Return request not found' });

        await db.query(
            `UPDATE return_requests
             SET status=$1, admin_note=$2, refund_amount=COALESCE($3, refund_amount), updated_at=NOW()
             WHERE id=$4`,
            [status, admin_note || null, refund_amount || null, req.params.id]
        );

        // Keep order status in sync
        const orderStatus = (status === 'approved' || status === 'refund_processed') ? 'Returned' : 'Delivered';
        await db.query('UPDATE orders SET status=$1 WHERE id=$2', [orderStatus, rr.order_id]);

        // Restore stock when return is approved
        if (status === 'approved') {
            await db.query(`
                UPDATE products p SET stock = p.stock + oi.quantity
                FROM order_items oi
                WHERE p.id = oi.product_id AND oi.order_id = $1
            `, [rr.order_id]);
        }

        res.json({ message: `Return ${status}` });
    } catch (err) {
        console.error('Update return error:', err.message);
        res.status(500).json({ message: 'Failed to update return request' });
    }
});

module.exports = router;
