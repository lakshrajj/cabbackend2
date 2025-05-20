/**
 * Calculate distance between two coordinates using the Haversine formula
 * @param {Object} coord1 - First coordinate {lat, lng}
 * @param {Object} coord2 - Second coordinate {lat, lng}
 * @returns {Number} - Distance in kilometers
 */
exports.calculateDistance = (coord1, coord2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
};

/**
 * Check if a point is within a city's boundary
 * @param {Object} point - Point coordinate {lat, lng}
 * @param {Array} cityBoundary - Array of boundary coordinates [{lat, lng}, ...]
 * @returns {Boolean} - True if point is within boundary
 */
exports.isPointInBoundary = (point, cityBoundary) => {
  // Implement point-in-polygon algorithm
  // For simplicity, let's use ray casting algorithm
  let inside = false;
  
  for (let i = 0, j = cityBoundary.length - 1; i < cityBoundary.length; j = i++) {
    const xi = cityBoundary[i].lng;
    const yi = cityBoundary[i].lat;
    const xj = cityBoundary[j].lng;
    const yj = cityBoundary[j].lat;
    
    const intersect = ((yi > point.lat) !== (yj > point.lat)) &&
      (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
};

/**
 * Find the nearest landmarks to a point
 * @param {Object} point - Point coordinate {lat, lng}
 * @param {Array} landmarks - Array of landmarks
 * @param {Number} maxDistance - Maximum distance in kilometers
 * @returns {Array} - Array of nearest landmarks with distance
 */
exports.findNearestLandmarks = (point, landmarks, maxDistance = 5) => {
  const nearestLandmarks = landmarks.map(landmark => {
    const distance = this.calculateDistance(point, landmark.location.coordinates);
    return {
      ...landmark._doc,
      distance
    };
  })
  .filter(landmark => landmark.distance <= maxDistance)
  .sort((a, b) => a.distance - b.distance);
  
  return nearestLandmarks;
};

/**
 * Calculate estimated fare for a ride
 * @param {Number} distance - Distance in kilometers
 * @param {Number} passengers - Number of passengers
 * @returns {Object} - Fare details
 */
exports.calculateFare = (distance, passengers) => {
  const baseFare = 50; // Base fare in INR
  const perKmRate = 12; // Rate per km in INR
  const distanceFare = distance * perKmRate;
  const totalFare = baseFare + distanceFare;
  
  // Calculate shared fare with discount
  let sharedFare = totalFare;
  let discount = 0;
  
  if (passengers > 1) {
    // Apply discount based on number of passengers
    // More passengers = higher discount
    discount = Math.min(0.4, 0.1 * (passengers - 1)); // Max 40% discount
    sharedFare = totalFare * (1 - discount);
  }
  
  // Calculate fare per passenger
  const farePerPassenger = sharedFare / passengers;
  
  return {
    baseFare,
    distanceFare,
    totalFare,
    discount: discount * 100, // Convert to percentage
    sharedFare,
    farePerPassenger,
    currency: 'INR'
  };
};
