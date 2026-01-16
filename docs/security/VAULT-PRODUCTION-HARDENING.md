# Vault Production Hardening - Implementation Plan

**Goal:** Make Vault production-ready with persistent storage  
**Estimated Time:** 1.5 hours  
**Priority:** High (prevents KEK loss on restart)

---

## 🎯 Objectives

1. **Data Persistence:** Switch Vault to file backend
2. **Security Cleanup:** Remove sensitive data from .env
3. **Reliability:** Test restart scenarios
4. **Documentation:** Production deployment guide

---

## 📋 Tasks Breakdown

### Task 1: Switch Vault to File Backend (30 min)

**Current Issue:**
- Vault dev mode = in-memory storage
- KEK lost on container restart
- Requires manual re-migration

**Solution: File Backend**

#### Step 1.1: Create Vault Config File
**File:** `vault-config/vault-prod.hcl`

```hcl
# Vault Production Configuration
ui = true

# File backend for persistent storage
storage "file" {
  path = "/vault/file"
}

# HTTP listener
listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1
}

# Disable mlock for Docker
disable_mlock = true

# API address
api_addr = "http://0.0.0.0:8200"
```

#### Step 1.2: Update docker-compose.yml
**File:** `docker-compose.yml`

```yaml
vault:
  image: hashicorp/vault:1.15
  container_name: ibnts-vault
  ports:
    - "38200:8200"
  environment:
    - VAULT_ADDR=http://0.0.0.0:8200
    # Remove dev mode vars
  volumes:
    - ./vault-config/vault-prod.hcl:/vault/config/vault.hcl:ro
    - vault-data:/vault/file
  command: server
  networks:
    - ibn-network
  cap_add:
    - IPC_LOCK
  healthcheck:
    test: ["CMD", "vault", "status"]
    interval: 10s
    timeout: 5s
    retries: 3

volumes:
  vault-data:
    driver: local
```

#### Step 1.3: Create Initialization Script
**File:** `scripts/init-vault-prod.sh`

```bash
#!/bin/bash
# Initialize Vault in production mode

echo "🔐 Initializing Vault..."

# Wait for Vault to be ready
sleep 3

# Initialize Vault (one-time)
docker-compose exec vault vault operator init \
  -key-shares=1 \
  -key-threshold=1 \
  -format=json > vault-keys.json

echo "✅ Vault initialized!"
echo "⚠️  SAVE vault-keys.json SECURELY!"
echo ""
echo "Keys saved to: vault-keys.json"
echo "Unseal key and root token are in this file."
```

---

### Task 2: Migrate to Production Vault (20 min)

#### Step 2.1: Backup Current KEK
```bash
# Get current KEK from dev Vault
docker-compose exec vault vault kv get -format=json \
  secret/ibn/encryption-key > kek-backup.json
```

#### Step 2.2: Stop and Recreate Vault
```bash
# Stop current Vault
docker-compose stop vault
docker-compose rm -f vault

# Start production Vault
docker-compose up -d vault

# Initialize (first time only)
bash scripts/init-vault-prod.sh
```

#### Step 2.3: Unseal and Configure
```bash
# Extract keys from vault-keys.json
UNSEAL_KEY=$(cat vault-keys.json | jq -r '.unseal_keys_b64[0]')
ROOT_TOKEN=$(cat vault-keys.json | jq -r '.root_token')

# Unseal Vault
docker-compose exec vault vault operator unseal $UNSEAL_KEY

# Enable KV v2 engine
docker-compose exec -e VAULT_TOKEN=$ROOT_TOKEN vault \
  vault secrets enable -version=2 -path=secret kv

# Migrate KEK
KEK=$(cat kek-backup.json | jq -r '.data.data.key')
docker-compose exec -e VAULT_TOKEN=$ROOT_TOKEN vault \
  vault kv put secret/ibn/encryption-key \
  key=$KEK \
  algorithm=AES-256-GCM \
  migrated_to_prod=true
```

---

### Task 3: Update Backend Configuration (15 min)

#### Step 3.1: Update .env
**File:** `backend-ts/.env`

**Changes:**
```bash
# Before
VAULT_ADDR=http://vault:8200
VAULT_ROOT_TOKEN=dev-root-token-ibn
WALLET_ENCRYPTION_KEY=ffa8f37c3a...  # DELETE THIS

# After
VAULT_ADDR=http://vault:8200
VAULT_ROOT_TOKEN=<ROOT_TOKEN_FROM_VAULT_KEYS_JSON>
# WALLET_ENCRYPTION_KEY removed
```

#### Step 3.2: Update docker-compose.yml env
**File:** `docker-compose.yml`

```yaml
backend-api:
  environment:
    - VAULT_ADDR=http://vault:8200
    - VAULT_ROOT_TOKEN=${VAULT_ROOT_TOKEN}
    # Remove WALLET_ENCRYPTION_KEY
```

---

### Task 4: Testing & Verification (20 min)

#### Test 1: Vault Restart Persistence
```bash
# 1. Restart Vault
docker-compose restart vault

# 2. Unseal (required after restart)
docker-compose exec vault vault operator unseal $UNSEAL_KEY

# 3. Verify KEK still exists
docker-compose exec -e VAULT_TOKEN=$ROOT_TOKEN vault \
  vault kv get secret/ibn/encryption-key

# Expected: KEK data returned ✅
```

#### Test 2: Backend KEK Loading
```bash
# 1. Restart backend
docker-compose restart backend-api

# 2. Check logs
docker logs ibnts-backend-api | grep "Encryption key"

# Expected: "✅ Encryption key loaded from Vault" ✅
```

#### Test 3: User Enrollment
```bash
# Create new user
curl -X POST http://localhost:37080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"prod-test","email":"prod@test.com","password":"Test123!@#"}'

# Expected: Success with wallet created ✅
```

#### Test 4: Key Rotation
```bash
# Run validation
docker-compose exec backend-api npx ts-node -r tsconfig-paths/register \
  src/scripts/test-key-rotation.ts validate

# Expected: All wallets valid ✅
```

---

### Task 5: Security Hardening (10 min)

#### Step 5.1: Move vault-keys.json to Secure Location
```bash
# CRITICAL: Do NOT commit vault-keys.json to git!
# Store in password manager or secure vault

# Add to .gitignore
echo "vault-keys.json" >> .gitignore
echo "kek-backup.json" >> .gitignore
```

#### Step 5.2: Create Unseal Script
**File:** `scripts/unseal-vault.sh`

```bash
#!/bin/bash
# Unseal Vault after restart

if [ ! -f vault-keys.json ]; then
  echo "❌ vault-keys.json not found!"
  exit 1
fi

UNSEAL_KEY=$(cat vault-keys.json | jq -r '.unseal_keys_b64[0]')

docker-compose exec vault vault operator unseal $UNSEAL_KEY

echo "✅ Vault unsealed"
```

#### Step 5.3: Update .gitignore
```
vault-config/vault-keys.json
vault-keys.json
kek-backup.json
*.backup
```

---

### Task 6: Documentation (15 min)

#### Create Production Guide
**File:** `doc/security/VAULT-PRODUCTION-GUIDE.md`

**Contents:**
- Production deployment steps
- Initialization process
- Unseal procedures
- Backup & recovery
- Monitoring checklist

---

## 🔄 Migration Workflow

```
Current Dev Mode
     ↓
1. Backup KEK (kek-backup.json)
     ↓
2. Create vault-prod.hcl
     ↓
3. Update docker-compose.yml (file backend)
     ↓
4. Initialize Vault (vault-keys.json)
     ↓
5. Unseal Vault
     ↓
6. Migrate KEK to production Vault
     ↓
7. Test all scenarios
     ↓
8. Clean up .env
     ↓
Production Ready ✅
```

---

## ✅ Success Criteria

- [ ] Vault using file backend
- [ ] KEK persists after restart
- [ ] vault-keys.json stored securely
- [ ] .env cleaned (no WALLET_ENCRYPTION_KEY)
- [ ] Backend loads KEK from Vault
- [ ] User enrollment works
- [ ] Key rotation works
- [ ] Unseal script created
- [ ] Production guide written

---

## ⚠️ Critical Warnings

1. **NEVER commit vault-keys.json** to git
2. **ALWAYS backup vault-keys.json** before operations
3. **Test unseal process** before going to production
4. **Keep unseal key secure** - losing it = losing all data
5. **Document root token** for emergency access

---

## 🚨 Rollback Plan

If production Vault fails:

1. **Restore Dev Mode:**
   ```bash
   # Revert docker-compose.yml to dev mode
   git checkout docker-compose.yml
   docker-compose up -d vault
   ```

2. **Re-migrate KEK:**
   ```bash
   KEK=$(cat kek-backup.json | jq -r '.data.data.key')
   # Migrate back to dev Vault
   ```

3. **Restart Backend:**
   ```bash
   docker-compose restart backend-api
   ```

---

## 📊 Estimated Timeline

| Task | Duration | Critical |
|------|----------|----------|
| Create config files | 10 min | Yes |
| Update docker-compose | 5 min | Yes |
| Backup & migrate KEK | 10 min | Yes |
| Initialize prod Vault | 10 min | Yes |
| Update backend config | 10 min | Yes |
| Testing (4 tests) | 20 min | Yes |
| Security hardening | 10 min | Yes |
| Documentation | 15 min | No |
| **Total** | **90 min** | - |

---

## 🎯 Next Steps After Completion

1. **Monitor Vault Health:** Set up healthcheck alerts
2. **Automate Unseal:** Consider auto-unseal with cloud KMS (future)
3. **Backup Strategy:** Regular snapshots of vault-data volume
4. **Access Policies:** Implement least-privilege policies
5. **Phase 2C:** Enhanced security features

---

**Status:** Ready to implement  
**Date:** 2026-01-14  
**Version:** 1.0
