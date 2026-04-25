import { useState, useRef, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { MapPin, Phone, Mail, ShieldCheck, CheckCircle, XCircle, Loader, Navigation } from 'lucide-react';
import useResponsive from '../hooks/useResponsive';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix leaflet default marker icons for bundlers
L.Icon.Default.mergeOptions({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});
delete L.Icon.Default.prototype._getIconUrl;

// Flies map to center when coords change (triggered by geocode)
const FlyTo = ({ center }) => {
    const map = useMap();
    useEffect(() => { map.flyTo(center, 16, { duration: 1.2 }); }, [center[0], center[1]]);
    return null;
};

// Fires reverse geocode callback when user finishes panning/zooming
const MapCenterTracker = ({ onMove }) => {
    useMapEvents({ moveend(e) { onMove(e.target.getCenter()); } });
    return null;
};

const Checkout = () => {
    const { items, total, clearCart } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { isMobile } = useResponsive();
    const [method, setMethod] = useState('upi-qr');
    const [loading, setLoading] = useState(false);
    const [qrData, setQrData] = useState(null);
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [orderId, setOrderId] = useState(null);
    const [step, setStep] = useState('form'); // form | qr | processing | success | failed
    const [paymentId, setPaymentId] = useState(null);
    const [failMessage, setFailMessage] = useState('');
    const [verifyProgress, setVerifyProgress] = useState(0);
    const [qrTimeLeft, setQrTimeLeft] = useState(600); // 10 minutes in seconds
    const pollTimer = useRef(null);
    const progressTimer = useRef(null);
    const countdownTimer = useRef(null);
    const [showMap, setShowMap] = useState(false);
    const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]);
    const [locating, setLocating] = useState(false);
    const [locationLabel, setLocationLabel] = useState('');
    const [mapLoading, setMapLoading] = useState(false);
    const geocodeTimer = useRef(null);

    const handleLocate = async () => {
        // Show map immediately — don't block on geocoding
        setShowMap(true);
        setLocating(true);

        // Try progressively shorter queries until one returns a result
        const queries = address.trim()
            ? (() => {
                const parts = address.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
                // Try: full address → last 3 parts (city/state/pin) → last 2 parts → just last part
                return [
                    address + ', India',
                    parts.slice(-3).join(', ') + ', India',
                    parts.slice(-2).join(', ') + ', India',
                    parts.slice(-1)[0] + ', India',
                ].filter((v, i, a) => a.indexOf(v) === i); // dedupe
            })()
            : ['Bangalore, Karnataka, India'];

        for (const q of queries) {
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=in`,
                    { headers: { 'Accept-Language': 'en' } }
                );
                const data = await res.json();
                if (data.length > 0) {
                    const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
                    setMapCenter(coords);
                    setLocationLabel(data[0].display_name);
                    break; // stop at first match
                }
            } catch { /* network error — map still shows */ }
        }

        setLocating(false);
    };

    // Called on map pan/zoom end — reverse geocodes center
    const handleCenterMove = (latlng) => {
        setMapLoading(true);
        if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
        geocodeTimer.current = setTimeout(async () => {
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`,
                    { headers: { 'Accept-Language': 'en' } }
                );
                const data = await res.json();
                if (data.display_name) setLocationLabel(data.display_name);
            } catch { /* ignore */ }
            setMapLoading(false);
        }, 600);
    };

    const discount = Math.round(total * 0.15);
    const deliveryCharge = total > 500 ? 0 : 40;
    const finalTotal = total - discount + deliveryCharge;

    // Cleanup all timers on unmount
    useEffect(() => {
        return () => {
            if (pollTimer.current) clearInterval(pollTimer.current);
            if (progressTimer.current) clearInterval(progressTimer.current);
            if (countdownTimer.current) clearInterval(countdownTimer.current);
        };
    }, []);

    // 10-minute countdown timer — starts when QR is shown, auto-expires
    useEffect(() => {
        if (step === 'qr') {
            setQrTimeLeft(600);
            if (countdownTimer.current) clearInterval(countdownTimer.current);
            countdownTimer.current = setInterval(() => {
                setQrTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownTimer.current);
                        setFailMessage('QR code expired. Please generate a new one.');
                        setStep('failed');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (countdownTimer.current) clearInterval(countdownTimer.current);
        }
        return () => { if (countdownTimer.current) clearInterval(countdownTimer.current); };
    }, [step]);

    // Auto-poll payment status on QR screen — wait for success, then go straight to Order Confirmed
    useEffect(() => {
        if (step !== 'qr' || !paymentId) return;

        if (pollTimer.current) clearInterval(pollTimer.current);
        pollTimer.current = setInterval(async () => {
            try {
                const statusRes = await api.get(`/payment/status/${paymentId}`);
                const { status, transactionId: txnId } = statusRes.data;

                if (status === 'success') {
                    clearInterval(pollTimer.current);
                    clearInterval(countdownTimer.current);
                    // Payment confirmed — create order and go to success
                    try {
                        const orderRes = await api.post('/orders', {
                            userId: user?.id,
                            total: finalTotal,
                            items: items.map(i => ({ id: i.id, quantity: i.quantity, price: i.price })),
                            address,
                            phone,
                            paymentMethod: 'UPI',
                            transactionId: txnId
                        });
                        setOrderId(orderRes.data.orderId);
                        clearCart();
                        setStep('success');
                    } catch {
                        setFailMessage('Payment received but order creation failed. Please contact support.');
                        setStep('failed');
                    }
                } else if (status === 'failed') {
                    clearInterval(pollTimer.current);
                    clearInterval(countdownTimer.current);
                    setFailMessage(statusRes.data.message || 'Payment failed. Please try again.');
                    setStep('failed');
                }
            } catch { /* network error — keep polling */ }
        }, 2000);

        return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
    }, [step, paymentId]);

    const handleGetQR = async () => {
        if (!address.trim()) return alert('Please enter delivery address');
        if (!phone.trim() || phone.length < 10) return alert('Please enter a valid 10-digit phone number');
        setLoading(true);
        try {
            const res = await api.post('/payment/upi-qr', { amount: finalTotal });
            setQrData(res.data);
            setPaymentId(res.data.paymentId);
            setStep('qr');
        } catch (err) {
            alert('Could not generate QR. Please try again.');
        }
        setLoading(false);
    };

    // Manual "I've already paid" — also just polls for success (no separate screen)
    const handlePaymentDone = () => {
        // Already polling — button is just reassurance, no action needed
    };

    const handleDirectPay = async (payMethod) => {
        if (!address.trim()) return alert('Please enter delivery address');
        if (!phone.trim() || phone.length < 10) return alert('Please enter a valid 10-digit phone number');

        setLoading(true);
        setStep('processing');
        try {
            const endpoint = payMethod === 'phonepe' ? '/payment/phonepe' : '/payment/gpay';
            const payRes = await api.post(endpoint, { amount: finalTotal, phone });

            if (payRes.data.status === 'success') {
                const orderRes = await api.post('/orders', {
                    userId: user?.id,
                    total: finalTotal,
                    items: items.map(i => ({ id: i.id, quantity: i.quantity, price: i.price })),
                    address, phone,
                    paymentMethod: payMethod === 'phonepe' ? 'PhonePe' : 'GPay',
                    transactionId: payRes.data.transactionId
                });
                setOrderId(orderRes.data.orderId);
                clearCart();
                setStep('success');
            }
        } catch (err) {
            alert('Payment failed. Please try again.');
            setStep('form');
        }
        setLoading(false);
    };

    // ── Success Screen ────────────────────────────────────────────────────────
    if (step === 'success') {
        return (
            <div style={{ background: '#f1f3f6', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 16px' }}>
                <div style={{ background: 'white', borderRadius: '2px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', padding: '40px', textAlign: 'center', maxWidth: '420px', width: '100%' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <CheckCircle size={48} style={{ color: '#388e3c' }} />
                    </div>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#212121', marginBottom: '8px' }}>Order Confirmed!</h1>
                    <p style={{ color: '#888', fontSize: '13px', marginBottom: '16px' }}>
                        Your order #{orderId} has been placed and payment received.
                    </p>
                    <div style={{ background: '#fafafa', borderRadius: '4px', padding: '16px', textAlign: 'left', marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                            <span style={{ color: '#888' }}>Order Total</span>
                            <span style={{ fontWeight: 700, color: '#212121' }}>₹{finalTotal.toLocaleString('en-IN')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                            <span style={{ color: '#888' }}>You Saved</span>
                            <span style={{ fontWeight: 600, color: '#388e3c' }}>₹{discount.toLocaleString('en-IN')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span style={{ color: '#888' }}>Deliver to</span>
                            <span style={{ fontWeight: 500, color: '#444', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{address}</span>
                        </div>
                    </div>
                    <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '20px' }}>
                        Estimated delivery in 3–5 business days. You'll receive an SMS confirmation.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        style={{ width: '100%', padding: '12px', fontWeight: 700, fontSize: '13px', borderRadius: '2px', background: '#2874f0', color: 'white', border: 'none', cursor: 'pointer' }}
                    >
                        CONTINUE SHOPPING
                    </button>
                </div>
            </div>
        );
    }

    // ── Processing Screen ─────────────────────────────────────────────────────
    if (step === 'processing') {
        return (
            <div style={{ background: '#f1f3f6', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 16px' }}>
                <div style={{ background: 'white', borderRadius: '2px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', padding: '40px', textAlign: 'center', maxWidth: '420px', width: '100%' }}>
                    <Loader size={48} style={{ color: '#2874f0', display: 'block', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
                    <p style={{ fontSize: '17px', fontWeight: 600, color: '#212121' }}>Verifying payment...</p>
                    <p style={{ fontSize: '13px', color: '#888', marginTop: '8px', marginBottom: '20px' }}>Please wait, do not close this window</p>
                    {/* Progress bar */}
                    <div style={{ background: '#e0e0e0', borderRadius: '4px', height: '6px', overflow: 'hidden', marginBottom: '12px' }}>
                        <div style={{
                            width: `${verifyProgress}%`,
                            height: '100%',
                            background: verifyProgress >= 100 ? '#388e3c' : 'linear-gradient(90deg, #2874f0, #6366f1)',
                            borderRadius: '4px',
                            transition: 'width 0.3s ease',
                        }} />
                    </div>
                    <p style={{ fontSize: '12px', color: '#aaa' }}>
                        {verifyProgress < 30 ? 'Connecting to bank...' : verifyProgress < 60 ? 'Checking payment status...' : verifyProgress < 100 ? 'Almost there...' : 'Payment verified!'}
                    </p>
                </div>
            </div>
        );
    }

    // ── Failed Screen ─────────────────────────────────────────────────────────
    if (step === 'failed') {
        return (
            <div style={{ background: '#f1f3f6', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 16px' }}>
                <div style={{ background: 'white', borderRadius: '2px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', padding: '40px', textAlign: 'center', maxWidth: '420px', width: '100%' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fce4ec', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                        <XCircle size={48} style={{ color: '#d32f2f' }} />
                    </div>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#d32f2f', marginBottom: '8px' }}>Payment Failed</h1>
                    <p style={{ color: '#666', fontSize: '13px', marginBottom: '24px', lineHeight: 1.6 }}>
                        {failMessage}
                    </p>
                    <div style={{ background: '#fff8e1', borderRadius: '4px', padding: '12px 16px', marginBottom: '24px', textAlign: 'left', fontSize: '12px', color: '#6d4c00', lineHeight: 1.5 }}>
                        <strong>Note:</strong> If money was debited from your account, it will be automatically refunded within 24 hours.
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => {
                                setStep('qr');
                                setVerifyProgress(0);
                                setFailMessage('');
                            }}
                            style={{ flex: 1, padding: '12px', fontWeight: 700, fontSize: '13px', borderRadius: '2px', background: '#ff9f00', color: 'white', border: 'none', cursor: 'pointer' }}
                        >
                            RETRY PAYMENT
                        </button>
                        <button
                            onClick={() => {
                                setStep('form');
                                setQrData(null);
                                setPaymentId(null);
                                setVerifyProgress(0);
                                setFailMessage('');
                            }}
                            style={{ flex: 1, padding: '12px', fontWeight: 700, fontSize: '13px', borderRadius: '2px', background: 'white', color: '#2874f0', border: '1px solid #2874f0', cursor: 'pointer' }}
                        >
                            TRY OTHER METHOD
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ background: '#f1f3f6', minHeight: '100vh', paddingTop: '16px', paddingBottom: '16px' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 12px' }}>

                {/* Steps Breadcrumb */}
                <div style={{ background: 'white', borderRadius: '2px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '12px 16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <span style={{ fontWeight: 600, color: '#2874f0' }}>Cart</span>
                    <span style={{ color: '#aaa' }}>›</span>
                    <span style={{ fontWeight: 600, color: '#212121' }}>Address & Payment</span>
                    <span style={{ color: '#aaa' }}>›</span>
                    <span style={{ color: '#aaa' }}>Order Confirmed</span>
                </div>

                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '16px', alignItems: 'flex-start' }}>

                    {/* Left: Address + Payment */}
                    <div style={{ flex: 1, minWidth: 0 }}>

                        {/* Delivery Address */}
                        <div style={{ background: 'white', borderRadius: '2px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '12px' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <MapPin size={18} style={{ color: '#2874f0' }} />
                                <h2 style={{ fontWeight: 700, color: '#212121', margin: 0, fontSize: '14px' }}>DELIVERY ADDRESS</h2>
                            </div>
                            <div style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: 600, color: '#212121' }}>{user?.name}</span>
                                </div>
                                <textarea
                                    rows={3}
                                    placeholder="House No, Building, Street, Area, City, State, PIN Code"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: '4px', padding: '10px 12px', fontSize: '13px', outline: 'none', resize: 'none', background: 'white', boxSizing: 'border-box', marginBottom: '12px', marginTop: '8px' }}
                                />
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <Phone size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
                                        <input
                                            type="tel"
                                            placeholder="10-digit mobile number"
                                            value={phone}
                                            maxLength={10}
                                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                            style={{ width: '100%', border: '1px solid #ddd', borderRadius: '4px', paddingLeft: '34px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', fontSize: '13px', outline: 'none', background: 'white', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <Mail size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
                                        <input
                                            type="email"
                                            value={user?.email || ''}
                                            disabled
                                            style={{ width: '100%', border: '1px solid #e0e0e0', borderRadius: '4px', paddingLeft: '34px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', fontSize: '13px', background: '#fafafa', color: '#888', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>

                                {/* Map Locate */}
                                <div style={{ marginTop: '12px' }}>
                                    <button
                                        onClick={handleLocate}
                                        disabled={locating}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', fontSize: '13px', fontWeight: 600, color: '#2874f0', background: '#e8f0fe', border: '1px solid #c5d8f7', borderRadius: '4px', cursor: locating ? 'not-allowed' : 'pointer' }}
                                    >
                                        <Navigation size={14} />
                                        {locating ? 'Locating...' : 'Locate on Map'}
                                    </button>
                                    <span style={{ marginLeft: '10px', fontSize: '12px', color: '#aaa' }}>Pinpoint your exact delivery location</span>

                                    {showMap && (
                                        <div style={{ marginTop: '10px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e0e0e0', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
                                            {/* Zomato-style: fixed pin at center, map pans under it */}
                                            <div style={{ position: 'relative', height: '300px' }}>
                                                {/* Fixed center pin (SVG, absolutely positioned) */}
                                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -100%)', zIndex: 1000, pointerEvents: 'none', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.35))' }}>
                                                    <svg width="36" height="44" viewBox="0 0 36 44" fill="none">
                                                        <path d="M18 0C8.059 0 0 8.059 0 18c0 13.5 18 26 18 26S36 31.5 36 18C36 8.059 27.941 0 18 0z" fill="#f53d2d"/>
                                                        <circle cx="18" cy="18" r="7" fill="white"/>
                                                        <circle cx="18" cy="18" r="4" fill="#f53d2d"/>
                                                    </svg>
                                                </div>
                                                {/* Loading overlay */}
                                                {mapLoading && (
                                                    <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'white', borderRadius: '20px', padding: '4px 14px', fontSize: '12px', color: '#555', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Loader size={12} style={{ animation: 'spin 1s linear infinite', color: '#f53d2d' }} />
                                                        Locating...
                                                    </div>
                                                )}
                                                <MapContainer center={mapCenter} zoom={16} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true} zoomControl={true}>
                                                    <TileLayer
                                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                                    />
                                                    <FlyTo center={mapCenter} />
                                                    <MapCenterTracker onMove={handleCenterMove} />
                                                </MapContainer>
                                            </div>
                                            {/* Address strip */}
                                            <div style={{ padding: '10px 14px', background: 'white', borderTop: '1px solid #eee', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#fff3f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <MapPin size={15} color="#f53d2d" />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#888', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Delivery Location</p>
                                                    <p style={{ fontSize: '12px', color: '#212121', margin: 0, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                                        {mapLoading ? 'Fetching address...' : locationLabel || 'Pan map to set location'}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => setShowMap(false)}
                                                    style={{ flexShrink: 0, padding: '5px 12px', fontSize: '12px', fontWeight: 700, color: 'white', background: '#f53d2d', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                >
                                                    Confirm
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div style={{ background: 'white', borderRadius: '2px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                                <h2 style={{ fontWeight: 700, color: '#212121', margin: 0, fontSize: '14px' }}>PAYMENT OPTIONS</h2>
                            </div>

                            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
                                {/* Method Selector Sidebar */}
                                <div style={{ width: isMobile ? '100%' : '192px', borderRight: isMobile ? 'none' : '1px solid #f0f0f0', borderBottom: isMobile ? '1px solid #f0f0f0' : 'none', paddingTop: '8px', paddingBottom: '8px' }}>
                                    {[
                                        { id: 'upi-qr', label: 'UPI / QR Code', icon: '📱' },
                                        { id: 'phonepe', label: 'PhonePe', icon: '💜' },
                                        { id: 'gpay', label: 'Google Pay', icon: '🟢' },
                                    ].map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => { setMethod(m.id); setQrData(null); setStep('form'); }}
                                            style={{
                                                width: '100%',
                                                textAlign: 'left',
                                                padding: '12px 16px',
                                                fontSize: '13px',
                                                borderLeft: `2px solid ${method === m.id ? '#2874f0' : 'transparent'}`,
                                                background: method === m.id ? '#e8f0fe' : 'transparent',
                                                color: method === m.id ? '#2874f0' : '#333',
                                                fontWeight: method === m.id ? 600 : 400,
                                                border: 'none',
                                                borderLeft: `2px solid ${method === m.id ? '#2874f0' : 'transparent'}`,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            {m.icon} {m.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Method Detail */}
                                <div style={{ flex: 1, padding: '16px' }}>
                                    {method === 'upi-qr' && (
                                        <div>
                                            {!qrData ? (
                                                <div>
                                                    <p style={{ fontSize: '13px', color: '#444', marginBottom: '12px', fontWeight: 500 }}>Pay using any UPI app — GPay, PhonePe, Paytm, BHIM</p>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '12px', color: '#888' }}>
                                                        <span>UPI ID:</span>
                                                        <span style={{ fontFamily: 'monospace', background: '#f5f5f5', padding: '2px 8px', borderRadius: '2px' }}>sibanando.nayak@ybl</span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '12px', fontSize: '28px', marginBottom: '16px' }}>
                                                        <span title="Google Pay">🟢</span>
                                                        <span title="PhonePe">💜</span>
                                                        <span title="Paytm">💙</span>
                                                        <span title="BHIM">🇮🇳</span>
                                                    </div>
                                                    <button
                                                        onClick={handleGetQR}
                                                        disabled={loading}
                                                        style={{ padding: '10px 24px', fontWeight: 700, fontSize: '13px', borderRadius: '2px', background: '#ff9f00', color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                                    >
                                                        {loading ? <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> : '📲'}
                                                        {loading ? 'Generating...' : 'Generate QR Code'}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{ textAlign: 'center' }}>
                                                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#444', marginBottom: '12px' }}>
                                                        Scan with any UPI app to pay <span style={{ fontWeight: 700, color: '#2874f0' }}>₹{finalTotal.toLocaleString('en-IN')}</span>
                                                    </p>
                                                    <div style={{ display: 'inline-block', padding: '12px', border: '2px solid #90caf9', borderRadius: '4px', background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '12px' }}>
                                                        <QRCode value={qrData.qrString} size={200} />
                                                    </div>
                                                    <p style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>UPI ID: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{qrData.upiId}</span></p>
                                                    <p style={{ fontSize: '12px', color: qrTimeLeft < 60 ? '#d32f2f' : '#e65100', marginBottom: '16px', fontWeight: qrTimeLeft < 60 ? 700 : 400 }}>
                                                        ⏱ QR expires in {Math.floor(qrTimeLeft / 60)}:{String(qrTimeLeft % 60).padStart(2, '0')}
                                                    </p>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 0', marginBottom: '8px', color: '#2874f0', fontSize: '13px', fontWeight: 600 }}>
                                                        <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                                        Waiting for payment...
                                                    </div>
                                                    <button
                                                        onClick={handlePaymentDone}
                                                        style={{ padding: '8px 24px', fontSize: '12px', borderRadius: '2px', background: 'transparent', color: '#888', border: '1px solid #ddd', cursor: 'pointer' }}
                                                    >
                                                        I've already paid
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {method === 'phonepe' && (
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#5f259f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>💜</div>
                                                <div>
                                                    <p style={{ fontWeight: 600, color: '#212121', margin: '0 0 2px', fontSize: '14px' }}>PhonePe UPI</p>
                                                    <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>Fast & secure payments</p>
                                                </div>
                                            </div>
                                            {!qrData ? (
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '12px', color: '#888' }}>
                                                        <span>UPI ID:</span>
                                                        <span style={{ fontFamily: 'monospace', background: '#f5f5f5', padding: '2px 8px', borderRadius: '2px' }}>sibanando.nayak@ybl</span>
                                                    </div>
                                                    <p style={{ fontSize: '12px', color: '#555', marginBottom: '12px' }}>Scan QR with PhonePe to pay <strong>₹{finalTotal.toLocaleString('en-IN')}</strong></p>
                                                    <button
                                                        onClick={handleGetQR}
                                                        disabled={loading}
                                                        style={{ padding: '10px 24px', fontWeight: 700, fontSize: '13px', borderRadius: '2px', background: '#5f259f', color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                                    >
                                                        {loading ? <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> : '📲'}
                                                        {loading ? 'Generating...' : 'Generate QR Code'}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{ textAlign: 'center' }}>
                                                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#444', marginBottom: '12px' }}>
                                                        Scan with PhonePe to pay <span style={{ fontWeight: 700, color: '#5f259f' }}>₹{finalTotal.toLocaleString('en-IN')}</span>
                                                    </p>
                                                    <div style={{ display: 'inline-block', padding: '12px', border: '2px solid #ce93d8', borderRadius: '4px', background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '12px' }}>
                                                        <QRCode value={qrData.qrString} size={180} />
                                                    </div>
                                                    <p style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>UPI ID: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{qrData.upiId}</span></p>
                                                    <p style={{ fontSize: '12px', color: qrTimeLeft < 60 ? '#d32f2f' : '#e65100', marginBottom: '16px', fontWeight: qrTimeLeft < 60 ? 700 : 400 }}>
                                                        ⏱ QR expires in {Math.floor(qrTimeLeft / 60)}:{String(qrTimeLeft % 60).padStart(2, '0')}
                                                    </p>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 0', marginBottom: '8px', color: '#2874f0', fontSize: '13px', fontWeight: 600 }}>
                                                        <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                                        Waiting for payment...
                                                    </div>
                                                    <button
                                                        onClick={handlePaymentDone}
                                                        style={{ padding: '8px 24px', fontSize: '12px', borderRadius: '2px', background: 'transparent', color: '#888', border: '1px solid #ddd', cursor: 'pointer' }}
                                                    >
                                                        I've already paid
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {method === 'gpay' && (
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', border: '1px solid #e0e0e0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🟢</div>
                                                <div>
                                                    <p style={{ fontWeight: 600, color: '#212121', margin: '0 0 2px', fontSize: '14px' }}>Google Pay</p>
                                                    <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>Simple & secure UPI payments</p>
                                                </div>
                                            </div>
                                            {!qrData ? (
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '12px', color: '#888' }}>
                                                        <span>UPI ID:</span>
                                                        <span style={{ fontFamily: 'monospace', background: '#f5f5f5', padding: '2px 8px', borderRadius: '2px' }}>sibanando.nayak@ybl</span>
                                                    </div>
                                                    <p style={{ fontSize: '12px', color: '#555', marginBottom: '12px' }}>Scan QR with Google Pay to pay <strong>₹{finalTotal.toLocaleString('en-IN')}</strong></p>
                                                    <button
                                                        onClick={handleGetQR}
                                                        disabled={loading}
                                                        style={{ padding: '10px 24px', fontWeight: 700, fontSize: '13px', borderRadius: '2px', background: '#1a73e8', color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                                    >
                                                        {loading ? <Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> : '📲'}
                                                        {loading ? 'Generating...' : 'Generate QR Code'}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{ textAlign: 'center' }}>
                                                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#444', marginBottom: '12px' }}>
                                                        Scan with Google Pay to pay <span style={{ fontWeight: 700, color: '#1a73e8' }}>₹{finalTotal.toLocaleString('en-IN')}</span>
                                                    </p>
                                                    <div style={{ display: 'inline-block', padding: '12px', border: '2px solid #90caf9', borderRadius: '4px', background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '12px' }}>
                                                        <QRCode value={qrData.qrString} size={180} />
                                                    </div>
                                                    <p style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>UPI ID: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{qrData.upiId}</span></p>
                                                    <p style={{ fontSize: '12px', color: qrTimeLeft < 60 ? '#d32f2f' : '#e65100', marginBottom: '16px', fontWeight: qrTimeLeft < 60 ? 700 : 400 }}>
                                                        ⏱ QR expires in {Math.floor(qrTimeLeft / 60)}:{String(qrTimeLeft % 60).padStart(2, '0')}
                                                    </p>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 0', marginBottom: '8px', color: '#2874f0', fontSize: '13px', fontWeight: 600 }}>
                                                        <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                                        Waiting for payment...
                                                    </div>
                                                    <button
                                                        onClick={handlePaymentDone}
                                                        style={{ padding: '8px 24px', fontSize: '12px', borderRadius: '2px', background: 'transparent', color: '#888', border: '1px solid #ddd', cursor: 'pointer' }}
                                                    >
                                                        I've already paid
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Price Details */}
                    <div style={{ width: isMobile ? '100%' : '320px', flexShrink: 0 }}>
                        <div style={{ background: 'white', borderRadius: '2px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '12px' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                                <h2 style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '1px', color: '#878787', margin: 0 }}>
                                    PRICE DETAILS
                                </h2>
                            </div>
                            <div style={{ padding: '16px', fontSize: '13px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ color: '#444' }}>Price ({items.length} item{items.length > 1 ? 's' : ''})</span>
                                    <span>₹{total.toLocaleString('en-IN')}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ color: '#444' }}>Discount (15%)</span>
                                    <span style={{ color: '#388e3c' }}>− ₹{discount.toLocaleString('en-IN')}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ color: '#444' }}>Delivery Charges</span>
                                    {deliveryCharge === 0
                                        ? <span style={{ color: '#388e3c' }}>FREE</span>
                                        : <span>₹{deliveryCharge}</span>
                                    }
                                </div>
                                <div style={{ borderTop: '1px dashed #e0e0e0', paddingTop: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '15px' }}>
                                    <span>Total Amount</span>
                                    <span>₹{finalTotal.toLocaleString('en-IN')}</span>
                                </div>
                                <p style={{ fontSize: '12px', fontWeight: 600, color: '#388e3c' }}>
                                    You will save ₹{discount.toLocaleString('en-IN')} on this order
                                </p>
                            </div>
                        </div>

                        {/* Items Summary */}
                        <div style={{ background: 'white', borderRadius: '2px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '12px 16px', marginBottom: '12px' }}>
                            <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', color: '#878787', marginBottom: '8px' }}>ORDER ITEMS</p>
                            {items.slice(0, 3).map(item => (
                                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '6px', paddingBottom: '6px', borderBottom: '1px solid #fafafa' }}>
                                    <span style={{ fontSize: '12px', color: '#444', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                                    <span style={{ fontSize: '12px', color: '#888', flexShrink: 0 }}>×{item.quantity}</span>
                                    <span style={{ fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>₹{(parseFloat(item.price) * item.quantity).toLocaleString('en-IN')}</span>
                                </div>
                            ))}
                            {items.length > 3 && (
                                <p style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>+{items.length - 3} more items</p>
                            )}
                        </div>

                        {/* Trust Badges */}
                        <div style={{ background: 'white', borderRadius: '2px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#878787' }}>
                            <ShieldCheck size={16} style={{ color: '#388e3c' }} />
                            <span>Safe and Secure Payments. 100% Authentic Products.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
