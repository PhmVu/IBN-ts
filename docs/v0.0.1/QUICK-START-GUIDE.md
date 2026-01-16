# 🚀 HƯỚNG DẪN KHỞI CHẠY HỆ THỐNG IBN v0.0.1

## 📋 YÊU CẦU HỆ THỐNG

- **OS**: Windows 10/11 với WSL2
- **Docker**: Đã cài đặt và chạy
- **Node.js**: v16+ (cho Frontend)
- **Python**: v3.8+ (cho Backend/Gateway)

## 🔧 CÁC BƯỚC KHỞI CHẠY

### **Bước 1: Chuẩn bị môi trường**

```bash
# Mở WSL terminal
wsl

# Di chuyển đến thư mục dự án
cd /mnt/d/Blockchain/IBN

# Cấp quyền thực thi cho script
chmod +x ibn-quickstart.sh
```

### **Bước 2: Khởi động Hyperledger Fabric Network**

```bash
# Khởi động IBN Network với Docker (cần password Docker)
echo '171004' | sudo -S ./ibn-quickstart.sh start

# Kiểm tra trạng thái network
./ibn-quickstart.sh status

# Test network functionality
./ibn-quickstart.sh test
```

**Kết quả mong đợi:**
- ✅ Orderer: `orderer.ictu.edu.vn` - Up
- ✅ Peer: `peer0.ibn.ictu.edu.vn` - Up  
- ✅ CA: `ca.ibn.ictu.edu.vn` - Up
- ✅ CouchDB: `couchdb0` - Up
- ✅ Chaincode: `dev-peer0.ibn.ictu.edu.vn-basic_1.0` - Up

### **Bước 3: Khởi động Gateway API**

```bash
# Mở terminal mới (WSL)
cd /mnt/d/Blockchain/IBN/gateway

# Kích hoạt virtual environment
source venv/bin/activate

# Khởi động Gateway API
uvicorn app.main:app --host 0.0.0.0 --port 9001 --reload
```

**Kết quả mong đợi:**
```
INFO:     Uvicorn running on http://0.0.0.0:9001 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### **Bước 4: Khởi động Backend API**

```bash
# Mở terminal mới (WSL)
cd /mnt/d/Blockchain/IBN/backend

# Khởi động Backend API
uvicorn app.main:app --host 0.0.0.0 --port 9002 --reload
```

**Kết quả mong đợi:**
```
INFO:     Uvicorn running on http://0.0.0.0:9002 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### **Bước 5: Khởi động Frontend**

```bash
# Mở terminal mới (WSL)
cd /mnt/d/Blockchain/IBN/frontend

# Khởi động Frontend
npm run dev
```

**Kết quả mong đợi:**
```
VITE v4.5.14  ready in 1037 ms
➜  Local:   http://localhost:3001/
➜  Network: http://10.255.255.254:3001/
```

## 🌐 TRUY CẬP HỆ THỐNG

### **Frontend (Giao diện chính)**
- **URL**: `http://localhost:3001/`
- **Tài khoản mặc định**:
  - **Admin**: `admin` / `admin123`
  - **Demo**: `demo` / `demo123`

### **API Endpoints**
- **Gateway API**: `http://localhost:9001/`
- **Backend API**: `http://localhost:9002/`
- **API Documentation**: 
  - Gateway: `http://localhost:9001/docs`
  - Backend: `http://localhost:9002/docs`

### **Hyperledger Fabric**
- **Orderer**: `localhost:7050`
- **Peer**: `localhost:7051`
- **CA**: `localhost:7054`
- **CouchDB**: `localhost:5984`

## 🧪 KIỂM TRA HỆ THỐNG

### **Test API Health**

```bash
# Test Gateway API
curl http://localhost:9001/health

# Test Backend API
curl http://localhost:9002/health

# Test Login API
curl -X POST http://localhost:9002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

### **Test Frontend**

1. Mở trình duyệt và truy cập `http://localhost:3001/`
2. Đăng nhập với tài khoản `admin` / `admin123`
3. Kiểm tra các tính năng:
   - ✅ Dashboard
   - ✅ User Management
   - ✅ Channel Management
   - ✅ Chaincode Operations
   - ✅ Blockchain Explorer

## 🔧 QUẢN LÝ HỆ THỐNG

### **Dừng hệ thống**

```bash
# Dừng Frontend: Ctrl+C trong terminal Frontend

# Dừng Backend API: Ctrl+C trong terminal Backend

# Dừng Gateway API: Ctrl+C trong terminal Gateway

# Dừng Fabric Network
./ibn-quickstart.sh stop
```

### **Restart hệ thống**

```bash
# Restart Fabric Network
./ibn-quickstart.sh restart

# Restart APIs: Dừng và khởi động lại từng service
```

### **Kiểm tra logs**

```bash
# Xem logs Fabric Network
docker-compose -f network/docker-compose.yaml logs

# Xem logs của container cụ thể
docker logs <container_name>
```

## 🐛 XỬ LÝ LỖI THƯỜNG GẶP

### **Lỗi Docker không chạy**
```bash
# Kiểm tra Docker status
sudo systemctl status docker

# Khởi động Docker
sudo systemctl start docker
```

### **Lỗi port đã được sử dụng**
```bash
# Kiểm tra port đang sử dụng
netstat -tulpn | grep :9001
netstat -tulpn | grep :9002
netstat -tulpn | grep :3001

# Kill process sử dụng port
sudo kill -9 <PID>
```

### **Lỗi Frontend không load**
```bash
# Clear cache và reinstall
cd /mnt/d/Blockchain/IBN/frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### **Lỗi API không kết nối**
```bash
# Kiểm tra API có chạy không
ps aux | grep uvicorn

# Restart API services
```

## 📊 TRẠNG THÁI HỆ THỐNG

### **Các service cần chạy:**
- ✅ **Hyperledger Fabric Network** (5 containers)
- ✅ **Gateway API** (port 9001)
- ✅ **Backend API** (port 9002)  
- ✅ **Frontend** (port 3001)

### **Kiểm tra nhanh:**
```bash
# Kiểm tra containers
docker ps

# Kiểm tra APIs
curl http://localhost:9001/health
curl http://localhost:9002/health

# Kiểm tra Frontend
curl http://localhost:3001
```

## 🎯 TÍNH NĂNG HỆ THỐNG

### **IBN v0.0.1 MVP bao gồm:**
- 🔐 **Authentication**: JWT-based login
- 👥 **User Management**: CRUD operations
- 🔗 **Channel Management**: Blockchain channel operations
- ⚡ **Chaincode Operations**: Query/Invoke smart contracts
- 🔍 **Blockchain Explorer**: View blocks and transactions
- 📊 **Dashboard**: System overview and analytics

### **Mock Data Strategy:**
- Blockchain operations sử dụng mock data
- User và Channel management sử dụng real data (SQLite)
- Sẵn sàng chuyển sang real blockchain data trong v0.0.2

## 🚀 SẴN SÀNG CHO VERSION 0.0.2

Hệ thống v0.0.1 MVP đã hoàn thành và sẵn sàng để phát triển lên v0.0.2 với:
- Real blockchain data integration
- Certificate-based authentication
- RBAC (Role-Based Access Control)
- Organization context management
- Enhanced error handling

---

**📞 Hỗ trợ**: Nếu gặp vấn đề, hãy kiểm tra logs và đảm bảo tất cả services đang chạy đúng port.

**🎉 Chúc bạn sử dụng hệ thống IBN thành công!**
