/**
 * Main Server Entry Point
 * Initializes and configures the Express application
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import morgan from 'morgan';
import crypto from 'crypto';
import { helmetConfig, corsConfig, rateLimiter } from './src/middleware/security.js';
import { errorHandler, notFound } from './src/middleware/errorHandler.js';
import { initializeDatabase } from './src/config/database.js';
import authRoutes from './src/routes/authRoutes.js';
import projectRoutes from './src/routes/projectRoutes.js';

// Load environment variables
dotenv.config();

// Validate critical environment variables
// JWT_SECRET is required for JWT token signing — if missing, generate a
// temporary one so the server can still start (with a warning)
const JWT_SECRET_DEFAULT = 'your_super_secret_jwt_key_change_in_production_1234567890';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === JWT_SECRET_DEFAULT) {
  console.warn('⚠️  WARNING: JWT_SECRET is not set or using default value!');
  console.warn('⚠️  Using a temporary random JWT_SECRET for this session.');
  console.warn('⚠️  Set JWT_SECRET in your environment variables for production.');
  console.warn('⚠️  Tokens will be invalid after server restart until JWT_SECRET is set.');
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
}

// Initialize database and start server
let app;
(async () => {
  try {
    await initializeDatabase();

    // Create Express application
    app = express();

    // ES module __dirname equivalent
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // Middleware
    app.use(helmetConfig);
    app.use(corsConfig);
    app.use(express.json({ limit: '10kb' }));
    app.use(express.urlencoded({ extended: true, limit: '10kb' }));
    app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
    app.use(rateLimiter);

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // API Routes
    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/projects', projectRoutes);

    // Serve static files from public directory
    // setHeaders ensures correct MIME types for CSS (text/css) and other assets
    app.use(express.static(path.join(__dirname, 'public'), {
      setHeaders: (res, filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.css') {
          res.setHeader('Content-Type', 'text/css');
        } else if (ext === '.js') {
          res.setHeader('Content-Type', 'application/javascript');
        }
        },
      maxAge: 0,
    }));

    // SPA fallback - serve index.html for all non-API GET requests
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // 404 handler for unmatched routes
    app.use(notFound);

    // Global error handling middleware
    app.use(errorHandler);

    // Start server
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      console.log(`🚀 API Documentation: http://localhost:${PORT}/api/v1`);
      console.log(`💚 Health Check: http://localhost:${PORT}/health`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err, promise) => {
      console.error('❌ Unhandled Rejection:', err.message);
      server.close(() => {
        process.exit(1);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error('❌ Uncaught Exception:', err.message);
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ Failed to initialize application:', error.message);
    process.exit(1);
  }
})();

export default app;