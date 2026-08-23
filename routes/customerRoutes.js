/**
 * routes/customerRoutes.js
 * Module 1: Feature 5  — Digital Wallet
 * Module 2: Feature 6  — Payment Gateway
 * Module 3: Feature 11 — Loyalty Points Engine
 *           Feature 12 — Anonymous Feedback [Observer]
 */
const express    = require('express');
const router     = express.Router();
const CustomerController = require('../controllers/CustomerController');
const { requireRole }    = require('../middleware/authMiddleware');

const guard = requireRole('customer');

// Feature 5: Wallet
router.get('/wallet',          guard, CustomerController.showWallet);
router.post('/wallet/deposit', guard, CustomerController.depositWallet);

// Feature 6: Payment Gateway [Adapter Pattern]
router.get('/payment',  guard, CustomerController.showPayment);
router.post('/payment', guard, CustomerController.processPayment);

// Feature 11: Loyalty Points
router.get('/loyalty',          guard, CustomerController.showLoyalty);
router.post('/loyalty/redeem',  guard, CustomerController.redeemReward);

// Feature 12: Anonymous Feedback [Observer Pattern]
router.get('/feedback',  guard, CustomerController.showFeedback);
router.post('/feedback', guard, CustomerController.submitFeedback);

module.exports = router;
