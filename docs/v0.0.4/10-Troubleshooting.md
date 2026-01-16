# Troubleshooting Guide - v0.0.4

**Purpose:** Common issues and solutions for v0.0.4 governance features  
**Audience:** Developers, DevOps, Support Engineers

---

## 🔍 Quick Diagnosis

### Issue Categorization

| Symptom | Likely Cause | Section |
|---------|--------------|---------|
| 403 Forbidden | Missing SuperAdmin role | [Access Issues](#access-issues) |
| 500 Internal Error | Chaincode invocation failed | [Chaincode Issues](#chaincode-issues) |
| Slow response | Database/cache problem | [Performance Issues](#performance-issues) |
| UI not loading | Frontend build issue | [Frontend Issues](#frontend-issues) |
| Login fails | Backend not running | [Backend Issues](#backend-issues) |

---

## 🚨 Access Issues

### Issue: "Access denied. Governance operations require SuperAdmin role"

**Symptom:**
```json
{
  "success": false,
  "error": "Access denied. Governance operations require SuperAdmin role."
}
```

**Cause:** User does not have SuperAdmin role

**Solution:**
```bash
# Check user role in database
docker exec ibnts-postgres psql -U postgres -d ibn_platform \
  -c "SELECT username, role FROM users WHERE username = 'your_username';"

# Update user role to SuperAdmin
docker exec ibnts-postgres psql -U postgres -d ibn_platform \
  -c "UPDATE users SET role = 'SuperAdmin' WHERE username = 'your_username';"

# Verify
docker exec ibnts-postgres psql -U postgres -d ibn_platform \
  -c "SELECT username, role FROM users WHERE username = 'your_username';"
```

---

### Issue: "No token provided" or "Invalid token"

**Cause:** JWT token expired or missing

**Solution:**
```bash
# Login again to get fresh token
curl -X POST http://localhost:37080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Use new token
TOKEN="<new_token>"
curl http://localhost:37080/api/v1/governance/organizations \
  -H "Authorization: Bearer $TOKEN"
```

---

## ⛓️ Chaincode Issues

### Issue: "Failed to invoke chaincode: connection refused"

**Symptom:**
```
Error: Failed to register organization: error cannot create connection
```

**Diagnosis:**
```bash
# 1. Check if CCAAS container is running
docker ps | grep network-core-ccaas

# 2. Check container logs
docker logs ibnts-network-core-ccaas --tail 50

# 3. Check if port 9999 is listening
docker exec ibnts-network-core-ccaas netstat -tlnp | grep 9999

# 4. Test connectivity from peer
docker exec ibnts-peer0.ibn.ictu.edu.vn \
  nc -zv ibnts-network-core-ccaas 9999
```

**Solution:**
```bash
# Restart CCAAS container
docker-compose restart network-core-ccaas

# If still failing, rebuild image
cd chaincodes/network-core
npm run build
docker build -f Dockerfile.ccaas -t network-core-ccaas:0.0.4 .
cd ../..
docker-compose up -d network-core-ccaas
```

---

### Issue: "Expected 1 parameters, but 0 have been supplied"

**Symptom:**
```
Error 500: Expected 1 parameters, but 0 have been supplied
```

**Cause:** Missing required parameter in chaincode function call

**Solution:**
```bash
# Check function signature
cat chaincodes/network-core/src/index.ts | grep -A 5 "FunctionName"

# Ensure correct number of arguments
# Example: QueryOrganizations requires queryJSON parameter
curl -X GET "http://localhost:37080/api/v1/governance/organizations?filter={}"
# NOT: ?filter=  (empty)
```

---

## 💾 Database Issues

### Issue: "Connection pool exhausted"

**Diagnosis:**
```bash
# Check active connections
docker exec ibnts-postgres psql -U postgres -c \
  "SELECT count(*) FROM pg_stat_activity WHERE datname = 'ibn_platform';"

# Check connection limit
docker exec ibnts-postgres psql -U postgres -c \
  "SHOW max_connections;"
```

**Solution:**
```typescript
// Increase pool size in backend-ts/src/config/database.ts
export const pool = new Pool({
  max: 30,  // Increase from 20
  // ...
});
```

---

## 🎨 Frontend Issues

### Issue: "Cannot read property of undefined"

**Symptom:** Frontend crashes or shows blank page

**Diagnosis:**
```bash
# Check browser console (F12)
# Look for errors like: "Cannot read property 'data' of undefined"

# Check network tab
# Verify API responses have expected structure
```

**Solution:**
```tsx
// Add null checks
const organizations = response?.data?.data || [];
const orgStatus = organization?.status || 'UNKNOWN';

// Use optional chaining
const approvedAt = organization?.approvedAt;
```

---

### Issue: Governance pages return 404

**Cause:** Frontend routes not configured

**Solution:**
```bash
# Verify routes in frontend/src/App.tsx
grep -n "governance" frontend/src/App.tsx

# Rebuild frontend
cd frontend
npm run build
docker-compose restart frontend
```

---

## 🐛 Backend Issues

### Issue: Backend container won't start

**Diagnosis:**
```bash
# Check container status
docker ps -a | grep backend

# View logs
docker logs ibnts-backend-api

# Common errors:
# - "Port 3000 already in use" → Another process using port
# - "Cannot connect to database" → PostgreSQL not ready
# - "Module not found" → Missing npm install
```

**Solution:**
```bash
# Kill process on port 3000
sudo lsof -ti:3000 | xargs kill -9

# Rebuild backend
cd backend-ts
npm install
npm run build
cd ..
docker-compose up -d --build backend-api
```

---

## ⚡ Performance Issues

### Issue: API responses very slow (>2s)

**Diagnosis:**
```bash
# Test endpoint directly
time curl http://localhost:37080/api/v1/governance/organizations \
  -H "Authorization: Bearer $TOKEN"

# Check backend logs for slow queries
docker logs ibnts-backend-api | grep "slow query"

# Check database performance
docker exec ibnts-postgres psql -U postgres -c \
  "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

**Solutions:**
1. **Add database indexes:**
   ```sql
   CREATE INDEX idx_org_status ON organizations(status);
   ```

2. **Enable Redis caching:**
   ```typescript
   const cachedOrgs = await redis.get('organizations:list');
   ```

3. **Use pagination:**
   ```typescript
   const limit = 20;
   const offset = page * limit;
   SELECT * FROM organizations LIMIT $1 OFFSET $2;
   ```

---

## 📋 Common Error Messages

### "Organization already exists"

**Cause:** Trying to register org with duplicate orgId or mspId

**Solution:** Choose unique orgId and mspId not used by existing organizations

---

### "Chaincode not found"

**Cause:** NetworkCore chaincode not deployed to channel

**Solution:**
```bash
# Verify chaincode is committed
docker exec ibnts-peer0.ibn.ictu.edu.vn \
  peer lifecycle chaincode querycommitted -C ibnmain -n network-core

# If not found, redeploy chaincode
```

---

### "Rate limit exceeded"

**Cause:** Too many requests from same IP

**Solution:** Wait 15 minutes or contact admin to whitelist IP

---

## 🔧 Debug Mode

### Enable Debug Logging

**Backend:**
```typescript
// Set LOG_LEVEL=debug in .env
export LOG_LEVEL=debug

// Or temporarily in code
console.log('DEBUG:', JSON.stringify(data, null, 2));
```

**Chaincode:**
```bash
# Set in docker-compose.yml
environment:
  - CORE_CHAINCODE_LOGGING_LEVEL=debug

# Restart container
docker-compose restart network-core-ccaas

# View logs
docker logs ibnts-network-core-ccaas -f
```

---

## 📞 Getting Help

### Information to Provide

When reporting an issue, include:

1. **Environment:**
   - OS version
   - Docker version
   - Node version

2. **Reproduction steps:**
   - Exact commands run
   - Expected vs actual behavior

3. **Logs:**
   ```bash
   # Backend
   docker logs ibnts-backend-api --tail 100 > backend.log
   
   # Chaincode
   docker logs ibnts-network-core-ccaas --tail 100 > chaincode.log
   
   # Database
   docker logs ibnts-postgres --tail 100 > postgres.log
   ```

4. **Screenshots:** If UI issue

---

## 🎯 Quick Fixes

```bash
# Restart everything
docker-compose restart

# Reset database (CAUTION: Data loss!)
docker-compose down -v
docker-compose up -d

# Rebuild backend
docker-compose up -d --build backend-api

# Clear Redis cache
docker exec ibnts-redis redis-cli FLUSHALL

# Reset network
cd network
./reset-network-official.sh
```

---

**Last Updated:** 2026-01-16  
**Support:** Create issue in project repository  
**Emergency:** Contact DevOps team
