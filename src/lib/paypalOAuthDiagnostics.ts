/**
 * PayPal OAuth Diagnostics Helper
 * 
 * This utility helps diagnose PayPal OAuth issues by:
 * 1. Validating OAuth URL construction
 * 2. Checking redirect URI format
 * 3. Verifying client ID format
 * 4. Providing troubleshooting steps
 */

export interface PayPalOAuthDiagnostics {
  isValid: boolean;
  issues: string[];
  redirectUri: string;
  clientId: string;
  recommendations: string[];
}

export function diagnosePayPalOAuth(
  clientId: string,
  redirectUri: string,
  isSandbox: boolean
): PayPalOAuthDiagnostics {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check client ID
  if (!clientId || clientId.trim() === '') {
    issues.push('Client ID is missing');
    recommendations.push('Set VITE_PAYPAL_CLIENT_ID in your .env file');
  } else if (clientId.length < 20) {
    issues.push('Client ID appears to be too short (should be ~80 characters)');
    recommendations.push('Verify your Client ID is correct in .env file');
  }

  // Check redirect URI format
  if (!redirectUri || redirectUri.trim() === '') {
    issues.push('Redirect URI is missing');
  } else {
    // Check protocol
    if (!redirectUri.startsWith('http://') && !redirectUri.startsWith('https://')) {
      issues.push('Redirect URI must start with http:// or https://');
    }

    // Check for localhost/IP address issues
    if (redirectUri.includes('localhost') && !redirectUri.includes('127.0.0.1')) {
      recommendations.push('Consider using 127.0.0.1 instead of localhost for better PayPal compatibility');
    }

    if (redirectUri.match(/\/\/\d+\.\d+\.\d+\.\d+/)) {
      recommendations.push('PayPal sandbox may not accept IP addresses. Consider using localhost or 127.0.0.1');
    }

    // Check for trailing slash
    if (redirectUri.endsWith('/')) {
      recommendations.push('Remove trailing slash from redirect URI (PayPal is sensitive to this)');
    }

    // Check if it ends with /paypal-callback
    if (!redirectUri.endsWith('/paypal-callback')) {
      issues.push('Redirect URI should end with /paypal-callback');
    }
  }

  // General recommendations
  recommendations.push('Make sure the EXACT redirect URI is added to PayPal Developer Dashboard');
  recommendations.push('Go to: https://developer.paypal.com/dashboard/applications/sandbox');
  recommendations.push('Click your app → "Log in with PayPal" → "Advanced Settings" → Add Return URL');

  return {
    isValid: issues.length === 0,
    issues,
    redirectUri,
    clientId: clientId ? clientId.substring(0, 20) + '...' : 'MISSING',
    recommendations
  };
}

export function logPayPalOAuthDiagnostics(diagnostics: PayPalOAuthDiagnostics) {
  console.group('🔍 PayPal OAuth Diagnostics');
  
  if (diagnostics.isValid) {
    console.log('✅ OAuth configuration appears valid');
  } else {
    console.error('❌ OAuth configuration has issues:');
    diagnostics.issues.forEach(issue => {
      console.error('   - ' + issue);
    });
  }
  
  console.log('📋 Redirect URI:', diagnostics.redirectUri);
  console.log('🔑 Client ID:', diagnostics.clientId);
  
  if (diagnostics.recommendations.length > 0) {
    console.warn('💡 Recommendations:');
    diagnostics.recommendations.forEach(rec => {
      console.warn('   - ' + rec);
    });
  }
  
  console.groupEnd();
}

