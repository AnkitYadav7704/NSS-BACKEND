import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Admin } from '../models/Admin.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    let user = null;
    if (decoded.type === 'user') {
      user = await User.findById(decoded.id).select('-password');
    } else if (decoded.type === 'admin') {
      user = await Admin.findById(decoded.id).select('-password');
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid.'
      });
    }

    req.user = user;
    req.userType = decoded.type;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token is not valid.'
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    // Allow access if user role is included in allowed roles
    if (req.userType === 'user') {
      if (!roles.includes('user')) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }
      return next();
    }

    // Handle admin authorization
    if (req.userType === 'admin') {
      // Super admin (role: 'main') has access to everything
      if (req.user.role === 'main') {
        return next();
      }

      // Check if admin role is allowed
      if (!roles.includes('admin')) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }

      // Check for super admin specific routes
      if (roles.includes('superadmin') && req.user.role !== 'main') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Super admin privileges required.'
        });
      }

      return next();
    }

    // If we get here, something went wrong
    return res.status(403).json({
      success: false,
      message: 'Access denied. Invalid user type.'
    });
  };
};