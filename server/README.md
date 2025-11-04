# Verification Link Server

This server generates Firebase email verification links using Firebase Admin SDK.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Firebase Admin SDK

**Option A: Use Environment Variable (Recommended for Production)**
- Set `FIREBASE_ADMIN_SDK_JSON` environment variable with your Firebase Admin SDK JSON

**Option B: Use Service Account Key File (For Local Development)**
- Place your Firebase Admin SDK JSON file as `serviceAccountKey.json` in this directory
- ⚠️ **DO NOT commit this file to git!**

### 3. Run the Server

**Development (with auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The server will run on `http://localhost:3001`

## API Endpoints

### POST /api/generate-verification-link

Generate a Firebase email verification link.

**Request Body:**
```json
{
  "email": "user@example.com",
  "continueUrl": "https://yourapp.com/verify-email?mode=verifyEmail"
}
```

**Response:**
```json
{
  "verificationLink": "https://yourapp.com/verify-email?mode=verifyEmail&oobCode=...",
  "success": true
}
```

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Deployment

### Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel`
3. Add environment variable: `FIREBASE_ADMIN_SDK_JSON`

### Netlify Functions
1. Copy this file to `netlify/functions/generate-verification-link.js`
2. Add environment variable in Netlify dashboard

### Firebase Cloud Functions
See `functions/src/index.ts` for Cloud Functions implementation.

## Troubleshooting

### "Firebase Admin SDK not initialized"
- Make sure you have set `FIREBASE_ADMIN_SDK_JSON` or have `serviceAccountKey.json` file
- Check that the JSON is valid

### "CORS errors"
- The server has CORS enabled for all origins
- If deploying to Vercel, make sure CORS headers are set correctly

### "Port already in use"
- Change the PORT environment variable
- Or stop the process using port 3001

