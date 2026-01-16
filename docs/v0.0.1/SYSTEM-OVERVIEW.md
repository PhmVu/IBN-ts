# 📋 TỔNG QUAN HỆ THỐNG IBN v0.0.1

## 🎯 MỤC ĐÍCH
IBN (ICTU Blockchain Network) là hệ thống quản lý mạng blockchain Hyperledger Fabric toàn diện, cho phép admin:
- Quản lý users, channels, chaincodes
- Invoke/Query smart contracts
- Theo dõi blockchain state
- Quản lý permissions và audit logs

## 🏗️ KIẾN TRÚC HỆ THỐNG

```
Frontend (React) :3001
    ↓ HTTP/REST
Backend API (FastAPI) :9002
    ↓ Async API Calls
Gateway API (FastAPI) :9001
    ↓ Fabric SDK
Fabric Network (Docker)
    ├─ Orderer :7050
    ├─ Peer :7051
    ├─ CA :7054
    └─ CouchDB :5984
```

## 📦 CÁC THÀNH PHẦN

### 1. Frontend (React + TypeScript)
**Location**: `frontend/`
- **Port**: 3001
- **Tech**: React 18, Vite, Tailwind CSS, Zustand
- **Features**:
  - Authentication (JWT)
  - User Management UI
  - Channel Management UI
  - Chaincode Operations UI
  - Blockchain Explorer UI
  - Dashboard

**Routes**:
- `/login` - Đăng nhập
- `/` - Dashboard
- `/users` - Quản lý users
- `/channels` - Quản lý channels
- `/explorer` - Blockchain Explorer
- `/chaincode` - Chaincode Operations

### 2. Backend API (FastAPI)
**Location**: `backend/`
- **Port**: 9002
- **Tech**: FastAPI, SQLAlchemy (Async), JWT
- **Database**: SQLite (MVP)

**Endpoints**:
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/register` - Register
- `GET /api/v1/auth/me` - Get current user
- `GET /api/v1/users/` - List users
- `GET /api/v1/channels/` - List channels
- `GET /api/v1/explorer/blocks` - Get blocks

**Models** (Database):
- User (username, email, password_hash, is_superuser)
- Organization
- Channel
- Chaincode
- Block
- Transaction
- AuditLog

### 3. Gateway API (FastAPI + Fabric SDK)
**Location**: `gateway/`
- **Port**: 9001
- **Tech**: FastAPI, Fabric SDK Python
- **Role**: Trung gian giữa Backend và Fabric Network

**Endpoints**:
- `GET /api/v1/health` - Health check
- `POST /api/v1/chaincode/invoke` - Invoke chaincode
- `GET /api/v1/chaincode/query` - Query chaincode

**Implementation**: Mock data fallback (MVP strategy)

### 4. Fabric Network (Hyperledger Fabric)
**Location**: `network/`
- **Components** (Docker):
  - Orderer - Sắp xếp transactions
  - Peer0 - Đọc/ghi ledger
  - CA - Certificate Authority
  - CouchDB - State database

**Ports**:
- Orderer: 7050, 7053, 17050
- Peer0: 7051, 17051
- CA: 7054, 17054
- CouchDB: 5984

## 🔄 LUỒNG HOẠT ĐỘNG

### 1. Authentication Flow
```
User Login → Backend (/auth/login)
  → Verify credentials
  → Generate JWT tokens
  → Return to Frontend
  → Store tokens
  → Navigate to Dashboard
```

### 2. Chaincode Operations Flow
```
User Invoke/Query (Frontend)
  → Backend API (/chaincode/invoke)
  → Gateway API (async)
  → Fabric SDK
  → Fabric Network
  → Chaincode execution
  → Response chain
```

### 3. Channel Management Flow
```
User Create/Update Channel (Frontend)
  → Backend API (/channels/)
  → Store in SQLite
  → Update UI
  → (Future: Sync with Fabric)
```

## 🗄️ DATABASE SCHEMA

### SQLite (Backend)
- `users` - Hệ thống users với authentication
- `organizations` - Tổ chức trong network
- `channels` - Blockchain channels
- `chaincodes` - Deployed chaincodes
- `blocks` - Blockchain blocks metadata
- `transactions` - Transaction history
- `audit_logs` - Audit trail

### CouchDB (Fabric)
- Ledger state database
- World state storage

## 🔐 SECURITY

### Authentication
- JWT-based authentication
- Access token: 30 minutes
- Refresh token: 7 days
- Password hashing: bcrypt

### Authorization
- `is_superuser` flag for admin
- `is_active` flag for user status
- Role-based access control

## 🚀 TRIỂN KHAI

### Docker Compose
```bash
cd network
docker-compose up -d
```

### Services Manual
```bash
# Terminal 1: Fabric Network
cd network && docker-compose up

# Terminal 2: Backend
cd backend && uvicorn app.main:app --reload

# Terminal 3: Gateway
cd gateway && uvicorn app.main:app --reload

# Terminal 4: Frontend
cd frontend && npm run dev
```

## 📊 MOCK DATA STRATEGY (MVP)

**Mock Data** (v0.0.1):
- Chaincode operations
- Blockchain Explorer
- Network status

**Real Data**:
- User management (SQLite)
- Channel management (SQLite)
- Authentication (JWT)

**Lý do**: Đảm bảo development không bị block, sẵn sàng cho v0.0.2

## 📝 CÁC TÍNH NĂNG CHÍNH

✅ Authentication & Authorization
✅ User Management (CRUD)
✅ Channel Management (CRUD)
✅ Chaincode Operations (Mock)
✅ Blockchain Explorer (Mock)
✅ Audit Logging
✅ JWT Tokens
✅ CORS Support
✅ API Documentation (OpenAPI)

## 🐛 CÁC VẤN ĐỀ ĐÃ BIẾT

1. **Backend `/auth/me`**: Internal Server Error (bypassed)
2. **Delete User**: UI chưa implement
3. **Mock Data**: Không phản ánh real blockchain state
4. **Channel Sync**: TODO - sync với Fabric network

## 🎯 ROADMAP

**v0.0.1** ✅ MVP - Hoàn thành
**v0.0.2** - Real Fabric integration
**v0.0.3** - Multiple organizations support
**v0.1.0** - Production ready

