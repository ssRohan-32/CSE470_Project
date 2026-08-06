/**
 * controllers/PumpController.js
 * NAFAS Module 1
 *
 * Feature 13 — Maintenance Mode: toggle station status on/off
 */

const LedgerManager = require('../services/LedgerSingleton');
const { getDb }     = require('../config/database');

class PumpController {

  static getPumps(ownerId) {
    return getDb().prepare('SELECT * FROM pumps WHERE owner_id = ?').all(ownerId);
  }

  /** Pump dashboard — landing page */
  static showDashboard(req, res) {
    const pumps = PumpController.getPumps(req.session.user.id);
    res.render('pump/dashboard', {
      title: 'Pump Dashboard — NAFAS Module 1',
      pumps,
      user: req.session.user
    });
  }

  /** Feature 13: Show uptime/status control */
  static showUptime(req, res) {
    const pumps = PumpController.getPumps(req.session.user.id);
    res.render('pump/uptime', {
      title: 'Maintenance Mode — NAFAS Module 1',
      pumps,
      user: req.session.user
    });
  }

  /** Feature 13: Toggle Maintenance Mode */
  static toggleStatus(req, res) {
    const { pumpId, status } = req.body;
    const pump = getDb()
      .prepare('SELECT * FROM pumps WHERE id = ? AND owner_id = ?')
      .get(parseInt(pumpId), req.session.user.id);

    if (!pump) {
      req.flash('error', 'Pump not found.');
      return res.redirect('/pump/uptime');
    }

    getDb()
      .prepare('UPDATE pumps SET status = ? WHERE id = ?')
      .run(status, parseInt(pumpId));

    // Log to Singleton Ledger (Feature 17)
    LedgerManager.getInstance().log({
      transaction_type: 'maintenance_toggle',
      reference_id: parseInt(pumpId),
      amount: 0,
      description: `Pump "${pump.name}" status changed to ${status}`,
      actor_id: req.session.user.id
    });

    req.flash('success', `"${pump.name}" is now set to ${status}. Routing updated automatically.`);
    res.redirect('/pump/uptime');
  }
}

module.exports = PumpController;
