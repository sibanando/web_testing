const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const db = require('./src/config/db');
const { initDb } = require('./src/config/db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve uploaded images as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./src/routes/authRoute'));
app.use('/api/products', require('./src/routes/productRoute'));
app.use('/api/orders', require('./src/routes/orderRoute'));
app.use('/api/admin', require('./src/routes/adminRoute'));
app.use('/api/seller', require('./src/routes/sellerRoute'));
app.use('/api/payment', require('./src/routes/paymentRoute'));
app.use('/api/upload', require('./src/routes/uploadRoute'));

// Lightweight liveness/readiness probe — no DB query
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Info endpoint
app.get('/', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT COUNT(*) as cnt FROM products');
        res.json({ status: 'ApniDunia API running', db: 'PostgreSQL', products: parseInt(rows[0].cnt) });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// Start server
const start = async () => {
    try {
        await initDb();
        app.listen(PORT, () => {
            console.log(`ApniDunia API running on http://localhost:${PORT}`);
            console.log('PostgreSQL connected and schema ready');
        });
    } catch (err) {
        console.error('Failed to start server:', err.message);
        process.exit(1);
    }
};

start();
