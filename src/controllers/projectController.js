/**
 * Project Controller Module
 * Handles CRUD operations for projects
 */

import {
  createProject,
  findProjectById,
  findProjectsByUser,
  updateProject,
  deleteProject,
  getProjectStats,
} from '../models/Project.js';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * @desc    Create a new project
 * @route   POST /api/v1/projects
 * @access  Private
 */
export const createNewProject = async (req, res, next) => {
  try {
    const project = await createProject(req.body, req.user.id);

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: {
        project,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all projects for the authenticated user
 * @route   GET /api/v1/projects
 * @access  Private
 */
export const getAllProjects = async (req, res, next) => {
  try {
    const { page, limit, sort, status } = req.query;

    const result = await findProjectsByUser(req.user.id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      sort: sort || 'desc',
      status: status || null,
    });

    res.status(200).json({
      success: true,
      count: result.projects.length,
      pagination: result.pagination,
      data: {
        projects: result.projects,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single project by ID
 * @route   GET /api/v1/projects/:id
 * @access  Private
 */
export const getProject = async (req, res, next) => {
  try {
    const project = await findProjectById(req.params.id, req.user.id);

    if (!project) {
      return next(new ApiError('Project not found', 404));
    }

    res.status(200).json({
      success: true,
      data: {
        project,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a project
 * @route   PUT /api/v1/projects/:id
 * @access  Private
 */
export const updateExistingProject = async (req, res, next) => {
  try {
    const project = await updateProject(req.params.id, req.user.id, req.body);

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: {
        project,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a project
 * @route   DELETE /api/v1/projects/:id
 * @access  Private
 */
export const deleteProjectById = async (req, res, next) => {
  try {
    const isDeleted = await deleteProject(req.params.id, req.user.id);

    if (!isDeleted) {
      return next(new ApiError('Project not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get project statistics
 * @route   GET /api/v1/projects/stats
 * @access  Private
 */
export const getProjectStatistics = async (req, res, next) => {
  try {
    const stats = await getProjectStats(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        stats,
      },
    });
  } catch (error) {
    next(error);
  }
};