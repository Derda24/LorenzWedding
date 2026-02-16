/**
 * Vercel serverless function wrapper for Lorenz Wedding Express app
 */
const app = require('../server');

// Export the Express app as a handler for Vercel
// Vercel will call this handler for all requests routed to this function
module.exports = app;
