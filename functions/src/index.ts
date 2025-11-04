/**
 * Firebase Cloud Functions Alternative
 * 
 * This is an alternative to the Express server if you prefer Cloud Functions.
 * 
 * Setup:
 * 1. Install Firebase CLI: npm i -g firebase-tools
 * 2. Login: firebase login
 * 3. Initialize: firebase init functions
 * 4. Deploy: firebase deploy --only functions
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

/**
 * Generate email verification link for EmailJS
 */
export const generateVerificationLink = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { email, continueUrl } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const actionCodeSettings = {
      url: continueUrl || `https://${process.env.GCLOUD_PROJECT}.web.app/verify-email?mode=verifyEmail`,
      handleCodeInApp: true,
    };

    const verificationLink = await admin.auth().generateEmailVerificationLink(
      email,
      actionCodeSettings
    );

    return res.status(200).json({ 
      verificationLink,
      success: true
    });
  } catch (error: any) {
    console.error('Error generating verification link:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to generate verification link'
    });
  }
});

