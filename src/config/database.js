/**
 * Database Configuration Module
 * Handles PostgreSQL database initialization and connection management
 */

import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;

// Load environment variables
dotenv.config();

// PostgreSQL connection pool
// Uses DATABASE_URL environment variable (standard for PostgreSQL on Render/cloud platforms)
// Fallback to local dev connection if DATABASE_URL is not set
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/nexaapi',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize database connection
let db;

try {
  db = pool;
  console.log(`✅ Database pool created successfully`);
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
  process.exit(1);
}

/**
 * Initialize database schema
 * Creates tables if they don't exist
 */
export const initializeDatabase = async () => {
  try {
    // Users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Projects table
    await db.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        due_date DATE,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)
    `);

    console.log('✅ Database schema initialized successfully');

    // Verify database connection by running a test query
    try {
      await db.query('SELECT 1');
      console.log('✅ Database connection verified');
    } catch (queryError) {
      console.error('❌ Database connection test failed.');
      console.error('❌ Write error:', queryError.message);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Database schema initialization failed:', error.message);
    process.exit(1);
  }
};

/**
 * Get database instance
 * @returns {Database} SQLite database instance
 */
export const getDb = () => db;

export default db;