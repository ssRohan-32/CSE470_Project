/**
 * services/DiscrepancyService.js
 * Module 4: Feature 12 — Automated Discrepancy Algorithm
 *
 * HIGH CYCLOMATIC COMPLEXITY — takes bulk daily data of "invoiced deliveries"
 * vs "recorded consumer sales" and runs multi-branch mathematical analysis
 * to flag anomalies, leaks, or losses.
 *
 * Cyclomatic complexity: ~12 (5 classification branches + pattern/aggregate checks)
 */

const { getDb } = require('../config/database');

class DiscrepancyService {
  // Classification thresholds
  static ACCEPTABLE_LOSS_PCT = 0.05;  // 5%  — tolerable
  static WARNING_LOSS_PCT    = 0.10;  // 10% — warning
  static CRITICAL_LOSS_PCT   = 0.20;  // 20% — critical / leak suspected
  static MIN_ABSOLUTE_LOSS   = 50;    // litres — ignore noise below this

  /**
   * Main analysis function — HIGH CYCLOMATIC COMPLEXITY
   * Runs 5-branch severity classification on each delivery log entry,
   * then computes system-level pattern and aggregate alerts.
   *
   * @param {number} pumpId
   * @param {number} days - rolling window to analyze
   * @returns {{ logs, summary, alerts }}
   */
  static analyzeDiscrepancies(pumpId, days = 30) {
    const logs = getDb().prepare(`
      SELECT * FROM delivery_logs
      WHERE pump_id = ? AND log_date >= DATE('now', '-' || ? || ' days')
      ORDER BY log_date DESC
    `).all(pumpId, days);

    if (!logs.length) return { logs: [], summary: null, alerts: [] };

    const alerts = [];
    const processedLogs = [];
    let totalInvoiced = 0, totalSales = 0;
    let criticalCount = 0, warningCount = 0;
    let consecutiveAnomalies = 0, maxConsecutive = 0;

    for (const log of logs) {
      const discrepancy    = log.invoiced_quantity - log.recorded_sales;
      const discrepancyPct = log.invoiced_quantity > 0 ? discrepancy / log.invoiced_quantity : 0;

      totalInvoiced += log.invoiced_quantity;
      totalSales    += log.recorded_sales;

      let severity = 'OK', status = 'normal', recommendation = null;

      // Branch 1: Negative discrepancy — more sold than invoiced
      if (discrepancy < 0) {
        severity       = 'ANOMALY';
        status         = 'over_sell';
        recommendation = 'Possible meter tampering or unrecorded deliveries. Audit immediately.';
        consecutiveAnomalies++;
      }
      // Branch 2: Critical loss (>20%)
      else if (discrepancyPct > DiscrepancyService.CRITICAL_LOSS_PCT && discrepancy > DiscrepancyService.MIN_ABSOLUTE_LOSS) {
        severity       = 'CRITICAL';
        status         = 'critical_loss';
        recommendation = 'Severe loss detected. Check for tank leaks, theft, or meter malfunction.';
        criticalCount++;
        consecutiveAnomalies++;
      }
      // Branch 3: Warning level (>10%)
      else if (discrepancyPct > DiscrepancyService.WARNING_LOSS_PCT && discrepancy > DiscrepancyService.MIN_ABSOLUTE_LOSS) {
        severity       = 'WARNING';
        status         = 'high_loss';
        recommendation = 'Above-average loss. Inspect pump calibration and delivery records.';
        warningCount++;
        consecutiveAnomalies++;
      }
      // Branch 4: Caution — minor loss within tolerance boundary
      else if (discrepancyPct > DiscrepancyService.ACCEPTABLE_LOSS_PCT && discrepancy > DiscrepancyService.MIN_ABSOLUTE_LOSS) {
        severity       = 'CAUTION';
        status         = 'minor_loss';
        recommendation = 'Slight loss above tolerance. Monitor closely.';
        consecutiveAnomalies = 0;
      }
      // Branch 5: Acceptable — reset consecutive counter
      else {
        consecutiveAnomalies = 0;
      }

      if (consecutiveAnomalies > maxConsecutive) maxConsecutive = consecutiveAnomalies;

      processedLogs.push({
        ...log,
        discrepancy:    +discrepancy.toFixed(2),
        discrepancyPct: +(discrepancyPct * 100).toFixed(2),
        severity, status, recommendation
      });
    }

    // System-level alerts
    const totalDiscrepancy    = totalInvoiced - totalSales;
    const totalDiscrepancyPct = totalInvoiced > 0 ? (totalDiscrepancy / totalInvoiced) * 100 : 0;

    if (criticalCount >= 3) {
      alerts.push({ type: 'CRITICAL', message: `${criticalCount} critical loss events in ${days} days — immediate inspection required.` });
    }
    if (maxConsecutive >= 5) {
      alerts.push({ type: 'PATTERN', message: `${maxConsecutive} consecutive anomalies detected — systematic issue suspected.` });
    }
    if (totalDiscrepancyPct > 8) {
      alerts.push({ type: 'AGGREGATE', message: `Aggregate loss of ${totalDiscrepancyPct.toFixed(1)}% over ${days} days exceeds acceptable threshold.` });
    }

    return {
      logs: processedLogs,
      summary: {
        totalInvoiced:            +totalInvoiced.toFixed(2),
        totalSales:               +totalSales.toFixed(2),
        totalDiscrepancy:         +totalDiscrepancy.toFixed(2),
        totalDiscrepancyPct:      +totalDiscrepancyPct.toFixed(2),
        criticalCount,
        warningCount,
        maxConsecutiveAnomalies:  maxConsecutive,
        analyzedDays:             logs.length
      },
      alerts
    };
  }

  /** Save a daily delivery log entry */
  static logDelivery({ pump_id, fuel_type, invoiced_quantity, recorded_sales, log_date }) {
    const discrepancy = invoiced_quantity - recorded_sales;
    const anomaly     = Math.abs(discrepancy / invoiced_quantity) > DiscrepancyService.WARNING_LOSS_PCT;
    return getDb().prepare(`
      INSERT INTO delivery_logs (pump_id, fuel_type, invoiced_quantity, recorded_sales, discrepancy, anomaly_flag, log_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(pump_id, fuel_type, invoiced_quantity, recorded_sales, discrepancy, anomaly ? 1 : 0,
           log_date || new Date().toISOString().split('T')[0]);
  }
}

module.exports = DiscrepancyService;
