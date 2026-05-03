import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import useResponsive from '../hooks/useResponsive';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const agentIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41],
});

const STATUS_STEPS = ['assigned', 'picked_up', 'out_for_delivery', 'delivered'];
const STATUS_LABELS = {
    assigned:         'Order Assigned',
    picked_up:        'Picked Up',
    out_for_delivery: 'Out for Delivery',
    delivered:        'Delivered',
    failed:           'Delivery Failed',
};

export default function TrackOrder() {
    const { token } = useParams();
    const [info, setInfo]     = useState(null);
    const [error, setError]   = useState('');
    const [loading, setLoading] = useState(true);
    const mapRef = useRef(null);
    const { isMobile } = useResponsive();

    async function load() {
        try {
            const r = await fetch(`/api/delivery/track/${token}`);
            if (!r.ok) { setError('Tracking information not found.'); return; }
            const data = await r.json();
            setInfo(data);
            setError('');
        } catch {
            setError('Could not load tracking info. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        const interval = setInterval(load, 30000);
        return () => clearInterval(interval);
    }, [token]);

    const stepIndex = info ? STATUS_STEPS.indexOf(info.status) : -1;

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '80px', color: '#E85D04', fontWeight: 600 }}>
            Loading tracking info…
        </div>
    );

    if (error) return (
        <div style={{ textAlign: 'center', padding: '80px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
            <p style={{ color: '#666', marginBottom: '24px' }}>{error}</p>
            <Link to="/" style={{ color: '#E85D04', fontWeight: 600 }}>Go Home</Link>
        </div>
    );

    return (
        <div style={{ maxWidth: '700px', margin: '40px auto', padding: '0 16px 60px' }}>
            <h2 style={{ color: '#1C1917', marginBottom: '4px' }}>Track Your Order</h2>
            <p style={{ color: '#888', fontSize: '13px', marginBottom: '28px' }}>
                Updates every 30 seconds
            </p>

            {/* Status timeline */}
            <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                    <div style={{
                        position: 'absolute', top: '14px', left: '10%', right: '10%',
                        height: '3px', background: '#f0e8de', borderRadius: '2px', zIndex: 0,
                    }} />
                    {STATUS_STEPS.map((step, i) => {
                        const done = stepIndex >= i;
                        const active = stepIndex === i;
                        return (
                            <div key={step} style={{ textAlign: 'center', flex: 1, zIndex: 1 }}>
                                <div style={{
                                    width: '28px', height: '28px', borderRadius: '50%', margin: '0 auto 8px',
                                    background: done ? '#E85D04' : '#f0e8de',
                                    border: active ? '3px solid #FB8500' : '3px solid transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff', fontWeight: 700, fontSize: '12px',
                                    boxShadow: active ? '0 0 0 4px #fff3e8' : 'none',
                                    transition: 'all 0.3s',
                                }}>
                                    {done ? '✓' : i + 1}
                                </div>
                                <div style={{ fontSize: '11px', color: done ? '#E85D04' : '#aaa', fontWeight: done ? 600 : 400 }}>
                                    {STATUS_LABELS[step]}
                                </div>
                            </div>
                        );
                    })}
                </div>
                {(info.status === 'delivery_attempted' || info.status === 'rto_initiated') && (
                    <div style={{ textAlign: 'center', marginTop: '16px', color: '#e53e3e', fontWeight: 600 }}>
                        {info.status === 'rto_initiated'
                            ? 'Package returning to origin after max delivery attempts.'
                            : `Delivery attempt failed${info.failed_reason ? `: ${info.failed_reason}` : ''}. Another attempt will be made.`}
                    </div>
                )}
            </div>

            {/* Agent + order info */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ color: '#888', fontSize: '12px', marginBottom: '6px' }}>DELIVERY AGENT</div>
                    <div style={{ fontWeight: 700, color: '#1C1917', marginBottom: '4px' }}>{info.agent_name}</div>
                    <div style={{ fontSize: '13px', color: '#666' }}>📞 {info.agent_phone}</div>
                </div>
                <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ color: '#888', fontSize: '12px', marginBottom: '6px' }}>DELIVERY ADDRESS</div>
                    <div style={{ fontSize: '13px', color: '#333', lineHeight: '1.4' }}>{info.address}</div>
                </div>
            </div>

            {/* Map */}
            {info.agent_lat && info.agent_lng ? (
                <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #eee', marginBottom: '16px' }}>
                    <div style={{ background: '#FFF5EB', padding: '10px 16px', fontSize: '13px', color: '#E85D04', fontWeight: 600 }}>
                        📍 Agent live location
                    </div>
                    <MapContainer
                        center={[info.agent_lat, info.agent_lng]}
                        zoom={14}
                        style={{ height: '280px', width: '100%' }}
                        ref={mapRef}
                    >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[info.agent_lat, info.agent_lng]} icon={agentIcon}>
                            <Popup>{info.agent_name} — {STATUS_LABELS[info.status] || info.status}</Popup>
                        </Marker>
                    </MapContainer>
                </div>
            ) : (
                <div style={{ background: '#f9f9f9', border: '1px dashed #ddd', borderRadius: '12px', padding: '24px', textAlign: 'center', color: '#aaa', marginBottom: '16px' }}>
                    Map will show once agent shares location
                </div>
            )}

            {info.delivered_at && (
                <div style={{ background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: '12px', padding: '16px', textAlign: 'center', color: '#276749', fontWeight: 600 }}>
                    ✅ Delivered on {new Date(info.delivered_at).toLocaleString('en-IN')}
                </div>
            )}
        </div>
    );
}
