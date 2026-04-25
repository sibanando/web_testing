import { createContext, useContext, useState, useMemo } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const [items, setItems] = useState(() => {
        try {
            const saved = localStorage.getItem('cart');
            return (saved && saved !== 'undefined') ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Cart init error", e);
            return [];
        }
    });

    const addToCart = (product) => {
        setItems((prev) => {
            const existing = prev.find((item) => item.id === product.id);
            let newCart;
            if (existing) {
                newCart = prev.map((item) =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            } else {
                newCart = [...prev, { ...product, quantity: 1 }];
            }
            localStorage.setItem('cart', JSON.stringify(newCart));
            return newCart;
        });
    };

    const removeFromCart = (id) => {
        setItems((prev) => {
            const newCart = prev.filter((item) => item.id !== id);
            localStorage.setItem('cart', JSON.stringify(newCart));
            return newCart;
        });
    };

    const updateQuantity = (id, quantity) => {
        if (quantity < 1) {
            removeFromCart(id);
            return;
        }
        setItems((prev) => {
            const newCart = prev.map((item) =>
                item.id === id ? { ...item, quantity } : item
            );
            localStorage.setItem('cart', JSON.stringify(newCart));
            return newCart;
        });
    };

    const clearCart = () => {
        setItems([]);
        localStorage.removeItem('cart');
    };

    const total = useMemo(() => {
        if (!Array.isArray(items)) return 0;
        return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }, [items]);

    return (
        <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, total }}>
            {children}
        </CartContext.Provider>
    );
};
