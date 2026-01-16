#!/bin/bash
# Network utility script
# Useful commands for managing the Fabric network

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_menu() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Fabric Network Utilities${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  start              - Start all containers"
    echo "  stop               - Stop all containers"
    echo "  restart            - Restart all containers"
    echo "  status             - Show container status"
    echo "  logs               - Show container logs"
    echo "  logs-orderer       - Show orderer logs"
    echo "  logs-peer          - Show peer logs"
    echo "  logs-couchdb       - Show couchdb logs"
    echo "  logs-ca            - Show CA logs"
    echo "  health             - Check network health"
    echo "  clean              - Clean volumes (run teardown.sh first)"
    echo ""
}

# Start containers
start_network() {
    echo -e "${YELLOW}Starting Fabric Network...${NC}"
    docker-compose up -d
    echo -e "${GREEN}✓ Network started${NC}"
    sleep 3
    docker-compose ps
}

# Stop containers
stop_network() {
    echo -e "${YELLOW}Stopping Fabric Network...${NC}"
    docker-compose down
    echo -e "${GREEN}✓ Network stopped${NC}"
}

# Restart containers
restart_network() {
    echo -e "${YELLOW}Restarting Fabric Network...${NC}"
    docker-compose restart
    echo -e "${GREEN}✓ Network restarted${NC}"
    sleep 3
    docker-compose ps
}

# Show status
show_status() {
    echo -e "${BLUE}Container Status:${NC}"
    docker-compose ps
}

# Show logs
show_logs() {
    docker-compose logs -f
}

show_logs_orderer() {
    docker-compose logs -f orderer.ictu.edu.vn
}

show_logs_peer() {
    docker-compose logs -f peer0.ibn.ictu.edu.vn
}

show_logs_couchdb() {
    docker-compose logs -f couchdb0
}

show_logs_ca() {
    docker-compose logs -f ca.ibn.ictu.edu.vn
}

# Check health
check_health() {
    echo -e "${BLUE}Checking Network Health...${NC}"
    echo ""
    
    echo -e "${YELLOW}Orderer Health:${NC}"
    curl -s -f http://localhost:9443 > /dev/null && echo -e "${GREEN}✓ Orderer is healthy${NC}" || echo -e "${RED}✗ Orderer is unhealthy${NC}"
    
    echo ""
    echo -e "${YELLOW}Peer Health:${NC}"
    curl -s -f http://localhost:9444 > /dev/null && echo -e "${GREEN}✓ Peer is healthy${NC}" || echo -e "${RED}✗ Peer is unhealthy${NC}"
    
    echo ""
    echo -e "${YELLOW}CouchDB Health:${NC}"
    curl -s -f http://admin:adminpw@localhost:5984/_up > /dev/null && echo -e "${GREEN}✓ CouchDB is healthy${NC}" || echo -e "${RED}✗ CouchDB is unhealthy${NC}"
    
    echo ""
    echo -e "${YELLOW}CA Health:${NC}"
    curl -s -f http://localhost:7054/cainfo > /dev/null && echo -e "${GREEN}✓ CA is healthy${NC}" || echo -e "${RED}✗ CA is unhealthy${NC}"
}

# Clean volumes
clean_volumes() {
    echo -e "${RED}Cleaning volumes...${NC}"
    docker-compose down -v
    echo -e "${GREEN}✓ Volumes cleaned${NC}"
}

# Main
case "${1:-}" in
    start)
        start_network
        ;;
    stop)
        stop_network
        ;;
    restart)
        restart_network
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    logs-orderer)
        show_logs_orderer
        ;;
    logs-peer)
        show_logs_peer
        ;;
    logs-couchdb)
        show_logs_couchdb
        ;;
    logs-ca)
        show_logs_ca
        ;;
    health)
        check_health
        ;;
    clean)
        clean_volumes
        ;;
    *)
        print_menu
        exit 1
        ;;
esac
