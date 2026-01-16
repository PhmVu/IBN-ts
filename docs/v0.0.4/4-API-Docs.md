# API Documentation - v0.0.4

**Purpose:** Comprehensive REST API reference for all NetworkCore governance operations  
**Base URL:** `http://localhost:37080/api/v1/governance`  
**Authentication:** Bearer Token (JWT)  
**Authorization:** SuperAdmin role required

---

## 📋 API Overview

All governance endpoints require:
1. **Authentication:** Valid JWT token in `Authorization` header
2. **Authorization:** User must have `SuperAdmin` role
3. **Content-Type:** `application/json` for POST/PUT requests

---

## 🔐 Authentication

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Usage:**
```http
Authorization: Bearer {token}
```

---

## 📚 API Endpoints

### Organization Management

#### Register Organization
```http
POST /governance/organizations/register
```

**Request:**
```json
{
  "orgId": "ORG001",
  "name": "Example Organization",
  "mspId": "ExampleMSP",
  "domain": "example.com",
  "caUrl": "http://ca.example.com:7054",
  "peerEndpoints": ["peer0.example.com:7051"],
  "contactEmail": "admin@example.com",
  "contactPhone": "+84-xxx-xxx-xxx",
  "address": "123 Example St",
  "businessLicense": "BL-12345",
  "taxId": "TAX-67890",
  "certifications": ["ISO9001", "ISO27001"]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "orgId": "ORG001",
    "name": "Example Organization",
    "status": "PENDING",
    "registeredAt": "2026-01-16T08:00:00.000Z",
    "registeredBy": "admin",
    ...
  }
}
```

---

#### Approve Organization
```http
POST /governance/organizations/:id/approve
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orgId": "ORG001",
    "status": "APPROVED",
    "approvedAt": "2026-01-16T08:05:00.000Z",
    "approvedBy": "admin",
    ...
  }
}
```

---

#### Query Organizations
```http
GET /governance/organizations?filter={"status":"APPROVED"}
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "orgId": "IBN",
      "name": "IBN Platform",
      "status": "APPROVED",
      ...
    },
    {
      "orgId": "ORG001",
      "name": "Example Organization",
      "status": "APPROVED",
      ...
    }
  ],
  "total": 2
}
```

---

### Chaincode Governance

#### Submit Chaincode Proposal
```http
POST /governance/chaincodes/proposals
```

**Request:**
```json
{
  "chaincodeName": "my-chaincode",
  "version": "1.0.0",
  "channel": "ibnmain",
  "description": "New chaincode for product tracking",
  "endorsementPolicy": "AND('IBNMSP.peer','ExampleMSP.peer')",
  "initRequired": true
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "proposalId": "PROPOSAL-001",
    "chaincodeName": "my-chaincode",
    "status": "PENDING",
    "proposer": "admin",
    "submittedAt": "2026-01-16T09:00:00.000Z",
    "approvals": [],
    "rejections": []
  }
}
```

---

#### Approve Chaincode Proposal
```http
POST /governance/chaincodes/proposals/:id/approve
```

**Request:**
```json
{
  "comment": "Reviewed and approved"
}
```

---

### Audit & Compliance

#### Query Audit Trail
```http
GET /governance/audit/trail?filter={"eventType":"ORGANIZATION_REGISTERED"}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "eventId": "EVENT-001",
      "eventType": "ORGANIZATION_REGISTERED",
      "actor": "admin",
      "action": "REGISTER",
      "resource": "organization:ORG001",
      "timestamp": "2026-01-16T08:00:00.000Z",
      "success": true
    }
  ]
}
```

---

#### Generate Compliance Report
```http
GET /governance/audit/reports/compliance?type=organizations&startDate=2026-01-01&endDate=2026-01-31
```

---

## 🚨 Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Missing required field: orgId"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "No token provided"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Access denied. Governance operations require SuperAdmin role."
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Organization not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to register organization: Connection timeout"
}
```

---

## 📊 Complete Endpoint List

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Organizations** ||
| POST | `/organizations/register` | Register organization |
| POST | `/organizations/:id/approve` | Approve organization |
| POST | `/organizations/:id/suspend` | Suspend organization |
| POST | `/organizations/:id/revoke` | Revoke organization |
| GET | `/organizations` | Query organizations |
| GET | `/organizations/:id` | Get organization |
| **Chaincodes** ||
| POST | `/chaincodes/proposals` | Submit proposal |
| POST | `/chaincodes/proposals/:id/approve` | Approve proposal |
| POST | `/chaincodes/proposals/:id/reject` | Reject proposal |
| GET | `/chaincodes/proposals` | Query proposals |
| POST | `/chaincodes/deployments` | Record deployment |
| GET | `/chaincodes/:name/history` | Get history |
| **Channels** ||
| POST | `/channels/proposals` | Create proposal |
| POST | `/channels/proposals/:id/approve` | Approve proposal |
| POST | `/channels/:id/organizations` | Add organization |
| DELETE | `/channels/:id/organizations/:orgId` | Remove organization |
| GET | `/channels` | Query channels |
| **Policies** ||
| POST | `/policies` | Create policy |
| PUT | `/policies/:id` | Update policy |
| GET | `/policies` | Query policies |
| **Audit** ||
| POST | `/audit/events` | Record event |
| GET | `/audit/trail` | Query trail |
| GET | `/audit/reports/compliance` | Compliance report |
| GET | `/statistics` | Platform statistics |

---

## 🧪 Testing with cURL

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:37080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.token')

# Register Organization
curl -X POST http://localhost:37080/api/v1/governance/organizations/register \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orgId": "TEST_ORG",
    "name": "Test Organization",
    "mspId": "TestMSP",
    ...
  }'

# Query Organizations
curl http://localhost:37080/api/v1/governance/organizations \
  -H "Authorization: Bearer $TOKEN"
```

---

**Last Updated:** 2026-01-16  
**Version:** 1.0  
**OpenAPI Spec:** Coming soon
