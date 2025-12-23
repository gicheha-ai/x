import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext/AuthProvider';
import { CartProvider } from './context/CartContext/CartProvider';
import { ProductProvider } from './context/ProductContext/ProductProvider';
import { SuperAdminProvider } from './context/SuperAdminContext/SuperAdminProvider';
import { RevenueProvider } from './context/RevenueContext/RevenueProvider';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import Header from './components/Header/Header';
import HomePage from './pages/HomePage/HomePage';
import ProductList from './pages/ProductList/ProductList';
import ProductDetail from './pages/ProductDetail/ProductDetail';
import CartPage from './pages/CartPage/CartPage';
import Checkout from './pages/Checkout/Checkout';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import AffiliatePortal from './pages/AffiliatePortal/AffiliatePortal';
import BoostSales from './pages/BoostSales/BoostSales';
import NotFound from './pages/NotFound/NotFound';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <ProductProvider>
            <CartProvider>
              <SuperAdminProvider>
                <RevenueProvider>
                  <div className="App">
                    <Header />
                    <main>
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
                        <Route path="*" element={<Navigate to="/404" />} />
                      </Routes>
                    </main>
                    <footer>
                      <p>© 2024 E-Commerce Platform. All rights reserved.</p>
                      <p>This footer is visible only when scrolling to the bottom of the page.</p>
                    </footer>
                  </div>
                </RevenueProvider>
              </SuperAdminProvider>
            </CartProvider>
          </ProductProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;