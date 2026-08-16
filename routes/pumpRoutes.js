/**
 * routes/pumpRoutes.js
 * Module 1: Feature 13 — Maintenance Mode Toggle
 * Module 2: Feature 7  — Dynamic Pricing & Tax Engine [Strategy Pattern]
 *           Feature 9  — Automated Procurement Portal
 */
const express   = require('express');
const router    = express.Router();
const PumpController = require('../controllers/PumpController');
const { requireRole } = require('../middleware/authMiddleware');

const guard = requireRole('pump_owner');

// Dashboard
router.get('/dashboard', guard, PumpController.showDashboard);

// Feature 13: Maintenance Mode Toggle
router.get('/uptime',          guard, PumpController.showUptime);
router.post('/uptime/toggle',  guard, PumpController.toggleStatus);

// Feature 9: Procurement Portal
router.get('/procurement',  guard, PumpController.showProcurement);
router.post('/procurement', guard, PumpController.submitOrder);

// Feature 7: Dynamic Pricing & Tax Engine [Strategy Pattern]
router.get('/pricing',                  guard, PumpController.showPricing);
router.post('/pricing',                 guard, PumpController.updatePricing);
router.post('/pricing/activate',        guard, PumpController.setActiveStrategy);
router.post('/api/calculate-price',     guard, PumpController.calculatePrice);

module.exports = router;
