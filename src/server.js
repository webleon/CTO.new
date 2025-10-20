const path = require('path');
const fs = require('fs');
const express = require('express');
const { config, validateConfig } = require('./config');
const createBasicAuth = require('./middleware.basicAuth');
const { loadFromSqlite } = require('./sqlitePortal');
const { buildViewModels } = require('./transform');

const app = express();

// State and polling from SQLite
const state = {
  raw: { proxies: [], redirects: [], streams: [] },
  lastUpdated: null,
  error: null,
};

// Validate config and log warnings (non-fatal)
const problems = validateConfig(config);
if (problems.length) {
  problems.forEach((p) => console.warn(`[config] ${p}`));
}

// Health endpoint (no auth)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', updatedAt: state.lastUpdated });
});

// Enforce Basic Auth for all other routes (UI + API)
app.use(createBasicAuth({
  username: config.basicAuth.username,
  password: config.basicAuth.password,
  realm: config.basicAuth.realm,
}));

function refreshData() {
  const result = loadFromSqlite(config.dbPath);
  state.raw = { proxies: result.proxies || [], redirects: result.redirects || [], streams: result.streams || [] };
  state.error = result.error || null;
  state.lastUpdated = new Date();
}

// Initial load and scheduling
refreshData();
if (config.pollIntervalMs > 0) {
  setInterval(refreshData, config.pollIntervalMs);
}

// API route for raw and transformed data
app.get('/api/data', (req, res) => {
  const adminUrlBuilder = () => '#';
  const vm = buildViewModels(state.raw, true, true, adminUrlBuilder);
  res.json({
    ok: true,
    lastUpdated: state.lastUpdated,
    error: state.error,
    data: vm,
  });
});

// Static assets
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// Render index.html with PAGE_TITLE injection
const INDEX_TEMPLATE_PATH = path.join(publicDir, 'index.html');
let indexTemplate = null;
try {
  indexTemplate = fs.readFileSync(INDEX_TEMPLATE_PATH, 'utf8');
} catch (_) {
  indexTemplate = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>%PAGE_TITLE%</title></head><body><div id="app"><h1>%PAGE_TITLE%</h1><p>Portal is running.</p></div></body></html>';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

app.get(['/', '/index.html'], (req, res) => {
  const html = indexTemplate.replace(/%PAGE_TITLE%/g, escapeHtml(config.pageTitle));
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

app.listen(config.port, () => {
  console.log(`Portal listening on port ${config.port}`);
});
