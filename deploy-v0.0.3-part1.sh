#!/bin/bash
set -e

# 1. Build Chaincodes
echo "📦 Building network-core..."
cd chaincodes/network-core && npm install && npm run build && cd ../..

echo "📦 Building teatrace..."
cd chaincodes/teatrace && npm install && npm run build && cd ../..

echo "📦 Building crypto-assets..."
cd chaincodes/crypto-assets && npm install && npm run build && cd ../..

# 2. Package Chaincodes
echo "📦 Packaging chaincodes..."
peer lifecycle chaincode package network-core.tar.gz --path ./chaincodes/network-core --lang node --label network-core_1.0
peer lifecycle chaincode package teatrace.tar.gz --path ./chaincodes/teatrace --lang node --label teatrace_1.0
peer lifecycle chaincode package crypto-assets.tar.gz --path ./chaincodes/crypto-assets --lang node --label crypto-assets_1.0

# 3. Install on Peers
echo "📦 Installing on Peer0..."
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=IBNMSP
export CORE_PEER_MSPCONFIGPATH=${PWD}/network/crypto-config/peerOrganizations/ibn.ictu.edu.vn/users/Admin@ibn.ictu.edu.vn/msp

export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/network/crypto-config/peerOrganizations/ibn.ictu.edu.vn/peers/peer0.ibn.ictu.edu.vn/tls/ca.crt
peer lifecycle chaincode install network-core.tar.gz
peer lifecycle chaincode install teatrace.tar.gz
peer lifecycle chaincode install crypto-assets.tar.gz

echo "📦 Installing on Peer1..."
export CORE_PEER_ADDRESS=localhost:8051
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/network/crypto-config/peerOrganizations/ibn.ictu.edu.vn/peers/peer1.ibn.ictu.edu.vn/tls/ca.crt
peer lifecycle chaincode install network-core.tar.gz
peer lifecycle chaincode install teatrace.tar.gz
peer lifecycle chaincode install crypto-assets.tar.gz

echo "📦 Installing on Peer2..."
export CORE_PEER_ADDRESS=localhost:9051
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/network/crypto-config/peerOrganizations/ibn.ictu.edu.vn/peers/peer2.ibn.ictu.edu.vn/tls/ca.crt
peer lifecycle chaincode install network-core.tar.gz
peer lifecycle chaincode install teatrace.tar.gz
peer lifecycle chaincode install crypto-assets.tar.gz

echo "✅ Build and Install Complete! Ready for Approval."
