/**
 * Input Validation Middleware Module
 * Validates incoming request data using Joi schemas
 */

import Joi from 'joi';
import { ApiError } from './errorHandler.js';

/**
 * Validate request data against a Joi schema
 * @param {Object} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 * @returns {Function} - Express middleware function
 */
export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const message = error.details.map(el => el.message).join(', ');
      return next(new ApiError(`Validation error: ${message}`, 400));
    }

    req[property] = value;
    next();
  };
};

/**
 * User Registration Validation Schema
 */
export const registerSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .required()
    .messages({
      'string.empty': 'Username is required',
      'string.min': 'Username must be at least 3 characters',
      'string.max': 'Username cannot exceed 30 characters',
      'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
      'any.required': 'Username is required',
    }),
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required',
    }),
});

/**
 * User Login Validation Schema
 */
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required',
      'any.required': 'Password is required',
    }),
});

/**
 * Project Creation/Update Validation Schema
 */
export const projectSchema = Joi.object({
  title: Joi.string()
    .min(3)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Title is required',
      'string.min': 'Title must be at least 3 characters',
      'string.max': 'Title cannot exceed 200 characters',
      'any.required': 'Title is required',
    }),
  description: Joi.string()
    .max(2000)
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 2000 characters',
    }),
  status: Joi.string()
    .valid('pending', 'in-progress', 'completed', 'cancelled')
    .default('pending')
    .messages({
      'any.only': 'Status must be one of: pending, in-progress, completed, cancelled',
    }),
  priority: Joi.string()
    .valid('low', 'medium', 'high', 'urgent')
    .default('medium')
    .messages({
      'any.only': 'Priority must be one of: low, medium, high, urgent',
    }),
  due_date: Joi.date()
    .greater('now')
    .allow(null)
    .messages({
      'date.greater': 'Due date must be in the future',
    }),
});

/**
 * Project Update Validation Schema (all fields optional)
 */
export const projectUpdateSchema = Joi.object({
  title: Joi.string()
    .min(3)
    .max(200)
    .messages({
      'string.min': 'Title must be at least 3 characters',
      'string.max': 'Title cannot exceed 200 characters',
    }),
  description: Joi.string()
    .max(2000)
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 2000 characters',
    }),
  status: Joi.string()
    .valid('pending', 'in-progress', 'completed', 'cancelled')
    .messages({
      'any.only': 'Status must be one of: pending, in-progress, completed, cancelled',
    }),
  priority: Joi.string()
    .valid('low', 'medium', 'high', 'urgent')
    .messages({
      'any.only': 'Priority must be one of: low, medium, high, urgent',
    }),
  due_date: Joi.date()
    .greater('now')
    .allow(null)
    .messages({
      'date.greater': 'Due date must be in the future',
    }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

/**
 * Pagination Validation Schema
 */
export const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.min': 'Page must be at least 1',
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
    }),
  sort: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .messages({
      'any.only': 'Sort must be either asc or desc',
    }),
  status: Joi.string()
    .valid('pending', 'in-progress', 'completed', 'cancelled')
    .allow(null)
    .messages({
      'any.only': 'Status must be one of: pending, in-progress, completed, cancelled',
    }),
});