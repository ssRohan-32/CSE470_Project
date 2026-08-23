/**
 * controllers/AuthController.js
 * NAFAS Module 1 — Login, Logout, Registration
 */

const UserModel   = require('../models/UserModel');
const WalletModel = require('../models/WalletModel');

class AuthController {

  static showLogin(req, res) {
    if (req.session.user) return res.redirect(AuthController.getDashboardUrl(req.session.user.role));
    res.render('auth/login', { title: 'Login — NAFAS Module 1' });
  }

  static showRegister(req, res) {
    if (req.session.user) return res.redirect(AuthController.getDashboardUrl(req.session.user.role));
    res.render('auth/register', { title: 'Register — NAFAS Module 1' });
  }

  static async login(req, res) {
    const { email, password } = req.body;
    try {
      const user = UserModel.findByEmail(email);
      if (!user || !UserModel.verifyPassword(password, user.password)) {
        req.flash('error', 'Invalid email or password.');
        return res.redirect('/login');
      }
      req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
      req.flash('success', `Welcome back, ${user.name}!`);
      res.redirect(AuthController.getDashboardUrl(user.role));
    } catch (err) {
      req.flash('error', 'Login failed. Please try again.');
      res.redirect('/login');
    }
  }

  static async register(req, res) {
    const { name, email, password, role, phone } = req.body;
    try {
      const existing = UserModel.findByEmail(email);
      if (existing) {
        req.flash('error', 'Email already registered.');
        return res.redirect('/register');
      }

      // Module 1 only supports: customer, pump_owner, superadmin
      const allowedRoles = ['customer', 'pump_owner', 'superadmin'];
      if (!allowedRoles.includes(role)) {
        req.flash('error', 'Invalid role for Module 1.');
        return res.redirect('/register');
      }

      const userId = UserModel.create({ name, email, password, role, phone });

      // Auto-create wallet for customers (Feature 5)
      if (role === 'customer') {
        WalletModel.createWallet(userId);
      }

      req.flash('success', 'Account created! Please log in.');
      res.redirect('/login');
    } catch (err) {
      req.flash('error', 'Registration failed: ' + err.message);
      res.redirect('/register');
    }
  }

  static logout(req, res) {
    req.session.destroy(() => res.redirect('/login'));
  }

  /** Redirect to correct Module 1 landing page after login */
  static getDashboardUrl(role) {
    const map = {
      customer:   '/customer/wallet',
      pump_owner: '/pump/dashboard',
      superadmin: '/admin/ledger',
    };
    return map[role] || '/home';
  }
}

module.exports = AuthController;
