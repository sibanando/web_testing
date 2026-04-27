const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// All admin routes require a valid JWT AND is_admin flag
const adminGuard = [verifyToken, requireAdmin];

// GET /api/admin/users
router.get('/users', adminGuard, async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT id, name, email, phone, is_admin, is_seller, oauth_provider, created_at FROM users ORDER BY id DESC'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});

// PUT /api/admin/users/:id — edit name, email, role, and optionally reset password
router.put('/users/:id', adminGuard, async (req, res) => {
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
router.delete('/users/:id', adminGuard, async (req, res) => {
    try {
        await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete user' });
    }
});

// PUT /api/admin/products/:id — edit product
router.put('/products/:id', adminGuard, async (req, res) => {
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
router.delete('/products/:id', adminGuard, async (req, res) => {
    try {
        await db.query('DELETE FROM order_items WHERE product_id = $1', [req.params.id]);
        await db.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete product' });
    }
});

// GET /api/admin/orders — all orders with item summaries
router.get('/orders', adminGuard, async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT o.*, u.name as user_name, u.email as user_email,
                STRING_AGG(p.name || ' x' || oi.quantity, ', ') as items_summary
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            GROUP BY o.id, u.name, u.email
            ORDER BY o.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
});

// PUT /api/admin/orders/:id/status — update order status
router.put('/orders/:id/status', adminGuard, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Pending', 'Paid', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        await db.query('UPDATE orders SET status=$1 WHERE id=$2', [status, req.params.id]);
        res.json({ message: 'Order status updated' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update order status' });
    }
});

module.exports = router;
