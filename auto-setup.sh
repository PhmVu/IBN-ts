#!/bin/bash
#============================================
# IBN Platform - Docker Compose Auto Setup
#============================================
# This script installs docker-compose and starts the full IBN platform

set -e

echo "================================================"
echo "🚀 IBN Platform - Auto Setup Script"
echo "================================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Please run as root or with sudo"
    echo "   sudo bash $0"
    exit 1
fi

# Step 1: Install docker-compose if not installed
echo "📥 Step 1: Checking docker-compose..."
if ! command -v docker-compose &> /dev/null; then
    echo "   docker-compose not found. Installing..."
    
    apt-get update -qq
    apt-get install -y docker-compose
    
    echo "   ✅ docker-compose installed successfully!"
else
    echo "   ✅ docker-compose already installed"
fi

# Verify installation
COMPOSE_VERSION=$(docker-compose --version)
echo "   Version: $COMPOSE_VERSION"
echo ""

# Step 2: Navigate to project root
echo "📂 Step 2: Navigating to project root..."
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"
echo "   Current directory: $PWD"
echo ""

# Step 3: Check docker-compose.yml exists
echo "🔍 Step 3: Verifying docker-compose.yml..."
if [ ! -f "docker-compose.yml" ]; then
    echo "   ❌ ERROR: docker-compose.yml not found!"
    echo "   Make sure you're in the project root directory"
    exit 1
fi
echo "   ✅ docker-compose.yml found"
echo ""

# Step 4: Start full stack
echo "🐳 Step 4: Starting IBN Platform (Full Stack)..."
echo "   This will start:"
echo "   - Fabric Network (CA, Orderer, 3 Peers, CouchDB)"
echo "   - Backend API"
echo "   - Gateway API"
echo "   - Frontend UI"
echo "   - PostgreSQL Database"
echo ""

docker-compose up -d

echo ""
echo "⏳ Waiting 30 seconds for containers to initialize..."
sleep 30

# Step 5: Check status
echo ""
echo "📊 Container Status:"
docker-compose ps

echo ""
echo "================================================"
echo "✅ IBN Platform Started Successfully!"
echo "================================================"
echo ""
echo "Access Points:"
echo "  - Frontend:  http://localhost:3002"
echo "  - Backend:   http://localhost:3001"
echo "  - Gateway:   http://localhost:3000"
echo "  - CouchDB:   http://localhost:35984/_utils"
echo ""
echo "Next Steps:"
echo "  1. Check logs: docker-compose logs -f"
echo "  2. Check peer: docker exec ibnts-peer0.ibn.ictu.edu.vn peer channel list"
echo "  3. View chaincode logs: docker logs ibnts-peer0.ibn.ictu.edu.vn | grep network-core"
echo ""
echo "To stop: docker-compose down"
echo ""
