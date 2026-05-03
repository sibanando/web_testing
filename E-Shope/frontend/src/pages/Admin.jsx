import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import useResponsive from '../hooks/useResponsive';
import {
    Plus, Package, BarChart2, ShoppingBag, Users,
    Trash2, LogOut, Home, UserCheck, Pencil, X, Eye, EyeOff,
    Shield, TrendingUp, Search, RefreshCw, Truck, RotateCcw, Activity, MapPin
} from 'lucide-react';

const inputStyle = {
    width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px',
    padding: '9px 12px', fontSize: '13px', outline: 'none',
    background: 'white', boxSizing: 'border-box', color: '#1e293b',
    transition: 'border-color 0.2s',
};

const labelStyle = {
    fontSize: '12px', fontWeight: 600, color: '#475569',
    marginBottom: '5px', display: 'block', letterSpacing: '0.2px',
};

const DELIVERY_STATUS = {
    assigned:           { label: 'Assigned',         color: '#2563eb', bg: '#eff6ff' },
    reached_pickup:     { label: 'At Pickup',        color: '#d97706', bg: '#fffbeb' },
    picked_up:          { label: 'Picked Up',        color: '#7c3aed', bg: '#f5f3ff' },
    out_for_delivery:   { label: 'Out for Delivery', color: '#0891b2', bg: '#ecfeff' },
    near_location:      { label: 'Near Location',   color: '#059669', bg: '#ecfdf5' },
    delivered:          { label: 'Delivered',        color: '#16a34a', bg: '#f0fdf4' },
    delivery_attempted: { label: 'Attempt Failed',  color: '#dc2626', bg: '#fef2f2' },
    rto_initiated:      { label: 'Returning',        color: '#9f1239', bg: '#fff1f2' },
};

const RETURN_STATUS = {
    requested:        { label: 'Pending',   color: '#d97706', bg: '#fffbeb' },
    approved:         { label: 'Approved',  color: '#059669', bg: '#ecfdf5' },
    rejected:         { label: 'Rejected',  color: '#dc2626', bg: '#fef2f2' },
    refund_processed: { label: 'Refunded',  color: '#7c3aed', bg: '#f5f3ff' },
};

const EVENT_COLOR = {
    product_view:   { color: '#2563eb', bg: '#eff6ff' },
    add_to_cart:    { color: '#7c3aed', bg: '#f5f3ff' },
    checkout_start: { color: '#d97706', bg: '#fffbeb' },
};

const Modal = ({ title, onClose, children }) => (
    <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
    }}>
        <div style={{
            background: 'white', borderRadius: '16px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            width: '100%', maxWidth: '480px', margin: '0 16px',
            overflow: 'hidden',
        }}>
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            }}>
                <h3 style={{ fontWeight: 700, color: 'white', fontSize: '14px', margin: 0 }}>{title}</h3>
                <button onClick={onClose} style={{
                    color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.1)',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                    borderRadius: '8px', padding: '5px',
                }}><X size={16} /></button>
            </div>
            <div style={{ padding: '20px' }}>{children}</div>
        </div>
    </div>
);

const StatCard = ({ label, value, icon, color, bg }) => (
    <div style={{
        background: 'white', borderRadius: '14px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        padding: '20px', display: 'flex', alignItems: 'center', gap: '14px',
        borderLeft: `4px solid ${color}`,
        transition: 'transform 0.2s, box-shadow 0.2s',
    }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.06)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)'; }}
    >
        <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
            <span style={{ color }}>{icon}</span>
        </div>
        <div>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 3px', fontWeight: 500 }}>{label}</p>
            <p style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1 }}>{value}</p>
        </div>
    </div>
);

const StatusBadge = ({ status, map }) => {
    const cfg = map[status] || { label: status, color: '#64748b', bg: '#f1f5f9' };
    return (
        <span style={{
            fontSize: '11px', padding: '3px 9px', borderRadius: '9999px',
            fontWeight: 700, background: cfg.bg, color: cfg.color,
        }}>{cfg.label}</span>
    );
};

const Admin = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { isMobile, isTablet } = useResponsive();
    const [activeTab, setActiveTab] = useState('products');

    // ── Products ──────────────────────────────────────────────────────────────
    const [products, setProducts] = useState([]);
    const [newProduct, setNewProduct] = useState({
        name: '', price: '', description: '',
        category: 'Electronics', image: '', discount: 20, stock: 100
    });
    const [submitted, setSubmitted] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [editProduct, setEditProduct] = useState(null);
    const [editProductData, setEditProductData] = useState({});

    // ── Users ─────────────────────────────────────────────────────────────────
    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [editUserData, setEditUserData] = useState({});
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [userAuthFilter, setUserAuthFilter] = useState('all');

    // ── Deliveries ────────────────────────────────────────────────────────────
    const [agents, setAgents] = useState([]);
    const [deliveries, setDeliveries] = useState([]);
    const [allOrders, setAllOrders] = useState([]);
    const [newAgent, setNewAgent] = useState({ name: '', phone: '', email: '', password: '' });
    const [assignForm, setAssignForm] = useState({ order_id: '', agent_id: '', estimated_delivery: '' });
    const [deliveryMsg, setDeliveryMsg] = useState({ text: '', ok: true });

    // ── Returns ───────────────────────────────────────────────────────────────
    const [returns, setReturns] = useState([]);
    const [returnsLoading, setReturnsLoading] = useState(false);
    const [reviewingReturn, setReviewingReturn] = useState(null);
    const [returnDecision, setReturnDecision] = useState({ status: '', admin_note: '' });

    // ── Analytics ─────────────────────────────────────────────────────────────
    const [analytics, setAnalytics] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    // ── CRM ───────────────────────────────────────────────────────────────────
    const [crmSegments, setCrmSegments] = useState(null);
    const [crmLoading, setCrmLoading] = useState(false);
    const [adminTickets, setAdminTickets] = useState([]);
    const [ticketsLoading, setTicketsLoading] = useState(false);
    const [openTicket, setOpenTicket] = useState(null);
    const [ticketMessages, setTicketMessages] = useState([]);
    const [adminReply, setAdminReply] = useState('');
    const [ticketFilter, setTicketFilter] = useState('');
    const [adminReviews, setAdminReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [loyaltyOverview, setLoyaltyOverview] = useState(null);
    const [loyaltyLoading, setLoyaltyLoading] = useState(false);
    const [loyaltyAdjust, setLoyaltyAdjust] = useState({ user_id: '', points: '', note: '' });
    const [crmActiveTab, setCrmActiveTab] = useState('segments');

    // ── Init ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        if (!user.is_admin) { navigate('/'); return; }
        fetchProducts();
    }, [user]);

    useEffect(() => {
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'deliveries') { fetchAgents(); fetchDeliveries(); fetchAllOrders(); }
        if (activeTab === 'returns') fetchReturns();
        if (activeTab === 'analytics') fetchAnalytics();
        if (activeTab === 'crm') { fetchCrmSegments(); fetchAdminTickets(); fetchAdminReviews(); fetchLoyaltyOverview(); }
    }, [activeTab]);

    // ── Fetch helpers ─────────────────────────────────────────────────────────
    const fetchProducts = async () => {
        try { const r = await api.get('/products'); setProducts(Array.isArray(r.data) ? r.data : []); }
        catch (e) { console.error(e); }
    };

    const fetchUsers = async () => {
        setUsersLoading(true);
        try { const r = await api.get('/admin/users'); setUsers(Array.isArray(r.data) ? r.data : []); }
        catch (e) { console.error(e); }
        finally { setUsersLoading(false); }
    };

    const fetchAgents = async () => {
        try { const r = await api.get('/delivery/agents'); setAgents(Array.isArray(r.data) ? r.data : []); }
        catch (e) { console.error(e); }
    };

    const fetchDeliveries = async () => {
        try { const r = await api.get('/delivery/'); setDeliveries(Array.isArray(r.data) ? r.data : []); }
        catch (e) { console.error(e); }
    };

    const fetchAllOrders = async () => {
        try { const r = await api.get('/admin/orders'); setAllOrders(Array.isArray(r.data) ? r.data : []); }
        catch (e) { console.error(e); }
    };

    const fetchReturns = async () => {
        setReturnsLoading(true);
        try { const r = await api.get('/returns'); setReturns(Array.isArray(r.data) ? r.data : []); }
        catch (e) { console.error(e); }
        finally { setReturnsLoading(false); }
    };

    const fetchAnalytics = async () => {
        setAnalyticsLoading(true);
        try { const r = await api.get('/track/analytics'); setAnalytics(r.data); }
        catch (e) { console.error(e); }
        finally { setAnalyticsLoading(false); }
    };

    const fetchCrmSegments = async () => {
        setCrmLoading(true);
        try { const r = await api.get('/admin/crm/segments'); setCrmSegments(r.data); }
        catch (e) { console.error(e); }
        finally { setCrmLoading(false); }
    };

    const fetchAdminTickets = async () => {
        setTicketsLoading(true);
        try { const r = await api.get('/tickets/admin/all'); setAdminTickets(Array.isArray(r.data) ? r.data : []); }
        catch (e) { console.error(e); }
        finally { setTicketsLoading(false); }
    };

    const fetchAdminReviews = async () => {
        setReviewsLoading(true);
        try { const r = await api.get('/reviews/admin/all'); setAdminReviews(Array.isArray(r.data) ? r.data : []); }
        catch (e) { console.error(e); }
        finally { setReviewsLoading(false); }
    };

    const fetchLoyaltyOverview = async () => {
        setLoyaltyLoading(true);
        try { const r = await api.get('/loyalty/admin/overview'); setLoyaltyOverview(r.data); }
        catch (e) { console.error(e); }
        finally { setLoyaltyLoading(false); }
    };

    // ── Product handlers ──────────────────────────────────────────────────────
    const handleCreateProduct = async (e) => {
        e.preventDefault();
        try {
            let imageUrl = newProduct.image || 'https://via.placeholder.com/400x400?text=Product';
            if (imageFile) {
                const fd = new FormData();
                fd.append('image', imageFile);
                const u = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                imageUrl = u.data.url;
            }
            await api.post('/products', {
                name: newProduct.name, price: parseFloat(newProduct.price),
                description: newProduct.description, category: newProduct.category,
                images: JSON.stringify([imageUrl]),
                discount: parseInt(newProduct.discount) || 0, stock: parseInt(newProduct.stock) || 100,
            });
            setSubmitted(true);
            setTimeout(() => setSubmitted(false), 3000);
            setNewProduct({ name: '', price: '', description: '', category: 'Electronics', image: '', discount: 20, stock: 100 });
            setImageFile(null);
            fetchProducts();
        } catch (e) { alert('Error: ' + (e.response?.data?.message || e.message)); }
    };

    const handleDeleteProduct = async (id, name) => {
        if (!window.confirm(`Delete "${name}"?`)) return;
        try { await api.delete(`/admin/products/${id}`); setProducts(p => p.filter(x => x.id !== id)); }
        catch (e) { alert('Delete failed: ' + (e.response?.data?.message || e.message)); }
    };

    const openEditProduct = (p) => {
        const img = (() => { try { return JSON.parse(p.images)[0]; } catch { return ''; } })();
        setEditProductData({ name: p.name, price: p.price, description: p.description || '', category: p.category, image: img, discount: p.discount, stock: p.stock });
        setEditProduct(p);
    };

    const handleSaveProduct = async () => {
        try {
            await api.put(`/admin/products/${editProduct.id}`, {
                name: editProductData.name, price: parseFloat(editProductData.price),
                description: editProductData.description, category: editProductData.category,
                images: JSON.stringify([editProductData.image || 'https://via.placeholder.com/400x400?text=Product']),
                discount: parseInt(editProductData.discount) || 0, stock: parseInt(editProductData.stock) || 0,
            });
            setEditProduct(null); fetchProducts();
        } catch (e) { alert('Save failed: ' + (e.response?.data?.message || e.message)); }
    };

    // ── User handlers ─────────────────────────────────────────────────────────
    const handleDeleteUser = async (id, name) => {
        if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
        try { await api.delete(`/admin/users/${id}`); setUsers(u => u.filter(x => x.id !== id)); }
        catch (e) { alert('Delete failed: ' + (e.response?.data?.message || e.message)); }
    };

    const openEditUser = (u) => {
        setEditUserData({ name: u.name, email: u.email, password: '', is_seller: u.is_seller || 0 });
        setShowNewPassword(false); setEditUser(u);
    };

    const handleSaveUser = async () => {
        try {
            await api.put(`/admin/users/${editUser.id}`, { name: editUserData.name, email: editUserData.email, password: editUserData.password || '', is_seller: editUserData.is_seller });
            setEditUser(null); fetchUsers();
        } catch (e) { alert('Save failed: ' + (e.response?.data?.message || e.message)); }
    };

    // ── Delivery handlers ─────────────────────────────────────────────────────
    const handleCreateAgent = async (e) => {
        e.preventDefault();
        try {
            await api.post('/delivery/agents', newAgent);
            setNewAgent({ name: '', phone: '', email: '', password: '' });
            fetchAgents();
            setDeliveryMsg({ text: 'Agent created successfully', ok: true });
        } catch (e) {
            setDeliveryMsg({ text: e.response?.data?.message || 'Failed to create agent', ok: false });
        }
        setTimeout(() => setDeliveryMsg({ text: '', ok: true }), 4000);
    };

    const handleAssignDelivery = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.post('/delivery/assign', {
                order_id: parseInt(assignForm.order_id),
                agent_id: parseInt(assignForm.agent_id),
                estimated_delivery: assignForm.estimated_delivery || undefined,
            });
            setAssignForm({ order_id: '', agent_id: '', estimated_delivery: '' });
            setDeliveryMsg({ text: `Assigned! Tracking token: ${data.tracking_token}`, ok: true });
            fetchDeliveries(); fetchAllOrders();
        } catch (e) {
            setDeliveryMsg({ text: e.response?.data?.message || 'Assignment failed', ok: false });
        }
        setTimeout(() => setDeliveryMsg({ text: '', ok: true }), 5000);
    };

    // ── Return handlers ───────────────────────────────────────────────────────
    const openReturnReview = (r) => {
        setReturnDecision({ status: '', admin_note: '', refund_amount: r.refund_amount });
        setReviewingReturn(r);
    };

    const handleReturnDecision = async () => {
        if (!returnDecision.status) return;
        try {
            await api.patch(`/returns/${reviewingReturn.id}`, returnDecision);
            setReviewingReturn(null);
            fetchReturns();
        } catch (e) { alert(e.response?.data?.message || 'Failed'); }
    };

    // ── Derived data ──────────────────────────────────────────────────────────
    const filteredProducts = products.filter(p =>
        p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.category?.toLowerCase().includes(productSearch.toLowerCase())
    );

    const filteredUsers = users.filter(u => {
        const ok = u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.email?.toLowerCase().includes(userSearch.toLowerCase());
        if (!ok) return false;
        if (userAuthFilter === 'google') return u.oauth_provider === 'google';
        if (userAuthFilter === 'microsoft') return u.oauth_provider === 'microsoft';
        if (userAuthFilter === 'phone') return !u.oauth_provider && !u.email;
        if (userAuthFilter === 'email') return !u.oauth_provider && !!u.email;
        return true;
    });

    const assignedOrderIds = new Set(deliveries.map(d => d.order_id));
    const unassignedOrders = allOrders.filter(o =>
        ['Paid', 'Processing', 'Pending'].includes(o.status) && !assignedOrderIds.has(o.id)
    );

    const pendingReturns = returns.filter(r => r.status === 'requested').length;
    const totalValue = products.reduce((s, p) => s + parseFloat(p.price || 0), 0);
    const categories = [...new Set(products.map(p => p.category))];
    const catList = ['Electronics', 'Fashion', 'Mobiles', 'Home', 'Appliances', 'Sports', 'Beauty', 'Books'];
    const stockColor = s => s > 50 ? '#16a34a' : s > 10 ? '#d97706' : '#dc2626';
    const stockBg = s => s > 50 ? '#f0fdf4' : s > 10 ? '#fffbeb' : '#fef2f2';

    // Tab-aware stat cards
    const tabStats = (() => {
        if (activeTab === 'deliveries') return [
            { label: 'Total Deliveries', value: deliveries.length, icon: <Truck size={22} />, color: '#0891b2', bg: '#ecfeff' },
            { label: 'Active', value: deliveries.filter(d => !['delivered', 'rto_initiated'].includes(d.status)).length, icon: <MapPin size={22} />, color: '#f59e0b', bg: '#fffbeb' },
            { label: 'Delivered', value: deliveries.filter(d => d.status === 'delivered').length, icon: <TrendingUp size={22} />, color: '#10b981', bg: '#ecfdf5' },
            { label: 'Agents', value: agents.length, icon: <UserCheck size={22} />, color: '#8b5cf6', bg: '#f5f3ff' },
        ];
        if (activeTab === 'returns') return [
            { label: 'Total Returns', value: returns.length, icon: <RotateCcw size={22} />, color: '#3b82f6', bg: '#eff6ff' },
            { label: 'Pending', value: pendingReturns, icon: <Activity size={22} />, color: '#f59e0b', bg: '#fffbeb' },
            { label: 'Approved', value: returns.filter(r => r.status === 'approved').length, icon: <TrendingUp size={22} />, color: '#10b981', bg: '#ecfdf5' },
            { label: 'Refund Processed', value: returns.filter(r => r.status === 'refund_processed').length, icon: <ShoppingBag size={22} />, color: '#8b5cf6', bg: '#f5f3ff' },
        ];
        if (activeTab === 'analytics' && analytics) return [
            { label: 'Product Views (30d)', value: Number(analytics.funnel?.product_views || 0).toLocaleString(), icon: <Activity size={22} />, color: '#3b82f6', bg: '#eff6ff' },
            { label: 'Cart Adds (30d)', value: Number(analytics.funnel?.add_to_cart || 0).toLocaleString(), icon: <ShoppingBag size={22} />, color: '#8b5cf6', bg: '#f5f3ff' },
            { label: 'Checkouts (30d)', value: Number(analytics.funnel?.checkout_starts || 0).toLocaleString(), icon: <TrendingUp size={22} />, color: '#f59e0b', bg: '#fffbeb' },
            { label: 'Orders (30d)', value: Number(analytics.funnel?.orders || 0).toLocaleString(), icon: <Package size={22} />, color: '#10b981', bg: '#ecfdf5' },
        ];
        return [
            { label: 'Total Products', value: products.length, icon: <Package size={22} />, color: '#3b82f6', bg: '#eff6ff' },
            { label: 'Categories', value: categories.length, icon: <BarChart2 size={22} />, color: '#10b981', bg: '#ecfdf5' },
            { label: 'Inventory Value', value: `₹${totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: <TrendingUp size={22} />, color: '#f59e0b', bg: '#fffbeb' },
            { label: 'Registered Users', value: users.length || '—', icon: <UserCheck size={22} />, color: '#8b5cf6', bg: '#f5f3ff' },
        ];
    })();

    const navItems = [
        { id: 'products', label: 'Products', icon: <Package size={16} />, count: products.length },
        { id: 'users', label: 'Users', icon: <Users size={16} />, count: users.length || null },
        { id: 'deliveries', label: 'Deliveries', icon: <Truck size={16} />, count: deliveries.length || null },
        { id: 'returns', label: 'Returns', icon: <RotateCcw size={16} />, count: pendingReturns || null },
        { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={16} /> },
        { id: 'crm', label: 'CRM', icon: <UserCheck size={16} />, count: adminTickets.filter(t => t.status === 'open').length || null },
    ];

    const pageTitle = { products: 'Product Catalogue', users: 'User Management', deliveries: 'Delivery Management', returns: 'Returns & Refunds', analytics: 'Analytics', crm: 'CRM Dashboard' }[activeTab] || '';
    const pageSubtitle = {
        products: `${filteredProducts.length} of ${products.length} products`,
        users: `${filteredUsers.length} of ${users.length} users`,
        deliveries: `${deliveries.length} deliveries · ${unassignedOrders.length} orders awaiting assignment`,
        returns: `${pendingReturns} pending review`,
        analytics: 'Last 30 days',
        crm: 'Customer segments · tickets · reviews · loyalty',
    }[activeTab] || '';

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>

            {/* ── Modals ────────────────────────────────────────────── */}

            {editProduct && (
                <Modal title={`Edit Product — ${editProduct.name}`} onClose={() => setEditProduct(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div><label style={labelStyle}>Product Name</label>
                            <input value={editProductData.name} onChange={e => setEditProductData({ ...editProductData, name: e.target.value })} style={inputStyle} /></div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1 }}><label style={labelStyle}>Price (₹)</label>
                                <input type="number" value={editProductData.price} onChange={e => setEditProductData({ ...editProductData, price: e.target.value })} style={inputStyle} /></div>
                            <div style={{ flex: 1 }}><label style={labelStyle}>Discount %</label>
                                <input type="number" value={editProductData.discount} onChange={e => setEditProductData({ ...editProductData, discount: e.target.value })} style={inputStyle} /></div>
                            <div style={{ flex: 1 }}><label style={labelStyle}>Stock</label>
                                <input type="number" value={editProductData.stock} onChange={e => setEditProductData({ ...editProductData, stock: e.target.value })} style={inputStyle} /></div>
                        </div>
                        <div><label style={labelStyle}>Category</label>
                            <select value={editProductData.category} onChange={e => setEditProductData({ ...editProductData, category: e.target.value })} style={inputStyle}>
                                {catList.map(c => <option key={c}>{c}</option>)}
                            </select></div>
                        <div><label style={labelStyle}>Description</label>
                            <textarea value={editProductData.description} onChange={e => setEditProductData({ ...editProductData, description: e.target.value })} style={{ ...inputStyle, resize: 'none' }} rows={2} /></div>
                        <div><label style={labelStyle}>Image URL</label>
                            <input value={editProductData.image} onChange={e => setEditProductData({ ...editProductData, image: e.target.value })} style={inputStyle} /></div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <button onClick={handleSaveProduct} style={{ flex: 1, padding: '10px', fontWeight: 700, fontSize: '13px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', cursor: 'pointer' }}>Save Changes</button>
                            <button onClick={() => setEditProduct(null)} style={{ flex: 1, padding: '10px', fontWeight: 600, fontSize: '13px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', border: 'none', cursor: 'pointer' }}>Cancel</button>
                        </div>
                    </div>
                </Modal>
            )}

            {editUser && (
                <Modal title={`Edit User — ${editUser.name}`} onClose={() => setEditUser(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div><label style={labelStyle}>Full Name</label>
                            <input value={editUserData.name} onChange={e => setEditUserData({ ...editUserData, name: e.target.value })} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Email</label>
                            <input type="email" value={editUserData.email} onChange={e => setEditUserData({ ...editUserData, email: e.target.value })} style={inputStyle} /></div>
                        <div>
                            <label style={labelStyle}>New Password <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '11px' }}>(leave blank to keep current)</span></label>
                            <div style={{ position: 'relative' }}>
                                <input type={showNewPassword ? 'text' : 'password'} placeholder="Enter new password to reset..."
                                    value={editUserData.password} onChange={e => setEditUserData({ ...editUserData, password: e.target.value })}
                                    style={{ ...inputStyle, paddingRight: '36px' }} />
                                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                                    {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                            {editUserData.password && <p style={{ fontSize: '11px', color: '#f97316', marginTop: '4px' }}>Password will be updated on save</p>}
                        </div>
                        <div>
                            <label style={labelStyle}>Role</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {[{ v: 0, l: 'Customer', ac: '#6366f1' }, { v: 1, l: 'Seller', ac: '#10b981' }].map(({ v, l, ac }) => (
                                    <button key={v} type="button" onClick={() => setEditUserData({ ...editUserData, is_seller: v })}
                                        style={{ flex: 1, padding: '9px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', border: '2px solid', borderColor: editUserData.is_seller === v ? ac : '#e2e8f0', background: editUserData.is_seller === v ? '#f0f9ff' : 'white', color: editUserData.is_seller === v ? ac : '#94a3b8' }}>
                                        {l}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <button onClick={handleSaveUser} style={{ flex: 1, padding: '10px', fontWeight: 700, fontSize: '13px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', cursor: 'pointer' }}>Save Changes</button>
                            <button onClick={() => setEditUser(null)} style={{ flex: 1, padding: '10px', fontWeight: 600, fontSize: '13px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', border: 'none', cursor: 'pointer' }}>Cancel</button>
                        </div>
                    </div>
                </Modal>
            )}

            {reviewingReturn && (
                <Modal title={`Review Return #${reviewingReturn.id} — Order #${reviewingReturn.order_id}`} onClose={() => setReviewingReturn(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                            <div><strong>Customer:</strong> {reviewingReturn.user_name}</div>
                            <div><strong>Items:</strong> {reviewingReturn.items}</div>
                            <div><strong>Reason:</strong> {reviewingReturn.reason}</div>
                            <div><strong>Refund Amount:</strong> ₹{parseFloat(reviewingReturn.refund_amount || 0).toLocaleString('en-IN')}</div>
                        </div>
                        <div>
                            <label style={labelStyle}>Decision</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {[['approved', '#059669'], ['rejected', '#dc2626'], ['refund_processed', '#7c3aed']].map(([s, ac]) => (
                                    <button key={s} type="button" onClick={() => setReturnDecision(d => ({ ...d, status: s }))}
                                        style={{ flex: 1, padding: '9px', fontSize: '11px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', border: '2px solid', borderColor: returnDecision.status === s ? ac : '#e2e8f0', background: returnDecision.status === s ? '#f8fafc' : 'white', color: returnDecision.status === s ? ac : '#94a3b8' }}>
                                        {s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Admin Note <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span></label>
                            <textarea value={returnDecision.admin_note} onChange={e => setReturnDecision(d => ({ ...d, admin_note: e.target.value }))}
                                placeholder="Note visible to customer..." style={{ ...inputStyle, resize: 'none' }} rows={2} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <button onClick={handleReturnDecision} disabled={!returnDecision.status}
                                style={{ flex: 1, padding: '10px', fontWeight: 700, fontSize: '13px', borderRadius: '8px', border: 'none', cursor: returnDecision.status ? 'pointer' : 'default', background: returnDecision.status ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#e2e8f0', color: returnDecision.status ? 'white' : '#94a3b8' }}>
                                Submit Decision
                            </button>
                            <button onClick={() => setReviewingReturn(null)} style={{ flex: 1, padding: '10px', fontWeight: 600, fontSize: '13px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', border: 'none', cursor: 'pointer' }}>Cancel</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ── Mobile top nav ─────────────────────────────────────── */}
            {isMobile && (
                <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', position: 'sticky', top: 0, zIndex: 50 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Shield size={15} color="white" />
                            </div>
                            <span style={{ color: 'white', fontWeight: 800, fontSize: '14px' }}>Admin Portal</span>
                        </div>
                        <button onClick={() => { logout(); navigate('/'); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: '8px', padding: '6px 10px', color: '#f87171', cursor: 'pointer', fontSize: '12px' }}>
                            <LogOut size={13} /> Out
                        </button>
                    </div>
                    <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        {navItems.map(tab => {
                            const active = activeTab === tab.id;
                            return (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '8px 14px', border: 'none', borderBottom: active ? '2px solid #818cf8' : '2px solid transparent', background: 'transparent', cursor: 'pointer', color: active ? '#818cf8' : 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: active ? 700 : 400, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                    <span style={{ color: active ? '#818cf8' : 'rgba(255,255,255,0.3)' }}>{tab.icon}</span>
                                    {tab.label}
                                    {tab.count > 0 && <span style={{ position: 'absolute', marginTop: '-18px', marginLeft: '18px', width: '14px', height: '14px', background: '#ef4444', color: 'white', borderRadius: '50%', fontSize: '8px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{tab.count}</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Sidebar (desktop) ─────────────────────────────────── */}
            <div style={{ width: '240px', flexShrink: 0, background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)', display: isMobile ? 'none' : 'flex', flexDirection: 'column', minHeight: '100vh', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }}>
                            <Shield size={18} color="white" />
                        </div>
                        <div>
                            <p style={{ color: 'white', fontWeight: 800, fontSize: '14px', margin: 0, letterSpacing: '-0.3px' }}>Admin Portal</p>
                            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', margin: 0, letterSpacing: '0.5px' }}>ApniDunia</p>
                        </div>
                    </div>
                    <div style={{ marginTop: '14px', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: 'white', flexShrink: 0 }}>
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <p style={{ color: 'white', fontWeight: 600, fontSize: '12px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
                            <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '9999px', background: 'rgba(99,102,241,0.25)', color: '#a5b4fc', fontWeight: 600 }}>Administrator</span>
                        </div>
                    </div>
                </div>

                <div style={{ flex: 1, padding: '12px 10px' }}>
                    <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '1.5px', textTransform: 'uppercase', padding: '8px 6px 6px', margin: 0 }}>Management</p>
                    {navItems.map(tab => {
                        const active = activeTab === tab.id;
                        return (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 10px', marginBottom: '2px', borderRadius: '9px', border: 'none', background: active ? 'rgba(99,102,241,0.18)' : 'transparent', color: active ? '#c7d2fe' : 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: '13px', fontWeight: active ? 600 : 400, transition: 'all 0.15s ease', borderLeft: `3px solid ${active ? '#6366f1' : 'transparent'}` }}
                                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; } }}
                                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; } }}
                            >
                                <span style={{ color: active ? '#818cf8' : 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{tab.icon}</span>
                                <span style={{ flex: 1 }}>{tab.label}</span>
                                {tab.count != null && (
                                    <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '9999px', fontWeight: 700, background: active ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.08)', color: active ? '#a5b4fc' : 'rgba(255,255,255,0.3)' }}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <button onClick={() => navigate('/')}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', marginBottom: '4px', borderRadius: '9px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '12px' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}>
                        <Home size={14} /> Back to Store
                    </button>
                    <button onClick={() => { logout(); navigate('/'); }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: '9px', border: 'none', background: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.16)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}>
                        <LogOut size={14} /> Sign Out
                    </button>
                </div>
            </div>

            {/* ── Main Content ───────────────────────────────────────── */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

                {/* Page Header */}
                <div style={{ background: 'white', padding: '14px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
                    <div>
                        <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>{pageTitle}</h1>
                        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '1px 0 0' }}>{pageSubtitle}</p>
                    </div>
                    <button onClick={() => {
                        if (activeTab === 'products') fetchProducts();
                        else if (activeTab === 'users') fetchUsers();
                        else if (activeTab === 'deliveries') { fetchAgents(); fetchDeliveries(); fetchAllOrders(); }
                        else if (activeTab === 'returns') fetchReturns();
                        else if (activeTab === 'analytics') fetchAnalytics();
                        else if (activeTab === 'crm') { fetchCrmSegments(); fetchAdminTickets(); fetchAdminReviews(); fetchLoyaltyOverview(); }
                    }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', color: '#64748b', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>
                        <RefreshCw size={13} /> Refresh
                    </button>
                </div>

                <div style={{ padding: '20px 24px', flex: 1 }}>

                    {/* Stats Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? '10px' : '14px', marginBottom: '20px' }}>
                        {tabStats.map((s, i) => <StatCard key={i} {...s} />)}
                    </div>

                    {/* ── Products Tab ─────────────────────────────────── */}
                    {activeTab === 'products' && (
                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '16px', alignItems: 'flex-start' }}>
                            <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>
                                <div style={{ background: 'white', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
                                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Plus size={14} color="white" />
                                        </div>
                                        <h2 style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', margin: 0 }}>Add New Product</h2>
                                    </div>
                                    <div style={{ padding: '16px' }}>
                                        {submitted && <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#059669', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', marginBottom: '12px', fontWeight: 600 }}>✓ Product added successfully!</div>}
                                        <form onSubmit={handleCreateProduct}>
                                            <div style={{ marginBottom: '10px' }}>
                                                <label style={labelStyle}>Product Name *</label>
                                                <input placeholder="e.g. Wireless Headphones" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} style={inputStyle} required />
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                                <div style={{ flex: 1 }}><label style={labelStyle}>Price (₹) *</label>
                                                    <input type="number" placeholder="999" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} style={inputStyle} required /></div>
                                                <div style={{ flex: 1 }}><label style={labelStyle}>Discount %</label>
                                                    <input type="number" placeholder="20" value={newProduct.discount} onChange={e => setNewProduct({ ...newProduct, discount: e.target.value })} style={inputStyle} /></div>
                                            </div>
                                            <div style={{ marginBottom: '10px' }}>
                                                <label style={labelStyle}>Category</label>
                                                <select value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })} style={inputStyle}>
                                                    {catList.map(c => <option key={c}>{c}</option>)}
                                                </select>
                                            </div>
                                            <div style={{ marginBottom: '10px' }}>
                                                <label style={labelStyle}>Description *</label>
                                                <textarea placeholder="Key features..." value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} style={{ ...inputStyle, resize: 'none' }} rows={2} required />
                                            </div>
                                            <div style={{ marginBottom: '10px' }}>
                                                <label style={labelStyle}>Product Image</label>
                                                <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (f) { setImageFile(f); setNewProduct({ ...newProduct, image: URL.createObjectURL(f) }); } }} style={{ ...inputStyle, padding: '5px 8px', fontSize: '11px' }} />
                                                {!imageFile && <input placeholder="Or paste image URL..." value={newProduct.image} onChange={e => setNewProduct({ ...newProduct, image: e.target.value })} style={{ ...inputStyle, marginTop: '6px', fontSize: '11px' }} />}
                                                {imageFile && <button type="button" onClick={() => { setImageFile(null); setNewProduct({ ...newProduct, image: '' }); }} style={{ fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', marginTop: '4px', padding: 0 }}>Remove file</button>}
                                            </div>
                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={labelStyle}>Stock</label>
                                                <input type="number" placeholder="100" value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })} style={inputStyle} />
                                            </div>
                                            <button type="submit" style={{ width: '100%', padding: '10px', fontWeight: 700, fontSize: '13px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>+ Add Product</button>
                                        </form>
                                    </div>
                                </div>
                            </div>

                            <div style={{ flex: 1, minWidth: 0, background: 'white', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
                                    <h2 style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', margin: 0 }}>All Products <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '9999px', background: '#eff6ff', color: '#3b82f6', fontWeight: 700, marginLeft: '6px' }}>{filteredProducts.length}</span></h2>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input placeholder="Search products..." value={productSearch} onChange={e => setProductSearch(e.target.value)} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '7px 12px 7px 30px', fontSize: '12px', outline: 'none', width: '190px', color: '#1e293b' }} />
                                    </div>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc' }}>
                                                {['Product', 'Category', 'Price', 'Discount', 'Stock', 'Actions'].map((h, i) => (
                                                    <th key={h} style={{ padding: '11px 16px', textAlign: i === 5 ? 'center' : 'left', fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.5px', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredProducts.length === 0 ? (
                                                <tr><td colSpan={6} style={{ padding: '48px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No products found</td></tr>
                                            ) : filteredProducts.map(product => {
                                                const img = (() => { try { return JSON.parse(product.images)[0]; } catch { return ''; } })();
                                                return (
                                                    <tr key={product.id} style={{ borderBottom: '1px solid #f8fafc' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                        <td style={{ padding: '12px 16px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <img src={img || 'https://via.placeholder.com/40'} alt="" style={{ width: '42px', height: '42px', objectFit: 'contain', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9', padding: '2px' }} />
                                                                <div>
                                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'block', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</span>
                                                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>ID #{product.id}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '12px 16px' }}><span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '9999px', fontWeight: 600, background: '#eff6ff', color: '#3b82f6' }}>{product.category}</span></td>
                                                        <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>₹{parseFloat(product.price).toLocaleString('en-IN')}</td>
                                                        <td style={{ padding: '12px 16px' }}><span style={{ fontSize: '12px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#ecfdf5', color: '#059669' }}>{product.discount}% off</span></td>
                                                        <td style={{ padding: '12px 16px' }}><span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 9px', borderRadius: '6px', background: stockBg(product.stock), color: stockColor(product.stock) }}>{product.stock}</span></td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                                <button onClick={() => openEditProduct(product)} style={{ width: '30px', height: '30px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eff6ff', border: 'none', cursor: 'pointer', color: '#3b82f6' }}><Pencil size={13} /></button>
                                                                <button onClick={() => handleDeleteProduct(product.id, product.name)} style={{ width: '30px', height: '30px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={13} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Users Tab ─────────────────────────────────────── */}
                    {activeTab === 'users' && (
                        <div style={{ background: 'white', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', flexWrap: 'wrap' }}>
                                <h2 style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', margin: 0 }}>All Users <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '9999px', background: '#f5f3ff', color: '#8b5cf6', fontWeight: 700, marginLeft: '6px' }}>{filteredUsers.length}</span></h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <select value={userAuthFilter} onChange={e => setUserAuthFilter(e.target.value)} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '7px 10px', fontSize: '12px', outline: 'none', color: '#475569', cursor: 'pointer' }}>
                                        <option value="all">All Methods</option>
                                        <option value="email">Email</option>
                                        <option value="phone">Phone / OTP</option>
                                        <option value="google">Google</option>
                                        <option value="microsoft">Microsoft</option>
                                    </select>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '7px 12px 7px 30px', fontSize: '12px', outline: 'none', width: '190px', color: '#1e293b' }} />
                                    </div>
                                </div>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                {usersLoading ? (
                                    <div style={{ textAlign: 'center', padding: '48px' }}>
                                        <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
                                        <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Loading users...</p>
                                    </div>
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc' }}>
                                                {['User', 'Contact', 'Auth Method', 'Role', 'Joined', 'Actions'].map((h, i) => (
                                                    <th key={h} style={{ padding: '11px 16px', textAlign: i === 5 ? 'center' : 'left', fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.5px', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredUsers.length === 0 ? (
                                                <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No users found</td></tr>
                                            ) : filteredUsers.map(u => {
                                                const roleConfig = u.is_admin ? { label: 'Admin', bg: '#fef2f2', color: '#dc2626' } : u.is_seller ? { label: 'Seller', bg: '#ecfdf5', color: '#059669' } : { label: 'Customer', bg: '#eff6ff', color: '#2563eb' };
                                                const avatarBg = u.is_admin ? 'linear-gradient(135deg, #ef4444, #dc2626)' : u.is_seller ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #6366f1, #4f46e5)';
                                                const authMethod = u.oauth_provider === 'google' ? { label: 'Google', bg: '#fef9f0', color: '#d97706', border: '#fde68a' } : u.oauth_provider === 'microsoft' ? { label: 'Microsoft', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' } : u.email ? { label: 'Email', bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' } : { label: 'Phone / OTP', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
                                                return (
                                                    <tr key={u.id} style={{ borderBottom: '1px solid #f8fafc' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                        <td style={{ padding: '12px 16px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', fontWeight: 800, flexShrink: 0 }}>{u.name?.charAt(0).toUpperCase()}</div>
                                                                <div><span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'block' }}>{u.name}</span><span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>#{u.id}</span></div>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '12px 16px' }}>
                                                            {u.email && <div style={{ fontSize: '12px', color: '#475569' }}>{u.email}</div>}
                                                            {u.phone && <div style={{ fontSize: '11px', color: '#94a3b8' }}>+91 {u.phone}</div>}
                                                        </td>
                                                        <td style={{ padding: '12px 16px' }}>
                                                            <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '9999px', fontWeight: 700, background: authMethod.bg, color: authMethod.color, border: `1px solid ${authMethod.border}` }}>{authMethod.label}</span>
                                                        </td>
                                                        <td style={{ padding: '12px 16px' }}><span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '9999px', fontWeight: 700, background: roleConfig.bg, color: roleConfig.color }}>{roleConfig.label}</span></td>
                                                        <td style={{ padding: '12px 16px', fontSize: '12px', color: '#94a3b8' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                                <button onClick={() => openEditUser(u)} style={{ width: '30px', height: '30px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eff6ff', border: 'none', cursor: 'pointer', color: '#3b82f6' }}><Pencil size={13} /></button>
                                                                <button onClick={() => handleDeleteUser(u.id, u.name)} style={{ width: '30px', height: '30px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={13} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Deliveries Tab ────────────────────────────────── */}
                    {activeTab === 'deliveries' && (
                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '16px', alignItems: 'flex-start' }}>

                            {/* Left panel: Create Agent + Agents list */}
                            <div style={{ width: isMobile ? '100%' : '268px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ background: 'white', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '26px', height: '26px', borderRadius: '7px', background: 'linear-gradient(135deg, #0891b2, #0e7490)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Truck size={13} color="white" /></div>
                                        <h2 style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', margin: 0 }}>Add Delivery Agent</h2>
                                    </div>
                                    <form onSubmit={handleCreateAgent} style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                                        <div><label style={labelStyle}>Name *</label><input value={newAgent.name} onChange={e => setNewAgent({ ...newAgent, name: e.target.value })} placeholder="Agent full name" style={inputStyle} required /></div>
                                        <div><label style={labelStyle}>Phone *</label><input value={newAgent.phone} onChange={e => setNewAgent({ ...newAgent, phone: e.target.value })} placeholder="10-digit number" style={inputStyle} required /></div>
                                        <div><label style={labelStyle}>Email</label><input type="email" value={newAgent.email} onChange={e => setNewAgent({ ...newAgent, email: e.target.value })} placeholder="optional" style={inputStyle} /></div>
                                        <div><label style={labelStyle}>Password *</label><input type="password" value={newAgent.password} onChange={e => setNewAgent({ ...newAgent, password: e.target.value })} placeholder="Agent app login password" style={inputStyle} required /></div>
                                        <button type="submit" style={{ padding: '9px', fontWeight: 700, fontSize: '13px', borderRadius: '8px', background: 'linear-gradient(135deg, #0891b2, #0e7490)', color: 'white', border: 'none', cursor: 'pointer', marginTop: '2px' }}>+ Add Agent</button>
                                    </form>
                                </div>

                                {/* Agents list */}
                                <div style={{ background: 'white', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
                                        <h2 style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', margin: 0 }}>Agents ({agents.length})</h2>
                                    </div>
                                    {agents.length === 0 ? (
                                        <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No agents yet</div>
                                    ) : agents.map(a => (
                                        <div key={a.id} style={{ padding: '11px 16px', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{a.name}</div>
                                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{a.phone}</div>
                                            </div>
                                            <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '9999px', fontWeight: 700, background: a.is_active ? '#ecfdf5' : '#f1f5f9', color: a.is_active ? '#059669' : '#94a3b8' }}>
                                                {a.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right panel: Assign form + Deliveries table */}
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>

                                {/* Assign form */}
                                <div style={{ background: 'white', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
                                        <h2 style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', margin: 0 }}>Assign Delivery Agent to Order</h2>
                                    </div>
                                    <form onSubmit={handleAssignDelivery} style={{ padding: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                        <div style={{ flex: '1 1 180px' }}>
                                            <label style={labelStyle}>Order ({unassignedOrders.length} unassigned)</label>
                                            <select value={assignForm.order_id} onChange={e => setAssignForm({ ...assignForm, order_id: e.target.value })} style={inputStyle} required>
                                                <option value="">Select order…</option>
                                                {unassignedOrders.map(o => (
                                                    <option key={o.id} value={o.id}>#{o.id} — {o.user_name} — ₹{parseFloat(o.total).toLocaleString('en-IN')} ({o.status})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div style={{ flex: '1 1 160px' }}>
                                            <label style={labelStyle}>Agent</label>
                                            <select value={assignForm.agent_id} onChange={e => setAssignForm({ ...assignForm, agent_id: e.target.value })} style={inputStyle} required>
                                                <option value="">Select agent…</option>
                                                {agents.filter(a => a.is_active).map(a => (
                                                    <option key={a.id} value={a.id}>{a.name} ({a.phone})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div style={{ flex: '1 1 160px' }}>
                                            <label style={labelStyle}>Estimated Delivery</label>
                                            <input type="date" value={assignForm.estimated_delivery} onChange={e => setAssignForm({ ...assignForm, estimated_delivery: e.target.value })} style={inputStyle} min={new Date().toISOString().split('T')[0]} />
                                        </div>
                                        <button type="submit" style={{ padding: '9px 20px', fontWeight: 700, fontSize: '13px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', cursor: 'pointer', flexShrink: 0 }}>Assign</button>
                                    </form>
                                    {deliveryMsg.text && (
                                        <div style={{ margin: '0 14px 14px', padding: '9px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: deliveryMsg.ok ? '#ecfdf5' : '#fef2f2', color: deliveryMsg.ok ? '#059669' : '#dc2626', border: `1px solid ${deliveryMsg.ok ? '#6ee7b7' : '#fca5a5'}` }}>
                                            {deliveryMsg.text}
                                        </div>
                                    )}
                                </div>

                                {/* Deliveries table */}
                                <div style={{ background: 'white', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
                                        <h2 style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', margin: 0 }}>All Deliveries</h2>
                                    </div>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: '#f8fafc' }}>
                                                    {['Order', 'Customer', 'Agent', 'Status', 'ETA', 'Attempts', 'Tracking'].map((h, i) => (
                                                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.5px', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {deliveries.length === 0 ? (
                                                    <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No deliveries yet</td></tr>
                                                ) : deliveries.map(d => (
                                                    <tr key={d.id} style={{ borderBottom: '1px solid #f8fafc' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                        <td style={{ padding: '11px 14px', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>#{d.order_id}</td>
                                                        <td style={{ padding: '11px 14px' }}>
                                                            <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>{d.customer_name}</div>
                                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{d.customer_email}</div>
                                                        </td>
                                                        <td style={{ padding: '11px 14px' }}>
                                                            <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500 }}>{d.agent_name}</div>
                                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{d.agent_phone}</div>
                                                        </td>
                                                        <td style={{ padding: '11px 14px' }}><StatusBadge status={d.status} map={DELIVERY_STATUS} /></td>
                                                        <td style={{ padding: '11px 14px', fontSize: '12px', color: '#475569' }}>
                                                            {d.estimated_delivery ? new Date(d.estimated_delivery).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                                                        </td>
                                                        <td style={{ padding: '11px 14px', fontSize: '12px', color: '#475569' }}>
                                                            {d.delivery_attempts}/{d.max_attempts}
                                                        </td>
                                                        <td style={{ padding: '11px 14px' }}>
                                                            <a href={`/track/${d.tracking_token}`} target="_blank" rel="noreferrer"
                                                                style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>
                                                                Track ↗
                                                            </a>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Returns Tab ───────────────────────────────────── */}
                    {activeTab === 'returns' && (
                        <div style={{ background: 'white', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
                                <h2 style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', margin: 0 }}>
                                    Return Requests
                                    {pendingReturns > 0 && <span style={{ marginLeft: '8px', fontSize: '11px', padding: '1px 7px', borderRadius: '9999px', background: '#fffbeb', color: '#d97706', fontWeight: 700, border: '1px solid #fde68a' }}>{pendingReturns} pending</span>}
                                </h2>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                {returnsLoading ? (
                                    <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Loading...</div>
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc' }}>
                                                {['Order', 'Customer', 'Items', 'Reason', 'Refund', 'Status', 'Date', 'Actions'].map((h, i) => (
                                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.5px', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {returns.length === 0 ? (
                                                <tr><td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No return requests yet</td></tr>
                                            ) : returns.map(r => (
                                                <tr key={r.id} style={{ borderBottom: '1px solid #f8fafc', background: r.status === 'requested' ? '#fffef7' : 'white' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                                                    onMouseLeave={e => e.currentTarget.style.background = r.status === 'requested' ? '#fffef7' : 'white'}>
                                                    <td style={{ padding: '11px 14px', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>#{r.order_id}</td>
                                                    <td style={{ padding: '11px 14px' }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>{r.user_name}</div>
                                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{r.user_email}</div>
                                                    </td>
                                                    <td style={{ padding: '11px 14px', fontSize: '12px', color: '#475569', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.items}</td>
                                                    <td style={{ padding: '11px 14px', fontSize: '12px', color: '#475569', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason}</td>
                                                    <td style={{ padding: '11px 14px', fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>₹{parseFloat(r.refund_amount || 0).toLocaleString('en-IN')}</td>
                                                    <td style={{ padding: '11px 14px' }}><StatusBadge status={r.status} map={RETURN_STATUS} /></td>
                                                    <td style={{ padding: '11px 14px', fontSize: '12px', color: '#94a3b8' }}>{new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                                                    <td style={{ padding: '11px 14px' }}>
                                                        {r.status === 'requested' ? (
                                                            <button onClick={() => openReturnReview(r)}
                                                                style={{ padding: '5px 12px', fontSize: '12px', fontWeight: 600, borderRadius: '7px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', cursor: 'pointer' }}>
                                                                Review
                                                            </button>
                                                        ) : r.admin_note ? (
                                                            <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }} title={r.admin_note}>Note ✓</span>
                                                        ) : null}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Analytics Tab ─────────────────────────────────── */}
                    {activeTab === 'analytics' && (
                        analyticsLoading ? (
                            <div style={{ textAlign: 'center', padding: '80px', color: '#94a3b8', fontSize: '13px' }}>Loading analytics…</div>
                        ) : !analytics ? (
                            <div style={{ textAlign: 'center', padding: '80px', color: '#94a3b8', fontSize: '13px' }}>No data yet. Events are tracked as users browse the store.</div>
                        ) : (() => {
                            const maxViews = Math.max(...analytics.topProducts.map(p => parseInt(p.views) || 0), 1);
                            const maxDailyVisitors = Math.max(...analytics.dailyVisitors.map(d => parseInt(d.visitors) || 0), 1);
                            const totalDeviceVisitors = analytics.devices.reduce((s, d) => s + parseInt(d.visitors || 0), 0) || 1;

                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                                    {/* Top Products */}
                                    <div style={{ background: 'white', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
                                            <h2 style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', margin: 0 }}>Top Products — Last 30 Days</h2>
                                        </div>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ background: '#f8fafc' }}>
                                                        {['#', 'Product', 'Category', 'Views', 'Cart Adds', 'Price'].map(h => (
                                                            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.5px', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {analytics.topProducts.length === 0 ? (
                                                        <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No product view data yet</td></tr>
                                                    ) : analytics.topProducts.map((p, i) => (
                                                        <tr key={p.product_id} style={{ borderBottom: '1px solid #f8fafc' }}
                                                            onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                                                            onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                            <td style={{ padding: '11px 14px', fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>{i + 1}</td>
                                                            <td style={{ padding: '11px 14px', fontSize: '13px', fontWeight: 600, color: '#1e293b', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</td>
                                                            <td style={{ padding: '11px 14px' }}><span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '9999px', background: '#eff6ff', color: '#3b82f6', fontWeight: 600 }}>{p.category}</span></td>
                                                            <td style={{ padding: '11px 14px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <div style={{ width: '80px', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                                                        <div style={{ height: '100%', width: `${(parseInt(p.views) / maxViews) * 100}%`, background: '#6366f1', borderRadius: '3px' }} />
                                                                    </div>
                                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>{parseInt(p.views).toLocaleString()}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '11px 14px', fontSize: '13px', color: '#475569', fontWeight: 600 }}>{parseInt(p.adds_to_cart).toLocaleString()}</td>
                                                            <td style={{ padding: '11px 14px', fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>₹{parseFloat(p.price).toLocaleString('en-IN')}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Device + Daily visitors row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>

                                        {/* Device breakdown */}
                                        <div style={{ background: 'white', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
                                                <h2 style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', margin: 0 }}>Device Breakdown</h2>
                                            </div>
                                            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {analytics.devices.length === 0 ? (
                                                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '20px' }}>No data</div>
                                                ) : analytics.devices.map(d => {
                                                    const pct = Math.round((parseInt(d.visitors) / totalDeviceVisitors) * 100);
                                                    const devColor = d.device === 'mobile' ? '#8b5cf6' : d.device === 'tablet' ? '#f59e0b' : '#3b82f6';
                                                    return (
                                                        <div key={d.device}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', textTransform: 'capitalize' }}>{d.device}</span>
                                                                <span style={{ fontSize: '12px', color: '#64748b' }}>{parseInt(d.visitors).toLocaleString()} ({pct}%)</span>
                                                            </div>
                                                            <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                                                <div style={{ height: '100%', width: `${pct}%`, background: devColor, borderRadius: '4px', transition: 'width 0.6s ease' }} />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Daily visitors sparkline */}
                                        <div style={{ background: 'white', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
                                                <h2 style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', margin: 0 }}>Daily Visitors — Last 14 Days</h2>
                                            </div>
                                            <div style={{ padding: '16px' }}>
                                                {analytics.dailyVisitors.length === 0 ? (
                                                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', padding: '20px' }}>No data</div>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '90px' }}>
                                                        {analytics.dailyVisitors.map((d, i) => {
                                                            const h = Math.max(4, Math.round((parseInt(d.visitors) / maxDailyVisitors) * 74));
                                                            const date = new Date(d.date);
                                                            const label = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                                                            return (
                                                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }} title={`${label}: ${d.visitors} visitors`}>
                                                                    <div style={{ width: '100%', height: `${h}px`, background: '#6366f1', borderRadius: '3px 3px 0 0', opacity: 0.85 }} />
                                                                    <div style={{ fontSize: '9px', color: '#94a3b8', writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: '28px', lineHeight: 1 }}>{label}</div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Recent events */}
                                    <div style={{ background: 'white', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
                                            <h2 style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', margin: 0 }}>Recent Events (last 20)</h2>
                                        </div>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ background: '#f8fafc' }}>
                                                        {['Event', 'Product', 'User', 'Location', 'Device', 'Time'].map(h => (
                                                            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.5px', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {analytics.recentEvents.length === 0 ? (
                                                        <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No events tracked yet</td></tr>
                                                    ) : analytics.recentEvents.map((ev, i) => {
                                                        const ec = EVENT_COLOR[ev.event_type] || { color: '#64748b', bg: '#f1f5f9' };
                                                        return (
                                                            <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}
                                                                onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                                                                onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                                <td style={{ padding: '10px 14px' }}>
                                                                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '9999px', fontWeight: 600, background: ec.bg, color: ec.color }}>
                                                                        {ev.event_type.replace(/_/g, ' ')}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '10px 14px', fontSize: '12px', color: '#475569', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.product_name || '—'}</td>
                                                                <td style={{ padding: '10px 14px', fontSize: '12px', color: '#475569' }}>{ev.user_name || 'Guest'}</td>
                                                                <td style={{ padding: '10px 14px', fontSize: '12px', color: '#475569' }}>{ev.city && ev.country ? `${ev.city}, ${ev.country}` : '—'}</td>
                                                                <td style={{ padding: '10px 14px', fontSize: '12px', color: '#475569', textTransform: 'capitalize' }}>{ev.device || '—'}</td>
                                                                <td style={{ padding: '10px 14px', fontSize: '11px', color: '#94a3b8' }}>{new Date(ev.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                </div>
                            );
                        })()
                    )}

                    {/* ── CRM Tab ──────────────────────────────────────── */}
                    {activeTab === 'crm' && (
                        <div>
                            {/* CRM Sub-tabs */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                {[
                                    { id: 'segments', label: 'Customer Segments' },
                                    { id: 'tickets',  label: `Support Tickets (${adminTickets.filter(t=>t.status==='open').length} open)` },
                                    { id: 'reviews',  label: 'Review Moderation' },
                                    { id: 'loyalty',  label: 'Loyalty Overview' },
                                ].map(sub => (
                                    <button key={sub.id} onClick={() => setCrmActiveTab(sub.id)}
                                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1.5px solid', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: crmActiveTab===sub.id ? '#0f172a' : 'white', color: crmActiveTab===sub.id ? 'white' : '#475569', borderColor: crmActiveTab===sub.id ? '#0f172a' : '#e2e8f0' }}>
                                        {sub.label}
                                    </button>
                                ))}
                            </div>

                            {/* ── Segments ── */}
                            {crmActiveTab === 'segments' && (
                                crmLoading ? <div style={{ textAlign: 'center', padding: '48px' }}><div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#E85D04', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>
                                : crmSegments ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {/* Segment summary */}
                                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap: '12px' }}>
                                            {crmSegments.segments.map(seg => {
                                                const cfg = { VIP: { color: '#7c3aed', bg: '#f5f3ff' }, 'High Value': { color: '#d97706', bg: '#fffbeb' }, Regular: { color: '#2563eb', bg: '#eff6ff' }, New: { color: '#64748b', bg: '#f1f5f9' } }[seg.segment] || { color: '#64748b', bg: '#f1f5f9' };
                                                return (
                                                    <div key={seg.segment} style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: `4px solid ${cfg.color}` }}>
                                                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '9999px', background: cfg.bg, color: cfg.color, fontWeight: 700 }}>{seg.segment}</span>
                                                        <p style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', margin: '8px 0 2px' }}>{seg.count}</p>
                                                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>Avg ₹{Math.round(seg.avg_spend).toLocaleString('en-IN')} · {Math.round(seg.avg_orders)} orders</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {/* Top customers */}
                                        <div style={{ background: 'white', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)' }}>
                                                <h3 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Top Customers by Spend</h3>
                                            </div>
                                            <div style={{ overflowX: 'auto' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                    <thead><tr style={{ background: '#f8fafc' }}>
                                                        {['Customer','Email','Orders','Total Spend','Loyalty Pts'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #f1f5f9' }}>{h}</th>)}
                                                    </tr></thead>
                                                    <tbody>
                                                        {crmSegments.topCustomers.map((c, i) => (
                                                            <tr key={c.id} style={{ borderBottom: '1px solid #f8fafc' }}
                                                                onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                                                                onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                                <td style={{ padding: '10px 14px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg,#fbbf24,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: 'white', flexShrink: 0 }}>{c.name?.charAt(0).toUpperCase()}</div>
                                                                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{c.name}</span>
                                                                    </div>
                                                                </td>
                                                                <td style={{ padding: '10px 14px', fontSize: '12px', color: '#64748b' }}>{c.email}</td>
                                                                <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{c.order_count}</td>
                                                                <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>₹{Math.round(c.total_spend).toLocaleString('en-IN')}</td>
                                                                <td style={{ padding: '10px 14px' }}>
                                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#d97706', background: '#fffbeb', padding: '2px 8px', borderRadius: '9999px' }}>{c.loyalty_points}</span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                        {/* Inactive customers */}
                                        {crmSegments.inactive?.length > 0 && (
                                            <div style={{ background: 'white', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: '#fffbeb', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#d97706' }}>⚠ At-Risk / Inactive Customers (30+ days)</span>
                                                </div>
                                                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {crmSegments.inactive.map(c => (
                                                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                                                            <div>
                                                                <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', margin: 0 }}>{c.name}</p>
                                                                <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>{c.email}</p>
                                                            </div>
                                                            <span style={{ fontSize: '11px', color: '#d97706', fontWeight: 600 }}>
                                                                {c.last_order ? `Last order: ${new Date(c.last_order).toLocaleDateString('en-IN')}` : 'Never ordered'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : <p style={{ color: '#94a3b8', textAlign: 'center', padding: '48px' }}>Loading segments…</p>
                            )}

                            {/* ── Tickets ── */}
                            {crmActiveTab === 'tickets' && (
                                <div style={{ background: 'white', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <h3 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#0f172a', flex: 1 }}>Customer Support Tickets</h3>
                                        {['','open','in_progress','resolved','closed'].map(s => (
                                            <button key={s} onClick={() => setTicketFilter(s)}
                                                style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid', fontSize: '11px', fontWeight: 600, cursor: 'pointer', background: ticketFilter===s ? '#0f172a' : 'white', color: ticketFilter===s ? 'white' : '#64748b', borderColor: ticketFilter===s ? '#0f172a' : '#e2e8f0' }}>
                                                {s || 'All'}
                                            </button>
                                        ))}
                                    </div>
                                    {ticketsLoading ? (
                                        <div style={{ textAlign: 'center', padding: '32px' }}><div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #e2e8f0', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>
                                    ) : (
                                        <div>
                                            {adminTickets.filter(t => !ticketFilter || t.status === ticketFilter).map(ticket => {
                                                const statusCfg = { open:{bg:'#eff6ff',color:'#2563eb',label:'Open'}, in_progress:{bg:'#fffbeb',color:'#d97706',label:'In Progress'}, resolved:{bg:'#ecfdf5',color:'#059669',label:'Resolved'}, closed:{bg:'#f1f5f9',color:'#64748b',label:'Closed'} }[ticket.status] || {bg:'#f1f5f9',color:'#64748b',label:ticket.status};
                                                const isOpen = openTicket === ticket.id;
                                                return (
                                                    <div key={ticket.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                        <div onClick={() => {
                                                            if (isOpen) { setOpenTicket(null); setTicketMessages([]); return; }
                                                            setOpenTicket(ticket.id);
                                                            api.get(`/tickets/${ticket.id}`).then(r => setTicketMessages(r.data.messages||[])).catch(()=>{});
                                                        }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer' }}
                                                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                                            onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>#{ticket.id}</span>
                                                                    <span style={{ padding:'2px 8px', borderRadius:'9999px', fontSize:'10px', fontWeight:700, background:statusCfg.bg, color:statusCfg.color }}>{statusCfg.label}</span>
                                                                    <span style={{ fontSize:'10px', fontWeight:700, color: ticket.priority==='high'?'#dc2626':ticket.priority==='medium'?'#d97706':'#64748b', textTransform:'uppercase' }}>{ticket.priority}</span>
                                                                </div>
                                                                <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', margin: 0 }}>{ticket.subject}</p>
                                                                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>{ticket.user_name} · {ticket.category} · {new Date(ticket.updated_at).toLocaleDateString('en-IN')}</p>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                                {['open','in_progress','resolved','closed'].map(s => (
                                                                    <button key={s} onClick={async (e) => { e.stopPropagation(); await api.put(`/tickets/admin/${ticket.id}`, { status: s }); fetchAdminTickets(); }}
                                                                        style={{ padding:'3px 8px', borderRadius:'5px', border:'1px solid', fontSize:'10px', fontWeight:700, cursor:'pointer', background: ticket.status===s?'#0f172a':'white', color: ticket.status===s?'white':'#64748b', borderColor: ticket.status===s?'#0f172a':'#e2e8f0' }}>
                                                                        {s.replace('_',' ')}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        {isOpen && (
                                                            <div style={{ padding: '14px 16px', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                                                                <div style={{ display:'flex', flexDirection:'column', gap:'8px', maxHeight:'240px', overflowY:'auto', marginBottom:'12px' }}>
                                                                    {ticketMessages.map(msg => (
                                                                        <div key={msg.id} style={{ display:'flex', justifyContent: msg.is_admin?'flex-start':'flex-end' }}>
                                                                            <div style={{ maxWidth:'75%', padding:'8px 12px', borderRadius:'10px', background: msg.is_admin?'linear-gradient(135deg,#7c3aed,#6d28d9)':'#f1f5f9', color: msg.is_admin?'white':'#1e293b' }}>
                                                                                <p style={{ fontSize:'11px', fontWeight:700, margin:'0 0 3px', opacity:0.75 }}>{msg.is_admin?'Support (You)':msg.sender_name}</p>
                                                                                <p style={{ fontSize:'13px', margin:0, lineHeight:1.4 }}>{msg.body}</p>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <div style={{ display:'flex', gap:'8px' }}>
                                                                    <input value={adminReply} onChange={e => setAdminReply(e.target.value)} placeholder="Reply to customer…"
                                                                        style={{ flex:1, padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:'8px', fontSize:'13px', outline:'none', color:'#1e293b' }} />
                                                                    <button onClick={async () => {
                                                                        if (!adminReply.trim()) return;
                                                                        await api.post(`/tickets/${ticket.id}/messages`, { body: adminReply }).catch(()=>{});
                                                                        const r = await api.get(`/tickets/${ticket.id}`);
                                                                        setTicketMessages(r.data.messages||[]);
                                                                        setAdminReply('');
                                                                    }} style={{ padding:'9px 16px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:700 }}>
                                                                        Reply
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {adminTickets.filter(t => !ticketFilter || t.status === ticketFilter).length === 0 && (
                                                <p style={{ textAlign:'center', padding:'40px', color:'#94a3b8', fontSize:'13px' }}>No tickets found</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Reviews ── */}
                            {crmActiveTab === 'reviews' && (
                                <div style={{ background: 'white', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)' }}>
                                        <h3 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Product Reviews</h3>
                                    </div>
                                    {reviewsLoading ? (
                                        <div style={{ textAlign: 'center', padding: '32px' }}><div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid #e2e8f0', borderTopColor: '#E85D04', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>
                                    ) : adminReviews.length === 0 ? (
                                        <p style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '13px' }}>No reviews yet</p>
                                    ) : (
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead><tr style={{ background: '#f8fafc' }}>
                                                    {['Product','Customer','Rating','Review','Verified','Status','Actions'].map(h => <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:'11px', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'1px solid #f1f5f9' }}>{h}</th>)}
                                                </tr></thead>
                                                <tbody>
                                                    {adminReviews.map(rev => (
                                                        <tr key={rev.id} style={{ borderBottom: '1px solid #f8fafc' }}
                                                            onMouseEnter={e => e.currentTarget.style.background='#f8faff'}
                                                            onMouseLeave={e => e.currentTarget.style.background='white'}>
                                                            <td style={{ padding:'10px 14px', fontSize:'12px', fontWeight:600, color:'#1e293b', maxWidth:'180px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{rev.product_name}</td>
                                                            <td style={{ padding:'10px 14px', fontSize:'12px', color:'#475569' }}>{rev.user_name}</td>
                                                            <td style={{ padding:'10px 14px' }}>
                                                                <span style={{ display:'flex', alignItems:'center', gap:'3px', fontSize:'13px', fontWeight:700, color:'#1e293b' }}>
                                                                    {'★'.repeat(rev.rating)}{'☆'.repeat(5-rev.rating)}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding:'10px 14px', fontSize:'12px', color:'#475569', maxWidth:'200px' }}>
                                                                {rev.title && <strong>{rev.title}: </strong>}{rev.body || '—'}
                                                            </td>
                                                            <td style={{ padding:'10px 14px' }}>
                                                                {rev.is_verified_buyer ? <span style={{ fontSize:'10px', padding:'2px 7px', borderRadius:'9999px', background:'#ecfdf5', color:'#059669', fontWeight:700 }}>Verified</span>
                                                                : <span style={{ fontSize:'10px', color:'#94a3b8' }}>—</span>}
                                                            </td>
                                                            <td style={{ padding:'10px 14px' }}>
                                                                <span style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'9999px', fontWeight:700, background: rev.is_approved?'#ecfdf5':'#fef2f2', color: rev.is_approved?'#059669':'#dc2626' }}>
                                                                    {rev.is_approved ? 'Approved' : 'Hidden'}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding:'10px 14px' }}>
                                                                <div style={{ display:'flex', gap:'4px' }}>
                                                                    <button onClick={async () => { await api.put(`/reviews/admin/${rev.id}`, { is_approved: !rev.is_approved }); fetchAdminReviews(); }}
                                                                        style={{ padding:'4px 10px', borderRadius:'6px', border:'none', fontSize:'11px', fontWeight:700, cursor:'pointer', background: rev.is_approved?'#fef2f2':'#ecfdf5', color: rev.is_approved?'#dc2626':'#059669' }}>
                                                                        {rev.is_approved ? 'Hide' : 'Approve'}
                                                                    </button>
                                                                    <button onClick={async () => { if (!window.confirm('Delete review?')) return; await api.delete(`/reviews/admin/${rev.id}`); fetchAdminReviews(); }}
                                                                        style={{ padding:'4px 10px', borderRadius:'6px', border:'1px solid #fca5a5', fontSize:'11px', fontWeight:700, cursor:'pointer', background:'white', color:'#dc2626' }}>
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Loyalty ── */}
                            {crmActiveTab === 'loyalty' && (
                                loyaltyLoading ? <div style={{ textAlign:'center', padding:'48px' }}><div style={{ display:'inline-block', width:'32px', height:'32px', border:'3px solid #e2e8f0', borderTopColor:'#d97706', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} /></div>
                                : loyaltyOverview ? (
                                    <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                                        {/* Summary cards */}
                                        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:'12px' }}>
                                            {[
                                                { label:'Active Members', value: loyaltyOverview.summary?.active_members||0, color:'#2563eb' },
                                                { label:'Total Earned', value: (loyaltyOverview.summary?.total_earned||0).toLocaleString()+'pts', color:'#059669' },
                                                { label:'Total Redeemed', value: (loyaltyOverview.summary?.total_redeemed||0).toLocaleString()+'pts', color:'#7c3aed' },
                                                { label:'Tier Breakdown', value: `${loyaltyOverview.tierStats?.platinum||0}P / ${loyaltyOverview.tierStats?.gold||0}G`, color:'#d97706' },
                                            ].map(c => (
                                                <div key={c.label} style={{ background:'white', borderRadius:'12px', padding:'16px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', borderLeft:`4px solid ${c.color}` }}>
                                                    <p style={{ fontSize:'11px', color:'#94a3b8', margin:'0 0 6px', fontWeight:500 }}>{c.label}</p>
                                                    <p style={{ fontSize:'22px', fontWeight:900, color:'#0f172a', margin:0 }}>{c.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Tier distribution */}
                                        <div style={{ background:'white', borderRadius:'14px', padding:'20px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
                                            <h3 style={{ fontSize:'13px', fontWeight:700, margin:'0 0 14px' }}>Tier Distribution</h3>
                                            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:'12px' }}>
                                                {[
                                                    { tier:'Bronze', count: loyaltyOverview.tierStats?.bronze||0, color:'#92400e', bg:'#fef3c7' },
                                                    { tier:'Silver', count: loyaltyOverview.tierStats?.silver||0, color:'#64748b', bg:'#f1f5f9' },
                                                    { tier:'Gold', count: loyaltyOverview.tierStats?.gold||0, color:'#d97706', bg:'#fffbeb' },
                                                    { tier:'Platinum', count: loyaltyOverview.tierStats?.platinum||0, color:'#7c3aed', bg:'#f5f3ff' },
                                                ].map(t => (
                                                    <div key={t.tier} style={{ textAlign:'center', padding:'16px', borderRadius:'10px', background:t.bg }}>
                                                        <p style={{ fontSize:'24px', fontWeight:900, color:t.color, margin:'0 0 4px' }}>{t.count}</p>
                                                        <p style={{ fontSize:'12px', fontWeight:700, color:t.color, margin:0 }}>{t.tier}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Leaderboard + manual adjust */}
                                        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap:'16px' }}>
                                            <div style={{ background:'white', borderRadius:'14px', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
                                                <div style={{ padding:'12px 16px', borderBottom:'1px solid #f1f5f9', background:'linear-gradient(135deg,#f8fafc,#f1f5f9)' }}>
                                                    <h3 style={{ fontSize:'13px', fontWeight:700, margin:0 }}>Top 20 Earners</h3>
                                                </div>
                                                <div style={{ overflowX:'auto' }}>
                                                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                                                        <thead><tr style={{ background:'#f8fafc' }}>
                                                            {['#','Name','Email','Points','Tier'].map(h => <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:'11px', fontWeight:700, color:'#64748b', textTransform:'uppercase', borderBottom:'1px solid #f1f5f9' }}>{h}</th>)}
                                                        </tr></thead>
                                                        <tbody>
                                                            {loyaltyOverview.leaderboard.map((u, i) => {
                                                                const pts = u.total_points;
                                                                const tier = pts>=10000?{n:'Platinum',c:'#7c3aed',bg:'#f5f3ff'}:pts>=5000?{n:'Gold',c:'#d97706',bg:'#fffbeb'}:pts>=1000?{n:'Silver',c:'#64748b',bg:'#f1f5f9'}:{n:'Bronze',c:'#92400e',bg:'#fef3c7'};
                                                                return (
                                                                    <tr key={u.id} style={{ borderBottom:'1px solid #f8fafc' }}
                                                                        onMouseEnter={e => e.currentTarget.style.background='#f8faff'}
                                                                        onMouseLeave={e => e.currentTarget.style.background='white'}>
                                                                        <td style={{ padding:'10px 14px', fontSize:'12px', fontWeight:700, color:'#94a3b8' }}>{i+1}</td>
                                                                        <td style={{ padding:'10px 14px', fontSize:'13px', fontWeight:600, color:'#1e293b' }}>{u.name}</td>
                                                                        <td style={{ padding:'10px 14px', fontSize:'12px', color:'#64748b' }}>{u.email}</td>
                                                                        <td style={{ padding:'10px 14px', fontSize:'13px', fontWeight:800, color:'#0f172a' }}>{pts.toLocaleString()}</td>
                                                                        <td style={{ padding:'10px 14px' }}><span style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'9999px', background:tier.bg, color:tier.c, fontWeight:700 }}>{tier.n}</span></td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                            {/* Manual adjust */}
                                            <div style={{ background:'white', borderRadius:'14px', padding:'20px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', height:'fit-content' }}>
                                                <h3 style={{ fontSize:'13px', fontWeight:700, margin:'0 0 14px' }}>Manual Points Adjustment</h3>
                                                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                                                    <div>
                                                        <label style={{ fontSize:'11px', fontWeight:600, color:'#475569', display:'block', marginBottom:'4px' }}>User ID</label>
                                                        <input value={loyaltyAdjust.user_id} onChange={e => setLoyaltyAdjust(p=>({...p,user_id:e.target.value}))} placeholder="e.g. 5"
                                                            style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:'8px', fontSize:'13px', outline:'none', boxSizing:'border-box', color:'#1e293b' }} />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize:'11px', fontWeight:600, color:'#475569', display:'block', marginBottom:'4px' }}>Points (negative to deduct)</label>
                                                        <input type="number" value={loyaltyAdjust.points} onChange={e => setLoyaltyAdjust(p=>({...p,points:e.target.value}))} placeholder="e.g. 200 or -100"
                                                            style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:'8px', fontSize:'13px', outline:'none', boxSizing:'border-box', color:'#1e293b' }} />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize:'11px', fontWeight:600, color:'#475569', display:'block', marginBottom:'4px' }}>Note (optional)</label>
                                                        <input value={loyaltyAdjust.note} onChange={e => setLoyaltyAdjust(p=>({...p,note:e.target.value}))} placeholder="Reason…"
                                                            style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:'8px', fontSize:'13px', outline:'none', boxSizing:'border-box', color:'#1e293b' }} />
                                                    </div>
                                                    <button onClick={async () => {
                                                        if (!loyaltyAdjust.user_id || !loyaltyAdjust.points) return;
                                                        await api.post('/loyalty/admin/adjust', loyaltyAdjust);
                                                        setLoyaltyAdjust({ user_id:'', points:'', note:'' });
                                                        fetchLoyaltyOverview();
                                                    }} style={{ padding:'10px', background:'linear-gradient(135deg,#d97706,#f59e0b)', color:'white', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:700, cursor:'pointer' }}>
                                                        Apply Adjustment
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : <p style={{ textAlign:'center', padding:'48px', color:'#94a3b8' }}>Loading loyalty data…</p>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default Admin;
