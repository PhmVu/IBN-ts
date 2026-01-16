# Security Hardening Guide - v0.0.4

**Purpose:** Production security enhancements for governance features  
**Priority:** High  
**Compliance:** ISO 27001, NIST, GDPR

---

## 🔒 Security Overview

### Key Areas
1. **TLS Encryption** - All network communication
2. **Access Control** - Role-based permissions
3. **Rate Limiting** - DDoS protection
4. **Input Validation** - SQL injection, XSS prevention
5. **Audit Logging** - Complete activity tracking
6. **Secret Management** - Vault integration

---

## 🛡️ Implementation Checklist

### 1. Enable TLS for Fabric Network

**Update connection.json:**
```json
{
  "address": "ibnts-network-core-ccaas:9999",
  "dial_timeout": "10s",
  "tls_required": true,
  "tls_ca_cert_file": "/crypto/ordererOrganizations/ictu.edu.vn/ca/ca.ictu.edu.vn-cert.pem",
  "tls_client_cert_file": "/crypto/peerOrganizations/ibn.ictu.edu.vn/users/Admin@ibn.ictu.edu.vn/tls/client.crt",
  "tls_client_key_file": "/crypto/peerOrganizations/ibn.ictu.edu.vn/users/Admin@ibn.ictu.edu.vn/tls/client.key"
}
```

**Update Dockerfile.ccaas:**
```dockerfile
# Add TLS certificates
COPY crypto/ca-cert.pem /crypto/ca-cert.pem
COPY crypto/client-cert.pem /crypto/client-cert.pem
COPY crypto/client-key.pem /crypto/client-key.pem

ENV CORE_PEER_TLS_ENABLED=true
ENV CORE_PEER_TLS_ROOTCERT_FILE=/crypto/ca-cert.pem
```

---

### 2. Implement Rate Limiting

**Backend Middleware:**
```typescript
import rateLimit from 'express-rate-limit';

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later'
});

// Governance endpoints - stricter limits
const governanceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // 50 requests per window
  message: 'Rate limit exceeded for governance operations'
});

app.use('/api/v1', apiLimiter);
app.use('/api/v1/governance', governanceLimiter);
```

---

### 3. Input Validation & Sanitization

**Validation Middleware:**
```typescript
import { body, param, validationResult } from 'express-validator';
import sanitizeHtml from 'sanitize-html';

// Organization registration validation
export const validateOrgRegistration = [
  body('orgId')
    .isLength({ min: 3, max: 50 })
    .matches(/^[A-Z0-9_]+$/)
    .customSanitizer(value => sanitizeHtml(value)),
  
  body('name')
    .isLength({ min: 3, max: 100 })
    .customSanitizer(value => sanitizeHtml(value)),
  
  body('contactEmail')
    .isEmail()
    .normalizeEmail(),
  
  body('peerEndpoints')
    .isArray()
    .custom((endpoints) => {
      return endpoints.every(url => /^[a-z0-9.-]+:[0-9]{4,5}$/.test(url));
    }),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  }
];

// Usage
router.post('/organizations/register', validateOrgRegistration, orgController.register);
```

---

### 4. Enhanced Access Control

**Role-Based Middleware:**
```typescript
export enum Role {
  SuperAdmin = 'SuperAdmin',
  OrgAdmin = 'OrgAdmin',
  User = 'User'
}

export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

// Usage
router.post('/organizations/register', 
  authMiddleware,
  requireRole(Role.SuperAdmin),
  orgController.register
);
```

---

### 5. Comprehensive Audit Logging

**Audit Middleware:**
```typescript
export const auditMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Capture original send
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    // Log to audit trail
    fabricService.recordAuditEvent({
      eventType: 'API_REQUEST',
      actor: req.user?.userId || 'anonymous',
      action: `${req.method} ${req.path}`,
      resource: req.path,
      details: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('user-agent')
      }
    }).catch(err => console.error('Audit logging failed:', err));

    return originalSend.call(this, data);
  };

  next();
};

app.use('/api/v1/governance', auditMiddleware);
```

---

### 6. Secret Management with Vault

**Vault Integration:**
```typescript
import Vault from 'node-vault';

class SecretManager {
  private vault: any;

  constructor() {
    this.vault = Vault({
      endpoint: process.env.VAULT_URL,
      token: process.env.VAULT_TOKEN
    });
  }

  async getSecret(path: string): Promise<any> {
    try {
      const result = await this.vault.read(`secret/data/${path}`);
      return result.data.data;
    } catch (error) {
      throw new Error(`Failed to read secret: ${path}`);
    }
  }

  async setSecret(path: string, data: any): Promise<void> {
    await this.vault.write(`secret/data/${path}`, { data });
  }
}

// Usage
const secretManager = new SecretManager();
const dbPassword = await secretManager.getSecret('database/postgres/password');
```

---

## 🔍 Security Testing

### Penetration Testing Checklist
- [ ] SQL injection attempts blocked
- [ ] XSS attacks prevented
- [ ] CSRF protection verified
- [ ] Rate limiting effective
- [ ] Authentication bypass blocked
- [ ] Authorization properly enforced
- [ ] Sensitive data encrypted
- [ ] Secrets not in logs

### Tools
```bash
# SQL injection testing
sqlmap -u "http://localhost:37080/api/v1/auth/login" --data="username=admin"

# XSS testing
xsser --url "http://localhost:37080/api/v1/governance/organizations"

# Load testing (DDoS simulation)
k6 run load-test.js

# Security headers check
curl -I http://localhost:37080 | grep -E "X-|Strict|Content-Security"
```

---

## 📋 Security Headers

**Helmet.js Configuration:**
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'same-origin' }
}));
```

---

## ✅ Production Security Checklist

### Infrastructure
- [ ] TLS enabled for all connections
- [ ] Firewall configured (allow only necessary ports)
- [ ] SSH key-based authentication only
- [ ] Regular security updates applied
- [ ] Intrusion detection system (IDS) active

### Application
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] SQL injection protection verified
- [ ] XSS protection enabled
- [ ] CSRF tokens implemented
- [ ] Security headers set
- [ ] Secrets in Vault, not code

### Monitoring
- [ ] Security event logging enabled
- [ ] Anomaly detection configured
- [ ] Alert thresholds set
- [ ] Incident response plan documented
- [ ] Regular security audits scheduled

---

**Priority:** Critical  
**Review Frequency:** Monthly  
**Last Security Audit:** TBD  
**Last Updated:** 2026-01-16
