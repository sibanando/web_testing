const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const storage = require('../config/storage');

const requireSellerOrAdmin = (req, res, next) => {
    if (!req.user.is_seller && !req.user.is_admin) {
        return res.status(403).json({ message: 'Seller or admin access required to upload' });
    }
    next();
};

const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
        cb(null, unique + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(file.mimetype) && allowed.test(path.extname(file.originalname).toLowerCase())) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (jpg, png, gif, webp) are allowed'));
    }
};

// Use memory storage when MinIO is configured (Sharp processes from buffer)
const upload = multer({
    storage: storage.isConfigured() ? multer.memoryStorage() : diskStorage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
});

// POST /api/upload — upload a single product image (sellers and admins only)
router.post('/', verifyToken, requireSellerOrAdmin, upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No image file provided' });

    try {
        if (storage.isConfigured()) {
            // Resize to max 800px wide, convert to webp, upload to MinIO
            const sharp = require('sharp');
            const optimized = await sharp(req.file.buffer)
                .resize({ width: 800, withoutEnlargement: true })
                .webp({ quality: 82 })
                .toBuffer();

            const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}.webp`;
            const url = await storage.uploadBuffer(filename, optimized, 'image/webp');
            return res.json({ url });
        }

        // Fallback: disk storage
        res.json({ url: `/uploads/${req.file.filename}` });
    } catch (err) {
        console.error('[Upload] Error:', err.message);
        res.status(500).json({ message: 'Upload failed' });
    }
});

module.exports = router;
