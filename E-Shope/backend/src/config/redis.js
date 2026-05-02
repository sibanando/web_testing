const Redis = require('ioredis');

let redisClient = null;
let _connected = false;

const REDIS_URL = process.env.REDIS_URL;

if (REDIS_URL) {
    redisClient = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        enableOfflineQueue: true,  // queue commands during initial connect
        connectTimeout: 5000,
        retryStrategy: (times) => (times > 20 ? null : Math.min(times * 200, 3000)),
    });

    redisClient.on('connect', () => {
        _connected = true;
        console.log('[Redis] Connected');
    });

    redisClient.on('error', (err) => {
        _connected = false;
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
            console.warn('[Redis] Not reachable — falling back to in-memory stores');
        } else {
            console.error('[Redis] Error:', err.message);
        }
    });

    redisClient.on('close', () => { _connected = false; });
}

function isConnected() {
    return redisClient !== null && _connected;
}

async function safeGet(key) {
    if (!isConnected()) return null;
    try { return await redisClient.get(key); }
    catch { return null; }
}

async function safeSet(key, value, exSeconds) {
    if (!isConnected()) return false;
    try {
        if (exSeconds) await redisClient.set(key, value, 'EX', exSeconds);
        else await redisClient.set(key, value);
        return true;
    } catch { return false; }
}

async function safeDel(key) {
    if (!isConnected()) return false;
    try { await redisClient.del(key); return true; }
    catch { return false; }
}

// Delete all keys matching a pattern (uses SCAN to avoid blocking)
async function safeDelPattern(pattern) {
    if (!isConnected()) return false;
    try {
        let cursor = '0';
        do {
            const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = nextCursor;
            if (keys.length) await redisClient.del(...keys);
        } while (cursor !== '0');
        return true;
    } catch { return false; }
}

module.exports = { redisClient, isConnected, safeGet, safeSet, safeDel, safeDelPattern };
