const User = require('../models/userModel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get driver details
// @route   GET /api/drivers/:id
// @access  Public
exports.getDriverDetails = asyncHandler(async (req, res, next) => {
  const driver = await User.findById(req.params.id).select(
    'name profileImage rating driverDetails createdAt stats'
  );
  
  if (!driver || driver.role !== 'driver') {
    return next(new ErrorResponse(`Driver not found with id of ${req.params.id}`, 404));
  }
  
  res.status(200).json({
    success: true,
    data: driver
  });
});

// @desc    Update driver details
// @route   PUT /api/drivers/me
// @access  Private/Driver
exports.updateDriverDetails = asyncHandler(async (req, res, next) => {
  // Check if user is a driver
  if (req.user.role !== 'driver') {
    return next(new ErrorResponse(`Only drivers can update driver details`, 403));
  }
  
  const allowedFields = {
    'driverDetails.vehicleNumber': req.body['driverDetails.vehicleNumber'],
    'driverDetails.vehicleModel': req.body['driverDetails.vehicleModel'],
    'driverDetails.vehicleColor': req.body['driverDetails.vehicleColor'],
    'driverDetails.vehicleYear': req.body['driverDetails.vehicleYear'],
    'driverDetails.isAvailable': req.body['driverDetails.isAvailable']
  };
  
  // Filter out undefined fields
  const fieldsToUpdate = Object.entries(allowedFields)
    .filter(([key, value]) => value !== undefined)
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});
  
  const driver = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true
  });
  
  res.status(200).json({
    success: true,
    data: driver
  });
});

// @desc    Set driver availability
// @route   PUT /api/drivers/availability
// @access  Private/Driver
exports.setAvailability = asyncHandler(async (req, res, next) => {
  const { isAvailable } = req.body;
  
  if (isAvailable === undefined) {
    return next(new ErrorResponse('Please provide availability status', 400));
  }
  
  // Check if user is a driver
  if (req.user.role !== 'driver') {
    return next(new ErrorResponse(`Only drivers can update availability`, 403));
  }
  
  const driver = await User.findByIdAndUpdate(
    req.user.id,
    { 'driverDetails.isAvailable': isAvailable },
    {
      new: true,
      runValidators: true
    }
  );
  
  res.status(200).json({
    success: true,
    data: driver
  });
});

// @desc    Submit driver verification
// @route   POST /api/drivers/verify
// @access  Private/Driver
exports.submitVerification = asyncHandler(async (req, res, next) => {
  const {
    licenseNumber,
    licenseExpiry,
    vehicleNumber,
    vehicleModel,
    vehicleColor,
    vehicleYear
  } = req.body;
  
  // Check if all required fields are provided
  if (!licenseNumber || !licenseExpiry || !vehicleNumber || !vehicleModel || !vehicleColor || !vehicleYear) {
    return next(new ErrorResponse('Please provide all required fields', 400));
  }
  
  // Check if user is a driver
  if (req.user.role !== 'driver') {
    return next(new ErrorResponse(`Only drivers can submit verification`, 403));
  }
  
  // In a real app, you would handle document uploads and verification process
  // For now, we'll just update the driver's details
  
  const fieldsToUpdate = {
    'driverDetails.licenseNumber': licenseNumber,
    'driverDetails.licenseExpiry': new Date(licenseExpiry),
    'driverDetails.vehicleNumber': vehicleNumber,
    'driverDetails.vehicleModel': vehicleModel,
    'driverDetails.vehicleColor': vehicleColor,
    'driverDetails.vehicleYear': parseInt(vehicleYear),
    'driverDetails.isVerified': false // Set to false until admin approves
  };
  
  const driver = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true
  });
  
  res.status(200).json({
    success: true,
    data: driver,
    message: 'Verification details submitted successfully. Pending admin approval.'
  });
});

// @desc    Approve driver verification (admin only)
// @route   PUT /api/drivers/:id/approve
// @access  Private/Admin
exports.approveDriver = asyncHandler(async (req, res, next) => {
  // Check if user is an admin
  if (req.user.role !== 'admin') {
    return next(new ErrorResponse(`Only admins can approve drivers`, 403));
  }
  
  const driver = await User.findById(req.params.id);
  
  if (!driver || driver.role !== 'driver') {
    return next(new ErrorResponse(`Driver not found with id of ${req.params.id}`, 404));
  }
  
  driver.driverDetails.isVerified = true;
  await driver.save();
  
  res.status(200).json({
    success: true,
    data: driver
  });
});

// @desc    Get all drivers
// @route   GET /api/drivers
// @access  Private/Admin
exports.getAllDrivers = asyncHandler(async (req, res, next) => {
  const drivers = await User.find({ role: 'driver' }).select(
    'name email phone profileImage rating driverDetails createdAt stats'
  );
  
  res.status(200).json({
    success: true,
    count: drivers.length,
    data: drivers
  });
});

// @desc    Get nearby available drivers
// @route   GET /api/drivers/nearby
// @access  Private
// @params  lat, lng, distance (km)
exports.getNearbyDrivers = asyncHandler(async (req, res, next) => {
  const { lat, lng, distance = 5 } = req.query;
  
  // Check if coordinates are provided
  if (!lat || !lng) {
    return next(new ErrorResponse('Please provide latitude and longitude', 400));
  }
  
  // Calculate radius in radians
  const radius = distance / 6371;
  
  const drivers = await User.find({
    role: 'driver',
    'driverDetails.isVerified': true,
    'driverDetails.isAvailable': true,
    location: {
      $geoWithin: {
        $centerSphere: [[parseFloat(lng), parseFloat(lat)], radius]
      }
    }
  }).select('name profileImage rating driverDetails location');
  
  res.status(200).json({
    success: true,
    count: drivers.length,
    data: drivers
  });
});
