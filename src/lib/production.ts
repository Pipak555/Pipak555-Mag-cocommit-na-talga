/**
 * Production environment utilities
 * Helps optimize the application in production builds
 */

/**
 * Check if the app is running in production
 */
export const isProduction = (): boolean => {
  return import.meta.env.MODE === 'production' || 
         import.meta.env.PROD === true ||
         window.location.hostname !== 'localhost' && 
         window.location.hostname !== '127.0.0.1';
};

/**
 * Check if the app is running in development
 */
export const isDevelopment = (): boolean => {
  return import.meta.env.MODE === 'development' || 
         import.meta.env.DEV === true ||
         window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1';
};

/**
 * Production-safe console logging
 * Only logs in development mode
 */
export const safeLog = (...args: any[]): void => {
  if (!isProduction()) {
    console.log(...args);
  }
};

/**
 * Production-safe console error logging
 * Always logs errors, even in production
 */
export const safeError = (...args: any[]): void => {
  console.error(...args);
};

/**
 * Production-safe console warning logging
 * Only logs warnings in development mode
 */
export const safeWarn = (...args: any[]): void => {
  if (!isProduction()) {
    console.warn(...args);
  }
};

/**
 * Get optimized image URL
 * Uses Cloudinary transformations in production
 */
export const getOptimizedImageUrl = (url: string, width?: number, quality: number = 80): string => {
  if (!url) return '';
  
  // If it's already a Cloudinary URL, add transformations
  if (url.includes('cloudinary.com')) {
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      const transformations = [
        width ? `w_${width}` : '',
        `q_${quality}`,
        'f_auto', // Auto format
        'c_limit', // Limit dimensions
      ].filter(Boolean).join(',');
      
      return `${parts[0]}/upload/${transformations}/${parts[1]}`;
    }
  }
  
  return url;
};

/**
 * Production environment check
 */
export const PRODUCTION = isProduction();
export const DEVELOPMENT = isDevelopment();
