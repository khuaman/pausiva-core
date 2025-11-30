-- Add conversation_id to appointments and followings tables
-- This stores the thread_id from conversations (for mapping records to AI conversations)
-- Note: No FK constraint because we store thread_id (TEXT) as UUID reference

begin;

-- Add conversation_id to appointments table
-- Stores the conversation thread_id (UUID format but references conversations.thread_id)
alter table public.appointments
  add column if not exists conversation_id uuid;

-- Add index for conversation_id lookups
create index if not exists appointments_conversation_id_idx 
  on public.appointments (conversation_id);

-- Add conversation_id to followings table
-- Stores the conversation thread_id (UUID format but references conversations.thread_id)
alter table public.followings
  add column if not exists conversation_id uuid;

-- Add index for conversation_id lookups
create index if not exists followings_conversation_id_idx 
  on public.followings (conversation_id);

commit;

