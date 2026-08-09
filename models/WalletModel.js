/**
 * models/WalletModel.js
 * Used by: Feature 5 (Integrated Digital Wallet)
 */

const { getDb } = require('../config/database');

class WalletModel {
  static getByUserId(userId) {
    return getDb().prepare('SELECT * FROM wallets WHERE user_id = ?').get(userId);
  }

  static createWallet(userId) {
    const result = getDb().prepare('INSERT OR IGNORE INTO wallets (user_id, balance) VALUES (?, 0)').run(userId);
    return result.lastInsertRowid;
  }

  static deposit(userId, amount, description = 'Wallet deposit') {
    const db = getDb();
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(userId);
    if (!wallet) throw new Error('Wallet not found');

    const newBalance = wallet.balance + amount;
    db.prepare('UPDATE wallets SET balance = ? WHERE user_id = ?').run(newBalance, userId);
    db.prepare(`
      INSERT INTO wallet_transactions (wallet_id, type, amount, description)
      VALUES (?, 'deposit', ?, ?)
    `).run(wallet.id, amount, description);

    return newBalance;
  }

  static deduct(userId, amount, description = 'Payment') {
    const db = getDb();
    const wallet = db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(userId);
    if (!wallet) throw new Error('Wallet not found');
    if (wallet.balance < amount) throw new Error('Insufficient wallet balance');

    const newBalance = wallet.balance - amount;
    db.prepare('UPDATE wallets SET balance = ? WHERE user_id = ?').run(newBalance, userId);
    db.prepare(`
      INSERT INTO wallet_transactions (wallet_id, type, amount, description)
      VALUES (?, 'payment', ?, ?)
    `).run(wallet.id, amount, description);

    return newBalance;
  }

  static getTransactions(userId, limit = 20) {
    return getDb().prepare(`
      SELECT wt.* FROM wallet_transactions wt
      JOIN wallets w ON wt.wallet_id = w.id
      WHERE w.user_id = ?
      ORDER BY wt.created_at DESC
      LIMIT ?
    `).all(userId, limit);
  }
}

module.exports = WalletModel;
