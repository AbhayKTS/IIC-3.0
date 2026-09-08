/**
 * Wallet Service — Custodial wallet generation & encryption (AES-256-GCM)
 * Generates wallets for students, encrypts private keys, stores in Firestore
 */
const { ethers } = require('ethers');
const crypto = require('crypto');
const { db } = require('./firebaseAdmin');
const logger = require('../utils/logger');

const COLLECTION = 'wallets';
const ALGORITHM = 'aes-256-gcm';

// Derive a deterministic 32-byte key from the env secret
const getEncryptionKey = () => {
  const secret = process.env.WALLET_ENCRYPTION_KEY || 'default-dev-key-change-me';
  return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Encrypt a private key string
 * @returns {{ iv: string, encrypted: string, tag: string }}
 */
const encrypt = (plaintext) => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return { iv: iv.toString('hex'), encrypted, tag };
};

/**
 * Decrypt a private key
 */
const decrypt = ({ iv, encrypted, tag }) => {
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

/**
 * Generate a new wallet for a student and store it (encrypted) in Firestore
 * @param {string} studentId - Firebase UID
 * @returns {{ address: string }}
 */
const generateWallet = async (studentId) => {
  // Check if wallet already exists
  const existing = await db.collection(COLLECTION).doc(studentId).get();
  if (existing.exists) {
    logger.info(`[Wallet] Wallet already exists for student ${studentId}`);
    return { address: existing.data().address };
  }

  // Generate random wallet
  const wallet = ethers.Wallet.createRandom();
  const encryptedKey = encrypt(wallet.privateKey);

  await db.collection(COLLECTION).doc(studentId).set({
    address: wallet.address,
    encryptedPrivateKey: encryptedKey,
    createdAt: new Date().toISOString(),
  });

  logger.info(`[Wallet] Created wallet for student ${studentId}: ${wallet.address}`);
  return { address: wallet.address };
};

/**
 * Get wallet address for a student
 */
const getWalletAddress = async (studentId) => {
  const doc = await db.collection(COLLECTION).doc(studentId).get();
  if (!doc.exists) return null;
  return doc.data().address;
};

/**
 * Get full wallet info (address only — never expose private key via API)
 */
const getWalletInfo = async (studentId) => {
  const doc = await db.collection(COLLECTION).doc(studentId).get();
  if (!doc.exists) return null;
  return {
    address: doc.data().address,
    createdAt: doc.data().createdAt,
  };
};

module.exports = {
  generateWallet,
  getWalletAddress,
  getWalletInfo,
  encrypt,
  decrypt,
};
