import { GatewayClient } from '../../../src/services/blockchain/GatewayClient';
import axios from 'axios';
import { GatewayError, TimeoutError } from '../../../src/core/errors';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

mockedAxios.create = jest.fn(() => {
  return {
    post: jest.fn(),
    get: jest.fn(),
    defaults: { baseURL: 'http://localhost' },
  } as any;
});

describe('GatewayClient', () => {
  beforeEach(() => jest.clearAllMocks());

  it('query returns data when success', async () => {
    const client = new GatewayClient();
    (client as any).client.post = jest.fn().mockResolvedValue({ data: { success: true } });
    const res = await client.query({
      chaincode: 'cc',
      command: 'query',
      cert: 'c',
      msp_id: 'm',
      args: { channel: 'ch', function: 'f', params: [] },
    });
    expect(res.success).toBe(true);
  });

  it('query throws TimeoutError on ECONNABORTED', async () => {
    const client = new GatewayClient();
    const timeoutError = new Error('timeout') as any;
    timeoutError.code = 'ECONNABORTED';
    (mockedAxios.isAxiosError as any).mockReturnValue(true);
    (client as any).client.post = jest.fn().mockRejectedValue(timeoutError);
    await expect(
      client.query({ chaincode: 'cc', command: 'query', cert: 'c', msp_id: 'm', args: { channel: 'ch', function: 'f', params: [] } })
    ).rejects.toBeInstanceOf(TimeoutError);
  });

  it('query throws GatewayError on other axios error', async () => {
    const client = new GatewayClient();
    const axiosError = new Error('fail') as any;
    axiosError.response = { status: 500, data: {} };
    (mockedAxios.isAxiosError as any).mockReturnValue(true);
    (client as any).client.post = jest.fn().mockRejectedValue(axiosError);
    await expect(
      client.query({ chaincode: 'cc', command: 'query', cert: 'c', msp_id: 'm', args: { channel: 'ch', function: 'f', params: [] } })
    ).rejects.toBeInstanceOf(GatewayError);
  });
});
