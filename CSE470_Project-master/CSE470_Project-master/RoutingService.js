/**
 * services/RoutingService.js
 * Feature 1: Custom Routing & Filtering Service
 *
 * Calculates distances mathematically (Haversine formula),
 * filters out maintenance-mode pumps, and sorts by fuel availability + distance.
 */

const { getDb } = require('../config/database');

class RoutingService {
  /**
   * Haversine formula — calculate distance between two lat/lon points in km.
   */
  static haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = RoutingService.toRad(lat2 - lat1);
    const dLon = RoutingService.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(RoutingService.toRad(lat1)) *
      Math.cos(RoutingService.toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return +(R * c).toFixed(2);
  }

  static toRad(deg) {
    return deg * (Math.PI / 180);
  }

  /**
   * Core routing algorithm:
   * 1. Fetch all pumps
   * 2. Filter out 'maintenance' status
   * 3. Filter by fuelType if specified
   * 4. Calculate distance from user coordinates
   * 5. Sort: fuel availability DESC, then distance ASC
   */
  static findNearbyPumps({ userLat, userLon, fuelType = null, maxDistance = 50 }) {
    // Default to Dhaka center if no coordinates
    const lat = parseFloat(userLat) || 23.7808;
    const lon = parseFloat(userLon) || 90.4200;

    let query = `
      SELECT p.*, GROUP_CONCAT(fi.fuel_type || ':' || fi.quantity) as fuel_data
      FROM pumps p
      LEFT JOIN fuel_inventory fi ON p.id = fi.pump_id
      WHERE p.status != 'maintenance'
    `;

    if (fuelType) {
      query += ` AND EXISTS (
        SELECT 1 FROM fuel_inventory fi2
        WHERE fi2.pump_id = p.id AND fi2.fuel_type = '${fuelType}' AND fi2.quantity > 100
      )`;
    }

    query += ' GROUP BY p.id';

    const pumps = getDb().prepare(query).all();

    const results = pumps.map(pump => {
      const distance = RoutingService.haversineDistance(lat, lon, pump.latitude || 23.78, pump.longitude || 90.40);
      const fuelMap = {};
      if (pump.fuel_data) {
        pump.fuel_data.split(',').forEach(entry => {
          const [type, qty] = entry.split(':');
          fuelMap[type] = parseFloat(qty);
        });
      }
      const requestedFuelQty = fuelType ? (fuelMap[fuelType] || 0) : Object.values(fuelMap).reduce((s, v) => s + v, 0);

      return {
        ...pump,
        distance,
        fuelMap,
        requestedFuelQty,
        isAvailable: distance <= maxDistance && pump.status === 'active'
      };
    });

    // Filter by max distance
    const filtered = results.filter(p => p.distance <= maxDistance);

    // Sort: fuel availability DESC, then distance ASC
    filtered.sort((a, b) => {
      if (b.requestedFuelQty !== a.requestedFuelQty)
        return b.requestedFuelQty - a.requestedFuelQty;
      return a.distance - b.distance;
    });

    return filtered;
  }
}

module.exports = RoutingService;
