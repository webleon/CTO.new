const request = require('supertest');
const { createApp } = require('../src/app');
const PollingStore = require('../src/pollingStore');

class FakeReader {
  constructor(initial = []) { this._data = initial; }
  set(services) { this._data = services; }
  async getServices() { return this._data; }
}

describe('API /api/services and /health', () => {
  const oldUser = process.env.BASIC_AUTH_USER;
  const oldPass = process.env.BASIC_AUTH_PASS;
  beforeEach(() => {
    process.env.BASIC_AUTH_USER = 'user1';
    process.env.BASIC_AUTH_PASS = 'pass1';
  });
  afterEach(() => {
    process.env.BASIC_AUTH_USER = oldUser;
    process.env.BASIC_AUTH_PASS = oldPass;
  });

  test('services returns expected payload and requires Basic Auth', async () => {
    const reader = new FakeReader([{ id: 1, name: 'svc', host: 'h.com', path: '/', status: 'up' }]);
    const store = new PollingStore({ reader, pollIntervalMs: 1234, publicHttpPort: 80, publicHttpsPort: 443, pageTitle: 'Title' });
    const app = createApp({ store });

    // Not ready yet -> health 503
    const res0 = await request(app).get('/health');
    expect(res0.status).toBe(503);

    // Trigger one poll -> ready
    await store.forcePoll();
    const res1 = await request(app).get('/health');
    expect(res1.status).toBe(200);

    // Unauthorized
    const r2 = await request(app).get('/api/services');
    expect(r2.status).toBe(401);

    // Authorized
    const auth = 'Basic ' + Buffer.from('user1:pass1').toString('base64');
    const r3 = await request(app).get('/api/services').set('Authorization', auth);
    expect(r3.status).toBe(200);
    expect(r3.body).toHaveProperty('version');
    expect(r3.body).toHaveProperty('updatedAt');
    expect(r3.body).toHaveProperty('services');
    expect(r3.body).toHaveProperty('pageTitle', 'Title');
    expect(r3.body).toHaveProperty('pollIntervalMs', 1234);
    expect(Array.isArray(r3.body.services)).toBe(true);
    expect(r3.body.services[0]).toHaveProperty('httpUrl');
    expect(r3.body.services[0]).toHaveProperty('httpsUrl');
  });
});
