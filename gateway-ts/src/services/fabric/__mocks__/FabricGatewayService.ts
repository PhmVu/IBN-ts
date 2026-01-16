import { jest } from '@jest/globals';
import { ChaincodeResponse } from '@core/types';

export class FabricGatewayService {
  static selectIdentity = jest.fn(async () => ({
    mspId: 'IBNMSP',
    hasPrivateKey: () => true,
  }));

  connect = jest.fn(async () => {});
  disconnect = jest.fn(async () => {});

  queryChaincode = jest.fn(async (): Promise<ChaincodeResponse> => ({
    success: true,
    data: { message: 'mock-query' },
    txId: null,
    error: null,
  }));

  invokeChaincode = jest.fn(async (): Promise<ChaincodeResponse> => ({
    success: true,
    data: { message: 'mock-invoke' },
    txId: 'tx-mock-123',
    error: null,
  }));
}
