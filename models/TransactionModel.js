/**
 * models/TransactionModel.js
 * Handles all purchase transactions
 * Used by: Feature 3 (Consumption Analytics), Feature 6 (Payment Gateway)
 */

const { getDb } = require('../config/database');

class TransactionModel {
  static create({ customer_id, pump_id, fuel_type, quantity, unit_price, total_amount, tax_amount, discount_amount, payment_method, pricing_strategy }) {
    const result = getDb().prepare(`
      INSERT INTO transactions
        (customer_id, pump_id, fuel_type, quantity, unit_price, total_amount, tax_amount, discount_amount, payment_method, pricing_strategy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(customer_id, pump_id, fuel_type, quantity, unit_price, total_amount, tax_amount || 0, discount_amount || 0, payment_method, pricing_strategy || 'Standard');
    return result.lastInsertRowid;
  }

  static getByCustomer(customerId) {
    return getDb().prepare(`
      SELECT t.*, p.name as pump_name, p.location
      FROM transactions t
      JOIN pumps p ON t.pump_id = p.id
      WHERE t.customer_id = ?
      ORDER BY t.created_at DESC
    `).all(customerId);
  }

  static getConsumptionByMonth(customerId) {
    return getDb().prepare(`
      SELECT strftime('%Y-%m', created_at) as month,
             fuel_type,
             SUM(quantity) as total_quantity,
             SUM(total_amount) as total_spent,
             COUNT(*) as transaction_count
      FROM transactions
      WHERE customer_id = ?
      GROUP BY month, fuel_type
      ORDER BY month DESC
      LIMIT 24
    `).all(customerId);
  }

  static getSpendingTrend(customerId, days = 30) {
    return getDb().prepare(`
      SELECT DATE(created_at) as date,
             SUM(total_amount) as daily_spent,
             SUM(quantity) as daily_qty
      FROM transactions
      WHERE customer_id = ?
        AND created_at >= DATE('now', '-' || ? || ' days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all(customerId, days);
  }

  static getAllRecent(limit = 50) {
    return getDb().prepare(`
      SELECT t.*, u.name as customer_name, p.name as pump_name
      FROM transactions t
      JOIN users u ON t.customer_id = u.id
      JOIN pumps p ON t.pump_id = p.id
      ORDER BY t.created_at DESC
      LIMIT ?
    `).all(limit);
  }

  static getSystemStats() {
    return getDb().prepare(`
      SELECT
        COUNT(*) as total_transactions,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as avg_transaction,
        SUM(quantity) as total_fuel_sold
      FROM transactions
    `).get();
  }

  static getRevenueTrend() {
    return getDb().prepare(`
      SELECT strftime('%Y-%m', created_at) as month,
             SUM(total_amount) as revenue,
             COUNT(*) as count
      FROM transactions
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `).all();
  }

  static getFuelBreakdown() {
    return getDb().prepare(`
      SELECT fuel_type, COUNT(*) as count, SUM(quantity) as total_qty, SUM(total_amount) as total_revenue
      FROM transactions
      GROUP BY fuel_type
    `).all();
  }

  static getDemographicsData() {
    return getDb().prepare(`
      SELECT u.car_brand, u.age_range, t.fuel_type,
             COUNT(*) as purchase_count,
             AVG(t.quantity) as avg_quantity,
             SUM(t.total_amount) as total_spent
      FROM transactions t
      JOIN users u ON t.customer_id = u.id
      WHERE u.car_brand IS NOT NULL
      GROUP BY u.car_brand, u.age_range, t.fuel_type
      ORDER BY purchase_count DESC
    `).all();
  }
}

module.exports = TransactionModel;
