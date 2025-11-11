#!/bin/bash

# Firebase Deployment Script
# This script ensures a clean, optimized deployment

set -e  # Exit on error

echo "🚀 Starting Firebase Deployment Process..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check if Firebase CLI is installed
echo "📦 Checking Firebase CLI..."
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI not found. Installing...${NC}"
    npm install -g firebase-tools
else
    echo -e "${GREEN}✅ Firebase CLI found${NC}"
fi

# Step 2: Check if logged in
echo ""
echo "🔐 Checking Firebase login status..."
if ! firebase projects:list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in. Please login...${NC}"
    firebase login
else
    echo -e "${GREEN}✅ Logged in to Firebase${NC}"
fi

# Step 3: Verify project
echo ""
echo "🔍 Verifying Firebase project..."
PROJECT_ID=$(firebase use 2>&1 | grep -oP '(?<=Now using project )\S+' || echo "")
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}⚠️  No project selected. Using default...${NC}"
    firebase use mojo-dojo-casa-house-f31a5
else
    echo -e "${GREEN}✅ Using project: $PROJECT_ID${NC}"
fi

# Step 4: Check environment file
echo ""
echo "📝 Checking environment configuration..."
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}⚠️  .env.production not found${NC}"
    echo "Creating from env.example.txt..."
    if [ -f "env.example.txt" ]; then
        cp env.example.txt .env.production
        echo -e "${YELLOW}⚠️  Please edit .env.production with your production values!${NC}"
        read -p "Press Enter after updating .env.production..."
    else
        echo -e "${RED}❌ env.example.txt not found. Please create .env.production manually.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ .env.production found${NC}"
fi

# Step 5: Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Step 6: Clean previous build
echo ""
echo "🧹 Cleaning previous build..."
rm -rf dist
rm -rf node_modules/.vite

# Step 7: Build for production
echo ""
echo "🏗️  Building for production..."
npm run build:prod

# Step 8: Verify build
if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
    echo -e "${RED}❌ Build failed! dist folder is empty.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful!${NC}"

# Step 9: Ask what to deploy
echo ""
echo "What would you like to deploy?"
echo "1) Hosting only (recommended for quick updates)"
echo "2) Everything (Hosting + Firestore + Storage)"
read -p "Enter choice [1 or 2]: " choice

case $choice in
    1)
        echo ""
        echo "🚀 Deploying to Firebase Hosting..."
        firebase deploy --only hosting
        ;;
    2)
        echo ""
        echo "🚀 Deploying everything..."
        firebase deploy
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

# Step 10: Success message
echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo "Your app should be live at:"
firebase hosting:sites:list 2>/dev/null | grep -oP 'https://\S+' || echo "Check Firebase Console for your URL"
echo ""
echo "Next steps:"
echo "1. Test your deployed app"
echo "2. Check Firebase Console for any errors"
echo "3. Monitor performance and usage"


