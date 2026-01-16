#!/bin/bash
CHAINCODE_NAME=${1:-network-core}
CHAINCODE_VERSION=${2:-1.0}
CHAINCODE_LABEL="${CHAINCODE_NAME}_${CHAINCODE_VERSION}"

# Create temp directory
TEMP_DIR="/tmp/chaincode-package-${CHAINCODE_NAME}"
rm -rf $TEMP_DIR
mkdir -p $TEMP_DIR

# Copy only built files
cp -r ../chaincodes/${CHAINCODE_NAME}/dist $TEMP_DIR/
cp ../chaincodes/${CHAINCODE_NAME}/package.json $TEMP_DIR/
cp ../chaincodes/${CHAINCODE_NAME}/package-lock.json $TEMP_DIR/

# Package from temp
docker exec ibnts-peer0.ibn.ictu.edu.vn \
  peer lifecycle chaincode package /packages/${CHAINCODE_LABEL}.tar.gz \
    --path /tmp/chaincode-package-${CHAINCODE_NAME} \
    --lang node \
    --label ${CHAINCODE_LABEL}

# Cleanup
rm -rf $TEMP_DIR
echo "✅ Packaged: ${CHAINCODE_LABEL}.tar.gz"
