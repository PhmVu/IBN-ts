#!/bin/bash

# IBNwts v0.0.2 - Docker Deployment Script

echo "🚀 IBNwts v0.0.2 - Docker Deployment"
echo "===================================="
echo ""

# Step 1: Build new image
echo "📦 Building Docker image..."
docker build -t ibnts-backend:v0.0.2 .

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"
echo ""

# Step 2: Stop old container
echo "🛑 Stopping old container..."
docker stop ibnts-backend 2>/dev/null || true
docker rm ibnts-backend 2>/dev/null || true

echo "✅ Old container removed!"
echo ""

# Step 3: Run new container
echo "🚀 Starting new container..."
docker run -d \
  --name ibnts-backend \
  --network ibnts-network \
  -p 9002:9002 \
  --env-file .env \
  --restart unless-stopped \
  ibnts-backend:v0.0.2

if [ $? -ne 0 ]; then
    echo "❌ Failed to start container!"
    exit 1
fi

echo "✅ Container started!"
echo ""

# Step 4: Wait for health check
echo "⏳ Waiting for health check..."
sleep 5

# Step 5: Verify
echo "🔍 Verifying deployment..."
docker ps | grep ibnts-backend

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "Backend running on: http://localhost:9002"
    echo "Health check: http://localhost:9002/health"
    echo ""
    echo "View logs: docker logs -f ibnts-backend"
else
    echo ""
    echo "❌ Deployment failed!"
    echo "Check logs: docker logs ibnts-backend"
    exit 1
fi
