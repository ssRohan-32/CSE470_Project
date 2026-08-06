/**
 * controllers/CustomerController.js
 * NAFAS Module 1
 *
 * Feature 5 — Digital Wallet: deposit money, view balance & transactions
 */

const WalletModel  = require('../models/WalletModel');
const LedgerManager = require('../services/LedgerSingleton');

class CustomerController {

  /** Feature 5: Digital Wallet — Show balance & transaction history */
  static showWallet(req, res) {
    const userId       = req.session.user.id;
    const wallet       = WalletModel.getByUserId(userId) || { balance: 0 };
    const transactions = WalletModel.getTransactions(userId, 20);

    res.render('customer/wallet', {
      title: 'My Wallet — NAFAS Module 1',
      wallet,
      transactions,
      user: req.session.user
    });
  }

  /** Feature 5: Deposit money into wallet */
  static depositWallet(req, res) {
    const userId = req.session.user.id;
    const amount = parseFloat(req.body.amount);

    if (!amount || amount <= 0) {
      req.flash('error', 'Please enter a valid deposit amount.');
      return res.redirect('/customer/wallet');
    }

    WalletModel.deposit(userId, amount, 'Top-up via payment gateway');

    // Log to Singleton Ledger (Feature 17)
    LedgerManager.getInstance().log({
      transaction_type: 'wallet_deposit',
      reference_id: null,
      amount,
      description: `Wallet top-up of ৳${amount}`,
      actor_id: userId
    });

    req.flash('success', `৳${amount.toFixed(2)} deposited to your wallet!`);
    res.redirect('/customer/wallet');
  }
}

module.exports = CustomerController;
