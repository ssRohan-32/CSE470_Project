/**
 * routes/adminRoutes.js
 * Module 1: Feature 17 — Global Transaction Ledger [Singleton Pattern]
 * Module 3: Feature 13 — Review Triage
 *           Feature 14 — Uptime Scores
 *           Feature 15 — Compliance / Investigation Orders
 * Module 4: Feature 15 — System-Wide Oversight Console
 *           Feature 16 — Market Demographics Research Engine
 */
const express   = require('express');
const router    = express.Router();
const AdminController = require('../controllers/AdminController');
const { requireRole } = require('../middleware/authMiddleware');

const guard = requireRole('superadmin');

// Feature 15 (M4): System-Wide Oversight Console — default landing
router.get('/console',           guard, AdminController.showConsole);

// Feature 16 (M4): Market Demographics Research Engine
router.get('/demographics',      guard, AdminController.showDemographics);

// Feature 17 (M1): Global Transaction Ledger
router.get('/ledger',            guard, AdminController.showLedger);

// Feature 13 (M3): Review Triage & Priority Engine
router.get('/reviews',           guard, AdminController.showReviews);
router.post('/reviews/status',   guard, AdminController.updateReviewStatus);

// Feature 14 (M3): Uptime Scoring Scoreboard
router.get('/uptime-scores',     guard, AdminController.showUptimeScores);

// Feature 15 (M3): Compliance / Investigation Orders
router.get('/compliance',        guard, AdminController.showCompliance);
router.post('/compliance/status',guard, AdminController.updateTicketStatus);
router.post('/compliance/run',   guard, AdminController.triggerComplianceCheck);

module.exports = router;
