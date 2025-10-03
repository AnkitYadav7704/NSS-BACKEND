import express from 'express';
import { Donor } from '../models/Donor.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public donor list (hide medical history from regular users)
router.get('/list', authenticate, async (req, res) => {
  try {
    const donors = await Donor.find({ isActive: true })
      .select('-medicalHistory -__v') // Always hide medical history in public endpoint
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      donors
    });
  } catch (error) {
    console.error('Get donors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch donors'
    });
  }
});


export default router;