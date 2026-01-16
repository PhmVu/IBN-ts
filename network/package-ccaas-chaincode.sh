#!/bin/bash
set -e

CHAINCODE_NAME=network-core
CHAINCODE_VERSION=0.0.4
CHAINCODE_LABEL="${CHAINCODE_NAME}_${CHAINCODE_VERSION}"

echo "📦 Packaging CCAAS chaincode: ${CHAINCODE_LABEL}"

# Create package directory
PKG_DIR="packages/${CHAINCODE_LABEL}"
mkdir -p "${PKG_DIR}"

# Create code.tar.gz containing connection.json (CCAAS format)
tar czf "${PKG_DIR}/code.tar.gz" -C "../chaincodes/${CHAINCODE_NAME}" connection.json

# Copy metadata.json
cp ../chaincodes/${CHAINCODE_NAME}/metadata.json "${PKG_DIR}/"

# Create final package with code.tar.gz and metadata.json
cd packages
tar czf "${CHAINCODE_LABEL}.tar.gz" -C "${CHAINCODE_LABEL}" code.tar.gz metadata.json
cd ..

echo "✅ CCAAS package created: packages/${CHAINCODE_LABEL}.tar.gz"
echo "   Structure: code.tar.gz (contains connection.json) + metadata.json"
