#!/bin/bash
# ============================================================================
# Create CouchDB Indexes for NetworkCore Chaincode
# Fixes: GetChaincodeHistory, QueryAuditTrail, GenerateComplianceReport
# ============================================================================

COUCHDB_URL="http://admin:adminpw@localhost:5984"
DATABASE="ibnmain"

echo "Creating CouchDB indexes for NetworkCore chaincode..."

# ============================================================================
# Index 1: Audit Trail by Timestamp
# For: QueryAuditTrail, GenerateComplianceReport
# ============================================================================
echo ""
echo "[1/3] Creating audit-timestamp index..."
curl -X POST "$COUCHDB_URL/$DATABASE/_index" \
  -H "Content-Type: application/json" \
  -d '{
    "index": {
      "fields": ["timestamp", "eventType", "actor"]
    },
    "name": "audit-timestamp-index",
    "type": "json"
  }'

# ============================================================================
# Index 2: Audit Trail by Event Type
# For: QueryAuditTrail filtered queries
# ============================================================================
echo ""
echo "[2/3] Creating audit-eventtype index..."
curl -X POST "$COUCHDB_URL/$DATABASE/_index" \
  -H "Content-Type: application/json" \
  -d '{
    "index": {
      "fields": ["eventType", "timestamp"]
    },
    "name": "audit-eventtype-index",
    "type": "json"
  }'

# ============================================================================
# Index 3: Chaincode Proposals by Name and Version
# For: GetChaincodeHistory
# ============================================================================
echo ""
echo "[3/3] Creating chaincode-history index..."
curl -X POST "$COUCHDB_URL/$DATABASE/_index" \
  -H "Content-Type: application/json" \
  -d '{
    "index": {
      "fields": ["chaincodeName", "version", "proposedAt"]
    },
    "name": "chaincode-history-index",
    "type": "json"
  }'

# ============================================================================
# Verify Indexes
# ============================================================================
echo ""
echo "============================================"
echo "Verifying indexes..."
echo "============================================"
curl -X GET "$COUCHDB_URL/$DATABASE/_index"

echo ""
echo "✓ CouchDB indexes created successfully!"
echo ""
echo "Now you can test:"
echo "  - GetChaincodeHistory"
echo "  - QueryAuditTrail" 
echo "  - GenerateComplianceReport"
