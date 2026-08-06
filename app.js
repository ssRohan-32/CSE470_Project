/**
 * app.js — Entry Point
 * NAFAS Module 1
 *
 * Features:
 *   1.  Route & filter nearby pumps (distance, fuel, maintenance)
 *   2.  Real-time fuel inventory dashboard
 *   5.  Digital wallet (deposit, buy fuel, loyalty multiplier)
 *  13.  Maintenance Mode toggle for pump owners
 *  17.  Centralized Transaction Ledger [Singleton Pattern]
 */

const express        = require('express');
const session        = require('express-session');
const flash          = require('connect-flash');
const methodOverride = require('method-override');
const path           = require('path');

const { initDatabase } = require('./config/database');

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes     = require('./routes/authRoutes');
const publicRoutes   = require('./routes/publicRoutes');
const customerRoutes = require('./routes/customerRoutes');
const pumpRoutes     = require('./routes/pumpRoutes');
const adminRoutes    = require('./routes/adminRoutes');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Database ──────────────────────────────────────────────────────────────────
initDatabase();

// ── View Engine ───────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

app.use(session({
  secret: 'nafas-module1-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(flash());

// Global template locals
app.use((req, res, next) => {
  res.locals.user    = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error   = req.flash('error');
  res.locals.info    = req.flash('info');
  next();
});

// ── Mount Routes ──────────────────────────────────────────────────────────────
app.use('/',         authRoutes);
app.use('/',         publicRoutes);
app.use('/customer', customerRoutes);
app.use('/pump',     pumpRoutes);
app.use('/admin',    adminRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 Not Found',
    message: 'The page you are looking for does not exist.',
    code: 404
  });
});

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: '500 Server Error',
    message: 'An internal server error occurred.',
    code: 500
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🔥 NAFAS — Module 1`);
  console.log(`   Running at http://localhost:${PORT}`);
  console.log(`\n   ✅ Feature  1 — Pump Routing & Filtering`);
  console.log(`   ✅ Feature  2 — Real-Time Fuel Inventory`);
  console.log(`   ✅ Feature  5 — Digital Wallet`);
  console.log(`   ✅ Feature 13 — Maintenance Mode Toggle`);
  console.log(`   ✅ Feature 17 — Centralized Ledger [Singleton]\n`);
});

module.exports = app;
