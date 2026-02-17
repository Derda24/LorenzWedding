/**
 * Vercel serverless function wrapper for LORENZWED Express app
 */
let app;
try {
  app = require('../server');
  console.log('Server module loaded successfully');
} catch (error) {
  console.error('Failed to load server module:', error);
  console.error('Error stack:', error.stack);
  // Export error handler
  module.exports = (req, res) => {
    console.error('Server module failed to load');
    res.status(500).json({ 
      error: 'Server initialization failed',
      message: error.message 
    });
  };
  return;
}

// Export handler function for Vercel
// Vercel expects a function that receives (req, res)
module.exports = (req, res) => {
  try {
    // Log the request for debugging
    console.log('Vercel function called:', req.url);
    console.log('__dirname:', __dirname);
    console.log('process.cwd():', process.cwd());
    
    // Pass request to Express app
    return app(req, res);
  } catch (error) {
    console.error('Error in function handler:', error);
    console.error('Error stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Function execution failed',
        message: error.message 
      });
    }
  }
};
