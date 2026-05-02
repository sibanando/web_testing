const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// In-memory geo cache: ip → { country, city } with 1h TTL
const geoCache = new Map();

async function getLocation(ip) {
    if (!ip || ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip) ||
        ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
        return { country: 'Local', city: 'Dev' };
    }
    if (geoCache.has(ip)) return geoCache.get(ip);
    try {
        const r = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`, {
            signal: AbortSignal.timeout(2000),
        });
        const d = await r.json();
        const loc = d.status === 'success' ? { country: d.country, city: d.city } : { country: 'Unknown', city: 'Unknown' };
        geoCache.set(ip, loc);
        setTimeout(() => geoCache.delete(ip), 60 * 60 * 1000);
        return loc;
    } catch {
        return { country: 'Unknown', city: 'Unknown' };
    }
}

function getDevice(ua = '') {
    if (/mobile|android|iphone|ipad|ipod/i.test(ua)) return 'mobile';
    if (/tablet/i.test(ua)) return 'tablet';
    return 'desktop';
}

// POST /api/track — fire-and-forget event ingestion (no auth required)
router.post('/', (req, res) => {
    res.json({ ok: true }); // respond immediately

    (async () => {
        try {
            const { event_type, product_id, search_query, session_id, user_id } = req.body;
            if (!event_type) return;

            const raw = req.headers['x-real-ip'] ||
                (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
                req.socket.remoteAddress || '';
            const ip = raw.replace('::ffff:', '');
            const device = getDevice(req.headers['user-agent']);
            const loc = await getLocation(ip);

            await db.query(
                `INSERT INTO user_events
                 (user_id, session_id, event_type, product_id, search_query, ip, country, city, device)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                [user_id || null, session_id || null, event_type,
                 product_id || null, search_query || null,
                 ip, loc.country, loc.city, device]
            );
        } catch (err) {
            console.error('[Track] insert error:', err.message);
        }
    })();
});

// GET /api/track/analytics — admin analytics dashboard data
router.get('/analytics', verifyToken, requireAdmin, async (req, res) => {
    try {
        const [topProducts, locations, funnel, devices, daily, recent] = await Promise.all([
            db.query(`
                SELECT ue.product_id, p.name, p.category, p.price,
                    COUNT(*) FILTER (WHERE ue.event_type = 'product_view') AS views,
                    COUNT(*) FILTER (WHERE ue.event_type = 'add_to_cart')  AS adds_to_cart
                FROM user_events ue
                JOIN products p ON p.id = ue.product_id
                WHERE ue.product_id IS NOT NULL
                  AND ue.created_at > NOW() - INTERVAL '30 days'
                GROUP BY ue.product_id, p.name, p.category, p.price
                ORDER BY views DESC LIMIT 10
            `),
            db.query(`
                SELECT country, city,
                    COUNT(DISTINCT COALESCE(session_id, ip)) AS visitors
                FROM user_events
                WHERE created_at > NOW() - INTERVAL '30 days'
                  AND country NOT IN ('Local','Unknown')
                GROUP BY country, city
                ORDER BY visitors DESC LIMIT 20
            `),
            db.query(`
                SELECT
                    COUNT(*) FILTER (WHERE event_type = 'product_view')   AS product_views,
                    COUNT(*) FILTER (WHERE event_type = 'add_to_cart')    AS add_to_cart,
                    COUNT(*) FILTER (WHERE event_type = 'checkout_start') AS checkout_starts,
                    (SELECT COUNT(*) FROM orders
                     WHERE created_at > NOW() - INTERVAL '30 days')       AS orders
                FROM user_events
                WHERE created_at > NOW() - INTERVAL '30 days'
            `),
            db.query(`
                SELECT device,
                    COUNT(DISTINCT COALESCE(session_id, ip)) AS visitors
                FROM user_events
                WHERE created_at > NOW() - INTERVAL '30 days'
                GROUP BY device
            `),
            db.query(`
                SELECT DATE(created_at) AS date,
                    COUNT(DISTINCT COALESCE(session_id, ip)) AS visitors
                FROM user_events
                WHERE created_at > NOW() - INTERVAL '14 days'
                GROUP BY DATE(created_at)
                ORDER BY date
            `),
            db.query(`
                SELECT ue.event_type, ue.created_at, ue.country, ue.city, ue.device,
                    u.name AS user_name, p.name AS product_name
                FROM user_events ue
                LEFT JOIN users u ON u.id = ue.user_id
                LEFT JOIN products p ON p.id = ue.product_id
                ORDER BY ue.created_at DESC LIMIT 20
            `),
        ]);

        res.json({
            topProducts:    topProducts.rows,
            locations:      locations.rows,
            funnel:         funnel.rows[0],
            devices:        devices.rows,
            dailyVisitors:  daily.rows,
            recentEvents:   recent.rows,
        });
    } catch (err) {
        console.error('[Analytics] error:', err.message);
        res.status(500).json({ message: 'Failed to fetch analytics' });
    }
});

module.exports = router;
