# Open Graph Image Setup

## ✅ What's Been Fixed

The Facebook Open Graph preview image has been updated to use your own image instead of the Lovable.dev branding.

## 📸 Current Setup

- **Image Location**: `public/og-image.jpg` (copied from hero image)
- **Meta Tags**: Updated in `index.html` with proper dimensions and URLs
- **URL**: Points to `https://mojo-dojo-casa-house-80845.web.app/og-image.jpg`

## 🎨 Recommended Image Specifications

For best results on Facebook, your Open Graph image should be:
- **Dimensions**: 1200 x 630 pixels (1.91:1 aspect ratio)
- **File Size**: Under 8MB (smaller is better for faster loading)
- **Format**: JPG or PNG
- **Content**: Should include your logo/branding and a compelling visual

## 🔄 How to Update the Image

1. Create or design a 1200x630px image with your branding
2. Save it as `og-image.jpg` in the `public` folder
3. Rebuild and redeploy:
   ```bash
   npm run build:prod
   firebase deploy --only hosting
   ```

## 🧪 Testing Your Facebook Preview

After deploying, test your preview using:

1. **Facebook Sharing Debugger**: https://developers.facebook.com/tools/debug/
   - Enter your URL: `https://mojo-dojo-casa-house-80845.web.app`
   - Click "Scrape Again" to clear cache and see the new preview

2. **LinkedIn Post Inspector**: https://www.linkedin.com/post-inspector/
   - For LinkedIn preview testing

3. **Twitter Card Validator**: https://cards-dev.twitter.com/validator
   - For Twitter preview testing

## ⚠️ Important Notes

- **Facebook caches images**: After updating the image, use the Sharing Debugger to clear the cache
- **Absolute URLs required**: The image URL must be absolute (starting with https://)
- **HTTPS required**: Facebook requires images to be served over HTTPS

## 📝 Current Meta Tags

The following meta tags are now properly configured:
- `og:image` - Image URL
- `og:image:width` - Image width (1200)
- `og:image:height` - Image height (630)
- `og:image:alt` - Alt text for accessibility
- `og:url` - Canonical URL
- `og:site_name` - Site name
- `twitter:image` - Twitter card image
- `twitter:image:alt` - Twitter image alt text

