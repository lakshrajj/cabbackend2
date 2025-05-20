const express = require('express');
const {
  getDriverDetails,
  updateDriverDetails,
  setAvailability,
  submitVerification,
  approveDriver,
  getAllDrivers,
  getNearbyDrivers
} = require('../controllers/driverController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Public routes
router
  .route('/:id')
  .get(getDriverDetails);

// Protected routes
router.use(protect);

// Routes for all authenticated users
router
  .route('/nearby')
  .get(getNearbyDrivers);

// Driver specific routes
router
  .route('/me')
  .put(authorize('driver'), updateDriverDetails);

router
  .route('/availability')
  .put(authorize('driver'), setAvailability);

router
  .route('/verify')
  .post(authorize('driver'), submitVerification);

// Admin only routes
router
  .route('/')
  .get(authorize('admin'), getAllDrivers);

router
  .route('/:id/approve')
  .put(authorize('admin'), approveDriver);

module.exports = router;
