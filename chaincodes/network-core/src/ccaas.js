// CCAAS Entry Point for fabric-chaincode-node server
// This file provides clean module.exports for CCAAS compatibility

const { NetworkCoreContract } = require('./index');

// Export the contract class directly for fabric-chaincode-node server
module.exports = NetworkCoreContract;
