import { Link } from 'react-router-dom';
import useResponsive from '../hooks/useResponsive';

const Footer = () => {
    const { isMobile, isTablet } = useResponsive();
    const sections = [
        {
            title: 'ABOUT', links: [
                { label: 'Contact Us', to: '/page/contact-us' },
                { label: 'About Us', to: '/page/about-us' },
                { label: 'Careers', to: '/page/careers' },
                { label: 'ApniDunia Stories', to: '/page/apnidunia-stories' },
                { label: 'Press', to: '/page/press' },
                { label: 'ApniDunia Wholesale', to: '/page/apnidunia-wholesale' },
            ]
        },
        {
            title: 'HELP', links: [
                { label: 'Payments', to: '/page/payments' },
                { label: 'Shipping', to: '/page/shipping' },
                { label: 'Cancellation & Returns', to: '/page/cancellation-returns' },
                { label: 'FAQ', to: '/page/faq' },
                { label: 'Report Infringement', to: '/page/report-infringement' },
            ]
        },
        {
            title: 'CONSUMER POLICY', links: [
                { label: 'Cancellation & Returns', to: '/page/cancellation-returns' },
                { label: 'Terms Of Use', to: '/page/terms-of-use' },
                { label: 'Security', to: '/page/security' },
                { label: 'Privacy', to: '/page/privacy' },
                { label: 'Sitemap', to: '/page/sitemap' },
                { label: 'Grievance Redressal', to: '/page/grievance-redressal' },
            ]
        },
        {
            title: 'SOCIAL', links: [
                { label: 'Facebook', href: 'https://www.facebook.com' },
                { label: 'Twitter', href: 'https://www.twitter.com' },
                { label: 'YouTube', href: 'https://www.youtube.com' },
                { label: 'Instagram', href: 'https://www.instagram.com' },
            ]
        },
    ];

    const paymentIcons = ['Visa', 'Mastercard', 'Amex', 'UPI', 'Net Banking', 'EMI'];

    const linkStyle = {
        color: '#94a3b8', fontSize: '12px', textDecoration: 'none',
        lineHeight: 2.2, display: 'block', transition: 'color 0.15s'
    };
    const headingStyle = {
        color: '#64748b', fontSize: '10px', fontWeight: 800,
        letterSpacing: '1.5px', marginBottom: '14px', marginTop: 0,
        textTransform: 'uppercase'
    };

    return (
        <footer style={{ background: '#0f172a', color: '#fff', borderTop: '4px solid transparent', backgroundClip: 'padding-box', position: 'relative' }}>
            {/* Gradient top accent */}
            <div style={{ height: '4px', background: 'linear-gradient(to right, #1a3f9c, #2563eb, #fbbf24, #f97316)', position: 'absolute', top: 0, left: 0, right: 0 }} />

            <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '48px 16px 32px' }}>

                {/* Main Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)', gap: isMobile ? '24px 16px' : '32px', paddingBottom: '36px', borderBottom: '1px solid #1e293b' }}>
                    {sections.map((section) => (
                        <div key={section.title}>
                            <h3 style={headingStyle}>{section.title}</h3>
                            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                                {section.links.map((link) => (
                                    <li key={link.label}>
                                        {link.href ? (
                                            <a href={link.href} target="_blank" rel="noopener noreferrer" style={linkStyle}
                                                onMouseEnter={e => e.currentTarget.style.color = '#fbbf24'}
                                                onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
                                                {link.label}
                                            </a>
                                        ) : (
                                            <Link to={link.to} style={linkStyle}
                                                onMouseEnter={e => e.currentTarget.style.color = '#fbbf24'}
                                                onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
                                                {link.label}
                                            </Link>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}

                    {/* Mail Us */}
                    <div>
                        <h3 style={headingStyle}>MAIL US</h3>
                        <p style={{ color: '#64748b', fontSize: '12px', lineHeight: 1.9, margin: 0 }}>
                            ApniDunia Internet Pvt. Ltd.,<br />
                            Hosa Road, Bangalore,<br />
                            Karnataka - 560100, India
                        </p>
                    </div>

                    {/* Registered Office */}
                    <div>
                        <h3 style={headingStyle}>REGISTERED OFFICE</h3>
                        <p style={{ color: '#64748b', fontSize: '12px', lineHeight: 1.9, margin: 0 }}>
                            ApniDunia Internet Pvt. Ltd.,<br />
                            Hosa Road, Bangalore,<br />
                            Karnataka - 560100, India
                        </p>
                    </div>
                </div>

                {/* Sell/Advertise row */}
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', paddingTop: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0', fontSize: '12px' }}>
                        {[['🏪', 'Sell on ApniDunia'], ['📢', 'Advertise'], ['🎁', 'Gift Cards'], ['📰', 'Help Centre']].map(([icon, label], i, arr) => (
                            <span key={label} style={{ display: 'flex', alignItems: 'center' }}>
                                <a href="javascript:void(0)" style={{ color: '#64748b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', padding: '0 14px' }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#fbbf24'}
                                    onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>
                                    <span>{icon}</span> {label}
                                </a>
                                {i < arr.length - 1 && <span style={{ color: '#1e293b' }}>|</span>}
                            </span>
                        ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ color: '#475569', fontSize: '12px', fontWeight: 500 }}>Payments accepted:</span>
                        {paymentIcons.map((p) => (
                            <span key={p} style={{ fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', border: '1px solid #1e293b', color: '#94a3b8', background: '#1e293b', letterSpacing: '0.3px' }}>
                                {p}
                            </span>
                        ))}
                    </div>
                </div>

                {/* App & Social row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', paddingTop: '24px', marginTop: '24px', borderTop: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <span style={{ color: '#475569', fontSize: '11px', fontWeight: 700, letterSpacing: '1px' }}>EXPERIENCE APNIDUNIA APP ON</span>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {[['📱', 'Google Play', 'https://play.google.com/store'], ['🍎', 'App Store', 'https://www.apple.com/app-store/']].map(([icon, label, url]) => (
                                <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                                    style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '7px 14px', borderRadius: '6px', border: '1px solid #1e293b', color: '#94a3b8', textDecoration: 'none', fontSize: '12px', fontWeight: 600, background: 'transparent', transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = 'white'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}>
                                    {icon} {label}
                                </a>
                            ))}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ color: '#475569', fontSize: '11px', fontWeight: 700, letterSpacing: '1px' }}>KEEP IN TOUCH</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {[['F', 'Facebook', 'https://www.facebook.com'], ['T', 'Twitter', 'https://www.twitter.com'], ['Y', 'YouTube', 'https://www.youtube.com'], ['I', 'Instagram', 'https://www.instagram.com']].map(([initial, name, url]) => (
                                <a key={name} href={url} target="_blank" rel="noopener noreferrer" title={name}
                                    style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #1e293b', color: '#64748b', textDecoration: 'none', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#fbbf24'; e.currentTarget.style.borderColor = '#fbbf24'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#1e293b'; }}>
                                    {initial}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #1e293b', textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 500 }}>
                        <span style={{ background: 'linear-gradient(to right, #2563eb, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800 }}>ApniDunia.com</span>
                        <span style={{ color: '#475569' }}> — © 2007-2026 ApniDunia Internet Private Limited. India's #1 E-Commerce Platform</span>
                    </span>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
