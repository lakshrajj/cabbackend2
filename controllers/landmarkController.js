const Landmark = require('../models/landmarkModel');
const City = require('../models/cityModel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const locationUtils = require('../utils/locationUtils');

// @desc    Get all landmarks
// @route   GET /api/landmarks
// @access  Public
exports.getLandmarks = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single landmark
// @route   GET /api/landmarks/:id
// @access  Public
exports.getLandmark = asyncHandler(async (req, res, next) => {
  const landmark = await Landmark.findById(req.params.id).populate('city');
  
  if (!landmark) {
    return next(new ErrorResponse(`Landmark not found with id of ${req.params.id}`, 404));
  }
  
  res.status(200).json({
    success: true,
    data: landmark
  });
});

// @desc    Create landmark
// @route   POST /api/landmarks
// @access  Private/Admin
exports.createLandmark = asyncHandler(async (req, res, next) => {
  // Check if city exists
  const city = await City.findById(req.body.city);
  
  if (!city) {
    return next(new ErrorResponse(`City not found with id of ${req.body.city}`, 404));
  }
  
  const landmark = await Landmark.create(req.body);
  
  res.status(201).json({
    success: true,
    data: landmark
  });
});

// @desc    Update landmark
// @route   PUT /api/landmarks/:id
// @access  Private/Admin
exports.updateLandmark = asyncHandler(async (req, res, next) => {
  let landmark = await Landmark.findById(req.params.id);
  
  if (!landmark) {
    return next(new ErrorResponse(`Landmark not found with id of ${req.params.id}`, 404));
  }
  
  // Check if city is being changed and if it exists
  if (req.body.city && req.body.city !== landmark.city.toString()) {
    const city = await City.findById(req.body.city);
    
    if (!city) {
      return next(new ErrorResponse(`City not found with id of ${req.body.city}`, 404));
    }
  }
  
  landmark = await Landmark.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  
  res.status(200).json({
    success: true,
    data: landmark
  });
});

// @desc    Delete landmark
// @route   DELETE /api/landmarks/:id
// @access  Private/Admin
exports.deleteLandmark = asyncHandler(async (req, res, next) => {
  const landmark = await Landmark.findById(req.params.id);
  
  if (!landmark) {
    return next(new ErrorResponse(`Landmark not found with id of ${req.params.id}`, 404));
  }
  
  await landmark.deleteOne();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get landmarks near a location
// @route   GET /api/landmarks/near
// @access  Public
// @params  lat, lng, distance (km), city
exports.getNearbyLandmarks = asyncHandler(async (req, res, next) => {
  const { lat, lng, distance = 5, city } = req.query;
  
  // Check if coordinates are provided
  if (!lat || !lng) {
    return next(new ErrorResponse('Please provide latitude and longitude', 400));
  }
  
  // Convert distance to radians (divide by Earth's radius ~6371 km)
  const radius = distance / 6371;
  
  let query = {
    location: {
      $geoWithin: {
        $centerSphere: [[parseFloat(lng), parseFloat(lat)], radius]
      }
    },
    isActive: true
  };
  
  // Add city filter if provided
  if (city) {
    query.city = city;
  }
  
  const landmarks = await Landmark.find(query).populate('city', 'name');
  
  // Calculate exact distance for each landmark
  const landmarksWithDistance = landmarks.map(landmark => {
    const distance = locationUtils.calculateDistance(
      { lat: parseFloat(lat), lng: parseFloat(lng) },
      { 
        lat: landmark.location.coordinates[1], 
        lng: landmark.location.coordinates[0] 
      }
    );
    
    return {
      ...landmark._doc,
      distance: parseFloat(distance.toFixed(2))
    };
  });
  
  // Sort by distance
  landmarksWithDistance.sort((a, b) => a.distance - b.distance);
  
  res.status(200).json({
    success: true,
    count: landmarks.length,
    data: landmarksWithDistance
  });
});
