#!/bin/bash

# Docker Image Pull Fix - Retry with exponential backoff
# For network timeout errors

echo "🔄 Docker Image Pull Helper"
echo "Handling TLS handshake timeout errors"
echo ""

# Function to pull image with retry
pull_with_retry() {
    local image=$1
    local max_attempts=3
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo "📥 Pulling $image (attempt $attempt/$max_attempts)..."
        
        if docker pull $image; then
            echo "✅ Successfully pulled $image"
            return 0
        else
            echo "⚠️  Failed to pull $image"
            if [ $attempt -lt $max_attempts ]; then
                wait_time=$((attempt * 5))
                echo "   Waiting ${wait_time}s before retry..."
                sleep $wait_time
            fi
        fi
        
        ((attempt++))
    done
    
    echo "❌ Failed to pull $image after $max_attempts attempts"
    return 1
}

echo "=========================================="
echo "Pre-pulling Required Images"
echo "=========================================="
echo ""

# CouchDB - the one that failed
echo "1. CouchDB (3 instances needed)"
pull_with_retry "couchdb:3.3.2"

echo ""
echo "2. PostgreSQL"
pull_with_retry "postgres:15-alpine"

echo ""
echo "3. Redis"
pull_with_retry "redis:7-alpine"

echo ""
echo "4. Nginx"
pull_with_retry "nginx:alpine"

echo ""
echo "5. Hyperledger Fabric CA"
pull_with_retry "hyperledger/fabric-ca:latest"

echo ""
echo "6. Hyperledger Fabric Orderer"
pull_with_retry "hyperledger/fabric-orderer:2.5"

echo ""
echo "7. Hyperledger Fabric Peer"
pull_with_retry "hyperledger/fabric-peer:2.5"

echo ""
echo "8. Hyperledger Fabric Build Environment"
pull_with_retry "hyperledger/fabric-ccenv:2.5"
pull_with_retry "hyperledger/fabric-baseos:2.5"
pull_with_retry "hyperledger/fabric-nodeenv:2.5"

echo ""
echo "=========================================="
echo "Pull Summary"
echo "=========================================="
docker images

echo ""
echo "✅ Pre-pull complete!"
echo "Now try: docker-compose up -d"
