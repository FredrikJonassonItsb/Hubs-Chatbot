const axios = require('axios');
const qs = require('querystring');
const config = require('../utils/config');

class NextcloudClient {
  constructor(options) {
    this.baseUrl = options.baseUrl;
    this.accessToken = options.accessToken;
    this.refreshToken = options.refreshToken;
    this.expiresAt = options.expiresAt ? new Date(options.expiresAt) : null;
    this.clientId = options.clientId || config.nextcloud.oauth.clientId;
    this.clientSecret = options.clientSecret || config.nextcloud.oauth.clientSecret;
  }

  get authorizationHeader() {
    if (!this.accessToken) {
      throw new Error('Nextcloud access token saknas');
    }
    return { Authorization: `Bearer ${this.accessToken}` };
  }

  isTokenExpired() {
    if (!this.expiresAt) {
      return false;
    }
    const now = new Date();
    return now >= new Date(this.expiresAt.getTime() - 60 * 1000);
  }

  static authorizationUrl(state) {
    const redirectUri = this.redirectUri();
    const url = new URL('/apps/oauth2/authorize', config.nextcloud.baseUrl);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('client_id', config.nextcloud.oauth.clientId);
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('state', state);
    return url.toString();
  }

  static redirectUri() {
    const base = process.env.PUBLIC_BASE_URL || `http://localhost:${config.server.port}`;
    return new URL(config.nextcloud.oauth.redirectPath, base).toString();
  }

  static async exchangeCodeForToken(code) {
    const redirectUri = this.redirectUri();
    const tokenUrl = new URL('/apps/oauth2/api/v1/token', config.nextcloud.baseUrl);
    const body = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: config.nextcloud.oauth.clientId,
      client_secret: config.nextcloud.oauth.clientSecret
    };
    const response = await axios.post(tokenUrl.toString(), qs.stringify(body), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data;
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('Refresh token saknas');
    }
    const tokenUrl = new URL('/apps/oauth2/api/v1/token', this.baseUrl);
    const body = {
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret
    };
    const response = await axios.post(tokenUrl.toString(), qs.stringify(body), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    this.accessToken = response.data.access_token;
    this.refreshToken = response.data.refresh_token || this.refreshToken;
    if (response.data.expires_in) {
      this.expiresAt = new Date(Date.now() + response.data.expires_in * 1000);
    }
    return response.data;
  }

  async fetchNotifications() {
    if (!this.baseUrl) {
      throw new Error('Nextcloud baseUrl saknas');
    }
    if (!this.accessToken) {
      throw new Error('Nextcloud access token saknas');
    }
    const url = new URL('/ocs/v2.php/apps/notifications/api/v2/notifications', this.baseUrl);
    const response = await axios.get(url.toString(), {
      headers: {
        ...this.authorizationHeader,
        'OCS-APIRequest': 'true',
        Accept: 'application/json'
      }
    });
    return response.data?.ocs?.data || [];
  }
}

module.exports = NextcloudClient;
