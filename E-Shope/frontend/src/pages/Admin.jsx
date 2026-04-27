import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Package, BarChart2, ShoppingBag, Users,
    Trash2, LogOut, Home, UserCheck, Pencil, X, Eye, EyeOff,
    Shield, TrendingUp, Search, RefreshCw
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
            background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
        }}>
            <span style={{ color }}>{icon}</span>
        </div>
        <div>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 3px', fontWeight: 500 }}>{label}</p>
            <p style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1 }}>{value}</p>
        </div>
    </div>
);

const Admin = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('products');

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

    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [editUserData, setEditUserData] = useState({});
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [userAuthFilter, setUserAuthFilter] = useState('all');

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        if (!user.is_admin) { navigate('/'); return; }
        fetchProducts();
    }, [user]);

    useEffect(() => {
        if (activeTab === 'users') fetchUsers();
    }, [activeTab]);

    const fetchProducts = async () => {
        try {
            const res = await api.get('/products');
            setProducts(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching products:', err);
        }
    };

    const fetchUsers = async () => {
        setUsersLoading(true);
        try {
            const res = await api.get('/admin/users');
            setUsers(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setUsersLoading(false);
        }
    };

    const handleCreateProduct = async (e) => {
        e.preventDefault();
        try {
            let imageUrl = newProduct.image || 'https://via.placeholder.com/400x400?text=Product';
            if (imageFile) {
                const formData = new FormData();
                formData.append('image', imageFile);
                const upRes = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                imageUrl = upRes.data.url;
            }
            await api.post('/products', {
                name: newProduct.name, price: parseFloat(newProduct.price),
                description: newProduct.description, category: newProduct.category,
                images: JSON.stringify([imageUrl]),
                discount: parseInt(newProduct.discount) || 0, stock: parseInt(newProduct.stock) || 100
            });
            setSubmitted(true);
            setTimeout(() => setSubmitted(false), 3000);
            setNewProduct({ name: '', price: '', description: '', category: 'Electronics', image: '', discount: 20, stock: 100 });
            setImageFile(null);
            fetchProducts();
        } catch (err) {
            alert('Error: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDeleteProduct = async (id, name) => {
        if (!window.confirm(`Delete "${name}"?`)) return;
        try {
            await api.delete(`/admin/products/${id}`);
            setProducts(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            alert('Delete failed: ' + (err.response?.data?.message || err.message));
        }
    };

    const openEditProduct = (product) => {
        const img = (() => { try { return JSON.parse(product.images)[0]; } catch { return ''; } })();
        setEditProductData({ name: product.name, price: product.price, description: product.description || '', category: product.category, image: img, discount: product.discount, stock: product.stock });
        setEditProduct(product);
    };

    const handleSaveProduct = async () => {
        try {
            await api.put(`/admin/products/${editProduct.id}`, {
                name: editProductData.name, price: parseFloat(editProductData.price),
                description: editProductData.description, category: editProductData.category,
                images: JSON.stringify([editProductData.image || 'https://via.placeholder.com/400x400?text=Product']),
                discount: parseInt(editProductData.discount) || 0, stock: parseInt(editProductData.stock) || 0
            });
            setEditProduct(null); fetchProducts();
        } catch (err) { alert('Save failed: ' + (err.response?.data?.message || err.message)); }
    };

    const handleDeleteUser = async (id, userName) => {
        if (!window.confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
        try {
            await api.delete(`/admin/users/${id}`);
            setUsers(prev => prev.filter(u => u.id !== id));
        } catch (err) {
            alert('Delete failed: ' + (err.response?.data?.message || err.message));
        }
    };

    const openEditUser = (u) => {
        setEditUserData({ name: u.name, email: u.email, password: '', is_seller: u.is_seller || 0 });
        setShowNewPassword(false); setEditUser(u);
    };

    const handleSaveUser = async () => {
        try {
            await api.put(`/admin/users/${editUser.id}`, { name: editUserData.name, email: editUserData.email, password: editUserData.password || '', is_seller: editUserData.is_seller });
            setEditUser(null); fetchUsers();
        } catch (err) { alert('Save failed: ' + (err.response?.data?.message || err.message)); }
    };

    const filteredProducts = products.filter(p =>
        p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.category?.toLowerCase().includes(productSearch.toLowerCase())
    );

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.email?.toLowerCase().includes(userSearch.toLowerCase());
        if (!matchesSearch) return false;
        if (userAuthFilter === 'all') return true;
        if (userAuthFilter === 'google') return u.oauth_provider === 'google';
        if (userAuthFilter === 'microsoft') return u.oauth_provider === 'microsoft';
        if (userAuthFilter === 'phone') return !u.oauth_provider && !u.email;
        if (userAuthFilter === 'email') return !u.oauth_provider && !!u.email;
        return true;
    });

    const totalValue = products.reduce((s, p) => s + parseFloat(p.price || 0), 0);
    const categories = [...new Set(products.map(p => p.category))];
    const catList = ['Electronics', 'Fashion', 'Mobiles', 'Home', 'Appliances', 'Sports', 'Beauty', 'Books'];

    const stockColor = (stock) => stock > 50 ? '#16a34a' : stock > 10 ? '#d97706' : '#dc2626';
    const stockBg = (stock) => stock > 50 ? '#f0fdf4' : stock > 10 ? '#fffbeb' : '#fef2f2';

    const navItems = [
        { id: 'products', label: 'Products', icon: <Package size={16} />, count: products.length },
        { id: 'users', label: 'Users', icon: <Users size={16} />, count: users.length || null },
    ];

    return (
        <div style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex' }}>

            {/* Edit Product Modal */}
            {editProduct && (
                <Modal title={`Edit Product — ${editProduct.name}`} onClose={() => setEditProduct(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                            <label style={labelStyle}>Product Name</label>
                            <input value={editProductData.name} onChange={e => setEditProductData({ ...editProductData, name: e.target.value })} style={inputStyle} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Price (₹)</label>
                                <input type="number" value={editProductData.price} onChange={e => setEditProductData({ ...editProductData, price: e.target.value })} style={inputStyle} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Discount %</label>
                                <input type="number" value={editProductData.discount} onChange={e => setEditProductData({ ...editProductData, discount: e.target.value })} style={inputStyle} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Stock</label>
                                <input type="number" value={editProductData.stock} onChange={e => setEditProductData({ ...editProductData, stock: e.target.value })} style={inputStyle} />
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Category</label>
                            <select value={editProductData.category} onChange={e => setEditProductData({ ...editProductData, category: e.target.value })} style={inputStyle}>
                                {catList.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Description</label>
                            <textarea value={editProductData.description} onChange={e => setEditProductData({ ...editProductData, description: e.target.value })} style={{ ...inputStyle, resize: 'none' }} rows={2} />
                        </div>
                        <div>
                            <label style={labelStyle}>Image URL</label>
                            <input value={editProductData.image} onChange={e => setEditProductData({ ...editProductData, image: e.target.value })} style={inputStyle} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <button onClick={handleSaveProduct} style={{ flex: 1, padding: '10px', fontWeight: 700, fontSize: '13px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', cursor: 'pointer' }}>Save Changes</button>
                            <button onClick={() => setEditProduct(null)} style={{ flex: 1, padding: '10px', fontWeight: 600, fontSize: '13px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', border: 'none', cursor: 'pointer' }}>Cancel</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Edit User Modal */}
            {editUser && (
                <Modal title={`Edit User — ${editUser.name}`} onClose={() => setEditUser(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                            <label style={labelStyle}>Full Name</label>
                            <input value={editUserData.name} onChange={e => setEditUserData({ ...editUserData, name: e.target.value })} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Email</label>
                            <input type="email" value={editUserData.email} onChange={e => setEditUserData({ ...editUserData, email: e.target.value })} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>
                                New Password <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '11px' }}>(leave blank to keep current)</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    placeholder="Enter new password to reset..."
                                    value={editUserData.password}
                                    onChange={e => setEditUserData({ ...editUserData, password: e.target.value })}
                                    style={{ ...inputStyle, paddingRight: '36px' }}
                                />
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
                                <button type="button" onClick={() => setEditUserData({ ...editUserData, is_seller: 0 })}
                                    style={{ flex: 1, padding: '9px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', border: '2px solid', borderColor: !editUserData.is_seller ? '#6366f1' : '#e2e8f0', background: !editUserData.is_seller ? '#eff6ff' : 'white', color: !editUserData.is_seller ? '#4f46e5' : '#94a3b8' }}>
                                    Customer
                                </button>
                                <button type="button" onClick={() => setEditUserData({ ...editUserData, is_seller: 1 })}
                                    style={{ flex: 1, padding: '9px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', border: '2px solid', borderColor: editUserData.is_seller ? '#10b981' : '#e2e8f0', background: editUserData.is_seller ? '#ecfdf5' : 'white', color: editUserData.is_seller ? '#059669' : '#94a3b8' }}>
                                    Seller
                                </button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <button onClick={handleSaveUser} style={{ flex: 1, padding: '10px', fontWeight: 700, fontSize: '13px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', cursor: 'pointer' }}>Save Changes</button>
                            <button onClick={() => setEditUser(null)} style={{ flex: 1, padding: '10px', fontWeight: 600, fontSize: '13px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', border: 'none', cursor: 'pointer' }}>Cancel</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ── Sidebar ─────────────────────────────────────── */}
            <div style={{
                width: '240px', flexShrink: 0,
                background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
                display: 'flex', flexDirection: 'column',
                minHeight: '100vh',
                borderRight: '1px solid rgba(255,255,255,0.05)',
            }}>
                {/* Brand */}
                <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '38px', height: '38px', borderRadius: '10px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
                        }}>
                            <Shield size={18} color="white" />
                        </div>
                        <div>
                            <p style={{ color: 'white', fontWeight: 800, fontSize: '14px', margin: 0, letterSpacing: '-0.3px' }}>Admin Portal</p>
                            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', margin: 0, letterSpacing: '0.5px' }}>ApniDunia</p>
                        </div>
                    </div>

                    <div style={{
                        marginTop: '14px', padding: '10px 12px',
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', gap: '10px',
                    }}>
                        <div style={{
                            width: '34px', height: '34px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '13px', fontWeight: 800, color: 'white', flexShrink: 0,
                        }}>
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <p style={{ color: 'white', fontWeight: 600, fontSize: '12px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
                            <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '9999px', background: 'rgba(99,102,241,0.25)', color: '#a5b4fc', fontWeight: 600 }}>Administrator</span>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <div style={{ flex: 1, padding: '12px 10px' }}>
                    <p style={{
                        fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.2)',
                        letterSpacing: '1.5px', textTransform: 'uppercase',
                        padding: '8px 6px 6px', margin: 0,
                    }}>Management</p>

                    {navItems.map(tab => {
                        const active = activeTab === tab.id;
                        return (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                style={{
                                    width: '100%', textAlign: 'left',
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '10px 10px', marginBottom: '2px',
                                    borderRadius: '9px', border: 'none',
                                    background: active ? 'rgba(99,102,241,0.18)' : 'transparent',
                                    color: active ? '#c7d2fe' : 'rgba(255,255,255,0.45)',
                                    cursor: 'pointer', fontSize: '13px',
                                    fontWeight: active ? 600 : 400,
                                    transition: 'all 0.15s ease',
                                    borderLeft: `3px solid ${active ? '#6366f1' : 'transparent'}`,
                                }}
                                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; } }}
                                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; } }}
                            >
                                <span style={{ color: active ? '#818cf8' : 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{tab.icon}</span>
                                <span style={{ flex: 1 }}>{tab.label}</span>
                                {tab.count != null && (
                                    <span style={{
                                        fontSize: '11px', padding: '1px 7px', borderRadius: '9999px', fontWeight: 700,
                                        background: active ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.08)',
                                        color: active ? '#a5b4fc' : 'rgba(255,255,255,0.3)',
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
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

                {/* Page Header */}
                <div style={{
                    background: 'white', padding: '14px 24px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    position: 'sticky', top: 0, zIndex: 10,
                }}>
                    <div>
                        <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                            {activeTab === 'products' ? 'Product Catalogue' : 'User Management'}
                        </h1>
                        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '1px 0 0' }}>
                            {activeTab === 'products'
                                ? `${filteredProducts.length} of ${products.length} products`
                                : `${filteredUsers.length} of ${users.length} users`}
                        </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={activeTab === 'products' ? fetchProducts : fetchUsers}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px',
                                border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white',
                                color: '#64748b', cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                            }}>
                            <RefreshCw size={13} /> Refresh
                        </button>
                    </div>
                </div>

                <div style={{ padding: '20px 24px', flex: 1 }}>
                    {/* Stats Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
                        <StatCard label="Total Products" value={products.length} icon={<Package size={22} />} color="#3b82f6" bg="#eff6ff" />
                        <StatCard label="Categories" value={categories.length} icon={<BarChart2 size={22} />} color="#10b981" bg="#ecfdf5" />
                        <StatCard label="Inventory Value" value={`₹${totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} icon={<TrendingUp size={22} />} color="#f59e0b" bg="#fffbeb" />
                        <StatCard label="Registered Users" value={users.length || '—'} icon={<UserCheck size={22} />} color="#8b5cf6" bg="#f5f3ff" />
                    </div>

                    {/* ── Products Tab ────────────────────────── */}
                    {activeTab === 'products' && (
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>

                            {/* Add Product Form */}
                            <div style={{ width: '280px', flexShrink: 0 }}>
                                <div style={{ background: 'white', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
                                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Plus size={14} color="white" />
                                        </div>
                                        <h2 style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', margin: 0 }}>Add New Product</h2>
                                    </div>
                                    <div style={{ padding: '16px' }}>
                                        {submitted && (
                                            <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#059669', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', marginBottom: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                ✓ Product added successfully!
                                            </div>
                                        )}
                                        <form onSubmit={handleCreateProduct}>
                                            <div style={{ marginBottom: '10px' }}>
                                                <label style={labelStyle}>Product Name *</label>
                                                <input placeholder="e.g. Wireless Headphones" value={newProduct.name}
                                                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                                    style={inputStyle} required />
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={labelStyle}>Price (₹) *</label>
                                                    <input type="number" placeholder="999" value={newProduct.price}
                                                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                                                        style={inputStyle} required />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label style={labelStyle}>Discount %</label>
                                                    <input type="number" placeholder="20" value={newProduct.discount}
                                                        onChange={(e) => setNewProduct({ ...newProduct, discount: e.target.value })}
                                                        style={inputStyle} />
                                                </div>
                                            </div>
                                            <div style={{ marginBottom: '10px' }}>
                                                <label style={labelStyle}>Category</label>
                                                <select value={newProduct.category}
                                                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                                                    style={inputStyle}>
                                                    {catList.map(c => <option key={c}>{c}</option>)}
                                                </select>
                                            </div>
                                            <div style={{ marginBottom: '10px' }}>
                                                <label style={labelStyle}>Description *</label>
                                                <textarea placeholder="Key features..." value={newProduct.description}
                                                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                                                    style={{ ...inputStyle, resize: 'none' }} rows={2} required />
                                            </div>
                                            <div style={{ marginBottom: '10px' }}>
                                                <label style={labelStyle}>Product Image</label>
                                                <input type="file" accept="image/*"
                                                    onChange={e => {
                                                        const file = e.target.files[0];
                                                        if (file) { setImageFile(file); setNewProduct({ ...newProduct, image: URL.createObjectURL(file) }); }
                                                    }}
                                                    style={{ ...inputStyle, padding: '5px 8px', fontSize: '11px' }} />
                                                {!imageFile && (
                                                    <input placeholder="Or paste image URL..." value={newProduct.image}
                                                        onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                                                        style={{ ...inputStyle, marginTop: '6px', fontSize: '11px' }} />
                                                )}
                                                {imageFile && (
                                                    <button type="button" onClick={() => { setImageFile(null); setNewProduct({ ...newProduct, image: '' }); }}
                                                        style={{ fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', marginTop: '4px', padding: 0 }}>
                                                        Remove file
                                                    </button>
                                                )}
                                            </div>
                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={labelStyle}>Stock</label>
                                                <input type="number" placeholder="100" value={newProduct.stock}
                                                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                                                    style={inputStyle} />
                                            </div>
                                            <button type="submit"
                                                style={{
                                                    width: '100%', padding: '10px', fontWeight: 700, fontSize: '13px',
                                                    borderRadius: '8px',
                                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                                    color: 'white', border: 'none', cursor: 'pointer',
                                                    boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                                                }}>
                                                + Add Product
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>

                            {/* Products Table */}
                            <div style={{ flex: 1, minWidth: 0, background: 'white', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                                <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
                                    <h2 style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', margin: 0, display: 'flex', alignItems: 'center', gap: '7px' }}>
                                        <Package size={15} style={{ color: '#6366f1' }} />
                                        All Products
                                        <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '9999px', background: '#eff6ff', color: '#3b82f6', fontWeight: 700 }}>{filteredProducts.length}</span>
                                    </h2>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input
                                            placeholder="Search products..."
                                            value={productSearch}
                                            onChange={(e) => setProductSearch(e.target.value)}
                                            style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '7px 12px 7px 30px', fontSize: '12px', outline: 'none', background: 'white', width: '190px', color: '#1e293b' }}
                                        />
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
                                                <tr>
                                                    <td colSpan={6} style={{ padding: '48px 16px', textAlign: 'center' }}>
                                                        <Package size={32} style={{ color: '#e2e8f0', display: 'block', margin: '0 auto 10px' }} />
                                                        <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>{productSearch ? 'No products match your search' : 'No products yet'}</p>
                                                    </td>
                                                </tr>
                                            ) : filteredProducts.map((product) => {
                                                const img = (() => { try { return JSON.parse(product.images)[0]; } catch { return ''; } })();
                                                return (
                                                    <tr key={product.id} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                        <td style={{ padding: '12px 16px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <img src={img || 'https://via.placeholder.com/40'} alt=""
                                                                    style={{ width: '42px', height: '42px', objectFit: 'contain', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9', padding: '2px' }} />
                                                                <div>
                                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'block', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</span>
                                                                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>ID #{product.id}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '12px 16px' }}>
                                                            <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '9999px', fontWeight: 600, background: '#eff6ff', color: '#3b82f6' }}>
                                                                {product.category}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                                                            ₹{parseFloat(product.price).toLocaleString('en-IN')}
                                                        </td>
                                                        <td style={{ padding: '12px 16px' }}>
                                                            <span style={{ fontSize: '12px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#ecfdf5', color: '#059669' }}>
                                                                {product.discount}% off
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '12px 16px' }}>
                                                            <span style={{ fontSize: '12px', fontWeight: 700, padding: '3px 9px', borderRadius: '6px', background: stockBg(product.stock), color: stockColor(product.stock) }}>
                                                                {product.stock}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                                <button onClick={() => openEditProduct(product)}
                                                                    style={{ width: '30px', height: '30px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eff6ff', border: 'none', cursor: 'pointer', color: '#3b82f6' }}
                                                                    title="Edit">
                                                                    <Pencil size={13} />
                                                                </button>
                                                                <button onClick={() => handleDeleteProduct(product.id, product.name)}
                                                                    style={{ width: '30px', height: '30px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                                                                    title="Delete">
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
                            </div>
                        </div>
                    )}

                    {/* ── Users Tab ────────────────────────────── */}
                    {activeTab === 'users' && (
                        <div style={{ background: 'white', borderRadius: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', flexWrap: 'wrap' }}>
                                <h2 style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', margin: 0, display: 'flex', alignItems: 'center', gap: '7px' }}>
                                    <Users size={15} style={{ color: '#8b5cf6' }} />
                                    All Users
                                    <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '9999px', background: '#f5f3ff', color: '#8b5cf6', fontWeight: 700 }}>{filteredUsers.length}</span>
                                </h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <select
                                        value={userAuthFilter}
                                        onChange={e => setUserAuthFilter(e.target.value)}
                                        style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '7px 10px', fontSize: '12px', outline: 'none', background: 'white', color: '#475569', cursor: 'pointer' }}>
                                        <option value="all">All Methods</option>
                                        <option value="email">Email</option>
                                        <option value="phone">Phone / OTP</option>
                                        <option value="google">Google</option>
                                        <option value="microsoft">Microsoft</option>
                                    </select>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input
                                            placeholder="Search users..."
                                            value={userSearch}
                                            onChange={(e) => setUserSearch(e.target.value)}
                                            style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '7px 12px 7px 30px', fontSize: '12px', outline: 'none', background: 'white', width: '190px', color: '#1e293b' }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                {usersLoading ? (
                                    <div style={{ textAlign: 'center', padding: '48px 16px' }}>
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
                                                <tr><td colSpan={6} style={{ padding: '48px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No users found</td></tr>
                                            ) : filteredUsers.map((u) => {
                                                const roleConfig = u.is_admin
                                                    ? { label: 'Admin', bg: '#fef2f2', color: '#dc2626' }
                                                    : u.is_seller
                                                        ? { label: 'Seller', bg: '#ecfdf5', color: '#059669' }
                                                        : { label: 'Customer', bg: '#eff6ff', color: '#2563eb' };
                                                const avatarBg = u.is_admin ? 'linear-gradient(135deg, #ef4444, #dc2626)' : u.is_seller ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #6366f1, #4f46e5)';
                                                const authMethod = u.oauth_provider === 'google'
                                                    ? { label: 'Google', bg: '#fef9f0', color: '#d97706', border: '#fde68a' }
                                                    : u.oauth_provider === 'microsoft'
                                                        ? { label: 'Microsoft', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' }
                                                        : u.email
                                                            ? { label: 'Email', bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' }
                                                            : { label: 'Phone / OTP', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' };
                                                return (
                                                    <tr key={u.id} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                        <td style={{ padding: '12px 16px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', fontWeight: 800, flexShrink: 0 }}>
                                                                    {u.name?.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', display: 'block' }}>{u.name}</span>
                                                                    <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>#{u.id}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '12px 16px' }}>
                                                            {u.email && <div style={{ fontSize: '12px', color: '#475569' }}>{u.email}</div>}
                                                            {u.phone && <div style={{ fontSize: '11px', color: '#94a3b8' }}>+91 {u.phone}</div>}
                                                        </td>
                                                        <td style={{ padding: '12px 16px' }}>
                                                            <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '9999px', fontWeight: 700, background: authMethod.bg, color: authMethod.color, border: `1px solid ${authMethod.border}`, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                {u.oauth_provider === 'google' && <span style={{ fontSize: '10px' }}>G</span>}
                                                                {u.oauth_provider === 'microsoft' && <span style={{ fontSize: '10px' }}>M</span>}
                                                                {authMethod.label}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '12px 16px' }}>
                                                            <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '9999px', fontWeight: 700, background: roleConfig.bg, color: roleConfig.color }}>
                                                                {roleConfig.label}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '12px 16px', fontSize: '12px', color: '#94a3b8' }}>
                                                            {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                        </td>
                                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                                <button onClick={() => openEditUser(u)}
                                                                    style={{ width: '30px', height: '30px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eff6ff', border: 'none', cursor: 'pointer', color: '#3b82f6' }}
                                                                    title="Edit user">
                                                                    <Pencil size={13} />
                                                                </button>
                                                                <button onClick={() => handleDeleteUser(u.id, u.name)}
                                                                    style={{ width: '30px', height: '30px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                                                                    title="Delete user">
                                                                    <Trash2 size={13} />
                                                                </button>
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
                </div>
            </div>
        </div>
    );
};

export default Admin;
