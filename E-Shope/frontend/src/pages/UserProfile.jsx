import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, ShoppingBag, Lock, Edit2, Check, X, Eye, EyeOff, Package } from 'lucide-react';
import api from '../services/api';

const UserProfile = () => {
    const { user, logout, updateUser } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('profile');
    const [orders, setOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);

    // Profile edit state
    const [editingProfile, setEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({ name: '', email: '' });
    const [profileMsg, setProfileMsg] = useState(null);
    const [profileSaving, setProfileSaving] = useState(false);

    // Password state
    const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
    const [pwMsg, setPwMsg] = useState(null);
    const [pwSaving, setPwSaving] = useState(false);

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        setProfileForm({ name: user.name, email: user.email });
    }, [user]);

    useEffect(() => {
        if (activeTab === 'orders' && user) {
            setOrdersLoading(true);
            api.get(`/orders/user/${user.id}`)
                .then(r => setOrders(r.data || []))
                .catch(() => setOrders([]))
                .finally(() => setOrdersLoading(false));
        }
    }, [activeTab, user]);

    const handleSaveProfile = async () => {
        setProfileSaving(true);
        setProfileMsg(null);
        try {
            const res = await api.put(`/auth/profile/${user.id}`, {
                name: profileForm.name,
                email: profileForm.email,
            });
            updateUser(res.data.user);
            setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
            setEditingProfile(false);
        } catch (err) {
            setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Update failed' });
        }
        setProfileSaving(false);
    };

    const handleChangePassword = async () => {
        setPwMsg(null);
        if (!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
            return setPwMsg({ type: 'error', text: 'All password fields are required' });
        }
        if (pwForm.newPassword !== pwForm.confirmPassword) {
            return setPwMsg({ type: 'error', text: 'New passwords do not match' });
        }
        if (pwForm.newPassword.length < 6) {
            return setPwMsg({ type: 'error', text: 'Password must be at least 6 characters' });
        }
        setPwSaving(true);
        try {
            await api.put(`/auth/profile/${user.id}`, {
                name: user.name,
                email: user.email,
                currentPassword: pwForm.currentPassword,
                newPassword: pwForm.newPassword,
            });
            setPwMsg({ type: 'success', text: 'Password changed successfully!' });
            setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setPwMsg({ type: 'error', text: err.response?.data?.message || 'Password change failed' });
        }
        setPwSaving(false);
    };

    const avatarColor = user?.is_admin === 1 ? '#c0392b' : '#2874f0';
    const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : 'U';

    const tabBtn = (id, icon, label) => (
        <button onClick={() => setActiveTab(id)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px 16px', border: 'none', cursor: 'pointer', borderRadius: '4px', fontSize: '14px', fontWeight: activeTab === id ? 600 : 400, background: activeTab === id ? '#e8f0fe' : 'transparent', color: activeTab === id ? '#2874f0' : '#444', transition: 'all 0.2s', textAlign: 'left' }}>
            {icon} {label}
        </button>
    );

    const inputStyle = (disabled) => ({
        width: '100%', padding: '10px 12px', border: `1px solid ${disabled ? '#f0f0f0' : '#d0d0d0'}`, borderRadius: '4px', fontSize: '14px', color: disabled ? '#999' : '#212121', background: disabled ? '#fafafa' : 'white', outline: 'none', boxSizing: 'border-box'
    });

    const btnPrimary = { padding: '10px 24px', background: '#2874f0', color: 'white', border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' };
    const btnOutline = { padding: '10px 24px', background: 'white', color: '#2874f0', border: '1px solid #2874f0', borderRadius: '4px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' };

    const Alert = ({ msg }) => msg ? (
        <div style={{ padding: '10px 14px', borderRadius: '4px', fontSize: '13px', fontWeight: 500, marginBottom: '16px', background: msg.type === 'success' ? '#e8f5e9' : '#fdecea', color: msg.type === 'success' ? '#2e7d32' : '#c62828', border: `1px solid ${msg.type === 'success' ? '#a5d6a7' : '#ef9a9a'}` }}>
            {msg.text}
        </div>
    ) : null;

    const PwInput = ({ field, label, show, onToggle }) => (
        <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#555', marginBottom: '6px' }}>{label}</label>
            <div style={{ position: 'relative' }}>
                <input type={show ? 'text' : 'password'} value={pwForm[field]}
                    onChange={e => setPwForm(p => ({ ...p, [field]: e.target.value }))}
                    style={{ ...inputStyle(false), paddingRight: '40px' }} />
                <button onClick={onToggle} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#888', padding: 0 }}>
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
        </div>
    );

    if (!user) return null;

    return (
        <div style={{ background: '#f1f3f6', minHeight: '100vh', padding: '24px 12px' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', alignItems: 'start' }}>

                {/* Sidebar */}
                <div style={{ background: 'white', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    {/* Avatar */}
                    <div style={{ background: avatarColor, padding: '28px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                            {initials}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', margin: '0 0 2px' }}>Hello,</p>
                            <p style={{ fontSize: '15px', fontWeight: 700, color: 'white', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
                        </div>
                    </div>

                    {/* Nav */}
                    <div style={{ padding: '12px' }}>
                        <p style={{ fontSize: '11px', fontWeight: 700, color: '#aaa', letterSpacing: '1px', padding: '8px 4px 4px', margin: 0 }}>MY ACCOUNT</p>
                        {tabBtn('profile', <User size={16} />, 'Profile & Security')}
                        {tabBtn('orders', <ShoppingBag size={16} />, 'My Orders')}
                        <div style={{ borderTop: '1px solid #f0f0f0', margin: '8px 0' }} />
                        <button onClick={() => { logout(); navigate('/'); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px 16px', border: 'none', cursor: 'pointer', borderRadius: '4px', fontSize: '14px', color: '#e53935', background: 'transparent', textAlign: 'left' }}>
                            <X size={16} /> Logout
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div>
                    {/* ── PROFILE TAB ── */}
                    {activeTab === 'profile' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                            {/* Personal Info */}
                            <div style={{ background: 'white', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#212121', margin: 0 }}>Personal Information</h2>
                                    {!editingProfile && (
                                        <button onClick={() => { setEditingProfile(true); setProfileMsg(null); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', background: 'white', color: '#2874f0', border: '1px solid #2874f0', borderRadius: '4px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                            <Edit2 size={14} /> Edit
                                        </button>
                                    )}
                                </div>

                                <Alert msg={profileMsg} />

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#555', marginBottom: '6px' }}>Full Name</label>
                                        <input value={profileForm.name} disabled={!editingProfile}
                                            onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                                            style={inputStyle(!editingProfile)} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#555', marginBottom: '6px' }}>Email Address</label>
                                        <input value={profileForm.email} disabled={!editingProfile}
                                            onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
                                            style={inputStyle(!editingProfile)} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#555', marginBottom: '6px' }}>Role</label>
                                        <div style={{ padding: '10px 12px', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: '4px', fontSize: '14px' }}>
                                            <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: user.is_admin === 1 ? '#fdecea' : '#e8f0fe', color: user.is_admin === 1 ? '#c62828' : '#1565c0' }}>
                                                {user.is_admin === 1 ? 'Administrator' : 'Customer'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {editingProfile && (
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                                        <button onClick={handleSaveProfile} disabled={profileSaving} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: '6px', opacity: profileSaving ? 0.7 : 1 }}>
                                            <Check size={15} /> {profileSaving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                        <button onClick={() => { setEditingProfile(false); setProfileForm({ name: user.name, email: user.email }); setProfileMsg(null); }} style={btnOutline}>
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Change Password */}
                            <div style={{ background: 'white', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                    <Lock size={18} color="#2874f0" />
                                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#212121', margin: 0 }}>Change Password</h2>
                                </div>

                                <Alert msg={pwMsg} />

                                <div style={{ maxWidth: '400px' }}>
                                    <PwInput field="currentPassword" label="Current Password" show={showPw.current} onToggle={() => setShowPw(p => ({ ...p, current: !p.current }))} />
                                    <PwInput field="newPassword" label="New Password" show={showPw.new} onToggle={() => setShowPw(p => ({ ...p, new: !p.new }))} />
                                    <PwInput field="confirmPassword" label="Confirm New Password" show={showPw.confirm} onToggle={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))} />
                                    <button onClick={handleChangePassword} disabled={pwSaving} style={{ ...btnPrimary, opacity: pwSaving ? 0.7 : 1 }}>
                                        {pwSaving ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── ORDERS TAB ── */}
                    {activeTab === 'orders' && (
                        <div style={{ background: 'white', borderRadius: '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                <Package size={18} color="#2874f0" />
                                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#212121', margin: 0 }}>My Orders</h2>
                            </div>

                            {ordersLoading ? (
                                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                    <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '4px solid #e0e0e0', borderTopColor: '#2874f0', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                    <p style={{ color: '#888', marginTop: '12px', fontSize: '14px' }}>Loading orders...</p>
                                </div>
                            ) : orders.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                                    <ShoppingBag size={48} color="#e0e0e0" style={{ marginBottom: '16px' }} />
                                    <p style={{ fontSize: '16px', fontWeight: 600, color: '#555', margin: '0 0 8px' }}>No orders yet</p>
                                    <p style={{ fontSize: '14px', color: '#999', margin: '0 0 20px' }}>Start shopping to see your orders here</p>
                                    <button onClick={() => navigate('/')} style={btnPrimary}>Shop Now</button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {orders.map(order => (
                                        <div key={order.id} style={{ border: '1px solid #f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                                            {/* Order Header */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fafafa', borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap', gap: '8px' }}>
                                                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                                                    <div>
                                                        <p style={{ fontSize: '11px', color: '#999', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order ID</p>
                                                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#212121', margin: 0 }}>#{order.id}</p>
                                                    </div>
                                                    <div>
                                                        <p style={{ fontSize: '11px', color: '#999', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</p>
                                                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#212121', margin: 0 }}>
                                                            {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p style={{ fontSize: '11px', color: '#999', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment</p>
                                                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#212121', margin: 0 }}>{order.payment_method || 'UPI'}</p>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#212121' }}>₹{parseFloat(order.total).toLocaleString('en-IN')}</span>
                                                    <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: order.status === 'Paid' ? '#e8f5e9' : '#fff8e1', color: order.status === 'Paid' ? '#2e7d32' : '#f57f17' }}>
                                                        {order.status}
                                                    </span>
                                                </div>
                                            </div>
                                            {/* Order Items */}
                                            <div style={{ padding: '12px 16px' }}>
                                                <p style={{ fontSize: '13px', color: '#555', margin: 0 }}>
                                                    <span style={{ fontWeight: 500 }}>Items: </span>
                                                    {order.items_summary || 'Details unavailable'}
                                                </p>
                                                {order.address && (
                                                    <p style={{ fontSize: '12px', color: '#999', margin: '4px 0 0' }}>
                                                        Delivered to: {order.address}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
