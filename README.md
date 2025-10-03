# Nextcloud-Teams notifieringsbot

Denna repo innehåller en körbar Microsoft Teams-bot som integrerar mot Nextcloud och skickar säkra notifieringar för e-post, kalender och Nextcloud Talk. Lösningen inkluderar både arkitekturplanen och den faktiska Node.js-implementationen.

## Kom igång

1. Installera beroenden:

   ```bash
   npm install
   ```

2. Skapa en `.env`-fil baserat på [`.env.example`](./.env.example) och fyll i:

   - `MICROSOFT_APP_ID` och `MICROSOFT_APP_PASSWORD` från din registrerade Bot Framework-app.
   - `PUBLIC_BASE_URL` – publik URL till din bot (ngrok/hosting) som Teams och Nextcloud kan anropa.
   - `NEXTCLOUD_BASE_URL`, `NEXTCLOUD_OAUTH_CLIENT_ID`, `NEXTCLOUD_OAUTH_CLIENT_SECRET` – värden från din Nextcloud OAuth-klient.

3. Starta utvecklingsservern:

   ```bash
   npm start
   ```

   Servern lyssnar som standard på `http://localhost:3978`.

4. Uppdatera ditt Teams-appmanifest så att botens messaging endpoint pekar på `PUBLIC_BASE_URL/api/messages`. Installera appen i Teams (personal och/eller kanal).

5. När boten startar en konversation skickas en Adaptive Card med länk till Nextcloud-inloggning. Fullfölj OAuth-flödet för att aktivera notifieringar.

## Funktionalitet

- Lagrar installationer, notifieringsinställningar och Nextcloud-tokens i en lokal JSON-databas (`data/installations.json`).
- Periodiskt polling-flöde mot Nextclouds Notifications API (konfigurerbart intervall) och proaktiv utskick av meddelanden till alla konversationer där boten är installerad.
- Adaptive Cards för att logga in och konfigurera vilka notifieringskategorier (e-post, kalender, Talk) som ska levereras.
- OAuth2-flöde med Nextcloud via `/auth/start` och `/auth/callback`-endpoints.

## Projektstruktur

- [`src/index.js`](src/index.js) – Express/ Bot Framework-uppstart, OAuth-routes och webhook-endpoint.
- [`src/bot/teamsBot.js`](src/bot/teamsBot.js) – Botlogik för Teams (kommandon, inställningar, installationer).
- [`src/services/notificationService.js`](src/services/notificationService.js) – Polling och proaktiv notifiering.
- [`src/nextcloud/nextcloudClient.js`](src/nextcloud/nextcloudClient.js) – API-anrop mot Nextclouds OAuth- och Notifications-endpoints.
- [`docs/nextcloud-teams-notifier-plan.md`](docs/nextcloud-teams-notifier-plan.md) – övergripande kravställning och arkitekturplan.

## Vidare utveckling

- Koppla in Nextcloud-webhooks där det finns stöd för realtidsaviseringar.
- Ersätt filbaserad lagring med en säker molndatabas inför produktion.
- Implementera AppSource-anpassat Teams-manifest och publiceringsflöde.
