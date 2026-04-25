import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Star, ShoppingCart, Check } from 'lucide-react';

const ProductCard = ({ product, compact = false }) => {
    const { addToCart } = useCart();
    const [adding, setAdding] = useState(false);
    const [showAddedMsg, setShowAddedMsg] = useState(false);
    const discountRef = useRef(Math.floor(Math.random() * 60) + 10);

    const handleAdd = (e) => {
        e.stopPropagation();
        e.preventDefault();
        setAdding(true);
        addToCart(product);
        setShowAddedMsg(true);
        setTimeout(() => { setAdding(false); setShowAddedMsg(false); }, 1500);
    };

    const getProductImage = () => {
        try {
            if (product.images) {
                const imgs = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                return imgs[0] || 'https://via.placeholder.com/250x250?text=Product';
            }
        } catch (e) { /* ignore */ }
        return 'https://via.placeholder.com/250x250?text=Product';
    };

    const discount = discountRef.current;
    const price = parseFloat(product.price) || 0;
    const originalPrice = Math.round(price / (1 - discount / 100));
    const rating = (3.5 + Math.random() * 1.5).toFixed(1);
    const reviewCount = Math.floor(Math.random() * 5000) + 100;
    const formatCount = (n) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n;

    if (compact) {
        return (
            <Link to={`/product/${product.id}`} style={{ textDecoration: 'none', display: 'block', background: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e8ecf4', cursor: 'pointer', transition: 'all 0.22s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(26,63,156,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#c7d3f0'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#e8ecf4'; }}>
                <div style={{ position: 'relative', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8faff', height: '130px', overflow: 'hidden' }}>
                    <img src={getProductImage()} alt={product.name}
                        style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                        onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Crect width='250' height='250' fill='%23f0f4ff'/%3E%3Ctext x='125' y='120' text-anchor='middle' font-family='Arial' font-size='13' fill='%2394a3b8'%3ENo Image%3C/text%3E%3C/svg%3E"; }} />
                    <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'linear-gradient(135deg, #dc2626, #f97316)', color: 'white', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', boxShadow: '0 2px 6px rgba(220,38,38,0.3)' }}>
                        {discount}% off
                    </span>
                </div>
                <div style={{ padding: '10px' }}>
                    <p style={{ fontSize: '12px', color: '#1e293b', fontWeight: 500, lineHeight: 1.4, marginBottom: '6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {product.name}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '5px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                            {rating} <Star size={8} fill="white" />
                        </span>
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>({formatCount(reviewCount)})</span>
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>₹{price.toLocaleString('en-IN')}</p>
                </div>
            </Link>
        );
    }

    return (
        <Link to={`/product/${product.id}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', background: 'white', cursor: 'pointer', border: '1px solid #e8ecf4', borderRadius: '2px', transition: 'all 0.22s', position: 'relative', overflow: 'hidden' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 30px rgba(26,63,156,0.13)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = '#c7d3f0'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#e8ecf4'; }}>

            {/* Image */}
            <div style={{ position: 'relative', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(145deg, #f8faff, #f0f4ff)', height: '200px', overflow: 'hidden' }}>
                <img src={getProductImage()} alt={product.name}
                    style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', transition: 'transform 0.3s ease' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.07)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Crect width='250' height='250' fill='%23f0f4ff'/%3E%3Ctext x='125' y='120' text-anchor='middle' font-family='Arial' font-size='13' fill='%2394a3b8'%3ENo Image%3C/text%3E%3C/svg%3E"; }} />

                {/* Discount badge */}
                <span style={{ position: 'absolute', top: '10px', left: '10px', background: 'linear-gradient(135deg, #dc2626, #f97316)', color: 'white', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '5px', boxShadow: '0 2px 8px rgba(220,38,38,0.35)' }}>
                    {discount}% OFF
                </span>

                {showAddedMsg && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)' }}>
                        <span style={{ background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', fontSize: '12px', fontWeight: 700, padding: '8px 16px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(5,150,105,0.4)' }}>
                            <Check size={14} /> Added to Cart
                        </span>
                    </div>
                )}
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, #e2e8f0, transparent)' }} />

            {/* Info */}
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h3 style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500, lineHeight: 1.4, marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
                    {product.name}
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'linear-gradient(135deg, #059669, #10b981)', color: 'white', fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px' }}>
                        {rating} <Star size={9} fill="white" />
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>({formatCount(reviewCount)})</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>₹{price.toLocaleString('en-IN')}</span>
                    <span style={{ fontSize: '12px', color: '#94a3b8', textDecoration: 'line-through' }}>₹{originalPrice.toLocaleString('en-IN')}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#f97316' }}>{discount}% off</span>
                </div>

                <p style={{ fontSize: '11px', color: '#059669', fontWeight: 600, marginBottom: '10px' }}>✦ Free Delivery</p>

                <button onClick={handleAdd} disabled={adding}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px', fontSize: '13px', fontWeight: 600, borderRadius: '6px', border: 'none', cursor: adding ? 'default' : 'pointer', background: adding ? 'linear-gradient(135deg, #059669, #10b981)' : 'linear-gradient(135deg, #1a3f9c, #2563eb)', color: 'white', boxShadow: adding ? '0 4px 12px rgba(5,150,105,0.3)' : '0 4px 12px rgba(26,63,156,0.3)', transition: 'all 0.2s' }}>
                    {adding ? <Check size={15} /> : <ShoppingCart size={15} />}
                    {adding ? 'Added!' : 'Add to Cart'}
                </button>
            </div>
        </Link>
    );
};

export default ProductCard;
