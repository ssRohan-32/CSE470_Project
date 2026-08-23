/**
 * services/ObserverService.js
 * Module 3: Feature 12 — Observer Pattern
 *
 * When a pump or refinery receives multiple negative reviews (High priority),
 * observers are automatically notified WITHOUT polling:
 *   1. TrustScoreObserver   → reduces entity trust score
 *   2. SuperadminNotifyObserver → auto-generates compliance ticket (investigation order)
 */

const ReviewModel    = require('../models/ReviewModel');
const ComplianceModel = require('../models/ComplianceModel');
const { getDb }      = require('../config/database');

// ─── Observer 1: Adjusts entity trust score ───────────────────────────────────

class TrustScoreObserver {
  update(event) {
    const { target_type, target_id, rating } = event;
    const penaltyPerNegative = 3.0;
    // Extra penalty for very bad ratings (1–2 stars)
    const penalty = penaltyPerNegative * (rating <= 2 ? 2 : 1);

    if (target_type === 'pump') {
      const current = getDb().prepare('SELECT trust_score FROM pumps WHERE id = ?').get(target_id);
      if (current) {
        const newScore = Math.max(0, current.trust_score - penalty);
        ComplianceModel.updatePumpTrustScore(target_id, newScore);
        console.log(`   🔔 [Observer] Pump #${target_id} trust: ${current.trust_score.toFixed(1)} → ${newScore.toFixed(1)}`);
      }
    } else if (target_type === 'refinery') {
      const current = getDb().prepare('SELECT trust_score FROM refineries WHERE id = ?').get(target_id);
      if (current) {
        const newScore = Math.max(0, current.trust_score - penalty);
        ComplianceModel.updateRefineryTrustScore(target_id, newScore);
        console.log(`   🔔 [Observer] Refinery #${target_id} trust adjusted to ${newScore.toFixed(1)}`);
      }
    }
  }
}

// ─── Observer 2: Auto-generates compliance ticket at 3+ High-priority reviews ─

class SuperadminNotifyObserver {
  update(event) {
    const { target_type, target_id, negativeCount } = event;
    const THRESHOLD = 3;

    if (negativeCount >= THRESHOLD) {
      const alreadyOpen = ComplianceModel.hasOpenTicket(target_type, target_id);
      if (!alreadyOpen) {
        ComplianceModel.createTicket({
          entity_type:    target_type,
          entity_id:      target_id,
          reason:         `${negativeCount} high-priority reviews received within 7 days — auto-escalated`,
          severity:       negativeCount >= 5 ? 'Critical' : 'High',
          auto_generated: true
        });
        console.log(`   🚨 [Observer] Investigation order auto-generated for ${target_type} #${target_id}`);
      }
    }
  }
}

// ─── Subject: FeedbackSubject (holds the list of observers) ───────────────────

class FeedbackSubject {
  constructor() {
    this._observers = [];
  }

  subscribe(observer) {
    this._observers.push(observer);
  }

  notify(event) {
    for (const observer of this._observers) {
      observer.update(event);
    }
  }

  /**
   * Called immediately after a review is saved to DB.
   * Looks up recent negative review count, then notifies all observers.
   */
  onReviewSubmitted(review) {
    const negativeCount = ReviewModel.getRecentNegativeCount(
      review.target_type,
      review.target_id,
      7 // days window
    );

    this.notify({
      target_type:  review.target_type,
      target_id:    review.target_id,
      rating:       review.rating,
      priority:     review.priority,
      negativeCount
    });
  }
}

// ─── Singleton subject instance — wired up at module load ─────────────────────

const feedbackSubject = new FeedbackSubject();
feedbackSubject.subscribe(new TrustScoreObserver());
feedbackSubject.subscribe(new SuperadminNotifyObserver());

module.exports = { feedbackSubject };
