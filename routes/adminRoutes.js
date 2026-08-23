/**
 * routes/adminRoutes.js
 * Module 1: Feature 17 — Global Transaction Ledger [Singleton Pattern]
 * Module 3: Feature 13 — Review Triage
 *           Feature 14 — Uptime Scores
 *           Feature 15 — Compliance / Investigation Orders
 */
const express   = require('express');
const router    = express.Router();
const AdminController = require('../controllers/AdminController');
const { requireRole } = require('../middleware/authMiddleware');

const guard = requireRole('superadmin');

// Feature 17: Global Transaction Ledger
router.get('/ledger', guard, AdminController.showLedger);

// Feature 13: Review Triage & Priority Engine
router.get('/reviews',               guard, AdminController.showReviews);
router.post('/reviews/status',       guard, AdminController.updateReviewStatus);

// Feature 14: Uptime Scoring Scoreboard
router.get('/uptime-scores',         guard, AdminController.showUptimeScores);

// Feature 15: Compliance / Investigation Orders
router.get('/compliance',            guard, AdminController.showCompliance);
router.post('/compliance/status',    guard, AdminController.updateTicketStatus);
router.post('/compliance/run',       guard, AdminController.triggerComplianceCheck);

module.exports = router;
