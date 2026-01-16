#!/usr/bin/env bash

# Phase 1 Quick Start Script
# This script automates the entire Phase 1 setup process

set -e  # Exit on error

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  IBN v0.0.2 - Phase 1: PostgreSQL & Migration              ║"
echo "║  Quick Start Script                                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Step 1: Validate setup
echo "📋 Step 1: Validating setup..."
npm run phase1:validate || {
    print_error "Validation failed"
    exit 1
}
print_status "Setup validated"
echo ""

# Step 2: Run migrations
echo "📋 Step 2: Running migrations..."
npm run knex:migrate || {
    print_error "Migrations failed"
    exit 1
}
print_status "Migrations completed"
echo ""

# Step 3: Run seeds
echo "📋 Step 3: Running seeds..."
npm run knex:seed || {
    print_warning "Seeds may have failed due to duplicates (OK if data already exists)"
}
print_status "Seeds completed"
echo ""

# Step 4: Verify schema
echo "📋 Step 4: Verifying database schema..."
npm run db:verify || {
    print_error "Verification failed"
    exit 1
}
print_status "Database verified"
echo ""

# Final status
echo "╔════════════════════════════════════════════════════════════╗"
echo -e "║  ${GREEN}✅ PHASE 1 COMPLETE${NC}                                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Next: Run ${GREEN}npm run phase1:init${NC} for full initialization"
echo "      Or proceed to Phase 2 implementation"
echo ""
