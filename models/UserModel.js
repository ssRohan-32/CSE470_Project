/**
 * models/UserModel.js
 * Handles all user-related database operations
 */

const { getDb } = require('../config/database');
const bcrypt = require('bcryptjs');

class UserModel {
  static findById(id) {
    return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  static findByEmail(email) {
    return getDb().prepare('SELECT * FROM users WHERE email = ?').get(email);
  }

  static create({ name, email, password, role, phone, car_brand, age_range, preferred_fuel }) {
    const hashed = bcrypt.hashSync(password, 10);
    const result = getDb().prepare(`
      INSERT INTO users (name, email, password, role, phone, car_brand, age_range, preferred_fuel)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, email, hashed, role, phone || null, car_brand || null, age_range || null, preferred_fuel || 'Petrol');
    return result.lastInsertRowid;
  }

  static verifyPassword(plainText, hashed) {
    return bcrypt.compareSync(plainText, hashed);
  }

  static getAll() {
    return getDb().prepare('SELECT id, name, email, role, phone, created_at FROM users ORDER BY created_at DESC').all();
  }

  static getByRole(role) {
    return getDb().prepare('SELECT id, name, email, phone, created_at FROM users WHERE role = ? ORDER BY name').all(role);
  }

  static countByRole() {
    return getDb().prepare(`
      SELECT role, COUNT(*) as count FROM users GROUP BY role
    `).all();
  }

  static updateProfile(id, { name, phone, car_brand, age_range, preferred_fuel }) {
    return getDb().prepare(`
      UPDATE users SET name=?, phone=?, car_brand=?, age_range=?, preferred_fuel=? WHERE id=?
    `).run(name, phone, car_brand, age_range, preferred_fuel, id);
  }
}

module.exports = UserModel;
