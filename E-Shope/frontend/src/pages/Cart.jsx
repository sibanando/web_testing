import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Trash2, ShoppingCart, ShieldCheck, Truck } from 'lucide-react';
import useResponsive from '../hooks/useResponsive';

const Cart = () => {
    const { items, removeFromCart, updateQuantity, total } = useCart();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { isMobile } = useResponsive();

    const handleCheckout = () => {
        if (!user) {
            if (confirm('Please login to checkout. Do you want to login now?')) {
                navigate('/login');
            }
            return;
        }
        navigate('/checkout');
    };

    const getProductImage = (item) => {
        try {
            const imgs = typeof item.images === 'string' ? JSON.parse(item.images) : item.images;
            return imgs?.[0] || 'https://via.placeholder.com/100';
        } catch {
            return 'https://via.placeholder.com/100';
        }
    };

    const discount = Math.round(total * 0.15);
    const deliveryCharge = total > 500 ? 0 : 40;
    const finalTotal = total - discount + deliveryCharge;

    if (items.length === 0) {
        return (
            <div style={{ background: '#f1f3f6', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 16px' }}>
                <div style={{ background: 'white', borderRadius: '2px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', padding: '48px', textAlign: 'center', maxWidth: '360px', width: '100%' }}>
                    <ShoppingCart size={80} style={{ color: '#2874f0', display: 'block', margin: '0 auto 16px' }} />
                    <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#212121', marginBottom: '8px' }}>Your cart is empty!</h2>
                    <p style={{ color: '#888', marginBottom: '24px', fontSize: '13px' }}>Add items to it now.</p>
                    <button
                        onClick={() => navigate('/')}
                        style={{ padding: '12px 32px', fontWeight: 700, fontSize: '13px', borderRadius: '2px', background: '#2874f0', color: 'white', border: 'none', cursor: 'pointer' }}
                    >
                        Shop Now
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ background: '#f1f3f6', minHeight: '100vh', paddingTop: '16px', paddingBottom: '16px' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 12px' }}>
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', gap: '16px', alignItems: 'flex-start' }}>

                    {/* Left: Cart Items */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Delivery Address Bar */}
                        <div style={{ background: 'white', borderRadius: '2px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '12px 16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Truck size={18} style={{ color: '#2874f0', flexShrink: 0 }} />
                            <div>
                                <span style={{ fontSize: '13px', color: '#666' }}>Deliver to: </span>
                                {user ? (
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#212121' }}>{user.name}</span>
                                ) : (
                                    <button
                                        onClick={() => navigate('/login')}
                                        style={{ fontSize: '13px', fontWeight: 600, color: '#2874f0', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                    >
                                        Login to select delivery address
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Cart Items List */}
                        <div style={{ background: 'white', borderRadius: '2px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#212121', margin: 0 }}>
                                    My Cart <span style={{ color: '#888', fontWeight: 400, fontSize: '15px' }}>({items.length} item{items.length > 1 ? 's' : ''})</span>
                                </h1>
                            </div>

                            {items.map((item) => {
                                const price = parseFloat(item.price || 0);
                                const itemDiscount = 15;
                                const originalPrice = Math.round(price / (1 - itemDiscount / 100));

                                return (
                                    <div key={item.id} style={{ padding: '20px 16px', borderBottom: '1px solid #f0f0f0' }}>
                                        <div style={{ display: 'flex', gap: '20px' }}>
                                            {/* Image */}
                                            <div style={{ flexShrink: 0 }}>
                                                <img
                                                    src={getProductImage(item)}
                                                    alt={item.name}
                                                    style={{ width: '96px', height: '96px', objectFit: 'contain' }}
                                                />
                                            </div>

                                            {/* Details */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <h3 style={{ fontSize: '14px', color: '#212121', fontWeight: 500, lineHeight: 1.4, marginBottom: '4px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                                    {item.name}
                                                </h3>
                                                <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</p>

                                                {/* Seller */}
                                                <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
                                                    Seller: <span style={{ color: '#2874f0', fontWeight: 500 }}>RetailNet</span>
                                                    <span style={{ marginLeft: '8px', color: '#388e3c', fontSize: '12px', fontWeight: 500 }}>✦ 4.2</span>
                                                </p>

                                                {/* Price */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                                    <span style={{ fontSize: '17px', fontWeight: 700, color: '#212121' }}>
                                                        ₹{(price * item.quantity).toLocaleString('en-IN')}
                                                    </span>
                                                    <span style={{ fontSize: '13px', color: '#aaa', textDecoration: 'line-through' }}>
                                                        ₹{(originalPrice * item.quantity).toLocaleString('en-IN')}
                                                    </span>
                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#388e3c' }}>
                                                        {itemDiscount}% off
                                                    </span>
                                                </div>

                                                {/* Quantity + Remove */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '2px', overflow: 'hidden' }}>
                                                        <button
                                                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                            style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', background: 'white', border: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 300 }}
                                                        >
                                                            −
                                                        </button>
                                                        <span style={{ width: '40px', textAlign: 'center', fontSize: '13px', fontWeight: 600, borderLeft: '1px solid #ddd', borderRight: '1px solid #ddd', padding: '6px 0' }}>
                                                            {item.quantity}
                                                        </span>
                                                        <button
                                                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                            style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', background: 'white', border: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 300 }}
                                                        >
                                                            +
                                                        </button>
                                                    </div>

                                                    <button
                                                        onClick={() => removeFromCart(item.id)}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#555', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                                                        onMouseEnter={e => e.currentTarget.style.color = '#e53935'}
                                                        onMouseLeave={e => e.currentTarget.style.color = '#555'}
                                                    >
                                                        <Trash2 size={14} />
                                                        REMOVE
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Place Order Bottom Button */}
                            <div style={{ padding: '16px', background: 'white', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={handleCheckout}
                                    style={{ padding: '14px 40px', fontWeight: 700, fontSize: '13px', borderRadius: '2px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', background: '#fb641b', color: 'white', border: 'none', cursor: 'pointer', minWidth: '200px' }}
                                >
                                    PLACE ORDER
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right: Price Details */}
                    <div style={{ width: isMobile ? '100%' : '320px', flexShrink: 0 }}>
                        <div style={{ background: 'white', borderRadius: '2px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                                <h2 style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '1px', color: '#878787', margin: 0 }}>
                                    PRICE DETAILS
                                </h2>
                            </div>

                            <div style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '12px' }}>
                                    <span style={{ color: '#444' }}>Price ({items.length} item{items.length > 1 ? 's' : ''})</span>
                                    <span style={{ fontWeight: 500 }}>₹{total.toLocaleString('en-IN')}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '12px' }}>
                                    <span style={{ color: '#444' }}>Discount</span>
                                    <span style={{ fontWeight: 500, color: '#388e3c' }}>− ₹{discount.toLocaleString('en-IN')}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '12px' }}>
                                    <span style={{ color: '#444' }}>Delivery Charges</span>
                                    {deliveryCharge === 0 ? (
                                        <span style={{ fontWeight: 500, color: '#388e3c' }}>FREE</span>
                                    ) : (
                                        <span style={{ fontWeight: 500 }}>₹{deliveryCharge}</span>
                                    )}
                                </div>

                                <div style={{ borderTop: '1px dashed #e0e0e0', paddingTop: '12px', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '15px' }}>
                                        <span style={{ color: '#212121' }}>Total Amount</span>
                                        <span style={{ color: '#212121' }}>₹{finalTotal.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>

                                <p style={{ fontSize: '12px', fontWeight: 600, color: '#388e3c', marginBottom: '16px' }}>
                                    You will save ₹{discount.toLocaleString('en-IN')} on this order
                                </p>

                                <button
                                    onClick={handleCheckout}
                                    style={{ width: '100%', padding: '14px', fontWeight: 700, fontSize: '13px', borderRadius: '2px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', background: '#fb641b', color: 'white', border: 'none', cursor: 'pointer' }}
                                >
                                    PLACE ORDER
                                </button>
                            </div>
                        </div>

                        {/* Safe & Secure */}
                        <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '12px', color: '#878787' }}>
                            <ShieldCheck size={14} style={{ color: '#878787' }} />
                            <span>Safe and Secure Payments. Easy returns.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cart;
