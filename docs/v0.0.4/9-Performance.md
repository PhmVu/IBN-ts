# Performance Optimization - v0.0.4

**Purpose:** Performance tuning and benchmarking for production  
**Target:** <500ms p95 API latency, 100+ TPS chaincode throughput

---

## 🎯 Performance Goals

| Component | Metric | Target | Current |
|-----------|--------|--------|---------|
| API Response Time | p95 latency | <500ms | TBD |
| Chaincode Invocation | Avg latency | <200ms | TBD |
| Database Queries | Avg time | <50ms | TBD |
| Frontend Page Load | First paint | <2s | TBD |
| Transaction Throughput | TPS | 100+ | TBD |

---

## 📊 Benchmark Baseline

### Step 1: Measure Current Performance

```bash
# Install k6
curl https://github.com/grafana/k6/releases/download/v0.45.0/k6-v0.45.0-linux-amd64.tar.gz \
  | tar xz && sudo mv k6 /usr/local/bin/

# Create load test script
cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up
    { duration: '1m', target: 50 },   // Steady load
    { duration: '30s', target: 0 },   // Ramp down
  ],
};

export default function () {
  // Login
  const loginRes = http.post('http://localhost:37080/api/v1/auth/login', 
    JSON.stringify({ username: 'admin', password: 'admin123' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  check(loginRes, { 'login status 200': (r) => r.status === 200 });
  const token = loginRes.json('token');

  // Query organizations
  const orgRes = http.get('http://localhost:37080/api/v1/governance/organizations', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  check(orgRes, { 
    'org query status 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500
  });

  sleep(1);
}
EOF

# Run load test
k6 run load-test.js
```

**Expected Output:**
```
http_req_duration..............: avg=250ms p95=480ms
http_reqs......................: 3000/min
vus............................: 50
```

---

## ⚡ Backend Optimizations

### 1. Database Connection Pooling

**File:** `backend-ts/src/config/database.ts`

```typescript
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,                    // Max connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000,
});

// Enable prepared statements for frequent queries
pool.on('connect', (client) => {
  client.query('PREPARE get_org AS SELECT * FROM organizations WHERE org_id = $1');
});
```

---

### 2. Caching with Redis

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache organization queries (5 min TTL)
async function getOrganization(orgId: string) {
  const cacheKey = `org:${orgId}`;
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Query from chaincode
  const org = await fabricService.queryOrganizations({ orgId });
  
  // Cache result
  await redis.setex(cacheKey, 300, JSON.stringify(org));
  
  return org;
}

// Invalidate cache on updates
async function approveOrganization(orgId: string, approver: string) {
  const result = await fabricService.approveOrganization(orgId, approver);
  
  // Clear cache
  await redis.del(`org:${orgId}`);
  await redis.del('org:list'); // Clear list cache too
  
  return result;
}
```

---

### 3. Parallel Requests

```typescript
// BEFORE (Sequential - slow)
async function getProposalDetails(proposalId: string) {
  const proposal = await fabricService.queryProposal(proposalId);
  const org = await fabricService.queryOrganization(proposal.proposer);
  const history = await fabricService.getChaincodeHistory(proposal.chaincodeName);
  
  return { proposal, org, history };
}

// AFTER (Parallel - fast)
async function getProposalDetails(proposalId: string) {
  const [proposal, org, history] = await Promise.all([
    fabricService.queryProposal(proposalId),
    fabricService.queryOrganization(proposal.proposer),
    fabricService.getChaincodeHistory(proposal.chaincodeName)
  ]);
  
  return { proposal, org, history };
}
```

---

## 🎨 Frontend Optimizations

### 1. Code Splitting

**File:** `frontend/src/App.tsx`

```tsx
import { lazy, Suspense } from 'react';

// Lazy load governance pages
const OrganizationManagement = lazy(() => import('./pages/Governance/OrganizationManagement'));
const ChaincodeProposals = lazy(() => import('./pages/Governance/ChaincodeProposals'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/governance/organizations" element={<OrganizationManagement />} />
        <Route path="/governance/chaincodes" element={<ChaincodeProposals />} />
      </Routes>
    </Suspense>
  );
}
```

---

### 2. Memoization

```tsx
import { useMemo, useCallback } from 'react';

function OrganizationList({ organizations }: Props) {
  // Memoize expensive computations
  const filteredOrgs = useMemo(() => {
    return organizations.filter(org => org.status === 'APPROVED');
  }, [organizations]);

  // Memoize callbacks
  const handleApprove = useCallback((orgId: string) => {
    organizationService.approve(orgId);
  }, []);

  return (
    <div>
      {filteredOrgs.map(org => (
        <OrganizationCard key={org.orgId} org={org} onApprove={handleApprove} />
      ))}
    </div>
  );
}
```

---

### 3. Virtualization for Large Lists

```tsx
import { FixedSizeList } from 'react-window';

function OrganizationList({ organizations }: Props) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <OrganizationCard organization={organizations[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={organizations.length}
      itemSize={150}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}
```

---

## 🔗 Chaincode Optimizations

### 1. Batch Operations

```typescript
// Instead of multiple individual queries
for (const orgId of orgIds) {
  const org = await contract.evaluateTransaction('QueryOrganizations', JSON.stringify({ orgId }));
  results.push(JSON.parse(org.toString()));
}

// Use single batch query
const orgs = await contract.evaluateTransaction(
  'QueryOrganizations',
  JSON.stringify({ orgId: { $in: orgIds } })
);
```

---

### 2. Index Optimization

**Chaincode CouchDB Indexes:**

```json
{
  "index": {
    "fields": ["status", "approvedAt"]
  },
  "name": "status-approved-index",
  "type": "json"
}
```

Deploy indexes:
```bash
docker cp indexes.json ibnts-couchdb0:/tmp/
docker exec ibnts-couchdb0 curl -X POST \
  http://admin:adminpw@localhost:5984/ibnmain/_index \
  -d @/tmp/indexes.json
```

---

## 📈 Monitoring & Profiling

### Prometheus Metrics

```typescript
import promClient from 'prom-client';

const register = new promClient.Registry();

// HTTP request duration
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000]
});

register.registerMetric(httpRequestDuration);

// Middleware to track metrics
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .observe(duration);
  });
  
  next();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

---

## ✅ Performance Checklist

### Backend
- [ ] Database connection pooling configured (max 20)
- [ ] Redis caching for frequent queries
- [ ] Parallel request processing where possible
- [ ] Response compression enabled (gzip)
- [ ] Static assets cached
- [ ] Database queries optimized (indexes added)

### Frontend
- [ ] Code splitting for large pages
- [ ] Lazy loading components
- [ ] Memoization for expensive computations
- [ ] Virtualization for long lists
- [ ] Image optimization
- [ ] Bundle size < 500KB

### Chaincode
- [ ] CouchDB indexes created
- [ ] Batch operations instead of loops
- [ ] Minimal ledger reads/writes
- [ ] Efficient data structures

---

## 🎯 Target Benchmarks

After optimization, aim for:

```
API Endpoints:
- Login: <100ms
- Query organizations: <200ms
- Register organization: <300ms
- Approve organization: <400ms

Frontend:
- Initial load: <2s
- Page transitions: <300ms
- List rendering (100 items): <500ms

Chaincode:
- Read operations: <100ms
- Write operations: <200ms
- Batch operations: <500ms
```

---

**Last Updated:** 2026-01-16  
**Next Benchmark:** After v0.0.4 deployment  
**Tool:** k6 + Prometheus + Grafana
