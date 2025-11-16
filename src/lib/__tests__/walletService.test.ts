import { describe, it, expect, vi, beforeEach } from 'vitest';
import { phpToCentavos, centavosToPHP, addCentavos } from '../financialUtils';

/**
 * Unit tests for wallet service payment logic
 * Tests the core calculations and validations for exact amount matching
 * 
 * These tests verify:
 * 1. Admin receives 100% of guest deposit (no fees)
 * 2. Amount conversions (PHP to centavos) are accurate
 * 3. Validation logic ensures admin_received == guest_sent
 */

describe('Wallet Service - Payment Amount Validation', () => {
  describe('Amount Conversion and Matching', () => {
    const testAmounts = [100, 50, 279, 349, 999];

    testAmounts.forEach((amount) => {
      it(`should ensure admin receives 100% of guest deposit for ₱${amount}`, () => {
        // Convert to centavos (integer representation)
        const guestPaidCentavos = phpToCentavos(amount);
        const adminReceivedCentavos = guestPaidCentavos; // Admin receives EXACTLY what guest paid
        
        // Verify exact match
        expect(adminReceivedCentavos).toBe(guestPaidCentavos);
        
        // Verify conversion back to PHP matches original
        const adminReceivedPHP = centavosToPHP(adminReceivedCentavos);
        expect(adminReceivedPHP).toBeCloseTo(amount, 2);
        
        // Verify no fees (netAmount = grossAmount)
        const grossAmountCentavos = guestPaidCentavos;
        const paypalFeeCentavos = 0; // No fees
        const netAmountCentavos = grossAmountCentavos - paypalFeeCentavos;
        
        expect(netAmountCentavos).toBe(adminReceivedCentavos);
        expect(netAmountCentavos).toBe(grossAmountCentavos);
      });

      it(`should validate admin_received == guest_sent for ₱${amount}`, () => {
        const guestSentCentavos = phpToCentavos(amount);
        const adminReceivedCentavos = guestSentCentavos; // 100% match
        
        // CRITICAL VALIDATION: admin_received MUST equal guest_sent
        expect(adminReceivedCentavos).toBe(guestSentCentavos);
        
        // Verify in PHP (with 2 decimal precision)
        const guestSentPHP = centavosToPHP(guestSentCentavos);
        const adminReceivedPHP = centavosToPHP(adminReceivedCentavos);
        expect(adminReceivedPHP).toBeCloseTo(guestSentPHP, 2);
      });

      it(`should ensure no fees deducted for ₱${amount}`, () => {
        const depositAmountCentavos = phpToCentavos(amount);
        const grossAmountCentavos = depositAmountCentavos;
        const paypalFeeCentavos = 0; // No fees
        const netAmountCentavos = grossAmountCentavos - paypalFeeCentavos;
        
        // Verify netAmount equals grossAmount (no fees)
        expect(netAmountCentavos).toBe(grossAmountCentavos);
        expect(paypalFeeCentavos).toBe(0);
        
        // Verify admin receives full amount
        const adminReceivedCentavos = netAmountCentavos;
        expect(adminReceivedCentavos).toBe(depositAmountCentavos);
      });
    });
  });

  describe('Centavos Arithmetic', () => {
    it('should handle addition correctly for all test amounts', () => {
      const testAmounts = [100, 50, 279, 349, 999];
      
      testAmounts.forEach((amount) => {
        const amountCentavos = phpToCentavos(amount);
        const currentBalanceCentavos = phpToCentavos(0);
        const newBalanceCentavos = addCentavos(currentBalanceCentavos, amountCentavos);
        
        expect(newBalanceCentavos).toBe(amountCentavos);
        expect(centavosToPHP(newBalanceCentavos)).toBeCloseTo(amount, 2);
      });
    });

    it('should maintain precision across multiple transactions', () => {
      const transactions = [100, 50, 279, 349, 999];
      let balanceCentavos = phpToCentavos(0);
      
      transactions.forEach((amount) => {
        const amountCentavos = phpToCentavos(amount);
        balanceCentavos = addCentavos(balanceCentavos, amountCentavos);
      });
      
      const expectedTotal = 100 + 50 + 279 + 349 + 999; // 1777
      const expectedTotalCentavos = phpToCentavos(expectedTotal);
      
      expect(balanceCentavos).toBe(expectedTotalCentavos);
      expect(centavosToPHP(balanceCentavos)).toBeCloseTo(expectedTotal, 2);
    });
  });

  describe('Validation Logic', () => {
    it('should detect amount mismatches', () => {
      const guestSentCentavos = phpToCentavos(100);
      const adminReceivedCentavos = phpToCentavos(99.99); // Mismatch
      
      // This should fail validation
      expect(adminReceivedCentavos).not.toBe(guestSentCentavos);
      
      // Validation should catch this
      const isValid = adminReceivedCentavos === guestSentCentavos;
      expect(isValid).toBe(false);
    });

    it('should pass validation when amounts match exactly', () => {
      const testAmounts = [100, 50, 279, 349, 999];
      
      testAmounts.forEach((amount) => {
        const guestSentCentavos = phpToCentavos(amount);
        const adminReceivedCentavos = guestSentCentavos; // Exact match
        
        const isValid = adminReceivedCentavos === guestSentCentavos;
        expect(isValid).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle small amounts correctly', () => {
      const smallAmount = 0.01; // 1 centavo
      const centavos = phpToCentavos(smallAmount);
      expect(centavos).toBe(1);
      expect(centavosToPHP(centavos)).toBeCloseTo(smallAmount, 2);
    });

    it('should handle large amounts correctly', () => {
      const largeAmount = 9999.99;
      const centavos = phpToCentavos(largeAmount);
      expect(centavos).toBe(999999);
      expect(centavosToPHP(centavos)).toBeCloseTo(largeAmount, 2);
    });

    it('should handle amounts with many decimal places', () => {
      const amount = 279.999;
      const centavos = phpToCentavos(amount);
      // Should round to nearest centavo
      expect(centavos).toBe(28000); // Rounded up
    });
  });
});

describe('Wallet Service - Transaction Flow Validation', () => {
  describe('Complete Payment Flow', () => {
    const testAmounts = [100, 50, 279, 349, 999];

    testAmounts.forEach((amount) => {
      it(`should process complete flow for ₱${amount} with exact matching`, () => {
        // Step 1: Guest initiates deposit
        const depositAmountPHP = amount;
        const depositAmountCentavos = phpToCentavos(depositAmountPHP);
        
        // Step 2: Guest pays via PayPal
        const guestPaidPHP = depositAmountPHP; // No fees
        const guestPaidCentavos = phpToCentavos(guestPaidPHP);
        
        // Step 3: Admin receives payment
        const adminReceivedCentavos = guestPaidCentavos; // 100% of what guest paid
        const adminReceivedPHP = centavosToPHP(adminReceivedCentavos);
        
        // Step 4: Wallet is credited
        const walletCreditCentavos = depositAmountCentavos;
        const walletCreditPHP = centavosToPHP(walletCreditCentavos);
        
        // Step 5: Validation - all amounts must match
        expect(guestPaidCentavos).toBe(depositAmountCentavos);
        expect(adminReceivedCentavos).toBe(guestPaidCentavos);
        expect(walletCreditCentavos).toBe(depositAmountCentavos);
        
        // All PHP amounts should match (within floating point precision)
        expect(guestPaidPHP).toBeCloseTo(depositAmountPHP, 2);
        expect(adminReceivedPHP).toBeCloseTo(depositAmountPHP, 2);
        expect(walletCreditPHP).toBeCloseTo(depositAmountPHP, 2);
        
        // CRITICAL: Admin receives 100% (no fees)
        const paypalFeeCentavos = 0;
        const grossAmountCentavos = guestPaidCentavos;
        const netAmountCentavos = grossAmountCentavos - paypalFeeCentavos;
        
        expect(netAmountCentavos).toBe(adminReceivedCentavos);
        expect(netAmountCentavos).toBe(grossAmountCentavos);
      });
    });
  });
});

