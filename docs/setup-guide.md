# Installations- och driftsguide

Den här guiden beskriver steg för steg hur du gör för att få Nextcloud-Teams notifieringsboten att köra i en egen miljö. Följ samtliga moment i ordning.

## 1. Förutsättningar

Innan du börjar behöver du ha tillgång till följande:

- En Microsoft 365-tenant där du får registrera och installera Teams-appar (kräver minst Teams-administratör).
- Tillgång till Azure Portal för att skapa en Bot Channels Registration eller Azure Bot (standard Bot Framework-resurs).
- En Nextcloud-instans där du kan skapa OAuth2-klienter (kräver administratörsbehörighet i Nextcloud).
- Node.js 18 eller senare och npm installerat på den maskin där du ska köra boten.
- Om du kör lokalt: ett verktyg för att exponera din lokala server mot internet (t.ex. [ngrok](https://ngrok.com/)).

## 2. Klona projektet och installera beroenden

```bash
git clone https://github.com/<ditt-konto>/Hubs-Chatbot.git
cd Hubs-Chatbot
npm install
```

> Om du använder ett annat repo-namn eller spegling, justera `git clone`-kommandot därefter.

## 3. Registrera boten i Azure/Microsoft Bot Framework

1. Logga in i [Azure Portal](https://portal.azure.com/).
2. Skapa en **Azure Bot** (”Create a resource” → ”AI + Machine Learning” → ”Azure Bot”).
3. Välj "Multitenant" eller din tenant beroende på behov. Ange en unik "Microsoft App ID" och skapa ett nytt "Client secret" (App password). Anteckna båda – de används i `.env`.
4. Under "Channels" aktiverar du **Microsoft Teams**.
5. Under "Configuration" ställer du in "Messaging endpoint" till `https://<din-publika-url>/api/messages` (detta uppdateras senare när du vet din faktiska url).

## 4. Skapa en OAuth2-klient i Nextcloud

1. Logga in i Nextcloud som administratör.
2. Gå till **Inställningar → Säkerhet → OAuth 2.0-klienter**.
3. Skapa en ny klient, t.ex. "Teams notifieringsbot".
4. Ange **Omdirigerings-URL** till `https://<din-publika-url>/auth/callback`.
5. Spara och anteckna **Client Identifier** och **Client Secret** – dessa går in i `.env`.
6. Kontrollera att apparna **Notifications**, **Calendar** och **Talk** är aktiverade på din Nextcloud-instans (krävs för att notifieringar ska finnas tillgängliga).

## 5. Konfigurera miljövariabler

1. Kopiera exempel-filen:
   ```bash
   cp .env.example .env
   ```
2. Öppna `.env` i din editor och fyll i:
   - `MICROSOFT_APP_ID` och `MICROSOFT_APP_PASSWORD` från Azure Bot-resursen.
   - `PUBLIC_BASE_URL` – din publika HTTPS-adress. Om du kör lokalt med ngrok fyller du i den dynamiska ngrok-URL:en.
   - `NEXTCLOUD_BASE_URL` – basadressen till din Nextcloud-instans (t.ex. `https://cloud.example.com`).
   - `NEXTCLOUD_OAUTH_CLIENT_ID` och `NEXTCLOUD_OAUTH_CLIENT_SECRET` – från steget ovan.
   - Vid behov justerar du `NEXTCLOUD_POLL_INTERVAL` (sekunder mellan pollningar mot Nextcloud Notifications API).

## 6. Kör lokalt med ngrok (valfritt men rekommenderat för test)

1. Starta den lokala servern (se steg 7) så att den lyssnar på port 3978.
2. Kör ngrok i ett separat fönster:
   ```bash
   ngrok http 3978
   ```
3. Kopiera den genererade https-adressen (t.ex. `https://ditt-id.ngrok.io`) och uppdatera:
   - `PUBLIC_BASE_URL` i `.env`.
   - "Messaging endpoint" i Azure Bot-konfigurationen till `https://ditt-id.ngrok.io/api/messages`.
   - "Omdirigerings-URL" i Nextcloud-klienten om den behöver uppdateras (måste matcha exakt `https://ditt-id.ngrok.io/auth/callback`).

## 7. Starta bot-servern

```bash
npm start
```

Standardporten är `http://localhost:3978`. Loggen skriver ut när Express-servern och Bot Framework-adaptern är igång.

## 8. Paketera och installera Teams-appen

1. Skapa ett Teams-appmanifest som pekar på ditt Microsoft App ID. Ett enklare sätt är att använda **Teams Developer Portal**:
   - Skapa ny app, fyll i grundläggande metadata.
   - Lägg till en bot med samma App ID som i Azure och aktivera scopes "Personal" och "Team".
   - Exportera app-paketet (zip) när du är klar.
2. I Teams (desktop eller web) går du till **Apps → Hantera dina appar → Ladda upp en anpassad app** och väljer zip-filen.
3. Installera appen i din personliga konversation och eventuella team-kanaler som ska få notifieringar.

## 9. Autentisera mot Nextcloud och verifiera notifieringar

1. Öppna chatten med boten i Teams. Vid första kontakten skickas ett Adaptive Card med "Logga in"-knapp.
2. Klicka på knappen, följ OAuth-flödet och godkänn åtkomst till Nextcloud.
3. När inloggningen är klar kommer boten att börja polla Nextcloud efter notifieringar enligt dina standardinställningar.
4. Testa genom att skapa en kalenderhändelse, skicka ett meddelande i Nextcloud Talk eller generera en e-postnotis. Inom det konfigurerade pollningsintervallet ska ett meddelande dyka upp i Teams.

## 10. Felsökning

- Kontrollera loggarna i terminalen där du kör `npm start` för felmeddelanden.
- Säkerställ att `PUBLIC_BASE_URL` är åtkomlig via internet och har giltigt TLS-certifikat.
- Om OAuth-flödet misslyckas: verifiera att redirect-URL:en matchar exakt i både Nextcloud-klienten och Azure Bot-konfigurationen.
- Vid 401/403 från Nextcloud: kontrollera att access-token sparats korrekt (`data/installations.json`) eller initiera om inloggningen från Teams genom kommandot "inställningar".

När samtliga steg är genomförda kör boten och levererar notifieringar i Teams.
