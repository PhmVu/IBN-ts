# 🌉 Phase 5: Gateway SDK Integration with Wallet

**Version:** v0.0.2 REVISED  
**Timeline:** 3 days  
**Difficulty:** ⭐⭐⭐⭐ Expert  
**Prerequisites:** Phases 1-3 completed, Fabric network running

---

## 🎯 **WHAT YOU'LL BUILD**

In this phase, you'll integrate wallet-based identities with Fabric Gateway for transaction signing:

- ✅ Load user identity from wallet (not shared admin cert)
- ✅ Sign transactions with user's private key
- ✅ Submit transactions with user's certificate
- ✅ Check certificate revocation before invoke
- ✅ Enable non-repudiation (each user signs their own transactions)

**Starting Point:** Gateway using shared Admin certificate  
**Ending Point:** Gateway using wallet-based user identities

---

## 📋 **PREREQUISITES**

### **1. Phases 1-3 Must Be Complete**

```bash
# Verify WalletService exists
ls -la backend-ts/src/services/wallet/WalletService.ts

# Verify FabricCAService exists
ls -la backend-ts/src/services/fabric/FabricCAService.ts

# Verify users have wallets
docker exec -it ibnts-postgres psql -U ibn_user -d ibn_db -c "SELECT username, wallet_id, enrolled FROM users LIMIT 5;"
```

### **2. Fabric Network Must Be Running**

```bash
# Check if peers are running
docker ps | grep peer

# Expected: peer0.org1.example.com, peer0.org2.example.com
```

### **3. Check Gateway Service**

```bash
# Check if gateway service exists
ls -la gateway-ts/src/services/FabricGatewayService.ts

# This file will be UPDATED in this phase
```

---

## 🔍 **CURRENT STATE CHECK**

```bash
# Check current gateway implementation
grep -r "Admin" gateway-ts/src/services/

# You'll see references to Admin cert - we'll change to user wallet
```

---

## � **IMPLEMENTATION STEPS**

### **Step 1: Update Gateway Service**

**File:** `gateway-ts/src/services/FabricGatewayService.ts` (MAJOR UPDATE)

```typescript
import { Gateway, Contract, Network } from 'fabric-network';
import { Wallets, X509Identity } from 'fabric-network';
import { walletService } from '../../../backend-ts/src/services/wallet/WalletService';
import { fabricCAService } from '../../../backend-ts/src/services/fabric/FabricCAService';
import { db } from '../../../backend-ts/src/config/knex';
import logger from '../core/logger';
import path from 'path';
import fs from 'fs/promises';

export interface TransactionRequest {
  channel: string;
  chaincode: string;
  function: string;
  args: string[];
  walletId: string;  // ⭐ USER'S WALLET ID (not admin)
  transient?: Record<string, Buffer>;
}

export interface TransactionResponse {
  success: boolean;
  txId?: string;
  result?: any;
  error?: string;
}

/**
 * Fabric Gateway Service
 * Handles chaincode queries and invocations using wallet-based identities
 * 
 * IMPORTANT: Each user signs their own transactions with their private key
 */
export class FabricGatewayService {
  private connectionProfile: any;
  
  constructor() {
    this.loadConnectionProfile();
  }
  
  /**
   * Load connection profile
   */
  private async loadConnectionProfile(): Promise<void> {
    try {
      const profilePath = path.resolve(__dirname, '../../config/connection-profile.json');
      const profileData = await fs.readFile(profilePath, 'utf8');
      this.connectionProfile = JSON.parse(profileData);
      
      logger.info('Connection profile loaded', {
        organizations: Object.keys(this.connectionProfile.organizations || {})
      });
    } catch (error: any) {
      logger.error('Failed to load connection profile', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Query chaincode (read-only)
   * 
   * @param request - Transaction request with user's wallet ID
   * @returns Query result
   * 
   * @example
   * const result = await fabricGatewayService.queryChaincode({
   *   channel: 'supply-chain',
   *   chaincode: 'TeaTrace',
   *   function: 'GetBatch',
   *   args: ['BATCH-001'],
   *   walletId: 'john@org1'  // ⭐ User's wallet
   * });
   */
  async queryChaincode(request: TransactionRequest): Promise<TransactionResponse> {
    let gateway: Gateway | null = null;
    
    try {
      logger.info('Querying chaincode', {
        channel: request.channel,
        chaincode: request.chaincode,
        function: request.function,
        walletId: request.walletId
      });
      
      // 1. Load user identity from wallet
      const identity = await walletService.get(request.walletId);
      
      if (!identity) {
        throw new Error(`Identity not found: ${request.walletId}`);
      }
      
      logger.debug('User identity loaded from wallet', {
        walletId: request.walletId,
        mspId: identity.mspId
      });
      
      // 2. Create in-memory wallet with user's identity
      const wallet = await Wallets.newInMemoryWallet();
      
      const x509Identity: X509Identity = {
        credentials: {
          certificate: identity.certificate,
          privateKey: identity.privateKey
        },
        mspId: identity.mspId,
        type: 'X.509'
      };
      
      await wallet.put(request.walletId, x509Identity);
      
      // 3. Connect to gateway with user's identity
      gateway = new Gateway();
      
      await gateway.connect(this.connectionProfile, {
        wallet,
        identity: request.walletId,
        discovery: {
          enabled: true,
          asLocalhost: process.env.NODE_ENV === 'development'
        }
      });
      
      logger.debug('Gateway connected', {
        walletId: request.walletId,
        mspId: identity.mspId
      });
      
      // 4. Get network and contract
      const network: Network = await gateway.getNetwork(request.channel);
      const contract: Contract = network.getContract(request.chaincode);
      
      // 5. Evaluate transaction (query - no state change)
      const result = await contract.evaluateTransaction(
        request.function,
        ...request.args
      );
      
      logger.info('Chaincode query successful', {
        channel: request.channel,
        chaincode: request.chaincode,
        function: request.function,
        walletId: request.walletId,
        resultLength: result.length
      });
      
      return {
        success: true,
        result: result.toString()
      };
    } catch (error: any) {
      logger.error('Chaincode query failed', {
        channel: request.channel,
        chaincode: request.chaincode,
        function: request.function,
        walletId: request.walletId,
        error: error.message
      });
      
      return {
        success: false,
        error: error.message
      };
    } finally {
      if (gateway) {
        gateway.disconnect();
      }
    }
  }
  
  /**
   * Invoke chaincode (write transaction)
   * 
   * ⭐ CRITICAL: Transaction is signed with USER's private key
   * This enables non-repudiation and proper audit trail
   * 
   * @param request - Transaction request with user's wallet ID
   * @returns Transaction result with TX ID
   * 
   * @example
   * const result = await fabricGatewayService.invokeChaincode({
   *   channel: 'supply-chain',
   *   chaincode: 'TeaTrace',
   *   function: 'CreateBatch',
   *   args: ['BATCH-002', 'Green Tea', '1000', 'kg'],
   *   walletId: 'john@org1'  // ⭐ User's wallet
   * });
   */
  async invokeChaincode(request: TransactionRequest): Promise<TransactionResponse> {
    let gateway: Gateway | null = null;
    
    try {
      logger.info('Invoking chaincode', {
        channel: request.channel,
        chaincode: request.chaincode,
        function: request.function,
        walletId: request.walletId
      });
      
      // 1. Load user identity from wallet
      const identity = await walletService.get(request.walletId);
      
      if (!identity) {
        throw new Error(`Identity not found: ${request.walletId}`);
      }
      
      // 2. Check if certificate is revoked
      const user = await db('users')
        .where({ wallet_id: request.walletId })
        .first();
      
      if (user?.certificate_serial) {
        const isRevoked = await fabricCAService.isCertificateRevoked(
          user.certificate_serial
        );
        
        if (isRevoked) {
          const details = await fabricCAService.getRevocationDetails(
            user.certificate_serial
          );
          
          throw new Error(
            `Certificate has been revoked. Reason: ${details?.reason || 'Unknown'}`
          );
        }
      }
      
      logger.debug('Certificate revocation check passed', {
        walletId: request.walletId
      });
      
      // 3. Create in-memory wallet with user's identity
      const wallet = await Wallets.newInMemoryWallet();
      
      const x509Identity: X509Identity = {
        credentials: {
          certificate: identity.certificate,
          privateKey: identity.privateKey
        },
        mspId: identity.mspId,
        type: 'X.509'
      };
      
      await wallet.put(request.walletId, x509Identity);
      
      // 4. Connect to gateway with user's identity
      gateway = new Gateway();
      
      await gateway.connect(this.connectionProfile, {
        wallet,
        identity: request.walletId,
        discovery: {
          enabled: true,
          asLocalhost: process.env.NODE_ENV === 'development'
        }
      });
      
      logger.debug('Gateway connected for invoke', {
        walletId: request.walletId,
        mspId: identity.mspId
      });
      
      // 5. Get network and contract
      const network: Network = await gateway.getNetwork(request.channel);
      const contract: Contract = network.getContract(request.chaincode);
      
      // 6. Submit transaction
      // ⭐ CRITICAL: Transaction will be signed with USER's private key
      // This ensures non-repudiation and proper audit trail
      const result = await contract.submitTransaction(
        request.function,
        ...request.args
      );
      
      // Get transaction ID from the contract
      // Note: In newer versions, use contract.getTransactionId()
      const txId = (contract as any).getTransactionId?.() || 'unknown';
      
      logger.info('Chaincode invocation successful', {
        channel: request.channel,
        chaincode: request.chaincode,
        function: request.function,
        txId,
        walletId: request.walletId,
        mspId: identity.mspId
      });
      
      return {
        success: true,
        txId,
        result: result.toString()
      };
    } catch (error: any) {
      logger.error('Chaincode invocation failed', {
        channel: request.channel,
        chaincode: request.chaincode,
        function: request.function,
        walletId: request.walletId,
        error: error.message,
        stack: error.stack
      });
      
      return {
        success: false,
        error: error.message
      };
    } finally {
      if (gateway) {
        gateway.disconnect();
      }
    }
  }
  
  /**
   * Get transaction by ID
   * 
   * @param channel - Channel name
   * @param txId - Transaction ID
   * @param walletId - Wallet ID
   * @returns Transaction details
   */
  async getTransaction(
    channel: string,
    txId: string,
    walletId: string
  ): Promise<any> {
    let gateway: Gateway | null = null;
    
    try {
      const identity = await walletService.get(walletId);
      
      if (!identity) {
        throw new Error(`Identity not found: ${walletId}`);
      }
      
      const wallet = await Wallets.newInMemoryWallet();
      await wallet.put(walletId, {
        credentials: {
          certificate: identity.certificate,
          privateKey: identity.privateKey
        },
        mspId: identity.mspId,
        type: 'X.509'
      });
      
      gateway = new Gateway();
      await gateway.connect(this.connectionProfile, {
        wallet,
        identity: walletId,
        discovery: { enabled: true }
      });
      
      const network = await gateway.getNetwork(channel);
      
      // Use QSCC (Query System Chaincode) to get transaction
      const transaction = await network
        .getContract('qscc')
        .evaluateTransaction('GetTransactionByID', channel, txId);
      
      return JSON.parse(transaction.toString());
    } catch (error: any) {
      logger.error('Failed to get transaction', {
        channel,
        txId,
        error: error.message
      });
      throw error;
    } finally {
      if (gateway) {
        gateway.disconnect();
      }
    }
  }
  
  /**
   * Get block by number
   * 
   * @param channel - Channel name
   * @param blockNumber - Block number
   * @param walletId - Wallet ID
   * @returns Block details
   */
  async getBlock(
    channel: string,
    blockNumber: number,
    walletId: string
  ): Promise<any> {
    let gateway: Gateway | null = null;
    
    try {
      const identity = await walletService.get(walletId);
      
      if (!identity) {
        throw new Error(`Identity not found: ${walletId}`);
      }
      
      const wallet = await Wallets.newInMemoryWallet();
      await wallet.put(walletId, {
        credentials: {
          certificate: identity.certificate,
          privateKey: identity.privateKey
        },
        mspId: identity.mspId,
        type: 'X.509'
      });
      
      gateway = new Gateway();
      await gateway.connect(this.connectionProfile, {
        wallet,
        identity: walletId,
        discovery: { enabled: true }
      });
      
      const network = await gateway.getNetwork(channel);
      
      // Use QSCC to get block
      const block = await network
        .getContract('qscc')
        .evaluateTransaction('GetBlockByNumber', channel, blockNumber.toString());
      
      return JSON.parse(block.toString());
    } catch (error: any) {
      logger.error('Failed to get block', {
        channel,
        blockNumber,
        error: error.message
      });
      throw error;
    } finally {
      if (gateway) {
        gateway.disconnect();
      }
    }
  }
}

// Singleton instance
export const fabricGatewayService = new FabricGatewayService();
```

---

### **Step 2: Update Backend Chaincode Routes**

**File:** `backend-ts/src/routes/chaincode.ts` (UPDATE)

```typescript
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { fabricGatewayService } from '../../../gateway-ts/src/services/FabricGatewayService';
import logger from '../core/logger';

const router = Router();

/**
 * Query chaincode
 * GET /api/v1/chaincode/query
 */
router.post('/chaincode/query', authMiddleware, async (req, res) => {
  try {
    const { channel, chaincode, function: fn, args } = req.body;
    const walletId = req.user.wallet_id;
    
    // Check if user is enrolled
    if (!walletId) {
      return res.status(400).json({
        success: false,
        error: 'User not enrolled. Please contact administrator to complete enrollment.'
      });
    }
    
    const result = await fabricGatewayService.queryChaincode({
      channel,
      chaincode,
      function: fn,
      args,
      walletId  // ⭐ Use user's wallet (not admin)
    });
    
    res.json(result);
  } catch (error: any) {
    logger.error('Query chaincode failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Invoke chaincode
 * POST /api/v1/chaincode/invoke
 */
router.post('/chaincode/invoke', authMiddleware, async (req, res) => {
  try {
    const { channel, chaincode, function: fn, args } = req.body;
    const walletId = req.user.wallet_id;
    
    // Check if user is enrolled
    if (!walletId) {
      return res.status(400).json({
        success: false,
        error: 'User not enrolled. Please contact administrator to complete enrollment.'
      });
    }
    
    const result = await fabricGatewayService.invokeChaincode({
      channel,
      chaincode,
      function: fn,
      args,
      walletId  // ⭐ Use user's wallet (not admin)
    });
    
    res.json(result);
  } catch (error: any) {
    logger.error('Invoke chaincode failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get transaction by ID
 * GET /api/v1/chaincode/transaction/:txId
 */
router.get('/chaincode/transaction/:txId', authMiddleware, async (req, res) => {
  try {
    const { txId } = req.params;
    const { channel } = req.query;
    const walletId = req.user.wallet_id;
    
    if (!walletId) {
      return res.status(400).json({
        success: false,
        error: 'User not enrolled'
      });
    }
    
    const transaction = await fabricGatewayService.getTransaction(
      channel as string,
      txId,
      walletId
    );
    
    res.json({
      success: true,
      data: transaction
    });
  } catch (error: any) {
    logger.error('Get transaction failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
```

---

## ✅ **VERIFICATION CHECKLIST**

### **1. Verify User Has Wallet**

```sql
-- Check user enrollment
SELECT username, wallet_id, enrolled, certificate_serial 
FROM users 
WHERE username = 'testuser';

-- Should show wallet_id and enrolled = true
```

### **2. Test Query Operation**

```bash
# Query chaincode
curl -X POST http://localhost:3000/api/v1/chaincode/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user_token>" \
  -d '{
    "channel": "supply-chain",
    "chaincode": "TeaTrace",
    "function": "GetAllBatches",
    "args": []
  }'

# Should return batches
```

### **3. Test Invoke Operation**

```bash
# Invoke chaincode
curl -X POST http://localhost:3000/api/v1/chaincode/invoke \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user_token>" \
  -d '{
    "channel": "supply-chain",
    "chaincode": "TeaTrace",
    "function": "CreateBatch",
    "args": ["BATCH-TEST", "Green Tea", "1000", "kg"]
  }'

# Should return success with txId
```

### **4. Verify Transaction Signature**

```bash
# Get transaction details
curl http://localhost:3000/api/v1/chaincode/transaction/<txId>?channel=supply-chain \
  -H "Authorization: Bearer <user_token>"

# Check creator field - should show user's certificate, not admin
```

---

## 🧪 **TESTING**

### **Test 1: Non-Enrolled User**

```bash
# Try to invoke with non-enrolled user
# Should fail with "User not enrolled" error
```

### **Test 2: Revoked Certificate**

```typescript
// Revoke user certificate
await fabricCAService.revokeCertificate(
  'certificate_serial',
  'test_revocation',
  'admin_id'
);

// Try to invoke - should fail with "Certificate has been revoked"
```

### **Test 3: Multiple Users**

```bash
# User 1 creates batch
curl -X POST .../invoke -H "Authorization: Bearer <user1_token>" -d '{"function": "CreateBatch", ...}'

# User 2 creates batch
curl -X POST .../invoke -H "Authorization: Bearer <user2_token>" -d '{"function": "CreateBatch", ...}'

# Check blockchain - each transaction should have different creator
```

---

## 🔧 **TROUBLESHOOTING**

### **Issue 1: "Identity not found"**

**Cause:** User not enrolled

**Solution:**
```bash
# Check user enrollment
SELECT username, enrolled, wallet_id FROM users WHERE username = 'testuser';

# If not enrolled, create user again (will auto-enroll)
```

### **Issue 2: "Certificate has been revoked"**

**Cause:** Certificate was revoked

**Solution:**
```bash
# Re-enroll user
npm run reenroll-user -- testuser
```

### **Issue 3: "Failed to connect to gateway"**

**Cause:** Fabric network not running

**Solution:**
```bash
cd network
./network.sh up
```

---

## 📊 **WHAT YOU'VE ACCOMPLISHED**

✅ **Wallet-based signing** - Each user signs with their own key  
✅ **Non-repudiation** - Transactions traceable to actual users  
✅ **Certificate revocation** - Revoked certs blocked  
✅ **Proper audit trail** - Blockchain shows real user identities  
✅ **No shared certificates** - Each user has unique identity  

---

## 🎉 **CRITICAL ACHIEVEMENT**

**Before Phase 5:**
```
User → Backend → Gateway → Admin signs transaction → Fabric
                            ❌ All transactions signed by Admin
                            ❌ Cannot identify actual user
```

**After Phase 5:**
```
User → Backend → Gateway → USER signs transaction → Fabric
                            ✅ Transaction signed by actual user
                            ✅ Non-repudiation achieved
                            ✅ Proper audit trail
```

---

## 🚀 **NEXT STEPS**

**Phase 6:** Frontend UI Updates

**Estimated time:** 2 days

---

**Phase 5 Complete!** ✅

**Next:** [Phase 6 - Frontend UI](./6-Frontend-Permission-UI.md)
