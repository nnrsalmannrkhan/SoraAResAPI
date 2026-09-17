/**
 * Project Model Module
 * Handles all database operations related to projects
 */

import { getDb } from '../config/database.js';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * Create a new project
 * @param {Object} projectData - Project data
 * @param {number} userId - User ID creating the project
 * @returns {Object} - Created project object
 */
export const createProject = async (projectData, userId) => {
  const { title, description, status, priority, due_date } = projectData;

  const db = getDb();

  const result = await db.query(`
    INSERT INTO projects (title, description, status, priority, due_date, user_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, title, description, status, priority, due_date, user_id, created_at, updated_at
  `, [
    title,
    description || null,
    status || 'pending',
    priority || 'medium',
    due_date || null,
    userId
  ]);

  return result.rows[0];
};

/**
 * Find project by ID (scoped to user)
 * @param {number} id - Project ID
 * @param {number} userId - User ID
 * @returns {Object|null} - Project object or null
 */
export const findProjectById = async (id, userId) => {
  const db = getDb();
  const result = await db.query(`
    SELECT id, title, description, status, priority, due_date, user_id, created_at, updated_at
    FROM projects WHERE id = $1 AND user_id = $2
  `, [id, userId]);
  return result.rows[0] || null;
};

/**
 * Find all projects for a user with pagination
 * @param {number} userId - User ID
 * @param {Object} options - Query options
 * @returns {Object} - Paginated projects
 */
export const findProjectsByUser = async (userId, options = {}) => {
  const db = getDb();

  const {
    page = 1,
    limit = 10,
    sort = 'desc',
    status = null,
  } = options;

  const offset = (page - 1) * limit;
  const sortOrder = sort === 'asc' ? 'ASC' : 'DESC';

  // Build query based on filters
  let query = `
    SELECT id, title, description, status, priority, due_date, user_id, created_at, updated_at
    FROM projects WHERE user_id = $1
  `;
  const params = [userId];
  let paramCount = 2;

  if (status) {
    query += ` AND status = $${paramCount}`;
    params.push(status);
    paramCount++;
  }

  query += ` ORDER BY created_at ${sortOrder} LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
  params.push(limit, offset);

  const projectsResult = await db.query(query, params);
  const projects = projectsResult.rows;

  // Get total count for pagination
  let countQuery = 'SELECT COUNT(*) as total FROM projects WHERE user_id = $1';
  const countParams = [userId];

  if (status) {
    countQuery += ' AND status = $2';
    countParams.push(status);
  }

  const totalResult = await db.query(countQuery, countParams);
  const total = parseInt(totalResult.rows[0].total, 10);
  const totalPages = Math.ceil(total / limit);

  return {
    projects,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
    },
  };
};

/**
 * Update a project
 * @param {number} id - Project ID
 * @param {number} userId - User ID
 * @param {Object} updateData - Data to update
 * @returns {Object|null} - Updated project object
 */
export const updateProject = async (id, userId, updateData) => {
  const db = getDb();

  const fields = [];
  const values = [];
  let paramCount = 1;

  if (updateData.title !== undefined) {
    fields.push(`title = $${paramCount}`);
    values.push(updateData.title);
    paramCount++;
  }

  if (updateData.description !== undefined) {
    fields.push(`description = $${paramCount}`);
    values.push(updateData.description);
    paramCount++;
  }

  if (updateData.status !== undefined) {
    fields.push(`status = $${paramCount}`);
    values.push(updateData.status);
    paramCount++;
  }

  if (updateData.priority !== undefined) {
    fields.push(`priority = $${paramCount}`);
    values.push(updateData.priority);
    paramCount++;
  }

  if (updateData.due_date !== undefined) {
    fields.push(`due_date = $${paramCount}`);
    values.push(updateData.due_date);
    paramCount++;
  }

  if (fields.length === 0) {
    return findProjectById(id, userId);
  }

  values.push(id, userId);

  const result = await db.query(`
    UPDATE projects SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
  `, values);

  if (result.rowCount === 0) {
    throw new ApiError('Project not found or access denied', 404);
  }

  return findProjectById(id, userId);
};

/**
 * Delete a project
 * @param {number} id - Project ID
 * @param {number} userId - User ID
 * @returns {boolean} - True if deleted
 */
export const deleteProject = async (id, userId) => {
  const db = getDb();
  const result = await db.query('DELETE FROM projects WHERE id = $1 AND user_id = $2', [id, userId]);
  return result.rowCount > 0;
};

/**
 * Get project statistics for a user
 * @param {number} userId - User ID
 * @returns {Object} - Statistics object
 */
export const getProjectStats = async (userId) => {
  const db = getDb();

  const result = await db.query(`
    SELECT
      COUNT(*)::integer as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)::integer as pending,
      SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END)::integer as in_progress,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::integer as completed,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)::integer as cancelled
    FROM projects WHERE user_id = $1
  `, [userId]);

  return result.rows[0];
};