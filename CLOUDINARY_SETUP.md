# Cloudinary Setup Guide

This project uses **Cloudinary** for image storage instead of Firebase Storage. Cloudinary offers a generous free tier that doesn't require billing upgrades.

## Why Cloudinary?

- ✅ **Free Tier**: 25 GB storage + 25 GB bandwidth/month
- ✅ **No billing upgrade required** (unlike Firebase Storage)
- ✅ **Image optimization** built-in
- ✅ **CDN delivery** for fast image loading
- ✅ **Easy integration** with React

## Setup Instructions

### Step 1: Create a Cloudinary Account

1. Go to [https://cloudinary.com](https://cloudinary.com)
2. Click "Sign Up for Free"
3. Complete the registration process

### Step 2: Get Your Credentials

1. After signing up, you'll be redirected to your dashboard
2. Find your **Cloud Name** (displayed at the top of the dashboard)
3. Go to **Settings** → **Upload** tab
4. Find your **API Key** (or create one if needed)

### Step 3: Create an Upload Preset (Recommended)

1. Go to **Settings** → **Upload** tab
2. Scroll down to **Upload presets**
3. Click **Add upload preset**
4. Configure:
   - **Preset name**: `mojo_dojo_unsigned` (or any name you prefer)
   - **Signing mode**: Select **Unsigned** (for client-side uploads)
   - **Folder**: `listings` (optional, for organization)
   - **Upload manipulation**:
     - Enable **Eager transformations** (optional)
     - Add transformation: `f_auto,q_auto` (auto format and quality)
5. Click **Save**

### Step 4: Add Environment Variables

Create or update your `.env` file in the project root:

```env
# Cloudinary Configuration
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name_here
VITE_CLOUDINARY_UPLOAD_PRESET=mojo_dojo_unsigned
```

**Important:**
- Replace `your_cloud_name_here` with your actual Cloud Name (e.g., `dpctmlqay`)
- Replace `mojo_dojo_unsigned` with your upload preset name (if different)
- **DO NOT add API Secret** - it should NEVER be in client-side code (security risk!)
- Only use unsigned upload presets for client-side uploads (this is secure)

**Example based on your dashboard:**
```env
VITE_CLOUDINARY_CLOUD_NAME=dpctmlqay
VITE_CLOUDINARY_UPLOAD_PRESET=mojo_dojo_unsigned
```

### Step 5: Restart Your Development Server

After adding the environment variables:

```bash
npm run dev
```

## How It Works

1. **Host uploads images** → Images are uploaded directly to Cloudinary
2. **Cloudinary optimizes** → Images are automatically optimized (format, quality)
3. **URLs stored in Firestore** → Cloudinary returns secure URLs that are stored in your listing documents
4. **Images displayed** → All users (guests, hosts, admins) can view the images via the Cloudinary CDN

## Folder Structure in Cloudinary

Images are organized as:
- `listings/{listingId}/0.jpg` (first image)
- `listings/{listingId}/1.jpg` (second image)
- etc.

## Free Tier Limits

**Included in Free Tier:**
- 25 GB storage
- 25 GB bandwidth/month
- 25,000 transformations/month
- Unlimited uploads

**What happens if you exceed:**
- Cloudinary will notify you
- You can upgrade to paid plans if needed
- Or optimize/compress images more to reduce usage

## Testing

To test if Cloudinary is working:

1. Create a new listing as a host
2. Upload images
3. Check the browser console for any errors
4. Verify images appear after upload

## Troubleshooting

**Error: "Cloudinary Cloud Name is not configured"**
- Make sure `.env` file exists in the project root
- Check that `VITE_CLOUDINARY_CLOUD_NAME` is set correctly
- Restart your dev server after adding env variables

**Error: "Upload preset not found"**
- Verify the preset name in `.env` matches your Cloudinary preset
- Make sure the preset is set to **Unsigned** mode

**Images not displaying**
- Check that the URLs are being saved correctly in Firestore
- Verify Cloudinary URLs are accessible (try opening in browser)

## Support

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Cloudinary React SDK](https://cloudinary.com/documentation/react_integration)
- [Cloudinary Dashboard](https://cloudinary.com/console)

