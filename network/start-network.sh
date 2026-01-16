#!/bin/bash
# ============================================================================
# Hyperledger Fabric Network Startup Script
# ============================================================================
# This script starts the complete Fabric network with all components:
# - Certificate Authority (CA)
# - Orderer
# - Peer
# - CouchDB
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Functions
print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}"
}

print_step() {
    echo -e "${YELLOW}[*] $1${NC}"
}

print_success() {
    echo -e "${GREEN}[✓] $1${NC}"
}

print_error() {
    echo -e "${RED}[✗] $1${NC}"
}

print_info() {
    echo -e "${BLUE}[i] $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    print_success "Docker found"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    print_success "Docker Compose found"
    
    # Check if docker daemon is running
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running"
        exit 1
    fi
    print_success "Docker daemon is running"
    
    # Check for crypto materials
    if [ ! -d "$SCRIPT_DIR/organizations/ordererOrganizations" ] || [ ! -d "$SCRIPT_DIR/organizations/peerOrganizations" ]; then
        print_error "Crypto materials not found. Run './scripts/setup.sh' first"
        exit 1
    fi
    print_success "Crypto materials found"
    
    # Check for artifacts
    if [ ! -f "$SCRIPT_DIR/artifacts/genesis.block" ]; then
        print_error "Genesis block not found. Run './scripts/setup.sh' first"
        exit 1
    fi
    print_success "Genesis block found"
}

# Start network
start_network() {
    print_header "Starting Fabric Network"
    
    cd "$SCRIPT_DIR"
    
    print_step "Pulling images..."
    docker-compose pull
    print_success "Images pulled"
    
    print_step "Starting containers..."
    docker-compose up -d
    print_success "Containers started"
    
    # Wait for containers to be healthy
    print_step "Waiting for containers to be healthy..."
    sleep 5
    
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        local healthy_count=0
        
        # Check each container status
        if docker ps --filter "name=ca.ibn.ictu.edu.vn" --filter "health=healthy" | grep -q "ca.ibn.ictu.edu.vn"; then
            ((healthy_count++))
        fi
        
        if docker ps --filter "name=orderer.ictu.edu.vn" --filter "health=healthy" | grep -q "orderer.ictu.edu.vn"; then
            ((healthy_count++))
        fi
        
        if docker ps --filter "name=peer0.ibn.ictu.edu.vn" --filter "health=healthy" | grep -q "peer0.ibn.ictu.edu.vn"; then
            ((healthy_count++))
        fi
        
        if docker ps --filter "name=couchdb0" --filter "health=healthy" | grep -q "couchdb0"; then
            ((healthy_count++))
        fi
        
        if [ $healthy_count -eq 4 ]; then
            print_success "All containers are healthy"
            break
        fi
        
        echo -ne "${YELLOW}[*] Waiting for containers... ($((attempt + 1))/$max_attempts)${NC}\r"
        sleep 2
        ((attempt++))
    done
    
    if [ $attempt -eq $max_attempts ]; then
        print_error "Containers failed to become healthy"
        print_info "Run 'docker-compose logs' to check container logs"
        exit 1
    fi
}

# Verify network health
verify_network() {
    print_header "Verifying Network Health"
    
    print_step "Checking container status..."
    echo ""
    docker-compose ps
    echo ""
    
    print_step "Checking CA health..."
    if docker-compose exec -T ca.ibn.ictu.edu.vn curl -f http://localhost:7054/cainfo &> /dev/null; then
        print_success "CA is healthy"
    else
        print_error "CA health check failed"
    fi
    
    print_step "Checking Orderer health..."
    if docker-compose exec -T orderer.ictu.edu.vn curl -f http://localhost:9443 &> /dev/null; then
        print_success "Orderer is healthy"
    else
        print_error "Orderer health check failed"
    fi
    
    print_step "Checking Peer health..."
    if docker-compose exec -T peer0.ibn.ictu.edu.vn curl -f http://localhost:9444 &> /dev/null; then
        print_success "Peer is healthy"
    else
        print_error "Peer health check failed"
    fi
    
    print_step "Checking CouchDB health..."
    if docker-compose exec -T couchdb0 curl -f http://admin:adminpw@localhost:5984/_up &> /dev/null; then
        print_success "CouchDB is healthy"
    else
        print_error "CouchDB health check failed"
    fi
}

# Display network information
display_network_info() {
    print_header "Network Information"
    
    echo ""
    echo "Network Components:"
    echo "  - CA (Certificate Authority)    : ca.ibn.ictu.edu.vn:7054"
    echo "  - Orderer (Consensus)           : orderer.ictu.edu.vn:7050"
    echo "  - Peer (Endorsement/Ledger)     : peer0.ibn.ictu.edu.vn:7051"
    echo "  - CouchDB (State Database)      : localhost:5984"
    echo ""
    echo "Port Mappings:"
    echo "  - CA                            : 7054"
    echo "  - Orderer                       : 7050 (operations: 9443)"
    echo "  - Peer                          : 7051 (operations: 9444)"
    echo "  - CouchDB                       : 5984"
    echo ""
    echo "Quick Commands:"
    echo "  - View logs              : docker-compose logs -f <service>"
    echo "  - Stop network           : docker-compose down"
    echo "  - Stop network (volumes) : docker-compose down -v"
    echo "  - View containers        : docker-compose ps"
    echo ""
}

# Main execution
main() {
    print_header "IBN Fabric Network Startup"
    
    check_prerequisites
    start_network
    verify_network
    display_network_info
    
    print_success "Fabric Network started successfully!"
    echo ""
    print_info "Next steps:"
    echo "  1. Create channels: ./network.sh createchannel"
    echo "  2. Join peer to channel: ./network.sh joinchannel"
    echo "  3. Deploy chaincode: ./network.sh deploychaincode"
    echo ""
}

# Run main function
main
