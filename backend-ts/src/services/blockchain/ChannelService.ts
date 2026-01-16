import { query } from '@config/database';
import { DatabaseError, NotFoundError } from '@core/errors';
import logger from '@core/logger';

export interface ChannelCreateInput {
  name: string;
  description?: string;
}

export interface ChannelUpdateInput {
  description?: string;
}

export interface ChannelResponse {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class ChannelService {
  static async getChannelById(channelId: string): Promise<ChannelResponse> {
    try {
      const result = await query(
        'SELECT id, name, description, created_by, is_active, created_at, updated_at FROM channels WHERE id = $1',
        [channelId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Channel not found');
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Get channel error', { channelId, error: error instanceof Error ? error.message : String(error) });
      throw new DatabaseError('Failed to retrieve channel');
    }
  }

  static async getChannelByName(channelName: string): Promise<ChannelResponse> {
    try {
      const result = await query(
        'SELECT id, name, description, created_by, is_active, created_at, updated_at FROM channels WHERE name = $1',
        [channelName]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Channel not found');
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Get channel by name error', { channelName, error: error instanceof Error ? error.message : String(error) });
      throw new DatabaseError('Failed to retrieve channel');
    }
  }

  static async getAllChannels(limit: number = 100, offset: number = 0): Promise<{
    channels: ChannelResponse[];
    total: number;
  }> {
    try {
      const resultCount = await query('SELECT COUNT(*) as count FROM channels WHERE is_active = true');
      const total = resultCount.rows[0].count;

      const result = await query(
        'SELECT id, name, description, created_by, is_active, created_at, updated_at FROM channels WHERE is_active = true ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );

      return {
        channels: result.rows,
        total,
      };
    } catch (error) {
      logger.error('Get all channels error', { error: error instanceof Error ? error.message : String(error) });
      throw new DatabaseError('Failed to retrieve channels');
    }
  }

  static async createChannel(
    input: ChannelCreateInput,
    createdBy: string
  ): Promise<ChannelResponse> {
    try {
      logger.info(`Creating channel: ${input.name}`);

      const result = await query(
        'INSERT INTO channels (name, description, created_by, is_active, created_at, updated_at) ' +
          'VALUES ($1, $2, $3, $4, NOW(), NOW()) ' +
          'RETURNING id, name, description, created_by, is_active, created_at, updated_at',
        [input.name, input.description || null, createdBy, true]
      );

      logger.info(`Channel created successfully: ${input.name}`);

      return result.rows[0];
    } catch (error) {
      logger.error('Create channel error', { name: input.name, error: error instanceof Error ? error.message : String(error) });
      throw new DatabaseError('Failed to create channel');
    }
  }

  static async updateChannel(
    channelId: string,
    input: ChannelUpdateInput
  ): Promise<ChannelResponse> {
    try {
      logger.info(`Updating channel: ${channelId}`);

      const updateFields: string[] = [];
      const updateValues: unknown[] = [];
      let paramIndex = 1;

      if (input.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(input.description || null);
      }

      updateFields.push('updated_at = NOW()');
      updateValues.push(channelId);

      if (updateFields.length === 1) {
        return await this.getChannelById(channelId);
      }

      const result = await query(
        `UPDATE channels SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING id, name, description, created_by, is_active, created_at, updated_at`,
        updateValues
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Channel not found');
      }

      logger.info(`Channel updated successfully: ${channelId}`);

      return result.rows[0];
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Update channel error', { channelId, error: error instanceof Error ? error.message : String(error) });
      throw new DatabaseError('Failed to update channel');
    }
  }

  static async deleteChannel(channelId: string): Promise<void> {
    try {
      logger.info(`Deleting channel: ${channelId}`);

      // Soft delete
      const result = await query('UPDATE channels SET is_active = false, updated_at = NOW() WHERE id = $1', [
        channelId,
      ]);

      if (result.rowCount === 0) {
        throw new NotFoundError('Channel not found');
      }

      logger.info(`Channel deleted successfully: ${channelId}`);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Delete channel error', { channelId, error: error instanceof Error ? error.message : String(error) });
      throw new DatabaseError('Failed to delete channel');
    }
  }
}
