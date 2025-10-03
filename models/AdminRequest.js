import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminRequestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false, // Set during submit step
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  rollNo: {
    type: String,
    required: false, // Set during submit step
    trim: true
  },
  branch: {
    type: String,
    required: false, // Set during submit step
    trim: true
  },
  year: {
    type: String,
    required: false, // Set during submit step
    trim: true
  },
  phone: {
    type: String,
    required: false, // Set during submit step
    trim: true
  },
  password: {
    type: String,
    required: false, // Set during submit step
    minlength: 6
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  reviewedAt: Date,
  otp: {
    code: String,
    expiresAt: Date
  },
  emailVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Hash password before saving
adminRequestSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Generate OTP
adminRequestSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = {
    code: otp,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
  };
  return otp;
};

// Verify OTP
adminRequestSchema.methods.verifyOTP = function(candidateOTP) {
  if (!this.otp || !this.otp.code || !this.otp.expiresAt) {
    return false;
  }
  
  if (new Date() > this.otp.expiresAt) {
    return false;
  }
  
  return this.otp.code === candidateOTP;
};

export const AdminRequest = mongoose.model('AdminRequest', adminRequestSchema);