import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Admin } from '../models/Admin.js';
import { sendOTPEmail } from '../utils/emailService.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// User signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Check if admin exists with this email
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'This email is already registered as admin'
      });
    }

    // Create new user
    const user = new User({ name, email, password });
    const otp = user.generateOTP();
    await user.save();

    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp, name);
    if (!emailSent) {
      await User.findByIdAndDelete(user._id);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email'
      });
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email.',
      userId: user._id
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.verifyOTP(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    user.verified = true;
    user.otp = undefined;
    await user.save();

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

// User login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    let user, userType;

    if (role === 'admin' || role === 'superadmin') {
      // Admin login
      user = await Admin.findOne({ email });
      userType = 'admin';
      
      if (role === 'superadmin' && user?.role !== 'main') {
        return res.status(401).json({
          success: false,
          message: 'Access denied. Super admin credentials required.'
        });
      }
    } else {
      // User login
      user = await User.findOne({ email });
      userType = 'user';
      
      if (user && !user.verified) {
        return res.status(401).json({
          success: false,
          message: 'Please verify your email before logging in'
        });
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      { id: user._id, type: userType },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: userType === 'admin' ? user.role : 'user'
    };

    res.json({
      success: true,
      message: 'Login successful',
      user: userData,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Login with OTP
router.post('/login-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.verifyOTP(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    user.verified = true;
    user.otp = undefined;
    await user.save();

    const token = jwt.sign(
      { id: user._id, type: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: 'user'
    };

    res.json({
      success: true,
      message: 'Login successful',
      user: userData,
      token
    });
  } catch (error) {
    console.error('OTP login error:', error);
    res.status(500).json({
      success: false,
      message: 'OTP login failed'
    });
  }
});

// Send OTP for login
router.post('/send-login-otp', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const otp = user.generateOTP();
    await user.save();

    const emailSent = await sendOTPEmail(email, otp, user.name);
    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email'
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

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const userData = {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.userType === 'admin' ? req.user.role : 'user'
    };

    res.json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user data'
    });
  }
});

// List users (admin only)
router.get('/', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const search = (req.query.search || '').toString().trim();
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    // Get both regular users and admin users
    const [regularUsers, adminUsers] = await Promise.all([
      User.find(query)
        .select('name email verified createdAt')
        .sort({ createdAt: -1 }),
      Admin.find(query)
        .select('name email role createdAt')
        .sort({ createdAt: -1 })
    ]);

    // Combine and format all users with type indicator
    const allUsers = [
      ...regularUsers.map(user => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        verified: user.verified,
        createdAt: user.createdAt,
        type: 'user',
        role: 'user'
      })),
      ...adminUsers.map(admin => ({
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        verified: true, // Admins are always considered verified
        createdAt: admin.createdAt,
        type: 'admin',
        role: admin.role
      }))
    ];

    // Sort combined list by creation date
    allUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply pagination to combined results
    const total = allUsers.length;
    const items = allUsers.slice(skip, skip + limit);

    res.json({
      success: true,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      results: items,
      users: items // Also provide 'users' key for compatibility with SuperAdminDashboard
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Promote user to admin (Super Admin only)
router.post('/promote/:id', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    // Double-check that only super admins can access this
    if (req.userType !== 'admin' || req.user.role !== 'main') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Super admin privileges required.'
      });
    }

    const { id } = req.params;
    const { role = 'normal', password } = req.body;

    // Find the user to promote
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.verified) {
      return res.status(400).json({
        success: false,
        message: 'Cannot promote unverified user'
      });
    }

    // Check if admin with this email already exists
    const existingAdmin = await Admin.findOne({ email: user.email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'User is already an admin'
      });
    }

    // Validate role
    if (!['user', 'normal', 'main'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    // Use provided password or generate a default one
    const adminPassword = password || 'admin123';

    // Create admin account
    const newAdmin = new Admin({
      name: user.name,
      email: user.email,
      password: adminPassword,
      role: role
    });

    await newAdmin.save();

    // Optionally, you might want to keep the original user or remove it
    // For now, we'll keep both accounts

    res.json({
      success: true,
      message: `User promoted to ${role} successfully`,
      admin: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
        createdAt: newAdmin.createdAt
      }
    });
  } catch (error) {
    console.error('Promote user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to promote user'
    });
  }
});

export default router;