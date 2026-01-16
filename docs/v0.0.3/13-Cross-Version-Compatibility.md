# 🔄 IBN v0.0.3/v0.0.4 - Cross-Version Compatibility

**Version Migration Guide**

---

## 📊 Version Comparison

| Feature | v0.0.1 | v0.0.2 | v0.0.3 | v0.0.4 |
|---------|--------|--------|--------|--------|
| **Focus** | Infrastructure | Security | Governance (Design) | Governance (Implementation) |
| **Chaincode** | Basic (4 functions) | Basic (4 functions) | NetworkCore (24 functions) | NetworkCore v0.0.4 |
| **Organizations** | Manual | Manual | Self-service (Designed) | Single-org bootstrap |
| **Security** | Basic | RBAC + JWT + Certs | Enhanced | Enhanced |
| **Governance** | None | None | Full platform governance (Designed) | Single-org governance |
| **Channel** | - | - | `governance` (docs) | `ibnmain` (actual) |

---

## 🔄 Migration Path

### From v0.0.3 to v0.0.4 (Current)

**Why Upgrade:** v0.0.3 had TypeScript compilation errors preventing deployment.

**Changes:**
1. **Chaincode Fixes**
   - Created missing `ChannelConfig.ts` interface
   - Fixed type consistency: `batchTimeout` (number), `blockSize` (number)
   - Made optional fields properly optional

2. **Known Issues**
   - ✅ TypeScript builds successfully
   - ❌ Runtime container crashes (under investigation)

**Migration Steps:**
```bash
# Rebuild chaincode
cd chaincodes/network-core
npm run build

# Redeploy with new version
cd ../../network
./deploy-chaincode.sh network-core 0.0.4 ibnmain 2
```

---

### From v0.0.1 to v0.0.4

1. **Database Migration**
   - Run new migrations for governance tables
   - Migrate existing organizations to new schema

2. **Chaincode Upgrade**
   - Deploy NetworkCore v0.0.4
   - Initialize `ibnmain` governance channel

3. **Backend Updates**
   - Deploy new governance services
   - Update API endpoints

4. **Frontend Updates**
   - Deploy new governance dashboard
   - Update routes and components

### From v0.0.2 to v0.0.4

1. **Database Migration**
   - Add governance tables
   - Keep existing security tables

2. **Chaincode Deployment**
   - Deploy NetworkCore alongside existing chaincodes
   - No breaking changes to v0.0.2 features

3. **Incremental Rollout**
   - Phase 1: Single-org bootstrap (current)
   - Phase 2: Multi-org setup
   - Phase 3: Enable full governance

---

## 📋 Breaking Changes

### v0.0.3 → v0.0.4
- Channel name changed from `governance` (docs) to `ibnmain` (implementation)
- TypeScript interface updates (application code compatible)
- No data migration needed (new deployment)

### v0.0.2 → v0.0.4
v0.0.4 is **additive** - all v0.0.2 features remain functional.

---

## 🎯 Future Compatibility

### v0.0.5+ (Business Chaincodes)

v0.0.4 governance will manage future business chaincodes:
- TeaTrace chaincode
- SupplyChain chaincode
- Healthcare chaincode
- Finance chaincode

All will use v0.0.4 approval workflow.

---

**Review:** ✅ Updated for v0.0.3→v0.0.4 migration and actual implementation
