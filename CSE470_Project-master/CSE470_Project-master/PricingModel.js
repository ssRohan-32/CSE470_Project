/**
 * models/PricingModel.js
 * Handles dynamic pricing rules storage
 * Used by: Feature 14 (Dynamic Pricing & Tax Engine - Strategy Pattern)
 */

const { getDb } = require('../config/database');

class PricingModel {
  static getRulesForPump(pumpId) {
    return getDb().prepare(`
      SELECT * FROM pricing_rules WHERE pump_id = ? ORDER BY strategy, fuel_type
    `).all(pumpId);
  }

  static getActiveStrategy(pumpId) {
    return getDb().prepare(`
      SELECT * FROM pricing_rules WHERE pump_id = ? AND is_active = 1 LIMIT 1
    `).get(pumpId);
  }

  static upsertRule({ pump_id, strategy, fuel_type, base_price, multiplier, tax_rate }) {
    const existing = getDb().prepare(`
      SELECT id FROM pricing_rules WHERE pump_id = ? AND strategy = ? AND fuel_type = ?
    `).get(pump_id, strategy, fuel_type);

    if (existing) {
      getDb().prepare(`
        UPDATE pricing_rules SET base_price=?, multiplier=?, tax_rate=? WHERE id=?
      `).run(base_price, multiplier, tax_rate, existing.id);
      return existing.id;
    } else {
      const result = getDb().prepare(`
        INSERT INTO pricing_rules (pump_id, strategy, fuel_type, base_price, multiplier, tax_rate)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(pump_id, strategy, fuel_type, base_price, multiplier, tax_rate);
      return result.lastInsertRowid;
    }
  }

  static setActiveStrategy(pumpId, strategy) {
    const db = getDb();
    db.prepare('UPDATE pricing_rules SET is_active = 0 WHERE pump_id = ?').run(pumpId);
    db.prepare('UPDATE pricing_rules SET is_active = 1 WHERE pump_id = ? AND strategy = ?').run(pumpId, strategy);
  }

  static getPriceForFuel(pumpId, fuelType) {
    return getDb().prepare(`
      SELECT * FROM pricing_rules
      WHERE pump_id = ? AND fuel_type = ? AND is_active = 1
      LIMIT 1
    `).get(pumpId, fuelType);
  }
}

module.exports = PricingModel;
