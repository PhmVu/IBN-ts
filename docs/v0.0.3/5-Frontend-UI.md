# 🎨 IBN v0.0.3 - Frontend UI

**Management Dashboard**

---

## ⏸️ NOT YET VERIFIED

> **Status:** UI code exists but not tested
> **Reason:** Backend and chaincode integration incomplete
> **Next:** Verify after NetworkCore runtime fix

---

## 📋 Overview

The frontend provides a comprehensive management dashboard for platform governance operations.

**Tech Stack:**
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Zustand (state management)
- React Query (data fetching)

---

## 🗂️ Pages

### 1. Organization Management (`/organizations`)

**Features:**
- View all organizations with status badges
- Register new organization form
- Approve/suspend/revoke actions (SuperAdmin)
- Organization details modal
- Search and filter by status

**Components:**
- `OrganizationList.tsx`
- `OrganizationCard.tsx`
- `OrganizationForm.tsx`
- `ApprovalWorkflow.tsx`

### 2. Chaincode Governance (`/chaincodes`)

**Features:**
- View all chaincode proposals
- Submit new proposal form
- Approve/reject proposals (SuperAdmin)
- Deployment status tracking
- Approval workflow visualization

**Components:**
- `ChaincodeProposalList.tsx`
- `ChaincodeProposalCard.tsx`
- `ProposalForm.tsx`
- `ApprovalTimeline.tsx`

### 3. Channel Management (`/channels`)

**Features:**
- View all channels
- Create channel proposal
- Add/remove organizations
- Channel configuration editor
- Member management

**Components:**
- `ChannelList.tsx`
- `ChannelCard.tsx`
- `ChannelConfigForm.tsx`
- `MemberManagement.tsx`

### 4. Policy Management (`/policies`)

**Features:**
- View all policies
- Create/edit policy
- Rule builder interface
- Policy activation toggle
- Version history

**Components:**
- `PolicyList.tsx`
- `PolicyCard.tsx`
- `PolicyRuleBuilder.tsx`
- `RuleConditionEditor.tsx`

### 5. Compliance Dashboard (`/compliance`)

**Features:**
- Audit event timeline
- Compliance reports
- Statistics charts
- Event filtering
- Export reports

**Components:**
- `AuditEventList.tsx`
- `ComplianceChart.tsx`
- `EventTimeline.tsx`
- `ReportGenerator.tsx`

---

## 🔧 State Management

### Zustand Stores

```typescript
// organizationStore.ts
interface OrganizationStore {
  organizations: Organization[];
  selectedOrg: Organization | null;
  fetchOrganizations: () => Promise<void>;
  approveOrganization: (orgId: string) => Promise<void>;
}

// chaincodeStore.ts
interface ChaincodeStore {
  proposals: ChaincodeProposal[];
  fetchProposals: () => Promise<void>;
  submitProposal: (data: ProposalData) => Promise<void>;
}
```

---

## 📡 API Services

```typescript
// organizationService.ts
export const organizationService = {
  getAll: () => api.get('/organizations'),
  register: (data) => api.post('/organizations/register', data),
  approve: (id) => api.post(`/organizations/${id}/approve`),
};

// chaincodeService.ts
export const chaincodeService = {
  getProposals: () => api.get('/chaincodes/proposals'),
  submitProposal: (data) => api.post('/chaincodes/proposals', data),
};
```

---

**Review:** ✅ 5 governance pages thay vì tea batch management UI
