```
# 🧪 IBN v0.0.3 - Testing Guide

**Test Scenarios & Validation**

---

## ⏸️ TESTING PENDING

> **Status:** Test scenarios defined but not executed  
> **Blocker:** NetworkCore container runtime issues  
> **Next:** Execute tests after chaincode fix

---

## 📋 Test Scenarios

### Organization Management
1. Register new organization
2. Approve organization (SuperAdmin)
3. Suspend organization
4. Revoke organization
5. Query organizations by status

### Chaincode Governance
1. Submit chaincode proposal
2. Approve proposal (multi-party)
3. Reject proposal
4. Record deployment
5. Query proposal history

### Channel Management
1. Create channel proposal
2. Approve channel
3. Add organization to channel
4. Remove organization from channel
5. Query active channels

### Policy Management
1. Create policy
2. Update policy rules
3. Activate/deactivate policy
4. Query policies by type

### Audit & Compliance
1. Record audit events
2. Query audit trail
3. Generate compliance report
4. Filter events by type/date

---

## 🔧 Unit Tests

```bash
cd chaincodes/network-core
npm test
```

---

## 🌐 Integration Tests

```bash
cd backend-ts
npm run test:integration
```

---

## 🎯 E2E Tests

```bash
cd frontend
npm run test:e2e
```

---

**Review:** ✅ Governance test scenarios thay vì tea batch tests
