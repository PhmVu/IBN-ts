import { query } from '@config/database';
import { DatabaseError, NotFoundError } from '@core/errors';
import logger from '@core/logger';

export interface ChaincodeCreateInput {
  name: string;
  version: string;
  channel_id: string;
  language: string;
  path: string;
}

export interface ChaincodeUpdateInput {
  version?: string;
  path?: string;
}

export interface ChaincodeResponse {
  id: string;
  name: string;
  version: string;
  channel_id: string;
  language: string;
  path: string;
  is_installed: boolean;
  installed_at: string | null;
  created_at: string;
  updated_at: string;
}

export class ChaincodeService {
  static async getChaincodeById(chaincodeId: string): Promise<ChaincodeResponse> {
    try {
      const result = await query(
        'SELECT id, name, version, channel_id, language, path, is_installed, installed_at, created_at, updated_at FROM chaincodes WHERE id = $1',
        [chaincodeId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Chaincode not found');
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Get chaincode error', { chaincodeId, error: error instanceof Error ? error.message : String(error) });
      throw new DatabaseError('Failed to retrieve chaincode');
    }
  }

  static async getChaincodesByChannel(channelId: string, limit: number = 100, offset: number = 0): Promise<{
    chaincodes: ChaincodeResponse[];
    total: number;
  }> {
    try {
      const resultCount = await query('SELECT COUNT(*) as count FROM chaincodes WHERE channel_id = $1', [
        channelId,
      ]);
      const total = resultCount.rows[0].count;

      const result = await query(
        'SELECT id, name, version, channel_id, language, path, is_installed, installed_at, created_at, updated_at FROM chaincodes WHERE channel_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [channelId, limit, offset]
      );

      return {
        chaincodes: result.rows,
        total,
      };
    } catch (error) {
      logger.error('Get chaincodes by channel error', { channelId, error: error instanceof Error ? error.message : String(error) });
      throw new DatabaseError('Failed to retrieve chaincodes');
    }
  }

  static async createChaincode(input: ChaincodeCreateInput): Promise<ChaincodeResponse> {
    try {
      logger.info(`Creating chaincode: ${input.name}@${input.version}`);

      const result = await query(
        'INSERT INTO chaincodes (name, version, channel_id, language, path, is_installed, created_at, updated_at) ' +
          'VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) ' +
          'RETURNING id, name, version, channel_id, language, path, is_installed, installed_at, created_at, updated_at',
        [input.name, input.version, input.channel_id, input.language, input.path, false]
      );

      logger.info(`Chaincode created successfully: ${input.name}@${input.version}`);

      return result.rows[0];
    } catch (error) {
      logger.error('Create chaincode error', { name: input.name, error: error instanceof Error ? error.message : String(error) });
      throw new DatabaseError('Failed to create chaincode');
    }
  }

  static async updateChaincode(
    chaincodeId: string,
    input: ChaincodeUpdateInput
  ): Promise<ChaincodeResponse> {
    try {
      logger.info(`Updating chaincode: ${chaincodeId}`);

      const updateFields: string[] = [];
      const updateValues: unknown[] = [];
      let paramIndex = 1;

      if (input.version !== undefined) {
        updateFields.push(`version = $${paramIndex++}`);
        updateValues.push(input.version);
      }

      if (input.path !== undefined) {
        updateFields.push(`path = $${paramIndex++}`);
        updateValues.push(input.path);
      }

      updateFields.push('updated_at = NOW()');
      updateValues.push(chaincodeId);

      if (updateFields.length === 1) {
        return await this.getChaincodeById(chaincodeId);
      }

      const result = await query(
        `UPDATE chaincodes SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING id, name, version, channel_id, language, path, is_installed, installed_at, created_at, updated_at`,
        updateValues
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Chaincode not found');
      }

      logger.info(`Chaincode updated successfully: ${chaincodeId}`);

      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Update chaincode error', { chaincodeId, error: error instanceof Error ? error.message : String(error) });
      throw new DatabaseError('Failed to update chaincode');
    }
  }

  static async markInstalledChaincode(chaincodeId: string): Promise<ChaincodeResponse> {
    try {
      logger.info(`Marking chaincode as installed: ${chaincodeId}`);

      const result = await query(
        'UPDATE chaincodes SET is_installed = true, installed_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING id, name, version, channel_id, language, path, is_installed, installed_at, created_at, updated_at',
        [chaincodeId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Chaincode not found');
      }

      logger.info(`Chaincode marked as installed: ${chaincodeId}`);

      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Mark installed chaincode error', { chaincodeId, error: error instanceof Error ? error.message : String(error) });
      throw new DatabaseError('Failed to mark chaincode as installed');
    }
  }

  static async deleteChaincode(chaincodeId: string): Promise<void> {
    try {
      logger.info(`Deleting chaincode: ${chaincodeId}`);

      const result = await query('DELETE FROM chaincodes WHERE id = $1', [chaincodeId]);

      if (result.rowCount === 0) {
        throw new NotFoundError('Chaincode not found');
      }

      logger.info(`Chaincode deleted successfully: ${chaincodeId}`);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Delete chaincode error', { chaincodeId, error: error instanceof Error ? error.message : String(error) });
      throw new DatabaseError('Failed to delete chaincode');
    }
  }
}
