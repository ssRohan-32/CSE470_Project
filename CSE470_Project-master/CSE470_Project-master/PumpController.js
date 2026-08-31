/**
 * controllers/PumpController.js
 * Module 1: Feature 13 — Maintenance Mode Toggle
 * Module 2: Feature 7  — Dynamic Pricing & Tax Engine [Strategy Pattern]
 *           Feature 9  — Automated Procurement Portal
 */

const OrderModel    = require('../models/OrderModel');
const { PricingContext } = require('../services/PricingStrategy');
const PricingModel  = require('../models/PricingModel');
const LedgerManager = require('../services/LedgerSingleton');
const { getDb }     = require('../config/database');

class PumpController {

  static getPump(ownerId) {
    return getDb().prepare('SELECT * FROM pumps WHERE owner_id = ? LIMIT 1').get(ownerId);
  }

  static getPumps(ownerId) {
    return getDb().prepare('SELECT * FROM pumps WHERE owner_id = ?').all(ownerId);
  }

  /** Pump Dashboard */
  static showDashboard(req, res) {
    const pumps        = PumpController.getPumps(req.session.user.id);
    const primaryPump  = pumps[0];
    const recentOrders = primaryPump
      ? OrderModel.getByPumpOwner(req.session.user.id).slice(0, 5)
      : [];

    res.render('pump/dashboard', {
      title: 'Pump Dashboard — NAFAS',
      pumps, primaryPump, recentOrders,
      user: req.session.user
    });
  }

  /** Feature 13: Dynamic Operational Uptime Controller */
  static showUptime(req, res) {
    const pumps = PumpController.getPumps(req.session.user.id);
    res.render('pump/uptime', {
      title: 'Maintenance Mode — NAFAS',
      pumps,
      user: req.session.user
    });
  }

  static toggleStatus(req, res) {
    const { pumpId, status } = req.body;
    const pump = getDb()
      .prepare('SELECT * FROM pumps WHERE id = ? AND owner_id = ?')
      .get(parseInt(pumpId), req.session.user.id);

    if (!pump) {
      req.flash('error', 'Pump not found.');
      return res.redirect('/pump/uptime');
    }
    getDb().prepare('UPDATE pumps SET status = ? WHERE id = ?').run(status, parseInt(pumpId));

    // Log via Singleton Ledger (Feature 17)
    LedgerManager.getInstance().log({
      transaction_type: 'maintenance_toggle',
      reference_id: parseInt(pumpId),
      amount: 0,
      description: `Pump "${pump.name}" status changed to ${status}`,
      actor_id: req.session.user.id
    });

    req.flash('success', `"${pump.name}" is now ${status}. Routing updated automatically.`);
    res.redirect('/pump/uptime');
  }

  /** Feature 9: Automated Procurement Portal */
  static showProcurement(req, res) {
    const refineries = getDb().prepare('SELECT * FROM refineries ORDER BY name').all();
    const myOrders   = OrderModel.getByPumpOwner(req.session.user.id);
    const pump       = PumpController.getPump(req.session.user.id);

    res.render('pump/procurement', {
      title: 'Fuel Procurement — NAFAS',
      refineries, myOrders, pump,
      fuelTypes: ['Octane', 'Diesel', 'Petrol', 'EV'],
      user: req.session.user
    });
  }

  static submitOrder(req, res) {
    const { refinery_id, fuel_type, quantity, notes } = req.body;
    const pump_owner_id = req.session.user.id;
    try {
      const orderId = OrderModel.create({
        pump_owner_id,
        refinery_id: parseInt(refinery_id),
        fuel_type,
        quantity: parseFloat(quantity),
        notes
      });

      const order = OrderModel.getById(orderId);
      LedgerManager.getInstance().log({
        transaction_type: 'supply_order',
        reference_id: orderId,
        amount: order.total_cost,
        description: `Procurement: ${quantity}L ${fuel_type} from refinery #${refinery_id}`,
        actor_id: pump_owner_id
      });

      req.flash('success', `✅ Order #${orderId} submitted: ${quantity}L ${fuel_type}`);
    } catch (err) {
      req.flash('error', err.message);
    }
    res.redirect('/pump/procurement');
  }

  /** Feature 7: Dynamic Pricing & Tax Engine [STRATEGY PATTERN] */
  static showPricing(req, res) {
    const pump = PumpController.getPump(req.session.user.id);
    if (!pump) {
      req.flash('error', 'No pump found.');
      return res.redirect('/pump/dashboard');
    }
    const rules      = PricingModel.getRulesForPump(pump.id);
    const strategies = PricingContext.getAllStrategies();
    const fuelTypes  = ['Octane', 'Diesel', 'Petrol', 'EV'];

    // Demo calculations for each strategy
    const demoCalc = strategies.map(s => {
      const ctx = new PricingContext(s.getName());
      return {
        name: s.getName(),
        description: s.getDescription(),
        result: ctx.calculate(1.35, 30)
      };
    });

    res.render('pump/pricing', {
      title: 'Dynamic Pricing — NAFAS',
      pump, rules, strategies, fuelTypes, demoCalc,
      user: req.session.user
    });
  }

  static updatePricing(req, res) {
    const pump = PumpController.getPump(req.session.user.id);
    const { strategy, fuel_type, base_price, multiplier, tax_rate } = req.body;
    PricingModel.upsertRule({
      pump_id:    pump.id,
      strategy,
      fuel_type,
      base_price: parseFloat(base_price),
      multiplier: parseFloat(multiplier) || 1.0,
      tax_rate:   parseFloat(tax_rate)   || 0.15
    });
    req.flash('success', `Pricing rule saved: ${strategy} for ${fuel_type}`);
    res.redirect('/pump/pricing');
  }

  static setActiveStrategy(req, res) {
    const pump = PumpController.getPump(req.session.user.id);
    PricingModel.setActiveStrategy(pump.id, req.body.strategy);
    req.flash('success', `Active pricing strategy set to: ${req.body.strategy}`);
    res.redirect('/pump/pricing');
  }

  /** API: Live price preview */
  static calculatePrice(req, res) {
    const { strategy, basePrice, quantity, taxRate, multiplier } = req.body;
    const ctx = new PricingContext(strategy || 'Standard');
    res.json(ctx.calculate(
      parseFloat(basePrice) || 1.35,
      parseFloat(quantity)  || 1,
      parseFloat(taxRate)   || 0.15,
      parseFloat(multiplier)|| 1.0
    ));
  }
}

module.exports = PumpController;
