# 🏢 IBN v0.0.3 - Enterprise Blockchain Standards

**Chuẩn hóa Blockchain theo quy định quốc tế**

---

## 🎯 Mục tiêu

Xây dựng v0.0.3 đạt chuẩn **Enterprise Blockchain** theo các quy định:
- ✅ ISO/TC 307 - Blockchain and DLT Standards
- ✅ NIST Blockchain Standards
- ✅ Hyperledger Best Practices
- ✅ GDPR Compliance
- ✅ SOC 2 Type II Requirements

---

## 📋 Các Tiêu chuẩn Bắt buộc

### 1. **Data Privacy & Security** 🔐

#### A. Private Data Collections (ISO/TC 307)

**Yêu cầu:** Dữ liệu nhạy cảm phải được bảo vệ khỏi unauthorized access.

**Implementation:**

```json
// chaincodes/teatrace/collections_config.json
[
  {
    "name": "priceData",
    "policy": "OR('Farm1MSP.member', 'Processor1MSP.member')",
    "requiredPeerCount": 1,
    "maxPeerCount": 2,
    "blockToLive": 1000,
    "memberOnlyRead": true,
    "memberOnlyWrite": true,
    "endorsementPolicy": {
      "signaturePolicy": "OR('Farm1MSP.member', 'Processor1MSP.member')"
    }
  },
  {
    "name": "qualitySecrets",
    "policy": "OR('ProcessorMSP.member', 'QualityLabMSP.member')",
    "requiredPeerCount": 1,
    "maxPeerCount": 2,
    "blockToLive": 0,
    "memberOnlyRead": true,
    "memberOnlyWrite": true
  },
  {
    "name": "contractTerms",
    "policy": "OR('Farm1MSP.member', 'Retailer1MSP.member')",
    "requiredPeerCount": 1,
    "maxPeerCount": 2,
    "blockToLive": 3000,
    "memberOnlyRead": true,
    "memberOnlyWrite": true
  }
]
```

**Chaincode Functions:**

```typescript
// Store private price data
@Transaction()
async TransferBatchWithPrice(
  ctx: Context,
  batchId: string,
  toOrg: string,
  publicDataJSON: string,
  privateDataJSON: string
): Promise<string> {
  // Verify caller is authorized
  const mspId = ctx.clientIdentity.getMSPID();
  
  // Parse data
  const publicData = JSON.parse(publicDataJSON);
  const privateData = JSON.parse(privateDataJSON);
  
  // Store public data on ledger
  const batch = await this._getBatch(ctx, batchId);
  batch.currentOwner = toOrg;
  batch.transferHistory.push({
    transferId: `TR-${Date.now()}`,
    fromOrg: mspId,
    toOrg: toOrg,
    transferDate: new Date().toISOString(),
    transferType: publicData.transferType,
    quantity: publicData.quantity,
    location: publicData.location,
    notes: publicData.notes,
    senderSignature: ctx.stub.getTxID(),
    receiverSignature: ''
  });
  
  await ctx.stub.putState(batchId, Buffer.from(JSON.stringify(batch)));
  
  // Store private data (price, contract terms)
  const privateKey = `${batchId}-${Date.now()}`;
  await ctx.stub.putPrivateData(
    'priceData',
    privateKey,
    Buffer.from(JSON.stringify(privateData))
  );
  
  // Store hash on ledger for verification
  const hash = crypto.createHash('sha256')
    .update(JSON.stringify(privateData))
    .digest('hex');
  
  await ctx.stub.setEvent('PrivateDataStored', Buffer.from(JSON.stringify({
    batchId,
    privateKey,
    hash
  })));
  
  return JSON.stringify({ batchId, privateKey, hash });
}

// Read private data (only authorized orgs)
@Transaction(false)
async GetPrivatePrice(
  ctx: Context,
  batchId: string,
  privateKey: string
): Promise<string> {
  const privateData = await ctx.stub.getPrivateData('priceData', privateKey);
  
  if (!privateData || privateData.length === 0) {
    throw new Error('Private data not found or not authorized');
  }
  
  return privateData.toString();
}

// Verify private data hash
@Transaction(false)
async VerifyPrivateDataHash(
  ctx: Context,
  privateKey: string,
  expectedHash: string
): Promise<boolean> {
  const privateData = await ctx.stub.getPrivateDataHash('priceData', privateKey);
  
  if (!privateData || privateData.length === 0) {
    return false;
  }
  
  const actualHash = Buffer.from(privateData).toString('hex');
  return actualHash === expectedHash;
}
```

#### B. Encryption at Rest & In Transit

**TLS Configuration:**

```yaml
# network/docker-compose.yaml
services:
  peer0.farm1:
    environment:
      - CORE_PEER_TLS_ENABLED=true
      - CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt
      - CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key
      - CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt
      - CORE_PEER_TLS_CLIENTAUTHREQUIRED=true
      - CORE_PEER_TLS_CLIENTROOTCAS_FILES=/etc/hyperledger/fabric/tls/ca.crt
```

**Database Encryption:**

```yaml
# CouchDB encryption
services:
  couchdb:
    environment:
      - COUCHDB_ENCRYPTION_ENABLED=true
      - COUCHDB_ENCRYPTION_KEY_FILE=/etc/couchdb/encryption.key
```

---

### 2. **Access Control & Authorization** 🔑

#### A. Endorsement Policies (NIST Standards)

**Chaincode-level Policy:**

```bash
# Deployment with endorsement policy
peer lifecycle chaincode approveformyorg \
  --channelID teatrace \
  --name teatrace \
  --version 0.0.3 \
  --package-id $PACKAGE_ID \
  --sequence 1 \
  --signature-policy "AND('Farm1MSP.member', 'Processor1MSP.member')"
```

**State-based Endorsement:**

```typescript
@Transaction()
async SetBatchEndorsementPolicy(
  ctx: Context,
  batchId: string,
  requiredOrgs: string[]
): Promise<void> {
  // Only admin can set policy
  const mspId = ctx.clientIdentity.getMSPID();
  if (mspId !== 'AdminMSP') {
    throw new Error('Only admin can set endorsement policy');
  }
  
  // Build policy
  const identities = requiredOrgs.map((org, index) => ({
    role: { name: 'member', mspId: org }
  }));
  
  const policy = {
    identities,
    policy: {
      [`${requiredOrgs.length}-of`]: identities.map((_, i) => ({ 'signed-by': i }))
    }
  };
  
  // Set state-based endorsement policy
  await ctx.stub.setStateValidationParameter(
    batchId,
    Buffer.from(JSON.stringify(policy))
  );
  
  logger.info('Endorsement policy set', { batchId, requiredOrgs });
}
```

#### B. Attribute-Based Access Control (ABAC)

```typescript
@Transaction()
async CreateBatchWithABAC(ctx: Context, ...): Promise<string> {
  // Get user attributes from certificate
  const attrs = ctx.clientIdentity.getAttributeValue('role');
  const orgType = ctx.clientIdentity.getAttributeValue('orgType');
  
  // Check if user has required attributes
  if (orgType !== 'FARM') {
    throw new Error('Only farm organizations can create batches');
  }
  
  if (attrs !== 'producer' && attrs !== 'admin') {
    throw new Error('Insufficient privileges to create batch');
  }
  
  // Create batch...
}
```

---

### 3. **Audit Trail & Traceability** 📜

#### A. Complete History Tracking

```typescript
@Transaction(false)
async GetCompleteAuditTrail(
  ctx: Context,
  batchId: string
): Promise<string> {
  const history = await ctx.stub.getHistoryForKey(batchId);
  const auditTrail: any[] = [];
  
  let result = await history.next();
  while (!result.done) {
    const record = {
      txId: result.value.txId,
      timestamp: new Date(result.value.timestamp.seconds.low * 1000).toISOString(),
      isDelete: result.value.isDelete,
      value: result.value.value.toString(),
      // Additional metadata
      blockNumber: await this.getBlockNumber(ctx, result.value.txId),
      validationCode: await this.getValidationCode(ctx, result.value.txId)
    };
    auditTrail.push(record);
    result = await history.next();
  }
  
  await history.close();
  
  return JSON.stringify({
    batchId,
    totalTransactions: auditTrail.length,
    auditTrail
  });
}

// Get block number for transaction
private async getBlockNumber(ctx: Context, txId: string): Promise<number> {
  // Implementation to get block number from transaction ID
  return 0; // Placeholder
}
```

#### B. Tamper-Proof Logging

```typescript
// Store audit log with hash chain
@Transaction()
async LogAuditEvent(
  ctx: Context,
  eventType: string,
  resourceId: string,
  action: string,
  details: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  const actor = ctx.clientIdentity.getMSPID();
  
  // Get previous audit log hash
  const lastLogKey = 'AUDIT_LAST_HASH';
  const lastHashBytes = await ctx.stub.getState(lastLogKey);
  const previousHash = lastHashBytes.length > 0 
    ? lastHashBytes.toString() 
    : '0000000000000000000000000000000000000000000000000000000000000000';
  
  // Create audit log entry
  const logEntry = {
    eventType,
    resourceId,
    action,
    details,
    actor,
    timestamp,
    txId: ctx.stub.getTxID(),
    previousHash
  };
  
  // Calculate hash
  const currentHash = crypto.createHash('sha256')
    .update(JSON.stringify(logEntry))
    .digest('hex');
  
  logEntry['hash'] = currentHash;
  
  // Store audit log
  const logKey = `AUDIT_${timestamp}_${ctx.stub.getTxID()}`;
  await ctx.stub.putState(logKey, Buffer.from(JSON.stringify(logEntry)));
  
  // Update last hash
  await ctx.stub.putState(lastLogKey, Buffer.from(currentHash));
  
  // Emit event
  await ctx.stub.setEvent('AuditLogCreated', Buffer.from(JSON.stringify({
    logKey,
    hash: currentHash
  })));
}

// Verify audit log integrity
@Transaction(false)
async VerifyAuditLogIntegrity(ctx: Context): Promise<boolean> {
  const iterator = await ctx.stub.getStateByRange('AUDIT_', 'AUDIT_~');
  
  let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
  let result = await iterator.next();
  
  while (!result.done) {
    const log = JSON.parse(result.value.value.toString());
    
    // Verify previous hash matches
    if (log.previousHash !== previousHash) {
      logger.error('Audit log integrity violation', {
        logKey: result.value.key,
        expectedPreviousHash: previousHash,
        actualPreviousHash: log.previousHash
      });
      return false;
    }
    
    // Verify current hash
    const expectedHash = log.hash;
    delete log.hash;
    const actualHash = crypto.createHash('sha256')
      .update(JSON.stringify(log))
      .digest('hex');
    
    if (expectedHash !== actualHash) {
      logger.error('Audit log hash mismatch', {
        logKey: result.value.key,
        expectedHash,
        actualHash
      });
      return false;
    }
    
    previousHash = expectedHash;
    result = await iterator.next();
  }
  
  await iterator.close();
  return true;
}
```

---

### 4. **Performance & Scalability** ⚡

#### A. CouchDB Indexes (Mandatory for Production)

```json
// META-INF/statedb/couchdb/indexes/indexBatchByStatus.json
{
  "index": {
    "fields": ["status", "createdAt"]
  },
  "ddoc": "indexBatchByStatus",
  "name": "indexBatchByStatus",
  "type": "json"
}

// indexBatchByOwner.json
{
  "index": {
    "fields": ["currentOwner", "status", "teaType"]
  },
  "ddoc": "indexBatchByOwner",
  "name": "indexBatchByOwner",
  "type": "json"
}

// indexBatchByTeaType.json
{
  "index": {
    "fields": ["teaType", "qualityGrade", "createdAt"]
  },
  "ddoc": "indexBatchByTeaType",
  "name": "indexBatchByTeaType",
  "type": "json"
}

// indexBatchByCertification.json
{
  "index": {
    "fields": [
      "certifications[].certType",
      "certifications[].status",
      "certifications[].expiryDate"
    ]
  },
  "ddoc": "indexBatchByCertification",
  "name": "indexBatchByCertification",
  "type": "json"
}

// indexBatchByLocation.json
{
  "index": {
    "fields": ["currentLocation", "status"]
  },
  "ddoc": "indexBatchByLocation",
  "name": "indexBatchByLocation",
  "type": "json"
}
```

#### B. Pagination for Large Datasets

```typescript
@Transaction(false)
async QueryBatchesPaginated(
  ctx: Context,
  queryJSON: string,
  pageSize: number,
  bookmark: string
): Promise<string> {
  const query = JSON.parse(queryJSON);
  
  const { iterator, metadata } = await ctx.stub.getQueryResultWithPagination(
    JSON.stringify(query),
    pageSize,
    bookmark
  );
  
  const results: TeaBatch[] = [];
  let result = await iterator.next();
  
  while (!result.done) {
    const batch = JSON.parse(result.value.value.toString());
    results.push(batch);
    result = await iterator.next();
  }
  
  await iterator.close();
  
  return JSON.stringify({
    results,
    metadata: {
      recordsCount: metadata.fetchedRecordsCount,
      bookmark: metadata.bookmark
    }
  });
}
```

---

### 5. **Testing & Quality Assurance** 🧪

#### A. Unit Testing Framework

```typescript
// test/teatrace.test.ts
import { Context } from 'fabric-contract-api';
import { ChaincodeStub, ClientIdentity } from 'fabric-shim';
import { TeaTraceContract } from '../src/index';
import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

chai.use(sinonChai);
const expect = chai.expect;

describe('TeaTrace Chaincode - Enterprise Standards', () => {
  let contract: TeaTraceContract;
  let ctx: sinon.SinonStubbedInstance<Context>;
  let stub: sinon.SinonStubbedInstance<ChaincodeStub>;
  let clientIdentity: sinon.SinonStubbedInstance<ClientIdentity>;

  beforeEach(() => {
    contract = new TeaTraceContract();
    ctx = sinon.createStubInstance(Context);
    stub = sinon.createStubInstance(ChaincodeStub);
    clientIdentity = sinon.createStubInstance(ClientIdentity);
    
    ctx.stub = stub as any;
    ctx.clientIdentity = clientIdentity as any;
  });

  describe('Private Data Collections', () => {
    it('should store private price data', async () => {
      clientIdentity.getMSPID.returns('Farm1MSP');
      stub.getState.resolves(Buffer.from(JSON.stringify({
        batchId: 'BATCH-001',
        currentOwner: 'Farm1MSP'
      })));
      stub.putState.resolves();
      stub.putPrivateData.resolves();
      stub.setEvent.resolves();
      
      const result = await contract.TransferBatchWithPrice(
        ctx as any,
        'BATCH-001',
        'Processor1MSP',
        JSON.stringify({ transferType: 'PROCESSING', quantity: 100 }),
        JSON.stringify({ price: 5000, currency: 'USD' })
      );
      
      expect(stub.putPrivateData).to.have.been.calledWith('priceData');
      expect(stub.setEvent).to.have.been.calledWith('PrivateDataStored');
    });

    it('should reject unauthorized access to private data', async () => {
      clientIdentity.getMSPID.returns('UnauthorizedMSP');
      stub.getPrivateData.resolves(Buffer.from(''));
      
      await expect(
        contract.GetPrivatePrice(ctx as any, 'BATCH-001', 'key-001')
      ).to.be.rejectedWith('Private data not found or not authorized');
    });
  });

  describe('Endorsement Policies', () => {
    it('should set state-based endorsement policy', async () => {
      clientIdentity.getMSPID.returns('AdminMSP');
      stub.setStateValidationParameter.resolves();
      
      await contract.SetBatchEndorsementPolicy(
        ctx as any,
        'BATCH-001',
        ['Farm1MSP', 'Processor1MSP']
      );
      
      expect(stub.setStateValidationParameter).to.have.been.calledOnce;
    });
  });

  describe('Audit Trail', () => {
    it('should create tamper-proof audit log', async () => {
      clientIdentity.getMSPID.returns('Farm1MSP');
      stub.getState.resolves(Buffer.from('previoushash'));
      stub.putState.resolves();
      stub.setEvent.resolves();
      stub.getTxID.returns('tx-001');
      
      await contract.LogAuditEvent(
        ctx as any,
        'BATCH_CREATED',
        'BATCH-001',
        'CREATE',
        'Batch created successfully'
      );
      
      expect(stub.putState).to.have.been.calledTwice; // Log + Last hash
      expect(stub.setEvent).to.have.been.calledWith('AuditLogCreated');
    });

    it('should verify audit log integrity', async () => {
      // Mock audit logs
      const logs = [
        {
          key: 'AUDIT_1',
          value: Buffer.from(JSON.stringify({
            eventType: 'TEST',
            previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
            hash: 'hash1'
          }))
        }
      ];
      
      stub.getStateByRange.resolves({
        next: sinon.stub()
          .onFirstCall().resolves({ done: false, value: logs[0] })
          .onSecondCall().resolves({ done: true }),
        close: sinon.stub().resolves()
      } as any);
      
      const result = await contract.VerifyAuditLogIntegrity(ctx as any);
      expect(result).to.be.true;
    });
  });

  describe('Performance - Pagination', () => {
    it('should return paginated results', async () => {
      const mockResults = [
        { key: 'BATCH-001', value: Buffer.from(JSON.stringify({ batchId: 'BATCH-001' })) },
        { key: 'BATCH-002', value: Buffer.from(JSON.stringify({ batchId: 'BATCH-002' })) }
      ];
      
      stub.getQueryResultWithPagination.resolves({
        iterator: {
          next: sinon.stub()
            .onFirstCall().resolves({ done: false, value: mockResults[0] })
            .onSecondCall().resolves({ done: false, value: mockResults[1] })
            .onThirdCall().resolves({ done: true }),
          close: sinon.stub().resolves()
        },
        metadata: {
          fetchedRecordsCount: 2,
          bookmark: 'bookmark-001'
        }
      } as any);
      
      const result = await contract.QueryBatchesPaginated(
        ctx as any,
        JSON.stringify({ selector: { status: 'HARVESTED' } }),
        10,
        ''
      );
      
      const parsed = JSON.parse(result);
      expect(parsed.results).to.have.lengthOf(2);
      expect(parsed.metadata.bookmark).to.equal('bookmark-001');
    });
  });
});
```

**Test Coverage Requirements:**

```json
// package.json
{
  "scripts": {
    "test": "mocha --require ts-node/register test/**/*.test.ts",
    "test:coverage": "nyc npm test",
    "test:watch": "npm test -- --watch"
  },
  "nyc": {
    "extension": [".ts"],
    "exclude": ["**/*.test.ts", "test/**"],
    "reporter": ["html", "text", "lcov"],
    "all": true,
    "check-coverage": true,
    "lines": 80,
    "functions": 80,
    "branches": 75,
    "statements": 80
  }
}
```

---

### 6. **Monitoring & Observability** 📊

#### A. Prometheus Metrics

```typescript
// src/metrics.ts
import { Counter, Histogram, Gauge, register } from 'prom-client';

// Transaction metrics
export const chaincodeInvocations = new Counter({
  name: 'chaincode_invocations_total',
  help: 'Total number of chaincode invocations',
  labelNames: ['function', 'status', 'mspId']
});

export const chaincodeLatency = new Histogram({
  name: 'chaincode_latency_seconds',
  help: 'Chaincode invocation latency in seconds',
  labelNames: ['function'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

export const chaincodeErrors = new Counter({
  name: 'chaincode_errors_total',
  help: 'Total number of chaincode errors',
  labelNames: ['function', 'errorType']
});

// Business metrics
export const batchesCreated = new Counter({
  name: 'batches_created_total',
  help: 'Total number of batches created',
  labelNames: ['teaType', 'mspId']
});

export const batchesTransferred = new Counter({
  name: 'batches_transferred_total',
  help: 'Total number of batches transferred',
  labelNames: ['transferType', 'fromOrg', 'toOrg']
});

export const activeBatches = new Gauge({
  name: 'active_batches',
  help: 'Number of active batches by status',
  labelNames: ['status']
});

// Use in chaincode
@Transaction()
async CreateBatch(ctx: Context, ...): Promise<string> {
  const start = Date.now();
  const mspId = ctx.clientIdentity.getMSPID();
  
  try {
    // ... create batch logic
    
    // Record metrics
    chaincodeInvocations.inc({ function: 'CreateBatch', status: 'success', mspId });
    batchesCreated.inc({ teaType: batch.teaType, mspId });
    activeBatches.inc({ status: 'HARVESTED' });
    
    return JSON.stringify(batch);
  } catch (error) {
    chaincodeInvocations.inc({ function: 'CreateBatch', status: 'error', mspId });
    chaincodeErrors.inc({ function: 'CreateBatch', errorType: error.name });
    throw error;
  } finally {
    const duration = (Date.now() - start) / 1000;
    chaincodeLatency.observe({ function: 'CreateBatch' }, duration);
  }
}
```

#### B. Health Check Endpoint

```typescript
@Transaction(false)
async HealthCheck(ctx: Context): Promise<string> {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '0.0.3',
    checks: {
      ledger: await this.checkLedgerHealth(ctx),
      couchdb: await this.checkCouchDBHealth(ctx),
      endorsement: await this.checkEndorsementHealth(ctx)
    }
  };
  
  return JSON.stringify(health);
}

private async checkLedgerHealth(ctx: Context): Promise<any> {
  try {
    await ctx.stub.getState('HEALTH_CHECK');
    return { status: 'ok' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}
```

---

### 7. **Disaster Recovery & Business Continuity** 💾

#### A. Backup Strategy

```bash
#!/bin/bash
# scripts/backup-production.sh

BACKUP_DIR="/backup/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

echo "Starting backup at $(date)"

# 1. Backup Peer Ledger
echo "Backing up peer ledgers..."
for PEER in peer0.farm1 peer0.processor1 peer0.packager1; do
  docker exec $PEER tar czf - /var/hyperledger/production \
    > $BACKUP_DIR/${PEER}-ledger.tar.gz
  echo "  ✓ $PEER backed up"
done

# 2. Backup CouchDB
echo "Backing up CouchDB..."
docker exec couchdb curl -X POST http://admin:password@localhost:5984/_replicate \
  -H "Content-Type: application/json" \
  -d '{
    "source": "teatrace",
    "target": "teatrace_backup_'$(date +%Y%m%d_%H%M%S)'",
    "create_target": true
  }'

# 3. Backup PostgreSQL
echo "Backing up PostgreSQL..."
docker exec postgres pg_dump -U ibn -Fc ibn_db \
  > $BACKUP_DIR/postgres-backup.dump

# 4. Backup Chaincode
echo "Backing up chaincode..."
tar czf $BACKUP_DIR/chaincode-teatrace.tar.gz \
  chaincodes/teatrace/

# 5. Backup Configuration
echo "Backing up configuration..."
tar czf $BACKUP_DIR/network-config.tar.gz \
  network/crypto-config/ \
  network/channel-artifacts/ \
  network/docker-compose.yaml

# 6. Create backup manifest
cat > $BACKUP_DIR/manifest.json <<EOF
{
  "backupDate": "$(date -Iseconds)",
  "version": "0.0.3",
  "components": [
    "peer-ledgers",
    "couchdb",
    "postgresql",
    "chaincode",
    "network-config"
  ],
  "size": "$(du -sh $BACKUP_DIR | cut -f1)"
}
EOF

# 7. Upload to S3 (if configured)
if [ ! -z "$AWS_S3_BUCKET" ]; then
  echo "Uploading to S3..."
  aws s3 sync $BACKUP_DIR s3://$AWS_S3_BUCKET/backups/$(basename $BACKUP_DIR)/
  echo "  ✓ Uploaded to S3"
fi

# 8. Cleanup old backups (keep last 7 days)
find /backup -type d -mtime +7 -exec rm -rf {} \;

echo "Backup completed at $(date)"
echo "Backup location: $BACKUP_DIR"
```

#### B. Restore Procedure

```bash
#!/bin/bash
# scripts/restore-production.sh

BACKUP_DIR=$1

if [ -z "$BACKUP_DIR" ]; then
  echo "Usage: $0 <backup_directory>"
  exit 1
fi

echo "Starting restore from $BACKUP_DIR at $(date)"

# 1. Stop network
echo "Stopping network..."
docker-compose down

# 2. Restore peer ledgers
echo "Restoring peer ledgers..."
for PEER in peer0.farm1 peer0.processor1 peer0.packager1; do
  docker volume rm ${PEER}_data
  docker volume create ${PEER}_data
  docker run --rm \
    -v ${PEER}_data:/data \
    -v $BACKUP_DIR:/backup \
    alpine tar xzf /backup/${PEER}-ledger.tar.gz -C /data
  echo "  ✓ $PEER restored"
done

# 3. Restore CouchDB
echo "Restoring CouchDB..."
# Implementation...

# 4. Restore PostgreSQL
echo "Restoring PostgreSQL..."
docker exec postgres pg_restore -U ibn -d ibn_db \
  < $BACKUP_DIR/postgres-backup.dump

# 5. Start network
echo "Starting network..."
docker-compose up -d

# 6. Verify restoration
echo "Verifying restoration..."
sleep 30
./scripts/verify-network-health.sh

echo "Restore completed at $(date)"
```

---

### 8. **Compliance & Regulatory** 📋

#### A. GDPR Compliance - Right to be Forgotten

```typescript
@Transaction()
async RedactPersonalData(
  ctx: Context,
  batchId: string,
  reason: string,
  approvalSignature: string
): Promise<void> {
  // Only admin with proper approval can redact
  const mspId = ctx.clientIdentity.getMSPID();
  if (mspId !== 'AdminMSP') {
    throw new Error('Only admin can redact personal data');
  }
  
  // Verify approval signature
  const isValid = await this.verifyApprovalSignature(ctx, approvalSignature);
  if (!isValid) {
    throw new Error('Invalid approval signature');
  }
  
  const batch = await this._getBatch(ctx, batchId);
  
  // Store original hash before redaction
  const originalHash = crypto.createHash('sha256')
    .update(JSON.stringify(batch))
    .digest('hex');
  
  // Redact personal information
  batch.farmName = '[REDACTED]';
  batch.farmLocation = '[REDACTED]';
  
  // Add redaction metadata
  batch.redactionInfo = {
    redactedAt: new Date().toISOString(),
    redactedBy: mspId,
    reason,
    originalHash,
    approvalSignature
  };
  
  // Update batch
  await ctx.stub.putState(batchId, Buffer.from(JSON.stringify(batch)));
  
  // Log audit event
  await this.LogAuditEvent(
    ctx,
    'PERSONAL_DATA_REDACTED',
    batchId,
    'REDACT',
    `Personal data redacted. Reason: ${reason}`
  );
  
  // Emit event
  await ctx.stub.setEvent('PersonalDataRedacted', Buffer.from(JSON.stringify({
    batchId,
    timestamp: new Date().toISOString()
  })));
}
```

#### B. Data Retention Policy

```typescript
@Transaction()
async ApplyDataRetentionPolicy(ctx: Context): Promise<string> {
  // Only admin can apply retention policy
  const mspId = ctx.clientIdentity.getMSPID();
  if (mspId !== 'AdminMSP') {
    throw new Error('Only admin can apply retention policy');
  }
  
  const retentionPeriodDays = 2555; // 7 years
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionPeriodDays);
  
  // Query old batches
  const query = {
    selector: {
      createdAt: {
        $lt: cutoffDate.toISOString()
      },
      status: 'CONSUMED'
    }
  };
  
  const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
  const archivedBatches: string[] = [];
  
  let result = await iterator.next();
  while (!result.done) {
    const batch = JSON.parse(result.value.value.toString());
    
    // Archive to private data collection
    await ctx.stub.putPrivateData(
      'archivedData',
      batch.batchId,
      Buffer.from(JSON.stringify(batch))
    );
    
    // Remove from main ledger (mark as archived)
    batch.archived = true;
    batch.archivedAt = new Date().toISOString();
    await ctx.stub.putState(batch.batchId, Buffer.from(JSON.stringify(batch)));
    
    archivedBatches.push(batch.batchId);
    result = await iterator.next();
  }
  
  await iterator.close();
  
  return JSON.stringify({
    archivedCount: archivedBatches.length,
    batches: archivedBatches
  });
}
```

---

## ✅ Compliance Checklist

### ISO/TC 307 Standards
- [ ] Data privacy protection implemented
- [ ] Access control mechanisms in place
- [ ] Audit trail complete and tamper-proof
- [ ] Interoperability standards followed
- [ ] Smart contract security verified

### NIST Blockchain Standards
- [ ] Cryptographic standards compliant
- [ ] Key management procedures documented
- [ ] Consensus mechanism documented
- [ ] Incident response plan in place
- [ ] Security controls implemented

### Hyperledger Best Practices
- [ ] Private data collections configured
- [ ] Endorsement policies defined
- [ ] CouchDB indexes created
- [ ] Monitoring and logging enabled
- [ ] Backup and recovery tested

### GDPR Compliance
- [ ] Right to be forgotten implemented
- [ ] Data retention policy defined
- [ ] Personal data encryption
- [ ] Consent management
- [ ] Data breach notification procedure

### SOC 2 Type II
- [ ] Security controls documented
- [ ] Access logs maintained
- [ ] Change management process
- [ ] Incident response tested
- [ ] Third-party audit completed

---

**Next:** [Implementation Guide](./13-Enterprise-Implementation-Guide.md)
