#!/bin/bash

echo "🚀 Starting Moccet Chat Demo Local Development Environment"
echo "========================================================="

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Please install it with: npm install -g vercel"
    exit 1
fi

# Kill any existing processes on required ports
echo "🧹 Cleaning up existing processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:9099 | xargs kill -9 2>/dev/null || true
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
lsof -ti:9199 | xargs kill -9 2>/dev/null || true
lsof -ti:5001 | xargs kill -9 2>/dev/null || true

# Start Firebase emulators
echo "🔥 Starting Firebase emulators..."
firebase emulators:start &
FIREBASE_PID=$!

# Wait for emulators to start
echo "⏳ Waiting for Firebase emulators to start..."
sleep 10

# Check if emulators are running
if ! curl -s http://localhost:8080 > /dev/null; then
    echo "❌ Firebase emulators failed to start"
    kill $FIREBASE_PID 2>/dev/null
    exit 1
fi

echo "✅ Firebase emulators started successfully"
echo "   - Auth: http://localhost:9099"
echo "   - Firestore: http://localhost:8080"
echo "   - Storage: http://localhost:9199"
echo "   - UI: http://localhost:4000"

# Start Vercel dev server
echo "▲ Starting Vercel dev server..."
vercel dev --listen 3001 &
VERCEL_PID=$!

# Wait for Vercel to start
echo "⏳ Waiting for Vercel dev server to start..."
sleep 15

echo "✅ All services started!"
echo ""
echo "🌐 Access your app at: http://localhost:3001"
echo "🔥 Firebase Emulator UI: http://localhost:4000"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user to stop
trap "echo '🛑 Stopping all services...'; kill $FIREBASE_PID $VERCEL_PID 2>/dev/null; exit 0" INT
wait