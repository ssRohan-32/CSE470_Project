/**
 * models/FuelModel.js
 * Handles fuel inventory data operations
 * Used by: Feature 2 (Live Fuel Inventory Visualizer), Feature 1 (Routing & Filtering)
 */

const { getDb } = require('../config/database');

class FuelModel {
  static getAllInventory() {
    return getDb().prepare(`
      SELECT fi.*, p.name as pump_name, p.location, p.status as pump_status,
             p.latitude, p.longitude, p.trust_score
      FROM fuel_inventory fi
      JOIN pumps p ON fi.pump_id = p.id
      ORDER BY p.name, fi.fuel_type
    `).all();
  }

  static getInventoryByPump(pumpId) {
    return getDb().prepare(`
      SELECT fi.*, p.name as pump_name, p.location, p.status as pump_status
      FROM fuel_inventory fi
      JOIN pumps p ON fi.pump_id = p.id
      WHERE fi.pump_id = ?
    `).all(pumpId);
  }

  static getActivePumpsWithFuel(fuelType = null) {
    let query = `
      SELECT p.*, GROUP_CONCAT(fi.fuel_type) as available_fuels,
             SUM(fi.quantity) as total_fuel
      FROM pumps p
      LEFT JOIN fuel_inventory fi ON p.id = fi.pump_id AND fi.quantity > 0
      WHERE p.status = 'active'
    `;
    if (fuelType) {
      query += ` AND fi.fuel_type = '${fuelType}'`;
    }
    query += ` GROUP BY p.id ORDER BY p.name`;
    return getDb().prepare(query).all();
  }

  static updateQuantity(pumpId, fuelType, newQuantity) {
    return getDb().prepare(`
      UPDATE fuel_inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP
      WHERE pump_id = ? AND fuel_type = ?
    `).run(newQuantity, pumpId, fuelType);
  }

  static getLowStockAlerts(threshold = 1500) {
    return getDb().prepare(`
      SELECT fi.*, p.name as pump_name, p.owner_id
      FROM fuel_inventory fi
      JOIN pumps p ON fi.pump_id = p.id
      WHERE fi.quantity < ? AND p.status = 'active'
    `).all(threshold);
  }

  static getSummaryStats() {
    return getDb().prepare(`
      SELECT fuel_type,
             SUM(quantity) as total_available,
             SUM(capacity) as total_capacity,
             ROUND(AVG(quantity * 100.0 / capacity), 1) as avg_fill_pct
      FROM fuel_inventory fi
      JOIN pumps p ON fi.pump_id = p.id
      WHERE p.status = 'active'
      GROUP BY fuel_type
    `).all();
  }
}

module.exports = FuelModel;
