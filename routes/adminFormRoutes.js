import express from 'express';
import { Form } from '../models/Form.js';
import { authenticate, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Get all forms for admin
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const forms = await Form.find({ isActive: true })
      .populate('createdBy', 'name')
      .sort({ eventDate: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Form.countDocuments({ isActive: true });

    res.json({
      success: true,
      forms,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get admin forms error:', error);
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

// Create form with optional file uploads
router.post('/', authenticate, authorize('admin'), upload.array('files', 5), async (req, res) => {
  try {
    const { title, description, link, eventDate } = req.body;

    // Validate URL
    try {
      new URL(link);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid URL'
      });
    }

    const formData = {
      title,
      description,
      link,
      eventDate: new Date(eventDate),
      createdBy: req.user._id,
      files: []
    };

    // Add file info if uploaded
    if (req.files && req.files.length > 0) {
      formData.files = req.files.map(file => ({
        filename: file.filename || file.public_id,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        url: file.secure_url || file.url,
        cloudinaryId: file.public_id
      }));
    }

    const form = new Form(formData);
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

// Update form
router.put('/:id', authenticate, authorize('admin'), upload.array('files', 5), async (req, res) => {
  try {
    const { title, description, link, eventDate } = req.body;

    // Validate URL
    try {
      new URL(link);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid URL'
      });
    }

    const updateData = {
      title,
      description,
      link,
      eventDate: new Date(eventDate)
    };

    // Add file info if uploaded
    if (req.files && req.files.length > 0) {
      updateData.files = req.files.map(file => ({
        filename: file.filename || file.public_id,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
        url: file.secure_url || file.url,
        cloudinaryId: file.public_id
      }));
    }

    const form = await Form.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      updateData,
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

// Delete form
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