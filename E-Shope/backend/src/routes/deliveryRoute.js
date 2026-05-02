const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { verifyToken, requireAdmin, JWT_SECRET } = require('../middleware/auth');

// ── Agent JWT middleware ───────────────────────────────────────────────────────
function verifyAgent(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ message: 'Agent authentication required' });
    try {
        const payload = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
        if (!payload.agent_id) return res.status(403).json({ message: 'Not an agent token' });
        req.agent = payload;
        next();
    } catch {
        res.status(401).json({ message: 'Invalid or expired agent token' });
    }
}

// Status → order status mapping (Flipkart/Amazon style)
const ORDER_STATUS_MAP = {
    accepted:            'Confirmed',
    reached_pickup:      'Packed',
    picked_up:           'Shipped',
    out_for_delivery:    'Out for Delivery',
    near_location:       'Out for Delivery',
    delivered:           'Delivered',
    delivery_attempted:  'Delivery Attempted',
    rto_initiated:       'Returning to Origin',
};

// All valid agent-settable statuses (in order)
const AGENT_STATUSES = [
    'accepted',
    'reached_pickup',
    'picked_up',
    'out_for_delivery',
    'near_location',
    'delivered',
    'delivery_attempted',
    'rto_initiated',
];

// ── Admin: agents ─────────────────────────────────────────────────────────────

router.post('/agents', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { name, phone, email, password } = req.body;
        if (!name || !phone || !password) return res.status(400).json({ message: 'name, phone and password required' });
        const hash = bcrypt.hashSync(password, 10);
        const { rows: [a] } = await db.query(
            `INSERT INTO delivery_agents (name, phone, email, password)
             VALUES ($1,$2,$3,$4) RETURNING id, name, phone, email, is_active, created_at`,
            [name, phone, email || null, hash]
        );
        res.status(201).json(a);
    } catch (err) {
        console.error('Create agent error:', err.message);
        res.status(500).json({ message: 'Failed to create agent' });
    }
});

router.get('/agents', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT id, name, phone, email, is_active, current_lat, current_lng, last_seen, created_at
             FROM delivery_agents ORDER BY id DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch agents' });
    }
});

// ── Admin: assign order ───────────────────────────────────────────────────────

router.post('/assign', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { order_id, agent_id, estimated_delivery } = req.body;
        if (!order_id || !agent_id) return res.status(400).json({ message: 'order_id and agent_id required' });

        const { rows: [order] } = await db.query('SELECT id, total FROM orders WHERE id=$1', [order_id]);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        const { rows: [agentRow] } = await db.query('SELECT id FROM delivery_agents WHERE id=$1', [agent_id]);
        if (!agentRow) return res.status(404).json({ message: 'Agent not found' });

        const tracking_token = crypto.randomBytes(16).toString('hex');

        // Generate delivery OTP for orders above ₹2000 (like Flipkart)
        const delivery_otp = order.total > 2000
            ? String(crypto.randomInt(100000, 999999))
            : null;

        // Default ETA: today + 1 day if not provided
        const eta = estimated_delivery || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        const { rows: [delivery] } = await db.query(
            `INSERT INTO deliveries (order_id, agent_id, tracking_token, estimated_delivery, delivery_otp)
             VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (order_id) DO UPDATE
               SET agent_id=$2, tracking_token=$3, status='assigned',
                   estimated_delivery=$4, delivery_otp=$5,
                   delivery_attempts=0, otp_verified=0, assigned_at=NOW()
             RETURNING *`,
            [order_id, agent_id, tracking_token, eta, delivery_otp]
        );

        await db.query("UPDATE orders SET status='Processing' WHERE id=$1", [order_id]);

        if (delivery_otp) {
            console.log(`[Delivery OTP] Order #${order_id} → OTP: ${delivery_otp} (share with customer)`);
        }

        res.json({
            message:        'Delivery assigned',
            tracking_token,
            tracking_url:   `${process.env.FRONTEND_URL || 'http://localhost:5555'}/track/${tracking_token}`,
            delivery_otp:   delivery_otp ? '(logged to server — share with customer)' : null,
            otp_required:   !!delivery_otp,
            delivery,
        });
    } catch (err) {
        console.error('Assign delivery error:', err.message);
        res.status(500).json({ message: 'Failed to assign delivery' });
    }
});

router.get('/', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT d.*, da.name AS agent_name, da.phone AS agent_phone,
                o.address, o.total, o.status AS order_status,
                u.name AS customer_name, u.email AS customer_email
            FROM deliveries d
            JOIN delivery_agents da ON da.id = d.agent_id
            JOIN orders o ON o.id = d.order_id
            JOIN users u ON u.id = o.user_id
            ORDER BY d.assigned_at DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch deliveries' });
    }
});

// ── Agent: login ──────────────────────────────────────────────────────────────

router.post('/agent/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        if (!phone || !password) return res.status(400).json({ message: 'phone and password required' });
        const { rows: [agent] } = await db.query(
            'SELECT * FROM delivery_agents WHERE phone=$1 AND is_active=1', [phone]
        );
        if (!agent || !bcrypt.compareSync(password, agent.password)) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign(
            { agent_id: agent.id, name: agent.name, phone: agent.phone },
            JWT_SECRET, { expiresIn: '12h' }
        );
        res.json({ token, agent: { id: agent.id, name: agent.name, phone: agent.phone } });
    } catch (err) {
        console.error('Agent login error:', err.message);
        res.status(500).json({ message: 'Login failed' });
    }
});

// ── Agent: push GPS location ──────────────────────────────────────────────────

router.post('/agent/location', verifyAgent, async (req, res) => {
    try {
        const { lat, lng } = req.body;
        if (lat == null || lng == null) return res.status(400).json({ message: 'lat and lng required' });
        await db.query(
            'UPDATE delivery_agents SET current_lat=$1, current_lng=$2, last_seen=NOW() WHERE id=$3',
            [lat, lng, req.agent.agent_id]
        );
        await db.query(
            `UPDATE deliveries SET agent_lat=$1, agent_lng=$2
             WHERE agent_id=$3 AND status NOT IN ('delivered','rto_initiated')`,
            [lat, lng, req.agent.agent_id]
        );
        res.json({ ok: true });
    } catch (err) {
        console.error('Location update error:', err.message);
        res.status(500).json({ message: 'Failed to update location' });
    }
});

// ── Agent: get assigned deliveries ───────────────────────────────────────────

router.get('/agent/orders', verifyAgent, async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT d.id, d.status, d.tracking_token, d.assigned_at,
                d.estimated_delivery, d.delivery_attempts, d.max_attempts,
                d.otp_verified,
                CASE WHEN d.delivery_otp IS NOT NULL THEN TRUE ELSE FALSE END AS otp_required,
                o.id AS order_id, o.address, o.phone AS customer_phone, o.total,
                u.name AS customer_name,
                STRING_AGG(p.name || ' x' || oi.quantity, ', ') AS items
            FROM deliveries d
            JOIN orders o ON o.id = d.order_id
            JOIN users u ON u.id = o.user_id
            LEFT JOIN order_items oi ON oi.order_id = o.id
            LEFT JOIN products p ON p.id = oi.product_id
            WHERE d.agent_id=$1
              AND d.status NOT IN ('delivered','rto_initiated')
            GROUP BY d.id, o.id, o.address, o.phone, o.total, u.name
            ORDER BY d.assigned_at DESC
        `, [req.agent.agent_id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch deliveries' });
    }
});

// ── Agent: update delivery status (Flipkart/Amazon style) ────────────────────

router.patch('/:id/status', verifyAgent, async (req, res) => {
    try {
        const { status, lat, lng, failed_reason, delivery_notes } = req.body;

        if (!AGENT_STATUSES.includes(status)) {
            return res.status(400).json({
                message: `Invalid status. Valid: ${AGENT_STATUSES.join(', ')}`,
            });
        }

        const { rows: [d] } = await db.query(
            'SELECT * FROM deliveries WHERE id=$1 AND agent_id=$2',
            [req.params.id, req.agent.agent_id]
        );
        if (!d) return res.status(404).json({ message: 'Delivery not found' });

        // Delivery_attempted: log the attempt and check max
        if (status === 'delivery_attempted') {
            if (!failed_reason) return res.status(400).json({ message: 'failed_reason is required for delivery_attempted' });

            const newAttempts = (d.delivery_attempts || 0) + 1;
            const willRTO     = newAttempts >= (d.max_attempts || 3);

            await db.query(
                `UPDATE deliveries SET status=$1, delivery_attempts=$2, failed_reason=$3,
                  agent_lat=COALESCE($4, agent_lat), agent_lng=COALESCE($5, agent_lng)
                 WHERE id=$6`,
                [willRTO ? 'rto_initiated' : 'delivery_attempted', newAttempts, failed_reason, lat || null, lng || null, d.id]
            );

            const orderStatus = willRTO ? 'Returning to Origin' : 'Delivery Attempted';
            await db.query('UPDATE orders SET status=$1 WHERE id=$2', [orderStatus, d.order_id]);

            return res.json({
                message: willRTO
                    ? `Max attempts reached. Package returning to origin.`
                    : `Attempt ${newAttempts} of ${d.max_attempts} recorded`,
                attempts_used:      newAttempts,
                attempts_remaining: Math.max(0, (d.max_attempts || 3) - newAttempts),
                rto:                willRTO,
            });
        }

        // OTP verification required for delivered status (if otp was generated)
        if (status === 'delivered' && d.delivery_otp && !d.otp_verified) {
            return res.status(400).json({
                message: 'Delivery OTP required. Use POST /api/delivery/:id/verify-otp first.',
                otp_required: true,
            });
        }

        const setDelivered = status === 'delivered';
        if (setDelivered) {
            await db.query(
                `UPDATE deliveries SET status=$1, delivered_at=NOW(),
                  delivery_notes=COALESCE($2, delivery_notes),
                  agent_lat=COALESCE($3, agent_lat), agent_lng=COALESCE($4, agent_lng)
                 WHERE id=$5`,
                [status, delivery_notes || null, lat || null, lng || null, d.id]
            );
        } else {
            await db.query(
                `UPDATE deliveries SET status=$1,
                  delivery_notes=COALESCE($2, delivery_notes),
                  agent_lat=COALESCE($3, agent_lat), agent_lng=COALESCE($4, agent_lng)
                 WHERE id=$5`,
                [status, delivery_notes || null, lat || null, lng || null, d.id]
            );
        }

        if (ORDER_STATUS_MAP[status]) {
            await db.query('UPDATE orders SET status=$1 WHERE id=$2', [ORDER_STATUS_MAP[status], d.order_id]);
        }

        res.json({ message: `Status updated to: ${status}` });
    } catch (err) {
        console.error('Update delivery status error:', err.message);
        res.status(500).json({ message: 'Failed to update status' });
    }
});

// ── Agent: verify delivery OTP (agent enters OTP given by customer) ───────────

router.post('/:id/verify-otp', verifyAgent, async (req, res) => {
    try {
        const { otp } = req.body;
        if (!otp) return res.status(400).json({ message: 'otp is required' });

        const { rows: [d] } = await db.query(
            'SELECT * FROM deliveries WHERE id=$1 AND agent_id=$2',
            [req.params.id, req.agent.agent_id]
        );
        if (!d) return res.status(404).json({ message: 'Delivery not found' });
        if (!d.delivery_otp) return res.json({ verified: true, message: 'No OTP required for this order' });
        if (d.otp_verified) return res.json({ verified: true, message: 'OTP already verified' });

        if (String(otp).trim() !== String(d.delivery_otp).trim()) {
            return res.status(401).json({ verified: false, message: 'Incorrect OTP' });
        }

        await db.query('UPDATE deliveries SET otp_verified=1 WHERE id=$1', [d.id]);
        res.json({ verified: true, message: 'OTP verified. You can now mark as delivered.' });
    } catch (err) {
        console.error('OTP verify error:', err.message);
        res.status(500).json({ message: 'OTP verification failed' });
    }
});

// ── Customer: public tracking via token ──────────────────────────────────────

router.get('/track/:token', async (req, res) => {
    try {
        const { rows: [row] } = await db.query(`
            SELECT
                d.status, d.agent_lat, d.agent_lng,
                d.assigned_at, d.delivered_at, d.estimated_delivery,
                d.delivery_attempts, d.max_attempts, d.failed_reason,
                d.otp_verified,
                CASE WHEN d.delivery_otp IS NOT NULL THEN TRUE ELSE FALSE END AS otp_required,
                da.name AS agent_name,
                SUBSTRING(da.phone, 1, 4) || '****' AS agent_phone,
                o.address, o.total, o.status AS order_status,
                o.created_at AS order_placed_at
            FROM deliveries d
            JOIN delivery_agents da ON da.id = d.agent_id
            JOIN orders o ON o.id = d.order_id
            WHERE d.tracking_token = $1
        `, [req.params.token]);

        if (!row) return res.status(404).json({ message: 'Tracking information not found' });
        res.json(row);
    } catch (err) {
        console.error('Track error:', err.message);
        res.status(500).json({ message: 'Tracking unavailable' });
    }
});

module.exports = router;
