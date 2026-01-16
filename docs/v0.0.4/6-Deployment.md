# Deployment Guide - v0.0.4

**Purpose:** Production deployment procedures for v0.0.4 features  
**Environment:** Production  
**Downtime:** Minimal (rolling updates)

---

## 🎯 Deployment Overview

### Components to Deploy
1. **Backend API** - New governance endpoints
2. **Frontend** - New governance UI pages
3. **Database** - Schema updates (if any)
4. **NetworkCore Chaincode** - Already deployed (v0.0.4 CCAAS)

### Deployment Strategy
- **Backend:** Rolling update (zero downtime)
- **Frontend:** Blue-green deployment
- **Database:** Run migrations before backend deployment
- **Chaincode:** Already running, no changes needed

---

## 📋 Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing (unit + integration + E2E)
- [ ] Code review approved
- [ ] Security audit complete
- [ ] Performance benchmarked
- [ ] Documentation updated

### Infrastructure
- [ ] Production environment ready
- [ ] Database backup completed
- [ ] SSL/TLS certificates valid
- [ ] Monitoring configured
- [ ] Rollback plan prepared

---

## 🚀 Deployment Steps

### Step 1: Database Migration (if needed)

```bash
# Backup production database
pg_dump -h localhost -U postgres -d ibn_platform > backup_$(date +%Y%m%d).sql

# Run migrations (if any schema changes)
cd backend-ts
npm run migrate:prod
```

---

### Step 2: Deploy Backend API

```bash
# Build new image
cd backend-ts
docker build -t ibn-backend:0.0.4 .

# Tag for registry
docker tag ibn-backend:0.0.4 registry.example.com/ibn-backend:0.0.4

# Push to registry
docker push registry.example.com/ibn-backend:0.0.4

# Update docker-compose.yml
vim docker-compose.yml
# Change image: ibn-backend:0.0.3 -> ibn-backend:0.0.4

# Rolling update
docker-compose up -d backend-api

# Verify health
curl http://localhost:37080/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "version": "0.0.4",
  "database": "connected",
  "fabric": "connected"
}
```

---

### Step 3: Deploy Frontend

```bash
# Build production bundle
cd frontend
npm run build

# Build Docker image
docker build -t ibn-frontend:0.0.4 .

# Blue-green deployment
# 1. Start new version on different port
docker run -d -p 37004:3001 --name frontend-v0.0.4 ibn-frontend:0.0.4

# 2. Test new version
curl http://localhost:37004

# 3. Update nginx to point to new version
vim network/nginx.conf
# Change proxy_pass from :37003 to :37004

# 4. Reload nginx
docker exec ibnts-nginx nginx -s reload

# 5. Stop old version (after verification)
docker stop ibnts-frontend
docker rm ibnts-frontend
docker rename frontend-v0.0.4 ibnts-frontend
```

---

### Step 4: Verify Deployment

```bash
# 1. Check all containers running
docker ps | grep ibnts

# 2. Test backend endpoints
curl -X POST http://localhost:37080/api/v1/auth/login \
  -d '{"username":"admin","password":"admin123"}'

TOKEN="<from_login_response>"

curl http://localhost:37080/api/v1/governance/organizations \
  -H "Authorization: Bearer $TOKEN"

# 3. Test frontend
open http://localhost:37003/governance/organizations

# 4. Check logs
docker logs ibnts-backend-api --tail 100
docker logs ibnts-frontend --tail 100

# 5. Monitor chaincode
docker logs ibnts-network-core-ccaas --tail 50
```

---

## 🔄 Rollback Procedure

If deployment fails:

```bash
# 1. Revert backend
docker-compose down backend-api
vim docker-compose.yml  # Change back to 0.0.3
docker-compose up -d backend-api

# 2. Revert frontend
docker stop ibnts-frontend
docker run -d -p 37003:3001 --name ibnts-frontend ibn-frontend:0.0.3

# 3. Revert database (if migration ran)
psql -U postgres -d ibn_platform < backup_YYYYMMDD.sql

# 4. Verify rollback
curl http://localhost:37080/health
```

---

## 📊 Post-Deployment Monitoring

### Metrics to Watch

**Backend:**
- API response times (<500ms p95)
- Error rate (<1%)
- CPU/Memory usage
- Database connections

**Frontend:**
- Page load times
- JavaScript errors
- User sessions

**Chaincode:**
- Transaction throughput
- Endorsement latency
- Container health

**Monitoring Commands:**
```bash
# Backend metrics
docker stats ibnts-backend-api

# Database connections
docker exec ibnts-postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Chaincode health
curl http://localhost:39999
```

---

## ⚙️ Environment Variables

### Production Config

**Backend (.env):**
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@postgres:5432/ibn_platform
FABRIC_GATEWAY_URL=grpc://gateway.ibn.ictu.edu.vn:7051
FABRIC_WALLET_PATH=/wallets/production
JWT_SECRET=<strong-secret>
REDIS_URL=redis://redis:6379
VAULT_URL=http://vault:8200
```

**Frontend (.env.production):**
```env
VITE_API_URL=https://api.ibn.ictu.edu.vn
VITE_GATEWAY_URL=https://api.ibn.ictu.edu.vn
```

---

## 🔐 Security Checklist

- [ ] TLS enabled for all external connections
- [ ] Environment secrets stored in Vault
- [ ] API rate limiting configured
- [ ] CORS properly configured
- [ ] SQL injection protection verified
- [ ] XSS protection enabled
- [ ] Authentication tokens expire appropriately

---

## 📝 Deployment Log Template

```markdown
## v0.0.4 Deployment - YYYY-MM-DD

### Pre-Deployment
- [ ] Tests passed: ✅
- [ ] Database backup: ✅ backup_20260116.sql
- [ ] Code review: ✅ Approved by [reviewer]

### Deployment
- Started: YYYY-MM-DD HH:MM
- Backend deployed: YYYY-MM-DD HH:MM
- Frontend deployed: YYYY-MM-DD HH:MM
- Verification complete: YYYY-MM-DD HH:MM
- Completed: YYYY-MM-DD HH:MM

### Issues
- None / [List any issues encountered]

### Rollback
- Required: No
- If yes, reason: N/A
```

---

## 🚨 Troubleshooting

### Issue: Backend won't start
**Check:** Environment variables, database connection, Fabric gateway

### Issue: Frontend 404 errors
**Check:** Nginx configuration, API URL in .env.production

### Issue: Governance endpoints 403
**Check:** User has SuperAdmin role, JWT token valid

---

**Deployment Time:** ~30 minutes (including verification)  
**Downtime:** <5 minutes (rolling updates)  
**Last Updated:** 2026-01-16
