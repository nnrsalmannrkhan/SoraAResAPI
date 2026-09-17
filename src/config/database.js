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

// Handle pool errors
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client in pool', err);
});

// Initialize database connection
let db;

try {
  db = pool;
  console.log(`✅ Database pool created successfully`);
  console.log(`📡 Connection string: ${process.env.DATABASE_URL ? 'from DATABASE_URL' : 'using default localhost'}`);
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
  process.exit(1);
}

/**
 * Initialize database schema
 * Creates tables if they don't exist
 */
export const initializeDatabase = async () => {
  const MAX_RETRIES = 3;
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      // Test connection first
      console.log('Testing database connection...');
      await db.query('SELECT 1');
      console.log('✅ Database connection verified');
      break;
    } catch (connError) {
      retryCount++;
      console.warn(`⚠️ Connection attempt ${retryCount}/${MAX_RETRIES} failed:`, connError.message);
      if (retryCount >= MAX_RETRIES) {
        console.error('❌ Failed to connect to database after retries.');
        console.error('❌ Error:', connError.message);
        console.error('❌ Make sure DATABASE_URL is set correctly and the database is accessible.');
        process.exit(1);
      }
      // Wait 2 seconds before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  try {
    // Users table
    console.log('Creating users table...');
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
    console.log('✅ Users table ready');

    // Projects table
    console.log('Creating projects table...');
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
    console.log('✅ Projects table ready');

    // Create indexes for better performance
    // Indexes may already exist, so we handle potential errors gracefully
    try {
      console.log('Creating indexes...');
      await db.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)`);
      console.log('✅ Indexes created successfully');
    } catch (indexError) {
      // Indexes might already exist or fail for other reasons, but this shouldn't block startup
      console.warn('⚠️ Index creation warning:', indexError.message);
    }

    console.log('✅ Database schema initialized successfully');
  } catch (error) {
    console.error('❌ Database schema initialization failed');
    console.error('❌ Error type:', error.code || 'UNKNOWN');
    console.error('❌ Error message:', error.message);
    console.error('❌ Full error:', error);
    process.exit(1);
  }
};

/**
 * Get database instance
 * @returns {Pool} PostgreSQL connection pool instance
 */
export const getDb = () => db;

/**
 * Close database pool gracefully
 */
export const closePool = async () => {
  try {
    await pool.end();
    console.log('✅ Database pool closed successfully');
  } catch (error) {
    console.error('❌ Error closing database pool:', error.message);
  }
};

export default db;