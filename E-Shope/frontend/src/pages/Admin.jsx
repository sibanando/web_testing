import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Package, BarChart2, ShoppingBag, Users,
    Trash2, LogOut, Home, UserCheck, Settings, Pencil, X, Eye, EyeOff
} from 'lucide-react';

const inputStyle = {
    width: '100%', border: '1px solid #ddd', borderRadius: '4px',
    padding: '8px 12px', fontSize: '13px', outline: 'none',
    background: 'white', boxSizing: 'border-box'
};

const labelStyle = {
    fontSize: '11px', fontWeight: 600, color: '#666',
    marginBottom: '4px', display: 'block'
};

const Modal = ({ title, onClose, children }) => (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}>
        <div style={{ background: 'white', borderRadius: '2px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', width: '100%', maxWidth: '440px', margin: '0 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #e0e0e0' }}>
                <h3 style={{ fontWeight: 700, color: '#212121', fontSize: '13px', margin: 0 }}>{title}</h3>
                <button onClick={onClose} style={{ color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px' }}>{children}</div>
        </div>
    </div>
);

const Admin = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('products');

    // Products state
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

    // Users state
    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [editUserData, setEditUserData] = useState({});
    const [showNewPassword, setShowNewPassword] = useState(false);

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
                name: newProduct.name,
                price: parseFloat(newProduct.price),
                description: newProduct.description,
                category: newProduct.category,
                images: JSON.stringify([imageUrl]),
                discount: parseInt(newProduct.discount) || 0,
                stock: parseInt(newProduct.stock) || 100
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

    const totalValue = products.reduce((s, p) => s + parseFloat(p.price || 0), 0);
    const categories = [...new Set(products.map(p => p.category))];
    const catList = ['Electronics', 'Fashion', 'Mobiles', 'Home', 'Appliances', 'Sports', 'Beauty', 'Books'];

    const tabs = [
        { id: 'products', label: 'Products', icon: <Package size={16} /> },
        { id: 'users', label: 'Users', icon: <Users size={16} /> },
    ];

    return (
        <div style={{ background: '#f1f3f6', minHeight: '100vh' }}>
            {/* Edit Product Modal */}
            {editProduct && (
                <Modal title={`Edit Product — ${editProduct.name}`} onClose={() => setEditProduct(null)}>
                    <div>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={labelStyle}>Product Name</label>
                            <input value={editProductData.name} onChange={e => setEditProductData({ ...editProductData, name: e.target.value })} style={inputStyle} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
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
                        <div style={{ marginBottom: '12px' }}>
                            <label style={labelStyle}>Category</label>
                            <select value={editProductData.category} onChange={e => setEditProductData({ ...editProductData, category: e.target.value })} style={inputStyle}>
                                {catList.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={labelStyle}>Description</label>
                            <textarea value={editProductData.description} onChange={e => setEditProductData({ ...editProductData, description: e.target.value })} style={{ ...inputStyle, resize: 'none' }} rows={2} />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={labelStyle}>Image URL</label>
                            <input value={editProductData.image} onChange={e => setEditProductData({ ...editProductData, image: e.target.value })} style={inputStyle} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={handleSaveProduct} style={{ flex: 1, padding: '8px', fontWeight: 700, fontSize: '13px', borderRadius: '2px', background: '#2874f0', color: 'white', border: 'none', cursor: 'pointer' }}>Save Changes</button>
                            <button onClick={() => setEditProduct(null)} style={{ flex: 1, padding: '8px', fontWeight: 700, fontSize: '13px', borderRadius: '2px', background: 'white', color: '#444', border: '1px solid #ddd', cursor: 'pointer' }}>Cancel</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Edit User Modal */}
            {editUser && (
                <Modal title={`Edit User — ${editUser.name}`} onClose={() => setEditUser(null)}>
                    <div>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={labelStyle}>Full Name</label>
                            <input value={editUserData.name} onChange={e => setEditUserData({ ...editUserData, name: e.target.value })} style={inputStyle} />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={labelStyle}>Email</label>
                            <input type="email" value={editUserData.email} onChange={e => setEditUserData({ ...editUserData, email: e.target.value })} style={inputStyle} />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={labelStyle}>
                                New Password <span style={{ fontWeight: 400, color: '#aaa' }}>(leave blank to keep current)</span>
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
                                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', display: 'flex' }}>
                                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {editUserData.password && <p style={{ fontSize: '12px', color: '#e65100', marginTop: '4px' }}>⚠ Password will be changed on save</p>}
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={labelStyle}>Role</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button type="button" onClick={() => setEditUserData({ ...editUserData, is_seller: 0 })}
                                    style={{ flex: 1, padding: '8px', fontSize: '12px', fontWeight: 600, borderRadius: '4px', cursor: 'pointer', border: '1px solid', borderColor: !editUserData.is_seller ? '#2874f0' : '#ddd', background: !editUserData.is_seller ? '#e8f0fe' : 'white', color: !editUserData.is_seller ? '#2874f0' : '#666' }}>
                                    User
                                </button>
                                <button type="button" onClick={() => setEditUserData({ ...editUserData, is_seller: 1 })}
                                    style={{ flex: 1, padding: '8px', fontSize: '12px', fontWeight: 600, borderRadius: '4px', cursor: 'pointer', border: '1px solid', borderColor: editUserData.is_seller ? '#388e3c' : '#ddd', background: editUserData.is_seller ? '#e8f5e9' : 'white', color: editUserData.is_seller ? '#388e3c' : '#666' }}>
                                    Seller
                                </button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={handleSaveUser} style={{ flex: 1, padding: '8px', fontWeight: 700, fontSize: '13px', borderRadius: '2px', background: '#2874f0', color: 'white', border: 'none', cursor: 'pointer' }}>Save Changes</button>
                            <button onClick={() => setEditUser(null)} style={{ flex: 1, padding: '8px', fontWeight: 700, fontSize: '13px', borderRadius: '2px', background: 'white', color: '#444', border: '1px solid #ddd', cursor: 'pointer' }}>Cancel</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Admin Header */}
            <div style={{ background: '#2874f0', padding: '12px 24px' }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Settings size={20} style={{ color: '#90caf9' }} />
                        <div>
                            <h1 style={{ fontSize: '17px', fontWeight: 700, color: 'white', margin: 0, lineHeight: 1.2 }}>Admin Dashboard</h1>
                            <p style={{ color: '#90caf9', fontSize: '12px', margin: 0 }}>Welcome, {user?.name}</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            onClick={() => navigate('/')}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#90caf9', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'white'}
                            onMouseLeave={e => e.currentTarget.style.color = '#90caf9'}
                        >
                            <Home size={15} /> Store
                        </button>
                        <button
                            onClick={() => { logout(); navigate('/'); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#90caf9', fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'white'}
                            onMouseLeave={e => e.currentTarget.style.color = '#90caf9'}
                        >
                            <LogOut size={15} /> Logout
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px' }}>
                {/* Stats Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                    {[
                        { label: 'Total Products', value: products.length, icon: <Package size={20} />, color: '#2874f0' },
                        { label: 'Categories', value: categories.length, icon: <BarChart2 size={20} />, color: '#388e3c' },
                        { label: 'Inventory Value', value: `₹${totalValue.toLocaleString('en-IN')}`, icon: <ShoppingBag size={20} />, color: '#ff9f00' },
                        { label: 'Registered Users', value: users.length || '—', icon: <UserCheck size={20} />, color: '#f44336' },
                    ].map(stat => (
                        <div key={stat.label} style={{ background: 'white', borderRadius: '2px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, background: stat.color }}>
                                {stat.icon}
                            </div>
                            <div>
                                <p style={{ fontSize: '11px', color: '#888', margin: '0 0 2px' }}>{stat.label}</p>
                                <p style={{ fontSize: '17px', fontWeight: 700, color: '#212121', margin: 0 }}>{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tab Navigation */}
                <div style={{ background: 'white', borderRadius: '2px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0' }}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '12px 24px', fontSize: '13px', fontWeight: 600,
                                    borderBottom: `2px solid ${activeTab === tab.id ? '#2874f0' : 'transparent'}`,
                                    color: activeTab === tab.id ? '#2874f0' : '#666',
                                    background: 'none', border: 'none',
                                    borderBottom: `2px solid ${activeTab === tab.id ? '#2874f0' : 'transparent'}`,
                                    cursor: 'pointer', transition: 'all 0.2s',
                                }}
                            >
                                {tab.icon}
                                {tab.label}
                                {tab.id === 'products' && (
                                    <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '9999px', fontWeight: 700, background: '#e8f0fe', color: '#2874f0' }}>
                                        {products.length}
                                    </span>
                                )}
                                {tab.id === 'users' && users.length > 0 && (
                                    <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '9999px', fontWeight: 700, background: '#fce8e6', color: '#f44336' }}>
                                        {users.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Products Tab */}
                {activeTab === 'products' && (
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        {/* Add Product Form */}
                        <div style={{ width: '288px', flexShrink: 0 }}>
                            <div style={{ background: 'white', borderRadius: '2px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Plus size={16} style={{ color: '#2874f0' }} />
                                    <h2 style={{ fontWeight: 700, color: '#212121', fontSize: '13px', margin: 0 }}>ADD NEW PRODUCT</h2>
                                </div>
                                <div style={{ padding: '16px' }}>
                                    {submitted && (
                                        <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', color: '#2e7d32', padding: '8px 12px', borderRadius: '4px', fontSize: '12px', marginBottom: '12px' }}>
                                            ✓ Product added successfully!
                                        </div>
                                    )}
                                    <form onSubmit={handleCreateProduct}>
                                        <div style={{ marginBottom: '12px' }}>
                                            <label style={labelStyle}>Product Name *</label>
                                            <input placeholder="e.g. Wireless Headphones" value={newProduct.name}
                                                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                                style={inputStyle} required />
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
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
                                        <div style={{ marginBottom: '12px' }}>
                                            <label style={labelStyle}>Category</label>
                                            <select value={newProduct.category}
                                                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                                                style={inputStyle}>
                                                {catList.map(c => <option key={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div style={{ marginBottom: '12px' }}>
                                            <label style={labelStyle}>Description *</label>
                                            <textarea placeholder="Key features..." value={newProduct.description}
                                                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                                                style={{ ...inputStyle, resize: 'none' }} rows={2} required />
                                        </div>
                                        <div style={{ marginBottom: '12px' }}>
                                            <label style={labelStyle}>Product Image</label>
                                            <input type="file" accept="image/*"
                                                onChange={e => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        setImageFile(file);
                                                        setNewProduct({ ...newProduct, image: URL.createObjectURL(file) });
                                                    }
                                                }}
                                                style={{ ...inputStyle, padding: '5px 10px', fontSize: '12px' }} />
                                            {!imageFile && (
                                                <input placeholder="Or paste image URL..." value={newProduct.image}
                                                    onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                                                    style={{ ...inputStyle, marginTop: '6px', fontSize: '11px' }} />
                                            )}
                                            {imageFile && (
                                                <button type="button" onClick={() => { setImageFile(null); setNewProduct({ ...newProduct, image: '' }); }}
                                                    style={{ fontSize: '11px', color: '#e53935', background: 'none', border: 'none', cursor: 'pointer', marginTop: '4px', padding: 0 }}>
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
                                            style={{ width: '100%', padding: '10px', fontWeight: 700, fontSize: '13px', borderRadius: '2px', background: '#fb641b', color: 'white', border: 'none', cursor: 'pointer' }}>
                                            + Add Product
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>

                        {/* Products Table */}
                        <div style={{ flex: 1, minWidth: 0, background: 'white', borderRadius: '2px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h2 style={{ fontWeight: 700, color: '#212121', fontSize: '13px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Package size={16} style={{ color: '#2874f0' }} />
                                    ALL PRODUCTS ({filteredProducts.length})
                                </h2>
                                <input
                                    placeholder="Search products..."
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '6px 12px', fontSize: '12px', outline: 'none', background: 'white', width: '180px' }}
                                />
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f1f3f6' }}>
                                            {['PRODUCT', 'CATEGORY', 'PRICE', 'DISCOUNT', 'STOCK', 'ACTION'].map((h, i) => (
                                                <th key={h} style={{ padding: '12px 16px', textAlign: i === 5 ? 'center' : 'left', fontSize: '11px', fontWeight: 700, color: '#666' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredProducts.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>
                                                    {productSearch ? 'No products match your search' : 'No products yet'}
                                                </td>
                                            </tr>
                                        ) : filteredProducts.map((product) => {
                                            const img = (() => {
                                                try { return JSON.parse(product.images)[0]; } catch { return ''; }
                                            })();
                                            return (
                                                <tr key={product.id} style={{ borderBottom: '1px solid #f5f5f5' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <img src={img || 'https://via.placeholder.com/40'} alt=""
                                                                style={{ width: '40px', height: '40px', objectFit: 'contain', background: '#f5f5f5', borderRadius: '2px' }} />
                                                            <div>
                                                                <span style={{ fontSize: '13px', fontWeight: 500, color: '#212121', display: 'block', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</span>
                                                                <span style={{ fontSize: '11px', color: '#aaa' }}>ID: {product.id}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '9999px', fontWeight: 500, background: '#e8f0fe', color: '#2874f0' }}>
                                                            {product.category}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700, color: '#212121' }}>
                                                        ₹{parseFloat(product.price).toLocaleString('en-IN')}
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#388e3c' }}>
                                                            {product.discount}% off
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#555' }}>{product.stock}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                            <button onClick={() => openEditProduct(product)}
                                                                style={{ color: '#2874f0', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '2px', display: 'flex' }}
                                                                title="Edit">
                                                                <Pencil size={14} />
                                                            </button>
                                                            <button onClick={() => handleDeleteProduct(product.id, product.name)}
                                                                style={{ color: '#e53935', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '2px', display: 'flex' }}
                                                                title="Delete">
                                                                <Trash2 size={14} />
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

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div style={{ background: 'white', borderRadius: '2px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h2 style={{ fontWeight: 700, color: '#212121', fontSize: '13px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Users size={16} style={{ color: '#2874f0' }} />
                                ALL USERS ({users.length})
                            </h2>
                            <button
                                onClick={fetchUsers}
                                style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '4px', border: '1px solid #90caf9', color: '#2874f0', background: 'white', cursor: 'pointer' }}
                            >
                                Refresh
                            </button>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            {usersLoading ? (
                                <div style={{ textAlign: 'center', padding: '48px 16px', color: '#aaa', fontSize: '13px' }}>Loading users...</div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f1f3f6' }}>
                                            {['ID', 'NAME', 'EMAIL', 'ROLE', 'JOINED', 'ACTION'].map((h, i) => (
                                                <th key={h} style={{ padding: '12px 16px', textAlign: i === 5 ? 'center' : 'left', fontSize: '11px', fontWeight: 700, color: '#666' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.length === 0 ? (
                                            <tr><td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>No users found</td></tr>
                                        ) : users.map((u) => (
                                            <tr key={u.id} style={{ borderBottom: '1px solid #f5f5f5' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#888', fontFamily: 'monospace' }}>#{u.id}</td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px', fontWeight: 700, flexShrink: 0, background: u.is_admin ? '#f44336' : '#2874f0' }}>
                                                            {u.name?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#212121' }}>{u.name}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#555' }}>{u.email}</td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '9999px', fontWeight: 600, ...(u.is_admin ? { background: '#fce8e6', color: '#f44336' } : u.is_seller ? { background: '#e8f5e9', color: '#388e3c' } : { background: '#e8f0fe', color: '#2874f0' }) }}>
                                                        {u.is_admin ? 'Admin' : u.is_seller ? 'Seller' : 'User'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: '12px', color: '#aaa' }}>
                                                    {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', {
                                                        day: '2-digit', month: 'short', year: 'numeric'
                                                    }) : '—'}
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                        <button onClick={() => openEditUser(u)}
                                                            style={{ color: '#2874f0', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '2px', display: 'flex' }}
                                                            title="Edit / Reset password">
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button onClick={() => handleDeleteUser(u.id, u.name)}
                                                            style={{ color: '#e53935', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '2px', display: 'flex' }}
                                                            title="Delete user">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Admin;
