#!/bin/bash
#============================================
# IBN Platform - Phased Startup (Low Memory)
#============================================
# Starts services in phases to avoid OOM in WSL2

set -e

echo "================================================"
echo "🚀 IBN Platform - Phased Startup"
echo "================================================"
echo ""
echo "⚠️  This script starts services in phases to avoid memory issues"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Please run as root: sudo bash $0"
    exit 1
fi

# Navigate to project root
cd "/mnt/d/Blockchain/IBN with TypeScript"

# Phase 1: Database (lightest)
echo "📦 Phase 1: Starting Database..."
docker-compose up -d postgres
echo "   Waiting 15 seconds..."
sleep 15
docker-compose ps postgres

# Phase 2: CouchDB
echo ""
echo "📦 Phase 2: Starting CouchDB..."
docker-compose up -d couchdb
echo "   Waiting 15 seconds..."
sleep 15
docker-compose ps couchdb

# Phase 3: Fabric CA & Orderer
echo ""
echo "📦 Phase 3: Starting Fabric CA & Orderer..."
docker-compose up -d ca.ibn.ictu.edu.vn orderer.ictu.edu.vn
echo "   Waiting 20 seconds..."
sleep 20
docker-compose ps ca.ibn.ictu.edu.vn orderer.ictu.edu.vn

# Phase 4: Peers (one by one)
echo ""
echo "📦 Phase 4: Starting Peers..."
docker-compose up -d peer0.ibn.ictu.edu.vn
echo "   Peer0 starting... waiting 15 seconds"
sleep 15

docker-compose up -d peer1.ibn.ictu.edu.vn
echo "   Peer1 starting... waiting 10 seconds"
sleep 10

docker-compose up -d peer2.ibn.ictu.edu.vn
echo "   Peer2 starting... waiting 10 seconds"
sleep 10

# Phase 5: Gateway
echo ""
echo "📦 Phase 5: Starting Gateway..."
docker-compose up -d gateway-api
echo "   Waiting 10 seconds..."
sleep 10

# Phase 6: Backend
echo ""
echo "📦 Phase 6: Starting Backend..."
docker-compose up -d backend-api
echo "   Waiting 10 seconds..."
sleep 10

# Phase 7: Frontend
echo ""
echo "📦 Phase 7: Starting Frontend..."
docker-compose up -d frontend
echo "   Waiting 5 seconds..."
sleep 5

# Final Status
echo ""
echo "================================================"
echo "✅ All Services Started!"
echo "================================================"
echo ""
docker-compose ps

echo ""
echo "Access Points:"
echo "  - Frontend:  http://localhost:3002"
echo "  - Backend:   http://localhost:3001"
echo "  - Gateway:   http://localhost:3000"
echo ""
echo "To check chaincode:"
echo "  docker logs ibnts-peer0.ibn.ictu.edu.vn | grep network-core"
echo ""
