const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'apnidunia_secret_2024';

// Middleware: verify JWT and require is_seller
const verifySeller = (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer '))
        return res.status(401).json({ message: 'Unauthorized' });
    try {
        const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
        if (!decoded.is_seller && !decoded.is_admin)
            return res.status(403).json({ message: 'Seller access required' });
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// GET /api/seller/products — seller's own products
router.get('/products', verifySeller, async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT * FROM products WHERE seller_id = $1 ORDER BY id DESC',
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/seller/products — create product for this seller
router.post('/products', verifySeller, async (req, res) => {
    try {
        const { name, price, description, category, images, discount, stock } = req.body;
        if (!name || !price) return res.status(400).json({ message: 'Name and price required' });

        const imgStr = typeof images === 'string' ? images : JSON.stringify(images || []);
        const { rows } = await db.query(
            `INSERT INTO products (name, price, description, category, images, discount, stock, seller_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [name, parseFloat(price), description || '', category || 'General', imgStr,
             parseInt(discount) || 0, parseInt(stock) || 100, req.user.id]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Seller create product error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/seller/products/:id — edit own product
router.put('/products/:id', verifySeller, async (req, res) => {
    try {
        const { id } = req.params;
        const existing = (await db.query('SELECT * FROM products WHERE id = $1', [id])).rows[0];
        if (!existing) return res.status(404).json({ message: 'Product not found' });
        if (existing.seller_id !== req.user.id)
            return res.status(403).json({ message: 'You can only edit your own products' });

        const { name, price, description, category, images, discount, stock } = req.body;
        if (!name || !price) return res.status(400).json({ message: 'Name and price required' });

        await db.query(
            `UPDATE products SET name=$1, price=$2, description=$3, category=$4,
             images=$5, discount=$6, stock=$7 WHERE id=$8`,
            [name, parseFloat(price), description, category,
             typeof images === 'string' ? images : JSON.stringify(images || []),
             parseInt(discount) || 0, parseInt(stock) || 0, id]
        );
        res.json({ message: 'Product updated successfully' });
    } catch (err) {
        console.error('Seller update product error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/seller/products/:id — delete own product
router.delete('/products/:id', verifySeller, async (req, res) => {
    try {
        const { id } = req.params;
        const existing = (await db.query('SELECT * FROM products WHERE id = $1', [id])).rows[0];
        if (!existing) return res.status(404).json({ message: 'Product not found' });
        if (existing.seller_id !== req.user.id)
            return res.status(403).json({ message: 'You can only delete your own products' });

        await db.query('DELETE FROM products WHERE id = $1', [id]);
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/seller/stats — seller statistics
router.get('/stats', verifySeller, async (req, res) => {
    try {
        const [totalProducts, totalOrders, revenue] = await Promise.all([
            db.query('SELECT COUNT(*) as cnt FROM products WHERE seller_id = $1', [req.user.id]),
            db.query(`
                SELECT COUNT(DISTINCT o.id) as cnt FROM orders o
                JOIN order_items oi ON o.id = oi.order_id
                JOIN products p ON oi.product_id = p.id
                WHERE p.seller_id = $1
            `, [req.user.id]),
            db.query(`
                SELECT COALESCE(SUM(oi.price * oi.quantity), 0) as total FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE p.seller_id = $1
            `, [req.user.id]),
        ]);

        res.json({
            totalProducts: parseInt(totalProducts.rows[0].cnt),
            totalOrders: parseInt(totalOrders.rows[0].cnt),
            revenue: parseFloat(revenue.rows[0].total),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/seller/profile/:id — update seller profile/password
router.put('/profile/:id', verifySeller, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, currentPassword, newPassword } = req.body;
        if (!name || !email) return res.status(400).json({ message: 'Name and email required' });

        const user = (await db.query('SELECT * FROM users WHERE id = $1', [id])).rows[0];
        if (!user) return res.status(404).json({ message: 'User not found' });

        const taken = (await db.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id])).rows[0];
        if (taken) return res.status(409).json({ message: 'Email already in use' });

        if (newPassword && newPassword.trim()) {
            if (!currentPassword || !bcrypt.compareSync(currentPassword, user.password))
                return res.status(401).json({ message: 'Current password is incorrect' });
            const hash = bcrypt.hashSync(newPassword.trim(), 10);
            await db.query('UPDATE users SET name=$1, email=$2, password=$3 WHERE id=$4', [name, email, hash, id]);
        } else {
            await db.query('UPDATE users SET name=$1, email=$2 WHERE id=$3', [name, email, id]);
        }

        res.json({
            message: 'Profile updated',
            user: { id: parseInt(id), name, email, is_seller: user.is_seller || 1, is_admin: user.is_admin || 0 }
        });
    } catch (err) {
        res.status(500).json({ message: 'Update failed' });
    }
});

module.exports = router;
