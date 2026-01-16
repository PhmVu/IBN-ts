/**
 * Channel Configuration Interface
 */
export interface ChannelConfig {
    channelId: string;
    channelName?: string; // Alternative name field
    name?: string;
    description?: string;
    organizations: string[]; // MSP IDs
    orderers: string[];
    anchorPeers?: {
        [mspId: string]: {
            host: string;
            port: number;
        }[];
    };
    policies?: {
        readers: string;
        writers: string;
        admins: string;
    };
    capabilities?: {
        application: string[];
        channel: string[];
    };
    endorsementPolicy?: string;
    lifecyclePolicy?: string;
    blockSize: number; // Block size in bytes (required)
    batchTimeout: number; // Batch timeout in milliseconds (required)
    status: ChannelStatus;
    createdAt: string;
    createdBy: string;
    updatedAt?: string;
    updatedBy?: string;
}

/**
 * Channel Status Enum
 */
export enum ChannelStatus {
    PENDING = 'PENDING',
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    ARCHIVED = 'ARCHIVED'
}
