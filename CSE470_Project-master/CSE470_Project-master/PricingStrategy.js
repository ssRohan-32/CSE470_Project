/**
 * services/PricingStrategy.js
 * STRATEGY PATTERN — Feature 14: Dynamic Pricing & Tax Engine
 *
 * Allows pump owners to apply different pricing calculation strategies
 * (Standard, Holiday, Surge) and automatically calculates regional taxes.
 */

// ─── Concrete Strategies ──────────────────────────────────────────────────────

class StandardPricingStrategy {
  getName() { return 'Standard'; }
  getDescription() { return 'Base price with standard 15% VAT. No surcharges.' ; }

  calculate(basePrice, quantity, taxRate = 0.15) {
    const subtotal = basePrice * quantity;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    return {
      strategy: 'Standard',
      basePrice,
      quantity,
      subtotal: +subtotal.toFixed(2),
      taxRate,
      taxAmount: +tax.toFixed(2),
      discountAmount: 0,
      finalPrice: +total.toFixed(2),
      breakdown: `Base ৳${basePrice}/L × ${quantity}L + 15% VAT`
    };
  }
}

class HolidayPricingStrategy {
  getName() { return 'Holiday'; }
  getDescription() { return 'Holiday demand multiplier (1.12×) applied on top of base + tax.' ; }

  calculate(basePrice, quantity, taxRate = 0.15, multiplier = 1.12) {
    const adjustedPrice = basePrice * multiplier;
    const subtotal = adjustedPrice * quantity;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    return {
      strategy: 'Holiday',
      basePrice,
      adjustedPrice: +adjustedPrice.toFixed(4),
      quantity,
      multiplier,
      subtotal: +subtotal.toFixed(2),
      taxRate,
      taxAmount: +tax.toFixed(2),
      discountAmount: 0,
      finalPrice: +total.toFixed(2),
      breakdown: `Base ৳${basePrice}/L × ${multiplier}× multiplier × ${quantity}L + ${(taxRate*100).toFixed(0)}% VAT`
    };
  }
}

class SurgePricingStrategy {
  getName() { return 'Surge'; }
  getDescription() { return 'High-demand surge pricing (up to 1.25×) with dynamic tax calculation.'; }

  calculate(basePrice, quantity, taxRate = 0.15, multiplier = 1.25) {
    const adjustedPrice = basePrice * multiplier;
    const subtotal = adjustedPrice * quantity;
    const tax = subtotal * taxRate;
    const surgeFee = subtotal * 0.03; // additional 3% surge fee
    const total = subtotal + tax + surgeFee;
    return {
      strategy: 'Surge',
      basePrice,
      adjustedPrice: +adjustedPrice.toFixed(4),
      quantity,
      multiplier,
      subtotal: +subtotal.toFixed(2),
      taxRate,
      taxAmount: +tax.toFixed(2),
      surgeFee: +surgeFee.toFixed(2),
      discountAmount: 0,
      finalPrice: +total.toFixed(2),
      breakdown: `Base ৳${basePrice}/L × ${multiplier}× surge × ${quantity}L + ${(taxRate*100).toFixed(0)}% VAT + 3% surge fee`
    };
  }
}

// ─── Context (Strategy Selector) ─────────────────────────────────────────────

class PricingContext {
  constructor(strategyName = 'Standard') {
    this.setStrategy(strategyName);
  }

  setStrategy(name) {
    switch (name) {
      case 'Holiday': this._strategy = new HolidayPricingStrategy(); break;
      case 'Surge':   this._strategy = new SurgePricingStrategy(); break;
      default:        this._strategy = new StandardPricingStrategy(); break;
    }
  }

  getStrategy() { return this._strategy; }

  calculate(basePrice, quantity, taxRate, multiplier) {
    return this._strategy.calculate(basePrice, quantity, taxRate, multiplier);
  }

  static getAllStrategies() {
    return [
      new StandardPricingStrategy(),
      new HolidayPricingStrategy(),
      new SurgePricingStrategy(),
    ];
  }
}

module.exports = { PricingContext, StandardPricingStrategy, HolidayPricingStrategy, SurgePricingStrategy };
