/**
 * Setup Script for Verification Server
 * 
 * This script helps you set up the verification server step by step.
 * Run: node setup-verification-server.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setup() {
  console.log('\n🚀 Verification Server Setup\n');
  console.log('This script will help you set up the verification server.\n');

  // Step 1: Check if .env exists
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.log('📝 Creating .env file from .env.example...');
    const envExample = fs.readFileSync(path.join(__dirname, '.env.example'), 'utf8');
    fs.writeFileSync(envPath, envExample);
    console.log('✅ .env file created!\n');
  }

  // Step 2: Ask about Firebase Admin SDK
  console.log('📋 Step 1: Firebase Admin SDK Credentials\n');
  console.log('To get your Firebase Admin SDK credentials:');
  console.log('1. Go to https://console.firebase.google.com/');
  console.log('2. Select your project: mojo-dojo-casa-house-f31a5');
  console.log('3. Go to ⚙️ Project Settings → Service Accounts tab');
  console.log('4. Click "Generate new private key"');
  console.log('5. Save the JSON file\n');

  const hasCredentials = await question('Do you have the Firebase Admin SDK JSON file? (yes/no): ');
  
  if (hasCredentials.toLowerCase() === 'yes') {
    const filePath = await question('Enter the path to your Firebase Admin SDK JSON file: ');
    
    if (fs.existsSync(filePath)) {
      try {
        const serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Copy to server directory for local development
        const serverKeyPath = path.join(__dirname, 'server', 'serviceAccountKey.json');
        fs.writeFileSync(serverKeyPath, JSON.stringify(serviceAccount, null, 2));
        console.log('✅ Firebase Admin SDK credentials saved to server/serviceAccountKey.json');
        console.log('⚠️  Make sure to add this file to .gitignore (already done)\n');
      } catch (error) {
        console.error('❌ Error reading JSON file:', error.message);
      }
    } else {
      console.log('❌ File not found. You can add it manually later.');
    }
  }

  // Step 3: Ask about server deployment
  console.log('\n📋 Step 2: Server Deployment\n');
  console.log('Choose deployment option:');
  console.log('1. Run locally (for testing)');
  console.log('2. Deploy to Vercel (recommended)');
  console.log('3. Use Firebase Cloud Functions');
  
  const deploymentOption = await question('Enter option (1/2/3): ');

  if (deploymentOption === '1') {
    console.log('\n✅ Local setup selected');
    console.log('📝 Update .env file with: VITE_VERIFICATION_API_URL=http://localhost:3001/api');
    console.log('\nTo start the server:');
    console.log('  cd server');
    console.log('  npm start');
  } else if (deploymentOption === '2') {
    console.log('\n✅ Vercel deployment selected');
    console.log('\nTo deploy:');
    console.log('  1. Install Vercel CLI: npm i -g vercel');
    console.log('  2. Run: vercel');
    console.log('  3. Add environment variable: FIREBASE_ADMIN_SDK_JSON');
    console.log('  4. Update .env with your Vercel URL');
  } else if (deploymentOption === '3') {
    console.log('\n✅ Firebase Cloud Functions selected');
    console.log('\nTo deploy:');
    console.log('  1. Install Firebase CLI: npm i -g firebase-tools');
    console.log('  2. Run: firebase init functions');
    console.log('  3. Copy functions/src/index.ts');
    console.log('  4. Run: firebase deploy --only functions');
  }

  // Step 4: Check EmailJS configuration
  console.log('\n📋 Step 3: EmailJS Configuration\n');
  const emailjsConfigured = await question('Do you have EmailJS configured? (yes/no): ');
  
  if (emailjsConfigured.toLowerCase() === 'no') {
    console.log('\nTo configure EmailJS:');
    console.log('1. Go to https://dashboard.emailjs.com/');
    console.log('2. Get your Public Key, Service ID, and Template ID');
    console.log('3. Add them to your .env file');
  }

  console.log('\n✅ Setup complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Make sure all environment variables are set in .env');
  console.log('2. Start the server: cd server && npm start');
  console.log('3. Test the setup by signing up a new account');
  
  rl.close();
}

setup().catch(console.error);

