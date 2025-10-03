const config = require('../utils/config');
const NextcloudClient = require('../nextcloud/nextcloudClient');
const {
  getAllInstallations,
  updateLastNotificationId,
  updateNextcloudCredentials
} = require('../models/installationStore');

class NotificationService {
  constructor(adapter, logger = console) {
    this.adapter = adapter;
    this.logger = logger;
    this.timer = null;
  }

  start() {
    if (this.timer) {
      return;
    }
    const interval = Math.max(config.nextcloud.pollIntervalSeconds, 15) * 1000;
    this.timer = setInterval(() => {
      this.checkForUpdates().catch((err) => {
        this.logger.error('Fel vid notifieringskontroll', err);
      });
    }, interval);
    this.logger.info(`Notifieringstjänst startad med intervall ${interval / 1000}s`);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async checkForUpdates() {
    const installations = await getAllInstallations();
    for (const installation of installations) {
      try {
        await this.checkInstallation(installation);
      } catch (err) {
        this.logger.error(`Misslyckades att hämta notiser för installation ${installation.id}`, err);
      }
    }
  }

  async checkInstallation(installation) {
    if (!installation.nextcloud?.accessToken) {
      return;
    }
    const client = new NextcloudClient({
      baseUrl: installation.nextcloud.baseUrl || config.nextcloud.baseUrl,
      accessToken: installation.nextcloud.accessToken,
      refreshToken: installation.nextcloud.refreshToken,
      expiresAt: installation.nextcloud.expiresAt,
      clientId: installation.nextcloud.clientId,
      clientSecret: installation.nextcloud.clientSecret
    });

    if (client.isTokenExpired()) {
      await client.refreshAccessToken();
      await updateNextcloudCredentials(installation.id, {
        accessToken: client.accessToken,
        refreshToken: client.refreshToken,
        expiresAt: client.expiresAt ? client.expiresAt.toISOString() : null
      });
    }

    const notifications = await client.fetchNotifications();
    const sorted = notifications.sort((a, b) => Number(a.notification_id) - Number(b.notification_id));
    const newOnes = sorted.filter((notification) => {
      if (!installation.lastNotificationId) {
        return true;
      }
      return Number(notification.notification_id) > Number(installation.lastNotificationId);
    });

    if (!newOnes.length) {
      return;
    }

    const baseUrl = installation.nextcloud.baseUrl || config.nextcloud.baseUrl;
    for (const notification of newOnes) {
      const event = this.mapNotificationToEvent(notification, baseUrl);
      if (!event) {
        continue;
      }
      const isEnabled = installation.preferences?.[event.preferenceKey] ?? true;
      if (!isEnabled) {
        continue;
      }
      await this.sendNotification(installation, event, notification);
    }

    const latest = newOnes[newOnes.length - 1];
    await updateLastNotificationId(installation.id, Number(latest.notification_id));
  }

  mapNotificationToEvent(notification, baseUrl) {
    const app = notification.app?.toLowerCase() || '';
    if (app.includes('mail')) {
      return {
        title: '📬 Ett nytt mail har inkommit',
        description: 'Öppna Nextcloud Mail för att läsa meddelandet.',
        link: notification.link || (baseUrl ? new URL('/apps/mail', baseUrl).toString() : null),
        preferenceKey: 'mail'
      };
    }
    if (app.includes('calendar') || app.includes('dav') || app.includes('caldav')) {
      return {
        title: '🗓️ Ny kalenderhändelse i Nextcloud',
        description: 'Visa detaljerna i Nextcloud Kalender.',
        link: notification.link || (baseUrl ? new URL('/apps/calendar', baseUrl).toString() : null),
        preferenceKey: 'calendar'
      };
    }
    if (app.includes('talk') || app.includes('spreed')) {
      return {
        title: '💬 Nytt meddelande i Nextcloud Talk',
        description: 'Fortsätt konversationen i Nextcloud Talk.',
        link: notification.link || (baseUrl ? new URL('/apps/spreed', baseUrl).toString() : null),
        preferenceKey: 'talk'
      };
    }
    return null;
  }

  async sendNotification(installation, event, notification) {
    if (!installation.conversationReference) {
      this.logger.warn(`Ingen conversationReference för installation ${installation.id}`);
      return;
    }
    const lines = [event.title];
    if (event.link) {
      lines.push(`[Öppna i Nextcloud](${event.link})`);
    }
    await this.adapter.continueConversation(installation.conversationReference, async (context) => {
      await context.sendActivity({
        type: 'message',
        text: lines.join('\n'),
        attachments: [],
        value: {
          notificationId: notification.notification_id,
          app: notification.app
        }
      });
    });
  }
}

module.exports = NotificationService;
