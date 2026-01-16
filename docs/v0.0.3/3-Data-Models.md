# 📊 IBN v0.0.3 - Data Models

**Complete governance data structure specifications**

---

## 🎯 Overview

All data models are defined as TypeScript interfaces for type safety and documentation. These models support the platform governance system.

---

## 📦 Core Models

### 1. Organization

```typescript
interface Organization {
  // ===== Identity =====
  orgId: string;              // Unique ID (e.g., "ORG-001")
  mspId: string;              // MSP ID (e.g., "Org1MSP")
  name: string;               // Organization name
  domain: string;             // Domain (e.g., "org1.example.com")
  
  // ===== Registration =====
  registeredBy: string;       // Who registered this org (MSP ID)
  registeredAt: string;       // Registration timestamp (ISO 8601)
  
  // ===== Approval =====
  status: OrgStatus;          // Current status
  approvedBy?: string;        // Who approved (MSP ID)
  approvedAt?: string;        // Approval timestamp
  
  // ===== Contact Information =====
  contactEmail: string;       // Primary contact email
  contactPhone: string;       // Contact phone number
  address: string;            // Physical address
  
  // ===== Compliance =====
  businessLicense: string;    // Business license number
  taxId: string;              // Tax identification number
  certifications: string[];   // ISO, industry certifications
  
  // ===== Technical Configuration =====
  caUrl: string;              // Certificate Authority URL
  peerEndpoints: string[];    // Peer endpoints
  
  // ===== Metadata =====
  metadata: Record<string, any>; // Additional custom data
  createdAt: string;          // Creation timestamp
  updatedAt: string;          // Last update timestamp
}

type OrgStatus = 
  | 'PENDING'      // Awaiting approval
  | 'APPROVED'     // Active member
  | 'SUSPENDED'    // Temporarily suspended
  | 'REVOKED';     // Permanently revoked
```

**Status Transitions:**
```
PENDING → APPROVED → SUSPENDED → APPROVED
                  ↓
                REVOKED (final)
```

---

### 2. ChaincodeProposal

```typescript
interface ChaincodeProposal {
  // ===== Identity =====
  proposalId: string;         // Unique proposal ID
  chaincodeName: string;      // Chaincode name
  version: string;            // Version (e.g., "1.0.0")
  
  // ===== Proposer =====
  proposedBy: string;         // Organization MSP ID
  proposedAt: string;         // Proposal timestamp (ISO 8601)
  
  // ===== Details =====
  description: string;        // What does this chaincode do?
  language: string;           // go, javascript, typescript
  sourceCodeHash: string;     // SHA256 hash of source code
  packageId: string;          // Fabric package ID (after packaging)
  
  // ===== Approval Workflow =====
  status: ProposalStatus;     // Current status
  approvals: Approval[];      // List of approvals
  requiredApprovals: number;  // How many approvals needed
  
  // ===== Deployment Configuration =====
  targetChannels: string[];   // Which channels to deploy to
  endorsementPolicy: string;  // Endorsement policy definition
  
  // ===== Security & Compliance =====
  securityAudit: boolean;     // Has passed security audit?
  auditReport?: string;       // Hash of audit report (IPFS/storage)
  
  // ===== Metadata =====
  createdAt: string;          // Creation timestamp
  updatedAt: string;          // Last update timestamp
}

type ProposalStatus = 
  | 'DRAFT'        // Being prepared
  | 'SUBMITTED'    // Awaiting approval
  | 'APPROVED'     // Approved for deployment
  | 'REJECTED'     // Rejected
  | 'DEPLOYED';    // Successfully deployed

interface Approval {
  orgId: string;              // Approving organization ID
  approvedBy: string;         // Approver MSP ID
  approvedAt: string;         // Approval timestamp
  signature: string;          // Digital signature (TX ID)
  comments?: string;          // Optional comments
}
```

**Approval Workflow:**
```
DRAFT → SUBMITTED → (collect approvals) → APPROVED → DEPLOYED
                  ↓
                REJECTED
```

---

### 3. ChannelConfig

```typescript
interface ChannelConfig {
  // ===== Identity =====
  channelId: string;          // Channel ID (e.g., "supply-chain")
  channelName: string;        // Display name
  
  // ===== Members =====
  organizations: string[];    // List of org MSP IDs
  orderers: string[];         // Orderer endpoints
  
  // ===== Policies =====
  endorsementPolicy: string;  // Default endorsement policy
  lifecyclePolicy: string;    // Chaincode lifecycle policy
  
  // ===== Configuration =====
  blockSize: number;          // Max block size (bytes)
  batchTimeout: number;       // Batch timeout (milliseconds)
  
  // ===== Status =====
  status: ChannelStatus;      // Current status
  createdBy: string;          // Creator MSP ID
  createdAt: string;          // Creation timestamp
  updatedAt: string;          // Last update timestamp
}

type ChannelStatus = 
  | 'ACTIVE'       // Channel is active
  | 'INACTIVE'     // Channel is inactive
  | 'ARCHIVED';    // Channel is archived
```

**Example:**
```json
{
  "channelId": "ibnmain",
  "channelName": "Platform Governance Channel",
  "organizations": ["IBNMSP", "Org1MSP", "Org2MSP"],
  "orderers": ["orderer.ibn.ictu.edu.vn:7050"],
  "endorsementPolicy": "OR('IBNMSP.peer', 'Org1MSP.peer')",
  "lifecyclePolicy": "MAJORITY",
  "blockSize": 102400,
  "batchTimeout": 2000,
  "status": "ACTIVE"
}
```

---

### 4. PlatformPolicy

```typescript
interface PlatformPolicy {
  // ===== Identity =====
  policyId: string;           // Unique policy ID
  policyName: string;         // Display name
  policyType: PolicyType;     // Type of policy
  
  // ===== Definition =====
  rules: PolicyRule[];        // List of rules
  
  // ===== Scope =====
  appliesTo: string[];        // Which orgs/channels this applies to
  
  // ===== Status =====
  isActive: boolean;          // Is this policy active?
  version: string;            // Policy version
  
  // ===== Metadata =====
  createdBy: string;          // Creator MSP ID
  createdAt: string;          // Creation timestamp
  updatedAt: string;          // Last update timestamp
}

type PolicyType = 
  | 'ENDORSEMENT'     // Transaction endorsement
  | 'LIFECYCLE'       // Chaincode lifecycle
  | 'ACCESS_CONTROL'  // Access control
  | 'COMPLIANCE';     // Compliance rules

interface PolicyRule {
  ruleId: string;             // Unique rule ID
  condition: string;          // Condition expression
  action: string;             // Action to take
  priority: number;           // Rule priority (higher = first)
}
```

**Example:**
```json
{
  "policyId": "POLICY-001",
  "policyName": "Chaincode Approval Policy",
  "policyType": "LIFECYCLE",
  "rules": [
    {
      "ruleId": "RULE-001",
      "condition": "proposal.securityAudit === false",
      "action": "REJECT",
      "priority": 100
    },
    {
      "ruleId": "RULE-002",
      "condition": "approvals.length >= requiredApprovals",
      "action": "APPROVE",
      "priority": 50
    }
  ],
  "appliesTo": ["*"],
  "isActive": true,
  "version": "1.0.0"
}
```

---

### 5. AuditEvent

```typescript
interface AuditEvent {
  // ===== Identity =====
  eventId: string;            // Unique event ID
  eventType: AuditEventType;  // Type of event
  
  // ===== Actor =====
  actor: string;              // Who did it (MSP ID)
  actorRole: string;          // Their role (SuperAdmin, OrgAdmin, User)
  
  // ===== Action =====
  action: string;             // What they did
  resource: string;           // What resource (Organization, Chaincode, etc.)
  resourceId: string;         // Resource ID
  
  // ===== Result =====
  status: 'SUCCESS' | 'FAILURE';
  errorMessage?: string;      // Error message if failed
  
  // ===== Context =====
  ipAddress?: string;         // IP address (if available)
  userAgent?: string;         // User agent (if available)
  
  // ===== Data =====
  beforeState?: any;          // State before action
  afterState?: any;           // State after action
  
  // ===== Timestamp =====
  timestamp: string;          // Event timestamp (ISO 8601)
  txId: string;               // Blockchain transaction ID
}

type AuditEventType = 
  | 'ORG_REGISTERED'
  | 'ORG_APPROVED'
  | 'ORG_SUSPENDED'
  | 'ORG_REVOKED'
  | 'CHAINCODE_PROPOSED'
  | 'CHAINCODE_APPROVED'
  | 'CHAINCODE_REJECTED'
  | 'CHAINCODE_DEPLOYED'
  | 'CHANNEL_CREATED'
  | 'CHANNEL_UPDATED'
  | 'POLICY_CREATED'
  | 'POLICY_UPDATED';
```

**Example:**
```json
{
  "eventId": "EVT-001",
  "eventType": "ORG_APPROVED",
  "actor": "IBNMSP",
  "actorRole": "SuperAdmin",
  "action": "ApproveOrganization",
  "resource": "Organization",
  "resourceId": "ORG-001",
  "status": "SUCCESS",
  "beforeState": {"status": "PENDING"},
  "afterState": {"status": "APPROVED"},
  "timestamp": "2025-12-29T14:00:00Z",
  "txId": "abc123..."
}
```

---

## 🗄️ Database Schema (PostgreSQL)

### organizations Table

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id VARCHAR(100) UNIQUE NOT NULL,
  msp_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255),
  status VARCHAR(20) NOT NULL,
  registered_by VARCHAR(100),
  registered_at TIMESTAMP,
  approved_by VARCHAR(100),
  approved_at TIMESTAMP,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  business_license VARCHAR(100),
  tax_id VARCHAR(100),
  certifications JSONB,
  ca_url VARCHAR(255),
  peer_endpoints JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_org_status (status),
  INDEX idx_org_msp_id (msp_id),
  INDEX idx_org_registered_at (registered_at)
);
```

### chaincode_proposals Table

```sql
CREATE TABLE chaincode_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id VARCHAR(100) UNIQUE NOT NULL,
  chaincode_name VARCHAR(100) NOT NULL,
  version VARCHAR(50) NOT NULL,
  proposed_by VARCHAR(100) NOT NULL,
  proposed_at TIMESTAMP NOT NULL,
  description TEXT,
  language VARCHAR(50),
  source_code_hash VARCHAR(64),
  package_id VARCHAR(255),
  status VARCHAR(20) NOT NULL,
  approvals JSONB,
  required_approvals INTEGER,
  target_channels JSONB,
  endorsement_policy TEXT,
  security_audit BOOLEAN,
  audit_report VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_proposal_status (status),
  INDEX idx_proposal_chaincode (chaincode_name),
  INDEX idx_proposal_proposed_at (proposed_at)
);
```

### channel_configs Table

```sql
CREATE TABLE channel_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id VARCHAR(100) UNIQUE NOT NULL,
  channel_name VARCHAR(255) NOT NULL,
  organizations JSONB,
  orderers JSONB,
  endorsement_policy TEXT,
  lifecycle_policy TEXT,
  block_size INTEGER,
  batch_timeout INTEGER,
  status VARCHAR(20),
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_channel_status (status)
);
```

### platform_policies Table

```sql
CREATE TABLE platform_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id VARCHAR(100) UNIQUE NOT NULL,
  policy_name VARCHAR(255) NOT NULL,
  policy_type VARCHAR(50) NOT NULL,
  rules JSONB,
  applies_to JSONB,
  is_active BOOLEAN DEFAULT true,
  version VARCHAR(50),
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_policy_type (policy_type),
  INDEX idx_policy_active (is_active)
);
```

### audit_events_cache Table

```sql
CREATE TABLE audit_events_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(100) UNIQUE NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  actor VARCHAR(100),
  actor_role VARCHAR(50),
  action VARCHAR(100),
  resource VARCHAR(100),
  resource_id VARCHAR(100),
  status VARCHAR(20),
  error_message TEXT,
  ip_address VARCHAR(50),
  user_agent TEXT,
  before_state JSONB,
  after_state JSONB,
  timestamp TIMESTAMP NOT NULL,
  tx_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_audit_event_type (event_type),
  INDEX idx_audit_timestamp (timestamp),
  INDEX idx_audit_actor (actor),
  INDEX idx_audit_resource (resource, resource_id)
);
```

---

## 📏 Validation Rules

### Organization
- `orgId`: Required, unique, 3-50 chars, alphanumeric + hyphen
- `mspId`: Required, unique, must end with "MSP"
- `name`: Required, 3-255 chars
- `contactEmail`: Required, valid email format
- `businessLicense`: Required, non-empty
- `status`: Must be valid OrgStatus

### ChaincodeProposal
- `chaincodeName`: Required, 3-50 chars, alphanumeric + hyphen
- `version`: Required, semantic versioning format (e.g., "1.0.0")
- `sourceCodeHash`: Required, 64 chars (SHA256)
- `requiredApprovals`: Required, > 0
- `status`: Must be valid ProposalStatus

### ChannelConfig
- `channelId`: Required, unique, 3-50 chars, lowercase + hyphen
- `organizations`: Required, array with at least 1 org
- `blockSize`: Required, > 0, <= 104857600 (100MB)
- `batchTimeout`: Required, > 0, <= 10000 (10s)

### PlatformPolicy
- `policyName`: Required, 3-255 chars
- `policyType`: Must be valid PolicyType
- `rules`: Required, array with at least 1 rule
- `version`: Required, semantic versioning format

### AuditEvent
- `eventType`: Must be valid AuditEventType
- `actor`: Required, non-empty
- `action`: Required, non-empty
- `resource`: Required, non-empty
- `status`: Must be 'SUCCESS' or 'FAILURE'

---

**Next:** [API Integration](./4-API-Integration.md)

**Review:** ✅ Đã thay thế TeaBatch models bằng governance models (Organization, ChaincodeProposal, ChannelConfig, PlatformPolicy, AuditEvent)
