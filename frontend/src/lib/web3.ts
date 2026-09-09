/**
 * web3.ts — Almadox Polygon Amoy Testnet Utilities
 *
 * LIVE CONTRACT: AlmadoxSBT deployed at 0x37Ca403Dba6834d23aB75f33188D5F7fF1dAd0f3
 * Tx: https://amoy.polygonscan.com/tx/0x2cf19d0e828a76317dbd2a38c3853b84a371ba5ad1a32e6ff8c1cb234b4bb7c8
 */

import { ethers } from 'ethers';

// ─── Network Config ────────────────────────────────────────────────────────────
export const AMOY_CHAIN_ID = 80002;
export const AMOY_RPC_URL = 'https://polygon-amoy.drpc.org';
export const AMOY_EXPLORER = 'https://amoy.polygonscan.com';
export const AMOY_FAUCET = 'https://faucet.polygon.technology';

// ─── Deployed Contract ────────────────────────────────────────────────────────
export const SBT_CONTRACT_ADDRESS = '0x37Ca403Dba6834d23aB75f33188D5F7fF1dAd0f3';

export const SBT_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokensOfOwner(address owner) view returns (uint256[])',
  'function achievements(uint256 tokenId) view returns (string title, string issuedBy, string reason, uint256 mintedAt, address recipient)',
  'function totalMinted() view returns (uint256)',
  'function locked(uint256 tokenId) pure returns (bool)',
  'function mint(address to, string title, string issuedBy, string reason) returns (uint256)',
  'event SBTMinted(uint256 indexed tokenId, address indexed recipient, string title, string issuedBy)',
  'event Locked(uint256 tokenId)',
] as const;

// ─── Provider ─────────────────────────────────────────────────────────────────
let _provider: ethers.providers.JsonRpcProvider | null = null;

export function getProvider(): ethers.providers.JsonRpcProvider {
  if (!_provider) {
    _provider = new ethers.providers.JsonRpcProvider(
      AMOY_RPC_URL,
      { chainId: AMOY_CHAIN_ID, name: 'Polygon Amoy Testnet' }
    );
  }
  return _provider;
}

export function getSBTContract(): ethers.Contract {
  return new ethers.Contract(SBT_CONTRACT_ADDRESS, SBT_ABI, getProvider());
}

// ─── Wallet Generation ────────────────────────────────────────────────────────
export function generateWalletFromSeed(userId: string): ethers.Wallet {
  const seed = `almadox-identity-v1-${userId}-polygon-amoy`;
  const privateKey = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(seed));
  return new ethers.Wallet(privateKey, getProvider());
}

// ─── Balance ──────────────────────────────────────────────────────────────────
export async function fetchNativeBalance(address: string): Promise<{ formatted: string; raw: ethers.BigNumber }> {
  try {
    const raw = await getProvider().getBalance(address);
    const formatted = parseFloat(ethers.utils.formatEther(raw)).toFixed(4);
    return { formatted, raw };
  } catch {
    return { formatted: '0.0000', raw: ethers.BigNumber.from(0) };
  }
}

// ─── On-Chain SBT Reading ─────────────────────────────────────────────────────
export interface OnChainSBT {
  tokenId: number;
  title: string;
  issuedBy: string;
  reason: string;
  mintedAt: number; // unix timestamp
  recipient: string;
}

export async function fetchSBTsForAddress(address: string): Promise<OnChainSBT[]> {
  try {
    const contract = getSBTContract();
    const tokenIds: ethers.BigNumber[] = await contract.tokensOfOwner(address);
    const sbts: OnChainSBT[] = await Promise.all(
      tokenIds.map(async (id) => {
        const ach = await contract.achievements(id);
        return {
          tokenId: id.toNumber(),
          title: ach.title,
          issuedBy: ach.issuedBy,
          reason: ach.reason,
          mintedAt: ach.mintedAt.toNumber(),
          recipient: ach.recipient,
        };
      })
    );
    return sbts;
  } catch {
    return [];
  }
}

export async function fetchTotalMinted(): Promise<number> {
  try {
    const contract = getSBTContract();
    const total: ethers.BigNumber = await contract.totalMinted();
    return total.toNumber();
  } catch {
    return 0;
  }
}

// ─── SBT Mint Simulation ──────────────────────────────────────────────────────
// NOTE: mint() requires the platform owner key (backend-only in production).
// In the frontend demo, we simulate the tx and link to the real contract on Polygonscan.
export interface SBTMintResult {
  txHash: string;
  tokenId: number;
  contractAddress: string;
  network: string;
  blockNumber: number;
}

export async function simulateMintSBT(
  walletAddress: string,
  achievementTitle: string,
): Promise<SBTMintResult> {
  await new Promise(r => setTimeout(r, 2500));
  const seed = `${walletAddress}-${achievementTitle}-${Date.now()}`;
  const txHash = '0x' + ethers.utils.keccak256(ethers.utils.toUtf8Bytes(seed)).slice(2);
  const tokenId = Math.floor(Math.random() * 9000) + 1000;
  return {
    txHash,
    tokenId,
    contractAddress: SBT_CONTRACT_ADDRESS,
    network: 'Polygon Amoy Testnet',
    blockNumber: 47066000 + Math.floor(Math.random() * 5000),
  };
}

// ─── MicroGig Payout Simulation ───────────────────────────────────────────────
export interface GigPayoutResult {
  txHash: string;
  amountPOL: string;
  amountUSDC?: string;
  toAddress: string;
}

export async function simulateGigPayout(
  toAddress: string,
  rewardPOL: number,
): Promise<GigPayoutResult> {
  await new Promise(r => setTimeout(r, 1800));
  const amountPOL = rewardPOL.toFixed(2);
  const seed = `payout-${toAddress}-${rewardPOL}-${Date.now()}`;
  const txHash = '0x' + ethers.utils.keccak256(ethers.utils.toUtf8Bytes(seed)).slice(2);
  return { txHash, amountPOL, amountUSDC: rewardPOL.toString(), toAddress };
}

// ─── Transaction Log (local session storage) ──────────────────────────────────
export interface TxRecord {
  hash: string;
  type: 'SBT_MINT' | 'GIG_PAYOUT' | 'POL_TRANSFER';
  label: string;
  amount?: string;
  tokenId?: number;
  contractAddress?: string;
  timestamp: number; // unix ms
  status: 'confirmed' | 'pending';
  network: 'Polygon Amoy Testnet';
}

const TX_STORAGE_KEY = 'almadox_tx_log';

export function saveTxRecord(record: TxRecord): void {
  const existing = getTxHistory();
  const updated = [record, ...existing].slice(0, 50); // keep last 50
  localStorage.setItem(TX_STORAGE_KEY, JSON.stringify(updated));
}

export function getTxHistory(): TxRecord[] {
  try {
    const raw = localStorage.getItem(TX_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearTxHistory(): void {
  localStorage.removeItem(TX_STORAGE_KEY);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function formatAddress(address: string, chars = 6): string {
  return `${address.slice(0, chars)}...${address.slice(-4)}`;
}

export function explorerTxUrl(txHash: string): string {
  return `${AMOY_EXPLORER}/tx/${txHash}`;
}

export function explorerAddressUrl(address: string): string {
  return `${AMOY_EXPLORER}/address/${address}`;
}

export function explorerContractUrl(): string {
  return `${AMOY_EXPLORER}/address/${SBT_CONTRACT_ADDRESS}`;
}
