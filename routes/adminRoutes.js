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

    const admins = await Admin.find({})
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

// Create new admin (Super Admin only)
router.post('/', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    // Double-check that only super admins can access this
    if (req.user.role !== 'main') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin privileges required.'
      });
    }

    const { name, email, role = 'normal', password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email already exists'
      });
    }

    // Create admin with provided password
    const newAdmin = new Admin({
      name,
      email,
      password, // Will be hashed by pre-save hook
      role: ['user', 'normal', 'main'].includes(role) ? role : 'normal' // Validate role
    });

    await newAdmin.save();

    // Return admin without password
    const adminResponse = {
      id: newAdmin._id,
      name: newAdmin.name,
      email: newAdmin.email,
      role: newAdmin.role,
      createdAt: newAdmin.createdAt
    };

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin: adminResponse
    });
  } catch (error) {
    console.error('Create admin error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue
    });
    
    // Handle specific error types
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error: ' + messages.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create admin: ' + error.message
    });
  }
});

// Update admin (Super Admin only)
router.put('/:id', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    // Double-check that only super admins can access this
    if (req.user.role !== 'main') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin privileges required.'
      });
    }

    const { id } = req.params;
    const { name, email, role } = req.body;

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Prevent editing super admin by other super admins
    if (admin.role === 'main' && req.user._id.toString() !== id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit other super admins'
      });
    }

    // Prevent demoting the last main admin
    if (admin.role === 'main' && role && role !== 'main') {
      const mainAdminCount = await Admin.countDocuments({ role: 'main' });
      if (mainAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot demote the last super admin. At least one super admin must exist.'
        });
      }
    }

    // Update fields if provided
    if (name) admin.name = name;
    if (email) admin.email = email;
    if (role && (role === 'user' || role === 'normal' || role === 'main')) admin.role = role;

    await admin.save();

    // Return updated admin without password
    const adminResponse = {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      createdAt: admin.createdAt
    };

    res.json({
      success: true,
      message: 'Admin updated successfully',
      admin: adminResponse
    });
  } catch (error) {
    console.error('Update admin error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue
    });
    
    // Handle specific error types
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error: ' + messages.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update admin: ' + error.message
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
      const mainAdminCount = await Admin.countDocuments({ role: 'main' });
      if (mainAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot remove the last super admin. At least one super admin must exist.'
        });
      }
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