import { useEffect } from 'react';

const SESSION_KEY = 'apni_sid';

function getSessionId() {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
        id = Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
}

export function track(event_type, data = {}) {
    try {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event_type,
                session_id: getSessionId(),
                user_id: user?.id || null,
                ...data,
            }),
        }).catch(() => {});
    } catch { /* fire-and-forget */ }
}

// Hook: fires once when deps change (like useEffect)
export default function useTracking(event_type, data = {}, deps = []) {
    useEffect(() => {
        track(event_type, data);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}
