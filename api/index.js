/**
 * Vercel serverless function wrapper for Lorenz Wedding Express app
 */
const app = require('../server');

// Export handler function for Vercel
// Vercel expects a function that receives (req, res)
module.exports = (req, res) => {
  // Log the request for debugging
  console.log('Vercel function called:', req.url);
  console.log('__dirname:', __dirname);
  console.log('process.cwd():', process.cwd());
  
  // Pass request to Express app
  return app(req, res);
};
