# 🏗️ IBN v0.0.3 - System Architecture

**Platform Governance & Multi-Organization Management**

---

## 📊 Complete Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    IBNwts PLATFORM LAYER                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Management Dashboard (React + TypeScript)               │  │
│  │  Port 3001                                               │  │
│  │  - Organization Management                               │  │
│  │  - Chaincode Approval System                             │  │
│  │  - Channel Configuration                                 │  │
│  │  - Policy Management                                     │  │
│  │  - Compliance Dashboard                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTP/REST
┌─────────────────────────────────────────────────────────────────┐
│                  Backend API (Express + TypeScript)             │
│                  Port 9002                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Governance Services:                                    │  │
│  │  - OrganizationService (CRUD + Approval)                 │  │
│  │  - ChaincodeGovernanceService (Proposal + Approval)      │  │
│  │  - ChannelManagementService (Create + Configure)         │  │
│  │  - PolicyService (Create + Enforce)                      │  │
│  │  - AuditService (Record + Report)                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database (Port 5433)                         │  │
│  │  - organizations, chaincode_proposals                    │  │
│  │  - channel_configs, platform_policies                    │  │
│  │  - audit_events_cache                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTP/REST
┌─────────────────────────────────────────────────────────────────┐
│              Gateway API (Fabric SDK + TypeScript)              │
│              Port 9001                                          │
│  - Multi-org transaction routing                                │
│  - Certificate-based authentication                              │
│  - Event subscription                                            │
│  - Transaction submission                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓ gRPC/TLS
┌─────────────────────────────────────────────────────────────────┐
│            HYPERLEDGER FABRIC NETWORK LAYER                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐               │
│  │  Orderer   │  │  IBN Peer  │  │  Org1 Peer │               │
│  │  (Raft)    │  │  (CouchDB) │  │  (CouchDB) │               │
│  │  Port 7050 │  │  Port 7051 │  │  Port 8051 │               │
│  └────────────┘  └────────────┘  └────────────┘               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐               │
│  │   CA IBN   │  │   CA Org1  │  │   CA OrgN  │               │
│  │  Port 7054 │  │            │  │            │               │
│  └────────────┘  └────────────┘  └────────────┘               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    GOVERNANCE CHANNEL                           │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │         NetworkCore Chaincode (TypeScript)                │ │
│  │                                                           │ │
│  │  📋 Organization Management (5 functions):                │ │
│  │     - RegisterOrganization()                              │ │
│  │     - ApproveOrganization()                               │ │
│  │     - SuspendOrganization()                               │ │
│  │     - RevokeOrganization()                                │ │
│  │     - QueryOrganizations()                                │ │
│  │                                                           │ │
│  │  "channelId": "ibnmain", (6 functions):                   │ │
│  │     - SubmitChaincodeProposal()                           │ │
│  │     - ApproveChaincodeProposal()                          │ │
│  │     - RejectChaincodeProposal()                           │ │
│  │     - QueryChaincodeProposals()                           │ │
│  │     - RecordChaincodeDeployment()                         │ │
│  │     - GetChaincodeHistory()                               │ │
│  │                                                           │ │
│  │  📡 Channel Management (5 functions):                     │ │
│  │     - CreateChannelProposal()                             │ │
│  │     - ApproveChannelProposal()                            │ │
│  │     - AddOrganizationToChannel()                          │ │
│  │     - RemoveOrganizationFromChannel()                     │ │
│  │     - QueryChannels()                                     │ │
│  │                                                           │ │
│  │  📜 Policy Management (3 functions):                      │ │
│  │     - CreatePolicy()                                      │ │
│  │     - UpdatePolicy()                                      │ │
│  │     - QueryPolicies()                                     │ │
│  │                                                           │ │
│  │  🔍 Audit & Compliance (3 functions):                     │ │
│  │     - RecordAuditEvent()                                  │ │
│  │     - QueryAuditTrail()                                   │ │
│  │     - GenerateComplianceReport()                          │ │
│  │                                                           │ │
│  │  🛠️ Utilities (2 functions):                              │ │
│  │     - InitLedger()                                        │ │
│  │     - GetPlatformStatistics()                             │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Channel: ibnmain (governance channel)                          │
│  Organizations: IBN, Org1, Org2, ..., OrgN                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Request Flow Examples

### 1. Organization Registration Flow

```
User (Frontend)
  ↓ POST /api/v1/organizations/register
Backend API
  ↓ Validate input
  ↓ Check business license
  ↓ POST /api/v1/chaincode/invoke
Gateway API
  ↓ Load admin wallet identity
  ↓ Create transaction proposal
  ↓ Sign with admin's private key
  ↓ Submit to Fabric Network
Fabric Network
  ↓ Endorsement (multiple peers)
  ↓ Ordering (orderer)
  ↓ Validation & Commit
  ↓ Execute NetworkCore.RegisterOrganization()
Chaincode
  ↓ Validate inputs
  ↓ Check if org already exists
  ↓ Create organization with PENDING status
  ↓ Store on ledger
  ↓ Emit ORG_REGISTERED event
  ↓ Return success
Gateway API
  ↓ Receive transaction result
  ↓ Return to Backend
Backend API
  ↓ Update cache (PostgreSQL)
  ↓ Send notification to SuperAdmin
  ↓ Return to Frontend
Frontend
  ↓ Display success message
  ↓ Show pending approval status
```

### 2. Chaincode Approval Workflow

```
Organization (Frontend)
  ↓ POST /api/v1/chaincodes/proposals
Backend API
  ↓ Validate proposal
  ↓ Check source code hash
  ↓ Submit to NetworkCore.SubmitChaincodeProposal()
Chaincode
  ↓ Create proposal with SUBMITTED status
  ↓ Emit CHAINCODE_PROPOSED event
  ↓ Return proposal ID
Backend API
  ↓ Notify SuperAdmin for approval
  ↓ Return to Frontend

SuperAdmin (Frontend)
  ↓ POST /api/v1/chaincodes/proposals/:id/approve
Backend API
  ↓ Check caller is SuperAdmin
  ↓ Submit to NetworkCore.ApproveChaincodeProposal()
Chaincode
  ↓ Add approval to list
  ↓ Check if required approvals met
  ↓ Update status to APPROVED
  ↓ Emit CHAINCODE_APPROVED event
  ↓ Return success
Backend API
  ↓ Notify proposer
  ↓ Return to Frontend
Frontend
  ↓ Display approval status
  ↓ Enable deployment button
```

### 3. Query Organization Flow

```
User (Frontend)
  ↓ GET /api/v1/organizations?status=APPROVED
Backend API
  ↓ Check cache first (PostgreSQL)
  ↓ If cache miss or expired:
  ↓   GET /api/v1/chaincode/query
Gateway API
  ↓ Load user wallet identity
  ↓ Create query proposal
  ↓ Submit to Fabric Network
Fabric Network
  ↓ Route to any peer
  ↓ Execute NetworkCore.QueryOrganizations()
Chaincode
  ↓ Parse CouchDB query
  ↓ Execute rich query
  ↓ Return organizations
Gateway API
  ↓ Return result
Backend API
  ↓ Update cache
  ↓ Apply RBAC filters
  ↓ Return to Frontend
Frontend
  ↓ Display organization list
```

### 4. Event Subscription Flow

```
Gateway API (on startup)
  ↓ Subscribe to NetworkCore events
  ↓ Listen for: ORG_*, CHAINCODE_*, CHANNEL_*, etc.
Fabric Network
  ↓ Emit event when transaction commits
Gateway API
  ↓ Receive event
  ↓ Forward to Backend via WebSocket/HTTP
Backend API
  ↓ Process event
  ↓ Update cache (PostgreSQL)
  ↓ Trigger workflows (e.g., send notifications)
  ↓ Broadcast to Frontend (WebSocket)
Frontend
  ↓ Real-time UI update
  ↓ Show notification
```

---

## 📦 Component Responsibilities

### Frontend (React - Port 3001)
- **UI/UX:** Platform management dashboard
- **Pages:** Organization, Chaincode, Channel, Policy, Compliance
- **State Management:** Zustand store
- **API Client:** Axios for Backend API calls
- **Real-time:** WebSocket for live updates

### Backend API (Node.js - Port 9002)
- **Business Logic:** Validation, aggregation, reporting
- **Authentication:** JWT tokens, RBAC
- **Database:** PostgreSQL cache for fast queries
- **Event Processing:** Listen to blockchain events
- **API Endpoints:** RESTful API for Frontend
- **Services:**
  - OrganizationService
  - ChaincodeGovernanceService
  - ChannelManagementService
  - PolicyService
  - AuditService

### Gateway API (Node.js - Port 9001)
- **Fabric SDK:** Direct connection to Fabric network
- **Wallet Management:** Load user identities
- **Transaction Submission:** Invoke chaincode
- **Query Routing:** Query chaincode
- **Event Subscription:** Listen to chaincode events
- **Connection Pool:** Manage peer connections

### Hyperledger Fabric Network
- **Peers:** Endorse and commit transactions
- **Orderer:** Order transactions into blocks
- **CouchDB:** State database for each peer
- **Chaincode:** NetworkCore governance logic

---

## 🔑 Key Design Principles

### 1. Separation of Concerns
```
Frontend → User Interface
Backend → Business Logic + Cache
Gateway → Blockchain Interface
Fabric → Distributed Ledger
```

### 2. Multi-Layer Security
```
Layer 1: Frontend - UI validation
Layer 2: Backend - JWT + RBAC
Layer 3: Gateway - Certificate-based auth
Layer 4: Fabric - MSP + Endorsement policies
```

### 3. Event-Driven Architecture
```
Chaincode emits events
  ↓
Gateway subscribes
  ↓
Backend processes
  ↓
Frontend updates (real-time)
```

### 4. Caching Strategy
```
PostgreSQL cache for:
- Organizations
- Chaincode proposals
- Channel configs
- Audit events (recent)

Blockchain as source of truth
```

---

## 🚀 Data Flow Summary

| Layer | Technology | Port | Purpose |
|-------|-----------|------|---------|
| Frontend | React + Vite | 3001 | Platform Management UI |
| Backend API | Express + TypeScript | 9002 | Governance Logic + Cache |
| Gateway API | Fabric SDK + TypeScript | 9001 | Blockchain Gateway |
| Fabric Network | Hyperledger Fabric | 7050+ | Distributed Ledger |
| Database | PostgreSQL | 5433 | Cache + Metadata |

---

## ✅ Correct Integration Points

1. **Frontend ↔ Backend:** HTTP/REST (port 9002)
2. **Backend ↔ Gateway:** HTTP/REST (port 9001)
3. **Gateway ↔ Fabric:** gRPC/Fabric Protocol
4. **Backend ↔ PostgreSQL:** Database connection
5. **Gateway ↔ Wallet:** File system (encrypted)
6. **Backend ↔ Frontend:** WebSocket (events)

---

## 🎯 Platform Governance Workflow

### Organization Lifecycle
```
1. Self-Registration → PENDING
2. SuperAdmin Review → APPROVED/REJECTED
3. Active Participation → ACTIVE
4. Violation → SUSPENDED
5. Severe Violation → REVOKED
```

### Chaincode Lifecycle
```
1. Submit Proposal → SUBMITTED
2. Multi-Party Review → UNDER_REVIEW
3. Approval/Rejection → APPROVED/REJECTED
4. Deployment → DEPLOYED
5. Monitoring → ACTIVE
```

### Channel Lifecycle
```
1. Create Proposal → PROPOSED
2. SuperAdmin Approval → APPROVED
3. Add Organizations → ACTIVE
4. Remove Organizations → UPDATED
5. Archive → ARCHIVED
```

---

## 📊 Platform Statistics

The platform tracks:
- Total organizations by status
- Chaincode proposals by status
- Active channels
- Policy enforcement metrics
- Audit event counts
- Compliance scores

---

**Conclusion:** IBNwts v0.0.3 is a comprehensive platform governance system that enables self-service organization onboarding, multi-party chaincode approval, dynamic channel management, and complete audit trail - all while maintaining enterprise-grade security and compliance.
