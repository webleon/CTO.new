function createBasicAuthMiddleware({ username, password, realm = 'Restricted' }) {
  return function basicAuth(req, res, next) {
    if (req.path === '/health') return next();

    const header = req.headers['authorization'] || '';
    if (!header || !header.startsWith('Basic ')) {
      res.set('WWW-Authenticate', `Basic realm="${realm}", charset="UTF-8"`);
      return res.status(401).send('Authentication required');
    }

    const base64 = header.slice(6);
    let decoded;
    try {
      decoded = Buffer.from(base64, 'base64').toString();
    } catch (_) {
      res.set('WWW-Authenticate', `Basic realm="${realm}", charset="UTF-8"`);
      return res.status(401).send('Invalid authorization header');
    }

    const idx = decoded.indexOf(':');
    const user = idx >= 0 ? decoded.slice(0, idx) : decoded;
    const pass = idx >= 0 ? decoded.slice(idx + 1) : '';

    if (user === username && pass === password) {
      return next();
    }

    res.set('WWW-Authenticate', `Basic realm="${realm}", charset="UTF-8"`);
    return res.status(401).send('Unauthorized');
  };
}

module.exports = createBasicAuthMiddleware;
