// Jest setup file
// This file is run before each test suite

process.env.NODE_ENV = 'test';
process.env.GATEWAY_PEER_ENDPOINT = 'peer0.ibn.ictu.edu.vn:7051';
process.env.GATEWAY_TLS_ENABLED = 'true';
process.env.DOCKER_NETWORK = 'fabric-network';
process.env.PEER_CONTAINER = 'peer0.ibn.ictu.edu.vn';
process.env.LOG_LEVEL = 'error';
