# Gateway API - IBN Project

Forward-only API service for ICTU Blockchain Network (IBN). Handles communication between Backend API and Hyperledger Fabric Network.

## Overview

The Gateway API serves as a proxy layer between the Backend API and Hyperledger Fabric Network. It:

- Decodes and validates certificates (Base64 → Buffer)
- Creates Fabric identities for transaction signing
- Forwards chaincode queries and invocations to Fabric
- Handles gRPC/TLS communication with Fabric peers
- Provides fallback execution via Docker
- Logs all operations for audit trails

## Architecture

```
Backend API
    ↓
Gateway API (Port 8001)
    ├── Certificate Manager
    ├── Fabric Gateway Service
    ├── gRPC Client (primary)
    └── Docker Executor (fallback)
    ↓
Hyperledger Fabric Network
```

## Prerequisites

- Node.js 18+
- npm or yarn
- Hyperledger Fabric 2.5.0
- Docker (for fallback executor)

## Installation

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Configure environment variables
# Edit .env with your Fabric network details
```

## Configuration

### .env Variables

```env
PORT=8001                                          # API port
HOST=0.0.0.0                                       # Listen address
NODE_ENV=development                               # Environment

LOG_LEVEL=info                                     # Logging level

GATEWAY_PEER_ENDPOINT=peer0.ibn.ictu.edu.vn:7051 # Peer endpoint
GATEWAY_ORDERER_ENDPOINT=orderer.ictu.edu.vn:7050 # Orderer endpoint
MSP_ID=IBNMSP                                      # MSP ID

TLS_ENABLED=true                                   # Enable TLS
TLS_CERT_PATH=/path/to/tls/cert.pem              # TLS certificate path

CRYPTO_CONFIG_PATH=/network/crypto-config         # Crypto materials path

DOCKER_NETWORK=fabric-network                     # Docker network name
PEER_CONTAINER=peer0.ibn.ictu.edu.vn             # Peer container name
```

## Development

### Start Development Server

```bash
npm run dev
```

The API will start on http://localhost:8001

### Build

```bash
npm run build
```

### Testing

```bash
# Run all tests
npm test

# Watch mode
npm test:watch

# Coverage report
npm test:coverage
```

### Linting & Formatting

```bash
# Lint
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Production

### Build and Start

```bash
npm run build
npm start
```

### Docker

```bash
# Build image
docker build -t ibn-gateway-api:latest .

# Run container
docker run -p 8001:8001 \
  -e GATEWAY_PEER_ENDPOINT=peer0.ibn.ictu.edu.vn:7051 \
  -e MSP_ID=IBNMSP \
  ibn-gateway-api:latest
```

## API Endpoints

### Health Check

```
GET /api/v1/health
```

Returns gateway health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-10T10:30:00Z",
  "services": {
    "gateway": true,
    "logger": true
  }
}
```

### Chaincode Forward (Main Endpoint)

```
POST /api/v1/chaincode/forward
```

Forward chaincode query or invoke to Fabric network.

**Request:**
```json
{
  "chaincode": "teatrace",
  "command": "query",
  "cert": "LS0tLS1CRUdJTi...",
  "msp_id": "IBNMSP",
  "args": {
    "channel": "testchan",
    "function": "GetData",
    "params": ["key1"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {"key": "value"},
  "txId": null,
  "error": null
}
```

### Legacy Endpoints

```
POST /api/v1/chaincode/query    # Legacy query
POST /api/v1/chaincode/invoke   # Legacy invoke
GET  /api/v1/channels/{channel}/info  # Channel info
```

## Project Structure

```
gateway-ts/
├── src/
│   ├── config/              # Configuration
│   ├── core/                # Logger, errors, types
│   ├── middleware/          # Express middleware
│   ├── models/              # Data models & validators
│   ├── services/            # Business logic
│   │   ├── fabric/          # Fabric integration
│   │   └── certificate/     # Certificate handling
│   ├── routes/              # API routes
│   ├── utils/               # Utilities
│   └── index.ts             # Entry point
├── tests/                   # Test files
├── package.json
├── tsconfig.json
├── jest.config.js
├── Dockerfile
├── .env.example
└── README.md
```

## Services

### CertificateManager

Handles certificate decoding and validation:

```typescript
import { CertificateManager } from '@services/certificate/CertificateManager';

// Decode Base64 certificate
const certBuffer = CertificateManager.decodeBase64Certificate(certB64);

// Validate certificate
const isValid = CertificateManager.isCertificateValid(certBuffer);

// Extract subject
const subject = CertificateManager.extractCertificateSubject(certBuffer);
```

### FabricGatewayService

Handles communication with Fabric network:

```typescript
import { FabricGatewayService } from '@services/fabric/FabricGatewayService';

const service = new FabricGatewayService();

// Query chaincode (read-only)
const result = await service.queryChaincode(
  'channel',
  'chaincode',
  'function',
  ['arg1', 'arg2'],
  identity
);

// Invoke chaincode (read-write)
const txId = await service.invokeChaincode(
  'channel',
  'chaincode',
  'function',
  ['arg1', 'arg2'],
  identity
);
```

## Logging

Structured logging with Winston:

```typescript
import logger from '@core/logger';

logger.info('Operation successful', { details: 'value' });
logger.warn('Warning message', { context: 'details' });
logger.error('Error occurred', { error: 'message' });
```

Logs are written to:
- Console (development)
- `logs/combined.log` (all levels)
- `logs/error.log` (errors only)

## Error Handling

Custom error classes for different scenarios:

```typescript
import {
  GatewayError,
  CertificateError,
  ValidationError,
  FabricError,
  NetworkError,
  TimeoutError
} from '@core/errors';

// Error response format
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {...},
  "timestamp": "2025-12-10T10:30:00Z"
}
```

## Testing

### Unit Tests

```bash
npm test -- src/services/certificate/CertificateManager.test.ts
```

### Integration Tests

```bash
npm test -- src/routes/chaincode.test.ts
```

### E2E Tests

```bash
npm test -- tests/e2e/
```

## Troubleshooting

### Certificate Decoding Issues

1. Verify Base64 encoding: `echo -n "<base64>" | base64 -d`
2. Check certificate format: should start with `-----BEGIN CERTIFICATE-----`
3. Validate certificate with OpenSSL: `openssl x509 -in cert.pem -text -noout`

### Fabric Connection Issues

1. Check peer endpoint: `telnet <peer-host> <peer-port>`
2. Verify TLS certificates: check `CORE_PEER_TLS_ROOTCERT_FILE`
3. Check peer logs: `docker logs peer0.ibn.ictu.edu.vn`

### gRPC Errors

1. Verify gRPC endpoint is reachable
2. Check TLS configuration
3. Enable gRPC debug logs: `GRPC_VERBOSITY=debug`

## Performance

- Connection pooling for gRPC clients
- Request timeout: 30 seconds (configurable)
- Invoke timeout: 60 seconds (configurable)
- Retry logic with exponential backoff
- Fallback to Docker executor on gRPC failure

## Security

- Certificate validation (format, expiry)
- TLS/SSL for all network communication
- Input validation with Zod
- Error messages don't expose internal details
- Audit logging for all operations

## Next Steps

1. ✅ Phase 1: Fabric Network
2. ✅ Phase 2: Gateway API - Infrastructure (Current)
3. → Phase 3: Gateway API - Core Services
4. → Phase 4: Gateway API - API Routes
5. → Phase 5: Gateway API - Testing

## Support

For issues or questions, check:
- Project documentation in `docs/v0.0.1/`
- Hyperledger Fabric documentation
- Logs in `logs/` directory

## License

Part of ICTU Blockchain Network (IBN) Project - v0.0.1
