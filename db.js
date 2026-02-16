/**
 * Database adapter - uses Supabase (PostgreSQL) if configured, otherwise SQLite for local dev
 */
const USE_SUPABASE = !!process.env.SUPABASE_URL;

if (USE_SUPABASE) {
  // Use Supabase for production (Vercel)
  module.exports = require('./db-supabase');
} else {
  // Use SQLite for local development
  module.exports = require('./db-sqlite');
}
