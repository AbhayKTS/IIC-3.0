/**
 * Deploy CollegeVerseSBT to Polygon Amoy testnet
 *
 * Usage:
 *   1. Set ADMIN_WALLET_PRIVATE_KEY in .env.development (must have MATIC on Amoy)
 *   2. Run: node scripts/deploy-sbt.js
 *   3. Copy the contract address to .env.development SBT_CONTRACT_ADDRESS
 *
 * Get Amoy testnet MATIC from: https://faucet.polygon.technology/
 */
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env.development') });

const RPC_URL = process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology';
const PRIVATE_KEY = process.env.ADMIN_WALLET_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error('❌ Set ADMIN_WALLET_PRIVATE_KEY in .env.development');
  console.log('   Generate one: node -e "console.log(require(\'ethers\').Wallet.createRandom().privateKey)"');
  process.exit(1);
}

// Minimal compiled contract ABI + bytecode
// To get this, compile with solc or use Remix IDE: https://remix.ethereum.org
// Paste contracts/CollegeVerseSBT.sol, compile, copy ABI + bytecode
//
// For hackathon speed: Use Remix IDE to deploy, then paste address below.

const ABI = [
  'constructor(address initialOwner)',
  'function mint(address to, string uri, string reason) public returns (uint256)',
  'function totalMinted() public view returns (uint256)',
  'function tokenURI(uint256 tokenId) public view returns (string)',
  'function ownerOf(uint256 tokenId) public view returns (address)',
  'function balanceOf(address owner) public view returns (uint256)',
  'event SBTMinted(address indexed to, uint256 indexed tokenId, string reason)',
];

// IMPORTANT: Replace this with the actual bytecode from Remix compilation
// 1. Go to https://remix.ethereum.org
// 2. Create new file, paste contracts/CollegeVerseSBT.sol
// 3. Compile with Solidity 0.8.20+
// 4. Copy "Bytecode" from compilation details
const BYTECODE = process.env.SBT_BYTECODE || '';

async function main() {
  if (!BYTECODE) {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  QUICKEST WAY: Deploy via Remix IDE                        ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  1. Open https://remix.ethereum.org                        ║');
    console.log('║  2. Create file: CollegeVerseSBT.sol                       ║');
    console.log('║  3. Paste the contract from contracts/CollegeVerseSBT.sol   ║');
    console.log('║  4. Compile with Solidity ^0.8.20                          ║');
    console.log('║  5. Deploy → Injected Provider (MetaMask on Amoy)          ║');
    console.log('║     OR Deploy → External HTTP Provider (paste RPC URL)     ║');
    console.log('║  6. initialOwner = your admin wallet address               ║');
    console.log('║  7. Copy deployed contract address                         ║');
    console.log('║  8. Paste into .env.development SBT_CONTRACT_ADDRESS=      ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log();
    console.log('Your admin wallet address:');

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    console.log(`  ${wallet.address}`);

    const balance = await provider.getBalance(wallet.address);
    console.log(`  Balance: ${ethers.formatEther(balance)} MATIC`);

    if (balance === 0n) {
      console.log('\n⚠️  No MATIC! Get testnet MATIC from:');
      console.log('   https://faucet.polygon.technology/');
    }

    return;
  }

  console.log('🚀 Deploying CollegeVerseSBT to Polygon Amoy...');

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`  Deployer: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`  Balance: ${ethers.formatEther(balance)} MATIC`);

  const factory = new ethers.ContractFactory(ABI, BYTECODE, wallet);
  const contract = await factory.deploy(wallet.address);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\n✅ Contract deployed at: ${address}`);
  console.log(`   Explorer: https://amoy.polygonscan.com/address/${address}`);
  console.log(`\n   Add to .env.development:`);
  console.log(`   SBT_CONTRACT_ADDRESS=${address}`);
}

main().catch(console.error);
