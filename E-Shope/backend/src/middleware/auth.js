const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'apnidunia_secret_2024';

const verifyToken = (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer '))
        return res.status(401).json({ message: 'Unauthorized' });
    try {
        req.user = jwt.verify(auth.slice(7), JWT_SECRET);
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
