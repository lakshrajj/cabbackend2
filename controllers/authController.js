const User = require('../models/userModel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, phone, password, role } = req.body;
  
  // Create user
  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: role || 'passenger'
  });
  
  sendTokenResponse(user, 201, res);
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  
  // Validate email & password
  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email and password', 400));
  }
  
  // Check for user
  const user = await User.findOne({ email }).select('+password');
  
  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }
  
  // Check if password matches
  const isMatch = await user.matchPassword(password);
  
  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }
  
  sendTokenResponse(user, 200, res);
});

// @desc    Log user out / clear cookie
// @route   GET /api/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  
  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone
  };
  
  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true
  });
  
  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');
  
  // Check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse('Password is incorrect', 401));
  }
  
  user.password = req.body.newPassword;
  await user.save();
  
  sendTokenResponse(user, 200, res);
});

// @desc    Send verification code
// @route   POST /api/auth/sendverification
// @access  Public
exports.sendVerification = asyncHandler(async (req, res, next) => {
  const { phone } = req.body;
  
  // Check if user exists
  const user = await User.findOne({ phone });
  
  if (!user) {
    return next(new ErrorResponse('User not found with this phone number', 404));
  }
  
  // In real app, implement OTP generation and SMS sending here
  // For demo purposes, we'll just return a success message
  
  res.status(200).json({
    success: true,
    message: 'Verification code sent successfully'
  });
});

// @desc    Verify phone
// @route   POST /api/auth/verifyphone
// @access  Public
exports.verifyPhone = asyncHandler(async (req, res, next) => {
  const { phone, code } = req.body;
  
  // Check if user exists
  const user = await User.findOne({ phone });
  
  if (!user) {
    return next(new ErrorResponse('User not found with this phone number', 404));
  }
  
  // In real app, validate OTP here
  // For demo purposes, we'll just update the user
  
  user.isPhoneVerified = true;
  await user.save();
  
  res.status(200).json({
    success: true,
    message: 'Phone verified successfully'
  });
});

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();
  
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isPhoneVerified: user.isPhoneVerified,
      isEmailVerified: user.isEmailVerified,
      profileImage: user.profileImage,
      createdAt: user.createdAt
    }
  });
};
