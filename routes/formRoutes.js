import express from 'express';
import { Form } from '../models/Form.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all forms
router.get('/', authenticate, async (req, res) => {
  try {
    const forms = await Form.find({ isActive: true })
      .populate('createdBy', 'name')
      .select('-__v')
      .sort({ eventDate: 1 });

    res.json({
      success: true,
      forms
    });
  } catch (error) {
    console.error('Get forms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch forms'
    });
  }
});

// Get single form
router.get('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const form = await Form.findOne({ _id: req.params.id, isActive: true })
      .populate('createdBy', 'name');

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    res.json({
      success: true,
      form
    });
  } catch (error) {
    console.error('Get form error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch form'
    });
  }
});

// Create form (Admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const form = new Form({
      ...req.body,
      createdBy: req.user._id
    });
    
    await form.save();
    await form.populate('createdBy', 'name');

    res.status(201).json({
      success: true,
      message: 'Form created successfully',
      form
    });
  } catch (error) {
    console.error('Create form error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create form'
    });
  }
});

// Update form (Admin only)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const form = await Form.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name');

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    res.json({
      success: true,
      message: 'Form updated successfully',
      form
    });
  } catch (error) {
    console.error('Update form error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update form'
    });
  }
});

// Delete form (Admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const form = await Form.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      { isActive: false },
      { new: true }
    );

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    res.json({
      success: true,
      message: 'Form deleted successfully'
    });
  } catch (error) {
    console.error('Delete form error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete form'
    });
  }
});

export default router;