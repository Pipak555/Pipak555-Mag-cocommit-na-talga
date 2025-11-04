/**
 * Test Script for Verification Server
 * 
 * Run this to test if your server is set up correctly.
 * Usage: node test-server.js
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

console.log('🧪 Testing Verification Server Setup...\n');

// Check if Firebase Admin SDK is configured
console.log('1. Checking Firebase Admin SDK configuration...');

let serviceAccount = null;

// Try environment variable first
if (process.env.FIREBASE_ADMIN_SDK_JSON) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK_JSON);
    console.log('   ✅ Found FIREBASE_ADMIN_SDK_JSON environment variable');
  } catch (error) {
    console.log('   ❌ FIREBASE_ADMIN_SDK_JSON is not valid JSON');
  }
}

// Try service account key file
if (!serviceAccount) {
  const keyPath = path.join(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(keyPath)) {
    try {
      serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      console.log('   ✅ Found serviceAccountKey.json file');
    } catch (error) {
      console.log('   ❌ serviceAccountKey.json is not valid JSON');
    }
  } else {
    console.log('   ⚠️  No serviceAccountKey.json file found');
  }
}

if (!serviceAccount) {
  console.log('\n   ❌ Firebase Admin SDK not configured!');
  console.log('   📝 Please set up Firebase Admin SDK credentials:');
  console.log('      - Set FIREBASE_ADMIN_SDK_JSON environment variable, OR');
  console.log('      - Place serviceAccountKey.json in server directory');
  process.exit(1);
}

// Initialize Firebase Admin
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('   ✅ Firebase Admin SDK initialized successfully');
  }
} catch (error) {
  console.log('   ❌ Failed to initialize Firebase Admin SDK:', error.message);
  process.exit(1);
}

// Test generating a verification link
console.log('\n2. Testing verification link generation...');

async function testVerificationLink() {
  try {
    const testEmail = 'test@example.com';
    const actionCodeSettings = {
      url: 'http://localhost:5173/verify-email?mode=verifyEmail',
      handleCodeInApp: true,
    };

    const verificationLink = await admin.auth().generateEmailVerificationLink(
      testEmail,
      actionCodeSettings
    );

    if (verificationLink && verificationLink.includes('oobCode')) {
      console.log('   ✅ Verification link generated successfully');
      console.log('   🔗 Link preview:', verificationLink.substring(0, 80) + '...');
      return true;
    } else {
      console.log('   ❌ Verification link generated but format is incorrect');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Failed to generate verification link:', error.message);
    return false;
  }
}

// Run tests
testVerificationLink().then((success) => {
  if (success) {
    console.log('\n✅ All tests passed! Server is ready to use.');
    console.log('\n📝 Next steps:');
    console.log('   1. Start the server: npm start');
    console.log('   2. Update .env with: VITE_VERIFICATION_API_URL=http://localhost:3001/api');
    console.log('   3. Test by signing up a new account');
    process.exit(0);
  } else {
    console.log('\n❌ Tests failed. Please check your configuration.');
    process.exit(1);
  }
}).catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

