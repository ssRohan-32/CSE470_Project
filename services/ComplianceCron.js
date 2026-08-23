/**
 * services/ComplianceCron.js
 * Module 3: Feature 14 — Automated Trust Score Accumulation (daily cron)
 *           Feature 15 — Auto-Investigation Order Generation
 *
 * Runs at midnight every day:
 *   1. Increments operational_days for all active pumps and all refineries
 *   2. Finds entities below trust score threshold (< 75)
 *   3. Auto-generates compliance/investigation ticket for each
 */

const cron            = require('node-cron');
const ComplianceModel = require('../models/ComplianceModel');

class ComplianceCron {
  static start() {
    // Schedule: midnight every day  (minute hour day month weekday)
    cron.schedule('0 0 * * *', () => {
      console.log(`\n⏰ [ComplianceCron] Daily check at ${new Date().toISOString()}`);
      ComplianceCron.runDailyCheck();
    });

    console.log('   ✅ Compliance cron scheduled (midnight daily)');
  }

  static runDailyCheck() {
    try {
      // Feature 14: Increment operational days for active entities
      ComplianceModel.incrementOperationalDays();
      console.log('   ✅ [Cron] Operational days incremented');

      // Feature 15: Find entities below trust score threshold
      const entities = ComplianceModel.getEntitiesBelowThreshold();
      console.log(`   📋 [Cron] ${entities.length} entity/entities below threshold`);

      // Auto-generate investigation orders
      for (const entity of entities) {
        const hasOpen = ComplianceModel.hasOpenTicket(entity.type, entity.id);
        if (!hasOpen) {
          const ticketId = ComplianceModel.createTicket({
            entity_type:    entity.type,
            entity_id:      entity.id,
            reason:         `Trust score dropped to ${entity.trust_score.toFixed(1)} — threshold: ${ComplianceModel.TRUST_SCORE_THRESHOLD}`,
            severity:       entity.trust_score < 50 ? 'Critical'
                          : entity.trust_score < 60 ? 'High'
                          : 'Medium',
            auto_generated: true
          });
          console.log(`   🎫 [Cron] Investigation order #${ticketId} for ${entity.type} "${entity.name}"`);
        }
      }

      console.log('   ✅ [Cron] Daily compliance check complete\n');
    } catch (err) {
      console.error('   ❌ [Cron] Error:', err.message);
    }
  }

  /** Manual trigger — callable from admin dashboard */
  static runManually() {
    console.log('\n▶️  [ComplianceCron] Manual trigger activated');
    ComplianceCron.runDailyCheck();
    return { success: true, timestamp: new Date().toISOString() };
  }
}

module.exports = ComplianceCron;
