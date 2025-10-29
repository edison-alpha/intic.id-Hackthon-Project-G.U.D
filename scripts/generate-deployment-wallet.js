/**
 * Generate Deployment Wallet for Platform
 * 
 * Run this script ONCE to generate a deployment wallet:
 * node scripts/generate-deployment-wallet.js
 * 
 * Then:
 * 1. Copy the output to your .env file
 * 2. Fund the address from testnet faucet
 * 3. Start deploying contracts!
 */

const { makeRandomPrivKey, getAddressFromPrivateKey } = require('@stacks/transactions');

console.log('🔐 Generating Platform Deployment Wallet...\n');

// Generate random private key
const privateKey = makeRandomPrivKey();

// Derive testnet address
const address = getAddressFromPrivateKey(privateKey, 'testnet');

console.log('✅ Deployment Wallet Generated!\n');
console.log('==========================================');
console.log('Add these to your .env file:');
console.log('==========================================\n');
console.log(`VITE_DEPLOYMENT_PRIVATE_KEY=${privateKey}`);
console.log(`VITE_DEPLOYMENT_ADDRESS=${address}`);
console.log('\n==========================================');
console.log('⚠️  IMPORTANT:');
console.log('==========================================\n');
console.log('1. Add to .env file (NOT .env.example!)');
console.log('2. Add .env to .gitignore');
console.log('3. NEVER commit .env to git');
console.log('4. Fund this address from testnet faucet:');
console.log(`   https://explorer.hiro.so/sandbox/faucet?chain=testnet`);
console.log(`   Address: ${address}`);
console.log('\n5. Test the wallet:');
console.log('   npm run dev');
console.log('   Go to /app/create-event');
console.log('   Try deploying a contract');
console.log('\n==========================================\n');

// Also show mainnet address for reference
const mainnetAddress = getAddressFromPrivateKey(privateKey, 'mainnet');
console.log('📝 For reference (DO NOT USE YET):');
console.log(`   Mainnet Address: ${mainnetAddress}`);
console.log('   (Generate a NEW wallet for mainnet!)');
console.log('\n==========================================\n');
