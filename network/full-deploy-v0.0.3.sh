#!/bin/bash
# Full Deployment Sequence for v0.0.3 NetworkCore
# Run this to deploy from scratch

set -e

echo "🚀 IBN v0.0.3 - Full Deployment Sequence"
echo "========================================"
echo ""

# Step 1: Pull required images
echo "📦 Step 1/5: Pulling required Docker images..."
docker pull hyperledger/fabric-tools:2.5.0
echo "✅ Images ready"
echo ""

# Step 2: Reset network
echo "🔄 Step 2/5: Resetting network..."
./reset-network-official.sh
echo "✅ Network reset complete"
echo ""

# Step 3: Create ibnmain channel
echo "📡 Step 3/5: Creating ibnmain channel..."
./create-ibn-main-channel.sh
echo "✅ Channel created"
echo ""

# Step 4: Deploy NetworkCore chaincode
echo "📦 Step 4/5: Deploying NetworkCore v0.0.4..."
./deploy-chaincode.sh network-core 0.0.4 ibnmain 1
echo "✅ Chaincode deployed"
echo ""

# Step 5: Test InitLedger
echo "🧪 Step 5/5: Testing InitLedger..."
docker exec \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_LOCALMSPID=IBNMSP \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/crypto/peerOrganizations/ibn.ictu.edu.vn/peers/peer0.ibn.ictu.edu.vn/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=/crypto/peerOrganizations/ibn.ictu.edu.vn/users/Admin@ibn.ictu.edu.vn/msp \
  -e CORE_PEER_ADDRESS=peer0.ibn.ictu.edu.vn:7051 \
  -e ORDERER_CA=/crypto/ordererOrganizations/ictu.edu.vn/orderers/orderer.ictu.edu.vn/msp/tlscacerts/tlsca.ictu.edu.vn-cert.pem \
  ibnts-peer0.ibn.ictu.edu.vn \
  peer chaincode invoke \
    -o orderer.ictu.edu.vn:7050 \
    -C ibnmain \
    -n network-core \
    -c '{"function":"InitLedger","Args":[]}' \
    --tls \
    --cafile /crypto/ordererOrganizations/ictu.edu.vn/orderers/orderer.ictu.edu.vn/msp/tlscacerts/tlsca.ictu.edu.vn-cert.pem

echo ""
echo "========================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "========================================"
echo ""
echo "📊 Summary:"
echo "  - Network: Reset and running"
echo "  - Channel: ibnmain (3 peers joined)"
echo "  - Chaincode: network-core v0.0.4"
echo "  - Functions: 24 governance functions"
echo "  - Status: Ready for testing"
echo ""
echo "🧪 Next: Test functions manually or via backend API"
echo ""
