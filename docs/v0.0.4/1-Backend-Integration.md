# Backend Integration Guide - v0.0.4

**Purpose:** Enable REST API access to all NetworkCore governance functions  
**Estimated Duration:** 1-2 weeks  
**Complexity:** High

---

## 📋 Overview

This guide provides a comprehensive walkthrough for integrating the backend with NetworkCore v0.0.4 governance chaincode. You'll learn how to create new controllers, update services, implement routes, and add proper error handling for all 24 governance functions.

**What You'll Build:**
- Updated `FabricService.ts` with 24 NetworkCore methods
- 5 new governance controllers
- REST API endpoints for all operations
- Proper error handling and validation
- Audit logging for all governance actions
- Comprehensive integration tests

---

## 🎯 Learning Objectives

By the end of this guide, you will:
- Understand how to invoke NetworkCore chaincode from backend
- Know how to structure governance controllers
- Implement proper request validation
- Handle Fabric transaction responses
- Record audit events automatically
- Write integration tests for governance APIs

---

## 🏗️ Architecture Overview

### Current vs. New Structure

**Current (v0.0.3):**
```
backend-ts/src/
├── controllers/
│   ├── AuthController.ts
│   ├── ChannelController.ts
│   └── ChaincodeController.ts
├── services/
│   ├── FabricService.ts      ← Basic chaincode ops
│   └── FabricCAService.ts
└── routes/
    └── index.ts
```

**New (v0.0.4):**
```
backend-ts/src/
├── controllers/
│   └── governance/           ← NEW
│       ├── OrganizationController.ts
│       ├── ChaincodeGovernanceController.ts
│       ├── ChannelManagementController.ts
│       ├── PolicyController.ts
│       └── AuditController.ts
├── services/
│   ├── FabricService.ts      ← UPDATE with 24 methods
│   └── governance/           ← NEW
│       ├── OrganizationService.ts
│       └── TransactionMonitor.ts
├── routes/
│   ├── governance.ts         ← NEW
│   └── index.ts              ← UPDATE
├── middleware/
│   └── governanceAuth.ts     ← NEW - admin only
└── types/
    └── governance.ts         ← NEW - TypeScript types
```

---

## 📚 Prerequisites

Before starting, ensure:
- ✅ NetworkCore v0.0.4 deployed via CCAAS
- ✅ Chaincode operational on `ibnmain` channel
- ✅ Backend running with Fabric Gateway connection
- ✅ Understanding of Express.js and TypeScript
- ✅ Familiarity with Hyperledger Fabric concepts

---

## 🚀 Implementation Roadmap

### Week 1: Core Services & Organization Management
- Day 1-2: Update FabricService with NetworkCore methods
- Day 3-4: Create OrganizationController + routes
- Day 5: Add validation middleware

### Week 2: Additional Controllers & Testing
- Day 6-7: Create ChaincodeGovernanceController
- Day 8: Create ChannelManagementController
- Day 9: Create PolicyController + AuditController
- Day 10: Write integration tests
- Day 11-12: Documentation + bug fixes

---

## 📝 Step-by-Step Implementation

### Step 1: Create TypeScript Types

First, define types for all governance entities.

**Create:** `backend-ts/src/types/governance.ts`

```typescript
// Organization Status
export type OrganizationStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REVOKED';

// Organization Interface
export interface Organization {
  orgId: string;
  name: string;
  mspId: string;
  domain: string;
  caUrl: string;
  peerEndpoints: string[];
  contactEmail: string;
  contactPhone: string;
  address: string;
  businessLicense: string;
  taxId: string;
  certifications: string[];
  status: OrganizationStatus;
  registeredAt: string;
  registeredBy: string;
  approvedAt?: string;
  approvedBy?: string;
  metadata?: Record<string, any>;
}

// Chaincode Proposal Status
export type ProposalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DEPLOYED';

// Chaincode Proposal Interface
export interface ChaincodeProposal {
  proposalId: string;
  chaincodeName: string;
  version: string;
  channel: string;
  description: string;
  endorsementPolicy: string;
  initRequired: boolean;
  status: ProposalStatus;
  proposer: string;
  submittedAt: string;
  approvals: Approval[];
  rejections: Rejection[];
}

export interface Approval {
  approver: string;
  timestamp: string;
  comment?: string;
}

export interface Rejection {
  rejector: string;
  timestamp: string;
  reason: string;
}

// ... (similar types for Channel, Policy, AuditEvent)
```

See full types in [governance.ts example](#full-types-reference)

---

### Step 2: Update FabricService

Add all 24 NetworkCore methods to `FabricService.ts`.

**File:** `backend-ts/src/services/FabricService.ts`

```typescript
import { Organization, ChaincodeProposal, /* ... */ } from '../types/governance';

export class FabricService {
  // ... existing methods ...

  // ===== ORGANIZATION MANAGEMENT (5 methods) =====

  async registerOrganization(orgData: Partial<Organization>): Promise<Organization> {
    try {
      const contract = await this.getContract('ibnmain', 'network-core');
      const result = await contract.submitTransaction(
        'RegisterOrganization',
        JSON.stringify(orgData)
      );
      return JSON.parse(result.toString());
    } catch (error) {
      console.error('RegisterOrganization failed:', error);
      throw new Error(`Failed to register organization: ${error.message}`);
    }
  }

  async approveOrganization(orgId: string, approver: string): Promise<Organization> {
    try {
      const contract = await this.getContract('ibnmain', 'network-core');
      const result = await contract.submitTransaction(
        'ApproveOrganization',
        orgId,
        approver
      );
      return JSON.parse(result.toString());
    } catch (error) {
      throw new Error(`Failed to approve organization: ${error.message}`);
    }
  }

  async suspendOrganization(orgId: string, reason: string, suspendedBy: string): Promise<Organization> {
    const contract = await this.getContract('ibnmain', 'network-core');
    const result = await contract.submitTransaction('SuspendOrganization', orgId, reason, suspendedBy);
    return JSON.parse(result.toString());
  }

  async revokeOrganization(orgId: string, reason: string, revokedBy: string): Promise<Organization> {
    const contract = await this.getContract('ibnmain', 'network-core');
    const result = await contract.submitTransaction('RevokeOrganization', orgId, reason, revokedBy);
    return JSON.parse(result.toString());
  }

  async queryOrganizations(filter: object = {}): Promise<Organization[]> {
    const contract = await this.getContract('ibnmain', 'network-core');
    const result = await contract.evaluateTransaction('QueryOrganizations', JSON.stringify(filter));
    return JSON.parse(result.toString());
  }

  // ===== CHAINCODE GOVERNANCE (6 methods) =====
  // ===== CHANNEL MANAGEMENT (5 methods) =====
  // ===== POLICY MANAGEMENT (3 methods) =====
  // ===== AUDIT & COMPLIANCE (3 methods) =====
  // ===== STATISTICS (1 method) =====
}
```

**💡 Tip:** Use try-catch blocks and meaningful error messages for debugging.

---

### Step 3: Create OrganizationController

**File:** `backend-ts/src/controllers/governance/OrganizationController.ts`

```typescript
import { Request, Response } from 'express';
import { FabricService } from '../../services/FabricService';

export class OrganizationController {
  private fabricService: FabricService;

  constructor() {
    this.fabricService = new FabricService();
  }

  /**
   * POST /api/v1/governance/organizations/register
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const orgData = req.body;
      const registeredBy = req.user?.userId || 'SYSTEM';

      // Validate
      if (!orgData.orgId || !orgData.name || !orgData.mspId) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: orgId, name, mspId'
        });
        return;
      }

      // Submit to chaincode
      const organization = await this.fabricService.registerOrganization(orgData);

      // Record audit
      await this.fabricService.recordAuditEvent({
        eventType: 'ORGANIZATION_REGISTERED',
        actor: registeredBy,
        action: 'REGISTER',
        resource: `organization:${orgData.orgId}`,
        details: orgData
      });

      res.status(201).json({
        success: true,
        data: organization
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async approve(req: Request, res: Response): Promise<void> { /* ... */ }
  async suspend(req: Request, res: Response): Promise<void> { /* ... */ }
  async revoke(req: Request, res: Response): Promise<void> { /* ... */ }
  async query(req: Request, res: Response): Promise<void> { /* ... */ }
  async getById(req: Request, res: Response): Promise<void> { /* ... */ }
}
```

---

### Step 4: Create Governance Routes

**File:** `backend-ts/src/routes/governance.ts`

```typescript
import express from 'express';
import { OrganizationController } from '../controllers/governance/OrganizationController';
import { authMiddleware } from '../middleware/auth';
import { governanceAuthMiddleware } from '../middleware/governanceAuth';

const router = express.Router();
const orgController = new OrganizationController();

// All governance routes require authentication + admin role
router.use(authMiddleware);
router.use(governanceAuthMiddleware);

// Organization routes
router.post('/organizations/register', (req, res) => orgController.register(req, res));
router.post('/organizations/:id/approve', (req, res) => orgController.approve(req, res));
router.post('/organizations/:id/suspend', (req, res) => orgController.suspend(req, res));
router.post('/organizations/:id/revoke', (req, res) => orgController.revoke(req, res));
router.get('/organizations', (req, res) => orgController.query(req, res));
router.get('/organizations/:id', (req, res) => orgController.getById(req, res));

export default router;
```

---

### Step 5: Add Governance Auth Middleware

**File:** `backend-ts/src/middleware/governanceAuth.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

export const governanceAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;

  // Check if user has admin role
  if (!user || user.role !== 'SuperAdmin') {
    res.status(403).json({
      success: false,
      error: 'Access denied. Governance operations require SuperAdmin role.'
    });
    return;
  }

  next();
};
```

---

### Step 6: Update Main Routes

**File:** `backend-ts/src/routes/index.ts`

Add governance routes:

```typescript
import governanceRoutes from './governance';

app.use('/api/v1/governance', governanceRoutes);
```

---

### Step 7: Write Integration Tests

**File:** `backend-ts/tests/integration/governance/organization.test.ts`

```typescript
import request from 'supertest';
import app from '../../../src/app';

describe('Organization Management API', () => {
  let adminToken: string;

  beforeAll(async () => {
    // Login as admin
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    adminToken = loginRes.body.token;
  });

  describe('POST /api/v1/governance/organizations/register', () => {
    it('should register a new organization', async () => {
      const orgData = {
        orgId: 'TEST_ORG',
        name: 'Test Organization',
        mspId: 'TestMSP',
        domain: 'test.example.com',
        caUrl: 'http://ca.test.example.com:7054',
        peerEndpoints: ['peer0.test.example.com:7051'],
        contactEmail: 'admin@test.example.com',
        contactPhone: '+84-xxx-xxx-xxx',
        address: 'Test Address',
        businessLicense: 'TEST-LICENSE-001',
        taxId: 'TEST-TAX-001',
        certifications: ['ISO9001']
      };

      const res = await request(app)
        .post('/api/v1/governance/organizations/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orgData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orgId).toBe('TEST_ORG');
      expect(res.body.data.status).toBe('PENDING');
    });

    it('should return 400 for missing fields', async () => {
      const res = await request(app)
        .post('/api/v1/governance/organizations/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ orgId: 'TEST' }); // Missing required fields

      expect(res.status).toBe(400);
    });

    it('should return 403 for non-admin users', async () => {
      // Login as regular user
      const userLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'user', password: 'user123' });

      const res = await request(app)
        .post('/api/v1/governance/organizations/register')
        .set('Authorization', `Bearer ${userLoginRes.body.token}`)
        .send({});

      expect(res.status).toBe(403);
    });
  });
});
```

---

## 📊 Complete API Endpoints Summary

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| **Organizations** ||||
| POST | `/governance/organizations/register` | Register new organization | SuperAdmin |
| POST | `/governance/organizations/:id/approve` | Approve organization | SuperAdmin |
| POST | `/governance/organizations/:id/suspend` | Suspend organization | SuperAdmin |
| POST | `/governance/organizations/:id/revoke` | Revoke organization | SuperAdmin |
| GET | `/governance/organizations` | Query organizations | SuperAdmin |
| GET | `/governance/organizations/:id` | Get organization details | SuperAdmin |
| **Chaincode Proposals** ||||
| POST | `/governance/chaincodes/proposals` | Submit proposal | SuperAdmin |
| POST | `/governance/chaincodes/proposals/:id/approve` | Approve proposal | SuperAdmin |
| POST | `/governance/chaincodes/proposals/:id/reject` | Reject proposal | SuperAdmin |
| GET | `/governance/chaincodes/proposals` | Query proposals | SuperAdmin |
| GET | `/governance/chaincodes/:name/history` | Get chaincode history | SuperAdmin |
| **Channels** ||||
| POST | `/governance/channels/proposals` | Create channel proposal | SuperAdmin |
| POST | `/governance/channels/proposals/:id/approve` | Approve channel proposal | SuperAdmin |
| POST | `/governance/channels/:id/organizations` | Add org to channel | SuperAdmin |
| DELETE | `/governance/channels/:id/organizations/:orgId` | Remove org from channel | SuperAdmin |
| GET | `/governance/channels` | Query channels | SuperAdmin |
| **Policies** ||||
| POST | `/governance/policies` | Create policy | SuperAdmin |
| PUT | `/governance/policies/:id` | Update policy | SuperAdmin |
| GET | `/governance/policies` | Query policies | SuperAdmin |
| **Audit** ||||
| POST | `/governance/audit/events` | Record audit event | SuperAdmin |
| GET | `/governance/audit/trail` | Query audit trail | SuperAdmin |
| GET | `/governance/audit/reports/compliance` | Generate compliance report | SuperAdmin |
| GET | `/governance/statistics` | Get platform statistics | SuperAdmin |

---

## ✅ Testing Checklist

- [ ] All 24 NetworkCore methods added to FabricService
- [ ] OrganizationController created with 6 endpoints
- [ ] ChaincodeGovernanceController created
- [ ] ChannelManagementController created
- [ ] PolicyController created
- [ ] AuditController created
- [ ] Governance routes configured
- [ ] GovernanceAuth middleware working
- [ ] Integration tests written (80%+ coverage)
- [ ] All tests passing
- [ ] Error handling tested
- [ ] Audit logging verified

---

## 🐛 Common Issues & Solutions

### Issue 1: "Contract not found"
**Symptom:** Error invoking NetworkCore functions  
**Solution:** Verify chaincode is deployed and committed to channel

```bash
docker exec ibnts-peer0.ibn.ictu.edu.vn peer lifecycle chaincode querycommitted -C ibnmain -n network-core
```

### Issue 2: "Endorsement policy not met"
**Symptom:** Transaction fails with endorsement error  
**Solution:** Ensure peer is up and has chaincode installed

### Issue 3: "JSON parse error"
**Symptom:** Cannot parse chaincode response  
**Solution:** Check chaincode returns valid JSON string

---

## 📚 Next Steps

After completing backend integration:
1. ✅ Move to [Frontend UI Development](./2-Frontend-UI.md)
2. ✅ Create governance pages
3. ✅ Test end-to-end flow
4. ✅ Add comprehensive error handling

---

**Estimated Duration:** 10-12 days  
**Complexity:** High  
**Prerequisites:** NetworkCore deployed, Backend running  
**Last Updated:** 2026-01-16
