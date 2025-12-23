import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import LoadingSpinner from './components/LoadingSpinner/LoadingSpinner';

// Lazy load pages for better performance
const HomePage = lazy(() => import('./pages/HomePage/HomePage'));
const ProductList = lazy(() => import('./pages/ProductList/ProductList'));
const ProductDetail = lazy(() => import('./pages/ProductDetail/ProductDetail'));
const CartPage = lazy(() => import('./pages/CartPage/CartPage'));
const Checkout = lazy(() => import('./pages/Checkout/Checkout'));
const Login = lazy(() => import('./pages/Login/Login'));
const Register = lazy(() => import('./pages/Register/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const AffiliatePortal = lazy(() => import('./pages/AffiliatePortal/AffiliatePortal'));
const BoostSales = lazy(() => import('./pages/BoostSales/BoostSales'));
const NotFound = lazy(() => import('./pages/NotFound/NotFound'));

const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductList />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard/*" element={<Dashboard />} />
        <Route path="/affiliate" element={<AffiliatePortal />} />
        <Route path="/boost" element={<BoostSales />} />
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;