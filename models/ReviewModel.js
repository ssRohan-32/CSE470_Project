/**
 * models/ReviewModel.js
 * Module 3: Feature 12 — Anonymous Review Submission
 *           Feature 13 — Admin Review Triage (keyword-based priority)
 */

const { getDb } = require('../config/database');

class ReviewModel {
  /**
   * Create a new review and auto-calculate priority from comment keywords.
   * Reviewer identity is stored for audit but never displayed (anonymous per NAFAS).
   */
  static create({ reviewer_id, target_type, target_id, rating, comment, review_type = 'B2C' }) {
    const priority = ReviewModel.calculatePriority(comment);

    const result = getDb().prepare(`
      INSERT INTO reviews (reviewer_id, target_type, target_id, rating, comment, review_type, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(reviewer_id, target_type, target_id, rating, comment, review_type, priority);

    return { id: result.lastInsertRowid, priority };
  }

  /**
   * Feature 13: Keyword-based severity assignment.
   * High-risk words → High priority (triggers admin alert).
   */
  static calculatePriority(comment = '') {
    const text = comment.toLowerCase();
    const highKeywords   = ['scam', 'fraud', 'water', 'contamina', 'broken', 'dangerous', 'explode', 'fire', 'leak', 'illegal'];
    const mediumKeywords = ['slow', 'rude', 'overcharge', 'wrong', 'missing', 'problem', 'issue', 'bad', 'terrible'];

    if (highKeywords.some(kw => text.includes(kw)))   return 'High';
    if (mediumKeywords.some(kw => text.includes(kw))) return 'Medium';
    return 'Low';
  }

  /** Get all reviews sorted High → Medium → Low, with optional filters */
  static getAll({ priority = null, status = null } = {}) {
    let query = `
      SELECT r.*,
             '*** Anonymous ***' as reviewer_name,
             CASE WHEN r.target_type = 'pump' THEN p.name ELSE ref.name END as target_name
      FROM reviews r
      LEFT JOIN pumps p       ON r.target_type = 'pump'     AND r.target_id = p.id
      LEFT JOIN refineries ref ON r.target_type = 'refinery' AND r.target_id = ref.id
    `;
    const conditions = [];
    const params     = [];
    if (priority) { conditions.push('r.priority = ?'); params.push(priority); }
    if (status)   { conditions.push('r.status = ?');   params.push(status);   }
    if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`;
    query += ` ORDER BY CASE r.priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END, r.created_at DESC`;
    return getDb().prepare(query).all(...params);
  }

  /**
   * Feature 12 / Observer: Count recent High-priority reviews for a target.
   * Used by ObserverService to decide whether to auto-alert admin.
   */
  static getRecentNegativeCount(target_type, target_id, days = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return getDb().prepare(`
      SELECT COUNT(*) as count FROM reviews
      WHERE target_type = ? AND target_id = ? AND priority = 'High' AND created_at >= ?
    `).get(target_type, target_id, cutoff.toISOString()).count;
  }

  /** Admin updates a review's status (pending → reviewed → actioned) */
  static updateStatus(id, status) {
    return getDb().prepare('UPDATE reviews SET status = ? WHERE id = ?').run(status, id);
  }

  /** Stats grouped by priority for the triage dashboard */
  static getStats() {
    return getDb().prepare(`
      SELECT priority, COUNT(*) as count, AVG(rating) as avg_rating
      FROM reviews GROUP BY priority
    `).all();
  }
}

module.exports = ReviewModel;
