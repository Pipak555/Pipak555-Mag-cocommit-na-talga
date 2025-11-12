# Debug EmailJS Template ID Issue

## Current Error
"The template ID not found" - EmailJS can't find template `template_jianolj`

## Steps to Fix

### 1. Verify Template ID in EmailJS Dashboard

1. Go to: https://dashboard.emailjs.com/admin/templates
2. Find your "Password Reset" template
3. **Click on it** to open
4. Check the **Template ID** in:
   - The URL: `dashboard.emailjs.com/admin/templates/[TEMPLATE_ID]`
   - Or in the template settings/info section
5. **Verify it's exactly**: `template_jianolj` (no extra spaces, correct spelling)

### 2. Verify Template is in Correct Service

1. In EmailJS Dashboard → Email Templates → Password Reset
2. Check which **Service** it's using (should match your `VITE_EMAILJS_SERVICE_ID`)
3. If it's in a different service, either:
   - Move the template to the correct service, OR
   - Update your `VITE_EMAILJS_SERVICE_ID` to match

### 3. Verify Template is Saved and Active

1. Make sure you clicked **"Save"** in EmailJS dashboard
2. Check that the template is **active** (not deleted/archived)

### 4. Restart Dev Server

**CRITICAL**: After adding/changing environment variables:

1. **Stop** your dev server (Ctrl+C)
2. **Start** it again: `npm run dev` or `npm start`

Vite only reads `.env` files when the server starts!

### 5. Check Console Output

After restarting, when you try password reset, check the console. You should see:

```
🔍 Using Template ID: template_jianolj
📧 EmailJS Configuration: {
  serviceId: 'your_service_id',
  templateId: 'template_jianolj',
  publicKey: 'Set'
}
```

If you see `templateId: ''` or `templateId: undefined`, the env variable isn't being read.

### 6. Verify .env File Format

Make sure your `.env` file has:
```env
VITE_EMAILJS_TEMPLATE_PASSWORD_RESET=template_jianolj
```

**Important**:
- No spaces around the `=`
- No quotes around the value
- No trailing spaces
- File is in the project root (same folder as `package.json`)

### 7. Alternative: Check Template ID Format

Sometimes EmailJS template IDs can be different. Try:
- Check if it's just `jianolj` (without `template_` prefix)
- Or check the full template ID from the EmailJS dashboard

## Quick Test

After restarting dev server, check the console output. It should show:
- `🔍 Using Template ID: template_jianolj`
- If it shows empty or undefined, the env variable isn't being read

