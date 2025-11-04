/**
 * Currency utilities for Philippine Peso (PHP)
 */

export const CURRENCY_CODE = 'PHP';
export const CURRENCY_SYMBOL = '₱';

/**
 * Format amount as Philippine Peso
 * @param amount - The amount to format
 * @param showSymbol - Whether to show the currency symbol (default: true)
 * @returns Formatted currency string (e.g., "₱1,234.56")
 */
export const formatCurrency = (amount: number, showSymbol: boolean = true): string => {
  const formatted = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  // If showSymbol is false, remove the currency symbol
  if (!showSymbol) {
    return formatted.replace(/[₱\s]/g, '');
  }

  return formatted;
};

/**
 * Format amount as simple PHP string without currency formatting
 * @param amount - The amount to format
 * @returns Formatted string (e.g., "₱1,234.56")
 */
export const formatPHP = (amount: number): string => {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Parse currency string to number
 * @param currencyString - Currency string to parse
 * @returns Parsed number
 */
export const parseCurrency = (currencyString: string): number => {
  // Remove currency symbols and spaces, then parse
  const cleaned = currencyString.replace(/[₱$,\s]/g, '');
  return parseFloat(cleaned) || 0;
};

