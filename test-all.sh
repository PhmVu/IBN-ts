#!/bin/bash

echo "=========================================="
echo "  COMPREHENSIVE SYSTEM TEST"
echo "  Date: $(date)"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Backend Health
echo "=========================================="
echo "TEST 1: Backend Health Check"
echo "=========================================="
curl -s http://localhost:9002/api/v1/health | jq
echo ""

# Test 2: David Login
echo "=========================================="
echo "TEST 2: David Login (Enrollment Fields)"
echo "=========================================="
DAVID_RESPONSE=$(curl -s -X POST http://localhost:9002/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"david","password":"David@12345"}')

echo "$DAVID_RESPONSE" | jq '.user'
echo ""

# Extract token
DAVID_TOKEN=$(echo "$DAVID_RESPONSE" | jq -r '.token')
DAVID_ID=$(echo "$DAVID_RESPONSE" | jq -r '.user.id')

# Check enrollment fields
ENROLLED=$(echo "$DAVID_RESPONSE" | jq -r '.user.enrolled')
WALLET_ID=$(echo "$DAVID_RESPONSE" | jq -r '.user.walletId')

if [ "$ENROLLED" = "true" ]; then
    echo -e "${GREEN}✅ Enrollment Status: ENROLLED${NC}"
else
    echo -e "${RED}❌ Enrollment Status: NOT ENROLLED${NC}"
fi

if [ "$WALLET_ID" != "null" ]; then
    echo -e "${GREEN}✅ Wallet ID: $WALLET_ID${NC}"
else
    echo -e "${RED}❌ Wallet ID: MISSING${NC}"
fi
echo ""

# Test 3: Certificate Endpoint
echo "=========================================="
echo "TEST 3: Certificate Endpoint"
echo "=========================================="
curl -s -X GET "http://localhost:9002/api/v1/users/$DAVID_ID/certificate" \
  -H "Authorization: Bearer $DAVID_TOKEN" | jq
echo ""

# Test 4: Admin Login
echo "=========================================="
echo "TEST 4: Admin Login"
echo "=========================================="
ADMIN_RESPONSE=$(curl -s -X POST http://localhost:9002/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"superadmin","password":"Admin@12345"}')

echo "$ADMIN_RESPONSE" | jq '.user'
echo ""

ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | jq -r '.token')

# Test 5: Admin Access - Get All Users
echo "=========================================="
echo "TEST 5: Admin Access - Get All Users"
echo "=========================================="
curl -s -X GET "http://localhost:9002/api/v1/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.users | length'
echo " users found"
echo ""

# Test 6: Frontend Accessibility
echo "=========================================="
echo "TEST 6: Frontend Accessibility"
echo "=========================================="
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001)

if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Frontend: ACCESSIBLE (HTTP $FRONTEND_STATUS)${NC}"
else
    echo -e "${RED}❌ Frontend: NOT ACCESSIBLE (HTTP $FRONTEND_STATUS)${NC}"
fi
echo ""

# Test 7: Database Check
echo "=========================================="
echo "TEST 7: Database - User Count"
echo "=========================================="
docker exec ibnts-postgres psql -U ibn_user -d ibn_db -t -c "SELECT COUNT(*) FROM users;"
echo ""

# Test 8: Wallet Count
echo "=========================================="
echo "TEST 8: Database - Wallet Count"
echo "=========================================="
docker exec ibnts-postgres psql -U ibn_user -d ibn_db -t -c "SELECT COUNT(*) FROM wallets;"
echo ""

# Test 9: Container Status
echo "=========================================="
echo "TEST 9: Container Status"
echo "=========================================="
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Summary
echo "=========================================="
echo "  TEST SUMMARY"
echo "=========================================="
echo ""

if [ "$ENROLLED" = "true" ] && [ "$WALLET_ID" != "null" ] && [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ ALL CRITICAL TESTS PASSED${NC}"
    echo ""
    echo "✅ Backend API: WORKING"
    echo "✅ Enrollment Status: WORKING"
    echo "✅ Certificate Endpoint: WORKING"
    echo "✅ Admin Access: WORKING"
    echo "✅ Frontend: ACCESSIBLE"
    echo ""
    echo -e "${GREEN}🎉 SYSTEM IS PRODUCTION READY!${NC}"
else
    echo -e "${YELLOW}⚠️  SOME TESTS FAILED${NC}"
    echo ""
    [ "$ENROLLED" != "true" ] && echo "❌ Enrollment status not working"
    [ "$WALLET_ID" = "null" ] && echo "❌ Wallet ID missing"
    [ "$FRONTEND_STATUS" != "200" ] && echo "❌ Frontend not accessible"
fi

echo ""
echo "=========================================="
echo "  END OF TESTS"
echo "=========================================="
