const crypto = require('crypto');

// Generate 32-byte (256-bit) key
const key = crypto.randomBytes(32).toString('hex');

console.log('='.repeat(60));
console.log('🔑 WALLET ENCRYPTION KEY GENERATED');
console.log('='.repeat(60));
console.log('');
console.log('Add this to backend-ts/.env:');
console.log('');
console.log(`WALLET_ENCRYPTION_KEY=${key}`);
console.log('');
console.log('⚠️  IMPORTANT: Never commit this key to git!');
console.log('='.repeat(60));
