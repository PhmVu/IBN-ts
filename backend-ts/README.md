# Backend API - IBN (ICTU Blockchain Network)

Backend API cho hệ thống ICTU Blockchain Network, xây dựng bằng TypeScript/Node.js với Express, PostgreSQL, và JWT authentication.

## ✨ Features

- ✅ RESTful API với Express.js
- ✅ Authentication & Authorization (JWT + Role-based)
- ✅ PostgreSQL database integration
- ✅ Blockchain integration via Gateway API
- ✅ User management (CRUD)
- ✅ Channel & Chaincode management
- ✅ Comprehensive error handling
- ✅ Request validation (Zod)
- ✅ Structured logging (Winston)
- ✅ TypeScript strict mode
- ✅ Docker support

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 15
- npm or yarn

### Installation

```bash
cd backend-ts

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration
```

### Database Setup

```bash
# Create database
createdb ibn_db

# Run migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

### Development

```bash
npm run dev
```

Server sẽ chạy tại `http://localhost:8002`

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

## 📁 Project Structure

```
backend-ts/
├── src/
│   ├── config/         # Configuration (env, database, constants)
│   ├── core/           # Core utilities (logger, errors, types)
│   ├── middleware/     # Express middleware (auth, validation, logging)
│   ├── models/         # Database models and schemas
│   ├── schemas/        # Zod validation schemas
│   ├── services/       # Business logic services
│   ├── routes/         # API route handlers
│   ├── utils/          # Helper utilities
│   ├── database/       # Database configuration and migrations
│   ├── app.ts          # Express app setup
│   └── index.ts        # Server entry point
├── tests/              # Test files (unit, integration, e2e)
├── migrations/         # Database migration scripts
├── package.json        # npm dependencies
├── tsconfig.json       # TypeScript configuration
├── jest.config.js      # Testing configuration
└── Dockerfile          # Docker build configuration
```

## 🔌 API Endpoints

### Authentication

```
POST   /api/v1/auth/register       - Register new user
POST   /api/v1/auth/login          - Login and get JWT token
POST   /api/v1/auth/refresh        - Refresh JWT token
POST   /api/v1/auth/logout         - Logout (invalidate token)
POST   /api/v1/auth/change-password - Change password
```

### Users

```
GET    /api/v1/users               - List all users (admin only)
GET    /api/v1/users/:id           - Get user details
POST   /api/v1/users               - Create new user (admin only)
PUT    /api/v1/users/:id           - Update user
DELETE /api/v1/users/:id           - Delete user (admin only)
```

### Channels

```
GET    /api/v1/channels            - List all channels
POST   /api/v1/channels            - Create new channel
GET    /api/v1/channels/:id        - Get channel details
PUT    /api/v1/channels/:id        - Update channel
DELETE /api/v1/channels/:id        - Delete channel
```

### Chaincode

```
GET    /api/v1/chaincode           - List installed chaincodes
POST   /api/v1/chaincode/install   - Install chaincode
POST   /api/v1/chaincode/query     - Query chaincode
POST   /api/v1/chaincode/invoke    - Invoke chaincode
GET    /api/v1/chaincode/:id       - Get chaincode info
```

### Health

```
GET    /health                     - Health check
```

## 🔐 Authentication

Backend API sử dụng JWT (JSON Web Token) cho authentication:

1. User gọi `/api/v1/auth/login` với username/password
2. Server trả về JWT token
3. Client gửi token trong `Authorization: Bearer <token>` header
4. Server verify token trước khi xử lý request

## 📚 Environment Variables

Xem `.env.example` để hiểu tất cả các biến cấu hình:

- `PORT`: Server port (default: 8002)
- `NODE_ENV`: Environment (development, production, test)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Database config
- `JWT_SECRET`: Secret key for JWT signing (min 32 characters)
- `GATEWAY_API_URL`: URL của Gateway API
- `LOG_LEVEL`: Logging level (error, warn, info, debug)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run tests with coverage
npm test:coverage
```

## 📝 Logging

Backend sử dụng Winston logger với:
- Console output (development)
- File output: `logs/error.log`, `logs/combined.log`
- Structured JSON logging
- Request/response logging
- Error stack traces

## 🐳 Docker

```bash
# Build image
docker build -t ibn-backend:latest .

# Run container
docker run -d \
  --name ibn-backend \
  -p 8002:8002 \
  --env-file .env \
  ibn-backend:latest
```

## 🚨 Error Handling

API trả về consistent error format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message description",
    "details": {}
  },
  "timestamp": "2025-12-10T10:00:00Z",
  "path": "/api/v1/some/endpoint"
}
```

HTTP Status codes:
- 200: Success
- 201: Created
- 400: Bad Request (validation)
- 401: Unauthorized (auth required)
- 403: Forbidden (permission denied)
- 404: Not Found
- 500: Internal Server Error
- 503: Service Unavailable

## 📄 License

MIT
