import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '8001', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Fabric Network
  gatewayPeerEndpoint: process.env.GATEWAY_PEER_ENDPOINT || 'peer0.ibn.ictu.edu.vn:7051',
  gatewayOrdererEndpoint: process.env.GATEWAY_ORDERER_ENDPOINT || 'orderer.ictu.edu.vn:7050',
  mspId: process.env.MSP_ID || 'IBNMSP',

  // TLS
  tlsEnabled: process.env.TLS_ENABLED === 'true',
  tlsCertPath: process.env.TLS_CERT_PATH,

  // Crypto Config
  cryptoConfigPath: process.env.CRYPTO_CONFIG_PATH || '/network/crypto-config',

  // Docker (fallback executor)
  dockerNetwork: process.env.DOCKER_NETWORK || 'fabric-network',
  peerContainer: process.env.PEER_CONTAINER || 'peer0.ibn.ictu.edu.vn',

  // Timeouts (in milliseconds)
  grpcTimeout: 30000,
  invokeTimeout: 60000,

  // Retries
  maxRetries: 3,
  retryDelay: 1000,
};

export default config;
