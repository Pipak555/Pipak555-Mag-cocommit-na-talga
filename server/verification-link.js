/**
 * Simple Express Server to Generate Firebase Verification Links
 * 
 * This server uses Firebase Admin SDK to generate email verification links
 * that can be used in EmailJS templates.
 * 
 * Deploy this to:
 * - Vercel (vercel.json config included)
 * - Netlify (netlify.toml config included)
 * - Heroku
 * - Any Node.js hosting service
 */

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
// Make sure to set FIREBASE_ADMIN_SDK_JSON environment variable
// or use a service account key file
if (!admin.apps.length) {
  try {
    const serviceAccount = process.env.FIREBASE_ADMIN_SDK_JSON
      ? JSON.parse(process.env.FIREBASE_ADMIN_SDK_JSON)
      : require('./serviceAccountKey.json'); // Fallback for local dev

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    console.error('Make sure FIREBASE_ADMIN_SDK_JSON environment variable is set');
  }
}

/**
 * Generate email verification link
 * POST /api/generate-verification-link
 * Body: { email: string, continueUrl?: string }
 */
app.post('/api/generate-verification-link', async (req, res) => {
  try {
    const { email, continueUrl } = req.body;

    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required' 
      });
    }

    const actionCodeSettings = {
      url: continueUrl || `${process.env.APP_URL || 'http://localhost:5173'}/verify-email?mode=verifyEmail`,
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
  } catch (error) {
    console.error('Error generating verification link:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to generate verification link'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// For Vercel serverless functions
if (process.env.VERCEL) {
  module.exports = app;
} else {
  // For regular Express server
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`✅ Verification link server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  });
}

