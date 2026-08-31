/**
 * controllers/AdminController.js
 * Module 1: Feature 17 — Global Transaction Ledger [Singleton Pattern]
 */

const LedgerManager = require('../services/LedgerSingleton');
const { getDb }      = require('../config/database');

class AdminController {

  /** Feature 17: Global Transaction Ledger */
  static showLedger(req, res) {
    const ledgerInstance = LedgerManager.getInstance();
    const typeFilter     = req.query.type || null;
    const page           = parseInt(req.query.page) || 1;
    const limit          = 25;
    const offset         = (page - 1) * limit;

    const entries    = ledgerInstance.getAll({ limit, offset, type: typeFilter });
    const stats      = ledgerInstance.getStats();
    const total      = ledgerInstance.getTotalCount();
    const totalPages = Math.ceil(total / limit) || 1;
    const instanceId = ledgerInstance.getInstanceId();

    res.render('admin/ledger', {
      title: 'Transaction Ledger — NAFAS',
      entries,
      stats,
      total,
      typeFilter: typeFilter || '',
      page,
      totalPages,
      instanceId,
      user: req.session.user
    });
  }
}

module.exports = AdminController;
