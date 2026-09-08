const mockVerifyIdToken = jest.fn(async (token) => ({
  uid: token || 'test_uid',
  email_verified: true,
  email: 'test@example.edu',
}));

const auth = () => ({
  verifyIdToken: mockVerifyIdToken,
});

const firestore = () => ({
  collection: jest.fn(),
});

module.exports = {
  auth,
  firestore,
  credential: {
    cert: jest.fn(),
    applicationDefault: jest.fn(),
  },
  initializeApp: jest.fn(),
  _mockVerifyIdToken: mockVerifyIdToken,
};
