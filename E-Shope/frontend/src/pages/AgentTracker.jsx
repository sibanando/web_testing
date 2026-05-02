import { useState, useEffect, useRef } from 'react';

export default function AgentTracker() {
    const [agent, setAgent]       = useState(() => {
        try { return JSON.parse(sessionStorage.getItem('agent') || 'null'); } catch { return null; }
    });
    const [token, setToken]       = useState(() => sessionStorage.getItem('agent_token') || '');
    const [orders, setOrders]     = useState([]);
    const [sharing, setSharing]   = useState(false);
    const [phone, setPhone]       = useState('');
    const [password, setPassword] = useState('');
    const [error, setError]       = useState('');
    const [msg, setMsg]           = useState('');
    const intervalRef = useRef(null);

    async function login(e) {
        e.preventDefault();
        setError('');
        try {
            const r = await fetch('/api/delivery/agent/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password }),
            });
            const data = await r.json();
            if (!r.ok) return setError(data.message || 'Login failed');
            sessionStorage.setItem('agent', JSON.stringify(data.agent));
            sessionStorage.setItem('agent_token', data.token);
            setAgent(data.agent);
            setToken(data.token);
        } catch {
            setError('Network error. Please try again.');
        }
    }

    async function loadOrders() {
        try {
            const r = await fetch('/api/delivery/agent/orders', {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (r.ok) setOrders(await r.json());
        } catch { /* silent */ }
    }

    useEffect(() => {
        if (agent && token) loadOrders();
    }, [agent, token]);

    function pushLocation(lat, lng) {
        fetch('/api/delivery/agent/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ lat, lng }),
        }).catch(() => {});
    }

    function startSharing() {
        if (!navigator.geolocation) {
            return setMsg('Geolocation not supported on this device.');
        }
        setSharing(true);
        navigator.geolocation.getCurrentPosition(p => pushLocation(p.coords.latitude, p.coords.longitude));
        intervalRef.current = setInterval(() => {
            navigator.geolocation.getCurrentPosition(p => pushLocation(p.coords.latitude, p.coords.longitude));
        }, 30000);
        setMsg('Location sharing active (every 30s)');
    }

    function stopSharing() {
        clearInterval(intervalRef.current);
        setSharing(false);
        setMsg('Location sharing stopped');
    }

    useEffect(() => () => clearInterval(intervalRef.current), []);

    async function updateStatus(deliveryId, status, extra = {}) {
        try {
            const r = await fetch(`/api/delivery/${deliveryId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status, ...extra }),
            });
            const d = await r.json();
            setMsg(d.message || 'Updated');
            loadOrders();
        } catch {
            setMsg('Failed to update status');
        }
    }

    function markFailed(deliveryId) {
        const reason = window.prompt('Reason for failed delivery attempt (required):');
        if (!reason?.trim()) return;
        updateStatus(deliveryId, 'delivery_attempted', { failed_reason: reason.trim() });
    }

    function logout() {
        sessionStorage.removeItem('agent');
        sessionStorage.removeItem('agent_token');
        setAgent(null); setToken(''); setOrders([]);
    }

    const brand = '#E85D04';
    const card = { background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px', marginBottom: '14px' };

    if (!agent) return (
        <div style={{ minHeight: '100vh', background: '#FAFAF7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: '16px', padding: '36px 32px', width: '100%', maxWidth: '360px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                    <div style={{ fontSize: '36px', marginBottom: '8px' }}>🚴</div>
                    <h2 style={{ color: '#1C1917', margin: 0 }}>Agent Login</h2>
                    <p style={{ color: '#888', fontSize: '13px', marginTop: '4px' }}>ApniDunia Delivery</p>
                </div>
                {error && <div style={{ background: '#fff5f5', color: '#e53e3e', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}
                <form onSubmit={login}>
                    <input
                        placeholder="Mobile Number"
                        value={phone} onChange={e => setPhone(e.target.value)}
                        required style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '12px', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                    <input
                        type="password" placeholder="Password"
                        value={password} onChange={e => setPassword(e.target.value)}
                        required style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                    <button type="submit" style={{ width: '100%', padding: '12px', background: brand, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
                        Login
                    </button>
                </form>
            </div>
        </div>
    );

    return (
        <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px 16px 60px', minHeight: '100vh', background: '#FAFAF7' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: '16px', color: '#1C1917' }}>👋 {agent.name}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>{agent.phone}</div>
                </div>
                <button onClick={logout} style={{ background: 'none', border: '1px solid #ddd', borderRadius: '8px', padding: '6px 12px', color: '#666', cursor: 'pointer', fontSize: '13px' }}>
                    Logout
                </button>
            </div>

            {/* Location sharing */}
            <div style={{ ...card, background: sharing ? '#f0fff4' : '#fff', borderColor: sharing ? '#c6f6d5' : '#eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontWeight: 600, color: '#1C1917', marginBottom: '2px' }}>📍 Location Sharing</div>
                        <div style={{ fontSize: '12px', color: sharing ? '#276749' : '#888' }}>
                            {sharing ? 'Active — updating every 30s' : 'Off — tap to share location'}
                        </div>
                    </div>
                    <button
                        onClick={sharing ? stopSharing : startSharing}
                        style={{ padding: '8px 16px', background: sharing ? '#e53e3e' : brand, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                    >
                        {sharing ? 'Stop' : 'Start'}
                    </button>
                </div>
            </div>

            {msg && (
                <div style={{ background: '#FFF5EB', border: '1px solid #FDE0C0', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: brand }}>
                    {msg}
                </div>
            )}

            {/* Deliveries */}
            <h3 style={{ color: '#1C1917', margin: '8px 0 14px', fontSize: '15px' }}>
                Active Deliveries ({orders.length})
            </h3>

            {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#aaa', background: '#fff', borderRadius: '12px', border: '1px solid #eee' }}>
                    No active deliveries
                </div>
            ) : orders.map(o => (
                <div key={o.id} style={card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 700, color: '#1C1917' }}>Order #{o.order_id}</span>
                        <span style={{ fontSize: '12px', background: '#FFF5EB', color: brand, padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>
                            {o.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#555', marginBottom: '4px' }}>👤 {o.customer_name}</div>
                    <div style={{ fontSize: '13px', color: '#555', marginBottom: '4px' }}>📍 {o.address}</div>
                    <div style={{ fontSize: '13px', color: '#555', marginBottom: '12px' }}>📦 {o.items}</div>

                    {/* Status action buttons */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {o.status === 'assigned' && (
                            <button onClick={() => updateStatus(o.id, 'picked_up')}
                                style={{ flex: 1, padding: '8px', background: '#EBF4FF', color: '#2B6CB0', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
                                ✅ Picked Up
                            </button>
                        )}
                        {o.status === 'picked_up' && (
                            <button onClick={() => updateStatus(o.id, 'out_for_delivery')}
                                style={{ flex: 1, padding: '8px', background: '#FFFFF0', color: '#744210', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
                                🚴 Out for Delivery
                            </button>
                        )}
                        {o.status === 'out_for_delivery' && (
                            <>
                                <button onClick={() => updateStatus(o.id, 'delivered')}
                                    style={{ flex: 1, padding: '8px', background: '#F0FFF4', color: '#276749', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
                                    🎉 Delivered
                                </button>
                                <button onClick={() => markFailed(o.id)}
                                    style={{ flex: 1, padding: '8px', background: '#FFF5F5', color: '#C53030', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
                                    ❌ Attempt Failed
                                </button>
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
