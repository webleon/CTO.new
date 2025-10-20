const dotenv = require('dotenv');
const { createApp } = require('./app');
const PollingStore = require('./pollingStore');
const { SQLiteReader, NullReader } = require('./sqliteReader');
const logger = require('./logger');

dotenv.config();

const PORT = process.env.PORT || 3000;
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '5000', 10);
const PUBLIC_HTTP_PORT = parseInt(process.env.PUBLIC_HTTP_PORT || '80', 10);
const PUBLIC_HTTPS_PORT = parseInt(process.env.PUBLIC_HTTPS_PORT || '443', 10);
const PAGE_TITLE = process.env.PAGE_TITLE || 'Services';
const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || process.env.DB_PATH;

let reader;
try {
  if (SQLITE_DB_PATH) {
    reader = new SQLiteReader(SQLITE_DB_PATH);
  } else {
    reader = new NullReader();
  }
} catch (err) {
  logger.error('sqlite.reader_init_error', { error: String(err) });
  reader = new NullReader();
}

const store = new PollingStore({
  reader,
  pollIntervalMs: POLL_INTERVAL_MS,
  publicHttpPort: PUBLIC_HTTP_PORT,
  publicHttpsPort: PUBLIC_HTTPS_PORT,
  pageTitle: PAGE_TITLE,
});

const app = createApp({ store });

app.listen(PORT, () => {
  logger.info('server.start', { port: PORT });
  store.start().catch((err) => logger.error('store.start_error', { error: String(err) }));
});
