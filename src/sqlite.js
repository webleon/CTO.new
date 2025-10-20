/*
 Read-only SQLite access for NPM proxy_host data
*/

// We require better-sqlite3 dynamically so the module can still be imported in environments
// where optional native deps are unavailable (e.g., during unit tests that mock the DB layer).
function getBetterSqlite3() {
  try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    return require('better-sqlite3');
  } catch (err) {
    return null;
  }
}

function openReadonlyDatabase(filePath) {
  const Database = getBetterSqlite3();
  if (!Database) return null;
  if (!filePath || typeof filePath !== 'string') return null;
  try {
    // readonly with small timeout so we fail fast when the DB is locked
    const db = new Database(filePath, { readonly: true, fileMustExist: true, timeout: 250 });
    return db;
  } catch (err) {
    return null;
  }
}

function tableHasColumn(db, tableName, columnName) {
  try {
    const rows = db.prepare(`PRAGMA table_info(${tableName})`).all();
    return rows.some((r) => r && (r.name === columnName || r.name === `\"${columnName}\"`));
  } catch (e) {
    return false;
  }
}

function tableExists(db, tableName) {
  try {
    const row = db.prepare('SELECT name FROM sqlite_master WHERE type = ? AND name = ?').get('table', tableName);
    return !!(row && row.name === tableName);
  } catch (e) {
    return false;
  }
}

// Normalize a domain value into a clean hostname-like string
function normalizeDomain(input) {
  if (input === null || input === undefined) return '';
  let s = String(input).trim().toLowerCase();
  if (!s) return '';
  // Remove protocol
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  // Remove credentials
  const at = s.lastIndexOf('@');
  if (at !== -1) s = s.slice(at + 1);
  // Cut off path, query, fragment
  const slash = s.indexOf('/');
  if (slash !== -1) s = s.slice(0, slash);
  const qm = s.indexOf('?');
  if (qm !== -1) s = s.slice(0, qm);
  const hash = s.indexOf('#');
  if (hash !== -1) s = s.slice(0, hash);
  // Remove port
  s = s.replace(/:\d+$/, '');
  // Trim extraneous dots/spaces
  s = s.replace(/^\.+/, '').replace(/\.+$/, '').trim();
  // Collapse duplicate dots
  s = s.replace(/\.{2,}/g, '.');
  return s;
}

// Parse the NPM domain_names field defensively into an array of strings
function parseDomainNames(raw) {
  if (raw === null || raw === undefined) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((v) => {
        if (typeof v === 'string') return v;
        if (v && typeof v === 'object') {
          if (typeof v.name === 'string') return v.name;
          if (typeof v.domain === 'string') return v.domain;
          if (typeof v.host === 'string') return v.host;
        }
        return String(v);
      })
      .filter((s) => typeof s === 'string' && s.trim().length > 0);
  }
  if (typeof raw === 'string') {
    const str = raw.trim();
    if (!str) return [];
    // Try JSON first
    try {
      const parsed = JSON.parse(str);
      return parseDomainNames(parsed);
    } catch (e) {
      // Fallback to delimiter-based splitting
      const parts = str.split(/[\n,;\s]+/g).map((s) => s.trim()).filter(Boolean);
      return parts;
    }
  }
  if (typeof raw === 'object') {
    // Some older formats could store a single object
    const cand = raw.name || raw.domain || raw.host;
    if (typeof cand === 'string') return [cand];
  }
  const coerced = String(raw).trim();
  return coerced ? [coerced] : [];
}

// Transform raw proxy_host rows into a clean services dataset
function transformProxyHostRows(rows) {
  const out = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row) continue;
    const enabled = row.enabled === 1 || row.enabled === true || row.enabled === '1' || row.enabled === 'true';
    if (!enabled) continue;
    // Respect deleted_at when present on the row
    if (Object.prototype.hasOwnProperty.call(row, 'deleted_at')) {
      if (row.deleted_at !== null && row.deleted_at !== undefined && row.deleted_at !== '') continue;
    }
    const domainsRaw = parseDomainNames(row.domain_names);
    const domainsNorm = Array.from(new Set(domainsRaw.map(normalizeDomain).filter(Boolean)));
    out.push({
      id: row.id,
      remark: row.remark || null,
      ssl_forced: row.ssl_forced === 1 || row.ssl_forced === true || row.ssl_forced === '1' || row.ssl_forced === 'true',
      domains: domainsNorm,
    });
  }
  return out;
}

function getServicesFromSqlite(env = process.env) {
  const dbPath = env.NPM_SQLITE_PATH || env.NPM_DB_PATH || '';
  if (!dbPath) return [];
  const db = openReadonlyDatabase(dbPath);
  if (!db) return [];
  try {
    if (!tableExists(db, 'proxy_host')) return [];
    const hasDeleted = tableHasColumn(db, 'proxy_host', 'deleted_at');
    const selectCols = ['id', 'domain_names', 'ssl_forced', 'remark', 'enabled'];
    if (hasDeleted) selectCols.push('deleted_at');
    const stmt = db.prepare(`SELECT ${selectCols.join(', ')} FROM proxy_host WHERE enabled = 1 ${hasDeleted ? 'AND deleted_at IS NULL' : ''}`);
    const rows = stmt.all();
    return transformProxyHostRows(rows);
  } catch (err) {
    return [];
  } finally {
    try { db.close(); } catch (e) { /* ignore */ }
  }
}

module.exports = {
  openReadonlyDatabase,
  getServicesFromSqlite,
  transformProxyHostRows,
  parseDomainNames,
  normalizeDomain,
};
