const db = require('../config/db');

const createNotification = async (userId, type, title, body, link = null) => {
    try {
        await db.query(
            'INSERT INTO notifications (user_id, type, title, body, link) VALUES ($1,$2,$3,$4,$5)',
            [userId, type, title, body, link]
        );
    } catch (err) {
        console.error('[CRM] createNotification error:', err.message);
    }
};

const addLoyaltyPoints = async (userId, points, type, referenceId = null, note = null) => {
    try {
        await db.query(
            'INSERT INTO loyalty_ledger (user_id, points, type, reference_id, note) VALUES ($1,$2,$3,$4,$5)',
            [userId, points, type, referenceId, note]
        );
    } catch (err) {
        console.error('[CRM] addLoyaltyPoints error:', err.message);
    }
};

const getLoyaltyBalance = async (userId) => {
    const { rows } = await db.query(
        'SELECT COALESCE(SUM(points), 0) as balance FROM loyalty_ledger WHERE user_id = $1',
        [userId]
    );
    return parseInt(rows[0].balance);
};

const getTier = (points) => {
    if (points >= 10000) return { name: 'Platinum', color: '#7c3aed', bg: '#f5f3ff', min: 10000, next: null };
    if (points >= 5000)  return { name: 'Gold',     color: '#d97706', bg: '#fffbeb', min: 5000,  next: 10000 };
    if (points >= 1000)  return { name: 'Silver',   color: '#64748b', bg: '#f1f5f9', min: 1000,  next: 5000 };
    return                      { name: 'Bronze',   color: '#92400e', bg: '#fef3c7', min: 0,     next: 1000 };
};

module.exports = { createNotification, addLoyaltyPoints, getLoyaltyBalance, getTier };
