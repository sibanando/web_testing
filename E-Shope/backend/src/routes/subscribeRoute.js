const express = require('express');
const router = express.Router();
const db = require('../config/db');

// POST /api/subscribe
router.post('/', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: 'Valid email address is required' });
        }

        const existing = (await db.query('SELECT id FROM subscribers WHERE email = $1', [email])).rows[0];
        if (existing) {
            return res.status(409).json({ message: 'This email is already subscribed', already: true });
        }

        await db.query('INSERT INTO subscribers (email) VALUES ($1)', [email]);
        console.log(`[Subscribe] New subscriber: ${email}`);
        res.status(201).json({ message: 'Subscribed successfully' });
    } catch (err) {
        console.error('Subscribe error:', err.message);
        res.status(500).json({ message: 'Subscription failed, please try again' });
    }
});

module.exports = router;
