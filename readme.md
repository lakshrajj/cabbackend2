# CabPool Backend

Backend API for the CabPool ride sharing application built with Node.js, Express, MongoDB and Socket.io.

## Features

- User authentication and authorization with JWT
- Admin portal for managing cities, landmarks, and users
- Passenger app features (booking, tracking, rating)
- Driver app features (accepting rides, updating location)
- Real-time communication with Socket.io

## Setup and Installation

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Docker & Docker Compose (optional)

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/cabpool
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRE=30d
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### Installation

#### Using npm

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run in production mode
npm start
```

#### Using Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# Stop containers
docker-compose down
```

## API Documentation

### Authentication Routes

- POST `/api/auth/register` - Register a new user
- POST `/api/auth/login` - User login
- GET `/api/auth/logout` - User logout
- GET `/api/auth/me` - Get current user
- PUT `/api/auth/updatedetails` - Update user details
- PUT `/api/auth/updatepassword` - Update password
- POST `/api/auth/sendverification` - Send verification code
- POST `/api/auth/verifyphone` - Verify phone number

### User Routes (Admin only)

- GET `/api/users` - Get all users
- GET `/api/users/:id` - Get user by ID
- POST `/api/users` - Create user
- PUT `/api/users/:id` - Update user
- DELETE `/api/users/:id` - Delete user
- GET `/api/users/stats/drivers` - Get driver statistics
- GET `/api/users/stats/passengers` - Get passenger statistics

### City Routes

- GET `/api/cities` - Get all cities
- GET `/api/cities/:id` - Get city by ID
- POST `/api/cities` - Create city (Admin)
- PUT `/api/cities/:id` - Update city (Admin)
- DELETE `/api/cities/:id` - Delete city (Admin)
- GET `/api/cities/:id/stats` - Get city statistics (Admin)
- GET `/api/cities/:id/landmarks` - Get city landmarks

### Landmark Routes

- GET `/api/landmarks` - Get all landmarks
- GET `/api/landmarks/near` - Get nearby landmarks
- GET `/api/landmarks/:id` - Get landmark by ID
- POST `/api/landmarks` - Create landmark (Admin)
- PUT `/api/landmarks/:id` - Update landmark (Admin)
- DELETE `/api/landmarks/:id` - Delete landmark (Admin)

### Ride Routes

- GET `/api/rides` - Get all rides (Admin)
- GET `/api/rides/:id` - Get ride by ID
- POST `/api/rides` - Create ride (Passenger)
- PUT `/api/rides/:id/cancel` - Cancel ride
- PUT `/api/rides/:id/accept` - Accept ride (Driver)
- PUT `/api/rides/:id/start` - Start ride (Driver)
- PUT `/api/rides/:id/complete` - Complete ride (Driver)
- PUT `/api/rides/:id/rate` - Rate ride (Passenger)
- GET `/api/rides/myrides` - Get user's rides
- POST `/api/rides/:id/messages` - Add message to ride chat
- PUT `/api/rides/:id/location` - Update driver location (Driver)

### Driver Routes

- GET `/api/drivers/:id` - Get driver details
- PUT `/api/drivers/me` - Update driver details (Driver)
- PUT `/api/drivers/availability` - Set driver availability (Driver)
- POST `/api/drivers/verify` - Submit driver verification (Driver)
- PUT `/api/drivers/:id/approve` - Approve driver (Admin)
- GET `/api/drivers` - Get all drivers (Admin)
- GET `/api/drivers/nearby` - Get nearby drivers

## Real-time Events (Socket.io)

- `joinRide` - Join a ride room
- `leaveRide` - Leave a ride room
- `updateDriverLocation` - Update driver location
- `driverLocationUpdated` - Driver location updated event
- `sendMessage` - Send message in ride chat
- `newMessage` - New message event

## Project Structure

```
cabpool-backend/
├── config/
│   └── db.js
├── controllers/
│   ├── authController.js
│   ├── cityController.js
│   ├── driverController.js
│   ├── landmarkController.js
│   ├── rideController.js
│   └── userController.js
├── middleware/
│   ├── advancedResults.js
│   ├── async.js
│   ├── auth.js
│   └── errorHandler.js
├── models/
│   ├── cityModel.js
│   ├── landmarkModel.js
│   ├── rideModel.js
│   └── userModel.js
├── routes/
│   ├── authRoutes.js
│   ├── cityRoutes.js
│   ├── driverRoutes.js
│   ├── landmarkRoutes.js
│   ├── rideRoutes.js
│   └── userRoutes.js
├── utils/
│   ├── errorResponse.js
│   └── locationUtils.js
├── .env
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── package.json
├── README.md
└── server.js
```
