import emailjs from '@emailjs/browser';
import { formatPHP } from '@/lib/currency';

// Initialize EmailJS (only needed once)
// Account 1: For Verification and Booking emails
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const TEMPLATE_ID_VERIFICATION = import.meta.env.VITE_EMAILJS_TEMPLATE_VERIFICATION || '';

// Account 2: For Password Reset emails (separate account to avoid limits)
const PUBLIC_KEY_2 = import.meta.env.VITE_EMAILJS_PUBLIC_KEY_2 || '';
const SERVICE_ID_2 = import.meta.env.VITE_EMAILJS_SERVICE_ID_2 || '';

if (PUBLIC_KEY) {
  emailjs.init(PUBLIC_KEY);
}

// Use hosted logo URL from deployed version
const getLogoUrl = (): string => {
  const appUrl = import.meta.env.VITE_APP_URL || 'https://mojo-dojo-casa-house-f31a5.web.app';
  // Remove trailing slash if present, then add /logo.png
  return `${appUrl.replace(/\/$/, '')}/logo.png`;
};

/**
 * Send OTP verification email via EmailJS
 * This sends a 6-digit OTP code instead of a verification link
 */
export const sendOTPEmail = async (
  email: string,
  fullName: string,
  otpCode: string, // 6-digit OTP code
  role: 'host' | 'guest' | 'admin'
): Promise<boolean> => {
  try {
    // Check if EmailJS is properly configured
    if (!PUBLIC_KEY) {
      console.error('❌ EmailJS PUBLIC_KEY not configured. Add VITE_EMAILJS_PUBLIC_KEY to your .env file');
      return false;
    }
    
    if (!SERVICE_ID) {
      console.error('❌ EmailJS SERVICE_ID not configured. Add VITE_EMAILJS_SERVICE_ID to your .env file');
      return false;
    }
    
    if (!TEMPLATE_ID_VERIFICATION) {
      console.error('❌ EmailJS TEMPLATE_ID_VERIFICATION not configured. Add VITE_EMAILJS_TEMPLATE_VERIFICATION to your .env file');
      return false;
    }

        // Get the app URL from environment variable or use production URL as fallback
    const appUrl = import.meta.env.VITE_APP_URL || 'https://mojo-dojo-casa-house-f31a5.web.app';
    
    // Use base64 embedded logo (works even when email clients block external images)
    const logoUrl = getLogoUrl();
    
    const templateParams = {
      to_email: email,
      to_name: fullName,
      user_role: role.charAt(0).toUpperCase() + role.slice(1),
      otp_code: otpCode, // 6-digit OTP code
      verification_link: `${appUrl}/verify-otp`, // Link to OTP verification page
      platform_name: 'Mojo Dojo Casa House',
      support_email: 'johnpatrickrobles143@gmail.com',
      year: new Date().getFullYear().toString(),
      logo_url: logoUrl,
      logo_alt: 'Mojo Dojo Casa House Logo',
    };

    console.log('📧 Attempting to send OTP email via EmailJS...');
    console.log('📧 Template params being sent:', {
      ...templateParams,
      logo_url: templateParams.logo_url, // Explicitly log logo_url
      appUrl: appUrl
    });
    const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID_VERIFICATION, templateParams);
    
    console.log('✅ OTP verification email sent successfully to:', email);
    console.log('📧 EmailJS response:', response);
    console.log('📧 Logo URL sent:', templateParams.logo_url);
    return true;
  } catch (error: any) {
    console.error('❌ Failed to send OTP email:', error);
    console.error('📧 EmailJS error details:', {
      message: error?.text || error?.message,
      status: error?.status,
      publicKey: PUBLIC_KEY ? 'Set' : 'Missing',
      serviceId: SERVICE_ID ? 'Set' : 'Missing',
      templateId: TEMPLATE_ID_VERIFICATION ? 'Set' : 'Missing'
    });
    return false;
  }
};

/**
 * @deprecated Use sendOTPEmail instead
 * Send beautiful verification email via EmailJS (old link-based method)
 */
export const sendVerificationEmail = async (
  email: string,
  fullName: string,
  verificationLink: string,
  role: 'host' | 'guest' | 'admin'
): Promise<boolean> => {
  // Redirect to OTP method
  return await sendOTPEmail(email, fullName, verificationLink, role);
};

/**
 * Send beautiful welcome email after successful signup
 */
export const sendWelcomeEmail = async (
  email: string,
  fullName: string,
  role: 'host' | 'guest' | 'admin'
): Promise<boolean> => {
  try {
    if (!SERVICE_ID || !TEMPLATE_ID_VERIFICATION) {
      console.warn('EmailJS credentials not configured. Skipping welcome email.');
      return false;
    }

    // Get the app URL from environment variable or use production URL as fallback
    const appUrl = import.meta.env.VITE_APP_URL || 'https://mojo-dojo-casa-house-f31a5.web.app';
    
    // Use base64 embedded logo (works even when email clients block external images)
    const logoUrl = getLogoUrl();
    
    // Welcome email - no verification link, just a link to the dashboard
    const templateParams = {
      to_email: email,
      to_name: fullName,
      user_role: role.charAt(0).toUpperCase() + role.slice(1),
      verification_link: `${appUrl}/${role === 'guest' ? 'guest/login' : role === 'host' ? 'host/login' : 'admin/login'}`, // Link to login instead
      platform_name: 'Mojo Dojo Casa House',
      support_email: 'johnpatrickrobles143@gmail.com',
      year: new Date().getFullYear().toString(),
      logo_url: logoUrl,
      logo_alt: 'Mojo Dojo Casa House Logo',
    };

    await emailjs.send(SERVICE_ID, TEMPLATE_ID_VERIFICATION, templateParams);
    
    console.log('✅ Welcome email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error);
    return false;
  }
};

// Add this new template ID constant at the top with the others
const TEMPLATE_ID_BOOKING = import.meta.env.VITE_EMAILJS_TEMPLATE_BOOKING || '';
const TEMPLATE_ID_PASSWORD_RESET = import.meta.env.VITE_EMAILJS_TEMPLATE_PASSWORD_RESET || '';

/**
 * Send booking confirmation email to guest
 */
export const sendBookingConfirmationEmail = async (
  guestEmail: string,
  guestName: string,
  listingTitle: string,
  listingLocation: string,
  checkIn: string,
  checkOut: string,
  guests: number,
  totalPrice: number,
  bookingId: string
): Promise<boolean> => {
  try {
    if (!SERVICE_ID || !TEMPLATE_ID_BOOKING) {
      console.warn('EmailJS booking template not configured. Skipping email send.');
      return false;
    }

    // Validate required fields
    if (!guestEmail || !guestName || !listingTitle) {
      console.error('❌ Missing required fields for booking confirmation email:', {
        guestEmail: !!guestEmail,
        guestName: !!guestName,
        listingTitle: !!listingTitle
      });
      return false;
    }

    // Format dates properly
    let checkInDate = '';
    let checkOutDate = '';
    
    try {
      checkInDate = new Date(checkIn).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      checkInDate = new Date(checkIn).toLocaleDateString('en-US');
    }
    
    try {
      checkOutDate = new Date(checkOut).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      checkOutDate = new Date(checkOut).toLocaleDateString('en-US');
    }

    // Format guests text - EmailJS doesn't support Handlebars conditionals like {{#if plural}},
    // so we need to send the full formatted text including "guest" or "guests"
    const guestsText = guests ? (guests === 1 ? '1 guest' : `${guests} guests`) : '1 guest';
    
    // Format total price - The template shows ${{total_price}}, but we use PHP currency
    // We'll send the formatted price with currency symbol, and the template should use {{total_price}} without the $ prefix
    // If the template has ${{total_price}}, update it to just {{total_price}} in EmailJS dashboard
    const formattedPrice = totalPrice ? formatPHP(totalPrice) : formatPHP(0);
    
    // Get the app URL from environment variable or use production URL as fallback
    const appUrl = import.meta.env.VITE_APP_URL || 'https://mojo-dojo-casa-house-f31a5.web.app';
    
    // Use base64 embedded logo (works even when email clients block external images)
    const logoUrl = getLogoUrl();
    
    // Ensure all template parameters have valid values (no null/undefined)
    // These must match exactly what's in the EmailJS template variables
    const templateParams = {
      to_email: String(guestEmail || ''),
      to_name: String(guestName || 'Guest'),
      listing_title: String(listingTitle || 'Your Booking'),
      listing_location: String(listingLocation || 'Location not specified'),
      check_in: String(checkInDate || new Date(checkIn).toLocaleDateString()),
      check_out: String(checkOutDate || new Date(checkOut).toLocaleDateString()),
      guests: String(guestsText), // Already formatted: "1 guest" or "2 guests"
      total_price: String(formattedPrice), // Formatted with currency: "₱900.00"
      booking_id: String(bookingId || 'N/A'),
      booking_link: String(`${appUrl}/guest/dashboard`),
      platform_name: 'Mojo Dojo Casa House',
      support_email: 'johnpatrickrobles143@gmail.com',
      year: String(new Date().getFullYear()),
      logo_url: logoUrl,
      logo_alt: 'Mojo Dojo Casa House Logo',
    };

    console.log('📧 Sending booking confirmation email with params:', {
      to_email: templateParams.to_email,
      to_name: templateParams.to_name,
      listing_title: templateParams.listing_title,
      check_in: templateParams.check_in,
      check_out: templateParams.check_out,
    });

    await emailjs.send(SERVICE_ID, TEMPLATE_ID_BOOKING, templateParams);
    
    console.log('✅ Booking confirmation email sent successfully to:', guestEmail);
    return true;
  } catch (error: any) {
    console.error('❌ Failed to send booking confirmation email:', error);
    console.error('Error details:', {
      message: error?.message,
      status: error?.status,
      text: error?.text
    });
    return false;
  }
};

/**
 * Send password reset email via EmailJS
 */
export const sendPasswordResetEmail = async (
  email: string,
  fullName: string,
  resetLink: string
): Promise<boolean> => {
  try {
    // Use Account 2 credentials for password reset (separate account to avoid limits)
    // Check if Account 2 EmailJS is properly configured
    if (!PUBLIC_KEY_2) {
      console.error('❌ EmailJS Account 2 PUBLIC_KEY not configured. Add VITE_EMAILJS_PUBLIC_KEY_2 to your .env file');
      return false;
    }
    
    if (!SERVICE_ID_2) {
      console.error('❌ EmailJS Account 2 SERVICE_ID not configured. Add VITE_EMAILJS_SERVICE_ID_2 to your .env file');
      return false;
    }
    
    if (!TEMPLATE_ID_PASSWORD_RESET) {
      console.error('❌ EmailJS TEMPLATE_ID_PASSWORD_RESET not configured. Add VITE_EMAILJS_TEMPLATE_PASSWORD_RESET to your .env file');
      return false;
    }

    // Validate required fields
    if (!email) {
      console.error('❌ Missing required fields for password reset email:', {
        email: !!email
      });
      return false;
    }

    // Get the app URL from environment variable or use production URL as fallback
    const appUrl = import.meta.env.VITE_APP_URL || 'https://mojo-dojo-casa-house-f31a5.web.app';
    
    // Use hosted logo URL (same as other templates)
    const logoUrl = getLogoUrl();
    
    // Ensure all template parameters have valid values (no null/undefined)
    // These must match exactly what's in the EmailJS template variables
    const templateParams = {
      to_email: String(email || ''),
      to_name: String(fullName || 'User'),
      reset_link: String(resetLink || `${appUrl}/reset-password`),
      platform_name: 'Mojo Dojo Casa House',
      support_email: 'johnpatrickrobles143@gmail.com',
      year: String(new Date().getFullYear()),
      logo_url: logoUrl,
      logo_alt: 'Mojo Dojo Casa House Logo',
    };

    console.log('📧 Sending password reset email with params:', {
      to_email: templateParams.to_email,
      to_name: templateParams.to_name,
      reset_link: templateParams.reset_link.substring(0, 50) + '...'
    });
    console.log('📧 Using Account 2 credentials:', {
      serviceId: SERVICE_ID_2,
      templateId: TEMPLATE_ID_PASSWORD_RESET,
      publicKey: PUBLIC_KEY_2 ? 'Set' : 'Missing'
    });

    // Use Account 2's public key by passing it as 4th parameter to emailjs.send
    // This allows us to use a different EmailJS account for password reset
    await emailjs.send(SERVICE_ID_2, TEMPLATE_ID_PASSWORD_RESET, templateParams, PUBLIC_KEY_2);
    
    console.log('✅ Password reset email sent successfully to:', email);
    return true;
  } catch (error: any) {
    console.error('❌ Failed to send password reset email:', error);
    console.error('📧 EmailJS error details:', {
      message: error?.text || error?.message,
      status: error?.status,
      publicKey2: PUBLIC_KEY_2 ? 'Set' : 'Missing',
      serviceId2: SERVICE_ID_2 ? 'Set' : 'Missing',
      templateId: TEMPLATE_ID_PASSWORD_RESET ? 'Set' : 'Missing'
    });
    return false;
  }
};