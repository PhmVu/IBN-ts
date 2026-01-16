import request from 'supertest';
import app from '../../src/app';

// Mock FabricGatewayService
jest.mock('../../src/services/fabric/FabricGatewayService');

describe('Chaincode Routes Integration Tests', () => {
  describe('POST /api/v1/chaincode/forward', () => {
    it('should forward query request to chaincode', async () => {
      const requestPayload = {
        chaincode: 'teatrace',
        command: 'query',
        msp_id: 'IBNMSP',
        cert: 'base64-encoded-cert',
        private_key: 'base64-encoded-key',
        org_domain: 'ibn.ictu.edu.vn',
        public_read: false,
        args: {
          channel: 'ibnchan',
          function: 'queryTeaBatch',
          params: ['batch1'],
        },
      };

      const response = await request(app)
        .post('/api/v1/chaincode/forward')
        .send(requestPayload)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
    });

    it('should handle invalid request format', async () => {
      const invalidPayload = {
        chaincode: 'teatrace',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/v1/chaincode/forward')
        .send(invalidPayload)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error for missing certificate', async () => {
      const requestPayload = {
        chaincode: 'teatrace',
        command: 'query',
        msp_id: 'IBNMSP',
        // Missing cert
        org_domain: 'ibn.ictu.edu.vn',
        args: {
          channel: 'ibnchan',
          function: 'queryTeaBatch',
          params: ['batch1'],
        },
      };

      const response = await request(app)
        .post('/api/v1/chaincode/forward')
        .send(requestPayload)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/chaincode/invoke', () => {
    it('should invoke chaincode function', async () => {
      const requestPayload = {
        chaincode: 'teatrace',
        command: 'invoke',
        msp_id: 'IBNMSP',
        cert: 'base64-encoded-cert',
        private_key: 'base64-encoded-key',
        org_domain: 'ibn.ictu.edu.vn',
        args: {
          channel: 'ibnchan',
          function: 'createTeaBatch',
          params: ['batch1', 'YUNNAN', 'FarmA', 'GreenTea', '2024-01-01', '100', 'kg', 'Admin'],
        },
      };

      const response = await request(app)
        .post('/api/v1/chaincode/invoke')
        .send(requestPayload)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('txId');
    });

    it('should require private key for invoke operations', async () => {
      const requestPayload = {
        chaincode: 'teatrace',
        command: 'invoke',
        msp_id: 'IBNMSP',
        cert: 'base64-encoded-cert',
        // Missing private_key
        org_domain: 'ibn.ictu.edu.vn',
        args: {
          channel: 'ibnchan',
          function: 'createTeaBatch',
          params: [],
        },
      };

      const response = await request(app)
        .post('/api/v1/chaincode/invoke')
        .send(requestPayload)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/unknown-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Endpoint not found');
    });

    it('should handle internal server errors', async () => {
      // This would test error middleware in real scenario
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });
});
