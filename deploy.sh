#!/bin/bash
set -e

echo "🚂 Railhub Deploy Script"
echo "========================"

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    echo "❌ Error: Must run from railhub root directory"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install Railway CLI if needed
if ! command_exists railway; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Install Vercel CLI if needed
if ! command_exists vercel; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

echo ""
echo "🔧 Setting up Backend on Railway..."
echo "===================================="
cd backend

# Login to Railway (will open browser)
echo "Opening Railway login..."
railway login

# Initialize project
echo "Creating Railway project..."
railway init --name railhub-api

# Link to Postgres (create if doesn't exist)
echo "Setting up PostgreSQL..."
railway add --database postgres

# Set environment variables
echo "Configuring environment..."
railway variables set FRONTEND_URL="https://railhub.vercel.app"

# Deploy
echo "🚀 Deploying backend..."
railway up

# Get the backend URL
BACKEND_URL=$(railway domain)
echo "✅ Backend deployed to: $BACKEND_URL"

cd ..

echo ""
echo "🎨 Setting up Frontend on Vercel..."
echo "==================================="
cd frontend

# Set API URL
export VITE_API_URL="$BACKEND_URL/api"

# Deploy to Vercel
echo "🚀 Deploying frontend..."
vercel --prod --yes

echo ""
echo "✅ Deployment Complete!"
echo "======================="
echo "Backend: $BACKEND_URL"
echo "Frontend: https://railhub.vercel.app"
