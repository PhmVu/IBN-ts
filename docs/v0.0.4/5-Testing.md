# Testing Strategy - v0.0.4

**Purpose:** Comprehensive testing approach for all v0.0.4 features  
**Target Coverage:** 80%+  
**Tools:** Jest, Supertest, Playwright

---

## 🎯 Testing Levels

### 1. Unit Tests
- Individual functions and methods
- Service layer logic
- Utility functions
- Target: 70% coverage

### 2. Integration Tests
- API endpoints
- Database operations
- Chaincode invocations
- Target: 80% coverage

### 3. E2E Tests
- Complete user workflows
- Frontend + Backend + Chaincode
- Real browser testing
- Target: Critical paths

---

## 📁 Test Structure

```
backend-ts/tests/
├── unit/
│   ├── services/
│   │   ├── FabricService.test.ts
│   │   └── OrganizationService.test.ts
│   └── utils/
│       └── validation.test.ts
├── integration/
│   ├── governance/
│   │   ├── organization.test.ts
│   │   ├── chaincode.test.ts
│   │   ├── channel.test.ts
│   │   └── audit.test.ts
│   └── setup.ts
└── e2e/
    ├── organization-workflow.test.ts
    └── proposal-workflow.test.ts

frontend/tests/
├── unit/
│   └── components/
│       └── OrganizationCard.test.tsx
└── e2e/
    └── governance/
        ├── org-management.spec.ts
        └── chaincode-proposals.spec.ts
```

---

## 🧪 Integration Test Examples

### Test: Register Organization

**File:** `backend-ts/tests/integration/governance/organization.test.ts`

```typescript
import request from 'supertest';
import app from '../../../src/app';
import { setupTestDB, cleanupTestDB } from '../setup';

describe('Organization Management', () => {
  let adminToken: string;

  beforeAll(async () => {
    await setupTestDB();
    
    // Login as admin
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    
    adminToken = loginRes.body.token;
  });

  afterAll(async () => {
    await cleanupTestDB();
  });

  describe('POST /governance/organizations/register', () => {
    it('should successfully register organization', async () => {
      const orgData = {
        orgId: 'TEST_ORG',
        name: 'Test Organization',
        mspId: 'TestMSP',
        domain: 'test.example.com',
        caUrl: 'http://ca.test.com:7054',
        peerEndpoints: ['peer0.test.com:7051'],
        contactEmail: 'admin@test.com',
        contactPhone: '+84-123-456-789',
        address: '123 Test St',
        businessLicense: 'BL-001',
        taxId: 'TAX-001',
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

    it('should reject invalid data', async () => {
      const res = await request(app)
        .post('/api/v1/governance/organizations/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ orgId: 'INVALID' }); // Missing required fields

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should require admin role', async () => {
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

  describe('POST /governance/organizations/:id/approve', () => {
    it('should approve pending organization', async () => {
      // First register
      const orgData = { /* ... */ };
      await request(app)
        .post('/api/v1/governance/organizations/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(orgData);

      // Then approve
      const res = await request(app)
        .post('/api/v1/governance/organizations/TEST_ORG_2/approve')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('APPROVED');
    });
  });
});
```

---

## 🌐 E2E Test Examples

### Test: Complete Organization Workflow

**File:** `frontend/tests/e2e/governance/org-management.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Organization Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:37003/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('should register and approve organization', async ({ page }) => {
    // Navigate to organization management
    await page.goto('http://localhost:37003/governance/organizations');
    
    // Click register button
    await page.click('text=Register New Organization');
    
    // Fill registration form
    await page.fill('input[name="orgId"]', 'E2E_TEST_ORG');
    await page.fill('input[name="name"]', 'E2E Test Organization');
    await page.fill('input[name="mspId"]', 'E2ETestMSP');
    await page.fill('input[name="domain"]', 'e2etest.com');
    await page.fill('input[name="caUrl"]', 'http://ca.e2etest.com:7054');
    await page.fill('input[name="contactEmail"]', 'admin@e2etest.com');
    
    // Submit form
    await page.click('button:has-text("Submit")');
    
    // Verify success message
    await expect(page.locator('.success-message')).toBeVisible();
    
    // Filter to pending organizations
    await page.click('button:has-text("PENDING")');
    
    // Find and approve the organization
    await page.click('[data-org-id="E2E_TEST_ORG"] button:has-text("Approve")');
    
    // Confirm approval
    await page.click('button:has-text("Confirm")');
    
    // Verify status changed
    await page.click('button:has-text("APPROVED")');
    await expect(page.locator('[data-org-id="E2E_TEST_ORG"]')).toContainText('APPROVED');
  });

  test('should suspend organization', async ({ page }) => {
    await page.goto('http://localhost:37003/governance/organizations');
    
    // Filter to approved
    await page.click('button:has-text("APPROVED")');
    
    // Suspend
    await page.click('[data-org-id="TEST_ORG"] button:has-text("Suspend")');
    await page.fill('textarea[name="reason"]', 'Testing suspension');
    await page.click('button:has-text("Confirm")');
    
    // Verify
    await page.click('button:has-text("SUSPENDED")');
    await expect(page.locator('[data-org-id="TEST_ORG"]')).toBeVisible();
  });
});
```

---

## 📊 Coverage Goals

| Component | Unit | Integration | E2E |
|-----------|------|-------------|-----|
| FabricService | 90% | 80% | - |
| Controllers | 70% | 90% | - |
| Frontend Components | 80% | - | Critical paths |
| Complete Workflows | - | - | 100% |

---

## 🚀 Running Tests

```bash
# Backend unit tests
cd backend-ts
npm test

# Backend integration tests
npm run test:integration

# Frontend unit tests
cd frontend
npm test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

---

## ✅ Test Checklist

### Backend
- [ ] All FabricService methods tested
- [ ] All controllers tested
- [ ] Error handling tested
- [ ] Authentication/authorization tested
- [ ] Database operations tested

### Frontend
- [ ] Components render correctly
- [ ] Forms validate inputs
- [ ] API calls handled
- [ ] Error states displayed
- [ ] Loading states work

### E2E
- [ ] Organization workflow complete
- [ ] Chaincode proposal workflow complete
- [ ] Multi-org interactions tested
- [ ] Error scenarios covered

---

**Target:** 80%+ overall coverage  
**Est. Duration:** 3-4 days for complete test suite  
**Last Updated:** 2026-01-16
