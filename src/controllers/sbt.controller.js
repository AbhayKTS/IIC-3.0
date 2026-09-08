/**
 * SBT Controller — Handles SBT minting, wallet, and verification endpoints
 */
const web3Service = require('../services/web3.service');
const walletService = require('../services/wallet.service');
const { db } = require('../services/firebaseAdmin');
const logger = require('../utils/logger');

/**
 * GET /sbt/students — List all students (for admin panel)
 */
const listStudents = async (req, res) => {
  try {
    const snapshot = await db.collection('users').where('role', '==', 'student').get();
    const students = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const walletInfo = await walletService.getWalletInfo(doc.id);
      const sbtsSnap = await db.collection('sbt_tokens').where('studentId', '==', doc.id).get();

      students.push({
        id: doc.id,
        name: data.name || data.displayName || 'Unknown',
        email: data.email || '',
        walletAddress: walletInfo?.address || null,
        sbtCount: sbtsSnap.size,
        verified: !!walletInfo,
      });
    }

    res.json({ status: 'success', data: students });
  } catch (err) {
    logger.error('[SBT] listStudents error:', err);
    res.status(500).json({ status: 'error', error: { message: err.message } });
  }
};

/**
 * POST /sbt/verify/:studentId — Generate wallet + mint verification SBT
 */
const verifyStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Generate custodial wallet
    const wallet = await walletService.generateWallet(studentId);

    // Mint the Verified Student SBT
    const mintResult = await web3Service.mintSBT(wallet.address, 'Verified CollegeVerse Student', {
      title: '✅ Verified Student',
      type: 'Verification',
    });

    // Store SBT record in Firestore
    const sbtRecord = {
      studentId,
      title: '✅ Verified Student',
      reason: 'Identity verified on CollegeVerse platform',
      issuedBy: req.user?.name || 'Admin',
      date: new Date().toISOString(),
      txHash: mintResult.txHash,
      tokenId: mintResult.tokenId,
      contractAddress: mintResult.contractAddress,
      network: mintResult.network,
      walletAddress: wallet.address,
    };

    await db.collection('sbt_tokens').add(sbtRecord);

    // Also push to legacy wallet collection for compat
    await db.collection('wallet').doc(studentId).set(
      { sbts: require('firebase-admin').firestore.FieldValue.arrayUnion(sbtRecord) },
      { merge: true }
    );

    logger.info(`[SBT] Student ${studentId} verified. Token #${mintResult.tokenId}`);
    res.json({ status: 'success', data: { wallet, sbt: mintResult } });
  } catch (err) {
    logger.error('[SBT] verifyStudent error:', err);
    res.status(500).json({ status: 'error', error: { message: err.message } });
  }
};

/**
 * POST /sbt/mint/:studentId — Mint an achievement SBT
 */
const mintSbt = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { title, reason, type } = req.body;

    if (!title || !reason) {
      return res.status(400).json({ status: 'error', error: { message: 'title and reason are required' } });
    }

    const walletAddress = await walletService.getWalletAddress(studentId);
    if (!walletAddress) {
      return res.status(400).json({ status: 'error', error: { message: 'Student not verified yet — wallet required' } });
    }

    const mintResult = await web3Service.mintSBT(walletAddress, reason, { title, type: type || 'Achievement' });

    const sbtRecord = {
      studentId,
      title,
      reason,
      issuedBy: req.user?.name || 'Admin',
      date: new Date().toISOString(),
      txHash: mintResult.txHash,
      tokenId: mintResult.tokenId,
      contractAddress: mintResult.contractAddress,
      network: mintResult.network,
      walletAddress,
    };

    await db.collection('sbt_tokens').add(sbtRecord);

    await db.collection('wallet').doc(studentId).set(
      { sbts: require('firebase-admin').firestore.FieldValue.arrayUnion(sbtRecord) },
      { merge: true }
    );

    logger.info(`[SBT] Minted "${title}" to student ${studentId}. Token #${mintResult.tokenId}`);
    res.json({ status: 'success', data: { sbt: mintResult } });
  } catch (err) {
    logger.error('[SBT] mintSbt error:', err);
    res.status(500).json({ status: 'error', error: { message: err.message } });
  }
};

/**
 * GET /sbt/tokens/:studentId — Get all SBTs for a student
 */
const getStudentSbts = async (req, res) => {
  try {
    const { studentId } = req.params;
    const snapshot = await db.collection('sbt_tokens').where('studentId', '==', studentId).orderBy('date', 'desc').get();
    const sbts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ status: 'success', data: sbts });
  } catch (err) {
    logger.error('[SBT] getStudentSbts error:', err);
    res.status(500).json({ status: 'error', error: { message: err.message } });
  }
};

/**
 * GET /sbt/wallet/:studentId — Get wallet info for a student
 */
const getStudentWallet = async (req, res) => {
  try {
    const { studentId } = req.params;
    const walletInfo = await walletService.getWalletInfo(studentId);
    res.json({ status: 'success', data: walletInfo || { address: null } });
  } catch (err) {
    logger.error('[SBT] getStudentWallet error:', err);
    res.status(500).json({ status: 'error', error: { message: err.message } });
  }
};

/**
 * GET /sbt/stats — Overall SBT statistics
 */
const getStats = async (req, res) => {
  try {
    const totalMinted = await web3Service.getTotalMinted();
    const adminAddress = web3Service.getAdminAddress();
    res.json({
      status: 'success',
      data: {
        totalMinted,
        contractAddress: process.env.SBT_CONTRACT_ADDRESS || null,
        adminAddress,
        network: 'polygon-amoy',
        explorerUrl: 'https://amoy.polygonscan.com',
      },
    });
  } catch (err) {
    logger.error('[SBT] getStats error:', err);
    res.status(500).json({ status: 'error', error: { message: err.message } });
  }
};

module.exports = {
  listStudents,
  verifyStudent,
  mintSbt,
  getStudentSbts,
  getStudentWallet,
  getStats,
};
