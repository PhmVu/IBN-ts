# 🏢 IBN v0.0.3# 🏢 Multi-Organization Management

**Complete self-service organization lifecycle**

---

## 🔮 FUTURE ROADMAP - NOT YET IMPLEMENTED

> **⚠️ IMPORTANT:** This document describes the **target multi-organization architecture** for Phase 2.  
> 
> **Current State (Phase 1):** Single organization (IBNMSP) bootstrap  
> **Status:** Design complete, implementation pending  
> **Prerequisite:** Fix NetworkCore container runtime issues  
> **ETA:** After single-org verification complete
>
> See [CURRENT-STATUS.md](./CURRENT-STATUS.md) for what's actually implemented.

---

## 📋 Overview

v0.0.3 introduces **self-service organization onboarding** where organizations can register themselves and await approval from platform administrators.

---

## 🔄 Organization Lifecycle

```
1. REGISTRATION
   │ Organization submits registration
   │ Status: PENDING
   ↓
2. REVIEW
   │ SuperAdmin reviews application
   │ Checks: Business license, compliance docs
   ↓
3. APPROVAL
   │ SuperAdmin approves
   │ Status: APPROVED
   │ Organization can now participate
   ↓
4. ACTIVE PARTICIPATION
   │ Submit chaincode proposals
   │ Join channels
   │ Participate in governance
   ↓
5. SUSPENSION (if needed)
   │ Temporary suspension for policy violations
   │ Status: SUSPENDED
   │ Can be reactivated
   ↓
6. REVOCATION (if severe)
   │ Permanent removal
   │ Status: REVOKED
   │ Cannot be reactivated
```

---

## 🎯 Organization Roles

### Platform Operator (IBN)
- **MSP ID:** IBNMSP
- **Responsibilities:**
  - Approve/reject organization registrations
  - Manage platform policies
  - Approve chaincode proposals
  - Create channels
  - Monitor compliance

### Member Organizations
- **MSP ID:** Org1MSP, Org2MSP, etc.
- **Responsibilities:**
  - Submit chaincode proposals
  - Participate in channels
  - Follow platform policies
  - Maintain compliance

---

## 📝 Registration Process

### Step 1: Organization Submits Registration

```typescript
POST /api/v1/organizations/register
{
  "orgId": "ORG-001",
  "mspId": "Org1MSP",
  "name": "Organization 1",
  "domain": "org1.example.com",
  "contactEmail": "contact@org1.example.com",
  "businessLicense": "BL-12345",
  "taxId": "TAX-67890",
  "certifications": ["ISO9001"]
}
```

### Step 2: SuperAdmin Reviews

- Verify business license
- Check compliance documents
- Validate contact information
- Review certifications

### Step 3: SuperAdmin Approves/Rejects

```typescript
// Approve
POST /api/v1/organizations/ORG-001/approve
{
  "comments": "All documents verified"
}

// Reject
POST /api/v1/organizations/ORG-001/reject
{
  "reason": "Invalid business license"
}
```

### Step 4: Organization Receives Notification

- Email notification sent
- Status updated in dashboard
- Access granted (if approved)

---

## 🔐 Access Control

### SuperAdmin Only
- Approve/reject organizations
- Suspend/revoke organizations
- Create channels
- Approve chaincode proposals

### Organization Admin
- View organization details
- Submit chaincode proposals
- View channels they're part of

### Organization User
- Read-only access
- View audit trail

---

## 📊 Multi-Org Network Topology

```
┌─────────────────────────────────────────────────────────┐
│                    IBN Platform                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │    IBN     │  │   Org1     │  │   OrgN     │       │
│  │  (Operator)│  │  (Member)  │  │  (Member)  │       │
│  │            │  │            │  │            │       │
│  │  Peer0     │  │  Peer0     │  │  Peer0     │       │
│  │  CA        │  │  CA        │  │  CA        │       │
│  └────────────┘  └────────────┘  └────────────┘       │
│                                                         │
│  Governance Channel: All organizations                 │
│  Business Channels: Subset of organizations            │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Best Practices

1. **Thorough Verification**
   - Always verify business licenses
   - Check compliance certifications
   - Validate contact information

2. **Clear Policies**
   - Define approval criteria
   - Document suspension/revocation policies
   - Communicate expectations

3. **Regular Audits**
   - Review organization status quarterly
   - Monitor compliance
   - Update certifications

4. **Transparent Communication**
   - Notify organizations of status changes
   - Provide clear rejection reasons
   - Offer appeal process

---

**Review:** ✅ Self-service org onboarding thay vì manual multi-org setup
