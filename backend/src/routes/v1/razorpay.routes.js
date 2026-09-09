const express = require('express');
const { createOrder, handleWebhook, getWalletTransactions } = require('../../controllers/razorpay.controller');
const { verifyFirebaseToken } = require('../../middleware/verifyFirebaseToken');
const { attachUserProfile } = require('../../middleware/attachUserProfile');

const router = express.Router();

// Get recruiter wallet balance and transactions
router.get(
  '/wallet',
  verifyFirebaseToken,
  attachUserProfile,
  getWalletTransactions
);

// Create a new Razorpay order
router.post(
  '/orders',
  verifyFirebaseToken,
  attachUserProfile,
  createOrder
);

// Webhook endpoint (no auth middleware, Razorpay sends signature in header)
router.post(
  '/webhook',
  handleWebhook
);

module.exports = router;
