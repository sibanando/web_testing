const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'apnidunia_secret_2024';

// Middleware: verify JWT token
const verifyToken = (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        req.user = jwt.verify(auth.slice(7), JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// GET /api/admin/users
router.get('/users', verifyToken, async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT id, name, email, is_admin, is_seller, created_at FROM users ORDER BY id DESC'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});

// PUT /api/admin/users/:id — edit name, email, role, and optionally reset password
router.put('/users/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, password, is_seller } = req.body;
        if (!name || !email) {
            return res.status(400).json({ message: 'Name and email are required' });
        }
        const sellerVal = is_seller !== undefined ? (parseInt(is_seller) ? 1 : 0) : undefined;
        if (password && password.trim()) {
            const hash = bcrypt.hashSync(password.trim(), 10);
            if (sellerVal !== undefined) {
                await db.query('UPDATE users SET name=$1, email=$2, password=$3, is_seller=$4 WHERE id=$5', [name, email, hash, sellerVal, id]);
            } else {
                await db.query('UPDATE users SET name=$1, email=$2, password=$3 WHERE id=$4', [name, email, hash, id]);
            }
        } else {
            if (sellerVal !== undefined) {
                await db.query('UPDATE users SET name=$1, email=$2, is_seller=$3 WHERE id=$4', [name, email, sellerVal, id]);
            } else {
                await db.query('UPDATE users SET name=$1, email=$2 WHERE id=$3', [name, email, id]);
            }
        }
        res.json({ message: 'User updated successfully' });
    } catch (err) {
        console.error('Edit user error:', err.message);
        res.status(500).json({ message: 'Failed to update user' });
    }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', verifyToken, async (req, res) => {
    try {
        await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete user' });
    }
});

// PUT /api/admin/products/:id — edit product
router.put('/products/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, description, category, images, discount, stock } = req.body;
        if (!name || !price) {
            return res.status(400).json({ message: 'Name and price are required' });
        }
        await db.query(
            `UPDATE products SET name=$1, price=$2, description=$3, category=$4,
             images=$5, discount=$6, stock=$7 WHERE id=$8`,
            [name, parseFloat(price), description, category,
             images || '[]', parseInt(discount) || 0, parseInt(stock) || 0, id]
        );
        res.json({ message: 'Product updated successfully' });
    } catch (err) {
        console.error('Edit product error:', err.message);
        res.status(500).json({ message: 'Failed to update product' });
    }
});

// DELETE /api/admin/products/:id
router.delete('/products/:id', verifyToken, async (req, res) => {
    try {
        await db.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete product' });
    }
});

module.exports = router;
