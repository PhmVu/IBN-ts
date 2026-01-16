import axios, { AxiosInstance } from 'axios';
import { config } from '@config/env';
import { GatewayError, TimeoutError } from '@core/errors';
import { ChaincodeResponse } from '@core/types';
import logger from '@core/logger';

export interface ChaincodeQueryRequest {
  chaincode: string;
  command: 'query' | 'read';
  cert: string;
  msp_id: string;
  args: {
    channel: string;
    function: string;
    params: string[];
  };
}

export interface ChaincodeInvokeRequest {
  chaincode: string;
  command: 'invoke' | 'write' | 'update';
  cert: string;
  private_key: string;
  msp_id: string;
  args: {
    channel: string;
    function: string;
    params: string[];
  };
}

export class GatewayClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.gateway.url,
      timeout: config.gateway.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    logger.info(`GatewayClient initialized with URL: ${config.gateway.url}`);
  }

  async query(request: ChaincodeQueryRequest): Promise<ChaincodeResponse> {
    try {
      logger.info(`Querying chaincode: ${request.chaincode}`, {
        channel: request.args.channel,
        function: request.args.function,
      });

      const response = await this.client.post<ChaincodeResponse>('/api/v1/chaincode/forward', request);

      logger.info(`Query successful for chaincode: ${request.chaincode}`);

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          logger.error('Gateway query timeout', { error: error.message });
          throw new TimeoutError('Gateway API query timeout');
        }
        logger.error('Gateway query error', {
          status: error.response?.status,
          data: error.response?.data,
        });
        throw new GatewayError(`Gateway query failed: ${error.message}`);
      }
      logger.error('Unexpected error during gateway query', { error: error instanceof Error ? error.message : String(error) });
      throw new GatewayError('Unexpected error during gateway query');
    }
  }

  async invoke(request: ChaincodeInvokeRequest): Promise<ChaincodeResponse> {
    try {
      logger.info(`Invoking chaincode: ${request.chaincode}`, {
        channel: request.args.channel,
        function: request.args.function,
      });

      const response = await this.client.post<ChaincodeResponse>('/api/v1/chaincode/forward', request);

      logger.info(`Invoke successful for chaincode: ${request.chaincode}`);

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          logger.error('Gateway invoke timeout', { error: error.message });
          throw new TimeoutError('Gateway API invoke timeout');
        }
        logger.error('Gateway invoke error', {
          status: error.response?.status,
          data: error.response?.data,
        });
        throw new GatewayError(`Gateway invoke failed: ${error.message}`);
      }
      logger.error('Unexpected error during gateway invoke', { error: error instanceof Error ? error.message : String(error) });
      throw new GatewayError('Unexpected error during gateway invoke');
    }
  }

  async health(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/v1/health');
      return response.status === 200;
    } catch (error) {
      logger.warn('Gateway health check failed', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }
}

export const gatewayClient = new GatewayClient();
