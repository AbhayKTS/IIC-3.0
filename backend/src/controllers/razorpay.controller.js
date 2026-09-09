const Razorpay = require('razorpay');
const crypto = require('crypto');
const { FieldValue } = require('firebase-admin/firestore');
const db = require('../services/firestore');
const config = require('../config');
const { ok } = require('../utils/response');
const CustomError = require('../utils/CustomError');
const logger = require('../utils/logger');

// Central conversion rate defined in config
const getInrToTokenRate = () => {
  return config.payments?.razorpay?.inrToTokenRate || 1;
};

// Initialize Razorpay SDK client lazily or on load
let razorpayClient;
const getRazorpayClient = () => {
  const keyId = config.payments?.razorpay?.keyId || process.env.RAZORPAY_KEY_ID;
  const keySecret = config.payments?.razorpay?.keySecret || process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return razorpayClient;
};

const createOrder = async (req, res, next) => {
  try {
    const { amountInr } = req.body;
    const amountNum = Number(amountInr);
    if (!amountNum || amountNum <= 0) {
      throw new CustomError('Invalid amount. Must be greater than 0 INR', 400);
    }

    const client = getRazorpayClient();
    const keyId = config.payments?.razorpay?.keyId || process.env.RAZORPAY_KEY_ID;

    if (!client || !keyId) {
      throw new CustomError('Razorpay is not configured on the server. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET', 500);
    }

    const userId = req.userProfile?.uid || req.userProfile?.userId;
    if (!userId) {
      throw new CustomError('Authentication required', 401);
    }

    const options = {
      amount: Math.round(amountNum * 100), // Amount in paise
      currency: 'INR',
      receipt: `rcpt_${Date.now().toString(36)}`,
      notes: {
        userId,
        amountInr: String(amountNum),
      },
    };

    const order = await client.orders.create(options);
    return ok(res, {
      ...order,
      keyId, // Provide keyId so frontend doesn't need hardcoded keys
    });
  } catch (error) {
    return next(error);
  }
};

const handleWebhook = async (req, res, next) => {
  try {
    const secret = config.payments?.razorpay?.webhookSecret
      || process.env.RAZORPAY_WEBHOOK_SECRET
      || config.payments?.razorpay?.keySecret
      || process.env.RAZORPAY_KEY_SECRET;

    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      logger.warn('[Razorpay Webhook] Missing x-razorpay-signature header');
      return res.status(400).json({ error: 'Missing signature' });
    }

    // Verify signature using raw body buffer if available, else JSON string
    const rawPayload = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', secret || '')
      .update(rawPayload)
      .digest('hex');

    if (expectedSignature !== signature) {
      logger.warn('[Razorpay Webhook] Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Process payment success
    if (req.body.event === 'payment.captured') {
      const payment = req.body.payload?.payment?.entity;
      if (!payment) {
        logger.warn('[Razorpay Webhook] Missing payment entity');
        return res.status(400).json({ error: 'Missing payment entity' });
      }

      // Extract userId from payment notes or fetch order
      let userId = payment.notes?.userId;
      if (!userId && payment.order_id) {
        const client = getRazorpayClient();
        if (client) {
          try {
            const order = await client.orders.fetch(payment.order_id);
            userId = order?.notes?.userId;
          } catch (fetchErr) {
            logger.warn(`[Razorpay Webhook] Failed to fetch order ${payment.order_id}: ${fetchErr.message}`);
          }
        }
      }

      if (!userId) {
        logger.error(`[Razorpay Webhook] No userId found for payment ${payment.id}`);
        return res.status(400).json({ error: 'No userId associated with payment' });
      }

      // Idempotency check: prevent duplicate credit if webhook is retried
      const existingTxSnap = await db.collection('transactions')
        .where('txHash', '==', payment.id)
        .limit(1)
        .get();

      if (!existingTxSnap.empty) {
        logger.info(`[Razorpay Webhook] Payment ${payment.id} already processed. Skipping duplicate.`);
        return res.status(200).send('ALREADY_PROCESSED');
      }

      const amountInr = payment.amount / 100;
      const rate = getInrToTokenRate();
      const tokensToAdd = Math.round(amountInr * rate);

      logger.info(`[Razorpay Webhook] Crediting ${tokensToAdd} tokens (${amountInr} INR at rate ${rate}) to user ${userId}`);

      // Atomically update user wallet balance
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        try {
          await userRef.update({
            walletBalance: FieldValue.increment(tokensToAdd),
          });
        } catch (_) {
          // Fallback if FieldValue.increment is not supported in mock environment
          const currentTokens = userDoc.data().walletBalance || 0;
          await userRef.update({
            walletBalance: currentTokens + tokensToAdd,
          });
        }
      } else {
        await userRef.set({
          walletBalance: tokensToAdd,
        }, { merge: true });
      }

      // Save verified transaction record
      await db.collection('transactions').add({
        userId,
        type: 'TOPUP',
        label: `Wallet Top-up via Razorpay (₹${amountInr.toLocaleString('en-IN')})`,
        amount: `+${tokensToAdd} POL`,
        timestamp: Date.now(),
        status: 'confirmed',
        network: 'Fiat/INR (Razorpay)',
        txHash: payment.id,
        orderId: payment.order_id || null,
        amountInr,
        tokensCredited: tokensToAdd,
      });
    }

    return res.status(200).send('OK');
  } catch (error) {
    logger.error('[Razorpay Webhook] Error:', error);
    return res.status(500).send('Webhook Error');
  }
};

// Get user's top-up transactions and live balance
const getWalletTransactions = async (req, res, next) => {
  try {
    const userId = req.userProfile?.uid || req.userProfile?.userId;
    if (!userId) {
      throw new CustomError('Authentication required', 401);
    }

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
  getInrToTokenRate,
};
