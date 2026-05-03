const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'apnidunia_secret_2024';

if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'apnidunia_secret_2024') {
    console.error('FATAL: Default JWT_SECRET in production. Set a strong secret.');
    process.exit(1);
}

const verifyToken = (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer '))
        return res.status(401).json({ message: 'Unauthorized' });
    try {
        const payload = jwt.verify(auth.slice(7), JWT_SECRET);
        if (!payload.id) return res.status(401).json({ message: 'Unauthorized' });
        req.user = payload;
        next();
    } catch {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

const requireAdmin = (req, res, next) => {
    if (!req.user || !req.user.is_admin)
        return res.status(403).json({ message: 'Admin access required' });
    next();
};

module.exports = { verifyToken, requireAdmin, JWT_SECRET };
