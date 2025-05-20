const asyncHandler = require('../middleware/async');

// Simple middleware for handling async operations in Express routes
module.exports = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
