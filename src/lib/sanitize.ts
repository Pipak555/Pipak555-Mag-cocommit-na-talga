/**
 * Input sanitization utilities
 * Prevents XSS attacks and ensures data integrity
 */

/**
 * Sanitize string input by removing potentially dangerous characters
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers (onclick, onerror, etc.)
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove data: protocol (can be used for XSS)
    .replace(/data:text\/html/gi, '')
    // Remove null bytes
    .replace(/\0/g, '');
};

/**
 * Sanitize email input
 * @param email - Email to sanitize
 * @returns Sanitized email
 */
export const sanitizeEmail = (email: string): string => {
  if (typeof email !== 'string') {
    return '';
  }

  return email
    .trim()
    .toLowerCase()
    // Remove any characters that aren't valid in email
    .replace(/[^a-z0-9@._-]/g, '');
};

/**
 * Sanitize number input
 * @param input - Number or string to sanitize
 * @returns Sanitized number or 0 if invalid
 */
export const sanitizeNumber = (input: string | number): number => {
  if (typeof input === 'number') {
    return isNaN(input) ? 0 : input;
  }

  if (typeof input !== 'string') {
    return 0;
  }

  const cleaned = input.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  
  return isNaN(num) ? 0 : num;
};

/**
 * Sanitize URL input
 * @param url - URL to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export const sanitizeUrl = (url: string): string => {
  if (typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim();
  
  // Only allow http, https, and relative URLs
  if (!trimmed.match(/^(https?:\/\/|\/)/i)) {
    return '';
  }

  // Remove javascript: and data: protocols
  return trimmed.replace(/^(javascript|data):/gi, '');
};

/**
 * Sanitize object recursively
 * @param obj - Object to sanitize
 * @returns Sanitized object
 */
export const sanitizeObject = <T extends Record<string, any>>(obj: T): T => {
  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key]) as T[Extract<keyof T, string>];
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null && !Array.isArray(sanitized[key])) {
      sanitized[key] = sanitizeObject(sanitized[key]) as T[Extract<keyof T, string>];
    } else if (Array.isArray(sanitized[key])) {
      sanitized[key] = sanitized[key].map((item: any) => 
        typeof item === 'string' ? sanitizeString(item) : item
      ) as T[Extract<keyof T, string>];
    }
  }

  return sanitized;
};

