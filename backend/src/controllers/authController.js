const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Token = require('../models/Token');
const sendEmail = require('../services/emailService');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

/**
 * Register a new user
 */
exports.register = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        status: 'error', 
        errors: errors.array() 
      });
    }

    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phone, 
      role = 'buyer',
      businessName,
      businessType 
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Check if this is super admin registration
    const isSuperAdmin = email === process.env.SUPER_ADMIN_EMAIL;
    
    // Generate affiliate ID if registering as affiliate
    let affiliateId = null;
    if (role === 'affiliate' || isSuperAdmin) {
      affiliateId = `AFF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      role: isSuperAdmin ? 'admin' : role,
      isSuperAdmin,
      affiliateId,
      businessName: role === 'seller' ? businessName : null,
      businessType: role === 'seller' ? businessType : null,
      emailVerified: isSuperAdmin, // Super admin email is auto-verified
      subscriptionTier: 'free'
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE }
    );

    // Save refresh token
    await Token.create({
      userId: user._id,
      token: refreshToken,
      type: 'refresh',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    // Send verification email (except for super admin)
    if (!isSuperAdmin) {
      await sendVerificationEmail(user);
    }

    // Remove password from response
    user.password = undefined;

    logger.info(`User registered: ${email} (${role})`);

    res.status(201).json({
      status: 'success',
      message: isSuperAdmin 
        ? 'Super admin account created successfully' 
        : 'Registration successful. Please verify your email.',
      data: {
        user,
        token,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Login user
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email and password'
      });
    }

    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Check email verification (except for super admin)
    if (!user.emailVerified && user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return res.status(401).json({
        status: 'error',
        message: 'Please verify your email before logging in'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role,
        isSuperAdmin: user.email === process.env.SUPER_ADMIN_EMAIL
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE }
    );

    // Save refresh token
    await Token.create({
      userId: user._id,
      token: refreshToken,
      type: 'refresh',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Remove password from response
    user.password = undefined;

    logger.info(`User logged in: ${email}`);

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user,
        token,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Refresh token
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        status: 'error',
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Check if token exists in database
    const tokenDoc = await Token.findOne({ 
      token: refreshToken, 
      userId: decoded.id,
      type: 'refresh'
    });

    if (!tokenDoc) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token'
      });
    }

    // Check if token is expired
    if (tokenDoc.expiresAt < new Date()) {
      await tokenDoc.remove();
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token expired'
      });
    }

    // Get user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Generate new access token
    const newToken = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role,
        isSuperAdmin: user.email === process.env.SUPER_ADMIN_EMAIL
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.status(200).json({
      status: 'success',
      data: {
        token: newToken
      }
    });
  } catch (error) {
    logger.error('Refresh token error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token'
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Token refresh failed'
    });
  }
};

/**
 * Logout user
 */
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    // Remove refresh token from database
    if (refreshToken) {
      await Token.deleteOne({ token: refreshToken, type: 'refresh' });
    }

    // Add access token to blacklist
    if (token) {
      await Token.create({
        userId: req.user.id,
        token,
        type: 'blacklist',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });
    }

    logger.info(`User logged out: ${req.user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Logout failed'
    });
  }
};

/**
 * Forgot password
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      // For security, don't reveal if user exists
      return res.status(200).json({
        status: 'success',
        message: 'If your email is registered, you will receive a password reset link'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Save reset token to user
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // Send email
    const emailSent = await sendEmail({
      to: user.email,
      subject: 'Password Reset Request - E-Commerce Pro Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Password Reset Request</h2>
          <p>Hello ${user.firstName},</p>
          <p>You requested to reset your password for your E-Commerce Pro Platform account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p>This link will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <small>E-Commerce Pro Platform Team</small>
          </p>
        </div>
      `
    });

    if (!emailSent) {
      throw new Error('Failed to send reset email');
    }

    logger.info(`Password reset requested for: ${email}`);

    res.status(200).json({
      status: 'success',
      message: 'Password reset link sent to your email'
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process password reset request'
    });
  }
};

/**
 * Reset password
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Validate password
    if (!password || password.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters long'
      });
    }

    // Hash the token
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.passwordChangedAt = Date.now();
    await user.save();

    // Invalidate all existing refresh tokens for this user
    await Token.deleteMany({ userId: user._id, type: 'refresh' });

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Successful - E-Commerce Pro Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #22c55e;">Password Reset Successful</h2>
          <p>Hello ${user.firstName},</p>
          <p>Your password has been successfully reset.</p>
          <p>If you did not perform this action, please contact our support team immediately.</p>
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Security Tip:</strong> Always use a strong, unique password and enable two-factor authentication for added security.</p>
          </div>
          <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <small>E-Commerce Pro Platform Team</small>
          </p>
        </div>
      `
    });

    logger.info(`Password reset successful for: ${user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reset password'
    });
  }
};

/**
 * Verify email
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Hash the token
    const verificationTokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid verification token
    const user = await User.findOne({
      emailVerificationToken: verificationTokenHash,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired verification token'
      });
    }

    // Verify email
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Send welcome email
    await sendEmail({
      to: user.email,
      subject: 'Email Verified - Welcome to E-Commerce Pro Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #22c55e;">🎉 Welcome to E-Commerce Pro Platform!</h2>
          <p>Hello ${user.firstName},</p>
          <p>Your email has been successfully verified. You now have full access to all platform features.</p>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #3b82f6; margin-top: 0;">Get Started:</h3>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Complete your profile</li>
              <li>Explore products</li>
              <li>Start shopping or selling</li>
              ${user.role === 'affiliate' ? '<li>Generate your affiliate links</li>' : ''}
              ${user.role === 'seller' ? '<li>Upload your first product</li>' : ''}
            </ul>
          </div>

          <p>Need help getting started? Check out our <a href="${process.env.FRONTEND_URL}/help">help center</a>.</p>
          
          <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <small>E-Commerce Pro Platform Team</small>
          </p>
        </div>
      `
    });

    logger.info(`Email verified for: ${user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully'
    });
  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify email'
    });
  }
};

/**
 * Resend verification email
 */
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is already verified'
      });
    }

    // Send verification email
    await sendVerificationEmail(user);

    res.status(200).json({
      status: 'success',
      message: 'Verification email sent'
    });
  } catch (error) {
    logger.error('Resend verification error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to resend verification email'
    });
  }
};

/**
 * Change password (authenticated user)
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Find user with password
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    user.passwordChangedAt = Date.now();
    await user.save();

    // Invalidate all existing refresh tokens for this user
    await Token.deleteMany({ userId: user._id, type: 'refresh' });

    // Send notification email
    await sendEmail({
      to: user.email,
      subject: 'Password Changed - E-Commerce Pro Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Password Changed Successfully</h2>
          <p>Hello ${user.firstName},</p>
          <p>Your password has been changed successfully.</p>
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Security Notice:</strong> If you did not make this change, please contact our support team immediately.</p>
          </div>
          <p>All your existing sessions have been logged out for security.</p>
          <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <small>E-Commerce Pro Platform Team</small>
          </p>
        </div>
      `
    });

    logger.info(`Password changed for: ${user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to change password'
    });
  }
};

/**
 * Social login (Google, Facebook)
 */
exports.socialLogin = async (req, res) => {
  try {
    const { provider, token, email, name, picture } = req.body;

    let user = await User.findOne({ email });

    if (!user) {
      // Create new user from social login
      user = new User({
        email,
        firstName: name?.split(' ')[0] || '',
        lastName: name?.split(' ').slice(1).join(' ') || '',
        role: 'buyer',
        emailVerified: true,
        avatar: picture,
        socialLogin: {
          [provider]: true
        },
        password: crypto.randomBytes(20).toString('hex') // Random password for social users
      });
      await user.save();
    } else {
      // Update existing user with social login info
      user.socialLogin = user.socialLogin || {};
      user.socialLogin[provider] = true;
      if (picture && !user.avatar) {
        user.avatar = picture;
      }
      await user.save();
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role,
        isSuperAdmin: user.email === process.env.SUPER_ADMIN_EMAIL
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE }
    );

    // Save refresh token
    await Token.create({
      userId: user._id,
      token: refreshToken,
      type: 'refresh',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Remove password from response
    user.password = undefined;

    logger.info(`Social login: ${email} via ${provider}`);

    res.status(200).json({
      status: 'success',
      message: 'Social login successful',
      data: {
        user,
        token: jwtToken,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Social login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Social login failed'
    });
  }
};

/**
 * Get current user profile
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get profile'
    });
  }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    const userId = req.user.id;

    // Remove restricted fields
    delete updates.email;
    delete updates.password;
    delete updates.role;
    delete updates.isSuperAdmin;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -resetPasswordToken -resetPasswordExpires');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    logger.info(`Profile updated for: ${user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile'
    });
  }
};

/**
 * Delete user account
 */
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    // Verify password
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect password'
      });
    }

    // Soft delete (deactivate account)
    user.isActive = false;
    user.deactivatedAt = new Date();
    await user.save();

    // Invalidate all tokens
    await Token.deleteMany({ userId });

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: 'Account Deactivated - E-Commerce Pro Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6b7280;">Account Deactivated</h2>
          <p>Hello ${user.firstName},</p>
          <p>Your account has been deactivated as requested.</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Note:</strong> Your account data will be retained for 30 days. After this period, it will be permanently deleted.</p>
            <p>To reactivate your account, simply login within 30 days.</p>
          </div>
          <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <small>E-Commerce Pro Platform Team</small>
          </p>
        </div>
      `
    });

    logger.info(`Account deactivated: ${user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    logger.error('Delete account error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete account'
    });
  }
};

/**
 * Helper function to send verification email
 */
const sendVerificationEmail = async (user) => {
  // Generate verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationTokenHash = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  // Save token to user
  user.emailVerificationToken = verificationTokenHash;
  user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  await user.save();

  // Create verification URL
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

  // Send email
  return sendEmail({
    to: user.email,
    subject: 'Verify Your Email - E-Commerce Pro Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">Welcome to E-Commerce Pro Platform!</h2>
        <p>Hello ${user.firstName},</p>
        <p>Thank you for registering. Please verify your email address to complete your registration.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Verify Email Address
          </a>
        </div>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, please ignore this email.</p>
        <div style="margin-top: 30px; padding: 20px; background-color: #f0f9ff; border-radius: 5px;">
          <h3 style="color: #3b82f6; margin-top: 0;">About E-Commerce Pro Platform:</h3>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Global marketplace connecting buyers and sellers</li>
            <li>Built-in affiliate marketing program</li>
            <li>Multiple revenue streams</li>
            <li>Secure payment processing</li>
          </ul>
        </div>
        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <small>E-Commerce Pro Platform Team</small>
        </p>
      </div>
    `
  });
};