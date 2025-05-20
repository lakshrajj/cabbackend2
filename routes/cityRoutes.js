const express = require('express');
const {
  getCities,
  getCity,
  createCity,
  updateCity,
  deleteCity,
  getCityStats,
  getCityLandmarks
} = require('../controllers/cityController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');
const City = require('../models/cityModel');

// Public routes
router
  .route('/')
  .get(advancedResults(City), getCities);

router
  .route('/:id')
  .get(getCity);

router
  .route('/:id/landmarks')
  .get(getCityLandmarks);

// Protected routes
router.use(protect);

// Admin only routes
router
  .route('/')
  .post(authorize('admin'), createCity);

router
  .route('/:id')
  .put(authorize('admin'), updateCity)
  .delete(authorize('admin'), deleteCity);

router
  .route('/:id/stats')
  .get(authorize('admin'), getCityStats);

module.exports = router;
