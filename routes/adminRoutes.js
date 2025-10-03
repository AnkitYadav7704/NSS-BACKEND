import express from 'express';
import { Admin } from '../models/Admin.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all admins (Super Admin only)
router.get('/', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    // Double-check that only super admins can access this
    if (req.user.role !== 'main') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin privileges required.'
      });
    }

    const admins = await Admin.find({ role: 'normal' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      admins
    });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admins'
    });
  }
});

// Remove admin (Super Admin only)
router.delete('/:id', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    // Double-check that only super admins can access this
    if (req.user.role !== 'main') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin privileges required.'
      });
    }

    const { id } = req.params;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    if (admin.role === 'main') {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove super admin'
      });
    }

    await Admin.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Admin removed successfully'
    });
  } catch (error) {
    console.error('Remove admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove admin'
    });
  }
});

// Get dashboard statistics (accessible to all authenticated users)
router.get('/stats', authenticate, async (req, res) => {
  try {
    const { Donor } = await import('../models/Donor.js');
    const { Notice } = await import('../models/Notice.js');
    const { Form } = await import('../models/Form.js');
    const { User } = await import('../models/User.js');

    // Get counts for all entities
    const [donorsCount, noticesCount, formsCount, usersCount] = await Promise.all([
      Donor.countDocuments({ isActive: { $ne: false } }),
      Notice.countDocuments({ isActive: { $ne: false } }),
      Form.countDocuments({ isActive: { $ne: false } }),
      User.countDocuments({ verified: true })
    ]);

    res.json({
      success: true,
      stats: {
        totalDonors: donorsCount,
        totalNotices: noticesCount,
        totalForms: formsCount,
        totalUsers: usersCount
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
});

export default router;