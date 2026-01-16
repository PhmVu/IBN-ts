#!/bin/bash
###############################################################################
# Create Enrolled User Script (Using Fabric CA CLI)
# 
# This script creates a fully enrolled user by:
# 1. Registering with Fabric CA using CLI
# 2. Enrolling to get certificate
# 3. Storing in backend database and wallet
# 
# Usage:
#   ./create-user-with-ca-cli.sh <username> <email> <password>
# 
# Example:
#   ./create-user-with-ca-cli.sh alice alice@example.com Alice123456
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ "$#" -ne 3 ]; then
    echo -e "${RED}Error: Invalid arguments${NC}"
    echo "Usage: $0 <username> <email> <password>"
    echo ""
    echo "Example:"
    echo "  $0 alice alice@example.com Alice123456"
    exit 1
fi

USERNAME=$1
EMAIL=$2
PASSWORD=$3

echo "============================================================"
echo "🔐 Creating Enrolled User with Fabric CA CLI"
echo "============================================================"
echo ""
echo "Username: $USERNAME"
echo "Email: $EMAIL"
echo "Password: ***"
echo ""

# Step 1: Register user with Fabric CA using admin
echo "Step 1: Registering user with Fabric CA..."
echo ""

ENROLL_SECRET=$(docker exec ibnts-ca.ibn.ictu.edu.vn fabric-ca-client register \
  --id.name "$USERNAME" \
  --id.type client \
  --id.affiliation "" \
  --id.maxenrollments -1 \
  --url http://localhost:7054 \
  --caname ca-ibn \
  --mspdir /etc/hyperledger/fabric-ca-server/msp \
  -u http://admin:adminpw@localhost:7054 \
  2>&1 | grep -oP 'Password: \K\S+' || echo "")

if [ -z "$ENROLL_SECRET" ]; then
    echo -e "${RED}❌ Failed to register user with CA${NC}"
    echo "Trying alternative method..."
    
    # Try with explicit admin enrollment first
    docker exec ibnts-ca.ibn.ictu.edu.vn fabric-ca-client enroll \
      -u http://admin:adminpw@localhost:7054 \
      --caname ca-ibn \
      --mspdir /tmp/admin-msp
    
    ENROLL_SECRET=$(docker exec ibnts-ca.ibn.ictu.edu.vn fabric-ca-client register \
      --id.name "$USERNAME" \
      --id.type client \
      --id.affiliation "" \
      --id.maxenrollments -1 \
      --url http://localhost:7054 \
      --caname ca-ibn \
      --mspdir /tmp/admin-msp \
      2>&1 | grep -oP 'Password: \K\S+' || echo "")
fi

if [ -z "$ENROLL_SECRET" ]; then
    echo -e "${RED}❌ Failed to get enrollment secret${NC}"
    exit 1
fi

echo -e "${GREEN}✅ User registered with CA${NC}"
echo "Enrollment secret: $ENROLL_SECRET"
echo ""

# Step 2: Enroll user to get certificate
echo "Step 2: Enrolling user to get certificate..."
echo ""

docker exec ibnts-ca.ibn.ictu.edu.vn fabric-ca-client enroll \
  -u http://"$USERNAME":"$ENROLL_SECRET"@localhost:7054 \
  --caname ca-ibn \
  --mspdir /tmp/"$USERNAME"-msp

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to enroll user${NC}"
    exit 1
fi

echo -e "${GREEN}✅ User enrolled successfully${NC}"
echo ""

# Step 3: Get certificate and private key
echo "Step 3: Extracting certificate and private key..."
echo ""

CERT=$(docker exec ibnts-ca.ibn.ictu.edu.vn cat /tmp/"$USERNAME"-msp/signcerts/cert.pem)
PRIVATE_KEY=$(docker exec ibnts-ca.ibn.ictu.edu.vn sh -c "cat /tmp/$USERNAME-msp/keystore/*_sk")

if [ -z "$CERT" ] || [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}❌ Failed to extract certificate or private key${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Certificate and private key extracted${NC}"
echo ""

# Step 4: Create user in backend database
echo "Step 4: Creating user in backend database..."
echo ""

# Create a temp script to run in backend container
cat > /tmp/create-user-db.js << EOF
const { db } = require('./dist/config/knex');
const { PasswordService } = require('./dist/services/auth/PasswordService');
const { walletService } = require('./dist/services/wallet/WalletService');

async function createUser() {
    try {
        // Get organization
        const org = await db('organizations').where({ is_active: true }).first();
        if (!org) throw new Error('No active organization found');

        // Hash password
        const passwordHash = await PasswordService.hashPassword('$PASSWORD');

        // Create user
        const [userId] = await db('users').insert({
            username: '$USERNAME',
            email: '$EMAIL',
            password_hash: passwordHash,
            organization_id: org.id,
            role: 'user',
            enrolled: false,
            created_at: new Date(),
            updated_at: new Date()
        }).returning('id');

        console.log('User created with ID:', userId);

        // Store in wallet
        const cert = \`$CERT\`;
        const privateKey = \`$PRIVATE_KEY\`;
        
        const walletLabel = \`$USERNAME@\${org.msp_id.toLowerCase()}\`;
        await walletService.put(walletLabel, {
            certificate: cert,
            privateKey: privateKey,
            mspId: org.msp_id,
            type: 'X.509'
        });

        console.log('Wallet stored:', walletLabel);

        // Get wallet ID
        const wallet = await db('wallets').where({ label: walletLabel }).first();
        
        // Extract cert serial (simple method)
        const certSerial = require('crypto').createHash('sha256').update(cert).digest('hex').substring(0, 40);

        // Update user
        await db('users').where({ id: userId }).update({
            enrolled: true,
            enrolled_at: new Date(),
            wallet_id: wallet.id,
            certificate_serial: certSerial,
            updated_at: new Date()
        });

        console.log('User updated with enrollment info');
        console.log('SUCCESS');
        
        process.exit(0);
    } catch (error) {
        console.error('ERROR:', error.message);
        process.exit(1);
    } finally {
        await db.destroy();
    }
}

createUser();
EOF

# Copy script to container and run
docker cp /tmp/create-user-db.js ibnts-backend:/app/create-user-db.js
RESULT=$(docker exec ibnts-backend node create-user-db.js 2>&1)

if echo "$RESULT" | grep -q "SUCCESS"; then
    echo -e "${GREEN}✅ User created in database${NC}"
    echo ""
    echo "============================================================"
    echo -e "${GREEN}✅ User created and enrolled successfully!${NC}"
    echo "============================================================"
    echo ""
    echo "User Details:"
    echo "  Username: $USERNAME"
    echo "  Email: $EMAIL"
    echo "  Password: $PASSWORD"
    echo "  Enrolled: Yes"
    echo ""
    echo "You can now login with:"
    echo "  Username: $USERNAME"
    echo "  Password: $PASSWORD"
    echo ""
else
    echo -e "${RED}❌ Failed to create user in database${NC}"
    echo "$RESULT"
    exit 1
fi

# Cleanup
rm -f /tmp/create-user-db.js
docker exec ibnts-backend rm -f /app/create-user-db.js
docker exec ibnts-ca.ibn.ictu.edu.vn rm -rf /tmp/"$USERNAME"-msp

echo "Done!"
