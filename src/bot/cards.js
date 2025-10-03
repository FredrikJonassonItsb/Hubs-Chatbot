function buildSettingsCard(preferences) {
  const { mail = true, calendar = true, talk = true } = preferences || {};
  return {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.5',
    body: [
      {
        type: 'TextBlock',
        text: 'Notifieringsinställningar',
        weight: 'Bolder',
        size: 'Medium'
      },
      {
        type: 'TextBlock',
        text: 'Välj vilka Nextcloud-händelser som ska trigga notifieringar i Teams.',
        wrap: true,
        spacing: 'Small'
      },
      {
        type: 'Input.Toggle',
        title: 'E-post',
        value: mail ? 'true' : 'false',
        valueOn: 'true',
        valueOff: 'false',
        id: 'mail'
      },
      {
        type: 'Input.Toggle',
        title: 'Kalender',
        value: calendar ? 'true' : 'false',
        valueOn: 'true',
        valueOff: 'false',
        id: 'calendar'
      },
      {
        type: 'Input.Toggle',
        title: 'Talk (chatt)',
        value: talk ? 'true' : 'false',
        valueOn: 'true',
        valueOff: 'false',
        id: 'talk'
      }
    ],
    actions: [
      {
        type: 'Action.Submit',
        title: 'Spara inställningar',
        data: {
          action: 'savePreferences'
        }
      }
    ]
  };
}

function buildWelcomeCard(loginUrl) {
  return {
    type: 'AdaptiveCard',
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    version: '1.5',
    body: [
      {
        type: 'TextBlock',
        text: 'Välkommen till Nextcloud notifieringsbot',
        weight: 'Bolder',
        size: 'Medium'
      },
      {
        type: 'TextBlock',
        text: 'Logga in mot Nextcloud för att koppla ditt konto och börja ta emot notifieringar i Teams.',
        wrap: true
      }
    ],
    actions: [
      {
        type: 'Action.OpenUrl',
        title: 'Logga in på Nextcloud',
        url: loginUrl
      },
      {
        type: 'Action.Submit',
        title: 'Visa inställningar',
        data: {
          action: 'showSettings'
        }
      }
    ]
  };
}

module.exports = {
  buildSettingsCard,
  buildWelcomeCard
};
