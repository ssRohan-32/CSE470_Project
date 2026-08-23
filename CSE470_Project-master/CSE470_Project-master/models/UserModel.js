/**
 * models/UserModel.js
 * NAFAS Module 1 — User operations
 */

const { getDb } = require('../config/database');
const bcrypt    = require('bcryptjs');

class UserModel {

  static findById(id) {
    return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  static findByEmail(email) {
    return getDb().prepare('SELECT * FROM users WHERE email = ?').get(email);
  }

  static create({ name, email, password, role, phone }) {
    const hashed = bcrypt.hashSync(password, 10);
    const result = getDb().prepare(`
      INSERT INTO users (name, email, password, role, phone)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, email, hashed, role, phone || null);
    return result.lastInsertRowid;
  }

  static verifyPassword(plainText, hashed) {
    return bcrypt.compareSync(plainText, hashed);
  }

  static getAll() {
    return getDb().prepare('SELECT id, name, email, role, phone, created_at FROM users ORDER BY created_at DESC').all();
  }

  static countByRole() {
    return getDb().prepare('SELECT role, COUNT(*) as count FROM users GROUP BY role').all();
  }
}

module.exports = UserModel;
