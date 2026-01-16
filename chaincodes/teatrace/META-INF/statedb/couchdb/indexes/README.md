# CouchDB Indexes for TeaTrace Chaincode

This directory contains CouchDB index definitions for optimizing query performance.

## Index Files

1. **indexOwner.json** - Index on `currentOwner` field
   - Optimizes: `GetBatchesByOwner()`
   - Query pattern: `{ "selector": { "currentOwner": "Farm1MSP" } }`

2. **indexStatus.json** - Index on `status` field
   - Optimizes: `GetBatchesByStatus()`
   - Query pattern: `{ "selector": { "status": "HARVESTED" } }`

3. **indexTeaType.json** - Index on `teaType` field
   - Optimizes: `GetBatchesByTeaType()`
   - Query pattern: `{ "selector": { "teaType": "Green" } }`

4. **indexQualityGrade.json** - Index on `qualityGrade` field
   - Optimizes: `GetBatchesByQualityGrade()`
   - Query pattern: `{ "selector": { "qualityGrade": "Premium" } }`

5. **indexStatusOwner.json** - Composite index on `status` + `currentOwner`
   - Optimizes: Complex queries filtering by both status and owner
   - Query pattern: `{ "selector": { "status": "PROCESSED", "currentOwner": "Processor1MSP" } }`

6. **indexTeaTypeQualityStatus.json** - Composite index on `teaType` + `qualityGrade` + `status`
   - Optimizes: Advanced filtering queries
   - Query pattern: `{ "selector": { "teaType": "Green", "qualityGrade": "Premium", "status": "PACKAGED" } }`

## How Indexes Work

When chaincode is installed, these index definitions are automatically deployed to CouchDB. They significantly improve query performance by:

1. **Reducing scan time**: Instead of scanning all documents, CouchDB uses the index
2. **Faster lookups**: O(log n) instead of O(n) complexity
3. **Better scalability**: Performance remains consistent as data grows

## Best Practices

✅ **DO:**
- Create indexes for frequently queried fields
- Use composite indexes for multi-field queries
- Keep index definitions in version control

❌ **DON'T:**
- Create too many indexes (increases write overhead)
- Index fields that are rarely queried
- Use indexes for fields with low cardinality (few unique values)

## Deployment

Indexes are automatically deployed when chaincode is installed:

```bash
peer lifecycle chaincode install teatrace.tar.gz
```

CouchDB will create these indexes in the background. You can verify with:

```bash
curl http://localhost:5984/teatrace/_index
```

## Performance Impact

**Without indexes:**
- Query 10,000 batches: ~2-5 seconds
- Full collection scan required

**With indexes:**
- Query 10,000 batches: ~50-200ms
- Direct index lookup

**Recommendation:** Always use indexes in production!
