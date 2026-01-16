/**
 * TeaTrace Chaincode v0.0.3
 * Tea Traceability with Multi-Organization Support
 */

import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import {
    TeaBatch,
    TeaStatus,
    QualityRecord,
    Certification,
    TransferRecord,
    BatchEvent,
    TransferType
} from './models';
import {
    validateBatchId,
    validateQuantity,
    validateLocation,
    validateTeaType,
    validateTeaStatus,
    validateStatusTransition,
    validateRequiredString,
    combineValidations
} from './utils';

@Info({
    title: 'TeaTrace',
    description: 'Tea Traceability Chaincode for Supply Chain Management'
})
export class TeaTraceContract extends Contract {

    /**
     * Initialize ledger with sample data
     */
    @Transaction()
    public async InitLedger(ctx: Context): Promise<void> {
        console.info('Initializing TeaTrace ledger...');

        const sampleBatch: TeaBatch = {
            batchId: 'TEA-2025-001',
            farmId: 'FARM-001',
            farmName: 'Thai Nguyen Tea Farm',
            farmLocation: '21.5944° N, 105.8480° E',
            harvestDate: new Date('2025-01-15').toISOString(),
            teaType: 'Green',
            teaVariety: 'Shan Tuyet',
            quantity: 1000,
            quantityUnit: 'kg',
            status: 'HARVESTED',
            currentLocation: 'Thai Nguyen, Vietnam',
            currentOwner: 'Farm1MSP',
            qualityGrade: 'Premium',
            qualityRecords: [],
            certifications: [],
            transferHistory: [],
            events: [],
            createdAt: new Date().toISOString(),
            createdBy: 'Farm1MSP',
            updatedAt: new Date().toISOString(),
            updatedBy: 'Farm1MSP'
        };

        await ctx.stub.putState(sampleBatch.batchId, Buffer.from(JSON.stringify(sampleBatch)));
        console.info(`Sample batch ${sampleBatch.batchId} initialized`);
    }

    /**
     * Create a new tea batch
     * Only FARM organizations can create batches
     */
    @Transaction()
    public async CreateBatch(
        ctx: Context,
        batchId: string,
        farmId: string,
        farmName: string,
        farmLocation: string,
        harvestDate: string,
        teaType: string,
        teaVariety: string,
        quantity: number,
        quantityUnit: string
    ): Promise<string> {
        console.info(`Creating batch: ${batchId}`);

        // Get caller's MSP ID
        const mspId = ctx.clientIdentity.getMSPID();

        // Only FARM organizations can create batches
        if (!mspId.startsWith('Farm')) {
            throw new Error(`Only Farm organizations can create batches. Your MSP: ${mspId}`);
        }

        // Validate inputs
        const validations = combineValidations(
            validateBatchId(batchId),
            validateRequiredString(farmId, 'Farm ID', 3),
            validateRequiredString(farmName, 'Farm Name', 3),
            validateLocation(farmLocation),
            validateTeaType(teaType),
            validateQuantity(quantity, quantityUnit)
        );

        if (!validations.valid) {
            throw new Error(`Validation failed: ${validations.errors.join(', ')}`);
        }

        // Check if batch already exists
        const exists = await this.BatchExists(ctx, batchId);
        if (exists) {
            throw new Error(`Batch ${batchId} already exists`);
        }

        // Create batch
        const batch: TeaBatch = {
            batchId,
            farmId,
            farmName,
            farmLocation,
            harvestDate,
            teaType,
            teaVariety,
            quantity,
            quantityUnit,
            status: 'HARVESTED',
            currentLocation: farmLocation,
            currentOwner: mspId,
            qualityGrade: 'Standard',
            qualityRecords: [],
            certifications: [],
            transferHistory: [],
            events: [],
            createdAt: new Date().toISOString(),
            createdBy: mspId,
            updatedAt: new Date().toISOString(),
            updatedBy: mspId
        };

        // Store batch
        await ctx.stub.putState(batchId, Buffer.from(JSON.stringify(batch)));

        // Emit event
        await ctx.stub.setEvent('BatchCreated', Buffer.from(JSON.stringify({
            batchId,
            farmName,
            teaType,
            quantity,
            timestamp: new Date().toISOString()
        })));

        console.info(`Batch ${batchId} created successfully`);
        return JSON.stringify(batch);
    }

    /**
     * Check if batch exists
     */
    @Transaction(false)
    @Returns('boolean')
    public async BatchExists(ctx: Context, batchId: string): Promise<boolean> {
        const batchJSON = await ctx.stub.getState(batchId);
        return batchJSON && batchJSON.length > 0;
    }

    /**
     * Query a single batch
     */
    @Transaction(false)
    @Returns('string')
    public async QueryBatch(ctx: Context, batchId: string): Promise<string> {
        const batchJSON = await ctx.stub.getState(batchId);
        if (!batchJSON || batchJSON.length === 0) {
            throw new Error(`Batch ${batchId} does not exist`);
        }
        return batchJSON.toString();
    }

    /**
     * Query all batches (for testing - use pagination in production)
     */
    @Transaction(false)
    @Returns('string')
    public async QueryAllBatches(ctx: Context): Promise<string> {
        const allResults: TeaBatch[] = [];
        const iterator = await ctx.stub.getStateByRange('', '');

        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            try {
                const batch: TeaBatch = JSON.parse(strValue);
                allResults.push(batch);
            } catch (err) {
                console.error('Error parsing batch:', err);
            }
            result = await iterator.next();
        }

        await iterator.close();
        return JSON.stringify(allResults);
    }

    /**
     * Transfer batch to another organization
     */
    @Transaction()
    public async TransferBatch(
        ctx: Context,
        batchId: string,
        toOrg: string,
        transferType: string,
        quantity: number,
        location: string,
        notes: string
    ): Promise<string> {
        console.info(`Transferring batch ${batchId} to ${toOrg}`);

        const mspId = ctx.clientIdentity.getMSPID();

        // Get batch
        const batch = await this._getBatch(ctx, batchId);

        // Verify ownership
        if (batch.currentOwner !== mspId) {
            throw new Error(`Only current owner (${batch.currentOwner}) can transfer this batch. Your MSP: ${mspId}`);
        }

        // Validate transfer type
        const transferTypeValidation = validateRequiredString(transferType, 'Transfer Type');
        if (!transferTypeValidation.valid) {
            throw new Error(transferTypeValidation.error);
        }

        // Create transfer record
        const transferRecord: TransferRecord = {
            transferId: `TR-${Date.now()}`,
            fromOrg: mspId,
            toOrg: toOrg,
            transferDate: new Date().toISOString(),
            transferType: transferType as TransferType,
            quantity: quantity,
            location: location,
            notes: notes,
            senderSignature: ctx.stub.getTxID(),
            receiverSignature: '' // Will be filled when receiver confirms
        };

        // Update batch
        batch.currentOwner = toOrg;
        batch.currentLocation = location;
        batch.transferHistory.push(transferRecord);

        // Update status based on transfer type
        switch (transferType) {
            case 'PROCESSING':
                batch.status = 'IN_PROCESSING';
                break;
            case 'PACKAGING':
                batch.status = 'IN_PACKAGING';
                break;
            case 'DISTRIBUTION':
                batch.status = 'IN_TRANSIT';
                break;
            case 'RETAIL':
                batch.status = 'IN_RETAIL';
                break;
        }

        // Add event
        const event: BatchEvent = {
            eventId: `EVT-${Date.now()}`,
            eventType: 'BATCH_TRANSFERRED',
            timestamp: new Date().toISOString(),
            actor: mspId,
            description: `Batch transferred from ${mspId} to ${toOrg}`,
            location: location,
            data: { transferType, quantity },
            txId: ctx.stub.getTxID()
        };
        batch.events.push(event);

        // Save batch
        await this._saveBatch(ctx, batch);

        // Emit event
        await ctx.stub.setEvent('BatchTransferred', Buffer.from(JSON.stringify({
            batchId,
            fromOrg: mspId,
            toOrg,
            transferType,
            timestamp: new Date().toISOString()
        })));

        console.info(`Batch ${batchId} transferred successfully`);
        return JSON.stringify(batch);
    }

    /**
     * Add quality record to batch
     */
    @Transaction()
    public async AddQualityRecord(
        ctx: Context,
        batchId: string,
        testType: string,
        parametersJSON: string,
        overallResult: string,
        notes: string
    ): Promise<string> {
        console.info(`Adding quality record to batch ${batchId}`);

        const mspId = ctx.clientIdentity.getMSPID();

        // Get batch
        const batch = await this._getBatch(ctx, batchId);

        // Parse parameters
        let parameters: any;
        try {
            parameters = JSON.parse(parametersJSON);
        } catch (err) {
            throw new Error('Invalid parameters JSON format');
        }

        // Create quality record
        const qualityRecord: QualityRecord = {
            recordId: `QR-${Date.now()}`,
            testDate: new Date().toISOString(),
            testedBy: mspId,
            testType: testType,
            parameters: parameters,
            overallResult: overallResult as any,
            notes: notes,
            attachmentHash: '' // Will be added later if needed
        };

        // Add to batch
        batch.qualityRecords.push(qualityRecord);

        // Update quality grade based on results
        if (overallResult === 'PASSED') {
            // Check if all tests passed
            const allPassed = batch.qualityRecords.every(qr => qr.overallResult === 'PASSED');
            if (allPassed) {
                batch.qualityGrade = 'Premium';
            }
        } else if (overallResult === 'FAILED') {
            batch.qualityGrade = 'Standard';
        }

        // Add event
        const event: BatchEvent = {
            eventId: `EVT-${Date.now()}`,
            eventType: 'QUALITY_RECORDED',
            timestamp: new Date().toISOString(),
            actor: mspId,
            description: `Quality test ${testType} recorded: ${overallResult}`,
            location: batch.currentLocation,
            data: { testType, overallResult },
            txId: ctx.stub.getTxID()
        };
        batch.events.push(event);

        // Save batch
        await this._saveBatch(ctx, batch);

        // Emit event
        await ctx.stub.setEvent('QualityRecordAdded', Buffer.from(JSON.stringify({
            batchId,
            testType,
            overallResult,
            timestamp: new Date().toISOString()
        })));

        console.info(`Quality record added to batch ${batchId}`);
        return JSON.stringify(batch);
    }

    /**
     * Add certification to batch
     */
    @Transaction()
    public async AddCertification(
        ctx: Context,
        batchId: string,
        certType: string,
        issuedBy: string,
        certNumber: string,
        expiryDate: string
    ): Promise<string> {
        console.info(`Adding certification to batch ${batchId}`);

        const mspId = ctx.clientIdentity.getMSPID();

        // Get batch
        const batch = await this._getBatch(ctx, batchId);

        // Create certification
        const certification: Certification = {
            certId: `CERT-${Date.now()}`,
            certType: certType,
            issuedBy: issuedBy,
            issuedDate: new Date().toISOString(),
            expiryDate: expiryDate,
            certNumber: certNumber,
            status: 'VALID',
            attachmentHash: '' // Will be added later if needed
        };

        // Add to batch
        batch.certifications.push(certification);

        // Add event
        const event: BatchEvent = {
            eventId: `EVT-${Date.now()}`,
            eventType: 'CERTIFICATION_ADDED',
            timestamp: new Date().toISOString(),
            actor: mspId,
            description: `Certification ${certType} added by ${issuedBy}`,
            location: batch.currentLocation,
            data: { certType, certNumber },
            txId: ctx.stub.getTxID()
        };
        batch.events.push(event);

        // Save batch
        await this._saveBatch(ctx, batch);

        // Emit event
        await ctx.stub.setEvent('CertificationAdded', Buffer.from(JSON.stringify({
            batchId,
            certType,
            certNumber,
            timestamp: new Date().toISOString()
        })));

        console.info(`Certification added to batch ${batchId}`);
        return JSON.stringify(batch);
    }

    /**
     * Update batch status
     */
    @Transaction()
    public async UpdateBatchStatus(
        ctx: Context,
        batchId: string,
        newStatus: string,
        location: string
    ): Promise<string> {
        console.info(`Updating batch ${batchId} status to ${newStatus}`);

        const mspId = ctx.clientIdentity.getMSPID();

        // Get batch
        const batch = await this._getBatch(ctx, batchId);

        // Validate status
        const statusValidation = validateTeaStatus(newStatus);
        if (!statusValidation.valid) {
            throw new Error(statusValidation.error);
        }

        // Validate status transition
        const transitionValidation = validateStatusTransition(batch.status, newStatus as TeaStatus);
        if (!transitionValidation.valid) {
            throw new Error(transitionValidation.error);
        }

        // Update status
        const oldStatus = batch.status;
        batch.status = newStatus as TeaStatus;
        batch.currentLocation = location;

        // Add event
        const event: BatchEvent = {
            eventId: `EVT-${Date.now()}`,
            eventType: 'STATUS_UPDATED',
            timestamp: new Date().toISOString(),
            actor: mspId,
            description: `Status changed from ${oldStatus} to ${newStatus}`,
            location: location,
            data: { oldStatus, newStatus },
            txId: ctx.stub.getTxID()
        };
        batch.events.push(event);

        // Save batch
        await this._saveBatch(ctx, batch);

        // Emit event
        await ctx.stub.setEvent('BatchStatusUpdated', Buffer.from(JSON.stringify({
            batchId,
            oldStatus,
            newStatus,
            timestamp: new Date().toISOString()
        })));

        console.info(`Batch ${batchId} status updated to ${newStatus}`);
        return JSON.stringify(batch);
    }

    /**
     * Get batch history from ledger
     * Returns all historical states of a batch
     */
    @Transaction(false)
    @Returns('string')
    public async GetBatchHistory(ctx: Context, batchId: string): Promise<string> {
        console.info(`Getting history for batch ${batchId}`);

        const historyIterator = await ctx.stub.getHistoryForKey(batchId);
        const history: any[] = [];

        let result = await historyIterator.next();
        while (!result.done) {
            const record = {
                txId: result.value.txId,
                timestamp: result.value.timestamp,
                isDelete: result.value.isDelete,
                value: result.value.value.toString()
            };
            history.push(record);
            result = await historyIterator.next();
        }

        await historyIterator.close();
        return JSON.stringify(history);
    }

    /**
     * Get batch events
     * Returns all events for a specific batch
     */
    @Transaction(false)
    @Returns('string')
    public async GetBatchEvents(ctx: Context, batchId: string): Promise<string> {
        console.info(`Getting events for batch ${batchId}`);

        const batch = await this._getBatch(ctx, batchId);
        return JSON.stringify(batch.events);
    }

    /**
     * Get batches by owner (MSP ID)
     */
    @Transaction(false)
    @Returns('string')
    public async GetBatchesByOwner(ctx: Context, ownerMSP: string): Promise<string> {
        console.info(`Getting batches for owner ${ownerMSP}`);

        const query = {
            selector: {
                currentOwner: ownerMSP
            }
        };

        const queryString = JSON.stringify(query);
        const resultsIterator = await ctx.stub.getQueryResult(queryString);
        const batches = await this._getAllResults(resultsIterator);

        return JSON.stringify(batches);
    }

    /**
     * Get batches by status
     */
    @Transaction(false)
    @Returns('string')
    public async GetBatchesByStatus(ctx: Context, status: string): Promise<string> {
        console.info(`Getting batches with status ${status}`);

        const query = {
            selector: {
                status: status
            }
        };

        const queryString = JSON.stringify(query);
        const resultsIterator = await ctx.stub.getQueryResult(queryString);
        const batches = await this._getAllResults(resultsIterator);

        return JSON.stringify(batches);
    }

    /**
     * Rich query for batches
     * Supports complex CouchDB queries
     */
    @Transaction(false)
    @Returns('string')
    public async QueryBatches(ctx: Context, queryString: string): Promise<string> {
        console.info(`Executing rich query: ${queryString}`);

        const resultsIterator = await ctx.stub.getQueryResult(queryString);
        const batches = await this._getAllResults(resultsIterator);

        return JSON.stringify(batches);
    }

    /**
     * Get batches by tea type
     */
    @Transaction(false)
    @Returns('string')
    public async GetBatchesByTeaType(ctx: Context, teaType: string): Promise<string> {
        console.info(`Getting batches for tea type ${teaType}`);

        const query = {
            selector: {
                teaType: teaType
            }
        };

        const queryString = JSON.stringify(query);
        const resultsIterator = await ctx.stub.getQueryResult(queryString);
        const batches = await this._getAllResults(resultsIterator);

        return JSON.stringify(batches);
    }

    /**
     * Get batches by quality grade
     */
    @Transaction(false)
    @Returns('string')
    public async GetBatchesByQualityGrade(ctx: Context, qualityGrade: string): Promise<string> {
        console.info(`Getting batches with quality grade ${qualityGrade}`);

        const query = {
            selector: {
                qualityGrade: qualityGrade
            }
        };

        const queryString = JSON.stringify(query);
        const resultsIterator = await ctx.stub.getQueryResult(queryString);
        const batches = await this._getAllResults(resultsIterator);

        return JSON.stringify(batches);
    }

    /**
     * Helper: Get batch object
     */
    private async _getBatch(ctx: Context, batchId: string): Promise<TeaBatch> {
        const batchJSON = await ctx.stub.getState(batchId);
        if (!batchJSON || batchJSON.length === 0) {
            throw new Error(`Batch ${batchId} does not exist`);
        }
        return JSON.parse(batchJSON.toString());
    }

    /**
     * Helper: Save batch
     */
    private async _saveBatch(ctx: Context, batch: TeaBatch): Promise<void> {
        batch.updatedAt = new Date().toISOString();
        batch.updatedBy = ctx.clientIdentity.getMSPID();
        await ctx.stub.putState(batch.batchId, Buffer.from(JSON.stringify(batch)));
    }

    /**
     * Helper: Get all results from iterator
     */
    private async _getAllResults(iterator: any): Promise<any[]> {
        const allResults: any[] = [];
        let result = await iterator.next();

        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            try {
                const record = JSON.parse(strValue);
                allResults.push(record);
            } catch (err) {
                console.error('Error parsing result:', err);
            }
            result = await iterator.next();
        }

        await iterator.close();
        return allResults;
    }
}
