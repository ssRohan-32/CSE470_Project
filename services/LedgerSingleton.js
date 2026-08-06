/**
 * services/LedgerSingleton.js
 * SINGLETON PATTERN — Feature 17: Global Transaction Ledger
 *
 * Ensures only ONE instance of the Ledger Manager is active at any time.
 * Prevents race conditions and double-logging of financial transactions.
 */

const LedgerModel = require('../models/LedgerModel');

class LedgerManager {
  constructor() {
    if (LedgerManager._instance) {
      throw new Error('Use LedgerManager.getInstance() — Singleton pattern enforced.');
    }
    this._logs = [];
    this._instanceId = Date.now();
    console.log(`   🔐 LedgerSingleton initialized (instanceId: ${this._instanceId})`);
  }

  /**
   * Returns the single shared instance of LedgerManager.
   * Creates it on first call, reuses on subsequent calls.
   */
  static getInstance() {
    if (!LedgerManager._instance) {
      LedgerManager._instance = new LedgerManager();
    }
    return LedgerManager._instance;
  }

  /**
   * Immutably logs a financial transaction to the ledger.
   * @param {Object} entry - transaction_type, reference_id, amount, description, actor_id
   * @returns {number} The new ledger entry ID
   */
  log(entry) {
    const id = LedgerModel.addEntry(entry);
    this._logs.push({ id, ...entry, timestamp: new Date().toISOString() });
    return id;
  }

  getAll(options = {}) {
    return LedgerModel.getAll(options);
  }

  getStats() {
    return LedgerModel.getStats();
  }

  getTotalCount() {
    return LedgerModel.getTotalCount();
  }

  getInstanceId() {
    return this._instanceId;
  }
}

// Private static property — enforces Singleton
LedgerManager._instance = null;

module.exports = LedgerManager;
