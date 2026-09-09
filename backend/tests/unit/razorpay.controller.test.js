const crypto = require('crypto');

// Mock firestore
const mockUsers = {};
const mockTransactions = [];

jest.mock('../../src/services/firestore', () => ({
  collection: (name) => {
    if (name === 'users') {
      return {
        doc: (id) => ({
          get: jest.fn().mockResolvedValue({
            exists: !!mockUsers[id],
            data: () => mockUsers[id] || {},
          }),
          update: jest.fn().mockImplementation((data) => {
            const updated = { ...data };
            if (data.walletBalance && typeof data.walletBalance === 'object' && data.walletBalance.operand !== undefined) {
              updated.walletBalance = (mockUsers[id]?.walletBalance || 0) + data.walletBalance.operand;
            }
            mockUsers[id] = { ...mockUsers[id], ...updated };
            return Promise.resolve();
          }),
          set: jest.fn().mockImplementation((data) => {
            mockUsers[id] = { ...mockUsers[id], ...data };
            return Promise.resolve();
          }),
        }),
      };
    }
    if (name === 'transactions') {
      return {
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
          }),
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                docs: mockTransactions.map((tx, idx) => ({ id: `tx_${idx}`, data: () => tx })),
              }),
            }),
          }),
        }),
        add: jest.fn().mockImplementation((data) => {
          mockTransactions.push(data);
          return Promise.resolve({ id: `tx_${Date.now()}` });
        }),
      };
    }
    return {};
  },
}));

// Mock razorpay SDK
const mockCreateOrder = jest.fn().mockResolvedValue({
  id: 'order_test_123',
  amount: 500000,
  currency: 'INR',
  status: 'created',
});

jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: mockCreateOrder,
      fetch: jest.fn().mockResolvedValue({
        id: 'order_test_123',
        notes: { userId: 'recruiter_123' },
      }),
    },
  }));
});

const razorpayController = require('../../src/controllers/razorpay.controller');
const config = require('../../src/config');

describe('Razorpay Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    config.payments = {
      razorpay: {
        keyId: 'rzp_test_mock_key',
        keySecret: 'test_mock_secret',
        webhookSecret: 'test_webhook_secret',
        inrToTokenRate: 1,
      },
    };
  });

  describe('createOrder', () => {
    it('creates an order with valid INR amount', async () => {
      const req = {
        body: { amountInr: 5000 },
        userProfile: { uid: 'recruiter_123' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await razorpayController.createOrder(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockCreateOrder).toHaveBeenCalledWith(expect.objectContaining({
        amount: 500000, // 5000 INR in paise
        currency: 'INR',
        notes: expect.objectContaining({ userId: 'recruiter_123' }),
      }));
      const jsonResponse = res.json.mock.calls[0][0];
      expect(jsonResponse.data.id).toBe('order_test_123');
      expect(jsonResponse.data.keyId).toBe('rzp_test_mock_key');
    });

    it('rejects invalid or zero amount', async () => {
      const req = {
        body: { amountInr: 0 },
        userProfile: { uid: 'recruiter_123' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await razorpayController.createOrder(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(400);
    });
  });

  describe('handleWebhook', () => {
    it('rejects missing signature', async () => {
      const req = {
        headers: {},
        body: { event: 'payment.captured' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
      };
      const next = jest.fn();

      await razorpayController.handleWebhook(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('rejects invalid signature', async () => {
      const req = {
        headers: { 'x-razorpay-signature': 'invalid_signature_hex' },
        body: { event: 'payment.captured' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
      };
      const next = jest.fn();

      await razorpayController.handleWebhook(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('successfully verifies signature and credits tokens on payment.captured', async () => {
      mockUsers['recruiter_123'] = { walletBalance: 100 };

      const body = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_test_999',
              order_id: 'order_test_123',
              amount: 500000, // 5000 INR in paise
              notes: { userId: 'recruiter_123' },
            },
          },
        },
      };

      const rawPayload = JSON.stringify(body);
      const signature = crypto
        .createHmac('sha256', 'test_webhook_secret')
        .update(rawPayload)
        .digest('hex');

      const req = {
        headers: { 'x-razorpay-signature': signature },
        body,
        rawBody: Buffer.from(rawPayload),
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
      };
      const next = jest.fn();

      await razorpayController.handleWebhook(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('OK');

      // Check balance increment
      expect(mockUsers['recruiter_123'].walletBalance).toBe(5100);

      // Check transaction creation
      expect(mockTransactions.some((t) => t.txHash === 'pay_test_999')).toBe(true);
    });
  });
});
