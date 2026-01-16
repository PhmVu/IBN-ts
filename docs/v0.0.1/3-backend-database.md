# Phase 3: Backend API Development

## 🎯 Mục tiêu
Phát triển Backend API hoàn chỉnh với FastAPI, PostgreSQL database, JWT authentication, và tích hợp Gateway API cho blockchain operations.

## 🚀 Phase 3 Success Criteria
- [x] FastAPI application running on port 8002
- [x] SQLite database với complete schema
- [x] JWT authentication system working
- [x] All CRUD operations for users, organizations, channels
- [x] Blockchain integration through Gateway API
- [x] Role-based access control implemented  
- [x] Comprehensive API documentation
- [x] Docker orchestration với 7 services
- [x] Database seeding với admin/demo users và channels
- [x] End-to-end blockchain operations working

## 🏗️ Kiến trúc Phase 3
```
Backend System:
├── FastAPI Application        - localhost:8002
├── SQLite Database            - ibn_dev.db
├── JWT Authentication         - Role-based access control
├── Gateway API Integration    - Blockchain operations
└── Docker Orchestration       - Multi-service deployment
```

## 📋 TODO Phase 3

### ✅ 1. Project Structure Setup
```bash
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI application entry point
│   ├── config.py                  # Configuration và environment variables
│   ├── database.py                # Database connection và session management
│   ├── models/                    # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── user.py               # User model với roles
│   │   ├── organization.py       # Organization model
│   │   ├── channel.py            # Blockchain channel model
│   │   ├── chaincode.py          # Chaincode model
│   │   ├── block.py              # Block cache model
│   │   ├── transaction.py        # Transaction cache model
│   │   ├── audit_log.py          # Audit log model
│   │   └── base.py               # Base model với common fields
│   ├── schemas/                   # Pydantic schemas for API validation
│   │   ├── __init__.py
│   │   ├── auth.py               # Authentication schemas
│   │   ├── user.py               # User schemas
│   │   ├── organization.py       # Organization schemas
│   │   ├── channel.py            # Channel schemas
│   │   └── chaincode.py          # Chaincode operation schemas
│   ├── routers/                   # API endpoints
│   │   ├── __init__.py
│   │   ├── auth.py               # Authentication endpoints
│   │   ├── users.py              # User management endpoints
│   │   ├── channels.py           # Channel management endpoints
│   │   ├── chaincode.py          # Blockchain operation endpoints
│   │   └── explorer.py           # Explorer endpoints (blocks, transactions)
│   ├── utils/                     # Utilities
│   │   ├── __init__.py
│   │   ├── deps.py               # FastAPI dependencies (auth, db)
│   │   └── security.py           # Password hashing, JWT tokens
│   └── services/                  # Business logic services
│       ├── __init__.py
│       ├── auth_service.py       # Authentication business logic
│       ├── user_service.py       # User management logic
│       ├── organization_service.py # Organization logic
│       ├── channel_service.py    # Channel management logic
│       └── gateway_service.py    # Gateway API integration
├── requirements.txt               # Python dependencies
├── .env                          # Environment variables
└── alembic/                      # Database migrations (if needed)
```

### ✅ 2. Dependencies Installation
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
aiosqlite==0.19.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
httpx==0.25.2
pydantic==2.5.0
pydantic-settings==2.1.0
python-dotenv==1.0.0
```

### ✅ 3. Database Models Implementation

#### User Model với Role-based Access:
```python
class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_superuser = Column(Boolean, default=False)  # Admin role
    is_active = Column(Boolean, default=True)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

#### Organization Model:
```python
class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    msp_id = Column(String, unique=True, nullable=False)
    domain = Column(String)
    type = Column(String)  # peer, orderer
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

#### Channel Model:
```python
class Channel(Base):
    __tablename__ = "channels"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text)
    block_height = Column(Integer, default=0)
    organization_id = Column(String, ForeignKey("organizations.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

### ✅ 4. Authentication System

#### JWT Token Implementation:
```python
# core/auth.py
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        return username
    except JWTError:
        raise credentials_exception
```

#### Password Security:
```python
# core/security.py  
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)
```

### ✅ 5. API Endpoints Implementation

#### Authentication Endpoints:
```python
POST /api/v1/auth/login           # User login với JWT token
POST /api/v1/auth/register        # User registration
GET  /api/v1/auth/me              # Get current user info
POST /api/v1/auth/refresh         # Refresh access token
```

#### User Management Endpoints:
```python
GET    /api/v1/users/              # List all users (paginated, admin only)
GET    /api/v1/users/{user_id}     # Get user by ID
POST   /api/v1/users/              # Create user (admin only)
PUT    /api/v1/users/{user_id}     # Update user
DELETE /api/v1/users/{user_id}     # Delete user (admin only)
```

#### Channel Endpoints:
```python
GET    /api/v1/channels/           # List channels (paginated)
POST   /api/v1/channels/           # Create channel (admin only)
GET    /api/v1/channels/{id}       # Get channel by ID
PUT    /api/v1/channels/{id}       # Update channel (admin only)
DELETE /api/v1/channels/{id}       # Delete channel (admin only)
```

#### Explorer Endpoints (Blockchain Data):
```python
GET    /api/v1/explorer/health     # Network health status
GET    /api/v1/explorer/blocks     # Get recent blocks (paginated)
GET    /api/v1/explorer/blocks/{block_num}  # Get block by number
GET    /api/v1/explorer/transactions        # Get recent transactions (paginated)
GET    /api/v1/explorer/transactions/{tx_id} # Get transaction by ID
```

#### Chaincode Operation Endpoints:
```python
GET    /api/v1/chaincode/          # List available chaincodes
POST   /api/v1/chaincode/query     # Query chaincode (authenticated users)
POST   /api/v1/chaincode/invoke    # Invoke chaincode (authenticated users)
```

### ✅ 6. Gateway Service Integration
```python
# services/gateway_client.py
class GatewayClient:
    def __init__(self):
        self.gateway_url = "http://localhost:8001"
    
    async def query_chaincode(self, channel_name: str, chaincode_name: str, 
                            function_name: str, args: List[str]):
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.gateway_url}/api/chaincode/query",
                json={
                    "channelName": channel_name,
                    "chaincodeName": chaincode_name,
                    "functionName": function_name,
                    "args": args
                }
            )
            return response.json()
    
    async def invoke_chaincode(self, channel_name: str, chaincode_name: str,
                             function_name: str, args: List[str]):
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.gateway_url}/api/chaincode/invoke",
                json={
                    "channelName": channel_name,
                    "chaincodeName": chaincode_name,
                    "functionName": function_name,
                    "args": args
                }
            )
            return response.json()
```

### ✅ 7. Database Configuration
```python
# database.py
SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///./ibn_dev.db"

engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
AsyncSessionLocal = sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

### ✅ 8. Deployment Strategy
Backend API được chạy độc lập không cần Docker Compose phức tạp:
```bash
# Start backend API
cd backend
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8002

# Database file được tạo tự động
# ibn_dev.db sẽ xuất hiện trong thư mục backend/
```

**Lý do không dùng Docker cho backend:**
- SQLite database không cần container
- Development environment đơn giản hơn
- Hot reload nhanh hơn với --reload flag
- Dễ debug và test local

## 🧪 Testing Phase 3

### ✅ Database Setup và Seeding:
```python
# Create admin user
admin_data = {
    "username": "admin",
    "email": "admin@ibn.ictu.edu.vn", 
    "password": "admin123",
    "role": "admin"
}

# Create demo user  
demo_data = {
    "username": "demo",
    "email": "demo@ibn.ictu.edu.vn",
    "password": "demo123", 
    "role": "user"
}

# Create channels
channels = [
    {"name": "mychannel", "description": "Main application channel"},
    {"name": "testchan", "description": "Test channel for development"}
]
```

### ✅ API Testing:
```bash
# Register user
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"testpass123"}'

# Login và get token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Query blockchain (with JWT token)
curl -X POST http://localhost:8000/api/v1/chaincode/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"channel_name":"testchan","chaincode_name":"basic","function_name":"GetAllAssets","args":[]}'

# Invoke blockchain (with JWT token)  
curl -X POST http://localhost:8000/api/v1/chaincode/invoke \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"channel_name":"testchan","chaincode_name":"basic","function_name":"CreateAsset","args":["asset5","purple","15","Alice","800"]}'
```

### ✅ Expected Results:
- ✅ FastAPI server running on port 8000
- ✅ PostgreSQL database với seeded data
- ✅ JWT authentication working  
- ✅ All CRUD endpoints functional
- ✅ Blockchain operations working through Gateway API
- ✅ Role-based access control enforced

## 🔒 Security Features
- ✅ **JWT Authentication**: Secure token-based authentication
- ✅ **Password Hashing**: bcrypt hashing for password storage
- ✅ **Role-based Access**: Admin và user roles với proper permissions
- ✅ **Input Validation**: Pydantic schemas for request validation
- ✅ **CORS Configuration**: Cross-origin resource sharing
- ✅ **SQL Injection Protection**: SQLAlchemy ORM parameterized queries

## 🎯 API Documentation
- **Swagger UI**: http://localhost:8002/docs
- **ReDoc**: http://localhost:8002/redoc
- **OpenAPI Schema**: http://localhost:8002/openapi.json


## 🔗 Next Phase
**Phase 4**: Frontend development với React để hoàn thiện full-stack application

## 📝 Rebuild Commands
```bash
# Initialize database với seed data
cd backend
python3 init_db.py

# Start backend API
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8002

# Check backend API
curl http://localhost:8002/docs

# Check database
sqlite3 ibn_dev.db "SELECT * FROM users;"

# Test authentication
curl -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Test blockchain operations
curl -X POST http://localhost:8002/api/v1/chaincode/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -d '{"channel_name":"mychannel","chaincode_name":"basic","function_name":"GetAllAssets","args":[]}'
```

## 🐛 Common Issues và Solutions
1. **Database Lock**: SQLite không support multiple concurrent writers - sử dụng connection pooling
2. **JWT Token Issues**: Check SECRET_KEY trong .env file và token expiration settings
3. **Gateway API Integration**: Ensure Gateway API running on port 8001
4. **CORS Errors**: Verify CORS middleware configured với correct origins
5. **Import Errors**: Check Python path và install all requirements
6. **Port Conflicts**: Ensure port 8002 không bị chiếm bởi process khác

## 🔧 Environment Variables
```bash
# .env file
APP_NAME=IBN Backend API
VERSION=0.0.1
DEBUG=True
SECRET_KEY=your-secret-key-min-32-characters-long
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
DATABASE_URL=sqlite+aiosqlite:///./ibn_dev.db
GATEWAY_API_URL=http://localhost:8001
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
```

## 📊 Database Schema Summary
```sql
-- Users table with role-based access (UUID primary key)
users: id (UUID), username, email, password_hash, full_name, is_superuser, 
       is_active, organization_id, created_at, updated_at

-- Organizations table (UUID primary key)
organizations: id (UUID), name, msp_id, domain, type, description, 
               is_active, created_at, updated_at

-- Channels table (UUID primary key)
channels: id (UUID), name, description, block_height, organization_id,
          is_active, created_at, updated_at

-- Chaincodes table (UUID primary key)
chaincodes: id (UUID), name, version, channel_id, language, description,
            is_active, created_at, updated_at

-- Blocks cache table (for Explorer)
blocks_cache: id, channel_id, block_number, block_hash, previous_hash,
              data_hash, tx_count, timestamp, created_at

-- Transactions cache table (for Explorer)  
transactions_cache: id, channel_id, tx_id, block_number, timestamp,
                    creator_msp_id, type, validation_code, created_at

-- Audit logs table
audit_logs: id, user_id, action, resource_type, resource_id, details,
            ip_address, created_at
```

---
*Phase 3 Status: ✅ Complete - Backend System Ready for Frontend Integration*