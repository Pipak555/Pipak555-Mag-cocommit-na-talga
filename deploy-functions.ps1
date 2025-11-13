# Quick Deploy Firebase Functions Script
# This will deploy functions to your new Firebase project

Write-Host "🚀 Deploying Firebase Functions..." -ForegroundColor Cyan
Write-Host ""

# Check if firebase CLI is installed
try {
    firebase --version | Out-Null
} catch {
    Write-Host "❌ Firebase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

# Set the project
Write-Host "📋 Setting Firebase project to: mojo-dojo-casa-house-80845" -ForegroundColor Yellow
firebase use mojo-dojo-casa-house-80845

# Build functions
Write-Host ""
Write-Host "🔨 Building functions..." -ForegroundColor Yellow
cd functions
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}
cd ..

# Deploy functions
Write-Host ""
Write-Host "🚀 Deploying functions (this may take 5-10 minutes)..." -ForegroundColor Yellow
firebase deploy --only functions --project mojo-dojo-casa-house-80845

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Functions deployed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Go back to your app and try linking PayPal again" -ForegroundColor White
    Write-Host "   2. The CORS error should be fixed now!" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed. Check the error messages above." -ForegroundColor Red
}

