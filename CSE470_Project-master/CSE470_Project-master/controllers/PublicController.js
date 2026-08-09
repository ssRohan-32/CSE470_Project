/**
 * controllers/PublicController.js
 * NAFAS Module 1
 *
 * Feature 1 — Route & filter nearby pumps (distance, fuel availability, maintenance)
 * Feature 2 — Real-time fuel inventory with icons
 */

const FuelModel = require('../models/FuelModel');
const RoutingService = require('../services/RoutingService');
const { getDb } = require('../config/database');

class PublicController {

  /** Feature 1: Pump Routing & Filtering */
  static showHome(req, res) {
    const { fuelType, lat, lng, maxDist } = req.query;

    // Show ALL stations — maintenance status is shown as a badge, not hidden
    let pumps = FuelModel.getPumpsWithInventory();

    // Filter by fuel type if selected (match stations that carry this fuel)
    if (fuelType) {
      pumps = pumps.filter(p =>
        p.inventory && p.inventory.some(i => i.fuel_type === fuelType)
      );
    }

    // Sort by distance if coordinates provided (Haversine algorithm)
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng  = parseFloat(lng);
      const dist     = parseFloat(maxDist) || 50;

      pumps = pumps
        .map(p => ({
          ...p,
          distance: RoutingService.haversine(userLat, userLng, p.latitude, p.longitude)
        }))
        .filter(p => p.distance <= dist)
        .sort((a, b) => a.distance - b.distance);
    }

    res.render('public/home', {
      title: 'Find Fuel Stations — NAFAS Module 1',
      pumps,
      fuelType: fuelType || '',
      userLat: lat || '',
      userLng: lng || '',
      userLon: lng || '',
      maxDist: maxDist || '',
      fuelTypes: ['Octane', 'Diesel', 'Petrol', 'EV']
    });
  }

  /** Feature 2: Real-Time Fuel Inventory Dashboard */
  static showInventory(req, res) {
    const inventory = FuelModel.getAllInventory();
    const pumps = getDb().prepare('SELECT * FROM pumps ORDER BY name').all();

    const summary = ['Octane', 'Diesel', 'Petrol', 'EV'].map(type => {
      const items = inventory.filter(i => i.fuel_type === type);
      const totalAvailable = items.reduce((s, i) => s + i.quantity, 0);
      const totalCapacity  = items.reduce((s, i) => s + i.capacity, 0);
      return {
        fuel_type:      type,
        total_available: totalAvailable,
        total_capacity:  totalCapacity,
        avg_fill_pct:    totalCapacity > 0
          ? ((totalAvailable / totalCapacity) * 100).toFixed(1)
          : '0.0',
        avg_price: items.length
          ? (items.reduce((s, i) => s + i.price_per_liter, 0) / items.length).toFixed(2)
          : '0.00',
        pump_count: items.length
      };
    });

    // Group inventory rows by pump for the per-pump table in the view
    const byPump = {};
    for (const row of inventory) {
      if (!byPump[row.pump_id]) {
        byPump[row.pump_id] = {
          pump_name: row.pump_name,
          location: row.location,
          status: row.pump_status,
          fuels: []
        };
      }
      byPump[row.pump_id].fuels.push(row);
    }

    const lowStock = inventory.filter(i => i.pump_status === 'active' && i.quantity < 1500);

    res.render('public/inventory', {
      title: 'Fuel Inventory — NAFAS Module 1',
      inventory,
      pumps,
      stats: summary,
      byPump,
      lowStock
    });
  }

  /** API: live inventory polling for Feature 2 */
  static apiInventory(req, res) {
    const inventory = FuelModel.getAllInventory();
    res.json(inventory);
  }
}

module.exports = PublicController;
