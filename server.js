const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

// Express app
const app = express();

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors());

// Logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/cities', require('./routes/cityRoutes'));
app.use('/api/landmarks', require('./routes/landmarkRoutes'));
app.use('/api/rides', require('./routes/rideRoutes'));
app.use('/api/drivers', require('./routes/driverRoutes'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handler middleware
app.use(errorHandler);

// Server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Socket.io setup
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Join a ride room
  socket.on('joinRide', (rideId) => {
    socket.join(`ride_${rideId}`);
    console.log(`User joined ride_${rideId}`);
  });
  
  // Leave a ride room
  socket.on('leaveRide', (rideId) => {
    socket.leave(`ride_${rideId}`);
    console.log(`User left ride_${rideId}`);
  });
  
  // Update driver location
  socket.on('updateDriverLocation', (data) => {
    // data = { rideId, location: { lat, lng } }
    io.to(`ride_${data.rideId}`).emit('driverLocationUpdated', data.location);
  });
  
  // New message in chat
  socket.on('sendMessage', (data) => {
    // data = { rideId, message, sender }
    io.to(`ride_${data.rideId}`).emit('newMessage', data);
  });
  
  // Disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

module.exports = server;
