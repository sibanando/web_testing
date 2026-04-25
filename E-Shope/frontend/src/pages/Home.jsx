import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import useResponsive from '../hooks/useResponsive';

const Home = () => {
    const [products, setProducts] = useState([]);
    const [currentSlide, setCurrentSlide] = useState(0);
    const dealExpiry = useRef(() => {
        const stored = localStorage.getItem('deal_expiry');
        if (stored && parseInt(stored) > Date.now()) return parseInt(stored);
        const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24h from now
        localStorage.setItem('deal_expiry', String(expiry));
        return expiry;
    }).current();

    const getTimeLeft = () => {
        const diff = Math.max(0, dealExpiry - Date.now());
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        return { h, m, s };
    };
    const [timeLeft, setTimeLeft] = useState(getTimeLeft);
    const { isMobile, isTablet } = useResponsive();
    const [subEmail, setSubEmail] = useState('');
    const [subStatus, setSubStatus] = useState(null); // null | 'success' | 'already' | 'error'
    const [subLoading, setSubLoading] = useState(false);
    const [searchParams] = useSearchParams();
    const activeCategory = searchParams.get('category');
    const activeSearch = searchParams.get('search');

    const slides = [
        { image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=300&fit=crop', alt: 'Sale Banner' },
        { image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=300&fit=crop', alt: 'New Arrivals' },
        { image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&h=300&fit=crop', alt: 'Fashion Sale' },
        { image: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=1200&h=300&fit=crop', alt: 'Electronics' }
    ];

    const categories = [
        { name: 'Grocery', emoji: '🛒', bg: '#f1f8e9' },
        { name: 'Mobiles', emoji: '📱', bg: '#e3f2fd' },
        { name: 'Fashion', emoji: '👗', bg: '#fce4ec' },
        { name: 'Electronics', emoji: '💻', bg: '#e8eaf6' },
        { name: 'Home', emoji: '🏠', bg: '#fff3e0' },
        { name: 'Appliances', emoji: '🔌', bg: '#e0f2f1' },
        { name: 'Travel', emoji: '✈️', bg: '#e8f5e9' },
        { name: 'Beauty', emoji: '💄', bg: '#fdf6f0' },
        { name: 'Jewellery', emoji: '💍', bg: '#fff9e6' },
        { name: 'Sports', emoji: '⚽', bg: '#e3f2fd' },
    ];

    const topOffers = [
        { title: 'Best of Electronics', category: 'Electronics', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=200&fit=crop', discount: 'Up to 70% Off', bg: '#e3f2fd' },
        { title: 'Fashion Top Picks', category: 'Fashion', image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=200&fit=crop', discount: 'Min. 40% Off', bg: '#fce4ec' },
        { title: 'Home Essentials', category: 'Home', image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=200&fit=crop', discount: 'Starting ₹149', bg: '#fff3e0' },
        { title: 'Sports & Fitness', category: 'Sports', image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=200&fit=crop', discount: 'Up to 60% Off', bg: '#e8f5e9' }
    ];

    useEffect(() => {
        const timer = setInterval(() => setCurrentSlide((p) => (p + 1) % slides.length), 4000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const countdown = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
        return () => clearInterval(countdown);
    }, []);

    useEffect(() => {
        const params = new URLSearchParams();
        if (activeCategory) params.set('category', activeCategory);
        if (activeSearch) params.set('search', activeSearch);
        const url = `/products${params.toString() ? '?' + params.toString() : ''}`;
        api.get(url).then(r => { if (Array.isArray(r.data)) setProducts(r.data); }).catch(() => {});
    }, [activeCategory, activeSearch]);

    const handleSubscribe = async () => {
        if (!subEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(subEmail)) {
            setSubStatus('error');
            setTimeout(() => setSubStatus(null), 3000);
            return;
        }
        setSubLoading(true);
        setSubStatus(null);
        try {
            await api.post('/subscribe', { email: subEmail.trim() });
            setSubStatus('success');
            setSubEmail('');
        } catch (err) {
            const already = err.response?.data?.already;
            setSubStatus(already ? 'already' : 'error');
        } finally {
            setSubLoading(false);
            setTimeout(() => setSubStatus(null), 4000);
        }
    };

    const pad = (n) => String(n).padStart(2, '0');

    const sectionCard = { background: 'white', borderRadius: '10px', boxShadow: '0 2px 12px rgba(28,25,23,0.07)', overflow: 'hidden', marginBottom: '20px', border: '1px solid #F5F0EA' };
    const sectionHeader = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #FFF0E4', background: 'linear-gradient(to right, #FFFBF5, #ffffff)', borderLeft: '4px solid #E85D04' };

    return (
        <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>

            {/* Hero Carousel */}
            <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #1C0A00, #3D1A00)', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
                <div style={{ position: 'relative', height: '300px' }}>
                    {slides.map((slide, i) => (
                        <div key={i} style={{ position: 'absolute', inset: 0, opacity: i === currentSlide ? 1 : 0, transition: 'opacity 0.8s ease' }}>
                            <img src={slide.image} alt={slide.alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(28,10,0,0.55) 0%, transparent 50%)' }} />
                        </div>
                    ))}
                    <button onClick={() => setCurrentSlide((currentSlide - 1 + slides.length) % slides.length)}
                        style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '38px', height: '38px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                        <ChevronLeft size={20} color="#E85D04" />
                    </button>
                    <button onClick={() => setCurrentSlide((currentSlide + 1) % slides.length)}
                        style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '38px', height: '38px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                        <ChevronRight size={20} color="#E85D04" />
                    </button>
                    <div style={{ position: 'absolute', bottom: '14px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '7px', zIndex: 10 }}>
                        {slides.map((_, i) => (
                            <button key={i} onClick={() => setCurrentSlide(i)}
                                style={{ border: 'none', borderRadius: '999px', background: i === currentSlide ? 'white' : 'rgba(255,255,255,0.45)', width: i === currentSlide ? '28px' : '8px', height: '8px', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: i === currentSlide ? '0 2px 8px rgba(0,0,0,0.3)' : 'none' }} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '20px 16px' }}>

                {/* Categories */}
                <div style={sectionCard}>
                    <div style={{ padding: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(5, 1fr)' : isTablet ? 'repeat(5, 1fr)' : 'repeat(10, 1fr)', gap: isMobile ? '6px' : '8px' }}>
                            {categories.map((cat) => (
                                <Link key={cat.name} to={`/?category=${encodeURIComponent(cat.name)}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '10px 4px', borderRadius: '8px', textDecoration: 'none', cursor: 'pointer', border: activeCategory === cat.name ? '2px solid #E85D04' : '2px solid transparent', background: activeCategory === cat.name ? '#FFF0E4' : 'transparent', transition: 'all 0.2s' }}
                                    onMouseEnter={e => { if (activeCategory !== cat.name) { e.currentTarget.style.background = '#FFFBF5'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(232,93,4,0.1)'; } }}
                                    onMouseLeave={e => { if (activeCategory !== cat.name) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none'; } }}>
                                    <div style={{ width: isMobile ? '48px' : '60px', height: isMobile ? '48px' : '60px', borderRadius: '50%', background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '20px' : '26px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', border: '2px solid rgba(255,255,255,0.8)' }}>
                                        {cat.emoji}
                                    </div>
                                    <span style={{ fontSize: '11px', fontWeight: 600, color: activeCategory === cat.name ? '#E85D04' : '#44403C', textAlign: 'center', lineHeight: 1.3 }}>{cat.name}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Active Filter/Search Banner */}
                {(activeCategory || activeSearch) && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', borderRadius: '8px', boxShadow: '0 2px 12px rgba(28,25,23,0.07)', padding: '12px 20px', marginBottom: '20px', border: '1px solid #F5F0EA', borderLeft: '4px solid #E85D04' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {activeSearch && (
                                <span style={{ fontSize: '14px', color: '#44403C' }}>
                                    🔍 Search results for <strong style={{ color: '#E85D04' }}>"{activeSearch}"</strong>
                                    <span style={{ marginLeft: '8px', fontSize: '12px', color: '#78716C' }}>({products.length} product{products.length !== 1 ? 's' : ''} found)</span>
                                </span>
                            )}
                            {activeCategory && !activeSearch && (
                                <span style={{ fontSize: '14px', color: '#44403C' }}>
                                    Showing results for <strong style={{ color: '#E85D04' }}>{activeCategory}</strong>
                                </span>
                            )}
                        </div>
                        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#FFF5EB', border: '1px solid #FDE0C0', borderRadius: '999px', padding: '5px 12px', fontSize: '12px', fontWeight: 600, color: '#E85D04', textDecoration: 'none', cursor: 'pointer' }}>
                            <X size={12} /> Clear
                        </Link>
                    </div>
                )}

                {/* Deal of the Day — hidden during search */}
                {!activeSearch && (
                <div style={sectionCard}>
                    <div style={sectionHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>Deal of the Day</h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Clock size={15} color="#f97316" />
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Ends in:</span>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                    {[pad(timeLeft.h), pad(timeLeft.m), pad(timeLeft.s)].map((t, i) => (
                                        <span key={i} style={{ display: 'flex', alignItems: 'center' }}>
                                            <span style={{ background: 'linear-gradient(135deg, #E85D04, #FB8500)', color: 'white', fontSize: '12px', fontWeight: 700, padding: '3px 7px', borderRadius: '5px', boxShadow: '0 2px 6px rgba(232,93,4,0.3)', minWidth: '26px', textAlign: 'center' }}>{t}</span>
                                            {i < 2 && <span style={{ color: '#f97316', fontWeight: 800, margin: '0 1px', fontSize: '14px' }}>:</span>}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <Link to="/" style={{ color: '#E85D04', fontSize: '12px', fontWeight: 700, textDecoration: 'none', background: '#FFF5EB', padding: '5px 12px', borderRadius: '20px', border: '1px solid #FDE0C0' }}>View All</Link>
                    </div>
                    <div style={{ padding: '16px' }}>
                        {products.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)', gap: '12px' }}>
                                {products.slice(0, isMobile ? 4 : isTablet ? 6 : 5).map((product) => (
                                    <ProductCard key={product.id} product={product} compact />
                                ))}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: '16px' }}>
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} style={{ flex: 1, height: '160px', background: '#f5f5f5', borderRadius: '4px' }} className="animate-pulse" />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                )}

                {/* Best Offers — hidden during search */}
                {!activeSearch && (
                <div style={sectionCard}>
                    <div style={sectionHeader}>
                        <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>Best Offers</span>
                        <Link to="/" style={{ color: '#E85D04', fontSize: '12px', fontWeight: 700, textDecoration: 'none', background: '#FFF5EB', padding: '5px 12px', borderRadius: '20px', border: '1px solid #FDE0C0' }}>View All</Link>
                    </div>
                    <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px' }}>
                        {topOffers.map((offer) => (
                            <Link key={offer.title} to={`/?category=${encodeURIComponent(offer.category)}`} style={{ borderRadius: '10px', overflow: 'hidden', background: offer.bg, textDecoration: 'none', display: 'block', cursor: 'pointer', border: '1px solid rgba(0,0,0,0.06)', transition: 'all 0.22s' }}
                                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(232,93,4,0.15)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                                <img src={offer.image} alt={offer.title} style={{ width: '100%', height: '128px', objectFit: 'cover', display: 'block' }} />
                                <div style={{ padding: '10px 12px' }}>
                                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>{offer.title}</p>
                                    <p style={{ fontSize: '12px', fontWeight: 800, color: '#059669', margin: 0 }}>{offer.discount}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
                )}

                {/* All Products / Search Results */}
                <div style={sectionCard}>
                    <div style={sectionHeader}>
                        <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
                            {activeSearch ? `Results for "${activeSearch}"` : activeCategory ? `${activeCategory} Products` : 'Suggested for You'}
                        </span>
                        {!activeSearch && <Link to="/" style={{ color: '#E85D04', fontSize: '12px', fontWeight: 700, textDecoration: 'none', background: '#FFF5EB', padding: '5px 12px', borderRadius: '20px', border: '1px solid #FDE0C0' }}>View All</Link>}
                    </div>
                    <div style={{ padding: '16px' }}>
                        {products.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: isMobile ? '8px' : '4px' }}>
                                {products.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        ) : activeSearch ? (
                            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                                <div style={{ fontSize: '56px', marginBottom: '16px' }}>🔍</div>
                                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>No results found for "{activeSearch}"</h3>
                                <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>Try different keywords, check spelling, or browse categories above</p>
                                <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #E85D04, #FB8500)', color: 'white', padding: '10px 22px', borderRadius: '8px', fontWeight: 700, fontSize: '14px', textDecoration: 'none', boxShadow: '0 4px 12px rgba(232,93,4,0.3)' }}>
                                    ← Browse All Products
                                </Link>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid #F5F0EA', borderTopColor: '#E85D04', borderRadius: '50%', marginBottom: '12px' }} />
                                <p style={{ color: '#888', fontSize: '14px' }}>Loading products...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Newsletter */}
                <div style={{ background: 'linear-gradient(135deg, #1C0A00 0%, #3D1A00 55%, #5C2A00 100%)', borderRadius: '12px', boxShadow: '0 8px 30px rgba(232,93,4,0.22)', overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                    <div style={{ position: 'absolute', bottom: '-60px', left: '-30px', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
                    <div style={{ padding: '40px 24px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                        <div style={{ fontSize: '28px', marginBottom: '8px' }}>📬</div>
                        <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'white', margin: '0 0 8px', letterSpacing: '-0.5px' }}>Get Exclusive Deals on Email</h2>
                        <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '24px', fontSize: '14px' }}>Subscribe and never miss out on the best offers</p>
                        <div style={{ display: 'flex', gap: '10px', maxWidth: '420px', margin: '0 auto' }}>
                            <input
                                type="email"
                                placeholder="Enter your email address"
                                value={subEmail}
                                onChange={e => { setSubEmail(e.target.value); setSubStatus(null); }}
                                onKeyDown={e => e.key === 'Enter' && handleSubscribe()}
                                style={{ flex: 1, padding: '12px 18px', borderRadius: '8px', border: subStatus === 'error' ? '2px solid #fca5a5' : '2px solid transparent', fontSize: '14px', color: '#1e293b', background: 'white', outline: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                            />
                            <button
                                onClick={handleSubscribe}
                                disabled={subLoading}
                                style={{ padding: '12px 22px', background: subLoading ? '#888' : 'linear-gradient(135deg, #fbbf24, #f97316)', color: '#1e293b', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '14px', cursor: subLoading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(249,115,22,0.4)', whiteSpace: 'nowrap', transition: 'background 0.2s' }}
                            >
                                {subLoading ? '...' : 'Subscribe'}
                            </button>
                        </div>
                        {subStatus === 'success' && (
                            <p style={{ marginTop: '14px', fontSize: '13px', fontWeight: 700, color: '#86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                ✓ You're subscribed! Watch your inbox for exclusive deals.
                            </p>
                        )}
                        {subStatus === 'already' && (
                            <p style={{ marginTop: '14px', fontSize: '13px', fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                ℹ This email is already subscribed.
                            </p>
                        )}
                        {subStatus === 'error' && (
                            <p style={{ marginTop: '14px', fontSize: '13px', fontWeight: 700, color: '#fca5a5' }}>
                                ✗ Please enter a valid email address.
                            </p>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Home;
