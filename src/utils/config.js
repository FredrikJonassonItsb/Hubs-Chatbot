const path = require('path');
const fs = require('fs');

const defaultsPath = path.join(__dirname, '../../config/default.json');
let defaults = {};
if (fs.existsSync(defaultsPath)) {
  defaults = JSON.parse(fs.readFileSync(defaultsPath, 'utf8'));
}

function envOrDefault(key, fallback) {
  if (process.env[key] !== undefined) {
    return process.env[key];
  }
  return fallback;
}

const config = {
  server: {
    port: Number(envOrDefault('PORT', defaults.server?.port ?? 3978))
  },
  nextcloud: {
    baseUrl: envOrDefault('NEXTCLOUD_BASE_URL', defaults.nextcloud?.baseUrl ?? ''),
    pollIntervalSeconds: Number(envOrDefault('NEXTCLOUD_POLL_INTERVAL', defaults.nextcloud?.pollIntervalSeconds ?? 60)),
    oauth: {
      clientId: envOrDefault('NEXTCLOUD_OAUTH_CLIENT_ID', defaults.nextcloud?.oauth?.clientId ?? ''),
      clientSecret: envOrDefault('NEXTCLOUD_OAUTH_CLIENT_SECRET', defaults.nextcloud?.oauth?.clientSecret ?? ''),
      redirectPath: envOrDefault('NEXTCLOUD_OAUTH_REDIRECT_PATH', defaults.nextcloud?.oauth?.redirectPath ?? '/auth/callback')
    }
  },
  bot: {
    appId: envOrDefault('MICROSOFT_APP_ID', ''),
    appPassword: envOrDefault('MICROSOFT_APP_PASSWORD', '')
  }
};

module.exports = config;
