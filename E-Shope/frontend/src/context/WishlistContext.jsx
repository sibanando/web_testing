import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
    const { user } = useAuth();
    const [wishlistIds, setWishlistIds] = useState(new Set());
    const [loading, setLoading] = useState(false);

    const fetchIds = useCallback(async () => {
        if (!user) { setWishlistIds(new Set()); return; }
        try {
            setLoading(true);
            const { data } = await api.get('/wishlist/ids');
            setWishlistIds(new Set(data));
        } catch {
            setWishlistIds(new Set());
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { fetchIds(); }, [fetchIds]);

    const addToWishlist = async (productId) => {
        if (!user) return false;
        try {
            await api.post(`/wishlist/${productId}`);
            setWishlistIds(prev => new Set([...prev, productId]));
            return true;
        } catch { return false; }
    };

    const removeFromWishlist = async (productId) => {
        if (!user) return false;
        try {
            await api.delete(`/wishlist/${productId}`);
            setWishlistIds(prev => { const s = new Set(prev); s.delete(productId); return s; });
            return true;
        } catch { return false; }
    };

    const toggleWishlist = async (productId) => {
        if (wishlistIds.has(productId)) return removeFromWishlist(productId);
        return addToWishlist(productId);
    };

    return (
        <WishlistContext.Provider value={{ wishlistIds, loading, toggleWishlist, addToWishlist, removeFromWishlist, refresh: fetchIds }}>
            {children}
        </WishlistContext.Provider>
    );
};

export const useWishlist = () => useContext(WishlistContext);
