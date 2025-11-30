# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a WhatsApp webhook service that integrates with the Pausiva AI multi-agent system. The service receives WhatsApp messages via webhooks, manages conversation threads with Supabase (PostgreSQL) as the source of truth and Redis as a cache layer, and sends responses from the FastAPI-powered AI system back to users via WhatsApp.

## Architecture

### File Structure

```
src/
├── index.ts           - Express app setup and server initialization
├── handlers.ts        - Webhook handlers (verification, message processing)
├── actions.ts         - Thread management and FastAPI communication
├── schemas.ts         - Zod schemas for data validation
└── lib/
    ├── whatsapp.ts    - Wapi.js client wrapper for sending messages
    ├── fastapi.ts     - FastAPI client for ai-multiagent
    ├── db.ts          - Drizzle ORM client for Supabase
    ├── schema.ts      - Drizzle schema definitions
    ├── storage.ts     - Storage layer (Supabase + Redis caching)
    ├── redis.ts       - Redis client for caching
    └── debouncer.ts   - Message debouncing service (prevents double-message issues)
```

### Core Flow

1. **Webhook Reception** (`src/handlers.ts`): Express server receives WhatsApp webhook events (verification & messages)
2. **User Lookup** (`src/lib/storage.ts`): Fetches user_id from `public.users` by phone number
3. **Thread Management** (`src/lib/storage.ts`): Creates/retrieves conversations in Supabase, caches in Redis
4. **AI Processing** (`src/actions.ts`): Sends messages to FastAPI multi-agent system
5. **Message Persistence** (`src/lib/storage.ts`): Saves user and assistant messages to Supabase
6. **Response Delivery** (`src/lib/whatsapp.ts`): Sends agent responses back via WhatsApp using Wapi.js

### Endpoints

- `GET /` - Health check endpoint (returns `{"status": "ok", "service": "wa-agent-gateway"}`)
- `GET /webhook` - WhatsApp webhook verification (Meta requirement)
- `POST /webhook` - WhatsApp message webhook handler
- `POST /api/send-message` - Proactive message endpoint (for platform to send messages to users)

### Key Patterns

**Data Storage**:

- **Supabase (PostgreSQL)**: Source of truth for conversations, messages, and user data
- **Redis**: Caching layer for fast lookups (thread IDs, action types, user info)
- Tables managed by `platform/supabase/migrations/`:
  - `public.users` - User profiles with phone numbers
  - `public.patients` - Patient data linked to users
  - `public.conversations` - AI chat sessions
  - `public.messages` - Individual messages in conversations

**Thread/Conversation Mapping**:

- Each WhatsApp phone number maps to a conversation in Supabase
- `thread_id` (UUID) uniquely identifies each conversation
- Only one active conversation per phone number (enforced by partial unique index)

**Action Types**:

- `chat`: General conversation with the agent
- `process_data`: Appointment scheduling workflow
- `query_data`: Data querying workflow

**FastAPI Integration** (`src/lib/fastapi.ts`):

- Calls `POST /chat/message` with `thread_id`, `phone`, `message`, and `user_id`
- Calls `POST /chat/checkin` to start new conversations
- Returns structured response with `reply_text`, `risk_level`, `agent_used`, etc.

**Proactive Messages** (`POST /api/send-message`):

- Allows the platform to send messages directly to patients via WhatsApp
- Requires `X-API-Key` header for authentication (set via `PLATFORM_API_KEY` env var)
- Request body:
  ```json
  {
    "phone": "573001234567",
    "message": "Your appointment is tomorrow at 10am",
    "message_type": "text", // or "buttons"
    "buttons": [
      // optional, only for message_type: "buttons"
      { "id": "confirm", "title": "Confirmar" },
      { "id": "reschedule", "title": "Reagendar" }
    ],
    "metadata": {
      // optional
      "source": "appointment_reminder",
      "reference_id": "uuid-of-appointment",
      "triggered_by": "uuid-of-staff-member"
    }
  }
  ```
- Messages are saved to the conversation as `role: "system"` with `agent_used: "platform"`

## Development Commands

**Run in Development** (with auto-reload):

```bash
npm run dev
```

**Build TypeScript**:

```bash
npm run build
```

**Run Production Build**:

```bash
npm start
```

**Type Checking**:

```bash
npx tsc --noEmit
```

**Drizzle Commands**:

```bash
npm run db:generate  # Generate migrations from schema
npm run db:push      # Push schema changes to database
```

**Docker Development**:

```bash
docker-compose up
```

**Docker Production Build**:

```bash
docker-compose -f docker-compose.prod.yml up --build
```

## Required Environment Variables

See `.env.example` for template. Copy it to `.env` and fill in values:

```bash
cp .env.example .env
```

**WhatsApp (Wapi.js)** - Required:

```
WHATSAPP_API_ACCESS_TOKEN=your_meta_access_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_WEBHOOK_SECRET=your_webhook_verification_token
```

**FastAPI Backend** - Required (ai-multiagent):

```
FASTAPI_URL=http://localhost:8099
```

**Database (Supabase)** - Required:

```
DATABASE_URL=postgresql://postgres:password@localhost:54322/postgres
```

**Redis** - Required for caching (defaults to localhost if not set):

```
REDIS_URL=redis://localhost:6379
```

**Server**:

```
PORT=3000
```

**Platform Integration** (for proactive messages):

```
PLATFORM_API_KEY=your_secure_api_key
```

## Important Implementation Details

**Wapi.js Integration**:

- The service uses Express for webhook handling, NOT Wapi.js's built-in webhook server
- `wapiClient.initiate()` is intentionally NOT called - only use Wapi.js for sending messages
- Wapi.js button/list interactions are limited to 3 buttons max per WhatsApp API constraints

**Message Handling**:

- Start commands (`start`, `hi`, `hello`, `hola`, `/start`) always create a new thread
- Interactive button replies map to action types via `actionMap` in handlers.ts
- All webhook responses must return 200 status to acknowledge receipt to Meta
- **Language**: Messages and UI are in Spanish (context messages, button labels, etc.)
- Button mappings:
  - `action_process` → "process_data" (Agendar Cita)
  - `action_query` → "query_data" (Consultar Datos)
  - `action_help` → "chat" (Obtener Ayuda)

**Message Debouncing** (`src/lib/debouncer.ts`):

Prevents issues when users send multiple messages during AI response generation:

- **Debounce Window**: 2.5 seconds between messages before processing
- **Max Buffer Time**: 10 seconds maximum before forcing processing
- **Typing Indicator**: Sent immediately on first message, stays active during debounce
- **Generation Tracking**: Redis-based flag prevents concurrent AI processing

Flow:

1. Message arrives → Add to buffer → Send typing indicator (first message only)
2. Start/reset 2.5s debounce timer
3. If new message arrives → Reset timer, add to buffer
4. When timer expires or max time reached → Process all buffered messages together
5. FastAPI receives all messages in context → Single coherent response

Redis keys used:

- `msg_buffer:{phone}` - Buffered messages (TTL: 60s)
- `generation:{phone}` - Generation lock (TTL: 60s)

This pattern handles WhatsApp users who send thoughts in bursts ("Hey" + "What time is my appointment?" sent rapidly).

**User Identification**:

- On each message, the system looks up `user_id` from `public.users` by phone number
- If found, `user_id` is passed to FastAPI for personalized responses
- If not found, conversation continues without user_id (anonymous mode)

**Data Validation**:

- `recordSchema` in `src/schemas.ts` defines the expected structure for parsed data
- `whatsAppMessageSchema` validates incoming WhatsApp webhook messages
- Schema uses Zod for runtime type validation

**Drizzle ORM**:

- Uses `postgres` driver for Supabase connection
- Schema definitions in `src/lib/schema.ts` mirror `platform/` migrations
- Read-only access to `users` and `patients` tables
- Read-write access to `conversations` and `messages` tables

## Database Schema

The wa-agent-gateway uses tables managed by `platform/supabase/migrations/`:

**conversations** (managed by this service):

- `id` (uuid) - Primary key
- `thread_id` (text) - Unique identifier for AI backend
- `patient_id` (uuid) - FK to patients (nullable)
- `phone` (text) - WhatsApp phone number
- `channel` (enum) - 'whatsapp', 'web', 'app'
- `status` (enum) - 'active', 'ended', 'archived'
- `action_type` (text) - Current action type
- `agent_used` (text) - Last agent that responded
- `message_count` (int) - Number of messages
- `risk_level` (text) - Current risk assessment
- `risk_score` (int) - Risk score 0-100

**messages** (managed by this service):

- `id` (uuid) - Primary key
- `conversation_id` (uuid) - FK to conversations
- `external_id` (text) - WhatsApp message ID
- `role` (enum) - 'user', 'assistant', 'system'
- `content` (text) - Message content
- `agent_used` (text) - AI agent that generated the message

## Deployment

**Deployment Scripts** (`scripts/`):

- `setup.sh` - Initial server setup
- `deploy.sh` - Deploy/update the service
- `restart.sh` - Restart the service
- `stop.sh` - Stop the service
- `logs.sh` - View service logs

**Docker**:

- `Dockerfile` - Development image with hot reload
- `Dockerfile.prod` - Production image with optimized build
- `docker-compose.yml` - Development environment (includes Redis)
- `docker-compose.prod.yml` - Production environment

## Dependencies

**Runtime**:

- `@wapijs/wapi.js` - WhatsApp Business API client
- `drizzle-orm` - TypeScript ORM for PostgreSQL
- `postgres` - PostgreSQL driver for Drizzle
- `express` - Web server framework
- `redis` - Redis client for caching
- `uuid` - UUID generation for thread IDs
- `zod` - Runtime type validation

**Development**:

- `drizzle-kit` - Drizzle CLI for migrations
- `typescript` - TypeScript compiler
- `tsx` - TypeScript execution and watch mode
- `@types/*` - TypeScript definitions

## TypeScript Configuration Notes

- Uses **CommonJS** module system with Node module resolution (for compatibility with current dependencies)
- **Strict mode** enabled for type safety
- Target: **ES2022** for modern JavaScript features
- Output directory: `./dist`
- Source directory: `./src`
- Includes declaration file generation for library usage
