/**
 * Authentication Middleware Module
 * Handles JWT token verification and protected routes
 */

import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler.js';
import { getDb } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Generate JWT token for a user
 * @param {Object} user - User object
 * @returns {string} - JWT token
 */
export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

/**
 * Verify JWT token and attach user to request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return next(new ApiError('You are not logged in. Please log in to get access.', 401));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const db = getDb();
    const result = await db.query('SELECT id, username, email, role FROM users WHERE id = $1', [decoded.id]);
    const user = result.rows[0] || null;

    if (!user) {
      return next(new ApiError('The user belonging to this token no longer exists.', 401));
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new ApiError('Invalid token. Please log in again.', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError('Your token has expired. Please log in again.', 401));
    }
    next(error);
  }
};

/**
 * Restrict access to specific roles
 * @param {...string} roles - Allowed roles
 * @returns {Function} - Express middleware function
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError('Authentication required.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError('You do not have permission to perform this action.', 403));
    }

    next();
  };
};