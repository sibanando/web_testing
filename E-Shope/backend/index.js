const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

dotenv.config();

// ── Fail fast on insecure defaults in production ─────────────────────────────
if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'apnidunia_secret_2024') {
        console.error('FATAL: JWT_SECRET must be set to a strong secret in production.');
        process.exit(1);
    }
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('password@localhost')) {
        console.error('FATAL: DATABASE_URL must be set in production.');
        process.exit(1);
    }
}

const db = require('./src/config/db');
const { initDb } = require('./src/config/db');
const { initBucket } = require('./src/config/storage');

// Redis is optional — loaded here so it connects early and warms the pool
require('./src/config/redis');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
}));

// ── Request logging ──────────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : null;

app.use(cors({
    origin: (origin, callback) => {
        if (!allowedOrigins) return callback(null, true);
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
}));

// ── Body parsing with size limits ────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Rate limiters (Redis-backed when available, in-memory otherwise) ──────────
function makeRateLimiter(opts) {
    const { redisClient } = require('./src/config/redis');
    let store;
    if (redisClient) {
        try {
            const { RedisStore } = require('rate-limit-redis');
            // ioredis: client.call(command, ...args) — spread the args array
            store = new RedisStore({
                sendCommand: (command, ...args) => redisClient.call(command, ...args),
            });
        } catch (err) {
            console.warn('[RateLimit] Redis store init failed, using in-memory:', err.message);
        }
    }
    return rateLimit({ ...opts, store });
}

const apiLimiter = makeRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again later.' },
});

const authLimiter = makeRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 20 : 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many auth attempts, please try again in 15 minutes.' },
});

const otpLimiter = makeRateLimiter({
    windowMs: 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 3 : 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many OTP requests. Please wait 1 minute.' },
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/send-otp', otpLimiter);
app.use('/api/auth/verify-otp', otpLimiter);

// ── Static uploads (fallback when MinIO is not configured) ────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',     require('./src/routes/authRoute'));
app.use('/api/products', require('./src/routes/productRoute'));
app.use('/api/orders',   require('./src/routes/orderRoute'));
app.use('/api/admin',    require('./src/routes/adminRoute'));
app.use('/api/seller',   require('./src/routes/sellerRoute'));
app.use('/api/payment',  require('./src/routes/paymentRoute'));
app.use('/api/upload',   require('./src/routes/uploadRoute'));
app.use('/api/subscribe',require('./src/routes/subscribeRoute'));
app.use('/api/track',    require('./src/routes/trackRoute'));
app.use('/api/returns',  require('./src/routes/returnRoute'));
app.use('/api/delivery', require('./src/routes/deliveryRoute'));

// ── Health / readiness probes ─────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/ready', async (_req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ status: 'ready', db: 'ok' });
    } catch (err) {
        console.error('DB readiness check error:', err.message);
        res.status(503).json({ status: 'not ready', db: 'unavailable' });
    }
});

// ── Info endpoint ─────────────────────────────────────────────────────────────
app.get('/', async (_req, res) => {
    try {
        const { rows } = await db.query('SELECT COUNT(*) as cnt FROM products');
        res.json({ status: 'ApniDunia API running', db: 'PostgreSQL', products: parseInt(rows[0].cnt) });
    } catch (err) {
        console.error('Info endpoint error:', err.message);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
    if (err.message && err.message.includes('CORS')) {
        return res.status(403).json({ message: 'CORS policy violation' });
    }
    console.error('[Unhandled error]', err.message);
    res.status(500).json({ message: 'Internal server error' });
});

// ── Start server ──────────────────────────────────────────────────────────────
let server;
const start = async () => {
    try {
        await initDb();
        await initBucket(); // no-op when MINIO_ENDPOINT is not set
        server = app.listen(PORT, () => {
            console.log(`ApniDunia API running on http://localhost:${PORT}`);
            console.log('PostgreSQL connected and schema ready');
        });
    } catch (err) {
        console.error('Failed to start server:', err.message);
        process.exit(1);
    }
};

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = (signal) => {
    console.log(`\n${signal} received — shutting down gracefully…`);
    if (server) {
        server.close(() => {
            console.log('HTTP server closed.');
            process.exit(0);
        });
        setTimeout(() => { console.error('Force shutdown.'); process.exit(1); }, 10000);
    } else {
        process.exit(0);
    }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

start();
