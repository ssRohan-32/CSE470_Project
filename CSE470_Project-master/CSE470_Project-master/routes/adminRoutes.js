/**
 * routes/adminRoutes.js
 * NAFAS Module 1 — Feature 17 (Centralized Ledger)
 */
const express         = require('express');
const router          = express.Router();
const AdminController = require('../controllers/AdminController');
const { requireRole } = require('../middleware/authMiddleware');

const guard = requireRole('superadmin');

router.get('/ledger', guard, AdminController.showLedger);

module.exports = router;
