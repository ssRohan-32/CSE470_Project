/**
 * controllers/AdminController.js
 * NAFAS Module 1
 *
 * Feature 17 — Centralized Transaction Ledger
 */

const LedgerManager = require('../services/LedgerSingleton');

class AdminController {

  /** Feature 17: Show immutable ledger */
  static showLedger(req, res) {
    const page       = parseInt(req.query.page) || 1;
    const limit      = 20;
    const offset     = (page - 1) * limit;
    const typeFilter = req.query.type || null;

    const ledger     = LedgerManager.getInstance();
    const entries    = ledger.getAll({ limit, offset, type: typeFilter });
    const stats      = ledger.getStats();
    const total      = ledger.getTotalCount();
    const totalPages = Math.ceil(total / limit);
    const instanceId = ledger.getInstanceId();

    res.render('admin/ledger', {
      title: 'Transaction Ledger — NAFAS Module 1',
      entries,
      stats,
      total,
      page,
      totalPages,
      typeFilter,
      instanceId,
      user: req.session.user
    });
  }
}

module.exports = AdminController;
