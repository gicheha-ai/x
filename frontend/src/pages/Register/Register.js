import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    userType: 'buyer',
    agreeToTerms: false
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    // Phone validation (Kenyan format)
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^(?:254|\+254|0)?(7[0-9]{8})$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid Kenyan phone number';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    // Terms agreement validation
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and conditions';
    }
    
    // Check if email is super admin email
    if (formData.email.toLowerCase() === 'gichehalawrence@gmail.com') {
      newErrors.email = 'This email is reserved for platform administration';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setErrors({});
    
    try {
      const success = await register(formData);
      if (success) {
        // Redirect based on user type
        if (formData.userType === 'seller') {
          navigate('/dashboard/seller');
        } else if (formData.userType === 'affiliate') {
          navigate('/affiliate');
        } else {
          navigate('/');
        }
      } else {
        setErrors({ general: 'Registration failed. Email might already be registered.' });
      }
    } catch (error) {
      setErrors({ general: error.message || 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      return cleaned;
    } else if (cleaned.startsWith('254')) {
      return '0' + cleaned.substring(3);
    } else if (cleaned.startsWith('7') && cleaned.length === 9) {
      return '0' + cleaned;
    }
    return value;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    handleChange({ target: { name: 'phone', value: formatted } });
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h1>Create Account</h1>
          <p>Join our E-Commerce platform today</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          {errors.general && (
            <div className="error-message">
              ⚠️ {errors.general}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className={`register-input ${errors.name ? 'error' : ''}`}
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                className={`register-input ${errors.email ? 'error' : ''}`}
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number *</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handlePhoneChange}
              placeholder="0712 345 678"
              className={`register-input ${errors.phone ? 'error' : ''}`}
            />
            {errors.phone && <span className="field-error">{errors.phone}</span>}
            <small className="helper-text">Enter your Kenyan phone number</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  className={`register-input ${errors.password ? 'error' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <input
                type={showPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                className={`register-input ${errors.confirmPassword ? 'error' : ''}`}
              />
              {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="userType">I want to join as:</label>
            <div className="user-type-selector">
              <label className={`user-type-option ${formData.userType === 'buyer' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="userType"
                  value="buyer"
                  checked={formData.userType === 'buyer'}
                  onChange={handleChange}
                />
                <div className="option-content">
                  <span className="option-icon">🛒</span>
                  <span className="option-text">
                    <strong>Buyer</strong>
                    <small>Shop and purchase products</small>
                  </span>
                </div>
              </label>

              <label className={`user-type-option ${formData.userType === 'seller' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="userType"
                  value="seller"
                  checked={formData.userType === 'seller'}
                  onChange={handleChange}
                />
                <div className="option-content">
                  <span className="option-icon">🏪</span>
                  <span className="option-text">
                    <strong>Seller</strong>
                    <small>Sell products and earn money</small>
                  </span>
                </div>
              </label>

              <label className={`user-type-option ${formData.userType === 'affiliate' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="userType"
                  value="affiliate"
                  checked={formData.userType === 'affiliate'}
                  onChange={handleChange}
                />
                <div className="option-content">
                  <span className="option-icon">🤝</span>
                  <span className="option-text">
                    <strong>Affiliate</strong>
                    <small>Promote products and earn commissions</small>
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="terms-agreement">
              <input
                type="checkbox"
                name="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={handleChange}
                className={errors.agreeToTerms ? 'error' : ''}
              />
              <span>
                I agree to the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>
              </span>
            </label>
            {errors.agreeToTerms && <span className="field-error">{errors.agreeToTerms}</span>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="register-button"
          >
            {loading ? (
              <LoadingSpinner size="small" color="white" text="" />
            ) : (
              'Create Account'
            )}
          </button>

          <div className="login-redirect">
            <p>Already have an account?</p>
            <Link to="/login" className="login-link">
              Sign In Here
            </Link>
          </div>

          <div className="registration-info">
            <p className="info-note">
              <strong>Note:</strong> Registration is required to access all platform features.
            </p>
            <p className="info-note">
              <strong>Sellers:</strong> After registration, you can set up your store and start selling.
            </p>
            <p className="info-note">
              <strong>Affiliates:</strong> You'll gain access to the affiliate dashboard to start earning commissions.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
