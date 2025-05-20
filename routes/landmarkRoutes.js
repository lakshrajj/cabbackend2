const express = require('express');
const {
  getLandmarks,
  getLandmark,
  createLandmark,
  updateLandmark,
  deleteLandmark,
  getNearbyLandmarks
} = require('../controllers/landmarkController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');
const Landmark = require('../models/landmarkModel');

// Public routes
router
  .route('/')
  .get(advancedResults(Landmark, 'city'), getLandmarks);

router
  .route('/near')
  .get(getNearbyLandmarks);

router
  .route('/:id')
  .get(getLandmark);

// Protected routes
router.use(protect);

// Admin only routes
router
  .route('/')
  .post(authorize('admin'), createLandmark);

router
  .route('/:id')
  .put(authorize('admin'), updateLandmark)
  .delete(authorize('admin'), deleteLandmark);

module.exports = router;
