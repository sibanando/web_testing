import { useParams, Link } from 'react-router-dom';

const pages = {
    'contact-us': {
        title: 'Contact Us',
        content: [
            { heading: 'Customer Support', text: 'Our support team is available 24/7 to help you with any queries.' },
            { heading: 'Email', text: 'support@apnidunia.com' },
            { heading: 'Phone', text: '1800-202-9898 (Toll Free)' },
            { heading: 'Working Hours', text: 'Monday to Sunday, 9:00 AM – 9:00 PM IST' },
        ]
    },
    'about-us': {
        title: 'About Us',
        content: [
            { heading: 'Who We Are', text: 'ApniDunia is India\'s leading e-commerce marketplace, connecting millions of buyers and sellers across the country.' },
            { heading: 'Our Mission', text: 'To provide a fast, reliable, and delightful shopping experience for every Indian.' },
            { heading: 'Founded', text: '2007, Bengaluru, Karnataka, India' },
            { heading: 'Reach', text: 'Serving 500+ cities with 200 million+ registered users.' },
        ]
    },
    'careers': {
        title: 'Careers',
        content: [
            { heading: 'Join Our Team', text: 'We are always looking for talented individuals passionate about e-commerce and technology.' },
            { heading: 'Open Roles', text: 'Software Engineering, Product Management, Data Science, Operations, Marketing, and more.' },
            { heading: 'How to Apply', text: 'Send your resume to careers@apnidunia.com with the role you\'re applying for in the subject line.' },
            { heading: 'Perks', text: 'Competitive pay, health benefits, remote-friendly culture, and learning budgets.' },
        ]
    },
    'apnidunia-stories': {
        title: 'ApniDunia Stories',
        content: [
            { heading: 'Our Journey', text: 'From a small startup in Bengaluru to India\'s #1 e-commerce platform — read the stories behind our milestones.' },
            { heading: 'Seller Success Stories', text: 'Thousands of small businesses have grown multi-fold with ApniDunia. Read how.' },
            { heading: 'Impact', text: 'We have empowered over 1.5 million sellers and created millions of jobs across India.' },
        ]
    },
    'press': {
        title: 'Press',
        content: [
            { heading: 'Media Inquiries', text: 'For press releases, interviews, and media kits, contact our PR team.' },
            { heading: 'Press Contact', text: 'press@apnidunia.com' },
            { heading: 'Latest News', text: 'ApniDunia has been featured in Economic Times, Business Standard, and Forbes India.' },
        ]
    },
    'apnidunia-wholesale': {
        title: 'ApniDunia Wholesale',
        content: [
            { heading: 'Buy in Bulk', text: 'ApniDunia Wholesale lets businesses purchase products in large quantities at the best prices.' },
            { heading: 'Who Can Join', text: 'Retailers, distributors, and enterprises can register for wholesale pricing.' },
            { heading: 'How to Register', text: 'Email wholesale@apnidunia.com with your business registration details.' },
        ]
    },
    'payments': {
        title: 'Payments',
        content: [
            { heading: 'Accepted Payment Methods', text: 'UPI, Debit/Credit Cards (Visa, Mastercard, Amex), Net Banking, EMI, and Cash on Delivery.' },
            { heading: 'Payment Security', text: 'All transactions are secured with 256-bit SSL encryption.' },
            { heading: 'EMI Options', text: 'No-cost EMI available on orders above ₹3,000 with select banks.' },
            { heading: 'Refund to Source', text: 'Refunds are credited back to the original payment method within 5–7 business days.' },
        ]
    },
    'shipping': {
        title: 'Shipping',
        content: [
            { heading: 'Delivery Time', text: 'Most orders are delivered within 2–5 business days. Express delivery available in select cities.' },
            { heading: 'Free Shipping', text: 'Free shipping on orders above ₹499.' },
            { heading: 'Tracking', text: 'Track your order in real time from the My Orders section in your profile.' },
            { heading: 'Delivery Partners', text: 'We partner with BlueDart, Delhivery, Ekart, and other leading logistics companies.' },
        ]
    },
    'cancellation-returns': {
        title: 'Cancellation & Returns',
        content: [
            { heading: 'Cancellation Policy', text: 'Orders can be cancelled before they are shipped. Once shipped, a return request must be raised.' },
            { heading: 'Return Window', text: 'Most products have a 7–30 day return window from the date of delivery.' },
            { heading: 'How to Return', text: 'Go to My Orders → Select the item → Click "Return" → Choose a reason → Schedule a pickup.' },
            { heading: 'Refund Timeline', text: 'Refunds are processed within 5–7 business days after the returned item is received.' },
        ]
    },
    'faq': {
        title: 'Frequently Asked Questions',
        content: [
            { heading: 'How do I track my order?', text: 'Go to Profile → My Orders to see real-time tracking for all your orders.' },
            { heading: 'Can I change my delivery address?', text: 'You can change the address before the order is shipped by contacting support.' },
            { heading: 'Is Cash on Delivery available?', text: 'Yes, COD is available for most pin codes across India.' },
            { heading: 'How do I become a seller?', text: 'Click "Become a Seller" in the navigation bar or visit /login and register as a Seller.' },
        ]
    },
    'report-infringement': {
        title: 'Report Infringement',
        content: [
            { heading: 'Intellectual Property', text: 'ApniDunia takes IP violations seriously. If you believe a listing infringes your rights, report it.' },
            { heading: 'How to Report', text: 'Email legal@apnidunia.com with the product link, your IP details, and supporting documents.' },
            { heading: 'Response Time', text: 'We review all IP complaints within 48 hours.' },
        ]
    },
    'terms-of-use': {
        title: 'Terms Of Use',
        content: [
            { heading: 'Acceptance', text: 'By using ApniDunia, you agree to our Terms of Use. Please read them carefully.' },
            { heading: 'User Accounts', text: 'You are responsible for maintaining the security of your account credentials.' },
            { heading: 'Prohibited Activity', text: 'Fraudulent orders, fake reviews, and misuse of promotions are strictly prohibited.' },
            { heading: 'Governing Law', text: 'These terms are governed by the laws of India and subject to jurisdiction in Bengaluru.' },
        ]
    },
    'security': {
        title: 'Security',
        content: [
            { heading: 'Data Protection', text: 'We use industry-standard SSL/TLS encryption to protect all data transmitted on our platform.' },
            { heading: 'Account Safety', text: 'Enable two-factor authentication from your account settings for extra security.' },
            { heading: 'Suspicious Activity', text: 'If you notice any unauthorized activity on your account, contact us immediately.' },
            { heading: 'Vulnerability Disclosure', text: 'Report security vulnerabilities responsibly to security@apnidunia.com.' },
        ]
    },
    'privacy': {
        title: 'Privacy Policy',
        content: [
            { heading: 'Data We Collect', text: 'We collect your name, email, address, and purchase history to deliver a personalized experience.' },
            { heading: 'How We Use It', text: 'Your data is used for order fulfillment, customer support, and improving our services.' },
            { heading: 'Data Sharing', text: 'We do not sell your personal data. We share it only with delivery partners and payment processors.' },
            { heading: 'Your Rights', text: 'You can request deletion or export of your data by contacting privacy@apnidunia.com.' },
        ]
    },
    'sitemap': {
        title: 'Sitemap',
        content: [
            { heading: 'Main Pages', text: 'Home, Cart, Checkout, Login / Register, User Profile, Seller Dashboard, Admin Panel' },
            { heading: 'Help & Policy', text: 'Payments, Shipping, Cancellation & Returns, FAQ, Terms of Use, Privacy Policy, Security' },
            { heading: 'About', text: 'About Us, Careers, Press, ApniDunia Stories, Wholesale, Contact Us' },
        ]
    },
    'grievance-redressal': {
        title: 'Grievance Redressal',
        content: [
            { heading: 'Grievance Officer', text: 'As per the IT Act, ApniDunia has appointed a Grievance Officer.' },
            { heading: 'Name', text: 'Mr. Aditya Sharma' },
            { heading: 'Contact', text: 'grievance@apnidunia.com | Phone: 080-4660-8282' },
            { heading: 'Resolution Time', text: 'All grievances are acknowledged within 24 hours and resolved within 30 days.' },
        ]
    },
};

const StaticPage = () => {
    const { slug } = useParams();
    const page = pages[slug];

    if (!page) {
        return (
            <div style={{ background: '#f1f3f6', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '48px', margin: '0 0 16px' }}>🔍</p>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#212121', marginBottom: '8px' }}>Page Not Found</h2>
                    <p style={{ color: '#888', marginBottom: '20px' }}>The page you're looking for doesn't exist.</p>
                    <Link to="/" style={{ color: '#2874f0', fontWeight: 600, textDecoration: 'none' }}>← Back to Home</Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{ background: '#f1f3f6', minHeight: '80vh', padding: '32px 16px' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                {/* Breadcrumb */}
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '16px' }}>
                    <Link to="/" style={{ color: '#2874f0', textDecoration: 'none' }}>Home</Link>
                    {' '}&rsaquo;{' '}
                    <span style={{ color: '#212121' }}>{page.title}</span>
                </p>

                {/* Card */}
                <div style={{ background: 'white', borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '32px' }}>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#212121', marginTop: 0, marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #f0f0f0' }}>
                        {page.title}
                    </h1>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {page.content.map((item) => (
                            <div key={item.heading}>
                                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#2874f0', margin: '0 0 6px' }}>{item.heading}</h3>
                                <p style={{ fontSize: '14px', color: '#444', margin: 0, lineHeight: 1.7 }}>{item.text}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <Link to="/" style={{ color: '#2874f0', fontSize: '13px', textDecoration: 'none', fontWeight: 500 }}>← Back to Shopping</Link>
                </div>
            </div>
        </div>
    );
};

export default StaticPage;
