#!/bin/bash

# Docker Start Script for WSL
# Purpose: Start Docker service and verify Fabric network

echo "================================================"
echo "🐳 Starting Docker Service in WSL"
echo "================================================"

# Start Docker service
echo "📌 Starting Docker daemon..."
sudo service docker start

# Wait for Docker to be ready
echo "⏳ Waiting for Docker to initialize..."
sleep 3

# Check Docker status
echo "✅ Checking Docker status..."
if docker ps > /dev/null 2>&1; then
    echo "✅ Docker is running!"
    echo ""
    
    # Show running containers
    echo "📦 Running containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    
    # Show all containers (including stopped)
    echo "📦 All containers:"
    docker ps -a --format "table {{.Names}}\t{{.Status}}"
    echo ""
    
    # Check for network-core chaincode
    echo "🔍 Searching for network-core chaincode containers..."
    docker ps -a | grep network-core || echo "❌ No network-core containers found"
    
else
    echo "❌ Docker failed to start. Try running:"
    echo "   sudo service docker start"
    echo "   sudo service docker status"
    exit 1
fi

echo ""
echo "================================================"
echo "✅ Docker is ready!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Check Fabric network: docker ps"
echo "2. Get chaincode logs: docker logs ibnts-peer0.ibn.ictu.edu.vn --tail 200 | grep network-core"
echo "3. Start network if needed: cd network && docker-compose up -d"
