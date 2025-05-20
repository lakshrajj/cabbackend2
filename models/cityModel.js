const mongoose = require('mongoose');

const CitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a city name'],
    unique: true,
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  state: {
    type: String,
    required: [true, 'Please add a state'],
    trim: true
  },
  country: {
    type: String,
    required: [true, 'Please add a country'],
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  boundary: {
    type: {
      type: String,
      enum: ['Polygon'],
      default: 'Polygon'
    },
    coordinates: {
      type: [[[Number]]], // Array of arrays of coordinates [longitude, latitude]
      required: true
    }
  },
  centerPoint: {
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
  zoom: {
    type: Number,
    default: 12
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // City stats
  stats: {
    totalRides: {
      type: Number,
      default: 0
    },
    totalPassengers: {
      type: Number,
      default: 0
    },
    totalDrivers: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Geospatial index for boundary (polygon) and centerPoint (point)
CitySchema.index({ boundary: '2dsphere' });
CitySchema.index({ centerPoint: '2dsphere' });

// Virtual field for landmarks in this city
CitySchema.virtual('landmarks', {
  ref: 'Landmark',
  localField: '_id',
  foreignField: 'city',
  justOne: false
});

module.exports = mongoose.model('City', CitySchema);
