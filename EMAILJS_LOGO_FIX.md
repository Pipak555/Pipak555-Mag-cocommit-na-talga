# Fix Logo Display in EmailJS Templates

## Problem
The logo shows as `{{logo_alt}}` placeholder in EmailJS preview because EmailJS preview doesn't always render base64 data URIs properly.

## Solution

The logo will work in **actual emails** (base64 is embedded), but to fix the **preview** in EmailJS dashboard, you have two options:

### Option 1: Upload Logo to EmailJS (Recommended for Preview)

1. **Upload Logo to EmailJS:**
   - Go to EmailJS Dashboard → Your Template
   - Click "Attachments" tab
   - Upload `public/logo.png`
   - Copy the attachment URL (it will look like: `https://cdn.emailjs.com/...`)

2. **Update Template HTML:**
   - In the EmailJS template editor, find the logo `<img>` tag
   - Replace `{{logo_url}}` with the EmailJS attachment URL for preview
   - Keep `{{logo_url}}` for actual emails (it will use base64)

   **Or use a conditional:**
   ```html
   <img src="{{logo_url}}" alt="{{logo_alt}}" style="width: 80px; height: 80px; object-fit: contain; display: block; margin: 0 auto; border: 0; background-color: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 8px;" />
   ```

### Option 2: Use Hosted URL for Preview (Quick Fix)

1. **Ensure logo is accessible at:** `https://mojo-dojo-casa-house-f31a5.web.app/logo.png`
2. **In EmailJS template, use:** `https://mojo-dojo-casa-house-f31a5.web.app/logo.png` directly in the preview
3. **For actual emails:** The code will still send base64 (which works better)

### Option 3: Update Template HTML in EmailJS Dashboard

1. **Copy the updated HTML:**
   - Open `BOOKING_CONFIRMATION_TEMPLATE.html` or `OTP_VERIFICATION_TEMPLATE.html`
   - Copy the entire HTML content

2. **Paste into EmailJS:**
   - Go to EmailJS Dashboard → Email Templates → Your Template
   - Click "Edit Content"
   - Paste the HTML
   - Make sure `{{logo_url}}` variable is in the template variables list
   - Save

3. **Test:**
   - Click "Test It" button
   - The preview should show the logo (if using hosted URL) or placeholder
   - **Actual emails will use base64 and show the logo correctly**

## Important Notes

- ✅ **Base64 logos work in actual emails** - Even if preview doesn't show it, the logo will appear in real emails
- ⚠️ **EmailJS preview limitations** - Preview may not render base64 data URIs
- 💡 **Best practice** - Use base64 for actual emails (works everywhere), use hosted URL for preview

## Verify It's Working

1. Send a test email using "Test It" button in EmailJS
2. Check the actual email (not the preview)
3. The logo should appear in the actual email even if preview doesn't show it

