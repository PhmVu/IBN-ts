# Fabric Network Setup

Hyperledger Fabric Network configuration for IBN (ICTU Blockchain Network) project.

## Prerequisites

- Docker & Docker Compose installed
- Hyperledger Fabric tools installed (cryptogen, configtxgen)
  - Download from: https://github.com/hyperledger/fabric/releases
  - Add to PATH: `bin/` directory

```bash
# For macOS/Linux
export PATH=$PATH:$(pwd)/bin

# For Windows (PowerShell)
$env:PATH += ";$(pwd)\bin"
```

## Directory Structure

```
network/
├── .env                        # Environment variables
├── crypto-config.yaml          # Crypto material configuration
├── configtx.yaml              # Channel & genesis block config
├── docker-compose.yaml        # Docker services definition
├── organizations/             # Generated crypto materials
│   ├── ordererOrganizations/
│   └── peerOrganizations/
├── artifacts/                 # Generated genesis block & channel tx
├── scripts/
│   ├── setup.sh               # Setup network (generate crypto & artifacts)
│   ├── teardown.sh            # Teardown network (cleanup)
│   └── network.sh             # Network utilities
└── README.md                  # This file
```

## Quick Start

### 1. Setup Network

Generate crypto materials and channel artifacts:

```bash
cd network
chmod +x scripts/setup.sh
./scripts/setup.sh
```

This will:
- Generate cryptographic materials for Orderer and Peer organizations
- Generate genesis block for the system channel
- Generate transaction files for testchan and mychannel
- Create anchor peer updates

### 2. Start Network

Start all Fabric components (CA, Orderer, Peer, CouchDB):

```bash
docker-compose up -d
```

Wait for all containers to be healthy:

```bash
docker-compose ps
```

### 3. Verify Network

Check network health:

```bash
chmod +x scripts/network.sh
./scripts/network.sh health
```

Expected output:
```
Orderer Health:
✓ Orderer is healthy

Peer Health:
✓ Peer is healthy

CouchDB Health:
✓ CouchDB is healthy

CA Health:
✓ CA is healthy
```

### 4. Create Channels

Create and join channels (requires Fabric CLI tools):

```bash
# Access peer container
docker exec -it peer0.ibn.ictu.edu.vn bash

# Set environment
export CHANNEL_NAME=testchan
export ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/ictu.edu.vn/orderers/orderer.ictu.edu.vn/msp/tlscacerts/tlsca.ictu.edu.vn-cert.pem

# Create channel
peer channel create -o orderer.ictu.edu.vn:7050 \
  -c $CHANNEL_NAME \
  -f ./channel-artifacts/testchan.tx \
  --tls \
  --cafile=$ORDERER_CA

# Join channel
peer channel join -b testchan.block

# Verify
peer channel list
```

## Services

### CA (Certificate Authority)
- **Container:** ca.ibn.ictu.edu.vn
- **Port:** 7054
- **Admin:** admin:adminpw
- **Health Check:** `curl http://localhost:7054/cainfo`

### Orderer
- **Container:** orderer.ictu.edu.vn
- **Port:** 7050 (ordering)
- **Port:** 9443 (metrics/health)
- **Health Check:** `curl http://localhost:9443`

### Peer
- **Container:** peer0.ibn.ictu.edu.vn
- **Port:** 7051 (peer communication)
- **Port:** 7052 (chaincode)
- **Port:** 9444 (metrics/health)
- **Health Check:** `curl http://localhost:9444`

### CouchDB (State Database)
- **Container:** couchdb0
- **Port:** 5984
- **Admin:** admin:adminpw
- **Health Check:** `curl http://admin:adminpw@localhost:5984/_up`
- **Web UI:** http://localhost:5984/_utils

## Useful Commands

### View logs

```bash
# All services
./scripts/network.sh logs

# Specific service
./scripts/network.sh logs-orderer
./scripts/network.sh logs-peer
./scripts/network.sh logs-couchdb
./scripts/network.sh logs-ca
```

### Manage network

```bash
# Start
./scripts/network.sh start

# Stop
./scripts/network.sh stop

# Restart
./scripts/network.sh restart

# Status
./scripts/network.sh status

# Health check
./scripts/network.sh health

# Clean volumes
./scripts/network.sh clean
```

### Stop and cleanup

```bash
# Stop network
docker-compose down

# Remove volumes
docker-compose down -v

# Full cleanup
./scripts/teardown.sh
```

## Troubleshooting

### Containers won't start

1. Check logs: `docker-compose logs <service>`
2. Verify port availability: `lsof -i :<port>`
3. Ensure .env file is loaded: `cat .env`

### TLS/Certificate errors

1. Regenerate crypto materials: `./scripts/teardown.sh && ./scripts/setup.sh`
2. Verify certificate paths in docker-compose.yaml
3. Check file permissions: `ls -la organizations/`

### Network connectivity issues

1. Verify containers are on same network: `docker network inspect fabric-network`
2. Check service DNS: `docker exec peer0.ibn.ictu.edu.vn nslookup orderer.ictu.edu.vn`
3. Verify TLS configuration in core.yaml and orderer.yaml

### CouchDB connection failed

1. Verify CouchDB is running: `docker-compose ps couchdb0`
2. Check credentials: admin:adminpw
3. Test connection: `curl http://admin:adminpw@localhost:5984/`

## Configuration Files Reference

### .env
Environment variables for services (versions, ports, credentials)

### crypto-config.yaml
Defines organizations and certificate authorities for both orderer and peer orgs

### configtx.yaml
Defines genesis block, application channels, and consensus profiles

### docker-compose.yaml
Defines all services: CA, Orderer, Peer, CouchDB

## Next Steps

1. ✅ Setup Fabric Network (Phase 1)
2. → Build Gateway API (Phase 2-4)
3. → Build Backend API (Phase 5-8)
4. → Build Frontend (Phase 9)
5. → Deploy & Monitor

## Documentation

- [Hyperledger Fabric Documentation](https://hyperledger-fabric.readthedocs.io/)
- [Fabric Network Architecture](https://hyperledger-fabric.readthedocs.io/en/latest/understand_fabrics_model.html)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/compose-file-v3/)

## Support

For issues or questions:
1. Check logs: `docker-compose logs`
2. Review configuration files
3. Consult Hyperledger Fabric documentation
4. Check project documentation in `docs/v0.0.1/`
