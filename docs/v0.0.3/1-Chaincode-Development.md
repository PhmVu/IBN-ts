# 💻 IBN v0.0.3/v0.0.4 - Chaincode Development

**NetworkCore Governance Chaincode**

**Current Version:** v0.0.4 (deployed)  
**Status:** 🚧 Deployed but container crashes on invoke  
**Channel:** `ibnmain`

---

## ⚠️ Current Status

**Deployment:** ✅ Successfully deployed to `ibnmain` channel (sequence 2)  
**TypeScript Build:** ✅ Compiles without errors  
**Runtime:** ❌ Container exits with code 1 on invoke  
**Known Issue:** Runtime error preventing InitLedger execution

**See:** [CURRENT-STATUS.md](./CURRENT-STATUS.md) for debugging progress

---
**Chaincode:** NetworkCore v0.0.3  
**Language:** TypeScript  
**Platform:** Hyperledger Fabric 2.5

---

## 📋 Overview

The NetworkCore chaincode implements a comprehensive **platform governance system** for IBNwts, managing organization lifecycle, chaincode approvals, channel configuration, policies, and audit trail.

### Chaincode Functions

| Category | Functions | Count |
|----------|-----------|-------|
| **Organization Management** | RegisterOrganization, ApproveOrganization, SuspendOrganization, RevokeOrganization, QueryOrganizations | 5 |
| **Chaincode Governance** | SubmitChaincodeProposal, ApproveChaincodeProposal, RejectChaincodeProposal, QueryChaincodeProposals, RecordChaincodeDeployment, GetChaincodeHistory | 6 |
| **Channel Management** | CreateChannelProposal, ApproveChannelProposal, AddOrganizationToChannel, RemoveOrganizationFromChannel, QueryChannels | 5 |
| **Policy Management** | CreatePolicy, UpdatePolicy, QueryPolicies | 3 |
| **Audit & Compliance** | RecordAuditEvent, QueryAuditTrail, GenerateComplianceReport | 3 |
| **Utilities** | InitLedger, GetPlatformStatistics | 2 |
| **Total** | | **24** |

---

## 🏗️ Project Structure

```
chaincodes/network-core/
├── src/
│   ├── index.ts                    # Main chaincode contract
│   ├── interfaces/
│   │   ├── Organization.ts         # Organization interface
│   │   ├── ChaincodeProposal.ts    # Chaincode proposal interface
│   │   ├── ChannelConfig.ts        # Channel config interface
│   │   ├── PlatformPolicy.ts       # Policy interface
│   │   └── AuditEvent.ts           # Audit event interface
│   ├── validators/
│   │   ├── organizationValidator.ts
│   │   ├── chaincodeValidator.ts
│   │   └── policyValidator.ts
│   └── utils/
│       ├── accessControl.ts        # Access control helpers
│       └── eventEmitter.ts         # Event emission helpers
├── test/
│   ├── unit/
│   │   ├── organization.test.ts
│   │   ├── chaincode.test.ts
│   │   └── channel.test.ts
│   └── integration/
│       └── governance.test.ts
├── META-INF/
│   └── statedb/
│       └── couchdb/
│           └── indexes/
│               ├── indexOrganization.json
│               ├── indexProposal.json
│               └── indexChannel.json
├── package.json
├── tsconfig.json
└── README.md
```

---

## 📦 Core Data Interfaces

### Organization

```typescript
interface Organization {
  // Identity
  orgId: string;              // Unique org ID
  mspId: string;              // MSP ID
  name: string;               // Organization name
  domain: string;             // Domain
  
  // Registration
  registeredBy: string;       // Who registered
  registeredAt: string;       // Registration timestamp
  
  // Approval
  status: OrgStatus;          // PENDING, APPROVED, SUSPENDED, REVOKED
  approvedBy?: string;
  approvedAt?: string;
  
  // Contact
  contactEmail: string;
  contactPhone: string;
  address: string;
  
  // Compliance
  businessLicense: string;
  taxId: string;
  certifications: string[];
  
  // Technical
  caUrl: string;
  peerEndpoints: string[];
  
  // Metadata
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

type OrgStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REVOKED';
```

### ChaincodeProposal

```typescript
interface ChaincodeProposal {
  proposalId: string;
  chaincodeName: string;
  version: string;
  proposedBy: string;
  proposedAt: string;
  description: string;
  language: string;
  sourceCodeHash: string;
  packageId: string;
  status: ProposalStatus;
  approvals: Approval[];
  requiredApprovals: number;
  targetChannels: string[];
  endorsementPolicy: string;
  securityAudit: boolean;
  auditReport?: string;
  createdAt: string;
  updatedAt: string;
}

type ProposalStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'DEPLOYED';

interface Approval {
  orgId: string;
  approvedBy: string;
  approvedAt: string;
  signature: string;
  comments?: string;
}
```

---

## 🔧 Function Implementation Examples

### 1. RegisterOrganization

```typescript
@Transaction()
async RegisterOrganization(
  ctx: Context,
  orgId: string,
  mspId: string,
  name: string,
  domain: string,
  contactEmail: string,
  businessLicense: string,
  metadataJSON: string
): Promise<string> {
  // 1. Validate inputs
  this._validateOrgId(orgId);
  this._validateMspId(mspId);
  this._validateEmail(contactEmail);
  
  // 2. Check if org already exists
  const exists = await this.OrganizationExists(ctx, orgId);
  if (exists) {
    throw new Error(`Organization ${orgId} already exists`);
  }
  
  // 3. Get creator info
  const creator = ctx.clientIdentity.getMSPID();
  const timestamp = new Date().toISOString();
  
  // 4. Parse metadata
  const metadata = JSON.parse(metadataJSON);
  
  // 5. Create organization
  const organization: Organization = {
    orgId,
    mspId,
    name,
    domain,
    registeredBy: creator,
    registeredAt: timestamp,
    status: 'PENDING',
    contactEmail,
    contactPhone: metadata.contactPhone || '',
    address: metadata.address || '',
    businessLicense,
    taxId: metadata.taxId || '',
    certifications: metadata.certifications || [],
    caUrl: metadata.caUrl || '',
    peerEndpoints: metadata.peerEndpoints || [],
    metadata,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  
  // 6. Save to ledger
  await ctx.stub.putState(orgId, Buffer.from(JSON.stringify(organization)));
  
  // 7. Emit event
  ctx.stub.setEvent('ORG_REGISTERED', Buffer.from(JSON.stringify({
    orgId,
    mspId,
    name,
    registeredBy: creator,
    timestamp
  })));
  
  return JSON.stringify(organization);
}
```

### 2. ApproveOrganization

```typescript
@Transaction()
async ApproveOrganization(
  ctx: Context,
  orgId: string,
  approverComments: string
): Promise<string> {
  // 1. Check caller is SuperAdmin
  const caller = ctx.clientIdentity.getMSPID();
  if (!this._isSuperAdmin(ctx)) {
    throw new Error('Only SuperAdmin can approve organizations');
  }
  
  // 2. Get organization
  const org = await this._getOrganization(ctx, orgId);
  
  // 3. Validate status
  if (org.status !== 'PENDING') {
    throw new Error(`Organization must be PENDING, current status: ${org.status}`);
  }
  
  // 4. Update organization
  const timestamp = new Date().toISOString();
  org.status = 'APPROVED';
  org.approvedBy = caller;
  org.approvedAt = timestamp;
  org.updatedAt = timestamp;
  
  // 5. Save
  await ctx.stub.putState(orgId, Buffer.from(JSON.stringify(org)));
  
  // 6. Emit event
  ctx.stub.setEvent('ORG_APPROVED', Buffer.from(JSON.stringify({
    orgId,
    approvedBy: caller,
    comments: approverComments,
    timestamp
  })));
  
  return JSON.stringify(org);
}
```

### 3. SubmitChaincodeProposal

```typescript
@Transaction()
async SubmitChaincodeProposal(
  ctx: Context,
  chaincodeName: string,
  version: string,
  description: string,
  sourceCodeHash: string,
  targetChannelsJSON: string,
  endorsementPolicy: string
): Promise<string> {
  // 1. Validate inputs
  this._validateChaincodeName(chaincodeName);
  this._validateVersion(version);
  this._validateSourceCodeHash(sourceCodeHash);
  
  // 2. Check caller is approved org
  const caller = ctx.clientIdentity.getMSPID();
  const callerOrg = await this._getOrganizationByMspId(ctx, caller);
  if (callerOrg.status !== 'APPROVED') {
    throw new Error('Only approved organizations can submit proposals');
  }
  
  // 3. Parse target channels
  const targetChannels = JSON.parse(targetChannelsJSON);
  
  // 4. Create proposal
  const timestamp = new Date().toISOString();
  const proposalId = `${chaincodeName}-${version}-${Date.now()}`;
  
  const proposal: ChaincodeProposal = {
    proposalId,
    chaincodeName,
    version,
    proposedBy: caller,
    proposedAt: timestamp,
    description,
    language: 'typescript',
    sourceCodeHash,
    packageId: '',
    status: 'SUBMITTED',
    approvals: [],
    requiredApprovals: 1, // Configurable
    targetChannels,
    endorsementPolicy,
    securityAudit: false,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  
  // 5. Save
  await ctx.stub.putState(proposalId, Buffer.from(JSON.stringify(proposal)));
  
  // 6. Emit event
  ctx.stub.setEvent('CHAINCODE_PROPOSED', Buffer.from(JSON.stringify({
    proposalId,
    chaincodeName,
    version,
    proposedBy: caller,
    timestamp
  })));
  
  return JSON.stringify(proposal);
}
```

---

## 🔍 Query Functions

### QueryOrganizations (CouchDB Rich Query)

```typescript
@Transaction(false)
async QueryOrganizations(
  ctx: Context,
  queryJSON: string
): Promise<string> {
  const query = JSON.parse(queryJSON);
  
  const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
  const results = [];
  
  let result = await iterator.next();
  while (!result.done) {
    const org = JSON.parse(result.value.value.toString());
    results.push(org);
    result = await iterator.next();
  }
  
  await iterator.close();
  return JSON.stringify(results);
}
```

**Example Queries:**

```json
// Get all approved organizations
{
  "selector": {
    "status": "APPROVED"
  }
}

// Get organizations by MSP ID
{
  "selector": {
    "mspId": "Org1MSP"
  }
}

// Get pending organizations
{
  "selector": {
    "status": "PENDING"
  },
  "sort": [{"registeredAt": "desc"}]
}
```

---

## 🔐 Access Control

### Implementation

```typescript
// Helper methods
private _isSuperAdmin(ctx: Context): boolean {
  const mspId = ctx.clientIdentity.getMSPID();
  // Check if caller is from IBN organization
  return mspId === 'IBNMSP';
}

private _isOrgAdmin(ctx: Context, orgId: string): boolean {
  const mspId = ctx.clientIdentity.getMSPID();
  // Check if caller belongs to the organization
  return this._getOrganizationByMspId(ctx, mspId).orgId === orgId;
}

// Usage in functions
async ApproveOrganization(ctx: Context, ...): Promise<string> {
  if (!this._isSuperAdmin(ctx)) {
    throw new Error('Only SuperAdmin can approve organizations');
  }
  // ... rest of logic
}
```

---

## 📡 Event Emission

### Event Types

1. **ORG_REGISTERED** - Organization registered
2. **ORG_APPROVED** - Organization approved
3. **ORG_SUSPENDED** - Organization suspended
4. **ORG_REVOKED** - Organization revoked
5. **CHAINCODE_PROPOSED** - Chaincode proposal submitted
6. **CHAINCODE_APPROVED** - Chaincode proposal approved
7. **CHAINCODE_REJECTED** - Chaincode proposal rejected
8. **CHAINCODE_DEPLOYED** - Chaincode deployed
9. **CHANNEL_CREATED** - Channel created
10. **POLICY_CREATED** - Policy created

### Event Schema

```typescript
// All events follow this pattern
ctx.stub.setEvent('EventName', Buffer.from(JSON.stringify({
  // Event-specific fields
  timestamp: string
})));
```

---

## 🧪 Testing

### Unit Tests

```typescript
describe('NetworkCore - Organization Management', () => {
  it('should register organization successfully', async () => {
    // Test implementation
  });
  
  it('should reject duplicate organization', async () => {
    // Test implementation
  });
  
  it('should approve organization (SuperAdmin only)', async () => {
    // Test implementation
  });
});
```

---

## 🚀 Build & Deploy

```bash
# Build
cd chaincodes/network-core
npm install
npm run build

# Package
cd ..
tar czf network-core-v0.0.3.tar.gz network-core/dist/ network-core/package.json

# Deploy (see Deployment Guide)
peer lifecycle chaincode install network-core-v0.0.3.tar.gz
```

---

**Next:** [Multi-Organization Setup](./2-Multi-Organization.md)

**Review:** ✅ Đã chuyển từ TeaTrace sang NetworkCore với 24 governance functions
