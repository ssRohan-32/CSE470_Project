/**
 * routes/authRoutes.js
 */
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');

router.get('/', (req, res) => res.redirect('/home'));
router.get('/login', AuthController.showLogin);
router.post('/login', AuthController.login);
router.get('/register', AuthController.showRegister);
router.post('/register', AuthController.register);
router.get('/logout', AuthController.logout);

module.exports = router;
