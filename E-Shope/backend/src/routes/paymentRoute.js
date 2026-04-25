const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

// In-memory payment session store (demo only)
const paymentSessions = new Map();

// POST /api/payment/upi-qr  — generate UPI deep-link for QR code
router.post('/upi-qr', verifyToken, (req, res) => {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ message: 'Amount is required' });

    const upiId = 'sibanando.nayak@ybl';
    const merchantName = 'ApniDunia';
    const paymentId = 'PAY-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const transactionNote = `Order payment of Rs ${amount}`;
    const qrString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;

    // Store payment session — status goes pending → processing → success
    paymentSessions.set(paymentId, {
        amount,
        status: 'pending',
        createdAt: Date.now(),
        method: 'UPI',
        transactionId: `TXN${Date.now()}`,
    });

    // Demo: simulate payment being received after 8-15s (as if user scanned & paid)
    // ~20% chance of failure to test both paths
    const willFail = Math.random() < 0.2;
    const scanDelay = 8000 + Math.floor(Math.random() * 7000);
    setTimeout(() => {
        const session = paymentSessions.get(paymentId);
        if (session && session.status === 'pending') {
            session.status = 'processing';
            // Bank verification takes another 2-3s
            setTimeout(() => {
                if (session.status === 'processing') {
                    if (willFail) {
                        session.status = 'failed';
                        session.message = 'Payment declined by bank. Please try again.';
                    } else {
                        session.status = 'success';
                        session.verifiedAt = new Date().toISOString();
                    }
                }
            }, 2000 + Math.floor(Math.random() * 1000));
        }
    }, scanDelay);

    // Auto-expire after 10 minutes
    setTimeout(() => paymentSessions.delete(paymentId), 10 * 60 * 1000);

    res.json({
        qrString,
        upiId,
        amount,
        merchantName,
        paymentId
    });
});

// POST /api/payment/confirm  — user clicks "I've Paid", start verification
router.post('/confirm', verifyToken, (req, res) => {
    const { paymentId } = req.body;
    const session = paymentSessions.get(paymentId);
    if (!session) return res.status(404).json({ status: 'expired', message: 'Payment session expired or not found' });

    // Move to processing state — simulate bank verification taking a few seconds
    session.status = 'processing';
    session.transactionId = `TXN${Date.now()}`;

    // Simulate async bank verification (2-4s delay, then success)
    const delay = 2000 + Math.floor(Math.random() * 2000);
    setTimeout(() => {
        if (session.status === 'processing') {
            session.status = 'success';
            session.verifiedAt = new Date().toISOString();
        }
    }, delay);

    res.json({ status: 'processing', message: 'Verifying payment with bank...' });
});

// GET /api/payment/status/:paymentId  — poll payment status
router.get('/status/:paymentId', verifyToken, (req, res) => {
    const session = paymentSessions.get(req.params.paymentId);
    if (!session) {
        return res.json({ status: 'expired', message: 'Payment session expired' });
    }

    const response = {
        status: session.status,
        amount: session.amount,
        method: session.method,
    };

    if (session.status === 'success') {
        response.transactionId = session.transactionId;
        response.verifiedAt = session.verifiedAt;
        setTimeout(() => paymentSessions.delete(req.params.paymentId), 60000);
    } else if (session.status === 'failed') {
        response.message = session.message || 'Payment failed';
        setTimeout(() => paymentSessions.delete(req.params.paymentId), 60000);
    }

    res.json(response);
});

// POST /api/payment/verify  — legacy direct verify (kept for PhonePe/GPay)
router.post('/verify', verifyToken, (req, res) => {
    const { transactionId, amount, method } = req.body;

    setTimeout(() => {
        res.json({
            status: 'success',
            transactionId: transactionId || `TXN${Date.now()}`,
            amount,
            method: method || 'UPI',
            timestamp: new Date().toISOString()
        });
    }, 1500);
});

// POST /api/payment/phonepe  — PhonePe deep-link
router.post('/phonepe', verifyToken, (req, res) => {
    const { amount, phone } = req.body;
    setTimeout(() => {
        res.json({
            status: 'success',
            transactionId: 'PH-' + Date.now(),
            method: 'PhonePe',
            deepLink: `phonepe://pay?pa=sibanando.nayak@ybl&pn=ApniDunia&am=${amount}&cu=INR`
        });
    }, 1500);
});

// POST /api/payment/gpay  — Google Pay deep-link
router.post('/gpay', verifyToken, (req, res) => {
    const { amount } = req.body;
    setTimeout(() => {
        res.json({
            status: 'success',
            transactionId: 'GP-' + Date.now(),
            method: 'GPay',
            deepLink: `tez://upi/pay?pa=sibanando.nayak@ybl&pn=ApniDunia&am=${amount}&cu=INR`
        });
    }, 1500);
});

module.exports = router;
