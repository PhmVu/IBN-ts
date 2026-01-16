/**
 * Unit Tests for TeaTrace Chaincode v0.0.3
 * Tests all core functions with proper mocking
 */

import { Context } from 'fabric-contract-api';
import { ChaincodeStub, ClientIdentity } from 'fabric-shim';
import { TeaTraceContract } from '../index';
import * as chai from 'chai';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);
const expect = chai.expect;

describe('TeaTrace Chaincode v0.0.3', () => {
    let contract: TeaTraceContract;
    let ctx: sinon.SinonStubbedInstance<Context>;
    let stub: sinon.SinonStubbedInstance<ChaincodeStub>;
    let clientIdentity: sinon.SinonStubbedInstance<ClientIdentity>;

    beforeEach(() => {
        contract = new TeaTraceContract();
        ctx = sinon.createStubInstance(Context);
        stub = sinon.createStubInstance(ChaincodeStub);
        clientIdentity = sinon.createStubInstance(ClientIdentity);

        ctx.stub = stub as any;
        ctx.clientIdentity = clientIdentity as any;
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('InitLedger', () => {
        it('should initialize ledger with sample batch', async () => {
            stub.putState.resolves();

            await contract.InitLedger(ctx as any);

            expect(stub.putState).to.have.been.calledOnce;
            const call = stub.putState.getCall(0);
            expect(call.args[0]).to.equal('TEA-2025-001');
        });
    });

    describe('CreateBatch', () => {
        it('should create a new batch when called by Farm org', async () => {
            clientIdentity.getMSPID.returns('Farm1MSP');
            stub.getState.resolves(Buffer.from(''));
            stub.putState.resolves();
            stub.setEvent.resolves();
            stub.getTxID.returns('tx-001');

            const result = await contract.CreateBatch(
                ctx as any,
                'TEA-2025-002',
                'FARM-001',
                'Thai Nguyen Tea Farm',
                '21.5944° N, 105.8480° E',
                new Date('2025-01-20').toISOString(),
                'Green',
                'Shan Tuyet',
                500,
                'kg'
            );

            expect(stub.putState).to.have.been.calledOnce;
            expect(stub.setEvent).to.have.been.calledWith('BatchCreated');

            const batch = JSON.parse(result);
            expect(batch.batchId).to.equal('TEA-2025-002');
            expect(batch.status).to.equal('HARVESTED');
            expect(batch.currentOwner).to.equal('Farm1MSP');
        });

        it('should reject creation by non-Farm organization', async () => {
            clientIdentity.getMSPID.returns('Processor1MSP');

            try {
                await contract.CreateBatch(
                    ctx as any,
                    'TEA-2025-002',
                    'FARM-001',
                    'Thai Nguyen Tea Farm',
                    '21.5944° N, 105.8480° E',
                    new Date('2025-01-20').toISOString(),
                    'Green',
                    'Shan Tuyet',
                    500,
                    'kg'
                );
                expect.fail('Should have thrown error');
            } catch (error: any) {
                expect(error.message).to.include('Only Farm organizations can create batches');
            }
        });

        it('should reject duplicate batch ID', async () => {
            clientIdentity.getMSPID.returns('Farm1MSP');
            stub.getState.resolves(Buffer.from(JSON.stringify({ batchId: 'TEA-2025-002' })));

            try {
                await contract.CreateBatch(
                    ctx as any,
                    'TEA-2025-002',
                    'FARM-001',
                    'Thai Nguyen Tea Farm',
                    '21.5944° N, 105.8480° E',
                    new Date('2025-01-20').toISOString(),
                    'Green',
                    'Shan Tuyet',
                    500,
                    'kg'
                );
                expect.fail('Should have thrown error');
            } catch (error: any) {
                expect(error.message).to.include('already exists');
            }
        });

        it('should validate batch ID format', async () => {
            clientIdentity.getMSPID.returns('Farm1MSP');
            stub.getState.resolves(Buffer.from(''));

            try {
                await contract.CreateBatch(
                    ctx as any,
                    'INVALID-ID',
                    'FARM-001',
                    'Thai Nguyen Tea Farm',
                    '21.5944° N, 105.8480° E',
                    new Date('2025-01-20').toISOString(),
                    'Green',
                    'Shan Tuyet',
                    500,
                    'kg'
                );
                expect.fail('Should have thrown error');
            } catch (error: any) {
                expect(error.message).to.include('Batch ID must follow format');
            }
        });
    });

    describe('TransferBatch', () => {
        const mockBatch = {
            batchId: 'TEA-2025-001',
            currentOwner: 'Farm1MSP',
            status: 'HARVESTED',
            transferHistory: [],
            events: []
        };

        it('should transfer batch to another organization', async () => {
            clientIdentity.getMSPID.returns('Farm1MSP');
            stub.getState.resolves(Buffer.from(JSON.stringify(mockBatch)));
            stub.putState.resolves();
            stub.setEvent.resolves();
            stub.getTxID.returns('tx-002');

            const result = await contract.TransferBatch(
                ctx as any,
                'TEA-2025-001',
                'Processor1MSP',
                'PROCESSING',
                500,
                'Hanoi Processing Plant',
                'Transfer for processing'
            );

            expect(stub.putState).to.have.been.calledOnce;
            expect(stub.setEvent).to.have.been.calledWith('BatchTransferred');

            const batch = JSON.parse(result);
            expect(batch.currentOwner).to.equal('Processor1MSP');
            expect(batch.status).to.equal('IN_PROCESSING');
            expect(batch.transferHistory).to.have.lengthOf(1);
        });

        it('should reject transfer by non-owner', async () => {
            clientIdentity.getMSPID.returns('Processor1MSP');
            stub.getState.resolves(Buffer.from(JSON.stringify(mockBatch)));

            try {
                await contract.TransferBatch(
                    ctx as any,
                    'TEA-2025-001',
                    'Retailer1MSP',
                    'RETAIL',
                    500,
                    'Hanoi Store',
                    'Transfer to retail'
                );
                expect.fail('Should have thrown error');
            } catch (error: any) {
                expect(error.message).to.include('Only current owner');
            }
        });
    });

    describe('AddQualityRecord', () => {
        const mockBatch = {
            batchId: 'TEA-2025-001',
            qualityRecords: [],
            qualityGrade: 'Standard',
            events: [],
            currentLocation: 'Processing Plant'
        };

        it('should add quality record to batch', async () => {
            clientIdentity.getMSPID.returns('Processor1MSP');
            stub.getState.resolves(Buffer.from(JSON.stringify(mockBatch)));
            stub.putState.resolves();
            stub.setEvent.resolves();
            stub.getTxID.returns('tx-003');

            const parameters = {
                moisture: { value: 5.2, unit: '%', passedStandard: true },
                pesticide: { value: 0.01, unit: 'ppm', passedStandard: true }
            };

            const result = await contract.AddQualityRecord(
                ctx as any,
                'TEA-2025-001',
                'pesticide',
                JSON.stringify(parameters),
                'PASSED',
                'All tests passed'
            );

            expect(stub.putState).to.have.been.calledOnce;
            expect(stub.setEvent).to.have.been.calledWith('QualityRecordAdded');

            const batch = JSON.parse(result);
            expect(batch.qualityRecords).to.have.lengthOf(1);
            expect(batch.qualityRecords[0].overallResult).to.equal('PASSED');
        });

        it('should update quality grade to Premium when all tests pass', async () => {
            const batchWithPassedTests = {
                ...mockBatch,
                qualityRecords: [
                    { overallResult: 'PASSED' }
                ]
            };

            clientIdentity.getMSPID.returns('Processor1MSP');
            stub.getState.resolves(Buffer.from(JSON.stringify(batchWithPassedTests)));
            stub.putState.resolves();
            stub.setEvent.resolves();
            stub.getTxID.returns('tx-004');

            const result = await contract.AddQualityRecord(
                ctx as any,
                'TEA-2025-001',
                'taste',
                JSON.stringify({ score: { value: 9.5, unit: 'points', passedStandard: true } }),
                'PASSED',
                'Excellent taste'
            );

            const batch = JSON.parse(result);
            expect(batch.qualityGrade).to.equal('Premium');
        });
    });

    describe('AddCertification', () => {
        const mockBatch = {
            batchId: 'TEA-2025-001',
            certifications: [],
            events: [],
            currentLocation: 'Processing Plant'
        };

        it('should add certification to batch', async () => {
            clientIdentity.getMSPID.returns('Processor1MSP');
            stub.getState.resolves(Buffer.from(JSON.stringify(mockBatch)));
            stub.putState.resolves();
            stub.setEvent.resolves();
            stub.getTxID.returns('tx-005');

            const result = await contract.AddCertification(
                ctx as any,
                'TEA-2025-001',
                'Organic',
                'USDA Organic Certification',
                'CERT-ORG-2025-001',
                new Date('2026-12-31').toISOString()
            );

            expect(stub.putState).to.have.been.calledOnce;
            expect(stub.setEvent).to.have.been.calledWith('CertificationAdded');

            const batch = JSON.parse(result);
            expect(batch.certifications).to.have.lengthOf(1);
            expect(batch.certifications[0].certType).to.equal('Organic');
            expect(batch.certifications[0].status).to.equal('VALID');
        });
    });

    describe('UpdateBatchStatus', () => {
        const mockBatch = {
            batchId: 'TEA-2025-001',
            status: 'HARVESTED',
            events: [],
            currentLocation: 'Farm'
        };

        it('should update batch status with valid transition', async () => {
            clientIdentity.getMSPID.returns('Processor1MSP');
            stub.getState.resolves(Buffer.from(JSON.stringify(mockBatch)));
            stub.putState.resolves();
            stub.setEvent.resolves();
            stub.getTxID.returns('tx-006');

            const result = await contract.UpdateBatchStatus(
                ctx as any,
                'TEA-2025-001',
                'IN_PROCESSING',
                'Processing Plant'
            );

            expect(stub.putState).to.have.been.calledOnce;
            expect(stub.setEvent).to.have.been.calledWith('BatchStatusUpdated');

            const batch = JSON.parse(result);
            expect(batch.status).to.equal('IN_PROCESSING');
            expect(batch.events).to.have.lengthOf(1);
        });

        it('should reject invalid status transition', async () => {
            clientIdentity.getMSPID.returns('Processor1MSP');
            stub.getState.resolves(Buffer.from(JSON.stringify(mockBatch)));

            try {
                await contract.UpdateBatchStatus(
                    ctx as any,
                    'TEA-2025-001',
                    'SOLD',
                    'Store'
                );
                expect.fail('Should have thrown error');
            } catch (error: any) {
                expect(error.message).to.include('Cannot transition');
            }
        });
    });

    describe('Query Functions', () => {
        it('should query single batch', async () => {
            const mockBatch = { batchId: 'TEA-2025-001', status: 'HARVESTED' };
            stub.getState.resolves(Buffer.from(JSON.stringify(mockBatch)));

            const result = await contract.QueryBatch(ctx as any, 'TEA-2025-001');
            const batch = JSON.parse(result);

            expect(batch.batchId).to.equal('TEA-2025-001');
        });

        it('should return error for non-existent batch', async () => {
            stub.getState.resolves(Buffer.from(''));

            try {
                await contract.QueryBatch(ctx as any, 'TEA-2025-999');
                expect.fail('Should have thrown error');
            } catch (error: any) {
                expect(error.message).to.include('does not exist');
            }
        });

        it('should get batch history', async () => {
            const mockHistory = [
                {
                    txId: 'tx-001',
                    timestamp: { seconds: { low: 1640000000 } },
                    isDelete: false,
                    value: Buffer.from(JSON.stringify({ batchId: 'TEA-2025-001', status: 'HARVESTED' }))
                }
            ];

            const iterator = {
                next: sinon.stub()
                    .onFirstCall().resolves({ done: false, value: mockHistory[0] })
                    .onSecondCall().resolves({ done: true }),
                close: sinon.stub().resolves()
            };

            stub.getHistoryForKey.resolves(iterator as any);

            const result = await contract.GetBatchHistory(ctx as any, 'TEA-2025-001');
            const history = JSON.parse(result);

            expect(history).to.be.an('array');
            expect(history).to.have.lengthOf(1);
        });

        it('should get batch events', async () => {
            const mockBatch = {
                batchId: 'TEA-2025-001',
                events: [
                    { eventType: 'BATCH_CREATED', timestamp: '2025-01-15T00:00:00Z' }
                ]
            };

            stub.getState.resolves(Buffer.from(JSON.stringify(mockBatch)));

            const result = await contract.GetBatchEvents(ctx as any, 'TEA-2025-001');
            const events = JSON.parse(result);

            expect(events).to.be.an('array');
            expect(events).to.have.lengthOf(1);
            expect(events[0].eventType).to.equal('BATCH_CREATED');
        });
    });
});
