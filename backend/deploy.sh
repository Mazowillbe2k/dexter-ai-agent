#!/bin/bash

# Dexter AI Backend Deployment Script for Render

echo "🚀 Starting Dexter AI Backend deployment..."

# Check if we're in a Render environment
if [ -n "$RENDER" ]; then
    echo "📦 Render environment detected"
    echo "🔧 Installing dependencies..."
    npm install --only=production --no-audit --no-fund
    
    echo "✅ Dependencies installed successfully"
    echo "🔍 Checking Node.js version..."
    node --version
    
    echo "🔍 Checking npm version..."
    npm --version
    
    echo "📋 Environment variables:"
    echo "NODE_ENV: $NODE_ENV"
    echo "PORT: $PORT"
    echo "CORS_ORIGIN: $CORS_ORIGIN"
    echo "LOG_LEVEL: $LOG_LEVEL"
    
    echo "✅ Deployment script completed"
else
    echo "📦 Local environment detected"
    echo "🔧 Installing dependencies..."
    npm install
    
    echo "✅ Dependencies installed successfully"
fi

echo "🎉 Deployment script finished successfully!" 