/**
 * routes/adminRoutes.js
 * Module 1: Feature 17 — Global Transaction Ledger [Singleton Pattern]
 */
const express   = require('express');
const router    = express.Router();
const AdminController = require('../controllers/AdminController');
const { requireRole } = require('../middleware/authMiddleware');

const guard = requireRole('superadmin');

// Feature 17: Global Transaction Ledger
router.get('/ledger', guard, AdminController.showLedger);

module.exports = router;
