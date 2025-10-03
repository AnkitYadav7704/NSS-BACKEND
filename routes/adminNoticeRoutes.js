import express from 'express';
import { Notice } from '../models/Notice.js';
import { authenticate, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Get all notices for admin (with pagination)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    console.log('📋 Admin notices request from user:', req.user?.name, 'Type:', req.userType, 'Role:', req.user?.role);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    console.log('🔍 Fetching notices with pagination:', { page, limit, skip });

    const notices = await Notice.find({ isActive: true })
      .populate('author', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notice.countDocuments({ isActive: true });

    res.json({
      success: true,
      notices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get admin notices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notices'
    });
  }
});

// Get single notice
router.get('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const notice = await Notice.findOne({ _id: req.params.id, isActive: true })
      .populate('author', 'name');

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    res.json({
      success: true,
      notice
    });
  } catch (error) {
    console.error('Get notice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notice'
    });
  }
});

// Create notice with optional file upload
router.post('/', authenticate, authorize('admin'), upload.single('file'), async (req, res) => {
  try {
    const { title, content, priority } = req.body;

    const noticeData = {
      title,
      content,
      priority: priority || 'medium',
      author: req.user._id
    };

    // Add file info if uploaded
    if (req.file) {
      noticeData.file = {
        filename: req.file.filename || req.file.public_id,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        url: req.file.secure_url || req.file.url,
        cloudinaryId: req.file.public_id
      };
    }

    const notice = new Notice(noticeData);
    await notice.save();
    await notice.populate('author', 'name');

    res.status(201).json({
      success: true,
      message: 'Notice created successfully',
      notice
    });
  } catch (error) {
    console.error('Create notice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create notice'
    });
  }
});

// Update notice
router.put('/:id', authenticate, authorize('admin'), upload.single('file'), async (req, res) => {
  try {
    const { title, content, priority } = req.body;
    
    const updateData = {
      title,
      content,
      priority: priority || 'medium'
    };

    // Add file info if uploaded
    if (req.file) {
      updateData.file = {
        filename: req.file.filename || req.file.public_id,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        url: req.file.secure_url || req.file.url,
        cloudinaryId: req.file.public_id
      };
    }

    const notice = await Notice.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('author', 'name');

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    res.json({
      success: true,
      message: 'Notice updated successfully',
      notice
    });
  } catch (error) {
    console.error('Update notice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notice'
    });
  }
});

// Delete notice
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    console.log('🗑️ Delete request for notice ID:', req.params.id, 'by user:', req.user?.name);
    
    const notice = await Notice.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!notice) {
      console.log('❌ Notice not found for ID:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    console.log('✅ Notice soft deleted successfully:', notice.title);

    res.json({
      success: true,
      message: 'Notice deleted successfully'
    });
  } catch (error) {
    console.error('Delete notice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notice'
    });
  }
});

export default router;