/**
 * config/database.js
 * SQLite database initialization and seeding
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'fuel_station.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDatabase() {
  const db = getDb();

  // ─── Create Tables ────────────────────────────────────────────────────────

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('customer','pump_owner','refinery_owner','superadmin')),
      phone TEXT,
      car_brand TEXT,
      age_range TEXT,
      preferred_fuel TEXT DEFAULT 'Petrol',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pumps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      latitude REAL DEFAULT 0,
      longitude REAL DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','maintenance','inactive')),
      trust_score REAL DEFAULT 100.0,
      operational_days INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS refineries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      capacity INTEGER DEFAULT 100000,
      current_production INTEGER DEFAULT 0,
      monthly_target INTEGER DEFAULT 80000,
      trust_score REAL DEFAULT 100.0,
      operational_days INTEGER DEFAULT 0,
      is_at_capacity INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS fuel_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pump_id INTEGER NOT NULL,
      fuel_type TEXT NOT NULL CHECK(fuel_type IN ('Octane','Diesel','Petrol','EV')),
      quantity REAL DEFAULT 0,
      capacity REAL DEFAULT 10000,
      price_per_liter REAL DEFAULT 1.0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pump_id) REFERENCES pumps(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      pump_id INTEGER NOT NULL,
      fuel_type TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      total_amount REAL NOT NULL,
      tax_amount REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      payment_method TEXT DEFAULT 'wallet',
      pricing_strategy TEXT DEFAULT 'Standard',
      status TEXT DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES users(id),
      FOREIGN KEY (pump_id) REFERENCES pumps(id)
    );

    CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      balance REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('deposit','withdrawal','payment')),
      amount REAL NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (wallet_id) REFERENCES wallets(id)
    );

    CREATE TABLE IF NOT EXISTS loyalty_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      points INTEGER DEFAULT 0,
      tier TEXT DEFAULT 'Bronze',
      total_earned INTEGER DEFAULT 0,
      total_redeemed INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS loyalty_redemptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      points_used INTEGER NOT NULL,
      reward_type TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reviewer_id INTEGER NOT NULL,
      target_type TEXT NOT NULL CHECK(target_type IN ('pump','refinery')),
      target_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT,
      review_type TEXT DEFAULT 'B2C' CHECK(review_type IN ('B2C','B2B')),
      priority TEXT DEFAULT 'Low' CHECK(priority IN ('Low','Medium','High')),
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','reviewed','actioned')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reviewer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS supply_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pump_owner_id INTEGER NOT NULL,
      refinery_id INTEGER NOT NULL,
      fuel_type TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL DEFAULT 0,
      total_cost REAL DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','referred','delivered')),
      notes TEXT,
      referred_to INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pump_owner_id) REFERENCES users(id),
      FOREIGN KEY (refinery_id) REFERENCES refineries(id)
    );

    CREATE TABLE IF NOT EXISTS transaction_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_type TEXT NOT NULL,
      reference_id INTEGER,
      amount REAL NOT NULL,
      description TEXT,
      actor_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS compliance_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('pump','refinery')),
      entity_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      severity TEXT DEFAULT 'Medium' CHECK(severity IN ('Low','Medium','High','Critical')),
      status TEXT DEFAULT 'open' CHECK(status IN ('open','investigating','resolved','dismissed')),
      auto_generated INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS delivery_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pump_id INTEGER NOT NULL,
      fuel_type TEXT NOT NULL,
      invoiced_quantity REAL NOT NULL,
      recorded_sales REAL NOT NULL,
      discrepancy REAL DEFAULT 0,
      anomaly_flag INTEGER DEFAULT 0,
      log_date DATE DEFAULT CURRENT_DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pump_id) REFERENCES pumps(id)
    );

    CREATE TABLE IF NOT EXISTS pricing_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pump_id INTEGER NOT NULL,
      strategy TEXT NOT NULL CHECK(strategy IN ('Standard','Holiday','Surge')),
      fuel_type TEXT NOT NULL,
      base_price REAL NOT NULL,
      multiplier REAL DEFAULT 1.0,
      tax_rate REAL DEFAULT 0.15,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pump_id) REFERENCES pumps(id)
    );

    CREATE TABLE IF NOT EXISTS production_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      refinery_id INTEGER NOT NULL,
      fuel_type TEXT NOT NULL CHECK(fuel_type IN ('Octane','Diesel','Petrol','EV')),
      volume_litres REAL NOT NULL,
      production_month TEXT NOT NULL,
      notes TEXT,
      logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (refinery_id) REFERENCES refineries(id)
    );
  `);

  // ─── Seed Data ────────────────────────────────────────────────────────────
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    seedDatabase(db);
    console.log('   ✅ Database seeded with demo data');
  } else {
    console.log('   ✅ Database connected (existing data found)');
  }
}

function seedDatabase(db) {
  const hash = (pwd) => bcrypt.hashSync(pwd, 10);

  // Seed Users
  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password, role, phone, car_brand, age_range, preferred_fuel)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const users = [
    ['Super Admin', 'admin@fuel.com', hash('admin123'), 'superadmin', '01700000001', null, null, null],
    ['Alice Rahman', 'alice@fuel.com', hash('pass123'), 'customer', '01700000002', 'Toyota', '25-34', 'Octane'],
    ['Bob Hasan', 'bob@fuel.com', hash('pass123'), 'customer', '01700000003', 'Honda', '35-44', 'Petrol'],
    ['Carol Islam', 'carol@fuel.com', hash('pass123'), 'customer', '01700000004', 'BMW', '18-24', 'Octane'],
    ['David Ahmed', 'david@fuel.com', hash('pass123'), 'customer', '01700000005', 'Tesla', '25-34', 'EV'],
    ['Pump Owner A', 'pumpa@fuel.com', hash('pass123'), 'pump_owner', '01700000006', null, null, null],
    ['Pump Owner B', 'pumpb@fuel.com', hash('pass123'), 'pump_owner', '01700000007', null, null, null],
    ['Refinery Owner X', 'refinex@fuel.com', hash('pass123'), 'refinery_owner', '01700000008', null, null, null],
    ['Refinery Owner Y', 'refiney@fuel.com', hash('pass123'), 'refinery_owner', '01700000009', null, null, null],
  ];

  for (const u of users) insertUser.run(...u);

  // Seed Pumps
  const insertPump = db.prepare(`
    INSERT INTO pumps (owner_id, name, location, latitude, longitude, status, trust_score, operational_days)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertPump.run(6, 'City Fuel Station', 'Dhanmondi, Dhaka', 23.7461, 90.3742, 'active', 94.5, 280);
  insertPump.run(6, 'Airport Road Fuel', 'Uttara, Dhaka', 23.8759, 90.3795, 'active', 87.2, 310);
  insertPump.run(7, 'Gulshan Fuels', 'Gulshan, Dhaka', 23.7925, 90.4078, 'maintenance', 72.0, 190);
  insertPump.run(7, 'Motijheel Energy', 'Motijheel, Dhaka', 23.7295, 90.4187, 'active', 91.8, 265);

  // Seed Refineries
  const insertRefinery = db.prepare(`
    INSERT INTO refineries (owner_id, name, location, capacity, current_production, monthly_target, trust_score, operational_days)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertRefinery.run(8, 'Eastern Petroleum Refinery', 'Chittagong', 150000, 112000, 120000, 96.0, 320);
  insertRefinery.run(9, 'National Fuel Corp', 'Sylhet', 100000, 78000, 80000, 88.5, 290);

  // Seed Fuel Inventory
  const insertInventory = db.prepare(`
    INSERT INTO fuel_inventory (pump_id, fuel_type, quantity, capacity, price_per_liter)
    VALUES (?, ?, ?, ?, ?)
  `);
  // Pump 1
  insertInventory.run(1, 'Octane', 4500, 10000, 1.35);
  insertInventory.run(1, 'Diesel', 3200, 8000, 1.10);
  insertInventory.run(1, 'Petrol', 6100, 12000, 1.20);
  insertInventory.run(1, 'EV', 850, 2000, 0.45);
  // Pump 2
  insertInventory.run(2, 'Octane', 7200, 10000, 1.35);
  insertInventory.run(2, 'Diesel', 5100, 8000, 1.10);
  insertInventory.run(2, 'Petrol', 2300, 12000, 1.20);
  // Pump 3
  insertInventory.run(3, 'Octane', 1200, 10000, 1.35);
  insertInventory.run(3, 'Petrol', 4600, 12000, 1.20);
  // Pump 4
  insertInventory.run(4, 'Diesel', 6800, 8000, 1.10);
  insertInventory.run(4, 'Petrol', 5900, 12000, 1.20);
  insertInventory.run(4, 'EV', 1200, 2000, 0.45);

  // Seed Wallets
  const insertWallet = db.prepare('INSERT INTO wallets (user_id, balance) VALUES (?, ?)');
  insertWallet.run(2, 2450.75);
  insertWallet.run(3, 1320.50);
  insertWallet.run(4, 5000.00);
  insertWallet.run(5, 890.25);

  // Seed Loyalty Points
  const insertLoyalty = db.prepare(`
    INSERT INTO loyalty_points (user_id, points, tier, total_earned, total_redeemed) VALUES (?, ?, ?, ?, ?)
  `);
  insertLoyalty.run(2, 3450, 'Gold', 4200, 750);
  insertLoyalty.run(3, 1200, 'Silver', 1400, 200);
  insertLoyalty.run(4, 8900, 'Platinum', 9500, 600);
  insertLoyalty.run(5, 450, 'Bronze', 450, 0);

  // Seed Transactions (last 60 days)
  const insertTx = db.prepare(`
    INSERT INTO transactions (customer_id, pump_id, fuel_type, quantity, unit_price, total_amount, tax_amount, payment_method, pricing_strategy, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const fuelTypes = ['Octane','Diesel','Petrol','EV'];
  const strategies = ['Standard','Holiday','Surge'];
  const paymentMethods = ['wallet','bKash','bank'];

  for (let i = 0; i < 60; i++) {
    const daysAgo = Math.floor(Math.random() * 60);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const customerId = [2, 3, 4, 5][Math.floor(Math.random() * 4)];
    const pumpId = [1, 2, 4][Math.floor(Math.random() * 3)];
    const fuel = fuelTypes[Math.floor(Math.random() * fuelTypes.length)];
    const qty = +(Math.random() * 40 + 5).toFixed(2);
    const price = fuel === 'EV' ? 0.45 : fuel === 'Diesel' ? 1.10 : fuel === 'Petrol' ? 1.20 : 1.35;
    const total = +(qty * price).toFixed(2);
    const tax = +(total * 0.15).toFixed(2);
    insertTx.run(customerId, pumpId, fuel, qty, price, total, tax, paymentMethods[Math.floor(Math.random() * 3)], strategies[Math.floor(Math.random() * 3)], date.toISOString());
  }

  // Seed Supply Orders
  const insertOrder = db.prepare(`
    INSERT INTO supply_orders (pump_owner_id, refinery_id, fuel_type, quantity, unit_price, total_cost, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const orderStatuses = ['pending','accepted','rejected','delivered'];
  for (let i = 0; i < 15; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const ownerId = [6, 7][Math.floor(Math.random() * 2)];
    const refineryId = [1, 2][Math.floor(Math.random() * 2)];
    const fuel = ['Octane','Diesel','Petrol'][Math.floor(Math.random() * 3)];
    const qty = Math.floor(Math.random() * 50000) + 10000;
    const unitPrice = 0.85;
    insertOrder.run(ownerId, refineryId, fuel, qty, unitPrice, +(qty * unitPrice).toFixed(2), orderStatuses[Math.floor(Math.random() * 4)], date.toISOString());
  }

  // Seed Reviews
  const insertReview = db.prepare(`
    INSERT INTO reviews (reviewer_id, target_type, target_id, rating, comment, review_type, priority, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const reviewComments = [
    ['Great service and fast pumping!', 'Low'],
    ['Long wait times, but okay fuel quality.', 'Low'],
    ['The pump was broken for 2 hours!', 'High'],
    ['Excellent EV charging facilities.', 'Low'],
    ['Suspected water contamination in Diesel!', 'High'],
    ['Average service, nothing special.', 'Low'],
    ['This is a scam, overcharged me!', 'High'],
    ['Friendly staff, well maintained.', 'Low'],
    ['Fuel quality seems substandard.', 'Medium'],
    ['Quick and efficient service.', 'Low'],
  ];
  for (let i = 0; i < reviewComments.length; i++) {
    const rating = Math.floor(Math.random() * 5) + 1;
    const customerId = [2, 3, 4, 5][Math.floor(Math.random() * 4)];
    const pumpId = [1, 2, 3, 4][Math.floor(Math.random() * 4)];
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    insertReview.run(customerId, 'pump', pumpId, rating, reviewComments[i][0], 'B2C', reviewComments[i][1], date.toISOString());
  }

  // Seed Delivery Logs
  const insertLog = db.prepare(`
    INSERT INTO delivery_logs (pump_id, fuel_type, invoiced_quantity, recorded_sales, discrepancy, anomaly_flag, log_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const pumpId = [1, 2, 4][Math.floor(Math.random() * 3)];
    const fuel = ['Octane','Diesel','Petrol'][Math.floor(Math.random() * 3)];
    const invoiced = +(Math.random() * 2000 + 500).toFixed(2);
    const anomaly = Math.random() < 0.15;
    const sales = anomaly ? +(invoiced * (0.7 + Math.random() * 0.1)).toFixed(2) : +(invoiced * (0.92 + Math.random() * 0.08)).toFixed(2);
    const discrepancy = +(invoiced - sales).toFixed(2);
    insertLog.run(pumpId, fuel, invoiced, sales, discrepancy, anomaly ? 1 : 0, date.toISOString().split('T')[0]);
  }

  // Seed Pricing Rules
  const insertPricing = db.prepare(`
    INSERT INTO pricing_rules (pump_id, strategy, fuel_type, base_price, multiplier, tax_rate)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const pricingData = [
    [1, 'Standard', 'Octane', 1.35, 1.0, 0.15],
    [1, 'Standard', 'Diesel', 1.10, 1.0, 0.15],
    [1, 'Standard', 'Petrol', 1.20, 1.0, 0.15],
    [1, 'Holiday', 'Octane', 1.35, 1.12, 0.15],
    [1, 'Surge', 'Octane', 1.35, 1.25, 0.15],
    [2, 'Standard', 'Octane', 1.35, 1.0, 0.15],
    [2, 'Standard', 'Diesel', 1.10, 1.0, 0.15],
    [4, 'Standard', 'Diesel', 1.10, 1.0, 0.15],
    [4, 'Standard', 'Petrol', 1.20, 1.0, 0.15],
    [4, 'Surge', 'Diesel', 1.10, 1.18, 0.15],
  ];
  for (const p of pricingData) insertPricing.run(...p);

  // Seed Compliance Tickets
  const insertTicket = db.prepare(`
    INSERT INTO compliance_tickets (entity_type, entity_id, reason, severity, status)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertTicket.run('pump', 3, 'Trust score dropped below 75 threshold', 'High', 'open');
  insertTicket.run('pump', 3, 'Multiple high-priority reviews received within 7 days', 'Medium', 'investigating');

  // Seed Ledger
  const insertLedger = db.prepare(`
    INSERT INTO transaction_ledger (transaction_type, reference_id, amount, description, actor_id)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertLedger.run('fuel_purchase', 1, 67.50, 'Octane purchase at City Fuel Station', 2);
  insertLedger.run('wallet_deposit', null, 500.00, 'Wallet top-up', 2);
  insertLedger.run('loyalty_redemption', null, -50.00, 'Gold tier discount redeemed', 3);
  insertLedger.run('supply_order', 1, 42500.00, 'Bulk Octane supply order from Eastern Petroleum', 6);
  insertLedger.run('fuel_purchase', 2, 89.10, 'Diesel purchase at Airport Road Fuel', 4);
}

module.exports = { getDb, initDatabase };
