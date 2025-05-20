const User = require('../models/userModel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }
  
  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = asyncHandler(async (req, res, next) => {
  const user = await User.create(req.body);
  
  res.status(201).json({
    success: true,
    data: user
  });
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  
  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }
  
  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }
  
  await user.deleteOne();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get driver statistics
// @route   GET /api/users/stats/drivers
// @access  Private/Admin
exports.getDriverStats = asyncHandler(async (req, res, next) => {
  const results = await User.aggregate([
    { $match: { role: 'driver' } },
    {
      $group: {
        _id: null,
        totalDrivers: { $sum: 1 },
        verifiedDrivers: {
          $sum: { $cond: [{ $eq: ['$driverDetails.isVerified', true] }, 1, 0] }
        },
        availableDrivers: {
          $sum: { $cond: [{ $eq: ['$driverDetails.isAvailable', true] }, 1, 0] }
        },
        averageRating: { $avg: '$rating.average' },
        totalRides: { $sum: '$stats.ridesCompleted' },
        totalEarnings: { $sum: '$stats.totalEarnings' }
      }
    }
  ]);
  
  res.status(200).json({
    success: true,
    data: results[0] || {
      totalDrivers: 0,
      verifiedDrivers: 0,
      availableDrivers: 0,
      averageRating: 0,
      totalRides: 0,
      totalEarnings: 0
    }
  });
});

// @desc    Get passenger statistics
// @route   GET /api/users/stats/passengers
// @access  Private/Admin
exports.getPassengerStats = asyncHandler(async (req, res, next) => {
  const results = await User.aggregate([
    { $match: { role: 'passenger' } },
    {
      $group: {
        _id: null,
        totalPassengers: { $sum: 1 },
        verifiedPassengers: {
          $sum: { $cond: [{ $eq: ['$isPhoneVerified', true] }, 1, 0] }
        },
        averageRating: { $avg: '$rating.average' },
        totalRides: { $sum: '$stats.ridesCompleted' }
      }
    }
  ]);
  
  res.status(200).json({
    success: true,
    data: results[0] || {
      totalPassengers: 0,
      verifiedPassengers: 0,
      averageRating: 0,
      totalRides: 0
    }
  });
});
