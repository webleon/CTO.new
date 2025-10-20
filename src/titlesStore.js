const fs = require('fs');
const path = require('path');

class TitlesStore {
  constructor(storePath) {
    this.storePath = storePath || process.env.TITLES_STORE_PATH || '/data/app/titles.json';
    this.overrides = {};
    this.snapshotVersion = 0;
    this._loaded = false;
    this._initPromise = null;
    this._persistInFlight = null;
  }

  async ready() {
    if (!this._initPromise) {
      this._initPromise = this._loadFromDisk();
    }
    return this._initPromise;
  }

  async _ensureDir() {
    const dir = path.dirname(this.storePath);
    await fs.promises.mkdir(dir, { recursive: true });
  }

  async _loadFromDisk() {
    await this._ensureDir();
    try {
      const buf = await fs.promises.readFile(this.storePath, 'utf8');
      if (buf && buf.trim()) {
        const parsed = JSON.parse(buf);
        if (parsed && typeof parsed === 'object') {
          this.overrides = parsed;
        }
      }
    } catch (err) {
      if (err && err.code !== 'ENOENT') {
        // If the file exists but is invalid, start with empty map.
        this.overrides = {};
      }
    } finally {
      this._loaded = true;
    }
  }

  getSnapshotVersion() {
    return this.snapshotVersion;
  }

  _stableStringify(obj) {
    const keys = Object.keys(obj).sort();
    const ordered = {};
    for (const k of keys) ordered[k] = obj[k];
    return JSON.stringify(ordered, null, 2) + '\n';
  }

  async _persist() {
    if (this._persistInFlight) {
      // Ensure sequential writes
      await this._persistInFlight;
    }
    const persistOp = (async () => {
      await this._ensureDir();
      const dir = path.dirname(this.storePath);
      const tmpPath = path.join(dir, `.titles.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      const json = this._stableStringify(this.overrides);
      await fs.promises.writeFile(tmpPath, json, { encoding: 'utf8', mode: 0o600 });
      await fs.promises.rename(tmpPath, this.storePath);
    })();
    this._persistInFlight = persistOp;
    try {
      await persistOp;
    } finally {
      this._persistInFlight = null;
    }
  }

  getOverride(id) {
    const key = String(id);
    return this.overrides[key];
  }

  async setOverride(id, title) {
    await this.ready();
    const key = String(id);
    const value = title == null ? '' : String(title);
    if (this.overrides[key] === value) return false;
    this.overrides[key] = value;
    this.snapshotVersion += 1;
    await this._persist();
    return true;
  }

  async clearOverride(id) {
    await this.ready();
    const key = String(id);
    if (!(key in this.overrides)) return false;
    delete this.overrides[key];
    this.snapshotVersion += 1;
    await this._persist();
    return true;
  }

  getAllOverrides() {
    return Object.assign({}, this.overrides);
  }
}

// Singleton helpers
let singleton = null;

function getStore() {
  if (!singleton) {
    singleton = new TitlesStore(process.env.TITLES_STORE_PATH);
  }
  return singleton;
}

async function loadTitlesStore() {
  return getStore().ready();
}

function getTitleOverride(id) {
  return getStore().getOverride(id);
}

async function setTitleOverride(id, title) {
  return getStore().setOverride(id, title);
}

async function clearTitleOverride(id) {
  return getStore().clearOverride(id);
}

function getSnapshotVersion() {
  return getStore().getSnapshotVersion();
}

function getAllOverrides() {
  return getStore().getAllOverrides();
}

module.exports = {
  TitlesStore,
  loadTitlesStore,
  getTitleOverride,
  setTitleOverride,
  clearTitleOverride,
  getSnapshotVersion,
  getAllOverrides,
};
