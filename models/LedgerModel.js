/**
 * models/LedgerModel.js
 * Handles immutable transaction ledger records
 * Used by: Feature 17 (Global Transaction Ledger - Singleton Pattern)
 */

const { getDb } = require('../config/database');

class LedgerModel {
  static addEntry({ transaction_type, reference_id, amount, description, actor_id }) {
    const result = getDb().prepare(`
      INSERT INTO transaction_ledger (transaction_type, reference_id, amount, description, actor_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(transaction_type, reference_id || null, amount, description, actor_id || null);
    return result.lastInsertRowid;
  }

  static getAll({ limit = 100, offset = 0, type = null } = {}) {
    let query = `
      SELECT tl.*, u.name as actor_name
      FROM transaction_ledger tl
      LEFT JOIN users u ON tl.actor_id = u.id
    `;
    const params = [];
    if (type) {
      query += ` WHERE tl.transaction_type = ?`;
      params.push(type);
    }
    query += ` ORDER BY tl.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    return getDb().prepare(query).all(...params);
  }

  static getStats() {
    return getDb().prepare(`
      SELECT
        transaction_type,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM transaction_ledger
      GROUP BY transaction_type
    `).all();
  }

  static getTotalCount() {
    return getDb().prepare('SELECT COUNT(*) as count FROM transaction_ledger').get().count;
  }
}

module.exports = LedgerModel;
