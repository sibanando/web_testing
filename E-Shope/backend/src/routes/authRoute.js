const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');

// In-memory OTP store: { phone: { otp, expiresAt } }
// For multi-replica deployments replace with Redis (ioredis + TTL).
const otpStore = new Map();

function generateOtp() {
    // crypto.randomInt is cryptographically secure — never use Math.random for OTPs
    return String(crypto.randomInt(100000, 999999));
}

// Sends OTP via Fast2SMS (free Indian SMS gateway). Returns true on success.
async function sendVisFast2SMS(phone, otp) {
    const apiKey = process.env.FAST2SMS_API_KEY;
    if (!apiKey) return false;
    try {
        const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
            method: 'POST',
            headers: { authorization: apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ variables_values: otp, route: 'otp', numbers: phone }),
        });
        const data = await res.json();
        if (data.return === true) {
            console.log(`[Fast2SMS] OTP dispatched to +91${phone}`);
            return true;
        }
        console.error('[Fast2SMS] Delivery failed:', JSON.stringify(data.message));
        return false;
    } catch (err) {
        console.error('[Fast2SMS] Request error:', err.message);
        return false;
    }
}

function makeToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, name: user.name, is_admin: user.is_admin || 0, is_seller: user.is_seller || 0 },
        JWT_SECRET, { expiresIn: '7d' }
    );
}

function sanitizeUser(user) {
    return { id: user.id, name: user.name, email: user.email, phone: user.phone || null, is_admin: user.is_admin || 0, is_seller: user.is_seller || 0 };
}

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone || !/^\d{10}$/.test(phone)) {
            return res.status(400).json({ message: 'Valid 10-digit mobile number is required' });
        }

        const otp = generateOtp();
        otpStore.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

        const smsSent = await sendVisFast2SMS(phone, otp);
        if (!smsSent) {
            // Fallback: visible in server logs (docker compose logs backend)
            console.log(`\n==============================`);
            console.log(`[OTP] +91${phone}  =>  ${otp}`);
            console.log(`==============================\n`);
        }

        res.json({ message: 'OTP sent successfully', via: smsSent ? 'sms' : 'console' });
    } catch (err) {
        console.error('Send OTP error:', err.message);
        res.status(500).json({ message: 'Failed to send OTP' });
    }
});

// POST /api/auth/verify-otp — login or auto-register via phone+OTP
router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) {
            return res.status(400).json({ message: 'Phone and OTP are required' });
        }

        const stored = otpStore.get(phone);
        if (!stored || stored.otp !== otp) {
            return res.status(401).json({ message: 'Invalid OTP' });
        }
        if (Date.now() > stored.expiresAt) {
            otpStore.delete(phone);
            return res.status(401).json({ message: 'OTP has expired. Please request a new one' });
        }
        otpStore.delete(phone);

        // Find or create user by phone
        let user = (await db.query('SELECT * FROM users WHERE phone = $1', [phone])).rows[0];
        if (!user) {
            const { rows } = await db.query(
                'INSERT INTO users (name, phone) VALUES ($1, $2) RETURNING *',
                ['User', phone]
            );
            user = rows[0];
        }

        const token = makeToken(user);
        res.json({ message: 'Login successful', token, user: sanitizeUser(user) });
    } catch (err) {
        console.error('Verify OTP error:', err.message);
        res.status(500).json({ message: 'OTP verification failed' });
    }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password, is_seller = 0 } = req.body;
        if (!name || !password) {
            return res.status(400).json({ message: 'Name and password are required' });
        }
        if (!email && !phone) {
            return res.status(400).json({ message: 'Email or mobile number is required' });
        }

        if (email) {
            const existing = (await db.query('SELECT id FROM users WHERE email = $1', [email])).rows[0];
            if (existing) return res.status(409).json({ message: 'Email already registered' });
        }
        if (phone) {
            const existing = (await db.query('SELECT id FROM users WHERE phone = $1', [phone])).rows[0];
            if (existing) return res.status(409).json({ message: 'Mobile number already registered' });
        }

        const hash = bcrypt.hashSync(password, 10);
        const { rows } = await db.query(
            'INSERT INTO users (name, email, phone, password, is_seller) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, email || null, phone || null, hash, is_seller ? 1 : 0]
        );
        const user = rows[0];

        const token = makeToken(user);
        res.status(201).json({ message: 'Registered successfully', token, user: sanitizeUser(user) });
    } catch (err) {
        console.error('Register error:', err.message);
        res.status(500).json({ message: 'Registration failed' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = (await db.query('SELECT * FROM users WHERE email = $1', [email])).rows[0];
        if (!user || !user.password || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = makeToken(user);
        res.json({ message: 'Login successful', token, user: sanitizeUser(user) });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ message: 'Login failed' });
    }
});

// PUT /api/auth/profile/:id — update name, email, optionally password
// Requires authentication; users can only update their own profile (admins can update any)
router.put('/profile/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const requestedId = parseInt(id);

        if (req.user.id !== requestedId && !req.user.is_admin) {
            return res.status(403).json({ message: 'You can only update your own profile' });
        }

        const { name, email, currentPassword, newPassword } = req.body;
        if (!name || !email) return res.status(400).json({ message: 'Name and email are required' });

        const user = (await db.query('SELECT * FROM users WHERE id = $1', [requestedId])).rows[0];
        if (!user) return res.status(404).json({ message: 'User not found' });

        const emailTaken = (await db.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, requestedId])).rows[0];
        if (emailTaken) return res.status(409).json({ message: 'Email already in use' });

        if (newPassword && newPassword.trim()) {
            if (!currentPassword || !bcrypt.compareSync(currentPassword, user.password)) {
                return res.status(401).json({ message: 'Current password is incorrect' });
            }
            const hash = bcrypt.hashSync(newPassword.trim(), 10);
            await db.query('UPDATE users SET name=$1, email=$2, password=$3 WHERE id=$4', [name, email, hash, requestedId]);
        } else {
            await db.query('UPDATE users SET name=$1, email=$2 WHERE id=$3', [name, email, requestedId]);
        }

        res.json({
            message: 'Profile updated successfully',
            user: { id: requestedId, name, email, is_admin: user.is_admin || 0, is_seller: user.is_seller || 0 }
        });
    } catch (err) {
        console.error('Profile update error:', err.message);
        res.status(500).json({ message: 'Update failed' });
    }
});

module.exports = router;
