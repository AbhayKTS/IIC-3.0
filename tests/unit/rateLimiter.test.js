const express = require('express');
const request = require('supertest');
const rateLimit = require('express-rate-limit');

describe('rate limiter', () => {
  it('allows requests within configured limit', async () => {
    const app = express();
    const limiter = rateLimit({ windowMs: 1000, max: 2, standardHeaders: true, legacyHeaders: false });
    app.use(limiter);
    app.get('/limited', (req, res) => res.json({ ok: true }));

    const first = await request(app).get('/limited');
    const second = await request(app).get('/limited');

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
  });

  it('blocks after exceeding max', async () => {
    const app = express();
    const limiter = rateLimit({ windowMs: 1000, max: 2, standardHeaders: true, legacyHeaders: false });
    app.use(limiter);
    app.get('/limited', (req, res) => res.json({ ok: true }));

    await request(app).get('/limited');
    await request(app).get('/limited');
    const blocked = await request(app).get('/limited');

    expect(blocked.status).toBe(429);
  });
});
