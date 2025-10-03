const { v4: uuid } = require('uuid');
const FileStore = require('../utils/fileStore');

const store = new FileStore('installations.json', { installations: [] });

function normalizePreferences(preferences = {}) {
  return {
    mail: preferences.mail !== undefined ? preferences.mail : true,
    calendar: preferences.calendar !== undefined ? preferences.calendar : true,
    talk: preferences.talk !== undefined ? preferences.talk : true
  };
}

async function getAllInstallations() {
  const data = await store.getData();
  return data.installations;
}

async function getInstallationById(id) {
  const installations = await getAllInstallations();
  return installations.find((item) => item.id === id) || null;
}

async function getInstallationByConversationId(conversationId) {
  const installations = await getAllInstallations();
  return installations.find((item) => item.conversationReference?.conversation?.id === conversationId) || null;
}

async function upsertInstallation(partial) {
  const conversationReference = partial.conversationReference;
  let saved;
  await store.update((data) => {
    const installations = data.installations;
    const existingIndex = installations.findIndex((item) => item.id === partial.id || (conversationReference && item.conversationReference?.conversation?.id === conversationReference.conversation?.id));
    if (existingIndex >= 0) {
      const existing = installations[existingIndex];
      installations[existingIndex] = {
        ...existing,
        ...partial,
        preferences: normalizePreferences({ ...existing.preferences, ...partial.preferences }),
        lastNotificationId: partial.lastNotificationId ?? existing.lastNotificationId ?? null
      };
      saved = installations[existingIndex];
      return data;
    }

    const id = partial.id || uuid();
    installations.push({
      id,
      type: partial.type || 'personal',
      tenantId: partial.tenantId,
      serviceUrl: partial.serviceUrl,
      aadObjectId: partial.aadObjectId,
      teamsUserId: partial.teamsUserId,
      teamId: partial.teamId,
      channelId: partial.channelId,
      conversationReference,
      nextcloud: partial.nextcloud || null,
      preferences: normalizePreferences(partial.preferences),
      lastNotificationId: partial.lastNotificationId ?? null
    });
    saved = installations[installations.length - 1];
    return data;
  });
  return saved;
}

async function updateNextcloudCredentials(id, credentials) {
  let updated;
  await store.update((data) => {
    const index = data.installations.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error(`Installation ${id} not found`);
    }
    const existing = data.installations[index];
    data.installations[index] = {
      ...existing,
      nextcloud: {
        ...existing.nextcloud,
        ...credentials
      }
    };
    updated = data.installations[index];
    return data;
  });
  return updated;
}

async function updatePreferences(id, preferences) {
  let updated;
  await store.update((data) => {
    const index = data.installations.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error(`Installation ${id} not found`);
    }
    const existing = data.installations[index];
    data.installations[index] = {
      ...existing,
      preferences: normalizePreferences({ ...existing.preferences, ...preferences })
    };
    updated = data.installations[index];
    return data;
  });
  return updated;
}

async function removeInstallationByConversationId(conversationId) {
  let removed = null;
  await store.update((data) => {
    const index = data.installations.findIndex((item) => item.conversationReference?.conversation?.id === conversationId);
    if (index >= 0) {
      removed = data.installations[index];
      data.installations.splice(index, 1);
    }
    return data;
  });
  return removed;
}

async function updateLastNotificationId(id, lastNotificationId) {
  let updated;
  await store.update((data) => {
    const index = data.installations.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error(`Installation ${id} not found`);
    }
    const existing = data.installations[index];
    data.installations[index] = {
      ...existing,
      lastNotificationId
    };
    updated = data.installations[index];
    return data;
  });
  return updated;
}

module.exports = {
  getAllInstallations,
  getInstallationById,
  getInstallationByConversationId,
  upsertInstallation,
  updateNextcloudCredentials,
  updatePreferences,
  removeInstallationByConversationId,
  updateLastNotificationId
};
