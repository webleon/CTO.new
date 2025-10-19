const express = require('express');
const dotenv = require('dotenv');
const NpmClient = require('./npmClient');
const { buildViewModels } = require('./transform');

dotenv.config();

const PORT = process.env.PORT || 3000;
const NPM_HOST = process.env.NPM_HOST;
const NPM_PORT = process.env.NPM_PORT;
let NPM_BASE_URL = process.env.NPM_BASE_URL;
const NPM_EMAIL = process.env.NPM_EMAIL;
const NPM_PASSWORD = process.env.NPM_PASSWORD;
const INCLUDE_REDIRECTS = /^true$/i.test(process.env.INCLUDE_REDIRECTS || 'false');
const INCLUDE_STREAMS = /^true$/i.test(process.env.INCLUDE_STREAMS || 'false');
const REFRESH_INTERVAL_SECONDS = parseInt(process.env.REFRESH_INTERVAL_SECONDS || '60', 10);

// Allow deriving NPM_BASE_URL from NPM_HOST/NPM_PORT when not explicitly provided
if (!NPM_BASE_URL && (NPM_HOST || NPM_PORT)) {
  const host = NPM_HOST || 'localhost';
  const port = NPM_PORT ? `:${NPM_PORT}` : '';
  NPM_BASE_URL = `http://${host}${port}`;
}

if (!NPM_BASE_URL || !NPM_EMAIL || !NPM_PASSWORD) {
  // We will not throw here to allow the page to show a helpful error message
  console.warn('NPM credentials or base URL not fully configured. Set NPM_BASE_URL, NPM_EMAIL, NPM_PASSWORD');
}

const app = express();

// Optional Basic Auth protection
const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER;
const BASIC_AUTH_PASS = process.env.BASIC_AUTH_PASS;
if (BASIC_AUTH_USER && BASIC_AUTH_PASS) {
  app.use((req, res, next) => {
    const header = req.headers['authorization'] || '';
    if (!header.startsWith('Basic ')) {
      res.set('WWW-Authenticate', 'Basic realm="Restricted"');
      return res.status(401).send('Authentication required');
    }
    const credentials = Buffer.from(header.slice(6), 'base64').toString();
    const sepIndex = credentials.indexOf(':');
    const user = sepIndex >= 0 ? credentials.slice(0, sepIndex) : credentials;
    const pass = sepIndex >= 0 ? credentials.slice(sepIndex + 1) : '';
    if (user === BASIC_AUTH_USER && pass === BASIC_AUTH_PASS) {
      return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="Restricted"');
    return res.status(401).send('Unauthorized');
  });
}

const state = {
  data: {
    proxies: [],
    redirects: [],
    streams: [],
  },
  lastUpdated: null,
  error: null,
};

let client = null;

function getAdminEditUrlFor(type, id) {
  if (!client) return '#';
  return client.getAdminEditUrlFor(type, id);
}

async function refreshData() {
  if (!NPM_BASE_URL || !NPM_EMAIL || !NPM_PASSWORD) {
    state.error = 'NPM credentials or base URL not set. Please configure environment variables.';
    return;
  }

  try {
    if (!client) {
      client = new NpmClient(NPM_BASE_URL, NPM_EMAIL, NPM_PASSWORD);
    }
    const [proxies, redirects, streams] = await Promise.all([
      client.getProxyHosts(),
      INCLUDE_REDIRECTS ? client.getRedirectionHosts() : Promise.resolve([]),
      INCLUDE_STREAMS ? client.getStreams() : Promise.resolve([]),
    ]);

    state.data = {
      proxies: Array.isArray(proxies) ? proxies : [],
      redirects: Array.isArray(redirects) ? redirects : [],
      streams: Array.isArray(streams) ? streams : [],
    };
    state.lastUpdated = new Date();
    state.error = null;
  } catch (err) {
    state.error = err.message || String(err);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderHostCard(item) {
  const statusClass = item.enabled ? 'badge-enabled' : 'badge-disabled';
  const statusText = item.enabled ? 'Enabled' : 'Disabled';
  const sslText = item.ssl_forced ? 'SSL Forced' : 'SSL';
  const linksHtml = item.links && item.links.length
    ? item.links.map((l) => `<a class="host-link" href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.host)}</a>`).join(', ')
    : (item.domains || []).map((d) => `<span class="host">${escapeHtml(d)}</span>`).join(', ');
  const editLink = item.editUrl ? `<a class="edit-link" href="${escapeHtml(item.editUrl)}" target="_blank" rel="noopener noreferrer">Edit</a>` : '';
  return `
    <div class="card">
      <div class="card-header">
        <span class="domains">${linksHtml || '<em>No domains</em>'}</span>
        <span class="status ${statusClass}">${statusText}</span>
      </div>
      <div class="card-body">
        <div class="meta"><span class="label">Upstream:</span> <span>${escapeHtml(item.upstream || '')}</span></div>
        <div class="meta"><span class="label">SSL:</span> <span>${escapeHtml(sslText)}</span></div>
        <div class="actions">${editLink}</div>
      </div>
    </div>
  `;
}

function layoutPage(content, { title = 'NPM Proxy Portal' } = {}) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { --bg: #0f172a; --fg: #e2e8f0; --muted: #94a3b8; --card: #111827; --accent: #22c55e; --danger: #ef4444; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, \"Apple Color Emoji\", \"Segoe UI Emoji\"; background: var(--bg); color: var(--fg); }
    header { padding: 16px 24px; border-bottom: 1px solid #1f2937; display: flex; justify-content: space-between; align-items: center; }
    header h1 { margin: 0; font-size: 20px; }
    header .meta { font-size: 12px; color: var(--muted); }
    main { max-width: 1100px; margin: 0 auto; padding: 16px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .card { background: var(--card); border: 1px solid #1f2937; border-radius: 8px; overflow: hidden; }
    .card-header { padding: 12px 12px; display: flex; justify-content: space-between; align-items: center; background: #0b1220; }
    .card-body { padding: 12px; }
    .domains { font-weight: 600; }
    .status { padding: 2px 8px; border-radius: 999px; font-size: 12px; }
    .badge-enabled { background: rgba(34,197,94,0.15); color: var(--accent); border: 1px solid rgba(34,197,94,0.35); }
    .badge-disabled { background: rgba(239,68,68,0.15); color: var(--danger); border: 1px solid rgba(239,68,68,0.35); }
    .meta { color: var(--muted); font-size: 13px; margin: 6px 0; }
    .meta .label { color: var(--fg); margin-right: 6px; }
    a { color: #60a5fa; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .host-link { margin-right: 6px; }
    .section { margin: 18px 0; }
    .section h2 { font-size: 16px; margin: 0 0 10px 0; color: var(--muted); }
    .error { background: rgba(239,68,68,0.15); color: var(--danger); border: 1px solid rgba(239,68,68,0.35); padding: 12px; border-radius: 8px; margin-bottom: 12px; }
    footer { text-align: center; color: var(--muted); padding: 16px; font-size: 12px; }
  </style>
</head>
<body>
  <header>
    <h1>NGINX Proxy Manager Portal</h1>
    <div class="meta">Last updated: ${state.lastUpdated ? escapeHtml(state.lastUpdated.toISOString()) : 'never'} | Refresh: ${REFRESH_INTERVAL_SECONDS}s</div>
  </header>
  <main>
    ${state.error ? `<div class=\"error\">${escapeHtml(state.error)}</div>` : ''}
    ${content}
  </main>
  <footer>Powered by Nginx Proxy Manager</footer>
</body>
</html>`;
}

function renderPage() {
  const vm = buildViewModels(state.data, INCLUDE_REDIRECTS, INCLUDE_STREAMS, getAdminEditUrlFor);
  const sections = [];

  const proxyCards = vm.proxies.map(renderHostCard).join('\n');
  sections.push(`<div class=\"section\">\n<h2>Proxy Hosts (${vm.proxies.length})</h2>\n<div class=\"grid\">${proxyCards || '<em>No items</em>'}</div>\n</div>`);

  if (INCLUDE_REDIRECTS) {
    const redirectCards = vm.redirects.map(renderHostCard).join('\n');
    sections.push(`<div class=\"section\">\n<h2>Redirection Hosts (${vm.redirects.length})</h2>\n<div class=\"grid\">${redirectCards || '<em>No items</em>'}</div>\n</div>`);
  }
  if (INCLUDE_STREAMS) {
    const streamCards = vm.streams.map(renderHostCard).join('\n');
    sections.push(`<div class=\"section\">\n<h2>Streams (${vm.streams.length})</h2>\n<div class=\"grid\">${streamCards || '<em>No items</em>'}</div>\n</div>`);
  }

  return layoutPage(sections.join('\n'));
}

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderPage());
});

app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', updatedAt: state.lastUpdated });
});

app.listen(PORT, () => {
  console.log(`NPM Proxy Portal listening on port ${PORT}`);
  refreshData();
  if (REFRESH_INTERVAL_SECONDS > 0) {
    setInterval(() => refreshData(), REFRESH_INTERVAL_SECONDS * 1000);
  }
});
