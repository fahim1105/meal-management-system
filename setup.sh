#!/bin/bash

echo "🚀 Mess Manager Setup Script"
echo "=============================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo ""

# Check if MongoDB is running
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB is not installed or not in PATH"
    echo "   Please install MongoDB: https://www.mongodb.com/try/download/community"
else
    echo "✅ MongoDB is installed"
fi
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo "✅ Frontend dependencies installed"
else
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
if [ $? -eq 0 ]; then
    echo "✅ Backend dependencies installed"
else
    echo "❌ Failed to install backend dependencies"
    exit 1
fi
cd ..
echo ""

# Check for .env files
echo "🔍 Checking environment files..."
if [ ! -f ".env" ]; then
    echo "⚠️  Frontend .env file not found"
    echo "   Creating from .env.example..."
    cp .env.example .env
    echo "   ⚠️  Please edit .env with your Firebase credentials"
fi

if [ ! -f "backend/.env" ]; then
    echo "⚠️  Backend .env file not found"
    echo "   Creating from backend/.env.example..."
    cp backend/.env.example backend/.env
    echo "   ⚠️  Please edit backend/.env with your credentials"
fi
echo ""

echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Edit .env with your Firebase credentials"
echo "   2. Edit backend/.env with your MongoDB and Firebase Admin credentials"
echo "   3. Start MongoDB: brew services start mongodb-community (macOS)"
echo "   4. Start backend: cd backend && npm run dev"
echo "   5. Start frontend: npm run dev"
echo ""
echo "📚 For detailed instructions, see QUICKSTART.md"
