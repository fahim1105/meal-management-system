#!/bin/bash

echo "🚀 Deploying Backend to Vercel..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null
then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Deploy to production
echo "📦 Building and deploying..."
vercel --prod

echo "✅ Deployment complete!"
echo ""
echo "🔍 Test your deployment:"
echo "   Health Check: https://your-backend-url.vercel.app/api/health"
echo "   Root: https://your-backend-url.vercel.app/"
echo ""
echo "⚠️  Remember to:"
echo "   1. Set environment variables in Vercel Dashboard"
echo "   2. Add 0.0.0.0/0 to MongoDB Atlas Network Access"
echo "   3. Update frontend .env with new backend URL"
