const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { getLoyaltyBalance, getTier, addLoyaltyPoints, createNotification } = require('../utils/crm');

// GET /api/loyalty
router.get('/', verifyToken, async (req, res) => {
    try {
        const balance = await getLoyaltyBalance(req.user.id);
        const tier = getTier(balance);

        const { rows: history } = await db.query(`
            SELECT * FROM loyalty_ledger
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 20
        `, [req.user.id]);

        res.json({ balance, tier, history });
    } catch (err) {
        console.error('Loyalty fetch error:', err.message);
        res.status(500).json({ message: 'Failed to fetch loyalty data' });
    }
});

// GET /api/loyalty/admin/overview — admin: leaderboard + summary
router.get('/admin/overview', [verifyToken, requireAdmin], async (req, res) => {
    try {
        const { rows: leaderboard } = await db.query(`
            SELECT u.id, u.name, u.email,
                   COALESCE(SUM(ll.points),0)::int as total_points
            FROM users u
            LEFT JOIN loyalty_ledger ll ON ll.user_id = u.id
            WHERE u.is_admin = 0
            GROUP BY u.id
            ORDER BY total_points DESC
            LIMIT 20
        `);

        const { rows: tierStats } = await db.query(`
            SELECT
                COUNT(*) FILTER (WHERE pts >= 10000) as platinum,
                COUNT(*) FILTER (WHERE pts >= 5000 AND pts < 10000) as gold,
                COUNT(*) FILTER (WHERE pts >= 1000 AND pts < 5000) as silver,
                COUNT(*) FILTER (WHERE pts < 1000) as bronze
            FROM (
                SELECT user_id, COALESCE(SUM(points),0) as pts
                FROM loyalty_ledger GROUP BY user_id
            ) t
        `);

        const { rows: summary } = await db.query(`
            SELECT
                COALESCE(SUM(points) FILTER (WHERE points > 0), 0)::int as total_earned,
                COALESCE(SUM(ABS(points)) FILTER (WHERE points < 0), 0)::int as total_redeemed,
                COUNT(DISTINCT user_id)::int as active_members
            FROM loyalty_ledger
        `);

        res.json({ leaderboard, tierStats: tierStats[0], summary: summary[0] });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch loyalty overview' });
    }
});

// POST /api/loyalty/admin/adjust — manual points adjustment
router.post('/admin/adjust', [verifyToken, requireAdmin], async (req, res) => {
    try {
        const { user_id, points, note } = req.body;
        if (!user_id || !points) return res.status(400).json({ message: 'user_id and points required' });

        const pts = parseInt(points);
        await addLoyaltyPoints(user_id, pts, 'admin_adjust', null, note || 'Admin adjustment');

        await createNotification(
            user_id, 'points_earned',
            pts > 0 ? `${pts} bonus points added!` : `${Math.abs(pts)} points adjusted`,
            note || 'Your loyalty points have been adjusted by admin.',
            '/profile?tab=loyalty'
        );

        res.json({ message: `${pts} points applied to user ${user_id}` });
    } catch (err) {
        res.status(500).json({ message: 'Failed to adjust points' });
    }
});

module.exports = router;
