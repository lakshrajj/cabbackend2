const Ride = require('../models/rideModel');
const User = require('../models/userModel');
const Landmark = require('../models/landmarkModel');
const City = require('../models/cityModel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const locationUtils = require('../utils/locationUtils');
const { v4: uuidv4 } = require('uuid');

// @desc    Get all rides
// @route   GET /api/rides
// @access  Private/Admin
exports.getRides = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single ride
// @route   GET /api/rides/:id
// @access  Private
exports.getRide = asyncHandler(async (req, res, next) => {
  const ride = await Ride.findById(req.params.id)
    .populate({
      path: 'pickupLandmark',
      select: 'name address location'
    })
    .populate({
      path: 'driver',
      select: 'name phone profileImage rating driverDetails'
    })
    .populate({
      path: 'passengers.user',
      select: 'name phone profileImage rating'
    })
    .populate('city', 'name');
  
  if (!ride) {
    return next(new ErrorResponse(`Ride not found with id of ${req.params.id}`, 404));
  }
  
  // Check if user is authorized to view this ride
  const isAuthorized = 
    req.user.role === 'admin' || 
    ride.driver?._id.toString() === req.user.id || 
    ride.passengers.some(p => p.user._id.toString() === req.user.id);
  
  if (!isAuthorized) {
    return next(new ErrorResponse(`Not authorized to access this ride`, 403));
  }
  
  res.status(200).json({
    success: true,
    data: ride
  });
});

// @desc    Create ride (book a cab)
// @route   POST /api/rides
// @access  Private/Passenger
exports.createRide = asyncHandler(async (req, res, next) => {
  // Check if user is a passenger
  if (req.user.role !== 'passenger') {
    return next(new ErrorResponse(`Only passengers can book rides`, 403));
  }
  
  const {
    pickupLandmarkId,
    destination,
    scheduledTime,
    passengerCount = 1
  } = req.body;
  
  // Validate landmark
  const landmark = await Landmark.findById(pickupLandmarkId);
  if (!landmark) {
    return next(new ErrorResponse(`Landmark not found with id of ${pickupLandmarkId}`, 404));
  }
  
  // Validate destination coordinates
  if (!destination || !destination.location || !destination.location.coordinates) {
    return next(new ErrorResponse('Please provide destination coordinates', 400));
  }
  
  // Calculate estimated distance and duration
  const pickupCoords = {
    lat: landmark.location.coordinates[1],
    lng: landmark.location.coordinates[0]
  };
  
  const destCoords = {
    lat: destination.location.coordinates[1],
    lng: destination.location.coordinates[0]
  };
  
  const distance = locationUtils.calculateDistance(pickupCoords, destCoords);
  
  // Estimate duration (assume average speed of 40 km/h)
  const durationInMinutes = Math.round((distance / 40) * 60);
  
  // Calculate fare
  const fareDetails = locationUtils.calculateFare(distance, passengerCount);
  
  // Generate a pool ID (in a real app, this would involve a matching algorithm)
  // For now, we'll create a new pool for each booking
  const poolId = uuidv4();
  
  // Create the ride
  const ride = await Ride.create({
    pickupLandmark: landmark._id,
    destination,
    scheduledTime: new Date(scheduledTime),
    estimatedDistance: distance,
    estimatedDuration: durationInMinutes,
    poolId,
    city: landmark.city,
    passengers: [
      {
        user: req.user.id,
        fare: fareDetails.farePerPassenger
      }
    ],
    fare: {
      baseFare: fareDetails.baseFare,
      distanceFare: fareDetails.distanceFare,
      totalFare: fareDetails.totalFare,
      discount: fareDetails.discount,
      currency: fareDetails.currency
    },
    status: 'pending',
    logs: [
      {
        action: 'ride_created',
        user: req.user.id,
        details: { fareDetails }
      }
    ]
  });
  
  // Find potential matching rides for pooling
  // This is a simplified implementation
  const potentialMatches = await Ride.find({
    _id: { $ne: ride._id },
    status: 'pending',
    poolId: { $ne: ride.poolId },
    scheduledTime: {
      $gte: new Date(new Date(scheduledTime).getTime() - 30 * 60000), // 30 min before
      $lte: new Date(new Date(scheduledTime).getTime() + 30 * 60000)  // 30 min after
    },
    'pickupLandmark': landmark._id,
    'destination.location': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: destination.location.coordinates
        },
        $maxDistance: 3000 // 3 km in meters
      }
    }
  }).limit(3);
  
  // If matches found, update them to the same pool
  if (potentialMatches.length > 0) {
    await Ride.updateMany(
      { _id: { $in: potentialMatches.map(match => match._id) } },
      { 
        poolId: ride.poolId,
        status: 'pooling',
        $push: {
          logs: {
            action: 'ride_pooled',
            user: req.user.id,
            details: { poolId: ride.poolId }
          }
        }
      }
    );
    
    // Update the current ride status to pooling
    ride.status = 'pooling';
    await ride.save();
  }
  
  // Update landmark stats
  await Landmark.findByIdAndUpdate(landmark._id, {
    $inc: { 'stats.pickupCount': 1 }
  });
  
  // Return response with ride details
  const populatedRide = await Ride.findById(ride._id)
    .populate({
      path: 'pickupLandmark',
      select: 'name address location'
    })
    .populate('city', 'name');
  
  res.status(201).json({
    success: true,
    data: populatedRide
  });
});

// @desc    Cancel ride
// @route   PUT /api/rides/:id/cancel
// @access  Private
exports.cancelRide = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;
  
  if (!reason) {
    return next(new ErrorResponse('Please provide a cancellation reason', 400));
  }
  
  const ride = await Ride.findById(req.params.id);
  
  if (!ride) {
    return next(new ErrorResponse(`Ride not found with id of ${req.params.id}`, 404));
  }
  
  // Check if user is authorized to cancel this ride
  const isPassenger = ride.passengers.some(p => p.user.toString() === req.user.id);
  const isDriver = ride.driver && ride.driver.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';
  
  if (!isPassenger && !isDriver && !isAdmin) {
    return next(new ErrorResponse(`Not authorized to cancel this ride`, 403));
  }
  
  // Check if ride can be cancelled
  if (ride.status === 'completed' || ride.status === 'cancelled') {
    return next(new ErrorResponse(`Ride cannot be cancelled in ${ride.status} status`, 400));
  }
  
  // If driver is cancelling, update only their status
  if (isDriver) {
    ride.status = 'pending'; // Reset to pending so another driver can accept
    ride.driver = undefined;
    ride.logs.push({
      action: 'driver_cancelled',
      user: req.user.id,
      details: { reason }
    });
  } else {
    // If passenger or admin is cancelling
    ride.status = 'cancelled';
    ride.cancellationReason = reason;
    ride.logs.push({
      action: 'ride_cancelled',
      user: req.user.id,
      details: { reason }
    });
    
    // If cancelled by passenger, update their status
    if (isPassenger) {
      const passengerIndex = ride.passengers.findIndex(
        p => p.user.toString() === req.user.id
      );
      
      if (passengerIndex !== -1) {
        ride.passengers[passengerIndex].status = 'cancelled';
      }
    }
  }
  
  await ride.save();
  
  res.status(200).json({
    success: true,
    data: ride
  });
});

// @desc    Accept ride (for drivers)
// @route   PUT /api/rides/:id/accept
// @access  Private/Driver
exports.acceptRide = asyncHandler(async (req, res, next) => {
  // Check if user is a driver
  if (req.user.role !== 'driver') {
    return next(new ErrorResponse(`Only drivers can accept rides`, 403));
  }
  
  // Check if driver is verified
  const driver = await User.findById(req.user.id);
  if (!driver.driverDetails.isVerified) {
    return next(new ErrorResponse(`Driver account is not verified`, 403));
  }
  
  const ride = await Ride.findById(req.params.id);
  
  if (!ride) {
    return next(new ErrorResponse(`Ride not found with id of ${req.params.id}`, 404));
  }
  
  // Check if ride can be accepted
  if (ride.status !== 'pending' && ride.status !== 'pooling') {
    return next(new ErrorResponse(`Ride cannot be accepted in ${ride.status} status`, 400));
  }
  
  // Check if driver is already assigned to another ride
  const activeRides = await Ride.countDocuments({
    driver: req.user.id,
    status: { $in: ['assigned', 'started'] }
  });
  
  if (activeRides > 0) {
    return next(new ErrorResponse(`Driver already has an active ride`, 400));
  }
  
  // Assign driver to ride
  ride.driver = req.user.id;
  ride.status = 'assigned';
  ride.logs.push({
    action: 'driver_assigned',
    user: req.user.id
  });
  
  // Check if this is a pooled ride, assign same driver to all rides in pool
  if (ride.poolId) {
    await Ride.updateMany(
      { 
        poolId: ride.poolId, 
        _id: { $ne: ride._id },
        status: 'pooling'
      },
      { 
        driver: req.user.id,
        status: 'assigned',
        $push: {
          logs: {
            action: 'driver_assigned',
            user: req.user.id
          }
        }
      }
    );
  }
  
  await ride.save();
  
  // Return response with ride details
  const populatedRide = await Ride.findById(ride._id)
    .populate({
      path: 'pickupLandmark',
      select: 'name address location'
    })
    .populate({
      path: 'passengers.user',
      select: 'name phone profileImage rating'
    })
    .populate('city', 'name');
  
  res.status(200).json({
    success: true,
    data: populatedRide
  });
});

// @desc    Start ride
// @route   PUT /api/rides/:id/start
// @access  Private/Driver
exports.startRide = asyncHandler(async (req, res, next) => {
  const ride = await Ride.findById(req.params.id);
  
  if (!ride) {
    return next(new ErrorResponse(`Ride not found with id of ${req.params.id}`, 404));
  }
  
  // Check if user is the assigned driver
  if (!ride.driver || ride.driver.toString() !== req.user.id) {
    return next(new ErrorResponse(`Not authorized to start this ride`, 403));
  }
  
  // Check if ride can be started
  if (ride.status !== 'assigned') {
    return next(new ErrorResponse(`Ride cannot be started in ${ride.status} status`, 400));
  }
  
  // Update ride status
  ride.status = 'started';
  ride.startedAt = Date.now();
  ride.logs.push({
    action: 'ride_started',
    user: req.user.id
  });
  
  await ride.save();
  
  res.status(200).json({
    success: true,
    data: ride
  });
});

// @desc    Complete ride
// @route   PUT /api/rides/:id/complete
// @access  Private/Driver
exports.completeRide = asyncHandler(async (req, res, next) => {
  const ride = await Ride.findById(req.params.id);
  
  if (!ride) {
    return next(new ErrorResponse(`Ride not found with id of ${req.params.id}`, 404));
  }
  
  // Check if user is the assigned driver
  if (!ride.driver || ride.driver.toString() !== req.user.id) {
    return next(new ErrorResponse(`Not authorized to complete this ride`, 403));
  }
  
  // Check if ride can be completed
  if (ride.status !== 'started') {
    return next(new ErrorResponse(`Ride cannot be completed in ${ride.status} status`, 400));
  }
  
  // Update ride status
  ride.status = 'completed';
  ride.completedAt = Date.now();
  
  // Update passenger statuses
  ride.passengers.forEach(passenger => {
    if (passenger.status === 'confirmed') {
      passenger.status = 'completed';
      passenger.dropoffTime = Date.now();
    }
  });
  
  ride.logs.push({
    action: 'ride_completed',
    user: req.user.id
  });
  
  await ride.save();
  
  // Update driver stats
  await User.findByIdAndUpdate(req.user.id, {
    $inc: {
      'stats.ridesCompleted': 1,
      'stats.totalDistance': ride.estimatedDistance,
      'stats.totalEarnings': ride.fare.totalFare
    }
  });
  
  // Update passenger stats
  for (const passenger of ride.passengers) {
    if (passenger.status === 'completed') {
      await User.findByIdAndUpdate(passenger.user, {
        $inc: {
          'stats.ridesCompleted': 1,
          'stats.totalDistance': ride.estimatedDistance
        }
      });
    }
  }
  
  // Update city stats
  await City.findByIdAndUpdate(ride.city, {
    $inc: {
      'stats.totalRides': 1,
      'stats.totalRevenue': ride.fare.totalFare
    }
  });
  
  res.status(200).json({
    success: true,
    data: ride
  });
});

// @desc    Rate ride
// @route   PUT /api/rides/:id/rate
// @access  Private/Passenger
exports.rateRide = asyncHandler(async (req, res, next) => {
  const { rating, comment } = req.body;
  
  if (!rating || rating < 1 || rating > 5) {
    return next(new ErrorResponse('Please provide a valid rating between 1 and 5', 400));
  }
  
  const ride = await Ride.findById(req.params.id);
  
  if (!ride) {
    return next(new ErrorResponse(`Ride not found with id of ${req.params.id}`, 404));
  }
  
  // Check if ride is completed
  if (ride.status !== 'completed') {
    return next(new ErrorResponse(`Cannot rate a ride that is not completed`, 400));
  }
  
  // Check if user is a passenger of this ride
  const passengerIndex = ride.passengers.findIndex(
    p => p.user.toString() === req.user.id && p.status === 'completed'
  );
  
  if (passengerIndex === -1) {
    return next(new ErrorResponse(`Not authorized to rate this ride`, 403));
  }
  
  // Check if user has already rated
  if (ride.passengers[passengerIndex].rating && ride.passengers[passengerIndex].rating.driver) {
    return next(new ErrorResponse(`You have already rated this ride`, 400));
  }
  
  // Add rating
  ride.passengers[passengerIndex].rating = {
    driver: rating,
    comment,
    createdAt: Date.now()
  };
  
  ride.logs.push({
    action: 'ride_rated',
    user: req.user.id,
    details: { rating, comment }
  });
  
  await ride.save();
  
  // Update driver rating
  const driver = await User.findById(ride.driver);
  
  const newRatingCount = driver.rating.count + 1;
  const newRatingAverage = (
    (driver.rating.average * driver.rating.count) + rating
  ) / newRatingCount;
  
  await User.findByIdAndUpdate(ride.driver, {
    'rating.average': newRatingAverage,
    'rating.count': newRatingCount
  });
  
  res.status(200).json({
    success: true,
    data: ride
  });
});

// @desc    Get user's rides
// @route   GET /api/rides/myrides
// @access  Private
exports.getMyRides = asyncHandler(async (req, res, next) => {
  let query = {};
  
  if (req.user.role === 'passenger') {
    query = { 'passengers.user': req.user.id };
  } else if (req.user.role === 'driver') {
    query = { driver: req.user.id };
  }
  
  const rides = await Ride.find(query)
    .populate({
      path: 'pickupLandmark',
      select: 'name address'
    })
    .populate({
      path: 'driver',
      select: 'name phone profileImage rating driverDetails'
    })
    .populate({
      path: 'passengers.user',
      select: 'name phone profileImage rating'
    })
    .sort({ createdAt: -1 });
  
  res.status(200).json({
    success: true,
    count: rides.length,
    data: rides
  });
});

// @desc    Add message to ride chat
// @route   POST /api/rides/:id/messages
// @access  Private
exports.addMessage = asyncHandler(async (req, res, next) => {
  const { text } = req.body;
  
  if (!text) {
    return next(new ErrorResponse('Please provide a message text', 400));
  }
  
  const ride = await Ride.findById(req.params.id);
  
  if (!ride) {
    return next(new ErrorResponse(`Ride not found with id of ${req.params.id}`, 404));
  }
  
  // Check if user is authorized to send message
  const isPassenger = ride.passengers.some(p => p.user.toString() === req.user.id);
  const isDriver = ride.driver && ride.driver.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';
  
  if (!isPassenger && !isDriver && !isAdmin) {
    return next(new ErrorResponse(`Not authorized to send message in this ride`, 403));
  }
  
  // Add message
  ride.messages.push({
    sender: req.user.id,
    text,
    timestamp: Date.now()
  });
  
  await ride.save();
  
  res.status(201).json({
    success: true,
    data: ride.messages[ride.messages.length - 1]
  });
});

// @desc    Update driver location
// @route   PUT /api/rides/:id/location
// @access  Private/Driver
exports.updateDriverLocation = asyncHandler(async (req, res, next) => {
  const { lat, lng } = req.body;
  
  if (!lat || !lng) {
    return next(new ErrorResponse('Please provide latitude and longitude', 400));
  }
  
  const ride = await Ride.findById(req.params.id);
  
  if (!ride) {
    return next(new ErrorResponse(`Ride not found with id of ${req.params.id}`, 404));
  }
  
  // Check if user is the assigned driver
  if (!ride.driver || ride.driver.toString() !== req.user.id) {
    return next(new ErrorResponse(`Not authorized to update location for this ride`, 403));
  }
  
  // Check if ride is in progress
  if (ride.status !== 'assigned' && ride.status !== 'started') {
    return next(new ErrorResponse(`Cannot update location for ${ride.status} ride`, 400));
  }
  
  // Update location
  ride.driverLocation = {
    type: 'Point',
    coordinates: [parseFloat(lng), parseFloat(lat)],
    lastUpdated: Date.now()
  };
  
  await ride.save();
  
  res.status(200).json({
    success: true,
    data: {
      lat,
      lng,
      lastUpdated: ride.driverLocation.lastUpdated
    }
  });
});
