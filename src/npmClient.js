const axios = require('axios');

class NpmClient {
  constructor(baseUrl, email, password) {
    if (!baseUrl) throw new Error('NPM_BASE_URL is required');
    if (!email) throw new Error('NPM_EMAIL is required');
    if (!password) throw new Error('NPM_PASSWORD is required');
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.email = email;
    this.password = password;
    this.token = null;
  }

  async login() {
    const url = `${this.baseUrl}/api/tokens`;
    try {
      const res = await axios.post(url, {
        identity: this.email,
        secret: this.password,
      }, {
        timeout: 10000,
      });
      const token = res.data && (res.data.token || res.data.jwt || res.data.access_token);
      if (!token) {
        throw new Error('No token returned from NPM');
      }
      this.token = token;
      return token;
    } catch (err) {
      const msg = err.response ? `${err.response.status} ${err.response.statusText}` : err.message;
      throw new Error(`Failed to authenticate with NPM: ${msg}`);
    }
  }

  async _authorizedRequest(config, retry = true) {
    if (!this.token) {
      await this.login();
    }
    const headers = Object.assign({}, config.headers, {
      Authorization: `Bearer ${this.token}`,
    });
    try {
      const res = await axios(Object.assign({}, config, { headers }));
      return res.data;
    } catch (err) {
      if ((err.response && (err.response.status === 401 || err.response.status === 403)) && retry) {
        this.token = null;
        await this.login();
        return this._authorizedRequest(config, false);
      }
      const msg = err.response ? `${err.response.status} ${err.response.statusText}` : err.message;
      throw new Error(`NPM API request failed: ${msg}`);
    }
  }

  async getProxyHosts() {
    const url = `${this.baseUrl}/api/nginx/proxy-hosts`;
    return this._authorizedRequest({ method: 'GET', url, timeout: 10000 });
  }

  async getRedirectionHosts() {
    const url = `${this.baseUrl}/api/nginx/redirection-hosts`;
    return this._authorizedRequest({ method: 'GET', url, timeout: 10000 });
  }

  async getStreams() {
    const url = `${this.baseUrl}/api/nginx/streams`;
    return this._authorizedRequest({ method: 'GET', url, timeout: 10000 });
  }

  getAdminEditUrlFor(type, id) {
    const base = this.baseUrl.replace(/\/$/, '');
    switch (type) {
      case 'proxy':
        return `${base}/nginx/proxy/edit/${id}`;
      case 'redirect':
        return `${base}/nginx/redirection/edit/${id}`;
      case 'stream':
        return `${base}/nginx/stream/edit/${id}`;
      default:
        return `${base}`;
    }
  }
}

module.exports = NpmClient;
