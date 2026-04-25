import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, ShoppingCart, Zap, Shield, RefreshCw, Truck, ChevronRight } from 'lucide-react';
import api from '../services/api';
import { useCart } from '../context/CartContext';

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();

    const [product, setProduct] = useState(null);
    const [related, setRelated] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedImg, setSelectedImg] = useState(0);
    const [adding, setAdding] = useState(false);
    const [added, setAdded] = useState(false);
    const [qty, setQty] = useState(1);

    useEffect(() => {
        setLoading(true);
        setSelectedImg(0);
        api.get(`/products/${id}`)
            .then(r => {
                setProduct(r.data);
                // fetch related by category
                api.get(`/products?category=${encodeURIComponent(r.data.category)}`)
                    .then(res => setRelated((res.data || []).filter(p => p.id !== r.data.id).slice(0, 5)))
                    .catch(() => {});
            })
            .catch(() => navigate('/'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return (
        <div style={{ background: '#f1f3f6', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: '40px', height: '40px', border: '4px solid #e0e0e0', borderTopColor: '#2874f0', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ color: '#888', fontSize: '14px' }}>Loading product...</p>
            </div>
        </div>
    );

    if (!product) return null;

    const getImages = () => {
        try {
            const imgs = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
            return Array.isArray(imgs) && imgs.length > 0 ? imgs : ['https://placehold.co/400x400?text=Product'];
        } catch { return ['https://placehold.co/400x400?text=Product']; }
    };

    const images = getImages();
    const price = parseFloat(product.price) || 0;
    const discount = parseInt(product.discount) || 0;
    const originalPrice = discount > 0 ? Math.round(price / (1 - discount / 100)) : price;
    const savings = originalPrice - price;
    const rating = product.rating || (3.5 + (product.id % 15) / 10).toFixed(1);
    const reviews = product.reviews || (1000 + product.id * 37);
    const stock = product.stock ?? 100;

    const handleAddToCart = () => {
        setAdding(true);
        for (let i = 0; i < qty; i++) addToCart(product);
        setAdded(true);
        setTimeout(() => { setAdding(false); setAdded(false); }, 2000);
    };

    const handleBuyNow = () => {
        addToCart(product);
        navigate('/checkout');
    };

    const formatReviews = (n) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n;

    return (
        <div style={{ background: '#f1f3f6', minHeight: '100vh', paddingBottom: '40px' }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {/* Breadcrumb */}
            <div style={{ background: 'white', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#888', flexWrap: 'wrap' }}>
                    <Link to="/" style={{ color: '#2874f0', textDecoration: 'none' }}>Home</Link>
                    <ChevronRight size={12} />
                    <Link to={`/?category=${product.category}`} style={{ color: '#2874f0', textDecoration: 'none' }}>{product.category}</Link>
                    <ChevronRight size={12} />
                    <span style={{ color: '#212121', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>{product.name}</span>
                </div>
            </div>

            <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px' }}>

                {/* Main card */}
                <div style={{ background: 'white', borderRadius: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', gap: '0', overflow: 'hidden', marginBottom: '16px' }}>

                    {/* Left: Image panel */}
                    <div style={{ width: '420px', flexShrink: 0, borderRight: '1px solid #f0f0f0' }}>
                        {/* Main image */}
                        <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '340px', background: 'white', position: 'relative' }}>
                            {discount > 0 && (
                                <span style={{ position: 'absolute', top: '12px', left: '12px', background: '#388e3c', color: 'white', fontSize: '12px', fontWeight: 700, padding: '3px 8px', borderRadius: '3px' }}>
                                    {discount}% off
                                </span>
                            )}
                            <img
                                src={images[selectedImg]}
                                alt={product.name}
                                onError={e => { e.target.src = 'https://placehold.co/400x400?text=Product'; }}
                                style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                            />
                        </div>
                        {/* Thumbnail strip */}
                        {images.length > 1 && (
                            <div style={{ display: 'flex', gap: '8px', padding: '12px 20px', borderTop: '1px solid #f0f0f0', overflowX: 'auto' }}>
                                {images.map((img, i) => (
                                    <div key={i} onClick={() => setSelectedImg(i)}
                                        style={{ width: '52px', height: '52px', flexShrink: 0, border: `2px solid ${selectedImg === i ? '#2874f0' : '#e0e0e0'}`, borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', background: 'white' }}>
                                        <img src={img} alt="" onError={e => { e.target.src = 'https://placehold.co/50x50?text=P'; }}
                                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Action buttons pinned at bottom */}
                        <div style={{ display: 'flex', gap: '0', padding: '16px 20px', borderTop: '1px solid #f0f0f0', gap: '12px' }}>
                            <button onClick={handleAddToCart} disabled={adding || stock === 0}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', fontSize: '14px', fontWeight: 700, borderRadius: '2px', border: 'none', cursor: stock === 0 ? 'not-allowed' : 'pointer', background: added ? '#388e3c' : '#ff9f00', color: 'white', transition: 'background 0.2s' }}>
                                <ShoppingCart size={18} />
                                {added ? 'Added!' : stock === 0 ? 'Out of Stock' : 'ADD TO CART'}
                            </button>
                            <button onClick={handleBuyNow} disabled={stock === 0}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', fontSize: '14px', fontWeight: 700, borderRadius: '2px', border: 'none', cursor: stock === 0 ? 'not-allowed' : 'pointer', background: '#fb641b', color: 'white' }}>
                                <Zap size={18} />
                                BUY NOW
                            </button>
                        </div>
                    </div>

                    {/* Right: Product info */}
                    <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
                        {/* Category badge */}
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '9999px', background: '#e3f2fd', color: '#1565c0', fontWeight: 500, marginBottom: '8px', display: 'inline-block' }}>
                            {product.category}
                        </span>

                        {/* Name */}
                        <h1 style={{ fontSize: '18px', fontWeight: 400, color: '#212121', lineHeight: 1.5, margin: '6px 0 10px' }}>{product.name}</h1>

                        {/* Rating row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid #f0f0f0' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#388e3c', color: 'white', fontSize: '13px', fontWeight: 700, padding: '3px 8px', borderRadius: '3px' }}>
                                {rating} <Star size={11} fill="white" />
                            </span>
                            <span style={{ fontSize: '13px', color: '#878787' }}>{formatReviews(reviews)} Ratings</span>
                            <span style={{ color: '#e0e0e0' }}>|</span>
                            <span style={{ fontSize: '13px', color: '#878787' }}>ApniDunia Assured</span>
                        </div>

                        {/* Price block */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '28px', fontWeight: 700, color: '#212121' }}>
                                    ₹{price.toLocaleString('en-IN')}
                                </span>
                                {discount > 0 && (
                                    <>
                                        <span style={{ fontSize: '16px', color: '#878787', textDecoration: 'line-through' }}>
                                            ₹{originalPrice.toLocaleString('en-IN')}
                                        </span>
                                        <span style={{ fontSize: '16px', fontWeight: 700, color: '#388e3c' }}>
                                            {discount}% off
                                        </span>
                                    </>
                                )}
                            </div>
                            {discount > 0 && (
                                <p style={{ fontSize: '13px', color: '#388e3c', margin: '4px 0 0', fontWeight: 500 }}>
                                    You save ₹{savings.toLocaleString('en-IN')}
                                </p>
                            )}
                        </div>

                        {/* Quantity selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <span style={{ fontSize: '13px', color: '#878787', width: '80px' }}>Quantity</span>
                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '2px', overflow: 'hidden' }}>
                                <button onClick={() => setQty(q => Math.max(1, q - 1))}
                                    style={{ width: '32px', height: '32px', background: 'white', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#444' }}>−</button>
                                <span style={{ width: '36px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#212121' }}>{qty}</span>
                                <button onClick={() => setQty(q => Math.min(stock, q + 1))}
                                    style={{ width: '32px', height: '32px', background: 'white', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#444' }}>+</button>
                            </div>
                            <span style={{ fontSize: '12px', color: stock < 10 ? '#e53935' : '#888' }}>
                                {stock === 0 ? 'Out of Stock' : stock < 10 ? `Only ${stock} left` : 'In Stock'}
                            </span>
                        </div>

                        {/* Offers */}
                        <div style={{ marginBottom: '20px' }}>
                            <p style={{ fontSize: '13px', fontWeight: 700, color: '#212121', marginBottom: '10px' }}>Available Offers</p>
                            {[
                                '10% off on SBI Credit Cards',
                                'No Cost EMI on select cards for orders above ₹3,000',
                                '5% Unlimited Cashback on ApniDunia Axis Bank Credit Card',
                                'Get GST invoice and save up to 28% on business purchases',
                            ].map((offer, i) => (
                                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '6px' }}>
                                    <span style={{ color: '#388e3c', fontSize: '13px', marginTop: '1px', flexShrink: 0 }}>✦</span>
                                    <p style={{ fontSize: '12px', color: '#212121', margin: 0, lineHeight: 1.5 }}>{offer}</p>
                                </div>
                            ))}
                        </div>

                        {/* Delivery info */}
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            {[
                                { icon: <Truck size={16} />, text: 'Free Delivery', sub: 'On orders above ₹499' },
                                { icon: <RefreshCw size={16} />, text: '7 Day Returns', sub: 'Change of mind applicable' },
                                { icon: <Shield size={16} />, text: 'Secure Payment', sub: 'SSL encrypted checkout' },
                            ].map((item) => (
                                <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#f8f9fa', borderRadius: '4px', flex: 1, minWidth: '140px' }}>
                                    <span style={{ color: '#2874f0' }}>{item.icon}</span>
                                    <div>
                                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#212121', margin: 0 }}>{item.text}</p>
                                        <p style={{ fontSize: '11px', color: '#888', margin: 0 }}>{item.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Description */}
                        {product.description && (
                            <div>
                                <p style={{ fontSize: '13px', fontWeight: 700, color: '#212121', marginBottom: '8px' }}>Description</p>
                                <p style={{ fontSize: '13px', color: '#444', lineHeight: 1.8, margin: 0 }}>{product.description}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Related Products */}
                {related.length > 0 && (
                    <div style={{ background: 'white', borderRadius: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#212121', margin: 0 }}>Similar Products</h2>
                        </div>
                        <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                            {related.map(p => {
                                const pImg = (() => { try { const imgs = typeof p.images === 'string' ? JSON.parse(p.images) : p.images; return imgs?.[0] || 'https://placehold.co/200x200?text=P'; } catch { return 'https://placehold.co/200x200?text=P'; } })();
                                const pPrice = parseFloat(p.price) || 0;
                                const pDisc = parseInt(p.discount) || 0;
                                return (
                                    <Link key={p.id} to={`/product/${p.id}`} style={{ textDecoration: 'none', display: 'block', border: '1px solid #f0f0f0', borderRadius: '3px', overflow: 'hidden', cursor: 'pointer' }}
                                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
                                        onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                                        <div style={{ height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9', padding: '10px', position: 'relative' }}>
                                            {pDisc > 0 && <span style={{ position: 'absolute', top: '6px', left: '6px', background: '#388e3c', color: 'white', fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '2px' }}>{pDisc}% off</span>}
                                            <img src={pImg} alt={p.name} onError={e => { e.target.src = 'https://placehold.co/200x200?text=P'; }}
                                                style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                                        </div>
                                        <div style={{ padding: '8px' }}>
                                            <p style={{ fontSize: '12px', color: '#212121', margin: '0 0 4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>{p.name}</p>
                                            <p style={{ fontSize: '13px', fontWeight: 700, color: '#212121', margin: 0 }}>₹{pPrice.toLocaleString('en-IN')}</p>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductDetail;
