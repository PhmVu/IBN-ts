#!/bin/bash
# ============================================================================
# Hyperledger Fabric Network Shutdown Script
# ============================================================================
# This script stops and cleans up the Fabric network
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

print_warning() {
    echo -e "${YELLOW}[!] $1${NC}"
}

# Determine cleanup level
cleanup_level=${1:-containers}

case "$cleanup_level" in
    containers)
        cleanup_desc="containers only"
        cleanup_flag=""
        ;;
    volumes)
        cleanup_desc="containers and volumes"
        cleanup_flag="-v"
        ;;
    all)
        cleanup_desc="containers, volumes, and images"
        cleanup_flag="-v"
        remove_images=true
        ;;
    *)
        echo "Usage: $0 [containers|volumes|all]"
        echo "  containers  - Stop and remove containers (default)"
        echo "  volumes     - Remove containers and volumes"
        echo "  all         - Remove containers, volumes, and images"
        exit 1
        ;;
esac

# Main execution
main() {
    print_header "IBN Fabric Network Shutdown"
    
    cd "$SCRIPT_DIR"
    
    print_step "Stopping network ($cleanup_desc)..."
    docker-compose down $cleanup_flag
    print_success "Network stopped"
    
    # Remove images if requested
    if [ "$remove_images" = true ]; then
        print_step "Removing Fabric images..."
        docker rmi -f \
            hyperledger/fabric-ca:1.5.0 \
            hyperledger/fabric-orderer:2.5.0 \
            hyperledger/fabric-peer:2.5.0 \
            couchdb:3.2.0 \
            2>/dev/null || print_warning "Some images were not found"
        print_success "Images removed"
    fi
    
    # Optional: Clean up crypto materials
    if [ "$cleanup_level" = "all" ]; then
        print_warning "Do you want to remove crypto materials? (y/N)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            print_step "Removing crypto materials..."
            rm -rf "$SCRIPT_DIR/organizations/ordererOrganizations"
            rm -rf "$SCRIPT_DIR/organizations/peerOrganizations"
            print_success "Crypto materials removed"
        fi
    fi
    
    print_success "Fabric Network shutdown completed!"
    echo ""
    echo "To restart the network:"
    echo "  1. If crypto was removed, run: ./scripts/setup.sh"
    echo "  2. Start network: ./start-network.sh"
    echo ""
}

# Run main function
main
