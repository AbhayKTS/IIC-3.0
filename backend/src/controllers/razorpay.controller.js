const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../services/firestore');
const { ok } = require('../utils/response');
const CustomError = require('../utils/CustomError');
const logger = require('../utils/logger');

// Define exchange rate
const INR_TO_TOKEN_RATE = 1; // 1 INR = 1 Token (USDC equivalent for test)

// Initialize Razorpay (requires env vars)
let razorpay;
try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
} catch (err) {
  logger.warn('Razorpay SDK failed to initialize: ' + err.message);
}

const createOrder = async (req, res, next) => {
  try {
    const { amountInr } = req.body;
    if (!amountInr || amountInr <= 0) {
      throw new CustomError('Invalid amount', 400);
    }
    if (!razorpay) {
      throw new CustomError('Razorpay is not configured on the server', 500);
    }

    const options = {
      amount: Math.round(amountInr * 100), // Amount in paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: {
        userId: req.userProfile.uid,
      },
    };

    const order = await razorpay.orders.create(options);
    return ok(res, order);
  } catch (error) {
    return next(error);
  }
};

const handleWebhook = async (req, res, next) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSignature !== signature) {
      logger.warn('[Razorpay Webhook] Invalid signature');
      return res.status(400).send('Invalid signature');
    }

    // Process payment success
    if (req.body.event === 'payment.captured') {
      const payment = req.body.payload.payment.entity;
      const order = await razorpay.orders.fetch(payment.order_id);
      
      const userId = order.notes.userId;
      if (!userId) {
        throw new Error('No userId in order notes');
      }

      const amountInr = payment.amount / 100;
      const tokensToAdd = amountInr * INR_TO_TOKEN_RATE;

      // Start a Firestore transaction or batch to update wallet
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const currentTokens = userDoc.data().walletBalance || 0;
        await userRef.update({
          walletBalance: currentTokens + tokensToAdd,
        });

        // Save a transaction record
        await db.collection('transactions').add({
          userId,
          type: 'TOPUP',
          label: 'Wallet Top-up via Razorpay',
          amount: `+${tokensToAdd} USDC`,
          timestamp: Date.now(),
          status: 'confirmed',
          network: 'Fiat/INR',
          txHash: payment.id,
        });
      }
    }

    return res.status(200).send('OK');
  } catch (error) {
    logger.error('[Razorpay Webhook] Error:', error);
    return res.status(500).send('Webhook Error');
  }
};

// Create a helper to get user's top-up transactions
const getWalletTransactions = async (req, res, next) => {
  try {
    const userId = req.userProfile.uid;
    
    // First, let's get their current balance
    const userDoc = await db.collection('users').doc(userId).get();
    const balance = userDoc.exists ? (userDoc.data().walletBalance || 0) : 0;

    const snap = await db.collection('transactions')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
      
    const transactions = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return ok(res, { balance, transactions });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createOrder,
  handleWebhook,
  getWalletTransactions,
};
