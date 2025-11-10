@echo off
REM Firebase Deployment Script for Windows
REM This script ensures a clean, optimized deployment

echo.
echo 🚀 Starting Firebase Deployment Process...
echo.

REM Step 1: Check if Firebase CLI is installed
echo 📦 Checking Firebase CLI...
where firebase >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Firebase CLI not found. Installing...
    npm install -g firebase-tools
) else (
    echo ✅ Firebase CLI found
)

REM Step 2: Check if logged in
echo.
echo 🔐 Checking Firebase login status...
firebase projects:list >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Not logged in. Please login...
    firebase login
) else (
    echo ✅ Logged in to Firebase
)

REM Step 3: Verify project
echo.
echo 🔍 Verifying Firebase project...
firebase use mojo-dojo-casa-house-f31a5

REM Step 4: Check environment file
echo.
echo 📝 Checking environment configuration...
if not exist ".env.production" (
    echo ⚠️  .env.production not found
    echo Creating from env.example.txt...
    if exist "env.example.txt" (
        copy env.example.txt .env.production
        echo ⚠️  Please edit .env.production with your production values!
        pause
    ) else (
        echo ❌ env.example.txt not found. Please create .env.production manually.
        exit /b 1
    )
) else (
    echo ✅ .env.production found
)

REM Step 5: Install dependencies
echo.
echo 📦 Installing dependencies...
call npm install

REM Step 6: Clean previous build
echo.
echo 🧹 Cleaning previous build...
if exist dist rmdir /s /q dist
if exist node_modules\.vite rmdir /s /q node_modules\.vite

REM Step 7: Build for production
echo.
echo 🏗️  Building for production...
call npm run build:prod

REM Step 8: Verify build
if not exist "dist" (
    echo ❌ Build failed! dist folder not found.
    exit /b 1
)

echo ✅ Build successful!

REM Step 9: Ask what to deploy
echo.
echo What would you like to deploy?
echo 1) Hosting only (recommended for quick updates)
echo 2) Everything (Hosting + Firestore + Storage)
set /p choice="Enter choice [1 or 2]: "

if "%choice%"=="1" (
    echo.
    echo 🚀 Deploying to Firebase Hosting...
    firebase deploy --only hosting
) else if "%choice%"=="2" (
    echo.
    echo 🚀 Deploying everything...
    firebase deploy
) else (
    echo ❌ Invalid choice
    exit /b 1
)

REM Step 10: Success message
echo.
echo 🎉 Deployment complete!
echo.
echo Your app should be live. Check Firebase Console for your URL.
echo.
echo Next steps:
echo 1. Test your deployed app
echo 2. Check Firebase Console for any errors
echo 3. Monitor performance and usage
echo.
pause

