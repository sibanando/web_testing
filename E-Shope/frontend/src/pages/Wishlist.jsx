import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2, Star } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

const Wishlist = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const { removeFromWishlist } = useWishlist();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        api.get('/wishlist')
            .then(r => setItems(r.data || []))
            .catch(() => setItems([]))
            .finally(() => setLoading(false));
    }, [user]);

    const handleRemove = async (productId) => {
        await removeFromWishlist(productId);
        setItems(prev => prev.filter(i => i.product_id !== productId));
    };

    const handleAddToCart = (item) => {
        addToCart({ id: item.id, name: item.name, price: item.price, images: item.images, discount: item.discount });
    };

    const getImage = (images) => {
        try {
            const imgs = typeof images === 'string' ? JSON.parse(images) : images;
            return Array.isArray(imgs) && imgs.length ? imgs[0] : 'https://placehold.co/300x300?text=Product';
        } catch { return 'https://placehold.co/300x300?text=Product'; }
    };

    if (loading) return (
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAF7' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: '36px', height: '36px', border: '3px solid #e0e0e0', borderTopColor: '#E85D04', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ color: '#888', fontSize: '14px' }}>Loading wishlist…</p>
            </div>
        </div>
    );

    return (
        <div style={{ background: '#FAFAF7', minHeight: '100vh', padding: '24px 16px' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                    <Heart size={22} color="#E85D04" fill="#E85D04" />
                    <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', margin: 0 }}>My Wishlist</h1>
                    <span style={{ fontSize: '13px', color: '#94a3b8', marginLeft: '4px' }}>({items.length} items)</span>
                </div>

                {items.length === 0 ? (
                    <div style={{ background: 'white', borderRadius: '16px', padding: '60px 24px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                        <Heart size={48} color="#e2e8f0" style={{ marginBottom: '16px' }} />
                        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>Your wishlist is empty</h2>
                        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>Save items you love and shop them later.</p>
                        <Link to="/" style={{ background: 'linear-gradient(135deg,#E85D04,#FB8500)', color: 'white', padding: '10px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '14px' }}>
                            Explore Products
                        </Link>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                        {items.map(item => {
                            const discount = parseInt(item.discount) || 0;
                            const price = parseFloat(item.price) || 0;
                            const original = discount > 0 ? Math.round(price / (1 - discount / 100)) : price;
                            return (
                                <div key={item.product_id} style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', transition: 'all 0.2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(232,93,4,0.12)'; e.currentTarget.style.borderColor = '#FDE0C0'; }}
                                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#f1f5f9'; }}>
                                    <Link to={`/product/${item.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                                        <div style={{ background: '#FFFBF5', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                                            <img src={getImage(item.images)} alt={item.name}
                                                style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                                                onError={e => { e.currentTarget.src = 'https://placehold.co/300x300?text=Product'; }} />
                                            {discount > 0 && (
                                                <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'linear-gradient(135deg,#dc2626,#f97316)', color: 'white', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px' }}>
                                                    {discount}% off
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                    <div style={{ padding: '12px' }}>
                                        <Link to={`/product/${item.id}`} style={{ textDecoration: 'none' }}>
                                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {item.name}
                                            </p>
                                        </Link>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                                            <Star size={11} fill="#f59e0b" color="#f59e0b" />
                                            <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>{parseFloat(item.rating).toFixed(1)}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '10px' }}>
                                            <span style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>₹{price.toLocaleString('en-IN')}</span>
                                            {discount > 0 && <span style={{ fontSize: '11px', color: '#94a3b8', textDecoration: 'line-through' }}>₹{original.toLocaleString('en-IN')}</span>}
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button onClick={() => handleAddToCart(item)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', background: 'linear-gradient(135deg,#E85D04,#FB8500)', color: 'white', border: 'none', borderRadius: '7px', padding: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                                                <ShoppingCart size={13} /> Add
                                            </button>
                                            <button onClick={() => handleRemove(item.product_id)} style={{ width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', cursor: 'pointer', color: '#dc2626', flexShrink: 0 }}>
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Wishlist;
