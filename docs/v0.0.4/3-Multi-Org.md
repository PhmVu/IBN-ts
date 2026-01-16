# Multi-Organization Support Guide - v0.0.4

**Purpose:** Enable multiple organizations to join and participate in the IBN governance platform  
**Estimated Duration:** 1 week  
**Complexity:** Medium

---

## 🎯 Objectives

1. Create organization onboarding workflow
2. Implement MSP configuration management
3. Enable peer endpoint registration
4. Test with 2+ organizations
5. Verify multi-org endorsement

---

## 📋 Onboarding Workflow

### Step-by-Step Process

1. **Registration Request** - New org submits registration via UI
2. **Admin Review** - SuperAdmin reviews org details
3. **Admin Approval** - SuperAdmin approves organization
4. **MSP Setup** - Organization configures MSP and CA
5. **Peer Registration** - Organization registers peer endpoints
6. **Certificate Enrollment** - Organization enrolls users
7. **Channel Joining** - Organization joins relevant channels
8. **Verification** - Test transactions and endorsements

---

## 🏗️ Technical Implementation

### 1. Organization Registration Form

**Frontend Component:** `OrganizationOnboarding.tsx`

```tsx
const steps = [
  { title: 'Basic Information', component: BasicInfoStep },
  { title: 'MSP Configuration', component: MSPConfigStep },
  { title: 'Peer Endpoints', component: PeerEndpointsStep },
  { title: 'Contact Details', component: ContactStep },
  { title: 'Review & Submit', component: ReviewStep }
];

const OrganizationOnboarding: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});

  const handleNext = (stepData) => {
    setFormData({ ...formData, ...stepData });
    setCurrentStep(currentStep + 1);
  };

  return (
    <div className="onboarding-wizard">
      <Stepper steps={steps} currentStep={currentStep} />
      {steps[currentStep].component({ onNext: handleNext, data: formData })}
    </div>
  );
};
```

---

### 2. MSP Configuration

Organizations must provide:

```json
{
  "mspId": "NewOrgMSP",
  "caUrl": "https://ca.neworg.com:7054",
  "tlsCACert": "-----BEGIN CERTIFICATE-----\n...",
  "adminCert": "-----BEGIN CERTIFICATE-----\n...",
  "rootCert": "-----BEGIN CERTIFICATE-----\n..."
}
```

**Backend Validation:**
```typescript
async validateMSPConfig(mspConfig: MSPConfig): Promise<boolean> {
  // Verify certificate validity
  // Check CA connectivity
  // Validate MSP ID uniqueness
  return true;
}
```

---

### 3. Peer Endpoint Registration

```typescript
interface PeerEndpoint {
  url: string; // e.g., "peer0.neworg.com:7051"
  tlsCert: string;
  grpcOptions?: {
    'grpc.keepalive_time_ms': number;
    'grpc.keepalive_timeout_ms': number;
  };
}
```

**Backend Service:**
```typescript
async registerPeerEndpoint(orgId: string, endpoint: PeerEndpoint): Promise<void> {
  // Test connectivity
  await this.testPeerConnection(endpoint);
  
  // Store in database
  await this.peerRepository.save({
    orgId,
    endpoint: endpoint.url,
    tlsCert: endpoint.tlsCert
  });
}
```

---

### 4. Certificate Enrollment Flow

**User Enrollment Steps:**

1. Organization admin accesses CA
2. Generates enrollment certificate
3. Uploads to IBN platform
4. Platform verifies certificate
5. User account linked to certificate

**Implementation:**
```typescript
async enrollUser(orgId: string, enrollmentCert: string): Promise<User> {
  // Verify cert is signed by org's CA
  const isValid = await this.verifyCertificate(enrollmentCert, orgId);
  
  if (!isValid) {
    throw new Error('Invalid certificate');
  }

  // Create user account
  const user = await this.userService.create({
    orgId,
    certificate: enrollmentCert,
    role: 'OrgAdmin'
  });

  return user;
}
```

---

## 🧪 Testing Multi-Org Setup

### Test Scenario 1: Two Organizations

**Organizations:**
- IBN (existing) - IBNMSP
- TestOrg (new) - TestOrgMSP

**Test Steps:**

```bash
# 1. Register TestOrg
curl -X POST http://localhost:37080/api/v1/governance/organizations/register \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "orgId": "TESTORG",
    "name": "Test Organization",
    "mspId": "TestOrgMSP",
    ...
  }'

# 2. Approve TestOrg
curl -X POST http://localhost:37080/api/v1/governance/organizations/TESTORG/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 3. Submit chaincode proposal requiring both orgs
curl -X POST http://localhost:37080/api/v1/governance/chaincodes/proposals \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "chaincodeName": "multi-org-cc",
    "endorsementPolicy": "AND('\''IBNMSP.peer'\'','\''TestOrgMSP.peer'\'')",
    ...
  }'

# 4. Verify both orgs can approve
# - IBN admin approves
# - TestOrg admin approves
# - Proposal status should be APPROVED
```

---

### Test Scenario 2: Channel Membership

```bash
# Add TestOrg to ibnmain channel
curl -X POST http://localhost:37080/api/v1/governance/channels/ibnmain/organizations \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"orgId": "TESTORG"}'

# Verify TestOrg can query channel
docker exec testorg-peer0 peer channel getinfo -c ibnmain
```

---

## ✅ Multi-Org Checklist

### Pre-Launch
- [ ] Organization onboarding wizard complete
- [ ] MSP configuration validation working
- [ ] Peer endpoint registration functional
- [ ] Certificate enrollment tested
- [ ] User role management implemented

### Testing
- [ ] 2 test organizations created
- [ ] Both orgs can submit proposals
- [ ] Multi-org endorsement working
- [ ] Channel membership changes tested
- [ ] Cross-org transactions verified

### Documentation
- [ ] Onboarding guide for new orgs
- [ ] MSP configuration examples
- [ ] Troubleshooting guide
- [ ] Security best practices

---

## 🚨 Common Issues

### Issue: "MSP ID already exists"
**Solution:** Choose a unique MSP ID not used by any existing organization

### Issue: "Cannot connect to peer"
**Solution:** Verify peer endpoint is accessible from network and TLS cert is valid

### Issue: "Endorsement policy not satisfied"
**Solution:** Ensure all required organizations have approved the proposal

---

## 📚 Resources

- [Hyperledger Fabric MSP](https://hyperledger-fabric.readthedocs.io/en/release-2.5/msp.html)
- [Multi-Org Network Tutorial](https://hyperledger-fabric.readthedocs.io/en/release-2.5/test_network.html)
- [Certificate Management](https://hyperledger-fabric-ca.readthedocs.io/)

---

**Estimated Duration:** 5-7 days  
**Prerequisites:** Backend & Frontend complete, Understanding of Fabric MSP  
**Last Updated:** 2026-01-16
