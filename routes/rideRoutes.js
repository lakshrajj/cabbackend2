const express = require('express');
const {
  getRides,
  getRide,
  createRide,
  cancelRide,
  acceptRide,
  startRide,
  completeRide,
  rateRide,
  getMyRides,
  addMessage,
  updateDriverLocation
} = require('../controllers/rideController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');
const Ride = require('../models/rideModel');

// Protected routes
router.use(protect);

// Routes for all authenticated users
router
  .route('/:id')
  .get(getRide);

router
  .route('/:id/cancel')
  .put(cancelRide);

router
  .route('/:id/messages')
  .post(addMessage);

router
  .route('/myrides')
  .get(getMyRides);

// Passenger specific routes
router
  .route('/')
  .post(authorize('passenger'), createRide);

router
  .route('/:id/rate')
  .put(authorize('passenger'), rateRide);

// Driver specific routes
router
  .route('/:id/accept')
  .put(authorize('driver'), acceptRide);

router
  .route('/:id/start')
  .put(authorize('driver'), startRide);

router
  .route('/:id/complete')
  .put(authorize('driver'), completeRide);

router
  .route('/:id/location')
  .put(authorize('driver'), updateDriverLocation);

// Admin only routes
router
  .route('/')
  .get(authorize('admin'), advancedResults(
    Ride,
    {
      path: 'pickupLandmark driver passengers.user city',
      select: 'name address location driverDetails'
    }
  ), getRides);

module.exports = router;
