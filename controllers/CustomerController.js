/**
 * controllers/CustomerController.js
 * Module 1: Feature 5  — Digital Wallet
 * Module 2: Feature 6  — Payment Gateway [Adapter Pattern]
 * Module 3: Feature 11 — Gamified Loyalty Points Engine
 *           Feature 12 — Anonymous Feedback / Observer Pattern
 */

const WalletModel      = require('../models/WalletModel');
const TransactionModel = require('../models/TransactionModel');
const FuelModel        = require('../models/FuelModel');
const LoyaltyModel     = require('../models/LoyaltyModel');
const ReviewModel      = require('../models/ReviewModel');
const PaymentAdapter   = require('../services/PaymentAdapter');
const { PricingContext } = require('../services/PricingStrategy');
const { feedbackSubject } = require('../services/ObserverService');
const LedgerManager    = require('../services/LedgerSingleton');
const { getDb }        = require('../config/database');

class CustomerController {

  // ─── Feature 5: Digital Wallet ─────────────────────────────────────────────

  static showWallet(req, res) {
    const userId       = req.session.user.id;
    const wallet       = WalletModel.getByUserId(userId) || { balance: 0 };
    const transactions = WalletModel.getTransactions(userId, 20);
    const loyalty      = LoyaltyModel.getByUserId(userId);

    res.render('customer/wallet', {
      title: 'My Wallet — NAFAS',
      wallet, transactions, loyalty,
      user: req.session.user
    });
  }

  static depositWallet(req, res) {
    const userId = req.session.user.id;
    const amount = parseFloat(req.body.amount);
    if (!amount || amount <= 0) {
      req.flash('error', 'Invalid deposit amount.');
      return res.redirect('/customer/wallet');
    }
    WalletModel.deposit(userId, amount, 'Top-up via payment gateway');
    LedgerManager.getInstance().log({
      transaction_type: 'wallet_deposit',
      amount,
      description: `Wallet top-up of ৳${amount}`,
      actor_id: userId
    });
    req.flash('success', `৳${amount.toFixed(2)} deposited to your wallet!`);
    res.redirect('/customer/wallet');
  }

  // ─── Feature 6: Payment Gateway [Adapter Pattern] ──────────────────────────

  static showPayment(req, res) {
    const pumps   = FuelModel.getActivePumpsWithFuel();
    const wallet  = WalletModel.getByUserId(req.session.user.id) || { balance: 0 };
    const methods = PaymentAdapter.getSupportedMethods();

    res.render('customer/payment', {
      title: 'Buy Fuel — NAFAS',
      pumps, wallet, methods,
      strategies: ['Standard', 'Holiday', 'Surge'],
      user: req.session.user,
      result: null
    });
  }

  static async processPayment(req, res) {
    const userId = req.session.user.id;
    const { pump_id, fuel_type, quantity, payment_method, pricing_strategy } = req.body;

    try {
      const inventory = getDb().prepare(
        'SELECT price_per_liter FROM fuel_inventory WHERE pump_id = ? AND fuel_type = ?'
      ).get(pump_id, fuel_type);

      if (!inventory) throw new Error('Fuel type not available at selected pump.');

      const qty      = parseFloat(quantity);
      const ctx      = new PricingContext(pricing_strategy || 'Standard');
      const priceCalc = ctx.calculate(inventory.price_per_liter, qty, 0.15);

      if (payment_method === 'wallet') {
        WalletModel.deduct(userId, priceCalc.finalPrice, `Fuel purchase: ${qty}L ${fuel_type}`);
      }

      const paymentResult = await PaymentAdapter.processPayment(payment_method, {
        userId,
        amount:    priceCalc.finalPrice,
        reference: `FUEL-${Date.now()}`
      });

      if (!paymentResult.success) throw new Error(paymentResult.message);

      // Record transaction
      const txId = TransactionModel.create({
        customer_id:      userId,
        pump_id:          parseInt(pump_id),
        fuel_type,
        quantity:         qty,
        unit_price:       inventory.price_per_liter,
        total_amount:     priceCalc.finalPrice,
        tax_amount:       priceCalc.taxAmount,
        discount_amount:  0,
        payment_method,
        pricing_strategy: pricing_strategy || 'Standard'
      });

      // Feature 11: Award loyalty points
      const loyaltyResult = LoyaltyModel.awardPoints(userId, priceCalc.finalPrice, payment_method);

      // Log to Singleton Ledger (Feature 17)
      LedgerManager.getInstance().log({
        transaction_type: 'fuel_purchase',
        reference_id:     txId,
        amount:           priceCalc.finalPrice,
        description:      `${qty}L ${fuel_type} at pump #${pump_id} via ${payment_method}`,
        actor_id:         userId
      });

      // Deduct inventory
      const stock = getDb().prepare(
        'SELECT quantity FROM fuel_inventory WHERE pump_id = ? AND fuel_type = ?'
      ).get(pump_id, fuel_type);
      if (stock) {
        getDb().prepare('UPDATE fuel_inventory SET quantity = ? WHERE pump_id = ? AND fuel_type = ?')
          .run(Math.max(0, stock.quantity - qty), pump_id, fuel_type);
      }

      req.flash('success', `✅ Payment successful! +${loyaltyResult.pointsEarned} loyalty points earned (${loyaltyResult.tier} tier).`);
      res.redirect('/customer/loyalty');
    } catch (err) {
      req.flash('error', err.message);
      res.redirect('/customer/payment');
    }
  }

  // ─── Feature 11: Loyalty Points & Redemption ───────────────────────────────

  static showLoyalty(req, res) {
    const userId  = req.session.user.id;
    const loyalty = LoyaltyModel.getByUserId(userId);
    const tier    = LoyaltyModel.getTier(loyalty.points);
    const history = LoyaltyModel.getRedemptionHistory(userId);

    res.render('customer/loyalty', {
      title:   'Loyalty Points — NAFAS',
      loyalty, tier, history,
      tiers:   LoyaltyModel.TIERS,
      rewards: LoyaltyModel.REWARDS,
      user:    req.session.user
    });
  }

  static redeemReward(req, res) {
    const { rewardId } = req.body;
    const userId       = req.session.user.id;
    try {
      const result = LoyaltyModel.redeemPoints(userId, rewardId);
      LedgerManager.getInstance().log({
        transaction_type: 'loyalty_redemption',
        reference_id:     null,
        amount:           0,
        description:      `Redeemed: ${result.reward}`,
        actor_id:         userId
      });
      req.flash('success', `🎁 Reward redeemed: ${result.reward}! Remaining points: ${result.remainingPoints}`);
    } catch (err) {
      req.flash('error', err.message);
    }
    res.redirect('/customer/loyalty');
  }

  // ─── Feature 12: Anonymous Feedback [Observer Pattern] ─────────────────────

  static showFeedback(req, res) {
    const pumps = getDb().prepare('SELECT id, name, location FROM pumps WHERE status = ?').all('active');

    res.render('customer/feedback', {
      title: 'Submit Feedback — NAFAS',
      pumps,
      user: req.session.user
    });
  }

  static submitFeedback(req, res) {
    const { target_id, rating, comment } = req.body;
    const reviewer_id = req.session.user.id;

    const result = ReviewModel.create({
      reviewer_id,
      target_type: 'pump',
      target_id:   parseInt(target_id),
      rating:      parseInt(rating),
      comment,
      review_type: 'B2C'
    });

    // Observer Pattern — notifies TrustScoreObserver + SuperadminNotifyObserver
    feedbackSubject.onReviewSubmitted({
      target_type: 'pump',
      target_id:   parseInt(target_id),
      rating:      parseInt(rating),
      priority:    result.priority
    });

    req.flash('success', `Anonymous review submitted! Priority assigned: ${result.priority}`);
    res.redirect('/customer/feedback');
  }
}

module.exports = CustomerController;
