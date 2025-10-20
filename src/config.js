const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

function toInt(value, defaultValue) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) && n >= 0 ? n : defaultValue;
}

function toString(value, defaultValue) {
  if (value === undefined || value === null) return defaultValue;
  const s = String(value);
  return s.length ? s : defaultValue;
}

function resolveDbPath(p) {
  if (!p) return path.resolve(process.cwd(), 'data', 'npm.sqlite');
  // Expand ~ and make absolute
  if (p.startsWith('~')) {
    p = path.join(process.env.HOME || process.cwd(), p.slice(1));
  }
  if (!path.isAbsolute(p)) {
    p = path.resolve(process.cwd(), p);
  }
  return p;
}

const config = {
  port: toInt(process.env.PORT, 3000),
  dbPath: resolveDbPath(process.env.NPM_SQLITE_PATH),
  publicHttpPort: toInt(process.env.PUBLIC_HTTP_PORT, 80),
  publicHttpsPort: toInt(process.env.PUBLIC_HTTPS_PORT, 443),
  basicAuth: {
    username: toString(process.env.BASIC_AUTH_USERNAME, 'admin'),
    password: toString(process.env.BASIC_AUTH_PASSWORD, 'admin'),
    realm: 'Portal',
  },
  pollIntervalMs: toInt(process.env.POLL_INTERVAL_MS, 60000),
  pageTitle: toString(process.env.PAGE_TITLE, 'NPM Proxy Portal'),
};

function validateConfig(cfg) {
  const problems = [];
  if (!cfg.port || cfg.port <= 0) problems.push('PORT must be a positive integer');
  if (!cfg.pollIntervalMs || cfg.pollIntervalMs < 0) problems.push('POLL_INTERVAL_MS must be >= 0');
  if (!cfg.basicAuth.username || !cfg.basicAuth.password) {
    problems.push('BASIC_AUTH_USERNAME and BASIC_AUTH_PASSWORD must be set (defaults to admin/admin)');
  }
  if (!cfg.dbPath) problems.push('NPM_SQLITE_PATH must be set or resolvable');
  try {
    const dir = path.dirname(cfg.dbPath);
    if (!fs.existsSync(dir)) {
      // Not fatal, but warn
      problems.push(`Directory does not exist for NPM_SQLITE_PATH: ${dir}`);
    }
  } catch (_) {
    // ignore
  }
  return problems;
}

module.exports = {
  config,
  validateConfig,
};
