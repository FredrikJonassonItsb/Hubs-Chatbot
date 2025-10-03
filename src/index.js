require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { BotFrameworkAdapter } = require('botbuilder');
const TeamsBot = require('./bot/teamsBot');
const config = require('./utils/config');
const NextcloudClient = require('./nextcloud/nextcloudClient');
const {
  updateNextcloudCredentials
} = require('./models/installationStore');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const adapter = new BotFrameworkAdapter({
  appId: config.bot.appId,
  appPassword: config.bot.appPassword
});

adapter.onTurnError = async (context, error) => {
  console.error('Fel i boten:', error);
  await context.sendActivity('Tyvärr inträffade ett fel. Försök igen senare.');
};

const bot = new TeamsBot(adapter);

app.post('/api/messages', (req, res) => {
  adapter.processActivity(req, res, async (context) => {
    await bot.run(context);
  });
});

function encodeState(data) {
  const json = JSON.stringify(data);
  return Buffer.from(json, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeState(value) {
  let base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const json = Buffer.from(base64, 'base64').toString('utf8');
  return JSON.parse(json);
}

app.get('/auth/start', async (req, res) => {
  try {
    const installationId = req.query.installationId;
    if (!installationId) {
      res.status(400).send('installationId saknas');
      return;
    }
    if (!config.nextcloud.baseUrl || config.nextcloud.baseUrl.includes('example')) {
      res.status(500).send('NEXTCLOUD_BASE_URL är inte korrekt konfigurerad.');
      return;
    }
    const state = encodeState({ installationId });
    const authorizeUrl = NextcloudClient.authorizationUrl(state);
    res.redirect(authorizeUrl);
  } catch (err) {
    console.error('Fel vid auth start', err);
    res.status(500).send('Kunde inte initiera inloggning.');
  }
});

app.get(config.nextcloud.oauth.redirectPath, async (req, res) => {
  const { code, state, error } = req.query;
  if (error) {
    res.status(400).send(`Nextcloud fel: ${error}`);
    return;
  }
  if (!code || !state) {
    res.status(400).send('Saknar code eller state.');
    return;
  }
  try {
    const { installationId } = decodeState(state);
    const tokenData = await NextcloudClient.exchangeCodeForToken(code);
    const expiresAt = tokenData.expires_in ? new Date(Date.now() + Number(tokenData.expires_in) * 1000).toISOString() : null;
    const installation = await updateNextcloudCredentials(installationId, {
      baseUrl: config.nextcloud.baseUrl,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenType: tokenData.token_type,
      expiresAt,
      clientId: config.nextcloud.oauth.clientId,
      clientSecret: config.nextcloud.oauth.clientSecret
    });

    if (installation?.conversationReference) {
      await adapter.continueConversation(installation.conversationReference, async (context) => {
        await context.sendActivity('✅ Nextcloud-kopplingen är klar. Jag börjar bevaka notifieringar.');
      });
    }

    res.send('<html><body><h2>Inloggning slutförd</h2><p>Du kan stänga detta fönster och återgå till Teams.</p></body></html>');
  } catch (err) {
    console.error('Fel vid auth callback', err);
    res.status(500).send('Kunde inte slutföra inloggning.');
  }
});

const port = config.server.port;
app.listen(port, () => {
  console.log(`Servern kör på http://localhost:${port}`);
});
