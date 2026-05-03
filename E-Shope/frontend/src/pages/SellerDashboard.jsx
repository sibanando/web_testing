import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useResponsive from '../hooks/useResponsive';
import {
    Store, Package, Plus, Pencil, Trash2, X,
    BarChart2, ShoppingBag, TrendingUp, LogOut,
    Home, User, Eye, EyeOff, CheckCircle, Search, AlertTriangle,
    ClipboardList
} from 'lucide-react';

const inputStyle = {
    width: '100%', border: '1px solid #d1fae5', borderRadius: '8px',
    padding: '9px 12px', fontSize: '13px', outline: 'none',
    background: 'white', boxSizing: 'border-box', color: '#1e293b',
    transition: 'border-color 0.2s',
};

const labelStyle = {
    fontSize: '12px', fontWeight: 600, color: '#374151',
    marginBottom: '5px', display: 'block',
};

const catList = ['Electronics', 'Fashion', 'Mobiles', 'Home', 'Appliances', 'Sports', 'Beauty', 'Books'];

const Modal = ({ title, onClose, children }) => (
    <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(4,47,46,0.5)', backdropFilter: 'blur(4px)',
    }}>
        <div style={{
            background: 'white', borderRadius: '16px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
            width: '100%', maxWidth: '480px', margin: '0 16px',
            overflow: 'hidden',
        }}>
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px',
                background: 'linear-gradient(135deg, #042f2e 0%, #065f46 100%)',
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

const StatCard = ({ label, value, icon, color, bg, sub }) => (
    <div style={{
        background: 'white', borderRadius: '14px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        padding: '18px', borderLeft: `4px solid ${color}`,
        transition: 'transform 0.2s, box-shadow 0.2s',
    }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)'; }}
    >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 6px', fontWeight: 500 }}>{label}</p>
                <p style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1 }}>{value}</p>
                {sub && <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0' }}>{sub}</p>}
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color }}>{icon}</span>
            </div>
        </div>
    </div>
);

const SellerDashboard = () => {
    const { user, logout, updateUser } = useAuth();
    const navigate = useNavigate();
    const { isMobile, isTablet } = useResponsive();
    const [activeTab, setActiveTab] = useState('dashboard');

    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const [editData, setEditData] = useState({});
    const [stats, setStats] = useState({ totalProducts: 0, totalOrders: 0, revenue: 0 });
    const [productSearch, setProductSearch] = useState('');

    const [orders, setOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);

    const [newProduct, setNewProduct] = useState({ name: '', price: '', description: '', category: 'Electronics', image: '', discount: 0, stock: 100 });
    const [addLoading, setAddLoading] = useState(false);
    const [addSuccess, setAddSuccess] = useState(false);
    const [imageFile, setImageFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const [profileName, setProfileName] = useState(user?.name || '');
    const [profileEmail, setProfileEmail] = useState(user?.email || '');
    const [currentPwd, setCurrentPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [profileMsg, setProfileMsg] = useState('');
    const [profileLoading, setProfileLoading] = useState(false);

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        if (!user.is_seller && !user.is_admin) { navigate('/'); return; }
        fetchProducts();
        fetchStats();
        fetchOrders();
    }, [user]);

    const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    const fetchProducts = async () => {
        setProductsLoading(true);
        try {
            const res = await api.get('/seller/products', authHeader());
            setProducts(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Fetch products error:', err);
        } finally {
            setProductsLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await api.get('/seller/stats', authHeader());
            setStats(res.data);
        } catch (err) {
            console.error('Fetch stats error:', err);
        }
    };

    const fetchOrders = async () => {
        setOrdersLoading(true);
        try {
            const res = await api.get('/seller/orders', authHeader());
            setOrders(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Fetch orders error:', err);
        } finally {
            setOrdersLoading(false);
        }
    };

    const getImg = (product) => {
        try {
            const imgs = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
            return imgs?.[0] || 'https://placehold.co/40x40?text=P';
        } catch { return 'https://placehold.co/40x40?text=P'; }
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        setAddLoading(true);
        try {
            let imageUrl = newProduct.image || 'https://placehold.co/400x400?text=Product';
            if (imageFile) {
                setUploading(true);
                const formData = new FormData();
                formData.append('image', imageFile);
                const upRes = await api.post('/upload', formData, {
                    ...authHeader(),
                    headers: { ...authHeader().headers, 'Content-Type': 'multipart/form-data' }
                });
                imageUrl = upRes.data.url;
                setUploading(false);
            }
            await api.post('/seller/products', {
                name: newProduct.name, price: parseFloat(newProduct.price),
                description: newProduct.description, category: newProduct.category,
                images: JSON.stringify([imageUrl]),
                discount: parseInt(newProduct.discount) || 0, stock: parseInt(newProduct.stock) || 100
            }, authHeader());
            setAddSuccess(true);
            setTimeout(() => { setAddSuccess(false); setActiveTab('my-products'); }, 1500);
            setNewProduct({ name: '', price: '', description: '', category: 'Electronics', image: '', discount: 0, stock: 100 });
            setImageFile(null);
            fetchProducts();
            fetchStats();
        } catch (err) {
            alert('Error: ' + (err.response?.data?.message || err.message));
            setUploading(false);
        }
        setAddLoading(false);
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete "${name}"?`)) return;
        try {
            await api.delete(`/seller/products/${id}`, authHeader());
            setProducts(prev => prev.filter(p => p.id !== id));
            fetchStats();
        } catch (err) {
            alert('Delete failed: ' + (err.response?.data?.message || err.message));
        }
    };

    const openEdit = (p) => {
        const img = (() => { try { return JSON.parse(p.images)[0]; } catch { return ''; } })();
        setEditData({ name: p.name, price: p.price, description: p.description || '', category: p.category, image: img, discount: p.discount, stock: p.stock });
        setEditProduct(p);
    };

    const handleSaveEdit = async () => {
        try {
            await api.put(`/seller/products/${editProduct.id}`, {
                name: editData.name, price: parseFloat(editData.price),
                description: editData.description, category: editData.category,
                images: JSON.stringify([editData.image || 'https://placehold.co/400x400?text=Product']),
                discount: parseInt(editData.discount) || 0, stock: parseInt(editData.stock) || 0
            }, authHeader());
            setEditProduct(null);
            fetchProducts();
        } catch (err) {
            alert('Save failed: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleProfileSave = async () => {
        if (newPwd && newPwd !== confirmPwd) { setProfileMsg('error:Passwords do not match'); return; }
        setProfileLoading(true);
        setProfileMsg('');
        try {
            const res = await api.put(`/seller/profile/${user.id}`, {
                name: profileName, email: profileEmail,
                currentPassword: currentPwd, newPassword: newPwd
            }, authHeader());
            updateUser(res.data.user);
            setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
            setProfileMsg('success:Profile updated successfully!');
        } catch (err) {
            setProfileMsg('error:' + (err.response?.data?.message || 'Update failed'));
        }
        setProfileLoading(false);
    };

    const filteredProducts = products.filter(p =>
        p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.category?.toLowerCase().includes(productSearch.toLowerCase())
    );

    const lowStockCount = products.filter(p => p.stock < 10).length;

    const sidebarTabs = [
        { id: 'dashboard', label: 'Dashboard', icon: <BarChart2 size={16} /> },
        { id: 'my-products', label: 'My Products', icon: <Package size={16} />, count: products.length },
        { id: 'orders', label: 'My Orders', icon: <ClipboardList size={16} />, count: orders.length },
        { id: 'add-product', label: 'Add Product', icon: <Plus size={16} /> },
        { id: 'profile', label: 'Profile', icon: <User size={16} /> },
    ];

    return (
        <div style={{ background: '#f0fdf4', minHeight: '100vh', display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>

            {/* Edit Product Modal */}
            {editProduct && (
                <Modal title={`Edit — ${editProduct.name}`} onClose={() => setEditProduct(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div><label style={labelStyle}>Product Name</label>
                            <input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} style={inputStyle} /></div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1 }}><label style={labelStyle}>Price (₹)</label>
                                <input type="number" value={editData.price} onChange={e => setEditData({ ...editData, price: e.target.value })} style={inputStyle} /></div>
                            <div style={{ flex: 1 }}><label style={labelStyle}>Discount %</label>
                                <input type="number" value={editData.discount} onChange={e => setEditData({ ...editData, discount: e.target.value })} style={inputStyle} /></div>
                            <div style={{ flex: 1 }}><label style={labelStyle}>Stock</label>
                                <input type="number" value={editData.stock} onChange={e => setEditData({ ...editData, stock: e.target.value })} style={inputStyle} /></div>
                        </div>
                        <div><label style={labelStyle}>Category</label>
                            <select value={editData.category} onChange={e => setEditData({ ...editData, category: e.target.value })} style={inputStyle}>
                                {catList.map(c => <option key={c}>{c}</option>)}</select></div>
                        <div><label style={labelStyle}>Description</label>
                            <textarea value={editData.description} onChange={e => setEditData({ ...editData, description: e.target.value })} style={{ ...inputStyle, resize: 'none' }} rows={2} /></div>
                        <div><label style={labelStyle}>Image URL</label>
                            <input value={editData.image} onChange={e => setEditData({ ...editData, image: e.target.value })} style={inputStyle} /></div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <button onClick={handleSaveEdit} style={{ flex: 1, padding: '10px', fontWeight: 700, fontSize: '13px', borderRadius: '8px', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', border: 'none', cursor: 'pointer' }}>Save Changes</button>
                            <button onClick={() => setEditProduct(null)} style={{ flex: 1, padding: '10px', fontWeight: 600, fontSize: '13px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', border: 'none', cursor: 'pointer' }}>Cancel</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ── Mobile top nav ─────────────────────────────── */}
            {isMobile && (
                <div style={{ background: 'linear-gradient(135deg, #042f2e, #065f46)', position: 'sticky', top: 0, zIndex: 50 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Store size={15} color="white" />
                            </div>
                            <span style={{ color: 'white', fontWeight: 800, fontSize: '14px' }}>Seller Hub</span>
                        </div>
                        <button onClick={() => { logout(); navigate('/'); }} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '6px 10px', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '12px' }}>
                            <LogOut size={13} /> Out
                        </button>
                    </div>
                    <div style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        {sidebarTabs.map(tab => {
                            const active = activeTab === tab.id;
                            return (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '8px 14px', border: 'none', borderBottom: active ? '2px solid #10b981' : '2px solid transparent', background: 'transparent', cursor: 'pointer', color: active ? '#6ee7b7' : 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: active ? 700 : 400, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                    <span style={{ color: active ? '#10b981' : 'rgba(255,255,255,0.3)' }}>{tab.icon}</span>
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Sidebar (desktop) ────────────────────────────── */}
            <div style={{
                width: '230px', flexShrink: 0,
                background: 'linear-gradient(180deg, #042f2e 0%, #065f46 100%)',
                display: isMobile ? 'none' : 'flex', flexDirection: 'column',
                minHeight: '100vh',
                borderRight: '1px solid rgba(255,255,255,0.05)',
            }}>
                {/* Brand */}
                <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '38px', height: '38px', borderRadius: '10px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, boxShadow: '0 4px 12px rgba(16,185,129,0.4)',
                        }}>
                            <Store size={18} color="white" />
                        </div>
                        <div>
                            <p style={{ color: 'white', fontWeight: 800, fontSize: '14px', margin: 0, letterSpacing: '-0.3px' }}>Seller Hub</p>
                            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', margin: 0 }}>ApniDunia</p>
                        </div>
                    </div>

                    <div style={{
                        marginTop: '14px', padding: '12px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '16px', fontWeight: 800, color: 'white', flexShrink: 0,
                                border: '2px solid rgba(255,255,255,0.2)',
                            }}>
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <p style={{ color: 'white', fontWeight: 700, fontSize: '12px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
                                <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '9999px', background: 'rgba(16,185,129,0.25)', color: '#6ee7b7', fontWeight: 700 }}>✓ Verified Seller</span>
                            </div>
                        </div>
                        {lowStockCount > 0 && (
                            <div style={{ marginTop: '8px', padding: '6px 8px', background: 'rgba(251,191,36,0.1)', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <AlertTriangle size={11} style={{ color: '#fbbf24', flexShrink: 0 }} />
                                <span style={{ fontSize: '11px', color: '#fcd34d' }}>{lowStockCount} product{lowStockCount > 1 ? 's' : ''} low on stock</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Nav */}
                <div style={{ flex: 1, padding: '12px 10px' }}>
                    <p style={{
                        fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.2)',
                        letterSpacing: '1.5px', textTransform: 'uppercase',
                        padding: '8px 6px 6px', margin: 0,
                    }}>Navigation</p>

                    {sidebarTabs.map(tab => {
                        const active = activeTab === tab.id;
                        return (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                style={{
                                    width: '100%', textAlign: 'left',
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '10px 10px', marginBottom: '2px',
                                    borderRadius: '9px', border: 'none',
                                    background: active ? 'rgba(16,185,129,0.18)' : 'transparent',
                                    color: active ? '#6ee7b7' : 'rgba(255,255,255,0.45)',
                                    cursor: 'pointer', fontSize: '13px',
                                    fontWeight: active ? 600 : 400,
                                    transition: 'all 0.15s ease',
                                    borderLeft: `3px solid ${active ? '#10b981' : 'transparent'}`,
                                }}
                                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; } }}
                                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; } }}
                            >
                                <span style={{ color: active ? '#10b981' : 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{tab.icon}</span>
                                <span style={{ flex: 1 }}>{tab.label}</span>
                                {tab.count != null && tab.count > 0 && (
                                    <span style={{
                                        fontSize: '11px', padding: '1px 7px', borderRadius: '9999px', fontWeight: 700,
                                        background: active ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)',
                                        color: active ? '#6ee7b7' : 'rgba(255,255,255,0.3)',
                                    }}>{tab.count}</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Bottom */}
                <div style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <button onClick={() => navigate('/')}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: '9px',
                            padding: '9px 10px', marginBottom: '4px', borderRadius: '9px', border: 'none',
                            background: 'transparent', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '12px',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}>
                        <Home size={14} /> Back to Store
                    </button>
                    <button onClick={() => { logout(); navigate('/'); }}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: '9px',
                            padding: '9px 10px', borderRadius: '9px', border: 'none',
                            background: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.16)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}>
                        <LogOut size={14} /> Sign Out
                    </button>
                </div>
            </div>

            {/* ── Main Content ─────────────────────────────────── */}
            <div style={{ flex: 1, minWidth: 0 }}>

                {/* Page Header */}
                <div style={{
                    background: 'white', padding: '14px 24px',
                    borderBottom: '1px solid #d1fae5',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    position: 'sticky', top: 0, zIndex: 10,
                }}>
                    <div>
                        <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.3px' }}>
                            {activeTab === 'dashboard' && 'Overview'}
                            {activeTab === 'my-products' && 'My Products'}
                            {activeTab === 'orders' && 'My Orders'}
                            {activeTab === 'add-product' && 'List New Product'}
                            {activeTab === 'profile' && 'Profile & Security'}
                        </h1>
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: '1px 0 0' }}>
                            {activeTab === 'dashboard' && `${products.length} products · ₹${parseFloat(stats.revenue || 0).toLocaleString('en-IN')} revenue`}
                            {activeTab === 'my-products' && `${filteredProducts.length} of ${products.length} products`}
                            {activeTab === 'orders' && `${orders.length} order${orders.length !== 1 ? 's' : ''} received`}
                            {activeTab === 'add-product' && 'Fill in the details to list a product'}
                            {activeTab === 'profile' && user?.email}
                        </p>
                    </div>
                    {activeTab === 'my-products' && (
                        <button onClick={() => setActiveTab('add-product')}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', border: 'none', borderRadius: '9px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', boxShadow: '0 4px 12px rgba(5,150,105,0.3)' }}>
                            <Plus size={15} /> Add Product
                        </button>
                    )}
                </div>

                <div style={{ padding: '20px 24px' }}>

                    {/* ── Dashboard Tab ──────────────────────────── */}
                    {activeTab === 'dashboard' && (
                        <div>
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: isMobile ? '10px' : '14px', marginBottom: '20px' }}>
                                <StatCard label="My Products" value={stats.totalProducts} icon={<Package size={22} />} color="#10b981" bg="#ecfdf5" sub="Listed for sale" />
                                <StatCard label="Orders Received" value={stats.totalOrders} icon={<ShoppingBag size={22} />} color="#3b82f6" bg="#eff6ff" sub="All time" />
                                <StatCard label="Total Revenue" value={`₹${parseFloat(stats.revenue || 0).toLocaleString('en-IN')}`} icon={<TrendingUp size={22} />} color="#f59e0b" bg="#fffbeb" sub="Gross earnings" />
                            </div>

                            {/* Quick Actions */}
                            <div style={{ background: 'white', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '20px', marginBottom: '16px', border: '1px solid #d1fae5' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '14px', margin: '0 0 14px' }}>Quick Actions</h3>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                    <button onClick={() => setActiveTab('add-product')}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', border: 'none', borderRadius: '9px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', boxShadow: '0 4px 12px rgba(5,150,105,0.25)' }}>
                                        <Plus size={15} /> Add New Product
                                    </button>
                                    <button onClick={() => setActiveTab('my-products')}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'white', color: '#059669', border: '1.5px solid #a7f3d0', borderRadius: '9px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                                        <Package size={15} /> View My Products
                                    </button>
                                    <button onClick={() => setActiveTab('orders')}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'white', color: '#3b82f6', border: '1.5px solid #bfdbfe', borderRadius: '9px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                                        <ClipboardList size={15} /> View Orders
                                    </button>
                                </div>
                            </div>

                            {/* Recent Products */}
                            {products.length > 0 && (
                                <div style={{ background: 'white', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '20px', border: '1px solid #d1fae5' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', margin: 0 }}>Recent Listings</h3>
                                        <button onClick={() => setActiveTab('my-products')}
                                            style={{ fontSize: '12px', color: '#059669', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                            View all →
                                        </button>
                                    </div>
                                    {products.slice(0, 4).map(p => (
                                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', marginBottom: '12px', borderBottom: '1px solid #f0fdf4' }}>
                                            <img src={getImg(p)} alt="" style={{ width: '44px', height: '44px', objectFit: 'contain', background: '#f0fdf4', borderRadius: '8px', flexShrink: 0, border: '1px solid #d1fae5' }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                                                <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>{p.category} · Stock: {p.stock}</p>
                                            </div>
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>₹{parseFloat(p.price).toLocaleString('en-IN')}</p>
                                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#059669' }}>{p.discount}% off</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── My Products Tab ────────────────────────── */}
                    {activeTab === 'my-products' && (
                        <div>
                            {productsLoading ? (
                                <div style={{ background: 'white', borderRadius: '14px', padding: '60px', textAlign: 'center', border: '1px solid #d1fae5' }}>
                                    <div style={{ width: '36px', height: '36px', border: '3px solid #d1fae5', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                                    <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>Loading products...</p>
                                </div>
                            ) : products.length === 0 ? (
                                <div style={{ background: 'white', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '64px', textAlign: 'center', border: '1px solid #d1fae5' }}>
                                    <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                        <Package size={32} style={{ color: '#6ee7b7' }} />
                                    </div>
                                    <p style={{ color: '#374151', fontSize: '16px', fontWeight: 700, margin: '0 0 8px' }}>No products listed yet</p>
                                    <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 20px' }}>Start selling by listing your first product</p>
                                    <button onClick={() => setActiveTab('add-product')}
                                        style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', border: 'none', borderRadius: '9px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', boxShadow: '0 4px 12px rgba(5,150,105,0.3)' }}>
                                        List Your First Product
                                    </button>
                                </div>
                            ) : (
                                <div style={{ background: 'white', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden', border: '1px solid #d1fae5' }}>
                                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4' }}>
                                        <h2 style={{ fontWeight: 700, color: '#111827', fontSize: '13px', margin: 0, display: 'flex', alignItems: 'center', gap: '7px' }}>
                                            <Package size={14} style={{ color: '#10b981' }} />
                                            All Products
                                            <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '9999px', background: '#d1fae5', color: '#059669', fontWeight: 700 }}>{filteredProducts.length}</span>
                                        </h2>
                                        <div style={{ position: 'relative' }}>
                                            <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                            <input placeholder="Search..." value={productSearch} onChange={e => setProductSearch(e.target.value)}
                                                style={{ border: '1px solid #d1fae5', borderRadius: '8px', padding: '7px 12px 7px 28px', fontSize: '12px', outline: 'none', background: 'white', width: '160px' }} />
                                        </div>
                                    </div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: '#f9fafb' }}>
                                                {['Product', 'Category', 'Price', 'Discount', 'Stock', 'Actions'].map((h, i) => (
                                                    <th key={h} style={{ padding: '10px 16px', textAlign: i === 5 ? 'center' : 'left', fontSize: '11px', fontWeight: 700, color: '#6b7280', letterSpacing: '0.5px', textTransform: 'uppercase', borderBottom: '1px solid #f0fdf4' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredProducts.map(p => {
                                                const stockLow = p.stock < 10;
                                                return (
                                                    <tr key={p.id} style={{ borderBottom: '1px solid #f9fafb', transition: 'background 0.15s' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                        <td style={{ padding: '12px 16px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <img src={getImg(p)} alt="" style={{ width: '42px', height: '42px', objectFit: 'contain', background: '#f0fdf4', borderRadius: '8px', flexShrink: 0, border: '1px solid #d1fae5' }} />
                                                                <div>
                                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827', display: 'block', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                                                                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>ID #{p.id}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '12px 16px' }}>
                                                            <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '9999px', background: '#ecfdf5', color: '#059669', fontWeight: 600 }}>{p.category}</span>
                                                        </td>
                                                        <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                                                            ₹{parseFloat(p.price).toLocaleString('en-IN')}
                                                        </td>
                                                        <td style={{ padding: '12px 16px' }}>
                                                            <span style={{ fontSize: '12px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#ecfdf5', color: '#059669' }}>{p.discount}% off</span>
                                                        </td>
                                                        <td style={{ padding: '12px 16px' }}>
                                                            <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 9px', borderRadius: '6px', background: stockLow ? '#fef2f2' : '#ecfdf5', color: stockLow ? '#dc2626' : '#059669', display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}>
                                                                {stockLow && <AlertTriangle size={10} />}
                                                                {p.stock}
                                                                {stockLow && <span style={{ fontSize: '10px' }}>Low</span>}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                                <button onClick={() => openEdit(p)} title="Edit"
                                                                    style={{ width: '30px', height: '30px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ecfdf5', border: 'none', cursor: 'pointer', color: '#059669' }}>
                                                                    <Pencil size={13} />
                                                                </button>
                                                                <button onClick={() => handleDelete(p.id, p.name)} title="Delete"
                                                                    style={{ width: '30px', height: '30px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Orders Tab ─────────────────────────────── */}
                    {activeTab === 'orders' && (
                        <div>
                            {ordersLoading ? (
                                <div style={{ background: 'white', borderRadius: '14px', padding: '60px', textAlign: 'center', border: '1px solid #d1fae5' }}>
                                    <div style={{ width: '36px', height: '36px', border: '3px solid #d1fae5', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                                    <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>Loading orders...</p>
                                </div>
                            ) : orders.length === 0 ? (
                                <div style={{ background: 'white', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '64px', textAlign: 'center', border: '1px solid #d1fae5' }}>
                                    <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                        <ClipboardList size={32} style={{ color: '#6ee7b7' }} />
                                    </div>
                                    <p style={{ color: '#374151', fontSize: '16px', fontWeight: 700, margin: '0 0 8px' }}>No orders yet</p>
                                    <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>Orders for your products will appear here once customers start buying.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {orders.map(order => {
                                        const items = Array.isArray(order.items) ? order.items : [];
                                        const date = new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                                        const time = new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                                        return (
                                            <div key={order.order_id} style={{ background: 'white', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #d1fae5', overflow: 'hidden' }}>
                                                {/* Order header */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: '#f0fdf4', borderBottom: '1px solid #d1fae5', flexWrap: 'wrap', gap: '8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                        <div>
                                                            <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>Order</span>
                                                            <p style={{ fontSize: '13px', fontWeight: 800, color: '#111827', margin: '1px 0 0' }}>#{order.order_id}</p>
                                                        </div>
                                                        <div>
                                                            <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>Date</span>
                                                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151', margin: '1px 0 0' }}>{date} · {time}</p>
                                                        </div>
                                                        <div>
                                                            <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>Customer</span>
                                                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151', margin: '1px 0 0' }}>{order.customer_name || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>Payment</span>
                                                            <p style={{ fontSize: '12px', fontWeight: 600, color: '#374151', margin: '1px 0 0' }}>{order.payment_method}</p>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                                                        <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '9999px', fontWeight: 700, background: order.status === 'Paid' ? '#dcfce7' : '#fef9c3', color: order.status === 'Paid' ? '#15803d' : '#854d0e' }}>
                                                            {order.status}
                                                        </span>
                                                        <p style={{ fontSize: '15px', fontWeight: 800, color: '#059669', margin: 0 }}>
                                                            ₹{parseFloat(order.seller_total).toLocaleString('en-IN')}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Items */}
                                                <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {items.map((item, i) => {
                                                        const imgSrc = (() => { try { const imgs = typeof item.product_images === 'string' ? JSON.parse(item.product_images) : item.product_images; return imgs?.[0] || 'https://placehold.co/40x40?text=P'; } catch { return 'https://placehold.co/40x40?text=P'; } })();
                                                        return (
                                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                <img src={imgSrc} alt="" style={{ width: '46px', height: '46px', objectFit: 'contain', background: '#f0fdf4', borderRadius: '8px', flexShrink: 0, border: '1px solid #d1fae5', padding: '3px' }}
                                                                    onError={e => { e.target.src = 'https://placehold.co/46x46?text=P'; }} />
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_name}</p>
                                                                    <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>Qty: {item.quantity} × ₹{parseFloat(item.price).toLocaleString('en-IN')}</p>
                                                                </div>
                                                                <p style={{ fontSize: '14px', fontWeight: 700, color: '#111827', margin: 0, flexShrink: 0 }}>
                                                                    ₹{(item.quantity * parseFloat(item.price)).toLocaleString('en-IN')}
                                                                </p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {order.address && (
                                                    <div style={{ padding: '8px 18px 12px', borderTop: '1px solid #f0fdf4' }}>
                                                        <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500 }}>Deliver to: </span>
                                                        <span style={{ fontSize: '11px', color: '#6b7280' }}>{order.address}</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Add Product Tab ────────────────────────── */}
                    {activeTab === 'add-product' && (
                        <div style={{ maxWidth: '600px' }}>
                            <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '28px', border: '1px solid #d1fae5' }}>
                                {addSuccess && (
                                    <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#059669', fontSize: '13px', fontWeight: 700 }}>
                                        <CheckCircle size={18} /> Product listed successfully! Redirecting...
                                    </div>
                                )}
                                <form onSubmit={handleAddProduct}>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={labelStyle}>Product Name *</label>
                                        <input placeholder="e.g. Wireless Bluetooth Earbuds" value={newProduct.name}
                                            onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} style={inputStyle} required />
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={labelStyle}>Price (₹) *</label>
                                            <input type="number" placeholder="999" value={newProduct.price}
                                                onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} style={inputStyle} required />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={labelStyle}>Discount %</label>
                                            <input type="number" placeholder="0" value={newProduct.discount}
                                                onChange={e => setNewProduct({ ...newProduct, discount: e.target.value })} style={inputStyle} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={labelStyle}>Stock</label>
                                            <input type="number" placeholder="100" value={newProduct.stock}
                                                onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })} style={inputStyle} />
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={labelStyle}>Category</label>
                                        <select value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })} style={inputStyle}>
                                            {catList.map(c => <option key={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={labelStyle}>Description *</label>
                                        <textarea placeholder="Describe your product features and highlights..." value={newProduct.description}
                                            onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                                            style={{ ...inputStyle, resize: 'none' }} rows={3} required />
                                    </div>
                                    <div style={{ marginBottom: '24px', padding: '16px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #d1fae5' }}>
                                        <label style={{ ...labelStyle, color: '#059669' }}>Product Image</label>
                                        <input type="file" accept="image/*"
                                            onChange={e => {
                                                const file = e.target.files[0];
                                                if (file) { setImageFile(file); setNewProduct({ ...newProduct, image: URL.createObjectURL(file) }); }
                                            }}
                                            style={{ ...inputStyle, padding: '6px 12px', background: 'white', border: '1px solid #d1fae5' }} />
                                        <div style={{ marginTop: '10px' }}>
                                            <label style={{ ...labelStyle, fontSize: '11px', color: '#6b7280' }}>Or paste image URL</label>
                                            <input placeholder="https://example.com/image.jpg" value={imageFile ? '' : newProduct.image}
                                                onChange={e => { setImageFile(null); setNewProduct({ ...newProduct, image: e.target.value }); }}
                                                style={{ ...inputStyle, background: imageFile ? '#f9fafb' : 'white' }} disabled={!!imageFile} />
                                        </div>
                                        {newProduct.image && (
                                            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <img src={newProduct.image} alt="preview" onError={e => e.target.style.display = 'none'}
                                                    style={{ width: '64px', height: '64px', objectFit: 'contain', border: '1px solid #d1fae5', borderRadius: '8px', background: 'white', padding: '4px' }} />
                                                {imageFile && <button type="button" onClick={() => { setImageFile(null); setNewProduct({ ...newProduct, image: '' }); }}
                                                    style={{ fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                                                    Remove
                                                </button>}
                                            </div>
                                        )}
                                    </div>
                                    <button type="submit" disabled={addLoading || uploading}
                                        style={{
                                            width: '100%', padding: '13px', fontWeight: 700, fontSize: '14px', borderRadius: '10px',
                                            background: (addLoading || uploading) ? '#9ca3af' : 'linear-gradient(135deg, #059669, #10b981)',
                                            color: 'white', border: 'none', cursor: (addLoading || uploading) ? 'not-allowed' : 'pointer',
                                            boxShadow: (addLoading || uploading) ? 'none' : '0 4px 12px rgba(5,150,105,0.3)',
                                        }}>
                                        {uploading ? 'Uploading Image...' : addLoading ? 'Listing Product...' : '+ List Product for Sale'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* ── Profile Tab ────────────────────────────── */}
                    {activeTab === 'profile' && (
                        <div style={{ maxWidth: '560px' }}>
                            <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden', border: '1px solid #d1fae5' }}>
                                {/* Profile header */}
                                <div style={{ padding: '24px', background: 'linear-gradient(135deg, #042f2e, #065f46)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', fontWeight: 800, flexShrink: 0, border: '3px solid rgba(255,255,255,0.2)' }}>
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 800, color: 'white', margin: '0 0 4px', fontSize: '16px' }}>{user?.name}</p>
                                        <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '9999px', background: 'rgba(16,185,129,0.25)', color: '#6ee7b7', fontWeight: 700 }}>✓ Verified Seller</span>
                                    </div>
                                </div>

                                <div style={{ padding: '24px' }}>
                                    {profileMsg && (
                                        <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '18px', fontSize: '13px', fontWeight: 600, ...(profileMsg.startsWith('success') ? { background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' } : { background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }) }}>
                                            {profileMsg.replace(/^(success|error):/, '')}
                                        </div>
                                    )}

                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={labelStyle}>Full Name</label>
                                        <input value={profileName} onChange={e => setProfileName(e.target.value)} style={inputStyle} />
                                    </div>
                                    <div style={{ marginBottom: '22px' }}>
                                        <label style={labelStyle}>Email Address</label>
                                        <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} style={inputStyle} />
                                    </div>

                                    <div style={{ borderTop: '1px solid #f0fdf4', paddingTop: '18px', marginBottom: '18px' }}>
                                        <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: '0 0 14px' }}>Change Password</p>
                                        <div style={{ marginBottom: '12px' }}>
                                            <label style={labelStyle}>Current Password</label>
                                            <div style={{ position: 'relative' }}>
                                                <input type={showPwd ? 'text' : 'password'} placeholder="Enter current password" value={currentPwd}
                                                    onChange={e => setCurrentPwd(e.target.value)} style={{ ...inputStyle, paddingRight: '40px' }} />
                                                <button type="button" onClick={() => setShowPwd(!showPwd)}
                                                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}>
                                                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                                                </button>
                                            </div>
                                        </div>
                                        <div style={{ marginBottom: '12px' }}>
                                            <label style={labelStyle}>New Password</label>
                                            <input type="password" placeholder="Enter new password" value={newPwd}
                                                onChange={e => setNewPwd(e.target.value)} style={inputStyle} />
                                        </div>
                                        <div style={{ marginBottom: '4px' }}>
                                            <label style={labelStyle}>Confirm New Password</label>
                                            <input type="password" placeholder="Re-enter new password" value={confirmPwd}
                                                onChange={e => setConfirmPwd(e.target.value)} style={inputStyle} />
                                        </div>
                                        {newPwd && confirmPwd && newPwd !== confirmPwd && (
                                            <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '6px', fontWeight: 500 }}>Passwords do not match</p>
                                        )}
                                    </div>

                                    <button onClick={handleProfileSave} disabled={profileLoading}
                                        style={{ width: '100%', padding: '12px', fontWeight: 700, fontSize: '13px', borderRadius: '10px', background: profileLoading ? '#9ca3af' : 'linear-gradient(135deg, #059669, #10b981)', color: 'white', border: 'none', cursor: profileLoading ? 'not-allowed' : 'pointer', boxShadow: profileLoading ? 'none' : '0 4px 12px rgba(5,150,105,0.25)' }}>
                                        {profileLoading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SellerDashboard;
