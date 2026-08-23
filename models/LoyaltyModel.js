/**
 * models/LoyaltyModel.js
 * Module 3: Feature 11 — Gamified Loyalty Points Engine
 * Awards fuel points for purchases; redeemable for discounts, vouchers, gifts.
 */

const { getDb } = require('../config/database');

class LoyaltyModel {
  static POINTS_PER_UNIT   = 10;   // 10 pts per ৳1 spent
  static WALLET_MULTIPLIER = 1.5;  // Wallet payments earn 1.5× points

  static TIERS = [
    { name: 'Platinum', minPoints: 5000, discount: 0.10, color: '#E5E4E2' },
    { name: 'Gold',     minPoints: 2000, discount: 0.07, color: '#FFD700' },
    { name: 'Silver',   minPoints: 800,  discount: 0.05, color: '#C0C0C0' },
    { name: 'Bronze',   minPoints: 0,    discount: 0.02, color: '#CD7F32' },
  ];

  static REWARDS = [
    { id: 'discount5',  name: '5% Discount Voucher',    points: 500,  type: 'discount' },
    { id: 'discount10', name: '10% Discount Voucher',   points: 1000, type: 'discount' },
    { id: 'freeLiter',  name: '10 Free Litres Voucher', points: 1500, type: 'voucher'  },
    { id: 'gift',       name: 'Car Accessories Gift',    points: 3000, type: 'gift'     },
    { id: 'platinum',   name: 'Platinum Upgrade Pack',   points: 8000, type: 'upgrade'  },
  ];

  /** Get or auto-create a loyalty record for a user */
  static getByUserId(userId) {
    let loyalty = getDb().prepare('SELECT * FROM loyalty_points WHERE user_id = ?').get(userId);
    if (!loyalty) {
      getDb().prepare('INSERT OR IGNORE INTO loyalty_points (user_id) VALUES (?)').run(userId);
      loyalty = getDb().prepare('SELECT * FROM loyalty_points WHERE user_id = ?').get(userId);
    }
    return loyalty;
  }

  /** Return the tier object for a given point total */
  static getTier(points) {
    return LoyaltyModel.TIERS.find(t => points >= t.minPoints) || LoyaltyModel.TIERS[3];
  }

  /** Calculate how many points a payment earns */
  static calculatePoints(amount, paymentMethod) {
    const base = Math.floor(amount * LoyaltyModel.POINTS_PER_UNIT);
    return paymentMethod === 'wallet'
      ? Math.floor(base * LoyaltyModel.WALLET_MULTIPLIER)
      : base;
  }

  /** Award points after a fuel purchase */
  static awardPoints(userId, amount, paymentMethod) {
    const points   = LoyaltyModel.calculatePoints(amount, paymentMethod);
    const loyalty  = LoyaltyModel.getByUserId(userId);
    const newTotal = loyalty.points + points;
    const tier     = LoyaltyModel.getTier(newTotal);

    getDb().prepare(`
      UPDATE loyalty_points
      SET points = ?, total_earned = total_earned + ?, tier = ?
      WHERE user_id = ?
    `).run(newTotal, points, tier.name, userId);

    return { pointsEarned: points, newTotal, tier: tier.name };
  }

  /** Redeem points for a reward */
  static redeemPoints(userId, rewardId) {
    const reward = LoyaltyModel.REWARDS.find(r => r.id === rewardId);
    if (!reward) throw new Error('Invalid reward selected.');

    const loyalty = LoyaltyModel.getByUserId(userId);
    if (loyalty.points < reward.points) {
      throw new Error(`Not enough points. Need ${reward.points}, have ${loyalty.points}.`);
    }

    const newPoints = loyalty.points - reward.points;
    const tier      = LoyaltyModel.getTier(newPoints);
    const db        = getDb();

    db.prepare(`
      UPDATE loyalty_points SET points = ?, total_redeemed = total_redeemed + ?, tier = ?
      WHERE user_id = ?
    `).run(newPoints, reward.points, tier.name, userId);

    db.prepare(`
      INSERT INTO loyalty_redemptions (user_id, points_used, reward_type, description)
      VALUES (?, ?, ?, ?)
    `).run(userId, reward.points, reward.type, reward.name);

    return { success: true, reward: reward.name, remainingPoints: newPoints };
  }

  static getRedemptionHistory(userId) {
    return getDb().prepare(
      'SELECT * FROM loyalty_redemptions WHERE user_id = ? ORDER BY created_at DESC'
    ).all(userId);
  }
}

module.exports = LoyaltyModel;
