# Add Password Reset Template ID

## Where to Add It

You need to add the password reset template ID to your environment files:

### 1. Local Development (`.env` file)

Create or edit `.env` in your project root and add:

```env
VITE_EMAILJS_TEMPLATE_PASSWORD_RESET=your_password_reset_template_id_here
```

### 2. Production (`.env.production` file)

Create or edit `.env.production` in your project root and add:

```env
VITE_EMAILJS_TEMPLATE_PASSWORD_RESET=your_password_reset_template_id_here
```

## How to Get the Template ID

1. **Go to EmailJS Dashboard**: https://dashboard.emailjs.com/
2. **Navigate to**: Email Templates → Password Reset
3. **Copy the Template ID** from the URL or template settings
   - The Template ID is usually in the URL: `dashboard.emailjs.com/admin/templates/[TEMPLATE_ID]`
   - Or look in the template settings/info section

## Example `.env` File

Your complete `.env` file should look like this:

```env
# EmailJS Configuration
VITE_EMAILJS_PUBLIC_KEY=your_public_key
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_VERIFICATION=your_verification_template_id
VITE_EMAILJS_TEMPLATE_BOOKING=your_booking_template_id
VITE_EMAILJS_TEMPLATE_PASSWORD_RESET=your_password_reset_template_id
```

## After Adding

1. **Restart your dev server** if running locally
2. **Rebuild for production**: `npm run build:prod`
3. **Redeploy**: `firebase deploy --only hosting`

## Verify It's Working

After adding the template ID, test password reset:
1. Go to forgot password page
2. Enter an email
3. Check console - should see: `✅ Password reset email sent successfully`
4. Check email inbox - should receive the custom EmailJS email

