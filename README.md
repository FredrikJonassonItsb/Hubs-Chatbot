# Nextcloud-Teams notifieringsbot

Denna repo innehåller en körbar Microsoft Teams-bot som integrerar mot Nextcloud och skickar säkra notifieringar för e-post, kalender och Nextcloud Talk. Lösningen inkluderar både arkitekturplanen och den faktiska Node.js-implementationen.

## Förutsättningar

- Node.js 18+ och npm.
- Microsoft 365-tenant med rättighet att registrera och installera botar.
- Nextcloud-instans där du kan skapa OAuth2-klienter.
- Publikt nåbar URL till boten (ngrok kan användas vid lokal utveckling).

## Snabbstart

1. Installera beroenden:
   ```bash
   npm install
   ```
2. Kopiera `.env.example` till `.env` och fyll i Microsoft Bot-ID/-lösen, Nextcloud OAuth-uppgifter samt `PUBLIC_BASE_URL`.
3. Starta servern:
   ```bash
   npm start
   ```
4. Konfigurera Azure Bot-resursen så att `Messaging endpoint` pekar på `https://<public-url>/api/messages`.
5. Installera Teams-appen (via Developer Portal eller appmanifest) och följ OAuth-länken i chatten för att logga in mot Nextcloud.

## Komplett installationsguide

Behöver du ett mer detaljerat flöde – inklusive hur du skapar Azure Bot-resursen, Nextcloud OAuth-klienten, konfigurerar ngrok och paketerar Teams-appen – följ [docs/setup-guide.md](docs/setup-guide.md).

## Funktionalitet

- Lagrar installationer, notifieringsinställningar och Nextcloud-tokens i en lokal JSON-databas (`data/installations.json`).
- Pollar Nextclouds Notifications API enligt konfigurerat intervall och skickar proaktiva meddelanden till alla Teams-konversationer där boten är installerad.
- Adaptive Cards för att logga in och konfigurera vilka notifieringskategorier (e-post, kalender, Talk) som ska levereras.
- OAuth2-flöde med Nextcloud via `/auth/start` och `/auth/callback`-endpoints.

## Projektstruktur

- [`src/index.js`](src/index.js) – Express/Bot Framework-uppstart, OAuth-routes och webhook-endpoint.
- [`src/bot/teamsBot.js`](src/bot/teamsBot.js) – Botlogik för Teams (kommandon, inställningar, installationer).
- [`src/services/notificationService.js`](src/services/notificationService.js) – Polling och proaktiv notifiering.
- [`src/nextcloud/nextcloudClient.js`](src/nextcloud/nextcloudClient.js) – API-anrop mot Nextclouds OAuth- och Notifications-endpoints.
- [`docs/nextcloud-teams-notifier-plan.md`](docs/nextcloud-teams-notifier-plan.md) – kravställning och arkitekturplan.
- [`docs/setup-guide.md`](docs/setup-guide.md) – installationsinstruktioner steg för steg.

## Vidare utveckling

- Koppla in Nextcloud-webhooks där det finns stöd för realtidsaviseringar.
- Ersätt filbaserad lagring med en säker molndatabas inför produktion.
- Implementera AppSource-anpassat Teams-manifest och publiceringsflöde.
