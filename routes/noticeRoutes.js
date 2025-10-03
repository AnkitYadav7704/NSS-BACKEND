import express from 'express';
import { Notice } from '../models/Notice.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all notices
router.get('/', authenticate, async (req, res) => {
  try {
    const notices = await Notice.find({ isActive: true })
      .populate('author', 'name')
      .select('-__v')
      .sort({ priority: -1, createdAt: -1 });

    res.json({
      success: true,
      notices
    });
  } catch (error) {
    console.error('Get notices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notices'
    });
  }
});

// Get single notice
router.get('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id)
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

// Create notice (Admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const notice = new Notice({
      ...req.body,
      author: req.user._id
    });
    
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

// Update notice (Admin only)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const notice = await Notice.findByIdAndUpdate(
      req.params.id,
      req.body,
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

// Delete notice (Admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const notice = await Notice.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

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