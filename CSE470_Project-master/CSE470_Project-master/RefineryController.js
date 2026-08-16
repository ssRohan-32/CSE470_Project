/**
 * controllers/RefineryController.js
 * Module 2: Feature 8  — B2B Supply Order Management
 *           Feature 10 — Inter-Refinery Referral Engine
 */

const OrderModel    = require('../models/OrderModel');
const LedgerManager = require('../services/LedgerSingleton');
const { getDb }     = require('../config/database');

class RefineryController {

  static getRefinery(ownerId) {
    return getDb().prepare('SELECT * FROM refineries WHERE owner_id = ?').get(ownerId);
  }

  /** Refinery Dashboard */
  static showDashboard(req, res) {
    const refinery    = RefineryController.getRefinery(req.session.user.id);
    const orders      = refinery ? OrderModel.getByRefineryOwner(req.session.user.id) : [];
    const pendingCount = orders.filter(o => o.status === 'pending').length;

    res.render('refinery/dashboard', {
      title: 'Refinery Dashboard — NAFAS',
      refinery,
      pendingCount,
      recentOrders: orders.slice(0, 5),
      user: req.session.user
    });
  }

  /** Feature 8: B2B Supply Order Management */
  static showOrders(req, res) {
    const refinery = RefineryController.getRefinery(req.session.user.id);
    if (!refinery) {
      req.flash('error', 'No refinery registered under your account.');
      return res.redirect('/');
    }

    const orders       = OrderModel.getByRefineryOwner(req.session.user.id);
    const allRefineries = getDb()
      .prepare('SELECT * FROM refineries WHERE owner_id != ?')
      .all(req.session.user.id);

    const statusCounts = orders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});

    res.render('refinery/orders', {
      title: 'Supply Orders — NAFAS',
      orders, refinery, allRefineries, statusCounts,
      user: req.session.user
    });
  }

  static updateOrderStatus(req, res) {
    const { orderId, status, notes } = req.body;
    OrderModel.updateStatus(parseInt(orderId), status, notes);

    if (status === 'accepted' || status === 'delivered') {
      const order = OrderModel.getById(parseInt(orderId));
      LedgerManager.getInstance().log({
        transaction_type: 'supply_order',
        reference_id: order.id,
        amount:        order.total_cost,
        description:   `${status.toUpperCase()}: ${order.quantity}L ${order.fuel_type}`,
        actor_id:      req.session.user.id
      });
    }

    req.flash('success', `Order #${orderId} updated to "${status}".`);
    res.redirect('/refinery/orders');
  }

  /** Feature 10: Inter-Refinery Referral Engine */
  static referOrder(req, res) {
    const { orderId, targetRefineryId } = req.body;
    OrderModel.referOrder(parseInt(orderId), parseInt(targetRefineryId));
    const target = getDb()
      .prepare('SELECT name FROM refineries WHERE id = ?')
      .get(parseInt(targetRefineryId));

    req.flash('success', `Order #${orderId} referred to ${target?.name || 'partner refinery'}.`);
    res.redirect('/refinery/orders');
  }
}

module.exports = RefineryController;
