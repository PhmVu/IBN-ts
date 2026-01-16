# Architecture Updates - v0.0.4

**Purpose:** Document architectural changes and design decisions in v0.0.4  
**Scope:** System-wide architecture, component interactions, data flow

---

## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Organization │  │  Chaincode   │  │   Channel    │          │
│  │ Management   │  │  Proposals   │  │ Management   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTP/REST API
┌────────────────────────────┼─────────────────────────────────────┐
│                      Backend API (Express + TypeScript)          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Governance Controllers                       │   │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐         │   │
│  │  │  Org   │  │ C/Code │  │ Channel│  │ Policy │         │   │
│  │  └────────┘  └────────┘  └────────┘  └────────┘         │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │             Services Layer                                │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                │   │
│  │  │ FabricService   │  │ OrgService      │                │   │
│  │  └─────────────────┘  └─────────────────┘                │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │          Auth & Middleware                                │   │
│  │  ┌────────────┐  ┌─────────────┐  ┌────────────┐         │   │
│  │  │ Auth       │  │ Role-Based  │  │ Rate       │         │   │
│  │  │ Middleware │  │ Access      │  │ Limiting   │         │   │
│  │  └────────────┘  └─────────────┘  └────────────┘         │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────┬──────────────┬──────────────┬──────────────────────┘
             │              │              │
    ┌────────┴────┐  ┌──────┴──────┐  ┌───┴────┐
    │ PostgreSQL  │  │   Redis     │  │ Vault  │
    │ (User Data) │  │   (Cache)   │  │(Secrets)│
    └─────────────┘  └─────────────┘  └────────┘
                             │
                    ┌────────┴──────────┐
                    │  Fabric Gateway   │
                    └────────┬──────────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│              Hyperledger Fabric Network                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │          NetworkCore Chaincode (CCAAS)                    │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │   │
│  │  │ Org Mgmt   │  │ Chaincode  │  │ Channel    │         │   │
│  │  │ (6 funcs)  │  │ Gov (6)    │  │ Mgmt (5)   │         │   │
│  │  └────────────┘  └────────────┘  └────────────┘         │   │
│  │  ┌────────────┐  ┌────────────┐                          │   │
│  │  │ Policy (3) │  │ Audit (4)  │                          │   │
│  │  └────────────┘  └────────────┘                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐               │
│  │ Peer0  │  │ Peer1  │  │ Peer2  │  │Orderer │               │
│  └────────┘  └────────┘  └────────┘  └────────┘               │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### Organization Registration Flow

```
User (Frontend)
    │
    │ 1. Fill registration form
    │
    ▼
Frontend Service (organizationService.ts)
    │
    │ 2. POST /governance/organizations/register
    │
    ▼
Backend Controller (OrganizationController.ts)
    │
    │ 3. Validate input
    │ 4. Check authentication
    │ 5. Verify SuperAdmin role
    │
    ▼
FabricService
    │
    │ 6. Get contract reference
    │ 7. submitTransaction('RegisterOrganization', data)
    │
    ▼
Fabric Gateway
    │
    │ 8. Route to chaincode
    │
    ▼
NetworkCore Chaincode (CCAAS Container)
    │
    │ 9. Validate org data
    │ 10. Check uniqueness (orgId, mspId)
    │ 11. Create organization object
    │ 12. Save to ledger
    │
    ▼
Ledger (Blockchain State)
    │
    │ 13. Transaction committed
    │
    ▼
Response bubbles back up
    │
    ▼
Frontend displays success
```

---

## 📦 Component Interaction

### Backend Components

**Controllers Layer:**
- Handle HTTP requests
- Validate inputs
- Call service layer
- Format responses

**Services Layer:**
- Business logic
- Fabric interaction
- Database operations
- External API calls

**Middleware:**
- Authentication (JWT verification)
- Authorization (role checking)
- Rate limiting
- Audit logging
- Error handling

---

## 🗄️ Data Models

### Organization Entity

**Chaincode (Ledger):**
```typescript
{
  orgId: string;          // Primary key
  name: string;
  mspId: string;          // Unique
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REVOKED';
  registeredAt: string;   // ISO timestamp
  approvedAt?: string;
  ...
}
```

**Backend Database (PostgreSQL):**
```sql
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  org_id VARCHAR(50) UNIQUE NOT NULL,
  msp_id VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_org_status ON organizations(status);
CREATE INDEX idx_org_msp_id ON organizations(msp_id);
```

**Purpose of Dual Storage:**
- **Ledger:** Immutable record, consensus, multi-org visibility
- **DB:** Fast queries, caching, UI-specific data

---

## 🔐 Security Architecture

### Authentication Flow

```
1. User logs in → JWT token issued (15min expiry)
2. Token stored in localStorage
3. Every API request includes: Authorization: Bearer {token}
4. Backend verifies token signature
5. Backend checks user role
6. Request processed if authorized
```

### Authorization Layers

```
Layer 1: Network Auth (Fabric Gateway)
         ↓
Layer 2: API Auth (JWT middleware)
         ↓
Layer 3: Role-Based Access (governanceAuth middleware)
         ↓
Layer 4: Chaincode ACL (ownership checks)
```

---

## 📈 Scalability Considerations

### Horizontal Scaling

**Backend API:**
- Stateless design (JWT, no sessions)
- Can run multiple instances behind load balancer
- Redis for shared cache

**Chaincode:**
- Multiple peer instances
- CCAAS containers can be replicated
- Endorsement from any peer

**Database:**
- PostgreSQL with read replicas
- Connection pooling (max 20 connections)

---

## 🔌 API Design Principles

1. **RESTful:** Standard HTTP methods (GET, POST, PUT, DELETE)
2. **Consistent Response Format:**
   ```json
   {
     "success": true,
     "data": {...},
     "error": null
   }
   ```
3. **Versioned:** `/api/v1/...` for future compatibility
4. **Idempotent:** Safe to retry operations
5. **Paginated:** Large result sets use pagination

---

## 🎯 Design Decisions

### Why CCAAS?
- Avoids Docker-in-Docker build issues
- Easier debugging (container logs)
- Official Fabric 2.5 method
- Better for production

### Why Separate Controllers?
- Single Responsibility Principle
- Easier testing
- Better code organization
- Independent scaling

### Why Dual Storage (Ledger + DB)?
- Ledger: Source of truth, immutable
- DB: Performance, complex queries
- Best of both worlds

---

## 🔮 Future Architecture Enhancements

### Planned for v0.0.5+
- **Event-Driven:** WebSocket for real-time updates
- **Microservices:** Split governance into separate service
- **GraphQL:** Alternative API for flexible queries
- **Caching Layer:** Redis for frequently accessed data
- **Message Queue:** RabbitMQ for async operations

---

**Last Updated:** 2026-01-16  
**Architecture Version:** 4.0  
**Next Review:**  When planning v0.0.5
