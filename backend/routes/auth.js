const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  validateUserRegistration,
  validateUserLogin,
  validatePasswordChange,
  validateProfileUpdate
} = require('../middleware/validation');
const {
  createAuthRateLimit
} = require('../middleware/auth');
const {
  register,
  login,
  refreshToken,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  verifyEmail
} = require('../controllers/authController');

// Rate limiting for auth endpoints
const registerLimiter = createAuthRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many registration attempts, please try again later.'
);

const loginLimiter = createAuthRateLimit(
  15 * 60 * 1000, // 15 minutes
  10, // 10 attempts
  'Too many login attempts, please try again later.'
);

const passwordChangeLimiter = createAuthRateLimit(
  60 * 60 * 1000, // 1 hour
  3, // 3 attempts
  'Too many password change attempts, please try again later.'
);

// Public routes
router.post('/register', registerLimiter, validateUserRegistration, register);
router.post('/login', loginLimiter, validateUserLogin, login);
router.post('/refresh-token', refreshToken);
router.post('/verify-email', verifyEmail);

// Protected routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, validateProfileUpdate, updateProfile);
router.put('/change-password', protect, passwordChangeLimiter, validatePasswordChange, changePassword);
router.post('/logout', protect, logout);

module.exports = router;
