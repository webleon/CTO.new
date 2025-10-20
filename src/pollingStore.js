const crypto = require('crypto');
const logger = require('./logger');

function safeHost(host) {
  if (!host) return '';
  return String(host).replace(/^https?:\/\//, '').split('/')[0];
}

function joinPath(p) {
  if (!p) return '';
  return p.startsWith('/') ? p : `/${p}`;
}

function buildUrl(protocol, host, port, path) {
  const h = safeHost(host);
  const portNum = parseInt(port, 10);
  const defaultPort = protocol === 'https' ? 443 : 80;
  const portPart = portNum && portNum !== defaultPort ? `:${portNum}` : '';
  const pathPart = joinPath(path || '');
  return `${protocol}://${h}${portPart}${pathPart}`;
}

class PollingStore {
  constructor({ reader, pollIntervalMs = 5000, publicHttpPort = 80, publicHttpsPort = 443, pageTitle = 'Services' } = {}) {
    if (!reader || typeof reader.getServices !== 'function') {
      throw new Error('PollingStore requires a reader with getServices()');
    }
    this.reader = reader;
    this.pollIntervalMs = pollIntervalMs;
    this.publicHttpPort = parseInt(publicHttpPort, 10) || 80;
    this.publicHttpsPort = parseInt(publicHttpsPort, 10) || 443;
    this.pageTitle = pageTitle;

    this._interval = null;
    this._ready = false;

    this._data = [];
    this._lastHash = null;
    this._versionCounter = 0;
    this._version = '0';
    this._updatedAt = null;
  }

  isReady() {
    return this._ready;
  }

  getSnapshot() {
    return {
      version: this._version,
      updatedAt: this._updatedAt ? new Date(this._updatedAt) : null,
      services: this._data,
      meta: {
        pageTitle: this.pageTitle,
        pollIntervalMs: this.pollIntervalMs,
        publicHttpPort: this.publicHttpPort,
        publicHttpsPort: this.publicHttpsPort,
      },
    };
  }

  async start() {
    await this._pollOnce();
    if (this._interval) clearInterval(this._interval);
    this._interval = setInterval(() => {
      this._pollOnce();
    }, this.pollIntervalMs);
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }

  async forcePoll() {
    await this._pollOnce();
  }

  async _pollOnce() {
    try {
      const rawServices = await this.reader.getServices();
      const normalized = (rawServices || []).map((s) => this._normalizeService(s));
      normalized.sort((a, b) => {
        if (a.id < b.id) return -1;
        if (a.id > b.id) return 1;
        return 0;
      });
      const hash = this._hashOf(normalized);
      const changed = hash !== this._lastHash;

      if (changed) {
        this._versionCounter += 1;
        this._version = String(this._versionCounter);
        this._updatedAt = new Date();
        this._data = normalized;
        this._lastHash = hash;
      }

      if (!this._ready) this._ready = true;

      logger.info('poll.success', {
        changed,
        version: this._version,
        count: normalized.length,
        updatedAt: this._updatedAt ? this._updatedAt.toISOString() : null,
      });
    } catch (err) {
      logger.error('poll.error', { error: String(err && err.message ? err.message : err) });
    }
  }

  _normalizeService(s) {
    const id = s.id != null ? s.id : (s.name || s.host || 'unknown');
    const host = s.host || '';
    const path = s.path || '';
    const name = s.name || host || String(id);
    const status = s.status || 'unknown';
    const httpUrl = buildUrl('http', host, this.publicHttpPort, path);
    const httpsUrl = buildUrl('https', host, this.publicHttpsPort, path);
    return { id, name, host, path, status, httpUrl, httpsUrl };
  }

  _hashOf(items) {
    const json = JSON.stringify(items);
    return crypto.createHash('sha256').update(json).digest('hex');
  }
}

module.exports = PollingStore;
