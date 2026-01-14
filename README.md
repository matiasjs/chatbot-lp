# Chatbot-LP

Unified NestJS application handling both the core chatbot logic and WhatsApp Cloud API integration.

## Architecture

This was previously a multi-repo setup but has been consolidated.
- **Main App (NestJS)**: Handles HTTP requests, Webhooks, API, and DB interactions.
- **Port**: Defaults to `3000`.

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Copy `.env.example` to `.env` and fill in the values.
   ```bash
   cp .env.example .env
   ```
   **Required for WhatsApp:**
   - `WABA_VERIFY_TOKEN`: Token you set in Meta App Dashboard.
   - `WABA_ACCESS_TOKEN`: System User Token or Permanent Token.
   - `WABA_PHONE_NUMBER_ID`: The ID of the WhatsApp phone number.

3. **Database**
   ```bash
   npm run db:migrate
   ```

## Running the App

```bash
# Development (Watch mode)
npm run start:dev

# Production
npm run start:prod
```

## WhatsApp Integration

The app exposes endpoints for WhatsApp Cloud API webhooks.

### Endpoints

- `GET /webhooks/whatsapp`: Webhook verification (used by Meta).
- `POST /webhooks/whatsapp`: Receives message events.
- `POST /dev/whatsapp/webhook`: **Dev-Only**. Simulates a webhook event without using Meta.

### Local Development (Postman)

You can test the bot logic locally using the Dev endpoint.

**URL**: `POST http://localhost:3000/dev/whatsapp/webhook`

**Payload Example (Text)**:
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "5491100000000",
          "type": "text",
          "text": { "body": "AUDIT_START" }
        }]
      }
    }]
  }]
}
```

**Payload Example (Simulating Media/CSV)**:
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "5491100000000",
          "type": "document",
          "document": {
            "id": "MEDIA_ID_OR_MOCK",
            "mime_type": "text/csv",
            "filename": "data.csv"
          }
        }]
      }
    }]
  }]
}
```
*Note: In Dev mode, real media download requires a valid ID and WABA access. If you have `DEV_SEND_TO_WABA=false`, you might need to mock the download part in the controller if you want to test fully offline.*
