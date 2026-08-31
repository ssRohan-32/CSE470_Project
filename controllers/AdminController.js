/**
 * controllers/AdminController.js
 * Module 1: Feature 17 — Global Transaction Ledger [Singleton Pattern]
 * Module 3: Feature 13 — Review Triage & Priority Engine
 *           Feature 14 — Entity Uptime Scoring (trust score scoreboard)
 *           Feature 15 — Automated Compliance / Investigation Orders
 * Module 4: Feature 15 — System-Wide Oversight Console
 *           Feature 16 — Market Demographics Research Engine
 */

const LedgerManager    = require('../services/LedgerSingleton');
const ReviewModel      = require('../models/ReviewModel');
const ComplianceModel  = require('../models/ComplianceModel');
const ComplianceCron   = require('../services/ComplianceCron');
const TransactionModel = require('../models/TransactionModel');
const UserModel        = require('../models/UserModel');
const { getDb }        = require('../config/database');

class AdminController {

  // ─── Feature 15 (M4): System-Wide Oversight Console ────────────────────────

  static showConsole(req, res) {
    const roleCounts      = UserModel.countByRole();
    const systemStats     = TransactionModel.getSystemStats();
    const revenueTrend    = TransactionModel.getRevenueTrend();
    const fuelBreakdown   = TransactionModel.getFuelBreakdown();
    const recentTxs       = TransactionModel.getAllRecent(10);
    const complianceAlerts = ComplianceModel.getAll({ status: 'open' });

    const pumpsData = getDb().prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN status = 'active'      THEN 1 ELSE 0 END) as active,
             SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
      FROM pumps
    `).get();

    const refineriesData = getDb().prepare('SELECT COUNT(*) as total FROM refineries').get();

    res.render('admin/console', {
      title: 'Oversight Console — NAFAS',
      roleCounts, systemStats,
      revenueTrend:   JSON.stringify(revenueTrend.reverse()),
      fuelBreakdown:  JSON.stringify(fuelBreakdown),
      recentTxs, complianceAlerts,
      pumpsData, refineriesData,
      user: req.session.user
    });
  }

  // ─── Feature 16 (M4): Market Demographics Research Engine ──────────────────

  static showDemographics(req, res) {
    const data          = TransactionModel.getDemographicsData();
    const carFuelMatrix = {};
    const ageFuelMatrix = {};

    for (const row of data) {
      if (row.car_brand) {
        if (!carFuelMatrix[row.car_brand]) carFuelMatrix[row.car_brand] = {};
        carFuelMatrix[row.car_brand][row.fuel_type] = (carFuelMatrix[row.car_brand][row.fuel_type] || 0) + row.purchase_count;
      }
      if (row.age_range) {
        if (!ageFuelMatrix[row.age_range]) ageFuelMatrix[row.age_range] = {};
        ageFuelMatrix[row.age_range][row.fuel_type] = (ageFuelMatrix[row.age_range][row.fuel_type] || 0) + row.purchase_count;
      }
    }

    res.render('admin/demographics', {
      title: 'Market Demographics — NAFAS',
      data, carFuelMatrix,
      carFuelMatrixJson: JSON.stringify(carFuelMatrix),
      ageFuelMatrix,
      ageFuelMatrixJson: JSON.stringify(ageFuelMatrix),
      user: req.session.user
    });
  }

  // ─── Feature 17 (M1): Global Transaction Ledger [Singleton] ─────────────────

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

  // ─── Feature 13 (M3): Review Triage & Priority Engine ──────────────────────

  static showReviews(req, res) {
    const { priority, status } = req.query;
    const reviews = ReviewModel.getAll({ priority: priority || null, status: status || null });
    const stats   = ReviewModel.getStats();

    res.render('admin/reviews', {
      title:  'Review Triage — NAFAS',
      reviews, stats,
      filter: { priority: priority || '', status: status || '' },
      user:   req.session.user
    });
  }

  static updateReviewStatus(req, res) {
    const { reviewId, status } = req.body;
    ReviewModel.updateStatus(parseInt(reviewId), status);
    req.flash('success', `Review #${reviewId} marked as "${status}".`);
    res.redirect('/admin/reviews');
  }

  // ─── Feature 14 (M3): Entity Uptime Scoring Scoreboard ─────────────────────

  static showUptimeScores(req, res) {
    const { pumps, refineries } = ComplianceModel.getUptimeScoreboard();
    const threshold             = ComplianceModel.TRUST_SCORE_THRESHOLD;

    res.render('admin/uptime-scores', {
      title: 'Uptime & Trust Scores — NAFAS',
      pumps, refineries, threshold,
      user: req.session.user
    });
  }

  // ─── Feature 15 (M3): Compliance / Automated Investigation Orders ───────────

  static showCompliance(req, res) {
    const statusFilter = req.query.status || '';
    const allTickets   = ComplianceModel.getAll();
    const filtered     = statusFilter ? ComplianceModel.getAll({ status: statusFilter }) : allTickets;

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

  static triggerComplianceCheck(req, res) {
    const result = ComplianceCron.runManually();
    req.flash('info', `✅ Manual compliance check run at ${result.timestamp}`);
    res.redirect('/admin/compliance');
  }
}

module.exports = AdminController;
