const { body, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// User registration validation
const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('role')
    .optional()
    .isIn(['student', 'warden', 'admin'])
    .withMessage('Role must be student, warden, or admin'),
  
  body('hostelBlock')
    .isIn(['A', 'B', 'C', 'D'])
    .withMessage('Hostel block must be A, B, C, or D'),
  
  body('roomNumber')
    .matches(/^[A-Z]\d{3}$/)
    .withMessage('Room number must be in format like A101'),
  
  body('phoneNumber')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please enter a valid 10-digit phone number starting with 6-9'),
  
  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Complaint validation
const validateComplaint = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  
  body('category')
    .isIn(['electrical', 'plumbing', 'furniture', 'cleanliness', 'noise', 'security', 'other'])
    .withMessage('Invalid complaint category'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent'),
  
  body('hostelBlock')
    .isIn(['A', 'B', 'C', 'D'])
    .withMessage('Hostel block must be A, B, C, or D'),
  
  body('roomNumber')
    .matches(/^[A-Z]\d{3}$/)
    .withMessage('Room number must be in format like A101'),
  
  body('isAnonymous')
    .optional()
    .isBoolean()
    .withMessage('isAnonymous must be a boolean'),
  
  handleValidationErrors
];

// Resource validation
const validateResource = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Resource name must be between 3 and 100 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  
  body('category')
    .isIn(['electronics', 'books', 'sports', 'kitchen', 'tools', 'study-materials', 'other'])
    .withMessage('Invalid resource category'),
  
  body('condition')
    .isIn(['excellent', 'good', 'fair', 'poor'])
    .withMessage('Condition must be excellent, good, fair, or poor'),
  
  body('hostelBlock')
    .isIn(['A', 'B', 'C', 'D'])
    .withMessage('Hostel block must be A, B, C, or D'),
  
  body('roomNumber')
    .matches(/^[A-Z]\d{3}$/)
    .withMessage('Room number must be in format like A101'),
  
  body('maxBorrowDuration')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Maximum borrow duration must be between 1 and 30 days'),
  
  body('depositRequired')
    .optional()
    .isBoolean()
    .withMessage('depositRequired must be a boolean'),
  
  body('depositAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Deposit amount must be a positive number'),
  
  handleValidationErrors
];

// Resource borrow validation
const validateResourceBorrow = [
  body('duration')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Borrow duration must be between 1 and 30 days'),
  
  handleValidationErrors
];

// Borrow request validation (approval flow)
const validateBorrowRequest = [
  body('duration')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Borrow duration must be between 1 and 30 days'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Message cannot exceed 200 characters'),
  handleValidationErrors
];

// Borrow decision validation (approve/reject)
const validateBorrowDecision = [
  body('duration')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Borrow duration must be between 1 and 30 days'),
  body('message')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Message cannot exceed 200 characters'),
  handleValidationErrors
];

// Resource return validation
const validateResourceReturn = [
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('feedback')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Feedback cannot exceed 200 characters'),
  
  handleValidationErrors
];

// Complaint feedback validation
const validateComplaintFeedback = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Comment cannot exceed 300 characters'),
  
  handleValidationErrors
];

// Password change validation
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  handleValidationErrors
];

// Password reset validation
const validatePasswordReset = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  handleValidationErrors
];

// Profile update validation
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('phoneNumber')
    .optional()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Please enter a valid 10-digit phone number starting with 6-9'),
  
  body('hostelBlock')
    .optional()
    .isIn(['A', 'B', 'C', 'D'])
    .withMessage('Hostel block must be A, B, C, or D'),
  
  body('roomNumber')
    .optional()
    .matches(/^[A-Z]\d{3}$/)
    .withMessage('Room number must be in format like A101'),
  
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateComplaint,
  validateResource,
  validateResourceBorrow,
  validateBorrowRequest,
  validateBorrowDecision,
  validateResourceReturn,
  validateComplaintFeedback,
  validatePasswordChange,
  validatePasswordReset,
  validateProfileUpdate,
  handleValidationErrors
};
