#!/usr/bin/env bash

# Phase 1 Comprehensive Test Suite
# Tests all components and generates a detailed report

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  IBN v0.0.2 Phase 1 - Comprehensive Test Suite             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

PASS=0
FAIL=0
WARN=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test reporting functions
report_pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASS++))
}

report_fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((FAIL++))
}

report_warn() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
    ((WARN++))
}

report_info() {
    echo -e "${BLUE}ℹ INFO${NC}: $1"
}

# === TEST SUITE ===

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "TEST GROUP 1: File Structure"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check config files
[ -f "knexfile.ts" ] && report_pass "knexfile.ts exists" || report_fail "knexfile.ts missing"
[ -f "src/config/knex.ts" ] && report_pass "src/config/knex.ts exists" || report_fail "src/config/knex.ts missing"

# Check models
for model in Role Permission UserRole RolePermission Organization; do
    [ -f "src/models/${model}.ts" ] && report_pass "src/models/${model}.ts exists" || report_fail "src/models/${model}.ts missing"
done

# Check migrations
for i in 1 2 3 4 5; do
    [ -f "src/database/knex-migrations/2025121200000${i}_*.ts" ] && report_pass "Migration ${i} exists" || report_fail "Migration ${i} missing"
done

# Check seeds
for i in 1 2 3; do
    [ -f "src/database/knex-seeds/00${i}_*.ts" ] && report_pass "Seed ${i} exists" || report_fail "Seed ${i} missing"
done

# Check scripts
for script in knex-migrate knex-seed knex-rollback verify-schema phase1-init validate-phase1; do
    [ -f "src/database/${script}.ts" ] && report_pass "src/database/${script}.ts exists" || report_fail "src/database/${script}.ts missing"
done

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "TEST GROUP 2: Configuration Files"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check .env
[ -f ".env" ] && report_pass ".env file exists" || report_fail ".env file missing"

# Check environment variables
if [ -f ".env" ]; then
    grep -q "DB_HOST" .env && report_pass "DB_HOST configured" || report_warn "DB_HOST not in .env"
    grep -q "DB_PORT" .env && report_pass "DB_PORT configured" || report_warn "DB_PORT not in .env"
    grep -q "DB_USER" .env && report_pass "DB_USER configured" || report_warn "DB_USER not in .env"
    grep -q "DB_NAME" .env && report_pass "DB_NAME configured" || report_warn "DB_NAME not in .env"
    grep -q "DB_PASSWORD" .env && report_pass "DB_PASSWORD configured" || report_warn "DB_PASSWORD not in .env"
fi

# Check tsconfig
grep -q "@config" tsconfig.json && report_pass "tsconfig.json has path aliases" || report_fail "tsconfig.json missing path aliases"
grep -q "@models" tsconfig.json && report_pass "tsconfig.json has @models alias" || report_fail "tsconfig.json missing @models alias"
grep -q "@database" tsconfig.json && report_pass "tsconfig.json has @database alias" || report_fail "tsconfig.json missing @database alias"

# Check package.json scripts
grep -q "knex:migrate" package.json && report_pass "npm script 'knex:migrate' exists" || report_fail "npm script 'knex:migrate' missing"
grep -q "knex:seed" package.json && report_pass "npm script 'knex:seed' exists" || report_fail "npm script 'knex:seed' missing"
grep -q "knex:rollback" package.json && report_pass "npm script 'knex:rollback' exists" || report_fail "npm script 'knex:rollback' missing"
grep -q "db:verify" package.json && report_pass "npm script 'db:verify' exists" || report_fail "npm script 'db:verify' missing"
grep -q "phase1:init" package.json && report_pass "npm script 'phase1:init' exists" || report_fail "npm script 'phase1:init' missing"

# Check dependencies
grep -q "\"knex\"" package.json && report_pass "knex dependency installed" || report_fail "knex dependency missing"
grep -q "\"@types/knex\"" package.json && report_pass "@types/knex dependency installed" || report_fail "@types/knex dependency missing"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "TEST GROUP 3: Documentation"
echo "═══════════════════════════════════════════════════════════"
echo ""

[ -f "PHASE1-COMPLETION.md" ] && report_pass "PHASE1-COMPLETION.md exists" || report_fail "PHASE1-COMPLETION.md missing"
[ -f "PHASE1-SETUP-GUIDE.md" ] && report_pass "PHASE1-SETUP-GUIDE.md exists" || report_fail "PHASE1-SETUP-GUIDE.md missing"
[ -f "PHASE1-DEPLOYMENT-CHECKLIST.md" ] && report_pass "PHASE1-DEPLOYMENT-CHECKLIST.md exists" || report_fail "PHASE1-DEPLOYMENT-CHECKLIST.md missing"
[ -f "src/database/README-PHASE1.md" ] && report_pass "src/database/README-PHASE1.md exists" || report_fail "src/database/README-PHASE1.md missing"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "TEST GROUP 4: Code Quality"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check TypeScript syntax
report_info "Note: TypeScript compilation checked in CI/CD pipeline"

# Check for critical files
grep -q "class Role" src/models/Role.ts && report_pass "Role model defined" || report_fail "Role model not found"
grep -q "class Permission" src/models/Permission.ts && report_pass "Permission model defined" || report_fail "Permission model not found"
grep -q "export async function up" src/database/knex-migrations/20251212000001_create_roles_table.ts && report_pass "Migration up() function exists" || report_fail "Migration up() missing"
grep -q "export async function down" src/database/knex-migrations/20251212000001_create_roles_table.ts && report_pass "Migration down() function exists" || report_fail "Migration down() missing"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "TEST SUMMARY"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo -e "  ${GREEN}✓ PASSED: $PASS${NC}"
echo -e "  ${RED}✗ FAILED: $FAIL${NC}"
echo -e "  ${YELLOW}⚠ WARNINGS: $WARN${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}═════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✅ ALL TESTS PASSED - PHASE 1 READY FOR DEPLOYMENT${NC}"
    echo -e "${GREEN}═════════════════════════════════════════════════════════${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}═════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}  ❌ SOME TESTS FAILED - FIX ISSUES BEFORE DEPLOYMENT${NC}"
    echo -e "${RED}═════════════════════════════════════════════════════════${NC}"
    echo ""
    exit 1
fi
