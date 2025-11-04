# Verification Link Server Setup

This server generates Firebase email verification links that can be used in your EmailJS templates.

## Option 1: Deploy to Vercel (Recommended - Easiest)

### Step 1: Get Firebase Admin SDK Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Save the JSON file (you'll need this)

### Step 2: Deploy to Vercel

1. Install Vercel CLI (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. Navigate to your project root:
   ```bash
   cd "firebnb-spark day5"
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. When prompted, add environment variable:
   - Variable name: `FIREBASE_ADMIN_SDK_JSON`
   - Value: Paste the entire content of your service account JSON file

5. Update your `.env` file with the Vercel URL:
   ```env
   VITE_VERIFICATION_API_URL=https://your-project.vercel.app/api
   ```

## Option 2: Deploy to Netlify Functions

1. Create `netlify/functions/generate-verification-link.js`:
   ```javascript
   // Copy contents from server/verification-link.js
   ```

2. Add environment variable in Netlify dashboard:
   - `FIREBASE_ADMIN_SDK_JSON`: Your service account JSON

3. Update `.env`:
   ```env
   VITE_VERIFICATION_API_URL=https://your-site.netlify.app/.netlify/functions
   ```

## Option 3: Run Locally (For Development)

1. Install dependencies:
   ```bash
   cd server
   npm install
   ```

2. Create `server/serviceAccountKey.json` with your Firebase Admin SDK credentials

3. Add to `.env`:
   ```env
   VITE_VERIFICATION_API_URL=http://localhost:3001/api
   ```

4. Run the server:
   ```bash
   npm start
   ```

## Option 4: Use Cloud Functions (Alternative)

If you prefer Firebase Cloud Functions, see `CLOUD_FUNCTIONS_SETUP.md`

## Testing

After deployment, test the endpoint:
```bash
curl -X POST https://your-server-url/api/generate-verification-link \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

You should receive a JSON response with a `verificationLink` field.

