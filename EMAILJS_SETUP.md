# EmailJS Setup for OTP Email Verification

## Problem
OTP emails are not being sent because EmailJS is not configured in the deployed version.

## Solution

### Step 1: Get EmailJS Credentials

1. Go to [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. Sign in or create account
3. Get your credentials:
   - **Public Key**: Go to "Account" → "API Keys" (top right)
   - **Service ID**: Go to "Email Services" → Select your service
   - **Template ID**: Go to "Email Templates" → Select verification template

### Step 2: Add to .env File

Add these to your `.env` file in the project root:

```env
# EmailJS Configuration
VITE_EMAILJS_PUBLIC_KEY=your_public_key_here
VITE_EMAILJS_SERVICE_ID=your_service_id_here
VITE_EMAILJS_TEMPLATE_VERIFICATION=your_template_id_here
VITE_EMAILJS_TEMPLATE_BOOKING=your_booking_template_id_here
```

### Step 3: Create Email Template

In EmailJS, create a template with these variables:
- `{{to_email}}` - recipient email
- `{{to_name}}` - recipient name
- `{{otp_code}}` - 6-digit OTP code
- `{{user_role}}` - Guest/Host/Admin
- `{{verification_link}}` - link to verification page
- `{{platform_name}}` - Mojo Dojo Casa House
- `{{support_email}}` - johnpatrickrobles143@gmail.com
- `{{year}}` - current year

Example template:
```
Subject: Verify Your Email - {{otp_code}}

Hi {{to_name}},

Welcome to {{platform_name}}!

Your verification code is: {{otp_code}}

Or click this link to verify: {{verification_link}}

This code will expire in 10 minutes.

Need help? Contact us at {{support_email}}

© {{year}} {{platform_name}}. All rights reserved.
```

### Step 4: Rebuild and Deploy

After adding credentials to `.env`:

```bash
npm run build:prod
firebase deploy --only hosting
```

## Check if it's working

After deploying, check browser console for:
- ✅ `OTP verification email sent successfully`
- ❌ `EmailJS PUBLIC_KEY not configured` (means .env not set)

## Alternative: Check Current .env

Run this command to check if EmailJS is configured:

```bash
echo %VITE_EMAILJS_PUBLIC_KEY%
```

If it returns `%VITE_EMAILJS_PUBLIC_KEY%`, it's not set.

## Common Issues

### Issue: "EmailJS PUBLIC_KEY not configured"
**Solution**: Add `VITE_EMAILJS_PUBLIC_KEY` to `.env` file

### Issue: "Failed to send email"
**Solution**: 
1. Check EmailJS service is active
2. Check template exists
3. Check you're not on free tier limit (200 emails/month)

### Issue: Email not received
**Solution**:
1. Check spam folder
2. Check EmailJS dashboard → "Sent Emails" to see if it was sent
3. Check recipient email is correct

