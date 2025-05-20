const mongoose = require('mongoose');

const LandmarkSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a landmark name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  city: {
    type: mongoose.Schema.ObjectId,
    ref: 'City',
    required: true
  },
  address: {
    type: String,
    required: [true, 'Please add an address']
  },
  image: {
    type: String,
    default: 'no-image.jpg'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  operatingHours: {
    open: {
      type: String, // 24-hour format, e.g. "09:00"
      default: "00:00"
    },
    close: {
      type: String, // 24-hour format, e.g. "21:00"
      default: "23:59"
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  allowedVehicleTypes: {
    type: [String],
    enum: ['sedan', 'suv', 'hatchback', 'all'],
    default: ['all']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Landmark stats
  stats: {
    pickupCount: {
      type: Number,
      default: 0
    },
    dropoffCount: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Geospatial index for location
LandmarkSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Landmark', LandmarkSchema);
