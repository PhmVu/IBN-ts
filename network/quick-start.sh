#!/bin/bash
# Quick Network Start - Bypass Health Checks
# Run from /network directory

echo "🚀 Starting Fabric Network (Quick Mode)..."

# Start containers directly
echo "📦 Starting containers..."
docker-compose up -d

# Wait for startup
echo "⏳ Waiting 30 seconds for containers to initialize..."
sleep 30

# Check status
echo "✅ Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "Done! Network should be running."
echo "Check with: docker ps"
