/**
 * app.js — Entry Point
 * Fuel Station Management System
 * MVC Architecture with Node.js + Express
 */

const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');

const { initDatabase } = require('./config/database');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const publicRoutes = require('./routes/publicRoutes');
const customerRoutes = require('./routes/customerRoutes');
const refineryRoutes = require('./routes/refineryRoutes');
const pumpRoutes = require('./routes/pumpRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Module 3: Compliance Cron (F14 + F15)
const ComplianceCron = require('./services/ComplianceCron');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Initialize Database ──────────────────────────────────────────────────────
initDatabase();

// ─── View Engine ──────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

app.use(session({
  secret: 'fuelstation-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

app.use(flash());

// Global template variables
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.info = req.flash('info');
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/', authRoutes);
app.use('/', publicRoutes);
app.use('/customer', customerRoutes);
app.use('/refinery', refineryRoutes);
app.use('/pump', pumpRoutes);
app.use('/admin', adminRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 Not Found',
    message: 'The page you are looking for does not exist.',
    code: 404
  });
});

// ─── Error Handler ───────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: '500 Server Error',
    message: 'An internal server error occurred.',
    code: 500
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🔥 NAFAS — Modules 1 · 2 · 3 · 4  (Complete)`);
  console.log(`   Running at http://localhost:${PORT}`);
  console.log(`   Environment: development`);
  console.log(`\n   ✅ Feature  1 — Pump Routing & Filtering`);
  console.log(`   ✅ Feature  2 — Real-Time Fuel Inventory`);
  console.log(`   ✅ Feature  3 — Consumption & Expense Analytics`);
  console.log(`   ✅ Feature  5 — Digital Wallet`);
  console.log(`   ✅ Feature  6 — Payment Gateway [Adapter]`);
  console.log(`   ✅ Feature  7 — Dynamic Pricing [Strategy]`);
  console.log(`   ✅ Feature  8 — B2B Supply Order Management`);
  console.log(`   ✅ Feature  9 — Procurement Portal`);
  console.log(`   ✅ Feature 10 — Inter-Refinery Referral`);
  console.log(`   ✅ Feature 11 — Loyalty Points Engine`);
  console.log(`   ✅ Feature 12 — Anonymous Reviews [Observer]`);
  console.log(`   ✅ Feature 12 — Discrepancy Algorithm [High CC]`);
  console.log(`   ✅ Feature 13 — Review Triage & Priority Engine`);
  console.log(`   ✅ Feature 14 — Trust Score Accumulation [Cron]`);
  console.log(`   ✅ Feature 15 — System-Wide Oversight Console`);
  console.log(`   ✅ Feature 15 — Auto Investigation Orders`);
  console.log(`   ✅ Feature 16 — Market Demographics Engine`);
  console.log(`   ✅ Feature 17 — Transaction Ledger [Singleton]`);
  console.log(`   ✅ Feature 17 — Refinery Production Analytics\n`);

  // Start daily compliance cron (F14 + F15)
  ComplianceCron.start();
});

module.exports = app;
