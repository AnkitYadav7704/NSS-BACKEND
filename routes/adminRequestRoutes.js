import express from 'express';
import { AdminRequest } from '../models/AdminRequest.js';
import { Admin } from '../models/Admin.js';
import { sendOTPEmail, sendAdminApprovalEmail } from '../utils/emailService.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Send OTP for admin request email verification
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    // Check if already an admin
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'This email is already registered as admin'
      });
    }

    // Check if request already exists
    let adminRequest = await AdminRequest.findOne({ email });
    if (!adminRequest) {
      adminRequest = new AdminRequest({ email });
    }

    const otp = adminRequest.generateOTP();
    await adminRequest.save();

    const emailSent = await sendOTPEmail(email, otp);
    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email'
      });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully'
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
});

// Verify OTP for admin request
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const adminRequest = await AdminRequest.findOne({ email });
    if (!adminRequest) {
      return res.status(404).json({
        success: false,
        message: 'Admin request not found'
      });
    }

    if (!adminRequest.verifyOTP(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    adminRequest.emailVerified = true;
    adminRequest.otp = undefined;
    await adminRequest.save();

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'OTP verification failed'
    });
  }
});

// Submit admin request
router.post('/submit', async (req, res) => {
  try {
    const { email, name, rollNo, branch, year, phone, password } = req.body;

    const adminRequest = await AdminRequest.findOne({ email });
    if (!adminRequest || !adminRequest.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email first'
      });
    }

    // Update request with complete details
    adminRequest.name = name;
    adminRequest.rollNo = rollNo;
    adminRequest.branch = branch;
    adminRequest.year = year;
    adminRequest.phone = phone;
    adminRequest.password = password;
    adminRequest.status = 'pending';
    
    await adminRequest.save();

    res.json({
      success: true,
      message: 'Admin request submitted successfully'
    });
  } catch (error) {
    console.error('Submit request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit request'
    });
  }
});

// Get all admin requests (Super Admin only)
router.get('/', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    // Double-check that only super admins can access this
    if (req.user.role !== 'main') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin privileges required.'
      });
    }

    const requests = await AdminRequest.find({ status: 'pending' })
      .select('-otp')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      requests
    });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin requests'
    });
  }
});

// Approve admin request (Super Admin only)
router.post('/approve/:id', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    // Double-check that only super admins can access this
    if (req.user.role !== 'main') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin privileges required.'
      });
    }

    const { id } = req.params;
    console.log('🔍 Attempting to approve request with ID:', id);

    const adminRequest = await AdminRequest.findById(id);
    console.log('📋 Found admin request:', adminRequest);
    
    if (!adminRequest || adminRequest.status !== 'pending') {
      return res.status(404).json({
        success: false,
        message: 'Admin request not found or already processed'
      });
    }

    // Validate that all required fields are present
    const missingFields = [];
    if (!adminRequest.name) missingFields.push('name');
    if (!adminRequest.password) missingFields.push('password');
    if (!adminRequest.rollNo) missingFields.push('rollNo');
    if (!adminRequest.branch) missingFields.push('branch');
    if (!adminRequest.year) missingFields.push('year');
    if (!adminRequest.phone) missingFields.push('phone');

    if (missingFields.length > 0) {
      console.log('❌ Missing fields:', missingFields);
      console.log('📋 Admin request data:', JSON.stringify(adminRequest, null, 2));
      return res.status(400).json({
        success: false,
        message: `Admin request is incomplete. Missing required information: ${missingFields.join(', ')}`
      });
    }

    // Create new admin - use insertOne to bypass pre-save hooks
    const adminData = {
      name: adminRequest.name,
      email: adminRequest.email,
      password: adminRequest.password, // Already hashed in AdminRequest
      role: 'normal',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await Admin.collection.insertOne(adminData);

    // Update request status
    adminRequest.status = 'approved';
    adminRequest.reviewedBy = req.user._id;
    adminRequest.reviewedAt = new Date();
    await adminRequest.save();

    // Send approval email with login credentials
    await sendAdminApprovalEmail(adminRequest.email, adminRequest.name, true);

    res.json({
      success: true,
      message: 'Admin request approved successfully'
    });
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve request'
    });
  }
});

// Reject admin request (Super Admin only)
router.post('/reject/:id', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    // Double-check that only super admins can access this
    if (req.user.role !== 'main') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin privileges required.'
      });
    }

    const { id } = req.params;
    const { reason } = req.body;

    const adminRequest = await AdminRequest.findById(id);
    if (!adminRequest || adminRequest.status !== 'pending') {
      return res.status(404).json({
        success: false,
        message: 'Admin request not found or already processed'
      });
    }

    // Update request status
    adminRequest.status = 'rejected';
    adminRequest.reviewedBy = req.user._id;
    adminRequest.reviewedAt = new Date();
    await adminRequest.save();

    // Send rejection email with reason
    await sendAdminApprovalEmail(adminRequest.email, adminRequest.name, false, null, reason);

    res.json({
      success: true,
      message: 'Admin request rejected successfully'
    });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject request'
    });
  }
});

export default router;