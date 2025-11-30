# CLAUDE.md
 
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a WhatsApp webhook service that integrates with a multi-agent LangGraph system. The service receives WhatsApp messages via webhooks, manages conversation threads with Redis, and streams responses from a LangGraph-powered multi-agent system back to users via WhatsApp.

## Architecture

### File Structure
```
src/
├── index.ts           - Express app setup and server initialization
├── handlers.ts        - Webhook handlers (verification, message processing)
├── actions.ts         - Thread management and LangGraph streaming
├── schemas.ts         - Zod schemas for data validation
└── lib/
    ├── whatsapp.ts    - Wapi.js client wrapper for sending messages
    ├── fastapi.ts     - FastAPI client for ai-multiagent (primary)
    ├── langgraph.ts   - LangGraph SDK client initialization (fallback)
    └── redis.ts       - Redis client for session storage
```

### Core Flow
1. **Webhook Reception** (`src/handlers.ts`): Express server receives WhatsApp webhook events (verification & messages)
2. **Thread Management** (`src/actions.ts`): Creates/retrieves conversation threads, maps to LangGraph threads
3. **Session Storage** (`src/lib/redis.ts`): Redis stores thread IDs (keyed by chat ID) and action types (keyed by thread ID)
4. **Agent Streaming** (`src/actions.ts`): Streams user input to LangGraph multi-agent system and processes chunks
5. **Response Delivery** (`src/lib/whatsapp.ts`): Sends agent responses back via WhatsApp using Wapi.js

### Endpoints
- `GET /` - Health check endpoint (returns `{"status": "ok", "service": "whatsapp-agent-api"}`)
- `GET /webhook` - WhatsApp webhook verification (Meta requirement)
- `POST /webhook` - WhatsApp message webhook handler

### Key Patterns

**Thread ID Mapping**:
- Redis key `thread-chat_id:{chatId}` stores the LangGraph thread ID for each WhatsApp conversation
- Redis key `action-thread_id:{threadId}` stores the current action type (chat/process_data/query_data)

**Action Types**:
- `chat`: General conversation with the agent
- `process_data`: Data recording workflow (expects structured data parsing)
- `query_data`: Data querying workflow (expects SQL query execution)

**AI Backend Priority**:
1. **FastAPI** (primary): If `FASTAPI_URL` is set, calls the ai-multiagent `/chat/message` endpoint
2. **LangGraph** (fallback): If FastAPI fails or isn't configured, uses LangGraph SDK
3. **Echo mode**: If neither is configured, operates in echo mode for testing

**FastAPI Integration** (`src/lib/fastapi.ts`):
- Calls `POST /chat/message` with `thread_id`, `phone`, and `message`
- Calls `POST /chat/checkin` to start new conversations
- Returns structured response with `reply_text`, `risk_level`, `agent_used`, etc.

**Streaming Chunk Processing**:
- LangGraph streams chunks with agent outputs keyed by action type (actions.ts:66-111)
- Stream mode: `"updates"` - receives incremental updates as they're generated
- Chunks are collected and processed in batch after stream completes
- Response patterns:
  - `data[actionType]?.output` → text responses from chat/process_data/query_data agents
  - `data.parse_data?.parsed_data` → structured data from processor agent
  - `data.format_results?.output` → formatted query results from SQL agent
- Each agent output triggers a separate WhatsApp message send

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

**FastAPI Backend** - Recommended (ai-multiagent):
```
FASTAPI_URL=http://localhost:8099
```

**LangGraph** - Optional fallback (used if FastAPI is not configured):
```
LANGGRAPH_API_URL=https://your-langgraph-api-url
LANGSMITH_API_KEY=your_langsmith_api_key
ASSISTANT_ID=your_assistant_graph_name
```

**Redis** - Defaults to localhost if not set:
```
REDIS_URL=redis://localhost:6379
```

**Server**:
```
PORT=3000
```

**Additional** (if using Tydical integration):
```
TYDICAL_PERSONAL_ACCESS_TOKEN=your_tydical_token
```

## Important Implementation Details

**Wapi.js Integration**:
- The service uses Express for webhook handling, NOT Wapi.js's built-in webhook server
- `wapiClient.initiate()` is intentionally NOT called - only use Wapi.js for sending messages
- Wapi.js button/list interactions are limited to 3 buttons max per WhatsApp API constraints

**Message Handling**:
- Start commands (`start`, `hi`, `hello`, `hola`, `/start`) always create a new thread
- Interactive button replies map to action types via `actionMap` in handlers.ts:163
- All webhook responses must return 200 status to acknowledge receipt to Meta
- **Language**: Messages and UI are in Spanish (context messages, button labels, etc.)
- Button mappings (handlers.ts:163):
  - `action_process` → "process_data" (Agendar Cita)
  - `action_query` → "query_data" (Consultar Datos)
  - `action_help` → "chat" (Obtener Ayuda)

**Data Validation**:
- `recordSchema` in `src/schemas.ts` defines the expected structure for parsed appointment/record data
  - Includes fields: `user_email`, `user_id`, `items[]`, `created_at`
  - Each item has: `name`, `quantity`, `value`, `category`
- `whatsAppMessageSchema` validates incoming WhatsApp webhook messages
- TODO: Actual validation and database insertion is not yet implemented (see actions.ts:137)
- Schema uses Zod for runtime type validation

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
- `@langchain/langgraph-sdk` - LangGraph streaming client (optional)
- `express` - Web server framework
- `redis` - Redis client for session storage
- `uuid` - UUID generation for fallback thread IDs
- `zod` - Runtime type validation

**Development**:
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
