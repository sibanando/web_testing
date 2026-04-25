import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, User, Mail, Lock, ArrowRight, ShoppingBag, Store, Phone, Shield } from 'lucide-react';
import useResponsive from '../hooks/useResponsive';

const Login = () => {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { isMobile } = useResponsive();
    const [isRegister, setIsRegister] = useState(
        location.pathname === '/register' || searchParams.get('tab') === 'register'
    );
    const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'mobile'
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [accountType, setAccountType] = useState(searchParams.get('seller') === '1' ? 'seller' : 'customer');
    const [focusedField, setFocusedField] = useState(null);

    // OTP state
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [otpTimer, setOtpTimer] = useState(0);
    const otpRefs = useRef([]);
    const timerRef = useRef(null);

    const { login, register, sendOtp, verifyOtp } = useAuth();
    const navigate = useNavigate();

    const startTimer = () => {
        setOtpTimer(30);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setOtpTimer(prev => {
                if (prev <= 1) { clearInterval(timerRef.current); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    const handleSendOtp = async () => {
        setError('');
        if (!/^\d{10}$/.test(phone)) {
            setError('Please enter a valid 10-digit mobile number');
            return;
        }
        setLoading(true);
        const result = await sendOtp(phone);
        setLoading(false);
        if (result.success) {
            setOtpSent(true);
            startTimer();
        } else {
            setError(result.message);
        }
    };

    const handleVerifyOtp = async () => {
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            setError('Please enter the complete 6-digit OTP');
            return;
        }
        setError('');
        setLoading(true);
        const result = await verifyOtp(phone, otpString);
        setLoading(false);
        if (result.success) {
            navigate('/');
        } else {
            setError(result.message);
        }
    };

    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length > 0) {
            const newOtp = [...otp];
            for (let i = 0; i < 6; i++) newOtp[i] = pasted[i] || '';
            setOtp(newOtp);
            const focusIdx = Math.min(pasted.length, 5);
            otpRefs.current[focusIdx]?.focus();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        let result;
        if (isRegister) {
            if (!name.trim()) { setError('Please enter your name'); setLoading(false); return; }
            if (loginMethod === 'email' && !email) { setError('Please enter your email'); setLoading(false); return; }
            if (loginMethod === 'mobile' && !/^\d{10}$/.test(phone)) { setError('Please enter a valid 10-digit mobile number'); setLoading(false); return; }
            if (!password) { setError('Please enter a password'); setLoading(false); return; }
            result = await register(
                name,
                loginMethod === 'email' ? email : null,
                password,
                accountType === 'seller',
                loginMethod === 'mobile' ? phone : null
            );
        } else {
            result = await login(email, password);
        }
        setLoading(false);
        if (result.success) {
            if (isRegister && accountType === 'seller') navigate('/seller');
            else navigate('/');
        } else {
            setError(result.message);
        }
    };

    const fillDemo = () => { setLoginMethod('email'); setEmail('user@example.com'); setPassword('password123'); setIsRegister(false); setOtpSent(false); };
    const fillSeller = () => { setLoginMethod('email'); setEmail('seller@apnidunia.com'); setPassword('seller123'); setIsRegister(false); setOtpSent(false); };

    const switchTab = (register) => {
        setIsRegister(register);
        setError('');
        setOtpSent(false);
        setOtp(['', '', '', '', '', '']);
        setDemoOtp('');
    };

    const switchMethod = (method) => {
        setLoginMethod(method);
        setError('');
        setOtpSent(false);
        setOtp(['', '', '', '', '', '']);
        setDemoOtp('');
    };

    const getInputStyle = (field) => ({
        width: '100%',
        padding: '14px 16px 14px 44px',
        border: 'none',
        borderBottom: `2px solid ${focusedField === field ? '#6366f1' : 'rgba(255,255,255,0.15)'}`,
        borderRadius: '12px 12px 0 0',
        fontSize: '14px',
        outline: 'none',
        background: 'rgba(255,255,255,0.06)',
        color: '#f0f0f0',
        boxSizing: 'border-box',
        transition: 'all 0.3s ease',
        letterSpacing: '0.3px',
    });

    const iconStyle = (field) => ({
        position: 'absolute', left: '14px', top: '15px',
        color: focusedField === field ? '#a5b4fc' : 'rgba(255,255,255,0.35)',
        transition: 'color 0.3s ease', zIndex: 1,
    });

    // Login page — Mobile OTP flow (not register)
    const renderMobileLogin = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {!otpSent ? (
                <>
                    <div style={{ position: 'relative' }}>
                        <Phone size={16} style={iconStyle('phone')} />
                        <div style={{
                            display: 'flex', alignItems: 'center',
                            background: 'rgba(255,255,255,0.06)',
                            borderRadius: '12px 12px 0 0',
                            borderBottom: `2px solid ${focusedField === 'phone' ? '#6366f1' : 'rgba(255,255,255,0.15)'}`,
                            transition: 'all 0.3s ease',
                        }}>
                            <span style={{
                                padding: '14px 0 14px 44px',
                                color: 'rgba(255,255,255,0.5)',
                                fontSize: '14px',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                            }}>+91</span>
                            <input
                                type="tel"
                                placeholder="Enter Mobile Number"
                                value={phone}
                                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                onFocus={() => setFocusedField('phone')}
                                onBlur={() => setFocusedField(null)}
                                maxLength={10}
                                style={{
                                    flex: 1,
                                    padding: '14px 16px 14px 8px',
                                    border: 'none',
                                    fontSize: '14px',
                                    outline: 'none',
                                    background: 'transparent',
                                    color: '#f0f0f0',
                                    letterSpacing: '1px',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>
                    </div>
                    <button type="button" onClick={handleSendOtp} disabled={loading}
                        style={{
                            width: '100%', padding: '14px', fontWeight: 700, fontSize: '14px',
                            borderRadius: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                            background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: 'white', marginTop: '6px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            boxShadow: loading ? 'none' : '0 8px 24px rgba(99,102,241,0.3)',
                            transition: 'all 0.3s ease',
                        }}>
                        {loading ? 'Sending OTP...' : 'Request OTP'}
                        {!loading && <ArrowRight size={16} />}
                    </button>
                </>
            ) : (
                <>
                    <div style={{
                        background: 'rgba(99,102,241,0.08)',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>OTP sent to</p>
                            <p style={{ margin: '2px 0 0', fontSize: '14px', color: '#c7d2fe', fontWeight: 600, letterSpacing: '0.5px' }}>+91 {phone}</p>
                        </div>
                        <button type="button" onClick={() => { setOtpSent(false); setOtp(['', '', '', '', '', '']); setDemoOtp(''); }}
                            style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                            Change
                        </button>
                    </div>

                    <div style={{
                        background: 'rgba(251,191,36,0.1)',
                        border: '1px solid rgba(251,191,36,0.25)',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                        <Shield size={14} style={{ color: '#fbbf24' }} />
                        <span style={{ fontSize: '12px', color: '#fcd34d' }}>
                            OTP sent to your mobile number. Check the server console for the demo OTP.
                        </span>
                    </div>

                    <div>
                        <p style={{ margin: '0 0 10px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                            Enter 6-digit OTP
                        </p>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }} onPaste={handleOtpPaste}>
                            {otp.map((digit, i) => (
                                <input
                                    key={i}
                                    ref={el => otpRefs.current[i] = el}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={e => handleOtpChange(i, e.target.value)}
                                    onKeyDown={e => handleOtpKeyDown(i, e)}
                                    onFocus={() => setFocusedField(`otp-${i}`)}
                                    onBlur={() => setFocusedField(null)}
                                    style={{
                                        width: '44px', height: '52px',
                                        textAlign: 'center',
                                        fontSize: '20px', fontWeight: 700,
                                        border: `2px solid ${focusedField === `otp-${i}` ? '#6366f1' : digit ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.15)'}`,
                                        borderRadius: '12px',
                                        background: digit ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.04)',
                                        color: '#f0f0f0',
                                        outline: 'none',
                                        transition: 'all 0.2s ease',
                                        caretColor: '#6366f1',
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>
                        {otpTimer > 0 ? (
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
                                Resend OTP in <strong style={{ color: '#a5b4fc' }}>{otpTimer}s</strong>
                            </span>
                        ) : (
                            <button type="button" onClick={handleSendOtp} disabled={loading}
                                style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                                Resend OTP
                            </button>
                        )}
                    </div>

                    <button type="button" onClick={handleVerifyOtp} disabled={loading || otp.join('').length !== 6}
                        style={{
                            width: '100%', padding: '14px', fontWeight: 700, fontSize: '14px',
                            borderRadius: '12px', border: 'none',
                            cursor: (loading || otp.join('').length !== 6) ? 'not-allowed' : 'pointer',
                            background: (loading || otp.join('').length !== 6)
                                ? 'rgba(255,255,255,0.1)'
                                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            boxShadow: (loading || otp.join('').length !== 6) ? 'none' : '0 8px 24px rgba(99,102,241,0.3)',
                            transition: 'all 0.3s ease',
                        }}>
                        {loading ? 'Verifying...' : 'Verify & Login'}
                        {!loading && <ArrowRight size={16} />}
                    </button>
                </>
            )}
        </div>
    );

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '32px 16px',
            background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
            position: 'relative', overflow: 'hidden',
        }}>
            {/* Floating orbs */}
            <div style={{ position: 'absolute', top: '-120px', right: '-80px', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-100px', left: '-60px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: '40%', left: '60%', width: '200px', height: '200px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{
                width: '100%', maxWidth: '440px',
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
                overflow: 'hidden',
            }}>
                {/* Header */}
                <div style={{ padding: '32px 32px 0', textAlign: 'center' }}>
                    <div style={{
                        width: '56px', height: '56px', borderRadius: '16px',
                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px',
                        boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
                    }}>
                        <ShoppingBag size={26} style={{ color: 'white' }} />
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#f0f0f0', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
                        ApniDunia
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0, letterSpacing: '0.5px' }}>
                        {isRegister ? 'Create your account' : 'Welcome back'}
                    </p>
                </div>

                {/* Tab Toggle: Login / Register */}
                <div style={{ padding: '20px 32px 0', display: 'flex' }}>
                    <div style={{
                        display: 'flex', width: '100%',
                        background: 'rgba(255,255,255,0.06)',
                        borderRadius: '12px', padding: '4px',
                    }}>
                        {['Login', 'Register'].map((tab, i) => {
                            const active = i === 0 ? !isRegister : isRegister;
                            return (
                                <button key={tab} onClick={() => switchTab(i === 1)}
                                    style={{
                                        flex: 1, padding: '10px', fontSize: '13px', fontWeight: 600,
                                        border: 'none', cursor: 'pointer',
                                        borderRadius: '9px',
                                        background: active ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                                        color: active ? 'white' : 'rgba(255,255,255,0.4)',
                                        transition: 'all 0.3s ease',
                                        boxShadow: active ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
                                    }}>
                                    {tab}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Login Method Toggle: Email / Mobile (only for Login tab) */}
                {!isRegister && (
                    <div style={{ padding: '16px 32px 0' }}>
                        <div style={{
                            display: 'flex', width: '100%',
                            background: 'rgba(255,255,255,0.04)',
                            borderRadius: '10px', padding: '3px',
                            border: '1px solid rgba(255,255,255,0.08)',
                        }}>
                            {[
                                { id: 'email', icon: <Mail size={14} />, label: 'Email & Password' },
                                { id: 'mobile', icon: <Phone size={14} />, label: 'Mobile & OTP' },
                            ].map(m => {
                                const active = loginMethod === m.id;
                                return (
                                    <button key={m.id} onClick={() => switchMethod(m.id)}
                                        style={{
                                            flex: 1, padding: '9px 8px',
                                            border: 'none', cursor: 'pointer',
                                            borderRadius: '8px',
                                            background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                                            color: active ? '#c7d2fe' : 'rgba(255,255,255,0.35)',
                                            fontSize: '12px', fontWeight: 600,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                            transition: 'all 0.2s ease',
                                        }}>
                                        {m.icon} {m.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Form Area */}
                <div style={{ padding: '20px 32px 32px' }}>
                    {error && (
                        <div style={{
                            background: 'rgba(239,68,68,0.12)',
                            border: '1px solid rgba(239,68,68,0.25)',
                            color: '#fca5a5', padding: '10px 14px', borderRadius: '10px',
                            fontSize: '13px', marginBottom: '16px',
                        }}>
                            {error}
                        </div>
                    )}

                    {/* LOGIN — Mobile OTP */}
                    {!isRegister && loginMethod === 'mobile' && renderMobileLogin()}

                    {/* LOGIN — Email Password */}
                    {!isRegister && loginMethod === 'email' && (
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={iconStyle('email')} />
                                <input type="email" placeholder="Email Address" value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
                                    required style={getInputStyle('email')} />
                            </div>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={iconStyle('password')} />
                                <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)}
                                    required style={{ ...getInputStyle('password'), paddingRight: '44px' }} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: '12px', top: '13px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0 }}>
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <button type="submit" disabled={loading}
                                style={{
                                    width: '100%', padding: '14px', fontWeight: 700, fontSize: '14px',
                                    borderRadius: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                                    background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    color: 'white', marginTop: '6px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    boxShadow: loading ? 'none' : '0 8px 24px rgba(99,102,241,0.3)',
                                    transition: 'all 0.3s ease',
                                }}>
                                {loading ? 'Signing in...' : 'Sign In'}
                                {!loading && <ArrowRight size={16} />}
                            </button>
                        </form>
                    )}

                    {/* REGISTER */}
                    {isRegister && (
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ position: 'relative' }}>
                                <User size={16} style={iconStyle('name')} />
                                <input type="text" placeholder="Full Name" value={name}
                                    onChange={e => setName(e.target.value)}
                                    onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)}
                                    required style={getInputStyle('name')} />
                            </div>

                            {/* Account Type */}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {[
                                    { id: 'customer', icon: <ShoppingBag size={16} />, label: 'Customer' },
                                    { id: 'seller', icon: <Store size={16} />, label: 'Seller' }
                                ].map(t => (
                                    <button key={t.id} type="button" onClick={() => setAccountType(t.id)}
                                        style={{
                                            flex: 1, padding: '12px 10px',
                                            border: `1px solid ${accountType === t.id ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`,
                                            borderRadius: '12px', cursor: 'pointer',
                                            background: accountType === t.id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                                            transition: 'all 0.3s ease',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                        }}>
                                        <span style={{ color: accountType === t.id ? '#a5b4fc' : 'rgba(255,255,255,0.3)' }}>{t.icon}</span>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: accountType === t.id ? '#c7d2fe' : 'rgba(255,255,255,0.35)' }}>{t.label}</span>
                                    </button>
                                ))}
                            </div>
                            {accountType === 'seller' && (
                                <p style={{ fontSize: '11px', color: '#a78bfa', margin: '-4px 0 0 4px', fontWeight: 500 }}>
                                    You'll get a Seller Panel to list products
                                </p>
                            )}

                            {/* Register method toggle */}
                            <div style={{
                                display: 'flex', width: '100%',
                                background: 'rgba(255,255,255,0.04)',
                                borderRadius: '10px', padding: '3px',
                                border: '1px solid rgba(255,255,255,0.08)',
                            }}>
                                {[
                                    { id: 'email', icon: <Mail size={14} />, label: 'Email' },
                                    { id: 'mobile', icon: <Phone size={14} />, label: 'Mobile' },
                                ].map(m => {
                                    const active = loginMethod === m.id;
                                    return (
                                        <button key={m.id} type="button" onClick={() => switchMethod(m.id)}
                                            style={{
                                                flex: 1, padding: '9px 8px',
                                                border: 'none', cursor: 'pointer',
                                                borderRadius: '8px',
                                                background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                                                color: active ? '#c7d2fe' : 'rgba(255,255,255,0.35)',
                                                fontSize: '12px', fontWeight: 600,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                                transition: 'all 0.2s ease',
                                            }}>
                                            {m.icon} {m.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {loginMethod === 'email' ? (
                                <div style={{ position: 'relative' }}>
                                    <Mail size={16} style={iconStyle('email')} />
                                    <input type="email" placeholder="Email Address" value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
                                        required style={getInputStyle('email')} />
                                </div>
                            ) : (
                                <div style={{ position: 'relative' }}>
                                    <Phone size={16} style={iconStyle('phone')} />
                                    <div style={{
                                        display: 'flex', alignItems: 'center',
                                        background: 'rgba(255,255,255,0.06)',
                                        borderRadius: '12px 12px 0 0',
                                        borderBottom: `2px solid ${focusedField === 'phone' ? '#6366f1' : 'rgba(255,255,255,0.15)'}`,
                                        transition: 'all 0.3s ease',
                                    }}>
                                        <span style={{
                                            padding: '14px 0 14px 44px',
                                            color: 'rgba(255,255,255,0.5)',
                                            fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap',
                                        }}>+91</span>
                                        <input type="tel" placeholder="Mobile Number" value={phone}
                                            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                            onFocus={() => setFocusedField('phone')} onBlur={() => setFocusedField(null)}
                                            maxLength={10}
                                            style={{
                                                flex: 1, padding: '14px 16px 14px 8px',
                                                border: 'none', fontSize: '14px', outline: 'none',
                                                background: 'transparent', color: '#f0f0f0',
                                                letterSpacing: '1px', boxSizing: 'border-box',
                                            }} />
                                    </div>
                                </div>
                            )}

                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={iconStyle('password')} />
                                <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)}
                                    required style={{ ...getInputStyle('password'), paddingRight: '44px' }} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: '12px', top: '13px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 0 }}>
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            <button type="submit" disabled={loading}
                                style={{
                                    width: '100%', padding: '14px', fontWeight: 700, fontSize: '14px',
                                    borderRadius: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                                    background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    color: 'white', marginTop: '6px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    boxShadow: loading ? 'none' : '0 8px 24px rgba(99,102,241,0.3)',
                                    transition: 'all 0.3s ease',
                                }}>
                                {loading ? 'Creating Account...' : 'Create Account'}
                                {!loading && <ArrowRight size={16} />}
                            </button>
                        </form>
                    )}

                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', lineHeight: 1.6, margin: '16px 0 0', textAlign: 'center' }}>
                        By continuing, you agree to our{' '}
                        <span style={{ color: 'rgba(165,180,252,0.6)', cursor: 'pointer' }}>Terms</span> &{' '}
                        <span style={{ color: 'rgba(165,180,252,0.6)', cursor: 'pointer' }}>Privacy Policy</span>
                    </p>

                    {/* Demo credentials */}
                    {!isRegister && (
                        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', margin: '0 0 4px' }}>Quick Access</p>
                            <div onClick={fillDemo}
                                style={{
                                    padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                                    border: '1px solid rgba(251,191,36,0.2)',
                                    background: 'rgba(251,191,36,0.06)',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,191,36,0.12)'; e.currentTarget.style.borderColor = 'rgba(251,191,36,0.35)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,191,36,0.06)'; e.currentTarget.style.borderColor = 'rgba(251,191,36,0.2)'; }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ShoppingBag size={14} style={{ color: '#fbbf24' }} />
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#fcd34d' }}>Demo Customer</span>
                                </div>
                                <p style={{ fontSize: '11px', color: 'rgba(252,211,77,0.5)', margin: '3px 0 0 22px', fontFamily: 'monospace' }}>user@example.com / password123</p>
                            </div>
                            <div onClick={fillSeller}
                                style={{
                                    padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                                    border: '1px solid rgba(52,211,153,0.2)',
                                    background: 'rgba(52,211,153,0.06)',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.12)'; e.currentTarget.style.borderColor = 'rgba(52,211,153,0.35)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(52,211,153,0.06)'; e.currentTarget.style.borderColor = 'rgba(52,211,153,0.2)'; }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Store size={14} style={{ color: '#34d399' }} />
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#6ee7b7' }}>Demo Seller</span>
                                </div>
                                <p style={{ fontSize: '11px', color: 'rgba(110,231,183,0.5)', margin: '3px 0 0 22px', fontFamily: 'monospace' }}>seller@apnidunia.com / seller123</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
