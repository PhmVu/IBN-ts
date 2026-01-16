# Phase 2: Gateway API Development (TypeScript/Node.js)

## 🎯 Mục tiêu
Phát triển Gateway API bằng TypeScript/Node.js với Fabric Gateway SDK để tương tác với Hyperledger Fabric Network thông qua REST API endpoints.

## 🚀 Phase 2 Success Criteria
- [ ] Gateway API server running on port 8001 (Express/Fastify)
- [ ] TypeScript strict mode enabled
- [ ] Chaincode query/invoke endpoints implemented
- [ ] Certificate management (Base64 decode, validation)
- [ ] Proper error handling và validation (Zod)
- [ ] Health check endpoint working
- [ ] Docker configuration ready
- [ ] Unit & integration tests > 80% coverage
- [ ] Ready for Backend API integration

## 🏗️ Kiến trúc Phase 2 (Gateway API)

```
Gateway API (TypeScript/Node.js):
├── Express/Fastify Server      - localhost:8001
├── Fabric Gateway SDK          - @hyperledger/fabric-gateway (Node.js)
├── gRPC Client                 - @grpc/grpc-js
├── Certificate Manager         - Decode Base64, validate PEM
├── Identity Manager            - Wrap MSP + certificate + private key
└── Chaincode Operations        - Query/Invoke smart contracts via gRPC
```

## 📋 TODO Phase 2

### 1. Project Structure Setup

```bash
gateway-ts/
├── package.json                 # npm dependencies + scripts
├── tsconfig.json                # TypeScript configuration (strict mode)
├── jest.config.js               # Jest testing configuration
├── .env.example                 # Environment variables template
├── .eslintrc.json               # ESLint configuration
├── .prettierrc                  # Prettier formatting rules
├── Dockerfile                   # Docker build config (multi-stage)
│
├── src/
│   ├── index.ts                 # Entry point - Express/Fastify server
│   ├── app.ts                   # App setup, middleware, routes
│   │
│   ├── config/
│   │   ├── index.ts             # Config loader
│   │   ├── env.ts               # Environment variables validation (Zod)
│   │   └── constants.ts         # Application constants
│   │
│   ├── core/
│   │   ├── logger.ts            # Winston logger setup
│   │   ├── errors.ts            # Custom error classes & error codes
│   │   └── types.ts             # Global TypeScript types
│   │
│   ├── middleware/
│   │   ├── errorHandler.ts      # Global error handler middleware
│   │   ├── logging.ts           # Request/response logging middleware
│   │   ├── validation.ts        # Zod validation middleware
│   │   ├── cors.ts              # CORS configuration middleware
│   │   └── auth.ts              # Optional JWT validation
│   │
│   ├── models/
│   │   ├── chaincode.ts         # Chaincode request/response types
│   │   ├── certificate.ts       # Certificate related types
│   │   ├── fabric.ts            # Fabric-specific types
│   │   └── health.ts            # Health check response types
│   │
│   ├── services/
│   │   ├── fabric/
│   │   │   ├── FabricGatewayService.ts    # Main gateway service
│   │   │   ├── FabricIdentity.ts          # Identity wrapper class
│   │   │   ├── GrpcGatewayClient.ts       # gRPC gateway SDK client
│   │   │   └── DockerExecutor.ts          # Docker executor fallback
│   │   │
│   │   ├── certificate/
│   │   │   └── CertificateManager.ts      # Certificate operations
│   │   │
│   │   └── parser/
│   │       └── ResponseParser.ts          # Response parsing utilities
│   │
│   ├── routes/
│   │   ├── index.ts             # Route aggregator
│   │   ├── chaincode.ts         # Chaincode operation endpoints
│   │   ├── health.ts            # Health check endpoints
│   │   └── info.ts              # System info endpoints
│   │
│   └── utils/
│       ├── base64.ts            # Base64 encoding/decoding helpers
│       ├── validation.ts        # Validation utilities
│       ├── retry.ts             # Exponential backoff retry logic
│       └── helpers.ts           # General helper functions
│
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   │   ├── FabricGatewayService.test.ts
│   │   │   ├── FabricIdentity.test.ts
│   │   │   ├── CertificateManager.test.ts
│   │   │   └── GrpcGatewayClient.test.ts
│   │   │
│   │   └── utils/
│   │       ├── base64.test.ts
│   │       └── validation.test.ts
│   │
│   ├── integration/
│   │   ├── chaincode.test.ts        # Test chaincode endpoints
│   │   ├── health.test.ts           # Test health endpoints
│   │   └── certificate.test.ts      # Test certificate handling
│   │
│   └── e2e/
│       └── chaincode-flow.test.ts   # Full end-to-end flow
│
├── scripts/
│   ├── setup.sh                 # Development setup script
│   ├── test.sh                  # Test runner
│   ├── build.sh                 # Build script
│   └── dev.sh                   # Development server with nodemon
│
├── .gitignore
└── README.md                    # Gateway API documentation
```

### 2. Dependencies Installation

**package.json**
```json
{
  "name": "ibn-gateway-ts",
  "version": "0.0.1",
  "description": "IBN Gateway API - TypeScript/Node.js",
  "main": "dist/index.js",
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write \"src/**/*.ts\""
  },
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
    "@types/node-forge": "^1.3.11",
    "typescript": "^5.3.3",
    "ts-node": "^10.9.2",
    "nodemon": "^3.0.2",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "supertest": "^6.3.3",
    "@types/jest": "^29.5.11",
    "@types/supertest": "^6.0.2",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.17.0",
    "@typescript-eslint/parser": "^6.17.0",
    "prettier": "^3.1.1"
  }
}
```

### 3. TypeScript Configuration

**tsconfig.json** - Strict mode enabled
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

### 4. Environment Configuration

**.env.example**
```env
# Server
PORT=8001
HOST=0.0.0.0
NODE_ENV=development

# Fabric Network
GATEWAY_PEER_ENDPOINT=peer0.ibn.ictu.edu.vn:7051
GATEWAY_ORDERER_ENDPOINT=orderer.ibn.ictu.edu.vn:7050
ORDERER_CA=/path/to/orderer/ca.pem
PEER_CA=/path/to/peer/ca.pem

# MSP Configuration
MSP_ID=IBNMSP

# TLS Configuration
TLS_ENABLED=true
TLS_CERT_PATH=/path/to/tls/cert.pem
TLS_KEY_PATH=/path/to/tls/key.pem

# Crypto Config Path
CRYPTO_CONFIG_PATH=/network/crypto-config

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Docker (fallback executor)
DOCKER_NETWORK=fabric-network
PEER_CONTAINER=peer0.ibn.ictu.edu.vn
```

### 5. Fabric Network Connection

**Connection Configuration**
- **Peer Endpoint**: peer0.ibn.ictu.edu.vn:7051
- **Orderer Endpoint**: orderer.ibn.ictu.edu.vn:7050
- **Channel**: testchan, mychannel
- **MSP ID**: IBNMSP
- **TLS**: Enabled with certificate validation

### 6. Chaincode Operations Implementation

#### Query Endpoint (Read-Only)
```typescript
POST /api/v1/chaincode/forward
Body: {
  "chaincode": "basic",
  "command": "query",
  "cert": "<Base64 encoded certificate>",
  "msp_id": "IBNMSP",
  "args": {
    "channel": "testchan",
    "function": "GetAllAssets",
    "params": []
  }
}

Response: {
  "success": true,
  "data": [...assets],
  "txId": null,
  "error": null
}
```

#### Invoke Endpoint (Read-Write)
```typescript
POST /api/v1/chaincode/forward
Body: {
  "chaincode": "basic",
  "command": "invoke",
  "cert": "<Base64 encoded certificate>",
  "private_key": "<Base64 encoded private key>",
  "msp_id": "IBNMSP",
  "args": {
    "channel": "testchan",
    "function": "CreateAsset",
    "params": ["asset1", "blue", "35", "tom", "1000"]
  }
}

Response: {
  "success": true,
  "data": null,
  "txId": "abc123...",
  "error": null
}
```

#### Health Check Endpoint
```typescript
GET /api/v1/health

Response: {
  "status": "healthy",
  "timestamp": "2025-12-10T10:00:00Z",
  "uptime": 3600,
  "components": {
    "server": "ok",
    "fabric_connection": "ok"
  }
}
```

### 7. Core Services Implementation

#### CertificateManager
- Decode Base64 certificates
- Parse PEM format
- Validate certificate structure
- Load certificates from file system

#### FabricIdentity
- Wrap MSP ID + certificate + private key (optional)
- Create identity object for Fabric Gateway SDK

#### GrpcGatewayClient
- Establish gRPC connection to Fabric peer
- Execute query operations (read-only)
- Execute invoke operations (read-write)
- Handle gRPC errors with retry logic

#### FabricGatewayService
- Select identity từ certificate context
- Execute chaincode query
- Execute chaincode invoke
- Implement fallback to Docker executor if gRPC fails

### 8. Error Handling & Validation

**Error Codes**
- 400: Invalid input (validation failed)
- 401: Unauthorized (auth failed)
- 403: Forbidden (permission denied)
- 500: Internal server error
- 503: Service unavailable (Fabric network down)

**Validation (Zod)**
- All request bodies validated with Zod schemas
- Type-safe error messages
- Consistent error response format

### 9. Testing Strategy

#### Unit Tests
- CertificateManager: Base64 decode, PEM parsing
- FabricIdentity: Identity creation
- ResponseParser: Response parsing utilities
- Utils: Validation, retry logic

#### Integration Tests
- Chaincode endpoints: Mock Fabric responses
- Health check: Server health
- Error handling: Error scenarios

#### E2E Tests
- Full flow: Backend → Gateway → Mock Fabric
- Query operation end-to-end
- Invoke operation end-to-end
- Certificate handling end-to-end

### 10. Docker Configuration

**Dockerfile** (Multi-stage build)
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /build
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build

# Runtime stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /build/dist ./dist
EXPOSE 8001
CMD ["node", "dist/index.js"]
```

### 11. Next Steps

1. Initialize TypeScript project with dependencies
2. Setup ESLint + Prettier configuration
3. Implement core services (CertificateManager, FabricIdentity, GrpcGatewayClient)
4. Implement FabricGatewayService
5. Setup Express/Fastify server with middleware
6. Implement API routes (chaincode, health)
7. Write comprehensive tests
8. Create Docker configuration
9. Integration testing with Backend API
