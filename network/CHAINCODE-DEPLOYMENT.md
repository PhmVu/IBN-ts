# Chaincode Deployment Guide

Hướng dẫn deploy chaincode lên Fabric network cho IBN with TypeScript.

## Yêu cầu

- Docker và Docker Compose đang chạy
- Fabric network đã được setup và đang chạy
- Channels đã được tạo (testchan, ibnchan)

## Chaincode có sẵn

### Network Core Chaincode (`network-core`)
- **Location:** `chaincodes/network-core/`
- **Language:** Node.js
- **Mục đích:** Quản lý tầng network - identities, system configuration, network metadata
- **Lưu ý:** Tách biệt hoàn toàn với business chaincodes (như teatrace)

#### Functions:

**Network Management:**
- `InitLedger()` - Khởi tạo network configuration
- `GetNetworkConfig()` - Lấy cấu hình network
- `UpdateNetworkConfig(configJson)` - Cập nhật cấu hình network
- `GetSystemMetadata()` - Lấy metadata hệ thống

**Identity Management:**
- `RegisterIdentity(identityId, mspId, role, metadata)` - Đăng ký identity mới
- `GetIdentity(identityId)` - Lấy thông tin identity
- `UpdateIdentityStatus(identityId, status)` - Cập nhật trạng thái identity
- `IdentityExists(identityId)` - Kiểm tra identity có tồn tại
- `QueryIdentities(queryString)` - Query identities với CouchDB
- `GetIdentityHistory(identityId)` - Lấy lịch sử thay đổi của identity

## Deploy Chaincode

### Bước 1: Deploy chaincode

```bash
cd network
./deploy-chaincode.sh [CHAINCODE_NAME] [VERSION] [CHANNEL] [SEQUENCE]
```

**Ví dụ:**
```bash
# Deploy network-core chaincode lên testchan
./deploy-chaincode.sh network-core 1.0 testchan 1

# Deploy teatrace chaincode lên testchan
./deploy-chaincode.sh teatrace 1.0 testchan 1

# Deploy lên ibnchan
./deploy-chaincode.sh network-core 1.0 ibnchan 1
./deploy-chaincode.sh teatrace 1.0 ibnchan 1
```

**Tham số:**
- `CHAINCODE_NAME`: Tên chaincode - mặc định: network-core
- `VERSION`: Phiên bản chaincode - mặc định: 1.0
- `CHANNEL`: Tên channel - mặc định: testchan
- `SEQUENCE`: Sequence number - mặc định: 1

**Script sẽ tự động:**
1. Phát hiện ngôn ngữ (Node.js)
2. Package chaincode
3. Install trên peer
4. Approve cho organization
5. Commit lên channel

### Bước 2: Initialize chaincode

Sau khi deploy, khởi tạo network:

```bash
./invoke-chaincode.sh network-core testchan InitLedger
```

### Bước 3: Test chaincode

#### Query (đọc dữ liệu)

```bash
./query-chaincode.sh [CHAINCODE_NAME] [CHANNEL] [FUNCTION] [PARAMS]
```

**Ví dụ:**
```bash
# Lấy network configuration
./query-chaincode.sh network-core testchan GetNetworkConfig

# Lấy system metadata
./query-chaincode.sh network-core testchan GetSystemMetadata

# Lấy thông tin identity
./query-chaincode.sh network-core testchan GetIdentity '["identity1"]'

# Query tất cả identities
./query-chaincode.sh network-core testchan QueryIdentities '{}'

# Kiểm tra identity có tồn tại
./query-chaincode.sh network-core testchan IdentityExists '["identity1"]'
```

#### Invoke (ghi dữ liệu)

```bash
./invoke-chaincode.sh [CHAINCODE_NAME] [CHANNEL] [FUNCTION] [PARAMS]
```

**Ví dụ:**
```bash
# Đăng ký identity mới
./invoke-chaincode.sh network-core testchan RegisterIdentity '["identity1", "IBNMSP", "admin", "{}"]'

# Cập nhật trạng thái identity
./invoke-chaincode.sh network-core testchan UpdateIdentityStatus '["identity1", "suspended"]'

# Cập nhật network config
./invoke-chaincode.sh network-core testchan UpdateNetworkConfig '{"status": "maintenance"}'
```

## Deploy qua Gateway API

Sau khi deploy, có thể sử dụng Gateway API để tương tác với chaincode:

### Query qua API

```bash
# Lấy network config
curl -X POST http://localhost:9001/api/v1/chaincode/query \
  -H "Content-Type: application/json" \
  -d '{
    "chaincode": "network-core",
    "args": {
      "channel": "testchan",
      "function": "GetNetworkConfig",
      "params": []
    }
  }'

# Query identities
curl -X POST http://localhost:9001/api/v1/chaincode/query \
  -H "Content-Type: application/json" \
  -d '{
    "chaincode": "network-core",
    "args": {
      "channel": "testchan",
      "function": "QueryIdentities",
      "params": ["{}"]
    }
  }'
```

### Invoke qua API

```bash
# Đăng ký identity
curl -X POST http://localhost:9001/api/v1/chaincode/invoke \
  -H "Content-Type: application/json" \
  -d '{
    "chaincode": "network-core",
    "args": {
      "channel": "testchan",
      "function": "RegisterIdentity",
      "params": ["identity1", "IBNMSP", "admin", "{}"]
    }
  }'
```

## Chaincode Architecture

### Separation of Concerns

- **Network Core Chaincode** (`network-core`): 
  - Quản lý tầng network
  - Identity management
  - System configuration
  - Network metadata
  
- **Business Chaincodes**:
  - `teatrace` - Tea supply chain tracking (✅ Ready)
    - Location: `chaincodes/teatrace/`
    - Language: Node.js
    - Functions: CreateBatch, GetBatch, TransferBatch, AddQualityRecord, AddCertification, QueryBatches, GetBatchHistory
  - Các chaincode khác theo nhu cầu

### Best Practices Implemented

✅ **Input Validation**: Tất cả inputs đều được validate
✅ **Error Handling**: Proper error handling với messages rõ ràng
✅ **Event Emission**: Emit events cho các operations quan trọng
✅ **History Tracking**: Lưu lịch sử thay đổi
✅ **Rich Queries**: Hỗ trợ CouchDB queries
✅ **Access Control**: Sử dụng transaction creator information
✅ **State Management**: Proper state management với error handling
✅ **Transaction Metadata**: Lưu timestamp và creator

## Kiểm tra trạng thái

### Xem chaincode đã được install

```bash
docker exec ibnts-peer0.ibn.ictu.edu.vn peer lifecycle chaincode queryinstalled
```

### Xem chaincode đã được commit

```bash
docker exec ibnts-peer0.ibn.ictu.edu.vn peer lifecycle chaincode querycommitted --channelID testchan
```

## Troubleshooting

### Lỗi: Chaincode không được tìm thấy
- Kiểm tra chaincode có trong thư mục `chaincodes/network-core/`
- Kiểm tra tên chaincode đúng: `network-core`

### Lỗi: Package ID không tìm thấy
- Chạy lại script deploy
- Kiểm tra log của peer container: `docker logs ibnts-peer0.ibn.ictu.edu.vn`

### Lỗi: Commit failed
- Kiểm tra channel đã được tạo chưa
- Kiểm tra peer đã join channel chưa
- Kiểm tra sequence number có đúng không

### Lỗi: Invalid JSON
- Đảm bảo JSON parameters được escape đúng
- Sử dụng single quotes cho shell và double quotes cho JSON

## Notes

- Mỗi lần update chaincode, tăng version và sequence
- Sequence phải tăng dần (1, 2, 3, ...)
- Network-core chỉ quản lý network layer
- Business chaincodes (như teatrace) được deploy riêng với tên khác
- Có thể deploy nhiều chaincodes cùng lúc trên cùng channel

## Example Workflow

1. **Deploy chaincode:**
   ```bash
   cd network
   ./deploy-chaincode.sh network-core 1.0 testchan 1
   ```

2. **Initialize:**
   ```bash
   ./invoke-chaincode.sh network-core testchan InitLedger
   ```

3. **Register identities:**
   ```bash
   ./invoke-chaincode.sh network-core testchan RegisterIdentity '["admin1", "IBNMSP", "admin", "{}"]'
   ./invoke-chaincode.sh network-core testchan RegisterIdentity '["user1", "IBNMSP", "user", "{}"]'
   ```

4. **Query:**
   ```bash
   ./query-chaincode.sh network-core testchan GetNetworkConfig
   ./query-chaincode.sh network-core testchan QueryIdentities '{}'
   ```
