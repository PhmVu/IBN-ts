# Frontend Governance UI Guide - v0.0.4

**Purpose:** Build user-friendly React interfaces for all NetworkCore governance operations  
**Estimated Duration:** 1-2 weeks  
**Complexity:** Medium-High

---

## 📋 Pages to Build

1. **Organization Management** - Register, approve, suspend, revoke organizations
2. **Chaincode Proposals** - Submit, approve, reject chaincode deployment proposals  
3. **Channel Management** - Create channels, manage organization membership
4. **Policy Management** - Configure and update governance policies
5. **Audit Trail** - View comprehensive audit logs

---

## 🏗️ Component Structure

```
frontend/src/
├── pages/
│   └── Governance/
│       ├── OrganizationManagement.tsx      [NEW]
│       ├── ChaincodeProposals.tsx          [NEW]
│       ├── ChannelManagement.tsx           [NEW]
│       ├── PolicyManagement.tsx            [NEW]
│       └── AuditTrail.tsx                  [NEW]
├── components/
│   └── Governance/
│       ├── OrganizationCard.tsx            [NEW]
│       ├── ProposalCard.tsx                [NEW]
│       ├── OrganizationForm.tsx            [NEW]
│       ├── ProposalForm.tsx                [NEW]
│       ├── ApprovalStatus.tsx              [NEW]
│       └── StatusBadge.tsx                 [NEW]
├── services/
│   ├── organizationService.ts              [NEW]
│   ├── governanceService.ts                [NEW]
│   └── auditService.ts                     [NEW]
└── types/
    └── governance.ts                        [NEW]
```

---

## 📝 Implementation Examples

### 1. Organization Management Page

**File:** `frontend/src/pages/Governance/OrganizationManagement.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { organizationService } from '../../services/organizationService';
import { Organization } from '../../types/governance';
import OrganizationCard from '../../components/Governance/OrganizationCard';
import OrganizationForm from '../../components/Governance/OrganizationForm';

const OrganizationManagement: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    loadOrganizations();
  }, [filter]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const data = await organizationService.getAll(filter !== 'ALL' ? { status: filter } : {});
      setOrganizations(data);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (orgId: string) => {
    try {
      await organizationService.approve(orgId);
      await loadOrganizations(); // Refresh
    } catch (error) {
      alert('Failed to approve organization');
    }
  };

  const handleSuspend = async (orgId: string, reason: string) => {
    try {
      await organizationService.suspend(orgId, reason);
      await loadOrganizations();
    } catch (error) {
      alert('Failed to suspend organization');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Organization Management</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Register New Organization
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-4 mb-6">
        {['ALL', 'PENDING', 'APPROVED', 'SUSPENDED', 'REVOKED'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded ${
              filter === status ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Organization List */}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {organizations.map(org => (
            <OrganizationCard
              key={org.orgId}
              organization={org}
              onApprove={handleApprove}
              onSuspend={handleSuspend}
            />
          ))}
        </div>
      )}

      {/* Registration Form Modal */}
      {showForm && (
        <OrganizationForm
          onClose={() => setShowForm(false)}
          onSuccess={loadOrganizations}
        />
      )}
    </div>
  );
};

export default OrganizationManagement;
```

---

### 2. Organization Service

**File:** `frontend/src/services/organizationService.ts`

```typescript
import api from './api';
import { Organization } from '../types/governance';

export const organizationService = {
  async getAll(filter?: object): Promise<Organization[]> {
    const response = await api.get('/governance/organizations', {
      params: { filter: JSON.stringify(filter || {}) }
    });
    return response.data.data;
  },

  async getById(id: string): Promise<Organization> {
    const response = await api.get(`/governance/organizations/${id}`);
    return response.data.data;
  },

  async register(orgData: Partial<Organization>): Promise<Organization> {
    const response = await api.post('/governance/organizations/register', orgData);
    return response.data.data;
  },

  async approve(orgId: string): Promise<Organization> {
    const response = await api.post(`/governance/organizations/${orgId}/approve`);
    return response.data.data;
  },

  async suspend(orgId: string, reason: string): Promise<Organization> {
    const response = await api.post(`/governance/organizations/${orgId}/suspend`, { reason });
    return response.data.data;
  },

  async revoke(orgId: string, reason: string): Promise<Organization> {
    const response = await api.post(`/governance/organizations/${orgId}/revoke`, { reason });
    return response.data.data;
  }
};
```

---

### 3. Organization Card Component

**File:** `frontend/src/components/Governance/OrganizationCard.tsx`

```tsx
import React from 'react';
import { Organization } from '../../types/governance';
import StatusBadge from './StatusBadge';

interface Props {
  organization: Organization;
  onApprove: (orgId: string) => void;
  onSuspend: (orgId: string, reason: string) => void;
}

const OrganizationCard: React.FC<Props> = ({ organization, onApprove, onSuspend }) => {
  const { orgId, name, status, mspId, domain, contactEmail } = organization;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold">{name}</h3>
          <p className="text-gray-600 text-sm">{orgId}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="space-y-2 mb-4">
        <p><strong>MSP ID:</strong> {mspId}</p>
        <p><strong>Domain:</strong> {domain}</p>
        <p><strong>Contact:</strong> {contactEmail}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {status === 'PENDING' && (
          <button
            onClick={() => onApprove(orgId)}
            className="bg-green-600 text-white px-4 py-2 rounded flex-1"
          >
            Approve
          </button>
        )}
        {status === 'APPROVED' && (
          <button
            onClick={() => {
              const reason = prompt('Suspension reason:');
              if (reason) onSuspend(orgId, reason);
            }}
            className="bg-yellow-600 text-white px-4 py-2 rounded flex-1"
          >
            Suspend
          </button>
        )}
      </div>
    </div>
  );
};

export default OrganizationCard;
```

---

## 🎨  UI/UX Best Practices

1. **Status Indicators:** Use color-coded badges for organization/proposal status
2. **Confirmation Dialogs:** Require confirmation for destructive actions (suspend, revoke, reject)
3. **Real-time Updates:** Poll for updates or use WebSocket for live data
4. **Loading States:** Show spinners/skeletons during API calls
5. **Error Handling:** Display user-friendly error messages
6. **Form Validation:** Validate all inputs before submission
7. **Responsive Design:** Ensure mobile compatibility

---

## ✅ Implementation Checklist

- [ ] Create all 5 governance pages
- [ ] Build reusable components (cards, forms, badges)
- [ ] Implement services for API calls
- [ ] Add proper error handling
- [ ] Create loading states
- [ ] Add form validation
- [ ] Test responsive design
- [ ] Add accessibility features (ARIA labels)
- [ ] Implement search/filter functionality
- [ ] Add pagination for large lists

---

## 🔗 Routes Configuration

**File:** `frontend/src/App.tsx`

```tsx
import { Route, Routes } from 'react-router-dom';
import OrganizationManagement from './pages/Governance/OrganizationManagement';
import ChaincodeProposals from './pages/Governance/ChaincodeProposals';
// ... other imports

<Routes>
  {/* Governance Routes - Admin Only */}
  <Route path="/governance">
    <Route path="organizations" element={<OrganizationManagement />} />
    <Route path="chaincodes" element={<ChaincodeProposals />} />
    <Route path="channels" element={<ChannelManagement />} />
    <Route path="policies" element={<PolicyManagement />} />
    <Route path="audit" element={<AuditTrail />} />
  </Route>
</Routes>
```

---

**Estimated Duration:** 8-10 days  
**Complexity:** Medium-High  
**Prerequisites:** Backend API complete, React knowledge  
**Last Updated:** 2026-01-16
