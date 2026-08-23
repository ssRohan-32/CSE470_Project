/**
 * config/database.js
 * NAFAS Module 1 — SQLite init & seed
 *
 * Tables used by Module 1:
 *   users, pumps, fuel_inventory, wallets,
 *   wallet_transactions, transaction_ledger
 */

const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const path     = require('path');

const DB_PATH = path.join(__dirname, '..', 'module1.db');
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

  // ── Tables ──────────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('customer','pump_owner','superadmin')),
      phone TEXT,
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

    CREATE TABLE IF NOT EXISTS transaction_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_type TEXT NOT NULL,
      reference_id INTEGER,
      amount REAL NOT NULL,
      description TEXT,
      actor_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ── Seed ────────────────────────────────────────────────────────────────────
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (count.c === 0) {
    seedDatabase(db);
    console.log('   ✅ Module 1 database seeded');
  } else {
    console.log('   ✅ Module 1 database connected (existing data)');
  }
}

function seedDatabase(db) {
  const hash = (p) => bcrypt.hashSync(p, 10);

  // Users
  const insUser = db.prepare(
    'INSERT INTO users (name,email,password,role,phone) VALUES (?,?,?,?,?)'
  );
  insUser.run('Super Admin',    'admin@fuel.com',  hash('admin123'), 'superadmin', '01700000001');
  insUser.run('Alice Rahman',   'alice@fuel.com',  hash('pass123'),  'customer',   '01700000002');
  insUser.run('Bob Hasan',      'bob@fuel.com',    hash('pass123'),  'customer',   '01700000003');
  insUser.run('Pump Owner A',   'pumpa@fuel.com',  hash('pass123'),  'pump_owner', '01700000004');
  insUser.run('Pump Owner B',   'pumpb@fuel.com',  hash('pass123'),  'pump_owner', '01700000005');

  // Pumps
  const insPump = db.prepare(
    'INSERT INTO pumps (owner_id,name,location,latitude,longitude,status) VALUES (?,?,?,?,?,?)'
  );
  insPump.run(4, 'City Fuel Station',   'Dhanmondi, Dhaka', 23.7461, 90.3742, 'active');
  insPump.run(4, 'Airport Road Fuel',   'Uttara, Dhaka',    23.8759, 90.3795, 'active');
  insPump.run(5, 'Gulshan Fuels',       'Gulshan, Dhaka',   23.7925, 90.4078, 'maintenance');
  insPump.run(5, 'Motijheel Energy',    'Motijheel, Dhaka', 23.7295, 90.4187, 'active');

  // Fuel Inventory
  const insInv = db.prepare(
    'INSERT INTO fuel_inventory (pump_id,fuel_type,quantity,capacity,price_per_liter) VALUES (?,?,?,?,?)'
  );
  insInv.run(1,'Octane',4500,10000,1.35); insInv.run(1,'Diesel',3200,8000,1.10);
  insInv.run(1,'Petrol',6100,12000,1.20); insInv.run(1,'EV',850,2000,0.45);
  insInv.run(2,'Octane',7200,10000,1.35); insInv.run(2,'Diesel',5100,8000,1.10);
  insInv.run(2,'Petrol',2300,12000,1.20);
  insInv.run(3,'Octane',1200,10000,1.35); insInv.run(3,'Petrol',4600,12000,1.20);
  insInv.run(4,'Diesel',6800,8000,1.10);  insInv.run(4,'Petrol',5900,12000,1.20);
  insInv.run(4,'EV',1200,2000,0.45);

  // Wallets
  const insWallet = db.prepare('INSERT INTO wallets (user_id,balance) VALUES (?,?)');
  insWallet.run(2, 2450.75);
  insWallet.run(3, 1320.50);

  // Seed ledger entries
  const insLedger = db.prepare(
    'INSERT INTO transaction_ledger (transaction_type,reference_id,amount,description,actor_id) VALUES (?,?,?,?,?)'
  );
  insLedger.run('wallet_deposit',  null, 500.00,   'Wallet top-up — Alice',            2);
  insLedger.run('wallet_deposit',  null, 1320.50,  'Wallet top-up — Bob',              3);
  insLedger.run('fuel_purchase',   1,    67.50,    'Octane at City Fuel Station',       2);
  insLedger.run('fuel_purchase',   2,    89.10,    'Diesel at Airport Road Fuel',       3);
  insLedger.run('maintenance_toggle', null, 0,     'Pump #3 set to Maintenance Mode',   4);
}

module.exports = { getDb, initDatabase };
