const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false
  },
  role: {
    type: String,
    enum: ['student', 'warden', 'admin'],
    default: 'student'
  },
  hostelBlock: {
    type: String,
    required: [true, 'Hostel block is required'],
    enum: ['A', 'B', 'C', 'D']
  },
  roomNumber: {
    type: String,
    required: [true, 'Room number is required'],
    match: [/^[A-Z]\d{3}$/, 'Room number must be in format like A101']
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit phone number']
  },
  profileImage: {
    type: String,
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  reputation: {
    type: Number,
    default: 5,
    min: 0,
    max: 10
  },
  totalBorrowed: {
    type: Number,
    default: 0
  },
  totalLent: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update last login
userSchema.methods.updateLastLogin = function() {
  return this.updateOne({ lastLogin: new Date() });
};

// Get user stats
userSchema.methods.getStats = function() {
  return {
    totalBorrowed: this.totalBorrowed,
    totalLent: this.totalLent,
    reputation: this.reputation,
    joinDate: this.createdAt
  };
};

// Virtual for full address
userSchema.virtual('fullAddress').get(function() {
  return `${this.hostelBlock} Block, Room ${this.roomNumber}`;
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ hostelBlock: 1, roomNumber: 1 });
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
