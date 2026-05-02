import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, ShoppingCart, Zap, Shield, RefreshCw, Truck, ChevronRight, Store, Settings, Heart, MessageCircle } from 'lucide-react';
import api from '../services/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const { user } = useAuth();
    const { wishlistIds, toggleWishlist } = useWishlist();
    const isShopRole = user?.is_admin === 1 || user?.is_seller === 1;

    const [product, setProduct] = useState(null);
    const [related, setRelated] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedImg, setSelectedImg] = useState(0);
    const [adding, setAdding] = useState(false);
    const [added, setAdded] = useState(false);
    const [qty, setQty] = useState(1);

    // Reviews
    const [reviewData, setReviewData] = useState(null);
    const [canReview, setCanReview] = useState(null);
    const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', body: '' });
    const [reviewMsg, setReviewMsg] = useState(null);
    const [wishToggling, setWishToggling] = useState(false);

    useEffect(() => {
        setLoading(true);
        setSelectedImg(0);
        setReviewData(null);
        setCanReview(null);
        api.get(`/products/${id}`)
            .then(r => {
                setProduct(r.data);
                api.get(`/products?category=${encodeURIComponent(r.data.category)}`)
                    .then(res => setRelated((res.data || []).filter(p => p.id !== r.data.id).slice(0, 5)))
                    .catch(() => {});
            })
            .catch(() => navigate('/'))
            .finally(() => setLoading(false));
        api.get(`/reviews/product/${id}`).then(r => setReviewData(r.data)).catch(() => {});
        if (user) api.get(`/reviews/can-review/${id}`).then(r => setCanReview(r.data)).catch(() => {});
    }, [id, user]);

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
                        <div style={{ padding: '16px 20px', borderTop: '1px solid #f0f0f0' }}>
                            {isShopRole ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', background: '#fffbf5', border: '1px solid rgba(232,93,4,0.2)', borderRadius: '4px' }}>
                                    {user.is_admin === 1 ? <Settings size={16} style={{ color: '#E85D04', flexShrink: 0 }} /> : <Store size={16} style={{ color: '#E85D04', flexShrink: 0 }} />}
                                    <div>
                                        <p style={{ fontSize: '13px', fontWeight: 700, color: '#E85D04', margin: '0 0 2px' }}>
                                            {user.is_admin === 1 ? 'Admin View' : 'Seller View'}
                                        </p>
                                        <p style={{ fontSize: '12px', color: '#78716c', margin: 0 }}>
                                            Cart &amp; checkout are for customers only.{' '}
                                            <span
                                                onClick={() => navigate(user.is_admin === 1 ? '/admin' : '/seller')}
                                                style={{ color: '#E85D04', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>
                                                Go to {user.is_admin === 1 ? 'Admin Panel' : 'Seller Dashboard'}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '12px' }}>
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
                            )}
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

                        {/* Quantity selector — customers only */}
                        {!isShopRole && (
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
                        )}

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

                {/* Reviews Section */}
                <div style={{ background: 'white', borderRadius: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '16px' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#212121', margin: 0 }}>Ratings &amp; Reviews</h2>
                            {reviewData?.stats && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#388e3c', color: 'white', fontSize: '13px', fontWeight: 700, padding: '3px 8px', borderRadius: '3px' }}>
                                    {parseFloat(reviewData.stats.avg_rating || 0).toFixed(1)} <Star size={10} fill="white" />
                                </span>
                            )}
                            {reviewData?.stats?.total > 0 && <span style={{ fontSize: '13px', color: '#878787' }}>{reviewData.stats.total} reviews</span>}
                        </div>
                        {/* Wishlist button */}
                        {!isShopRole && (
                            <button onClick={async () => {
                                if (!user) { navigate('/login'); return; }
                                setWishToggling(true);
                                await toggleWishlist(parseInt(id));
                                setWishToggling(false);
                            }} disabled={wishToggling}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', border: `1.5px solid ${wishlistIds?.has(parseInt(id)) ? '#E85D04' : '#e0e0e0'}`, borderRadius: '4px', background: wishlistIds?.has(parseInt(id)) ? '#FFF5EB' : 'white', color: wishlistIds?.has(parseInt(id)) ? '#E85D04' : '#666', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                                <Heart size={15} fill={wishlistIds?.has(parseInt(id)) ? '#E85D04' : 'none'} color={wishlistIds?.has(parseInt(id)) ? '#E85D04' : '#666'} />
                                {wishlistIds?.has(parseInt(id)) ? 'Wishlisted' : 'Wishlist'}
                            </button>
                        )}
                    </div>

                    <div style={{ padding: '16px 20px' }}>
                        {/* Rating distribution */}
                        {reviewData?.distribution?.length > 0 && (
                            <div style={{ display: 'flex', gap: '24px', marginBottom: '20px', alignItems: 'flex-start' }}>
                                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                                    <p style={{ fontSize: '48px', fontWeight: 800, color: '#212121', lineHeight: 1, margin: '0 0 4px' }}>{parseFloat(reviewData?.stats?.avg_rating||0).toFixed(1)}</p>
                                    <p style={{ fontSize: '12px', color: '#878787', margin: 0 }}>{reviewData?.stats?.total||0} ratings</p>
                                </div>
                                <div style={{ flex: 1, maxWidth: '300px' }}>
                                    {[5,4,3,2,1].map(r => {
                                        const d = reviewData.distribution.find(d => parseInt(d.rating) === r);
                                        const cnt = parseInt(d?.count||0);
                                        const total = parseInt(reviewData?.stats?.total||0);
                                        const pct = total > 0 ? (cnt/total)*100 : 0;
                                        return (
                                            <div key={r} style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                                                <span style={{ fontSize:'12px', color:'#212121', width:'10px', textAlign:'right' }}>{r}</span>
                                                <Star size={11} fill="#f59e0b" color="#f59e0b" />
                                                <div style={{ flex:1, height:'8px', background:'#f0f0f0', borderRadius:'4px', overflow:'hidden' }}>
                                                    <div style={{ height:'100%', width:`${pct}%`, background:'#388e3c', borderRadius:'4px' }} />
                                                </div>
                                                <span style={{ fontSize:'11px', color:'#878787', width:'24px' }}>{cnt}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Write review */}
                        {user && !isShopRole && canReview?.can && (
                            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '16px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#212121', margin: '0 0 12px' }}>
                                    Write a Review {canReview.is_verified_buyer && <span style={{ fontSize:'11px', color:'#388e3c', fontWeight:600 }}>(Verified Purchase)</span>}
                                </h3>
                                {reviewMsg && <div style={{ padding:'8px 12px', borderRadius:'6px', fontSize:'12px', marginBottom:'10px', background: reviewMsg.ok?'#ecfdf5':'#fef2f2', color: reviewMsg.ok?'#059669':'#dc2626' }}>{reviewMsg.text}</div>}
                                <div style={{ display:'flex', gap:'4px', marginBottom:'12px' }}>
                                    {[1,2,3,4,5].map(s => (
                                        <button key={s} onClick={() => setReviewForm(p=>({...p,rating:s}))}
                                            style={{ background:'none', border:'none', cursor:'pointer', padding:'2px', fontSize:'22px', color: reviewForm.rating >= s ? '#f59e0b' : '#e0e0e0', lineHeight:1 }}>
                                            ★
                                        </button>
                                    ))}
                                </div>
                                <input value={reviewForm.title} onChange={e => setReviewForm(p=>({...p,title:e.target.value}))} placeholder="Title (optional)"
                                    style={{ width:'100%', padding:'8px 12px', border:'1px solid #e2e8f0', borderRadius:'6px', fontSize:'13px', marginBottom:'8px', outline:'none', boxSizing:'border-box', color:'#212121' }} />
                                <textarea value={reviewForm.body} onChange={e => setReviewForm(p=>({...p,body:e.target.value}))} placeholder="Share your experience with this product…" rows={3}
                                    style={{ width:'100%', padding:'8px 12px', border:'1px solid #e2e8f0', borderRadius:'6px', fontSize:'13px', marginBottom:'10px', outline:'none', resize:'vertical', boxSizing:'border-box', fontFamily:'inherit', color:'#212121' }} />
                                <button onClick={async () => {
                                    setReviewMsg(null);
                                    try {
                                        await api.post('/reviews', { product_id: parseInt(id), rating: reviewForm.rating, title: reviewForm.title, body: reviewForm.body });
                                        setReviewMsg({ ok:true, text:'Review submitted! You earned 50 loyalty points.' });
                                        setCanReview({ can:false, reason:'already_reviewed' });
                                        const r = await api.get(`/reviews/product/${id}`);
                                        setReviewData(r.data);
                                    } catch(err) {
                                        setReviewMsg({ ok:false, text: err.response?.data?.message || 'Failed to submit review' });
                                    }
                                }} style={{ padding:'9px 20px', background:'linear-gradient(135deg,#E85D04,#FB8500)', color:'white', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:700, cursor:'pointer' }}>
                                    Submit Review
                                </button>
                            </div>
                        )}
                        {user && !isShopRole && canReview?.reason === 'already_reviewed' && (
                            <div style={{ padding:'10px 14px', background:'#ecfdf5', borderRadius:'6px', fontSize:'13px', color:'#059669', fontWeight:600, marginBottom:'16px' }}>
                                You have already reviewed this product. Thank you!
                            </div>
                        )}

                        {/* Review list */}
                        {reviewData?.reviews?.length > 0 ? (
                            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                                {reviewData.reviews.map(rev => (
                                    <div key={rev.id} style={{ borderBottom:'1px solid #f0f0f0', paddingBottom:'12px' }}>
                                        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
                                            <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'linear-gradient(135deg,#fbbf24,#f97316)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:800, color:'white' }}>
                                                {rev.user_name?.charAt(0).toUpperCase()}
                                            </div>
                                            <span style={{ fontSize:'13px', fontWeight:600, color:'#212121' }}>{rev.user_name}</span>
                                            {rev.is_verified_buyer ? <span style={{ fontSize:'10px', padding:'1px 6px', borderRadius:'9999px', background:'#ecfdf5', color:'#059669', fontWeight:700 }}>Verified</span> : null}
                                            <span style={{ display:'inline-flex', alignItems:'center', gap:'3px', background:'#388e3c', color:'white', fontSize:'11px', fontWeight:700, padding:'2px 6px', borderRadius:'3px', marginLeft:'auto' }}>
                                                {rev.rating} <Star size={9} fill="white" />
                                            </span>
                                        </div>
                                        {rev.title && <p style={{ fontSize:'13px', fontWeight:700, color:'#212121', margin:'0 0 4px' }}>{rev.title}</p>}
                                        {rev.body && <p style={{ fontSize:'13px', color:'#444', margin:'0 0 6px', lineHeight:1.6 }}>{rev.body}</p>}
                                        <p style={{ fontSize:'11px', color:'#878787', margin:0 }}>{new Date(rev.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign:'center', padding:'32px 0', color:'#878787', fontSize:'13px' }}>
                                <MessageCircle size={32} color="#e0e0e0" style={{ marginBottom:'8px' }} />
                                <p style={{ margin:0 }}>No reviews yet. {user && !isShopRole && canReview?.can ? 'Be the first to review!' : ''}</p>
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
