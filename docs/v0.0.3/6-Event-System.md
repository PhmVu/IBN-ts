# 📡 IBN v0.0.3 - Event System

**Real-time Platform Events**

---

## ⏸️ NOT YET TESTED

> **Status:** Event system designed but not tested  
> **Reason:** Chaincode not functional for event emission  
> **Next:** Test after successful chaincode invocation

---

## 📋 Overview

The event system enables real-time updates across the platform when governance actions occur.

---

## 🎯 Event Types

### Organization Events
- `ORG_REGISTERED` - New organization registered
- `ORG_APPROVED` - Organization approved
- `ORG_SUSPENDED` - Organization suspended
- `ORG_REVOKED` - Organization revoked

### Chaincode Events
- `CHAINCODE_PROPOSED` - New chaincode proposal
- `CHAINCODE_APPROVED` - Proposal approved
- `CHAINCODE_REJECTED` - Proposal rejected
- `CHAINCODE_DEPLOYED` - Chaincode deployed

### Channel Events
- `CHANNEL_CREATED` - New channel created
- `CHANNEL_UPDATED` - Channel configuration updated
- `ORG_ADDED_TO_CHANNEL` - Organization added
- `ORG_REMOVED_FROM_CHANNEL` - Organization removed

### Policy Events
- `POLICY_CREATED` - New policy created
- `POLICY_UPDATED` - Policy updated
- `POLICY_ACTIVATED` - Policy activated
- `POLICY_DEACTIVATED` - Policy deactivated

---

## 🔄 Event Flow

```
Chaincode emits event
  ↓
Gateway API subscribes
  ↓
Backend API processes
  ↓
Frontend receives (WebSocket)
  ↓
UI updates in real-time
```

---

## 📊 Event Schema

```typescript
interface PlatformEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  actor: string;
  resource: string;
  resourceId: string;
  data: any;
  txId: string;
}
```

---

**Review:** ✅ Platform governance events thay vì tea batch events
