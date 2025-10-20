const PollingStore = require('../src/pollingStore');

class FakeReader {
  constructor(initial = []) {
    this._data = initial;
  }
  set(services) { this._data = services; }
  async getServices() { return this._data; }
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

describe('PollingStore', () => {
  test('version increments only when data changes and urls computed from ports', async () => {
    const reader = new FakeReader([
      { id: 1, name: 'svc', host: 'example.com', path: '/app', status: 'up' },
    ]);
    const store = new PollingStore({ reader, pollIntervalMs: 100, publicHttpPort: 8080, publicHttpsPort: 8443, pageTitle: 'My Services' });

    await store.forcePoll();
    const snap1 = store.getSnapshot();
    expect(snap1.version).toBe('1');
    expect(snap1.updatedAt).not.toBeNull();
    expect(snap1.services.length).toBe(1);
    expect(snap1.services[0].httpUrl).toBe('http://example.com:8080/app');
    expect(snap1.services[0].httpsUrl).toBe('https://example.com:8443/app');

    // No change -> version stays the same
    await store.forcePoll();
    const snap2 = store.getSnapshot();
    expect(snap2.version).toBe(snap1.version);
    expect(snap2.updatedAt.getTime()).toBe(snap1.updatedAt.getTime());

    // Change data -> version increments
    reader.set([{ id: 1, name: 'svc', host: 'example.com', path: '/app2', status: 'up' }]);
    await store.forcePoll();
    const snap3 = store.getSnapshot();
    expect(Number(snap3.version)).toBe(Number(snap1.version) + 1);
    expect(snap3.updatedAt.getTime()).toBeGreaterThan(snap1.updatedAt.getTime());
    expect(snap3.services[0].httpUrl).toBe('http://example.com:8080/app2');
    expect(snap3.meta.pageTitle).toBe('My Services');
    expect(snap3.meta.pollIntervalMs).toBe(100);
  });
});
