/**
 * User Model Module
 * Handles all database operations related to users
 */

import bcrypt from 'bcrypt';
import { getDb } from '../config/database.js';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * Hash password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
export const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare password with hashed password
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} - True if passwords match
 */
export const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Create a new user
 * @param {Object} userData - User data (username, email, password)
 * @returns {Object} - Created user object (without password)
 */
export const createUser = async (userData) => {
  try {
    const { username, email, password } = userData;

    const db = getDb();

    // Check if username already exists
    const existingUsername = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existingUsername.rows.length > 0) {
      throw new ApiError('Username already exists', 409);
    }

    // Check if email already exists
    const existingEmail = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingEmail.rows.length > 0) {
      throw new ApiError('Email already exists', 409);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Insert user and return the created user
    const result = await db.query(`
      INSERT INTO users (username, email, password, role)
      VALUES ($1, $2, $3, 'user')
      RETURNING id, username, email, role
    `, [username, email, hashedPassword]);

    return result.rows[0];
  } catch (error) {
    // If already an ApiError, re-throw as-is (preserves duplicates, validation errors)
    if (error instanceof ApiError) throw error;

    // Log the actual database error (captured by Render/server logs for debugging)
    console.error('❌ Database error during user creation:', error.message);

    // Wrap non-ApiError database exceptions as operational errors
    throw new ApiError(
      `User creation failed: ${error.message || 'Database error'}`,
      500
    );
  }
};

/**
 * Find user by email
 * @param {string} email - User email
 * @returns {Object|null} - User object or null
 */
export const findUserByEmail = async (email) => {
  const db = getDb();
  const result = await db.query(`
    SELECT id, username, email, password, role, created_at, updated_at
    FROM users WHERE email = $1
  `, [email]);
  return result.rows[0] || null;
};

/**
 * Find user by ID
 * @param {number} id - User ID
 * @returns {Object|null} - User object or null
 */
export const findUserById = async (id) => {
  const db = getDb();
  const result = await db.query(`
    SELECT id, username, email, role, created_at, updated_at
    FROM users WHERE id = $1
  `, [id]);
  return result.rows[0] || null;
};

/**
 * Update user profile
 * @param {number} id - User ID
 * @param {Object} updateData - Data to update
 * @returns {Object|null} - Updated user object
 */
export const updateUser = async (id, updateData) => {
  const db = getDb();

  const fields = [];
  const values = [];
  let paramCount = 1;

  if (updateData.username) {
    fields.push(`username = $${paramCount}`);
    values.push(updateData.username);
    paramCount++;
  }

  if (updateData.email) {
    fields.push(`email = $${paramCount}`);
    values.push(updateData.email);
    paramCount++;
  }

  if (updateData.password) {
    fields.push(`password = $${paramCount}`);
    values.push(updateData.password);
    paramCount++;
  }

  if (fields.length === 0) {
    return findUserById(id);
  }

  values.push(id);

  await db.query(`
    UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramCount}
  `, values);

  return findUserById(id);
};

/**
 * Delete user by ID
 * @param {number} id - User ID
 * @returns {boolean} - True if deleted
 */
export const deleteUser = async (id) => {
  const db = getDb();
  const result = await db.query('DELETE FROM users WHERE id = $1', [id]);
  return result.rowCount > 0;
};

/**
 * Get all users (admin only)
 * @param {Object} options - Query options (limit, offset)
 * @returns {Array} - Array of user objects
 */
export const getAllUsers = async (options = {}) => {
  const db = getDb();
  const { limit = 100, offset = 0 } = options;

  const result = await db.query(`
    SELECT id, username, email, role, created_at, updated_at
    FROM users
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset]);

  return result.rows;
};