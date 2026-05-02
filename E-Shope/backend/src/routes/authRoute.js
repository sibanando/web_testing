const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');
const { isConnected, safeGet, safeSet, safeDel } = require('../config/redis');

// In-memory fallback stores (used when Redis is unavailable)
const _otpMemory = new Map();
const _oauthMemory = new Map();

// ── OTP store (Redis-backed, in-memory fallback) ──────────────────────────────

async function storeOtp(phone, otp) {
    const saved = await safeSet(`otp:${phone}`, otp, 300); // 5 min TTL
    if (!saved) _otpMemory.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });
}

async function getAndClearOtp(phone) {
    if (isConnected()) {
        const otp = await safeGet(`otp:${phone}`);
        await safeDel(`otp:${phone}`);
        return otp ? { otp, valid: true } : null;
    }
    const entry = _otpMemory.get(phone);
    _otpMemory.delete(phone);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) return { otp: null, valid: false };
    return { otp: entry.otp, valid: true };
}

// ── OAuth state store (Redis-backed, in-memory fallback) ──────────────────────

function generateOAuthState(frontendUrl, backendUrl) {
    const state = crypto.randomBytes(16).toString('hex');
    const payload = JSON.stringify({ frontendUrl, backendUrl, expiresAt: Date.now() + 10 * 60 * 1000 });
    safeSet(`oauth_state:${state}`, payload, 600).then(saved => {
        if (!saved) _oauthMemory.set(state, JSON.parse(payload));
    });
    return state;
}

async function consumeOAuthState(state) {
    // Try Redis first (works regardless of isConnected — safeGet returns null on failure)
    const raw = await safeGet(`oauth_state:${state}`);
    if (raw) {
        await safeDel(`oauth_state:${state}`);
        const data = JSON.parse(raw);
        if (Date.now() > data.expiresAt) return null;
        return { frontendUrl: data.frontendUrl, backendUrl: data.backendUrl };
    }

    // Fall back to in-memory (handles case where Redis was unavailable during generate)
    const stored = _oauthMemory.get(state);
    _oauthMemory.delete(state);
    if (!stored || Date.now() > stored.expiresAt) return null;
    return { frontendUrl: stored.frontendUrl, backendUrl: stored.backendUrl };
}

function deriveFrontendUrl(_req) {
    if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL.replace(/\/$/, '');
    console.warn('[OAuth] FRONTEND_URL not set — using localhost fallback for OAuth redirects');
    return 'http://localhost:5555';
}

function deriveBackendUrl(_req) {
    if (process.env.BACKEND_URL) return process.env.BACKEND_URL.replace(/\/$/, '');
    console.warn('[OAuth] BACKEND_URL not set — using localhost fallback for OAuth callbacks');
    return 'http://localhost:5000';
}

async function findOrCreateOAuthUser(email, name, provider, providerId) {
    let user = (await db.query(
        'SELECT * FROM users WHERE oauth_provider = $1 AND oauth_id = $2',
        [provider, providerId]
    )).rows[0];

    if (!user && email) {
        user = (await db.query('SELECT * FROM users WHERE email = $1', [email])).rows[0];
        if (user) {
            await db.query(
                'UPDATE users SET oauth_provider = $1, oauth_id = $2 WHERE id = $3',
                [provider, providerId, user.id]
            );
            user.oauth_provider = provider;
            user.oauth_id = providerId;
        }
    }

    if (!user) {
        const { rows } = await db.query(
            'INSERT INTO users (name, email, oauth_provider, oauth_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [name || 'User', email, provider, providerId]
        );
        user = rows[0];
    }

    return user;
}

function generateOtp() {
    return String(crypto.randomInt(100000, 999999));
}

async function sendVisFast2SMS(phone, otp) {
    const apiKey = process.env.FAST2SMS_API_KEY;
    if (!apiKey) return false;
    try {
        const otpRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
            method: 'POST',
            headers: { authorization: apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ variables_values: otp, route: 'otp', numbers: phone }),
        });
        const otpData = await otpRes.json();
        if (otpData.return === true) {
            console.log(`[Fast2SMS] OTP dispatched via OTP route to +91${phone}`);
            return true;
        }

        const qRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
            method: 'POST',
            headers: { authorization: apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                route: 'q',
                message: `Your ApniDunia OTP is ${otp}. Valid for 5 minutes. Do not share with anyone.`,
                language: 'english',
                flash: 0,
                numbers: phone,
            }),
        });
        const qData = await qRes.json();
        if (qData.return === true) {
            console.log(`[Fast2SMS] OTP dispatched via Quick SMS to +91${phone}`);
            return true;
        }

        console.error('[Fast2SMS] Both routes failed:', JSON.stringify(qData.message));
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
    return {
        id: user.id, name: user.name, email: user.email,
        phone: user.phone || null,
        is_admin: user.is_admin || 0, is_seller: user.is_seller || 0,
        oauth_provider: user.oauth_provider || null,
    };
}

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone || !/^\d{10}$/.test(phone)) {
            return res.status(400).json({ message: 'Valid 10-digit mobile number is required' });
        }

        const otp = generateOtp();
        await storeOtp(phone, otp);

        const smsSent = await sendVisFast2SMS(phone, otp);
        if (!smsSent) {
            console.log(`\n==============================`);
            console.log(`[OTP] +91${phone}  =>  ${otp}`);
            console.log(`==============================\n`);
        }

        res.json({
            message: 'OTP sent successfully',
            via: smsSent ? 'sms' : 'console',
        });
    } catch (err) {
        console.error('Send OTP error:', err.message);
        res.status(500).json({ message: 'Failed to send OTP' });
    }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) {
            return res.status(400).json({ message: 'Phone and OTP are required' });
        }

        const result = await getAndClearOtp(phone);
        if (!result) {
            return res.status(401).json({ message: 'OTP not found. Please request a new one' });
        }
        if (!result.valid) {
            return res.status(401).json({ message: 'OTP has expired. Please request a new one' });
        }
        if (result.otp !== otp) {
            return res.status(401).json({ message: 'Invalid OTP. Please request a new one' });
        }

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
        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters' });
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

// PUT /api/auth/profile/:id
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

// ── Google OAuth ──────────────────────────────────────────────────────────────

router.get('/google', (req, res) => {
    const frontendUrl = deriveFrontendUrl(req);
    const backendUrl = deriveBackendUrl(req);
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.redirect(`${frontendUrl}/login?oauth_error=google_not_configured`);
    }
    const state = generateOAuthState(frontendUrl, backendUrl);
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: `${backendUrl}/api/auth/google/callback`,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        access_type: 'online',
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get('/google/callback', async (req, res) => {
    const { code, state, error } = req.query;
    const stateData = await consumeOAuthState(state);
    const frontendUrl = stateData?.frontendUrl || deriveFrontendUrl(req);
    const backendUrl = stateData?.backendUrl || deriveBackendUrl(req);

    if (error || !code) return res.redirect(`${frontendUrl}/login?oauth_error=google_cancelled`);
    if (!stateData) return res.redirect(`${frontendUrl}/login?oauth_error=invalid_state`);

    try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: `${backendUrl}/api/auth/google/callback`,
                grant_type: 'authorization_code',
            }),
        });
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) {
            console.error('[Google OAuth] Token exchange failed:', JSON.stringify(tokenData));
            return res.redirect(`${frontendUrl}/login?oauth_error=google_failed`);
        }

        const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const gUser = await infoRes.json();
        if (!gUser.email) return res.redirect(`${frontendUrl}/login?oauth_error=google_no_email`);

        const user = await findOrCreateOAuthUser(gUser.email, gUser.name, 'google', gUser.sub);
        const jwtToken = makeToken(user);
        const userJson = encodeURIComponent(JSON.stringify(sanitizeUser(user)));
        res.redirect(`${frontendUrl}/auth/callback?token=${encodeURIComponent(jwtToken)}&user=${userJson}`);
    } catch (err) {
        console.error('[Google OAuth] Error:', err.message);
        res.redirect(`${frontendUrl}/login?oauth_error=google_failed`);
    }
});

// ── Microsoft OAuth ───────────────────────────────────────────────────────────

router.get('/microsoft', (req, res) => {
    const frontendUrl = deriveFrontendUrl(req);
    const backendUrl = deriveBackendUrl(req);
    if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
        return res.redirect(`${frontendUrl}/login?oauth_error=microsoft_not_configured`);
    }
    const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
    const state = generateOAuthState(frontendUrl, backendUrl);
    const params = new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID,
        redirect_uri: `${backendUrl}/api/auth/microsoft/callback`,
        response_type: 'code',
        scope: 'openid email profile User.Read',
        state,
        response_mode: 'query',
    });
    res.redirect(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`);
});

router.get('/microsoft/callback', async (req, res) => {
    const { code, state, error } = req.query;
    const stateData = await consumeOAuthState(state);
    const frontendUrl = stateData?.frontendUrl || deriveFrontendUrl(req);
    const backendUrl = stateData?.backendUrl || deriveBackendUrl(req);

    if (error || !code) return res.redirect(`${frontendUrl}/login?oauth_error=microsoft_cancelled`);
    if (!stateData) return res.redirect(`${frontendUrl}/login?oauth_error=invalid_state`);

    try {
        const tenantId = process.env.MICROSOFT_TENANT_ID || 'common';
        const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.MICROSOFT_CLIENT_ID,
                client_secret: process.env.MICROSOFT_CLIENT_SECRET,
                redirect_uri: `${backendUrl}/api/auth/microsoft/callback`,
                grant_type: 'authorization_code',
                scope: 'openid email profile User.Read',
            }),
        });
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) {
            console.error('[Microsoft OAuth] Token exchange failed:', JSON.stringify(tokenData));
            return res.redirect(`${frontendUrl}/login?oauth_error=microsoft_failed`);
        }

        const infoRes = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const msUser = await infoRes.json();
        const email = msUser.mail || msUser.userPrincipalName;
        if (!email) return res.redirect(`${frontendUrl}/login?oauth_error=microsoft_no_email`);

        const user = await findOrCreateOAuthUser(email, msUser.displayName, 'microsoft', msUser.id);
        const jwtToken = makeToken(user);
        const userJson = encodeURIComponent(JSON.stringify(sanitizeUser(user)));
        res.redirect(`${frontendUrl}/auth/callback?token=${encodeURIComponent(jwtToken)}&user=${userJson}`);
    } catch (err) {
        console.error('[Microsoft OAuth] Error:', err.message);
        res.redirect(`${frontendUrl}/login?oauth_error=microsoft_failed`);
    }
});

module.exports = router;
