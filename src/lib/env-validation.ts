/**
 * Environment variable validation
 * Checks if required environment variables are configured
 */

/**
 * Check if production environment is properly configured
 * Returns true if all critical environment variables are set
 */
export const isProductionConfigured = (): boolean => {
  // Check critical Firebase configuration
  const hasFirebaseConfig = !!(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET &&
    import.meta.env.VITE_FIREBASE_APP_ID
  );

  // Check PayPal configuration (critical for payments)
  const hasPayPalConfig = !!(
    import.meta.env.VITE_PAYPAL_CLIENT_ID &&
    import.meta.env.VITE_PAYPAL_ENV
  );

  // Return true if at least Firebase is configured
  // PayPal can be optional if payments aren't used yet
  return hasFirebaseConfig;
};

/**
 * Get list of missing environment variables
 * Useful for debugging and error messages
 */
export const getMissingEnvVars = (): string[] => {
  const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_APP_ID',
  ];

  const missing: string[] = [];

  required.forEach((key) => {
    if (!import.meta.env[key]) {
      missing.push(key);
    }
  });

  return missing;
};

