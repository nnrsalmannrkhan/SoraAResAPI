/**
 * Authentication Controller Module
 * Handles user registration, login, and profile management
 */

import bcrypt from 'bcrypt';
import { generateToken } from '../middleware/auth.js';
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  deleteUser,
  getAllUsers,
  hashPassword,
  comparePassword,
} from '../models/User.js';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * @desc    Register a new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Create user in database
    const user = await createUser({ username, email, password });

    // Generate JWT token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user and get token
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await findUserByEmail(email);

    if (!user) {
      return next(new ApiError('Invalid credentials', 401));
    }

    // Check if password matches
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return next(new ApiError('Invalid credentials', 401));
    }

    // Generate JWT token
    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged-in user
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);

    if (!user) {
      return next(new ApiError('User not found', 404));
    }

    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/v1/auth/me
 * @access  Private
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const updateData = {};

    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (password) {
      updateData.password = await hashPassword(password);
    }

    const updatedUser = await updateUser(req.user.id, updateData);

    if (!updatedUser) {
      return next(new ApiError('User not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user account
 * @route   DELETE /api/v1/auth/me
 * @access  Private
 */
export const deleteAccount = async (req, res, next) => {
  try {
    const isDeleted = await deleteUser(req.user.id);

    if (!isDeleted) {
      return next(new ApiError('User not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all users (admin only)
 * @route   GET /api/v1/auth/users
 * @access  Private/Admin
 */
export const getAllUsersController = async (req, res, next) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const users = await getAllUsers({
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    res.status(200).json({
      success: true,
      count: users.length,
      data: {
        users,
      },
    });
  } catch (error) {
    next(error);
  }
};