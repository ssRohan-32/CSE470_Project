/**
 * routes/pumpRoutes.js
 * NAFAS Module 1 — Feature 13 (Maintenance Mode Toggle)
 */
const express        = require('express');
const router         = express.Router();
const PumpController = require('../controllers/PumpController');
const { requireRole } = require('../middleware/authMiddleware');

const guard = requireRole('pump_owner');

router.get('/dashboard',       guard, PumpController.showDashboard);
router.get('/uptime',          guard, PumpController.showUptime);
router.post('/uptime/toggle',  guard, PumpController.toggleStatus);

module.exports = router;
