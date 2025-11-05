# Video Backgrounds Setup Guide

This directory should contain the video files for background videos used in the application.

## Required Video Files

Place the following video files in this directory (`public/videos/`):

1. **landing-hero.mp4** - Landing page hero section
   - Recommended: Travel, vacation, luxury accommodation scenes
   - Search terms: "travel", "vacation", "luxury home", "beautiful destination"

2. **category-home.mp4** - Category card for Homes (appears on hover)
   - Recommended: Beautiful home interiors, cozy living spaces, luxury accommodations
   - Search terms: "home interior", "luxury home", "modern house", "cozy living room"
   - **Note:** Video will auto-fit using `object-cover` CSS, so any aspect ratio will work

3. **category-experience.mp4** - Category card for Experiences (appears on hover)
   - Recommended: Outdoor activities, adventures, travel experiences
   - Search terms: "outdoor adventure", "travel experience", "hiking", "beach activities"
   - **Note:** Video will auto-fit using `object-cover` CSS, so any aspect ratio will work

4. **category-service.mp4** - Category card for Services (appears on hover)
   - Recommended: Cleaning services, professional services, maintenance
   - Search terms: "cleaning service", "professional service", "maintenance", "home service"
   - **Note:** Video will auto-fit using `object-cover` CSS, so any aspect ratio will work

5. **guest-login-bg.mp4** - Guest login/signup page
   - Recommended: Traveler, adventure, beach vacation scenes
   - Search terms: "traveler", "adventure", "beach vacation", "exploring"

6. **host-login-bg.mp4** - Host login/signup page
   - Recommended: Home, property, hospitality scenes
   - Search terms: "home", "property", "hospitality", "real estate"

7. **admin-login-bg.mp4** - Admin login page
   - Recommended: Business, professional, office scenes
   - Search terms: "business", "professional", "office", "technology"

## Where to Get Free Videos

### Recommended Sources (100% Free, No Attribution Required):

1. **Pexels Videos** - https://www.pexels.com/videos/
   - High quality, free, no attribution required
   - Search for your keywords and download MP4 format

2. **Pixabay Videos** - https://pixabay.com/videos/
   - Free videos with CC0 license
   - Similar quality to Pexels

3. **Coverr** - https://coverr.co/
   - Free stock videos for backgrounds
   - Great selection of loopable videos

## Video Optimization Tips

To ensure best performance:

1. **Resolution**: 
   - Landing page: 1920x1080 (Full HD) is optimal
   - Category cards: 1280x720 (HD) or 1920x1080 (Full HD) - **videos will auto-fit using `object-cover`**
2. **File Size**: 
   - Landing page: Keep under 10MB per video (ideally 5-8MB)
   - Category cards: Keep under 5MB per video (ideally 2-3MB) - smaller is better for hover loading
3. **Format**: MP4 with H.264 codec
4. **Duration**: 
   - Landing page: 10-30 seconds (will loop)
   - Category cards: 3-8 seconds (will loop) - shorter is better for hover effects
5. **Bitrate**: 2-5 Mbps for good quality/size balance
6. **Aspect Ratio**: **Any aspect ratio will work** - videos use `object-cover` CSS which automatically fits the container while maintaining aspect ratio (cropping if necessary)

### How to Compress Videos:

**Using HandBrake (Free):**
1. Download HandBrake: https://handbrake.fr/
2. Open your video
3. Preset: "Fast 1080p30" or "Fast 720p30"
4. Video tab: H.264 codec, Quality: 22-24 RF
5. Export as MP4

**Using Online Tools:**
- CloudConvert: https://cloudconvert.com/
- FreeConvert: https://www.freeconvert.com/
- Clipchamp: https://clipchamp.com/ (browser-based)

## Alternative: Using Assets Folder

If you prefer to import videos directly in your code (instead of public folder), you can:

1. Create `src/assets/videos/` directory
2. Place videos there
3. Update imports in the pages:
   ```typescript
   import landingVideo from '@/assets/videos/landing-hero.mp4';
   ```

## Fallback Behavior

If videos are not found or fail to load:
- Mobile devices: Automatically fall back to static image
- Desktop: Falls back to static image from the original hero image
- No errors will be shown - graceful degradation

## Testing

After adding videos:
1. Ensure files are named exactly as specified
2. Refresh your browser
3. Test on different screen sizes
4. Check network tab to verify videos load properly

## Notes

- Videos will automatically loop
- Muted by default (required for autoplay)
- Mobile devices will show static image for better performance
- Videos should be "mood" videos (scenic, atmospheric) rather than action-heavy

