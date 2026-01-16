/**
 * TeaBatch Interface
 * Represents a batch of tea in the supply chain
 */
export interface TeaBatch {
    // ===== Identity =====
    batchId: string;              // Unique ID (e.g., "TEA-2025-001")

    // ===== Origin Information =====
    farmId: string;               // Farm organization ID
    farmName: string;             // Farm display name
    farmLocation: string;         // GPS coordinates or address
    harvestDate: string;          // ISO 8601 timestamp

    // ===== Product Information =====
    teaType: string;              // Green, Black, Oolong, White, Pu-erh
    teaVariety: string;           // Specific variety (e.g., "Shan Tuyet")
    quantity: number;             // Amount
    quantityUnit: string;         // "kg", "ton", "lb"

    // ===== Supply Chain Status =====
    status: TeaStatus;            // Current status
    currentLocation: string;      // Current GPS/address
    currentOwner: string;         // Current organization MSP ID

    // ===== Quality Management =====
    qualityGrade: string;         // A, B, C, Premium, Standard
    qualityRecords: QualityRecord[]; // All quality test results

    // ===== Certifications =====
    certifications: Certification[]; // All certifications

    // ===== Transfer History =====
    transferHistory: TransferRecord[]; // All ownership changes

    // ===== Event Log =====
    events: BatchEvent[];         // All state changes

    // ===== Metadata =====
    createdAt: string;            // Creation timestamp (ISO 8601)
    createdBy: string;            // Creator MSP ID
    updatedAt: string;            // Last update timestamp
    updatedBy: string;            // Last updater MSP ID
}

/**
 * Tea Status Enum
 * Represents the current state of tea in supply chain
 */
export type TeaStatus =
    | 'HARVESTED'       // Just harvested from farm
    | 'IN_PROCESSING'   // Being processed
    | 'PROCESSED'       // Processing complete
    | 'IN_PACKAGING'    // Being packaged
    | 'PACKAGED'        // Packaging complete
    | 'IN_TRANSIT'      // Being transported
    | 'IN_WAREHOUSE'    // In storage
    | 'IN_RETAIL'       // At retail location
    | 'SOLD'            // Sold to consumer
    | 'CONSUMED';       // Consumed by end user

/**
 * Quality Record Interface
 * Represents a quality test result
 */
export interface QualityRecord {
    // ===== Identity =====
    recordId: string;             // Unique ID (e.g., "QR-001")

    // ===== Test Information =====
    testDate: string;             // Test timestamp (ISO 8601)
    testedBy: string;             // Testing organization MSP ID
    testType: string;             // Type of test

    // ===== Test Results =====
    parameters: {
        [key: string]: {
            value: number;            // Measured value
            unit: string;             // Unit of measurement
            passedStandard: boolean;  // Pass/fail for this parameter
        };
    };

    // ===== Overall Assessment =====
    overallResult: QualityResult; // Overall test result
    notes: string;                // Additional notes
    attachmentHash: string;       // IPFS hash of test report PDF
}

/**
 * Quality Result Enum
 */
export type QualityResult = 'PASSED' | 'FAILED' | 'CONDITIONAL';

/**
 * Certification Interface
 * Represents a certification for the tea batch
 */
export interface Certification {
    // ===== Identity =====
    certId: string;               // Unique ID (e.g., "CERT-ORG-001")

    // ===== Certification Details =====
    certType: string;             // Type of certification
    issuedBy: string;             // Certification body/organization
    issuedDate: string;           // Issue timestamp (ISO 8601)
    expiryDate: string;           // Expiry timestamp (ISO 8601)
    certNumber: string;           // Certificate number

    // ===== Status =====
    status: CertStatus;           // Current status

    // ===== Attachment =====
    attachmentHash: string;       // IPFS hash of certificate PDF
}

/**
 * Certification Status Enum
 */
export type CertStatus = 'VALID' | 'EXPIRED' | 'REVOKED';

/**
 * Transfer Record Interface
 * Represents an ownership transfer
 */
export interface TransferRecord {
    // ===== Identity =====
    transferId: string;           // Unique ID (e.g., "TR-001")

    // ===== Transfer Details =====
    fromOrg: string;              // Sender organization MSP ID
    toOrg: string;                // Receiver organization MSP ID
    transferDate: string;         // Transfer timestamp (ISO 8601)
    transferType: TransferType;   // Type of transfer

    // ===== Quantity & Price =====
    quantity: number;             // Transferred quantity
    price?: number;               // Optional price
    currency?: string;            // Optional currency (USD, VND, etc.)

    // ===== Location & Notes =====
    location: string;             // Transfer location
    notes: string;                // Additional notes

    // ===== Signatures =====
    senderSignature: string;      // Sender's transaction ID
    receiverSignature: string;    // Receiver's transaction ID (if confirmed)
}

/**
 * Transfer Type Enum
 */
export type TransferType =
    | 'SALE'          // Sale to another party
    | 'PROCESSING'    // Transfer for processing
    | 'PACKAGING'     // Transfer for packaging
    | 'DISTRIBUTION'  // Transfer for distribution
    | 'RETAIL';       // Transfer to retail

/**
 * Batch Event Interface
 * Represents a state change event
 */
export interface BatchEvent {
    // ===== Identity =====
    eventId: string;              // Unique ID (e.g., "EVT-001")

    // ===== Event Details =====
    eventType: EventType;         // Type of event
    timestamp: string;            // Event timestamp (ISO 8601)
    actor: string;                // MSP ID of actor

    // ===== Event Data =====
    description: string;          // Human-readable description
    location: string;             // Event location
    data: Record<string, any>;    // Additional event data

    // ===== Blockchain Metadata =====
    txId: string;                 // Transaction ID
    blockNumber?: number;         // Block number (if available)
}

/**
 * Event Type Enum
 */
export type EventType =
    | 'BATCH_CREATED'
    | 'BATCH_TRANSFERRED'
    | 'QUALITY_RECORDED'
    | 'CERTIFICATION_ADDED'
    | 'STATUS_UPDATED'
    | 'LOCATION_UPDATED';
