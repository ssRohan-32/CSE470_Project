/**
 * services/PaymentAdapter.js
 * ADAPTER PATTERN — Feature 6: Software Payment Gateway Integration
 *
 * Implements the Adapter Design Pattern to standardize various third-party
 * payment APIs (bKash, Bank API, Cash) into a single unified PaymentAdapter interface.
 */

// ─── Concrete Payment Adapters (Third-Party API simulators) ─────────────────

class BkashAPI {
  /** Simulates bKash payment API (proprietary interface) */
  async sendPayment(phoneNumber, taka, orderId) {
    await new Promise(resolve => setTimeout(resolve, 50)); // simulate network
    const success = Math.random() > 0.05; // 95% success rate
    return {
      bkash_trxID: `BK${Date.now()}`,
      status: success ? 'SUCCESS' : 'FAILED',
      amount: taka,
      msisdn: phoneNumber,
      refOrderID: orderId
    };
  }
}

class BankAPI {
  /** Simulates Bank Transfer API (different interface) */
  async initiateTransfer(accountNo, amount, reference, currency = 'BDT') {
    await new Promise(resolve => setTimeout(resolve, 80));
    const success = Math.random() > 0.03; // 97% success rate
    return {
      transfer_id: `BNK${Date.now()}`,
      result_code: success ? '0000' : '9999',
      result_message: success ? 'Transfer Successful' : 'Transfer Failed',
      debit_amount: amount,
      ref: reference
    };
  }
}

class WalletAPI {
  /** Internal wallet system (direct deduction) */
  deductBalance(userId, amount) {
    // Direct — no external network call needed
    return {
      wallet_txn: `WLT${Date.now()}`,
      status: 'INSTANT_DEBIT',
      amount,
      userId
    };
  }
}

// ─── Unified Payment Interface (The Adapter) ─────────────────────────────────

class PaymentAdapter {
  /**
   * Unified method — adapts all payment gateway responses into one standard format.
   *
   * @param {string} method - 'bKash' | 'bank' | 'wallet'
   * @param {Object} details - { userId, amount, reference, phone?, accountNo? }
   * @returns {{ success, transactionId, method, amount, message }}
   */
  static async processPayment(method, details) {
    const { userId, amount, reference, phone, accountNo } = details;
    let rawResponse;

    try {
      switch (method) {
        case 'bKash': {
          const api = new BkashAPI();
          rawResponse = await api.sendPayment(phone || '01700000000', amount, reference);
          return {
            success: rawResponse.status === 'SUCCESS',
            transactionId: rawResponse.bkash_trxID,
            method: 'bKash',
            amount,
            message: rawResponse.status === 'SUCCESS'
              ? `bKash payment confirmed (TxID: ${rawResponse.bkash_trxID})`
              : 'bKash payment failed. Please retry.'
          };
        }

        case 'bank': {
          const api = new BankAPI();
          rawResponse = await api.initiateTransfer(accountNo || '000000000', amount, reference);
          return {
            success: rawResponse.result_code === '0000',
            transactionId: rawResponse.transfer_id,
            method: 'bank',
            amount,
            message: rawResponse.result_code === '0000'
              ? `Bank transfer successful (ID: ${rawResponse.transfer_id})`
              : `Bank transfer failed: ${rawResponse.result_message}`
          };
        }

        case 'wallet': {
          const api = new WalletAPI();
          rawResponse = api.deductBalance(userId, amount);
          return {
            success: true,
            transactionId: rawResponse.wallet_txn,
            method: 'wallet',
            amount,
            message: `Wallet payment deducted instantly (Ref: ${rawResponse.wallet_txn})`
          };
        }

        default:
          throw new Error(`Unsupported payment method: ${method}`);
      }
    } catch (err) {
      return {
        success: false,
        transactionId: null,
        method,
        amount,
        message: `Payment error: ${err.message}`
      };
    }
  }

  static getSupportedMethods() {
    return [
      { id: 'wallet', name: 'Digital Wallet',    icon: '💳', loyaltyBonus: true },
      { id: 'bKash',  name: 'bKash Mobile Money', icon: '📱', loyaltyBonus: false },
      { id: 'bank',   name: 'Bank Transfer',       icon: '🏦', loyaltyBonus: false },
    ];
  }
}

module.exports = PaymentAdapter;
