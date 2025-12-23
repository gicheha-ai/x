import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    // Special case for super admin
    if (email === 'gichehalawrence@gmail.com') {
      setLoading(true);
      try {
        const success = await login(email, password);
        if (success) {
          navigate('/dashboard/admin');
        } else {
          setError('Invalid credentials for super admin account');
        }
      } catch (err) {
        setError(err.message || 'Login failed');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        navigate(from, { replace: true });
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate('/reset-password');
  };

  const handleSignUpRedirect = () => {
    navigate('/register');
  };

  if (authLoading) {
    return <LoadingSpinner text="Checking authentication..." />;
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Welcome Back</h1>
          <p>Sign in to your E-Commerce account</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              autoComplete="email"
              className="login-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                className="login-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div className="form-options">
            <label className="remember-me">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="forgot-password"
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="login-button"
          >
            {loading ? (
              <LoadingSpinner size="small" color="white" text="" />
            ) : (
              'Sign In'
            )}
          </button>

          <div className="divider">
            <span>or continue with</span>
          </div>

          <div className="social-login">
            <button type="button" className="social-button google">
              <span className="social-icon">G</span>
              <span>Google</span>
            </button>
            <button type="button" className="social-button facebook">
              <span className="social-icon">f</span>
              <span>Facebook</span>
            </button>
          </div>

          <div className="signup-redirect">
            <p>Don't have an account?</p>
            <button
              type="button"
              onClick={handleSignUpRedirect}
              className="signup-button"
            >
              Create Account
            </button>
          </div>

          <div className="login-info">
            <p className="info-note">
              <strong>Note:</strong> First-time visitors must sign in or register to access the platform.
            </p>
            <p className="info-note">
              <strong>Super Admin:</strong> Use gichehalawrence@gmail.com for special admin features.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;