// Shared in-memory payment session store (demo only — replace with Redis for production)
const paymentSessions = {
    sessions: new Map(),   // paymentId  → session object (UPI QR flow)
    verified: new Map(),   // transactionId → { amount, method, verifiedAt } (consumed once by orderRoute)
};

module.exports = paymentSessions;
