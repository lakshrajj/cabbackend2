const City = require('../models/cityModel');
const Landmark = require('../models/landmarkModel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get all cities
// @route   GET /api/cities
// @access  Public
exports.getCities = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single city
// @route   GET /api/cities/:id
// @access  Public
exports.getCity = asyncHandler(async (req, res, next) => {
  const city = await City.findById(req.params.id);
  
  if (!city) {
    return next(new ErrorResponse(`City not found with id of ${req.params.id}`, 404));
  }
  
  res.status(200).json({
    success: true,
    data: city
  });
});

// @desc    Create city
// @route   POST /api/cities
// @access  Private/Admin
exports.createCity = asyncHandler(async (req, res, next) => {
  const city = await City.create(req.body);
  
  res.status(201).json({
    success: true,
    data: city
  });
});

// @desc    Update city
// @route   PUT /api/cities/:id
// @access  Private/Admin
exports.updateCity = asyncHandler(async (req, res, next) => {
  const city = await City.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  
  if (!city) {
    return next(new ErrorResponse(`City not found with id of ${req.params.id}`, 404));
  }
  
  res.status(200).json({
    success: true,
    data: city
  });
});

// @desc    Delete city
// @route   DELETE /api/cities/:id
// @access  Private/Admin
exports.deleteCity = asyncHandler(async (req, res, next) => {
  const city = await City.findById(req.params.id);
  
  if (!city) {
    return next(new ErrorResponse(`City not found with id of ${req.params.id}`, 404));
  }
  
  // Check if city has landmarks
  const landmarks = await Landmark.find({ city: req.params.id });
  
  if (landmarks.length > 0) {
    return next(new ErrorResponse(`Cannot delete city with existing landmarks`, 400));
  }
  
  await city.deleteOne();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get city statistics
// @route   GET /api/cities/:id/stats
// @access  Private/Admin
exports.getCityStats = asyncHandler(async (req, res, next) => {
  const city = await City.findById(req.params.id);
  
  if (!city) {
    return next(new ErrorResponse(`City not found with id of ${req.params.id}`, 404));
  }
  
  res.status(200).json({
    success: true,
    data: city.stats
  });
});

// @desc    Get city landmarks
// @route   GET /api/cities/:id/landmarks
// @access  Public
exports.getCityLandmarks = asyncHandler(async (req, res, next) => {
  const landmarks = await Landmark.find({ city: req.params.id });
  
  res.status(200).json({
    success: true,
    count: landmarks.length,
    data: landmarks
  });
});
