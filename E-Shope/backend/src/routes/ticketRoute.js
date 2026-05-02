const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { createNotification } = require('../utils/crm');

const VALID_CATEGORIES = ['general', 'order', 'payment', 'return', 'product', 'other'];
const VALID_STATUSES   = ['open', 'in_progress', 'resolved', 'closed'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

// GET /api/tickets — user's tickets
router.get('/', verifyToken, async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT st.*,
                   COUNT(tm.id)::int      as message_count,
                   MAX(tm.created_at)     as last_message_at
            FROM support_tickets st
            LEFT JOIN ticket_messages tm ON tm.ticket_id = st.id
            WHERE st.user_id = $1
            GROUP BY st.id
            ORDER BY st.updated_at DESC
        `, [req.user.id]);
        res.json(rows);
    } catch (err) {
        console.error('Ticket list error:', err.message);
        res.status(500).json({ message: 'Failed to fetch tickets' });
    }
});

// POST /api/tickets — create ticket
router.post('/', verifyToken, async (req, res) => {
    try {
        const { subject, category, message, order_id } = req.body;
        if (!subject?.trim() || !message?.trim())
            return res.status(400).json({ message: 'Subject and message are required' });

        const cat = VALID_CATEGORIES.includes(category) ? category : 'general';

        const { rows } = await db.query(`
            INSERT INTO support_tickets (user_id, order_id, subject, category)
            VALUES ($1,$2,$3,$4) RETURNING *
        `, [req.user.id, order_id || null, subject.trim(), cat]);

        await db.query(
            'INSERT INTO ticket_messages (ticket_id, sender_id, is_admin, body) VALUES ($1,$2,0,$3)',
            [rows[0].id, req.user.id, message.trim()]
        );

        await createNotification(
            req.user.id, 'ticket_created',
            'Support ticket created',
            `Ticket #${rows[0].id} has been received. We'll respond within 24 hours.`,
            '/profile?tab=tickets'
        );

        res.status(201).json({ ticket: rows[0], message: 'Ticket created' });
    } catch (err) {
        console.error('Ticket create error:', err.message);
        res.status(500).json({ message: 'Failed to create ticket' });
    }
});

// GET /api/tickets/:id — ticket + messages
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const ticketId = parseInt(req.params.id);
        const { rows: tickets } = await db.query(
            'SELECT * FROM support_tickets WHERE id = $1', [ticketId]
        );
        if (!tickets.length) return res.status(404).json({ message: 'Ticket not found' });

        const ticket = tickets[0];
        if (ticket.user_id !== req.user.id && !req.user.is_admin)
            return res.status(403).json({ message: 'Access denied' });

        const { rows: messages } = await db.query(`
            SELECT tm.*, u.name as sender_name
            FROM ticket_messages tm
            JOIN users u ON u.id = tm.sender_id
            WHERE tm.ticket_id = $1
            ORDER BY tm.created_at ASC
        `, [ticketId]);

        res.json({ ticket, messages });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch ticket' });
    }
});

// POST /api/tickets/:id/messages — reply
router.post('/:id/messages', verifyToken, async (req, res) => {
    try {
        const ticketId = parseInt(req.params.id);
        const { body } = req.body;
        if (!body?.trim()) return res.status(400).json({ message: 'Message body required' });

        const { rows: tickets } = await db.query(
            'SELECT * FROM support_tickets WHERE id = $1', [ticketId]
        );
        if (!tickets.length) return res.status(404).json({ message: 'Ticket not found' });

        const ticket = tickets[0];
        const isAdmin = req.user.is_admin === 1;

        if (ticket.user_id !== req.user.id && !isAdmin)
            return res.status(403).json({ message: 'Access denied' });
        if (ticket.status === 'closed')
            return res.status(400).json({ message: 'Ticket is closed' });

        await db.query(
            'INSERT INTO ticket_messages (ticket_id, sender_id, is_admin, body) VALUES ($1,$2,$3,$4)',
            [ticketId, req.user.id, isAdmin ? 1 : 0, body.trim()]
        );

        const newStatus = isAdmin ? 'in_progress' : ticket.status;
        await db.query(
            'UPDATE support_tickets SET status=$1, updated_at=NOW() WHERE id=$2',
            [newStatus, ticketId]
        );

        if (isAdmin) {
            await createNotification(
                ticket.user_id, 'ticket_reply',
                'Support team replied',
                `New reply on ticket #${ticketId}: ${ticket.subject}`,
                '/profile?tab=tickets'
            );
        }

        res.json({ message: 'Message sent' });
    } catch (err) {
        console.error('Ticket message error:', err.message);
        res.status(500).json({ message: 'Failed to send message' });
    }
});

// ── Admin-only routes ────────────────────────────────────────────────────────
const adminGuard = [verifyToken, requireAdmin];

// GET /api/tickets/admin/all
router.get('/admin/all', adminGuard, async (req, res) => {
    try {
        const { status, priority } = req.query;
        const params = [];
        let where = '';
        if (status && VALID_STATUSES.includes(status)) {
            params.push(status); where += ` AND st.status=$${params.length}`;
        }
        if (priority && VALID_PRIORITIES.includes(priority)) {
            params.push(priority); where += ` AND st.priority=$${params.length}`;
        }

        const { rows } = await db.query(`
            SELECT st.*, u.name as user_name, u.email as user_email,
                   COUNT(tm.id)::int as message_count,
                   MAX(tm.created_at) as last_message_at
            FROM support_tickets st
            JOIN users u ON u.id = st.user_id
            LEFT JOIN ticket_messages tm ON tm.ticket_id = st.id
            WHERE 1=1 ${where}
            GROUP BY st.id, u.name, u.email
            ORDER BY
                CASE st.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
                st.updated_at DESC
        `, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch tickets' });
    }
});

// PUT /api/tickets/admin/:id
router.put('/admin/:id', adminGuard, async (req, res) => {
    try {
        const { status, priority } = req.body;
        if (status && !VALID_STATUSES.includes(status))
            return res.status(400).json({ message: 'Invalid status' });
        if (priority && !VALID_PRIORITIES.includes(priority))
            return res.status(400).json({ message: 'Invalid priority' });

        const { rows } = await db.query(
            `UPDATE support_tickets
             SET status=COALESCE($1,status), priority=COALESCE($2,priority), updated_at=NOW()
             WHERE id=$3 RETURNING *`,
            [status || null, priority || null, parseInt(req.params.id)]
        );
        if (!rows.length) return res.status(404).json({ message: 'Ticket not found' });

        if (status === 'resolved') {
            await createNotification(
                rows[0].user_id, 'ticket_resolved',
                'Support ticket resolved',
                `Ticket #${rows[0].id} has been resolved. Rate your experience!`,
                '/profile?tab=tickets'
            );
        }

        res.json({ message: 'Ticket updated', ticket: rows[0] });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update ticket' });
    }
});

module.exports = router;
