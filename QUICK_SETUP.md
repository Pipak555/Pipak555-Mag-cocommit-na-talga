# Quick Cloudinary Setup

Based on your Cloudinary dashboard, here's what you need to do:

## Your Cloudinary Credentials

From your dashboard:
- **Cloud Name**: `dpctmlqay`
- **API Key**: `866389297256979` (not needed for unsigned uploads)
- **API Secret**: `gHasaGECVNvf-yu9K76-aB_ZUow` ⚠️ **DO NOT USE IN CLIENT-SIDE CODE**

## Step 1: Create an Unsigned Upload Preset

1. In your Cloudinary dashboard, go to **Settings** → **Upload** tab
2. Scroll down to **Upload presets** section
3. Click **Add upload preset**
4. Configure:
   - **Preset name**: `mojo_dojo_unsigned` (or any name you prefer)
   - **Signing mode**: Select **Unsigned** ⚠️ (This is IMPORTANT!)
   - **Folder**: `listings` (optional, for organization)
   - **Upload manipulation**:
     - Check **Eager transformations** (optional)
     - Add transformation: `f_auto,q_auto` (auto format and quality)
5. Click **Save**

## Step 2: Add to .env File

Create or update your `.env` file in the project root (same folder as `package.json`):

```env
# Cloudinary Configuration
VITE_CLOUDINARY_CLOUD_NAME=dpctmlqay
VITE_CLOUDINARY_UPLOAD_PRESET=mojo_dojo_unsigned
```

**⚠️ IMPORTANT:**
- **DO NOT** add `VITE_CLOUDINARY_API_SECRET` 
- **DO NOT** add `VITE_CLOUDINARY_API_KEY`
- Only Cloud Name and Upload Preset are needed for unsigned uploads
- This is secure and the correct way to do client-side uploads

## Step 3: Restart Your Dev Server

After creating the `.env` file:

```bash
npm run dev
```

## Why Unsigned Uploads?

- ✅ **Secure**: API Secret stays on server-side only
- ✅ **Simple**: No need for API Key/Secret in client code
- ✅ **Standard**: Common practice for React/Next.js apps
- ✅ **Safe**: Upload preset controls what can be uploaded

## Testing

1. Create a new listing as a host
2. Upload images
3. Check browser console for errors
4. Images should upload successfully!

## Troubleshooting

**Error: "Upload preset not found"**
- Make sure you created the preset with **Unsigned** signing mode
- Verify the preset name in `.env` matches exactly

**Error: "Cloud Name not configured"**
- Check `.env` file exists in project root
- Restart dev server after adding env variables

