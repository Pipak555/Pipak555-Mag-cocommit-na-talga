// Firebase Email Template Configuration
// This file contains the email template configurations that should be set up in Firebase Console

export const emailTemplates = {
  // Email Verification Template
  verifyEmail: {
    subject: "Welcome to Mojo Dojo Casa House! Please verify your email",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - Mojo Dojo Casa House</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
          }
          .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #f97316 0%, #3b82f6 50%, #22c55e 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
            background: linear-gradient(45deg, #f97316, #3b82f6, #22c55e);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .tagline {
            font-size: 16px;
            opacity: 0.9;
          }
          .content {
            padding: 40px 30px;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            color: #1a202c;
            margin-bottom: 20px;
            text-align: center;
          }
          .message {
            font-size: 16px;
            color: #4a5568;
            margin-bottom: 30px;
            line-height: 1.6;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #f97316 0%, #3b82f6 50%, #22c55e 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
            text-align: center;
            margin: 20px 0;
            transition: transform 0.2s;
          }
          .button:hover {
            transform: translateY(-2px);
          }
          .button-container {
            text-align: center;
            margin: 30px 0;
          }
          .footer {
            background: #f7fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
          }
          .footer-text {
            font-size: 14px;
            color: #718096;
            margin-bottom: 10px;
          }
          .social-links {
            margin-top: 20px;
          }
          .social-links a {
            color: #667eea;
            text-decoration: none;
            margin: 0 10px;
          }
          .security-note {
            background: #fef5e7;
            border: 1px solid #f6e05e;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            font-size: 14px;
            color: #744210;
          }
          .divider {
            height: 1px;
            background: linear-gradient(to right, transparent, #e2e8f0, transparent);
            margin: 30px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🏠 Mojo Dojo Casa House</div>
            <div class="tagline">Your Gateway to Amazing Stays</div>
          </div>
          
          <div class="content">
            <h1 class="title">Welcome to Mojo Dojo Casa House!</h1>
            
            <p class="message">
              Thank you for joining our community! We're excited to have you on board. 
              To complete your registration and start exploring amazing places to stay, 
              please verify your email address by clicking the button below.
            </p>
            
            <div class="button-container">
              <a href="%LINK%" class="button">Verify My Email Address</a>
            </div>
            
            <div class="security-note">
              <strong>🔒 Security Note:</strong> This verification link will expire in 24 hours. 
              If you didn't create an account with Firebnb, you can safely ignore this email.
            </div>
            
            <div class="divider"></div>
            
            <p class="message">
              Once verified, you'll be able to:
            </p>
            <ul style="color: #4a5568; font-size: 16px; line-height: 1.8;">
              <li>✨ Browse and book amazing accommodations</li>
              <li>🏠 List your property and start earning</li>
              <li>💬 Connect with hosts and guests</li>
              <li>🎁 Earn rewards and special offers</li>
            </ul>
          </div>
          
          <div class="footer">
            <p class="footer-text">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="word-break: break-all; color: #667eea; font-size: 12px;">
              %LINK%
            </p>
            
            <div class="social-links">
              <a href="#">Help Center</a> |
              <a href="#">Contact Support</a> |
              <a href="#">Privacy Policy</a>
            </div>
            
            <p style="font-size: 12px; color: #a0aec0; margin-top: 20px;">
              © 2024 Mojo Dojo Casa House. All rights reserved.<br>
              This email was sent to %EMAIL%
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Welcome to Mojo Dojo Casa House!
      
      Thank you for joining our community! We're excited to have you on board.
      
      To complete your registration and start exploring amazing places to stay, 
      please verify your email address by visiting this link:
      
      %LINK%
      
      This verification link will expire in 24 hours.
      
      Once verified, you'll be able to:
      - Browse and book amazing accommodations
      - List your property and start earning
      - Connect with hosts and guests
      - Earn rewards and special offers
      
      If you didn't create an account with Mojo Dojo Casa House, you can safely ignore this email.
      
      Need help? Contact our support team.
      
      © 2024 Mojo Dojo Casa House. All rights reserved.
      This email was sent to %EMAIL%
    `
  },

  // Password Reset Template
  resetPassword: {
    subject: "Reset your Mojo Dojo Casa House password",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - Mojo Dojo Casa House</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
          }
          .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #e53e3e 0%, #dd6b20 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .content {
            padding: 40px 30px;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            color: #1a202c;
            margin-bottom: 20px;
            text-align: center;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #e53e3e 0%, #dd6b20 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
            text-align: center;
            margin: 20px 0;
          }
          .button-container {
            text-align: center;
            margin: 30px 0;
          }
          .security-note {
            background: #fef5e7;
            border: 1px solid #f6e05e;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            font-size: 14px;
            color: #744210;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🏠 Firebnb</div>
            <div>Password Reset Request</div>
          </div>
          
          <div class="content">
            <h1 class="title">Reset Your Password</h1>
            
            <p>We received a request to reset your password for your Firebnb account.</p>
            
            <div class="button-container">
              <a href="%LINK%" class="button">Reset My Password</a>
            </div>
            
            <div classsecurity-note">
              <strong>🔒 Security Note:</strong> This password reset link will expire in 1 hour. 
              If you didn't request a password reset, you can safely ignore this email.
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #e53e3e; font-size: 12px;">
              %LINK%
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  }
};

// Instructions for setting up email templates in Firebase Console:
export const setupInstructions = `
To set up these beautiful email templates in Firebase Console:

1. Go to Firebase Console → Authentication → Templates
2. Click on "Email address verification" template
3. Replace the default template with the HTML from verifyEmail.html
4. Set the subject to: "Welcome to Firebnb! Please verify your email"
5. Click "Save"

For password reset:
1. Click on "Password reset" template  
2. Replace with the HTML from resetPassword.html
3. Set the subject to: "Reset your Firebnb password"
4. Click "Save"

The templates use:
- %LINK% for the verification/reset link
- %EMAIL% for the user's email address
- %DISPLAY_NAME% for the user's display name (if available)
`;
