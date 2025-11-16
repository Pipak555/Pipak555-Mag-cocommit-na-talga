/**
 * Financial Utilities - Safe Arithmetic for Money
 * 
 * CRITICAL: All money is stored in Firestore as INTEGER CENTAVOS (not floats).
 * This ensures 100% accuracy and eliminates floating-point rounding errors.
 * 
 * Examples:
 * - User sees: ₱9,999.00
 * - Firestore stores: 999900 (integer centavos)
 * - User sees: ₱1.00
 * - Firestore stores: 100 (integer centavos)
 */

/**
 * Convert PHP to integer centavos (for Firestore storage)
 * @param php - Amount in PHP (e.g., 9.99)
 * @returns Amount in centavos (e.g., 999)
 */
export const phpToCentavos = (php: number): number => {
  // Round to nearest centavo to handle any floating-point input
  return Math.round(php * 100);
};

/**
 * Convert integer centavos to PHP (for display)
 * @param centavos - Amount in centavos (e.g., 999)
 * @returns Amount in PHP (e.g., 9.99)
 */
export const centavosToPHP = (centavos: number): number => {
  // Convert integer centavos to PHP (always accurate)
  return centavos / 100;
};

/**
 * Convert dollars to integer cents (legacy - use phpToCentavos)
 * @deprecated Use phpToCentavos instead
 */
export const dollarsToCents = (dollars: number): number => {
  return phpToCentavos(dollars);
};

/**
 * Convert integer cents to dollars (legacy - use centavosToPHP)
 * @deprecated Use centavosToPHP instead
 */
export const centsToDollars = (cents: number): number => {
  return centavosToPHP(cents);
};

/**
 * Add two amounts in centavos (for Firestore operations)
 * @param centavos1 - First amount in centavos (integer)
 * @param centavos2 - Second amount in centavos (integer)
 * @returns Sum in centavos (integer)
 */
export const addCentavos = (centavos1: number, centavos2: number): number => {
  return centavos1 + centavos2;
};

/**
 * Subtract two amounts in centavos (for Firestore operations)
 * @param centavos1 - First amount in centavos (integer, minuend)
 * @param centavos2 - Second amount in centavos (integer, subtrahend)
 * @returns Difference in centavos (integer)
 */
export const subtractCentavos = (centavos1: number, centavos2: number): number => {
  return centavos1 - centavos2;
};

/**
 * Safely add two monetary amounts (PHP input/output - for UI calculations)
 * @param amount1 - First amount in PHP
 * @param amount2 - Second amount in PHP
 * @returns Sum in PHP (accurate to 2 decimal places)
 */
export const addMoney = (amount1: number, amount2: number): number => {
  const centavos1 = phpToCentavos(amount1);
  const centavos2 = phpToCentavos(amount2);
  const sumCentavos = centavos1 + centavos2;
  return centavosToPHP(sumCentavos);
};

/**
 * Safely subtract two monetary amounts (PHP input/output - for UI calculations)
 * @param amount1 - First amount in PHP (minuend)
 * @param amount2 - Second amount in PHP (subtrahend)
 * @returns Difference in PHP (accurate to 2 decimal places)
 */
export const subtractMoney = (amount1: number, amount2: number): number => {
  const centavos1 = phpToCentavos(amount1);
  const centavos2 = phpToCentavos(amount2);
  const diffCentavos = centavos1 - centavos2;
  return centavosToPHP(diffCentavos);
};

/**
 * Safely multiply a monetary amount by a factor (PHP input/output)
 * @param amount - Amount in PHP
 * @param factor - Multiplication factor (can be decimal)
 * @returns Product in PHP (accurate to 2 decimal places)
 */
export const multiplyMoney = (amount: number, factor: number): number => {
  const centavos = phpToCentavos(amount);
  const productCentavos = Math.round(centavos * factor);
  return centavosToPHP(productCentavos);
};

/**
 * Safely round a monetary amount to 2 decimal places (PHP input/output)
 * @param amount - Amount in PHP
 * @returns Rounded amount in PHP
 */
export const roundMoney = (amount: number): number => {
  return centavosToPHP(phpToCentavos(amount));
};

/**
 * Compare two amounts in centavos (for Firestore operations)
 * @param centavos1 - First amount in centavos (integer)
 * @param centavos2 - Second amount in centavos (integer)
 * @returns -1 if centavos1 < centavos2, 0 if equal, 1 if centavos1 > centavos2
 */
export const compareCentavos = (centavos1: number, centavos2: number): number => {
  if (centavos1 < centavos2) return -1;
  if (centavos1 > centavos2) return 1;
  return 0;
};

/**
 * Compare two monetary amounts (PHP input - for UI comparisons)
 * @param amount1 - First amount in PHP
 * @param amount2 - Second amount in PHP
 * @returns -1 if amount1 < amount2, 0 if equal, 1 if amount1 > amount2
 */
export const compareMoney = (amount1: number, amount2: number): number => {
  const centavos1 = phpToCentavos(amount1);
  const centavos2 = phpToCentavos(amount2);
  return compareCentavos(centavos1, centavos2);
};

/**
 * Check if centavos1 is less than centavos2 (for Firestore operations)
 */
export const isLessThanCentavos = (centavos1: number, centavos2: number): boolean => {
  return compareCentavos(centavos1, centavos2) < 0;
};

/**
 * Check if amount1 is less than amount2 (PHP input - for UI comparisons)
 */
export const isLessThan = (amount1: number, amount2: number): boolean => {
  return compareMoney(amount1, amount2) < 0;
};

/**
 * Check if amount1 is greater than amount2 (PHP input - for UI comparisons)
 */
export const isGreaterThan = (amount1: number, amount2: number): boolean => {
  return compareMoney(amount1, amount2) > 0;
};

/**
 * Check if amount1 equals amount2 (PHP input - for UI comparisons)
 */
export const isEqual = (amount1: number, amount2: number): boolean => {
  return compareMoney(amount1, amount2) === 0;
};

/**
 * Get the maximum of two monetary amounts (PHP input/output)
 */
export const maxMoney = (amount1: number, amount2: number): number => {
  return isGreaterThan(amount1, amount2) ? amount1 : amount2;
};

/**
 * Get the minimum of two monetary amounts (PHP input/output)
 */
export const minMoney = (amount1: number, amount2: number): number => {
  return isLessThan(amount1, amount2) ? amount1 : amount2;
};

/**
 * Helper function to read wallet balance from Firestore
 * Handles both old format (float PHP) and new format (integer centavos)
 * @param walletBalance - Value from Firestore (could be float or int)
 * @returns Balance in PHP (for display/UI)
 */
export const readWalletBalance = (walletBalance: any): number => {
  if (walletBalance === null || walletBalance === undefined) {
    return 0;
  }
  
  // If it's already an integer >= 100, assume it's in centavos (new format)
  // If it's a float or small integer, assume it's in PHP (old format)
  if (Number.isInteger(walletBalance) && walletBalance >= 100) {
    // New format: integer centavos
    return centavosToPHP(walletBalance);
  } else {
    // Old format: float PHP - convert to centavos and back to normalize
    return roundMoney(Number(walletBalance));
  }
};

/**
 * Helper function to get wallet balance in centavos from Firestore
 * Handles both old format (float PHP) and new format (integer centavos)
 * @param walletBalance - Value from Firestore (could be float or int)
 * @returns Balance in centavos (integer)
 */
export const readWalletBalanceCentavos = (walletBalance: any): number => {
  if (walletBalance === null || walletBalance === undefined) {
    return 0;
  }
  
  // If it's already an integer >= 100, assume it's in centavos (new format)
  if (Number.isInteger(walletBalance) && walletBalance >= 100) {
    return walletBalance;
  } else {
    // Old format: float PHP - convert to centavos
    return phpToCentavos(Number(walletBalance));
  }
};

/**
 * Helper function to read transaction amount from Firestore
 * Handles both old format (float PHP) and new format (integer centavos)
 * @param transactionAmount - Value from Firestore transaction.amount (could be float or int)
 * @returns Amount in PHP (for display/UI)
 */
export const readTransactionAmount = (transactionAmount: any): number => {
  if (transactionAmount === null || transactionAmount === undefined) {
    return 0;
  }
  
  // If it's already an integer >= 100, assume it's in centavos (new format)
  // If it's a float or small integer, assume it's in PHP (old format)
  if (Number.isInteger(transactionAmount) && transactionAmount >= 100) {
    // New format: integer centavos
    return centavosToPHP(transactionAmount);
  } else {
    // Old format: float PHP - return as is (already in PHP)
    return roundMoney(Number(transactionAmount));
  }
};

/**
 * Calculate PayPal payout fee for a given amount
 * 
 * PayPal Payout fees for Philippines (domestic):
 * - 2% of payout amount
 * - Minimum: ₱15 PHP
 * - Maximum: ₱500 PHP
 * 
 * @param payoutAmount - Amount to be paid out in PHP
 * @returns Fee amount in PHP
 */
export const calculatePayPalPayoutFee = (payoutAmount: number): number => {
  const FEE_PERCENTAGE = 0.02; // 2%
  const MIN_FEE = 15; // ₱15 PHP
  const MAX_FEE = 500; // ₱500 PHP
  
  // Calculate percentage-based fee
  const percentageFee = payoutAmount * FEE_PERCENTAGE;
  
  // Apply min/max constraints
  const fee = Math.max(MIN_FEE, Math.min(MAX_FEE, percentageFee));
  
  // Round to 2 decimal places
  return roundMoney(fee);
};

/**
 * Calculate the total amount needed (withdrawal + fees) if guest pays fees
 * 
 * @param withdrawalAmount - Amount guest wants to receive in PHP
 * @returns Total amount to deduct from wallet (withdrawal + fees) in PHP
 */
export const calculateWithdrawalWithFees = (withdrawalAmount: number): number => {
  const fee = calculatePayPalPayoutFee(withdrawalAmount);
  return addMoney(withdrawalAmount, fee);
};

/**
 * Calculate the amount guest will receive after fees are deducted
 * 
 * @param withdrawalAmount - Amount guest wants to withdraw in PHP
 * @param fee - Fee amount in PHP
 * @returns Amount guest will receive after fees in PHP
 */
export const calculateAmountAfterFees = (withdrawalAmount: number, fee: number): number => {
  return subtractMoney(withdrawalAmount, fee);
};

