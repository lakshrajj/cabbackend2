const mongoose = require('mongoose');

const RideSchema = new mongoose.Schema({
  pickupLandmark: {
    type: mongoose.Schema.ObjectId,
    ref: 'Landmark',
    required: true
  },
  destination: {
    address: {
      type: String,
      required: [true, 'Please add a destination address']
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
    }
  },
  scheduledTime: {
    type: Date,
    required: [true, 'Please provide a scheduled pickup time']
  },
  estimatedDistance: {
    type: Number, // in kilometers
    required: true
  },
  estimatedDuration: {
    type: Number, // in minutes
    required: true
  },
  poolId: {
    type: String, // Used to group rides together for pooling
    required: true
  },
  passengers: [
    {
      user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
      },
      fare: {
        type: Number,
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'pending'
      },
      pickupTime: {
        type: Date
      },
      dropoffTime: {
        type: Date
      },
      rating: {
        driver: {
          type: Number,
          min: 1,
          max: 5
        },
        comment: {
          type: String
        },
        createdAt: {
          type: Date
        }
      }
    }
  ],
  driver: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  route: {
    type: {
      type: String,
      enum: ['LineString'],
      default: 'LineString'
    },
    coordinates: {
      type: [[Number]] // Array of [longitude, latitude] points
    }
  },
  status: {
    type: String,
    enum: ['pending', 'pooling', 'assigned', 'started', 'completed', 'cancelled'],
    default: 'pending'
  },
  fare: {
    baseFare: {
      type: Number,
      required: true
    },
    distanceFare: {
      type: Number,
      required: true
    },
    totalFare: {
      type: Number,
      required: true
    },
    discount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  cancellationReason: {
    type: String
  },
  logs: [
    {
      action: {
        type: String
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      },
      details: {
        type: mongoose.Schema.Types.Mixed
      }
    }
  ],
  messages: [
    {
      sender: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      },
      text: {
        type: String
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      isRead: {
        type: Boolean,
        default: false
      }
    }
  ],
  driverLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  city: {
    type: mongoose.Schema.ObjectId,
    ref: 'City',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Geospatial indexes
RideSchema.index({ 'destination.location': '2dsphere' });
RideSchema.index({ 'driverLocation': '2dsphere' });

// Indexes for querying
RideSchema.index({ poolId: 1 });
RideSchema.index({ status: 1 });
RideSchema.index({ driver: 1, status: 1 });
RideSchema.index({ scheduledTime: 1 });
RideSchema.index({ 'passengers.user': 1 });

module.exports = mongoose.model('Ride', RideSchema);
