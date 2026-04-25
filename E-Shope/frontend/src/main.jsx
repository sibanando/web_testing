import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <BrowserRouter>
        <ErrorBoundary>
            <AuthProvider>
                <CartProvider>
                    <App />
                </CartProvider>
            </AuthProvider>
        </ErrorBoundary>
    </BrowserRouter>
);
