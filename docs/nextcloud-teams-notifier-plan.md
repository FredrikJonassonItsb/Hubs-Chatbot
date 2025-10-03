# Kravställning och teknisk implementationsplan: Nextcloud-Teams notifieringsbot

## 1. Bakgrund och mål

Syftet med projektet är att skapa en Microsoft Teams-bot som i realtid informerar användare om viktiga händelser i en vald Nextcloud-instans utan att flytta konfidentiellt innehåll till Microsofts moln. Boten ska förstärka produktiviteten genom att samla notifieringar för e-post, kalender och Nextcloud Talk direkt i Teams samtidigt som Nextcloud fortsätter vara det enda systemet där innehållet lagras och hanteras.

## 2. Intressenter

| Intressent | Roll | Huvudbehov |
|------------|------|------------|
| Slutanvändare (Nextcloud/Teams-användare) | Mottar notifieringar | Vill ha snabba aviseringar utan att röja innehåll. |
| Teams-tenantadministratör | Distribuerar appen | Enkel installation, kontroll över notifieringstyper per kanal/tenant. |
| Nextcloud-administratör | Registrerar OAuth-klient & webhooks | Säkert utbyte, inga extra behörigheter. |
| Säkerhets- och regelefterlevnadsteam | Granskning | Dataskydd, loggning utan PII, möjlighet till revision. |
| DevOps/Support | Drift & support | Observabilitet, tydliga larm, enkla uppdateringar. |

## 3. Omfattning

### 3.1 Ingår

- Proaktiv bot i Teams (personlig chat, team-kanaler, eventuellt gruppchattar).
- OAuth2/OIDC-inloggning mot vald Nextcloud-instans per tenant/användare.
- Notifieringar för: inkommande e-post (Nextcloud Mail), kalenderbokningar (Nextcloud Kalender), nya meddelanden i Nextcloud Talk.
- Konfigurerbara notifieringskategorier per användare/kanal.
- Enkel inställningsdialog via Adaptive Card och valfri personal tab.
- Backend-tjänst med stöd för Nextcloud-webhooks och polling.
- Säker tokenhantering, signaturvalidering och loggning.
- Grundläggande DevOps: CI/CD, övervakning och hantering av feltillstånd.

### 3.2 Ingår inte (initial release)

- Åtgärdskommandon i Teams (svara på mail, boka möte etc.).
- Notifiering av övriga Nextcloud-appar (Files, Deck, Flow etc.).
- Officiella mobilklient-anpassningar utöver Teams standardstöd.
- Lokaliseringsstöd utöver svenska/engelska.

## 4. Funktionella krav

| ID | Krav | Prioritet |
|----|------|-----------|
| F1 | Boten ska kunna installeras i personlig chat, team-kanal och gruppchatt. | Hög |
| F2 | Användare ska kunna autentisera sig mot Nextcloud via OAuth2. | Hög |
| F3 | Boten ska lagra och uppdatera konversationsreferenser för samtliga installationer. | Hög |
| F4 | Systemet ska hämta notifieringar för mail, kalender och talk via webhooks eller polling. | Hög |
| F5 | Boten ska skicka proaktiva meddelanden med rubrik och länk till relevant Nextcloud-app. | Hög |
| F6 | Teams-meddelanden får inte innehålla konfidentiellt innehåll (ämnesrader, deltagare etc.). | Hög |
| F7 | Användare ska kunna konfigurera notifieringstyper via Adaptive Card i Teams. | Hög |
| F8 | Appen ska erbjuda en valfri personal tab för inloggning och avancerade inställningar. | Med |
| F9 | Administratör ska kunna konfigurera tenantens Nextcloud-instans och OAuth-klientuppgifter. | Hög |
| F10 | Systemet ska hantera återautentisering vid token-expiration och informera användaren. | Hög |
| F11 | Boten ska stödja flerkanalsdistribution (skicka samma notis till alla registrerade konversationer). | Hög |
| F12 | Avinstallation ska rensa konversationsreferenser och stoppa notifieringar. | Hög |

## 5. Icke-funktionella krav

- **Säkerhet:** Alla externa anrop sker över TLS 1.2+. Tokens lagras krypterat och signaturer verifieras för inkommande webhooks.
- **Sekretess:** Inga känsliga data eller innehåll från Nextcloud skickas eller loggas i Teams/Backend.
- **Tillgänglighet:** Systemet ska ha 99,5 % tillgänglighet per månad. Notiser får inte ha mer än 2 minuters fördröjning vid normaldrift.
- **Skalbarhet:** Lösningen ska kunna hantera minst 5 000 samtidiga användare och 10 händelser/minut per användare.
- **Observabilitet:** Loggning, metrics och larm via Application Insights (eller motsvarande). Anonyma eventloggar för spårning av notifieringsflöde.
- **Underhållbarhet:** Modulär kod med testtäckning för central logik (>70 %).
- **Efterlevnad:** Uppfylla GDPR-krav, publicera integritetspolicy och villkor inför AppSource-listning.

## 6. Användarresor

1. **Första installationen i en tenant:**
   - Tenantadmin installerar appen från AppSource eller anpassad distribution.
   - Admin anger Nextcloud-instansens bas-URL samt OAuth-klient-ID/secret via admininställning.
   - Boten bekräftar att anslutningen fungerar.

2. **Personlig onboarding:**
   - Användaren lägger till boten i sin personliga Teams-chat.
   - Boten skickar välkomstmeddelande med OAuth-login.
   - Efter framgångsrik inloggning visas ett Adaptive Card med kryssrutor för notifieringstyper.
   - Användaren sparar val, boten bekräftar och startar prenumeration.

3. **Team-kanal onboarding:**
   - En kanalägare lägger till boten i kanalen.
   - Boten ber om att en ansvarig autentiserar mot Nextcloud-konto (t.ex. delad kalender).
   - Kanalinställningar sparas och notifieringar distribueras till hela kanalen.

4. **Löpande notifiering:**
   - Nytt mail registreras i Nextcloud → webhook/polling triggar backend → Teams-meddelande skickas till alla registrerade kontexter.

5. **Token-expiration:**
   - Boten märker att access token är ogiltig → försöker refresh → om misslyckas skickas Adaptive Card för ny inloggning.

## 7. Systemarkitektur

```
Teams-klient ⇄ Microsoft Bot Framework ⇄ Bot Backend (API, Scheduler, Webhook Receiver)
                                                    ⇅
                                              Krypterad databas
                                                    ⇅
                                              Nextcloud API/Webhooks
```

### 7.1 Komponenter

- **Bot Backend (Node.js + Bot Framework SDK):** Hanterar inkommande Teams-aktiviteter, OAuth-dialoger, proaktiva utskick.
- **Webhook Receiver:** Express-endpoints för Nextcloud Webhooks och Talk-bot events med HMAC-validering.
- **Scheduler/Polling Service:** Periodiska jobb (t.ex. med BullMQ eller Azure Functions Timer) för att hämta notifieringar där webhooks saknas.
- **Notification Service:** Normaliserar Nextcloud-event till Teams-meddelanden (Adaptive Cards eller text).
- **Settings Service:** Lagrar och hämtar användar-/kanalpreferenser.
- **Crypto Utilities:** Kryptering/dekryptering av tokens med KMS/Key Vault.
- **Databas:** Azure Cosmos DB, Table Storage eller Postgres med krypterade kolumner.
- **Admin Portal (minimal):** Webbaserad vy för tenantadmins att konfigurera Nextcloud-instans.

### 7.2 Dataflöden

1. Installationshändelse (ConversationUpdate) → lagra conversation reference.
2. OAuth callback → koppla token till Teams userId/teamId → krypterad lagring.
3. Webhook/polling-event → filtrera mot preferenser → skapa Teams-aktivitet → proaktivt utskick.
4. Användarkommandon ("hjälp", "inställningar") → bot-svar/Adaptive Card.

## 8. Teknisk implementationsplan

### 8.1 Förberedelser (Vecka 1)

- Sätta upp Git-repo, CI (GitHub Actions) och grundstruktur enligt modulär design.
- Registrera Azure Bot-resurs och konfigurera utvecklingscertifikat/secret.
- Dokumentera Nextcloud OAuth-konfiguration och skapa testinstans.

### 8.2 Grundläggande bot (Vecka 2–3)

- Implementera Bot Framework-adapter, state storage och konversationshantering.
- Bygga onboarding-dialog: välkomstmeddelande, OAuthPrompt, bekräftelse.
- Skapa datamodeller (User, Conversation, Preferences) och integrera krypterad lagring.
- Implementera Adaptive Card för inställningar.

### 8.3 Nextcloud-integration (Vecka 3–5)

- Bygga Nextcloud-klient med generiska GET/POST-metoder och token-hantering.
- Implementera webhook-endpoint med HMAC-validering.
- Implementera polling-jobb för Notifications API + fallback för mail.
- Normalisera payloads till intern notifieringsmodell.

### 8.4 Proaktiva Teams-meddelanden (Vecka 5–6)

- Implementera NotificationService som mappar händelsetyp till text/Adaptive Card.
- Skicka proaktiva meddelanden via Bot Framework adapter.continueConversation.
- Säkerställa multi-konversation-support och felhantering (retry/backoff, avregistrering vid fel 403/404).

### 8.5 Admin- och tenantstöd (Vecka 6–7)

- Implementera lagring av tenantkonfiguration (Nextcloud base URL, OAuth creds).
- Skapa enkel adminvy/tab eller kommandon för att uppdatera dessa värden.
- Hantera multi-tenant routing i Nextcloud-klienten baserat på Teams-tenantId.

### 8.6 Säkerhet och compliance (Vecka 7–8)

- Integrera Key Vault/KMS för krypteringsnycklar.
- Implementera loggning med känslighetsfiltrering, larm och dashboards.
- Utföra säkerhetsgranskning (penetrationstest, kodgranskning) internt.
- Ta fram Privacy Policy, Terms of Use och dataskyddsdokumentation.

### 8.7 Testning och kvalitet (Löpande, fokus Vecka 8–9)

- Enhetstester för botlogik, webhookvalidering och notifieringshantering.
- Integrationstester mot mockad Nextcloud och Teams-emulator.
- Performance-tester (last på polling/webhook-flöde).
- Pilot med intern tenant, samla feedback.

### 8.8 Distribution (Vecka 9–10)

- Förbereda manifest, ikoner och AppSource-paket.
- Genomföra Microsofts valideringschecklista och ansökan till AppSource.
- Sätta upp driftsövervakning, incidentrutiner och supportkanaler.

## 9. Risker och åtgärder

| Risk | Konsekvens | Åtgärd |
|------|------------|--------|
| Nextcloud Mail saknar användbara notiser | Fördröjda mailnotiser eller saknas | Utveckla komplementär Nextcloud-app eller använd IMAP polling tills officiellt stöd finns. |
| Token-kompromettering | Full åtkomst till användarens Nextcloud | Kryptera tokens, minimera loggning, rotera secrets, lägg till möjlig manuell revokering. |
| Webhook-leverans misslyckas | Missade notifieringar | Implementera retry, fallback till polling, larm vid många misslyckanden. |
| Microsoft certifiering avslag | Försenad AppSource-listning | Följ guidelines tidigt, genomför egen checklista, förbered extra dokumentation. |
| Hög händelsevolym | Skalningsproblem | Designa horisontellt skalbar backend, använd köer och partitionering. |
| Användare upplever notifieringar som spam | Missnöje, avinstallation | Ge granulär kontroll, dämpa frekvens (t.ex. sammanfattning), tydlig instruktion om hur man stänger av. |

## 10. Avslutande rekommendationer

- Starta med pilot mot en intern Nextcloud-instans och en begränsad Teams-tenant för att snabbt verifiera flöden.
- Prioritera webbhooks för Talk och Kalender, utveckla fallback för Mail parallellt.
- Säkerställ att alla länkar i notifieringar leder till relevanta Nextcloud-vyer och fungerar i både desktop och mobil.
- Planera för kontinuerliga uppdateringar och användarfeedbackslöp.

Med denna kravställning och plan finns en tydlig väg från idé till driftsatt lösning som uppfyller både produktivitets- och säkerhetsmålen.
