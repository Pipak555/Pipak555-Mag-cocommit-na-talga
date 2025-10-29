# Custom Domain Setup for Firebase Auth Emails

## 🎯 Goal
Set up a custom domain (e.g., `auth.firebnb.com`) so your verification emails look professional instead of coming from `mojo-dojo-casa-house-f31a5.firebaseapp.com`.

## 📋 Prerequisites
- A domain name (or subdomain)
- Access to your domain's DNS settings
- Firebase project access

## 🚀 Step-by-Step Setup

### Step 1: Choose Your Domain
**Option A: Use a subdomain of an existing domain**
- If you own `yourdomain.com`, use `auth.yourdomain.com`
- If you own `firebnb.com`, use `auth.firebnb.com`

**Option B: Get a new domain**
- Free options: Freenom (.tk, .ml domains)
- Paid options: Namecheap, GoDaddy, Cloudflare
- Cost: $0-15/year

### Step 2: Configure Firebase Console

1. **Open Firebase Console**
   - Go to: https://console.firebase.google.com/
   - Select your project: `mojo-dojo-casa-house-f31a5`

2. **Add Authorized Domain**
   - Navigate to: **Authentication** → **Settings**
   - Scroll to **"Authorized domains"**
   - Click **"Add domain"**
   - Enter: `auth.yourdomain.com` (replace with your actual domain)
   - Click **"Add"**

3. **Update Email Template Action URL**
   - Go to: **Authentication** → **Templates**
   - Click **"Email address verification"**
   - Click **"Customize action URL"**
   - Set to: `https://yourdomain.com/verify-email`
   - Click **"Save"**

### Step 3: Configure DNS Records

**For most domain providers (GoDaddy, Namecheap, etc.):**

1. **Log into your domain registrar**
2. **Find DNS Management**
3. **Add CNAME record:**
   ```
   Type: CNAME
   Name: auth
   Value: mojo-dojo-casa-house-f31a5.firebaseapp.com
   TTL: 300 (or default)
   ```

**For Cloudflare users:**
1. Go to **DNS** → **Records**
2. Click **"Add record"**
3. Fill in:
   - **Type:** CNAME
   - **Name:** auth
   - **Target:** mojo-dojo-casa-house-f31a5.firebaseapp.com
   - **Proxy status:** Proxied (orange cloud)

**For other providers:**
- Look for "DNS Management", "DNS Settings", or "Zone Editor"
- Add a CNAME record with the same values

### Step 4: Update Your App

Your Firebase config is already set up! Just update your `.env` file:

```env
# In your .env file
VITE_FIREBASE_AUTH_DOMAIN=auth.yourdomain.com
```

Or if you don't have a `.env` file, create one:
```bash
# Create .env file in your project root
echo "VITE_FIREBASE_AUTH_DOMAIN=auth.yourdomain.com" > .env
```

### Step 5: Test the Setup

1. **Wait for DNS propagation** (5-60 minutes)
2. **Start your app:**
   ```bash
   npm run dev
   ```
3. **Test the flow:**
   - Sign up with a new email
   - Check if the verification email comes from your custom domain
   - Click the verification link

## 🔍 Troubleshooting

### DNS Not Working?
- **Check DNS propagation:** Use https://dnschecker.org
- **Wait longer:** DNS can take up to 24 hours
- **Check spelling:** Make sure the CNAME record is exactly right

### Firebase Not Recognizing Domain?
- **Check authorized domains:** Make sure it's added in Firebase Console
- **Check spelling:** Domain must match exactly
- **Wait for propagation:** Can take a few minutes

### Emails Still Plain?
- **Check action URL:** Must be set to your domain
- **Check DNS:** Make sure CNAME is working
- **Clear cache:** Try in incognito mode

## 🎉 Expected Results

After setup, your verification emails will:
- ✅ Come from `noreply@auth.yourdomain.com` instead of Firebase
- ✅ Look more professional
- ✅ Still work with your beautiful verification pages
- ✅ Have better deliverability

## 📞 Need Help?

**Common Issues:**
1. **"Domain not authorized"** → Add domain to Firebase authorized domains
2. **"DNS not found"** → Check CNAME record, wait for propagation
3. **"Email still plain"** → Check action URL in Firebase templates

**Quick Test:**
```bash
# Test if DNS is working
nslookup auth.yourdomain.com
# Should return: mojo-dojo-casa-house-f31a5.firebaseapp.com
```

## 🚀 Next Steps

Once your custom domain is working:
1. **Test the complete flow**
2. **Consider getting an SSL certificate** (if not already)
3. **Set up email monitoring** to track delivery
4. **Customize further** with your branding

Your verification system will look much more professional with a custom domain!
