/**
 * Deploy CollegeVerseSBT to local Ganache chain using ethers.js
 * Pre-compiled with: npx solc --base-path . --include-path node_modules --bin --abi --optimize -o artifacts contracts/CollegeVerseSBT.sol
 *
 * Usage:
 *   Terminal 1:  npx ganache --port 8545 --deterministic
 *   Terminal 2:  node scripts/compile-deploy.js
 */
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const ROOT = path.resolve(__dirname, '..');
const ARTIFACTS = path.join(ROOT, 'artifacts');

async function main() {
  // Load compiled ABI + bytecode
  const abiPath = path.join(ARTIFACTS, 'contracts_CollegeVerseSBT_sol_CollegeVerseSBT.abi');
  const binPath = path.join(ARTIFACTS, 'contracts_CollegeVerseSBT_sol_CollegeVerseSBT.bin');

  if (!fs.existsSync(abiPath) || !fs.existsSync(binPath)) {
    console.error('Compiled artifacts not found. Run this first:');
    console.error('  npx solc --base-path . --include-path node_modules --bin --abi --optimize -o artifacts contracts/CollegeVerseSBT.sol');
    process.exit(1);
  }

  const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
  const bytecode = '0x' + fs.readFileSync(binPath, 'utf8').trim();
  console.log(`ABI: ${abi.length} entries | Bytecode: ${bytecode.length} chars\n`);

  // Connect to local Ganache node
  const RPC = 'http://127.0.0.1:8545';
  console.log(`Connecting to ${RPC}...`);

  const provider = new ethers.JsonRpcProvider(RPC);
  const accounts = await provider.listAccounts();
  if (accounts.length === 0) {
    console.error('No accounts found. Is Ganache running?');
    console.error('Start it with:  npx ganache --port 8545 --deterministic');
    process.exit(1);
  }

  const deployer = accounts[0];
  const balance = await provider.getBalance(deployer.address);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(balance)} ETH\n`);

  // Deploy
  console.log('Deploying CollegeVerseSBT...');
  const factory = new ethers.ContractFactory(abi, bytecode, deployer);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  // Test mint
  console.log('Test minting SBT...');
  const tx = await contract.mint(
    deployer.address,
    'data:application/json;base64,eyJuYW1lIjoiVGVzdCBTQlQiLCJkZXNjcmlwdGlvbiI6IlRlc3QgbWludCJ9',
    'Test Mint - Verified Student'
  );
  const receipt = await tx.wait();

  // Get the private key of Ganache's first deterministic account
  const GANACHE_KEY = '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d';

  console.log('\n============================================');
  console.log('   CollegeVerseSBT deployed successfully!');
  console.log('============================================');
  console.log(`   Contract: ${address}`);
  console.log(`   Test TX:  ${receipt.hash}`);
  console.log(`   Owner:    ${deployer.address}`);
  console.log('============================================\n');
  console.log('Copy these to .env.development:\n');
  console.log(`POLYGON_AMOY_RPC_URL=http://127.0.0.1:8545`);
  console.log(`SBT_CONTRACT_ADDRESS=${address}`);
  console.log(`ADMIN_WALLET_PRIVATE_KEY=${GANACHE_KEY}`);
  console.log(`WALLET_ENCRYPTION_KEY=collegeverse-dev-encryption-key-2024\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
