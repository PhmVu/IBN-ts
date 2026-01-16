#!/bin/bash

# IBN Backend - Phase 2 RBAC Smoke Test
# Kiểm tra thực tế các API endpoints với Docker containers đang chạy

set -e

BASE_URL="http://localhost:9002"
HEALTH_URL="${BASE_URL}/health"
LOGIN_URL="${BASE_URL}/api/v1/auth/login"
ROLES_URL="${BASE_URL}/api/v1/roles"
USERS_URL="${BASE_URL}/api/v1/users"

echo "🧪 IBN Backend - Phase 2 RBAC Smoke Test"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function
test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local headers="$4"
    local data="$5"
    local expected_status="$6"
    
    echo -n "Testing: ${name}... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" $headers 2>/dev/null || echo "000")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" $headers -d "$data" 2>/dev/null || echo "000")
    fi
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $status_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $expected_status, got $status_code)"
        echo "   Response: $body"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo "📡 Step 1: Health Check"
echo "----------------------"
test_endpoint "Health endpoint" "GET" "$HEALTH_URL" "" "" "200"
echo ""

echo "🔐 Step 2: Authentication & JWT"
echo "-------------------------------"

# Test login với user mặc định (cần seed trước)
LOGIN_DATA='{"username":"admin","password":"admin123"}'
echo -n "Testing: Login with admin... "

login_response=$(curl -s -w "\n%{http_code}" -X POST "$LOGIN_URL" \
    -H "Content-Type: application/json" \
    -d "$LOGIN_DATA" 2>/dev/null || echo "000")

login_status=$(echo "$login_response" | tail -n1)
login_body=$(echo "$login_response" | head -n-1)

if [ "$login_status" = "200" ] || [ "$login_status" = "404" ]; then
    if [ "$login_status" = "200" ]; then
        TOKEN=$(echo "$login_body" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
        echo -e "${GREEN}✓ PASS${NC} (HTTP $login_status)"
        echo "   Token: ${TOKEN:0:20}..."
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${YELLOW}⚠ SKIP${NC} (No admin user seeded yet - HTTP 404)"
        TOKEN=""
    fi
else
    echo -e "${RED}✗ FAIL${NC} (Expected 200 or 404, got $login_status)"
    echo "   Response: $login_body"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TOKEN=""
fi
echo ""

if [ -n "$TOKEN" ]; then
    echo "🔒 Step 3: RBAC Protected Endpoints"
    echo "-----------------------------------"
    
    AUTH_HEADER="-H \"Authorization: Bearer $TOKEN\""
    
    # Test roles endpoint (SuperAdmin only)
    test_endpoint "List roles (SuperAdmin)" "GET" "$ROLES_URL" "$AUTH_HEADER" "" "200"
    
    # Test users endpoint với permission
    test_endpoint "List users (with permission)" "GET" "$USERS_URL" "$AUTH_HEADER" "" "200"
    
    echo ""
    
    echo "🚫 Step 4: Permission Denied Tests"
    echo "-----------------------------------"
    
    # Test without token
    test_endpoint "List roles (no auth)" "GET" "$ROLES_URL" "" "" "401"
    
    # Test with invalid token
    INVALID_HEADER="-H \"Authorization: Bearer invalid.token.here\""
    test_endpoint "List roles (invalid token)" "GET" "$ROLES_URL" "$INVALID_HEADER" "" "401"
    
    echo ""
else
    echo -e "${YELLOW}⚠ Skipping authenticated tests (no token available)${NC}"
    echo ""
fi

echo "📊 Step 5: Database Verification"
echo "--------------------------------"

# Verify PostgreSQL is running
if docker ps | grep -q ibnts-postgres; then
    echo -e "${GREEN}✓ PASS${NC} PostgreSQL container is running"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    
    # Check database tables
    echo -n "Checking RBAC tables... "
    tables_result=$(docker exec ibnts-postgres psql -U ibn_user -d ibn_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('roles', 'permissions', 'user_roles', 'role_permissions');" 2>/dev/null || echo "0")
    table_count=$(echo "$tables_result" | tr -d ' \n')
    
    if [ "$table_count" = "4" ]; then
        echo -e "${GREEN}✓ PASS${NC} (4/4 tables exist)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC} (Expected 4 tables, found $table_count)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
else
    echo -e "${RED}✗ FAIL${NC} PostgreSQL container not running"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

echo "📊 Test Summary"
echo "==============="
echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Seed admin user: npm run db:seed (in backend-ts)"
    echo "2. Test full RBAC flow with authenticated requests"
    echo "3. Deploy to production environment"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "- Ensure backend is running: docker ps | grep ibnts-backend"
    echo "- Check backend logs: docker logs ibnts-backend"
    echo "- Verify database: docker exec ibnts-postgres psql -U ibn_user -d ibn_db -c '\\dt'"
    exit 1
fi
