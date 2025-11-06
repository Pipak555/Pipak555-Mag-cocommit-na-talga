# Firebase Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables
Ensure all environment variables are set in Firebase Hosting:
- Go to Firebase Console > Hosting > Environment Variables
- Add all `VITE_*` variables from your `.env` file

### 2. Build Optimization
The project is already optimized with:
- ✅ Code splitting (lazy loading)
- ✅ Minification (Terser)
- ✅ Console.log removal in production
- ✅ Asset optimization
- ✅ Caching headers
- ✅ Compression enabled

### 3. Security Rules
Deploy Firestore and Storage rules:
```bash
firebase deploy --only firestore:rules,storage
```

### 4. Indexes
Deploy Firestore indexes:
```bash
firebase deploy --only firestore:indexes
```

## Deployment Steps

### Quick Deploy
```bash
npm run deploy
```

This will:
1. Run linting
2. Build for production
3. Deploy to Firebase Hosting

### Full Deploy (Including Rules & Indexes)
```bash
npm run deploy:all
```

### Manual Deploy
```bash
# Build for production
npm run build:prod

# Deploy to hosting only
firebase deploy --only hosting

# Or deploy everything
firebase deploy
```

## Build Optimization Features

### Code Splitting
- React vendor chunk
- Firebase vendor chunk
- UI components chunk
- Form libraries chunk
- Utility libraries chunk
- Charts chunk (lazy loaded)
- Maps chunk (lazy loaded)
- Icons chunk (lazy loaded)

### Performance Optimizations
- Lazy loading for all routes
- Console.log removal in production
- Asset inlining (< 4KB)
- CSS code splitting
- Terser minification with multiple passes
- Gzip compression enabled

### Caching Strategy
- Static assets: 1 year cache
- HTML: No cache (always fresh)
- Security headers enabled

## Post-Deployment

### Verify Deployment
1. Check Firebase Hosting URL
2. Test all major routes
3. Verify authentication works
4. Check console for errors (should be minimal in production)

### Monitor Performance
- Use Firebase Performance Monitoring
- Check bundle sizes in build output
- Monitor Firestore usage
- Check Storage usage

## Troubleshooting

### Build Fails
- Check for TypeScript errors: `npm run lint`
- Verify all dependencies are installed: `npm install`
- Check Node.js version (should be 18+)

### Deployment Fails
- Verify Firebase CLI is logged in: `firebase login`
- Check Firebase project: `firebase projects:list`
- Verify hosting is initialized: `firebase init hosting`

### Performance Issues
- Check bundle sizes in build output
- Use `npm run build:analyze` to visualize bundles
- Consider removing unused dependencies
