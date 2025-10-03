const { TeamsActivityHandler, CardFactory, TurnContext } = require('botbuilder');
const {
  upsertInstallation,
  updatePreferences,
  getInstallationByConversationId,
  removeInstallationByConversationId
} = require('../models/installationStore');
const NotificationService = require('../services/notificationService');
const { buildSettingsCard, buildWelcomeCard } = require('./cards');
const config = require('../utils/config');

class TeamsBot extends TeamsActivityHandler {
  constructor(adapter, logger = console) {
    super();
    this.adapter = adapter;
    this.logger = logger;
    this.notificationService = new NotificationService(adapter, logger);
    this.notificationService.start();

    this.onMembersAdded(async (context, next) => {
      await this.handleMembersAdded(context);
      await next();
    });

    this.onMessage(async (context, next) => {
      await this.handleMessage(context);
      await next();
    });

    this.onMembersRemoved(async (context, next) => {
      await this.handleMembersRemoved(context);
      await next();
    });
  }

  async handleMembersAdded(context) {
    const membersAdded = context.activity.membersAdded || [];
    const botId = context.activity.recipient?.id;
    for (const member of membersAdded) {
      if (member.id === botId) {
        const installation = await this.registerInstallation(context);
        await this.sendWelcomeCard(context, installation);
      }
    }
  }

  async handleMessage(context) {
    const conversationId = context.activity.conversation?.id;
    let installation = await getInstallationByConversationId(conversationId);
    if (!installation) {
      installation = await this.registerInstallation(context);
    }

    if (context.activity.value?.action) {
      await this.handleCardAction(context, installation);
      return;
    }

    let text = context.activity.text || '';
    const withoutMention = TurnContext.removeRecipientMention(context.activity);
    if (withoutMention) {
      text = withoutMention;
    }
    text = text.trim().toLowerCase();
    if (!text) {
      await context.sendActivity('Jag förstod inte din begäran. Skriv "hjälp" för tillgängliga kommandon.');
      return;
    }

    if (text.includes('hjälp') || text.includes('help')) {
      await this.sendHelp(context);
      return;
    }

    if (text.includes('inställningar') || text.includes('settings')) {
      await this.sendSettingsCard(context, installation);
      return;
    }

    if (text.includes('login') || text.includes('logga in')) {
      await this.sendLoginCard(context, installation);
      return;
    }

    if (text.includes('status')) {
      await this.sendStatus(context, installation);
      return;
    }

    await context.sendActivity('Jag känner inte igen kommandot. Skriv "hjälp" för att se alternativen.');
  }

  async handleMembersRemoved(context) {
    const membersRemoved = context.activity.membersRemoved || [];
    const botId = context.activity.recipient?.id;
    if (membersRemoved.some((member) => member.id === botId)) {
      const conversationId = context.activity.conversation?.id;
      if (conversationId) {
        await removeInstallationByConversationId(conversationId);
        this.logger.info(`Tog bort installation för konversation ${conversationId}`);
      }
    }
  }

  async registerInstallation(context) {
    const conversationReference = TurnContext.getConversationReference(context.activity);
    const conversationType = context.activity.conversation?.conversationType;
    const installation = await upsertInstallation({
      conversationReference,
      type: conversationType === 'channel' ? 'channel' : 'personal',
      tenantId: context.activity.channelData?.tenant?.id,
      serviceUrl: context.activity.serviceUrl,
      aadObjectId: context.activity.from?.aadObjectId,
      teamsUserId: context.activity.from?.id,
      teamId: context.activity.channelData?.team?.id,
      channelId: context.activity.channelData?.channel?.id,
      preferences: {}
    });
    return installation;
  }

  async sendWelcomeCard(context, installation) {
    const loginUrl = this.buildLoginUrl(installation.id);
    const card = buildWelcomeCard(loginUrl);
    await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
    await this.sendHelp(context);
  }

  buildLoginUrl(installationId) {
    const base = process.env.PUBLIC_BASE_URL || `http://localhost:${config.server.port}`;
    const url = new URL('/auth/start', base);
    url.searchParams.append('installationId', installationId);
    return url.toString();
  }

  async sendHelp(context) {
    const helpText = [
      'Jag kan hjälpa dig att koppla Nextcloud till Teams och skicka notifieringar.',
      'Tillgängliga kommandon:',
      '• **logga in** – starta Nextcloud-inloggning',
      '• **inställningar** – ändra notifieringskategorier',
      '• **status** – visa status för din koppling',
      '• **hjälp** – visa denna lista'
    ].join('\n');
    await context.sendActivity(helpText);
  }

  async sendSettingsCard(context, installation) {
    const card = buildSettingsCard(installation.preferences);
    await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
  }

  async sendLoginCard(context, installation) {
    const loginUrl = this.buildLoginUrl(installation.id);
    const card = buildWelcomeCard(loginUrl);
    await context.sendActivity({ attachments: [CardFactory.adaptiveCard(card)] });
  }

  async sendStatus(context, installation) {
    const statusLines = [];
    if (installation.nextcloud?.accessToken) {
      statusLines.push('✅ Nextcloud är kopplat.');
    } else {
      statusLines.push('⚠️ Inte inloggad mot Nextcloud. Skriv "logga in".');
    }
    const preferences = installation.preferences || {};
    statusLines.push('Notifieringar:');
    statusLines.push(`• E-post: ${preferences.mail === false ? 'av' : 'på'}`);
    statusLines.push(`• Kalender: ${preferences.calendar === false ? 'av' : 'på'}`);
    statusLines.push(`• Talk: ${preferences.talk === false ? 'av' : 'på'}`);
    await context.sendActivity(statusLines.join('\n'));
  }

  async handleCardAction(context, installation) {
    const action = context.activity.value.action;
    if (action === 'savePreferences') {
      const updates = {};
      if (typeof context.activity.value.mail !== 'undefined') {
        updates.mail = context.activity.value.mail === 'true';
      }
      if (typeof context.activity.value.calendar !== 'undefined') {
        updates.calendar = context.activity.value.calendar === 'true';
      }
      if (typeof context.activity.value.talk !== 'undefined') {
        updates.talk = context.activity.value.talk === 'true';
      }
      if (Object.keys(updates).length === 0) {
        await context.sendActivity('Inga inställningar uppdaterades.');
        return;
      }
      await updatePreferences(installation.id, updates);
      await context.sendActivity('Inställningarna har uppdaterats.');
    } else if (action === 'showSettings') {
      await this.sendSettingsCard(context, installation);
    } else {
      await context.sendActivity('Okänt kort-kommando.');
    }
  }
}

module.exports = TeamsBot;
