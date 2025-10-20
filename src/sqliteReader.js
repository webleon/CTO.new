let sqlite3;
try {
  // Optional dependency; tests may not require it
  sqlite3 = require('sqlite3');
} catch (e) {
  sqlite3 = null;
}

const logger = require('./logger');

class SQLiteReader {
  constructor(dbPath) {
    if (!dbPath) throw new Error('dbPath is required for SQLiteReader');
    if (!sqlite3) throw new Error('sqlite3 module not available');
    this.dbPath = dbPath;
  }

  getServices() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        }
      });
      const sql = 'SELECT id, name, host, path, status FROM services';
      db.all(sql, [], (err, rows) => {
        if (err) {
          db.close();
          return reject(err);
        }
        const services = (rows || []).map((r) => ({
          id: r.id,
          name: r.name,
          host: r.host,
          path: r.path || '',
          status: r.status || 'unknown',
        }));
        db.close((closeErr) => {
          if (closeErr) logger.error('sqlite.close_error', { error: String(closeErr) });
          resolve(services);
        });
      });
    });
  }
}

class NullReader {
  async getServices() {
    return [];
  }
}

module.exports = {
  SQLiteReader,
  NullReader,
};
