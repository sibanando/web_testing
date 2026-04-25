import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
    Store, Package, Plus, Pencil, Trash2, X,
    BarChart2, ShoppingBag, TrendingUp, LogOut,
    Home, User, Eye, EyeOff, CheckCircle
} from 'lucide-react';

const inputStyle = {
    width: '100%', border: '1px solid #ddd', borderRadius: '4px',
    padding: '8px 12px', fontSize: '13px', outline: 'none',
    background: 'white', boxSizing: 'border-box'
};

const labelStyle = {
    fontSize: '11px', fontWeight: 600, color: '#555',
    marginBottom: '4px', display: 'block'
};

const catList = ['Electronics', 'Fashion', 'Mobiles', 'Home', 'Appliances', 'Sports', 'Beauty', 'Books'];

const Modal = ({ title, onClose, children }) => (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}>
        <div style={{ background: 'white', borderRadius: '4px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', width: '100%', maxWidth: '440px', margin: '0 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #e0e0e0' }}>
                <h3 style={{ fontWeight: 700, color: '#212121', fontSize: '14px', margin: 0 }}>{title}</h3>
                <button onClick={onClose} style={{ color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px' }}>{children}</div>
        </div>
    </div>
);

const SellerDashboard = () => {
    const { user, logout, updateUser } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('dashboard');

    // Products state
    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const [editData, setEditData] = useState({});
    const [stats, setStats] = useState({ totalProducts: 0, totalOrders: 0, revenue: 0 });

    // Add product state
    const [newProduct, setNewProduct] = useState({ name: '', price: '', description: '', category: 'Electronics', image: '', discount: 0, stock: 100 });
    const [addLoading, setAddLoading] = useState(false);
    const [addSuccess, setAddSuccess] = useState(false);
    const [imageFile, setImageFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Profile state
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
            // Upload file if selected
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
                name: newProduct.name,
                price: parseFloat(newProduct.price),
                description: newProduct.description,
                category: newProduct.category,
                images: JSON.stringify([imageUrl]),
                discount: parseInt(newProduct.discount) || 0,
                stock: parseInt(newProduct.stock) || 100
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
        if (newPwd && newPwd !== confirmPwd) {
            setProfileMsg('error:Passwords do not match');
            return;
        }
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

    const sidebarTabs = [
        { id: 'dashboard', label: 'Dashboard', icon: <BarChart2 size={16} /> },
        { id: 'my-products', label: 'My Products', icon: <Package size={16} /> },
        { id: 'add-product', label: 'Add Product', icon: <Plus size={16} /> },
        { id: 'profile', label: 'Profile & Security', icon: <User size={16} /> },
    ];

    return (
        <div style={{ background: '#f1f3f6', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Edit Product Modal */}
            {editProduct && (
                <Modal title={`Edit — ${editProduct.name}`} onClose={() => setEditProduct(null)}>
                    <div>
                        <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Product Name</label>
                            <input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} style={inputStyle} /></div>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            <div style={{ flex: 1 }}><label style={labelStyle}>Price (₹)</label>
                                <input type="number" value={editData.price} onChange={e => setEditData({ ...editData, price: e.target.value })} style={inputStyle} /></div>
                            <div style={{ flex: 1 }}><label style={labelStyle}>Discount %</label>
                                <input type="number" value={editData.discount} onChange={e => setEditData({ ...editData, discount: e.target.value })} style={inputStyle} /></div>
                            <div style={{ flex: 1 }}><label style={labelStyle}>Stock</label>
                                <input type="number" value={editData.stock} onChange={e => setEditData({ ...editData, stock: e.target.value })} style={inputStyle} /></div>
                        </div>
                        <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Category</label>
                            <select value={editData.category} onChange={e => setEditData({ ...editData, category: e.target.value })} style={inputStyle}>
                                {catList.map(c => <option key={c}>{c}</option>)}</select></div>
                        <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Description</label>
                            <textarea value={editData.description} onChange={e => setEditData({ ...editData, description: e.target.value })} style={{ ...inputStyle, resize: 'none' }} rows={2} /></div>
                        <div style={{ marginBottom: '12px' }}><label style={labelStyle}>Image URL</label>
                            <input value={editData.image} onChange={e => setEditData({ ...editData, image: e.target.value })} style={inputStyle} /></div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={handleSaveEdit} style={{ flex: 1, padding: '8px', fontWeight: 700, fontSize: '13px', borderRadius: '2px', background: '#388e3c', color: 'white', border: 'none', cursor: 'pointer' }}>Save Changes</button>
                            <button onClick={() => setEditProduct(null)} style={{ flex: 1, padding: '8px', fontWeight: 700, fontSize: '13px', borderRadius: '2px', background: 'white', color: '#444', border: '1px solid #ddd', cursor: 'pointer' }}>Cancel</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Header */}
            <div style={{ background: '#388e3c', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Store size={22} style={{ color: '#c8e6c9' }} />
                    <div>
                        <h1 style={{ fontSize: '17px', fontWeight: 700, color: 'white', margin: 0, lineHeight: 1.2 }}>Seller Dashboard</h1>
                        <p style={{ color: '#c8e6c9', fontSize: '12px', margin: 0 }}>Welcome, {user?.name}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => navigate('/')}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c8e6c9', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'white'}
                        onMouseLeave={e => e.currentTarget.style.color = '#c8e6c9'}>
                        <Home size={15} /> Store
                    </button>
                    <button onClick={() => { logout(); navigate('/'); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c8e6c9', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'white'}
                        onMouseLeave={e => e.currentTarget.style.color = '#c8e6c9'}>
                        <LogOut size={15} /> Logout
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flex: 1 }}>
                {/* Sidebar */}
                <div style={{ width: '220px', flexShrink: 0, background: 'white', borderRight: '1px solid #e0e0e0', paddingTop: '16px' }}>
                    {/* Seller badge */}
                    <div style={{ padding: '0 16px 16px', borderBottom: '1px solid #f0f0f0', marginBottom: '8px' }}>
                        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: '22px' }}>🏪</div>
                        <p style={{ textAlign: 'center', fontWeight: 700, color: '#212121', fontSize: '13px', margin: '0 0 4px' }}>{user?.name}</p>
                        <div style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '9999px', background: '#e8f5e9', color: '#2e7d32', fontWeight: 600 }}>✓ Verified Seller</span>
                        </div>
                    </div>

                    {sidebarTabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            style={{ width: '100%', textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: activeTab === tab.id ? 600 : 400, display: 'flex', alignItems: 'center', gap: '10px', background: activeTab === tab.id ? '#e8f5e9' : 'transparent', color: activeTab === tab.id ? '#2e7d32' : '#444', border: 'none', borderLeft: `3px solid ${activeTab === tab.id ? '#388e3c' : 'transparent'}`, cursor: 'pointer' }}>
                            {tab.icon} {tab.label}
                            {tab.id === 'my-products' && products.length > 0 && (
                                <span style={{ marginLeft: 'auto', fontSize: '11px', padding: '1px 6px', borderRadius: '9999px', background: '#e8f5e9', color: '#388e3c', fontWeight: 700 }}>{products.length}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Main Content */}
                <div style={{ flex: 1, padding: '20px', overflow: 'auto' }}>

                    {/* ── Dashboard Tab ──────────────────────────────────── */}
                    {activeTab === 'dashboard' && (
                        <div>
                            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#212121', marginBottom: '16px' }}>Overview</h2>

                            {/* Stats */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                                {[
                                    { label: 'My Products', value: stats.totalProducts, icon: <Package size={22} />, color: '#388e3c', bg: '#e8f5e9' },
                                    { label: 'Orders Received', value: stats.totalOrders, icon: <ShoppingBag size={22} />, color: '#2874f0', bg: '#e8f0fe' },
                                    { label: 'Total Revenue', value: `₹${parseFloat(stats.revenue || 0).toLocaleString('en-IN')}`, icon: <TrendingUp size={22} />, color: '#ff9f00', bg: '#fff8e1' },
                                ].map(s => (
                                    <div key={s.label} style={{ background: 'white', borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>
                                            {s.icon}
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '12px', color: '#888', margin: '0 0 4px' }}>{s.label}</p>
                                            <p style={{ fontSize: '20px', fontWeight: 700, color: '#212121', margin: 0 }}>{s.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Quick Actions */}
                            <div style={{ background: 'white', borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '20px', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#212121', marginBottom: '12px' }}>Quick Actions</h3>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                    <button onClick={() => setActiveTab('add-product')}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#388e3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                                        <Plus size={16} /> Add New Product
                                    </button>
                                    <button onClick={() => setActiveTab('my-products')}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#e8f5e9', color: '#388e3c', border: '1px solid #a5d6a7', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                                        <Package size={16} /> View My Products
                                    </button>
                                </div>
                            </div>

                            {/* Recent Products */}
                            {products.length > 0 && (
                                <div style={{ background: 'white', borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '20px' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#212121', marginBottom: '12px' }}>Recent Products</h3>
                                    {products.slice(0, 3).map(p => (
                                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '10px', marginBottom: '10px', borderBottom: '1px solid #f5f5f5' }}>
                                            <img src={getImg(p)} alt="" style={{ width: '40px', height: '40px', objectFit: 'contain', background: '#f5f5f5', borderRadius: '2px', flexShrink: 0 }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontSize: '13px', fontWeight: 500, color: '#212121', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                                                <p style={{ fontSize: '11px', color: '#888', margin: 0 }}>{p.category} · ₹{parseFloat(p.price).toLocaleString('en-IN')}</p>
                                            </div>
                                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#388e3c', flexShrink: 0 }}>{p.discount}% off</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── My Products Tab ────────────────────────────────── */}
                    {activeTab === 'my-products' && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#212121', margin: 0 }}>My Products ({products.length})</h2>
                                <button onClick={() => setActiveTab('add-product')}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#388e3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                                    <Plus size={14} /> Add Product
                                </button>
                            </div>

                            {productsLoading ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#888', fontSize: '14px' }}>Loading...</div>
                            ) : products.length === 0 ? (
                                <div style={{ background: 'white', borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '60px', textAlign: 'center' }}>
                                    <Package size={48} style={{ color: '#ccc', display: 'block', margin: '0 auto 12px' }} />
                                    <p style={{ color: '#888', fontSize: '14px', marginBottom: '16px' }}>You haven't listed any products yet</p>
                                    <button onClick={() => setActiveTab('add-product')}
                                        style={{ padding: '10px 24px', background: '#388e3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                                        Add Your First Product
                                    </button>
                                </div>
                            ) : (
                                <div style={{ background: 'white', borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: '#f1f3f6' }}>
                                                {['PRODUCT', 'CATEGORY', 'PRICE', 'DISCOUNT', 'STOCK', 'ACTION'].map((h, i) => (
                                                    <th key={h} style={{ padding: '12px 16px', textAlign: i === 5 ? 'center' : 'left', fontSize: '11px', fontWeight: 700, color: '#666' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {products.map(p => (
                                                <tr key={p.id} style={{ borderBottom: '1px solid #f5f5f5' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <img src={getImg(p)} alt="" style={{ width: '40px', height: '40px', objectFit: 'contain', background: '#f5f5f5', borderRadius: '2px', flexShrink: 0 }} />
                                                            <div>
                                                                <span style={{ fontSize: '13px', fontWeight: 500, color: '#212121', display: 'block', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                                                                <span style={{ fontSize: '11px', color: '#aaa' }}>ID: {p.id}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '9999px', background: '#e8f5e9', color: '#388e3c', fontWeight: 500 }}>{p.category}</span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700, color: '#212121' }}>
                                                        ₹{parseFloat(p.price).toLocaleString('en-IN')}
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#388e3c' }}>{p.discount}% off</span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: p.stock < 10 ? '#e53935' : '#555' }}>
                                                        {p.stock} {p.stock < 10 && <span style={{ fontSize: '10px' }}>⚠ Low</span>}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                            <button onClick={() => openEdit(p)} title="Edit"
                                                                style={{ color: '#2874f0', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button onClick={() => handleDelete(p.id, p.name)} title="Delete"
                                                                style={{ color: '#e53935', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                                                                <Trash2 size={14} />
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

                    {/* ── Add Product Tab ────────────────────────────────── */}
                    {activeTab === 'add-product' && (
                        <div style={{ maxWidth: '560px' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#212121', marginBottom: '16px' }}>Add New Product</h2>
                            <div style={{ background: 'white', borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '24px' }}>
                                {addSuccess && (
                                    <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '4px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#2e7d32', fontSize: '13px', fontWeight: 600 }}>
                                        <CheckCircle size={16} /> Product listed successfully! Redirecting...
                                    </div>
                                )}
                                <form onSubmit={handleAddProduct}>
                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={labelStyle}>Product Name *</label>
                                        <input placeholder="e.g. Wireless Bluetooth Earbuds" value={newProduct.name}
                                            onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} style={inputStyle} required />
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
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
                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={labelStyle}>Category</label>
                                        <select value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })} style={inputStyle}>
                                            {catList.map(c => <option key={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={labelStyle}>Description *</label>
                                        <textarea placeholder="Describe your product features..." value={newProduct.description}
                                            onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                                            style={{ ...inputStyle, resize: 'none' }} rows={3} required />
                                    </div>
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={labelStyle}>Product Image</label>
                                        <input type="file" accept="image/*"
                                            onChange={e => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    setImageFile(file);
                                                    setNewProduct({ ...newProduct, image: URL.createObjectURL(file) });
                                                }
                                            }}
                                            style={{ ...inputStyle, padding: '6px 12px' }} />
                                        <div style={{ marginTop: '8px' }}>
                                            <label style={{ ...labelStyle, fontSize: '10px', color: '#aaa' }}>Or paste image URL</label>
                                            <input placeholder="https://example.com/image.jpg" value={imageFile ? '' : newProduct.image}
                                                onChange={e => { setImageFile(null); setNewProduct({ ...newProduct, image: e.target.value }); }}
                                                style={inputStyle} disabled={!!imageFile} />
                                        </div>
                                        {newProduct.image && (
                                            <img src={newProduct.image} alt="preview" onError={e => e.target.style.display = 'none'}
                                                style={{ width: '80px', height: '80px', objectFit: 'contain', marginTop: '8px', border: '1px solid #e0e0e0', borderRadius: '4px', padding: '4px' }} />
                                        )}
                                        {imageFile && (
                                            <button type="button" onClick={() => { setImageFile(null); setNewProduct({ ...newProduct, image: '' }); }}
                                                style={{ marginTop: '6px', fontSize: '11px', color: '#e53935', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                                Remove file
                                            </button>
                                        )}
                                    </div>
                                    <button type="submit" disabled={addLoading || uploading}
                                        style={{ width: '100%', padding: '12px', fontWeight: 700, fontSize: '14px', borderRadius: '4px', background: (addLoading || uploading) ? '#ccc' : '#388e3c', color: 'white', border: 'none', cursor: (addLoading || uploading) ? 'not-allowed' : 'pointer' }}>
                                        {uploading ? 'Uploading Image...' : addLoading ? 'Listing Product...' : '+ List Product for Sale'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* ── Profile Tab ────────────────────────────────────── */}
                    {activeTab === 'profile' && (
                        <div style={{ maxWidth: '520px' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#212121', marginBottom: '16px' }}>Profile & Security</h2>

                            <div style={{ background: 'white', borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '24px', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #f0f0f0' }}>
                                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#388e3c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '22px', fontWeight: 700, flexShrink: 0 }}>
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 700, color: '#212121', margin: '0 0 4px', fontSize: '15px' }}>{user?.name}</p>
                                        <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '9999px', background: '#e8f5e9', color: '#2e7d32', fontWeight: 600 }}>✓ Verified Seller</span>
                                    </div>
                                </div>

                                {profileMsg && (
                                    <div style={{ padding: '10px 14px', borderRadius: '4px', marginBottom: '16px', fontSize: '13px', fontWeight: 500, ...(profileMsg.startsWith('success') ? { background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7' } : { background: '#fdecea', color: '#c62828', border: '1px solid #ef9a9a' }) }}>
                                        {profileMsg.replace(/^(success|error):/, '')}
                                    </div>
                                )}

                                <div style={{ marginBottom: '14px' }}>
                                    <label style={labelStyle}>Full Name</label>
                                    <input value={profileName} onChange={e => setProfileName(e.target.value)} style={inputStyle} />
                                </div>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={labelStyle}>Email Address</label>
                                    <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} style={inputStyle} />
                                </div>

                                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '16px', marginBottom: '16px' }}>
                                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#212121', marginBottom: '12px' }}>Change Password</p>
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={labelStyle}>Current Password</label>
                                        <div style={{ position: 'relative' }}>
                                            <input type={showPwd ? 'text' : 'password'} placeholder="Enter current password" value={currentPwd}
                                                onChange={e => setCurrentPwd(e.target.value)} style={{ ...inputStyle, paddingRight: '36px' }} />
                                            <button type="button" onClick={() => setShowPwd(!showPwd)}
                                                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', display: 'flex' }}>
                                                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={labelStyle}>New Password</label>
                                        <input type="password" placeholder="Enter new password" value={newPwd}
                                            onChange={e => setNewPwd(e.target.value)} style={inputStyle} />
                                    </div>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={labelStyle}>Confirm New Password</label>
                                        <input type="password" placeholder="Re-enter new password" value={confirmPwd}
                                            onChange={e => setConfirmPwd(e.target.value)} style={inputStyle} />
                                        {newPwd && confirmPwd && newPwd !== confirmPwd && (
                                            <p style={{ fontSize: '11px', color: '#e53935', marginTop: '4px' }}>Passwords do not match</p>
                                        )}
                                    </div>
                                </div>

                                <button onClick={handleProfileSave} disabled={profileLoading}
                                    style={{ width: '100%', padding: '11px', fontWeight: 700, fontSize: '13px', borderRadius: '4px', background: profileLoading ? '#ccc' : '#388e3c', color: 'white', border: 'none', cursor: profileLoading ? 'not-allowed' : 'pointer' }}>
                                    {profileLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SellerDashboard;
