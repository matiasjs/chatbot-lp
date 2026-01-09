# WhatsApp Car Knowledge Bot

## Setup

1. **Environment Variables**:
   Copy `.env.example` to `.env` (already done) and set `OPENAI_API_KEY`.
   
2. **Docker**:
   ```bash
   docker-compose up -d
   ```

3. **Database**:
   Run migrations and seed:
   ```bash
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

4. **Run Dev**:
   ```bash
   npm run start:dev
   ```

## API Endpoints (Simulation)

### 1. Inbound Message (User)
**POST** `http://localhost:3000/api/v1/channels/whatsapp/inbound`
```json
{
  "fromPhone": "5491112345678",
  "text": "Hola, qué motor tiene el Golf GTI 2019?"
}
```

### 2. View Pending Expert Messages
**GET** `http://localhost:3000/api/v1/outbound/pending`

### 3. Expert Reply
**POST** `http://localhost:3000/api/v1/expert/reply`
```json
{
  "ticketId": "UUID_FROM_STEP_2",
  "expertPhone": "5491100000000",
  "text": "Trae el motor EA888 Gen 3 de 245cv."
}
```

### 4. Admin Knowledge
**GET** `http://localhost:3000/api/v1/knowledge/search?q=motor`
