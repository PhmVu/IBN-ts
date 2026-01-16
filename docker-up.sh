#!/bin/bash

# Quick Docker Startup for IBN Platform
# Run this to start all services

echo "🚀 Starting IBN Platform..."
echo ""

# Remove version warning
export COMPOSE_IGNORE_ORPHANS=true

echo "📦 Starting all services with docker-compose..."
docker-compose up -d

echo ""
echo "⏳ Waiting 30 seconds for services to initialize..."
sleep 30

echo ""
echo "📊 Current Status:"
docker-compose ps

echo ""
echo "✅ Startup command completed!"
echo ""
echo "Check individual container health:"
echo "  docker ps"
echo ""
echo "View logs for specific container:"
echo "  docker logs ibnts-<container-name>"
echo ""
