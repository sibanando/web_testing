import React from 'react';

const CHUNK_ERROR_KEY = 'chunk_reload_attempted';

function isChunkLoadError(error) {
    const msg = error?.message || '';
    return (
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('Loading chunk') ||
        msg.includes('Loading CSS chunk') ||
        msg.includes('dynamically imported module')
    );
}

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);

        if (isChunkLoadError(error)) {
            // Auto-reload once to fetch fresh chunks after a rebuild.
            // Guard against infinite reload loops with a session flag.
            if (!sessionStorage.getItem(CHUNK_ERROR_KEY)) {
                sessionStorage.setItem(CHUNK_ERROR_KEY, '1');
                window.location.reload();
            }
        }
    }

    handleReload = () => {
        sessionStorage.removeItem(CHUNK_ERROR_KEY);
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            const chunkError = isChunkLoadError(this.state.error);
            return (
                <div style={{
                    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#FAFAF7', padding: '24px',
                }}>
                    <div style={{
                        maxWidth: '420px', width: '100%', background: 'white',
                        borderRadius: '16px', padding: '36px 32px', textAlign: 'center',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.08)', border: '1px solid #F5F0EA',
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                            {chunkError ? '🔄' : '⚠️'}
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1C1C1E', margin: '0 0 8px' }}>
                            {chunkError ? 'App Updated' : 'Something went wrong'}
                        </h2>
                        <p style={{ fontSize: '14px', color: '#78716C', margin: '0 0 24px', lineHeight: 1.6 }}>
                            {chunkError
                                ? 'A new version was deployed. Reload to get the latest.'
                                : 'An unexpected error occurred. Try refreshing the page.'}
                        </p>
                        <button onClick={this.handleReload} style={{
                            background: 'linear-gradient(135deg, #E85D04, #FB8500)',
                            color: 'white', border: 'none', borderRadius: '10px',
                            padding: '12px 28px', fontSize: '14px', fontWeight: 700,
                            cursor: 'pointer', boxShadow: '0 4px 12px rgba(232,93,4,0.3)',
                        }}>
                            Reload Page
                        </button>
                        {!chunkError && (
                            <details style={{ marginTop: '20px', textAlign: 'left' }}>
                                <summary style={{ fontSize: '12px', color: '#94A3B8', cursor: 'pointer' }}>
                                    Error details
                                </summary>
                                <pre style={{
                                    fontSize: '11px', color: '#64748B', whiteSpace: 'pre-wrap',
                                    background: '#F8FAFC', borderRadius: '8px', padding: '12px',
                                    marginTop: '8px', overflow: 'auto', maxHeight: '200px',
                                }}>
                                    {this.state.error?.toString()}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
