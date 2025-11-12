# Fix "Template ID Not Found" Error

## Issue
EmailJS is returning: "The template ID not found"

## Solution

### Step 1: Verify Template ID is Correct
The template ID should be: `template_jianolj`

### Step 2: Restart Dev Server
**Important**: After adding environment variables, you MUST restart your dev server:

1. **Stop** your current dev server (Ctrl+C)
2. **Start** it again: `npm run dev` or `npm start`

Vite only reads environment variables when the server starts, so changes to `.env` files won't be picked up until you restart.

### Step 3: Verify Template is Set Up in EmailJS

1. Go to EmailJS Dashboard → Email Templates
2. Click on "Password Reset" template
3. Make sure:
   - Template is **saved**
   - Template is **active**
   - Template is in the **correct service** (check Service ID matches)

### Step 4: Check Environment Variables are Loaded

After restarting, check the browser console. You should see:
- No error about template ID not found
- If you see the error, check that `VITE_EMAILJS_TEMPLATE_PASSWORD_RESET` is set correctly

### Step 5: Test Again

1. Go to forgot password page
2. Enter email
3. Check console - should see: `✅ Password reset email sent successfully`
4. Check email inbox

## Common Issues

1. **Dev server not restarted** - Most common issue
2. **Template ID typo** - Double-check it's exactly `template_jianolj`
3. **Template in wrong service** - Make sure template is in the same service as your SERVICE_ID
4. **Template not saved** - Make sure you clicked "Save" in EmailJS dashboard

