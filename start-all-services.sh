#!/bin/bash

# IBN Platform - Complete Service Startup Script
# This script starts all services in the correct order with health checks

set -e

echo "=========================================="
echo "IBN Platform - Starting All Services"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to wait for service health
wait_for_health() {
    local service=$1
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}Waiting for $service to be healthy...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        health_status=$(docker inspect --format='{{.State.Health.Status}}' "ibnts-$service" 2>/dev/null || echo "none")
        
        if [ "$health_status" = "healthy" ]; then
            echo -e "${GREEN}✓ $service is healthy${NC}"
            return 0
        fi
        
        echo "  Attempt $attempt/$max_attempts - Status: $health_status"
        sleep 2
        ((attempt++))
    done
    
    echo -e "${RED}✗ $service failed to become healthy${NC}"
    return 1
}

# Function to wait for service to be running (no health check)
wait_for_running() {
    local service=$1
    local max_attempts=10
    local attempt=1
    
    echo -e "${YELLOW}Waiting for $service to be running...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        status=$(docker inspect --format='{{.State.Status}}' "ibnts-$service" 2>/dev/null || echo "none")
        
        if [ "$status" = "running" ]; then
            echo -e "${GREEN}✓ $service is running${NC}"
            return 0
        fi
        
        echo "  Attempt $attempt/$max_attempts - Status: $status"
        sleep 2
        ((attempt++))
    done
    
    echo -e "${RED}✗ $service failed to start${NC}"
    return 1
}

echo "=========================================="
echo "Phase 1: Starting Core Infrastructure"
echo "=========================================="
echo ""

echo "→ Starting PostgreSQL..."
docker-compose up -d postgres
wait_for_health "postgres"

echo ""
echo "→ Starting Redis..."
docker-compose up -d redis
wait_for_health "redis"

echo ""
echo "=========================================="
echo "Phase 2: Starting Hyperledger Fabric CA"
echo "=========================================="
echo ""

echo "→ Starting Fabric CA..."
docker-compose up -d ca.ibn.ictu.edu.vn
sleep 5
# CA might have health check issues, just verify it's running
wait_for_running "ca.ibn.ictu.edu.vn"

echo ""
echo "=========================================="
echo "Phase 3: Starting CouchDB Instances"
echo "=========================================="
echo ""

echo "→ Starting CouchDB instances..."
docker-compose up -d couchdb couchdb1 couchdb2
echo "  Waiting for CouchDB to initialize..."
wait_for_health "couchdb0"
wait_for_health "couchdb1"
wait_for_health "couchdb2"

echo ""
echo "=========================================="
echo "Phase 4: Starting Fabric Orderer"
echo "=========================================="
echo ""

echo "→ Starting Orderer..."
docker-compose up -d orderer.ictu.edu.vn
sleep 5
wait_for_running "orderer.ictu.edu.vn"

echo ""
echo "=========================================="
echo "Phase 5: Starting Fabric Peers"
echo "=========================================="
echo ""

echo "→ Starting Peer0..."
docker-compose up -d peer0.ibn.ictu.edu.vn
wait_for_health "peer0.ibn.ictu.edu.vn"

echo ""
echo "→ Starting Peer1..."
docker-compose up -d peer1.ibn.ictu.edu.vn
wait_for_health "peer1.ibn.ictu.edu.vn"

echo ""
echo "→ Starting Peer2..."
docker-compose up -d peer2.ibn.ictu.edu.vn
wait_for_health "peer2.ibn.ictu.edu.vn"

echo ""
echo "=========================================="
echo "Phase 6: Starting Gateway API"
echo "=========================================="
echo ""

echo "→ Starting Gateway API..."
docker-compose up -d gateway-api
echo "  Waiting for Gateway API to build and start..."
sleep 10
# Gateway might have health check issues, check if running
status=$(docker inspect --format='{{.State.Status}}' "ibnts-gateway-api" 2>/dev/null || echo "none")
if [ "$status" = "running" ]; then
    echo -e "${GREEN}✓ Gateway API is running${NC}"
else
    echo -e "${YELLOW}⚠ Gateway API status: $status (checking logs...)${NC}"
    docker logs ibnts-gateway-api --tail 20
fi

echo ""
echo "=========================================="
echo "Phase 7: Starting Backend API"
echo "=========================================="
echo ""

echo "→ Starting Backend API..."
docker-compose up -d backend-api
echo "  Waiting for Backend API to build and start..."
sleep 10
# Backend might have health check issues, check if running
status=$(docker inspect --format='{{.State.Status}}' "ibnts-backend-api" 2>/dev/null || echo "none")
if [ "$status" = "running" ]; then
    echo -e "${GREEN}✓ Backend API is running${NC}"
else
    echo -e "${YELLOW}⚠ Backend API status: $status (checking logs...)${NC}"
    docker logs ibnts-backend-api --tail 20
fi

echo ""
echo "=========================================="
echo "System Status Summary"
echo "=========================================="
echo ""

docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "=========================================="
echo "Health Check Summary"
echo "=========================================="
echo ""

for container in postgres redis couchdb0 couchdb1 couchdb2 peer0.ibn.ictu.edu.vn peer1.ibn.ictu.edu.vn peer2.ibn.ictu.edu.vn; do
    health_status=$(docker inspect --format='{{.State.Health.Status}}' "ibnts-$container" 2>/dev/null || echo "no health check")
    if [ "$health_status" = "healthy" ]; then
        echo -e "${GREEN}✓${NC} ibnts-$container: $health_status"
    elif [ "$health_status" = "no health check" ]; then
        status=$(docker inspect --format='{{.State.Status}}' "ibnts-$container" 2>/dev/null || echo "not found")
        echo -e "${YELLOW}•${NC} ibnts-$container: $status (no health check)"
    else
        echo -e "${RED}✗${NC} ibnts-$container: $health_status"
    fi
done

echo ""
echo "=========================================="
echo "Startup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Check for any unhealthy containers"
echo "2. Review logs: docker logs ibnts-<container-name>"
echo "3. If Gateway/Backend have issues, check their build logs"
echo ""
