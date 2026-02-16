/**
 * Vercel serverless function wrapper for Lorenz Wedding Express app
 */
const app = require('../server');

// Export the Express app for Vercel
module.exports = app;
