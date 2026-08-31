/**
 * models/OrderModel.js
 * Handles B2B supply orders between pump owners and refineries
 * Used by: Feature 8 (B2B Order Management), Feature 9 (Inter-Refinery Referral), Feature 11 (Procurement Portal)
 */

const { getDb } = require('../config/database');

class OrderModel {
  static create({ pump_owner_id, refinery_id, fuel_type, quantity, notes }) {
    const unitPrice = 0.85; // wholesale price
    const totalCost = +(quantity * unitPrice).toFixed(2);
    const result = getDb().prepare(`
      INSERT INTO supply_orders (pump_owner_id, refinery_id, fuel_type, quantity, unit_price, total_cost, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(pump_owner_id, refinery_id, fuel_type, quantity, unitPrice, totalCost, notes || null);
    return result.lastInsertRowid;
  }

  static getById(id) {
    return getDb().prepare(`
      SELECT so.*, u.name as pump_owner_name, r.name as refinery_name
      FROM supply_orders so
      JOIN users u ON so.pump_owner_id = u.id
      JOIN refineries r ON so.refinery_id = r.id
      WHERE so.id = ?
    `).get(id);
  }

  static getByRefineryOwner(refineryOwnerId) {
    return getDb().prepare(`
      SELECT so.*, u.name as pump_owner_name, r.name as refinery_name
      FROM supply_orders so
      JOIN users u ON so.pump_owner_id = u.id
      JOIN refineries r ON so.refinery_id = r.id
      WHERE r.owner_id = ?
      ORDER BY so.created_at DESC
    `).all(refineryOwnerId);
  }

  static getByPumpOwner(pumpOwnerId) {
    return getDb().prepare(`
      SELECT so.*, u.name as pump_owner_name, r.name as refinery_name
      FROM supply_orders so
      JOIN users u ON so.pump_owner_id = u.id
      JOIN refineries r ON so.refinery_id = r.id
      WHERE so.pump_owner_id = ?
      ORDER BY so.created_at DESC
    `).all(pumpOwnerId);
  }

  static updateStatus(id, status, notes = null) {
    return getDb().prepare(`
      UPDATE supply_orders SET status = ?, notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, notes, id);
  }

  static referOrder(id, targetRefineryId) {
    return getDb().prepare(`
      UPDATE supply_orders SET status = 'referred', referred_to = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(targetRefineryId, id);
  }

  static getAll() {
    return getDb().prepare(`
      SELECT so.*, u.name as pump_owner_name, r.name as refinery_name
      FROM supply_orders so
      JOIN users u ON so.pump_owner_id = u.id
      JOIN refineries r ON so.refinery_id = r.id
      ORDER BY so.created_at DESC
    `).all();
  }
}

module.exports = OrderModel;
