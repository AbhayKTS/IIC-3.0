const createDoc = (data = {}) => ({
  id: 'doc_1',
  data: () => data,
  exists: true,
  ref: {
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
});

const createCollection = () => ({
  doc: jest.fn(() => ({
    id: 'doc_1',
    set: jest.fn(),
    get: jest.fn(async () => createDoc()),
  })),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  get: jest.fn(async () => ({
    empty: false,
    docs: [createDoc()],
    forEach: (cb) => [createDoc()].forEach(cb),
  })),
});

const createTransaction = (overrides = {}) => ({
  get: jest.fn(async () => createDoc(overrides.profile || {})),
  set: jest.fn(),
  delete: jest.fn(),
});

const createFirestoreMock = (overrides = {}) => {
  const transaction = createTransaction(overrides);

  return {
    collection: jest.fn(() => createCollection()),
    runTransaction: jest.fn(async (fn) => fn(transaction)),
    batch: jest.fn(() => ({
      set: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn(async () => null),
    })),
    _transaction: transaction,
  };
};

module.exports = {
  createFirestoreMock,
};
