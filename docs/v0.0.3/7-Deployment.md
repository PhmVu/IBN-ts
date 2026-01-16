# 🚀 IBN v0.0.3/v0.0.4 - ACTUAL Deployment Guide

**Based on Proven Deployment Process (2026-01-05)**

> **IMPORTANT:** This document reflects the ACTUAL deployment process that successfully created the `ibnmain` governance channel and deployed NetworkCore v0.0.4.

---

## 📋 Prerequisites

- ✅ Fabric network running (Docker Compose)
- ✅ 1 Orderer + 3 Peers
- ✅ Crypto materials generated (cryptogen)
- ✅ Admin credentials configured

---

## 🔧 Phase 1: Build Chaincode

### 1.1 Install Dependencies
```bash
cd chaincodes/network-core
npm install
```

###1.2 Fix TypeScript Compilation (if needed)

**Known Fix:** Create missing `ChannelConfig.ts` interface
```bash
# File: src/interfaces/ChannelConfig.ts
# See chaincodes/network-core/src/interfaces/ChannelConfig.ts for complete interface
```

### 1.3 Build
```bash
npm run build
```

**Expected Output:**
```
> tsc

# No errors
```

---

## 🌐 Phase 2: Reset Network with Proper Genesis Block

**Why needed:** Existing genesis block may have wrong consortium or channel config.

### 2.1 Run Network Reset Script
```bash
cd network
./reset-network-official.sh
```

**This script:**
1. Stops all containers
2. Removes old ledger data
3. Regenerates genesis block from `configtx.yaml`
4. Restarts network
5. Verifies health

**Expected Duration:** ~45 seconds

---

## 📡 Phase 3: Create Governance Channel

### 3.1 Generate Channel Transaction
```bash
./generate-channel-tx.sh ibnmain
```

**Key Points:**
- ✅ Channel name: `ibnmain` (lowercase, no hyphens!)
- ✅ Uses `TwoOrgsChannel` profile
- ✅ Uses `SampleConsortium` from genesis block

### 3.2 Create Channel
```bash
./create-channel.sh ibnmain
```

**Success Indicators:**
```
✅ Channel 'ibnmain' created successfully
✅ Peer joined channel 'ibnmain' successfully
Channels peers has joined: 
ibnmain
```

### 3.3 Join Additional Peers (peer1, peer2)
```bash
# Join peer1
docker exec \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_LOCALMSPID=IBNMSP \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/crypto/peerOrganizations/ibn.ictu.edu.vn/peers/peer1.ibn.ictu.edu.vn/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=/crypto/peerOrganizations/ibn.ictu.edu.vn/users/Admin@ibn.ictu.edu.vn/msp \
  -e CORE_PEER_ADDRESS=peer1.ibn.ictu.edu.vn:8051 \
  ibnts-peer1.ibn.ictu.edu.vn \
  peer channel join -b /artifacts/ibnmain.block

# Join peer2
docker exec \
  -e CORE_PEER_TLS_ENABLED=true \
  -e CORE_PEER_LOCALMSPID=IBNMSP \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/crypto/peerOrganizations/ibn.ictu.edu.vn/peers/peer2.ibn.ictu.edu.vn/tls/ca.crt \
  -e CORE_PEER_MSPCONFIGPATH=/crypto/peerOrganizations/ibn.ictu.edu.vn/users/Admin@ibn.ictu.edu.vn/msp \
  -e CORE_PEER_ADDRESS=peer2.ibn.ictu.edu.vn:9051 \
  ibnts-peer2.ibn.ictu.edu.vn \
  peer channel join -b /artifacts/ibnmain.block
```

### 3.4 Verify All Peers Joined
```bash
docker exec ibnts-peer0.ibn.ictu.edu.vn peer channel list
docker exec ibnts-peer1.ibn.ictu.edu.vn peer channel list
docker exec ibnts-peer2.ibn.ictu.edu.vn peer channel list
```

**Expected:** All should show `ibnmain`

---

## 📦 Phase 4: Deploy NetworkCore Chaincode

### 4.1 Deploy Chaincode
```bash
./deploy-chaincode.sh network-core 0.0.4 ibnmain 2
```

**Parameters:**
- Chaincode name: `network-core`
- Version: `0.0.4` 
- Channel: `ibnmain`
- Sequence: `2` (or `1` if first deployment)

**Success Indicators:**
```
✅ Chaincode packaged: network-core_0.0.4.tar.gz
✅ Chaincode installed on peer
✅ Chaincode approved for organization
✅ Chaincode committed to channel
```

---

## ✅ Phase 5: Verify Deployment

### 5.1 Check Committed Chaincodes
```bash
docker exec ibnts-peer0.ibn.ictu.edu.vn \
  peer lifecycle chaincode querycommitted \
  -C ibnmain
```

**Expected:**
```
Name: network-core, Version: 0.0.4, Sequence: 2
```

---

## 🚨 Troubleshooting

### Issue: "no such host orderer.ictu.edu.vn"
**Solution:** Restart containers to refresh Docker DNS
```bash
docker restart ibnts-orderer.ictu.edu.vn \
  ibnts-peer0.ibn.ictu.edu.vn \
  ibnts-peer1.ibn.ictu.edu.vn \
  ibnts-peer2.ibn.ictu.edu.vn
sleep 15
```

### Issue: "Unknown consortium name: IBNConsortium"
**Solution:** Use `SampleConsortium` in configtx.yaml (already fixed in current config)

### Issue: "bad channel ID: 'IBN-main' contains illegal characters"
**Solution:** Channel names MUST be lowercase alphanumeric only. Use `ibnmain` not `IBN-main`

### Issue: NetworkCore container crashes (exit code 1)
**Status:** Known issue, under investigation
**Workaround:** Check chaincode logs:
```bash
docker logs ibnts-peer0.ibn.ictu.edu.vn --tail 100 | grep network-core
```

---

## 📊 Success Checklist

- [ ] Network containers running
- [ ] `ibnmain` channel created
- [ ] All 3 peers joined to channel
- [ ] NetworkCore v0.0.4 deployed
- [ ] Chaincode committed (sequence 2)

---

**Last Updated:** 2026-01-05  
**Process Verified:** ✅ Successfully deployed to ibnmain channel
