/**
 * routes/publicRoutes.js
 * Features 1 & 2 — publicly accessible
 */
const express = require('express');
const router = express.Router();
const PublicController = require('../controllers/PublicController');

router.get('/home', PublicController.showHome);
router.get('/inventory', PublicController.showInventory);
router.get('/api/inventory', PublicController.apiInventory);

module.exports = router;
