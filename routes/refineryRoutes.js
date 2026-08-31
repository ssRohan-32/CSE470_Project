/**
 * routes/refineryRoutes.js
 * Module 2: Feature 8  — B2B Supply Order Management
 *           Feature 10 — Inter-Refinery Referral Engine
 */
const express   = require('express');
const router    = express.Router();
const RefineryController = require('../controllers/RefineryController');
const { requireRole }    = require('../middleware/authMiddleware');

const guard = requireRole('refinery_owner');

// Dashboard
router.get('/dashboard', guard, RefineryController.showDashboard);

// Feature 8: B2B Supply Order Management
router.get('/orders',              guard, RefineryController.showOrders);
router.post('/orders/status',      guard, RefineryController.updateOrderStatus);

// Feature 10: Inter-Refinery Referral Engine
router.post('/orders/refer', guard, RefineryController.referOrder);

// Feature 17: Monthly Fuel Production Analytics
router.get('/production',       guard, RefineryController.showProduction);
router.post('/production/log',  guard, RefineryController.logProduction);

module.exports = router;
