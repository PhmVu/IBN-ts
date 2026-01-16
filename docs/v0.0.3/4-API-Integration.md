# 🔌 IBN v0.0.3 - API Integration

**Backend API endpoints for platform governance**

---

## 🚧 IMPLEMENTED - TESTING PENDING

> **Status:** Backend routes and services implemented  
> **Database:** knex-config.ts not configured  
> **Gateway:** Not tested end-to-end  
> **Next:** Test after NetworkCore runtime fix

---

## 📋 Overview

This guide covers the Backend API endpoints for managing organizations, chaincode proposals, channels, policies, and audit trail.

**Base URL:** `http://localhost:9002/api/v1`

---

## 🏢 Organization Management

### 1. Register Organization

```http
POST /api/v1/organizations/register
Content-Type: application/json
Authorization: Bearer {token}

{
  "orgId": "ORG-001",
  "mspId": "Org1MSP",
  "name": "Organization 1",
  "domain": "org1.example.com",
  "contactEmail": "contact@org1.example.com",
  "contactPhone": "+1234567890",
  "address": "123 Main St",
  "businessLicense": "BL-12345",
  "taxId": "TAX-67890",
  "certifications": ["ISO9001", "ISO27001"],
  "caUrl": "http://ca.org1.example.com:7054",
  "peerEndpoints": ["peer0.org1.example.com:7051"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orgId": "ORG-001",
    "status": "PENDING",
    "message": "Organization registered successfully. Awaiting approval."
  }
}
```

### 2. Approve Organization (SuperAdmin only)

```http
POST /api/v1/organizations/:orgId/approve
Authorization: Bearer {superadmin_token}

{
  "comments": "Approved after verification"
}
```

### 3. Suspend Organization

```http
POST /api/v1/organizations/:orgId/suspend
Authorization: Bearer {superadmin_token}

{
  "reason": "Policy violation"
}
```

### 4. Revoke Organization

```http
POST /api/v1/organizations/:orgId/revoke
Authorization: Bearer {superadmin_token}

{
  "reason": "Severe compliance violation"
}
```

### 5. Get Organizations

```http
GET /api/v1/organizations?status=APPROVED&page=1&limit=10
Authorization: Bearer {token}
```

---

## 🔧 Chaincode Governance

### 1. Submit Chaincode Proposal

```http
POST /api/v1/chaincodes/proposals
Content-Type: application/json
Authorization: Bearer {token}

{
  "chaincodeName": "supply-chain",
  "version": "1.0.0",
  "description": "Supply chain traceability chaincode",
  "language": "typescript",
  "sourceCodeHash": "abc123...",
  "targetChannels": ["supply-chain"],
  "endorsementPolicy": "OR('Org1MSP.peer', 'Org2MSP.peer')",
  "securityAudit": true,
  "auditReport": "ipfs://..."
}
```

### 2. Approve Chaincode Proposal

```http
POST /api/v1/chaincodes/proposals/:proposalId/approve
Authorization: Bearer {superadmin_token}

{
  "comments": "Code review passed"
}
```

### 3. Reject Chaincode Proposal

```http
POST /api/v1/chaincodes/proposals/:proposalId/reject
Authorization: Bearer {superadmin_token}

{
  "reason": "Security vulnerabilities found"
}
```

### 4. Get Chaincode Proposals

```http
GET /api/v1/chaincodes/proposals?status=SUBMITTED
Authorization: Bearer {token}
```

### 5. Record Deployment

```http
POST /api/v1/chaincodes/:chaincodeName/deploy
Authorization: Bearer {superadmin_token}

{
  "proposalId": "supply-chain-1.0.0-123456",
  "packageId": "supply-chain_1.0.0:abc123...",
  "deployedChannels": ["supply-chain"]
}
```

---

## 📡 Channel Management

### 1. Create Channel Proposal

```http
POST /api/v1/channels/proposals
Authorization: Bearer {superadmin_token}

{
  "channelId": "healthcare",
  "channelName": "Healthcare Channel",
  "organizations": ["IBNMSP", "Hospital1MSP", "Pharma1MSP"],
  "orderers": ["orderer.ibn.ictu.edu.vn:7050"],
  "endorsementPolicy": "MAJORITY",
  "blockSize": 102400,
  "batchTimeout": 2000
}
```

### 2. Approve Channel Proposal

```http
POST /api/v1/channels/:channelId/approve
Authorization: Bearer {superadmin_token}
```

### 3. Add Organization to Channel

```http
POST /api/v1/channels/:channelId/organizations
Authorization: Bearer {superadmin_token}

{
  "orgId": "ORG-003"
}
```

### 4. Remove Organization from Channel

```http
DELETE /api/v1/channels/:channelId/organizations/:orgId
Authorization: Bearer {superadmin_token}

{
  "reason": "Organization left consortium"
}
```

### 5. Get Channels

```http
GET /api/v1/channels?status=ACTIVE
Authorization: Bearer {token}
```

---

## 📜 Policy Management

### 1. Create Policy

```http
POST /api/v1/policies
Authorization: Bearer {superadmin_token}

{
  "policyName": "Chaincode Approval Policy",
  "policyType": "LIFECYCLE",
  "rules": [
    {
      "ruleId": "RULE-001",
      "condition": "proposal.securityAudit === true",
      "action": "REQUIRE_AUDIT",
      "priority": 100
    }
  ],
  "appliesTo": ["*"]
}
```

### 2. Update Policy

```http
PUT /api/v1/policies/:policyId
Authorization: Bearer {superadmin_token}

{
  "rules": [...],
  "version": "1.1.0"
}
```

### 3. Get Policies

```http
GET /api/v1/policies?type=LIFECYCLE&active=true
Authorization: Bearer {token}
```

---

## 🔍 Audit & Compliance

### 1. Get Audit Events

```http
GET /api/v1/audit/events?eventType=ORG_APPROVED&startDate=2025-01-01&endDate=2025-12-31
Authorization: Bearer {token}
```

### 2. Generate Compliance Report

```http
GET /api/v1/audit/reports?reportType=MONTHLY&month=2025-12
Authorization: Bearer {superadmin_token}
```

---

## 🔐 Authentication

All endpoints require JWT authentication:

```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Roles:**
- `SuperAdmin`: Full access
- `OrgAdmin`: Organization-scoped access
- `User`: Read-only access

---

## 📊 Response Format

### Success Response

```json
{
  "success": true,
  "data": {...},
  "message": "Operation successful"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ORG_ALREADY_EXISTS",
    "message": "Organization ORG-001 already exists"
  }
}
```

---

**Next:** [Frontend UI](./5-Frontend-UI.md)

**Review:** ✅ 20+ governance API endpoints thay vì tea batch endpoints
