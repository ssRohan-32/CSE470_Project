/**
 * controllers/PublicController.js
 * Features 1 & 2: Routing Service + Live Fuel Inventory
 */

const RoutingService = require('../services/RoutingService');
const FuelModel = require('../models/FuelModel');

class PublicController {
  /** Feature 1: Custom Routing & Filtering Service */
  static showHome(req, res) {
    const { fuelType, lat, lon, maxDist } = req.query;
    const userLat = parseFloat(lat) || 23.7808;
    const userLon = parseFloat(lon) || 90.4200;

    const pumps = RoutingService.findNearbyPumps({
      userLat, userLon,
      fuelType: fuelType || null,
      maxDistance: parseFloat(maxDist) || 50
    });

    res.render('public/home', {
      title: 'Find Fuel Stations — FuelStation',
      pumps,
      fuelType: fuelType || '',
      userLat,
      userLon,
      maxDist: maxDist || 50,
      fuelTypes: ['Octane', 'Diesel', 'Petrol', 'EV']
    });
  }

  /** Feature 2: Live Fuel Inventory Visualizer */
  static showInventory(req, res) {
    const inventory = FuelModel.getAllInventory();
    const stats = FuelModel.getSummaryStats();
    const lowStock = FuelModel.getLowStockAlerts(1500);

    // Group inventory by pump
    const byPump = {};
    for (const item of inventory) {
      if (!byPump[item.pump_id]) {
        byPump[item.pump_id] = {
          pump_name: item.pump_name,
          location: item.location,
          pump_status: item.pump_status,
          trust_score: item.trust_score,
          fuels: []
        };
      }
      byPump[item.pump_id].fuels.push(item);
    }

    res.render('public/inventory', {
      title: 'Live Fuel Inventory — FuelStation',
      byPump,
      stats,
      lowStock,
      fuelIcons: { Octane: '🔶', Diesel: '⚫', Petrol: '🟢', EV: '⚡' }
    });
  }

  /** API endpoint for real-time polling */
  static apiInventory(req, res) {
    const stats = FuelModel.getSummaryStats();
    const inventory = FuelModel.getAllInventory();
    res.json({ stats, inventory, timestamp: new Date().toISOString() });
  }
}

module.exports = PublicController;
