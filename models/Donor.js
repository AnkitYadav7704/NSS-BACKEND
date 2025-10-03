import mongoose from 'mongoose';

const donorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  rollNo: {
    type: String,
    required: true,
    trim: true
  },
  bloodGroup: {
    type: String,
    required: true,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  age: {
    type: Number,
    required: true,
    min: 18,
    max: 65
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  branch: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: String,
    required: true,
    trim: true
  },
  medicalHistory: {
    type: String,
    trim: true
  },
  lastDonation: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Virtual field to check if donor is eligible for donation (90+ days since last donation)
donorSchema.virtual('isEligibleForDonation').get(function() {
  if (!this.lastDonation) {
    return true; // Never donated, eligible
  }
  
  const now = new Date();
  const daysSinceLastDonation = Math.floor((now - this.lastDonation) / (1000 * 60 * 60 * 24));
  return daysSinceLastDonation >= 90; // 3 months = 90 days
});

// Method to get days until donor becomes eligible
donorSchema.methods.getDaysUntilEligible = function() {
  if (!this.lastDonation) {
    return 0; // Never donated, already eligible
  }
  
  const now = new Date();
  const daysSinceLastDonation = Math.floor((now - this.lastDonation) / (1000 * 60 * 60 * 24));
  
  if (daysSinceLastDonation >= 90) {
    return 0; // Already eligible
  }
  
  return 90 - daysSinceLastDonation;
};

// Method to record a new donation
donorSchema.methods.recordDonation = function() {
  this.lastDonation = new Date();
  return this.save();
};

// Ensure virtual fields are included in JSON output
donorSchema.set('toJSON', { virtuals: true });
donorSchema.set('toObject', { virtuals: true });

export const Donor = mongoose.model('Donor', donorSchema);