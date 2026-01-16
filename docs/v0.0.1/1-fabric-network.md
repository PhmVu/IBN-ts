# Phase 1: Fabric Network Setup

## 🎯 Mục tiêu
Thiết lập Hyperledger Fabric Network hoàn chỉnh với CA, Orderer, Peer, và CouchDB database.

## 🚀 Phase 1 Success Criteria
- [ ] Fabric Network running with Docker Compose
- [ ] CA (Certificate Authority) configured
- [ ] 1 Orderer instance running
- [ ] 1-2 Peer instances running
- [ ] CouchDB state database configured
- [ ] Channels created (testchan, mychannel)
- [ ] Network connectivity verified
- [ ] All containers healthy and stable

## 🏗️ Kiến trúc Phase 1

```
Fabric Network Architecture:
├── CA (Certificate Authority)        - ca.ibn.ictu.edu.vn:7054
│   └── Issues certificates for organizations
├── Orderer (Consensus/Ordering)      - orderer.ibn.ictu.edu.vn:7050
│   └── Orders transactions, creates blocks
├── Peer (Ledger/Endorsement)        - peer0.ibn.ictu.edu.vn:7051
│   ├── Maintains ledger copy
│   ├── Endorses transactions
│   └── CouchDB State Database      - couchdb0:5984
└── CouchDB (Optional, for better queries)
    └── Alternative state database
```

## 📋 TODO Phase 1

### 1. Project Structure Setup

```bash
network/
├── configtx.yaml               # Channel & genesis block configuration
├── crypto-config.yaml          # Crypto materials configuration  
├── core.yaml                   # Peer configuration
├── orderer.yaml                # Orderer configuration
├── docker-compose.yaml         # Services orchestration
├── docker-compose-ca.yaml      # CA services (optional)
├── .env                        # Environment variables
└── artifacts/                  # Generated certificates & channels
    ├── genesis.block           # Genesis block (system channel)
    ├── testchan.tx             # Application channel transaction
    ├── mychannel.tx            # Application channel transaction
    └── ...
```

### 2. Organization & MSP Setup

**crypto-config.yaml Configuration:**

```yaml
OrdererOrgs:
  - Name: ictu                   # Orderer organization
    Domain: ictu.edu.vn
    Specs:
      - Hostname: orderer        # orderer.ictu.edu.vn

PeerOrgs:
  - Name: ibn                    # Peer organization
    Domain: ibn.ictu.edu.vn
    EnableNodeOUs: true
    Template:
      Count: 1                   # Number of peers
    Users:
      Count: 1                   # Number of regular users
```

**Generated Structure:**
```
crypto-config/
├── ordererOrganizations/
│   └── ictu.edu.vn/
│       ├── ca/                 # Certificate Authority
│       ├── msp/                # Membership Service Provider
│       ├── orderers/
│       │   └── orderer.ictu.edu.vn/
│       │       ├── msp/        # Orderer MSP
│       │       └── tls/        # TLS certificates
│       └── users/              # Admin users
└── peerOrganizations/
    └── ibn.ictu.edu.vn/
        ├── ca/                 # CA for peer org
        ├── msp/                # MSP for peer org
        ├── peers/
        │   └── peer0.ibn.ictu.edu.vn/
        │       ├── msp/        # Peer MSP
        │       └── tls/        # TLS certificates
        └── users/
            ├── Admin@ibn.ictu.edu.vn/  # Admin user
            └── User1@ibn.ictu.edu.vn/  # Regular user
```

### 3. Generate Crypto Materials

```bash
# Generate cryptographic materials using cryptogen
mkdir -p artifacts crypto-config

# Generate crypto config from crypto-config.yaml
cryptogen generate --config=crypto-config.yaml --output=crypto-config

# Verify generated structure
ls -la crypto-config/orderOrganizations/
ls -la crypto-config/peerOrganizations/
```

### 4. Channel Configuration (configtx.yaml)

**Key Sections:**

```yaml
---
Organizations:
  - &OrdererOrg
    Name: OrdererOrg
    ID: OrdererMSP
    MSPDir: crypto-config/ordererOrganizations/ictu.edu.vn/msp
    
  - &PeerOrg
    Name: IBNMSP
    ID: IBNMSP
    MSPDir: crypto-config/peerOrganizations/ibn.ictu.edu.vn/msp
    AnchorPeers:
      - Host: peer0.ibn.ictu.edu.vn
        Port: 7051

Capabilities:
  Channel: &ChannelCapabilities
    V2_0: true
  Orderer: &OrdererCapabilities
    V2_0: true
  Application: &ApplicationCapabilities
    V2_0: true

Orderer: &OrdererDefaults
  OrdererType: etcdraft
  Addresses:
    - orderer.ictu.edu.vn:7050
  EtcdRaft:
    Consenters:
      - Host: orderer.ictu.edu.vn
        Port: 7050
        ClientTLSCertHash: <HASH>
  BatchTimeout: 2s
  BatchSize:
    MaxMessageCount: 10
    AbsoluteMaxBytes: 99 MB
    PreferredMaxBytes: 2 MB

Application: &ApplicationDefaults
  Organizations:
  Policies:
    Writers:
      Type: ImplicitMeta
      Rule: "ANY Writers"
    Readers:
      Type: ImplicitMeta
      Rule: "ANY Readers"
    Admins:
      Type: ImplicitMeta
      Rule: "MAJORITY Admins"

Channel: &ChannelDefaults
  Policies:
    Readers:
      Type: ImplicitMeta
      Rule: "ANY Readers"
    Writers:
      Type: ImplicitMeta
      Rule: "ANY Writers"
    Admins:
      Type: ImplicitMeta
      Rule: "MAJORITY Admins"
  Capabilities:
    <<: *ChannelCapabilities

Profiles:
  # System channel for ordering service
  TwoOrgsOrdererGenesis:
    <<: *ChannelDefaults
    Orderer:
      <<: *OrdererDefaults
      Organizations:
        - *OrdererOrg
      Capabilities:
        <<: *OrdererCapabilities
    Consortiums:
      SampleConsortium:
        Organizations:
          - *PeerOrg

  # Application channel for peers
  TwoOrgsChannel:
    <<: *ChannelDefaults
    Consortium: SampleConsortium
    Application:
      <<: *ApplicationDefaults
      Organizations:
        - *PeerOrg
      Capabilities:
        <<: *ApplicationCapabilities
```

### 5. Generate Artifacts (Genesis Block & Channel TX)

```bash
# Create artifacts directory
mkdir -p artifacts

# Generate genesis block for system channel
configtxgen -profile TwoOrgsOrdererGenesis \
  -channelID system-channel \
  -outputBlock artifacts/genesis.block

# Generate transaction for application channels
configtxgen -profile TwoOrgsChannel \
  -channelID testchan \
  -outputCreateChannelTx artifacts/testchan.tx

configtxgen -profile TwoOrgsChannel \
  -channelID mychannel \
  -outputCreateChannelTx artifacts/mychannel.tx

# Generate anchor peer updates (for each org)
configtxgen -profile TwoOrgsChannel \
  -channelID testchan \
  -asOrg IBNMSP \
  -outputAnchorPeersUpdate artifacts/IBNMSPanchors.tx

# Verify generated files
ls -la artifacts/
```

### 6. Docker Compose Configuration

**docker-compose.yaml** - Multi-service setup

```yaml
version: '3.8'

networks:
  fabric-network:
    driver: bridge

volumes:
  orderer.ictu.edu.vn:
  peer0.ibn.ictu.edu.vn:
  couchdb0:

services:
  # Orderer Service
  orderer.ictu.edu.vn:
    container_name: orderer.ictu.edu.vn
    image: hyperledger/fabric-orderer:2.5.0
    environment:
      ORDERER_HOME: /var/hyperledger/orderer
      ORDERER_HOST: orderer.ictu.edu.vn
      ORDERER_GENERAL_LISTENADDRESS: 0.0.0.0
      ORDERER_GENERAL_LISTENPORT: 7050
      ORDERER_GENERAL_GENESISMETHOD: file
      ORDERER_GENERAL_GENESISFILE: /var/hyperledger/orderer/orderer.genesis.block
      ORDERER_GENERAL_LOCALMSPID: OrdererMSP
      ORDERER_GENERAL_LOCALMSPDIR: /var/hyperledger/orderer/msp
      ORDERER_GENERAL_TLS_ENABLED: 'true'
      ORDERER_GENERAL_TLS_PRIVATEKEY: /var/hyperledger/orderer/tls/server.key
      ORDERER_GENERAL_TLS_CERTIFICATE: /var/hyperledger/orderer/tls/server.crt
      ORDERER_GENERAL_TLS_ROOTCAS: "[/var/hyperledger/orderer/tls/ca.crt]"
    volumes:
      - ./artifacts/genesis.block:/var/hyperledger/orderer/orderer.genesis.block
      - ./crypto-config/ordererOrganizations/ictu.edu.vn/orderers/orderer.ictu.edu.vn/msp:/var/hyperledger/orderer/msp
      - ./crypto-config/ordererOrganizations/ictu.edu.vn/orderers/orderer.ictu.edu.vn/tls:/var/hyperledger/orderer/tls
      - orderer.ictu.edu.vn:/var/hyperledger/production/orderer
    ports:
      - "7050:7050"
    networks:
      - fabric-network

  # Peer Service
  peer0.ibn.ictu.edu.vn:
    container_name: peer0.ibn.ictu.edu.vn
    image: hyperledger/fabric-peer:2.5.0
    environment:
      CORE_PEER_ID: peer0.ibn.ictu.edu.vn
      CORE_PEER_ADDRESS: peer0.ibn.ictu.edu.vn:7051
      CORE_PEER_LISTENADDRESS: 0.0.0.0:7051
      CORE_PEER_CHAINCODEADDRESS: peer0.ibn.ictu.edu.vn:7052
      CORE_PEER_CHAINCODELISTENADDRESS: 0.0.0.0:7052
      CORE_PEER_GOSSIP_EXTERNALENDPOINT: peer0.ibn.ictu.edu.vn:7051
      CORE_PEER_LOCALMSPID: IBNMSP
      CORE_PEER_MSPCONFIGPATH: /etc/hyperledger/fabric/msp
      CORE_VM_ENDPOINT: unix:///host/var/run/docker.sock
      CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE: fabric-network
      CORE_LEDGER_STATE_STATEDATABASE: CouchDB
      CORE_LEDGER_STATE_COUCHDBCONFIG_COUCHDBADDRESS: couchdb0:5984
      CORE_PEER_TLS_ENABLED: 'true'
      CORE_PEER_TLS_CERT_FILE: /etc/hyperledger/fabric/tls/server.crt
      CORE_PEER_TLS_KEY_FILE: /etc/hyperledger/fabric/tls/server.key
      CORE_PEER_TLS_ROOTCERT_FILE: /etc/hyperledger/fabric/tls/ca.crt
    volumes:
      - /var/run/docker.sock:/host/var/run/docker.sock
      - ./crypto-config/peerOrganizations/ibn.ictu.edu.vn/peers/peer0.ibn.ictu.edu.vn/msp:/etc/hyperledger/fabric/msp
      - ./crypto-config/peerOrganizations/ibn.ictu.edu.vn/peers/peer0.ibn.ictu.edu.vn/tls:/etc/hyperledger/fabric/tls
      - peer0.ibn.ictu.edu.vn:/var/hyperledger/production
    ports:
      - "7051:7051"
    depends_on:
      - couchdb0
    networks:
      - fabric-network

  # CouchDB for Peer State Database
  couchdb0:
    container_name: couchdb0
    image: couchdb:3.2.0
    environment:
      COUCHDB_USER: admin
      COUCHDB_PASSWORD: adminpw
    volumes:
      - couchdb0:/opt/couchdb/data
    ports:
      - "5984:5984"
    networks:
      - fabric-network

  # Fabric CA (Certificate Authority)
  ca.ibn.ictu.edu.vn:
    container_name: ca.ibn.ictu.edu.vn
    image: hyperledger/fabric-ca:1.5.0
    command: sh -c 'fabric-ca-server start -b admin:adminpw -d'
    environment:
      FABRIC_CA_HOME: /etc/hyperledger/fabric-ca-server
      FABRIC_CA_SERVER_CA_NAME: ca-ibn
      FABRIC_CA_SERVER_TLS_ENABLED: 'true'
      FABRIC_CA_SERVER_CA_CERTFILE: /etc/hyperledger/fabric-ca-server-config/ca.ibn.ictu.edu.vn-cert.pem
      FABRIC_CA_SERVER_CA_KEYFILE: /etc/hyperledger/fabric-ca-server-config/<PRIVATE_KEY>
    volumes:
      - ./crypto-config/peerOrganizations/ibn.ictu.edu.vn/ca/:/etc/hyperledger/fabric-ca-server-config
    ports:
      - "7054:7054"
    networks:
      - fabric-network
```

### 7. Network Startup

```bash
# Start all services
docker-compose up -d

# Verify all containers are running
docker-compose ps

# Check logs
docker-compose logs -f

# Stop services
docker-compose down

# Remove volumes (clean state)
docker-compose down -v
```

### 8. Channel Creation & Peer Join

```bash
# Access peer container
docker exec -it peer0.ibn.ictu.edu.vn bash

# Set environment variables
export CHANNEL_NAME=testchan
export ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/ictu.edu.vn/orderers/orderer.ictu.edu.vn/msp/tlscacerts/tlsca.ictu.edu.vn-cert.pem
export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/ibn.ictu.edu.vn/peers/peer0.ibn.ictu.edu.vn/tls/ca.crt

# Create channel
peer channel create -o orderer.ictu.edu.vn:7050 \
  -c $CHANNEL_NAME \
  -f ./channel-artifacts/testchan.tx \
  --tls \
  --cafile=$ORDERER_CA

# Join channel
peer channel join -b testchan.block

# Verify channel joined
peer channel list
```

### 9. Verify Network Health

```bash
# Check orderer status
docker logs orderer.ictu.edu.vn

# Check peer status
docker logs peer0.ibn.ictu.edu.vn

# Check CouchDB
curl http://localhost:5984/

# Check peer health
docker exec peer0.ibn.ictu.edu.vn peer node status

# Inspect channel
docker exec peer0.ibn.ictu.edu.vn peer channel getinfo -c testchan
```

### 10. Environment Variables (.env)

```env
# Fabric Versions
FABRIC_VERSION=2.5.0
CA_VERSION=1.5.0

# Network
ORDERER_NAME=orderer.ictu.edu.vn
ORDERER_PORT=7050
ORDERER_DOMAIN=ictu.edu.vn

PEER_NAME=peer0.ibn.ictu.edu.vn
PEER_PORT=7051
PEER_DOMAIN=ibn.ictu.edu.vn

# Database
COUCHDB_PORT=5984
COUCHDB_USER=admin
COUCHDB_PASSWORD=adminpw

# CA
CA_PORT=7054
CA_NAME=ca-ibn

# Channels
CHANNEL_NAME=testchan
TEST_CHANNEL_NAME=mychannel

# TLS
TLS_ENABLED=true
```

### 11. Troubleshooting

**Common Issues:**

1. **Container won't start**: Check logs with `docker logs <container>`
2. **Port already in use**: Change port in docker-compose.yaml
3. **Network connectivity**: Ensure containers on same network
4. **TLS errors**: Verify certificate paths in docker-compose.yaml
5. **CouchDB connection failed**: Ensure couchdb container is healthy

**Health Checks:**

```bash
# Verify orderer connectivity
peer channel list -o orderer.ictu.edu.vn:7050 --tls --cafile=$ORDERER_CA

# Verify peer connectivity
peer channel info -c testchan

# Check peer endorsement capability
peer chaincode list -C testchan --installed
```

### 12. Next Steps

1. Generate all crypto materials (cryptogen)
2. Generate genesis block and channel transaction artifacts (configtxgen)
3. Start Docker Compose services
4. Create channels and join peers
5. Deploy sample chaincode
6. Verify network health
7. Proceed to Phase 2 (Gateway API)
