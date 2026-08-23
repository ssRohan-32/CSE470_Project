/**
 * models/ComplianceModel.js
 * Module 3: Feature 14 — Trust Score Accumulation (via Cron)
 *           Feature 15 — Auto-Investigation Order Generation
 */

const { getDb } = require('../config/database');

class ComplianceModel {
  static TRUST_SCORE_THRESHOLD = 75.0; // Score below this triggers auto-ticket

  // ─── Compliance Ticket CRUD ─────────────────────────────────────────────────

  static createTicket({ entity_type, entity_id, reason, severity = 'Medium', auto_generated = true }) {
    const result = getDb().prepare(`
      INSERT INTO compliance_tickets (entity_type, entity_id, reason, severity, auto_generated)
      VALUES (?, ?, ?, ?, ?)
    `).run(entity_type, entity_id, reason, severity, auto_generated ? 1 : 0);
    return result.lastInsertRowid;
  }

  static getAll({ status = null, entity_type = null } = {}) {
    let query = `
      SELECT ct.*,
        CASE WHEN ct.entity_type = 'pump' THEN p.name ELSE r.name END as entity_name
      FROM compliance_tickets ct
      LEFT JOIN pumps p        ON ct.entity_type = 'pump'     AND ct.entity_id = p.id
      LEFT JOIN refineries r   ON ct.entity_type = 'refinery' AND ct.entity_id = r.id
    `;
    const conditions = [];
    const params     = [];
    if (status)      { conditions.push('ct.status = ?');      params.push(status);      }
    if (entity_type) { conditions.push('ct.entity_type = ?'); params.push(entity_type); }
    if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`;
    query += ` ORDER BY CASE ct.severity WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END, ct.created_at DESC`;
    return getDb().prepare(query).all(...params);
  }

  static updateStatus(id, status) {
    const resolvedAt = status === 'resolved' ? new Date().toISOString() : null;
    return getDb().prepare(
      'UPDATE compliance_tickets SET status = ?, resolved_at = ? WHERE id = ?'
    ).run(status, resolvedAt, id);
  }

  /** Prevent duplicate open tickets for the same entity */
  static hasOpenTicket(entity_type, entity_id) {
    const ticket = getDb().prepare(`
      SELECT id FROM compliance_tickets
      WHERE entity_type = ? AND entity_id = ? AND status IN ('open','investigating') LIMIT 1
    `).get(entity_type, entity_id);
    return !!ticket;
  }

  // ─── Trust Score Updates ────────────────────────────────────────────────────

  static updatePumpTrustScore(pumpId, newScore) {
    return getDb().prepare('UPDATE pumps SET trust_score = ? WHERE id = ?').run(newScore, pumpId);
  }

  static updateRefineryTrustScore(refineryId, newScore) {
    return getDb().prepare('UPDATE refineries SET trust_score = ? WHERE id = ?').run(newScore, refineryId);
  }

  // ─── Feature 14: Cron-driven operational day increments ─────────────────────

  /** Called daily by ComplianceCron — increments active pump days and all refinery days */
  static incrementOperationalDays() {
    getDb().prepare(`UPDATE pumps      SET operational_days = operational_days + 1 WHERE status = 'active'`).run();
    getDb().prepare(`UPDATE refineries SET operational_days = operational_days + 1`).run();
  }

  // ─── Feature 15: Auto-Investigation ─────────────────────────────────────────

  /** Returns all pumps and refineries whose trust_score is below the threshold */
  static getEntitiesBelowThreshold() {
    const pumps     = getDb().prepare(`SELECT id, 'pump'     as type, name, trust_score FROM pumps      WHERE trust_score < ?`).all(ComplianceModel.TRUST_SCORE_THRESHOLD);
    const refineries = getDb().prepare(`SELECT id, 'refinery' as type, name, trust_score FROM refineries WHERE trust_score < ?`).all(ComplianceModel.TRUST_SCORE_THRESHOLD);
    return [...pumps, ...refineries];
  }

  // ─── Feature 14: Uptime Scoreboard ──────────────────────────────────────────

  static getUptimeScoreboard() {
    const pumps      = getDb().prepare(`SELECT id, name, location, trust_score, operational_days, status, 'pump' as entity_type FROM pumps      ORDER BY trust_score DESC`).all();
    const refineries = getDb().prepare(`SELECT id, name, location, trust_score, operational_days, 'active' as status, 'refinery' as entity_type FROM refineries ORDER BY trust_score DESC`).all();
    return { pumps, refineries };
  }
}

module.exports = ComplianceModel;
