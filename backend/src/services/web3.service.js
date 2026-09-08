/**
 * Web3 Service — Isolated module for blockchain interactions
 * Uses ethers.js v6 to interact with CollegeVerseSBT contract on Polygon Amoy
 */
const { ethers } = require('ethers');
const logger = require('../utils/logger');

// Minimal ABI — only the functions we call
const SBT_ABI = [
  'function mint(address to, string uri, string reason) public returns (uint256)',
  'function totalMinted() public view returns (uint256)',
  'function tokenURI(uint256 tokenId) public view returns (string)',
  'function ownerOf(uint256 tokenId) public view returns (address)',
  'function balanceOf(address owner) public view returns (uint256)',
  'event SBTMinted(address indexed to, uint256 indexed tokenId, string reason)',
];

let provider = null;
let adminWallet = null;
let contract = null;

/**
 * Initialize the Web3 provider, admin wallet, and contract instance
 */
const init = () => {
  if (contract) return { provider, adminWallet, contract };

  const rpcUrl = process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology';
  const adminKey = process.env.ADMIN_WALLET_PRIVATE_KEY;
  const contractAddress = process.env.SBT_CONTRACT_ADDRESS;

  if (!adminKey || !contractAddress) {
    logger.warn('[Web3] Missing ADMIN_WALLET_PRIVATE_KEY or SBT_CONTRACT_ADDRESS — Web3 disabled');
    return { provider: null, adminWallet: null, contract: null };
  }

  provider = new ethers.JsonRpcProvider(rpcUrl);
  adminWallet = new ethers.Wallet(adminKey, provider);
  contract = new ethers.Contract(contractAddress, SBT_ABI, adminWallet);

  logger.info(`[Web3] Connected to Polygon Amoy | Admin: ${adminWallet.address} | Contract: ${contractAddress}`);
  return { provider, adminWallet, contract };
};

/**
 * Mint an SBT to a student's wallet
 * @param {string} toAddress - Student's wallet address
 * @param {string} reason - Human-readable reason
 * @param {object} metadata - Token metadata (title, description, etc.)
 * @returns {{ tokenId: number, txHash: string }}
 */
const mintSBT = async (toAddress, reason, metadata = {}) => {
  const { contract: c } = init();
  if (!c) throw new Error('Web3 not configured');

  // Create a simple on-chain URI with base64-encoded JSON metadata
  const tokenMetadata = {
    name: metadata.title || reason,
    description: reason,
    image: metadata.image || '',
    attributes: [
      { trait_type: 'Platform', value: 'CollegeVerse' },
      { trait_type: 'Type', value: metadata.type || 'Achievement' },
      { trait_type: 'Issued', value: new Date().toISOString() },
    ],
  };

  const uri = `data:application/json;base64,${Buffer.from(JSON.stringify(tokenMetadata)).toString('base64')}`;

  logger.info(`[Web3] Minting SBT to ${toAddress} | Reason: ${reason}`);

  const tx = await c.mint(toAddress, uri, reason);
  const receipt = await tx.wait();

  // Parse the SBTMinted event to get tokenId
  const mintEvent = receipt.logs.find((log) => {
    try {
      const parsed = c.interface.parseLog(log);
      return parsed && parsed.name === 'SBTMinted';
    } catch {
      return false;
    }
  });

  let tokenId = 0;
  if (mintEvent) {
    const parsed = c.interface.parseLog(mintEvent);
    tokenId = Number(parsed.args.tokenId);
  }

  logger.info(`[Web3] SBT minted! Token #${tokenId} | TX: ${receipt.hash}`);

  return {
    tokenId,
    txHash: receipt.hash,
    contractAddress: process.env.SBT_CONTRACT_ADDRESS,
    network: 'polygon-amoy',
  };
};

/**
 * Get total minted SBTs
 */
const getTotalMinted = async () => {
  const { contract: c } = init();
  if (!c) return 0;
  const total = await c.totalMinted();
  return Number(total);
};

/**
 * Get token metadata URI
 */
const getTokenURI = async (tokenId) => {
  const { contract: c } = init();
  if (!c) return null;
  return c.tokenURI(tokenId);
};

/**
 * Get admin wallet address
 */
const getAdminAddress = () => {
  const { adminWallet: w } = init();
  return w ? w.address : null;
};

module.exports = {
  init,
  mintSBT,
  getTotalMinted,
  getTokenURI,
  getAdminAddress,
};
