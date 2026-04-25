import { Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
const Home = lazy(() => import('./pages/Home'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Login = lazy(() => import('./pages/Login'));
const Admin = lazy(() => import('./pages/Admin'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const SellerDashboard = lazy(() => import('./pages/SellerDashboard'));
const StaticPage = lazy(() => import('./pages/StaticPage'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));

function App() {
  const location = useLocation();
  const isAdmin = location.pathname === '/admin' || location.pathname === '/seller';

  return (
    <>
      <Navbar />
      <Suspense fallback={<div style={{ textAlign: 'center', padding: '60px', color: '#2874f0' }}>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/seller" element={<SellerDashboard />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/page/:slug" element={<StaticPage />} />
        </Routes>
      </Suspense>
      {!isAdmin && <Footer />}
    </>
  );
}

export default App;
