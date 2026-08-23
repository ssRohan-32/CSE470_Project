/**
 * controllers/AdminController.js
 * Module 1: Feature 17 — Global Transaction Ledger [Singleton Pattern]
 * Module 3: Feature 13 — Review Triage & Priority Engine
 *           Feature 14 — Entity Uptime Scoring (trust score scoreboard)
 *           Feature 15 — Automated Compliance / Investigation Orders
 */

const LedgerManager   = require('../services/LedgerSingleton');
const ReviewModel     = require('../models/ReviewModel');
const ComplianceModel = require('../models/ComplianceModel');
const ComplianceCron  = require('../services/ComplianceCron');
const { getDb }       = require('../config/database');

class AdminController {

  // ─── Feature 17: Global Transaction Ledger [Singleton] ─────────────────────

  static showLedger(req, res) {
    const ledgerInstance = LedgerManager.getInstance();
    const typeFilter     = req.query.type || null;
    const page           = parseInt(req.query.page) || 1;
    const limit          = 25;
    const offset         = (page - 1) * limit;

    const entries    = ledgerInstance.getAll({ limit, offset, type: typeFilter });
    const stats      = ledgerInstance.getStats();
    const total      = ledgerInstance.getTotalCount();
    const totalPages = Math.ceil(total / limit) || 1;
    const instanceId = ledgerInstance.getInstanceId();

    res.render('admin/ledger', {
      title: 'Transaction Ledger — NAFAS',
      entries, stats, total, typeFilter: typeFilter || '',
      page, totalPages, instanceId,
      user: req.session.user
    });
  }

  // ─── Feature 13: Review Triage & Priority Engine ───────────────────────────

  static showReviews(req, res) {
    const { priority, status } = req.query;
    const reviews = ReviewModel.getAll({
      priority: priority || null,
      status:   status   || null
    });
    const stats = ReviewModel.getStats();

    res.render('admin/reviews', {
      title:   'Review Triage — NAFAS',
      reviews, stats,
      filter:  { priority: priority || '', status: status || '' },
      user:    req.session.user
    });
  }

  static updateReviewStatus(req, res) {
    const { reviewId, status } = req.body;
    ReviewModel.updateStatus(parseInt(reviewId), status);
    req.flash('success', `Review #${reviewId} marked as "${status}".`);
    res.redirect('/admin/reviews');
  }

  // ─── Feature 14: Entity Uptime Scoring Scoreboard ──────────────────────────

  static showUptimeScores(req, res) {
    const { pumps, refineries } = ComplianceModel.getUptimeScoreboard();
    const threshold             = ComplianceModel.TRUST_SCORE_THRESHOLD;

    res.render('admin/uptime-scores', {
      title: 'Uptime & Trust Scores — NAFAS',
      pumps, refineries, threshold,
      user: req.session.user
    });
  }

  // ─── Feature 15: Compliance / Automated Investigation Orders ───────────────

  static showCompliance(req, res) {
    const statusFilter = req.query.status || '';
    const allTickets   = ComplianceModel.getAll();
    const filtered     = statusFilter
      ? ComplianceModel.getAll({ status: statusFilter })
      : allTickets;

    const stats = {
      open:          allTickets.filter(t => t.status === 'open').length,
      investigating: allTickets.filter(t => t.status === 'investigating').length,
      resolved:      allTickets.filter(t => t.status === 'resolved').length,
      critical:      allTickets.filter(t => t.severity === 'Critical').length
    };

    res.render('admin/compliance', {
      title: 'Investigation Orders — NAFAS',
      tickets: filtered, stats, statusFilter,
      user: req.session.user
    });
  }

  static updateTicketStatus(req, res) {
    const { ticketId, status } = req.body;
    ComplianceModel.updateStatus(parseInt(ticketId), status);
    req.flash('success', `Investigation order #${ticketId} updated to "${status}".`);
    res.redirect('/admin/compliance');
  }

  /** Manual trigger: runs the cron logic immediately */
  static triggerComplianceCheck(req, res) {
    const result = ComplianceCron.runManually();
    req.flash('info', `✅ Manual compliance check run at ${result.timestamp}`);
    res.redirect('/admin/compliance');
  }
}

module.exports = AdminController;
