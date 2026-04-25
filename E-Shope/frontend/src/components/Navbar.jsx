import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, Search, ChevronDown, User, Settings, Store, LogOut, Menu, X } from 'lucide-react';
import useResponsive from '../hooks/useResponsive';

const Navbar = () => {
    const { items } = useCart();
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isMobile, isTablet } = useResponsive();
    const [searchQuery, setSearchQuery] = useState('');
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showMobileSearch, setShowMobileSearch] = useState(false);

    const isAdmin = location.pathname === '/admin' || location.pathname === '/seller';

    const categories = [
        'Electronics', 'Mobiles', 'Fashion', 'Home', 'Sports',
        'Grocery', 'Appliances', 'Beauty', 'Jewellery', 'Travel'
    ];

    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    useEffect(() => {
        setSearchQuery(searchParams.get('search') || '');
    }, [searchParams]);

    useEffect(() => {
        setShowMobileMenu(false);
        setShowMobileSearch(false);
    }, [location.pathname]);

    const handleSearch = () => {
        const q = searchQuery.trim();
        if (q) navigate(`/?search=${encodeURIComponent(q)}`);
        else navigate('/');
        setShowMobileSearch(false);
    };

    return (
        <nav style={{ background: 'linear-gradient(135deg, #0d1b3e 0%, #112d6e 55%, #1a3f9c 100%)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', position: 'sticky', top: 0, zIndex: 50 }}>

            {/* Main Navbar Row */}
            <div style={{ maxWidth: '1280px', margin: '0 auto', padding: isMobile ? '10px 12px' : '10px 16px', display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>

                {/* Logo */}
                <Link to="/" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flexShrink: 0, textDecoration: 'none', marginRight: isMobile ? '0' : '8px' }}>
                    <span style={{ color: 'white', fontWeight: 800, fontSize: isMobile ? '18px' : '22px', lineHeight: 1.1, letterSpacing: '-0.5px' }}>
                        ApniDunia
                    </span>
                    {!isMobile && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '2px', background: 'linear-gradient(90deg, #fbbf24, #f97316)', borderRadius: '20px', padding: '1px 7px 1px 5px' }}>
                            <span style={{ fontSize: '9px', lineHeight: 1 }}>🇮🇳</span>
                            <span style={{ color: '#1e293b', fontSize: '9px', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Local4Vocal</span>
                        </span>
                    )}
                </Link>

                {/* Search Bar — tablet + desktop */}
                {!isMobile && (
                    <div style={{ flex: 1, maxWidth: '640px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'white', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
                            <input
                                type="text"
                                placeholder="Search for products, brands and more"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                style={{ flex: 1, padding: '11px 16px', fontSize: '14px', color: '#1e293b', background: 'white', border: 'none', outline: 'none' }}
                            />
                            <button onClick={handleSearch} style={{ padding: '11px 20px', background: 'linear-gradient(135deg, #1a3f9c, #2563eb)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Search size={20} />
                            </button>
                        </div>
                    </div>
                )}

                {isMobile && <div style={{ flex: 1 }} />}

                {/* Right Icons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '6px' : '8px', flexShrink: 0 }}>

                    {/* Mobile Search Icon */}
                    {isMobile && (
                        <button onClick={() => setShowMobileSearch(!showMobileSearch)}
                            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '7px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center' }}>
                            <Search size={18} />
                        </button>
                    )}

                    {/* Login / User Menu — tablet + desktop */}
                    {!isMobile && (
                        <div style={{ position: 'relative' }}>
                            {user ? (
                                <div>
                                    <button onClick={() => setShowUserMenu(!showUserMenu)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', color: 'white', fontWeight: 600, padding: '7px 14px', borderRadius: '6px', fontSize: '13px', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg, #fbbf24, #f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: 'white', flexShrink: 0 }}>
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        {!isTablet && <span style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>}
                                        <ChevronDown size={14} />
                                    </button>
                                    {showUserMenu && (
                                        <div style={{ position: 'absolute', right: 0, marginTop: '8px', width: '220px', background: 'white', boxShadow: '0 12px 40px rgba(0,0,0,0.2)', borderRadius: '10px', border: '1px solid #e8ecf4', zIndex: 50, overflow: 'hidden' }}>
                                            <div style={{ padding: '16px', background: 'linear-gradient(135deg, #0d1b3e, #1a3f9c)' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #fbbf24, #f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <p style={{ fontSize: '14px', fontWeight: 700, color: 'white', margin: '0 0 2px' }}>{user.name}</p>
                                                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                                            </div>
                                            <Link to="/profile" onClick={() => setShowUserMenu(false)}
                                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', fontSize: '13px', color: '#374151', textDecoration: 'none', borderBottom: '1px solid #f3f4f6' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <User size={15} color="#1a3f9c" /> My Account
                                            </Link>
                                            <button onClick={() => { logout(); setShowUserMenu(false); }}
                                                style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px 16px', fontSize: '13px', color: '#dc2626', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <LogOut size={15} /> Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Link to="/login"
                                    style={{ background: 'white', color: '#1a3f9c', fontWeight: 700, padding: '7px 22px', borderRadius: '6px', fontSize: '13px', textDecoration: 'none', display: 'inline-block', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                                    Login
                                </Link>
                            )}
                        </div>
                    )}

                    {/* Admin + Seller buttons — desktop only */}
                    {!isMobile && !isTablet && user && user.is_admin === 1 && (
                        <Link to="/admin"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, padding: '7px 12px', borderRadius: '6px', textDecoration: 'none', ...(isAdmin ? { background: '#fbbf24', color: '#1e293b' } : { background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }) }}>
                            <Settings size={14} /> Admin
                        </Link>
                    )}
                    {!isMobile && !isTablet && user && user.is_seller === 1 && (
                        <Link to="/seller"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, padding: '7px 12px', borderRadius: '6px', textDecoration: 'none', background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)', whiteSpace: 'nowrap' }}>
                            <Store size={14} /> Seller
                        </Link>
                    )}
                    {!isMobile && !isTablet && (!user || user.is_seller !== 1) && (
                        <Link to="/login?tab=register&seller=1" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' }}
                            onMouseEnter={e => e.currentTarget.style.color = '#fbbf24'}
                            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}>
                            Become a Seller
                        </Link>
                    )}

                    {/* Cart */}
                    <Link to="/cart" style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'white', textDecoration: 'none' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#fbbf24'}
                        onMouseLeave={e => e.currentTarget.style.color = 'white'}>
                        <div style={{ position: 'relative' }}>
                            <ShoppingCart size={isMobile ? 20 : 22} />
                            {itemCount > 0 && (
                                <span style={{ position: 'absolute', top: '-9px', right: '-9px', background: 'linear-gradient(135deg, #f97316, #ef4444)', color: 'white', fontSize: '10px', fontWeight: 800, borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
                                    {itemCount > 9 ? '9+' : itemCount}
                                </span>
                            )}
                        </div>
                        {!isMobile && <span style={{ fontSize: '13px', fontWeight: 600 }}>Cart</span>}
                    </Link>

                    {/* Hamburger — mobile only */}
                    {isMobile && (
                        <button onClick={() => setShowMobileMenu(!showMobileMenu)}
                            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '7px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center' }}>
                            {showMobileMenu ? <X size={18} /> : <Menu size={18} />}
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile Search Bar */}
            {isMobile && showMobileSearch && (
                <div style={{ padding: '0 12px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'white', borderRadius: '6px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
                        <input
                            type="text"
                            placeholder="Search for products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            autoFocus
                            style={{ flex: 1, padding: '11px 16px', fontSize: '14px', color: '#1e293b', background: 'white', border: 'none', outline: 'none' }}
                        />
                        <button onClick={handleSearch} style={{ padding: '11px 18px', background: 'linear-gradient(135deg, #1a3f9c, #2563eb)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Search size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Mobile Drawer Menu */}
            {isMobile && showMobileMenu && (
                <div style={{ background: 'rgba(13,27,62,0.98)', borderTop: '1px solid rgba(255,255,255,0.1)', padding: '12px' }}>
                    {user ? (
                        <div style={{ marginBottom: '10px', padding: '12px', background: 'rgba(255,255,255,0.08)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #fbbf24, #f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: 'white', flexShrink: 0 }}>
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <p style={{ fontSize: '14px', fontWeight: 700, color: 'white', margin: 0 }}>{user.name}</p>
                                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                            </div>
                        </div>
                    ) : (
                        <Link to="/login" onClick={() => setShowMobileMenu(false)}
                            style={{ display: 'block', background: 'white', color: '#1a3f9c', fontWeight: 700, padding: '11px', borderRadius: '8px', fontSize: '14px', textDecoration: 'none', textAlign: 'center', marginBottom: '10px' }}>
                            Login / Register
                        </Link>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {user && (
                            <Link to="/profile" onClick={() => setShowMobileMenu(false)}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 12px', fontSize: '14px', color: 'rgba(255,255,255,0.85)', textDecoration: 'none', borderRadius: '6px' }}>
                                <User size={16} /> My Account
                            </Link>
                        )}
                        {user && user.is_admin === 1 && (
                            <Link to="/admin" onClick={() => setShowMobileMenu(false)}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 12px', fontSize: '14px', color: '#fbbf24', textDecoration: 'none', borderRadius: '6px' }}>
                                <Settings size={16} /> Admin Panel
                            </Link>
                        )}
                        {user && user.is_seller === 1 && (
                            <Link to="/seller" onClick={() => setShowMobileMenu(false)}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 12px', fontSize: '14px', color: '#fbbf24', textDecoration: 'none', borderRadius: '6px' }}>
                                <Store size={16} /> Seller Panel
                            </Link>
                        )}
                        {(!user || user.is_seller !== 1) && (
                            <Link to="/login?tab=register&seller=1" onClick={() => setShowMobileMenu(false)}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 12px', fontSize: '14px', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', borderRadius: '6px' }}>
                                <Store size={16} /> Become a Seller
                            </Link>
                        )}
                        {user && (
                            <button onClick={() => { logout(); setShowMobileMenu(false); }}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 12px', fontSize: '14px', color: '#f87171', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: '6px', width: '100%' }}>
                                <LogOut size={16} /> Logout
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Category Navigation Bar — tablet + desktop */}
            {!isAdmin && !isMobile && (
                <div style={{ background: 'rgba(255,255,255,0.96)', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto' }}>
                            {categories.map((cat) => {
                                const isActive = searchParams.get('category') === cat;
                                return (
                                    <button key={cat}
                                        onClick={() => navigate(isActive ? '/' : `/?category=${encodeURIComponent(cat)}`)}
                                        style={{ flexShrink: 0, padding: '10px 14px', fontSize: '13px', fontWeight: isActive ? 700 : 500, color: isActive ? '#1a3f9c' : '#374151', whiteSpace: 'nowrap', borderBottom: isActive ? '3px solid #1a3f9c' : '3px solid transparent', borderTop: 'none', borderLeft: 'none', borderRight: 'none', textDecoration: 'none', transition: 'all 0.18s', background: isActive ? '#f0f4ff' : 'transparent', cursor: 'pointer' }}
                                        onMouseEnter={e => { e.currentTarget.style.color = '#1a3f9c'; e.currentTarget.style.borderBottomColor = '#1a3f9c'; e.currentTarget.style.background = '#f0f4ff'; }}
                                        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = '#374151'; e.currentTarget.style.borderBottomColor = 'transparent'; e.currentTarget.style.background = 'transparent'; } }}>
                                        {cat}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
