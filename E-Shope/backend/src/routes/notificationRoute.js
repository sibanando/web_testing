const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// GET /api/notifications
router.get('/', verifyToken, async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT * FROM notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 30
        `, [req.user.id]);
        const unread = rows.filter(n => n.is_read === 0).length;
        res.json({ notifications: rows, unread });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
});

// PUT /api/notifications/read-all
router.put('/read-all', verifyToken, async (req, res) => {
    try {
        await db.query('UPDATE notifications SET is_read=1 WHERE user_id=$1', [req.user.id]);
        res.json({ message: 'All marked as read' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update notifications' });
    }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', verifyToken, async (req, res) => {
    try {
        await db.query(
            'UPDATE notifications SET is_read=1 WHERE id=$1 AND user_id=$2',
            [parseInt(req.params.id), req.user.id]
        );
        res.json({ message: 'Notification marked as read' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update notification' });
    }
});

module.exports = router;
