#!/bin/bash
# ============================================================================
# Fabric Network Health Check Script
# ============================================================================
# This script performs comprehensive health checks on the Fabric network
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}"
}

print_section() {
    echo -e "${MAGENTA}--- $1 ---${NC}"
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

print_warning() {
    echo -e "${YELLOW}[!] $1${NC}"
}

# Check docker containers
check_containers() {
    print_section "Container Status"
    
    local containers=("ca.ibn.ictu.edu.vn" "orderer.ictu.edu.vn" "peer0.ibn.ictu.edu.vn" "couchdb0")
    local all_running=true
    
    for container in "${containers[@]}"; do
        if docker ps --filter "name=$container" --filter "status=running" | grep -q "$container"; then
            print_success "$container is running"
        else
            print_error "$container is not running"
            all_running=false
        fi
    done
    
    echo ""
    return $([ "$all_running" = true ] && echo 0 || echo 1)
}

# Check container health
check_health() {
    print_section "Container Health Status"
    
    local containers=("ca.ibn.ictu.edu.vn" "orderer.ictu.edu.vn" "peer0.ibn.ictu.edu.vn" "couchdb0")
    local all_healthy=true
    
    for container in "${containers[@]}"; do
        local health=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "unknown")
        
        if [ "$health" = "healthy" ]; then
            print_success "$container is healthy"
        elif [ "$health" = "starting" ]; then
            print_warning "$container is starting..."
        else
            print_error "$container status: $health"
            all_healthy=false
        fi
    done
    
    echo ""
    return $([ "$all_healthy" = true ] && echo 0 || echo 1)
}

# Check ports
check_ports() {
    print_section "Port Availability"
    
    local ports=(
        "7054:CA"
        "7050:Orderer"
        "7051:Peer"
        "5984:CouchDB"
        "9443:Orderer-Metrics"
        "9444:Peer-Metrics"
    )
    
    for port_info in "${ports[@]}"; do
        local port=$(echo $port_info | cut -d: -f1)
        local service=$(echo $port_info | cut -d: -f2)
        
        if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
            print_success "Port $port ($service) is listening"
        else
            print_warning "Port $port ($service) is not listening"
        fi
    done
    
    echo ""
}

# Check CA
check_ca() {
    print_section "Certificate Authority (CA) Health"
    
    if docker-compose -f "$(dirname "$0")/docker-compose.yaml" exec -T ca.ibn.ictu.edu.vn \
        curl -s http://localhost:7054/cainfo > /dev/null 2>&1; then
        print_success "CA is responding to requests"
        
        # Get CA info
        local ca_info=$(docker-compose -f "$(dirname "$0")/docker-compose.yaml" exec -T ca.ibn.ictu.edu.vn \
            curl -s http://localhost:7054/cainfo 2>/dev/null | head -100)
        print_step "CA version and capabilities available"
    else
        print_error "CA is not responding"
        return 1
    fi
    
    echo ""
}

# Check Orderer
check_orderer() {
    print_section "Orderer Health"
    
    if docker-compose -f "$(dirname "$0")/docker-compose.yaml" exec -T orderer.ictu.edu.vn \
        curl -s http://localhost:9443 > /dev/null 2>&1; then
        print_success "Orderer is responding to requests"
    else
        print_error "Orderer is not responding"
        return 1
    fi
    
    echo ""
}

# Check Peer
check_peer() {
    print_section "Peer Health"
    
    if docker-compose -f "$(dirname "$0")/docker-compose.yaml" exec -T peer0.ibn.ictu.edu.vn \
        curl -s http://localhost:9444 > /dev/null 2>&1; then
        print_success "Peer is responding to requests"
    else
        print_error "Peer is not responding"
        return 1
    fi
    
    echo ""
}

# Check CouchDB
check_couchdb() {
    print_section "CouchDB Database Health"
    
    if docker-compose -f "$(dirname "$0")/docker-compose.yaml" exec -T couchdb0 \
        curl -s http://admin:adminpw@localhost:5984/_up > /dev/null 2>&1; then
        print_success "CouchDB is responding to requests"
        
        # Get stats
        local db_stats=$(docker-compose -f "$(dirname "$0")/docker-compose.yaml" exec -T couchdb0 \
            curl -s http://admin:adminpw@localhost:5984/ 2>/dev/null)
        print_step "CouchDB is ready for use"
    else
        print_error "CouchDB is not responding"
        return 1
    fi
    
    echo ""
}

# Check channels
check_channels() {
    print_section "Channels"
    
    local channels=$(docker-compose -f "$(dirname "$0")/docker-compose.yaml" exec -T peer0.ibn.ictu.edu.vn \
        peer channel list 2>/dev/null || echo "")
    
    if [ -z "$channels" ]; then
        print_warning "No channels found or peer CLI not accessible"
    else
        print_success "Channels found:"
        echo "$channels" | while read line; do
            if [ ! -z "$line" ]; then
                echo "  - $line"
            fi
        done
    fi
    
    echo ""
}

# Check chaincodes
check_chaincodes() {
    print_section "Installed Chaincodes"
    
    local chaincodes=$(docker-compose -f "$(dirname "$0")/docker-compose.yaml" exec -T peer0.ibn.ictu.edu.vn \
        peer lifecycle chaincode queryinstalled 2>/dev/null || echo "")
    
    if [ -z "$chaincodes" ]; then
        print_warning "No chaincodes installed or peer CLI not accessible"
    else
        print_success "Installed chaincodes:"
        echo "$chaincodes" | while read line; do
            if [ ! -z "$line" ]; then
                echo "  - $line"
            fi
        done
    fi
    
    echo ""
}

# Display summary
display_summary() {
    print_header "Health Check Summary"
    
    echo ""
    echo "Recommended next steps:"
    echo "  1. If containers are not running: ./start-network.sh"
    echo "  2. If containers are running but not healthy:"
    echo "     docker-compose logs <container-name>"
    echo "  3. Create channels: ./create-channels.sh"
    echo "  4. Deploy chaincodes: ./deploy-chaincodes.sh"
    echo ""
}

# Main execution
main() {
    print_header "IBN Fabric Network Health Check"
    echo ""
    
    check_containers
    check_health
    check_ports
    check_ca || true
    check_orderer || true
    check_peer || true
    check_couchdb || true
    check_channels || true
    check_chaincodes || true
    
    display_summary
}

# Run main function
main
