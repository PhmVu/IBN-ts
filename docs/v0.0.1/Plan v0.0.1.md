# IBNwts Platform Development Plan v0.0.1

**Version:** v0.0.1  
**Date:** December 10, 2025  
**Purpose:** Core platform infrastructure development - Building a Blockchain Platform as a Service (BPaaS) using TypeScript/Node.js stack with Hyperledger Fabric.

---

## 📋 Overview

**IBNwts v0.0.1** establishes the **core platform infrastructure** that enables organizations from ANY industry to leverage blockchain technology without managing infrastructure.

### Platform Objectives

- ✅ Build **managed Hyperledger Fabric network** for multi-tenant use
- ✅ Develop **Gateway API** for multi-org chaincode routing (TypeScript/Express)
- ✅ Create **Backend API** for platform management (TypeScript/Express)
- ✅ Build **Management Dashboard** for platform administration (React/TypeScript)
- ✅ Implement **RBAC system** for user and organization management
- ✅ Provide **example chaincodes** (TeaTrace) to demonstrate capabilities
- ✅ Enable **extensibility** - organizations can deploy custom chaincodes
- ✅ Standardize API contracts, error handling, logging, validation
- ✅ Support async operations, tracing, monitoring across platform

---

## 🏗️ Kiến Trúc Hệ Thống

### High-Level Architecture

```
┌──────────────────┐     HTTPS + JWT     ┌──────────────────┐
│   Frontend       │                      │   Backend API    │
│   (Port 3001)    │───────────────────▶│   (Port 9002)    │
│   (React/TS)     │◀───────────────────│   (Express/TS)   │
└──────────────────┘                      └──────────────────┘
                                                  │
                                                  │ HTTPS + Cert
                                                  ▼
                                          ┌──────────────────┐
                                          │   Gateway API    │
                                          │   (Port 9001)    │
                                          │   (Express/TS)   │
                                          └──────────────────┘
                                                  │
                                                  │ gRPC/TLS + Cert
                                                  ▼
                                    ┌──────────────────────────┐
                                    │   Fabric Network         │
                                    │   - Peer (Go)            │
                                    │   - Orderer (Go)         │
                                    │   - Chaincode (Go)       │
                                    └──────────────────────────┘
```

### Component Layers

| Layer | Component | Technology | Port | Protocol | Ghi chú |
|-------|-----------|------------|------|----------|---------|
| **Layer 1** | Frontend | React/TypeScript (Vite) | 3000 | HTTP/HTTPS | Web UI |
| **Layer 2** | Backend API | Express/NestJS (TypeScript) | 8002 | HTTP/HTTPS | Business Logic |
| **Layer 3** | Gateway API | Express/Fastify (TypeScript) | 8001 | HTTP/HTTPS | Forward-only |
| **Layer 4** | Fabric Network | Go (Chaincode) | 7050/7051 | gRPC/TLS | Blockchain Network |

---

## 📁 Cấu Trúc Dự Án

```
IBN/
├── frontend/                    # Frontend React/TypeScript (Vite)
│   ├── src/
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend-ts/                  # Backend API TypeScript/Node.js (NEW)
│   ├── src/
│   │   ├── index.ts             # Entry point
│   │   ├── app.ts               # Express/NestJS app setup
│   │   ├── config/              # Configuration
│   │   ├── core/                # Logger, errors, types
│   │   ├── middleware/          # Auth, logging, validation
│   │   ├── models/              # Data models
│   │   ├── services/            # Business logic
│   │   │   ├── auth/            # Authentication
│   │   │   ├── blockchain/      # Blockchain integration
│   │   │   ├── user/            # User management
│   │   │   └── gateway/         # Gateway client
│   │   ├── routes/              # API routes
│   │   └── utils/               # Helpers
│   ├── tests/
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── .env.example
│
├── gateway-ts/                  # Gateway API TypeScript/Node.js (NEW)
│   ├── src/
│   │   ├── index.ts
│   │   ├── app.ts
│   │   ├── config/
│   │   ├── core/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── services/
│   │   │   ├── fabric/          # Fabric integration
│   │   │   ├── certificate/     # Certificate management
│   │   │   └── parser/
│   │   ├── routes/
│   │   └── utils/
│   ├── tests/
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── .env.example
│
├── network/                     # Fabric Network (unchanged)
│   ├── configtx.yaml
│   ├── crypto-config.yaml
│   ├── docker-compose.yaml
│   └── ...
│
├── chaincodes/                  # Go Chaincode (unchanged)
│   ├── teatrace/
│   └── ...
│
└── docs/                        # Documentation
```

---

## 📦 Unified Dependencies Stack

### Gateway API Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "@hyperledger/fabric-gateway": "^1.4.0",
    "@grpc/grpc-js": "^1.9.0",
    "dotenv": "^16.3.1",
    "winston": "^3.11.0",
    "zod": "^3.22.4",
    "node-forge": "^1.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.3",
    "ts-node": "^10.9.2",
    "nodemon": "^3.0.2",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "supertest": "^6.3.3",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.17.0",
    "prettier": "^3.1.1"
  }
}
```

### Backend API Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.6.0",
    "dotenv": "^16.3.1",
    "winston": "^3.11.0",
    "zod": "^3.22.4",
    "pg": "^8.11.3",
    "jsonwebtoken": "^9.1.2",
    "bcryptjs": "^2.4.3"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "@types/jsonwebtoken": "^9.0.7",
    "typescript": "^5.3.3",
    "ts-node": "^10.9.2",
    "nodemon": "^3.0.2",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "supertest": "^6.3.3",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.17.0",
    "prettier": "^3.1.1"
  }
}
```

### Frontend Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0",
    "react-router-dom": "^6.20.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "vite": "^5.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.17.0",
    "prettier": "^3.1.1"
  }
}
```

---

## 🔌 API Endpoints

### 1. Main Endpoint: `/api/v1/chaincode/forward`

**Method:** `POST`  
**Description:** Forward chaincode operations từ Backend lên Fabric Network

**Request Body:**
```typescript
interface ChaincodeForwardRequest {
  chaincode: string;           // Tên chaincode (ví dụ: "teatrace")
  command: "query" | "invoke" | "read" | "write" | "update" | "delete";
  cert: string;                // Certificate Base64 encoded
  msp_id?: string;             // MSP ID (optional hint)
  private_key?: string;         // Private key Base64 (required cho invoke)
  public_read?: boolean;       // Flag cho public read queries
  org_domain?: string;         // Org domain cho public read
  args: {
    channel: string;           // Channel name
    function: string;          // Chaincode function name
    params?: string[];         // Function parameters
  };
}
```

**Response:**
```typescript
interface ChaincodeResponse {
  success: boolean;
  data: any | null;
  txId: string | null;
  error: string | null;
}
```

### 2. Legacy Endpoints (Backward Compatibility)

- `POST /api/v1/chaincode/query` - Legacy query endpoint
- `POST /api/v1/chaincode/invoke` - Legacy invoke endpoint

### 3. Health Check

- `GET /api/v1/health` - Health check endpoint

### 4. Channel Info

- `GET /api/v1/channels/{channel}/info` - Lấy thông tin channel

---

## 🔧 Core Services

### 1. FabricGatewayService

**File:** `src/services/fabric/FabricGatewayService.ts`

**Responsibilities:**
- Select identity từ org_context
- Query chaincode (read-only)
- Invoke chaincode (read-write)
- Error handling và retry logic
- Fallback giữa gRPC SDK và Docker executor

**Key Methods:**
```typescript
class FabricGatewayService {
  static selectIdentity(
    orgContext: OrgContext,
    requirePrivateKey?: boolean
  ): Promise<FabricIdentity | null>;

  async queryChaincode(
    channel: string,
    chaincode: string,
    functionName: string,
    args: string[],
    identity: FabricIdentity
  ): Promise<ChaincodeResponse>;

  async invokeChaincode(
    channel: string,
    chaincode: string,
    functionName: string,
    args: string[],
    identity: FabricIdentity
  ): Promise<ChaincodeResponse>;
}
```

### 2. FabricIdentity

**File:** `src/services/fabric/FabricIdentity.ts`

**Responsibilities:**
- Wrap certificate và private key
- Tạo Identity object cho Fabric Gateway SDK

```typescript
class FabricIdentity {
  mspId: string;
  certificate: Buffer;        // Decoded certificate bytes
  privateKey?: Buffer;        // Decoded private key bytes (optional)

  constructor(
    mspId: string,
    certificate: Buffer,
    privateKey?: Buffer
  );
}
```

### 3. GrpcGatewayClient

**File:** `src/services/fabric/GrpcGatewayClient.ts`

**Responsibilities:**
- Tích hợp với Fabric Gateway SDK
- Tạo gRPC connection
- Build và submit proposals
- Handle gRPC errors

```typescript
class GrpcGatewayClient {
  private client: Client;
  private gateway: Gateway;

  async connect(endpoint: string, tlsCert?: Buffer): Promise<void>;
  async queryChaincode(...): Promise<any>;
  async invokeChaincode(...): Promise<string>; // Returns txId
  disconnect(): Promise<void>;
}
```

### 4. CertificateManager

**File:** `src/services/certificate/CertificateManager.ts`

**Responsibilities:**
- Decode Base64 certificate
- Parse PEM certificate
- Validate certificate format
- Load certificate từ file system (cho public read queries)

```typescript
class CertificateManager {
  static decodeBase64Certificate(certB64: string): Buffer;
  static parsePemCertificate(certBytes: Buffer): X509Certificate;
  static loadCertificateFromFile(orgDomain: string, user: string): Promise<Buffer>;
  static loadPrivateKeyFromFile(orgDomain: string, user: string): Promise<Buffer>;
}
```

### 5. DockerExecutor (Fallback)

**File:** `src/services/fabric/DockerExecutor.ts`

**Responsibilities:**
- Fallback khi gRPC SDK fails
- Execute peer CLI commands qua Docker
- Parse CLI output

```typescript
class DockerExecutor {
  async executePeerChaincodeQuery(...): Promise<any>;
  async executePeerChaincodeInvoke(...): Promise<string>;
}
```

---

## ⚙️ Configuration

### Environment Variables

**File:** `src/config/env.ts`

```typescript
export const config = {
  port: process.env.PORT || 8001,
  host: process.env.HOST || "0.0.0.0",
  
  // Fabric Network
  gatewayPeerEndpoint: process.env.GATEWAY_PEER_ENDPOINT || "peer0.ibn.ictu.edu.vn:7051",
  gatewayOrdererEndpoint: process.env.GATEWAY_ORDERER_ENDPOINT || "orderer.ibn.ictu.edu.vn:7050",
  mspId: process.env.MSP_ID || "IBNMSP",
  
  // TLS
  tlsEnabled: process.env.TLS_ENABLED === "true",
  tlsCertPath: process.env.TLS_CERT_PATH,
  
  // Crypto Config
  cryptoConfigPath: process.env.CRYPTO_CONFIG_PATH || "/network/crypto-config",
  
  // Logging
  logLevel: process.env.LOG_LEVEL || "info",
  
  // Docker (fallback)
  dockerNetwork: process.env.DOCKER_NETWORK || "fabric-network",
  peerContainer: process.env.PEER_CONTAINER || "peer0.ibn.ictu.edu.vn",
};
```

### TypeScript Configuration

**File:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

## 🔄 Flow Xử Lý

### Query Flow

```
1. Backend → Gateway
   POST /api/v1/chaincode/forward
   Body: {chaincode, command: "query", cert, msp_id, args}

2. Gateway Router
   - Validate payload (Zod validation)
   - Extract org_context = {msp_id, certificate, private_key?}

3. FabricGatewayService
   - selectIdentity(org_context)
     → Decode cert Base64 → Buffer
     → Create FabricIdentity(certificate, private_key?)
   
   - queryChaincode(...)
     → Try GrpcGatewayClient.queryChaincode()
     → Fallback DockerExecutor nếu fails

4. Gateway → Backend
   Response: {success, data, txId: null, error: null}
```

### Invoke Flow

```
1. Backend → Gateway
   POST /api/v1/chaincode/forward
   Body: {chaincode, command: "invoke", cert, private_key, msp_id, args}

2. Gateway Router
   - Validate payload
   - Extract org_context = {msp_id, certificate, private_key}

3. FabricGatewayService
   - selectIdentity(org_context, requirePrivateKey: true)
     → Decode cert và private_key Base64 → Buffer
     → Create FabricIdentity(certificate, private_key)
   
   - invokeChaincode(...)
     → Try GrpcGatewayClient.invokeChaincode()
     → Fallback DockerExecutor nếu fails
     → Return txId

4. Gateway → Backend
   Response: {success, data: null, txId: "abc123...", error: null}
```

---

## 🧪 Testing Strategy

### Unit Tests

- **FabricGatewayService**: Test identity selection, query/invoke logic
- **CertificateManager**: Test Base64 decode, PEM parsing
- **GrpcGatewayClient**: Mock gRPC calls
- **ResponseParser**: Test response parsing

### Integration Tests

- **Chaincode endpoints**: Test với mock Fabric network
- **Health check**: Test health endpoint
- **Error handling**: Test error responses

### E2E Tests

- **Full flow**: Backend → Gateway → Fabric Network
- **Query operations**: Test query chaincode
- **Invoke operations**: Test invoke chaincode
- **Error scenarios**: Test error handling

### Test Tools

- **Jest**: Test framework
- **ts-jest**: TypeScript support cho Jest
- **supertest**: HTTP assertions
- **Mock gRPC**: Mock Fabric Gateway SDK

---

## 🚀 Development Workflow

### Phase 1: Gateway API Setup & Infrastructure (Week 1)

- [ ] Initialize gateway-ts project với TypeScript
- [ ] Setup dependencies (Express/Fastify, Fabric Gateway SDK, Zod, Winston)
- [ ] Configure TypeScript, ESLint, Prettier
- [ ] Create project structure
- [ ] Setup logging và error handling
- [ ] Create Dockerfile và .env.example

### Phase 2: Gateway - Core Services (Week 2)

- [ ] Implement CertificateManager (Base64 decode, PEM parsing, file loading)
- [ ] Implement FabricIdentity wrapper
- [ ] Implement GrpcGatewayClient (gRPC connection, query, invoke)
- [ ] Implement DockerExecutor (fallback)
- [ ] Implement FabricGatewayService (selectIdentity, queryChaincode, invokeChaincode)

### Phase 3: Gateway - API Routes (Week 3)

- [ ] Setup Express/Fastify server
- [ ] Implement middleware (error handler, logging, validation)
- [ ] Implement POST /api/v1/chaincode/forward
- [ ] Implement legacy endpoints (query, invoke)
- [ ] Implement GET /api/v1/health
- [ ] Implement GET /api/v1/channels/{channel}/info

### Phase 4: Gateway - Testing & Integration (Week 4)

- [ ] Write unit tests (CertificateManager, FabricIdentity, utils)
- [ ] Write integration tests (chaincode endpoints, health check)
- [ ] Write E2E tests (full flow: Backend → Gateway → Fabric)
- [ ] Setup test coverage
- [ ] Fix bugs, performance tuning

### Phase 5: Backend API Setup (Week 5)

- [ ] Initialize backend-ts project với TypeScript (Express hoặc NestJS)
- [ ] Setup dependencies, configuration, structure
- [ ] Implement authentication (JWT)
- [ ] Implement database layer (PostgreSQL)
- [ ] Setup logging và error handling

### Phase 6: Backend - Services & Routes (Week 6-7)

- [ ] Migrate user management từ Python backend
- [ ] Implement blockchain integration (call Gateway API)
- [ ] Implement certificate management
- [ ] Implement business logic services
- [ ] Implement API routes từ phiên bản cũ

### Phase 7: Backend - Testing & Integration (Week 8)

- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Write E2E tests
- [ ] Test integration với Frontend
- [ ] Performance testing

### Phase 8: Frontend & System Integration (Week 9)

- [ ] Verify Frontend TypeScript compatibility
- [ ] Test full flow: Frontend → Backend → Gateway → Fabric
- [ ] Fix issues, optimize performance
- [ ] Setup monitoring, logging

### Phase 9: Documentation & Deployment (Week 10)

- [ ] Write API documentation (OpenAPI/Swagger)
- [ ] Write README cho backend-ts và gateway-ts
- [ ] Setup Docker Compose cho toàn hệ thống
- [ ] Create deployment scripts
- [ ] Security review
- [ ] Performance testing

---

## 🔐 Security Considerations

### Certificate Handling

- ✅ Private key KHÔNG được gửi qua network (trừ khi cần cho invoke)
- ✅ Certificate được Base64 encode để gửi qua HTTP/JSON
- ✅ Gateway validate certificate format trước khi forward
- ✅ Gateway không lưu trữ certificates hoặc private keys

### Network Security

- ✅ HTTPS cho production (TLS/SSL)
- ✅ gRPC/TLS cho Fabric Network communication
- ✅ Validate tất cả inputs (Zod validation)
- ✅ Rate limiting (có thể thêm sau)

### Error Handling

- ✅ Không expose internal errors ra client
- ✅ Log errors với đầy đủ context
- ✅ Retry logic cho transient errors

---

## 📊 Performance Considerations

### Async Operations

- ✅ Sử dụng async/await cho tất cả I/O operations
- ✅ Non-blocking I/O với Node.js event loop
- ✅ Connection pooling cho gRPC clients

### Caching

- ✅ Cache gRPC connections (reuse Gateway instances)
- ✅ Cache certificate parsing (nếu cần)

### Monitoring

- ✅ Request logging với Winston
- ✅ Metrics collection (có thể thêm Prometheus sau)
- ✅ Health check endpoint

---

## 🔄 Migration từ Python

### API Compatibility

- ✅ Giữ nguyên API contract (request/response format)
- ✅ Giữ nguyên endpoint paths
- ✅ Giữ nguyên error response format

### Backend Integration

- ✅ Backend không cần thay đổi (vẫn gửi request tới Gateway)
- ✅ Chỉ cần update Gateway URL nếu cần

### Testing

- ✅ Test với Backend hiện tại để đảm bảo compatibility
- ✅ Test với Fabric Network hiện tại

---

## 📝 Code Examples

### Example: Chaincode Forward Endpoint

```typescript
// src/routes/chaincode.ts
import { Router, Request, Response } from 'express';
import { FabricGatewayService } from '../services/fabric/FabricGatewayService';
import { ChaincodeForwardRequest, ChaincodeResponse } from '../models/chaincode';
import { validateRequest } from '../middleware/validator';

const router = Router();

router.post('/forward', validateRequest(ChaincodeForwardRequestSchema), async (req: Request, res: Response) => {
  try {
    const request: ChaincodeForwardRequest = req.body;
    
    // Validate certificate
    if (!request.cert) {
      return res.status(400).json({
        success: false,
        data: null,
        txId: null,
        error: 'Certificate is required'
      });
    }
    
    // Build org context
    const orgContext = {
      msp_id: request.msp_id,
      certificate: request.cert,
      private_key: request.private_key,
      public_read: request.public_read,
      org_domain: request.org_domain
    };
    
    // Select identity
    const identity = await FabricGatewayService.selectIdentity(
      orgContext,
      request.command !== 'query' && request.command !== 'read'
    );
    
    if (!identity) {
      return res.status(500).json({
        success: false,
        data: null,
        txId: null,
        error: 'Failed to select identity'
      });
    }
    
    // Execute chaincode operation
    const service = new FabricGatewayService();
    let result: ChaincodeResponse;
    
    if (request.command === 'query' || request.command === 'read') {
      result = await service.queryChaincode(
        request.args.channel,
        request.chaincode,
        request.args.function,
        request.args.params || [],
        identity
      );
    } else {
      result = await service.invokeChaincode(
        request.args.channel,
        request.chaincode,
        request.args.function,
        request.args.params || [],
        identity
      );
    }
    
    return res.json(result);
  } catch (error) {
    logger.error('Chaincode forward error:', error);
    return res.status(500).json({
      success: false,
      data: null,
      txId: null,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

export default router;
```

### Example: FabricGatewayService

```typescript
// src/services/fabric/FabricGatewayService.ts
import { Gateway, Network, Contract, Identity, Signer } from '@hyperledger/fabric-gateway';
import { GrpcGatewayClient } from './GrpcGatewayClient';
import { DockerExecutor } from './DockerExecutor';
import { FabricIdentity } from './FabricIdentity';

export class FabricGatewayService {
  private grpcClient: GrpcGatewayClient;
  private dockerExecutor: DockerExecutor;
  
  constructor() {
    this.grpcClient = new GrpcGatewayClient();
    this.dockerExecutor = new DockerExecutor();
  }
  
  static async selectIdentity(
    orgContext: OrgContext,
    requirePrivateKey: boolean = false
  ): Promise<FabricIdentity | null> {
    try {
      const mspId = orgContext.msp_id;
      if (!mspId) {
        throw new Error('msp_id is required');
      }
      
      // Decode certificate
      const certBuffer = Buffer.from(orgContext.certificate, 'base64');
      
      // Decode private key nếu có
      let privateKeyBuffer: Buffer | undefined;
      if (orgContext.private_key) {
        privateKeyBuffer = Buffer.from(orgContext.private_key, 'base64');
      } else if (requirePrivateKey && orgContext.public_read && orgContext.org_domain) {
        // Load từ file system cho public read queries
        privateKeyBuffer = await CertificateManager.loadPrivateKeyFromFile(
          orgContext.org_domain,
          'admin'
        );
      }
      
      if (requirePrivateKey && !privateKeyBuffer) {
        throw new Error('Private key is required for invoke operations');
      }
      
      return new FabricIdentity(mspId, certBuffer, privateKeyBuffer);
    } catch (error) {
      logger.error('Failed to select identity:', error);
      return null;
    }
  }
  
  async queryChaincode(
    channel: string,
    chaincode: string,
    functionName: string,
    args: string[],
    identity: FabricIdentity
  ): Promise<ChaincodeResponse> {
    try {
      // Try gRPC Gateway SDK first
      try {
        const result = await this.grpcClient.queryChaincode(
          channel,
          chaincode,
          functionName,
          args,
          identity
        );
        
        return {
          success: true,
          data: result,
          txId: null,
          error: null
        };
      } catch (grpcError) {
        logger.warn('gRPC query failed, trying Docker executor:', grpcError);
        
        // Fallback to Docker executor
        const result = await this.dockerExecutor.executePeerChaincodeQuery(
          channel,
          chaincode,
          functionName,
          args,
          identity
        );
        
        return {
          success: true,
          data: result,
          txId: null,
          error: null
        };
      }
    } catch (error) {
      logger.error('Query chaincode failed:', error);
      return {
        success: false,
        data: null,
        txId: null,
        error: error instanceof Error ? error.message : 'Query failed'
      };
    }
  }
  
  async invokeChaincode(
    channel: string,
    chaincode: string,
    functionName: string,
    args: string[],
    identity: FabricIdentity
  ): Promise<ChaincodeResponse> {
    try {
      // Try gRPC Gateway SDK first
      try {
        const txId = await this.grpcClient.invokeChaincode(
          channel,
          chaincode,
          functionName,
          args,
          identity
        );
        
        return {
          success: true,
          data: null,
          txId: txId,
          error: null
        };
      } catch (grpcError) {
        logger.warn('gRPC invoke failed, trying Docker executor:', grpcError);
        
        // Fallback to Docker executor
        const txId = await this.dockerExecutor.executePeerChaincodeInvoke(
          channel,
          chaincode,
          functionName,
          args,
          identity
        );
        
        return {
          success: true,
          data: null,
          txId: txId,
          error: null
        };
      }
    } catch (error) {
      logger.error('Invoke chaincode failed:', error);
      return {
        success: false,
        data: null,
        txId: null,
        error: error instanceof Error ? error.message : 'Invoke failed'
      };
    }
  }
}
```

---

## 🐳 Docker Configuration

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 8001

# Start server
CMD ["node", "dist/index.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  gateway-api:
    build: ./gateway-ts
    ports:
      - "8001:8001"
    environment:
      - PORT=8001
      - HOST=0.0.0.0
      - GATEWAY_PEER_ENDPOINT=peer0.ibn.ictu.edu.vn:7051
      - MSP_ID=IBNMSP
      - TLS_ENABLED=true
      - CRYPTO_CONFIG_PATH=/network/crypto-config
    volumes:
      - ./network/crypto-config:/network/crypto-config:ro
      - ./network:/network:ro
    networks:
      - fabric-network
    depends_on:
      - peer0.ibn.ictu.edu.vn
      - orderer.ibn.ictu.edu.vn
```

---

## 📚 Tài Liệu Tham Khảo

### Hyperledger Fabric Gateway SDK

- [Fabric Gateway SDK Documentation](https://hyperledger.github.io/fabric-gateway/)
- [Node.js SDK API Reference](https://hyperledger.github.io/fabric-gateway/main/api/node/)

### TypeScript Best Practices

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

### Express/Fastify

- [Express Documentation](https://expressjs.com/)
- [Fastify Documentation](https://www.fastify.io/)

---

## ✅ Checklist Triển Khai

### Setup
- [ ] Initialize TypeScript project
- [ ] Install dependencies
- [ ] Setup project structure
- [ ] Configure TypeScript
- [ ] Setup ESLint và Prettier

### Core Services
- [ ] CertificateManager
- [ ] FabricIdentity
- [ ] GrpcGatewayClient
- [ ] DockerExecutor
- [ ] FabricGatewayService

### API
- [ ] Express/Fastify server setup
- [ ] Middleware (error handler, logging, validation)
- [ ] Chaincode routes
- [ ] Health check route
- [ ] Channel info route

### Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Test coverage > 80%

### Documentation
- [ ] API documentation
- [ ] README
- [ ] Code comments

### Deployment
- [ ] Dockerfile
- [ ] docker-compose.yml
- [ ] Environment variables
- [ ] Deployment scripts

### Integration
- [ ] Test với Backend hiện tại
- [ ] Test với Fabric Network
- [ ] Performance testing
- [ ] Security review

---

## 🎯 Kết Luận

Plan này mô tả chi tiết cách chuyển đổi toàn bộ hệ thống IBN sang TypeScript/Node.js stack:

### Lợi ích chính:

1. **Type Safety**: Compile-time type checking trên tất cả layers
2. **Developer Experience**: Autocomplete, refactoring tốt hơn trong toàn bộ codebase
3. **Performance**: Node.js async I/O phù hợp với gRPC operations
4. **Code Reusability**: Chia sẻ types, utils, helpers giữa Backend, Gateway, Frontend
5. **Maintainability**: Code dễ đọc, dễ maintain với TypeScript discipline
6. **Ecosystem**: Phong phú packages và tools support cho Node.js
7. **Unified Stack**: Chỉ cần học 1 ngôn ngữ cho toàn bộ hệ thống (trừ Fabric Network)

### Kiến trúc cuối cùng:

- **Frontend**: React/TypeScript (Vite) - Port 3000
- **Backend API**: Express/NestJS (TypeScript) - Port 8002
- **Gateway API**: Express/Fastify (TypeScript) - Port 8001
- **Fabric Network**: Go Chaincode (không thay đổi) - Port 7050/7051

Mỗi component sẽ có:
- ✅ Unified error handling
- ✅ Unified logging (Winston)
- ✅ Unified validation (Zod)
- ✅ Consistent API patterns
- ✅ Comprehensive testing (unit, integration, E2E)
- ✅ Docker support
- ✅ TypeScript strict mode

Toàn bộ hệ thống sẽ được tích hợp thông qua:
- REST APIs (Frontend ↔ Backend, Backend ↔ Gateway)
- gRPC (Gateway ↔ Fabric Network)
- Unified authentication/authorization
- Centralized logging và monitoring


