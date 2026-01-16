# Testing NetworkCore Governance API

## Prerequisites

1. **Backend running** with NetworkCore chaincode initialized
2. **SuperAdmin user** created (username: `admin`)
3. **Postman** installed

## Quick Test Steps

### 1. Rebuild Backend
```bash
cd /mnt/d/Blockchain/IBN\ with\ TypeScript
docker-compose up -d --build backend-ts
docker logs -f ibnts-backend-ts
```

Wait for: `NetworkCore contract initialized`

### 2. Import Postman Collection
- Import: `postman/NetworkCore-Governance-API.postman_collection.json`
- Set environment variable `baseUrl`: `http://localhost:3000`

### 3. Test Flow

**A. Login:**
```
POST /api/v1/auth/login
Body: {"username": "admin", "password": "admin123"}
```
→ Copy `token` from response

**B. Query Organizations:**
```
GET /api/v1/governance/organizations
Header: Authorization: Bearer <token>
```
→ Should return IBN + TEST-ORG-2 + TEST-ORG

**C. Get Platform Statistics:**
```
GET /api/v1/governance/statistics
Header: Authorization: Bearer <token>
```
→ Should return stats with 3 orgs, proposals, policies, etc.

**D. Get Chaincode History:**
```
GET /api/v1/governance/chaincodes/tea-traceability/history
Header: Authorization: Bearer <token>
```
→ Should return tea-traceability v1.0.0 deployment info

## Expected Results

### QueryOrganizations Response:
```json
{
  "success": true,
  "data": [
    {
      "orgId": "IBN",
      "mspId": "IBNMSP",
      "name": "IBN Platform",
      "status": "APPROVED",
      ...
    },
    {
      "orgId": "TEST-ORG-2",
      "mspId": "TestOrg2MSP",
      "status": "APPROVED",
      ...
    }
  ]
}
```

### GetPlatformStatistics Response:
```json
{
  "success": true,
  "data": {
    "totalOrganizations": 3,
    "approvedOrganizations": 2,
    "totalChaincodeProposals": 2,
    "totalChannels": 1,
    "totalPolicies": 1,
    "totalAuditEvents": 1
  }
}
```

## Testing All Endpoints

### Organizations (6 endpoints)
- ✅ `GET /organizations` - Query all
- ✅ `GET /organizations/:id` - Get by ID  
- ✅ `POST /organizations` - Register new
- ✅ `POST /organizations/:id/approve` - Approve (SuperAdmin)
- ✅ `POST /organizations/:id/suspend` - Suspend (SuperAdmin)
- ✅ `POST /organizations/:id/revoke` - Revoke (SuperAdmin)

### Chaincodes (6 endpoints)
- ✅ `GET /chaincodes` - Query proposals
- ✅ `GET /chaincodes/:name/history` - Get history
- ✅ `POST /chaincodes/submit` - Submit proposal
- ✅ `POST /chaincodes/:id/approve` - Approve
- ✅ `POST /chaincodes/:id/reject` - Reject
- ✅ `POST /chaincodes/:id/deploy` - Record deployment

### Channels, Policies, Audit (11 endpoints)
- Multiple endpoints already implemented

## Troubleshooting

### Error: "NetworkCore contract not initialized"
```bash
# Check backend logs
docker logs ibnts-backend-ts | grep NetworkCore

# Restart backend
docker-compose restart backend-ts
```

### Error: 401 Unauthorized
- Token expired → Login again
- Wrong credentials → Check username/password

### Error: 403 Forbidden
- Endpoint requires SuperAdmin role
- Login with admin account

## Success Criteria

✅ All query endpoints return data  
✅ Organization registration creates PENDING org  
✅ Approve changes status to APPROVED  
✅ Statistics show correct counts  
✅ Chaincode history returns tea-traceability  

---

**Next:** Once all tests pass → Frontend UI development!
