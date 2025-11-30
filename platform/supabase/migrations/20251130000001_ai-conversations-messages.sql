-- AI Conversations and Messages Tables
-- For tracking WhatsApp/AI chat sessions and individual messages
--
-- This migration adds tables for the wa-agent-gateway to persist
-- conversation state and message history.

begin;

-- ============================================
-- 1. ENUMS
-- ============================================

create type conversation_channel as enum ('whatsapp', 'web', 'app');

create type conversation_status as enum ('active', 'ended', 'archived');

create type message_role as enum ('user', 'assistant', 'system');

-- ============================================
-- 2. TABLES
-- ============================================

-- conversations table - tracks AI chat sessions
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  thread_id text not null,
  patient_id uuid,
  phone text not null,
  channel conversation_channel not null default 'whatsapp',
  status conversation_status not null default 'active',
  action_type text default 'chat',
  agent_used text,
  message_count integer not null default 0,
  summary text,
  risk_level text default 'none',
  risk_score integer default 0,
  metadata jsonb default '{}'::jsonb,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_thread_id_key unique (thread_id),
  constraint conversations_patient_id_fkey foreign key (patient_id) 
    references public.patients (id) on delete set null,
  constraint conversations_risk_score_check check (
    risk_score is null or (risk_score >= 0 and risk_score <= 100)
  )
);

-- messages table - individual messages in conversations
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  external_id text,
  role message_role not null,
  content text not null,
  agent_used text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint messages_conversation_id_fkey foreign key (conversation_id) 
    references public.conversations (id) on delete cascade
);

-- ============================================
-- 3. INDEXES
-- ============================================

-- conversations indexes
create index conversations_thread_id_idx on public.conversations (thread_id);
create index conversations_patient_id_idx on public.conversations (patient_id);
create index conversations_phone_idx on public.conversations (phone);
create index conversations_status_idx on public.conversations (status);
create index conversations_started_at_idx on public.conversations (started_at desc);

-- Partial unique index: only one active conversation per phone
create unique index conversations_phone_active_idx 
  on public.conversations (phone) 
  where status = 'active';

-- messages indexes
create index messages_conversation_id_idx on public.messages (conversation_id);
create index messages_created_at_idx on public.messages (created_at desc);
create index messages_role_idx on public.messages (role);

-- ============================================
-- 4. FUNCTIONS
-- ============================================

-- Create update_updated_at function if it doesn't exist
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================
-- 5. TRIGGERS
-- ============================================

-- Auto-update updated_at on conversations
create trigger update_conversations_updated_at
  before update on public.conversations
  for each row
  execute function public.update_updated_at();

commit;

