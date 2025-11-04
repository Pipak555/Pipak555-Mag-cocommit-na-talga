import emailjs from '@emailjs/browser';

// Initialize EmailJS (only needed once)
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const TEMPLATE_ID_VERIFICATION = import.meta.env.VITE_EMAILJS_TEMPLATE_VERIFICATION || '';

if (PUBLIC_KEY) {
  emailjs.init(PUBLIC_KEY);
}

/**
 * Send beautiful verification email via EmailJS
 * This supplements Firebase's default verification email with a beautiful design
 */
export const sendVerificationEmail = async (
  email: string,
  fullName: string,
  verificationLink: string,
  role: 'host' | 'guest' | 'admin'
): Promise<boolean> => {
  try {
    if (!SERVICE_ID || !TEMPLATE_ID_VERIFICATION) {
      console.warn('EmailJS credentials not configured. Skipping email send.');
      return false;
    }

    const templateParams = {
      to_email: email,
      to_name: fullName,
      user_role: role.charAt(0).toUpperCase() + role.slice(1),
      verification_link: verificationLink,
      platform_name: 'Mojo Dojo Casa House',
      support_email: 'johnpatrickrobles143@gmail.com',
      year: new Date().getFullYear().toString(),
    };

    await emailjs.send(SERVICE_ID, TEMPLATE_ID_VERIFICATION, templateParams);
    
    console.log('✅ Verification email sent successfully to:', email);
    return true;
  } catch (error) {
    console.error('❌ Failed to send verification email:', error);
    // Don't throw - email sending is non-critical
    return false;
  }
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

    // Use the same template but without verification link
    const templateParams = {
      to_email: email,
      to_name: fullName,
      user_role: role.charAt(0).toUpperCase() + role.slice(1),
      verification_link: `${window.location.origin}/guest/dashboard`, // Fallback link
      platform_name: 'Mojo Dojo Casa House',
      support_email: 'johnpatrickrobles143@gmail.com',
      year: new Date().getFullYear().toString(),
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

    const checkInDate = new Date(checkIn).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const checkOutDate = new Date(checkOut).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const templateParams = {
      to_email: guestEmail,
      to_name: guestName,
      listing_title: listingTitle,
      listing_location: listingLocation,
      check_in: checkInDate,
      check_out: checkOutDate,
      guests: guests.toString(),
      total_price: totalPrice.toFixed(2),
      booking_id: bookingId,
      booking_link: `${window.location.origin}/guest/dashboard`,
      platform_name: 'Mojo Dojo Casa House',
      support_email: 'johnpatrickrobles143@gmail.com',
      year: new Date().getFullYear().toString(),
    };

    await emailjs.send(SERVICE_ID, TEMPLATE_ID_BOOKING, templateParams);
    
    console.log('✅ Booking confirmation email sent successfully to:', guestEmail);
    return true;
  } catch (error) {
    console.error('❌ Failed to send booking confirmation email:', error);
    return false;
  }
};