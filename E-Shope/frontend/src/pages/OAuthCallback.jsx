import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const OAuthCallback = () => {
    const [searchParams] = useSearchParams();
    const { loginWithToken } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        const oauthError = searchParams.get('oauth_error');

        if (oauthError || !token) {
            navigate(`/login?oauth_error=${oauthError || 'missing_token'}`, { replace: true });
            return;
        }

        try {
            const user = JSON.parse(decodeURIComponent(searchParams.get('user') || '{}'));
            loginWithToken(token, user);
            if (user.is_seller) navigate('/seller', { replace: true });
            else navigate('/', { replace: true });
        } catch {
            navigate('/login?oauth_error=invalid_response', { replace: true });
        }
    }, []);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #1C0A00 0%, #3D1A00 45%, #1C0A00 100%)',
        }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    width: '48px', height: '48px', margin: '0 auto 16px',
                    border: '3px solid rgba(232,93,4,0.2)',
                    borderTopColor: '#E85D04',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: 500 }}>
                    Completing sign in…
                </p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );
};

export default OAuthCallback;
