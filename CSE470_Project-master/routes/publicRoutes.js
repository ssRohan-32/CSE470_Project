/**
 * routes/publicRoutes.js
 * NAFAS Module 1 — Features 1 & 2
 */
const express          = require('express');
const router           = express.Router();
const PublicController = require('../controllers/PublicController');

router.get('/home',          PublicController.showHome);
router.get('/inventory',     PublicController.showInventory);
router.get('/api/inventory', PublicController.apiInventory);
router.get('/', (req, res) => res.redirect('/home'));

module.exports = router;
