import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, ShoppingBag, Lock, Edit2, Check, X, Eye, EyeOff, Package, LogOut, MapPin, Calendar, CreditCard, Truck, Heart, MessageCircle, Gift, Star, Send, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import api from '../services/api';
import useResponsive from '../hooks/useResponsive';

const UserProfile = () => {
    const { user, logout, updateUser } = useAuth();
    const navigate = useNavigate();
    const { isMobile } = useResponsive();
    const [activeTab, setActiveTab] = useState('profile');
    const [orders, setOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);

    const [editingProfile, setEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({ name: '', email: '' });
    const [profileMsg, setProfileMsg] = useState(null);
    const [profileSaving, setProfileSaving] = useState(false);

    const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
    const [pwMsg, setPwMsg] = useState(null);
    const [pwSaving, setPwSaving] = useState(false);

    // Loyalty
    const [loyalty, setLoyalty] = useState(null);
    const [loyaltyLoading, setLoyaltyLoading] = useState(false);

    // Tickets
    const [tickets, setTickets] = useState([]);
    const [ticketsLoading, setTicketsLoading] = useState(false);
    const [openTicket, setOpenTicket] = useState(null);
    const [ticketMessages, setTicketMessages] = useState([]);
    const [newTicketForm, setNewTicketForm] = useState({ subject: '', category: 'general', message: '', order_id: '' });
    const [showNewTicket, setShowNewTicket] = useState(false);
    const [ticketMsg, setTicketMsg] = useState(null);
    const [replyBody, setReplyBody] = useState('');

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
        if (activeTab === 'loyalty' && user && !loyalty) {
            setLoyaltyLoading(true);
            api.get('/loyalty')
                .then(r => setLoyalty(r.data))
                .catch(() => {})
                .finally(() => setLoyaltyLoading(false));
        }
        if (activeTab === 'tickets' && user) {
            setTicketsLoading(true);
            api.get('/tickets')
                .then(r => setTickets(r.data || []))
                .catch(() => {})
                .finally(() => setTicketsLoading(false));
        }
    }, [activeTab, user]);

    const handleSaveProfile = async () => {
        setProfileSaving(true);
        setProfileMsg(null);
        try {
            const res = await api.put(`/auth/profile/${user.id}`, {
                name: profileForm.name, email: profileForm.email,
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
        if (!pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword)
            return setPwMsg({ type: 'error', text: 'All password fields are required' });
        if (pwForm.newPassword !== pwForm.confirmPassword)
            return setPwMsg({ type: 'error', text: 'New passwords do not match' });
        if (pwForm.newPassword.length < 6)
            return setPwMsg({ type: 'error', text: 'Password must be at least 6 characters' });
        setPwSaving(true);
        try {
            await api.put(`/auth/profile/${user.id}`, {
                name: user.name, email: user.email,
                currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword,
            });
            setPwMsg({ type: 'success', text: 'Password changed successfully!' });
            setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setPwMsg({ type: 'error', text: err.response?.data?.message || 'Password change failed' });
        }
        setPwSaving(false);
    };

    const avatarGradient = user?.is_admin === 1
        ? 'linear-gradient(135deg, #ef4444, #dc2626)'
        : 'linear-gradient(135deg, #6366f1, #4f46e5)';
    const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : 'U';

    const inputStyle = (disabled) => ({
        width: '100%', padding: '10px 12px',
        border: `1.5px solid ${disabled ? '#f1f5f9' : '#e2e8f0'}`,
        borderRadius: '8px', fontSize: '14px',
        color: disabled ? '#94a3b8' : '#1e293b',
        background: disabled ? '#f8fafc' : 'white',
        outline: 'none', boxSizing: 'border-box',
    });

    const Alert = ({ msg }) => msg ? (
        <div style={{
            padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, marginBottom: '16px',
            background: msg.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: msg.type === 'success' ? '#059669' : '#dc2626',
            border: `1px solid ${msg.type === 'success' ? '#a7f3d0' : '#fca5a5'}`,
            display: 'flex', alignItems: 'center', gap: '8px',
        }}>
            {msg.type === 'success' ? <Check size={15} /> : <X size={15} />}
            {msg.text}
        </div>
    ) : null;

    const PwInput = ({ field, label, show, onToggle }) => (
        <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>{label}</label>
            <div style={{ position: 'relative' }}>
                <input type={show ? 'text' : 'password'} value={pwForm[field]}
                    onChange={e => setPwForm(p => ({ ...p, [field]: e.target.value }))}
                    style={{ ...inputStyle(false), paddingRight: '42px' }} />
                <button onClick={onToggle} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex' }}>
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
        </div>
    );

    const statusStyle = (status) => ({
        Paid: { bg: '#ecfdf5', color: '#059669' },
        Pending: { bg: '#fffbeb', color: '#d97706' },
        Processing: { bg: '#eff6ff', color: '#3b82f6' },
        Shipped: { bg: '#f5f3ff', color: '#7c3aed' },
        Delivered: { bg: '#ecfdf5', color: '#059669' },
        Cancelled: { bg: '#fef2f2', color: '#dc2626' },
    }[status] || { bg: '#f1f5f9', color: '#64748b' });

    if (!user) return null;

    const profileTabs = [
        { id: 'profile',  icon: <User size={16} />,          label: 'Profile',  color: '#2563eb', bg: '#eff6ff' },
        { id: 'orders',   icon: <ShoppingBag size={16} />,   label: 'Orders',   color: '#2563eb', bg: '#eff6ff' },
        { id: 'loyalty',  icon: <Gift size={16} />,          label: 'Loyalty',  color: '#d97706', bg: '#fffbeb' },
        { id: 'tickets',  icon: <MessageCircle size={16} />, label: 'Tickets',  color: '#7c3aed', bg: '#f5f3ff' },
    ];

    return (
        <div style={{ background: '#f8fafc', minHeight: '100vh', padding: isMobile ? '0' : '24px 16px' }}>

            {/* Mobile: compact header + tab strip */}
            {isMobile && (
                <div>
                    <div style={{ background: avatarGradient, padding: '20px 16px 16px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color: 'white', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }}>
                                {initials}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: '15px', fontWeight: 800, color: 'white', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
                                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                            </div>
                            <button onClick={() => { logout(); navigate('/'); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', padding: '6px 10px', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>
                                <LogOut size={13} /> Out
                            </button>
                        </div>
                    </div>
                    <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', overflowX: 'auto', display: 'flex', scrollbarWidth: 'none' }}>
                        {profileTabs.map(tab => {
                            const active = activeTab === tab.id;
                            const badge = tab.id === 'orders' ? orders.length : tab.id === 'tickets' ? tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length : 0;
                            return (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '10px 16px', border: 'none', borderBottom: active ? `3px solid ${tab.color}` : '3px solid transparent', background: 'transparent', cursor: 'pointer', whiteSpace: 'nowrap', position: 'relative', color: active ? tab.color : '#94a3b8', fontWeight: active ? 700 : 400, fontSize: '11px', flexShrink: 0 }}>
                                    {tab.icon}
                                    {tab.label}
                                    {badge > 0 && <span style={{ position: 'absolute', top: '6px', right: '8px', width: '16px', height: '16px', background: tab.color, color: 'white', borderRadius: '50%', fontSize: '9px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badge}</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div style={{ maxWidth: '1100px', margin: '0 auto', display: isMobile ? 'block' : 'grid', gridTemplateColumns: isMobile ? undefined : '260px 1fr', gap: '20px', alignItems: 'flex-start', padding: isMobile ? '16px' : undefined }}>

                {/* ── Sidebar (desktop only) ─────────────────────────── */}
                {!isMobile && (
                <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    {/* Avatar Banner */}
                    <div style={{ background: avatarGradient, padding: '28px 20px 24px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', bottom: '-30px', left: '50%', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
                        <div style={{ position: 'relative' }}>
                            <div style={{ width: '62px', height: '62px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800, color: 'white', marginBottom: '12px', border: '3px solid rgba(255,255,255,0.3)' }}>
                                {initials}
                            </div>
                            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', margin: '0 0 2px' }}>Hello,</p>
                            <p style={{ fontSize: '15px', fontWeight: 800, color: 'white', margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
                            <span style={{
                                fontSize: '10px', padding: '3px 10px', borderRadius: '9999px', fontWeight: 700,
                                background: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)',
                                letterSpacing: '0.5px',
                            }}>
                                {user.is_admin === 1 ? 'Administrator' : user.is_seller === 1 ? 'Seller' : 'Customer'}
                            </span>
                        </div>
                    </div>

                    {/* Nav */}
                    <div style={{ padding: '10px' }}>
                        <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', letterSpacing: '1.5px', padding: '8px 8px 4px', margin: 0, textTransform: 'uppercase' }}>My Account</p>

                        {[
                            { id: 'profile',  icon: <User size={16} />,        label: 'Profile & Security', color: '#2563eb', bg: '#eff6ff' },
                            { id: 'orders',   icon: <ShoppingBag size={16} />, label: 'My Orders',          color: '#2563eb', bg: '#eff6ff' },
                            { id: 'loyalty',  icon: <Gift size={16} />,        label: 'Loyalty Points',     color: '#d97706', bg: '#fffbeb' },
                            { id: 'tickets',  icon: <MessageCircle size={16} />,label: 'Support Tickets',   color: '#7c3aed', bg: '#f5f3ff' },
                        ].map(tab => {
                            const active = activeTab === tab.id;
                            return (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                                        padding: '11px 12px', border: 'none', cursor: 'pointer',
                                        borderRadius: '9px', fontSize: '13px',
                                        fontWeight: active ? 700 : 400,
                                        background: active ? tab.bg : 'transparent',
                                        color: active ? tab.color : '#64748b',
                                        transition: 'all 0.15s ease', textAlign: 'left',
                                        marginBottom: '2px',
                                    }}
                                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#374151'; } }}
                                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; } }}
                                >
                                    <span style={{ color: active ? tab.color : '#94a3b8' }}>{tab.icon}</span>
                                    {tab.label}
                                    {tab.id === 'orders' && orders.length > 0 && (
                                        <span style={{ marginLeft: 'auto', fontSize: '11px', padding: '1px 7px', borderRadius: '9999px', background: '#eff6ff', color: '#3b82f6', fontWeight: 700 }}>{orders.length}</span>
                                    )}
                                    {tab.id === 'tickets' && tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length > 0 && (
                                        <span style={{ marginLeft: 'auto', fontSize: '11px', padding: '1px 7px', borderRadius: '9999px', background: '#f5f3ff', color: '#7c3aed', fontWeight: 700 }}>
                                            {tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length}
                                        </span>
                                    )}
                                </button>
                            );
                        })}

                        <div style={{ borderTop: '1px solid #f1f5f9', margin: '8px 0' }} />

                        <button onClick={() => { logout(); navigate('/'); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 12px', border: 'none', cursor: 'pointer', borderRadius: '9px', fontSize: '13px', color: '#ef4444', background: 'transparent', textAlign: 'left', fontWeight: 600 }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                            <LogOut size={16} /> Sign Out
                        </button>
                    </div>

                    {/* Email display */}
                    <div style={{ padding: '10px 12px 14px' }}>
                        <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                            <p style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</p>
                            <p style={{ fontSize: '12px', color: '#475569', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                        </div>
                    </div>
                </div>
                )}

                {/* ── Main Content ─────────────────────── */}
                <div>
                    {/* ── PROFILE TAB ── */}
                    {activeTab === 'profile' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            {/* Personal Info */}
                            <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '24px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <User size={18} style={{ color: '#3b82f6' }} />
                                        </div>
                                        <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Personal Information</h2>
                                    </div>
                                    {!editingProfile && (
                                        <button onClick={() => { setEditingProfile(true); setProfileMsg(null); }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#eff6ff', color: '#2563eb', border: '1.5px solid #bfdbfe', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                                            <Edit2 size={13} /> Edit
                                        </button>
                                    )}
                                </div>

                                <Alert msg={profileMsg} />

                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Full Name</label>
                                        <input value={profileForm.name} disabled={!editingProfile}
                                            onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                                            style={inputStyle(!editingProfile)} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Email Address</label>
                                        <input value={profileForm.email} disabled={!editingProfile}
                                            onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
                                            style={inputStyle(!editingProfile)} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Account Role</label>
                                        <div style={{ padding: '10px 12px', background: '#f8fafc', border: '1.5px solid #f1f5f9', borderRadius: '8px' }}>
                                            <span style={{
                                                display: 'inline-block', padding: '3px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700,
                                                background: user.is_admin === 1 ? '#fef2f2' : user.is_seller === 1 ? '#ecfdf5' : '#eff6ff',
                                                color: user.is_admin === 1 ? '#dc2626' : user.is_seller === 1 ? '#059669' : '#2563eb',
                                            }}>
                                                {user.is_admin === 1 ? 'Administrator' : user.is_seller === 1 ? 'Seller' : 'Customer'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {editingProfile && (
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                        <button onClick={handleSaveProfile} disabled={profileSaving}
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 22px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: profileSaving ? 'not-allowed' : 'pointer', opacity: profileSaving ? 0.7 : 1, boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>
                                            <Check size={14} /> {profileSaving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                        <button onClick={() => { setEditingProfile(false); setProfileForm({ name: user.name, email: user.email }); setProfileMsg(null); }}
                                            style={{ padding: '10px 22px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Change Password */}
                            <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '24px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Lock size={18} style={{ color: '#d97706' }} />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Change Password</h2>
                                        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '1px 0 0' }}>Keep your account secure</p>
                                    </div>
                                </div>

                                <Alert msg={pwMsg} />

                                <div style={{ maxWidth: '400px' }}>
                                    <PwInput field="currentPassword" label="Current Password" show={showPw.current} onToggle={() => setShowPw(p => ({ ...p, current: !p.current }))} />
                                    <PwInput field="newPassword" label="New Password" show={showPw.new} onToggle={() => setShowPw(p => ({ ...p, new: !p.new }))} />
                                    <PwInput field="confirmPassword" label="Confirm New Password" show={showPw.confirm} onToggle={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))} />
                                    {pwForm.newPassword && pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                                        <p style={{ fontSize: '12px', color: '#ef4444', marginBottom: '12px', fontWeight: 500 }}>Passwords do not match</p>
                                    )}
                                    <button onClick={handleChangePassword} disabled={pwSaving}
                                        style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #d97706, #f59e0b)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: pwSaving ? 'not-allowed' : 'pointer', opacity: pwSaving ? 0.7 : 1, boxShadow: '0 4px 12px rgba(217,119,6,0.3)' }}>
                                        {pwSaving ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── LOYALTY TAB ── */}
                    {activeTab === 'loyalty' && (
                        <div>
                            {loyaltyLoading ? (
                                <div style={{ background: 'white', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
                                    <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#d97706', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                </div>
                            ) : loyalty ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {/* Tier Card */}
                                    <div style={{ background: `linear-gradient(135deg, ${loyalty.tier.color}, ${loyalty.tier.color}cc)`, borderRadius: '16px', padding: '28px', color: 'white', position: 'relative', overflow: 'hidden' }}>
                                        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                    <Gift size={20} color="white" />
                                                    <span style={{ fontSize: '13px', fontWeight: 600, opacity: 0.85 }}>Loyalty Program</span>
                                                </div>
                                                <p style={{ fontSize: '36px', fontWeight: 900, margin: '0 0 4px', letterSpacing: '-1px' }}>{loyalty.balance.toLocaleString('en-IN')}</p>
                                                <p style={{ fontSize: '13px', opacity: 0.8, margin: 0 }}>Total points</p>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 16px', borderRadius: '9999px', fontSize: '14px', fontWeight: 800, display: 'inline-block', marginBottom: '8px' }}>{loyalty.tier.name}</span>
                                                {loyalty.tier.next && (
                                                    <div>
                                                        <p style={{ fontSize: '11px', opacity: 0.75, margin: '0 0 4px' }}>{loyalty.tier.next - loyalty.balance} pts to next tier</p>
                                                        <div style={{ width: '120px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '9999px', overflow: 'hidden' }}>
                                                            <div style={{ height: '100%', background: 'white', borderRadius: '9999px', width: `${Math.min(100, ((loyalty.balance - loyalty.tier.min) / (loyalty.tier.next - loyalty.tier.min)) * 100)}%` }} />
                                                        </div>
                                                    </div>
                                                )}
                                                {!loyalty.tier.next && <p style={{ fontSize: '11px', opacity: 0.75, margin: '4px 0 0' }}>Maximum tier reached!</p>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* How to Earn */}
                                    <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 14px' }}>How to earn points</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                                            {[
                                                { icon: <ShoppingBag size={16} />, label: 'Place an order', pts: '1 pt per ₹10', color: '#2563eb' },
                                                { icon: <Star size={16} />, label: 'Write a review', pts: '+50 pts', color: '#d97706' },
                                            ].map(item => (
                                                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0 }}>
                                                        {item.icon}
                                                    </div>
                                                    <div>
                                                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#374151', margin: 0 }}>{item.label}</p>
                                                        <p style={{ fontSize: '12px', color: item.color, fontWeight: 700, margin: 0 }}>{item.pts}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ marginTop: '12px', padding: '10px 14px', background: '#FFF5EB', borderRadius: '8px', border: '1px solid #FDE0C0' }}>
                                            <p style={{ fontSize: '12px', color: '#92400e', margin: 0 }}>
                                                <strong>Tiers:</strong> Bronze (0–999) · Silver (1,000–4,999) · Gold (5,000–9,999) · Platinum (10,000+)
                                            </p>
                                        </div>
                                    </div>

                                    {/* History */}
                                    {loyalty.history?.length > 0 && (
                                        <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
                                            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 14px' }}>Points history</h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {loyalty.history.map(entry => (
                                                    <div key={entry.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                                                        <div>
                                                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', margin: 0 }}>{entry.note || entry.type}</p>
                                                            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>{new Date(entry.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                        </div>
                                                        <span style={{ fontSize: '14px', fontWeight: 800, color: entry.points > 0 ? '#059669' : '#dc2626' }}>
                                                            {entry.points > 0 ? '+' : ''}{entry.points}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ background: 'white', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
                                    <Gift size={40} color="#e2e8f0" style={{ marginBottom: '12px' }} />
                                    <p style={{ color: '#64748b', fontSize: '14px' }}>No loyalty data available</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── TICKETS TAB ── */}
                    {activeTab === 'tickets' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* New Ticket Button */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Support Tickets</h2>
                                <button onClick={() => setShowNewTicket(v => !v)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white', border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(124,58,237,0.3)' }}>
                                    <Plus size={14} /> New Ticket
                                </button>
                            </div>

                            {/* New Ticket Form */}
                            {showNewTicket && (
                                <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px' }}>Open New Support Ticket</h3>
                                    {ticketMsg && <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px', background: ticketMsg.ok ? '#ecfdf5' : '#fef2f2', color: ticketMsg.ok ? '#059669' : '#dc2626', border: `1px solid ${ticketMsg.ok ? '#a7f3d0' : '#fca5a5'}` }}>{ticketMsg.text}</div>}
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                        <div style={{ gridColumn: '1/-1' }}>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Subject</label>
                                            <input value={newTicketForm.subject} onChange={e => setNewTicketForm(p => ({ ...p, subject: e.target.value }))}
                                                placeholder="Brief description of your issue"
                                                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Category</label>
                                            <select value={newTicketForm.category} onChange={e => setNewTicketForm(p => ({ ...p, category: e.target.value }))}
                                                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#1e293b', outline: 'none', background: 'white' }}>
                                                {['general','order','payment','return','product','other'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Order ID (optional)</label>
                                            <input value={newTicketForm.order_id} onChange={e => setNewTicketForm(p => ({ ...p, order_id: e.target.value }))}
                                                placeholder="e.g. 42"
                                                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }} />
                                        </div>
                                        <div style={{ gridColumn: '1/-1' }}>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>Message</label>
                                            <textarea value={newTicketForm.message} onChange={e => setNewTicketForm(p => ({ ...p, message: e.target.value }))}
                                                placeholder="Describe your issue in detail…"
                                                rows={4}
                                                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#1e293b', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={async () => {
                                            setTicketMsg(null);
                                            if (!newTicketForm.subject.trim() || !newTicketForm.message.trim()) {
                                                return setTicketMsg({ ok: false, text: 'Subject and message are required' });
                                            }
                                            try {
                                                await api.post('/tickets', newTicketForm);
                                                setTicketMsg({ ok: true, text: 'Ticket created! We\'ll respond within 24 hours.' });
                                                setNewTicketForm({ subject: '', category: 'general', message: '', order_id: '' });
                                                const r = await api.get('/tickets');
                                                setTickets(r.data || []);
                                                setTimeout(() => { setShowNewTicket(false); setTicketMsg(null); }, 2000);
                                            } catch (err) {
                                                setTicketMsg({ ok: false, text: err.response?.data?.message || 'Failed to create ticket' });
                                            }
                                        }} style={{ padding: '9px 20px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                                            Submit Ticket
                                        </button>
                                        <button onClick={() => { setShowNewTicket(false); setTicketMsg(null); }}
                                            style={{ padding: '9px 20px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Ticket List */}
                            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
                                {ticketsLoading ? (
                                    <div style={{ textAlign: 'center', padding: '32px' }}>
                                        <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #e2e8f0', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                    </div>
                                ) : tickets.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px' }}>
                                        <MessageCircle size={36} color="#e2e8f0" style={{ marginBottom: '12px' }} />
                                        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>No support tickets yet</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {tickets.map(ticket => {
                                            const statusCfg = { open: { bg:'#eff6ff', color:'#2563eb', label:'Open' }, in_progress: { bg:'#fffbeb', color:'#d97706', label:'In Progress' }, resolved: { bg:'#ecfdf5', color:'#059669', label:'Resolved' }, closed: { bg:'#f1f5f9', color:'#64748b', label:'Closed' } }[ticket.status] || { bg:'#f1f5f9', color:'#64748b', label:ticket.status };
                                            const priorityCfg = { high: '#dc2626', medium: '#d97706', low: '#64748b' }[ticket.priority] || '#64748b';
                                            const isOpen = openTicket === ticket.id;
                                            return (
                                                <div key={ticket.id} style={{ border: '1px solid #f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                                                    <div onClick={() => {
                                                        if (isOpen) { setOpenTicket(null); setTicketMessages([]); return; }
                                                        setOpenTicket(ticket.id);
                                                        api.get(`/tickets/${ticket.id}`).then(r => setTicketMessages(r.data.messages || [])).catch(() => {});
                                                    }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: '#f8fafc', cursor: 'pointer' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                                        onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                                                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>#{ticket.id}</span>
                                                                <span style={{ padding: '2px 8px', borderRadius: '9999px', fontSize: '10px', fontWeight: 700, background: statusCfg.bg, color: statusCfg.color }}>{statusCfg.label}</span>
                                                                <span style={{ fontSize: '10px', fontWeight: 700, color: priorityCfg, textTransform: 'uppercase' }}>{ticket.priority}</span>
                                                            </div>
                                                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', margin: 0 }}>{ticket.subject}</p>
                                                            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>{ticket.category} · {new Date(ticket.updated_at).toLocaleDateString('en-IN')}</p>
                                                        </div>
                                                        <span style={{ color: '#94a3b8' }}>{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                                                    </div>
                                                    {isOpen && (
                                                        <div style={{ padding: '14px', background: 'white', borderTop: '1px solid #f1f5f9' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto', marginBottom: '12px' }}>
                                                                {ticketMessages.map(msg => (
                                                                    <div key={msg.id} style={{ display: 'flex', justifyContent: msg.is_admin ? 'flex-start' : 'flex-end' }}>
                                                                        <div style={{ maxWidth: '80%', padding: '8px 12px', borderRadius: '10px', background: msg.is_admin ? '#f1f5f9' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: msg.is_admin ? '#1e293b' : 'white' }}>
                                                                            <p style={{ fontSize: '11px', fontWeight: 700, margin: '0 0 3px', opacity: 0.75 }}>{msg.is_admin ? 'Support Team' : 'You'}</p>
                                                                            <p style={{ fontSize: '13px', margin: 0, lineHeight: 1.4 }}>{msg.body}</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            {ticket.status !== 'closed' && (
                                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                                    <input value={replyBody} onChange={e => setReplyBody(e.target.value)}
                                                                        placeholder="Type a reply…"
                                                                        onKeyDown={async (e) => {
                                                                            if (e.key === 'Enter' && replyBody.trim()) {
                                                                                await api.post(`/tickets/${ticket.id}/messages`, { body: replyBody }).catch(() => {});
                                                                                const r = await api.get(`/tickets/${ticket.id}`);
                                                                                setTicketMessages(r.data.messages || []);
                                                                                setReplyBody('');
                                                                            }
                                                                        }}
                                                                        style={{ flex: 1, padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none', color: '#1e293b' }} />
                                                                    <button onClick={async () => {
                                                                        if (!replyBody.trim()) return;
                                                                        await api.post(`/tickets/${ticket.id}/messages`, { body: replyBody }).catch(() => {});
                                                                        const r = await api.get(`/tickets/${ticket.id}`);
                                                                        setTicketMessages(r.data.messages || []);
                                                                        setReplyBody('');
                                                                    }} style={{ padding: '9px 14px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                                                        <Send size={14} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── ORDERS TAB ── */}
                    {activeTab === 'orders' && (
                        <div>
                            <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '24px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Package size={18} style={{ color: '#3b82f6' }} />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>My Orders</h2>
                                        {orders.length > 0 && <p style={{ fontSize: '12px', color: '#94a3b8', margin: '1px 0 0' }}>{orders.length} order{orders.length !== 1 ? 's' : ''} placed</p>}
                                    </div>
                                </div>

                                {ordersLoading ? (
                                    <div style={{ textAlign: 'center', padding: '48px 0' }}>
                                        <div style={{ display: 'inline-block', width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                        <p style={{ color: '#94a3b8', marginTop: '12px', fontSize: '13px' }}>Loading your orders...</p>
                                    </div>
                                ) : orders.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '56px 0' }}>
                                        <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                            <ShoppingBag size={32} style={{ color: '#bfdbfe' }} />
                                        </div>
                                        <p style={{ fontSize: '16px', fontWeight: 700, color: '#374151', margin: '0 0 8px' }}>No orders yet</p>
                                        <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 20px' }}>Start shopping to see your orders here</p>
                                        <button onClick={() => navigate('/')}
                                            style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>
                                            Shop Now
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {orders.map(order => {
                                            const status = statusStyle(order.status);
                                            return (
                                                <div key={order.id} style={{ border: '1px solid #f1f5f9', borderRadius: '12px', overflow: 'hidden', transition: 'box-shadow 0.2s' }}
                                                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                                                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                                                    {/* Order Header */}
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '10px' }}>
                                                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <Package size={13} style={{ color: '#3b82f6' }} />
                                                                </div>
                                                                <div>
                                                                    <p style={{ fontSize: '10px', color: '#94a3b8', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order</p>
                                                                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', margin: 0 }}>#{order.id}</p>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <Calendar size={13} style={{ color: '#d97706' }} />
                                                                </div>
                                                                <div>
                                                                    <p style={{ fontSize: '10px', color: '#94a3b8', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</p>
                                                                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                                                                        {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <CreditCard size={13} style={{ color: '#7c3aed' }} />
                                                                </div>
                                                                <div>
                                                                    <p style={{ fontSize: '10px', color: '#94a3b8', margin: 0, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment</p>
                                                                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', margin: 0 }}>{order.payment_method || 'UPI'}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <span style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>
                                                                ₹{parseFloat(order.total).toLocaleString('en-IN')}
                                                            </span>
                                                            <span style={{ padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700, background: status.bg, color: status.color }}>
                                                                {order.status}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Order Body */}
                                                    <div style={{ padding: '12px 16px', background: 'white' }}>
                                                        <p style={{ fontSize: '13px', color: '#64748b', margin: 0, display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                                            <ShoppingBag size={14} style={{ color: '#94a3b8', flexShrink: 0, marginTop: '1px' }} />
                                                            <span><span style={{ fontWeight: 600, color: '#374151' }}>Items: </span>{order.items_summary || 'Details unavailable'}</span>
                                                        </p>
                                                        {order.address && (
                                                            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <MapPin size={12} style={{ flexShrink: 0 }} />
                                                                {order.address}
                                                            </p>
                                                        )}
                                                        {order.tracking_token && (
                                                            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
                                                                    <Truck size={13} style={{ color: '#E85D04' }} />
                                                                    <span>
                                                                        {order.delivery_status
                                                                            ? order.delivery_status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                                                                            : 'Dispatched'}
                                                                    </span>
                                                                    {order.estimated_delivery && (
                                                                        <span style={{ color: '#94a3b8' }}>
                                                                            · ETA {new Date(order.estimated_delivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <Link to={`/track/${order.tracking_token}`}
                                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 14px', background: 'linear-gradient(135deg, #E85D04, #FB8500)', color: 'white', borderRadius: '7px', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>
                                                                    <Truck size={12} /> Track Order
                                                                </Link>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default UserProfile;
