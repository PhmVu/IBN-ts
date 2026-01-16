# 🧪 Phase 6 - Testing Guide

**Hướng dẫn chạy tests cho TeaTrace Chaincode v0.0.3**

---

## Bước 1: Install Dependencies

```bash
cd chaincodes/teatrace
npm install
```

**Expected output:**
```
added 150+ packages
```

---

## Bước 2: Compile TypeScript

```bash
npm run build
```

**Expected output:**
```
Successfully compiled TypeScript
dist/ folder created
```

**Kiểm tra:**
```bash
ls dist/
# Should see: index.js, models/, utils/
```

---

## Bước 3: Run Unit Tests

```bash
npm test
```

**Expected output:**
```
TeaTrace Chaincode v0.0.3
  InitLedger
    ✓ should initialize ledger with sample batch
  CreateBatch
    ✓ should create a new batch when called by Farm org
    ✓ should reject creation by non-Farm organization
    ✓ should reject duplicate batch ID
    ✓ should validate batch ID format
  TransferBatch
    ✓ should transfer batch to another organization
    ✓ should reject transfer by non-owner
  AddQualityRecord
    ✓ should add quality record to batch
    ✓ should update quality grade to Premium when all tests pass
  AddCertification
    ✓ should add certification to batch
  UpdateBatchStatus
    ✓ should update batch status with valid transition
    ✓ should reject invalid status transition
  Query Functions
    ✓ should query single batch
    ✓ should return error for non-existent batch
    ✓ should get batch history
    ✓ should get batch events

  15 passing (XXms)
```

---

## Bước 4: Check Test Coverage

```bash
npm run test:coverage
```

**Expected output:**
```
=============================== Coverage summary ===============================
Statements   : 85% ( XXX/XXX )
Branches     : 80% ( XX/XX )
Functions    : 90% ( XX/XX )
Lines        : 85% ( XXX/XXX )
================================================================================
```

**Target:** >80% coverage ✅

---

## Bước 5: View Coverage Report

```bash
# Open coverage report in browser
start coverage/index.html
```

---

## 🔍 Troubleshooting

### Lỗi: "Cannot find module 'fabric-contract-api'"

**Fix:**
```bash
npm install fabric-contract-api fabric-shim
```

### Lỗi: "Cannot find name 'Buffer'"

**Fix:**
```bash
npm install --save-dev @types/node
```

### Lỗi: TypeScript compilation errors

**Fix:**
```bash
# Check tsconfig.json exists
cat tsconfig.json

# Rebuild
npm run build
```

### Tests fail với "stub not found"

**Nguyên nhân:** Mock setup không đúng

**Fix:** Kiểm tra test file có đúng cấu trúc:
```typescript
beforeEach(() => {
    contract = new TeaTraceContract();
    ctx = sinon.createStubInstance(Context);
    stub = sinon.createStubInstance(ChaincodeStub);
    clientIdentity = sinon.createStubInstance(ClientIdentity);
    
    ctx.stub = stub as any;
    ctx.clientIdentity = clientIdentity as any;
});
```

---

## ✅ Success Criteria

Để Phase 6 hoàn thành 100%, cần:

- [x] All dependencies installed
- [x] TypeScript compiles without errors
- [x] All 15 tests pass
- [x] Code coverage >80%
- [ ] No lint errors (optional)

---

## 📊 Expected Results

| Metric | Target | Status |
|--------|--------|--------|
| Tests passing | 15/15 | ⏳ Pending |
| Code coverage | >80% | ⏳ Pending |
| Build success | ✅ | ⏳ Pending |
| No TypeScript errors | ✅ | ⏳ Pending |

---

## 🎯 Next Steps After Tests Pass

1. ✅ Mark Phase 6 as 100% complete
2. ➡️ Move to Phase 7: Deployment
3. ➡️ Package chaincode
4. ➡️ Deploy to Fabric network

---

**Chạy lệnh này để bắt đầu:**

```bash
cd d:/Blockchain/IBN\ with\ TypeScript/chaincodes/teatrace
npm install
npm run build
npm test
```

**Báo lại kết quả để tôi biết tests có pass không nhé!** 🙏
