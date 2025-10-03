import express from 'express';
import { Donor } from '../models/Donor.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all donors for admin (includes medical history)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const donors = await Donor.find({ isActive: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Donor.countDocuments({ isActive: true });

    res.json({
      success: true,
      donors,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get admin donors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch donors'
    });
  }
});

// Get single donor
router.get('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.id);
    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Donor not found'
      });
    }

    res.json({
      success: true,
      donor
    });
  } catch (error) {
    console.error('Get donor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch donor'
    });
  }
});

// Create donor
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, rollNo, bloodGroup, age, phone, email, branch, year, medicalHistory, lastDonation } = req.body;

    // Validate blood group
    const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    if (!validBloodGroups.includes(bloodGroup)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid blood group'
      });
    }

    // Validate age
    if (age < 16 || age > 65) {
      return res.status(400).json({
        success: false,
        message: 'Age must be between 16 and 65'
      });
    }

    const donor = new Donor({
      name,
      rollNo,
      bloodGroup,
      age,
      phone,
      email,
      branch,
      year,
      medicalHistory,
      lastDonation: lastDonation ? new Date(lastDonation) : undefined
    });

    await donor.save();

    res.status(201).json({
      success: true,
      message: 'Donor registered successfully',
      donor
    });
  } catch (error) {
    console.error('Create donor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register donor'
    });
  }
});

// Update donor
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, rollNo, bloodGroup, age, phone, email, branch, year, medicalHistory, lastDonation } = req.body;

    // Validate blood group
    const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    if (!validBloodGroups.includes(bloodGroup)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid blood group'
      });
    }

    // Validate age
    if (age < 16 || age > 65) {
      return res.status(400).json({
        success: false,
        message: 'Age must be between 16 and 65'
      });
    }

    const updateData = {
      name,
      rollNo,
      bloodGroup,
      age,
      phone,
      email,
      branch,
      year,
      medicalHistory,
      lastDonation: lastDonation ? new Date(lastDonation) : undefined
    };

    const donor = await Donor.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Donor not found'
      });
    }

    res.json({
      success: true,
      message: 'Donor updated successfully',
      donor
    });
  } catch (error) {
    console.error('Update donor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update donor'
    });
  }
});

// Delete donor
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const donor = await Donor.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Donor not found'
      });
    }

    res.json({
      success: true,
      message: 'Donor deleted successfully'
    });
  } catch (error) {
    console.error('Delete donor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete donor'
    });
  }
});

// Record a new donation
router.post('/:id/record-donation', authenticate, authorize('admin'), async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.id);

    if (!donor || !donor.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Donor not found'
      });
    }

    // Check if donor is eligible for donation (3 months = 90 days)
    if (!donor.isEligibleForDonation) {
      return res.status(400).json({
        success: false,
        message: `Donor is not eligible. Must wait ${donor.getDaysUntilEligible()} more days.`
      });
    }

    // Record the donation
    await donor.recordDonation();

    res.json({
      success: true,
      message: 'Donation recorded successfully',
      donor
    });
  } catch (error) {
    console.error('Record donation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record donation'
    });
  }
});

export default router;