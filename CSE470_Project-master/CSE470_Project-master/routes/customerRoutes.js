/**
 * routes/customerRoutes.js
 * NAFAS Module 1 — Feature 5 (Digital Wallet)
 */
const express            = require('express');
const router             = express.Router();
const CustomerController = require('../controllers/CustomerController');
const { requireRole }    = require('../middleware/authMiddleware');

const guard = requireRole('customer');

router.get('/wallet',         guard, CustomerController.showWallet);
router.post('/wallet/deposit', guard, CustomerController.depositWallet);

module.exports = router;
