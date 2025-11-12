# Setup EmailJS Account 2 for Password Reset

## Overview
This project uses **two EmailJS accounts** to avoid hitting email limits:
- **Account 1**: Verification and Booking emails
- **Account 2**: Password Reset emails

## Step 1: Get Account 2 Credentials

1. **Log into your second EmailJS account** (the one with the Password Reset template)
2. **Get the Public Key:**
   - Go to "Account" → "API Keys" (top right)
   - Copy the **Public Key**

3. **Get the Service ID:**
   - Go to "Email Services" → Find the service that contains your Password Reset template
   - Copy the **Service ID** (should be `service_s9xxqfy` if you created it with the same name)

4. **Get the Template ID:**
   - Go to "Email Templates" → Find "Password Reset"
   - Copy the **Template ID** (should be `template_jianolj`)

## Step 2: Add to Environment Files

Add these new variables to both `.env` and `.env.production`:

```env
# Account 1 (existing - for Verification and Booking)
VITE_EMAILJS_PUBLIC_KEY=your_account_1_public_key
VITE_EMAILJS_SERVICE_ID=service_s9xxqfy
VITE_EMAILJS_TEMPLATE_VERIFICATION=your_verification_template_id
VITE_EMAILJS_TEMPLATE_BOOKING=your_booking_template_id

# Account 2 (NEW - for Password Reset)
VITE_EMAILJS_PUBLIC_KEY_2=your_account_2_public_key
VITE_EMAILJS_SERVICE_ID_2=service_s9xxqfy
VITE_EMAILJS_TEMPLATE_PASSWORD_RESET=template_jianolj
```

## Step 3: Verify Setup

After adding the variables:

1. **Restart your dev server** (if running locally)
2. **Test password reset** - it should now use Account 2
3. **Check console logs** - you should see:
   ```
   📧 Using Account 2 credentials: {
     serviceId: 'service_s9xxqfy',
     templateId: 'template_jianolj',
     publicKey: 'Set'
   }
   ```

## How It Works

- **Account 1** (`VITE_EMAILJS_PUBLIC_KEY`) is used for:
  - OTP verification emails
  - Booking confirmation emails
  - Welcome emails

- **Account 2** (`VITE_EMAILJS_PUBLIC_KEY_2`) is used for:
  - Password reset emails

The code automatically uses the correct account based on which email is being sent.

## Troubleshooting

### Error: "EmailJS Account 2 PUBLIC_KEY not configured"
- Make sure `VITE_EMAILJS_PUBLIC_KEY_2` is in your `.env` file
- Restart your dev server after adding it

### Error: "template ID not found"
- Make sure the Password Reset template is in the service specified by `VITE_EMAILJS_SERVICE_ID_2`
- Verify the template ID matches `VITE_EMAILJS_TEMPLATE_PASSWORD_RESET`

### Still not working?
- Check that Account 2's service ID matches what's in your `.env` file
- Verify Account 2's public key is correct
- Make sure the template exists in Account 2 (not Account 1)

