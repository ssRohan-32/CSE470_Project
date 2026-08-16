/**
 * routes/customerRoutes.js
 * Module 1: Feature 5  — Digital Wallet
 * Module 2: Feature 6  — Payment Gateway
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

module.exports = router;
