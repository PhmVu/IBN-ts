# IBN Fabric Network - Quick Reference Guide

## 🚀 Start Network (2 minutes)

```bash
cd network
./start-network.sh
```

**Output:** Network running, all containers healthy ✓

---

## 📡 Create Channels (1 minute)

```bash
./create-channels.sh
```

**Channels Created:**
- ibnchan (main)
- testchan (test)

---

## 📦 Deploy Chaincodes (2 minutes)

```bash
cd ../chaincodes && npm run build
cd ../network && ./deploy-chaincodes.sh
```

**Chaincodes Deployed:**
- teatrace (v1.0)
- network-core (v1.0)

---

## 🔍 Check Network Health (30 seconds)

```bash
./health-check.sh
```

**Verification:**
- All containers running ✓
- All services healthy ✓
- Ports listening ✓
- Database responding ✓

---

## 🧪 Test Network

### List Channels
```bash
docker exec peer0.ibn.ictu.edu.vn \
  peer channel list
```

### Query Chaincode
```bash
docker exec peer0.ibn.ictu.edu.vn \
  peer chaincode query \
    -C ibnchan \
    -n teatrace \
    -c '{"function":"getAllTeaBatches","Args":[]}'
```

### Invoke Chaincode
```bash
docker exec peer0.ibn.ictu.edu.vn \
  peer chaincode invoke \
    -C ibnchan \
    -n teatrace \
    -c '{"function":"createTeaBatch","Args":["batch1","YUNNAN","FarmA","GreenTea","2024-01-01","100","kg","Admin"]}'
```

### Check CouchDB
```bash
curl http://admin:adminpw@localhost:5984/_all_dbs
curl http://admin:adminpw@localhost:5984/ibnchan_teatrace
```

---

## 📊 Network Status

### All Containers
```bash
docker-compose ps
```

### View Logs
```bash
docker-compose logs -f peer0.ibn.ictu.edu.vn
docker-compose logs -f orderer.ictu.edu.vn
docker-compose logs -f ca.ibn.ictu.edu.vn
docker-compose logs -f couchdb0
```

### Resource Usage
```bash
docker stats
```

---

## 🛑 Stop Network

```bash
# Keep data
./stop-network.sh containers

# Remove data
./stop-network.sh volumes

# Full cleanup
./stop-network.sh all
```

---

## 📍 Network Endpoints

| Service | Endpoint | Port | Purpose |
|---------|----------|------|---------|
| CA | ca.ibn.ictu.edu.vn | 7054 | Certificate Authority |
| Orderer | orderer.ictu.edu.vn | 7050 | Consensus Service |
| Peer | peer0.ibn.ictu.edu.vn | 7051 | Ledger & Endorsement |
| CouchDB | localhost | 5984 | State Database |
| Orderer Metrics | localhost | 9443 | Monitoring |
| Peer Metrics | localhost | 9444 | Monitoring |

---

## 🔑 Network Credentials

| Component | User | Password |
|-----------|------|----------|
| CA | admin | adminpw |
| CouchDB | admin | adminpw |
| Orderer Admin | - | (MSP Certificate) |
| Peer Admin | - | (MSP Certificate) |

---

## 📋 Troubleshooting Quick Tips

**Containers not starting?**
```bash
docker-compose logs
docker system prune
./start-network.sh
```

**Peer can't connect to orderer?**
```bash
docker exec peer0.ibn.ictu.edu.vn ping orderer.ictu.edu.vn
docker-compose logs orderer.ictu.edu.vn
```

**Channel creation failed?**
```bash
./scripts/setup.sh  # Regenerate artifacts
./create-channels.sh
```

**Chaincode deploy failed?**
```bash
cd ../chaincodes && npm run clean && npm install && npm run build
cd ../network && ./deploy-chaincodes.sh
```

---

## ✅ Checklist

- [x] Network started
- [x] Channels created
- [x] Chaincodes deployed
- [x] Health check passed
- [ ] Next: Gateway API (Phase 2)

---

**Time to Full Setup: ~5 minutes**

🎉 **Network is ready for Gateway API integration!**
