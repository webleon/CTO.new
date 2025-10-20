const fs = require('fs');
const path = require('path');

function safeJsonParse(str, fallback) {
  try {
    const v = JSON.parse(str);
    return v == null ? fallback : v;
  } catch (_) {
    return fallback;
  }
}

function tryRequireBetterSqlite3() {
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies, global-require
    const Database = require('better-sqlite3');
    return Database;
  } catch (err) {
    return null;
  }
}

function mapProxyRow(row) {
  return {
    id: row.id,
    enabled: row.enabled === 1 || row.enabled === true,
    ssl_forced: row.ssl_forced === 1 || row.ssl_forced === true,
    domain_names: Array.isArray(row.domain_names)
      ? row.domain_names
      : safeJsonParse(row.domain_names || '[]', []),
    forward_scheme: row.forward_scheme || 'http',
    forward_host: row.forward_host || 'localhost',
    forward_port: row.forward_port || 80,
  };
}

function mapRedirectRow(row) {
  return {
    id: row.id,
    enabled: row.enabled === 1 || row.enabled === true,
    ssl_forced: row.ssl_forced === 1 || row.ssl_forced === true,
    domain_names: Array.isArray(row.domain_names)
      ? row.domain_names
      : safeJsonParse(row.domain_names || '[]', []),
    forward_domain_name: row.forward_domain_name || '',
  };
}

function mapStreamRow(row) {
  return {
    id: row.id,
    enabled: row.enabled === 1 || row.enabled === true,
    ssl_forced: row.ssl_forced === 1 || row.ssl_forced === true,
    incoming_protocol: row.incoming_protocol || row.protocol || 'tcp',
    incoming_port: row.incoming_port || row.port || null,
    forwarding_host: row.forwarding_host || row.forward_host || 'localhost',
    forwarding_port: row.forwarding_port || row.forward_port || null,
  };
}

function loadFromSqlite(dbPath) {
  const Database = tryRequireBetterSqlite3();
  if (!Database) {
    return { proxies: [], redirects: [], streams: [], error: 'better-sqlite3 not installed' };
    }
  if (!dbPath || !fs.existsSync(dbPath)) {
    return { proxies: [], redirects: [], streams: [], error: 'SQLite database not found' };
  }

  const db = new Database(dbPath, { readonly: true });
  try {
    // NPM table names
    const proxies = db
      .prepare('SELECT id, domain_names, forward_scheme, forward_host, forward_port, ssl_forced, enabled FROM proxy_host WHERE is_deleted = 0')
      .all()
      .map(mapProxyRow);

    const redirects = db
      .prepare('SELECT id, domain_names, forward_domain_name, ssl_forced, enabled FROM redirection_host WHERE is_deleted = 0')
      .all()
      .map(mapRedirectRow);

    const streams = db
      .prepare('SELECT id, incoming_port, forwarding_host, forwarding_port, enabled FROM stream WHERE is_deleted = 0')
      .all()
      .map(mapStreamRow);

    return { proxies, redirects, streams, error: null };
  } finally {
    try {
      db.close();
    } catch (_) {
      // ignore
    }
  }
}

module.exports = {
  loadFromSqlite,
};
