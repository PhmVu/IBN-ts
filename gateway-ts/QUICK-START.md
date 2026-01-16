# Gateway API - Quick Start Guide

## 🚀 5-Minute Setup

### 1. Install & Build

```bash
cd gateway-ts
npm install
npm run build
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env - set GATEWAY_PEER_ENDPOINT
```

### 3. Start

```bash
npm run dev
```

**Output:** `Gateway API started on http://localhost:8001`

---

## 🔍 Test Health

```bash
curl http://localhost:8001/api/v1/health
```

---

## 📮 Query Chaincode

```bash
curl -X POST http://localhost:8001/api/v1/chaincode/query \
  -H "Content-Type: application/json" \
  -d '{
    "chaincode": "teatrace",
    "command": "query",
    "msp_id": "IBNMSP",
    "cert": "YOUR_BASE64_CERT",
    "org_domain": "ibn.ictu.edu.vn",
    "args": {
      "channel": "ibnchan",
      "function": "getAllTeaBatches",
      "params": []
    }
  }'
```

---

## 💾 Invoke Chaincode

```bash
curl -X POST http://localhost:8001/api/v1/chaincode/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "chaincode": "teatrace",
    "command": "invoke",
    "msp_id": "IBNMSP",
    "cert": "YOUR_BASE64_CERT",
    "private_key": "YOUR_BASE64_KEY",
    "org_domain": "ibn.ictu.edu.vn",
    "args": {
      "channel": "ibnchan",
      "function": "createTeaBatch",
      "params": ["batch1", "YUNNAN", "FarmA", "GreenTea", "2024-01-01", "100", "kg", "Admin"]
    }
  }'
```

---

## 🧪 Run Tests

```bash
npm test                 # All tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

---

## 🐳 Docker

```bash
# Build
docker build -t ibn-gateway-api:1.0 .

# Run
docker run -d \
  --name gateway-api \
  --network fabric-network \
  -p 8001:8001 \
  -e GATEWAY_PEER_ENDPOINT=peer0.ibn.ictu.edu.vn:7051 \
  ibn-gateway-api:1.0

# Check
docker ps
docker logs gateway-api
```

---

## 🔧 Environment Variables

```dotenv
NODE_ENV=production
PORT=8001
HOST=0.0.0.0
LOG_LEVEL=info
GATEWAY_PEER_ENDPOINT=peer0.ibn.ictu.edu.vn:7051
GATEWAY_TLS_ENABLED=true
GRPC_TIMEOUT=30000
```

---

## 📊 Ports

- **API:** http://localhost:8001
- **Health:** http://localhost:8001/api/v1/health

---

## 🎯 Status: ✅ READY

Gateway API is fully operational and ready for Backend integration!

**Next:** Proceed to Phase 3 - Backend API Development
